import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import {
	asNumber,
	asObject,
	asString,
	bearerHeaders,
	clampPercent,
	fetchJson,
	resolvePiProviderAuth,
	safeText,
	timestampSeconds,
} from "./shared.ts";
import type {
	ResolvedProviderAuth,
	UsageMetric,
	UsageProvider,
	UsageReport,
} from "../types.ts";

const USAGE_URL = "https://api.github.com/copilot_internal/user";
const LABELS: Record<string, string> = {
	premium_interactions: "Premium",
	chat: "Chat",
	completions: "Completions",
	ai_credits: "AI credits",
};

function labelFor(key: string): string {
	return LABELS[key] ?? safeText(key.replace(/[_-]+/g, " ")) ?? "Allowance";
}

function quotaMetric(
	key: string,
	raw: unknown,
	resetAt: number | undefined,
): UsageMetric | undefined {
	const value = asObject(raw);
	if (!value || value.unlimited === true) return undefined;
	const limit = asNumber(value.entitlement ?? value.limit);
	const remaining = asNumber(value.remaining ?? value.quota_remaining);
	const remainingPercent = asNumber(
		value.percent_remaining ?? value.remaining_percent,
	);
	const usedPercent =
		remainingPercent === undefined
			? limit !== undefined && limit > 0 && remaining !== undefined
				? clampPercent(((limit - remaining) / limit) * 100)
				: undefined
			: clampPercent(100 - remainingPercent);
	if (usedPercent === undefined) return undefined;
	const creditsUsed = asNumber(value.credits_used);
	const used =
		creditsUsed ??
		(limit !== undefined && remaining !== undefined
			? Math.max(0, limit - remaining)
			: undefined);
	return {
		id: `github-copilot-${key}`,
		label: labelFor(key),
		kind: "allowance",
		usedPercent,
		...(used === undefined ? {} : { used }),
		...(limit === undefined ? {} : { limit }),
		...(resetAt === undefined ? {} : { resetAt }),
	};
}

function legacyMetrics(
	root: Record<string, unknown>,
	resetAt: number | undefined,
): UsageMetric[] {
	const monthly = asObject(root.monthly_quotas);
	const remaining = asObject(root.limited_user_quotas);
	if (!monthly || !remaining) return [];
	return Object.entries(monthly)
		.map(([key, limit]) =>
			quotaMetric(key, { entitlement: limit, remaining: remaining[key] }, resetAt),
		)
		.filter((metric): metric is UsageMetric => metric !== undefined);
}

export function normalizeGitHubCopilotPayload(
	payload: unknown,
	capturedAt: number,
): UsageReport {
	const root = asObject(payload);
	if (!root) throw new Error("GitHub Copilot usage response was not an object.");
	const resetAt = timestampSeconds(
		root.quota_reset_date ??
			root.quota_reset_date_utc ??
			root.limited_user_reset_date,
	);
	const snapshots = asObject(root.quota_snapshots);
	const metrics = snapshots
		? Object.entries(snapshots)
				.map(([key, value]) => quotaMetric(key, value, resetAt))
				.filter((metric): metric is UsageMetric => metric !== undefined)
		: legacyMetrics(root, resetAt);
	const plan = safeText(root.copilot_plan);
	return {
		providerId: "github-copilot",
		providerLabel: "Copilot",
		capturedAt,
		source: "GitHub copilot_internal/user",
		...(plan ? { plan } : {}),
		metrics,
		warnings:
			metrics.length === 0
				? ["No recognizable GitHub Copilot allowance metrics were returned."]
				: [],
	};
}

async function resolveGitHubQuotaAuth(
	ctx: ExtensionContext,
): Promise<ResolvedProviderAuth | undefined> {
	const runtime = await resolvePiProviderAuth(ctx, "github-copilot");
	if (!runtime) return undefined;
	const module = (await import("@earendil-works/pi-coding-agent")) as {
		readStoredCredential?: (providerId: string) => unknown;
	};
	const stored = asObject(module.readStoredCredential?.("github-copilot"));
	const access = asString(stored?.access);
	const refresh = asString(stored?.refresh);
	if (stored?.type !== "oauth" || access !== runtime.token || !refresh) {
		throw new Error(
			"GitHub Copilot usage requires a matching stored OAuth credential.",
		);
	}
	return { ...runtime, token: refresh };
}

export const githubCopilotProvider: UsageProvider = {
	id: "github-copilot",
	label: "Copilot",
	resolveAuth: resolveGitHubQuotaAuth,
	async fetchUsage(
		auth: ResolvedProviderAuth,
		signal: AbortSignal,
	): Promise<UsageReport> {
		const capturedAt = Date.now();
		const headers = bearerHeaders(auth, {
			"X-GitHub-Api-Version": "2025-05-01",
			"User-Agent": "pi-provider-usage-bars",
		});
		try {
			return normalizeGitHubCopilotPayload(
				await fetchJson(
					USAGE_URL,
					{ method: "GET", headers },
					signal,
					"GitHub Copilot usage",
				),
				capturedAt,
			);
		} catch (firstError) {
			try {
				return normalizeGitHubCopilotPayload(
					await fetchJson(
						USAGE_URL,
						{
							method: "GET",
							headers: { ...headers, Authorization: `token ${auth.token}` },
						},
						signal,
						"GitHub Copilot usage",
					),
					capturedAt,
				);
			} catch {
				throw firstError;
			}
		}
	},
};

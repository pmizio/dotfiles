import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import {
	bearerHeaders,
	displayValue,
	asBoolean,
	asNumber,
	asObject,
	resolvePiProviderAuth,
	safeText,
	timestampSeconds,
	windowMetric,
} from "./shared.ts";
import { fetchJson } from "./shared.ts";
import type {
	ResolvedProviderAuth,
	UsageMetric,
	UsageProvider,
	UsageReport,
} from "../types.ts";

const USAGE_URL = "https://chatgpt.com/backend-api/wham/usage";
const OFFICIAL_ORIGIN = "https://chatgpt.com";

function appendWindows(
	metrics: UsageMetric[],
	id: string,
	prefix: string | undefined,
	raw: unknown,
	capturedAt: number,
): void {
	const rateLimit = asObject(raw);
	for (const [slot, fallback] of [
		["primary_window", "Primary"],
		["secondary_window", "Secondary"],
	] as const) {
		const metric = windowMetric(
			`${id}-${slot}`,
			fallback,
			rateLimit?.[slot],
			capturedAt,
		);
		if (metric)
			metrics.push(
				prefix ? { ...metric, label: `${prefix} ${metric.label}` } : metric,
			);
	}
}

function budgetMetric(raw: unknown): UsageMetric | undefined {
	const control = asObject(raw);
	const individual = asObject(
		control?.individual_limit ?? control?.individualLimit,
	);
	const reached = asBoolean(control?.reached) === true;
	if (!individual && !reached) return undefined;
	if (!individual)
		return {
			id: "codex-spend-control",
			label: "Budget",
			kind: "budget",
			usedPercent: 100,
		};

	const usedRaw = individual.used;
	const limitRaw = individual.limit;
	const used = asNumber(usedRaw);
	const limit = asNumber(limitRaw);
	const remaining = asNumber(
		individual.remaining_percent ?? individual.remainingPercent,
	);
	const usedPercent =
		limit !== undefined && limit > 0 && used !== undefined
			? (used / limit) * 100
			: remaining === undefined
				? reached
					? 100
					: undefined
				: 100 - remaining;
	if (usedPercent === undefined || !Number.isFinite(usedPercent))
		return undefined;

	const usedValue = displayValue(usedRaw);
	const limitValue = displayValue(limitRaw);
	const resetAt = timestampSeconds(
		individual.reset_at ?? individual.resets_at ?? individual.resetAt,
	);
	return {
		id: "codex-spend-control",
		label: "Budget",
		kind: "budget",
		usedPercent: Math.max(0, Math.min(100, usedPercent)),
		...(usedValue === undefined ? {} : { used: usedValue }),
		...(limitValue === undefined ? {} : { limit: limitValue }),
		...(resetAt === undefined ? {} : { resetAt }),
	};
}

export function normalizeCodexPayload(
	payload: unknown,
	capturedAt: number,
): UsageReport {
	const root = asObject(payload);
	if (!root) throw new Error("Codex usage response was not an object.");
	const metrics: UsageMetric[] = [];
	appendWindows(
		metrics,
		"codex",
		undefined,
		root.rate_limit ?? root.rate_limits,
		capturedAt,
	);

	const additional = Array.isArray(root.additional_rate_limits)
		? root.additional_rate_limits
		: [];
	for (const item of additional) {
		const value = asObject(item);
		const id = safeText(value?.metered_feature ?? value?.limit_name);
		if (id)
			appendWindows(
				metrics,
				id,
				safeText(value?.limit_name) ?? id,
				value?.rate_limit,
				capturedAt,
			);
	}

	const credits = asObject(root.credits);
	const balance = displayValue(credits?.balance);
	if (credits && (credits.unlimited === true || typeof balance === "number")) {
		metrics.push({
			id: "codex-credits",
			label: "Credits",
			kind: "credits",
			value: credits.unlimited === true ? "unlimited" : balance!,
		});
	}
	const budget = budgetMetric(root.spend_control ?? root.spendControl);
	if (budget) metrics.push(budget);

	const reachedKind = safeText(asObject(root.rate_limit_reached_type)?.kind);
	const limited =
		asBoolean(asObject(root.rate_limit ?? root.rate_limits)?.allowed) === false ||
		asBoolean(asObject(root.rate_limit ?? root.rate_limits)?.limit_reached) ===
			true;
	const warnings = [
		...(reachedKind ? [`limit state: ${reachedKind}`] : []),
		...(limited ? ["Codex usage is currently limited."] : []),
		...(metrics.length === 0
			? ["No recognizable Codex usage metrics were returned."]
			: []),
	];
	const plan = safeText(root.plan_type ?? root.planType);
	return {
		providerId: "openai-codex",
		providerLabel: "Codex",
		capturedAt,
		source: "ChatGPT /wham/usage",
		...(plan ? { plan } : {}),
		metrics,
		warnings,
	};
}

export const codexProvider: UsageProvider = {
	id: "openai-codex",
	label: "Codex",
	resolveAuth: (ctx: ExtensionContext) =>
		resolvePiProviderAuth(ctx, "openai-codex", OFFICIAL_ORIGIN),
	async fetchUsage(
		auth: ResolvedProviderAuth,
		signal: AbortSignal,
	): Promise<UsageReport> {
		const capturedAt = Date.now();
		const payload = await fetchJson(
			USAGE_URL,
			{
				method: "GET",
				headers: bearerHeaders(auth, {
					...(auth.accountId ? { "ChatGPT-Account-Id": auth.accountId } : {}),
					"User-Agent": "pi-provider-usage-bars",
				}),
			},
			signal,
			"Codex usage",
		);
		return normalizeCodexPayload(payload, capturedAt);
	},
};

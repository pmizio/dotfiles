import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import {
	asBoolean,
	asNumber,
	asObject,
	clampPercent,
	resolvePiProviderAuth,
	timestampSeconds,
	windowMetric,
	fetchJson,
	bearerHeaders,
} from "./shared.ts";
import type {
	ResolvedProviderAuth,
	UsageMetric,
	UsageProvider,
	UsageReport,
} from "../types.ts";

const USAGE_URL = "https://api.anthropic.com/api/oauth/usage";
const OFFICIAL_ORIGIN = "https://api.anthropic.com";

export function normalizeAnthropicPayload(
	payload: unknown,
	capturedAt: number,
): UsageReport {
	const root = asObject(payload);
	if (!root) throw new Error("Anthropic usage response was not an object.");
	const metrics: UsageMetric[] = [];
	for (const [id, label, raw] of [
		["anthropic-five-hour", "5h", root.five_hour],
		["anthropic-seven-day", "7d", root.seven_day],
	] as const) {
		const metric = windowMetric(id, label, raw, capturedAt);
		if (metric) metrics.push(metric);
	}

	const extra = asObject(root.extra_usage);
	const limitCents = asNumber(extra?.monthly_limit);
	const usedCents = asNumber(extra?.used_credits);
	if (
		asBoolean(extra?.is_enabled) === true &&
		limitCents !== undefined &&
		limitCents > 0
	) {
		const usedPercent =
			asNumber(extra?.utilization) ??
			(usedCents === undefined ? undefined : (usedCents / limitCents) * 100);
		if (usedPercent !== undefined) {
			const resetAt = timestampSeconds(extra?.reset_at ?? extra?.resets_at);
			metrics.push({
				id: "anthropic-extra-usage",
				label: "Extra",
				kind: "budget",
				usedPercent: clampPercent(usedPercent),
				...(usedCents === undefined ? {} : { used: usedCents / 100 }),
				limit: limitCents / 100,
				...(resetAt === undefined ? {} : { resetAt }),
			});
		}
	}
	return {
		providerId: "anthropic",
		providerLabel: "Claude",
		capturedAt,
		source: "Anthropic OAuth usage",
		metrics,
		warnings:
			metrics.length === 0
				? ["No recognizable Anthropic subscription metrics were returned."]
				: [],
	};
}

export const anthropicProvider: UsageProvider = {
	id: "anthropic",
	label: "Claude",
	resolveAuth: (ctx: ExtensionContext) =>
		resolvePiProviderAuth(ctx, "anthropic", OFFICIAL_ORIGIN),
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
					"anthropic-beta": "oauth-2025-04-20",
					"User-Agent": "pi-provider-usage-bars",
				}),
			},
			signal,
			"Anthropic usage",
		);
		return normalizeAnthropicPayload(payload, capturedAt);
	},
};

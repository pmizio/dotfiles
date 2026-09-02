import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

export type UsageValue = number | string;
export type UsageMetricKind =
	| "window"
	| "budget"
	| "allowance"
	| "balance"
	| "credits";

/** Provider-neutral data returned by every adapter. */
export interface UsageMetric {
	id: string;
	label: string;
	kind: UsageMetricKind;
	usedPercent?: number;
	used?: UsageValue;
	limit?: UsageValue;
	value?: UsageValue;
	resetAt?: number;
}

export interface UsageReport {
	providerId: string;
	providerLabel: string;
	capturedAt: number;
	source: string;
	plan?: string;
	metrics: UsageMetric[];
	warnings: string[];
}

/** Runtime auth resolved through Pi. The token never enters a report or UI model. */
export interface ResolvedProviderAuth {
	token: string;
	accountId?: string;
	identityKey: string;
}

/** Provider-specific code implements this contract and nothing from the UI. */
export interface UsageProvider {
	readonly id: string;
	readonly label: string;
	resolveAuth(ctx: ExtensionContext): Promise<ResolvedProviderAuth | undefined>;
	fetchUsage(
		auth: ResolvedProviderAuth,
		signal: AbortSignal,
	): Promise<UsageReport>;
}

export interface UsageProviderRegistry {
	list(): readonly UsageProvider[];
}

export type ProviderStateStatus =
	| "loading"
	| "ready"
	| "unconfigured"
	| "error";

export interface ProviderState {
	provider: UsageProvider;
	status: ProviderStateStatus;
	report?: UsageReport;
	error?: string;
	identityKey?: string;
}

import type {
	ProviderState,
	UsageMetric,
	UsageReport,
	UsageValue,
} from "./types.ts";

export interface UsageRow {
	label: string;
	usedPercent?: number;
	value?: string;
	reset?: string;
}

export interface ProviderView {
	providerId: string;
	title: string;
	source: string;
	plan?: string;
	rows: UsageRow[];
	warnings: string[];
}

export interface FooterUsage {
	label: string;
	usedPercent: number;
}

export interface UsageView {
	providers: ProviderView[];
	errors: Array<{ label: string; message: string }>;
	footer: FooterUsage[];
}

function numberValue(value: UsageValue | undefined): number | undefined {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim()) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : undefined;
	}
	return undefined;
}

function formatValue(value: UsageValue | undefined): string {
	if (value === undefined) return "";
	if (typeof value === "number" && Number.isFinite(value)) {
		return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(
			value,
		);
	}
	return String(value);
}

function percentFor(metric: UsageMetric): number | undefined {
	if (metric.usedPercent !== undefined && Number.isFinite(metric.usedPercent)) {
		return Math.min(100, Math.max(0, metric.usedPercent));
	}
	const used = numberValue(metric.used);
	const limit = numberValue(metric.limit);
	return used !== undefined && limit !== undefined && limit > 0
		? Math.min(100, Math.max(0, (used / limit) * 100))
		: undefined;
}

function valueFor(metric: UsageMetric): string | undefined {
	if (
		(metric.kind === "budget" || metric.kind === "allowance") &&
		metric.used !== undefined &&
		metric.limit !== undefined
	) {
		return `${formatValue(metric.used)}/${formatValue(metric.limit)}`;
	}
	if (
		(metric.kind === "balance" || metric.kind === "credits") &&
		metric.value !== undefined
	) {
		return formatValue(metric.value);
	}
	return undefined;
}

function resetText(
	resetAt: number | undefined,
	now: number,
): string | undefined {
	if (resetAt === undefined || !Number.isFinite(resetAt)) return undefined;
	const diff = resetAt * 1_000 - now;
	if (diff <= 0) return "now";
	const minutes = Math.floor(diff / 60_000);
	if (minutes < 60) return `${Math.max(1, minutes)}m`;
	const hours = Math.floor(minutes / 60);
	if (hours < 48)
		return minutes % 60 === 0 ? `${hours}h` : `${hours}h ${minutes % 60}m`;
	const days = Math.floor(hours / 24);
	return hours % 24 === 0 ? `${days}d` : `${days}d ${hours % 24}h`;
}

function metricOrder(metric: UsageMetric): number {
	if (metric.kind === "credits") return 0;
	if (metric.kind === "budget") return 1;
	if (metric.kind === "window" || metric.kind === "allowance") return 2;
	return 3;
}

function reportView(report: UsageReport, now: number): ProviderView {
	const rows = [...report.metrics]
		.sort((left, right) => metricOrder(left) - metricOrder(right))
		.map((metric) => ({
			label: metric.label,
			...(percentFor(metric) === undefined
				? {}
				: { usedPercent: percentFor(metric) }),
			...(valueFor(metric) === undefined ? {} : { value: valueFor(metric) }),
			...(resetText(metric.resetAt, now) === undefined
				? {}
				: { reset: resetText(metric.resetAt, now) }),
		}));
	return {
		providerId: report.providerId,
		title: report.providerLabel,
		source: report.source,
		...(report.plan ? { plan: report.plan } : {}),
		rows,
		warnings: report.warnings,
	};
}

export function buildUsageView(
	states: readonly ProviderState[],
	now = Date.now(),
): UsageView {
	const providers = states
		.filter((state) => state.report)
		.map((state) => reportView(state.report!, now));
	const errors = states
		.filter((state) => !state.report && state.status === "error")
		.map((state) => ({
			label: state.provider.label,
			message: state.error ?? "unavailable",
		}));
	const footer = providers.flatMap((provider) => {
		const metric = provider.rows
			.filter(
				(row): row is UsageRow & { usedPercent: number } =>
					row.usedPercent !== undefined,
			)
			.sort((left, right) => right.usedPercent - left.usedPercent)[0];
		return metric
			? [{ label: provider.title, usedPercent: metric.usedPercent }]
			: [];
	});
	return { providers, errors, footer };
}

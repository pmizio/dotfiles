import type { AssistantMessage } from "@earendil-works/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

const CODEX_USAGE_URL = "https://chatgpt.com/backend-api/wham/usage";
const REFRESH_INTERVAL_MS = 60_000;
const GIT_BRANCH_GLYPH = "";
// The installed Symbols Nerd Font lacks nf-cod-openai; use its compatible MDI robot glyph.
const OPENAI_GLYPH = "󰚩";

type UsageWindow = {
	usedPercent: number;
	windowSeconds?: number;
};

type CreditLimit = {
	used?: string;
	limit?: string;
	usedPercent?: number;
};

type Credits = {
	hasCredits: boolean;
	unlimited: boolean;
	balance?: string;
};

type CodexUsage = {
	plan?: UsageWindow;
	creditLimit?: CreditLimit;
	credits?: Credits;
	enterprise?: boolean;
	error?: string;
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
	return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
}

function asNumber(value: unknown): number | undefined {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) return parsed;
	}
	return undefined;
}

function asString(value: unknown): string | undefined {
	if (typeof value === "string" && value.trim() !== "") return value.trim();
	if (typeof value === "number" && Number.isFinite(value)) return `${value}`;
	return undefined;
}

function parseJwtPayload(token: string): Record<string, unknown> | undefined {
	const encoded = token.split(".")[1];
	if (!encoded) return undefined;

	try {
		const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
		const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
		const binary = atob(padded);
		const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
		return asRecord(JSON.parse(new TextDecoder().decode(bytes)));
	} catch {
		return undefined;
	}
}

function getCodexAccountId(token: string): string | undefined {
	const payload = parseJwtPayload(token);
	const auth = asRecord(payload?.["https://api.openai.com/auth"]);
	const accountId = auth?.chatgpt_account_id;
	return typeof accountId === "string" && accountId.length > 0 ? accountId : undefined;
}

function getCodexPlanType(token: string): string | undefined {
	const payload = parseJwtPayload(token);
	const auth = asRecord(payload?.["https://api.openai.com/auth"]);
	return asString(auth?.chatgpt_plan_type);
}

function isEnterprisePlan(planType: string | undefined): boolean {
	const normalized = planType?.trim().toLowerCase().replace(/[\s-]+/g, "_");
	return (
		normalized === "enterprise" ||
		normalized === "ent26" ||
		normalized?.startsWith("enterprise_") === true ||
		normalized === "business" ||
		normalized?.startsWith("self_serve_business_") === true
	);
}

function parseWindow(value: unknown): UsageWindow | undefined {
	const window = asRecord(value);
	if (!window) return undefined;

	const percentLeft = asNumber(window.percent_left);
	const usedPercent =
		asNumber(window.used_percent) ??
		asNumber(window.usedPercent) ??
		(percentLeft !== undefined ? 100 - percentLeft : undefined);
	if (usedPercent === undefined) return undefined;

	const windowDurationMins = asNumber(window.window_duration_mins);
	const windowSeconds =
		asNumber(window.limit_window_seconds) ??
		(windowDurationMins !== undefined ? windowDurationMins * 60 : undefined);

	return {
		usedPercent: Math.max(0, Math.min(100, usedPercent)),
		...(windowSeconds !== undefined ? { windowSeconds } : {}),
	};
}

function parseCreditLimit(value: unknown): CreditLimit | undefined {
	const limit = asRecord(value);
	if (!limit) return undefined;

	const used = asString(limit.used);
	const total = asString(limit.limit);
	if (used === undefined && total === undefined) return undefined;

	const remainingPercent = asNumber(limit.remaining_percent) ?? asNumber(limit.remainingPercent);
	const usedPercent =
		asNumber(limit.used_percent) ??
		asNumber(limit.usedPercent) ??
		(remainingPercent !== undefined ? 100 - remainingPercent : undefined);
	return {
		...(used !== undefined ? { used } : {}),
		...(total !== undefined ? { limit: total } : {}),
		...(usedPercent !== undefined ? { usedPercent: Math.max(0, Math.min(100, usedPercent)) } : {}),
	};
}

function parseCredits(value: unknown): Credits | undefined {
	const credits = asRecord(value);
	if (!credits) return undefined;

	const hasCredits = typeof credits.has_credits === "boolean" ? credits.has_credits : undefined;
	const unlimited = typeof credits.unlimited === "boolean" ? credits.unlimited : undefined;
	const balance = asString(credits.balance);
	if (hasCredits === undefined && unlimited === undefined && balance === undefined) return undefined;

	return {
		hasCredits: hasCredits ?? balance !== undefined,
		unlimited: unlimited ?? false,
		...(balance !== undefined ? { balance } : {}),
	};
}

function parseCodexUsage(payload: unknown, fallbackPlanType?: string): CodexUsage {
	const root = asRecord(payload);
	const planType = asString(root?.plan_type) ?? asString(root?.planType) ?? fallbackPlanType;
	const enterprise = isEnterprisePlan(planType) || isEnterprisePlan(fallbackPlanType);
	const rateLimit = asRecord(root?.rate_limit) ?? asRecord(root?.rate_limits);
	const spendControl = asRecord(root?.spend_control) ?? asRecord(root?.spendControl);
	const creditLimit =
		parseCreditLimit(spendControl?.individual_limit) ??
		parseCreditLimit(spendControl?.individualLimit);
	const credits = parseCredits(root?.credits);

	const candidates = rateLimit
		? [
				parseWindow(rateLimit.primary_window),
				parseWindow(rateLimit.secondary_window),
				parseWindow(rateLimit.primary),
				parseWindow(rateLimit.secondary),
				parseWindow(rateLimit.five_hour),
				parseWindow(rateLimit.weekly),
			].filter((window): window is UsageWindow => window !== undefined)
		: [];
	if (candidates.length === 0 && creditLimit === undefined && credits === undefined) {
		return { enterprise, error: "unavailable" };
	}

	// Keep only the longest returned window, which is the weekly plan window here.
	const sorted = [...candidates].sort(
		(a, b) => (a.windowSeconds ?? Number.POSITIVE_INFINITY) - (b.windowSeconds ?? Number.POSITIVE_INFINITY),
	);
	return {
		...(sorted.length > 0 ? { plan: sorted[sorted.length - 1] } : {}),
		...(creditLimit !== undefined ? { creditLimit } : {}),
		...(credits !== undefined ? { credits } : {}),
		enterprise,
	};
}

function formatPercent(window: UsageWindow | undefined): string {
	return window ? `${Math.round(window.usedPercent)}%` : "—";
}

function formatCreditAmount(value: string | undefined): string | undefined {
	if (value === undefined) return undefined;
	const parsed = Number(value);
	return Number.isFinite(parsed)
		? parsed.toLocaleString("en-US", { maximumFractionDigits: 2 })
		: value;
}

function formatCreditLimit(limit: CreditLimit | undefined, credits: Credits | undefined): string {
	const used = formatCreditAmount(limit?.used);
	const total = formatCreditAmount(limit?.limit);
	if (used && total) return `${used}/${total}`;
	if (total) return total;
	if (used) return used;
	if (credits?.unlimited) return "unlimited";

	const balance = formatCreditAmount(credits?.balance);
	if (balance) return balance;
	return credits?.hasCredits ? "available" : "—";
}

function creditUsageColor(
	limit: CreditLimit | undefined,
	credits: Credits | undefined,
): "success" | "warning" | "error" | "muted" {
	if (limit?.usedPercent !== undefined) return usageColor({ usedPercent: limit.usedPercent });
	if (limit || credits?.unlimited || credits?.hasCredits) return "success";
	return "muted";
}

function compactHome(path: string): string {
	const home = process.env.HOME;
	if (home && (path === home || path.startsWith(`${home}/`))) return `~${path.slice(home.length)}`;
	return path;
}

function formatTokens(tokens: number): string {
	if (tokens < 1_000) return `${Math.round(tokens)}`;
	if (tokens < 1_000_000) return `${(tokens / 1_000).toFixed(tokens >= 10_000 ? 0 : 1)}k`;
	return `${(tokens / 1_000_000).toFixed(tokens >= 10_000_000 ? 0 : 1)}M`;
}

function getTokenTotals(ctx: ExtensionContext): { input: number; output: number } {
	let input = 0;
	let output = 0;
	for (const entry of ctx.sessionManager.getBranch()) {
		if (entry.type !== "message" || entry.message.role !== "assistant") continue;
		const message = entry.message as AssistantMessage;
		input += message.usage.input;
		output += message.usage.output;
	}
	return { input, output };
}

function usageColor(window: UsageWindow | undefined): "success" | "warning" | "error" | "muted" {
	if (!window) return "muted";
	if (window.usedPercent >= 90) return "error";
	if (window.usedPercent >= 75) return "warning";
	return "success";
}

function contextColor(percent: number | null): "success" | "warning" | "error" | "muted" {
	if (percent === null) return "muted";
	if (percent >= 90) return "error";
	if (percent >= 75) return "warning";
	return "success";
}

export default function (pi: ExtensionAPI) {
	let usage: CodexUsage = {};
	let refreshTimer: ReturnType<typeof setInterval> | undefined;
	let refreshController: AbortController | undefined;
	let refreshPromise: Promise<void> | undefined;
	let requestRender: (() => void) | undefined;

	const refreshUsage = (ctx: ExtensionContext): Promise<void> => {
		if (refreshPromise) return refreshPromise;

		refreshController?.abort();
		refreshController = new AbortController();
		const signal = refreshController.signal;
		refreshPromise = (async () => {
			let enterprise = false;
			try {
				const auth = await ctx.modelRegistry.getProviderAuth("openai-codex");
				const token = auth?.auth.apiKey;
				if (!token) {
					usage = { error: "not signed in" };
					return;
				}

				const planType = getCodexPlanType(token);
				enterprise = isEnterprisePlan(planType);
				const accountId = getCodexAccountId(token);
				if (!accountId) {
					usage = { enterprise, error: "account unavailable" };
					return;
				}

				const fetchSignal = AbortSignal.any([signal, AbortSignal.timeout(10_000)]);
				const response = await fetch(CODEX_USAGE_URL, {
					headers: {
						Accept: "application/json",
						Authorization: `Bearer ${token}`,
						"ChatGPT-Account-Id": accountId,
						Origin: "https://chatgpt.com",
						Referer: "https://chatgpt.com/",
						"User-Agent": "pi-status-bar",
					},
					signal: fetchSignal,
				});
				if (!response.ok) throw new Error(`HTTP ${response.status}`);

				usage = parseCodexUsage(await response.json(), planType);
			} catch (error) {
				if (signal.aborted) return;
				usage = { enterprise, error: error instanceof Error ? error.message : "unavailable" };
			} finally {
				refreshPromise = undefined;
				requestRender?.();
			}
		})();

		return refreshPromise;
	};

	pi.on("session_start", async (_event, ctx) => {
		if (ctx.mode !== "tui") return;

		usage = {};
		refreshTimer = setInterval(() => void refreshUsage(ctx), REFRESH_INTERVAL_MS);

		ctx.ui.setFooter((tui, theme, footerData) => {
			requestRender = () => tui.requestRender();
			const unsubscribeBranch = footerData.onBranchChange(() => tui.requestRender());

			return {
				dispose() {
					unsubscribeBranch();
					if (requestRender) requestRender = undefined;
				},
				invalidate() {},
				render(width: number): string[] {
					const model = ctx.model;
					const modelId = model ? `${model.provider}/${model.id}` : "no-model";
					const reasoning = ctx.thinkingLevel ?? "off";
					const cwd = compactHome(ctx.cwd);
					const shortCwd = cwd.includes("/") ? cwd.split("/").pop() ?? cwd : cwd;
					const rawBranch = footerData.getGitBranch();
					const branch = rawBranch && rawBranch.length > 24 ? `…${rawBranch.slice(-23)}` : rawBranch;

					const plan = usage.plan;
					const creditLimit = usage.creditLimit;
					const showCreditLimit =
						creditLimit !== undefined || (usage.enterprise === true && usage.credits !== undefined);
					const weeklyText = `weekly: ${formatPercent(plan)}`;
					const creditsText = `credits: ${formatCreditLimit(creditLimit, usage.credits)}`;
					const quotaText = showCreditLimit ? creditsText : weeklyText;
					const quotaColor = showCreditLimit
						? creditUsageColor(creditLimit, usage.credits)
						: usageColor(plan);
					const contextPercent = ctx.getContextUsage()?.percent ?? null;
					const tokenTotals = getTokenTotals(ctx);
					const barWidth = 8;
					const filled =
						contextPercent === null
							? 0
							: Math.round((Math.max(0, Math.min(100, contextPercent)) / 100) * barWidth);
					const contextBar =
						theme.fg("dim", "[") +
						(filled > 0 ? theme.fg(contextColor(contextPercent), "█".repeat(filled)) : "") +
						theme.fg("dim", "░".repeat(barWidth - filled)) +
						theme.fg("dim", "]");
					const contextTokenSection =
						contextBar +
						theme.fg(
							"muted",
							` ${contextPercent === null ? "—" : `${Math.round(contextPercent)}%`} ↑${formatTokens(tokenTotals.input)} ↓${formatTokens(tokenTotals.output)}`,
						);

					const separator = theme.fg("dim", " │ ");
					const modelSection = theme.fg("accent", modelId) + theme.fg("muted", `(${reasoning})`);
					const branchSection = branch
						? theme.fg("success", ` ${GIT_BRANCH_GLYPH} ${branch}`)
						: "";
					const compactBranchSection = branch
						? theme.fg("success", ` ${GIT_BRANCH_GLYPH}${branch}`)
						: "";
					const pathSection = theme.fg("text", cwd) + branchSection;
					const compactPathSection = theme.fg("text", shortCwd) + compactBranchSection;
					const usageSection = usage.error
						? theme.fg("muted", `${OPENAI_GLYPH} ${showCreditLimit ? "credits: —" : "weekly: —"}`)
						: theme.fg("muted", `${OPENAI_GLYPH} `) + theme.fg(quotaColor, quotaText);
					const planStatus = footerData.getExtensionStatuses().get("plan-mode");
					const planStatusSection = planStatus ? theme.fg("warning", planStatus) : undefined;
					const rightSection = [planStatusSection, contextTokenSection, usageSection]
						.filter((section): section is string => section !== undefined)
						.join(separator);
					const sideMargin = width >= 3 ? 1 : 0;
					const contentWidth = width - sideMargin * 2;
					const alignRight = (leftSection: string): string | undefined => {
						const gap = contentWidth - visibleWidth(leftSection) - visibleWidth(rightSection);
						return gap >= 1
							? " ".repeat(sideMargin) + leftSection + " ".repeat(gap) + rightSection + " ".repeat(sideMargin)
							: undefined;
					};

					const fullLine = alignRight([modelSection, pathSection].join(separator));
					if (fullLine) return [fullLine];

					// Compact mode shortens only the path; the context/tokens/quota group
					// stays pinned to the right edge of the terminal.
					const compactLine = alignRight([modelSection, compactPathSection].join(separator));
					if (compactLine) return [compactLine];

					const fallbackLine =
						" ".repeat(sideMargin) +
						[modelSection, compactPathSection, rightSection].join(separator) +
						" ".repeat(sideMargin);
					return [truncateToWidth(fallbackLine, Math.max(1, width), "")];
				},
			};
		});

		void refreshUsage(ctx);
	});

	pi.on("message_end", () => requestRender?.());
	pi.on("turn_end", () => requestRender?.());
	pi.on("model_select", () => requestRender?.());
	pi.on("thinking_level_select", () => requestRender?.());

	pi.on("session_shutdown", async () => {
		if (refreshTimer) clearInterval(refreshTimer);
		refreshTimer = undefined;
		refreshController?.abort();
		refreshController = undefined;
		refreshPromise = undefined;
		requestRender = undefined;
	});
}

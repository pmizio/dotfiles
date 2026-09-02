import type { AssistantMessage } from "@earendil-works/pi-ai";
import type {
	ExtensionAPI,
	ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

const STATUS_KEY = "provider-usage-bars";
const BRANCH_GLYPH = "";
const SEPARATOR = " │ ";
const BAR_WIDTH = 8;

function compactHome(path: string): string {
	const home = process.env.HOME;
	return home && (path === home || path.startsWith(`${home}/`))
		? `~${path.slice(home.length)}`
		: path;
}

function formatTokens(tokens: number): string {
	if (tokens < 1_000) return `${Math.round(tokens)}`;
	if (tokens < 1_000_000)
		return `${(tokens / 1_000).toFixed(tokens >= 10_000 ? 0 : 1)}k`;
	return `${(tokens / 1_000_000).toFixed(tokens >= 10_000_000 ? 0 : 1)}M`;
}

function tokenTotals(ctx: ExtensionContext): { input: number; output: number } {
	let input = 0;
	let output = 0;
	for (const entry of ctx.sessionManager.getBranch()) {
		if (entry.type !== "message" || entry.message.role !== "assistant") continue;
		const usage = (entry.message as AssistantMessage).usage;
		input += usage.input;
		output += usage.output;
	}
	return { input, output };
}

function contextColor(percent: number): "success" | "warning" | "error" {
	return percent >= 90 ? "error" : percent >= 75 ? "warning" : "success";
}

function contextStatus(
	ctx: ExtensionContext,
	theme: ExtensionContext["ui"]["theme"],
): string {
	const rawPercent = ctx.getContextUsage()?.percent;
	const percent =
		typeof rawPercent === "number" && Number.isFinite(rawPercent)
			? Math.max(0, Math.min(100, rawPercent))
			: null;
	const filled = percent === null ? 0 : Math.round((percent / 100) * BAR_WIDTH);
	const bar =
		theme.fg("dim", "[") +
		(filled > 0 ? theme.fg(contextColor(percent ?? 0), "█".repeat(filled)) : "") +
		theme.fg("dim", "░".repeat(BAR_WIDTH - filled)) +
		theme.fg("dim", "]");
	const totals = tokenTotals(ctx);
	return `${bar}${theme.fg("muted", ` ${percent === null ? "—" : `${Math.round(percent)}%`} ↑${formatTokens(totals.input)} ↓${formatTokens(totals.output)}`)}`;
}

function marginFor(width: number): number {
	return width >= 3 ? 1 : 0;
}

function frameLine(line: string, width: number): string {
	const margin = marginFor(width);
	const innerWidth = Math.max(1, width - margin * 2);
	const content = truncateToWidth(line, innerWidth, "");
	return `${" ".repeat(margin)}${content}${" ".repeat(Math.max(0, innerWidth - visibleWidth(content)))}${" ".repeat(margin)}`;
}

function alignLine(
	left: string,
	right: string,
	width: number,
): string | undefined {
	const margin = marginFor(width);
	const innerWidth = Math.max(1, width - margin * 2);
	const gap = innerWidth - visibleWidth(left) - visibleWidth(right);
	if (gap < 1) return undefined;
	return `${" ".repeat(margin)}${left}${" ".repeat(gap)}${right}${" ".repeat(margin)}`;
}

function renderMainLine(
	ctx: ExtensionContext,
	theme: ExtensionContext["ui"]["theme"],
	footerData: Parameters<
		NonNullable<Parameters<ExtensionContext["ui"]["setFooter"]>[0]>
	>[2],
	width: number,
): string {
	const model = ctx.model;
	const modelText = model ? `${model.provider}/${model.id}` : "no-model";
	const modelSection =
		theme.fg("accent", modelText) +
		theme.fg("muted", `(${ctx.thinkingLevel ?? "off"})`);
	const rawBranch = footerData.getGitBranch();
	const branch =
		rawBranch && rawBranch.length > 24 ? `…${rawBranch.slice(-23)}` : rawBranch;
	const path = compactHome(ctx.cwd);
	const fullPath =
		theme.fg("text", path) +
		(branch ? theme.fg("success", ` ${BRANCH_GLYPH} ${branch}`) : "");
	const compactPath =
		theme.fg("text", path.split("/").pop() ?? path) +
		(branch ? theme.fg("success", ` ${BRANCH_GLYPH}${branch}`) : "");

	const statuses = footerData.getExtensionStatuses();
	const plan = statuses.get("plan-mode");
	const lsp = statuses.get("pi-lens-lsp");
	const right = [
		plan ? theme.fg("warning", plan) : undefined,
		lsp,
		contextStatus(ctx, theme),
	]
		.filter((part): part is string => part !== undefined)
		.join(theme.fg("dim", SEPARATOR));
	const separator = theme.fg("dim", SEPARATOR);
	const full = alignLine([modelSection, fullPath].join(separator), right, width);
	if (full) return full;
	const compact = alignLine(
		[modelSection, compactPath].join(separator),
		right,
		width,
	);
	return (
		compact ??
		frameLine([modelSection, compactPath, right].join(separator), width)
	);
}

export default function statusBarExtension(pi: ExtensionAPI): void {
	let requestRender: (() => void) | undefined;

	pi.on("session_start", (_event, ctx) => {
		if (ctx.mode !== "tui") return;
		ctx.ui.setFooter((tui, theme, footerData) => {
			requestRender = () => tui.requestRender();
			const unsubscribeBranch = footerData.onBranchChange(requestRender);
			return {
				dispose: () => {
					unsubscribeBranch();
					requestRender = undefined;
				},
				invalidate() {},
				render(width: number): string[] {
					const main = renderMainLine(ctx, theme, footerData, width);
					const usage = footerData.getExtensionStatuses().get(STATUS_KEY);
					return usage ? [main, frameLine(usage, width)] : [main];
				},
			};
		});
	});

	const rerender = () => requestRender?.();
	pi.on("message_end", rerender);
	pi.on("turn_end", rerender);
	pi.on("model_select", rerender);
	pi.on("thinking_level_select", rerender);
	pi.on("session_shutdown", () => {
		requestRender = undefined;
	});
}

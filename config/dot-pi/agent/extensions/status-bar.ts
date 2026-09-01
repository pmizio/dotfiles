import type { AssistantMessage } from "@earendil-works/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

const GIT_BRANCH_GLYPH = "";

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

function contextColor(percent: number | null): "success" | "warning" | "error" | "muted" {
	if (percent === null) return "muted";
	if (percent >= 90) return "error";
	if (percent >= 75) return "warning";
	return "success";
}

export default function (pi: ExtensionAPI) {
	let requestRender: (() => void) | undefined;

	pi.on("session_start", async (_event, ctx) => {
		if (ctx.mode !== "tui") return;

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
					const extensionStatuses = footerData.getExtensionStatuses();
					const planStatus = extensionStatuses.get("plan-mode");
					const planStatusSection = planStatus ? theme.fg("warning", planStatus) : undefined;
					const lspStatusSection = extensionStatuses.get("pi-lens-lsp");
					const rightSection = [planStatusSection, lspStatusSection, contextTokenSection]
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

					// Compact mode shortens only the path; the context/token group stays
					// pinned to the right edge of the terminal.
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
	});

	pi.on("message_end", () => requestRender?.());
	pi.on("turn_end", () => requestRender?.());
	pi.on("model_select", () => requestRender?.());
	pi.on("thinking_level_select", () => requestRender?.());

	pi.on("session_shutdown", async () => {
		requestRender = undefined;
	});
}

import type { ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import {
	Key,
	matchesKey,
	truncateToWidth,
	visibleWidth,
} from "@earendil-works/pi-tui";
import type { ProviderView, UsageRow, UsageView } from "./renderer.ts";

const BAR_WIDTH = 8;
type Theme = ExtensionCommandContext["ui"]["theme"];
type ThemeColor = Parameters<Theme["fg"]>[0];
type Styled = Theme | undefined;

function colorForPercent(percent: number): ThemeColor {
	return percent >= 90 ? "error" : percent >= 70 ? "warning" : "success";
}

function style(theme: Styled, role: ThemeColor, text: string): string {
	return theme ? theme.fg(role, text) : text;
}

function bar(theme: Theme, percent: number, remaining: boolean): string {
	const used = Math.min(100, Math.max(0, percent));
	const filled = Math.round(((remaining ? 100 - used : used) / 100) * BAR_WIDTH);
	return (
		theme.fg("dim", "[") +
		theme.fg(colorForPercent(used), "█".repeat(filled)) +
		theme.fg("dim", "░".repeat(BAR_WIDTH - filled)) +
		theme.fg("dim", "]")
	);
}

function rowLine(row: UsageRow, theme?: Theme): string {
	const percent = row.usedPercent;
	const usage =
		percent === undefined
			? ""
			: theme
				? ` ${bar(theme, percent, true)} ${style(theme, colorForPercent(percent), `${Math.round(100 - percent)}% left`)}`
				: ` ${Math.round(100 - percent)}% left`;
	const value = row.value ? ` · ${row.value}` : "";
	const reset = row.reset ? ` · ↻${row.reset}` : "";
	return `  ${row.label.padEnd(18)}${usage}${value}${reset}`;
}

function providerLines(provider: ProviderView, theme?: Theme): string[] {
	const title = theme?.bold ? theme.bold(provider.title) : provider.title;
	return [
		style(theme, "accent", title),
		`  source: ${provider.source}`,
		...(provider.plan ? [`  plan: ${provider.plan}`] : []),
		...provider.rows.map((row) => rowLine(row, theme)),
		...provider.warnings.map((warning) =>
			style(theme, "warning", `  warning: ${warning}`),
		),
	];
}

function viewLines(view: UsageView, theme?: Theme): string[] {
	const lines = view.providers.flatMap((provider) => [
		...providerLines(provider, theme),
		"",
	]);
	for (const error of view.errors)
		lines.push(style(theme, "error", `${error.label}: ${error.message}`), "");
	return lines.length > 0
		? lines
		: [style(theme, "muted", "No connected supported providers were found.")];
}

export function footerStatus(view: UsageView, theme: Theme): string {
	return view.footer
		.map(
			(item) =>
				`${style(theme, "dim", item.label)} ${bar(theme, item.usedPercent, false)} ${style(theme, colorForPercent(item.usedPercent), `${Math.round(item.usedPercent)}%`)}`,
		)
		.join(style(theme, "dim", " · "));
}

export function plainUsageText(view: UsageView): string {
	return viewLines(view).join("\n").trim();
}

function padLine(line: string, width: number): string {
	const clipped = truncateToWidth(line, width, "");
	return clipped + " ".repeat(Math.max(0, width - visibleWidth(clipped)));
}

function centerLine(line: string, width: number): string {
	const clipped = truncateToWidth(line, width, "");
	const padding = Math.max(0, width - visibleWidth(clipped));
	const left = Math.floor(padding / 2);
	return `${" ".repeat(left)}${clipped}${" ".repeat(padding - left)}`;
}

export async function showUsageOverlay(
	ctx: ExtensionCommandContext,
	view: UsageView,
): Promise<void> {
	if (!ctx.ui.custom) {
		ctx.ui.notify(plainUsageText(view), "info");
		return;
	}

	await ctx.ui.custom(
		(tui, theme, _keybindings, done) => {
			let scrollTop = 0;
			const rows = () => Math.max(1, (tui.terminal.rows ?? 24) - 5);
			const body = () => viewLines(view, theme);
			const move = (delta: number) => {
				const max = Math.max(0, body().length - rows());
				scrollTop = Math.min(max, Math.max(0, scrollTop + delta));
				tui.requestRender();
			};
			return {
				render(width: number): string[] {
					if (width < 3) return [truncateToWidth("Provider usage", width, "")];
					const inner = width - 2;
					const content = body();
					const visible = content.slice(scrollTop, scrollTop + rows());
					const title = ` ${theme.bold(theme.fg("accent", "Provider usage"))} `;
					const footer = ` ${theme.fg("dim", `${Math.min(content.length, scrollTop + rows())}/${content.length} lines · ↑↓ scroll · Enter/Esc close`)} `;
					return [
						theme.fg("border", `╭${"─".repeat(inner)}╮`),
						`${theme.fg("border", "│")}${centerLine(title, inner)}${theme.fg("border", "│")}`,
						`${theme.fg("border", "│")}${" ".repeat(inner)}${theme.fg("border", "│")}`,
						...visible.map(
							(line) =>
								`${theme.fg("border", "│")}${padLine(line, inner)}${theme.fg("border", "│")}`,
						),
						...Array.from(
							{ length: Math.max(0, rows() - visible.length) },
							() =>
								`${theme.fg("border", "│")}${" ".repeat(inner)}${theme.fg("border", "│")}`,
						),
						`${theme.fg("border", "│")}${padLine(footer, inner)}${theme.fg("border", "│")}`,
						theme.fg("border", `╰${"─".repeat(inner)}╯`),
					];
				},
				invalidate() {},
				handleInput(data: string): void {
					if (
						matchesKey(data, Key.escape) ||
						matchesKey(data, Key.enter) ||
						data.toLowerCase() === "q"
					) {
						done(undefined);
						return;
					}
					if (matchesKey(data, Key.up)) move(-1);
					else if (matchesKey(data, Key.down)) move(1);
					else if (matchesKey(data, Key.pageUp)) move(-(rows() - 1));
					else if (matchesKey(data, Key.pageDown)) move(rows() - 1);
				},
			};
		},
		{ overlay: true, overlayOptions: { maxHeight: "80%" } },
	);
}

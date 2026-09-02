import type {
	ExtensionAPI,
	ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { buildUsageView } from "./renderer.ts";
import { plainUsageText, footerStatus, showUsageOverlay } from "./ui.ts";
import { createProviderRegistry, queryProviders } from "./providers/index.ts";
import type { ProviderState } from "./types.ts";

const STATUS_KEY = "provider-usage-bars";
const REFRESH_INTERVAL_MS = 5 * 60_000;
const MIN_REFRESH_INTERVAL_MS = 30_000;

function uiContext(ctx: ExtensionContext): boolean {
	return ctx.hasUI && (ctx.mode === "tui" || ctx.mode === "rpc");
}

export default function providerUsageBarsExtension(pi: ExtensionAPI): void {
	const registry = createProviderRegistry();
	let states: ProviderState[] = registry
		.list()
		.map((provider) => ({ provider, status: "unconfigured" }));
	let currentContext: ExtensionContext | undefined;
	let timer: ReturnType<typeof setInterval> | undefined;
	let request: Promise<ProviderState[]> | undefined;
	let controller: AbortController | undefined;
	let generation = 0;
	let lastRefreshAt = 0;

	const publish = (ctx: ExtensionContext): void => {
		const view = buildUsageView(states);
		const status = footerStatus(view, ctx.ui.theme);
		if (status) {
			ctx.ui.setStatus(STATUS_KEY, status);
			return;
		}
		ctx.ui.setStatus(
			STATUS_KEY,
			states.some((state) => state.status === "loading")
				? ctx.ui.theme.fg("dim", "usage checking…")
				: states.some((state) => state.status === "error")
					? ctx.ui.theme.fg("warning", "usage unavailable")
					: undefined,
		);
	};

	const refresh = async (
		ctx: ExtensionContext,
		force: boolean,
	): Promise<ProviderState[]> => {
		if (!uiContext(ctx)) return states;
		if (request) return request;
		if (!force && Date.now() - lastRefreshAt < MIN_REFRESH_INTERVAL_MS) {
			publish(ctx);
			return states;
		}

		const runGeneration = generation;
		const runController = new AbortController();
		controller?.abort();
		controller = runController;
		lastRefreshAt = Date.now();
		states = states.map((state) =>
			state.report ? state : { ...state, status: "loading" },
		);
		publish(ctx);

		const run = queryProviders(ctx, registry, runController.signal, states).then(
			(next) => {
				if (runGeneration === generation && !runController.signal.aborted) {
					states = next;
					publish(ctx);
				}
				return states;
			},
		);
		request = run;
		void run.then(
			() => {
				if (request === run) request = undefined;
				if (controller === runController) controller = undefined;
			},
			() => {
				if (request === run) request = undefined;
				if (controller === runController) controller = undefined;
			},
		);
		return run;
	};

	const start = (ctx: ExtensionContext): void => {
		stop();
		currentContext = ctx;
		timer = setInterval(() => {
			if (currentContext) void refresh(currentContext, false);
		}, REFRESH_INTERVAL_MS);
		timer.unref?.();
		void refresh(ctx, true);
	};

	function stop(ctx?: ExtensionContext): void {
		generation += 1;
		controller?.abort();
		controller = undefined;
		request = undefined;
		if (timer) clearInterval(timer);
		timer = undefined;
		const target = ctx ?? currentContext;
		if (target?.hasUI) target.ui.setStatus(STATUS_KEY, undefined);
		currentContext = undefined;
	}

	pi.registerCommand("usage", {
		description: "Show connected provider usage with bars",
		getArgumentCompletions: (prefix) =>
			"refresh".startsWith(prefix)
				? [
						{
							value: "refresh",
							label: "refresh",
							description: "Fetch provider usage now",
						},
					]
				: null,
		handler: async (args, ctx) => {
			const option = args.trim();
			if (option && option !== "refresh") {
				ctx.ui.notify("Usage: /usage [refresh]", "warning");
				return;
			}
			const current = await refresh(ctx, option === "refresh");
			const view = buildUsageView(current);
			if (ctx.mode === "tui") await showUsageOverlay(ctx, view);
			else if (ctx.hasUI) ctx.ui.notify(plainUsageText(view), "info");
			else process.stdout.write(`${plainUsageText(view)}\n`);
		},
	});

	pi.on("session_start", (_event, ctx) => start(ctx));
	pi.on("model_select", (_event, ctx) => {
		currentContext = ctx;
		void refresh(ctx, false);
	});
	pi.on("agent_settled", (_event, ctx) => void refresh(ctx, false));
	pi.on("session_shutdown", (_event, ctx) => stop(ctx));
}

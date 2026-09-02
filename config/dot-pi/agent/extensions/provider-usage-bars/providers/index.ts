import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { anthropicProvider } from "./anthropic.ts";
import { codexProvider } from "./codex.ts";
import { githubCopilotProvider } from "./github-copilot.ts";
import { errorMessage } from "./shared.ts";
import type {
	ProviderState,
	UsageProvider,
	UsageProviderRegistry,
} from "../types.ts";

/** The adapter catalog is the only provider list. Core and UI stay provider-neutral. */
export const builtInProviders: readonly UsageProvider[] = [
	codexProvider,
	anthropicProvider,
	githubCopilotProvider,
];

export function createProviderRegistry(
	extra: readonly UsageProvider[] = [],
): UsageProviderRegistry {
	const providers = [...builtInProviders, ...extra].filter(
		(provider, index, all) =>
			all.findIndex((candidate) => candidate.id === provider.id) === index,
	);
	return { list: () => providers };
}

export async function queryProviders(
	ctx: ExtensionContext,
	registry: UsageProviderRegistry,
	signal: AbortSignal,
	previous: readonly ProviderState[],
): Promise<ProviderState[]> {
	const oldStates = new Map(previous.map((state) => [state.provider.id, state]));
	return Promise.all(
		registry.list().map(async (provider): Promise<ProviderState> => {
			const previousState = oldStates.get(provider.id);
			let identityKey: string | undefined;
			try {
				const auth = await provider.resolveAuth(ctx);
				if (!auth) return { provider, status: "unconfigured" };
				identityKey = auth.identityKey;
				return {
					provider,
					status: "ready",
					report: await provider.fetchUsage(auth, signal),
					identityKey,
				};
			} catch (error) {
				const message = errorMessage(error);
				return previousState?.report && previousState.identityKey === identityKey
					? { ...previousState, status: "ready", error: message }
					: { provider, status: "error", error: message };
			}
		}),
	);
}

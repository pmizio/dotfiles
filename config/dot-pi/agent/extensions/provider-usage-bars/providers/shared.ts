import { createHash } from "node:crypto";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type {
	UsageMetric,
	UsageValue,
	ResolvedProviderAuth,
} from "../types.ts";

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_BODY_BYTES = 256 * 1024;

export function asObject(value: unknown): Record<string, unknown> | undefined {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

export function asString(value: unknown): string | undefined {
	return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function asNumber(value: unknown): number | undefined {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim()) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : undefined;
	}
	return undefined;
}

export function asBoolean(value: unknown): boolean | undefined {
	return typeof value === "boolean" ? value : undefined;
}

export function clampPercent(value: number): number {
	return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
}

export function displayValue(value: unknown): UsageValue | undefined {
	return asNumber(value) ?? asString(value);
}

/** Accept epoch seconds, epoch milliseconds, numeric strings, or ISO dates. */
export function timestampSeconds(value: unknown): number | undefined {
	const numeric = asNumber(value);
	if (numeric !== undefined && numeric > 0) {
		return numeric >= 10_000_000_000 ? Math.round(numeric / 1_000) : numeric;
	}
	if (typeof value === "string" && value.trim()) {
		const parsed = Date.parse(value);
		return Number.isFinite(parsed) ? Math.floor(parsed / 1_000) : undefined;
	}
	return undefined;
}

interface NormalizedWindow {
	usedPercent: number;
	windowMinutes?: number;
	resetAt?: number;
}

function normalizeWindow(
	raw: unknown,
	capturedAt: number,
): NormalizedWindow | undefined {
	const value = asObject(raw);
	const used = asNumber(
		value?.used_percent ?? value?.usedPercent ?? value?.utilization,
	);
	if (used === undefined) return undefined;
	const seconds = asNumber(
		value?.limit_window_seconds ??
			value?.windowDurationSecs ??
			value?.window_duration_seconds,
	);
	const windowMinutes =
		seconds !== undefined && seconds > 0
			? Math.ceil(seconds / 60)
			: asNumber(value?.window_minutes ?? value?.windowMinutes);
	const resetAt =
		timestampSeconds(value?.reset_at ?? value?.resetAt ?? value?.resets_at) ??
		(() => {
			const after = asNumber(
				value?.reset_after_seconds ?? value?.resetAfterSeconds,
			);
			return after !== undefined && after >= 0
				? Math.round(capturedAt / 1_000) + after
				: undefined;
		})();
	return {
		usedPercent: clampPercent(used),
		...(windowMinutes !== undefined && windowMinutes > 0
			? { windowMinutes }
			: {}),
		...(resetAt === undefined ? {} : { resetAt }),
	};
}

export function windowLabel(
	minutes: number | undefined,
	fallback = "usage",
): string {
	if (minutes === undefined || !Number.isFinite(minutes) || minutes <= 0)
		return fallback;
	if (minutes % 10_080 === 0) return `${minutes / 1_440}d`;
	if (minutes % 1_440 === 0) return `${minutes / 1_440}d`;
	if (minutes % 60 === 0) return `${minutes / 60}h`;
	return `${Math.round(minutes)}m`;
}

export function windowMetric(
	id: string,
	fallbackLabel: string,
	raw: unknown,
	capturedAt: number,
): UsageMetric | undefined {
	const window = normalizeWindow(raw, capturedAt);
	if (!window) return undefined;
	return {
		id,
		label: windowLabel(window.windowMinutes, fallbackLabel),
		kind: "window",
		usedPercent: window.usedPercent,
		...(window.resetAt === undefined ? {} : { resetAt: window.resetAt }),
	};
}

/** Provider-owned strings may be rendered in the terminal, so strip controls and bound them. */
export function safeText(value: unknown, maxLength = 120): string | undefined {
	const text = asString(value)
		?.replace(/[\u0000-\u001f\u007f\u009b]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
	if (!text) return undefined;
	return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function headerValue(
	headers: Record<string, string | null> | undefined,
	name: string,
): string | undefined {
	return (
		Object.entries(headers ?? {}).find(
			([key]) => key.toLowerCase() === name.toLowerCase(),
		)?.[1] ?? undefined
	);
}

function accountIdFromJwt(token: string): string | undefined {
	try {
		const parts = token.split(".");
		if (parts.length !== 3 || !parts[1]) return undefined;
		const payload = JSON.parse(
			Buffer.from(parts[1], "base64url").toString("utf8"),
		) as Record<string, unknown>;
		const nested = asObject(payload["https://api.openai.com/auth"]);
		const nestedId = asString(nested?.chatgpt_account_id);
		return (
			nestedId ??
			asString(payload["https://api.openai.com/auth.chatgpt_account_id"])
		);
	} catch {
		return undefined;
	}
}

export async function resolvePiProviderAuth(
	ctx: ExtensionContext,
	providerId: string,
	officialOrigin?: string,
): Promise<ResolvedProviderAuth | undefined> {
	const resolved = await ctx.modelRegistry.getProviderAuth(providerId);
	const auth = resolved?.auth;
	if (!auth) return undefined;
	if (officialOrigin && auth.baseUrl) {
		let origin: string;
		try {
			origin = new URL(auth.baseUrl).origin;
		} catch {
			throw new Error(`${providerId} usage refuses an invalid provider origin.`);
		}
		if (origin !== officialOrigin) {
			throw new Error(
				`${providerId} usage refuses a non-official provider origin.`,
			);
		}
	}
	const authorization = headerValue(auth.headers, "Authorization");
	const token =
		authorization?.replace(/^Bearer\s+/i, "").trim() ?? auth.apiKey?.trim();
	if (!token) return undefined;
	const accountId =
		providerId === "openai-codex"
			? (accountIdFromJwt(token) ??
				headerValue(auth.headers, "ChatGPT-Account-Id"))
			: undefined;
	return {
		token,
		...(accountId ? { accountId } : {}),
		identityKey: createHash("sha256").update(token).digest("hex").slice(0, 24),
	};
}

export function bearerHeaders(
	auth: ResolvedProviderAuth,
	extra: Record<string, string> = {},
): Record<string, string> {
	return {
		Authorization: `Bearer ${auth.token}`,
		Accept: "application/json",
		...extra,
	};
}

export function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

async function readBoundedBody(response: Response): Promise<string> {
	if (!response.body) return "";
	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let bytes = 0;
	let text = "";
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			bytes += value.byteLength;
			if (bytes > MAX_BODY_BYTES) {
				try {
					await reader.cancel();
				} catch {
					/* best effort */
				}
				throw new Error("response body exceeded the usage limit");
			}
			text += decoder.decode(value, { stream: true });
		}
		return text + decoder.decode();
	} finally {
		try {
			reader.releaseLock();
		} catch {
			/* best effort */
		}
	}
}

export async function fetchJson(
	url: string,
	init: RequestInit,
	signal: AbortSignal,
	description: string,
	timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<unknown> {
	const timeoutSignal = AbortSignal.timeout(timeoutMs);
	const combined = AbortSignal.any([signal, timeoutSignal]);
	let response: Response;
	try {
		response = await fetch(url, { ...init, signal: combined, redirect: "error" });
	} catch (error) {
		if (combined.aborted)
			throw new Error(`${description} request timed out or was cancelled.`);
		throw new Error(`${description} request failed: ${errorMessage(error)}`);
	}
	if (!response.ok)
		throw new Error(`${description} returned HTTP ${response.status}.`);
	const text = await readBoundedBody(response);
	try {
		return JSON.parse(text) as unknown;
	} catch {
		throw new Error(`${description} returned invalid JSON.`);
	}
}

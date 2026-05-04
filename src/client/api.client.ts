// Shared client helper: POST JSON to a `?command=<name>` endpoint and parse
// the `CommandResponse<T>` envelope. Centralises serialisation, status-code
// handling, and JSON-parse fallbacks so each Lit component doesn't reimplement
// them. Use `AbortController` to cancel an in-flight request (see Lit's
// `disconnectedCallback` to clean up when a component unmounts).

import type {CommandResponse} from "../types";

export async function postJson<T>(url: string, body: unknown, signal?: AbortSignal): Promise<CommandResponse<T>> {
	const init: RequestInit = {
		method: "POST",
		headers: {"Content-Type": "application/json"},
		body: JSON.stringify(body),
	};
	if (signal !== undefined) {
		init.signal = signal;
	}

	let response: Response;
	try {
		response = await fetch(url, init);
	} catch (e) {
		// Caller distinguishes cancellation from real failures; let it through.
		if (e instanceof DOMException && e.name === "AbortError") {
			throw e;
		}
		return wrapFailure("Network error: " + (e instanceof Error ? e.message : String(e)));
	}

	const text = await response.text();

	if (!response.ok) {
		return wrapFailure(`HTTP ${response.status}: ${text}`, `HTTP_${response.status}`);
	}

	try {
		return JSON.parse(text) as CommandResponse<T>;
	} catch (_e) {
		return wrapFailure("Invalid JSON response: " + text);
	}
}

function wrapFailure(message: string, code?: string): CommandResponse<never> {
	return {ok: false, error: code !== undefined ? {code, message} : {message}};
}

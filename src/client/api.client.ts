// Shared client helper: POST JSON to a `?command=<name>` endpoint and parse
// the `CommandResponse<T>` envelope. Centralises serialisation, status-code
// handling, and JSON-parse fallbacks so each Lit component doesn't reimplement
// them. Use `AbortController` to cancel an in-flight request (see Lit's
// `disconnectedCallback` to clean up when a component unmounts).

import type {CommandResponse} from "../app/types";

// How much of an unparseable body to quote back in the error message. A whole
// body can be megabytes (a 1000-row SuiteQL page) and floods the status line.
const bodyExcerptLimit = 400;

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
		return wrapFailure(`HTTP ${response.status}: ${excerpt(text)}`, `HTTP_${response.status}`);
	}

	return parseEnvelope<T>(text);
}

// Turns a raw response body into an envelope, tolerating NetSuite's HTML debug
// footers. Exported for tests — `postJson` is the only production caller.
export function parseEnvelope<T>(text: string): CommandResponse<T> {
	const direct = tryParse<T>(text);
	if (direct !== undefined) {
		return direct;
	}
	const stripped = tryParse<T>(stripTrailingHtmlComments(text));
	if (stripped !== undefined) {
		return stripped;
	}
	return wrapFailure("Invalid JSON response: " + excerpt(text));
}

// NetSuite appends debug footers to Suitelet responses whose content type it
// treats as HTML, after whatever the script itself wrote:
//
//   {"ok":true,…}<!-- 481 s: 47% #61 --> <!-- Host [ … ] --> <!-- COMPID [ … ] -->
//
// which makes JSON.parse fail on an otherwise perfectly good envelope. The
// command endpoint declares `application/json` to suppress them (main.ts), but
// that header isn't honoured in every account/context, so drop the footers here
// too. Only reached after a plain parse has already failed.
export function stripTrailingHtmlComments(text: string): string {
	let out = text.trimEnd();
	// Peel one complete trailing comment at a time (they can't nest), so a
	// comment-looking substring earlier in the body is never swallowed.
	while (out.endsWith("-->")) {
		const start = out.lastIndexOf("<!--");
		if (start < 0) {
			break;
		}
		out = out.slice(0, start).trimEnd();
	}
	return out;
}

function tryParse<T>(text: string): CommandResponse<T> | undefined {
	try {
		return JSON.parse(text) as CommandResponse<T>;
	} catch (_e) {
		return undefined;
	}
}

// Keeps both ends of an oversized body: the head shows what the response
// actually is, the tail shows whatever got appended to it.
function excerpt(text: string): string {
	if (text.length <= bodyExcerptLimit) {
		return text;
	}
	const half = bodyExcerptLimit / 2;
	return text.slice(0, half) + ` […${text.length} chars total…] ` + text.slice(-half);
}

function wrapFailure(message: string, code?: string): CommandResponse<never> {
	return {ok: false, error: code !== undefined ? {code, message} : {message}};
}

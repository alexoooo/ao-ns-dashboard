// In strict mode, `catch (e)` types `e` as `unknown`. NetSuite throws
// SuiteScriptError instances which behave like Error (have `name`/`message`)
// but `e instanceof Error` is unreliable in the AMD bundle context — different
// realm / different Error prototype than the one TypeScript's lib references.
// Duck-type on `.message` / `.name` instead so we never fall back to
// `String(e)`, which would JSON-serialize the whole error (including the
// stack trace) into something like `{"name":"...","message":"...","stack":...}`.

function asPropString(e: unknown, prop: "message" | "name"): string | undefined {
	if (e == null || typeof e !== "object") return undefined;
	const value = (e as Record<string, unknown>)[prop];
	return typeof value === "string" ? value : undefined;
}

export function errorMessage(e: unknown): string {
	if (typeof e === "string") return e;
	const msg = asPropString(e, "message");
	if (msg !== undefined) return msg;
	return String(e);
}

export function errorName(e: unknown): string {
	return asPropString(e, "name") ?? "";
}

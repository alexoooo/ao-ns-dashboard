// Shared separator-splitter helpers — used by both server-side parsing and
// client-side `groupKey` implementations. Pure code with no NetSuite imports
// so it can be `?raw`-loaded into a client module *and* statically imported
// by server modules from `src/utils.ts` (which re-exports from here).
//
// Each function splits on its delimiter while honouring `\<delim>` as an
// escape. Implementation uses a random sentinel to round-trip escapes
// without the cost of a stateful parser.

export function splitAmpersand(value: string): string[] {
	const sentinel = "__AMPERSAND_ESCAPE__" + Math.random().toString(36).substring(2);
	const withSentinel = value.replaceAll("\\&", sentinel);
	return withSentinel.split("&").map(i => i.replaceAll(sentinel, "&"));
}

export function splitVerticalBar(value: string): string[] {
	const sentinel = "__VERTICAL_BAR_ESCAPE__" + Math.random().toString(36).substring(2);
	const withSentinel = value.replaceAll("\\|", sentinel);
	return withSentinel.split("|").map(i => i.replaceAll(sentinel, "|"));
}

export function splitSlash(value: string): string[] {
	if (value === "") {
		return [];
	}
	const sentinel = "__SLASH_ESCAPE__" + Math.random().toString(36).substring(2);
	const withSentinel = value.replaceAll("\\/", sentinel);
	return withSentinel.split("/").map(i => i.replaceAll(sentinel, "/"));
}

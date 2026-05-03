export function normalizeKey(value) {
	return value.replace(/[^A-Za-z0-9_-]/g, "").toLowerCase();
}


export function splitAmpersand(value) {
	const sentinel = "__AMPERSAND_ESCAPE__" + Math.random().toString(36).substring(2);
	const withSentinel = value.replaceAll("\\&", sentinel);
	return withSentinel.split("&").map(i => i.replaceAll(sentinel, "&"));
}


export function splitVerticalBar(value) {
	const sentinel = "__VERTICAL_BAR_ESCAPE__" + Math.random().toString(36).substring(2);
	const withSentinel = value.replaceAll("\\|", sentinel);
	return withSentinel.split("|").map(i => i.replaceAll(sentinel, "|"));
}


export function splitSlash(value) {
	if (value === "") {
		return [];
	}
	const sentinel = "__SLASH_ESCAPE__" + Math.random().toString(36).substring(2);
	const withSentinel = value.replaceAll("\\/", sentinel);
	return withSentinel.split("/").map(i => i.replaceAll(sentinel, "/"));
}

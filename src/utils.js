export function normalizeKey(value) {
	return value.replace(/[^A-Za-z0-9_-]/g, "").toLowerCase();
}


export function splitAmpersand(value) {
	const sentinel = "__AMPERSAND_ESCAPE__" + Math.random().toString(36).substring(2);
	const withSentinel = value.replaceAll("\\&", sentinel);
	return withSentinel.split("&").map(i => i.replaceAll(sentinel, "&"));
}


// Also mirrored in src/client/bulk-runner.client.js for client-side groupKey
// use. Keep both copies in sync if escape semantics change.
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


// Set-equality for lists. Used for multiselect comparisons where NetSuite may
// return values in a different order than they were set.
export function listsEqual(a, b) {
	if (a.length !== b.length) {
		return false;
	}
	const sortedA = [...a].sort();
	const sortedB = [...b].sort();
	return JSON.stringify(sortedA) === JSON.stringify(sortedB);
}

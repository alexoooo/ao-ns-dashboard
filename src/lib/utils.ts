// Generic helpers — no NetSuite dependencies, fully testable.
//
// The pipe / ampersand / slash splitters live in src/shared/separators.ts so
// they can also be `?raw`-loaded into client modules. Server code imports
// them from here for convenience.

export {splitAmpersand, splitVerticalBar, splitSlash} from "../shared/separators";

export function normalizeKey(value: string): string {
	return value.replace(/[^A-Za-z0-9_-]/g, "").toLowerCase();
}

// Set-equality for lists. Used for multiselect comparisons where NetSuite may
// return values in a different order than they were set.
export function listsEqual(a: readonly unknown[], b: readonly unknown[]): boolean {
	if (a.length !== b.length) {
		return false;
	}
	const sortedA = [...a].sort();
	const sortedB = [...b].sort();
	return JSON.stringify(sortedA) === JSON.stringify(sortedB);
}

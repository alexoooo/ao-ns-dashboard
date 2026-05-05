// Shared CSV encoder for client-side download buttons.

// Prevents CSV formula injection: spreadsheets evaluate cells starting with
// =, +, -, @, tab, or CR as formulas even when wrapped in quotes. Also doubles
// internal double-quotes so the cell can be safely wrapped in "...".
export function csvEncode(value: unknown): string {
	let str = stringify(value);
	if (typeof value !== "number" && /^[=+\-@\t\r]/.test(str)) {
		str = "'" + str;
	}
	return str.replaceAll('"', '""');
}

function stringify(value: unknown): string {
	if (value == null) return "";
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") return String(value);
	// Plain objects and arrays would otherwise stringify as "[object Object]"
	// or comma-joined; JSON gives a useful, deterministic representation.
	return JSON.stringify(value);
}

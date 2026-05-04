// Shared CSV encoder for client-side download buttons.

// Prevents CSV formula injection: spreadsheets evaluate cells starting with
// =, +, -, @, tab, or CR as formulas even when wrapped in quotes. Also doubles
// internal double-quotes so the cell can be safely wrapped in "...".
export function csvEncode(value) {
	let str = value == null ? "" : String(value);
	if (/^[=+\-@\t\r]/.test(str)) {
		str = "'" + str;
	}
	return str.replaceAll('"', '""');
}

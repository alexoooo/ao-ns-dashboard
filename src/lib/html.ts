const escapeMap: Readonly<Record<string, string>> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
};

export function escapeHtml(value: unknown): string {
	return String(value).replace(/[&<>"']/g, c => escapeMap[c] ?? c);
}

const placeholder = /\{\{(\w+)\}\}/g;

// Substitutes {{key}} markers in `template` with values from `vars`.
// Keys whose name ends in "Html" or "Js" are inserted verbatim;
// every other key is HTML-escaped.
export function interpolate(template: string, vars: Record<string, unknown>): string {
	return template.replace(placeholder, (_match, key: string) => {
		if (!Object.hasOwn(vars, key)) {
			throw new Error(`interpolate: missing key '${key}'`);
		}
		const value = vars[key];
		if (key.endsWith("Html") || key.endsWith("Js")) {
			return String(value);
		}
		return escapeHtml(value);
	});
}

// Wraps a page's help body in the shared disclosure toggle. The layout places
// this at the top-right of the page content (see layout.html), so the toggle
// shares a line with the page heading instead of consuming a row of its own.
// `position: relative` on the <details> anchors the panel *and* is what makes
// `z-index` apply to the float — the panel has to paint above the sticky
// action row / thead used by the SuiteQL and bulk-runner tables.
export function documentationSection(documentationHtml: string): string {
	return `
		<details style="float: right; position: relative; z-index: 10; margin: 0 0 0.5em 1em">
			<summary style="cursor: pointer; padding: 0.4em 1em; background: #eee; border: 1px solid #ccc; border-radius: 2px; display: inline-block; user-select: none">
				<span class="material-icons md-18" style="vertical-align: middle">help</span>
				Help
			</summary>
			<div style="position: absolute; right: 0; top: 100%; width: 60em; max-width: 80vw; box-sizing: border-box; padding: 1em; text-align: left; background: white; border: 1px solid #ccc; border-radius: 2px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2)">
				${documentationHtml}
			</div>
		</details>
	`;
}

const escapeMap = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
};

export function escapeHtml(value) {
	return String(value).replace(/[&<>"']/g, c => escapeMap[c]);
}

const placeholder = /\{\{(\w+)\}\}/g;

// Substitutes {{key}} markers in `template` with values from `vars`.
// Keys whose name ends in "Html" or "Js" are inserted verbatim;
// every other key is HTML-escaped.
export function interpolate(template, vars) {
	return template.replace(placeholder, (match, key) => {
		if (! Object.hasOwn(vars, key)) {
			throw new Error(`interpolate: missing key '${key}'`);
		}
		const value = vars[key];
		if (key.endsWith("Html") || key.endsWith("Js")) {
			return String(value);
		}
		return escapeHtml(value);
	});
}


export function documentationSection(documentationHtml) {
	return `
		<details style="margin-bottom: 1em">
			<summary style="cursor: pointer; padding: 0.4em 1em; background: #eee; border: 1px solid #ccc; border-radius: 2px; display: inline-block; user-select: none">
				<span class="material-icons md-18" style="vertical-align: middle">help</span>
				Help
			</summary>
			<div style="padding: 1em 0 0 0; max-width: 60em">
				${documentationHtml}
			</div>
		</details>
	`;
}

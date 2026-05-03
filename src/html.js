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
		<script>
			var documentationShowing = false;
			function toggleDocumentation() {
				documentationShowing = ! documentationShowing;
				document.getElementById('docBody').style.display =
					documentationShowing ? "block" : "none";
			}
		</script>
		<div style="margin-bottom: 1em"><button
				class="mdl-button mdl-js-button mdl-button--raised mdl-button--colored"
				onclick="toggleDocumentation()">
			<span class="material-icons md-18">help</span> Help
		</button></div>
		<div id="docBody" style="display:none">
			${documentationHtml}
		</div>
	`;
}

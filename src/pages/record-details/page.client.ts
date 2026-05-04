// Record Details page Lit component.
//
// Wraps the Select2-driven record-type dropdown and the record-id form in a
// custom element so the page follows the same component model as every other
// page (no inline jQuery / global functions). The server still renders the
// `detailsHtml` block server-side and passes it as an attribute; this
// component just owns the form chrome and the loading-spinner state.
//
// We deliberately do NOT use `lit/directives/unsafe-html.js` to inject the
// server-rendered HTML chunks — that submodule isn't in the import map (only
// the bundled `"lit"` entry-point is) and we don't want to manage transitive
// CDN paths just for one directive. Instead, we reserve empty hosts in the
// Lit template (no bindings inside), then set their `innerHTML` directly.
// lit-html doesn't reconcile children of elements with no internal template
// parts, so the injected DOM stays put across re-renders.

import {LitElement, html, type PropertyValues, type TemplateResult} from "lit";

// jQuery + Select2 are loaded globally by layout.html's <script> tags.
declare const $: (selector: unknown) => {
	select2(options: {placeholder: string}): unknown;
};

class RecordDetailsPage extends LitElement {
	static override properties = {
		paramRecordType: {type: String, attribute: "param-record-type"},
		paramRecordId: {type: String, attribute: "param-record-id"},
		recordType: {type: String, attribute: "record-type"},
		recordId: {type: String, attribute: "record-id"},
		recordTypeOptionsHtml: {type: String, attribute: "record-type-options-html"},
		detailsHtml: {type: String, attribute: "details-html"},
		loading: {state: true},
	};

	declare paramRecordType: string;
	declare paramRecordId: string;
	declare recordType: string;
	declare recordId: string;
	declare recordTypeOptionsHtml: string;
	declare detailsHtml: string;
	declare loading: boolean;

	constructor() {
		super();
		this.paramRecordType = "";
		this.paramRecordId = "";
		this.recordType = "";
		this.recordId = "";
		this.recordTypeOptionsHtml = "";
		this.detailsHtml = "";
		this.loading = false;
	}

	override createRenderRoot() {
		return this;
	}

	override firstUpdated(): void {
		// Populate the <select>'s option list BEFORE Select2 initialises —
		// Select2 reads existing <option> children when it builds its UI.
		// Includes the empty placeholder option so Select2's "placeholder"
		// behaviour works correctly.
		const select = this.querySelector<HTMLSelectElement>(".record-type-select");
		if (select) {
			select.innerHTML = "<option></option>" + this.recordTypeOptionsHtml;
		}

		// Using jQuery directly because Select2 is a jQuery plugin and that's
		// how it's loaded site-wide (see layout.html).
		$(select).select2({placeholder: "Please make a selection"});
	}

	override updated(_changed: PropertyValues): void {
		// MDL classes need re-upgrading after each render so freshly created
		// inputs/buttons pick up ripple/floating-label behavior.
		window.componentHandler?.upgradeElements(this);

		// Server-rendered detailsHtml only changes once per page load (the
		// server re-renders on form submit, which is a fresh request), so
		// we just inject every time the host is present and not loading.
		const host = this.querySelector(".details-host");
		if (host && this.detailsHtml !== "") {
			host.innerHTML = this.detailsHtml;
		}
	}

	private onTypeSelectChange(e: Event): void {
		const target = e.target as HTMLSelectElement;
		this.recordType = target.value;
	}

	private onSubmit(): void {
		// Show the spinner immediately; the page reload that follows will
		// replace this state with the server-rendered detailsHtml.
		this.loading = true;
	}

	override render(): TemplateResult {
		return html`
			<div>
				<h2>Retrieve all info about a particular record</h2>
				<hr />
			</div>
			<form method="post" @submit=${this.onSubmit}>
				<fieldset>
					<legend>Record Type Search</legend>
					<!-- options injected via firstUpdated() before Select2 initialises -->
					<select
						class="record-type-select"
						id="record-type-search"
						@change=${this.onTypeSelectChange}
					></select>
				</fieldset>
				<fieldset style="margin-top: 0.5em; width: 30em">
					<!-- NB: floating label doesn't work with programmatic value assignment -->
					<legend>Record Type</legend>
					<input
						class="mdl-textfield__input"
						type="text"
						id="recordType"
						name=${this.paramRecordType}
						.value=${this.recordType}
					/>
				</fieldset>
				<br />
				<div class="mdl-textfield mdl-js-textfield mdl-textfield--floating-label">
					<input
						class="mdl-textfield__input"
						type="text"
						id="recordId"
						name=${this.paramRecordId}
						.value=${this.recordId}
						autofocus
					/>
					<label class="mdl-textfield__label" for="recordId">Internal ID</label>
				</div>
				<br />
				<button type="submit" class="mdl-button mdl-js-button mdl-button--raised mdl-button--colored">
					<span class="material-icons md-18">search</span> Get Details
				</button>
				<hr />
				${this.loading
					? html`<div class="mdl-spinner mdl-js-spinner is-active"></div>`
					: html`<div class="details-host"></div>`}
			</form>
		`;
	}
}

customElements.define("record-details-page", RecordDetailsPage);

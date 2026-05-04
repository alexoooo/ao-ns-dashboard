// SuiteQL Query page Lit component. Tracks the current page index, POSTs the
// query + page index to the server, renders the returned rows into a table.
//
// Module fragment — see bulk-runner.client.js for composition rules.

class SuiteqlPage extends LitElement {
	static properties = {
		commandPostUrl: { type: String, attribute: "command-post-url" },
		currentPageIndex: { state: true },
		lastResponse: { state: true },
		statusText: { state: true },
		running: { state: true },
	};

	constructor() {
		super();
		this.commandPostUrl = "";
		this.currentPageIndex = 0;
		this.lastResponse = null;
		this.statusText = "";
		this.running = false;
	}

	createRenderRoot() {
		return this;
	}

	updated() {
		if (window.componentHandler) {
			window.componentHandler.upgradeElements(this);
		}
	}

	render() {
		const resp = this.lastResponse;
		const showPagination = resp != null && resp.pageCount > 1;
		const showResults = resp != null && resp.columns != null;

		return html`
			<fieldset style="width: 60em">
				<legend>SQL</legend>
				<textarea class="mdl-textfield__input" id="sql" rows="8" autofocus></textarea>
			</fieldset>
			<div style="margin-top: 0.5em">
				<button class="mdl-button mdl-js-button mdl-button--raised mdl-button--colored"
						@click=${this.runQuery}
						?disabled=${this.running}>
					<span class="material-icons md-18">play_arrow</span> Run Query
				</button>
				<span style="margin-left: 1em">${this.statusText}</span>
			</div>
			<hr/>
			${showPagination ? html`
				<div style="margin-bottom: 0.5em">
					<button class="mdl-button mdl-js-button"
							@click=${this.prevPage}
							?disabled=${resp.pageIndex === 0}>Previous</button>
					<span style="margin: 0 1em">Page ${resp.pageIndex + 1} / ${resp.pageCount}</span>
					<button class="mdl-button mdl-js-button"
							@click=${this.nextPage}
							?disabled=${resp.pageIndex >= resp.pageCount - 1}>Next</button>
				</div>
			` : ""}
			${showResults ? html`
				<div style="overflow-x: auto; max-height: 40em; overflow-y: auto">
					<table class="mdl-data-table mdl-js-data-table mdl-shadow--2dp" style="white-space: nowrap">
						<thead>
							<tr>${resp.columns.map(c => html`
								<th class="mdl-data-table__cell--non-numeric">${c}</th>
							`)}</tr>
						</thead>
						<tbody>${resp.rows.map(r => html`
							<tr>${r.map(v => html`
								<td class="mdl-data-table__cell--non-numeric" style="font-family: monospace">${v == null ? "" : String(v)}</td>
							`)}</tr>
						`)}</tbody>
					</table>
				</div>
			` : ""}
		`;
	}

	runQuery() {
		this.currentPageIndex = 0;
		this.fetchPage();
	}

	prevPage() {
		if (this.currentPageIndex > 0) {
			this.currentPageIndex--;
			this.fetchPage();
		}
	}

	nextPage() {
		if (this.lastResponse && this.currentPageIndex < this.lastResponse.pageCount - 1) {
			this.currentPageIndex++;
			this.fetchPage();
		}
	}

	fetchPage() {
		const sql = this.querySelector("#sql").value;
		this.statusText = "Running...";
		this.running = true;

		const xhr = new XMLHttpRequest();
		xhr.onreadystatechange = () => {
			if (xhr.readyState !== 4) return;
			this.running = false;
			if (xhr.status !== 200) {
				this.statusText = "HTTP " + xhr.status + ": " + xhr.responseText;
				return;
			}
			let resp;
			try {
				resp = JSON.parse(xhr.responseText);
			}
			catch (e) {
				this.statusText = "Bad response: " + xhr.responseText;
				return;
			}
			if (resp.error) {
				this.statusText = "Error: " + resp.error;
				return;
			}
			this.lastResponse = resp;
			this.statusText = "Page " + (resp.pageIndex + 1) + " of " + Math.max(resp.pageCount, 1) +
				" · " + resp.totalCount + " rows total";
		};
		xhr.open("POST", this.commandPostUrl);
		xhr.setRequestHeader("Content-type", "application/json");
		xhr.send(JSON.stringify({
			query: sql,
			pageIndex: this.currentPageIndex,
			pageSize: 1000,
		}));
	}
}

customElements.define("suiteql-page", SuiteqlPage);

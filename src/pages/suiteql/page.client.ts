// SuiteQL Query page Lit component. Tracks the current page index, POSTs the
// query + page index to the server, renders the returned rows into a table.

import {LitElement, html, type TemplateResult} from "lit";
import {csvEncode} from "csv";
import {postJson} from "api";

interface SuiteqlPageData {
	columns: string[];
	rows: unknown[][];
	pageIndex: number;
	pageCount: number;
	totalCount: number;
}

function formatCell(value: unknown): string {
	if (value == null) return "";
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") return String(value);
	return JSON.stringify(value);
}

class SuiteqlPage extends LitElement {
	static override properties = {
		commandPostUrl: {type: String, attribute: "command-post-url"},
		currentPageIndex: {state: true},
		lastResponse: {state: true},
		statusText: {state: true},
		running: {state: true},
	};

	declare commandPostUrl: string;
	declare currentPageIndex: number;
	declare lastResponse: SuiteqlPageData | null;
	declare statusText: string;
	declare running: boolean;

	private abortController: AbortController | null = null;

	constructor() {
		super();
		this.commandPostUrl = "";
		this.currentPageIndex = 0;
		this.lastResponse = null;
		this.statusText = "";
		this.running = false;
	}

	override disconnectedCallback(): void {
		super.disconnectedCallback();
		this.abortController?.abort();
		this.abortController = null;
	}

	override createRenderRoot() {
		return this;
	}

	override updated(): void {
		window.componentHandler?.upgradeElements(this);
		// Sync the thead's sticky offset with the actual height of the actions row
		// so the column headers freeze just below it instead of overlapping.
		const actions = this.querySelector<HTMLElement>(".suiteql-actions");
		if (actions) {
			this.style.setProperty("--suiteql-actions-height", actions.offsetHeight + "px");
		}
	}

	override render(): TemplateResult {
		const resp = this.lastResponse;
		const showPagination = resp !== null && resp.pageCount > 1;
		const showResults = resp !== null && resp.columns !== null;

		return html`
			<fieldset style="width: 60em">
				<legend>SQL</legend>
				<textarea class="mdl-textfield__input" id="sql" rows="8" autofocus></textarea>
			</fieldset>
			<div
				class="suiteql-actions"
				style="position: sticky; top: 0; background: white; z-index: 1; padding: 0.5em 0; box-shadow: 0 4px 4px -4px rgba(0,0,0,0.3)"
			>
				<button
					class="mdl-button mdl-js-button mdl-button--raised mdl-button--colored"
					@click=${this.runQuery}
					?disabled=${this.running}
				>
					<span class="material-icons md-18">play_arrow</span> Run Query
				</button>
				${showResults
					? html`
							<button
								class="mdl-button mdl-js-button mdl-button--raised mdl-button--colored"
								style="margin-left: 1em"
								@click=${this.downloadCsv}
							>
								<span class="material-icons md-18">download</span> Download
							</button>
						`
					: ""}
				${showPagination && resp
					? html`
							<span style="margin-left: 2em">
								<button
									class="mdl-button mdl-js-button"
									@click=${this.prevPage}
									?disabled=${resp.pageIndex === 0}
								>
									Previous
								</button>
								<span style="margin: 0 0.5em">Page ${resp.pageIndex + 1} / ${resp.pageCount}</span>
								<button
									class="mdl-button mdl-js-button"
									@click=${this.nextPage}
									?disabled=${resp.pageIndex >= resp.pageCount - 1}
								>
									Next
								</button>
							</span>
						`
					: ""}
				<span style="margin-left: 1em">${this.statusText}</span>
			</div>
			${showResults && resp
				? html`
						<table class="mdl-data-table mdl-js-data-table mdl-shadow--2dp" style="white-space: nowrap">
							<thead>
								<tr>
									${resp.columns.map(
										c => html`
											<th
												class="mdl-data-table__cell--non-numeric"
												style="position: sticky; top: var(--suiteql-actions-height, 52px); background: white; z-index: 2; box-shadow: 0 4px 4px -4px rgba(0,0,0,0.3)"
											>
												${c}
											</th>
										`
									)}
								</tr>
							</thead>
							<tbody>
								${resp.rows.map(
									r => html`
										<tr>
											${r.map(
												v => html`
													<td
														class="mdl-data-table__cell--non-numeric"
														style="font-family: monospace"
													>
														${formatCell(v)}
													</td>
												`
											)}
										</tr>
									`
								)}
							</tbody>
						</table>
					`
				: ""}
		`;
	}

	runQuery(): void {
		this.currentPageIndex = 0;
		void this.fetchPage();
	}

	prevPage(): void {
		if (this.currentPageIndex > 0) {
			this.currentPageIndex--;
			void this.fetchPage();
		}
	}

	nextPage(): void {
		if (this.lastResponse && this.currentPageIndex < this.lastResponse.pageCount - 1) {
			this.currentPageIndex++;
			void this.fetchPage();
		}
	}

	async fetchPage(): Promise<void> {
		const sql = this.querySelector<HTMLTextAreaElement>("#sql")!.value;
		this.statusText = "Running...";
		this.running = true;

		// Cancel any in-flight request so rapid Run-Query / pagination clicks
		// don't race; only the latest response wins.
		this.abortController?.abort();
		this.abortController = new AbortController();

		let envelope;
		try {
			envelope = await postJson<SuiteqlPageData>(
				this.commandPostUrl,
				{query: sql, pageIndex: this.currentPageIndex, pageSize: 1000},
				this.abortController.signal
			);
		} catch (e) {
			if (e instanceof DOMException && e.name === "AbortError") {
				return;
			}
			this.running = false;
			this.statusText = "Error: " + (e instanceof Error ? e.message : String(e));
			return;
		}

		this.running = false;
		if (!envelope.ok) {
			this.statusText = "Error: " + envelope.error.message;
			return;
		}
		const data = envelope.data;
		this.lastResponse = data;
		this.statusText =
			"Page " +
			(data.pageIndex + 1) +
			" of " +
			Math.max(data.pageCount, 1) +
			" · " +
			data.totalCount +
			" rows total";
	}

	downloadCsv(): void {
		// Exports the current page only. SuiteQL pages server-side; cross-page
		// export would require iterating fetchPage and accumulating.
		const resp = this.lastResponse;
		if (resp === null || resp.columns === null) {
			return;
		}
		const lines: string[] = [];
		lines.push(resp.columns.map(c => '"' + csvEncode(c) + '"').join(","));
		for (const row of resp.rows) {
			lines.push(row.map(v => '"' + csvEncode(v) + '"').join(","));
		}
		const csv = lines.join("\r\n");
		const a = document.createElement("a");
		a.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(csv));
		a.setAttribute("download", "suiteql.csv");
		a.style.display = "none";
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	}
}

customElements.define("suiteql-page", SuiteqlPage);

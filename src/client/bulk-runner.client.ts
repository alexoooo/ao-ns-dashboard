// Lit base component for the bulk-task pages
// (lookup-fields, edit-records, create-records, mass-save, mass-delete).
// Subclass to enable batching by overriding `groupKey(task)`.

import {LitElement, html, type TemplateResult} from "lit";
import {csvEncode} from "csv";

// Mirrors src/utils.ts#splitVerticalBar for client-side use (subclass groupKey
// implementations). Keep both copies in sync if escape semantics change.
export function splitVerticalBar(value: string): string[] {
	const sentinel = "__VERTICAL_BAR_ESCAPE__" + Math.random().toString(36).substring(2);
	const withSentinel = value.replaceAll("\\|", sentinel);
	return withSentinel.split("|").map(i => i.replaceAll(sentinel, "|"));
}

export interface BulkRunnerTask {
	task: string;
	status: string;
	group: string;
}

type Phase = "input" | "running";

export class BulkRunner extends LitElement {
	static override properties = {
		taskTypeLabel: {type: String, attribute: "task-type-label"},
		commandPostUrl: {type: String, attribute: "command-post-url"},
		phase: {state: true},
		model: {state: true},
		pageStart: {state: true},
		pageCount: {state: true},
	};

	declare taskTypeLabel: string;
	declare commandPostUrl: string;
	declare phase: Phase;
	declare model: BulkRunnerTask[];
	declare pageStart: number;
	declare pageCount: number;

	constructor() {
		super();
		this.taskTypeLabel = "";
		this.commandPostUrl = "";
		this.phase = "input";
		this.model = [];
		this.pageStart = 0;
		this.pageCount = 100;
	}

	override createRenderRoot() {
		return this;
	}

	groupKey(_task: string): string {
		return "";
	}

	override render(): TemplateResult {
		return this.phase === "input" ? this.renderInput() : this.renderStatus();
	}

	renderInput(): TemplateResult {
		return html`
			<div>
				<fieldset style="width: 40em">
					<legend>${this.taskTypeLabel} (one per line)</legend>
					<textarea class="mdl-textfield__input" rows="20" id="tasks" autofocus></textarea>
				</fieldset>
				<div>
					<button
						class="mdl-button mdl-js-button mdl-button--raised mdl-button--colored"
						@click=${this.runAll}
					>
						<span class="material-icons md-18">play_arrow</span> Run All
					</button>
				</div>
			</div>
		`;
	}

	renderStatus(): TemplateResult {
		const startedCount = this.model.filter(i => i.status !== "").length;
		const visibleStart = this.pageStart;
		const visibleEnd = Math.min(this.model.length, visibleStart + this.pageCount);
		const visible = this.model.slice(visibleStart, visibleEnd);

		return html`
			<div>
				<div
					class="bulk-runner-actions"
					style="position: sticky; top: 0; background: white; z-index: 1; padding: 0.5em 0; box-shadow: 0 4px 4px -4px rgba(0,0,0,0.3)"
				>
					<span class="mdl-textfield mdl-js-textfield mdl-textfield--floating-label" style="width: 5em">
						<input
							type="text"
							class="mdl-textfield__input"
							.value=${String(this.pageStart + 1)}
							@change=${this.onPageStartChange}
						/>
						<label class="mdl-textfield__label">Start</label>
					</span>
					<span
						class="mdl-textfield mdl-js-textfield mdl-textfield--floating-label"
						style="width: 5em; margin-left: 1em"
					>
						<input
							type="text"
							class="mdl-textfield__input"
							.value=${String(this.pageCount)}
							@change=${this.onPageCountChange}
						/>
						<label class="mdl-textfield__label">Count</label>
					</span>
					<span style="margin-left: 1em">
						<button
							class="mdl-button mdl-js-button mdl-button--raised mdl-button--colored"
							style="margin-left: 1em"
							@click=${this.downloadStatus}
						>
							<span class="material-icons md-18">download</span> Download
						</button>
					</span>
					<span style="margin-left: 1em">Progress: ${startedCount} of ${this.model.length}</span>
				</div>
				<div>
					<table class="mdl-data-table mdl-js-data-table mdl-shadow--2dp" style="width: 100%">
						<thead>
							<tr>
								<th
									class="mdl-data-table__cell"
									style="position: sticky; top: var(--bulk-runner-actions-height, 64px); background: white; z-index: 2; box-shadow: 0 4px 4px -4px rgba(0,0,0,0.3)"
								>
									Number
								</th>
								<th
									class="mdl-data-table__cell--non-numeric"
									style="position: sticky; top: var(--bulk-runner-actions-height, 64px); background: white; z-index: 2; box-shadow: 0 4px 4px -4px rgba(0,0,0,0.3)"
								>
									Task
								</th>
								<th
									class="mdl-data-table__cell--non-numeric"
									style="width: 100%; position: sticky; top: var(--bulk-runner-actions-height, 64px); background: white; z-index: 2; box-shadow: 0 4px 4px -4px rgba(0,0,0,0.3)"
								>
									Result
								</th>
							</tr>
						</thead>
						<tbody>
							${visible.map((item, i) => {
								const isError = item.status.toLowerCase().includes("error");
								const cellStyle = isError ? "color: red; white-space: normal" : "white-space: normal";
								return html`
									<tr>
										<td class="mdl-data-table__cell--non-numeric">${visibleStart + i + 1}</td>
										<td class="mdl-data-table__cell--non-numeric">${item.task}</td>
										<td class="mdl-data-table__cell--non-numeric" style=${cellStyle}>
											${item.status}
										</td>
									</tr>
								`;
							})}
						</tbody>
					</table>
				</div>
			</div>
		`;
	}

	override updated(): void {
		// MDL classes need re-upgrading after re-render so freshly created
		// buttons/inputs pick up ripple/floating-label behavior.
		window.componentHandler?.upgradeElements(this);
		// Sync the thead's sticky offset with the actual height of the actions
		// row so the column headers freeze just below it instead of overlapping.
		const actions = this.querySelector<HTMLElement>(".bulk-runner-actions");
		if (actions) {
			this.style.setProperty("--bulk-runner-actions-height", actions.offsetHeight + "px");
		}
	}

	onPageStartChange(e: Event): void {
		const target = e.target as HTMLInputElement;
		const parsed = parseInt(target.value);
		this.pageStart = Number.isFinite(parsed) ? Math.max(0, parsed - 1) : 0;
	}

	onPageCountChange(e: Event): void {
		const target = e.target as HTMLInputElement;
		const parsed = parseInt(target.value);
		this.pageCount = Number.isFinite(parsed) && parsed > 0 ? parsed : 100;
	}

	runAll(): void {
		const taskValues = this.querySelector<HTMLTextAreaElement>("#tasks")!.value;
		const tasks = taskValues.split(/\r?\n/);
		const newModel: BulkRunnerTask[] = [];
		for (const task of tasks) {
			const trimmed = task.trim();
			if (trimmed !== "") {
				newModel.push({
					task,
					status: "",
					group: this.groupKey(task) || "",
				});
			}
		}
		this.model = newModel;
		this.phase = "running";
		this.runNext();
	}

	runNext(): void {
		const nextIndex = this.model.findIndex(e => e.status === "");
		if (nextIndex === -1) {
			this.requestUpdate();
			return;
		}
		const first = this.model[nextIndex]!;
		const batch = first.group === "" ? [first] : this.model.filter(i => i.group === first.group);

		for (const next of batch) {
			next.status = "Running";
		}
		this.requestUpdate();
		this.runCommand(batch);
	}

	runCommand(nextBatch: BulkRunnerTask[]): void {
		const request = new XMLHttpRequest();
		request.onreadystatechange = () => {
			if (request.readyState !== 4) {
				return;
			}
			const status = request.status;
			if (status !== 200) {
				nextBatch[0]!.status = "Error " + status + ": " + request.responseText;
				for (let i = 1; i < nextBatch.length; i++) {
					nextBatch[i]!.status = "Error for: " + nextBatch[0]!.group;
				}
			} else {
				try {
					const responses = JSON.parse(request.responseText) as unknown[];
					for (let i = 0; i < responses.length; i++) {
						const value = responses[i];
						const adjustedStatus = value === "" ? "(blank)" : "" + String(value);
						nextBatch[i]!.status = adjustedStatus;
					}
				} catch (_e) {
					nextBatch[0]!.status = "" + request.responseText;
					for (let i = 1; i < nextBatch.length; i++) {
						nextBatch[i]!.status = "Error as part of: " + nextBatch[0]!.group;
					}
				}
			}
			this.requestUpdate();
			this.runNext();
		};
		request.open("POST", this.commandPostUrl);
		request.setRequestHeader("Content-type", "application/json");
		request.send(JSON.stringify(nextBatch.map(i => i.task)));
	}

	downloadStatus(): void {
		const rows = ["Number,Task,Result"];
		for (let i = 0; i < this.model.length; i++) {
			const item = this.model[i]!;
			rows.push(i + 1 + ',"' + csvEncode(item.task) + '","' + csvEncode(item.status) + '"');
		}
		const csv = rows.join("\r\n");
		const a = document.createElement("a");
		a.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(csv));
		a.setAttribute("download", "result.csv");
		a.style.display = "none";
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	}
}

customElements.define("bulk-runner", BulkRunner);

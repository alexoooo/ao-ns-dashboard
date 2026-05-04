// Record-type subclass of BulkRunner.
//
// Adds an Internal ID input above the bulk-runner scaffold and rebuilds the
// command URL whenever it changes. Each row in the textarea is a Record Type
// to probe against the entered Internal ID.

import {html, type TemplateResult} from "lit";
import {BulkRunner} from "bulk-runner";

class RecordTypeBulkRunner extends BulkRunner {
	static override properties = {
		...BulkRunner.properties,
		commandPrefix: {type: String, attribute: "command-prefix"},
		recordIdParam: {type: String, attribute: "record-id-param"},
		defaultTasks: {type: String, attribute: "default-tasks"},
		defaultPageCount: {type: Number, attribute: "default-page-count"},
	};

	declare commandPrefix: string;
	declare recordIdParam: string;
	declare defaultTasks: string;
	declare defaultPageCount: number;

	constructor() {
		super();
		this.commandPrefix = "";
		this.recordIdParam = "";
		this.defaultTasks = "";
		this.defaultPageCount = 100;
	}

	override connectedCallback(): void {
		super.connectedCallback();
		this.pageCount = this.defaultPageCount;
	}

	onRecordIdChange(e: Event): void {
		const target = e.target as HTMLInputElement;
		const id = encodeURIComponent(target.value);
		this.commandPostUrl = this.commandPrefix + "&" + this.recordIdParam + "=" + id;
	}

	override renderInput(): TemplateResult {
		return html`
			<div>
				<div style="display: flex; align-items: center; gap: 1em">
					<div class="mdl-textfield mdl-js-textfield mdl-textfield--floating-label" style="width: 20em">
						<input
							class="mdl-textfield__input"
							type="text"
							id="recordId"
							autofocus
							@change=${this.onRecordIdChange}
						/>
						<label class="mdl-textfield__label" for="recordId">Internal ID or External ID</label>
					</div>
					<button
						class="mdl-button mdl-js-button mdl-button--raised mdl-button--colored"
						@click=${this.runAll}
					>
						<span class="material-icons md-18">play_arrow</span> Run All
					</button>
				</div>
				<hr />
				<fieldset style="width: 40em">
					<legend>${this.taskTypeLabel} (one per line)</legend>
					<textarea class="mdl-textfield__input" rows="20" id="tasks" .value=${this.defaultTasks}></textarea>
				</fieldset>
			</div>
		`;
	}
}

customElements.define("bulk-runner-record-type", RecordTypeBulkRunner);

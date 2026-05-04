// Record-type subclass of BulkRunner.
//
// Adds an Internal ID input above the bulk-runner scaffold and rebuilds the
// command URL whenever it changes. Each row in the textarea is a Record Type
// to probe against the entered Internal ID.
//
// Module fragment — see bulk-runner.client.js for composition rules.
// IMPORTANT: bulk-runner.client.js MUST be inlined before this file.

class RecordTypeBulkRunner extends BulkRunner {
	static properties = {
		...BulkRunner.properties,
		commandPrefix: { type: String, attribute: "command-prefix" },
		recordIdParam: { type: String, attribute: "record-id-param" },
		defaultTasks: { type: String, attribute: "default-tasks" },
		defaultPageCount: { type: Number, attribute: "default-page-count" },
	};

	constructor() {
		super();
		this.commandPrefix = "";
		this.recordIdParam = "";
		this.defaultTasks = "";
		this.defaultPageCount = 100;
	}

	connectedCallback() {
		super.connectedCallback();
		this.pageCount = this.defaultPageCount;
	}

	onRecordIdChange(e) {
		const id = e.target.value;
		this.commandPostUrl = this.commandPrefix + "&" + this.recordIdParam + "=" + id;
	}

	renderInput() {
		return html`
			<div>
				<div class="mdl-textfield mdl-js-textfield mdl-textfield--floating-label">
					<input class="mdl-textfield__input" type="text" id="recordId"
							autofocus
							@change=${this.onRecordIdChange} />
					<label class="mdl-textfield__label" for="recordId">Internal ID or External ID</label>
				</div>
				<hr/>
				<fieldset style="width: 40em">
					<legend>${this.taskTypeLabel} (one per line)</legend>
					<textarea class="mdl-textfield__input" rows="20" id="tasks" .value=${this.defaultTasks}></textarea>
				</fieldset>
				<div>
					<button class="mdl-button mdl-js-button mdl-button--raised mdl-button--colored"
							@click=${this.runAll}>
						<span class="material-icons md-18">play_arrow</span> Run All
					</button>
				</div>
			</div>
		`;
	}
}

customElements.define("bulk-runner-record-type", RecordTypeBulkRunner);

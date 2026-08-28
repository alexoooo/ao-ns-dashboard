// Edit-records subclass of BulkRunner: groups tasks by record type + ID so
// multiple edits to the same record are saved as a single transaction.

import {html, type TemplateResult} from "lit";
import {BulkRunner, type BulkRunnerTask} from "bulk-runner";
import {splitVerticalBar} from "separators";

class EditRecordsBulkRunner extends BulkRunner {
	static override properties = {
		...BulkRunner.properties,
		ignoreMandatoryFields: {state: true},
	};

	declare ignoreMandatoryFields: boolean;

	constructor() {
		super();
		this.ignoreMandatoryFields = false;
	}

	override groupKey(task: string): string {
		const parts = splitVerticalBar(task).map(part => part.replace(/\W/g, "").toLowerCase());
		return (parts[0] ?? "") + "|" + (parts[1] ?? "");
	}

	override renderInputOptions(): TemplateResult {
		return html`
			<div style="margin: 1em 0">
				<label class="mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect" for="ignore-mandatory-fields">
					<input
						type="checkbox"
						id="ignore-mandatory-fields"
						class="mdl-checkbox__input"
						.checked=${this.ignoreMandatoryFields}
						@change=${this.onIgnoreMandatoryFieldsChange}
					/>
					<span class="mdl-checkbox__label">Ignore mandatory fields (ignoreMandatoryFields = Y)</span>
				</label>
			</div>
		`;
	}

	override commandBody(nextBatch: BulkRunnerTask[]): unknown {
		return {
			tasks: nextBatch.map(i => i.task),
			ignoreMandatoryFields: this.ignoreMandatoryFields,
		};
	}

	private onIgnoreMandatoryFieldsChange(e: Event): void {
		this.ignoreMandatoryFields = (e.target as HTMLInputElement).checked;
	}
}

customElements.define("bulk-runner-edit-records", EditRecordsBulkRunner);

// Edit-records subclass of BulkRunner: groups tasks by record type + ID so
// multiple edits to the same record are saved as a single transaction.

import {BulkRunner} from "bulk-runner";
import {splitVerticalBar} from "separators";

class EditRecordsBulkRunner extends BulkRunner {
	override groupKey(task: string): string {
		const parts = splitVerticalBar(task).map(part => part.replace(/\W/g, "").toLowerCase());
		return (parts[0] ?? "") + "|" + (parts[1] ?? "");
	}
}

customElements.define("bulk-runner-edit-records", EditRecordsBulkRunner);

// Edit-records subclass of BulkRunner: groups tasks by record type + ID so
// multiple edits to the same record are saved as a single transaction.

import { BulkRunner, splitVerticalBar } from "bulk-runner";

class EditRecordsBulkRunner extends BulkRunner {
	groupKey(task) {
		const parts = splitVerticalBar(task).map(part => part.replace(/\W/g, "").toLowerCase());
		return parts[0] + "|" + parts[1];
	}
}

customElements.define("bulk-runner-edit-records", EditRecordsBulkRunner);

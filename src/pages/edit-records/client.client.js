// Edit-records subclass of BulkRunner: groups tasks by record type + ID so
// multiple edits to the same record are saved as a single transaction.
//
// Module fragment — see bulk-runner.client.js for composition rules.
// IMPORTANT: bulk-runner.client.js MUST be inlined before this file in the
// page template's <script type="module"> block, since BulkRunner must be in
// scope when this class declaration runs.

class EditRecordsBulkRunner extends BulkRunner {
	groupKey(task) {
		const parts = task.split("|").map(part => part.replace(/\W/g, "").toLowerCase());
		return parts[0] + "|" + parts[1];
	}
}

customElements.define("bulk-runner-edit-records", EditRecordsBulkRunner);

// Server-side counterpart to ./client/bulk-runner.client.js.
// Returns the HTML scaffold (textarea + Run All button + status table container)
// that the bulk-runner browser code wires into.

export function bulkRunnerScaffold(taskTypeLabel) {
	return `
		<div id="taskList">
			<fieldset style="width: 40em">
				<legend>${taskTypeLabel} (one per line)</legend>
				<textarea
						class="mdl-textfield__input"
						rows="20"
						id="tasks"
						autofocus></textarea>
			</fieldset>
			<div><button
					class="mdl-button mdl-js-button mdl-button--raised mdl-button--colored"
					onclick="runAll()">
				<span class="material-icons md-18">play_arrow</span> Run All
			</button></div>
		</div>
		<div id="runStatus" style="display: none">
			<div>
				<span class="mdl-textfield mdl-js-textfield mdl-textfield--floating-label" style="width: 5em">
					<input type="text"
							class="mdl-textfield__input"
							id="pageStart"
							value="1"
							onchange="onPageStart(this.value);" />
					<label class="mdl-textfield__label" for="customSegment">Start</label>
				</span>
				<span class="mdl-textfield mdl-js-textfield mdl-textfield--floating-label" style="width: 5em; margin-left: 1em">
					<input type="text"
							class="mdl-textfield__input"
							id="pageCount"
							value="100"
							onchange="onPageCount(this.value);" />
					<label class="mdl-textfield__label" for="customSegment">Count</label>
				</span>
				<span style="margin-left: 1em">
					<button
							class="mdl-button mdl-js-button mdl-button--raised mdl-button--colored"
							style="margin-left: 1em"
							onclick="downloadStatus()">
						<span class="material-icons md-18">download</span> Download
					</button>
				</span>
				<span id="statusMessage" style="margin-left: 1em">
				</span>
			</div>

			<div id="statusTable">
			</div>
		</div>`;
}

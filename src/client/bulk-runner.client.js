// Lit base component for the bulk-task pages
// (lookup-fields, edit-records, create-records, mass-save, mass-delete).
//
// This file is a "module fragment": it is concatenated into a <script type="module">
// block by the page template, which provides the lit imports. Do NOT add an
// `import` line for lit here — it would clash with the template's import when
// fragments are concatenated together.
//
// Subclass to enable batching by overriding `groupKey(task)`.

class BulkRunner extends LitElement {
	static properties = {
		taskTypeLabel: { type: String, attribute: "task-type-label" },
		commandPostUrl: { type: String, attribute: "command-post-url" },
		phase: { state: true },
		model: { state: true },
		pageStart: { state: true },
		pageCount: { state: true },
	};

	constructor() {
		super();
		this.taskTypeLabel = "";
		this.commandPostUrl = "";
		this.phase = "input";
		this.model = [];
		this.pageStart = 0;
		this.pageCount = 100;
	}

	createRenderRoot() {
		return this;
	}

	groupKey(task) {
		return "";
	}

	render() {
		return this.phase === "input" ? this.renderInput() : this.renderStatus();
	}

	renderInput() {
		return html`
			<div>
				<fieldset style="width: 40em">
					<legend>${this.taskTypeLabel} (one per line)</legend>
					<textarea class="mdl-textfield__input" rows="20" id="tasks" autofocus></textarea>
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

	renderStatus() {
		const startedCount = this.model.filter(i => i.status !== "").length;
		const visibleStart = this.pageStart;
		const visibleEnd = Math.min(this.model.length, visibleStart + this.pageCount);
		const visible = this.model.slice(visibleStart, visibleEnd);

		return html`
			<div>
				<div>
					<span class="mdl-textfield mdl-js-textfield mdl-textfield--floating-label" style="width: 5em">
						<input type="text" class="mdl-textfield__input"
								.value=${String(this.pageStart + 1)}
								@change=${this.onPageStartChange} />
						<label class="mdl-textfield__label">Start</label>
					</span>
					<span class="mdl-textfield mdl-js-textfield mdl-textfield--floating-label" style="width: 5em; margin-left: 1em">
						<input type="text" class="mdl-textfield__input"
								.value=${String(this.pageCount)}
								@change=${this.onPageCountChange} />
						<label class="mdl-textfield__label">Count</label>
					</span>
					<span style="margin-left: 1em">
						<button class="mdl-button mdl-js-button mdl-button--raised mdl-button--colored"
								style="margin-left: 1em"
								@click=${this.downloadStatus}>
							<span class="material-icons md-18">download</span> Download
						</button>
					</span>
					<span style="margin-left: 1em">Progress: ${startedCount} of ${this.model.length}</span>
				</div>
				<div>
					<table class="mdl-data-table mdl-js-data-table mdl-shadow--2dp" style="width: 100%">
						<thead>
							<tr>
								<th class="mdl-data-table__cell">Number</th>
								<th class="mdl-data-table__cell--non-numeric">Task</th>
								<th class="mdl-data-table__cell--non-numeric" style="width: 100%">Result</th>
							</tr>
						</thead>
						<tbody>
							${visible.map((item, i) => {
								const isError = item.status.toLowerCase().includes("error");
								const cellStyle = isError
									? "color: red; white-space: normal"
									: "white-space: normal";
								return html`
									<tr>
										<td class="mdl-data-table__cell--non-numeric">${visibleStart + i + 1}</td>
										<td class="mdl-data-table__cell--non-numeric">${item.task}</td>
										<td class="mdl-data-table__cell--non-numeric" style=${cellStyle}>${item.status}</td>
									</tr>
								`;
							})}
						</tbody>
					</table>
				</div>
			</div>
		`;
	}

	updated() {
		// MDL classes need re-upgrading after re-render so freshly created
		// buttons/inputs pick up ripple/floating-label behavior.
		if (window.componentHandler) {
			window.componentHandler.upgradeElements(this);
		}
	}

	onPageStartChange(e) {
		const parsed = parseInt(e.target.value);
		this.pageStart = Number.isFinite(parsed) ? Math.max(0, parsed - 1) : 0;
	}

	onPageCountChange(e) {
		const parsed = parseInt(e.target.value);
		this.pageCount = Number.isFinite(parsed) && parsed > 0 ? parsed : 100;
	}

	runAll() {
		const taskValues = this.querySelector("#tasks").value;
		const tasks = taskValues.split(/\r?\n/);
		const newModel = [];
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

	runNext() {
		const nextIndex = this.model.findIndex(e => e.status === "");
		if (nextIndex === -1) {
			this.requestUpdate();
			return;
		}
		const first = this.model[nextIndex];
		const batch = first.group === ""
			? [first]
			: this.model.filter(i => i.group === first.group);

		for (const next of batch) {
			next.status = "Running";
		}
		this.requestUpdate();
		this.runCommand(batch);
	}

	runCommand(nextBatch) {
		const request = new XMLHttpRequest();
		request.onreadystatechange = () => {
			if (request.readyState !== 4) {
				return;
			}
			const status = request.status;
			if (status !== 200) {
				nextBatch[0].status = "Error " + status + ": " + request.responseText;
				for (let i = 1; i < nextBatch.length; i++) {
					nextBatch[i].status = "Error for: " + nextBatch[0].group;
				}
			}
			else {
				try {
					const responses = JSON.parse(request.responseText);
					for (let i = 0; i < responses.length; i++) {
						const adjustedStatus = (responses[i] === "" ? "(blank)" : "" + responses[i]);
						nextBatch[i].status = adjustedStatus;
					}
				}
				catch (e) {
					nextBatch[0].status = "" + request.responseText;
					for (let i = 1; i < nextBatch.length; i++) {
						nextBatch[i].status = "Error as part of: " + nextBatch[0].group;
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

	csvEncode(value) {
		return String(value).replaceAll('"', '""');
	}

	downloadStatus() {
		const rows = ["Number,Task,Result"];
		for (let i = 0; i < this.model.length; i++) {
			const item = this.model[i];
			rows.push((i + 1) + ',"' + this.csvEncode(item.task) + '","' + this.csvEncode(item.status) + '"');
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

// Shared browser-side runtime for the bulk-task pages
// (lookup-fields, edit-records, create-records, mass-save, mass-delete).
//
// Each page sets `commandPostUrl` and optionally pushes a callback into
// `modelProcessors` to assign tasks into batches via `i.group`.
// The page then renders a textarea + Run All button via taskListAndRunStatusJs,
// and clicking the button drives the runNext / runCommand loop below.

const model = [];
const modelProcessors = [];

var pageStart = 0;
var pageCount = 100;

function onPageStart(value) {
	window.pageStart = parseInt(value) - 1;
	render();
}
function onPageCount(value) {
	window.pageCount = parseInt(value);
	render();
}

var commandPostUrl;
function runCommand(nextBatch) {
	var request = new XMLHttpRequest();
	request.onreadystatechange = function() {
		if (this.readyState === 4) {
			const status = this.status;
			if (status !== 200) {
				nextBatch[0].status = "Error " + status + ": " + this.responseText;
				for (let i = 1; i < nextBatch.length; i++) {
					nextBatch[i].status = "Error for: " + nextBatch[0].group;
				}
			}
			else {
				try {
					const responses = JSON.parse(this.responseText);
					for (let i = 0; i < responses.length; i++) {
						const adjustedStatus = (responses[i] === "" ? "(blank)" : "" + responses[i]);
						nextBatch[i].status = adjustedStatus;
					}
				}
				catch (e) {
					nextBatch[0].status = "" + this.responseText;
					for (let i = 1; i < nextBatch.length; i++) {
						nextBatch[i].status = "Error as part of: " + nextBatch[0].group;
					}
				}
			}

			runNext();
		}
		else {
			for (const next of nextBatch) {
				next.status = "Running...";
			}
		}
	};
	request.open("POST", commandPostUrl);
	request.setRequestHeader('Content-type', 'application/json');

	const body = nextBatch.map(i => i.task);
	request.send(JSON.stringify(body));
}

function csvEncode(value) {
	return value.replaceAll('"', '""');
}
function downloadStatus() {
	const rows = [];
	rows.push("Number,Task,Result");
	for (let i = 0; i < model.length; i++) {
		const item = model[i];
		rows.push((i + 1) + ',"' + csvEncode(item.task) + '","' + csvEncode(item.status) + '"');
	}
	const csv = rows.join("\r\n");

	const element = document.createElement('a');
	element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(csv));
	element.setAttribute('download', "result.csv");
	element.style.display = 'none';
	document.body.appendChild(element);
	element.click();
	document.body.removeChild(element);
}

function render() {
	const message = document.getElementById('statusMessage');
	const startedCount = model.filter(i => i.status !== "").length;
	message.innerHTML = "Progress: " + startedCount + " of " + model.length;

	const container = document.getElementById('statusTable');

	const rows = [];
	for (let index = pageStart, i = 0;
			index < model.length && i < pageCount;
			index++, i++)
	{
		const item = model[index];
		rows.push(
			"<tr>" +
				'<td class="mdl-data-table__cell--non-numeric">' +
					(index + 1) +
				"</td>" +
				'<td class="mdl-data-table__cell--non-numeric">' +
					item.task +
				"</td>" +
				'<td class="mdl-data-table__cell--non-numeric" ' +
						(item.status.toLowerCase().includes("error")
						? 'style="color: red; white-space: normal"'
						: 'style="white-space: normal"') + '>' +
					item.status +
				"</td>" +
			"</tr>");
	}

	container.innerHTML =
		'<table class="mdl-data-table mdl-js-data-table mdl-shadow--2dp" style="width: 100%">' +
			"<thead><tr>" +
				'<th class="mdl-data-table__cell">Number</th>' +
				'<th class="mdl-data-table__cell--non-numeric">Task</th>' +
				'<th class="mdl-data-table__cell--non-numeric" style="width: 100%">Result</th>' +
			"</tr></thead>" +
			"<tbody>" +
				rows.join("") +
			"</tbody>" +
		"</table>";
}

function runNext() {
	const nextIndex = model.findIndex(e => e.status === "");
	if (nextIndex === -1) {
		render();
		return;
	}

	const first = model[nextIndex];

	const batch =
		first.group === ""
		? [first]
		: model.filter(i => i.group === first.group);

	batch.forEach(next => {
		next.status = "Running";
	});

	runCommand(batch);
	render();
}

function runAll() {
	document.getElementById('taskList').style.display = "none";
	document.getElementById('runStatus').style.display = "block";
	const taskValues = document.getElementById('tasks').value;
	const tasks = taskValues.split(/\r?\n/);
	for (const task of tasks) {
		const trimmed = task.trim();
		if (trimmed !== "") {
			model.push({
				"task": task,
				"status": "",
				"group": ""
			});
		}
	}
	for (const modelProcessor of modelProcessors) {
		modelProcessor();
	}
	render();
	runNext();
}

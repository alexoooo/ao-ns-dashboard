/**
* Copyright 2026 Aleksander Ostrovski (aka Alex Ostrovsky)
*
* Permission is hereby granted, free of charge, to any person obtaining a copy
*   of this software and associated documentation files (the "Software"), to
*   deal in the Software without restriction, including without limitation the
*   rights to use, copy, modify, merge, publish, distribute, sublicense,
*   and/or sell copies of the Software, and to permit persons to whom the
*   Software is furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in
*   all copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
*   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
*   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
*   THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR
*   OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
*   ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
*   OTHER DEALINGS IN THE SOFTWARE.
*
* Contact:
*   alex@ostrovsky.biz
*   https://www.linkedin.com/in/alex-ostrovsky-315b2a27/
*
* @NApiVersion 2.1
* @NScriptType Suitelet
*/
define(['N/runtime', 'N/record', 'N/search', 'N/query'], (function (runtime, record, search, query) { 'use strict';

const escapeMap = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
};

function escapeHtml(value) {
	return String(value).replace(/[&<>"']/g, c => escapeMap[c]);
}

const placeholder = /\{\{(\w+)\}\}/g;

// Substitutes {{key}} markers in `template` with values from `vars`.
// Keys whose name ends in "Html" or "Js" are inserted verbatim;
// every other key is HTML-escaped.
function interpolate(template, vars) {
	return template.replace(placeholder, (match, key) => {
		if (! Object.hasOwn(vars, key)) {
			throw new Error(`interpolate: missing key '${key}'`);
		}
		const value = vars[key];
		if (key.endsWith("Html") || key.endsWith("Js")) {
			return String(value);
		}
		return escapeHtml(value);
	});
}


function documentationSection(documentationHtml) {
	return `
		<script>
			var documentationShowing = false;
			function toggleDocumentation() {
				documentationShowing = ! documentationShowing;
				document.getElementById('docBody').style.display =
					documentationShowing ? "block" : "none";
			}
		</script>
		<div style="margin-bottom: 1em"><button
				class="mdl-button mdl-js-button mdl-button--raised mdl-button--colored"
				onclick="toggleDocumentation()">
			<span class="material-icons md-18">help</span> Help
		</button></div>
		<div id="docBody" style="display:none">
			${documentationHtml}
		</div>
	`;
}

var layoutHtml = "<!DOCTYPE html>\n<head>\n\t<title>{{title}}</title>\n\t<link rel=\"stylesheet\" href=\"https://fonts.googleapis.com/icon?family=Material+Icons\"/>\n\t<link rel=\"stylesheet\" href=\"{{mdlCssUrl}}\"/>\n\t<script defer src=\"{{mdlJsUrl}}\"></script>\n\n\t<script src=\"https://code.jquery.com/jquery-3.6.0.js\" integrity=\"sha256-H+K7U5CnXl1h5ywQfKtSj8PCmoN9aaq30gDh27Xc0jk=\" crossorigin=\"anonymous\"></script>\n\t<script src=\"https://cdnjs.cloudflare.com/ajax/libs/select2/4.1.0-rc.0/js/select2.js\" integrity=\"sha512-w8hm+E7eW80RcTpHGflcYz2A9wvvjbADCPcqepR11qvCUQmZEo65n7o+3JYpYP1yrzW6xyHqcqrNMOz1kQ+o6A==\" crossorigin=\"anonymous\" referrerpolicy=\"no-referrer\"></script>\n\t<link rel=\"stylesheet\" href=\"https://cdnjs.cloudflare.com/ajax/libs/select2/4.1.0-rc.0/css/select2.css\" integrity=\"sha512-PO7TIdn2hPTkZ6DSc5eN2DyMpTn/ZixXUQMDLUx+O5d7zGy0h1Th5jgYt84DXvMRhF3N0Ucfd7snCyzlJbAHQA==\" crossorigin=\"anonymous\" referrerpolicy=\"no-referrer\"/>\n\t<script>\n\t\t$(document).on('select2:open', () => {\n\t\t\tdocument.querySelector('.select2-search__field').focus();\n\t\t});\n\t\t$(function() {\n\t\t\tconst host = window.location.hostname;\n\t\t\tconst env = host.split('.')[0];\n\t\t\tif (! env.includes(\"-sb\")) {\n\t\t\t\tdocument.getElementsByClassName('mdl-layout__header-row')[0].style = \"background-color: red\";\n\t\t\t}\n\t\t\tdocument.getElementById('env').innerHTML = \"[\" + env + \"]\";\n\t\t});\n\t</script>\n</head>\n<body>\n\t<div class=\"mdl-layout mdl-js-layout mdl-layout--fixed-header mdl-layout--fixed-drawer\" style=\"width: 100%;\">\n\t\t<header class=\"mdl-layout__header\">\n\t\t\t<div class=\"mdl-layout__header-row\">\n\t\t\t\t<span class=\"mdl-layout-title\" style=\"width: 100%;\">\n\t\t\t\t\t{{title}}\n\t\t\t\t\t<span style=\"float: right; text-align: right\" title=\"version\">\n\t\t\t\t\t\t<span id=\"env\" title=\"Environment\" style=\"font-family: monospace\">...</span>\n\t\t\t\t\t\tv{{version}} <br/>\n\t\t\t\t\t\tNetSuite {{nsVersion}}\n\t\t\t\t\t</span>\n\t\t\t\t</span>\n\t\t\t</div>\n\t\t</header>\n\n\t\t<div class=\"mdl-layout__drawer\">\n\t\t\t<nav class=\"mdl-navigation\">\n\t\t\t\t{{navHtml}}\n\t\t\t</nav>\n\t\t</div>\n\n\t\t<main class=\"mdl-layout__content\">\n\t\t\t<div class=\"page-content\" style=\"padding: 1em\">\n\t\t\t\t{{bodyHtml}}\n\t\t\t</div>\n\t\t</main>\n\t</div>\n</body>\n";

const version = "2026.05.02";

const mdlCssUrl = "https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css";
const mdlJsUrl = "https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.min.js";

const paramPage = "page";
const paramRecordId = "record";
const paramRecordType = "record-type";
const paramCommand = "command";

function getCommandParam(context) {
	return context.request.parameters[paramCommand] || "";
}


function scriptDeployParam(context) {
	return "?script=" + context.request.parameters["script"] + "&" +
		"deploy=" + context.request.parameters["deploy"];
}


function setPageParam(context, page) {
	return scriptDeployParam(context) + "&" +
		paramPage + "=" + page;
}

var templateHtml$8 = "<h1>Welcome, {{name}}!</h1>\n<h2>Let's get down to business :)</h2>\n<h3><span class=\"material-icons md-48\">arrow_back</span> Navigation is on the left</h3>\n<h4>Get the latest version here:\n\t<a href=\"https://github.com/alexoooo/ao-ns-dashboard\">https://github.com/alexoooo/ao-ns-dashboard</a></h4>\n<br/>\n";

var welcome = {
	name: "welcome",
	label: "Welcome",

	render(context) {
		const displayName = runtime.getCurrentUser().name;
		const name = displayName.startsWith("EMP")
			? displayName.split(" ").slice(1).join(" ")
			: displayName;
		return interpolate(templateHtml$8, { name });
	},
};

const undocumentedRecordTypes = {
	"TRANSFER": "transfer",
	"CURRENCY_REVALUATION": "fxreval",
};


// Lazy: NetSuite forbids SuiteScript API access during the AMD define
// callback, so we can't touch `record.Type` at module load time.
let cached = null;
function allRecordTypes() {
	if (cached === null) {
		const all = {};
		Object.keys(record.Type).forEach(k => {
			if (! k.startsWith("CUSTOM_")) {
				all[k] = record.Type[k];
			}
		});
		Object.keys(undocumentedRecordTypes).forEach(k => all[k] = undocumentedRecordTypes[k]);
		cached = all;
	}
	return cached;
}


const lettersOnly = /[^a-zA-Z]/g;


function getRecordType(recordType) {
	const all = allRecordTypes();
	if (recordType in all) {
		return all[recordType];
	}

	const normalized = recordType.replace(lettersOnly, "").toLowerCase();
	if (Object.values(all).includes(normalized)) {
		return normalized;
	}

	const matchingKey = Object.keys(all).find(k => k.replace(lettersOnly, "").toLowerCase() === normalized);
	if (matchingKey) {
		return all[matchingKey];
	}

	return normalized;
}


function recordTypeOptions(selectedRecordType) {
	const all = allRecordTypes();
	return Object.keys(all).map(type => {
		const formatted = type.split("_").map(i => i[0] + i.substring(1).toLowerCase()).join(" ");
		const suffix = (type in undocumentedRecordTypes) ? " (undocumented)" : "";
		return `
			<option
				value="${all[type]}"
				${all[type] === selectedRecordType ? 'selected="selected"' : ""}
			>${formatted}${suffix}</option>`;
	}).join("");
}

var bulkRunnerJs = "// Lit base component for the bulk-task pages\n// (lookup-fields, edit-records, create-records, mass-save, mass-delete).\n//\n// This file is a \"module fragment\": it is concatenated into a <script type=\"module\">\n// block by the page template, which provides the lit imports. Do NOT add an\n// `import` line for lit here — it would clash with the template's import when\n// fragments are concatenated together.\n//\n// Subclass to enable batching by overriding `groupKey(task)`.\n\nclass BulkRunner extends LitElement {\n\tstatic properties = {\n\t\ttaskTypeLabel: { type: String, attribute: \"task-type-label\" },\n\t\tcommandPostUrl: { type: String, attribute: \"command-post-url\" },\n\t\tphase: { state: true },\n\t\tmodel: { state: true },\n\t\tpageStart: { state: true },\n\t\tpageCount: { state: true },\n\t};\n\n\tconstructor() {\n\t\tsuper();\n\t\tthis.taskTypeLabel = \"\";\n\t\tthis.commandPostUrl = \"\";\n\t\tthis.phase = \"input\";\n\t\tthis.model = [];\n\t\tthis.pageStart = 0;\n\t\tthis.pageCount = 100;\n\t}\n\n\tcreateRenderRoot() {\n\t\treturn this;\n\t}\n\n\tgroupKey(task) {\n\t\treturn \"\";\n\t}\n\n\trender() {\n\t\treturn this.phase === \"input\" ? this.renderInput() : this.renderStatus();\n\t}\n\n\trenderInput() {\n\t\treturn html`\n\t\t\t<div>\n\t\t\t\t<fieldset style=\"width: 40em\">\n\t\t\t\t\t<legend>${this.taskTypeLabel} (one per line)</legend>\n\t\t\t\t\t<textarea class=\"mdl-textfield__input\" rows=\"20\" id=\"tasks\" autofocus></textarea>\n\t\t\t\t</fieldset>\n\t\t\t\t<div>\n\t\t\t\t\t<button class=\"mdl-button mdl-js-button mdl-button--raised mdl-button--colored\"\n\t\t\t\t\t\t\t@click=${this.runAll}>\n\t\t\t\t\t\t<span class=\"material-icons md-18\">play_arrow</span> Run All\n\t\t\t\t\t</button>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t`;\n\t}\n\n\trenderStatus() {\n\t\tconst startedCount = this.model.filter(i => i.status !== \"\").length;\n\t\tconst visibleStart = this.pageStart;\n\t\tconst visibleEnd = Math.min(this.model.length, visibleStart + this.pageCount);\n\t\tconst visible = this.model.slice(visibleStart, visibleEnd);\n\n\t\treturn html`\n\t\t\t<div>\n\t\t\t\t<div>\n\t\t\t\t\t<span class=\"mdl-textfield mdl-js-textfield mdl-textfield--floating-label\" style=\"width: 5em\">\n\t\t\t\t\t\t<input type=\"text\" class=\"mdl-textfield__input\"\n\t\t\t\t\t\t\t\t.value=${String(this.pageStart + 1)}\n\t\t\t\t\t\t\t\t@change=${this.onPageStartChange} />\n\t\t\t\t\t\t<label class=\"mdl-textfield__label\">Start</label>\n\t\t\t\t\t</span>\n\t\t\t\t\t<span class=\"mdl-textfield mdl-js-textfield mdl-textfield--floating-label\" style=\"width: 5em; margin-left: 1em\">\n\t\t\t\t\t\t<input type=\"text\" class=\"mdl-textfield__input\"\n\t\t\t\t\t\t\t\t.value=${String(this.pageCount)}\n\t\t\t\t\t\t\t\t@change=${this.onPageCountChange} />\n\t\t\t\t\t\t<label class=\"mdl-textfield__label\">Count</label>\n\t\t\t\t\t</span>\n\t\t\t\t\t<span style=\"margin-left: 1em\">\n\t\t\t\t\t\t<button class=\"mdl-button mdl-js-button mdl-button--raised mdl-button--colored\"\n\t\t\t\t\t\t\t\tstyle=\"margin-left: 1em\"\n\t\t\t\t\t\t\t\t@click=${this.downloadStatus}>\n\t\t\t\t\t\t\t<span class=\"material-icons md-18\">download</span> Download\n\t\t\t\t\t\t</button>\n\t\t\t\t\t</span>\n\t\t\t\t\t<span style=\"margin-left: 1em\">Progress: ${startedCount} of ${this.model.length}</span>\n\t\t\t\t</div>\n\t\t\t\t<div>\n\t\t\t\t\t<table class=\"mdl-data-table mdl-js-data-table mdl-shadow--2dp\" style=\"width: 100%\">\n\t\t\t\t\t\t<thead>\n\t\t\t\t\t\t\t<tr>\n\t\t\t\t\t\t\t\t<th class=\"mdl-data-table__cell\">Number</th>\n\t\t\t\t\t\t\t\t<th class=\"mdl-data-table__cell--non-numeric\">Task</th>\n\t\t\t\t\t\t\t\t<th class=\"mdl-data-table__cell--non-numeric\" style=\"width: 100%\">Result</th>\n\t\t\t\t\t\t\t</tr>\n\t\t\t\t\t\t</thead>\n\t\t\t\t\t\t<tbody>\n\t\t\t\t\t\t\t${visible.map((item, i) => {\n\t\t\t\t\t\t\t\tconst isError = item.status.toLowerCase().includes(\"error\");\n\t\t\t\t\t\t\t\tconst cellStyle = isError\n\t\t\t\t\t\t\t\t\t? \"color: red; white-space: normal\"\n\t\t\t\t\t\t\t\t\t: \"white-space: normal\";\n\t\t\t\t\t\t\t\treturn html`\n\t\t\t\t\t\t\t\t\t<tr>\n\t\t\t\t\t\t\t\t\t\t<td class=\"mdl-data-table__cell--non-numeric\">${visibleStart + i + 1}</td>\n\t\t\t\t\t\t\t\t\t\t<td class=\"mdl-data-table__cell--non-numeric\">${item.task}</td>\n\t\t\t\t\t\t\t\t\t\t<td class=\"mdl-data-table__cell--non-numeric\" style=${cellStyle}>${item.status}</td>\n\t\t\t\t\t\t\t\t\t</tr>\n\t\t\t\t\t\t\t\t`;\n\t\t\t\t\t\t\t})}\n\t\t\t\t\t\t</tbody>\n\t\t\t\t\t</table>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t`;\n\t}\n\n\tupdated() {\n\t\t// MDL classes need re-upgrading after re-render so freshly created\n\t\t// buttons/inputs pick up ripple/floating-label behavior.\n\t\tif (window.componentHandler) {\n\t\t\twindow.componentHandler.upgradeElements(this);\n\t\t}\n\t}\n\n\tonPageStartChange(e) {\n\t\tconst parsed = parseInt(e.target.value);\n\t\tthis.pageStart = Number.isFinite(parsed) ? Math.max(0, parsed - 1) : 0;\n\t}\n\n\tonPageCountChange(e) {\n\t\tconst parsed = parseInt(e.target.value);\n\t\tthis.pageCount = Number.isFinite(parsed) && parsed > 0 ? parsed : 100;\n\t}\n\n\trunAll() {\n\t\tconst taskValues = this.querySelector(\"#tasks\").value;\n\t\tconst tasks = taskValues.split(/\\r?\\n/);\n\t\tconst newModel = [];\n\t\tfor (const task of tasks) {\n\t\t\tconst trimmed = task.trim();\n\t\t\tif (trimmed !== \"\") {\n\t\t\t\tnewModel.push({\n\t\t\t\t\ttask,\n\t\t\t\t\tstatus: \"\",\n\t\t\t\t\tgroup: this.groupKey(task) || \"\",\n\t\t\t\t});\n\t\t\t}\n\t\t}\n\t\tthis.model = newModel;\n\t\tthis.phase = \"running\";\n\t\tthis.runNext();\n\t}\n\n\trunNext() {\n\t\tconst nextIndex = this.model.findIndex(e => e.status === \"\");\n\t\tif (nextIndex === -1) {\n\t\t\tthis.requestUpdate();\n\t\t\treturn;\n\t\t}\n\t\tconst first = this.model[nextIndex];\n\t\tconst batch = first.group === \"\"\n\t\t\t? [first]\n\t\t\t: this.model.filter(i => i.group === first.group);\n\n\t\tfor (const next of batch) {\n\t\t\tnext.status = \"Running\";\n\t\t}\n\t\tthis.requestUpdate();\n\t\tthis.runCommand(batch);\n\t}\n\n\trunCommand(nextBatch) {\n\t\tconst request = new XMLHttpRequest();\n\t\trequest.onreadystatechange = () => {\n\t\t\tif (request.readyState !== 4) {\n\t\t\t\treturn;\n\t\t\t}\n\t\t\tconst status = request.status;\n\t\t\tif (status !== 200) {\n\t\t\t\tnextBatch[0].status = \"Error \" + status + \": \" + request.responseText;\n\t\t\t\tfor (let i = 1; i < nextBatch.length; i++) {\n\t\t\t\t\tnextBatch[i].status = \"Error for: \" + nextBatch[0].group;\n\t\t\t\t}\n\t\t\t}\n\t\t\telse {\n\t\t\t\ttry {\n\t\t\t\t\tconst responses = JSON.parse(request.responseText);\n\t\t\t\t\tfor (let i = 0; i < responses.length; i++) {\n\t\t\t\t\t\tconst adjustedStatus = (responses[i] === \"\" ? \"(blank)\" : \"\" + responses[i]);\n\t\t\t\t\t\tnextBatch[i].status = adjustedStatus;\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t\tcatch (e) {\n\t\t\t\t\tnextBatch[0].status = \"\" + request.responseText;\n\t\t\t\t\tfor (let i = 1; i < nextBatch.length; i++) {\n\t\t\t\t\t\tnextBatch[i].status = \"Error as part of: \" + nextBatch[0].group;\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t}\n\t\t\tthis.requestUpdate();\n\t\t\tthis.runNext();\n\t\t};\n\t\trequest.open(\"POST\", this.commandPostUrl);\n\t\trequest.setRequestHeader(\"Content-type\", \"application/json\");\n\t\trequest.send(JSON.stringify(nextBatch.map(i => i.task)));\n\t}\n\n\tcsvEncode(value) {\n\t\treturn String(value).replaceAll('\"', '\"\"');\n\t}\n\n\tdownloadStatus() {\n\t\tconst rows = [\"Number,Task,Result\"];\n\t\tfor (let i = 0; i < this.model.length; i++) {\n\t\t\tconst item = this.model[i];\n\t\t\trows.push((i + 1) + ',\"' + this.csvEncode(item.task) + '\",\"' + this.csvEncode(item.status) + '\"');\n\t\t}\n\t\tconst csv = rows.join(\"\\r\\n\");\n\t\tconst a = document.createElement(\"a\");\n\t\ta.setAttribute(\"href\", \"data:text/plain;charset=utf-8,\" + encodeURIComponent(csv));\n\t\ta.setAttribute(\"download\", \"result.csv\");\n\t\ta.style.display = \"none\";\n\t\tdocument.body.appendChild(a);\n\t\ta.click();\n\t\tdocument.body.removeChild(a);\n\t}\n}\n\ncustomElements.define(\"bulk-runner\", BulkRunner);\n";

var clientJs$2 = "// Record-type subclass of BulkRunner.\n//\n// Adds an Internal ID input above the bulk-runner scaffold and rebuilds the\n// command URL whenever it changes. Each row in the textarea is a Record Type\n// to probe against the entered Internal ID.\n//\n// Module fragment — see bulk-runner.client.js for composition rules.\n// IMPORTANT: bulk-runner.client.js MUST be inlined before this file.\n\nclass RecordTypeBulkRunner extends BulkRunner {\n\tstatic properties = {\n\t\t...BulkRunner.properties,\n\t\tcommandPrefix: { type: String, attribute: \"command-prefix\" },\n\t\trecordIdParam: { type: String, attribute: \"record-id-param\" },\n\t\tdefaultTasks: { type: String, attribute: \"default-tasks\" },\n\t\tdefaultPageCount: { type: Number, attribute: \"default-page-count\" },\n\t};\n\n\tconstructor() {\n\t\tsuper();\n\t\tthis.commandPrefix = \"\";\n\t\tthis.recordIdParam = \"\";\n\t\tthis.defaultTasks = \"\";\n\t\tthis.defaultPageCount = 100;\n\t}\n\n\tconnectedCallback() {\n\t\tsuper.connectedCallback();\n\t\tthis.pageCount = this.defaultPageCount;\n\t}\n\n\tonRecordIdChange(e) {\n\t\tconst id = e.target.value;\n\t\tthis.commandPostUrl = this.commandPrefix + \"&\" + this.recordIdParam + \"=\" + id;\n\t}\n\n\trenderInput() {\n\t\treturn html`\n\t\t\t<div>\n\t\t\t\t<div class=\"mdl-textfield mdl-js-textfield mdl-textfield--floating-label\">\n\t\t\t\t\t<input class=\"mdl-textfield__input\" type=\"text\" id=\"recordId\"\n\t\t\t\t\t\t\tautofocus\n\t\t\t\t\t\t\t@change=${this.onRecordIdChange} />\n\t\t\t\t\t<label class=\"mdl-textfield__label\" for=\"recordId\">Internal ID or External ID</label>\n\t\t\t\t</div>\n\t\t\t\t<hr/>\n\t\t\t\t<fieldset style=\"width: 40em\">\n\t\t\t\t\t<legend>${this.taskTypeLabel} (one per line)</legend>\n\t\t\t\t\t<textarea class=\"mdl-textfield__input\" rows=\"20\" id=\"tasks\" .value=${this.defaultTasks}></textarea>\n\t\t\t\t</fieldset>\n\t\t\t\t<div>\n\t\t\t\t\t<button class=\"mdl-button mdl-js-button mdl-button--raised mdl-button--colored\"\n\t\t\t\t\t\t\t@click=${this.runAll}>\n\t\t\t\t\t\t<span class=\"material-icons md-18\">play_arrow</span> Run All\n\t\t\t\t\t</button>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t`;\n\t}\n}\n\ncustomElements.define(\"bulk-runner-record-type\", RecordTypeBulkRunner);\n";

var templateHtml$7 = "<script type=\"module\">\nimport { LitElement, html } from \"https://cdn.jsdelivr.net/npm/lit@3.2.1/+esm\";\n\n{{bulkRunnerJs}}\n{{clientJs}}\n</script>\n\n<h2>Detect the Record Type(s) for an Internal ID</h2>\n{{documentationHtml}}\n<hr/>\n<bulk-runner-record-type\n\t\ttask-type-label=\"Record Type\"\n\t\tcommand-prefix=\"{{commandPrefix}}\"\n\t\trecord-id-param=\"{{paramRecordId}}\"\n\t\tdefault-tasks=\"{{defaultTasks}}\"\n\t\tdefault-page-count=\"{{defaultPageCount}}\">\n</bulk-runner-record-type>\n";

const commandName$6 = "record-type";


var recordType = {
	name: "record-type",
	label: "Detect Record Type",

	render(context) {
		const all = allRecordTypes();
		const defaultTasks = Object.keys(all)
			.map(type => type.split("_").map(i => i[0] + i.substring(1).toLowerCase()).join(" "))
			.join("\n");

		return interpolate(templateHtml$7, {
			bulkRunnerJs,
			clientJs: clientJs$2,
			commandPrefix: scriptDeployParam(context) + "&" + paramCommand + "=" + commandName$6,
			paramRecordId,
			documentationHtml: documentationSection(`
				<h3>· Record Types in NetSuite pages may differ from what they are called here:</h3>
				<h4>&nbsp; &nbsp; · "Payment" is "Customer Payment"</h4>
				<h3>· The same Internal ID can exist in multiple Record Types</h3>
				<h3>· Some Record Types are undocumented: ${Object.keys(undocumentedRecordTypes).join(", ")}</h3>
				<h3>· Custom Record Types are not automatically populated, but you can manually type them in below</h3>
			`),
			defaultTasks,
			defaultPageCount: Object.keys(all).length,
		});
	},

	commands: {
		[commandName$6]: handleTypeListing,
	},
};


function handleTypeListing(context) {
	const recordTypes = JSON.parse(context.request.body);
	const recordTypeName = recordTypes[0];
	if (! recordTypeName) {
		return "Record Type not specified";
	}

	const recordId = context.request.parameters[paramRecordId];
	if (! recordId) {
		return "Record ID not specified";
	}

	const recordType = getRecordType(recordTypeName);

	const canBeInternal = /^-?\d+$/.test(recordId.trim());
	let internalMessage;
	if (canBeInternal) {
		try {
			record.load({
				type: recordType,
				id: recordId,
			});
			internalMessage = "*** Internal ID found";
		}
		catch (e) {
			internalMessage = "Internal ID not found: " + e.message;
		}
	}
	else {
		internalMessage = "Internal ID invalid";
	}

	let externalMessage;
	try {
		const externalIdSearch = search.create({
			type: recordType,
			filters: [
				search.createFilter({
					name: "externalid",
					operator: search.Operator.IS,
					values: recordId,
				}),
			],
			columns: [],
		});

		const searchResults = externalIdSearch.run().getRange({ start: 0, end: 1 });
		if (searchResults.length > 0) {
			const internalId = searchResults[0].id;
			externalMessage = "*** External ID found, with Internal ID = " + internalId;
		}
		else {
			externalMessage = "External ID not found";
		}
	}
	catch (e) {
		externalMessage = "External ID not found: " + e.message;
	}

	const message = internalMessage + " | " + externalMessage;
	return JSON.stringify([message]);
}

function normalizeKey(value) {
	return value.replace(/[^A-Za-z0-9_-]/g, "").toLowerCase();
}


function splitAmpersand(value) {
	const sentinel = "__AMPERSAND_ESCAPE__" + Math.random().toString(36).substring(2);
	const withSentinel = value.replaceAll("\\&", sentinel);
	return withSentinel.split("&").map(i => i.replaceAll(sentinel, "&"));
}


function splitVerticalBar(value) {
	const sentinel = "__VERTICAL_BAR_ESCAPE__" + Math.random().toString(36).substring(2);
	const withSentinel = value.replaceAll("\\|", sentinel);
	return withSentinel.split("|").map(i => i.replaceAll(sentinel, "|"));
}


function splitSlash(value) {
	if (value === "") {
		return [];
	}
	const sentinel = "__SLASH_ESCAPE__" + Math.random().toString(36).substring(2);
	const withSentinel = value.replaceAll("\\/", sentinel);
	return withSentinel.split("/").map(i => i.replaceAll(sentinel, "/"));
}

var templateHtml$6 = "<script type=\"text/javascript\">\n\t$(document).ready(() => {\n\t\t$(\".record-type-select\").select2({\n\t\t\tplaceholder: \"Please make a selection\"\n\t\t});\n\t});\n\tfunction showLoading() {\n\t\tdocument.getElementById('spinner').style.display = \"block\";\n\t\tdocument.getElementById('details').style.display = \"none\";\n\t}\n\tfunction onSearch(value) {\n\t\tdocument.getElementById('recordType').value = value;\n\t}\n</script>\n<div>\n\t<h2>Retrieve all info about a particular record</h2>\n\t{{documentationHtml}}\n</div>\n<form method=\"post\">\n\t<fieldset>\n\t\t<legend>Record Type Search</legend>\n\t\t<select\n\t\t\t\tclass=\"record-type-select\"\n\t\t\t\tid=\"record-type-search\"\n\t\t\t\tonchange=\"onSearch(this.value);\">\n\t\t\t<option></option>\n\t\t\t{{recordTypeOptionsHtml}}\n\t\t</select>\n\t</fieldset>\n\t<fieldset style=\"margin-top: 0.5em; width: 30em\">\n\t\t<!-- NB: floating label doesn't work with programmatic value assignment -->\n\t\t<legend>Record Type</legend>\n\t\t<input\n\t\t\tclass=\"mdl-textfield__input\"\n\t\t\ttype=\"text\"\n\t\t\tid=\"recordType\"\n\t\t\tname=\"{{paramRecordType}}\"\n\t\t\tvalue=\"{{recordType}}\"/>\n\t</fieldset>\n\t<br/>\n\t<div class=\"mdl-textfield mdl-js-textfield mdl-textfield--floating-label\">\n\t\t<input\n\t\t\tclass=\"mdl-textfield__input\"\n\t\t\ttype=\"text\"\n\t\t\tid=\"recordId\"\n\t\t\tname=\"{{paramRecordId}}\"\n\t\t\tvalue=\"{{recordId}}\"\n\t\t\tautofocus/>\n\t\t<label class=\"mdl-textfield__label\" for=\"recordId\">Internal ID</label>\n\t</div>\n\t<br/>\n\t<button\n\t\t\ttype=\"submit\"\n\t\t\tclass=\"mdl-button mdl-js-button mdl-button--raised mdl-button--colored\"\n\t\t\tonclick=\"showLoading()\">\n\t\t<span class=\"material-icons md-18\">search</span> Get Details\n\t</button>\n\t<hr/>\n\t<div id=\"spinner\" class=\"mdl-spinner mdl-js-spinner is-active\" style=\"display: none\"></div>\n\t<div id=\"details\">\n\t\t{{detailsHtml}}\n\t</div>\n</form>\n";

var recordDetails = {
	name: "record-details",
	label: "Record Details",

	render(context) {
		const recordType$1 = context.request.parameters[paramRecordType] || "";
		const recordId = normalizeKey(context.request.parameters[paramRecordId] || "");

		let detailsHtml;
		if (recordType$1 === "" || recordId === "") {
			detailsHtml = `Please provide "Record Type" and "Internal ID" (above)`;
		}
		else {
			detailsHtml = detailsListing(recordType$1, recordId);
		}

		return interpolate(templateHtml$6, {
			documentationHtml: documentationSection(`
				<h3>· To detect the Record Type(s) for a particular Internal ID, see [${recordType.label}] page (left menu)</h3>
			`),
			recordTypeOptionsHtml: recordTypeOptions(recordType$1),
			paramRecordType,
			paramRecordId,
			recordType: recordType$1,
			recordId,
			detailsHtml,
		});
	},
};


function detailsListing(recordType, recordId) {
	let loaded = false;

	try {
		const rec = record.load({
			type: recordType,
			id: recordId,
		});
		loaded = true;

		const recordFieldNames = rec.getFields();
		const recordFields = recordFieldNames
			.map(fieldId => {
				const recordField = rec.getField({fieldId});

				let fieldText;
				try {
					fieldText = rec.getText({fieldId});
				}
				catch (e) {
					fieldText = "Error: " + e.message;
				}

				const fieldValue = rec.getValue({fieldId});
				const fieldValueIfDifferent =
					"" + fieldValue !== fieldText && fieldValue
					? "" + fieldValue : "";

				return `<tr>
					<td class="mdl-data-table__cell--non-numeric">${fieldId}</td>
					<td class="mdl-data-table__cell--non-numeric">${recordField?.label}</td>
					<td class="mdl-data-table__cell--non-numeric">${recordField?.type}</td>
					<td class="mdl-data-table__cell--non-numeric" style="word-break: break-all;word-wrap: break-word; max-width: 25em;">${fieldText}</td>
					<td class="mdl-data-table__cell--non-numeric" style="word-break: break-all;word-wrap: break-word; max-width: 25em; font-family: monospace">${fieldValueIfDifferent}</td>
				</tr>`;
			});

		const recordSublists = rec.getSublists();
		const sublistFields = recordSublists
			.map(sublistId => {
				const sublistFields = rec.getSublistFields({sublistId});

				const lineCount = rec.getLineCount({sublistId});

				const sublistHeader = sublistFields.map(sublistField => {
					const field = lineCount > 0
						? rec.getSublistField({sublistId, fieldId: sublistField, line: 0})
						: null;

					const label = field?.label ?? "";
					const type = field?.type ?? "";

					return `<th class="mdl-data-table__cell--non-numeric" valign="top"
							style="position: sticky; top: 0; background-color: white; z-index: 999; box-shadow: 0 -1px 0 0 #d3d3d3 inset">
						<span style="font-family: monospace">
							${sublistField}
							${type ? `<br/>(${type})` : ""}
						</span>
						<span style="font-weight: bold">${label ? `<br/>${label}` : ""} </span>
					</th>`;
				}).join("");

				const lineValues = [...Array(lineCount).keys()].map(i => {
					const lineFields = sublistFields.map(sublistField => {
						const value = rec.getSublistValue({sublistId, fieldId: sublistField, line: i});
						let fieldText = value + "";
						let error = fieldText.toLowerCase().startsWith("error: ");
						try {
							fieldText = rec.getSublistText({sublistId, fieldId: sublistField, line: i});
						}
						catch (e) {
							error = true;
						}

						return `<td class="mdl-data-table__cell--non-numeric">
							<span style="font-family: monospace; ${error ? "color: red" : ""}">${value}</span>
							${fieldText === value ? "" : `<br/>${fieldText}`}
						</td>`;
					});

					return `<tr>
						<td class="mdl-data-table__cell--non-numeric">${i}</td>
						${lineFields.join("")}
					</tr>`;
				});

				const sublistTable =
				`<div style="width: 100%; overflow-x: auto; max-height: 40em; overflow-y: auto"><table class="mdl-data-table mdl-js-data-table mdl-shadow--2dp"
						style="white-space: nowrap;">
					<thead>
						<tr>
							${lineCount > 0
							? `<th class="mdl-data-table__cell--non-numeric" valign="top"
									style="position: sticky; top: 0; background-color: white; z-index: 999; box-shadow: 0 -1px 0 0 #d3d3d3 inset">
								Line</th>`
							: ""}
							${sublistHeader}
						</tr>
					</thead>
					<tbody>
						${lineValues.join("")}
					</tbody>
				</table></div>`;

				return `<h4 style="font-family: monospace">${sublistId}</h4>${sublistTable}<br/><br/>`;
			});

		return `
			<h2>${recordType} Internal ID: ${recordId}</h2>

			<h3>Fields</h3>
			<div style="width: 100%; overflow-x: auto; max-height: 40em; overflow-y: auto">
				<table class="mdl-data-table mdl-js-data-table mdl-shadow--2dp"
					style="border-width: 1px; border-color: lightgray">
				<thead>
					<tr>
						<th class="mdl-data-table__cell--non-numeric"
								style="position:sticky;top:0;background-color:white;z-index:999;box-shadow: 0 -1px 0 0 #d3d3d3 inset">
							Field ID</th>
						<th class="mdl-data-table__cell--non-numeric"
								style="position:sticky;top:0;background-color:white;z-index:999;box-shadow: 0 -1px 0 0 #d3d3d3 inset">
							Field Label</th>
						<th class="mdl-data-table__cell--non-numeric"
								style="position:sticky;top:0;background-color:white;z-index:999;box-shadow: 0 -1px 0 0 #d3d3d3 inset">
							Field Type</th>
						<th class="mdl-data-table__cell--non-numeric"
								style="position:sticky;top:0;background-color:white;z-index:999;box-shadow: 0 -1px 0 0 #d3d3d3 inset">
							Field Text</th>
						<th class="mdl-data-table__cell--non-numeric"
								style="position:sticky;top:0;background-color:white;z-index:999;box-shadow: 0 -1px 0 0 #d3d3d3 inset">
							Field Value (if different)</th>
					</tr>
				</thead>
				<tbody>
					${recordFields.join("")}
				</tbody>
				</table>
			</div>

			<h3>Sub Lists</h3>
			<div>
				${sublistFields.join("<br/>")}
			</div>`;
	}
	catch (e) {
		return `
			<h2>${recordType} Internal ID: ${recordId}</h2>
			<h3 style="color: red">
				Error: ${loaded ? "retrieving -" : "loading -"} ${e.message} <br/>
				${e.stack}
			</h3>`;
	}
}

// Parsing for the `fieldId=value` syntax used in task strings on
// lookup-fields, edit-records, and create-records pages.



function parseFieldAssignment(fieldAssignment) {
	const firstEquals = fieldAssignment.indexOf("=");
	if (firstEquals === -1) {
		throw new Error(
			"Field assignment expected (fieldId=value): " + fieldAssignment);
	}

	const fieldId = fieldAssignment.substring(0, firstEquals);
	const fieldText = fieldAssignment.substring(firstEquals + 1);

	return {
		fieldId: normalizeKey(fieldId),
		fieldText,
	};
}


// Parses an `&`-separated list of `fieldId=value` pairs into an array
// of `{fieldId, fieldText}` objects. When a fieldId appears multiple
// times its values are gathered into an array (multi-select fields).
function parseFieldAssignmentList(fieldAssignmentList) {
	if (fieldAssignmentList === "") {
		return [];
	}

	const parts = splitAmpersand(fieldAssignmentList);
	const assignments = parts.map(i => parseFieldAssignment(i));

	const groupByFieldId = {};
	for (const i of assignments) {
		groupByFieldId[i.fieldId] = (groupByFieldId[i.fieldId] || []);
		groupByFieldId[i.fieldId].push(i);
	}

	const withMultiSelect = [];
	for (const fieldId of Object.keys(groupByFieldId)) {
		const fieldAssignments = groupByFieldId[fieldId];
		if (fieldAssignments.length === 1) {
			withMultiSelect.push(fieldAssignments[0]);
		}
		else {
			withMultiSelect.push({
				fieldId,
				fieldText: fieldAssignments.map(i => i.fieldText),
			});
		}
	}

	return withMultiSelect;
}

var templateHtml$5 = "<script type=\"module\">\nimport { LitElement, html } from \"https://cdn.jsdelivr.net/npm/lit@3.2.1/+esm\";\n\n{{bulkRunnerJs}}\n</script>\n\n<h2>Retrieve field values from some records</h2>\n{{documentationHtml}}\n<hr/>\n<bulk-runner\n\t\ttask-type-label=\"Record Type|Internal ID|Location|Field ID\"\n\t\tcommand-post-url=\"{{commandUrl}}\">\n</bulk-runner>\n";

const commandName$5 = "lookup-fields";


var lookupFields = {
	name: "lookup-fields",
	label: "Lookup Fields",

	render(context) {
		return interpolate(templateHtml$5, {
			bulkRunnerJs,
			commandUrl: scriptDeployParam(context) + "&" + paramCommand + "=" + commandName$5,
			documentationHtml: documentationSection(`
				<h3>· For valid Record Types and Field IDs, see [${recordDetails.label}] page (left menu)</h3>
				<h3>· Internal ID for the Record (different from External ID on NetSuite page)</h3>
				<h3>· Location has format:</h3>
				<h4>&nbsp; &nbsp; · Empty, field directly in record</h4>
				<h4>&nbsp; &nbsp; · &lt;Sublist ID&gt;/&lt;Line Number&gt; (e.g. plannedrevenue/0)</h4>
				<h4>&nbsp; &nbsp; · &lt;Sublist ID&gt;/&lt;Sublist Field ID&gt;=&lt;Find Text&gt; (e.g. plannedrevenue/plannedperiod=Jun 2022)</h4>
				<h4>&nbsp; &nbsp; · Combine multiple Sublist Field ID queries and nested Line Number using &amp; (e.g. plannedrevenue/Amount=737.79&amp;-1)</h4>
				<h3>· Can specify multiple Field IDs, separated by &amp;</h3>
				<h3>· To get Sublist line count, use 'count' as the Field ID</h3>
				<h3>· The following are special characters: | / &amp;</h3>
				<h4>&nbsp; &nbsp; · To use them literally (e.g. as part of a department name), preface with \\ (backslash): \\| \\/ \\&amp;</h4>
			`),
		});
	},

	commands: {
		[commandName$5]: handleLookupFields,
	},
};


function handleLookupFields(context) {
	const tabDelimitedRows = JSON.parse(context.request.body);
	const tabDelimitedRow = tabDelimitedRows[0];
	if (! tabDelimitedRow) {
		return JSON.stringify(["Empty"]);
	}

	const parts = splitVerticalBar(tabDelimitedRow);

	const recordType = getRecordType(parts[0]);
	const recordId = normalizeKey(parts[1]);
	const pathParts = splitSlash(parts[2]);
	const fieldIds = splitAmpersand(parts[3]).map(i => normalizeKey(i.split("=")[0]));

	const rec = record.load({
		type: recordType,
		id: recordId,
	});

	if (fieldIds.length === 0) {
		return JSON.stringify(["Please specify Field ID"]);
	}

	const fieldTexts = [];
	for (const fieldId of fieldIds) {
		const fieldText = pathLookupFields(rec, fieldId, pathParts);
		fieldTexts.push(fieldText);
	}
	return JSON.stringify([fieldTexts.join(" | ")]);
}


function pathLookupFields(rec, fieldId, remainingPath) {
	if (remainingPath.length === 0) {
		let fieldText;
		try {
			fieldText = rec.getText({fieldId});
		}
		catch (e) {
			fieldText = "Error: " + e.message;
		}

		const fieldValue = rec.getValue({fieldId});
		const fieldValueSuffix =
			"" + fieldValue !== fieldText && fieldValue
			? ` (${fieldValue})`: "";

		return `${fieldId}=${fieldText}${fieldValueSuffix}`;
	}
	const sublistOrSubrecord = remainingPath[0];

	const sublistNames = rec.getSublists();
	if (! sublistNames.includes(sublistOrSubrecord)) {
		throw new Error("Sublist not found: " + sublistOrSubrecord);
	}

	if (remainingPath.length === 1 &&
			(fieldId === "count" || fieldId === "linecount")) {
		return `${sublistOrSubrecord}.${fieldId}=` + rec.getLineCount({
			sublistId: sublistOrSubrecord,
		});
	}

	const sublistLineQuery = remainingPath[1] || "";
	const sublistLine = getSublistLine(rec, sublistOrSubrecord, sublistLineQuery);

	if (remainingPath.length !== 2) {
		throw new Error("Sublist subrecord not supported: " + sublistOrSubrecord + " - " + JSON.stringify(remainingPath));
	}

	let sublistText;
	try {
		sublistText = rec.getSublistText({
			sublistId: sublistOrSubrecord,
			fieldId,
			line: sublistLine,
		});
	}
	catch (e) {
		sublistText = "Error: " + e.message;
	}

	const sublistValue = rec.getSublistValue({
		sublistId: sublistOrSubrecord,
		fieldId,
		line: sublistLine,
	});
	const sublistValueSuffix =
		"" + sublistValue !== sublistText && sublistValue
		? ` (${sublistValue})`: "";

	return `${sublistOrSubrecord}.${sublistLine}.${fieldId}=${sublistText}${sublistValueSuffix}`;
}


function getSublistLine(rec, sublistId, sublistLineQuery) {
	const matches = findSublistLines(rec, sublistId, sublistLineQuery);
	if (matches.length === 0) {
		throw new Error(
			"Sublist line not found: " + sublistLineQuery);
	}
	if (matches.length > 1) {
		throw new Error(
			`Multiple matching sublist lines (${matches}): ${sublistLineQuery}`);
	}
	return matches[0];
}


function findSublistLines(rec, sublistId, sublistLineQuery) {
	const count = rec.getLineCount({sublistId});

	const conjunctions = splitAmpersand(sublistLineQuery);

	let candidates = [...Array(count).keys()];
	for (const conjunction of conjunctions) {
		if (candidates.length === 0) {
			return [];
		}

		const asNumber = Number(conjunction);
		if (Number.isInteger(asNumber)) {
			// NB: handle -0 for inserting last
			if (!conjunction.startsWith("-")) {
				if (asNumber >= candidates.length) {
					throw new Error(`Line ${asNumber} is too big: ${candidates}`);
				}
				return [candidates[asNumber]];
			}
			else {
				if (-asNumber > candidates.length) {
					throw new Error(`Line ${asNumber} is too small: ${candidates}`);
				}
				else if (asNumber === 0) { // negative zero
					return [candidates[candidates.length - 1] + 1];
				}
				return [candidates[candidates.length + asNumber]];
			}
		}

		const queryField = parseFieldAssignment(conjunction);

		const remainingCandidates = [];
		for (let i = 0; i < candidates.length; i++) {
			const sublistFieldText = rec.getSublistText({
				sublistId,
				fieldId: queryField.fieldId,
				line: candidates[i],
			});

			if (sublistFieldText === queryField.fieldText) {
				remainingCandidates.push(candidates[i]);
				continue;
			}

			if (Number.isInteger(Number(queryField.fieldText))) {
				const sublistValue = rec.getSublistValue({
					sublistId,
					fieldId: queryField.fieldId,
					line: candidates[i],
				});

				if (Number(queryField.fieldText) === Number("" + sublistValue)) {
					remainingCandidates.push(candidates[i]);
					continue;
				}
			}
		}
		candidates = remainingCandidates;
	}

	return candidates;
}

var clientJs$1 = "// Edit-records subclass of BulkRunner: groups tasks by record type + ID so\n// multiple edits to the same record are saved as a single transaction.\n//\n// Module fragment — see bulk-runner.client.js for composition rules.\n// IMPORTANT: bulk-runner.client.js MUST be inlined before this file in the\n// page template's <script type=\"module\"> block, since BulkRunner must be in\n// scope when this class declaration runs.\n\nclass EditRecordsBulkRunner extends BulkRunner {\n\tgroupKey(task) {\n\t\tconst parts = task.split(\"|\").map(part => part.replace(/\\W/g, \"\").toLowerCase());\n\t\treturn parts[0] + \"|\" + parts[1];\n\t}\n}\n\ncustomElements.define(\"bulk-runner-edit-records\", EditRecordsBulkRunner);\n";

var templateHtml$4 = "<script type=\"module\">\nimport { LitElement, html } from \"https://cdn.jsdelivr.net/npm/lit@3.2.1/+esm\";\n\n{{bulkRunnerJs}}\n{{clientJs}}\n</script>\n\n<h2>Edit one or more records</h2>\n{{documentationHtml}}\n<hr/>\n<bulk-runner-edit-records\n\t\ttask-type-label=\"Record Type|Internal ID|Location|Field Values|Action\"\n\t\tcommand-post-url=\"{{commandUrl}}\">\n</bulk-runner-edit-records>\n";

const commandName$4 = "edit";
const actionSet = "set";
const actionInsertLine = "insert";
const actionRemoveLine = "remove";
const ignoreRecalcArg = normalizeKey("ignoreRecalc");


var editRecords = {
	name: "edit-records",
	label: "Edit Records",

	render(context) {
		return interpolate(templateHtml$4, {
			bulkRunnerJs,
			clientJs: clientJs$1,
			commandUrl: scriptDeployParam(context) + "&" + paramCommand + "=" + commandName$4,
			documentationHtml: documentationSection(`
				<h3>· For Record Type/Internal ID/Location, see [${lookupFields.label}] page (left menu)</h3>
				<h3>· Field Values have the following format:</h3>
				<h4>&nbsp; &nbsp; · &lt;Field ID&gt;=&lt;Field Text&gt; (for 'select' fields, the option number can be specified)</h4>
				<h4>&nbsp; &nbsp; · Can specify multiple field values, separated by &amp;</h4>
				<h4>&nbsp; &nbsp; · Multiple values can be used with ${actionSet}/${actionInsertLine}</h4>
				<h3>· The following Actions are available:</h3>
				<h4>&nbsp; &nbsp; · ${actionSet}: assign new value to one or more fields</h4>
				<h4>&nbsp; &nbsp; · ${actionInsertLine}: add new Sublist line (before given Location, use line=-0 to insert at end)</h4>
				<h4>&nbsp; &nbsp; · ${actionRemoveLine}: remove existing Sublist line</h4>
			`),
		});
	},

	commands: {
		[commandName$4]: handleEditRecord,
	},
};


function handleEditRecord(context) {
	const tabDelimitedRows = JSON.parse(context.request.body);
	const firstTabDelimitedRow = tabDelimitedRows[0];
	const firstParts = splitVerticalBar(firstTabDelimitedRow);
	const recordType = getRecordType(firstParts[0]);
	const recordId = normalizeKey(firstParts[1]);

	const rec = record.load({
		type: recordType,
		id: recordId,
	});

	const allValidators = [];
	for (const tabDelimitedRow of tabDelimitedRows) {
		const parts = splitVerticalBar(tabDelimitedRow);

		const actionLocation = parts[2];
		const fieldValues = parts[3];
		const actionName = parts[4];

		if (! actionName) {
			return "Please specify Action";
		}

		const validators = handleEditRecordAction(
			rec, actionName, actionLocation, fieldValues);

		allValidators.push(validators);
	}

	rec.save({});

	const reload = record.load({
		type: recordType,
		id: recordId,
	});

	const messages = [];
	for (const validators of allValidators) {
		const actionMessages = [];
		for (const validator of validators) {
			try {
				actionMessages.push(validator(reload));
			}
			catch (e) {
				actionMessages.push(`Unable to validate: ${e.message}`);
			}
		}
		messages.push(actionMessages.join(" | "));
	}

	return JSON.stringify(messages);
}


function handleEditRecordAction(rec, actionName, actionLocation, fieldValues) {
	const fieldAssignments = parseFieldAssignmentList(fieldValues);

	if (actionLocation === "") {
		if (actionName !== actionSet) {
			throw new Error(
				"Unsupported action on record: " + actionName);
		}

		return fieldAssignments.map(i =>
			setRecordField(rec, i.fieldId, i.fieldText));
	}

	const pathParts = splitSlash(actionLocation);
	if (pathParts.length !== 2) {
		throw new Error("Not supported: " + JSON.stringify(pathParts));
	}

	const sublistId = normalizeKey(pathParts[0]);
	const sublistIds = rec.getSublists();
	if (! sublistIds.includes(sublistId)) {
		throw new Error("Sublist not found: " + sublistId);
	}

	const sublistLineQuery = pathParts[1];

	switch (actionName.toLowerCase()) {
		case actionSet:
			return fieldAssignments.map(i =>
				setSublistField(rec, sublistId, sublistLineQuery, i.fieldId, i.fieldText));

		case actionInsertLine:
			return insertSublistLine(rec, sublistId, sublistLineQuery, fieldAssignments);

		case actionRemoveLine:
			return [removeSublistLine(rec, sublistId, sublistLineQuery, fieldAssignments)];

		default:
			throw new Error(
				"Unsupported action on sublist: " + actionName);
	}
}


function setRecordField(rec, fieldId, fieldText) {
	const field = rec.getField({fieldId});
	if (field.type === "select" || field.type === "multiselect") {
		return setRecordSelect(rec, fieldId, fieldText, field.type === "multiselect");
	}

	if (Array.isArray(fieldText)) {
		throw new Error("Single value expected (" + fieldId + "): " + fieldText);
	}

	const existingText = rec.getText({fieldId});
	if (existingText !== fieldText) {
		rec.setText({fieldId, text: fieldText});
	}

	return reload => {
		const afterUpdate = reload.getText({fieldId});
		return validateSetField(fieldId, existingText, fieldText, afterUpdate);
	};
}


function setRecordSelect(rec, fieldId, fieldText, multi) {
	const asList = Array.isArray(fieldText) ? fieldText : [fieldText];
	if (! multi && asList.length > 1) {
		throw new Error("Single value expected (" + fieldId + "): " + fieldText);
	}

	const allIds = asList.every(i => /^-?\d+$/.test(i.trim()));
	const someIds = asList.some(i => /^-?\d+$/.test(i.trim()));
	if (someIds && ! allIds) {
		throw new Error(
			"All must be text or all must be IDs (" + fieldId + "): " + fieldText);
	}

	if (allIds) {
		const fieldValues = asList.map(i => parseInt(i));
		const existingValue = rec.getValue({fieldId});
		const existingList = Array.isArray(existingValue) ? existingValue : [existingValue];
		if (JSON.stringify(asList) !== JSON.stringify(existingList)) {
			rec.setValue({
				fieldId,
				value: (multi ? fieldValues : fieldValues[0]),
			});
		}
		return reload => {
			const afterUpdate = reload.getValue({fieldId});
			return validateSetField(fieldId, "" + existingList, "" + asList, "" + afterUpdate);
		};
	}

	const existingText = rec.getText({fieldId});
	const existingList = Array.isArray(existingText) ? existingText : [existingText];

	if (JSON.stringify(asList) !== JSON.stringify(existingList)) {
		rec.setText({
			fieldId,
			text: (multi ? asList : asList[0]),
		});
	}

	return reload => {
		const afterUpdate = reload.getText({fieldId});
		return validateSetField(fieldId, "" + existingText, "" + fieldText, "" + afterUpdate);
	};
}


function setSublistField(rec, sublistId, sublistLineQuery, fieldId, fieldText) {
	const sublistLine = getSublistLine(rec, sublistId, sublistLineQuery);

	const field = rec.getSublistField({sublistId, fieldId, line: sublistLine});
	if (field.type === "select" || field.type === "multiselect") {
		return setSublistSelect(rec, sublistId, sublistLineQuery, fieldId, sublistLine, fieldText, field.type === "multiselect");
	}

	if (Array.isArray(fieldText)) {
		throw new Error(
			"Single value expected (" + sublistId + "/" + sublistLineQuery + "/" + fieldId + "): " + fieldText);
	}

	const existingText = rec.getSublistText({sublistId, fieldId, line: sublistLine});

	if (existingText !== fieldText) {
		rec.setSublistText({
			sublistId,
			fieldId,
			line: sublistLine,
			text: fieldText,
		});
	}

	return reload => {
		const reloadSublistLine = getSublistLine(reload, sublistId, sublistLineQuery);
		const afterUpdate = reload.getSublistText({sublistId, fieldId, line: reloadSublistLine});
		return validateSetField(fieldId, existingText, fieldText, afterUpdate);
	};
}


function setSublistSelect(rec, sublistId, sublistLineQuery, fieldId, sublistLine, fieldText, multi) {
	const asList = Array.isArray(fieldText) ? fieldText : [fieldText];
	if (! multi && asList.length > 1) {
		throw new Error("Single value expected (" + sublistId + "/" + sublistLineQuery + "/" + fieldId + "): " + fieldText);
	}

	const allIds = asList.every(i => /^-?\d+$/.test(i.trim()));
	const someIds = asList.some(i => /^-?\d+$/.test(i.trim()));
	if (someIds && ! allIds) {
		throw new Error(
			"All must be text or all must be IDs (" + sublistId + "/" + sublistLineQuery + "/" + fieldId + "): " + fieldText);
	}

	if (allIds) {
		const fieldValues = asList.map(i => parseInt(i));
		const existingValue = rec.getSublistValue({sublistId, fieldId, line: sublistLine});
		const existingList = Array.isArray(existingValue) ? existingValue : [existingValue];
		if (JSON.stringify(asList) !== JSON.stringify(existingList)) {
			rec.setSublistValue({
				sublistId,
				fieldId,
				line: sublistLine,
				value: (multi ? fieldValues : fieldValues[0]),
			});
		}
		return reload => {
			const afterUpdate = reload.getSublistValue({sublistId, fieldId, line: sublistLine});
			return validateSetField(fieldId, "" + existingList, "" + asList, "" + afterUpdate);
		};
	}

	const existingText = rec.getSublistText({sublistId, fieldId, line: sublistLine});
	const existingList = Array.isArray(existingText) ? existingText : [existingText];

	if (JSON.stringify(asList) !== JSON.stringify(existingList)) {
		rec.setSublistText({
			sublistId,
			fieldId,
			line: sublistLine,
			text: (multi ? asList : asList[0]),
		});
	}

	return reload => {
		const reloadSublistLine = getSublistLine(reload, sublistId, sublistLineQuery);
		const afterUpdate = reload.getSublistText({sublistId, fieldId, line: reloadSublistLine});
		const afterUpdateAsList = Array.isArray(afterUpdate) ? afterUpdate : [afterUpdate];
		return validateSetField(fieldId, "" + JSON.stringify(existingList), "" + JSON.stringify(asList), "" + JSON.stringify(afterUpdateAsList));
	};
}


function validateSetField(fieldId, existingText, fieldText, afterUpdate) {
	if (existingText === fieldText) {
		if (existingText === afterUpdate) {
			return `Did not change ${fieldId}, already set to '${existingText}'`;
		}
		else {
			return `Unexpected change ${fieldId}, was already '${existingText}' but now '${afterUpdate}'`;
		}
	}
	else if (existingText === afterUpdate) {
		return `Unable to change ${fieldId}, still '${existingText}'`;
	}
	else if (fieldText === afterUpdate) {
		return `Changed ${fieldId} from '${existingText}' to '${afterUpdate}'`;
	}
	else {
		return `Unexpected ${fieldId} change, tried '${fieldText}' but got '${afterUpdate}'`;
	}
}


function insertSublistLine(rec, sublistId, sublistLineQuery, fieldAssignments) {
	const count = rec.getLineCount({sublistId});
	const sublistLine =
		count === 0 && (sublistLineQuery === "0" || sublistLineQuery === "-0")
		? 0
		: getSublistLine(rec, sublistId, sublistLineQuery);
	const ignoreRecalc = getIgnoreCalcArgument(fieldAssignments, true);

	rec.insertLine({
		sublistId,
		line: sublistLine,
		ignoreRecalc,
	});

	for (const fieldAssignment of fieldAssignments) {
		if (fieldAssignment.fieldId === ignoreRecalcArg) {
			continue;
		}
		setSublistField(
			rec, sublistId, "" + sublistLine, fieldAssignment.fieldId, fieldAssignment.fieldText);
	}

	const validationSublistFields = rec.getSublistFields({sublistId})
		.filter(i => ! i.startsWith("sys_"));
	const sublistTextOrValues = validationSublistFields.map(fieldId =>
		getSublistTextOrValue(rec, sublistId, fieldId, sublistLine));

	return [
		reload => {
			const foundAt = [];
			const lineCount = reload.getLineCount({sublistId});
			const allReloadSublistTextOrValues = [...Array(lineCount).keys()].map(line =>
				validationSublistFields.map(fieldId => {
					const originalTextOrValue = sublistTextOrValues.find(i => i[1] === fieldId)[2];
					return originalTextOrValue
						? reload.getSublistText({sublistId, fieldId, line})
						: reload.getSublistValue({sublistId, fieldId, line});
				}));

			for (let line = 0; line < lineCount; line++) {
				const reloadSublistTextOrValues = allReloadSublistTextOrValues[line];
				const allEqual = sublistTextOrValues.every((val, idx) =>
					val[0] === "" || // appears to indicate missing
					JSON.stringify(val[0]) === JSON.stringify(reloadSublistTextOrValues[idx])
				);
				if (allEqual) {
					foundAt.push(line);
				}
			}
			return `Inserted at ${sublistLine} (found at ${foundAt.join(", ")})`;
		}];
}


function getSublistTextOrValue(rec, sublistId, fieldId, line) {
	try {
		return [rec.getSublistText({sublistId, fieldId, line}), fieldId, true];
	}
	catch (e) {
		if (e.message.includes("must use getSublistValue")) {
			return [rec.getSublistValue({sublistId, fieldId, line}), fieldId, false];
		}
		throw e;
	}
}


function removeSublistLine(rec, sublistId, sublistLineQuery, fieldAssignments) {
	const sublistLine = getSublistLine(rec, sublistId, sublistLineQuery);
	const ignoreRecalc = getIgnoreCalcArgument(fieldAssignments, true);

	const validationSublistFields = rec.getSublistFields({sublistId})
		.filter(i => ! i.startsWith("sys_"));
	const removedLineFingerprint = validationSublistFields.map(fieldId =>
		getSublistTextOrValue(rec, sublistId, fieldId, sublistLine));

	rec.removeLine({
		sublistId,
		line: sublistLine,
		ignoreRecalc,
	});

	return reload => {
		const foundAt = [];
		const lineCount = reload.getLineCount({sublistId});
		for (let i = 0; i < lineCount; i++) {
			const allEqual = removedLineFingerprint.every(([originalValue, fieldId, isText]) => {
				const reloadValue = isText
					? reload.getSublistText({sublistId, fieldId, line: i})
					: reload.getSublistValue({sublistId, fieldId, line: i});
				return originalValue === reloadValue;
			});
			if (allEqual) {
				foundAt.push(i);
			}
		}
		if (foundAt.length === 0) {
			return `Removed line ${sublistLine}: ${validationSublistFields.join(", ")}`;
		}

		return `Removed line ${sublistLine} - but still found at ${foundAt.join(", ")}: ${validationSublistFields.join(", ")}`;
	};
}


function getIgnoreCalcArgument(fieldAssignments, allowExtra) {
	if (fieldAssignments.length === 0) {
		return false;
	}

	const index = fieldAssignments
		.findIndex(i => i.fieldId === ignoreRecalcArg);

	if (! allowExtra && (index === -1 || fieldAssignments.length > 1)) {
		throw new Error(
			"Unsupported fields: " + JSON.stringify(fieldAssignments));
	}

	if (index === -1) {
		return false;
	}

	const ignoreRecalcValueText = fieldAssignments[index].fieldText.toLowerCase();
	if (ignoreRecalcValueText === "true" || ignoreRecalcValueText === "false") {
		return ignoreRecalcValueText === "true";
	}
	else {
		throw new Error(
			"Only true/false allowed for ignoreRecalc: " + ignoreRecalcValueText);
	}
}

var templateHtml$3 = "<script type=\"module\">\nimport { LitElement, html } from \"https://cdn.jsdelivr.net/npm/lit@3.2.1/+esm\";\n\n{{bulkRunnerJs}}\n</script>\n\n<h2>Create one or more records</h2>\n{{documentationHtml}}\n<hr/>\n<bulk-runner\n\t\ttask-type-label=\"Record Type|Default Values|Field Values\"\n\t\tcommand-post-url=\"{{commandUrl}}\">\n</bulk-runner>\n";

const commandName$3 = "create";


var createRecords = {
	name: "create-records",
	label: "Create Records",

	render(context) {
		return interpolate(templateHtml$3, {
			bulkRunnerJs,
			commandUrl: scriptDeployParam(context) + "&" + paramCommand + "=" + commandName$3,
			documentationHtml: documentationSection(`
				<h3>· For Record Type, see [${lookupFields.label}] page (left menu)</h3>
				<h3>· Default Values and Field Values have the following format:</h3>
				<h4>&nbsp; &nbsp; · &lt;Field ID&gt;=&lt;Field Value&gt;</h4>
				<h4>&nbsp; &nbsp; · Can specify multiple field values, separated by &amp;</h4>
				<h3>· To determine which values are "Default Values" (vs Field Values):</h3>
				<h4>&nbsp; &nbsp; · Refer to SuiteScript documentation (incomplete):
					<a href="https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_4267255811.html#bridgehead_4423371543">
						"N/record Default Values"
					</a>
				</h4>
				<h4>&nbsp; &nbsp; · For some Records Types, certain Default Values are mandatory</h4>
				<h3>· Result contains the new Internal ID that is automatically generated by NetSuite</h3>
				<h3>· Sublists are not supported during creation (use [${editRecords.label}] after)</h3>
			`),
		});
	},

	commands: {
		[commandName$3]: handleCreateRecord,
	},
};


function handleCreateRecord(context) {
	const tabDelimitedRows = JSON.parse(context.request.body);
	const firstTabDelimitedRow = tabDelimitedRows[0];
	const firstParts = splitVerticalBar(firstTabDelimitedRow);
	const recordType = getRecordType(firstParts[0]);
	const defaultFieldValues = parseFieldAssignmentList(firstParts[1] || "");
	const fieldValues = parseFieldAssignmentList(firstParts[2] || "");

	const allValidators = [];

	const defaultValues = {};

	const rec = record.create({
		type: recordType,
		defaultValues,
	});

	for (const fieldValue of defaultFieldValues) {
		const validator = setDefaultRecordField(rec, fieldValue.fieldId, fieldValue.fieldText);
		allValidators.push(validator);
	}

	const recordId = rec.save({});

	const loaded = record.load({
		type: recordType,
		id: recordId,
	});

	for (const fieldValue of fieldValues) {
		const validator = setRecordField(loaded, fieldValue.fieldId, fieldValue.fieldText);
		allValidators.push(validator);
	}

	loaded.save({});

	const reload = record.load({
		type: recordType,
		id: recordId,
	});

	const messages = [];
	for (const validator of allValidators) {
		try {
			messages.push(validator(reload));
		}
		catch (e) {
			messages.push(`Unable to validate: ${e.message}`);
		}
	}

	return JSON.stringify([
		`Internal ID: ${recordId} | ${messages.join(" | ")}`,
	]);
}


function setDefaultRecordField(rec, fieldId, fieldText) {
	const field = rec.getField({fieldId});
	if (field.type === "select" || field.type === "multiselect") {
		return setDefaultRecordSelect(rec, fieldId, fieldText, field.type === "multiselect");
	}

	if (Array.isArray(fieldText)) {
		throw new Error(
			"Single value expected (" + fieldId + "): " + fieldText);
	}

	rec.setText({
		fieldId,
		text: fieldText,
	});

	return reload => {
		const afterSave = reload.getText({fieldId});
		return afterSave === fieldText
			? `Default ${fieldId} to '${fieldText}'`
			: `Unexpected ${fieldId} default, tried '${fieldText}' but got '${afterSave}'`;
	};
}


function setDefaultRecordSelect(rec, fieldId, fieldText, multi) {
	const asList = Array.isArray(fieldText) ? fieldText : [fieldText];
	if (! multi && asList.length > 1) {
		throw new Error(
			"Single value expected (" + fieldId + "): " + fieldText);
	}

	const allIds = asList.every(i => /^-?\d+$/.test(i.trim()));
	const someIds = asList.some(i => /^-?\d+$/.test(i.trim()));
	if (someIds && ! allIds) {
		throw new Error(
			"All must be text or all must be IDs (" + fieldId + "): " + fieldText);
	}

	if (allIds) {
		const fieldValues = asList.map(i => parseInt(i));
		rec.setValue({
			fieldId,
			value: (multi ? fieldValues : fieldValues[0]),
		});
		return reload => {
			const afterSave = reload.getValue({fieldId});
			const afterSaveList = Array.isArray(afterSave) ? afterSave : [afterSave];
			return JSON.stringify(asList) === JSON.stringify(afterSaveList)
				? `Default ${fieldId} to '${fieldText}'`
				: `Unexpected ${fieldId} default, tried '${fieldText}' but got '${afterSave}'`;
		};
	}

	rec.setText({
		fieldId,
		text: (multi ? asList : asList[0]),
	});

	return reload => {
		const afterSave = reload.getText({fieldId});
		const afterSaveList = Array.isArray(afterSave) ? afterSave : [afterSave];
		return JSON.stringify(afterSaveList) === JSON.stringify(asList)
			? `Default ${fieldId} to '${fieldText}'`
			: `Unexpected ${fieldId} default, tried '${fieldText}' but got '${afterSave}'`;
	};
}

var templateHtml$2 = "<script type=\"module\">\nimport { LitElement, html } from \"https://cdn.jsdelivr.net/npm/lit@3.2.1/+esm\";\n\n{{bulkRunnerJs}}\n</script>\n\n<h1>Edit/Save Records</h1>\n<h2>(without changing values, to trigger events)</h2>\n{{documentationHtml}}\n<hr/>\n<bulk-runner\n\t\ttask-type-label=\"Record Type|Internal ID\"\n\t\tcommand-post-url=\"{{commandUrl}}\">\n</bulk-runner>\n";

const commandName$2 = "mass-save";


var massSave = {
	name: "mass-save",
	label: "Mass Edit/Save",

	render(context) {
		return interpolate(templateHtml$2, {
			bulkRunnerJs,
			commandUrl: scriptDeployParam(context) + "&" + paramCommand + "=" + commandName$2,
			documentationHtml: documentationSection(`
				<h3>· For Record Type/Internal ID, see [${lookupFields.label}] page (left menu)</h3>
				<h2>· Each Record by Internal ID:</h2>
				<h2>&nbsp; &nbsp; 1) EDIT Record (load)</h2>
				<h2>&nbsp; &nbsp; 2) SAVE Record</h2>
				<h2>· Result: trigger any associated events (e.g. run workflows)</h2>
			`),
		});
	},

	commands: {
		[commandName$2]: handleMassSave,
	},
};


function handleMassSave(context) {
	const tabDelimitedRows = JSON.parse(context.request.body);
	const firstTabDelimitedRow = tabDelimitedRows[0];
	const firstParts = splitVerticalBar(firstTabDelimitedRow);
	const recordType = getRecordType(firstParts[0]);
	const recordId = normalizeKey(firstParts[1] || "");

	if (! recordType) {
		return `["Record Type not specified"]`;
	}
	if (! recordId) {
		return `["Internal ID not specified"]`;
	}

	const rec = record.load({
		type: recordType,
		id: recordId,
	});
	rec.save({});

	return `["Edit/Save"]`;
}

var templateHtml$1 = "<script type=\"module\">\nimport { LitElement, html } from \"https://cdn.jsdelivr.net/npm/lit@3.2.1/+esm\";\n\n{{bulkRunnerJs}}\n</script>\n\n<h1 style=\"color: red\">***Records are PERMANENTLY DELETED***</h1>\n{{documentationHtml}}\n<hr/>\n<bulk-runner\n\t\ttask-type-label=\"Record Type|Internal ID\"\n\t\tcommand-post-url=\"{{commandUrl}}\">\n</bulk-runner>\n";

const commandName$1 = "mass-delete";


var massDelete = {
	name: "mass-delete",
	label: "Mass Delete (DANGER!)",

	render(context) {
		return interpolate(templateHtml$1, {
			bulkRunnerJs,
			commandUrl: scriptDeployParam(context) + "&" + paramCommand + "=" + commandName$1,
			documentationHtml: documentationSection(`
				<h3>· DELETE each Record by Record Type/Internal ID, see [${lookupFields.label}] page (left menu)</h3>
			`),
		});
	},

	commands: {
		[commandName$1]: handleMassDelete,
	},
};


function handleMassDelete(context) {
	const tabDelimitedRows = JSON.parse(context.request.body);
	const firstTabDelimitedRow = tabDelimitedRows[0];
	const firstParts = splitVerticalBar(firstTabDelimitedRow);
	const recordType = getRecordType(firstParts[0]);
	const recordId = normalizeKey(firstParts[1] || "");

	if (! recordType) {
		return `["Record Type not specified"]`;
	}
	if (! recordId) {
		return `["Internal ID not specified"]`;
	}

	let loadMessageSuffix = "";
	try {
		record.load({
			type: recordType,
			id: recordId,
		});
	}
	catch (e) {
		if (e.name === "RCRD_DSNT_EXIST") {
			return `["Does not exist"]`;
		}
		else if (e.name === "INVALID_RCRD_TYPE") {
			return `["Error: record type ${recordType} does not exist"]`;
		}
		else {
			loadMessageSuffix = " | Load error: " + e.name + " - " + e.message;
		}
	}

	try {
		record.delete({
			type: recordType,
			id: recordId,
		});
	}
	catch (e) {
		return `["Delete error: ${e.message}${loadMessageSuffix}"]`;
	}

	try {
		record.load({
			type: recordType,
			id: recordId,
		});
		return `["Delete failed${loadMessageSuffix}"]`;
	}
	catch (e) {
		if (e.name === "RCRD_DSNT_EXIST") {
			return `["Delete successful${loadMessageSuffix}"]`;
		}
		else {
			return `["Delete error${loadMessageSuffix} | Reload error: ${e.message}"]`;
		}
	}
}

var clientJs = "// SuiteQL Query page Lit component. Tracks the current page index, POSTs the\n// query + page index to the server, renders the returned rows into a table.\n//\n// Module fragment — see bulk-runner.client.js for composition rules.\n\nclass SuiteqlPage extends LitElement {\n\tstatic properties = {\n\t\tcommandPostUrl: { type: String, attribute: \"command-post-url\" },\n\t\tcurrentPageIndex: { state: true },\n\t\tlastResponse: { state: true },\n\t\tstatusText: { state: true },\n\t\trunning: { state: true },\n\t};\n\n\tconstructor() {\n\t\tsuper();\n\t\tthis.commandPostUrl = \"\";\n\t\tthis.currentPageIndex = 0;\n\t\tthis.lastResponse = null;\n\t\tthis.statusText = \"\";\n\t\tthis.running = false;\n\t}\n\n\tcreateRenderRoot() {\n\t\treturn this;\n\t}\n\n\tupdated() {\n\t\tif (window.componentHandler) {\n\t\t\twindow.componentHandler.upgradeElements(this);\n\t\t}\n\t}\n\n\trender() {\n\t\tconst resp = this.lastResponse;\n\t\tconst showPagination = resp != null && resp.pageCount > 1;\n\t\tconst showResults = resp != null && resp.columns != null;\n\n\t\treturn html`\n\t\t\t<fieldset style=\"width: 60em\">\n\t\t\t\t<legend>SQL</legend>\n\t\t\t\t<textarea class=\"mdl-textfield__input\" id=\"sql\" rows=\"8\" autofocus></textarea>\n\t\t\t</fieldset>\n\t\t\t<div style=\"margin-top: 0.5em\">\n\t\t\t\t<button class=\"mdl-button mdl-js-button mdl-button--raised mdl-button--colored\"\n\t\t\t\t\t\t@click=${this.runQuery}\n\t\t\t\t\t\t?disabled=${this.running}>\n\t\t\t\t\t<span class=\"material-icons md-18\">play_arrow</span> Run Query\n\t\t\t\t</button>\n\t\t\t\t<span style=\"margin-left: 1em\">${this.statusText}</span>\n\t\t\t</div>\n\t\t\t<hr/>\n\t\t\t${showPagination ? html`\n\t\t\t\t<div style=\"margin-bottom: 0.5em\">\n\t\t\t\t\t<button class=\"mdl-button mdl-js-button\"\n\t\t\t\t\t\t\t@click=${this.prevPage}\n\t\t\t\t\t\t\t?disabled=${resp.pageIndex === 0}>Previous</button>\n\t\t\t\t\t<span style=\"margin: 0 1em\">Page ${resp.pageIndex + 1} / ${resp.pageCount}</span>\n\t\t\t\t\t<button class=\"mdl-button mdl-js-button\"\n\t\t\t\t\t\t\t@click=${this.nextPage}\n\t\t\t\t\t\t\t?disabled=${resp.pageIndex >= resp.pageCount - 1}>Next</button>\n\t\t\t\t</div>\n\t\t\t` : \"\"}\n\t\t\t${showResults ? html`\n\t\t\t\t<div style=\"overflow-x: auto; max-height: 40em; overflow-y: auto\">\n\t\t\t\t\t<table class=\"mdl-data-table mdl-js-data-table mdl-shadow--2dp\" style=\"white-space: nowrap\">\n\t\t\t\t\t\t<thead>\n\t\t\t\t\t\t\t<tr>${resp.columns.map(c => html`\n\t\t\t\t\t\t\t\t<th class=\"mdl-data-table__cell--non-numeric\">${c}</th>\n\t\t\t\t\t\t\t`)}</tr>\n\t\t\t\t\t\t</thead>\n\t\t\t\t\t\t<tbody>${resp.rows.map(r => html`\n\t\t\t\t\t\t\t<tr>${r.map(v => html`\n\t\t\t\t\t\t\t\t<td class=\"mdl-data-table__cell--non-numeric\" style=\"font-family: monospace\">${v == null ? \"\" : String(v)}</td>\n\t\t\t\t\t\t\t`)}</tr>\n\t\t\t\t\t\t`)}</tbody>\n\t\t\t\t\t</table>\n\t\t\t\t</div>\n\t\t\t` : \"\"}\n\t\t`;\n\t}\n\n\trunQuery() {\n\t\tthis.currentPageIndex = 0;\n\t\tthis.fetchPage();\n\t}\n\n\tprevPage() {\n\t\tif (this.currentPageIndex > 0) {\n\t\t\tthis.currentPageIndex--;\n\t\t\tthis.fetchPage();\n\t\t}\n\t}\n\n\tnextPage() {\n\t\tif (this.lastResponse && this.currentPageIndex < this.lastResponse.pageCount - 1) {\n\t\t\tthis.currentPageIndex++;\n\t\t\tthis.fetchPage();\n\t\t}\n\t}\n\n\tfetchPage() {\n\t\tconst sql = this.querySelector(\"#sql\").value;\n\t\tthis.statusText = \"Running...\";\n\t\tthis.running = true;\n\n\t\tconst xhr = new XMLHttpRequest();\n\t\txhr.onreadystatechange = () => {\n\t\t\tif (xhr.readyState !== 4) return;\n\t\t\tthis.running = false;\n\t\t\tif (xhr.status !== 200) {\n\t\t\t\tthis.statusText = \"HTTP \" + xhr.status + \": \" + xhr.responseText;\n\t\t\t\treturn;\n\t\t\t}\n\t\t\tlet resp;\n\t\t\ttry {\n\t\t\t\tresp = JSON.parse(xhr.responseText);\n\t\t\t}\n\t\t\tcatch (e) {\n\t\t\t\tthis.statusText = \"Bad response: \" + xhr.responseText;\n\t\t\t\treturn;\n\t\t\t}\n\t\t\tif (resp.error) {\n\t\t\t\tthis.statusText = \"Error: \" + resp.error;\n\t\t\t\treturn;\n\t\t\t}\n\t\t\tthis.lastResponse = resp;\n\t\t\tthis.statusText = \"Page \" + (resp.pageIndex + 1) + \" of \" + Math.max(resp.pageCount, 1) +\n\t\t\t\t\" · \" + resp.totalCount + \" rows total\";\n\t\t};\n\t\txhr.open(\"POST\", this.commandPostUrl);\n\t\txhr.setRequestHeader(\"Content-type\", \"application/json\");\n\t\txhr.send(JSON.stringify({\n\t\t\tquery: sql,\n\t\t\tpageIndex: this.currentPageIndex,\n\t\t\tpageSize: 1000,\n\t\t}));\n\t}\n}\n\ncustomElements.define(\"suiteql-page\", SuiteqlPage);\n";

var templateHtml = "<script type=\"module\">\nimport { LitElement, html } from \"https://cdn.jsdelivr.net/npm/lit@3.2.1/+esm\";\n\n{{clientJs}}\n</script>\n\n<h2>SuiteQL Query</h2>\n{{documentationHtml}}\n<hr/>\n<suiteql-page command-post-url=\"{{commandUrl}}\"></suiteql-page>\n";

const commandName = "suiteql";


var suiteql = {
	name: "suiteql",
	label: "SuiteQL Query",

	render(context) {
		return interpolate(templateHtml, {
			clientJs,
			commandUrl: scriptDeployParam(context) + "&" + paramCommand + "=" + commandName,
			documentationHtml: documentationSection(`
				<h3>· Enter a SuiteQL query and click Run.</h3>
				<h3>· Results are paged in chunks of up to 1000 rows (NetSuite max page size).</h3>
				<h4>&nbsp; &nbsp; · Use Previous / Next to navigate pages when the result set is larger than one page.</h4>
				<h3>· Examples:</h3>
				<h4>&nbsp; &nbsp; · <code>SELECT id, type, trandate FROM transaction FETCH FIRST 100 ROWS ONLY</code></h4>
				<h4>&nbsp; &nbsp; · <code>SELECT COUNT(*) AS n FROM customer</code></h4>
				<h3>· Errors (e.g. invalid SQL) are reported in the status line below.</h3>
			`),
		});
	},

	commands: {
		[commandName]: handleSuiteQl,
	},
};


function handleSuiteQl(context) {
	let body;
	try {
		body = JSON.parse(context.request.body);
	}
	catch (e) {
		return JSON.stringify({ error: "Invalid request body: " + e.message });
	}

	const sql = (body.query || "").trim();
	if (! sql) {
		return JSON.stringify({ error: "Empty query" });
	}

	const pageIndex = Number.isInteger(body.pageIndex) ? body.pageIndex : 0;
	const pageSize = Number.isInteger(body.pageSize) ? body.pageSize : 1000;

	try {
		const paged = query.runSuiteQLPaged({
			query: sql,
			pageSize,
		});
		const totalCount = paged.count;
		const pageCount = paged.pageRanges.length;

		if (pageCount === 0 || pageIndex >= pageCount) {
			return JSON.stringify({
				totalCount,
				pageCount,
				pageSize,
				pageIndex,
				columns: [],
				rows: [],
			});
		}

		const page = paged.fetch({ index: pageIndex });
		// page.data is a ResultSet (not a plain array). asMappedResults() gives
		// plain objects keyed by column alias — easiest to serialize.
		const mapped = page.data.asMappedResults();
		const columns = mapped.length > 0 ? Object.keys(mapped[0]) : [];
		const rows = mapped.map(m => columns.map(c => m[c]));

		return JSON.stringify({
			totalCount,
			pageCount,
			pageSize,
			pageIndex,
			columns,
			rows,
		});
	}
	catch (e) {
		return JSON.stringify({ error: e.message });
	}
}

// Ordered list of pages. Order controls the navigation drawer.
// The first entry is the default page (loaded when no ?page= is given).



var pages = [
	welcome,
	recordType,
	recordDetails,
	lookupFields,
	editRecords,
	createRecords,
	massSave,
	suiteql,
	massDelete,
];

function main(context) {
	const command = context.request.parameters[paramCommand] || "";
	if (command !== "") {
		dispatchCommand(context, command);
		return;
	}
	renderPage(context);
}


function dispatchCommand(context, command) {
	const page = pages.find(p => p.commands && command in p.commands);
	let responseText;
	if (! page) {
		responseText = `Error: unknown command '${command}'`;
	}
	else {
		try {
			responseText = "" + page.commands[command](context);
		}
		catch (e) {
			responseText = `Error: ${e.message}`;
		}
	}
	context.response.write(responseText || "(blank)");
}


function renderPage(context) {
	const requestedPage = context.request.parameters[paramPage];
	const page = pages.find(p => p.name === requestedPage) || pages[0];
	const defaultPage = pages[0];

	const navigationLink = p => `
		<a class="mdl-navigation__link ${p.name === page.name ? 'mdl-navigation__link--current' : ''}"
				href="${setPageParam(context, p.name)}">
			${p.label}
		</a>`;

	const navHtml = navigationLink(defaultPage)
		+ "<hr/>"
		+ pages.slice(1).map(navigationLink).join("");

	context.response.write(interpolate(layoutHtml, {
		title: `${page.label} - AO Dashboard`,
		mdlCssUrl,
		mdlJsUrl,
		version,
		nsVersion: runtime.version || "[unknown version]",
		navHtml,
		bodyHtml: page.render(context),
	}));
}

var index = { onRequest: main };

return index;

}));

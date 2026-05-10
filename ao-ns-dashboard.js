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
    return String(value).replace(/[&<>"']/g, c => escapeMap[c] ?? c);
}
const placeholder = /\{\{(\w+)\}\}/g;
// Substitutes {{key}} markers in `template` with values from `vars`.
// Keys whose name ends in "Html" or "Js" are inserted verbatim;
// every other key is HTML-escaped.
function interpolate(template, vars) {
    return template.replace(placeholder, (_match, key) => {
        if (!Object.hasOwn(vars, key)) {
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
		<details style="margin-bottom: 1em">
			<summary style="cursor: pointer; padding: 0.4em 1em; background: #eee; border: 1px solid #ccc; border-radius: 2px; display: inline-block; user-select: none">
				<span class="material-icons md-18" style="vertical-align: middle">help</span>
				Help
			</summary>
			<div style="padding: 1em 0 0 0; max-width: 60em">
				${documentationHtml}
			</div>
		</details>
	`;
}

var layoutHtml = "<!doctype html>\n<head>\n\t<title>{{title}}</title>\n\t<script type=\"importmap\">\n\t\t{{importMapJsonJs}}\n\t</script>\n\t<link rel=\"stylesheet\" href=\"https://fonts.googleapis.com/icon?family=Material+Icons\" />\n\t<link rel=\"stylesheet\" href=\"{{mdlCssUrl}}\" />\n\t<script defer src=\"{{mdlJsUrl}}\"></script>\n\t<style>\n\t\t/* MDL's default is overflow-x: hidden, which clips wide tables. Pages\n\t\t   that need horizontal scroll opt in via PageDef.bodyClass = \"page-wide\".\n\t\t   Wrapping the table in an overflow-x: auto div would create a scroll\n\t\t   container that breaks the page-level sticky thead, so let the page\n\t\t   itself scroll horizontally instead. */\n\t\tbody.page-wide .mdl-layout__content {\n\t\t\toverflow-x: auto !important;\n\t\t}\n\t</style>\n\n\t<script\n\t\tsrc=\"https://code.jquery.com/jquery-3.6.0.js\"\n\t\tintegrity=\"sha256-H+K7U5CnXl1h5ywQfKtSj8PCmoN9aaq30gDh27Xc0jk=\"\n\t\tcrossorigin=\"anonymous\"\n\t></script>\n\t<script\n\t\tsrc=\"https://cdnjs.cloudflare.com/ajax/libs/select2/4.1.0-rc.0/js/select2.js\"\n\t\tintegrity=\"sha512-w8hm+E7eW80RcTpHGflcYz2A9wvvjbADCPcqepR11qvCUQmZEo65n7o+3JYpYP1yrzW6xyHqcqrNMOz1kQ+o6A==\"\n\t\tcrossorigin=\"anonymous\"\n\t\treferrerpolicy=\"no-referrer\"\n\t></script>\n\t<link\n\t\trel=\"stylesheet\"\n\t\thref=\"https://cdnjs.cloudflare.com/ajax/libs/select2/4.1.0-rc.0/css/select2.css\"\n\t\tintegrity=\"sha512-PO7TIdn2hPTkZ6DSc5eN2DyMpTn/ZixXUQMDLUx+O5d7zGy0h1Th5jgYt84DXvMRhF3N0Ucfd7snCyzlJbAHQA==\"\n\t\tcrossorigin=\"anonymous\"\n\t\treferrerpolicy=\"no-referrer\"\n\t/>\n\t<script>\n\t\t$(document).on(\"select2:open\", () => {\n\t\t\tdocument.querySelector(\".select2-search__field\").focus();\n\t\t});\n\t\t$(function () {\n\t\t\tconst host = window.location.hostname;\n\t\t\tconst env = host.split(\".\")[0];\n\t\t\tif (!env.includes(\"-sb\")) {\n\t\t\t\tdocument.getElementsByClassName(\"mdl-layout__header-row\")[0].style = \"background-color: red\";\n\t\t\t}\n\t\t\t// textContent (not innerHTML): hostname is browser-controlled but\n\t\t\t// nothing in this codepath should ever interpret it as markup.\n\t\t\tdocument.getElementById(\"env\").textContent = \"[\" + env + \"]\";\n\t\t});\n\t</script>\n</head>\n<body class=\"{{bodyClassesHtml}}\">\n\t<div class=\"mdl-layout mdl-js-layout mdl-layout--fixed-header mdl-layout--fixed-drawer\" style=\"width: 100%\">\n\t\t<header class=\"mdl-layout__header\">\n\t\t\t<div class=\"mdl-layout__header-row\">\n\t\t\t\t<span class=\"mdl-layout-title\" style=\"width: 100%\">\n\t\t\t\t\t{{title}}\n\t\t\t\t\t<span style=\"float: right; text-align: right\" title=\"version\">\n\t\t\t\t\t\t<span id=\"env\" title=\"Environment\" style=\"font-family: monospace\">...</span>\n\t\t\t\t\t\tv{{version}} <br />\n\t\t\t\t\t\tNetSuite {{nsVersion}}\n\t\t\t\t\t</span>\n\t\t\t\t</span>\n\t\t\t</div>\n\t\t</header>\n\n\t\t<div class=\"mdl-layout__drawer\">\n\t\t\t<nav class=\"mdl-navigation\">{{navHtml}}</nav>\n\t\t</div>\n\n\t\t<main class=\"mdl-layout__content\">\n\t\t\t<div class=\"page-content\" style=\"padding: 1em\">{{bodyHtml}}</div>\n\t\t</main>\n\t</div>\n</body>\n";

const version = "2026.05.10a";
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
    const script = context.request.parameters["script"];
    const deploy = context.request.parameters["deploy"];
    if (!/^\d+$/.test(script || "") || !/^\d+$/.test(deploy || "")) {
        throw new Error("Invalid script/deploy parameters");
    }
    return "?script=" + script + "&deploy=" + deploy;
}
function setPageParam(context, page) {
    return scriptDeployParam(context) + "&" + paramPage + "=" + page;
}

var separatorsSource = "// Shared separator-splitter helpers — used by both server-side parsing and\n// client-side `groupKey` implementations. Pure code with no NetSuite imports\n// so it can be `?raw`-loaded into a client module *and* statically imported\n// by server modules from `src/utils.ts` (which re-exports from here).\n//\n// Each function splits on its delimiter while honouring `\\<delim>` as an\n// escape. Implementation uses a random sentinel to round-trip escapes\n// without the cost of a stateful parser.\nexport function splitAmpersand(value) {\n    const sentinel = \"__AMPERSAND_ESCAPE__\" + Math.random().toString(36).substring(2);\n    const withSentinel = value.replaceAll(\"\\\\&\", sentinel);\n    return withSentinel.split(\"&\").map(i => i.replaceAll(sentinel, \"&\"));\n}\nexport function splitVerticalBar(value) {\n    const sentinel = \"__VERTICAL_BAR_ESCAPE__\" + Math.random().toString(36).substring(2);\n    const withSentinel = value.replaceAll(\"\\\\|\", sentinel);\n    return withSentinel.split(\"|\").map(i => i.replaceAll(sentinel, \"|\"));\n}\nexport function splitSlash(value) {\n    if (value === \"\") {\n        return [];\n    }\n    const sentinel = \"__SLASH_ESCAPE__\" + Math.random().toString(36).substring(2);\n    const withSentinel = value.replaceAll(\"\\\\/\", sentinel);\n    return withSentinel.split(\"/\").map(i => i.replaceAll(sentinel, \"/\"));\n}\n";

var apiSource = "// Shared client helper: POST JSON to a `?command=<name>` endpoint and parse\n// the `CommandResponse<T>` envelope. Centralises serialisation, status-code\n// handling, and JSON-parse fallbacks so each Lit component doesn't reimplement\n// them. Use `AbortController` to cancel an in-flight request (see Lit's\n// `disconnectedCallback` to clean up when a component unmounts).\nexport async function postJson(url, body, signal) {\n    const init = {\n        method: \"POST\",\n        headers: { \"Content-Type\": \"application/json\" },\n        body: JSON.stringify(body),\n    };\n    if (signal !== undefined) {\n        init.signal = signal;\n    }\n    let response;\n    try {\n        response = await fetch(url, init);\n    }\n    catch (e) {\n        // Caller distinguishes cancellation from real failures; let it through.\n        if (e instanceof DOMException && e.name === \"AbortError\") {\n            throw e;\n        }\n        return wrapFailure(\"Network error: \" + (e instanceof Error ? e.message : String(e)));\n    }\n    const text = await response.text();\n    if (!response.ok) {\n        return wrapFailure(`HTTP ${response.status}: ${text}`, `HTTP_${response.status}`);\n    }\n    try {\n        return JSON.parse(text);\n    }\n    catch (_e) {\n        return wrapFailure(\"Invalid JSON response: \" + text);\n    }\n}\nfunction wrapFailure(message, code) {\n    return { ok: false, error: code !== undefined ? { code, message } : { message } };\n}\n";

var csvSource = "// Shared CSV encoder for client-side download buttons.\n// Prevents CSV formula injection: spreadsheets evaluate cells starting with\n// =, +, -, @, tab, or CR as formulas even when wrapped in quotes. Also doubles\n// internal double-quotes so the cell can be safely wrapped in \"...\".\nexport function csvEncode(value) {\n    let str = stringify(value);\n    if (typeof value !== \"number\" && /^[=+\\-@\\t\\r]/.test(str)) {\n        str = \"'\" + str;\n    }\n    return str.replaceAll('\"', '\"\"');\n}\nfunction stringify(value) {\n    if (value == null)\n        return \"\";\n    if (typeof value === \"string\")\n        return value;\n    if (typeof value === \"number\" || typeof value === \"boolean\")\n        return String(value);\n    // Plain objects and arrays would otherwise stringify as \"[object Object]\"\n    // or comma-joined; JSON gives a useful, deterministic representation.\n    return JSON.stringify(value);\n}\n";

var bulkRunnerSource = "// Lit base component for the bulk-task pages\n// (lookup-fields, edit-records, create-records, mass-save, mass-delete).\n// Subclass to enable batching by overriding `groupKey(task)`.\nimport { LitElement, html } from \"lit\";\nimport { csvEncode } from \"csv\";\nimport { postJson } from \"api\";\nexport class BulkRunner extends LitElement {\n    constructor() {\n        super();\n        // Aborts any in-flight request when the component is removed (e.g. user\n        // navigates to another page mid-batch). Avoids \"set state on detached\n        // element\" warnings and stops the run loop cleanly.\n        Object.defineProperty(this, \"abortController\", {\n            enumerable: true,\n            configurable: true,\n            writable: true,\n            value: null\n        });\n        // Guards against starting a parallel batch when Resume is clicked while a\n        // batch is still in flight from before Pause. Set true in runNext() before\n        // kicking off runCommand(), cleared in runCommand() before re-entering\n        // runNext().\n        Object.defineProperty(this, \"running\", {\n            enumerable: true,\n            configurable: true,\n            writable: true,\n            value: false\n        });\n        this.taskTypeLabel = \"\";\n        this.commandPostUrl = \"\";\n        this.phase = \"input\";\n        this.model = [];\n        this.pageStart = 0;\n        this.pageCount = 100;\n        this.paused = false;\n    }\n    disconnectedCallback() {\n        super.disconnectedCallback();\n        this.abortController?.abort();\n        this.abortController = null;\n    }\n    createRenderRoot() {\n        return this;\n    }\n    groupKey(_task) {\n        return \"\";\n    }\n    render() {\n        return this.phase === \"input\" ? this.renderInput() : this.renderStatus();\n    }\n    renderInput() {\n        return html `\n\t\t\t<div>\n\t\t\t\t<fieldset style=\"width: 40em\">\n\t\t\t\t\t<legend>${this.taskTypeLabel} (one per line)</legend>\n\t\t\t\t\t<textarea class=\"mdl-textfield__input\" rows=\"20\" id=\"tasks\" autofocus></textarea>\n\t\t\t\t</fieldset>\n\t\t\t\t<div>\n\t\t\t\t\t<button\n\t\t\t\t\t\tclass=\"mdl-button mdl-js-button mdl-button--raised mdl-button--colored\"\n\t\t\t\t\t\t@click=${this.runAll}\n\t\t\t\t\t>\n\t\t\t\t\t\t<span class=\"material-icons md-18\">play_arrow</span> Run All\n\t\t\t\t\t</button>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t`;\n    }\n    renderStatus() {\n        const startedCount = this.model.filter(i => i.status !== \"\").length;\n        const visibleStart = this.pageStart;\n        const visibleEnd = Math.min(this.model.length, visibleStart + this.pageCount);\n        const visible = this.model.slice(visibleStart, visibleEnd);\n        const finished = this.model.every(i => i.status !== \"\" && i.status !== \"Running\");\n        const pauseResumeButton = finished\n            ? null\n            : this.paused\n                ? html `\n\t\t\t\t\t\t<button\n\t\t\t\t\t\t\tclass=\"mdl-button mdl-js-button mdl-button--raised mdl-button--colored\"\n\t\t\t\t\t\t\tstyle=\"margin-right: 1em\"\n\t\t\t\t\t\t\t@click=${this.resume}\n\t\t\t\t\t\t>\n\t\t\t\t\t\t\t<span class=\"material-icons md-18\">play_arrow</span> Resume\n\t\t\t\t\t\t</button>\n\t\t\t\t\t`\n                : html `\n\t\t\t\t\t\t<button\n\t\t\t\t\t\t\tclass=\"mdl-button mdl-js-button mdl-button--raised mdl-button--colored\"\n\t\t\t\t\t\t\tstyle=\"margin-right: 1em\"\n\t\t\t\t\t\t\t@click=${this.pause}\n\t\t\t\t\t\t>\n\t\t\t\t\t\t\t<span class=\"material-icons md-18\">pause</span> Pause\n\t\t\t\t\t\t</button>\n\t\t\t\t\t`;\n        return html `\n\t\t\t<div>\n\t\t\t\t<div\n\t\t\t\t\tclass=\"bulk-runner-actions\"\n\t\t\t\t\tstyle=\"position: sticky; top: 0; background: white; z-index: 1; padding: 0.5em 0; box-shadow: 0 4px 4px -4px rgba(0,0,0,0.3)\"\n\t\t\t\t>\n\t\t\t\t\t${pauseResumeButton}\n\t\t\t\t\t<span class=\"mdl-textfield mdl-js-textfield mdl-textfield--floating-label\" style=\"width: 5em\">\n\t\t\t\t\t\t<input\n\t\t\t\t\t\t\ttype=\"text\"\n\t\t\t\t\t\t\tclass=\"mdl-textfield__input\"\n\t\t\t\t\t\t\t.value=${String(this.pageStart + 1)}\n\t\t\t\t\t\t\t@change=${this.onPageStartChange}\n\t\t\t\t\t\t/>\n\t\t\t\t\t\t<label class=\"mdl-textfield__label\">Start</label>\n\t\t\t\t\t</span>\n\t\t\t\t\t<span\n\t\t\t\t\t\tclass=\"mdl-textfield mdl-js-textfield mdl-textfield--floating-label\"\n\t\t\t\t\t\tstyle=\"width: 5em; margin-left: 1em\"\n\t\t\t\t\t>\n\t\t\t\t\t\t<input\n\t\t\t\t\t\t\ttype=\"text\"\n\t\t\t\t\t\t\tclass=\"mdl-textfield__input\"\n\t\t\t\t\t\t\t.value=${String(this.pageCount)}\n\t\t\t\t\t\t\t@change=${this.onPageCountChange}\n\t\t\t\t\t\t/>\n\t\t\t\t\t\t<label class=\"mdl-textfield__label\">Count</label>\n\t\t\t\t\t</span>\n\t\t\t\t\t<span style=\"margin-left: 1em\">\n\t\t\t\t\t\t<button\n\t\t\t\t\t\t\tclass=\"mdl-button mdl-js-button mdl-button--raised mdl-button--colored\"\n\t\t\t\t\t\t\tstyle=\"margin-left: 1em\"\n\t\t\t\t\t\t\t@click=${this.downloadStatus}\n\t\t\t\t\t\t>\n\t\t\t\t\t\t\t<span class=\"material-icons md-18\">download</span> Download\n\t\t\t\t\t\t</button>\n\t\t\t\t\t</span>\n\t\t\t\t\t<span style=\"margin-left: 1em\">\n\t\t\t\t\t\tProgress: ${startedCount} of ${this.model.length}${this.paused ? \" (paused)\" : \"\"}\n\t\t\t\t\t</span>\n\t\t\t\t</div>\n\t\t\t\t<div>\n\t\t\t\t\t<table class=\"mdl-data-table mdl-js-data-table mdl-shadow--2dp\" style=\"width: 100%\">\n\t\t\t\t\t\t<thead>\n\t\t\t\t\t\t\t<tr>\n\t\t\t\t\t\t\t\t<th\n\t\t\t\t\t\t\t\t\tclass=\"mdl-data-table__cell\"\n\t\t\t\t\t\t\t\t\tstyle=\"position: sticky; top: var(--bulk-runner-actions-height, 64px); background: white; z-index: 2; box-shadow: 0 4px 4px -4px rgba(0,0,0,0.3)\"\n\t\t\t\t\t\t\t\t>\n\t\t\t\t\t\t\t\t\tNumber\n\t\t\t\t\t\t\t\t</th>\n\t\t\t\t\t\t\t\t<th\n\t\t\t\t\t\t\t\t\tclass=\"mdl-data-table__cell--non-numeric\"\n\t\t\t\t\t\t\t\t\tstyle=\"position: sticky; top: var(--bulk-runner-actions-height, 64px); background: white; z-index: 2; box-shadow: 0 4px 4px -4px rgba(0,0,0,0.3)\"\n\t\t\t\t\t\t\t\t>\n\t\t\t\t\t\t\t\t\tTask\n\t\t\t\t\t\t\t\t</th>\n\t\t\t\t\t\t\t\t<th\n\t\t\t\t\t\t\t\t\tclass=\"mdl-data-table__cell--non-numeric\"\n\t\t\t\t\t\t\t\t\tstyle=\"width: 100%; position: sticky; top: var(--bulk-runner-actions-height, 64px); background: white; z-index: 2; box-shadow: 0 4px 4px -4px rgba(0,0,0,0.3)\"\n\t\t\t\t\t\t\t\t>\n\t\t\t\t\t\t\t\t\tResult\n\t\t\t\t\t\t\t\t</th>\n\t\t\t\t\t\t\t</tr>\n\t\t\t\t\t\t</thead>\n\t\t\t\t\t\t<tbody>\n\t\t\t\t\t\t\t${visible.map((item, i) => {\n            const isError = item.status.toLowerCase().includes(\"error\");\n            const cellStyle = isError ? \"color: red; white-space: normal\" : \"white-space: normal\";\n            return html `\n\t\t\t\t\t\t\t\t\t<tr>\n\t\t\t\t\t\t\t\t\t\t<td class=\"mdl-data-table__cell--non-numeric\">${visibleStart + i + 1}</td>\n\t\t\t\t\t\t\t\t\t\t<td class=\"mdl-data-table__cell--non-numeric\">${item.task}</td>\n\t\t\t\t\t\t\t\t\t\t<td class=\"mdl-data-table__cell--non-numeric\" style=${cellStyle}>\n\t\t\t\t\t\t\t\t\t\t\t${item.status}\n\t\t\t\t\t\t\t\t\t\t</td>\n\t\t\t\t\t\t\t\t\t</tr>\n\t\t\t\t\t\t\t\t`;\n        })}\n\t\t\t\t\t\t</tbody>\n\t\t\t\t\t</table>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t`;\n    }\n    updated() {\n        // MDL classes need re-upgrading after re-render so freshly created\n        // buttons/inputs pick up ripple/floating-label behavior.\n        window.componentHandler?.upgradeElements(this);\n        // Sync the thead's sticky offset with the actual height of the actions\n        // row so the column headers freeze just below it instead of overlapping.\n        const actions = this.querySelector(\".bulk-runner-actions\");\n        if (actions) {\n            this.style.setProperty(\"--bulk-runner-actions-height\", actions.offsetHeight + \"px\");\n        }\n    }\n    onPageStartChange(e) {\n        const target = e.target;\n        const parsed = parseInt(target.value);\n        this.pageStart = Number.isFinite(parsed) ? Math.max(0, parsed - 1) : 0;\n    }\n    onPageCountChange(e) {\n        const target = e.target;\n        const parsed = parseInt(target.value);\n        this.pageCount = Number.isFinite(parsed) && parsed > 0 ? parsed : 100;\n    }\n    runAll() {\n        const taskValues = this.querySelector(\"#tasks\").value;\n        const tasks = taskValues.split(/\\r?\\n/);\n        const newModel = [];\n        for (const task of tasks) {\n            const trimmed = task.trim();\n            if (trimmed !== \"\") {\n                newModel.push({\n                    task,\n                    status: \"\",\n                    group: this.groupKey(task) || \"\",\n                });\n            }\n        }\n        this.model = newModel;\n        this.phase = \"running\";\n        this.runNext();\n    }\n    runNext() {\n        if (this.paused || this.running) {\n            this.requestUpdate();\n            return;\n        }\n        const nextIndex = this.model.findIndex(e => e.status === \"\");\n        if (nextIndex === -1) {\n            this.requestUpdate();\n            return;\n        }\n        const first = this.model[nextIndex];\n        const batch = first.group === \"\" ? [first] : this.model.filter(i => i.group === first.group);\n        for (const next of batch) {\n            next.status = \"Running\";\n        }\n        this.requestUpdate();\n        this.running = true;\n        void this.runCommand(batch);\n    }\n    pause() {\n        this.paused = true;\n    }\n    resume() {\n        this.paused = false;\n        this.runNext();\n    }\n    async runCommand(nextBatch) {\n        const markBatchError = (message) => {\n            nextBatch[0].status = message;\n            for (let i = 1; i < nextBatch.length; i++) {\n                nextBatch[i].status = \"Error for: \" + nextBatch[0].group;\n            }\n        };\n        this.abortController = new AbortController();\n        let envelope;\n        try {\n            envelope = await postJson(this.commandPostUrl, nextBatch.map(i => i.task), this.abortController.signal);\n        }\n        catch (e) {\n            // AbortError — component was disconnected; bail without state changes.\n            if (e instanceof DOMException && e.name === \"AbortError\") {\n                this.running = false;\n                return;\n            }\n            markBatchError(\"Error: \" + (e instanceof Error ? e.message : String(e)));\n            this.requestUpdate();\n            this.running = false;\n            this.runNext();\n            return;\n        }\n        if (!envelope.ok) {\n            markBatchError(\"Error: \" + envelope.error.message);\n        }\n        else {\n            for (let i = 0; i < envelope.data.length; i++) {\n                const value = envelope.data[i];\n                nextBatch[i].status = value === \"\" || value === undefined ? \"(blank)\" : value;\n            }\n        }\n        this.requestUpdate();\n        this.running = false;\n        this.runNext();\n    }\n    downloadStatus() {\n        const rows = [\"Number,Task,Result\"];\n        for (let i = 0; i < this.model.length; i++) {\n            const item = this.model[i];\n            rows.push(i + 1 + ',\"' + csvEncode(item.task) + '\",\"' + csvEncode(item.status) + '\"');\n        }\n        const csv = rows.join(\"\\r\\n\");\n        const a = document.createElement(\"a\");\n        a.setAttribute(\"href\", \"data:text/plain;charset=utf-8,\" + encodeURIComponent(csv));\n        a.setAttribute(\"download\", \"result.csv\");\n        a.style.display = \"none\";\n        document.body.appendChild(a);\n        a.click();\n        document.body.removeChild(a);\n    }\n}\nObject.defineProperty(BulkRunner, \"properties\", {\n    enumerable: true,\n    configurable: true,\n    writable: true,\n    value: {\n        taskTypeLabel: { type: String, attribute: \"task-type-label\" },\n        commandPostUrl: { type: String, attribute: \"command-post-url\" },\n        phase: { state: true },\n        model: { state: true },\n        pageStart: { state: true },\n        pageCount: { state: true },\n        paused: { state: true },\n    }\n});\ncustomElements.define(\"bulk-runner\", BulkRunner);\n";

var editRecordsSource = "// Edit-records subclass of BulkRunner: groups tasks by record type + ID so\n// multiple edits to the same record are saved as a single transaction.\nimport { BulkRunner } from \"bulk-runner\";\nimport { splitVerticalBar } from \"separators\";\nclass EditRecordsBulkRunner extends BulkRunner {\n    groupKey(task) {\n        const parts = splitVerticalBar(task).map(part => part.replace(/\\W/g, \"\").toLowerCase());\n        return (parts[0] ?? \"\") + \"|\" + (parts[1] ?? \"\");\n    }\n}\ncustomElements.define(\"bulk-runner-edit-records\", EditRecordsBulkRunner);\n";

var recordTypeSource = "// Record-type subclass of BulkRunner.\n//\n// Adds an Internal ID input above the bulk-runner scaffold and rebuilds the\n// command URL whenever it changes. Each row in the textarea is a Record Type\n// to probe against the entered Internal ID.\nimport { html } from \"lit\";\nimport { BulkRunner } from \"bulk-runner\";\nclass RecordTypeBulkRunner extends BulkRunner {\n    constructor() {\n        super();\n        this.commandPrefix = \"\";\n        this.recordIdParam = \"\";\n        this.defaultTasks = \"\";\n        this.defaultPageCount = 100;\n    }\n    connectedCallback() {\n        super.connectedCallback();\n        this.pageCount = this.defaultPageCount;\n    }\n    onRecordIdChange(e) {\n        const target = e.target;\n        const id = encodeURIComponent(target.value);\n        this.commandPostUrl = this.commandPrefix + \"&\" + this.recordIdParam + \"=\" + id;\n    }\n    renderInput() {\n        return html `\n\t\t\t<div>\n\t\t\t\t<div style=\"display: flex; align-items: center; gap: 1em\">\n\t\t\t\t\t<div class=\"mdl-textfield mdl-js-textfield mdl-textfield--floating-label\" style=\"width: 20em\">\n\t\t\t\t\t\t<input\n\t\t\t\t\t\t\tclass=\"mdl-textfield__input\"\n\t\t\t\t\t\t\ttype=\"text\"\n\t\t\t\t\t\t\tid=\"recordId\"\n\t\t\t\t\t\t\tautofocus\n\t\t\t\t\t\t\t@change=${this.onRecordIdChange}\n\t\t\t\t\t\t/>\n\t\t\t\t\t\t<label class=\"mdl-textfield__label\" for=\"recordId\">Internal ID or External ID</label>\n\t\t\t\t\t</div>\n\t\t\t\t\t<button\n\t\t\t\t\t\tclass=\"mdl-button mdl-js-button mdl-button--raised mdl-button--colored\"\n\t\t\t\t\t\t@click=${this.runAll}\n\t\t\t\t\t>\n\t\t\t\t\t\t<span class=\"material-icons md-18\">play_arrow</span> Run All\n\t\t\t\t\t</button>\n\t\t\t\t</div>\n\t\t\t\t<hr />\n\t\t\t\t<fieldset style=\"width: 40em\">\n\t\t\t\t\t<legend>${this.taskTypeLabel} (one per line)</legend>\n\t\t\t\t\t<textarea class=\"mdl-textfield__input\" rows=\"20\" id=\"tasks\" .value=${this.defaultTasks}></textarea>\n\t\t\t\t</fieldset>\n\t\t\t</div>\n\t\t`;\n    }\n}\nObject.defineProperty(RecordTypeBulkRunner, \"properties\", {\n    enumerable: true,\n    configurable: true,\n    writable: true,\n    value: {\n        ...BulkRunner.properties,\n        commandPrefix: { type: String, attribute: \"command-prefix\" },\n        recordIdParam: { type: String, attribute: \"record-id-param\" },\n        defaultTasks: { type: String, attribute: \"default-tasks\" },\n        defaultPageCount: { type: Number, attribute: \"default-page-count\" },\n    }\n});\ncustomElements.define(\"bulk-runner-record-type\", RecordTypeBulkRunner);\n";

var suiteqlSource = "// SuiteQL Query page Lit component. Tracks the current page index, POSTs the\n// query + page index to the server, renders the returned rows into a table.\nimport { LitElement, html } from \"lit\";\nimport { csvEncode } from \"csv\";\nimport { postJson } from \"api\";\nfunction formatCell(value) {\n    if (value == null)\n        return \"\";\n    if (typeof value === \"string\")\n        return value;\n    if (typeof value === \"number\" || typeof value === \"boolean\")\n        return String(value);\n    return JSON.stringify(value);\n}\nclass SuiteqlPage extends LitElement {\n    constructor() {\n        super();\n        Object.defineProperty(this, \"abortController\", {\n            enumerable: true,\n            configurable: true,\n            writable: true,\n            value: null\n        });\n        this.commandPostUrl = \"\";\n        this.currentPageIndex = 0;\n        this.lastResponse = null;\n        this.statusText = \"\";\n        this.running = false;\n    }\n    disconnectedCallback() {\n        super.disconnectedCallback();\n        this.abortController?.abort();\n        this.abortController = null;\n    }\n    createRenderRoot() {\n        return this;\n    }\n    updated() {\n        window.componentHandler?.upgradeElements(this);\n        // Sync the thead's sticky offset with the actual height of the actions row\n        // so the column headers freeze just below it instead of overlapping.\n        const actions = this.querySelector(\".suiteql-actions\");\n        if (actions) {\n            this.style.setProperty(\"--suiteql-actions-height\", actions.offsetHeight + \"px\");\n        }\n    }\n    render() {\n        const resp = this.lastResponse;\n        const showPagination = resp !== null && resp.pageCount > 1;\n        const showResults = resp !== null && resp.columns !== null;\n        return html `\n\t\t\t<fieldset style=\"width: 60em\">\n\t\t\t\t<legend>SQL</legend>\n\t\t\t\t<textarea class=\"mdl-textfield__input\" id=\"sql\" rows=\"8\" autofocus></textarea>\n\t\t\t</fieldset>\n\t\t\t<div\n\t\t\t\tclass=\"suiteql-actions\"\n\t\t\t\tstyle=\"position: sticky; top: 0; background: white; z-index: 1; padding: 0.5em 0; box-shadow: 0 4px 4px -4px rgba(0,0,0,0.3)\"\n\t\t\t>\n\t\t\t\t<button\n\t\t\t\t\tclass=\"mdl-button mdl-js-button mdl-button--raised mdl-button--colored\"\n\t\t\t\t\t@click=${this.runQuery}\n\t\t\t\t\t?disabled=${this.running}\n\t\t\t\t>\n\t\t\t\t\t<span class=\"material-icons md-18\">play_arrow</span> Run Query\n\t\t\t\t</button>\n\t\t\t\t${showResults\n            ? html `\n\t\t\t\t\t\t\t<button\n\t\t\t\t\t\t\t\tclass=\"mdl-button mdl-js-button mdl-button--raised mdl-button--colored\"\n\t\t\t\t\t\t\t\tstyle=\"margin-left: 1em\"\n\t\t\t\t\t\t\t\t@click=${this.downloadCsv}\n\t\t\t\t\t\t\t>\n\t\t\t\t\t\t\t\t<span class=\"material-icons md-18\">download</span> Download\n\t\t\t\t\t\t\t</button>\n\t\t\t\t\t\t`\n            : \"\"}\n\t\t\t\t${showPagination && resp\n            ? html `\n\t\t\t\t\t\t\t<span style=\"margin-left: 2em\">\n\t\t\t\t\t\t\t\t<button\n\t\t\t\t\t\t\t\t\tclass=\"mdl-button mdl-js-button\"\n\t\t\t\t\t\t\t\t\t@click=${this.prevPage}\n\t\t\t\t\t\t\t\t\t?disabled=${resp.pageIndex === 0}\n\t\t\t\t\t\t\t\t>\n\t\t\t\t\t\t\t\t\tPrevious\n\t\t\t\t\t\t\t\t</button>\n\t\t\t\t\t\t\t\t<span style=\"margin: 0 0.5em\">Page ${resp.pageIndex + 1} / ${resp.pageCount}</span>\n\t\t\t\t\t\t\t\t<button\n\t\t\t\t\t\t\t\t\tclass=\"mdl-button mdl-js-button\"\n\t\t\t\t\t\t\t\t\t@click=${this.nextPage}\n\t\t\t\t\t\t\t\t\t?disabled=${resp.pageIndex >= resp.pageCount - 1}\n\t\t\t\t\t\t\t\t>\n\t\t\t\t\t\t\t\t\tNext\n\t\t\t\t\t\t\t\t</button>\n\t\t\t\t\t\t\t</span>\n\t\t\t\t\t\t`\n            : \"\"}\n\t\t\t\t<span style=\"margin-left: 1em\">${this.statusText}</span>\n\t\t\t</div>\n\t\t\t${showResults && resp\n            ? html `\n\t\t\t\t\t\t<table class=\"mdl-data-table mdl-js-data-table mdl-shadow--2dp\" style=\"white-space: nowrap\">\n\t\t\t\t\t\t\t<thead>\n\t\t\t\t\t\t\t\t<tr>\n\t\t\t\t\t\t\t\t\t${resp.columns.map(c => html `\n\t\t\t\t\t\t\t\t\t\t\t<th\n\t\t\t\t\t\t\t\t\t\t\t\tclass=\"mdl-data-table__cell--non-numeric\"\n\t\t\t\t\t\t\t\t\t\t\t\tstyle=\"position: sticky; top: var(--suiteql-actions-height, 52px); background: white; z-index: 2; box-shadow: 0 4px 4px -4px rgba(0,0,0,0.3)\"\n\t\t\t\t\t\t\t\t\t\t\t>\n\t\t\t\t\t\t\t\t\t\t\t\t${c}\n\t\t\t\t\t\t\t\t\t\t\t</th>\n\t\t\t\t\t\t\t\t\t\t`)}\n\t\t\t\t\t\t\t\t</tr>\n\t\t\t\t\t\t\t</thead>\n\t\t\t\t\t\t\t<tbody>\n\t\t\t\t\t\t\t\t${resp.rows.map(r => html `\n\t\t\t\t\t\t\t\t\t\t<tr>\n\t\t\t\t\t\t\t\t\t\t\t${r.map(v => html `\n\t\t\t\t\t\t\t\t\t\t\t\t\t<td\n\t\t\t\t\t\t\t\t\t\t\t\t\t\tclass=\"mdl-data-table__cell--non-numeric\"\n\t\t\t\t\t\t\t\t\t\t\t\t\t\tstyle=\"font-family: monospace\"\n\t\t\t\t\t\t\t\t\t\t\t\t\t>\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t${formatCell(v)}\n\t\t\t\t\t\t\t\t\t\t\t\t\t</td>\n\t\t\t\t\t\t\t\t\t\t\t\t`)}\n\t\t\t\t\t\t\t\t\t\t</tr>\n\t\t\t\t\t\t\t\t\t`)}\n\t\t\t\t\t\t\t</tbody>\n\t\t\t\t\t\t</table>\n\t\t\t\t\t`\n            : \"\"}\n\t\t`;\n    }\n    runQuery() {\n        this.currentPageIndex = 0;\n        void this.fetchPage();\n    }\n    prevPage() {\n        if (this.currentPageIndex > 0) {\n            this.currentPageIndex--;\n            void this.fetchPage();\n        }\n    }\n    nextPage() {\n        if (this.lastResponse && this.currentPageIndex < this.lastResponse.pageCount - 1) {\n            this.currentPageIndex++;\n            void this.fetchPage();\n        }\n    }\n    async fetchPage() {\n        const sql = this.querySelector(\"#sql\").value;\n        this.statusText = \"Running...\";\n        this.running = true;\n        // Cancel any in-flight request so rapid Run-Query / pagination clicks\n        // don't race; only the latest response wins.\n        this.abortController?.abort();\n        this.abortController = new AbortController();\n        let envelope;\n        try {\n            envelope = await postJson(this.commandPostUrl, { query: sql, pageIndex: this.currentPageIndex, pageSize: 1000 }, this.abortController.signal);\n        }\n        catch (e) {\n            if (e instanceof DOMException && e.name === \"AbortError\") {\n                return;\n            }\n            this.running = false;\n            this.statusText = \"Error: \" + (e instanceof Error ? e.message : String(e));\n            return;\n        }\n        this.running = false;\n        if (!envelope.ok) {\n            this.statusText = \"Error: \" + envelope.error.message;\n            return;\n        }\n        const data = envelope.data;\n        this.lastResponse = data;\n        this.statusText =\n            \"Page \" +\n                (data.pageIndex + 1) +\n                \" of \" +\n                Math.max(data.pageCount, 1) +\n                \" · \" +\n                data.totalCount +\n                \" rows total\";\n    }\n    downloadCsv() {\n        // Exports the current page only. SuiteQL pages server-side; cross-page\n        // export would require iterating fetchPage and accumulating.\n        const resp = this.lastResponse;\n        if (resp === null || resp.columns === null) {\n            return;\n        }\n        const lines = [];\n        lines.push(resp.columns.map(c => '\"' + csvEncode(c) + '\"').join(\",\"));\n        for (const row of resp.rows) {\n            lines.push(row.map(v => '\"' + csvEncode(v) + '\"').join(\",\"));\n        }\n        const csv = lines.join(\"\\r\\n\");\n        const a = document.createElement(\"a\");\n        a.setAttribute(\"href\", \"data:text/plain;charset=utf-8,\" + encodeURIComponent(csv));\n        a.setAttribute(\"download\", \"suiteql.csv\");\n        a.style.display = \"none\";\n        document.body.appendChild(a);\n        a.click();\n        document.body.removeChild(a);\n    }\n}\nObject.defineProperty(SuiteqlPage, \"properties\", {\n    enumerable: true,\n    configurable: true,\n    writable: true,\n    value: {\n        commandPostUrl: { type: String, attribute: \"command-post-url\" },\n        currentPageIndex: { state: true },\n        lastResponse: { state: true },\n        statusText: { state: true },\n        running: { state: true },\n    }\n});\ncustomElements.define(\"suiteql-page\", SuiteqlPage);\n";

var recordDetailsSource = "// Record Details page Lit component.\n//\n// Wraps the Select2-driven record-type dropdown and the record-id form in a\n// custom element so the page follows the same component model as every other\n// page (no inline jQuery / global functions). The server still renders the\n// `detailsHtml` block server-side and passes it as an attribute; this\n// component just owns the form chrome and the loading-spinner state.\n//\n// We deliberately do NOT use `lit/directives/unsafe-html.js` to inject the\n// server-rendered HTML chunks — that submodule isn't in the import map (only\n// the bundled `\"lit\"` entry-point is) and we don't want to manage transitive\n// CDN paths just for one directive. Instead, we reserve empty hosts in the\n// Lit template (no bindings inside), then set their `innerHTML` directly.\n// lit-html doesn't reconcile children of elements with no internal template\n// parts, so the injected DOM stays put across re-renders.\nimport { LitElement, html } from \"lit\";\nclass RecordDetailsPage extends LitElement {\n    constructor() {\n        super();\n        this.paramRecordType = \"\";\n        this.paramRecordId = \"\";\n        this.recordType = \"\";\n        this.recordId = \"\";\n        this.recordTypeOptionsHtml = \"\";\n        this.detailsHtml = \"\";\n        this.loading = false;\n    }\n    createRenderRoot() {\n        return this;\n    }\n    firstUpdated() {\n        // Populate the <select>'s option list BEFORE Select2 initialises —\n        // Select2 reads existing <option> children when it builds its UI.\n        // Includes the empty placeholder option so Select2's \"placeholder\"\n        // behaviour works correctly.\n        const select = this.querySelector(\".record-type-select\");\n        if (select) {\n            select.innerHTML = \"<option></option>\" + this.recordTypeOptionsHtml;\n        }\n        // Using jQuery directly because Select2 is a jQuery plugin and that's\n        // how it's loaded site-wide (see layout.html). The change handler is\n        // bound via jQuery too — Select2 fires `change` through jQuery's\n        // `.trigger()`, which does not reach native `addEventListener` (so\n        // Lit's `@change` would never see the user's selection).\n        $(select).select2({ placeholder: \"Please make a selection\" });\n        $(select).on(\"change\", e => this.onTypeSelectChange(e));\n    }\n    updated(_changed) {\n        // MDL classes need re-upgrading after each render so freshly created\n        // inputs/buttons pick up ripple/floating-label behavior.\n        window.componentHandler?.upgradeElements(this);\n        // Server-rendered detailsHtml only changes once per page load (the\n        // server re-renders on form submit, which is a fresh request), so\n        // we just inject every time the host is present and not loading.\n        const host = this.querySelector(\".details-host\");\n        if (host && this.detailsHtml !== \"\") {\n            host.innerHTML = this.detailsHtml;\n        }\n    }\n    onTypeSelectChange(e) {\n        const target = e.target;\n        this.recordType = target.value;\n    }\n    onSubmit() {\n        // Show the spinner immediately; the page reload that follows will\n        // replace this state with the server-rendered detailsHtml.\n        this.loading = true;\n    }\n    render() {\n        return html `\n\t\t\t<div>\n\t\t\t\t<h2>Retrieve all info about a particular record</h2>\n\t\t\t\t<hr />\n\t\t\t</div>\n\t\t\t<form method=\"post\" @submit=${this.onSubmit}>\n\t\t\t\t<fieldset>\n\t\t\t\t\t<legend>Record Type Search</legend>\n\t\t\t\t\t<!-- options injected via firstUpdated() before Select2 initialises -->\n\t\t\t\t\t<!-- change is bound via jQuery in firstUpdated() — see the comment there -->\n\t\t\t\t\t<select class=\"record-type-select\" id=\"record-type-search\"></select>\n\t\t\t\t</fieldset>\n\t\t\t\t<fieldset style=\"margin-top: 0.5em; width: 30em\">\n\t\t\t\t\t<!-- NB: floating label doesn't work with programmatic value assignment -->\n\t\t\t\t\t<legend>Record Type</legend>\n\t\t\t\t\t<input\n\t\t\t\t\t\tclass=\"mdl-textfield__input\"\n\t\t\t\t\t\ttype=\"text\"\n\t\t\t\t\t\tid=\"recordType\"\n\t\t\t\t\t\tname=${this.paramRecordType}\n\t\t\t\t\t\t.value=${this.recordType}\n\t\t\t\t\t/>\n\t\t\t\t</fieldset>\n\t\t\t\t<br />\n\t\t\t\t<div class=\"mdl-textfield mdl-js-textfield mdl-textfield--floating-label\">\n\t\t\t\t\t<input\n\t\t\t\t\t\tclass=\"mdl-textfield__input\"\n\t\t\t\t\t\ttype=\"text\"\n\t\t\t\t\t\tid=\"recordId\"\n\t\t\t\t\t\tname=${this.paramRecordId}\n\t\t\t\t\t\t.value=${this.recordId}\n\t\t\t\t\t\tautofocus\n\t\t\t\t\t/>\n\t\t\t\t\t<label class=\"mdl-textfield__label\" for=\"recordId\">Internal ID</label>\n\t\t\t\t</div>\n\t\t\t\t<br />\n\t\t\t\t<button type=\"submit\" class=\"mdl-button mdl-js-button mdl-button--raised mdl-button--colored\">\n\t\t\t\t\t<span class=\"material-icons md-18\">search</span> Get Details\n\t\t\t\t</button>\n\t\t\t\t<hr />\n\t\t\t\t${this.loading\n            ? html `<div class=\"mdl-spinner mdl-js-spinner is-active\"></div>`\n            : html `<div class=\"details-host\"></div>`}\n\t\t\t</form>\n\t\t`;\n    }\n}\nObject.defineProperty(RecordDetailsPage, \"properties\", {\n    enumerable: true,\n    configurable: true,\n    writable: true,\n    value: {\n        paramRecordType: { type: String, attribute: \"param-record-type\" },\n        paramRecordId: { type: String, attribute: \"param-record-id\" },\n        recordType: { type: String, attribute: \"record-type\" },\n        recordId: { type: String, attribute: \"record-id\" },\n        recordTypeOptionsHtml: { type: String, attribute: \"record-type-options-html\" },\n        detailsHtml: { type: String, attribute: \"details-html\" },\n        loading: { state: true },\n    }\n});\ncustomElements.define(\"record-details-page\", RecordDetailsPage);\n";

// Single source of truth for client-side ES modules.
//
// Each entry maps a bare specifier (the import name used by `*.client.ts`
// files) to the source text for that module. Rollup's `?raw` plugin loads
// each `.client.ts` file as a string, transpiling TS → JS first so the
// browser can execute it directly. At request time, `main.ts` wraps each
// source string in a `data:text/javascript;` URL and writes the full
// `<script type="importmap">` JSON into the rendered page.
//
// Adding a new client module is a single edit here — no other files to
// touch. `layout.html` consumes the import map via the `{{importMapJsonJs}}`
// placeholder.
// Bare-specifier → module source. Order matches the import map output for
// readability in the rendered HTML; it doesn't affect resolution.
const clientModules = {
    separators: separatorsSource,
    api: apiSource,
    csv: csvSource,
    "bulk-runner": bulkRunnerSource,
    "edit-records": editRecordsSource,
    "record-type": recordTypeSource,
    "record-details": recordDetailsSource,
    suiteql: suiteqlSource,
};
// External (non-data:) entries kept in the import map alongside the bundled
// modules. Lit is loaded from a CDN at runtime — bundling would inflate the
// per-page bundle by ~20 KB and Lit 3 is stable on jsdelivr. Pinned to match
// the version installed locally for type checking (see package.json).
const externalImports = {
    lit: "https://cdn.jsdelivr.net/npm/lit@3.2.1/+esm",
};
// Build the JSON for `<script type="importmap">…</script>`. The `lit` CDN
// URL passes through verbatim; bundled modules become `data:` URLs.
function buildImportMapJson() {
    const imports = { ...externalImports };
    for (const [id, source] of Object.entries(clientModules)) {
        imports[id] = "data:text/javascript;charset=utf-8," + encodeURIComponent(source);
    }
    return JSON.stringify({ imports }, null, "\t");
}

// In strict mode, `catch (e)` types `e` as `unknown`. NetSuite throws
// SuiteScriptError instances which behave like Error (have `name`/`message`)
// but `e instanceof Error` is unreliable in the AMD bundle context — different
// realm / different Error prototype than the one TypeScript's lib references.
// Duck-type on `.message` / `.name` instead so we never fall back to
// `String(e)`, which would JSON-serialize the whole error (including the
// stack trace) into something like `{"name":"...","message":"...","stack":...}`.
function asPropString(e, prop) {
    if (e == null || typeof e !== "object")
        return undefined;
    const value = e[prop];
    return typeof value === "string" ? value : undefined;
}
function errorMessage(e) {
    if (typeof e === "string")
        return e;
    const msg = asPropString(e, "message");
    if (msg !== undefined)
        return msg;
    return String(e);
}
function errorName(e) {
    return asPropString(e, "name") ?? "";
}

// Command response envelope helpers.
//
// Every `?command=<name>` POST returns a JSON-serialized `CommandResponse<T>`
// (see types.ts). The dispatcher wraps invocations in a try/catch so individual
// handlers don't have to. Use `success(data)` / `failure(message, code?)` from
// inside a handler; the dispatcher will JSON-stringify the result.
function success(data) {
    return { ok: true, data };
}
function failure(message, code) {
    return { ok: false, error: code !== undefined && code !== "" ? { code, message } : { message } };
}
// Wrap a thrown error as a `failure` envelope, preserving its `.name` as the
// error code where available (e.g. NetSuite's `RCRD_DSNT_EXIST`).
function fromError(e) {
    return failure(errorMessage(e), errorName(e));
}

var templateHtml$8 = "<h1>Welcome, {{name}}!</h1>\n<h2>Let's get down to business :)</h2>\n<h3><span class=\"material-icons md-48\">arrow_back</span> Navigation is on the left</h3>\n<h4>\n\tGet the latest version here:\n\t<a href=\"https://github.com/alexoooo/ao-ns-dashboard\">https://github.com/alexoooo/ao-ns-dashboard</a>\n</h4>\n<br />\n";

const welcomePage = {
    name: "welcome",
    label: "Welcome",
    render(_context) {
        const displayName = runtime.getCurrentUser().name;
        const name = displayName.startsWith("EMP") ? displayName.split(" ").slice(1).join(" ") : displayName;
        return interpolate(templateHtml$8, { name });
    },
};

const undocumentedRecordTypes = {
    TRANSFER: "transfer",
    CURRENCY_REVALUATION: "fxreval",
};
// Lazy: NetSuite forbids SuiteScript API access during the AMD define
// callback, so we can't touch `record.Type` at module load time.
let cached = null;
function allRecordTypes() {
    if (cached === null) {
        const all = {};
        const recordType = record.Type;
        Object.keys(recordType).forEach(k => {
            if (!k.startsWith("CUSTOM_")) {
                all[k] = recordType[k];
            }
        });
        Object.keys(undocumentedRecordTypes).forEach(k => (all[k] = undocumentedRecordTypes[k]));
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
    return Object.keys(all)
        .map(type => {
        const formatted = type
            .split("_")
            .map(i => i[0] + i.substring(1).toLowerCase())
            .join(" ");
        const suffix = type in undocumentedRecordTypes ? " (undocumented)" : "";
        return `
				<option
					value="${all[type]}"
					${all[type] === selectedRecordType ? 'selected="selected"' : ""}
				>${formatted}${suffix}</option>`;
    })
        .join("");
}

var templateHtml$7 = "<script type=\"module\">\n\timport \"record-type\";\n</script>\n\n<h2>Detect the Record Type(s) for an Internal ID</h2>\n{{documentationHtml}}\n<hr />\n<bulk-runner-record-type\n\ttask-type-label=\"Record Type\"\n\tcommand-prefix=\"{{commandPrefix}}\"\n\trecord-id-param=\"{{paramRecordId}}\"\n\tdefault-tasks=\"{{defaultTasks}}\"\n\tdefault-page-count=\"{{defaultPageCount}}\"\n>\n</bulk-runner-record-type>\n";

const commandName$6 = "record-type";
const recordTypePage = {
    name: "record-type",
    label: "Detect Record Type",
    render(context) {
        const all = allRecordTypes();
        const defaultTasks = Object.keys(all)
            .map(type => type
            .split("_")
            .map(i => i[0] + i.substring(1).toLowerCase())
            .join(" "))
            .join("\n");
        return interpolate(templateHtml$7, {
            commandPrefix: scriptDeployParam(context) + "&" + paramCommand + "=" + commandName$6,
            paramRecordId,
            documentationHtml: documentationSection(`
				<ul>
					<li>Record Type names here may differ from what NetSuite shows in its UI &mdash; e.g. NetSuite "Customer Payment" is just <code>Payment</code> here.</li>
					<li>The same Internal ID can exist under multiple Record Types &mdash; results show every type the ID was found under.</li>
					<li>Undocumented Record Types currently mapped: ${Object.keys(undocumentedRecordTypes)
                .map(k => `<code>${k}</code>`)
                .join(", ")}.</li>
					<li>Custom Record Types are not auto-populated in the input but can be typed in manually below.</li>
				</ul>
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
    if (!recordTypeName) {
        return failure("Record Type not specified");
    }
    const recordId = context.request.parameters[paramRecordId];
    if (!recordId) {
        return failure("Record ID not specified");
    }
    const recordType = getRecordType(recordTypeName);
    const canBeInternal = /^-?\d+$/.test(recordId.trim());
    let internalMessage;
    if (canBeInternal) {
        try {
            record.load({ type: recordType, id: recordId });
            internalMessage = "*** Internal ID found";
        }
        catch (e) {
            internalMessage = "Internal ID not found: " + errorMessage(e);
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
        externalMessage = "External ID not found: " + errorMessage(e);
    }
    return success([internalMessage + " | " + externalMessage]);
}

// Shared helpers for building per-page Help section content.
// Hyperlink to another page in this Suitelet. Use inside documentationSection
// content instead of `[Page Label] (left menu)` plain-text references.
function pageLink(context, pageDef) {
    return `<a href="${setPageParam(context, pageDef.name)}">${pageDef.label}</a>`;
}
// Shared spec for the bulk-task pipe-delimited input format. Used by
// lookup-fields, edit-records, create-records, mass-save, mass-delete — any
// page whose textarea is parsed via splitVerticalBar / splitAmpersand /
// splitSlash from utils. Embed inside documentationSection content.
function taskInputFormatHelp() {
    return `
		<p><strong>Input format</strong> — each line is one task; columns are separated by <code>|</code> (the exact columns depend on the page, see above).</p>
		<ul>
			<li><strong>Field values</strong>: <code>fieldId=value</code> pairs joined by <code>&amp;</code>. Example: <code>memo=Hello&amp;trandate=2025-01-15</code>.</li>
			<li><strong>Sublist paths</strong>: joined by <code>/</code>. Example: <code>item/0</code> = line 0 of the <code>item</code> sublist.</li>
			<li><strong>Escapes</strong>: a literal <code>|</code>, <code>&amp;</code>, or <code>/</code> inside a value must be prefixed with <code>\\</code>. Example: <code>memo=Acme \\&amp; Co.</code>.</li>
		</ul>
	`;
}

// Shared separator-splitter helpers — used by both server-side parsing and
// client-side `groupKey` implementations. Pure code with no NetSuite imports
// so it can be `?raw`-loaded into a client module *and* statically imported
// by server modules from `src/utils.ts` (which re-exports from here).
//
// Each function splits on its delimiter while honouring `\<delim>` as an
// escape. Implementation uses a random sentinel to round-trip escapes
// without the cost of a stateful parser.
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

// Generic helpers — no NetSuite dependencies, fully testable.
//
// The pipe / ampersand / slash splitters live in src/shared/separators.ts so
// they can also be `?raw`-loaded into client modules. Server code imports
// them from here for convenience.
function normalizeKey(value) {
    return value.replace(/[^A-Za-z0-9_-]/g, "").toLowerCase();
}
// Set-equality for lists. Used for multiselect comparisons where NetSuite may
// return values in a different order than they were set.
function listsEqual(a, b) {
    if (a.length !== b.length) {
        return false;
    }
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return JSON.stringify(sortedA) === JSON.stringify(sortedB);
}

var templateHtml$6 = "<script type=\"module\">\n\timport \"record-details\";\n</script>\n<div>{{documentationHtml}}</div>\n<record-details-page\n\tparam-record-type=\"{{paramRecordType}}\"\n\tparam-record-id=\"{{paramRecordId}}\"\n\trecord-type=\"{{recordType}}\"\n\trecord-id=\"{{recordId}}\"\n\trecord-type-options-html=\"{{recordTypeOptionsAttr}}\"\n\tdetails-html=\"{{detailsAttr}}\"\n></record-details-page>\n";

const recordDetailsPage = {
    name: "record-details",
    label: "Record Details",
    render(context) {
        const recordType = context.request.parameters[paramRecordType] ?? "";
        const recordId = normalizeKey(context.request.parameters[paramRecordId] ?? "");
        const detailsHtml = recordType === "" || recordId === ""
            ? `Please provide "Record Type" and "Internal ID" (above)`
            : detailsListing(recordType, recordId);
        return interpolate(templateHtml$6, {
            documentationHtml: documentationSection(`
				<ul>
					<li>Pick a Record Type and enter the record's Internal ID to see all its fields and sublists.</li>
					<li>The Field ID and Sublist ID values shown here are what to use on the other pages (Lookup Fields, Edit Records, etc.).</li>
					<li>If you don't know the Record Type for an Internal ID, see ${pageLink(context, recordTypePage)} first.</li>
				</ul>
			`),
            // `*Attr` keys go into HTML attribute values on <record-details-page>
            // — `interpolate` HTML-escapes by default, which is what we need so
            // the markup payload survives attribute-value parsing. The Lit
            // component re-interprets them via `unsafeHTML` at render time.
            recordTypeOptionsAttr: recordTypeOptions(recordType),
            paramRecordType,
            paramRecordId,
            recordType,
            recordId,
            detailsAttr: detailsHtml,
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
        const recordFields = recordFieldNames.map(fieldId => {
            const recordField = rec.getField({ fieldId });
            let fieldText;
            try {
                const raw = rec.getText({ fieldId });
                fieldText = Array.isArray(raw) ? raw.join(",") : raw;
            }
            catch (e) {
                fieldText = "Error: " + errorMessage(e);
            }
            const fieldValue = rec.getValue({ fieldId });
            const fieldValueIfDifferent = "" + String(fieldValue) !== fieldText && fieldValue ? "" + String(fieldValue) : "";
            return `<tr>
				<td class="mdl-data-table__cell--non-numeric">${escapeHtml(fieldId)}</td>
				<td class="mdl-data-table__cell--non-numeric">${escapeHtml(recordField?.label)}</td>
				<td class="mdl-data-table__cell--non-numeric">${escapeHtml(recordField?.type)}</td>
				<td class="mdl-data-table__cell--non-numeric" style="word-break: break-all;word-wrap: break-word; max-width: 25em;">${escapeHtml(fieldText)}</td>
				<td class="mdl-data-table__cell--non-numeric" style="word-break: break-all;word-wrap: break-word; max-width: 25em; font-family: monospace">${escapeHtml(fieldValueIfDifferent)}</td>
			</tr>`;
        });
        const recordSublists = rec.getSublists();
        const sublistFieldsHtml = recordSublists.map(sublistId => {
            const sublistFields = rec.getSublistFields({ sublistId });
            const lineCount = rec.getLineCount({ sublistId });
            const sublistHeader = sublistFields
                .map(sublistField => {
                const field = lineCount > 0 ? rec.getSublistField({ sublistId, fieldId: sublistField, line: 0 }) : null;
                const label = field?.label ?? "";
                const type = field?.type ?? "";
                return `<th class="mdl-data-table__cell--non-numeric" valign="top"
							style="position: sticky; top: 0; background-color: white; z-index: 999; box-shadow: 0 -1px 0 0 #d3d3d3 inset">
						<span style="font-family: monospace">
							${escapeHtml(sublistField)}
							${type ? `<br/>(${escapeHtml(type)})` : ""}
						</span>
						<span style="font-weight: bold">${label ? `<br/>${escapeHtml(label)}` : ""} </span>
					</th>`;
            })
                .join("");
            const lineValues = [...Array(lineCount).keys()].map(i => {
                const lineFields = sublistFields.map(sublistField => {
                    const value = rec.getSublistValue({ sublistId, fieldId: sublistField, line: i });
                    let fieldText = String(value) + "";
                    let error = fieldText.toLowerCase().startsWith("error: ");
                    try {
                        fieldText = rec.getSublistText({ sublistId, fieldId: sublistField, line: i });
                    }
                    catch (_e) {
                        error = true;
                    }
                    return `<td class="mdl-data-table__cell--non-numeric">
						<span style="font-family: monospace; ${error ? "color: red" : ""}">${escapeHtml(value)}</span>
						${fieldText === String(value) ? "" : `<br/>${escapeHtml(fieldText)}`}
					</td>`;
                });
                return `<tr>
					<td class="mdl-data-table__cell--non-numeric">${i}</td>
					${lineFields.join("")}
				</tr>`;
            });
            const sublistTable = `<div style="width: 100%; overflow-x: auto; max-height: 40em; overflow-y: auto"><table class="mdl-data-table mdl-js-data-table mdl-shadow--2dp"
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
            return `<h4 style="font-family: monospace">${escapeHtml(sublistId)}</h4>${sublistTable}<br/><br/>`;
        });
        return `
			<h2>${escapeHtml(recordType)} Internal ID: ${escapeHtml(recordId)}</h2>

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
				${sublistFieldsHtml.join("<br/>")}
			</div>`;
    }
    catch (e) {
        const stack = e instanceof Error ? (e.stack ?? "") : "";
        return `
			<h2>${escapeHtml(recordType)} Internal ID: ${escapeHtml(recordId)}</h2>
			<h3 style="color: red">
				Error: ${loaded ? "retrieving -" : "loading -"} ${escapeHtml(errorMessage(e))} <br/>
				${escapeHtml(stack)}
			</h3>`;
    }
}

// Parsing for the `fieldId=value` syntax used in task strings on
// lookup-fields, edit-records, and create-records pages.
function parseFieldAssignment(fieldAssignment) {
    const firstEquals = fieldAssignment.indexOf("=");
    if (firstEquals === -1) {
        throw new Error("Field assignment expected (fieldId=value): " + fieldAssignment);
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
        const existing = groupByFieldId[i.fieldId] ?? [];
        existing.push(i);
        groupByFieldId[i.fieldId] = existing;
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

// Sublist line resolution helpers.
//
// Used by lookup-fields and edit-records to translate a textual line query
// (a number, a `fieldId=value` predicate, or `&`-joined predicates) into
// concrete line numbers on a NetSuite record's sublist.
// Resolve a sublist-line query that must match exactly one line. Throws if
// zero or more-than-one lines match.
function getSublistLine(rec, sublistId, sublistLineQuery) {
    const matches = findSublistLines(rec, sublistId, sublistLineQuery);
    if (matches.length === 0) {
        throw new Error("Sublist line not found: " + sublistLineQuery);
    }
    if (matches.length > 1) {
        throw new Error(`Multiple matching sublist lines (${matches.join(",")}): ${sublistLineQuery}`);
    }
    return matches[0];
}
// Resolve a sublist-line query to candidate line numbers. The query is a
// `&`-joined conjunction of predicates; each predicate is either:
//   - a numeric line index (negative counts from end; `-0` = "after last")
//   - a `fieldId=value` clause matched against `getSublistText` then by number.
function findSublistLines(rec, sublistId, sublistLineQuery) {
    const count = rec.getLineCount({ sublistId });
    const conjunctions = splitAmpersand(sublistLineQuery);
    let candidates = [...Array(count).keys()];
    for (const conjunction of conjunctions) {
        if (candidates.length === 0) {
            return [];
        }
        const asNumber = Number(conjunction);
        if (Number.isInteger(asNumber)) {
            // NB: negative numbers count from the end. `-0` is the special
            // "after last" sentinel used by the insert action.
            if (!conjunction.startsWith("-")) {
                if (asNumber >= candidates.length) {
                    throw new Error(`Line ${asNumber} is too big: ${candidates.join(",")}`);
                }
                return [candidates[asNumber]];
            }
            if (-asNumber > candidates.length) {
                throw new Error(`Line ${asNumber} is too small: ${candidates.join(",")}`);
            }
            if (asNumber === 0) {
                // negative zero: insert past the last line
                return [candidates[candidates.length - 1] + 1];
            }
            return [candidates[candidates.length + asNumber]];
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
                if (Number(queryField.fieldText) === Number("" + String(sublistValue))) {
                    remainingCandidates.push(candidates[i]);
                }
            }
        }
        candidates = remainingCandidates;
    }
    return candidates;
}

var templateHtml$5 = "<script type=\"module\">\n\timport \"bulk-runner\";\n</script>\n\n<h2>Retrieve field values from some records</h2>\n{{documentationHtml}}\n<hr />\n<bulk-runner task-type-label=\"Record Type|Internal ID|Location|Field ID\" command-post-url=\"{{commandUrl}}\">\n</bulk-runner>\n";

const commandName$5 = "lookup-fields";
const lookupFieldsPage = {
    name: "lookup-fields",
    label: "Lookup Fields",
    render(context) {
        return interpolate(templateHtml$5, {
            commandUrl: scriptDeployParam(context) + "&" + paramCommand + "=" + commandName$5,
            documentationHtml: documentationSection(`
				<ul>
					<li>For valid Record Types and Field IDs, see ${pageLink(context, recordDetailsPage)}.</li>
					<li>Internal ID is the NetSuite-internal numeric ID for the record (different from External ID).</li>
					<li><strong>Location</strong> identifies where the field lives on the record:
						<ul>
							<li>Empty &mdash; field is directly on the record.</li>
							<li><code>&lt;Sublist ID&gt;/&lt;Line Number&gt;</code> &mdash; e.g. <code>plannedrevenue/0</code>.</li>
							<li><code>&lt;Sublist ID&gt;/&lt;Sublist Field ID&gt;=&lt;Find Text&gt;</code> &mdash; e.g. <code>plannedrevenue/plannedperiod=Jun 2022</code>.</li>
							<li>Combine multiple sublist-field queries and a nested line number with <code>&amp;</code> &mdash; e.g. <code>plannedrevenue/Amount=737.79&amp;-1</code>.</li>
						</ul>
					</li>
					<li>Multiple Field IDs can be requested at once, separated by <code>&amp;</code>.</li>
					<li>To get a sublist's line count, use <code>count</code> as the Field ID.</li>
				</ul>
				${taskInputFormatHelp()}
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
    if (!tabDelimitedRow) {
        return failure("Empty input");
    }
    const parts = splitVerticalBar(tabDelimitedRow);
    const recordType = getRecordType(parts[0] ?? "");
    const recordId = normalizeKey(parts[1] ?? "");
    const pathParts = splitSlash(parts[2] ?? "");
    const fieldIds = splitAmpersand(parts[3] ?? "").map(i => normalizeKey(i.split("=")[0] ?? ""));
    if (fieldIds.length === 0) {
        return failure("Please specify Field ID");
    }
    const rec = record.load({ type: recordType, id: recordId });
    const fieldTexts = [];
    for (const fieldId of fieldIds) {
        fieldTexts.push(pathLookupFields(rec, fieldId, pathParts));
    }
    return success([fieldTexts.join(" | ")]);
}
function pathLookupFields(rec, fieldId, remainingPath) {
    if (remainingPath.length === 0) {
        let fieldText;
        try {
            const raw = rec.getText({ fieldId });
            fieldText = Array.isArray(raw) ? raw.join(",") : raw;
        }
        catch (e) {
            fieldText = "Error: " + errorMessage(e);
        }
        const fieldValue = rec.getValue({ fieldId });
        const fieldValueSuffix = "" + String(fieldValue) !== fieldText && fieldValue ? ` (${String(fieldValue)})` : "";
        return `${fieldId}=${fieldText}${fieldValueSuffix}`;
    }
    const sublistOrSubrecord = remainingPath[0];
    const sublistNames = rec.getSublists();
    if (!sublistNames.includes(sublistOrSubrecord)) {
        throw new Error("Sublist not found: " + sublistOrSubrecord);
    }
    if (remainingPath.length === 1 && (fieldId === "count" || fieldId === "linecount")) {
        return `${sublistOrSubrecord}.${fieldId}=` + rec.getLineCount({ sublistId: sublistOrSubrecord });
    }
    const sublistLineQuery = remainingPath[1] ?? "";
    const sublistLine = getSublistLine(rec, sublistOrSubrecord, sublistLineQuery);
    if (remainingPath.length !== 2) {
        throw new Error("Sublist subrecord not supported: " + sublistOrSubrecord + " - " + JSON.stringify(remainingPath));
    }
    let sublistText;
    try {
        sublistText = rec.getSublistText({ sublistId: sublistOrSubrecord, fieldId, line: sublistLine });
    }
    catch (e) {
        sublistText = "Error: " + errorMessage(e);
    }
    const sublistValue = rec.getSublistValue({ sublistId: sublistOrSubrecord, fieldId, line: sublistLine });
    const sublistValueSuffix = "" + String(sublistValue) !== sublistText && sublistValue ? ` (${String(sublistValue)})` : "";
    return `${sublistOrSubrecord}.${sublistLine}.${fieldId}=${sublistText}${sublistValueSuffix}`;
}

// Shared field-mutation helpers for the edit-records and create-records pages.
//
// Two call shapes:
//
//   - `setRecordField` / `setSublistField` — *edit* semantics: read existing
//     value first, only write if changed, return a validator that compares
//     before / after / target on the reloaded record.
//   - `setRecordFieldDefault` — *create-default* semantics: set
//     unconditionally during `record.create({defaultValues})` flow, return a
//     validator that confirms the value persisted.
//
// All four `set*` functions return a `Validator` thunk that produces a
// human-readable message when invoked against the reloaded record.
// =============================================================================
// Edit semantics: compare existing → set if changed → validate after save.
// =============================================================================
function setRecordField(rec, fieldId, fieldText) {
    const field = rec.getField({ fieldId });
    if (field == null) {
        throw new Error("Field not found: " + fieldId);
    }
    if (field.type === "select" || field.type === "multiselect") {
        return setRecordSelect(rec, fieldId, fieldText, field.type === "multiselect");
    }
    if (Array.isArray(fieldText)) {
        throw new Error("Single value expected (" + fieldId + "): " + fieldText.join(","));
    }
    const existingText = readText(() => rec.getText({ fieldId }));
    if (existingText !== fieldText) {
        rec.setText({ fieldId, text: fieldText });
    }
    return reload => {
        const afterUpdate = readText(() => reload.getText({ fieldId }));
        return validateSetField(fieldId, existingText, fieldText, afterUpdate);
    };
}
function setRecordSelect(rec, fieldId, fieldText, multi) {
    const norm = normalizeSelectInput(fieldId, fieldText, multi);
    if (norm.kind === "ids") {
        const existingValue = rec.getValue({ fieldId });
        const existingList = toList(existingValue);
        if (!listsEqual(norm.asList, existingList)) {
            rec.setValue({
                fieldId,
                value: (multi ? norm.fieldValues : norm.fieldValues[0]),
            });
        }
        return reload => {
            const afterUpdate = reload.getValue({ fieldId });
            return validateSetField(fieldId, "" + String(existingList), "" + norm.asList.join(","), "" + String(afterUpdate));
        };
    }
    const existingText = rec.getText({ fieldId });
    const existingList = toList(existingText);
    if (!listsEqual(norm.asList, existingList)) {
        rec.setText({ fieldId, text: (multi ? norm.asList : norm.asList[0]) });
    }
    return reload => {
        const afterUpdate = readText(() => reload.getText({ fieldId }));
        const target = typeof fieldText === "string" ? fieldText : fieldText.join(",");
        return validateSetField(fieldId, "" + String(existingText), "" + target, "" + afterUpdate);
    };
}
function setSublistField(rec, sublistId, sublistLineQuery, fieldId, fieldText) {
    const sublistLine = getSublistLine(rec, sublistId, sublistLineQuery);
    const field = rec.getSublistField({ sublistId, fieldId, line: sublistLine });
    if (field == null) {
        throw new Error("Sublist field not found: " + sublistId + "/" + fieldId);
    }
    if (field.type === "select" || field.type === "multiselect") {
        return setSublistSelect(rec, sublistId, sublistLineQuery, fieldId, sublistLine, fieldText, field.type === "multiselect");
    }
    if (Array.isArray(fieldText)) {
        throw new Error("Single value expected (" + sublistId + "/" + sublistLineQuery + "/" + fieldId + "): " + fieldText.join(","));
    }
    const existingText = rec.getSublistText({ sublistId, fieldId, line: sublistLine });
    if (existingText !== fieldText) {
        rec.setSublistText({ sublistId, fieldId, line: sublistLine, text: fieldText });
    }
    return reload => {
        const reloadSublistLine = getSublistLine(reload, sublistId, sublistLineQuery);
        const afterUpdate = reload.getSublistText({ sublistId, fieldId, line: reloadSublistLine });
        return validateSetField(fieldId, existingText, fieldText, afterUpdate);
    };
}
function setSublistSelect(rec, sublistId, sublistLineQuery, fieldId, sublistLine, fieldText, multi) {
    const where = sublistId + "/" + sublistLineQuery + "/" + fieldId;
    const norm = normalizeSelectInput(where, fieldText, multi);
    if (norm.kind === "ids") {
        const existingValue = rec.getSublistValue({ sublistId, fieldId, line: sublistLine });
        const existingList = toList(existingValue);
        if (!listsEqual(norm.asList, existingList)) {
            rec.setSublistValue({
                sublistId,
                fieldId,
                line: sublistLine,
                value: (multi ? norm.fieldValues : norm.fieldValues[0]),
            });
        }
        return reload => {
            const afterUpdate = reload.getSublistValue({ sublistId, fieldId, line: sublistLine });
            return validateSetField(fieldId, "" + String(existingList), "" + norm.asList.join(","), "" + String(afterUpdate));
        };
    }
    const existingText = rec.getSublistText({ sublistId, fieldId, line: sublistLine });
    const existingList = toList(existingText);
    if (!listsEqual(norm.asList, existingList)) {
        rec.setSublistText({
            sublistId,
            fieldId,
            line: sublistLine,
            text: (multi ? norm.asList : norm.asList[0]),
        });
    }
    return reload => {
        const reloadSublistLine = getSublistLine(reload, sublistId, sublistLineQuery);
        const afterUpdate = reload.getSublistText({ sublistId, fieldId, line: reloadSublistLine });
        const afterUpdateAsList = toList(afterUpdate);
        return validateSetField(fieldId, "" + JSON.stringify(existingList), "" + JSON.stringify(norm.asList), "" + JSON.stringify(afterUpdateAsList));
    };
}
function validateSetField(fieldId, existingText, fieldText, afterUpdate) {
    if (existingText === fieldText) {
        if (existingText === afterUpdate) {
            return `Did not change ${fieldId}, already set to '${existingText}'`;
        }
        return `Unexpected change ${fieldId}, was already '${existingText}' but now '${afterUpdate}'`;
    }
    if (existingText === afterUpdate) {
        return `Unable to change ${fieldId}, still '${existingText}'`;
    }
    if (fieldText === afterUpdate) {
        return `Changed ${fieldId} from '${existingText}' to '${afterUpdate}'`;
    }
    return `Unexpected ${fieldId} change, tried '${fieldText}' but got '${afterUpdate}'`;
}
// =============================================================================
// Create-default semantics: set unconditionally, validator confirms persistence.
// =============================================================================
function setRecordFieldDefault(rec, fieldId, fieldText) {
    const field = rec.getField({ fieldId });
    if (field == null) {
        throw new Error("Field not found: " + fieldId);
    }
    if (field.type === "select" || field.type === "multiselect") {
        return setRecordSelectDefault(rec, fieldId, fieldText, field.type === "multiselect");
    }
    if (Array.isArray(fieldText)) {
        throw new Error("Single value expected (" + fieldId + "): " + fieldText.join(","));
    }
    rec.setText({ fieldId, text: fieldText });
    return reload => {
        const afterSave = readText(() => reload.getText({ fieldId }));
        return afterSave === fieldText
            ? `Default ${fieldId} to '${fieldText}'`
            : `Unexpected ${fieldId} default, tried '${fieldText}' but got '${afterSave}'`;
    };
}
function setRecordSelectDefault(rec, fieldId, fieldText, multi) {
    const norm = normalizeSelectInput(fieldId, fieldText, multi);
    const target = typeof fieldText === "string" ? fieldText : fieldText.join(",");
    if (norm.kind === "ids") {
        rec.setValue({
            fieldId,
            value: (multi ? norm.fieldValues : norm.fieldValues[0]),
        });
        return reload => {
            const afterSave = reload.getValue({ fieldId });
            const afterSaveList = toList(afterSave);
            return listsEqual(norm.asList, afterSaveList)
                ? `Default ${fieldId} to '${target}'`
                : `Unexpected ${fieldId} default, tried '${target}' but got '${String(afterSave)}'`;
        };
    }
    rec.setText({ fieldId, text: (multi ? norm.asList : norm.asList[0]) });
    return reload => {
        const afterSave = reload.getText({ fieldId });
        const afterSaveList = toList(afterSave);
        return listsEqual(norm.asList, afterSaveList)
            ? `Default ${fieldId} to '${target}'`
            : `Unexpected ${fieldId} default, tried '${target}' but got '${String(afterSave)}'`;
    };
}
// Normalise a `select`/`multiselect` input. NetSuite accepts either numeric
// IDs or display text but not a mix. This helper enforces that and reports
// which form the caller supplied.
function normalizeSelectInput(where, fieldText, multi) {
    const asList = Array.isArray(fieldText) ? fieldText : [fieldText];
    if (!multi && asList.length > 1) {
        throw new Error("Single value expected (" + where + "): " + asList.join(","));
    }
    const allIds = asList.every(i => /^-?\d+$/.test(i.trim()));
    const someIds = asList.some(i => /^-?\d+$/.test(i.trim()));
    if (someIds && !allIds) {
        throw new Error("All must be text or all must be IDs (" + where + "): " + asList.join(","));
    }
    if (allIds) {
        return { kind: "ids", asList, fieldValues: asList.map(i => parseInt(i)) };
    }
    return { kind: "text", asList };
}
function toList(value) {
    return Array.isArray(value) ? value : [value];
}
// `getText` and `getSublistText` can return `string | string[]`. Normalise to
// a flat string so comparisons with the input fieldText (always a string in
// non-array codepaths) work correctly.
function readText(fn) {
    const raw = fn();
    return Array.isArray(raw) ? raw.join(",") : raw;
}

var templateHtml$4 = "<script type=\"module\">\n\timport \"edit-records\";\n</script>\n\n<h2>Edit one or more records</h2>\n{{documentationHtml}}\n<hr />\n<bulk-runner-edit-records\n\ttask-type-label=\"Record Type|Internal ID|Location|Field Values|Action\"\n\tcommand-post-url=\"{{commandUrl}}\"\n>\n</bulk-runner-edit-records>\n";

const commandName$4 = "edit";
const actionSet = "set";
const actionInsertLine = "insert";
const actionRemoveLine = "remove";
const ignoreRecalcArg = normalizeKey("ignoreRecalc");
const editRecordsPage = {
    name: "edit-records",
    label: "Edit Records",
    render(context) {
        return interpolate(templateHtml$4, {
            commandUrl: scriptDeployParam(context) + "&" + paramCommand + "=" + commandName$4,
            documentationHtml: documentationSection(`
				<ul>
					<li>For Record Type / Internal ID / Location, see ${pageLink(context, lookupFieldsPage)}.</li>
					<li><strong>Field Values</strong> are <code>fieldId=value</code> pairs joined by <code>&amp;</code>. For <code>select</code> fields the option number can be used in place of the text. Multiple values can be passed to <code>${actionSet}</code> and <code>${actionInsertLine}</code>.</li>
					<li><strong>Actions</strong>:
						<ul>
							<li><code>${actionSet}</code> &mdash; assign new value to one or more fields.</li>
							<li><code>${actionInsertLine}</code> &mdash; add new sublist line before the given Location; use line <code>-0</code> to insert at the end.</li>
							<li><code>${actionRemoveLine}</code> &mdash; remove existing sublist line.</li>
						</ul>
					</li>
				</ul>
				${taskInputFormatHelp()}
			`),
        });
    },
    commands: {
        [commandName$4]: handleEditRecord,
    },
};
function handleEditRecord(context) {
    const tabDelimitedRows = JSON.parse(context.request.body);
    const firstTabDelimitedRow = tabDelimitedRows[0] ?? "";
    const firstParts = splitVerticalBar(firstTabDelimitedRow);
    const recordType = getRecordType(firstParts[0] ?? "");
    const recordId = normalizeKey(firstParts[1] ?? "");
    const rec = record.load({ type: recordType, id: recordId });
    const allValidators = [];
    for (const tabDelimitedRow of tabDelimitedRows) {
        const parts = splitVerticalBar(tabDelimitedRow);
        const actionLocation = parts[2] ?? "";
        const fieldValues = parts[3] ?? "";
        const actionName = parts[4];
        if (!actionName) {
            return failure("Please specify Action");
        }
        allValidators.push(handleEditRecordAction(rec, actionName, actionLocation, fieldValues));
    }
    rec.save({});
    const reload = record.load({ type: recordType, id: recordId });
    const messages = [];
    for (const validators of allValidators) {
        const actionMessages = [];
        for (const validator of validators) {
            try {
                actionMessages.push(validator(reload));
            }
            catch (e) {
                actionMessages.push(`Unable to validate: ${errorMessage(e)}`);
            }
        }
        messages.push(actionMessages.join(" | "));
    }
    return success(messages);
}
function handleEditRecordAction(rec, actionName, actionLocation, fieldValues) {
    const fieldAssignments = parseFieldAssignmentList(fieldValues);
    if (actionLocation === "") {
        if (actionName !== actionSet) {
            throw new Error("Unsupported action on record: " + actionName);
        }
        return fieldAssignments.map(i => setRecordField(rec, i.fieldId, i.fieldText));
    }
    const pathParts = splitSlash(actionLocation);
    if (pathParts.length !== 2) {
        throw new Error("Not supported: " + JSON.stringify(pathParts));
    }
    const sublistId = normalizeKey(pathParts[0]);
    const sublistIds = rec.getSublists();
    if (!sublistIds.includes(sublistId)) {
        throw new Error("Sublist not found: " + sublistId);
    }
    const sublistLineQuery = pathParts[1];
    switch (actionName.toLowerCase()) {
        case actionSet:
            return fieldAssignments.map(i => setSublistField(rec, sublistId, sublistLineQuery, i.fieldId, i.fieldText));
        case actionInsertLine:
            return insertSublistLine(rec, sublistId, sublistLineQuery, fieldAssignments);
        case actionRemoveLine:
            return [removeSublistLine(rec, sublistId, sublistLineQuery, fieldAssignments)];
        default:
            throw new Error("Unsupported action on sublist: " + actionName);
    }
}
function insertSublistLine(rec, sublistId, sublistLineQuery, fieldAssignments) {
    const count = rec.getLineCount({ sublistId });
    const sublistLine = count === 0 && (sublistLineQuery === "0" || sublistLineQuery === "-0")
        ? 0
        : getSublistLine(rec, sublistId, sublistLineQuery);
    const ignoreRecalc = getIgnoreCalcArgument(fieldAssignments, true);
    rec.insertLine({ sublistId, line: sublistLine, ignoreRecalc });
    for (const fieldAssignment of fieldAssignments) {
        if (fieldAssignment.fieldId === ignoreRecalcArg) {
            continue;
        }
        setSublistField(rec, sublistId, "" + sublistLine, fieldAssignment.fieldId, fieldAssignment.fieldText);
    }
    const validationSublistFields = rec.getSublistFields({ sublistId }).filter(i => !i.startsWith("sys_"));
    const sublistTextOrValues = validationSublistFields.map(fieldId => getSublistTextOrValue(rec, sublistId, fieldId, sublistLine));
    return [
        reload => {
            const foundAt = [];
            const lineCount = reload.getLineCount({ sublistId });
            const allReloadSublistTextOrValues = [...Array(lineCount).keys()].map(line => validationSublistFields.map(fieldId => {
                const original = sublistTextOrValues.find(i => i[1] === fieldId);
                const isText = original[2];
                return isText
                    ? reload.getSublistText({ sublistId, fieldId, line })
                    : reload.getSublistValue({ sublistId, fieldId, line });
            }));
            for (let line = 0; line < lineCount; line++) {
                const reloadSublistTextOrValues = allReloadSublistTextOrValues[line];
                const allEqual = sublistTextOrValues.every((val, idx) => val[0] === "" || // appears to indicate missing
                    JSON.stringify(val[0]) === JSON.stringify(reloadSublistTextOrValues[idx]));
                if (allEqual) {
                    foundAt.push(line);
                }
            }
            return `Inserted at ${sublistLine} (found at ${foundAt.join(", ")})`;
        },
    ];
}
function getSublistTextOrValue(rec, sublistId, fieldId, line) {
    try {
        return [rec.getSublistText({ sublistId, fieldId, line }), fieldId, true];
    }
    catch (e) {
        if (errorMessage(e).includes("must use getSublistValue")) {
            return [rec.getSublistValue({ sublistId, fieldId, line }), fieldId, false];
        }
        throw e;
    }
}
function removeSublistLine(rec, sublistId, sublistLineQuery, fieldAssignments) {
    const sublistLine = getSublistLine(rec, sublistId, sublistLineQuery);
    const ignoreRecalc = getIgnoreCalcArgument(fieldAssignments, true);
    const validationSublistFields = rec.getSublistFields({ sublistId }).filter(i => !i.startsWith("sys_"));
    const removedLineFingerprint = validationSublistFields.map(fieldId => getSublistTextOrValue(rec, sublistId, fieldId, sublistLine));
    rec.removeLine({ sublistId, line: sublistLine, ignoreRecalc });
    return reload => {
        const foundAt = [];
        const lineCount = reload.getLineCount({ sublistId });
        for (let i = 0; i < lineCount; i++) {
            const allEqual = removedLineFingerprint.every(([originalValue, fieldId, isText]) => {
                const reloadValue = isText
                    ? reload.getSublistText({ sublistId, fieldId, line: i })
                    : reload.getSublistValue({ sublistId, fieldId, line: i });
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
    const index = fieldAssignments.findIndex(i => i.fieldId === ignoreRecalcArg);
    if (!allowExtra && (index === -1 || fieldAssignments.length > 1)) {
        throw new Error("Unsupported fields: " + JSON.stringify(fieldAssignments));
    }
    if (index === -1) {
        return false;
    }
    const raw = fieldAssignments[index].fieldText;
    const ignoreRecalcValueText = (typeof raw === "string" ? raw : raw.join(",")).toLowerCase();
    if (ignoreRecalcValueText === "true" || ignoreRecalcValueText === "false") {
        return ignoreRecalcValueText === "true";
    }
    throw new Error("Only true/false allowed for ignoreRecalc: " + ignoreRecalcValueText);
}

var templateHtml$3 = "<script type=\"module\">\n\timport \"bulk-runner\";\n</script>\n\n<h2>Create one or more records</h2>\n{{documentationHtml}}\n<hr />\n<bulk-runner task-type-label=\"Record Type|Default Values|Field Values\" command-post-url=\"{{commandUrl}}\"> </bulk-runner>\n";

const commandName$3 = "create";
const createRecordsPage = {
    name: "create-records",
    label: "Create Records",
    render(context) {
        return interpolate(templateHtml$3, {
            commandUrl: scriptDeployParam(context) + "&" + paramCommand + "=" + commandName$3,
            documentationHtml: documentationSection(`
				<ul>
					<li>For valid Record Types, see ${pageLink(context, lookupFieldsPage)}.</li>
					<li>Both <strong>Default Values</strong> and <strong>Field Values</strong> use <code>fieldId=value</code> pairs joined by <code>&amp;</code>.</li>
					<li>To know which values must go in <strong>Default Values</strong> (vs Field Values), refer to SuiteScript's <a href="https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_4267255811.html#bridgehead_4423371543">"N/record Default Values"</a> docs (incomplete). For some record types, certain Default Values are mandatory.</li>
					<li>The result line includes the new Internal ID that NetSuite assigned.</li>
					<li>Sublists are not supported during creation &mdash; create the record first, then use ${pageLink(context, editRecordsPage)} to populate sublists.</li>
				</ul>
				${taskInputFormatHelp()}
			`),
        });
    },
    commands: {
        [commandName$3]: handleCreateRecord,
    },
};
function handleCreateRecord(context) {
    let recordId;
    try {
        const tabDelimitedRows = JSON.parse(context.request.body);
        const firstTabDelimitedRow = tabDelimitedRows[0] ?? "";
        const firstParts = splitVerticalBar(firstTabDelimitedRow);
        const recordType = getRecordType(firstParts[0] ?? "");
        const defaultFieldValues = parseFieldAssignmentList(firstParts[1] ?? "");
        const fieldValues = parseFieldAssignmentList(firstParts[2] ?? "");
        const allValidators = [];
        const defaultValues = {};
        const rec = record.create({ type: recordType, defaultValues });
        for (const fieldValue of defaultFieldValues) {
            allValidators.push(setRecordFieldDefault(rec, fieldValue.fieldId, fieldValue.fieldText));
        }
        recordId = rec.save({});
        const loaded = record.load({ type: recordType, id: recordId });
        for (const fieldValue of fieldValues) {
            allValidators.push(setRecordField(loaded, fieldValue.fieldId, fieldValue.fieldText));
        }
        loaded.save({});
        const reload = record.load({ type: recordType, id: recordId });
        const messages = [];
        for (const validator of allValidators) {
            try {
                messages.push(validator(reload));
            }
            catch (e) {
                messages.push(`Unable to validate: ${errorMessage(e)}`);
            }
        }
        return success([`Internal ID: ${recordId} | ${messages.join(" | ")}`]);
    }
    catch (e) {
        const prefix = recordId == null ? "" : `after creating Internal ID ${recordId}: `;
        return failure(prefix + errorMessage(e));
    }
}

var templateHtml$2 = "<script type=\"module\">\n\timport \"bulk-runner\";\n</script>\n\n<h1>Edit/Save Records</h1>\n<h2>(without changing values, to trigger events)</h2>\n{{documentationHtml}}\n<hr />\n<bulk-runner task-type-label=\"Record Type|Internal ID\" command-post-url=\"{{commandUrl}}\"> </bulk-runner>\n";

const commandName$2 = "mass-save";
const massSavePage = {
    name: "mass-save",
    label: "Mass Edit/Save",
    render(context) {
        return interpolate(templateHtml$2, {
            commandUrl: scriptDeployParam(context) + "&" + paramCommand + "=" + commandName$2,
            documentationHtml: documentationSection(`
				<ul>
					<li>For Record Type / Internal ID, see ${pageLink(context, lookupFieldsPage)}.</li>
					<li>For each record listed, the page loads it and saves it without modification:
						<ol>
							<li>Load the record.</li>
							<li>Save the record.</li>
						</ol>
					</li>
					<li>The save triggers any associated events (e.g. workflows). Use this to retroactively re-run automation.</li>
				</ul>
				${taskInputFormatHelp()}
			`),
        });
    },
    commands: {
        [commandName$2]: handleMassSave,
    },
};
function handleMassSave(context) {
    const tabDelimitedRows = JSON.parse(context.request.body);
    const firstTabDelimitedRow = tabDelimitedRows[0] ?? "";
    const firstParts = splitVerticalBar(firstTabDelimitedRow);
    const recordType = getRecordType(firstParts[0] ?? "");
    const recordId = normalizeKey(firstParts[1] ?? "");
    if (!recordType) {
        return failure("Record Type not specified");
    }
    if (!recordId) {
        return failure("Internal ID not specified");
    }
    const rec = record.load({ type: recordType, id: recordId });
    rec.save({});
    return success(["Edit/Save"]);
}

var templateHtml$1 = "<script type=\"module\">\n\timport \"bulk-runner\";\n</script>\n\n<h1 style=\"color: red\">***Records are PERMANENTLY DELETED***</h1>\n{{documentationHtml}}\n<hr />\n<bulk-runner task-type-label=\"Record Type|Internal ID\" command-post-url=\"{{commandUrl}}\"> </bulk-runner>\n";

const commandName$1 = "mass-delete";
const massDeletePage = {
    name: "mass-delete",
    label: "Mass Delete (DANGER!)",
    render(context) {
        return interpolate(templateHtml$1, {
            commandUrl: scriptDeployParam(context) + "&" + paramCommand + "=" + commandName$1,
            documentationHtml: documentationSection(`
				<p style="color: #b00"><strong>Warning:</strong> deletion is permanent and cannot be undone from this page. Verify your input list before running.</p>
				<ul>
					<li>For Record Type / Internal ID, see ${pageLink(context, lookupFieldsPage)}.</li>
					<li>Each line is a single record to delete, identified by Record Type and Internal ID.</li>
					<li>The page reloads the record after it is deleted to confirm it is gone &mdash; the result line will say "Delete successful" on success or surface the error otherwise.</li>
				</ul>
				${taskInputFormatHelp()}
			`),
        });
    },
    commands: {
        [commandName$1]: handleMassDelete,
    },
};
function handleMassDelete(context) {
    const tabDelimitedRows = JSON.parse(context.request.body);
    const firstTabDelimitedRow = tabDelimitedRows[0] ?? "";
    const firstParts = splitVerticalBar(firstTabDelimitedRow);
    const recordType = getRecordType(firstParts[0] ?? "");
    const recordId = normalizeKey(firstParts[1] ?? "");
    if (!recordType) {
        return failure("Record Type not specified");
    }
    if (!recordId) {
        return failure("Internal ID not specified");
    }
    let loadMessageSuffix = "";
    try {
        record.load({ type: recordType, id: recordId });
    }
    catch (e) {
        const name = errorName(e);
        if (name === "RCRD_DSNT_EXIST") {
            return success(["Does not exist"]);
        }
        if (name === "INVALID_RCRD_TYPE") {
            return failure(`record type ${recordType} does not exist`, name);
        }
        loadMessageSuffix = " | Load error: " + name + " - " + errorMessage(e);
    }
    try {
        record.delete({ type: recordType, id: recordId });
    }
    catch (e) {
        return failure(`Delete error: ${errorMessage(e)}${loadMessageSuffix}`, errorName(e));
    }
    try {
        record.load({ type: recordType, id: recordId });
        return success([`Delete failed${loadMessageSuffix}`]);
    }
    catch (e) {
        if (errorName(e) === "RCRD_DSNT_EXIST") {
            return success([`Delete successful${loadMessageSuffix}`]);
        }
        return failure(`Delete error${loadMessageSuffix} | Reload error: ${errorMessage(e)}`, errorName(e));
    }
}

var templateHtml = "<script type=\"module\">\n\timport \"suiteql\";\n</script>\n\n<h2>SuiteQL Query</h2>\n{{documentationHtml}}\n<hr />\n<suiteql-page command-post-url=\"{{commandUrl}}\"></suiteql-page>\n";

const commandName = "suiteql";
const suiteqlPage = {
    name: "suiteql",
    label: "SuiteQL Query",
    // Wide result tables — let the page scroll horizontally instead of being
    // clipped by MDL's default `overflow-x: hidden`. See layout.html for the
    // body-class CSS that this opts into.
    bodyClass: "page-wide",
    render(context) {
        return interpolate(templateHtml, {
            commandUrl: scriptDeployParam(context) + "&" + paramCommand + "=" + commandName,
            documentationHtml: documentationSection(`
				<ul>
					<li>Enter a SuiteQL query and click <strong>Run Query</strong>.</li>
					<li>Results are paged in chunks of up to 1000 rows (NetSuite's max page size). Use <strong>Previous</strong> / <strong>Next</strong> to navigate when the result set is larger than one page.</li>
					<li>Click <strong>Download</strong> to export the current page as CSV.</li>
					<li>Examples:
						<ul>
							<li><code>SELECT id, type, trandate FROM transaction FETCH FIRST 100 ROWS ONLY</code></li>
							<li><code>SELECT COUNT(*) AS n FROM customer</code></li>
						</ul>
					</li>
					<li>Errors (e.g. invalid SQL) are reported in the status line next to the buttons.</li>
				</ul>
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
        return failure("Invalid request body: " + errorMessage(e));
    }
    const sql = (body.query ?? "").trim();
    if (!sql) {
        return failure("Empty query");
    }
    const pageIndex = Number.isInteger(body.pageIndex) ? body.pageIndex : 0;
    const pageSize = Number.isInteger(body.pageSize) ? body.pageSize : 1000;
    try {
        const paged = query.runSuiteQLPaged({ query: sql, pageSize });
        const totalCount = paged.count;
        const pageCount = paged.pageRanges.length;
        if (pageCount === 0 || pageIndex >= pageCount) {
            return success({ totalCount, pageCount, pageSize, pageIndex, columns: [], rows: [] });
        }
        const page = paged.fetch({ index: pageIndex });
        // page.data is a ResultSet (not a plain array). asMappedResults() gives
        // plain objects keyed by column alias — easiest to serialize.
        const mapped = page.data.asMappedResults();
        const columns = mapped.length > 0 ? Object.keys(mapped[0]) : [];
        const rows = mapped.map(m => columns.map(c => m[c]));
        return success({ totalCount, pageCount, pageSize, pageIndex, columns, rows });
    }
    catch (e) {
        return failure(errorMessage(e));
    }
}

// Ordered list of pages. Order controls the navigation drawer.
// The first entry is the default page (loaded when no ?page= is given).
const pages = [
    welcomePage,
    recordTypePage,
    recordDetailsPage,
    lookupFieldsPage,
    editRecordsPage,
    createRecordsPage,
    massSavePage,
    suiteqlPage,
    massDeletePage,
];

function main(context) {
    const command = context.request.parameters[paramCommand] ?? "";
    if (command !== "") {
        dispatchCommand(context, command);
        return;
    }
    renderPage(context);
}
function dispatchCommand(context, command) {
    const page = pages.find(p => p.commands && command in p.commands);
    let envelope;
    if (!page || !page.commands) {
        envelope = failure(`Unknown command '${command}'`, "UNKNOWN_COMMAND");
    }
    else {
        try {
            envelope = page.commands[command](context);
        }
        catch (e) {
            envelope = fromError(e);
        }
    }
    context.response.write(JSON.stringify(envelope));
}
function renderPage(context) {
    const requestedPage = context.request.parameters[paramPage];
    const defaultPage = pages[0];
    const page = pages.find(p => p.name === requestedPage) ?? defaultPage;
    const navigationLink = (p) => `
		<a class="mdl-navigation__link ${p.name === page.name ? "mdl-navigation__link--current" : ""}"
				href="${setPageParam(context, p.name)}">
			${p.label}
		</a>`;
    const navHtml = navigationLink(defaultPage) + "<hr/>" + pages.slice(1).map(navigationLink).join("");
    context.response.write(interpolate(layoutHtml, {
        title: `${page.label} - AO Dashboard`,
        mdlCssUrl,
        mdlJsUrl,
        version,
        nsVersion: runtime.version || "[unknown version]",
        navHtml,
        // `Js` suffix: the import map JSON contains `&` and `"` that must
        // not be HTML-escaped — it lives inside a <script> block.
        importMapJsonJs: buildImportMapJson(),
        // Pages can opt into layout-level overrides via PageDef.bodyClass.
        // Escaped because it's a regular HTML attribute value.
        bodyClassesHtml: escapeHtml(page.bodyClass ?? ""),
        bodyHtml: page.render(context),
    }));
}

var index = { onRequest: main };

return index;

}));

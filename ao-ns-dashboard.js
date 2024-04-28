/**
* Copyright 2024 Aleksander Ostrovski (aka Alex Ostrovsky)
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
*@NApiVersion 2.1
*@NScriptType Suitelet
*/
define(["N/record"], function(record) {
	//----------------------------------------------------------------------------------------------------------------
	const version = "2024.04.28";
	
	const pages = {};
	const defaultPage = "welcome";
	
	const paramPage = "page";
	const paramRecordId = "record";
	const paramRecordType = "record-type";
	const paramTask = "task";
	const paramCommand = "command";
	
	const getCommandParam = context =>
		context.request.parameters[paramCommand] || "";
	
	const scriptDeployParam = (context) =>
		"?script=" + context.request.parameters["script"] + "&" +
		"deploy=" + context.request.parameters["deploy"];
	
	const setPageParam = (context, page) =>
		scriptDeployParam(context) + "&" +
		paramPage + "=" + page;
	
	
	//----------------------------------------------------------------------------------------------------------------
	const undocumentedRecordTypes = {
		"TRANSFER": "transfer",
		"CURRENCY_REVALUATION": "fxreval"
	};
	
	const allRecordTypes = {};
	function initAllRecordTypes() {
		Object.keys(record.Type).forEach(k => {
			if (! k.startsWith("CUSTOM_")) {
				allRecordTypes[k] = record.Type[k];
			}
		});
		Object.keys(undocumentedRecordTypes).forEach(k => allRecordTypes[k] = undocumentedRecordTypes[k]);
	}
	
	function getRecordType(recordType) {
		if (recordType in allRecordTypes) {
			return allRecordTypes[recordType];
		}
		
		const normalized = recordType.replace(/[^a-zA-Z]/g, "").toLowerCase();
		if (Object.values(allRecordTypes).includes(normalized)) {
			return normalized;
		}
		
		const matchingKey = Object.keys(allRecordTypes).find(k => k.replace(/[^a-zA-Z]/g, "").toLowerCase() === normalized);
		if (matchingKey) {
			return allRecordTypes[matchingKey];
		}
		
		return normalized;
	}
	

	//----------------------------------------------------------------------------------------------------------------
    function main(context) {
		initAllRecordTypes();
		
		const command = getCommandParam(context);
		if (command !== "") {
			const pageCommands = Object.values(pages).map(i => (i.commands || {}));
			const handler = pageCommands.find(i => command in i)[command];
			let responseText;
			try {
				responseText = "" + handler(context);
			}
			catch (e) {
				responseText = `Error: ${e.message}`;
			}
			context.response.write(responseText || "(blank)");
			return;
		}
		
		const pageParam = context.request.parameters[paramPage] || defaultPage;
		const pageHtml = pages[pageParam].render(context);
		
		function navigationLink(page) {
			const label = pages[page].label;
			return `
				<a class="mdl-navigation__link ${pageParam === page ? 'mdl-navigation__link--current' : ''}"
						href="${setPageParam(context, page)}">
					${label}
				</a>`;
		}
		
		const currentLabel = pages[pageParam].label;
		const title = `${currentLabel} - AO Dashboard`;
		context.response.write(
			`<!DOCTYPE html>
			<head>
				<title>${title}</title>
				<link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons">
				<link rel="stylesheet" href="https://code.getmdl.io/1.3.0/material.indigo-pink.min.css">
				<script defer src="https://code.getmdl.io/1.3.0/material.min.js"></script>
				
				<script src="https://code.jquery.com/jquery-3.6.0.js" integrity="sha256-H+K7U5CnXl1h5ywQfKtSj8PCmoN9aaq30gDh27Xc0jk=" crossorigin="anonymous"></script>
				<script src="https://cdnjs.cloudflare.com/ajax/libs/select2/4.1.0-rc.0/js/select2.js" integrity="sha512-w8hm+E7eW80RcTpHGflcYz2A9wvvjbADCPcqepR11qvCUQmZEo65n7o+3JYpYP1yrzW6xyHqcqrNMOz1kQ+o6A==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
				<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/select2/4.1.0-rc.0/css/select2.css" integrity="sha512-PO7TIdn2hPTkZ6DSc5eN2DyMpTn/ZixXUQMDLUx+O5d7zGy0h1Th5jgYt84DXvMRhF3N0Ucfd7snCyzlJbAHQA==" crossorigin="anonymous" referrerpolicy="no-referrer" />
				<script>
					$(document).on('select2:open', () => {
						document.querySelector('.select2-search__field').focus();
					});
					$(function() {
						const host = window.location.hostname;
						const env = host.split('.')[0];
						if (! env.includes("-sb")) {
							document.getElementsByClassName('mdl-layout__header-row')[0].style = "background-color: red";
						}
						document.getElementById('env').innerHTML = "[" + env + "]";
					});
				</script>
			</head>
			<body>
				<div class="mdl-layout mdl-js-layout mdl-layout--fixed-header mdl-layout--fixed-drawer" style="width: 100%;">
					<header class="mdl-layout__header">
						<div class="mdl-layout__header-row">
							<span class="mdl-layout-title" style="width: 100%;">
								${title}
								<span style="float: right" title="version">
									<span id="env" title="Environment" style="font-family: monospace">...</span>
									v${version}
								</span>
							</span>
						</div>
					</header>
					
					<div class="mdl-layout__drawer">
						<nav class="mdl-navigation">
							${navigationLink(defaultPage)}
							<hr/>
							${
								Object.keys(pages).map(page => {
									return page === defaultPage
										? ""
										: navigationLink(page);
								}).join("")
							}
						</nav>
					</div>
					
					<main class="mdl-layout__content">
						<div class="page-content" style="padding: 1em">
							${pageHtml}
						</div>
					  </main>
				</div>
			</body>`);
    }
	
	
	//----------------------------------------------------------------------------------------------------------------
	function welcomePage(context) {
		return `
			<h1>Welcome!</h1>
			<h2>Let's get down to business :)</h2>
			<h3><span class="material-icons md-48">arrow_back</span> Navigation is on the left</h3>
		`;
	}
	
	pages[defaultPage] = {
		label: "Welcome",
		render: welcomePage
	};
	
	
	//----------------------------------------------------------------------------------------------------------------
	const recordTypePage = "record-type";
	const commandRecordType = "record-type";
	const foundMessage = "Yes";
	
	function typePage(context) {
		const recordId = normalizeKey(context.request.parameters[paramRecordId] || "");
		
		const commandPrefix = scriptDeployParam(context) +
			"&" + paramCommand + "=" + commandRecordType;
		
		return `
			<script>
				${runCommandJs()}
				const staticCommandPrefix = "${commandPrefix}";
				
				${renderStatusJs()}
				${runNextJs()}
				${runAllJs()}

				function onRecordId(value) {
					window.commandPostUrl = staticCommandPrefix + "&${paramRecordId}=" + value;
				}
			</script>
			<h2>Detect the Record Type(s) for an Internal ID</h2>
			${documentationSection(`
				<h3>· Record Types in NetSuite pages may differ from what they are called here:</h3>
				<h4>&nbsp; &nbsp; · "Payment" is "Customer Payment"</h4>
				<h3>· Detected Record Types will have a Result of '${foundMessage}'</h3>
				<h3>· The same Internal ID can exist in multiple Record Types</h3>
				<h3>· Some Record Types are undocumented: ${Object.keys(undocumentedRecordTypes).join(", ")}</h3>
				<h3>· Custom Record Types are not automatically populated, but you can manually tpye them in below</h3>
			`)}
			<hr/>
			<div class="mdl-textfield mdl-js-textfield mdl-textfield--floating-label">
				<input
					class="mdl-textfield__input"
					type="text"
					id="recordId"
					name="${paramRecordId}"
					autofocus
					onchange="onRecordId(this.value);"/>
				<label class="mdl-textfield__label" for="recordId">Internal ID</label>
			</div>
			<hr/>
			${taskListAndRunStatusJs("Record Type")}
			<script>
				onRecordId(document.getElementById('recordId').value);
				
				document.getElementById('pageCount').value = ${Object.keys(allRecordTypes).length};
				onPageCount(document.getElementById('pageCount').value);
				
				if (document.getElementById('tasks').value === "") {
					document.getElementById('tasks').value = "${
						Object.keys(allRecordTypes).map(type =>
							type.split("_").map(i => i[0] + i.substring(1).toLowerCase()).join(" ")
						).join("\\n")
					}";
				}
			</script>`;
	}
	
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
		
		let message;
		try {
			record.load({
				type: recordType,
				id: recordId
			});
			message = foundMessage;
		}
		catch (e) {
			message = "No: " + e.message;
		}
		
		return JSON.stringify([message]);
	}
	
	
	pages[recordTypePage] = {
		label: "Detect Record Type",
		render: typePage,
		commands: {
			[commandRecordType]: handleTypeListing
		}
	};
	
	
	//----------------------------------------------------------------------------------------------------------------
	const recordDetailsPage = "record-details";
	
	function detailsPage(context) {
		const recordType = context.request.parameters[paramRecordType] || "";
		const recordId = normalizeKey(context.request.parameters[paramRecordId] || "");
		
		let detailsHtml;
		if (recordType === "" || recordId === "") {
			detailsHtml = `Please provide "Record Type" and "Internal ID" (above)`;
		}
		else {
			detailsHtml = detailsListing(recordType, recordId);
		}
		
		return `
			<script type="text/javascript">
				$(document).ready(() => {
					$(".record-type-select").select2({
						placeholder: "Please make a selection"
					});
				});
				function showLoading() {
					document.getElementById('spinner').style.display = "block";
					document.getElementById('details').style.display = "none";
				}
				function onSearch(value) {
					document.getElementById('recordType').value = value;
				}
			</script>
			<div>
				<h2>Retrieve all info about a particular record</h2>
				${documentationSection(`
					<h3>· To detect the Record Type(s) for a particular Internal ID, see [${pages[recordTypePage].label}] page (left menu)</h3>
				`)}
			</div>
			<form method="post">
				<fieldset>
					<legend>Record Type Search</legend>
					<select
							class="record-type-select"
							id="record-type-search"
							onchange="onSearch(this.value);">
						<option></option>
						${recordTypeOptions(recordType)}
					</select>
				</fieldset>
				<fieldset style="margin-top: 0.5em; width: 30em">
					<!-- NB: floating label doesn't work with programmatic value assignment -->
					<legend>Record Type</legend>
					<input
						class="mdl-textfield__input"
						type="text"
						id="recordType"
						name="${paramRecordType}"
						value="${recordType}"/>
				</fieldset>
				<br/>
				<div class="mdl-textfield mdl-js-textfield mdl-textfield--floating-label">
					<input
						class="mdl-textfield__input"
						type="text"
						id="recordId"
						name="${paramRecordId}"
						value="${recordId}"
						autofocus/>
					<label class="mdl-textfield__label" for="recordId">Internal ID</label>
				</div>
				<br/>
				<button
						type="submit"
						class="mdl-button mdl-js-button mdl-button--raised mdl-button--colored"
						onclick="showLoading()">
					<span class="material-icons md-18">search</span> Get Details
				</button>
				<hr/>
				<div id="spinner" class="mdl-spinner mdl-js-spinner is-active" style="display: none"></div>
				<div id="details">
					${detailsHtml}
				</div>
			</form>`;
	}
	
	function detailsListing(recordType, recordId) {
		let loaded = false;
		
		try {
			const rec = record.load({
				type: recordType,
				id: recordId
			});
			loaded = true;
			
			const recordFieldNames = rec.getFields();
			const recordFields = recordFieldNames
				.map(fieldId => {
					const recordField = rec.getField({"fieldId": fieldId});
					
					let fieldText;
					try {
						fieldText = rec.getText({"fieldId": fieldId});
					}
					catch (e) {
						fieldText = "Error: " + e.message;
					}
					
					const fieldValue = rec.getValue({"fieldId": fieldId});
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
					const sublistFields = rec.getSublistFields({sublistId: sublistId});
					
					const lineCount = rec.getLineCount({sublistId: sublistId});
					
					const sublistHeader = sublistFields.map(sublistField => {
						const field = lineCount > 0
							? rec.getSublistField({sublistId: sublistId, fieldId: sublistField, line: 0})
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
							const value = rec.getSublistValue({sublistId: sublistId, fieldId: sublistField, line: i});
							let fieldText = value + "";
							let error = fieldText.toLowerCase().startsWith("error: ");
							try {
								fieldText = rec.getSublistText({sublistId: sublistId, fieldId: sublistField, line: i});
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
						style="border-width: 1px; border-color: light-gray">
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
	
	pages[recordDetailsPage] = {
		label: "Record Details",
		render: detailsPage
	};
	
	
	//----------------------------------------------------------------------------------------------------------------
	const pageLookupFields = "lookup-fields";
	const commandLookupFields = pageLookupFields;
	
    function lookupFieldsPage(context) {
		const commandUrl = scriptDeployParam(context) +
			"&" + paramCommand + "=" + commandLookupFields;
		return `
			<script>
				${runCommandJs()}
				window.commandPostUrl = "${commandUrl}";

				${renderStatusJs()}
				${runNextJs()}
				${runAllJs()}
			</script>
		
			<h2>Retrieve field values from some records</h2>
			${documentationSection(`
				<h3>· For valid Record Types and Field IDs, see [${pages[recordDetailsPage].label}] page (left menu)</h3>
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
			`)}
			<hr/>
			${taskListAndRunStatusJs('Record Type|Internal ID|Location|Field ID')}`;
	}
	
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
			id: recordId
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
				fieldText = rec.getText({"fieldId": fieldId});
			}
			catch (e) {
				fieldText = "Error: " + e.message;
			}
			
			const fieldValue = rec.getValue({"fieldId": fieldId});
			const fieldValueSuffix = 
				"" + fieldValue !== fieldText && fieldValue
				? ` | ${fieldValue}`: "";
			
			return fieldText + fieldValueSuffix;
		}
		const sublistOrSubrecord = remainingPath[0];
		
		const sublistNames = rec.getSublists();
		if (! sublistNames.includes(sublistOrSubrecord)) {
			throw new Error("Sublist not found: " + sublistOrSubrecord);
		}
		
		if (remainingPath.length === 1 &&
				(fieldId === "count" || fieldId === "linecount")) {
			return rec.getLineCount({
				sublistId: sublistOrSubrecord
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
				"fieldId": fieldId,
				line: sublistLine
			});
		}
		catch (e) {
			sublistText = "Error: " + e.message;
		}
		
		const sublistValue = rec.getSublistValue({
			sublistId: sublistOrSubrecord,
			"fieldId": fieldId,
			line: sublistLine
		});
		const sublistValueSuffix = 
			"" + sublistValue !== sublistText && sublistValue
			? ` | ${sublistValue}`: "";
		
		return `${sublistText} | line ${sublistLine}${sublistValueSuffix}`;
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
		const count = rec.getLineCount({
			"sublistId": sublistId
		});
		
		const conjunctions = splitAmpersand(sublistLineQuery);
		
		let candidates = [...Array(count).keys()];
		for (const conjunction of conjunctions) {
			if (candidates.length === 0) {
				return [];
			}
			
			const asNumber = Number(conjunction);
			if (Number.isInteger(asNumber)) {
				// NB: handle -0 for inserting last
				if (! conjunction.startsWith("-")) {
					if (asNumber > candidates.length) {
						throw new Error("Line ${asNumber} is too big: ${candidates}");
					}
					return [candidates[asNumber]];
				}
				else {
					if (-asNumber > candidates.length) {
						throw new Error("Line ${asNumber} is too small: ${candidates}");
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
					"sublistId": sublistId,
					"fieldId": queryField.fieldId,
					line: candidates[i]
				});
				
				if (sublistFieldText === queryField.fieldText) {
					remainingCandidates.push(candidates[i]);
				}
			}
			candidates = remainingCandidates;
		}
		
		return candidates;
	}
	
	pages[pageLookupFields] = {
		label: "Lookup Fields",
		render: lookupFieldsPage,
		commands: {
			[commandLookupFields]: handleLookupFields
		}
	};
	
	
	//----------------------------------------------------------------------------------------------------------------
	const pageEditRecords = "edit-records";
	const commandEditRecord = "edit";
	const actionSet = "set";
	const actionInsertLine = "insert";
	const actionRemoveLine = "remove";
	const ignoreRecalcArg = normalizeKey("ignoreRecalc");
	
    function editRecordsPage(context) {
		const commandPrefix = scriptDeployParam(context) +
			"&" + paramCommand + "=" + commandEditRecord;
		
		return `
			<script>
				${runCommandJs()}
				window.commandPostUrl = "${commandPrefix}";

				modelProcessors.push(() => {
					model.forEach(i => {
						const parts = i.task.split("|")
							.map(part => part.replace(/\W/g, "").toLowerCase());
						i.group = parts[0] + "|" + parts[1];
					});
				});
				
				${renderStatusJs()}
				${runNextJs()}
				${runAllJs()}
			</script>
		
			<h2>Edit one or more records</h2>
			${documentationSection(`
				<h3>· For Record Type/Internal ID/Location, see [${pages[pageLookupFields].label}] page (left menu)</h3>
				<h3>· Field Values have the following format:</h3>
				<h4>&nbsp; &nbsp; · &lt;Field ID&gt;=&lt;Field Text&gt; (for 'select' fields, the option number can be specified)</h4>
				<h4>&nbsp; &nbsp; · Can specify multiple field values, separated by &amp;</h4>
				<h4>&nbsp; &nbsp; · Multiple values can be used with ${actionSet}/${actionInsertLine}</h4>
				<h3>· The following Actions are available:</h3>
				<h4>&nbsp; &nbsp; · ${actionSet}: assign new value to one or more fields</h4>
				<h4>&nbsp; &nbsp; · ${actionInsertLine}: add new Sublist line</h4>
				<h4>&nbsp; &nbsp; · ${actionRemoveLine}: remove existing Sublist line</h4>
			`)}
			<hr/>
			${taskListAndRunStatusJs('Record Type|Internal ID|Location|Field Values|Action')}`;
	}
	
	function handleEditRecord(context) {
		const tabDelimitedRows = JSON.parse(context.request.body);
		const firstTabDelimitedRow = tabDelimitedRows[0];
		const firstParts = splitVerticalBar(firstTabDelimitedRow);
		const recordType = getRecordType(firstParts[0]);
		const recordId = normalizeKey(firstParts[1]);
		
		const rec = record.load({
			type: recordType,
			id: recordId
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
			id: recordId
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
	
	function handleEditRecordAction(
		rec, actionName, actionLocation, fieldValues
	) {
		const fieldAssignments = parseFieldAssignmentList(fieldValues);
		
		if (actionLocation === "") {
			if (actionName !== actionSet) {				
				throw new Error(
					"Unsupported action on record: " + actionName);
			}
		
			return fieldAssignments.map(i =>
				setRecordField(
					rec, i.fieldId, i.fieldText));
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
					setSublistField(
						rec, sublistId, sublistLineQuery, i.fieldId, i.fieldText));
			
			case actionInsertLine:
				return insertSublistLine(
					rec, sublistId, sublistLineQuery, fieldAssignments);
			
			case actionRemoveLine:
				return [removeSublistLine(
					rec, sublistId, sublistLineQuery, fieldAssignments)];
			
			default:
				throw new Error(
					"Unsupported action on sublist: " + actionName);
		}
	}
	
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
                    "fieldText": fieldAssignments.map(i => i.fieldText)
                });
            }
        }

		return withMultiSelect;
	}

	function parseFieldAssignment(fieldAssignment) {
		const firstEquals = fieldAssignment.indexOf("=");
		if (firstEquals === -1) {
			throw new Error(
				"Field assignment expected (fieldId=value): " +
					fieldAssignment);
		}

		const fieldId = fieldAssignment.substring(0, firstEquals);
		const fieldText = fieldAssignment.substring(firstEquals + 1);

		return {
			fieldId: normalizeKey(fieldId),
			fieldText
		};
	}

	function setRecordField(
		rec, fieldId, fieldText
	) {
        const field = rec.getField({fieldId});
        if (field.type === "select" || field.type === "multiselect") {
            return setRecordSelect(rec, fieldId, fieldText, field.type === "multiselect");
        }

        if (Array.isArray(fieldText)) {
			throw new Error("Single value expected (" + fieldId + "): " + fieldText);
        }

		const existingText = rec.getText({fieldId});
		if (existingText !== fieldText) {
			rec.setText({
				fieldId,
				"text": fieldText
			});
		}
		
		return reload => {
			const afterUpdate = reload.getText({fieldId});
			return validateSetField(fieldId, existingText, fieldText, afterUpdate);
		};
	}

	function setRecordSelect(
		rec, fieldId, fieldText, multi
	) {
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
                    "value": (multi ? fieldValues : fieldValues[0])
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
				"text": (multi ? asList : asList[0])
			});
		}

		return reload => {
			const afterUpdate = reload.getText({fieldId});
			return validateSetField(fieldId, "" + existingText, "" + fieldText, "" + afterUpdate);
		};
	}

	function setSublistField(
		rec, sublistId, sublistLineQuery, fieldId, fieldText
	) {
		const sublistLine = getSublistLine(rec, sublistId, sublistLineQuery);

        if (field.type === "select" || field.type === "multiselect") {
            return setSublistSelect(rec, sublistId, sublistLineQuery, fieldId, fieldText, field.type === "multiselect");
        }

        if (Array.isArray(fieldText)) {
			throw new Error(
				"Single value expected (" + sublistId + "/" + sublistLineQuery + "/" + fieldId + "): " + fieldText);
        }
		
		const existingText = rec.getSublistText({
			sublistId,
			fieldId,
			line: sublistLine
		});
		
		if (existingText !== fieldText) {
			rec.setSublistText({
				sublistId,
				fieldId,
				line: sublistLine,
				"text": fieldText
			});
		}
		
		return reload => {
			const reloadSublistLine = getSublistLine(reload, sublistId, sublistLineQuery);
			const afterUpdate = reload.getSublistText({
				sublistId,
				fieldId,
				line: reloadSublistLine
			});
			return validateSetField(fieldId, existingText, fieldText, afterUpdate);
		};
	}

	function setSublistSelect(
		rec, sublistId, sublistLineQuery, fieldId, sublistLine, fieldText, multi
	) {
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
            const existingValue = rec.getSublistValue({sublistId, fieldId, "line": sublistLine});
            const existingList = Array.isArray(existingValue) ? existingValue : [existingValue];
            if (JSON.stringify(asList) !== JSON.stringify(existingList)) {
                rec.setSublistValue({
                    sublistId,
                    fieldId,
                    line: sublistLine,
                    "value": (multi ? fieldValues : fieldValues[0])
                });
            }
            return reload => {
                const afterUpdate = reload.getSublistValue({sublistId, fieldId, "line": sublistLine});
                return validateSetField(fieldId, "" + existingList, "" + asList, "" + afterUpdate);
            };
        }

		const existingText = rec.getText({fieldId});
        const existingList = Array.isArray(existingText) ? existingText : [existingText];

		if (JSON.stringify(asList) !== JSON.stringify(existingList)) {
			rec.getSublistText({
				sublistId,
				fieldId,
				"text": (multi ? asList : asList[0])
			});
		}

		return reload => {
			const reloadSublistLine = getSublistLine(reload, sublistId, sublistLineQuery);
			const afterUpdate = reload.getSublistText({sublistId, fieldId, line: reloadSublistLine});
			return validateSetField(fieldId, "" + existingText, "" + fieldText, "" + afterUpdate);
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
	};
	
	function insertSublistLine(
		rec, sublistId, sublistLineQuery, fieldAssignments
	) {
		const sublistLine = getSublistLine(rec, sublistId, sublistLineQuery);
		const ignoreRecalc = getIgnoreCalcArgument(fieldAssignments, true);
		
		rec.insertLine({
			"sublistId": sublistId,
			line: sublistLine,
			"ignoreRecalc": ignoreRecalc
		});
		
		const setFieldValidators = [];
		for (const fieldAssignment of fieldAssignments) {
			if (fieldAssignment.fieldId === ignoreRecalcArg) {
				continue;
			}
			setSublistField(
				rec, sublistId, "" + sublistLine, fieldAssignment.fieldId, fieldAssignment.fieldText);
		}
		
		const validationSublistFields = rec.getSublistFields({sublistId})
			.filter(i => ! i.startsWith("sys_"));
		const sublistValues = validationSublistFields.map(fieldId =>
			rec.getSublistText({sublistId, fieldId, line: sublistLine}));
		
		//const allValues = [];
		//allValues.push(sublistValues);
		
		return [
			reload => {
				const foundAt = [];
				const lineCount = reload.getLineCount({sublistId});
				for (let i = 0; i < lineCount; i++) {
					const reloadSublistValues = validationSublistFields.map(fieldId =>
						reload.getSublistText({sublistId, fieldId, line: i}));
					//allValues.push(reloadSublistValues);
					//const matches = sublistValues.map((val, idx) => val === "" || val === reloadSublistValues[idx]);
					//allValues.push(matches);
					const allEqual = sublistValues.every((val, idx) => val === "" || val === reloadSublistValues[idx]);
					if (allEqual) {
						foundAt.push(i);
					}
				}
				return `Inserted at ${sublistLine} (found at ${foundAt.join(", ")})`; //  - ${JSON.stringify(allValues)}
			}];
	}
	
	function removeSublistLine(
		rec, sublistId, sublistLineQuery, fieldAssignments
	) {
		const sublistLine = getSublistLine(rec, sublistId, sublistLineQuery);
		const ignoreRecalc = getIgnoreCalcArgument(fieldAssignments, true);
		
		const validationSublistFields = rec.getSublistFields({sublistId})
			.filter(i => ! i.startsWith("sys_"));
		const sublistValues = validationSublistFields.map(fieldId =>
			rec.getSublistText({sublistId, fieldId, line: sublistLine}));
			
		rec.removeLine({
			"sublistId": sublistId,
			line: sublistLine,
			"ignoreRecalc": ignoreRecalc
		});
		
		return reload => {
			const foundAt = [];
			const lineCount = reload.getLineCount({sublistId});
			for (let i = 0; i < lineCount; i++) {
				const reloadSublistValues = validationSublistFields.map(fieldId =>
					reload.getSublistText({sublistId, fieldId, line: i}));
				const allEqual = sublistValues.every((val, idx) => val === reloadSublistValues[idx]);
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
	
	
	function getSublistRowValues(rec, sublistId, line) {
		//const lineCount = rec.getLineCount({sublistId});
		const sublistFields = rec.getSublistFields({sublistId});

		return sublistFields.map(fieldId => {
			return rec.getSublistValue({sublistId, fieldId, line});
		});
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
	
	pages[pageEditRecords] = {
		label: "Edit Records",
		render: editRecordsPage,
		commands: {
			[commandEditRecord]: handleEditRecord
		}
	};
	

	//----------------------------------------------------------------------------------------------------------------
	const commandCreateRecord = "create";
	

    function createRecordsPage(context) {
		const commandPrefix = scriptDeployParam(context) +
			"&" + paramCommand + "=" + commandCreateRecord;
		
		return `
			<script>
				${runCommandJs()}
				window.commandPostUrl = "${commandPrefix}";
				${renderStatusJs()}
				${runNextJs()}
				${runAllJs()}
			</script>
		
			<h2>Create one or more records</h2>
			${documentationSection(`
				<h3>· For Record Type, see [${pages[pageLookupFields].label}] page (left menu)</h3>
				<h3>· Default Values and Field Values have the following format:</h3>
				<h4>&nbsp; &nbsp; · &lt;Field ID&gt;=&lt;Field Value&gt;</h4>
				<h4>&nbsp; &nbsp; · Can specify multiple field values, separated by &amp;</h4>
				<h3>· To determine which values are "Default Values" (vs Field Values):</h3>
				<h4>&nbsp; &nbsp; · Refer to SuiteScript documentation (incomplete):
					<a href="https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_4267255811.html#bridgehead_4423371543">
						"N/record Default Values"
					</a>
				</h4>
				<h4>&nbsp; &nbsp; · For some Records Types, certain Default Values are mandatory</h4>
				<h3>· Result contains the new Internal ID that is automatically generated by NetSuite</h3>
				<h3>· Sublists are not supported during creation (use [${pages[pageEditRecords].label}] after)</h3>
			`)}
			<hr/>
			${taskListAndRunStatusJs('Record Type|Default Values|Field Values')}`;
	}
	
	function handleCreateRecord(context) {
		const tabDelimitedRows = JSON.parse(context.request.body);
		const firstTabDelimitedRow = tabDelimitedRows[0];
		const firstParts = splitVerticalBar(firstTabDelimitedRow);
		const recordType = getRecordType(firstParts[0]);
		const defaultFieldValues = parseFieldAssignmentList(firstParts[1] || "");
		const fieldValues = parseFieldAssignmentList(firstParts[2] || "");
		
		const allValidators = [];
		
		const defaultValues = {};
		// NB: this doesn't appear to work, but setText before save works (undocumented?)
		/*for (const assignment of defaultFieldValues) {
			defaultValues[assignment.fieldId] = assignment.fieldText;
			allValidators.push(reload => {
				const afterSave = reload.getText({
					"fieldId": assignment.fieldId
				});
				return afterSave === assignment.fieldText
					? `Default ${assignment.fieldId} to '${assignment.fieldText}'`
					: `Unexpected ${assignment.fieldId} default, tried '${assignment.fieldText}' but got '${afterSave}'`;
			});
		}*/
		
		const rec = record.create({
			type: recordType,
			defaultValues
		});
		
		for (const fieldValue of defaultFieldValues) {
			const validator = setDefaultRecordField(rec, fieldValue.fieldId, fieldValue.fieldText);
			allValidators.push(validator);
		}
		
		const recordId = rec.save({});
		
		const loaded = record.load({
			type: recordType,
			id: recordId
		});
		
		for (const fieldValue of fieldValues) {
			const validator = setRecordField(loaded, fieldValue.fieldId, fieldValue.fieldText);
			allValidators.push(validator);
		}
		
		loaded.save({});

		const reload = record.load({
			type: recordType,
			id: recordId
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
			`Internal ID: ${recordId} | ${messages.join(" | ")}`
		]);
	}
	
	function setDefaultRecordField(
		rec, fieldId, fieldText
	) {
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
			"text": fieldText
		});
		
		return reload => {
			const afterSave = reload.getText({fieldId});
			return afterSave === fieldText
				? `Default ${fieldId} to '${fieldText}'`
				: `Unexpected ${fieldId} default, tried '${fieldText}' but got '${afterSave}'`;
		};
	}

	function setDefaultRecordSelect(
		rec, fieldId, fieldText, multi
	) {
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
                "value": (multi ? fieldValues : fieldValues[0])
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
            "text": (multi ? asList : asList[0])
        });

		return reload => {
			const afterSave = reload.getText({fieldId});
            const afterSaveList = Array.isArray(afterSave) ? afterSave : [afterSave];
			return JSON.stringify(afterSaveList) ===  JSON.stringify(asList)
				? `Default ${fieldId} to '${fieldText}'`
				: `Unexpected ${fieldId} default, tried '${fieldText}' but got '${afterSave}'`;
		};
	}

	pages["create-records"] = {
		label: "Create Records",
		render: createRecordsPage,
		commands: {
			[commandCreateRecord]: handleCreateRecord
		}
	};
	
	
	//----------------------------------------------------------------------------------------------------------------
	const commandMassSave = "mass-save";
	
	function massSavePage(context) {
		const commandPrefix = scriptDeployParam(context) +
			"&" + paramCommand + "=" + commandMassSave;
		
		return `
			<script>
				${runCommandJs()}
				window.commandPostUrl = "${commandPrefix}";
				
				${renderStatusJs()}
				${runNextJs()}
				${runAllJs()}
			</script>
			<h1>Edit/Save Records</h1>
			<h2>(without changing values, to trigger events)</h2>
			${documentationSection(`			
				<h3>· For Record Type/Internal ID, see [${pages[pageLookupFields].label}] page (left menu)</h3>
				<h2>· Each Record by Internal ID:</h2>
				<h2>&nbsp; &nbsp; 1) EDIT Record (load)</h2>
				<h2>&nbsp; &nbsp; 2) SAVE Record</h2>
				<h2>· Result: trigger any associated events (e.g. run workflows)</h2>
			`)}
			<hr/>
			${taskListAndRunStatusJs("Record Type|Internal ID")}`;
	}
	
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
			id: recordId
		});
		rec.save({});
		
		// TODO: detect changes, possibly taking list of field paths to look at
		return `["Edit/Save"]`;
	}
	
	pages["mass-save"] = {
		label: "Mass Edit/Save",
		render: massSavePage,
		commands: {
			[commandMassSave]: handleMassSave
		}
	};
	

	//----------------------------------------------------------------------------------------------------------------
	const commandMassDelete = "mass-delete";
	
	function massDeletePage(context) {
		const commandPrefix = scriptDeployParam(context) +
			"&" + paramCommand + "=" + commandMassDelete;
		
		return `
			<script>
				${runCommandJs()}
				window.commandPostUrl = "${commandPrefix}";
				
				${renderStatusJs()}
				${runNextJs()}
				${runAllJs()}
			</script>
			<h1 style="color: red">***Records are PERMANENTLY DELETED***</h1>
			${documentationSection(`
				<h3>· DELETE each Record by Record Type/Internal ID, see [${pages[pageLookupFields].label}] page (left menu)</h3>
			`)}
			<hr/>
			${taskListAndRunStatusJs("Record Type|Internal ID")}`;
	}
	
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
				id: recordId
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
				id: recordId
			});
		}
		catch (e) {
			return `["Delete error: ${e.message}${loadMessageSuffix}"]`;
		}
		
		try {
			record.load({
				type: recordType,
				id: recordId
			});
			return `["Delete failed${loadMessageSuffix}"]`;
		}
		catch (e) {
			if (e.name === 'RCRD_DSNT_EXIST') {
				return `["Delete successful${loadMessageSuffix}"]`;
			}
			else {
				return `["Delete error${loadMessageSuffix} | Reload error: ${e.message}"]`;
			}
		}
	}
	
	pages["mass-delete"] = {
		label: "Mass Delete (DANGER!)",
		render: massDeletePage,
		commands: {
			[commandMassDelete]: handleMassDelete
		}
	};
	

	//----------------------------------------------------------------------------------------------------------------
	function normalizeKey(value) {
		return value.replace(/[^A-Za-z0-9_-]/g, "").toLowerCase();
	}
	
	
	function splitAmpersand(value) {
		const withSentinel = value.replaceAll("\\&", "__AMPERSAND_ESCAPE__");
		return withSentinel.split("&").map(i => i.replace("__AMPERSAND_ESCAPE__", "&"));
	}
	
	
	function splitVerticalBar(value) {
		const withSentinel = value.replaceAll("\\|", "__VERTICAL_BAR_ESCAPE__");
		return withSentinel.split("|").map(i => i.replace("__VERTICAL_BAR_ESCAPE__", "|"));
	}
	
	
	function splitSlash(value) {
		if (value === "") {
			return [];
		}
		const withSentinel = value.replaceAll("\\/", "__SLASH_ESCAPE__");
		return withSentinel.split("/").map(i => i.replace("__SLASH_ESCAPE__", "/"));
	}
	
	
	function recordTypeOptions(selectedRecordType) {
		return Object.keys(allRecordTypes).map(type => {
			const formatted = type.split("_").map(i => i[0] + i.substring(1).toLowerCase()).join(" ");
			const suffix = (type in undocumentedRecordTypes) ? " (undocumented)" : "";
			return `
				<option
					value="${allRecordTypes[type]}"
					${allRecordTypes[type] === selectedRecordType ? 'selected="selected"' : ""}
				>${formatted}${suffix}</option>`;
		}).join("");
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
	
	
	function runCommandJs() {
		return `
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
			}`;
	}
	
	function renderStatusJs() {
		return `
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
				const csv = rows.join("\\r\\n");
				
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
			}`;
	}

	function runNextJs() {
		return `
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
			}`;
	}

	function runAllJs() {
		return `
			function runAll() {
				document.getElementById('taskList').style.display = "none";
				document.getElementById('runStatus').style.display = "block";
				const taskValues = document.getElementById('tasks').value;
				const tasks = taskValues.split('\\n');
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
			}`;
	}

	function taskListAndRunStatusJs(taskTypeLabel) {
		return `
			<div id="taskList">
				<fieldset style="width: 40em">
					<legend>${taskTypeLabel} (one per line)</legend>
					<textarea
							class="mdl-textfield__input"
							type="text"
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
	
	
	//----------------------------------------------------------------------------------------------------------------
    return {onRequest: main};
});
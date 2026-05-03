import record from "N/record";
import search from "N/search";
import query from "N/query";
import runtime from "N/runtime";

import { interpolate, documentationSection } from "./html.js";
import layoutHtml from "./layout.html";
import { bulkRunnerScaffold } from "./bulk-runner.js";
import bulkRunnerJs from "./client/bulk-runner.client.js?raw";
import {
	version,
	mdlCssUrl,
	mdlJsUrl,
	defaultPage,
	paramPage,
	paramRecordId,
	paramRecordType,
	paramCommand,
} from "./constants.js";
import { getCommandParam, scriptDeployParam, setPageParam } from "./url.js";
import { normalizeKey, splitAmpersand, splitVerticalBar, splitSlash } from "./utils.js";
import {
	undocumentedRecordTypes,
	allRecordTypes,
	getRecordType,
	recordTypeOptions,
} from "./record-types.js";

import welcomePage from "./pages/welcome/server.js";
import recordTypePageDef from "./pages/record-type/server.js";

	const pages = {};


	//----------------------------------------------------------------------------------------------------------------
    function main(context) {
		const command = getCommandParam(context);
		if (command !== "") {
			const pageCommands = Object.values(pages).map(i => (i.commands || {}));
			const matchingCommands = pageCommands.find(i => command in i);
			let responseText;
			if (! matchingCommands) {
				responseText = `Error: unknown command '${command}'`;
			}
			else {
				try {
					responseText = "" + matchingCommands[command](context);
				}
				catch (e) {
					responseText = `Error: ${e.message}`;
				}
			}
			context.response.write(responseText || "(blank)");
			return;
		}
		
		const requestedPage = context.request.parameters[paramPage];
		const pageParam = pages[requestedPage] ? requestedPage : defaultPage;
		const pageHtml = pages[pageParam].render(context);
		
		function navigationLink(page) {
			const label = pages[page].label;
			return `
				<a class="mdl-navigation__link ${pageParam === page ? 'mdl-navigation__link--current' : ''}"
						href="${setPageParam(context, page)}">
					${label}
				</a>`;
		}
		
		const navHtml = navigationLink(defaultPage)
			+ "<hr/>"
			+ Object.keys(pages)
				.filter(page => page !== defaultPage)
				.map(navigationLink)
				.join("");

		const currentLabel = pages[pageParam].label;
		context.response.write(interpolate(layoutHtml, {
			title: `${currentLabel} - AO Dashboard`,
			mdlCssUrl,
			mdlJsUrl,
			version,
			nsVersion: runtime.version || "[unknown version]",
			navHtml,
			bodyHtml: pageHtml,
		}));
    }
	
	
	//----------------------------------------------------------------------------------------------------------------
	pages[welcomePage.name] = welcomePage;
	pages[recordTypePageDef.name] = recordTypePageDef;
	
	
	//----------------------------------------------------------------------------------------------------------------
	
	
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
					<h3>· To detect the Record Type(s) for a particular Internal ID, see [${recordTypePageDef.label}] page (left menu)</h3>
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
				${bulkRunnerJs}
				window.commandPostUrl = "${commandUrl}";

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
			${bulkRunnerScaffold('Record Type|Internal ID|Location|Field ID')}`;
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
					"sublistId": sublistId,
					"fieldId": queryField.fieldId,
					line: candidates[i]
				});
				
				if (sublistFieldText === queryField.fieldText) {
					remainingCandidates.push(candidates[i]);
					continue;
				}

				if (Number.isInteger(Number(queryField.fieldText))) {
                    const sublistValue = rec.getSublistValue({
                        "sublistId": sublistId,
                        "fieldId": queryField.fieldId,
                        line: candidates[i]
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
				${bulkRunnerJs}
				window.commandPostUrl = "${commandPrefix}";

				modelProcessors.push(() => {
					model.forEach(i => {
						const parts = i.task.split("|")
							.map(part => part.replace(/\W/g, "").toLowerCase());
						i.group = parts[0] + "|" + parts[1];
					});
				});
				
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
				<h4>&nbsp; &nbsp; · ${actionInsertLine}: add new Sublist line (before given Location, use line=-0 to insert at end)</h4>
				<h4>&nbsp; &nbsp; · ${actionRemoveLine}: remove existing Sublist line</h4>
			`)}
			<hr/>
			${bulkRunnerScaffold('Record Type|Internal ID|Location|Field Values|Action')}`;
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
		
		const field = rec.getSublistField({sublistId, fieldId, line: sublistLine});
        if (field.type === "select" || field.type === "multiselect") {
            return setSublistSelect(rec, sublistId, sublistLineQuery, fieldId, sublistLine, fieldText, field.type === "multiselect");
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

		const existingText = rec.getSublistText({
			sublistId,
			fieldId,
			line: sublistLine
		});
        const existingList = Array.isArray(existingText) ? existingText : [existingText];

		if (JSON.stringify(asList) !== JSON.stringify(existingList)) {
			rec.setSublistText({
				sublistId,
				fieldId,
				line: sublistLine,
				"text": (multi ? asList : asList[0])
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
	
	function insertSublistLine(
		rec, sublistId, sublistLineQuery, fieldAssignments
	) {
	    const count = rec.getLineCount({sublistId});
		const sublistLine =
		    count === 0 && (sublistLineQuery === "0" || sublistLineQuery === "-0")
		    ? 0
		    : getSublistLine(rec, sublistId, sublistLineQuery);
		const ignoreRecalc = getIgnoreCalcArgument(fieldAssignments, true);
		
		rec.insertLine({
			"sublistId": sublistId,
			line: sublistLine,
			"ignoreRecalc": ignoreRecalc
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
				return `Inserted at ${sublistLine} (found at ${foundAt.join(", ")})`; //  - ${JSON.stringify(allValues)}
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
	
	
	function removeSublistLine(
		rec, sublistId, sublistLineQuery, fieldAssignments
	) {
		const sublistLine = getSublistLine(rec, sublistId, sublistLineQuery);
		const ignoreRecalc = getIgnoreCalcArgument(fieldAssignments, true);
		
		const validationSublistFields = rec.getSublistFields({sublistId})
			.filter(i => ! i.startsWith("sys_"));
		const removedLineFingerprint = validationSublistFields.map(fieldId =>
			getSublistTextOrValue(rec, sublistId, fieldId, sublistLine));

		rec.removeLine({
			"sublistId": sublistId,
			line: sublistLine,
			"ignoreRecalc": ignoreRecalc
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
				${bulkRunnerJs}
				window.commandPostUrl = "${commandPrefix}";
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
			${bulkRunnerScaffold('Record Type|Default Values|Field Values')}`;
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
				${bulkRunnerJs}
				window.commandPostUrl = "${commandPrefix}";
				
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
			${bulkRunnerScaffold("Record Type|Internal ID")}`;
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
				${bulkRunnerJs}
				window.commandPostUrl = "${commandPrefix}";
				
			</script>
			<h1 style="color: red">***Records are PERMANENTLY DELETED***</h1>
			${documentationSection(`
				<h3>· DELETE each Record by Record Type/Internal ID, see [${pages[pageLookupFields].label}] page (left menu)</h3>
			`)}
			<hr/>
			${bulkRunnerScaffold("Record Type|Internal ID")}`;
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

export { main };

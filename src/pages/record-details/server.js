import record from "N/record";

import { paramRecordType, paramRecordId } from "../../constants.js";
import { interpolate, documentationSection, escapeHtml } from "../../html.js";
import { normalizeKey } from "../../utils.js";
import { recordTypeOptions } from "../../record-types.js";
import recordTypePage from "../record-type/server.js";
import templateHtml from "./template.html";


export default {
	name: "record-details",
	label: "Record Details",

	render(context) {
		const recordType = context.request.parameters[paramRecordType] || "";
		const recordId = normalizeKey(context.request.parameters[paramRecordId] || "");

		let detailsHtml;
		if (recordType === "" || recordId === "") {
			detailsHtml = `Please provide "Record Type" and "Internal ID" (above)`;
		}
		else {
			detailsHtml = detailsListing(recordType, recordId);
		}

		return interpolate(templateHtml, {
			documentationHtml: documentationSection(`
				<h3>· To detect the Record Type(s) for a particular Internal ID, see [${recordTypePage.label}] page (left menu)</h3>
			`),
			recordTypeOptionsHtml: recordTypeOptions(recordType),
			paramRecordType,
			paramRecordId,
			recordType,
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
					<td class="mdl-data-table__cell--non-numeric">${escapeHtml(fieldId)}</td>
					<td class="mdl-data-table__cell--non-numeric">${escapeHtml(recordField?.label)}</td>
					<td class="mdl-data-table__cell--non-numeric">${escapeHtml(recordField?.type)}</td>
					<td class="mdl-data-table__cell--non-numeric" style="word-break: break-all;word-wrap: break-word; max-width: 25em;">${escapeHtml(fieldText)}</td>
					<td class="mdl-data-table__cell--non-numeric" style="word-break: break-all;word-wrap: break-word; max-width: 25em; font-family: monospace">${escapeHtml(fieldValueIfDifferent)}</td>
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
							${escapeHtml(sublistField)}
							${type ? `<br/>(${escapeHtml(type)})` : ""}
						</span>
						<span style="font-weight: bold">${label ? `<br/>${escapeHtml(label)}` : ""} </span>
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
							<span style="font-family: monospace; ${error ? "color: red" : ""}">${escapeHtml(value)}</span>
							${fieldText === value ? "" : `<br/>${escapeHtml(fieldText)}`}
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
				${sublistFields.join("<br/>")}
			</div>`;
	}
	catch (e) {
		return `
			<h2>${escapeHtml(recordType)} Internal ID: ${escapeHtml(recordId)}</h2>
			<h3 style="color: red">
				Error: ${loaded ? "retrieving -" : "loading -"} ${escapeHtml(e.message)} <br/>
				${escapeHtml(e.stack)}
			</h3>`;
	}
}

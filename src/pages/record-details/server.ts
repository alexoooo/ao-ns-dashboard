import record from "N/record";

import {paramRecordType, paramRecordId} from "../../constants";
import {interpolate, documentationSection, escapeHtml} from "../../html";
import {pageLink} from "../../help";
import {normalizeKey} from "../../utils";
import {recordTypeOptions} from "../../record-types";
import {errorMessage} from "../../error-utils";
import recordTypePage from "../record-type/server";
import templateHtml from "./template.html";
import type {PageDef, SuiteletContext} from "../../types";

const recordDetailsPage: PageDef = {
	name: "record-details",
	label: "Record Details",

	render(context: SuiteletContext): string {
		const recordType = (context.request.parameters[paramRecordType] as string | undefined) ?? "";
		const recordId = normalizeKey((context.request.parameters[paramRecordId] as string | undefined) ?? "");

		const detailsHtml =
			recordType === "" || recordId === ""
				? `Please provide "Record Type" and "Internal ID" (above)`
				: detailsListing(recordType, recordId);

		return interpolate(templateHtml, {
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

export default recordDetailsPage;

function detailsListing(recordType: string, recordId: string): string {
	let loaded = false;

	try {
		const rec = record.load({
			type: recordType,
			id: recordId,
		});
		loaded = true;

		const recordFieldNames = rec.getFields();
		const recordFields = recordFieldNames.map(fieldId => {
			const recordField = rec.getField({fieldId});

			let fieldText: string;
			try {
				const raw = rec.getText({fieldId});
				fieldText = Array.isArray(raw) ? raw.join(",") : raw;
			} catch (e) {
				fieldText = "Error: " + errorMessage(e);
			}

			const fieldValue = rec.getValue({fieldId});
			const fieldValueIfDifferent =
				"" + String(fieldValue) !== fieldText && fieldValue ? "" + String(fieldValue) : "";

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
			const sublistFields = rec.getSublistFields({sublistId});

			const lineCount = rec.getLineCount({sublistId});

			const sublistHeader = sublistFields
				.map(sublistField => {
					const field =
						lineCount > 0 ? rec.getSublistField({sublistId, fieldId: sublistField, line: 0}) : null;

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
					const value = rec.getSublistValue({sublistId, fieldId: sublistField, line: i});
					let fieldText = String(value) + "";
					let error = fieldText.toLowerCase().startsWith("error: ");
					try {
						fieldText = rec.getSublistText({sublistId, fieldId: sublistField, line: i});
					} catch (_e) {
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
						${
							lineCount > 0
								? `<th class="mdl-data-table__cell--non-numeric" valign="top"
								style="position: sticky; top: 0; background-color: white; z-index: 999; box-shadow: 0 -1px 0 0 #d3d3d3 inset">
							Line</th>`
								: ""
						}
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
	} catch (e) {
		const stack = e instanceof Error ? (e.stack ?? "") : "";
		return `
			<h2>${escapeHtml(recordType)} Internal ID: ${escapeHtml(recordId)}</h2>
			<h3 style="color: red">
				Error: ${loaded ? "retrieving -" : "loading -"} ${escapeHtml(errorMessage(e))} <br/>
				${escapeHtml(stack)}
			</h3>`;
	}
}

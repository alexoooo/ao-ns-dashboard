import record from "N/record";
import type {Record as NsRecord} from "N/record";

import {paramCommand} from "../../constants";
import {interpolate, documentationSection} from "../../html";
import {pageLink, taskInputFormatHelp} from "../../help";
import {scriptDeployParam} from "../../url";
import {normalizeKey, splitAmpersand, splitVerticalBar, splitSlash} from "../../utils";
import {parseFieldAssignment} from "../../field-assignments";
import {getRecordType} from "../../record-types";
import {errorMessage} from "../../error-utils";
import recordDetailsPage from "../record-details/server";
import templateHtml from "./template.html";
import type {PageDef, SuiteletContext} from "../../types";

const commandName = "lookup-fields";

const lookupFieldsPage: PageDef = {
	name: "lookup-fields",
	label: "Lookup Fields",

	render(context: SuiteletContext): string {
		return interpolate(templateHtml, {
			commandUrl: scriptDeployParam(context) + "&" + paramCommand + "=" + commandName,
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
		[commandName]: handleLookupFields,
	},
};

export default lookupFieldsPage;

function handleLookupFields(context: SuiteletContext): string {
	const tabDelimitedRows = JSON.parse(context.request.body) as string[];
	const tabDelimitedRow = tabDelimitedRows[0];
	if (!tabDelimitedRow) {
		return JSON.stringify(["Empty"]);
	}

	const parts = splitVerticalBar(tabDelimitedRow);

	const recordType = getRecordType(parts[0] ?? "");
	const recordId = normalizeKey(parts[1] ?? "");
	const pathParts = splitSlash(parts[2] ?? "");
	const fieldIds = splitAmpersand(parts[3] ?? "").map(i => normalizeKey(i.split("=")[0] ?? ""));

	const rec = record.load({
		type: recordType,
		id: recordId,
	});

	if (fieldIds.length === 0) {
		return JSON.stringify(["Please specify Field ID"]);
	}

	const fieldTexts: string[] = [];
	for (const fieldId of fieldIds) {
		const fieldText = pathLookupFields(rec, fieldId, pathParts);
		fieldTexts.push(fieldText);
	}
	return JSON.stringify([fieldTexts.join(" | ")]);
}

function pathLookupFields(rec: NsRecord, fieldId: string, remainingPath: string[]): string {
	if (remainingPath.length === 0) {
		let fieldText: string;
		try {
			const raw = rec.getText({fieldId});
			fieldText = Array.isArray(raw) ? raw.join(",") : raw;
		} catch (e) {
			fieldText = "Error: " + errorMessage(e);
		}

		const fieldValue = rec.getValue({fieldId});
		const fieldValueSuffix = "" + String(fieldValue) !== fieldText && fieldValue ? ` (${String(fieldValue)})` : "";

		return `${fieldId}=${fieldText}${fieldValueSuffix}`;
	}
	const sublistOrSubrecord = remainingPath[0]!;

	const sublistNames = rec.getSublists();
	if (!sublistNames.includes(sublistOrSubrecord)) {
		throw new Error("Sublist not found: " + sublistOrSubrecord);
	}

	if (remainingPath.length === 1 && (fieldId === "count" || fieldId === "linecount")) {
		return (
			`${sublistOrSubrecord}.${fieldId}=` +
			rec.getLineCount({
				sublistId: sublistOrSubrecord,
			})
		);
	}

	const sublistLineQuery = remainingPath[1] ?? "";
	const sublistLine = getSublistLine(rec, sublistOrSubrecord, sublistLineQuery);

	if (remainingPath.length !== 2) {
		throw new Error(
			"Sublist subrecord not supported: " + sublistOrSubrecord + " - " + JSON.stringify(remainingPath)
		);
	}

	let sublistText: string;
	try {
		sublistText = rec.getSublistText({
			sublistId: sublistOrSubrecord,
			fieldId,
			line: sublistLine,
		});
	} catch (e) {
		sublistText = "Error: " + errorMessage(e);
	}

	const sublistValue = rec.getSublistValue({
		sublistId: sublistOrSubrecord,
		fieldId,
		line: sublistLine,
	});
	const sublistValueSuffix =
		"" + String(sublistValue) !== sublistText && sublistValue ? ` (${String(sublistValue)})` : "";

	return `${sublistOrSubrecord}.${sublistLine}.${fieldId}=${sublistText}${sublistValueSuffix}`;
}

export function getSublistLine(rec: NsRecord, sublistId: string, sublistLineQuery: string): number {
	const matches = findSublistLines(rec, sublistId, sublistLineQuery);
	if (matches.length === 0) {
		throw new Error("Sublist line not found: " + sublistLineQuery);
	}
	if (matches.length > 1) {
		throw new Error(`Multiple matching sublist lines (${matches.join(",")}): ${sublistLineQuery}`);
	}
	return matches[0]!;
}

export function findSublistLines(rec: NsRecord, sublistId: string, sublistLineQuery: string): number[] {
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
					throw new Error(`Line ${asNumber} is too big: ${candidates.join(",")}`);
				}
				return [candidates[asNumber]!];
			} else {
				if (-asNumber > candidates.length) {
					throw new Error(`Line ${asNumber} is too small: ${candidates.join(",")}`);
				} else if (asNumber === 0) {
					// negative zero
					return [candidates[candidates.length - 1]! + 1];
				}
				return [candidates[candidates.length + asNumber]!];
			}
		}

		const queryField = parseFieldAssignment(conjunction);

		const remainingCandidates: number[] = [];
		for (let i = 0; i < candidates.length; i++) {
			const sublistFieldText = rec.getSublistText({
				sublistId,
				fieldId: queryField.fieldId,
				line: candidates[i]!,
			});

			if (sublistFieldText === queryField.fieldText) {
				remainingCandidates.push(candidates[i]!);
				continue;
			}

			if (Number.isInteger(Number(queryField.fieldText))) {
				const sublistValue = rec.getSublistValue({
					sublistId,
					fieldId: queryField.fieldId,
					line: candidates[i]!,
				});

				if (Number(queryField.fieldText) === Number("" + String(sublistValue))) {
					remainingCandidates.push(candidates[i]!);
					continue;
				}
			}
		}
		candidates = remainingCandidates;
	}

	return candidates;
}

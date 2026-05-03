import record from "N/record";

import { paramCommand } from "../../constants.js";
import { interpolate, documentationSection } from "../../html.js";
import { scriptDeployParam } from "../../url.js";
import { bulkRunnerScaffold } from "../../bulk-runner.js";
import { normalizeKey, splitAmpersand, splitVerticalBar, splitSlash } from "../../utils.js";
import { parseFieldAssignment } from "../../field-assignments.js";
import { getRecordType } from "../../record-types.js";
import recordDetailsPage from "../record-details/server.js";
import bulkRunnerJs from "../../client/bulk-runner.client.js?raw";
import templateHtml from "./template.html";


const commandName = "lookup-fields";


export default {
	name: "lookup-fields",
	label: "Lookup Fields",

	render(context) {
		return interpolate(templateHtml, {
			bulkRunnerJs,
			commandUrlJs: scriptDeployParam(context) + "&" + paramCommand + "=" + commandName,
			documentationHtml: documentationSection(`
				<h3>· For valid Record Types and Field IDs, see [${recordDetailsPage.label}] page (left menu)</h3>
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
			scaffoldHtml: bulkRunnerScaffold("Record Type|Internal ID|Location|Field ID"),
		});
	},

	commands: {
		[commandName]: handleLookupFields,
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


export function getSublistLine(rec, sublistId, sublistLineQuery) {
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


export function findSublistLines(rec, sublistId, sublistLineQuery) {
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

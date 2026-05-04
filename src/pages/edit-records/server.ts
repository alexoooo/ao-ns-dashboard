import record from "N/record";
import type {Record as NsRecord} from "N/record";

import {paramCommand} from "../../constants";
import {interpolate, documentationSection} from "../../html";
import {pageLink, taskInputFormatHelp} from "../../help";
import {scriptDeployParam} from "../../url";
import {normalizeKey, splitVerticalBar, splitSlash} from "../../utils";
import {parseFieldAssignmentList, type FieldAssignment} from "../../field-assignments";
import {getRecordType} from "../../record-types";
import {errorMessage} from "../../error-utils";
import {failure, success} from "../../command";
import {getSublistLine} from "../../server/sublist";
import {setRecordField, setSublistField, type Validator} from "../../server/field-setters";
import lookupFieldsPage from "../lookup-fields/server";
import templateHtml from "./template.html";
import type {CommandResponse, PageDef, SuiteletContext} from "../../types";

const commandName = "edit";
const actionSet = "set";
const actionInsertLine = "insert";
const actionRemoveLine = "remove";
const ignoreRecalcArg = normalizeKey("ignoreRecalc");

const editRecordsPage: PageDef = {
	name: "edit-records",
	label: "Edit Records",

	render(context: SuiteletContext): string {
		return interpolate(templateHtml, {
			commandUrl: scriptDeployParam(context) + "&" + paramCommand + "=" + commandName,
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
		[commandName]: handleEditRecord,
	},
};

export default editRecordsPage;

function handleEditRecord(context: SuiteletContext): CommandResponse<string[]> {
	const tabDelimitedRows = JSON.parse(context.request.body) as string[];
	const firstTabDelimitedRow = tabDelimitedRows[0] ?? "";
	const firstParts = splitVerticalBar(firstTabDelimitedRow);
	const recordType = getRecordType(firstParts[0] ?? "");
	const recordId = normalizeKey(firstParts[1] ?? "");

	const rec = record.load({type: recordType, id: recordId});

	const allValidators: Validator[][] = [];
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

	const reload = record.load({type: recordType, id: recordId});

	const messages: string[] = [];
	for (const validators of allValidators) {
		const actionMessages: string[] = [];
		for (const validator of validators) {
			try {
				actionMessages.push(validator(reload));
			} catch (e) {
				actionMessages.push(`Unable to validate: ${errorMessage(e)}`);
			}
		}
		messages.push(actionMessages.join(" | "));
	}

	return success(messages);
}

function handleEditRecordAction(
	rec: NsRecord,
	actionName: string,
	actionLocation: string,
	fieldValues: string
): Validator[] {
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

	const sublistId = normalizeKey(pathParts[0]!);
	const sublistIds = rec.getSublists();
	if (!sublistIds.includes(sublistId)) {
		throw new Error("Sublist not found: " + sublistId);
	}

	const sublistLineQuery = pathParts[1]!;

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

// Each entry: [originalTextOrValue, fieldId, isText].
type SublistLineFingerprint = [unknown, string, boolean];

function insertSublistLine(
	rec: NsRecord,
	sublistId: string,
	sublistLineQuery: string,
	fieldAssignments: FieldAssignment[]
): Validator[] {
	const count = rec.getLineCount({sublistId});
	const sublistLine =
		count === 0 && (sublistLineQuery === "0" || sublistLineQuery === "-0")
			? 0
			: getSublistLine(rec, sublistId, sublistLineQuery);
	const ignoreRecalc = getIgnoreCalcArgument(fieldAssignments, true);

	rec.insertLine({sublistId, line: sublistLine, ignoreRecalc});

	for (const fieldAssignment of fieldAssignments) {
		if (fieldAssignment.fieldId === ignoreRecalcArg) {
			continue;
		}
		setSublistField(rec, sublistId, "" + sublistLine, fieldAssignment.fieldId, fieldAssignment.fieldText);
	}

	const validationSublistFields = rec.getSublistFields({sublistId}).filter(i => !i.startsWith("sys_"));
	const sublistTextOrValues = validationSublistFields.map(fieldId =>
		getSublistTextOrValue(rec, sublistId, fieldId, sublistLine)
	);

	return [
		reload => {
			const foundAt: number[] = [];
			const lineCount = reload.getLineCount({sublistId});
			const allReloadSublistTextOrValues = [...Array(lineCount).keys()].map(line =>
				validationSublistFields.map(fieldId => {
					const original = sublistTextOrValues.find(i => i[1] === fieldId)!;
					const isText = original[2];
					return isText
						? reload.getSublistText({sublistId, fieldId, line})
						: reload.getSublistValue({sublistId, fieldId, line});
				})
			);

			for (let line = 0; line < lineCount; line++) {
				const reloadSublistTextOrValues = allReloadSublistTextOrValues[line]!;
				const allEqual = sublistTextOrValues.every(
					(val, idx) =>
						val[0] === "" || // appears to indicate missing
						JSON.stringify(val[0]) === JSON.stringify(reloadSublistTextOrValues[idx])
				);
				if (allEqual) {
					foundAt.push(line);
				}
			}
			return `Inserted at ${sublistLine} (found at ${foundAt.join(", ")})`;
		},
	];
}

function getSublistTextOrValue(
	rec: NsRecord,
	sublistId: string,
	fieldId: string,
	line: number
): SublistLineFingerprint {
	try {
		return [rec.getSublistText({sublistId, fieldId, line}), fieldId, true];
	} catch (e) {
		if (errorMessage(e).includes("must use getSublistValue")) {
			return [rec.getSublistValue({sublistId, fieldId, line}), fieldId, false];
		}
		throw e;
	}
}

function removeSublistLine(
	rec: NsRecord,
	sublistId: string,
	sublistLineQuery: string,
	fieldAssignments: FieldAssignment[]
): Validator {
	const sublistLine = getSublistLine(rec, sublistId, sublistLineQuery);
	const ignoreRecalc = getIgnoreCalcArgument(fieldAssignments, true);

	const validationSublistFields = rec.getSublistFields({sublistId}).filter(i => !i.startsWith("sys_"));
	const removedLineFingerprint = validationSublistFields.map(fieldId =>
		getSublistTextOrValue(rec, sublistId, fieldId, sublistLine)
	);

	rec.removeLine({sublistId, line: sublistLine, ignoreRecalc});

	return reload => {
		const foundAt: number[] = [];
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

function getIgnoreCalcArgument(fieldAssignments: FieldAssignment[], allowExtra: boolean): boolean {
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

	const raw = fieldAssignments[index]!.fieldText;
	const ignoreRecalcValueText = (typeof raw === "string" ? raw : raw.join(",")).toLowerCase();
	if (ignoreRecalcValueText === "true" || ignoreRecalcValueText === "false") {
		return ignoreRecalcValueText === "true";
	}
	throw new Error("Only true/false allowed for ignoreRecalc: " + ignoreRecalcValueText);
}

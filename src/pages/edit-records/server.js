import record from "N/record";

import { paramCommand } from "../../constants.js";
import { interpolate, documentationSection } from "../../html.js";
import { pageLink, taskInputFormatHelp } from "../../help.js";
import { scriptDeployParam } from "../../url.js";
import { normalizeKey, splitVerticalBar, splitSlash, listsEqual } from "../../utils.js";
import { parseFieldAssignmentList } from "../../field-assignments.js";
import { getRecordType } from "../../record-types.js";
import { getSublistLine } from "../lookup-fields/server.js";
import lookupFieldsPage from "../lookup-fields/server.js";
import templateHtml from "./template.html";


const commandName = "edit";
const actionSet = "set";
const actionInsertLine = "insert";
const actionRemoveLine = "remove";
const ignoreRecalcArg = normalizeKey("ignoreRecalc");


export default {
	name: "edit-records",
	label: "Edit Records",

	render(context) {
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


export function setRecordField(rec, fieldId, fieldText) {
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
		if (! listsEqual(asList, existingList)) {
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

	if (! listsEqual(asList, existingList)) {
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
		if (! listsEqual(asList, existingList)) {
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

	if (! listsEqual(asList, existingList)) {
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

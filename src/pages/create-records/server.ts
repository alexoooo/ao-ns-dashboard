import record from "N/record";
import type {Record as NsRecord, FieldValue} from "N/record";

import {paramCommand} from "../../constants";
import {interpolate, documentationSection} from "../../html";
import {pageLink, taskInputFormatHelp} from "../../help";
import {scriptDeployParam} from "../../url";
import {splitVerticalBar, listsEqual} from "../../utils";
import {parseFieldAssignmentList} from "../../field-assignments";
import {getRecordType} from "../../record-types";
import {errorMessage} from "../../error-utils";
import editRecordsPage, {setRecordField, type Validator} from "../edit-records/server";
import lookupFieldsPage from "../lookup-fields/server";
import templateHtml from "./template.html";
import type {PageDef, SuiteletContext} from "../../types";

const commandName = "create";

const createRecordsPage: PageDef = {
	name: "create-records",
	label: "Create Records",

	render(context: SuiteletContext): string {
		return interpolate(templateHtml, {
			commandUrl: scriptDeployParam(context) + "&" + paramCommand + "=" + commandName,
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
		[commandName]: handleCreateRecord,
	},
};

export default createRecordsPage;

function handleCreateRecord(context: SuiteletContext): string {
	let recordId: number | undefined;
	try {
		const tabDelimitedRows = JSON.parse(context.request.body) as string[];
		const firstTabDelimitedRow = tabDelimitedRows[0] ?? "";
		const firstParts = splitVerticalBar(firstTabDelimitedRow);
		const recordType = getRecordType(firstParts[0] ?? "");
		const defaultFieldValues = parseFieldAssignmentList(firstParts[1] ?? "");
		const fieldValues = parseFieldAssignmentList(firstParts[2] ?? "");

		const allValidators: Validator[] = [];

		const defaultValues: Record<string, unknown> = {};

		const rec = record.create({
			type: recordType,
			defaultValues,
		});

		for (const fieldValue of defaultFieldValues) {
			const validator = setDefaultRecordField(rec, fieldValue.fieldId, fieldValue.fieldText);
			allValidators.push(validator);
		}

		recordId = rec.save({});

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

		const messages: string[] = [];
		for (const validator of allValidators) {
			try {
				messages.push(validator(reload));
			} catch (e) {
				messages.push(`Unable to validate: ${errorMessage(e)}`);
			}
		}

		return JSON.stringify([`Internal ID: ${recordId} | ${messages.join(" | ")}`]);
	} catch (e) {
		const prefix = recordId == null ? "Error: " : `Error after creating Internal ID ${recordId}: `;
		return JSON.stringify([prefix + errorMessage(e)]);
	}
}

function setDefaultRecordField(rec: NsRecord, fieldId: string, fieldText: string | string[]): Validator {
	const field = rec.getField({fieldId});
	if (field == null) {
		throw new Error("Field not found: " + fieldId);
	}
	if (field.type === "select" || field.type === "multiselect") {
		return setDefaultRecordSelect(rec, fieldId, fieldText, field.type === "multiselect");
	}

	if (Array.isArray(fieldText)) {
		throw new Error("Single value expected (" + fieldId + "): " + fieldText.join(","));
	}

	rec.setText({
		fieldId,
		text: fieldText,
	});

	return reload => {
		const afterSaveRaw = reload.getText({fieldId});
		const afterSave = Array.isArray(afterSaveRaw) ? afterSaveRaw.join(",") : afterSaveRaw;
		return afterSave === fieldText
			? `Default ${fieldId} to '${fieldText}'`
			: `Unexpected ${fieldId} default, tried '${fieldText}' but got '${afterSave}'`;
	};
}

function setDefaultRecordSelect(
	rec: NsRecord,
	fieldId: string,
	fieldText: string | string[],
	multi: boolean
): Validator {
	const asList = Array.isArray(fieldText) ? fieldText : [fieldText];
	if (!multi && asList.length > 1) {
		throw new Error("Single value expected (" + fieldId + "): " + asList.join(","));
	}

	const allIds = asList.every(i => /^-?\d+$/.test(i.trim()));
	const someIds = asList.some(i => /^-?\d+$/.test(i.trim()));
	if (someIds && !allIds) {
		throw new Error("All must be text or all must be IDs (" + fieldId + "): " + asList.join(","));
	}

	const renderedFieldText = typeof fieldText === "string" ? fieldText : fieldText.join(",");

	if (allIds) {
		const fieldValues = asList.map(i => parseInt(i));
		rec.setValue({
			fieldId,
			value: (multi ? fieldValues : fieldValues[0]) as FieldValue,
		});
		return reload => {
			const afterSave = reload.getValue({fieldId});
			const afterSaveList = Array.isArray(afterSave) ? (afterSave as unknown[]) : [afterSave];
			return listsEqual(asList, afterSaveList)
				? `Default ${fieldId} to '${renderedFieldText}'`
				: `Unexpected ${fieldId} default, tried '${renderedFieldText}' but got '${String(afterSave)}'`;
		};
	}

	rec.setText({
		fieldId,
		text: (multi ? asList : asList[0]) as string,
	});

	return reload => {
		const afterSave = reload.getText({fieldId});
		const afterSaveList = Array.isArray(afterSave) ? afterSave : [afterSave];
		return listsEqual(asList, afterSaveList)
			? `Default ${fieldId} to '${renderedFieldText}'`
			: `Unexpected ${fieldId} default, tried '${renderedFieldText}' but got '${String(afterSave)}'`;
	};
}

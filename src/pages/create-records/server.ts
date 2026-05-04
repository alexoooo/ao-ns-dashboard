import record from "N/record";

import {paramCommand} from "../../constants";
import {interpolate, documentationSection} from "../../html";
import {pageLink, taskInputFormatHelp} from "../../help";
import {scriptDeployParam} from "../../url";
import {splitVerticalBar} from "../../utils";
import {parseFieldAssignmentList} from "../../field-assignments";
import {getRecordType} from "../../record-types";
import {errorMessage} from "../../error-utils";
import {failure, success} from "../../command";
import {setRecordField, setRecordFieldDefault, type Validator} from "../../server/field-setters";
import editRecordsPage from "../edit-records/server";
import lookupFieldsPage from "../lookup-fields/server";
import templateHtml from "./template.html";
import type {CommandResponse, PageDef, SuiteletContext} from "../../types";

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

function handleCreateRecord(context: SuiteletContext): CommandResponse<string[]> {
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

		const rec = record.create({type: recordType, defaultValues});

		for (const fieldValue of defaultFieldValues) {
			allValidators.push(setRecordFieldDefault(rec, fieldValue.fieldId, fieldValue.fieldText));
		}

		recordId = rec.save({});

		const loaded = record.load({type: recordType, id: recordId});

		for (const fieldValue of fieldValues) {
			allValidators.push(setRecordField(loaded, fieldValue.fieldId, fieldValue.fieldText));
		}

		loaded.save({});

		const reload = record.load({type: recordType, id: recordId});

		const messages: string[] = [];
		for (const validator of allValidators) {
			try {
				messages.push(validator(reload));
			} catch (e) {
				messages.push(`Unable to validate: ${errorMessage(e)}`);
			}
		}

		return success([`Internal ID: ${recordId} | ${messages.join(" | ")}`]);
	} catch (e) {
		const prefix = recordId == null ? "" : `after creating Internal ID ${recordId}: `;
		return failure(prefix + errorMessage(e));
	}
}

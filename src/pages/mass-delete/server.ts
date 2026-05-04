import record from "N/record";

import {paramCommand} from "../../constants";
import {interpolate, documentationSection} from "../../html";
import {pageLink, taskInputFormatHelp} from "../../help";
import {scriptDeployParam} from "../../url";
import {normalizeKey, splitVerticalBar} from "../../utils";
import {getRecordType} from "../../record-types";
import {errorMessage, errorName} from "../../error-utils";
import {failure, success} from "../../command";
import lookupFieldsPage from "../lookup-fields/server";
import templateHtml from "./template.html";
import type {CommandResponse, PageDef, SuiteletContext} from "../../types";

const commandName = "mass-delete";

const massDeletePage: PageDef = {
	name: "mass-delete",
	label: "Mass Delete (DANGER!)",

	render(context: SuiteletContext): string {
		return interpolate(templateHtml, {
			commandUrl: scriptDeployParam(context) + "&" + paramCommand + "=" + commandName,
			documentationHtml: documentationSection(`
				<p style="color: #b00"><strong>Warning:</strong> deletion is permanent and cannot be undone from this page. Verify your input list before running.</p>
				<ul>
					<li>For Record Type / Internal ID, see ${pageLink(context, lookupFieldsPage)}.</li>
					<li>Each line is a single record to delete, identified by Record Type and Internal ID.</li>
					<li>The page reloads the record after the delete to confirm it is gone &mdash; the result line will say "Delete successful" on success or surface the error otherwise.</li>
				</ul>
				${taskInputFormatHelp()}
			`),
		});
	},

	commands: {
		[commandName]: handleMassDelete,
	},
};

export default massDeletePage;

function handleMassDelete(context: SuiteletContext): CommandResponse<string[]> {
	const tabDelimitedRows = JSON.parse(context.request.body) as string[];
	const firstTabDelimitedRow = tabDelimitedRows[0] ?? "";
	const firstParts = splitVerticalBar(firstTabDelimitedRow);
	const recordType = getRecordType(firstParts[0] ?? "");
	const recordId = normalizeKey(firstParts[1] ?? "");

	if (!recordType) {
		return failure("Record Type not specified");
	}
	if (!recordId) {
		return failure("Internal ID not specified");
	}

	let loadMessageSuffix = "";
	try {
		record.load({type: recordType, id: recordId});
	} catch (e) {
		const name = errorName(e);
		if (name === "RCRD_DSNT_EXIST") {
			return success(["Does not exist"]);
		}
		if (name === "INVALID_RCRD_TYPE") {
			return failure(`record type ${recordType} does not exist`, name);
		}
		loadMessageSuffix = " | Load error: " + name + " - " + errorMessage(e);
	}

	try {
		record.delete({type: recordType, id: recordId});
	} catch (e) {
		return failure(`Delete error: ${errorMessage(e)}${loadMessageSuffix}`, errorName(e));
	}

	try {
		record.load({type: recordType, id: recordId});
		return success([`Delete failed${loadMessageSuffix}`]);
	} catch (e) {
		if (errorName(e) === "RCRD_DSNT_EXIST") {
			return success([`Delete successful${loadMessageSuffix}`]);
		}
		return failure(`Delete error${loadMessageSuffix} | Reload error: ${errorMessage(e)}`, errorName(e));
	}
}

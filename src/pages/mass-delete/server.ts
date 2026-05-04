import record from "N/record";

import {paramCommand} from "../../constants";
import {interpolate, documentationSection} from "../../html";
import {pageLink, taskInputFormatHelp} from "../../help";
import {scriptDeployParam} from "../../url";
import {normalizeKey, splitVerticalBar} from "../../utils";
import {getRecordType} from "../../record-types";
import {errorMessage, errorName} from "../../error-utils";
import lookupFieldsPage from "../lookup-fields/server";
import templateHtml from "./template.html";
import type {PageDef, SuiteletContext} from "../../types";

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

function handleMassDelete(context: SuiteletContext): string {
	const tabDelimitedRows = JSON.parse(context.request.body) as string[];
	const firstTabDelimitedRow = tabDelimitedRows[0] ?? "";
	const firstParts = splitVerticalBar(firstTabDelimitedRow);
	const recordType = getRecordType(firstParts[0] ?? "");
	const recordId = normalizeKey(firstParts[1] ?? "");

	if (!recordType) {
		return `["Record Type not specified"]`;
	}
	if (!recordId) {
		return `["Internal ID not specified"]`;
	}

	let loadMessageSuffix = "";
	try {
		record.load({
			type: recordType,
			id: recordId,
		});
	} catch (e) {
		const name = errorName(e);
		if (name === "RCRD_DSNT_EXIST") {
			return `["Does not exist"]`;
		} else if (name === "INVALID_RCRD_TYPE") {
			return `["Error: record type ${recordType} does not exist"]`;
		} else {
			loadMessageSuffix = " | Load error: " + name + " - " + errorMessage(e);
		}
	}

	try {
		record.delete({
			type: recordType,
			id: recordId,
		});
	} catch (e) {
		return `["Delete error: ${errorMessage(e)}${loadMessageSuffix}"]`;
	}

	try {
		record.load({
			type: recordType,
			id: recordId,
		});
		return `["Delete failed${loadMessageSuffix}"]`;
	} catch (e) {
		if (errorName(e) === "RCRD_DSNT_EXIST") {
			return `["Delete successful${loadMessageSuffix}"]`;
		}
		return `["Delete error${loadMessageSuffix} | Reload error: ${errorMessage(e)}"]`;
	}
}

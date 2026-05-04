import record from "N/record";

import { paramCommand } from "../../constants.js";
import { interpolate, documentationSection } from "../../html.js";
import { scriptDeployParam } from "../../url.js";
import { normalizeKey, splitVerticalBar } from "../../utils.js";
import { getRecordType } from "../../record-types.js";
import lookupFieldsPage from "../lookup-fields/server.js";
import templateHtml from "./template.html";


const commandName = "mass-delete";


export default {
	name: "mass-delete",
	label: "Mass Delete (DANGER!)",

	render(context) {
		return interpolate(templateHtml, {
			commandUrl: scriptDeployParam(context) + "&" + paramCommand + "=" + commandName,
			documentationHtml: documentationSection(`
				<h3>· DELETE each Record by Record Type/Internal ID, see [${lookupFieldsPage.label}] page (left menu)</h3>
			`),
		});
	},

	commands: {
		[commandName]: handleMassDelete,
	},
};


function handleMassDelete(context) {
	const tabDelimitedRows = JSON.parse(context.request.body);
	const firstTabDelimitedRow = tabDelimitedRows[0];
	const firstParts = splitVerticalBar(firstTabDelimitedRow);
	const recordType = getRecordType(firstParts[0]);
	const recordId = normalizeKey(firstParts[1] || "");

	if (! recordType) {
		return `["Record Type not specified"]`;
	}
	if (! recordId) {
		return `["Internal ID not specified"]`;
	}

	let loadMessageSuffix = "";
	try {
		record.load({
			type: recordType,
			id: recordId,
		});
	}
	catch (e) {
		if (e.name === "RCRD_DSNT_EXIST") {
			return `["Does not exist"]`;
		}
		else if (e.name === "INVALID_RCRD_TYPE") {
			return `["Error: record type ${recordType} does not exist"]`;
		}
		else {
			loadMessageSuffix = " | Load error: " + e.name + " - " + e.message;
		}
	}

	try {
		record.delete({
			type: recordType,
			id: recordId,
		});
	}
	catch (e) {
		return `["Delete error: ${e.message}${loadMessageSuffix}"]`;
	}

	try {
		record.load({
			type: recordType,
			id: recordId,
		});
		return `["Delete failed${loadMessageSuffix}"]`;
	}
	catch (e) {
		if (e.name === "RCRD_DSNT_EXIST") {
			return `["Delete successful${loadMessageSuffix}"]`;
		}
		else {
			return `["Delete error${loadMessageSuffix} | Reload error: ${e.message}"]`;
		}
	}
}

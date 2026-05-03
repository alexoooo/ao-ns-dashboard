import record from "N/record";

import { paramCommand } from "../../constants.js";
import { interpolate, documentationSection } from "../../html.js";
import { scriptDeployParam } from "../../url.js";
import { bulkRunnerScaffold } from "../../bulk-runner.js";
import { normalizeKey, splitVerticalBar } from "../../utils.js";
import { getRecordType } from "../../record-types.js";
import lookupFieldsPage from "../lookup-fields/server.js";
import bulkRunnerJs from "../../client/bulk-runner.client.js?raw";
import templateHtml from "./template.html";


const commandName = "mass-save";


export default {
	name: "mass-save",
	label: "Mass Edit/Save",

	render(context) {
		return interpolate(templateHtml, {
			bulkRunnerJs,
			commandUrlJs: scriptDeployParam(context) + "&" + paramCommand + "=" + commandName,
			documentationHtml: documentationSection(`
				<h3>· For Record Type/Internal ID, see [${lookupFieldsPage.label}] page (left menu)</h3>
				<h2>· Each Record by Internal ID:</h2>
				<h2>&nbsp; &nbsp; 1) EDIT Record (load)</h2>
				<h2>&nbsp; &nbsp; 2) SAVE Record</h2>
				<h2>· Result: trigger any associated events (e.g. run workflows)</h2>
			`),
			scaffoldHtml: bulkRunnerScaffold("Record Type|Internal ID"),
		});
	},

	commands: {
		[commandName]: handleMassSave,
	},
};


function handleMassSave(context) {
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

	const rec = record.load({
		type: recordType,
		id: recordId,
	});
	rec.save({});

	return `["Edit/Save"]`;
}

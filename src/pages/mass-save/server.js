import record from "N/record";

import { paramCommand } from "../../constants.js";
import { interpolate, documentationSection } from "../../html.js";
import { pageLink, taskInputFormatHelp } from "../../help.js";
import { scriptDeployParam } from "../../url.js";
import { normalizeKey, splitVerticalBar } from "../../utils.js";
import { getRecordType } from "../../record-types.js";
import lookupFieldsPage from "../lookup-fields/server.js";
import templateHtml from "./template.html";


const commandName = "mass-save";


export default {
	name: "mass-save",
	label: "Mass Edit/Save",

	render(context) {
		return interpolate(templateHtml, {
			commandUrl: scriptDeployParam(context) + "&" + paramCommand + "=" + commandName,
			documentationHtml: documentationSection(`
				<ul>
					<li>For Record Type / Internal ID, see ${pageLink(context, lookupFieldsPage)}.</li>
					<li>For each record listed, the page loads it and saves it without modification:
						<ol>
							<li>Load the record.</li>
							<li>Save the record.</li>
						</ol>
					</li>
					<li>The save triggers any associated events (e.g. workflows). Use this to retroactively re-run automation.</li>
				</ul>
				${taskInputFormatHelp()}
			`),
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

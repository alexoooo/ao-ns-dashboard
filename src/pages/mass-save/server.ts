import record from "N/record";

import {paramCommand} from "../../app/constants";
import {interpolate, documentationSection} from "../../lib/html";
import {pageLink, taskInputFormatHelp} from "../../lib/help";
import {scriptDeployParam} from "../../lib/url";
import {normalizeKey, splitVerticalBar} from "../../lib/utils";
import {getRecordType} from "../../server/record-types";
import {failure, success} from "../../app/command";
import lookupFieldsPage from "../lookup-fields/server";
import templateHtml from "./template.html";
import type {CommandResponse, PageDef, SuiteletContext} from "../../app/types";

const commandName = "mass-save";

const massSavePage: PageDef = {
	name: "mass-save",
	label: "Mass Edit/Save",

	render(context: SuiteletContext): string {
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

export default massSavePage;

function handleMassSave(context: SuiteletContext): CommandResponse<string[]> {
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

	const rec = record.load({type: recordType, id: recordId});
	rec.save({});

	return success(["Edit/Save"]);
}

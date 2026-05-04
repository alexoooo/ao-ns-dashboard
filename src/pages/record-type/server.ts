import record from "N/record";
import search from "N/search";

import {paramCommand, paramRecordId} from "../../constants";
import {interpolate, documentationSection} from "../../html";
import {scriptDeployParam} from "../../url";
import {allRecordTypes, undocumentedRecordTypes, getRecordType} from "../../record-types";
import {errorMessage} from "../../error-utils";
import templateHtml from "./template.html";
import type {PageDef, SuiteletContext} from "../../types";

const commandName = "record-type";

const recordTypePage: PageDef = {
	name: "record-type",
	label: "Detect Record Type",

	render(context: SuiteletContext): string {
		const all = allRecordTypes();
		const defaultTasks = Object.keys(all)
			.map(type =>
				type
					.split("_")
					.map(i => i[0]! + i.substring(1).toLowerCase())
					.join(" ")
			)
			.join("\n");

		return interpolate(templateHtml, {
			commandPrefix: scriptDeployParam(context) + "&" + paramCommand + "=" + commandName,
			paramRecordId,
			documentationHtml: documentationSection(`
				<ul>
					<li>Record Type names here may differ from what NetSuite shows in its UI &mdash; e.g. NetSuite "Customer Payment" is just <code>Payment</code> here.</li>
					<li>The same Internal ID can exist under multiple Record Types &mdash; results show every type the ID was found under.</li>
					<li>Undocumented Record Types currently mapped: ${Object.keys(undocumentedRecordTypes)
						.map(k => `<code>${k}</code>`)
						.join(", ")}.</li>
					<li>Custom Record Types are not auto-populated in the input but can be typed in manually below.</li>
				</ul>
			`),
			defaultTasks,
			defaultPageCount: Object.keys(all).length,
		});
	},

	commands: {
		[commandName]: handleTypeListing,
	},
};

export default recordTypePage;

function handleTypeListing(context: SuiteletContext): string {
	const recordTypes = JSON.parse(context.request.body) as string[];
	const recordTypeName = recordTypes[0];
	if (!recordTypeName) {
		return "Record Type not specified";
	}

	const recordId = context.request.parameters[paramRecordId] as string | undefined;
	if (!recordId) {
		return "Record ID not specified";
	}

	const recordType = getRecordType(recordTypeName);

	const canBeInternal = /^-?\d+$/.test(recordId.trim());
	let internalMessage: string;
	if (canBeInternal) {
		try {
			record.load({
				type: recordType,
				id: recordId,
			});
			internalMessage = "*** Internal ID found";
		} catch (e) {
			internalMessage = "Internal ID not found: " + errorMessage(e);
		}
	} else {
		internalMessage = "Internal ID invalid";
	}

	let externalMessage: string;
	try {
		const externalIdSearch = search.create({
			type: recordType,
			filters: [
				search.createFilter({
					name: "externalid",
					operator: search.Operator.IS,
					values: recordId,
				}),
			],
			columns: [],
		});

		const searchResults = externalIdSearch.run().getRange({start: 0, end: 1});
		if (searchResults.length > 0) {
			const internalId = searchResults[0]!.id;
			externalMessage = "*** External ID found, with Internal ID = " + internalId;
		} else {
			externalMessage = "External ID not found";
		}
	} catch (e) {
		externalMessage = "External ID not found: " + errorMessage(e);
	}

	const message = internalMessage + " | " + externalMessage;
	return JSON.stringify([message]);
}

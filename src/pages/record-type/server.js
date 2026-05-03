import record from "N/record";
import search from "N/search";

import { paramCommand, paramRecordId } from "../../constants.js";
import { interpolate, documentationSection } from "../../html.js";
import { scriptDeployParam } from "../../url.js";
import { bulkRunnerScaffold } from "../../bulk-runner.js";
import {
	allRecordTypes,
	undocumentedRecordTypes,
	getRecordType,
} from "../../record-types.js";
import bulkRunnerJs from "../../client/bulk-runner.client.js?raw";
import templateHtml from "./template.html";


const commandName = "record-type";


export default {
	name: "record-type",
	label: "Detect Record Type",

	render(context) {
		const all = allRecordTypes();
		const recordTypeNamesJs = Object.keys(all)
			.map(type => type.split("_").map(i => i[0] + i.substring(1).toLowerCase()).join(" "))
			.join("\\n");

		return interpolate(templateHtml, {
			bulkRunnerJs,
			commandPrefixJs: scriptDeployParam(context) + "&" + paramCommand + "=" + commandName,
			paramRecordId,
			paramRecordIdJs: paramRecordId,
			documentationHtml: documentationSection(`
				<h3>· Record Types in NetSuite pages may differ from what they are called here:</h3>
				<h4>&nbsp; &nbsp; · "Payment" is "Customer Payment"</h4>
				<h3>· The same Internal ID can exist in multiple Record Types</h3>
				<h3>· Some Record Types are undocumented: ${Object.keys(undocumentedRecordTypes).join(", ")}</h3>
				<h3>· Custom Record Types are not automatically populated, but you can manually type them in below</h3>
			`),
			scaffoldHtml: bulkRunnerScaffold("Record Type"),
			recordTypeCountJs: Object.keys(all).length,
			recordTypeNamesJs,
		});
	},

	commands: {
		[commandName]: handleTypeListing,
	},
};


function handleTypeListing(context) {
	const recordTypes = JSON.parse(context.request.body);
	const recordTypeName = recordTypes[0];
	if (! recordTypeName) {
		return "Record Type not specified";
	}

	const recordId = context.request.parameters[paramRecordId];
	if (! recordId) {
		return "Record ID not specified";
	}

	const recordType = getRecordType(recordTypeName);

	const canBeInternal = /^-?\d+$/.test(recordId.trim());
	let internalMessage;
	if (canBeInternal) {
		try {
			record.load({
				type: recordType,
				id: recordId,
			});
			internalMessage = "*** Internal ID found";
		}
		catch (e) {
			internalMessage = "Internal ID not found: " + e.message;
		}
	}
	else {
		internalMessage = "Internal ID invalid";
	}

	let externalMessage;
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

		const searchResults = externalIdSearch.run().getRange({ start: 0, end: 1 });
		if (searchResults.length > 0) {
			const internalId = searchResults[0].id;
			externalMessage = "*** External ID found, with Internal ID = " + internalId;
		}
		else {
			externalMessage = "External ID not found";
		}
	}
	catch (e) {
		externalMessage = "External ID not found: " + e.message;
	}

	const message = internalMessage + " | " + externalMessage;
	return JSON.stringify([message]);
}

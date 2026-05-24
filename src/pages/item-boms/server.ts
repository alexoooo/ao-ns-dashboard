import search from "N/search";

import {interpolate, documentationSection, escapeHtml} from "../../lib/html";
import {errorMessage} from "../../lib/error-utils";
import templateHtml from "./template.html";
import type {PageDef, SuiteletContext} from "../../app/types";

const paramItem = "item";

const itemBomsPage: PageDef = {
	name: "item-boms",
	label: "Item BOMs",

	render(context: SuiteletContext): string {
		const itemNumber = ((context.request.parameters[paramItem] as string | undefined) ?? "").trim();

		const resultHtml = itemNumber === "" ? "" : existenceResult(itemNumber);

		return interpolate(templateHtml, {
			documentationHtml: documentationSection(`
				<ul>
					<li>Enter an <strong>Item Name/Number</strong> (the human-readable code, e.g. <code>ABC-123</code>) and click <strong>Check</strong> to see whether it exists.</li>
					<li>Any item type is accepted &mdash; the result reports the matched item type and Internal ID.</li>
					<li>BOM details for the matched item will be added in a later iteration.</li>
				</ul>
			`),
			paramItem,
			itemNumber,
			resultHtml,
		});
	},
};

export default itemBomsPage;

function existenceResult(itemNumber: string): string {
	let matches: {internalId: string; itemType: string}[];
	try {
		matches = searchByItemId(itemNumber);
	} catch (e) {
		return `<h3 style="color: red">Error: ${escapeHtml(errorMessage(e))}</h3>`;
	}

	if (matches.length === 0) {
		return `<h3>Item not found: <code>${escapeHtml(itemNumber)}</code></h3>`;
	}

	if (matches.length === 1) {
		const m = matches[0]!;
		return `<h3 style="color: green">Found <code>${escapeHtml(itemNumber)}</code> &mdash; ${escapeHtml(m.itemType)}, Internal ID = ${escapeHtml(m.internalId)}</h3>`;
	}

	const rows = matches
		.map(m => `<li>${escapeHtml(m.itemType)} &mdash; Internal ID = ${escapeHtml(m.internalId)}</li>`)
		.join("");
	return `<h3>Multiple matches for <code>${escapeHtml(itemNumber)}</code>:</h3><ul>${rows}</ul>`;
}

function searchByItemId(itemNumber: string): {internalId: string; itemType: string}[] {
	const itemSearch = search.create({
		type: search.Type.ITEM,
		filters: [
			search.createFilter({
				name: "itemid",
				operator: search.Operator.IS,
				values: itemNumber,
			}),
		],
		columns: [search.createColumn({name: "internalid"}), search.createColumn({name: "type"})],
	});

	const results = itemSearch.run().getRange({start: 0, end: 10}) ?? [];
	return results.map(r => ({
		internalId: String(r.getValue({name: "internalid"})),
		itemType: r.getText({name: "type"}) || String(r.getValue({name: "type"})),
	}));
}

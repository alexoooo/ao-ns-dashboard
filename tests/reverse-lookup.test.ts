import {describe, expect, it} from "vitest";

import {
	findStableIdentifierMatches,
	normalizeFolderPath,
	parseNetSuiteUrl,
	parseReverseLookupInput,
	targetKey,
} from "../src/lib/reverse-lookup";

describe("reverse lookup input", () => {
	it("parses a File Cabinet URL", () => {
		expect(parseNetSuiteUrl("https://example.app.netsuite.com/app/common/media/mediaitem.nl?id=42")).toEqual({
			type: "file",
			id: "42",
		});
	});

	it("parses a Script URL without browser URL globals", () => {
		expect(parseNetSuiteUrl("https://8224612-sb2.app.netsuite.com/app/common/scripting/script.nl?id=2600")).toEqual(
			{
				type: "script",
				id: "2600",
			}
		);
	});

	it("parses the Script Deployment record route", () => {
		expect(parseNetSuiteUrl("/app/common/scripting/scriptrecord.nl?id=2748")).toEqual({
			type: "scriptdeployment",
			id: "2748",
		});
	});

	it("parses a Suitelet URL as its deployment", () => {
		expect(parseNetSuiteUrl("/app/site/hosting/scriptlet.nl?script=123&deploy=customdeploy_example")).toEqual({
			type: "scriptdeployment",
			id: "customdeploy_example",
			parentScriptId: "123",
		});
	});

	it("parses a Saved Search results URL", () => {
		expect(parseNetSuiteUrl("/app/common/search/searchresults.nl?searchid=customsearch_orders")).toEqual({
			type: "savedsearch",
			id: "customsearch_orders",
		});
	});

	it("uses rectype for custom record URLs", () => {
		expect(parseNetSuiteUrl("/app/common/custom/custrecordentry.nl?rectype=456&id=8")).toEqual({
			type: "456",
			id: "8",
		});
	});

	it("requires a type for an unknown route", () => {
		expect(() => parseNetSuiteUrl("/app/example/unknown.nl?id=8")).toThrow(/type is ambiguous/i);
	});

	it("gives a supplied URL precedence over type and ID", () => {
		expect(
			parseReverseLookupInput({
				url: "/app/common/entity/vendor.nl?id=91",
				type: "customer",
				id: "22",
			})
		).toEqual({type: "vendor", id: "91"});
	});

	it("builds normalized target keys", () => {
		expect(targetKey("Saved Search", "CUSTOMSEARCH_Example")).toBe("savedsearch:customsearch_example");
		expect(targetKey("customrecord_my_type", "7")).toBe("customrecord_my_type:7");
	});
});

describe("source scanning", () => {
	it("normalizes a recursive folder path", () => {
		expect(normalizeFolderPath(" /SuiteScripts\\ao// ")).toBe("SuiteScripts/ao");
	});

	it("rejects traversal segments", () => {
		expect(() => normalizeFolderPath("SuiteScripts/../secret")).toThrow(/cannot contain/i);
	});

	it("matches stable IDs on token boundaries", () => {
		const source = [
			'const wanted = "customsearch_orders";',
			'const notWanted = "xcustomsearch_orders_more";',
			'search.load({id: "CUSTOMSEARCH_ORDERS"});',
		].join("\n");
		expect(findStableIdentifierMatches(source, "customsearch_orders")).toEqual([
			{line: 1, excerpt: 'const wanted = "customsearch_orders";'},
			{line: 3, excerpt: 'search.load({id: "CUSTOMSEARCH_ORDERS"});'},
		]);
	});

	it("matches exact File Cabinet paths and ignores numeric IDs", () => {
		const source = 'file.load({id: "/SuiteScripts/ao/task.js"});';
		expect(findStableIdentifierMatches(source, "/SuiteScripts/ao/task.js")).toHaveLength(1);
		expect(findStableIdentifierMatches(source, "123")).toEqual([]);
	});
});

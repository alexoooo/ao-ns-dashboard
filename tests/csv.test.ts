import {describe, it, expect} from "vitest";
import {csvEncode} from "../src/client/csv.client";

describe("csvEncode", () => {
	it("passes plain strings through", () => {
		expect(csvEncode("hello")).toBe("hello");
	});

	it("returns empty for null and undefined", () => {
		expect(csvEncode(null)).toBe("");
		expect(csvEncode(undefined)).toBe("");
	});

	it("doubles embedded double-quotes so the caller can wrap the cell", () => {
		expect(csvEncode('say "hi"')).toBe('say ""hi""');
	});

	it("prefixes formula-injection characters with an apostrophe", () => {
		expect(csvEncode("=SUM(A1)")).toBe("'=SUM(A1)");
		expect(csvEncode("+1")).toBe("'+1");
		expect(csvEncode("@foo")).toBe("'@foo");
		expect(csvEncode("-lookup")).toBe("'-lookup");
	});

	it("leaves plain negative numbers unquoted", () => {
		expect(csvEncode(-5)).toBe("-5");
		expect(csvEncode(-1.25)).toBe("-1.25");
	});

	it("still guards a negative number supplied as a string", () => {
		expect(csvEncode("-5")).toBe("'-5");
	});

	it("stringifies booleans", () => {
		expect(csvEncode(true)).toBe("true");
		expect(csvEncode(false)).toBe("false");
	});

	// SuiteQL columns can come back as bigint, which JSON.stringify throws on.
	it("stringifies bigints without throwing", () => {
		expect(csvEncode(9007199254740993n)).toBe("9007199254740993");
		expect(csvEncode(-42n)).toBe("-42");
	});

	it("JSON-encodes objects and arrays", () => {
		expect(csvEncode({a: 1})).toBe('{""a"":1}');
		expect(csvEncode([1, 2])).toBe("[1,2]");
	});
});

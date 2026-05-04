import {describe, it, expect} from "vitest";
import {parseFieldAssignment, parseFieldAssignmentList} from "../src/field-assignments";

describe("parseFieldAssignment", () => {
	it("splits on first =", () => {
		expect(parseFieldAssignment("memo=hello")).toEqual({fieldId: "memo", fieldText: "hello"});
	});
	it("preserves further = in the value", () => {
		expect(parseFieldAssignment("eq=a=b=c")).toEqual({fieldId: "eq", fieldText: "a=b=c"});
	});
	it("normalizes the fieldId (lowercase, strip non-alphanum)", () => {
		expect(parseFieldAssignment("Memo Foo=hi")).toEqual({fieldId: "memofoo", fieldText: "hi"});
	});
	it("throws when no = is present", () => {
		expect(() => parseFieldAssignment("noequals")).toThrow(/Field assignment expected/);
	});
});

describe("parseFieldAssignmentList", () => {
	it("returns [] for empty string", () => {
		expect(parseFieldAssignmentList("")).toEqual([]);
	});
	it("parses single assignment", () => {
		expect(parseFieldAssignmentList("memo=hi")).toEqual([{fieldId: "memo", fieldText: "hi"}]);
	});
	it("parses multiple distinct assignments", () => {
		expect(parseFieldAssignmentList("a=1&b=2")).toEqual([
			{fieldId: "a", fieldText: "1"},
			{fieldId: "b", fieldText: "2"},
		]);
	});
	it("groups duplicate fieldIds into multi-value (multiselect)", () => {
		expect(parseFieldAssignmentList("tag=red&tag=blue")).toEqual([{fieldId: "tag", fieldText: ["red", "blue"]}]);
	});
	it("respects \\& escapes inside values", () => {
		expect(parseFieldAssignmentList("memo=Acme \\& Co.")).toEqual([{fieldId: "memo", fieldText: "Acme & Co."}]);
	});
});

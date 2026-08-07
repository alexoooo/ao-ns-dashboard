import {describe, it, expect} from "vitest";
import {normalizeSelectInput, validateSetField} from "../src/server/field-setters";

describe("normalizeSelectInput", () => {
	it("classifies an all-digit value as an internal ID", () => {
		expect(normalizeSelectInput("dept", "12", false)).toEqual({
			kind: "ids",
			asList: ["12"],
			fieldValues: [12],
		});
	});

	it("classifies a negative all-digit value as an internal ID", () => {
		expect(normalizeSelectInput("dept", "-1", false)).toEqual({
			kind: "ids",
			asList: ["-1"],
			fieldValues: [-1],
		});
	});

	it("classifies a non-numeric value as display text", () => {
		expect(normalizeSelectInput("dept", "Sales", false)).toEqual({kind: "text", asList: ["Sales"]});
	});

	it("trims surrounding whitespace from text", () => {
		expect(normalizeSelectInput("dept", " Sales ", false)).toEqual({kind: "text", asList: ["Sales"]});
	});

	it("trims surrounding whitespace from IDs", () => {
		expect(normalizeSelectInput("dept", " 12 ", false)).toEqual({
			kind: "ids",
			asList: ["12"],
			fieldValues: [12],
		});
	});

	it("trims every entry of a multiselect list", () => {
		expect(normalizeSelectInput("dept", [" Sales", "Support "], true)).toEqual({
			kind: "text",
			asList: ["Sales", "Support"],
		});
	});

	it("treats a whitespace-padded numeric list as IDs", () => {
		expect(normalizeSelectInput("dept", [" 1", "2 "], true)).toEqual({
			kind: "ids",
			asList: ["1", "2"],
			fieldValues: [1, 2],
		});
	});

	it("rejects a mix of IDs and text", () => {
		expect(() => normalizeSelectInput("dept", ["Sales", "3"], true)).toThrow(
			"All must be text or all must be IDs (dept): Sales,3"
		);
	});

	it("rejects multiple values on a single-select field", () => {
		expect(() => normalizeSelectInput("dept", ["Sales", "Support"], false)).toThrow(
			"Single value expected (dept): Sales,Support"
		);
	});

	it("keeps text that only looks numeric after a non-digit character", () => {
		expect(normalizeSelectInput("dept", "12a", false)).toEqual({kind: "text", asList: ["12a"]});
	});
});

describe("validateSetField", () => {
	it("reports a successful change", () => {
		expect(validateSetField("dept", "Old", "New", "New")).toBe("Changed dept from 'Old' to 'New'");
	});

	it("reports an unnecessary set as a no-op, not an error", () => {
		const message = validateSetField("dept", "Same", "Same", "Same");
		expect(message).toBe("Did not change dept, already set to 'Same'");
		expect(message.toLowerCase()).not.toContain("error");
	});

	// The bulk-runner colours a row red when the message contains "error", so
	// every failure branch has to carry the prefix or it reads as a success.
	it("flags a field that refused to change", () => {
		expect(validateSetField("dept", "Old", "New", "Old")).toBe("Error: unable to change dept, still 'Old'");
	});

	it("flags a change that landed on an unexpected value", () => {
		expect(validateSetField("dept", "Old", "New", "Other")).toBe(
			"Error: unexpected dept change, tried 'New' but got 'Other'"
		);
	});

	it("flags a value that moved despite matching the target beforehand", () => {
		expect(validateSetField("dept", "Same", "Same", "Other")).toBe(
			"Error: unexpected change dept, was already 'Same' but now 'Other'"
		);
	});

	it("prefixes every failure branch with Error:", () => {
		const failures = [
			validateSetField("dept", "Old", "New", "Old"),
			validateSetField("dept", "Old", "New", "Other"),
			validateSetField("dept", "Same", "Same", "Other"),
		];
		for (const message of failures) {
			expect(message.toLowerCase()).toContain("error");
		}
	});
});

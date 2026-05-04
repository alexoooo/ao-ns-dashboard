import {describe, it, expect} from "vitest";
import {normalizeKey, splitAmpersand, splitVerticalBar, splitSlash, listsEqual} from "../src/utils";

describe("normalizeKey", () => {
	it("strips non-alphanumeric/underscore/dash", () => {
		expect(normalizeKey("Hello World!")).toBe("helloworld");
	});
	it("preserves underscores and dashes", () => {
		expect(normalizeKey("foo_bar-baz")).toBe("foo_bar-baz");
	});
	it("lowercases", () => {
		expect(normalizeKey("ABC")).toBe("abc");
	});
	it("returns empty string for empty input", () => {
		expect(normalizeKey("")).toBe("");
	});
});

describe("splitAmpersand", () => {
	it("splits on unescaped &", () => {
		expect(splitAmpersand("a&b&c")).toEqual(["a", "b", "c"]);
	});
	it("preserves escaped \\&", () => {
		expect(splitAmpersand("a\\&b&c")).toEqual(["a&b", "c"]);
	});
	it("handles no separators", () => {
		expect(splitAmpersand("only")).toEqual(["only"]);
	});
	it("handles only escapes", () => {
		expect(splitAmpersand("a\\&b\\&c")).toEqual(["a&b&c"]);
	});
});

describe("splitVerticalBar", () => {
	it("splits on unescaped |", () => {
		expect(splitVerticalBar("a|b|c")).toEqual(["a", "b", "c"]);
	});
	it("preserves escaped \\|", () => {
		expect(splitVerticalBar("a\\|b|c")).toEqual(["a|b", "c"]);
	});
	it("handles trailing pipe (empty last segment)", () => {
		expect(splitVerticalBar("a|b|")).toEqual(["a", "b", ""]);
	});
});

describe("splitSlash", () => {
	it("returns [] for empty input (intentional, per source comment)", () => {
		expect(splitSlash("")).toEqual([]);
	});
	it("splits on unescaped /", () => {
		expect(splitSlash("a/b/c")).toEqual(["a", "b", "c"]);
	});
	it("preserves escaped \\/", () => {
		expect(splitSlash("a\\/b/c")).toEqual(["a/b", "c"]);
	});
});

describe("listsEqual", () => {
	it("returns true for identical lists", () => {
		expect(listsEqual([1, 2, 3], [1, 2, 3])).toBe(true);
	});
	it("returns true regardless of order (set-equality)", () => {
		expect(listsEqual([3, 1, 2], [1, 2, 3])).toBe(true);
	});
	it("returns false for different lengths", () => {
		expect(listsEqual([1, 2], [1, 2, 3])).toBe(false);
	});
	it("returns false for different contents", () => {
		expect(listsEqual([1, 2, 3], [1, 2, 4])).toBe(false);
	});
	it("returns true for two empty lists", () => {
		expect(listsEqual([], [])).toBe(true);
	});
	it("works with strings", () => {
		expect(listsEqual(["a", "b"], ["b", "a"])).toBe(true);
	});
});

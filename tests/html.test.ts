import {describe, it, expect} from "vitest";
import {escapeHtml, interpolate} from "../src/html";

describe("escapeHtml", () => {
	it("escapes &, <, >, \", '", () => {
		expect(escapeHtml(`<a href="x">a&b'c</a>`)).toBe(`&lt;a href=&quot;x&quot;&gt;a&amp;b&#39;c&lt;/a&gt;`);
	});
	it("returns empty for null/undefined", () => {
		expect(escapeHtml(null)).toBe("null");
		expect(escapeHtml(undefined)).toBe("undefined");
	});
	it("stringifies non-strings", () => {
		expect(escapeHtml(42)).toBe("42");
		expect(escapeHtml(true)).toBe("true");
	});
});

describe("interpolate", () => {
	it("HTML-escapes plain keys", () => {
		expect(interpolate("Hello {{name}}", {name: "<x>"})).toBe("Hello &lt;x&gt;");
	});
	it("inserts Html-suffixed keys verbatim", () => {
		expect(interpolate("<div>{{bodyHtml}}</div>", {bodyHtml: "<p>safe</p>"})).toBe("<div><p>safe</p></div>");
	});
	it("inserts Js-suffixed keys verbatim (e.g. data: URLs with &)", () => {
		expect(interpolate('"{{urlJs}}"', {urlJs: "data:text/javascript;,a&b"})).toBe('"data:text/javascript;,a&b"');
	});
	it("throws on missing key", () => {
		expect(() => interpolate("{{missing}}", {})).toThrow(/missing key 'missing'/);
	});
	it("ignores accidental partial matches", () => {
		expect(interpolate("{ {single} } {{x}}", {x: "ok"})).toBe("{ {single} } ok");
	});
});

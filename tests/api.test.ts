import {describe, it, expect} from "vitest";
import {parseEnvelope, stripTrailingHtmlComments} from "../src/client/api.client";

// The footer NetSuite actually appended to a SuiteQL command response.
const netsuiteFooter =
	"<!-- 481 s: 47% #61 cache: 0% #0 --> " +
	"<!-- Host [ a.sp.27.prod.phx.na19 ] App Version [ 2026.1.16.30106 ] --> " +
	"<!-- COMPID [ 8224612_SB2 ] EMAIL [ someone@example.com ] URL [ /app/site/hosting/scriptlet.nl ] " +
	"Time [ Fri Aug 07 08:39:01 PDT 2026 ] --> " +
	"<!-- All SQL was faster than 100 ms -->";

describe("stripTrailingHtmlComments", () => {
	it("leaves a clean body untouched", () => {
		expect(stripTrailingHtmlComments('{"ok":true}')).toBe('{"ok":true}');
	});

	it("removes every trailing NetSuite debug footer", () => {
		expect(stripTrailingHtmlComments('{"ok":true}' + netsuiteFooter)).toBe('{"ok":true}');
	});

	it("removes a footer separated by whitespace and newlines", () => {
		expect(stripTrailingHtmlComments('{"ok":true}\n\n<!-- Host [ x ] -->\n')).toBe('{"ok":true}');
	});

	it("does not touch a comment-looking substring inside the body", () => {
		const body = '{"ok":true,"data":"<!-- not a footer -->"}';
		expect(stripTrailingHtmlComments(body)).toBe(body);
	});

	it("stops rather than over-stripping when a comment is unterminated", () => {
		expect(stripTrailingHtmlComments('{"ok":true} no start -->')).toBe('{"ok":true} no start -->');
	});
});

describe("parseEnvelope", () => {
	it("parses a clean envelope", () => {
		expect(parseEnvelope('{"ok":true,"data":{"n":1}}')).toEqual({ok: true, data: {n: 1}});
	});

	it("parses an envelope carrying NetSuite debug footers", () => {
		const body = '{"ok":true,"data":{"rows":[["a",null,0]]}}' + netsuiteFooter;
		expect(parseEnvelope(body)).toEqual({ok: true, data: {rows: [["a", null, 0]]}});
	});

	it("keeps JSON null values as null", () => {
		expect(parseEnvelope('{"ok":true,"data":[null,0,""]}')).toEqual({ok: true, data: [null, 0, ""]});
	});

	it("fails for a body that is not JSON at all", () => {
		const result = parseEnvelope("<html><body>Session expired</body></html>");
		expect(result.ok).toBe(false);
		expect(result.ok === false && result.error.message).toContain("Invalid JSON response");
	});

	it("excerpts an oversized unparseable body instead of quoting all of it", () => {
		const body = "x".repeat(5000);
		const result = parseEnvelope(body);
		expect(result.ok).toBe(false);
		const message = result.ok === false ? result.error.message : "";
		expect(message).toContain("[…5000 chars total…]");
		expect(message.length).toBeLessThan(500);
	});
});

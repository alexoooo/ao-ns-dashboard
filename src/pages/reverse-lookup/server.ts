import {failure, success} from "../../app/command";
import {paramCommand} from "../../app/constants";
import {interpolate} from "../../lib/html";
import {scriptDeployParam} from "../../lib/url";
import {errorMessage} from "../../lib/error-utils";
import {recordTypeOptions} from "../../server/record-types";
import {runReverseLookup} from "../../server/reverse-lookup";
import templateHtml from "./template.html";
import type {CommandResponse, PageDef, SuiteletContext} from "../../app/types";
import type {ReverseLookupRequest, ReverseLookupResponse} from "../../lib/reverse-lookup";

const commandName = "reverse-lookup";

const reverseLookupPage: PageDef = {
	name: "reverse-lookup",
	label: "Reverse Lookup",
	bodyClass: "page-wide",

	render(context: SuiteletContext): string {
		const specialOptions = `
			<option value="file">File</option>
			<option value="savedsearch">Saved Search</option>
			<option value="script">Script</option>
			<option value="scriptdeployment">Script Deployment</option>
			<option value="transaction">Transaction (generic)</option>`;
		return interpolate(templateHtml, {
			commandUrl: scriptDeployParam(context) + "&" + paramCommand + "=" + commandName,
			typeOptionsAttr: specialOptions + recordTypeOptions(undefined),
		});
	},

	documentation(): string {
		return `
			<ul>
				<li>Paste a NetSuite URL, or choose a Type and enter an internal or script ID.</li>
				<li>Results are direct referrers only. Expand any result to run another reverse lookup without reloading the page.</li>
				<li><strong>Structured</strong> groups use NetSuite record relationships. An empty group does not prove that no other unsupported reference exists.</li>
				<li>JavaScript scanning is optional, requires a scoped File Cabinet folder, and reports text matches as <strong>heuristic</strong>.</li>
				<li>Source scanning recognizes stable <code>customsearch_…</code>/<code>customscript_…</code> IDs and exact File Cabinet paths, not bare numeric IDs.</li>
			</ul>`;
	},

	commands: {
		[commandName]: handleReverseLookup,
	},
};

export default reverseLookupPage;

function handleReverseLookup(context: SuiteletContext): CommandResponse<ReverseLookupResponse> {
	let request: ReverseLookupRequest;
	try {
		request = JSON.parse(context.request.body) as ReverseLookupRequest;
	} catch (e) {
		return failure("Invalid request body: " + errorMessage(e));
	}

	try {
		return success(runReverseLookup(request));
	} catch (e) {
		return failure(errorMessage(e));
	}
}

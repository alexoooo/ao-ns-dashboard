import query from "N/query";

import {paramCommand} from "../../constants";
import {interpolate, documentationSection} from "../../html";
import {scriptDeployParam} from "../../url";
import {errorMessage} from "../../error-utils";
import templateHtml from "./template.html";
import type {PageDef, SuiteletContext} from "../../types";

const commandName = "suiteql";

interface SuiteqlBody {
	query?: string;
	pageIndex?: number;
	pageSize?: number;
}

const suiteqlPage: PageDef = {
	name: "suiteql",
	label: "SuiteQL Query",

	render(context: SuiteletContext): string {
		return interpolate(templateHtml, {
			commandUrl: scriptDeployParam(context) + "&" + paramCommand + "=" + commandName,
			documentationHtml: documentationSection(`
				<ul>
					<li>Enter a SuiteQL query and click <strong>Run Query</strong>.</li>
					<li>Results are paged in chunks of up to 1000 rows (NetSuite's max page size). Use <strong>Previous</strong> / <strong>Next</strong> to navigate when the result set is larger than one page.</li>
					<li>Click <strong>Download</strong> to export the current page as CSV.</li>
					<li>Examples:
						<ul>
							<li><code>SELECT id, type, trandate FROM transaction FETCH FIRST 100 ROWS ONLY</code></li>
							<li><code>SELECT COUNT(*) AS n FROM customer</code></li>
						</ul>
					</li>
					<li>Errors (e.g. invalid SQL) are reported in the status line next to the buttons.</li>
				</ul>
			`),
		});
	},

	commands: {
		[commandName]: handleSuiteQl,
	},
};

export default suiteqlPage;

function handleSuiteQl(context: SuiteletContext): string {
	let body: SuiteqlBody;
	try {
		body = JSON.parse(context.request.body) as SuiteqlBody;
	} catch (e) {
		return JSON.stringify({error: "Invalid request body: " + errorMessage(e)});
	}

	const sql = (body.query ?? "").trim();
	if (!sql) {
		return JSON.stringify({error: "Empty query"});
	}

	const pageIndex = Number.isInteger(body.pageIndex) ? (body.pageIndex as number) : 0;
	const pageSize = Number.isInteger(body.pageSize) ? (body.pageSize as number) : 1000;

	try {
		const paged = query.runSuiteQLPaged({
			query: sql,
			pageSize,
		});
		const totalCount = paged.count;
		const pageCount = paged.pageRanges.length;

		if (pageCount === 0 || pageIndex >= pageCount) {
			return JSON.stringify({
				totalCount,
				pageCount,
				pageSize,
				pageIndex,
				columns: [],
				rows: [],
			});
		}

		const page = paged.fetch({index: pageIndex});
		// page.data is a ResultSet (not a plain array). asMappedResults() gives
		// plain objects keyed by column alias — easiest to serialize.
		const mapped = page.data.asMappedResults();
		const columns = mapped.length > 0 ? Object.keys(mapped[0]!) : [];
		const rows = mapped.map(m => columns.map(c => m[c]));

		return JSON.stringify({
			totalCount,
			pageCount,
			pageSize,
			pageIndex,
			columns,
			rows,
		});
	} catch (e) {
		return JSON.stringify({error: errorMessage(e)});
	}
}

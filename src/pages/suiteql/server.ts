import query from "N/query";

import {paramCommand} from "../../constants";
import {interpolate, documentationSection} from "../../html";
import {scriptDeployParam} from "../../url";
import {errorMessage} from "../../error-utils";
import {failure, success} from "../../command";
import templateHtml from "./template.html";
import type {CommandResponse, PageDef, SuiteletContext} from "../../types";

const commandName = "suiteql";

interface SuiteqlBody {
	query?: string;
	pageIndex?: number;
	pageSize?: number;
}

export interface SuiteqlResultPage {
	totalCount: number;
	pageCount: number;
	pageSize: number;
	pageIndex: number;
	columns: string[];
	rows: unknown[][];
}

const suiteqlPage: PageDef = {
	name: "suiteql",
	label: "SuiteQL Query",
	// Wide result tables — let the page scroll horizontally instead of being
	// clipped by MDL's default `overflow-x: hidden`. See layout.html for the
	// body-class CSS that this opts into.
	bodyClass: "page-wide",

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

function handleSuiteQl(context: SuiteletContext): CommandResponse<SuiteqlResultPage> {
	let body: SuiteqlBody;
	try {
		body = JSON.parse(context.request.body) as SuiteqlBody;
	} catch (e) {
		return failure("Invalid request body: " + errorMessage(e));
	}

	const sql = (body.query ?? "").trim();
	if (!sql) {
		return failure("Empty query");
	}

	const pageIndex = Number.isInteger(body.pageIndex) ? (body.pageIndex as number) : 0;
	const pageSize = Number.isInteger(body.pageSize) ? (body.pageSize as number) : 1000;

	try {
		const paged = query.runSuiteQLPaged({query: sql, pageSize});
		const totalCount = paged.count;
		const pageCount = paged.pageRanges.length;

		if (pageCount === 0 || pageIndex >= pageCount) {
			return success({totalCount, pageCount, pageSize, pageIndex, columns: [], rows: []});
		}

		const page = paged.fetch({index: pageIndex});
		// page.data is a ResultSet (not a plain array). asMappedResults() gives
		// plain objects keyed by column alias — easiest to serialize.
		const mapped = page.data.asMappedResults();
		const columns = mapped.length > 0 ? Object.keys(mapped[0]!) : [];
		const rows = mapped.map(m => columns.map(c => m[c]));

		return success({totalCount, pageCount, pageSize, pageIndex, columns, rows});
	} catch (e) {
		return failure(errorMessage(e));
	}
}

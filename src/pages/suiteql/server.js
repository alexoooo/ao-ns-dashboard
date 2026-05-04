import query from "N/query";

import { paramCommand } from "../../constants.js";
import { interpolate, documentationSection } from "../../html.js";
import { scriptDeployParam } from "../../url.js";
import clientJs from "./client.client.js?raw";
import templateHtml from "./template.html";


const commandName = "suiteql";


export default {
	name: "suiteql",
	label: "SuiteQL Query",

	render(context) {
		return interpolate(templateHtml, {
			clientJs,
			commandUrl: scriptDeployParam(context) + "&" + paramCommand + "=" + commandName,
			documentationHtml: documentationSection(`
				<h3>· Enter a SuiteQL query and click Run.</h3>
				<h3>· Results are paged in chunks of up to 1000 rows (NetSuite max page size).</h3>
				<h4>&nbsp; &nbsp; · Use Previous / Next to navigate pages when the result set is larger than one page.</h4>
				<h3>· Examples:</h3>
				<h4>&nbsp; &nbsp; · <code>SELECT id, type, trandate FROM transaction FETCH FIRST 100 ROWS ONLY</code></h4>
				<h4>&nbsp; &nbsp; · <code>SELECT COUNT(*) AS n FROM customer</code></h4>
				<h3>· Errors (e.g. invalid SQL) are reported in the status line below.</h3>
			`),
		});
	},

	commands: {
		[commandName]: handleSuiteQl,
	},
};


function handleSuiteQl(context) {
	let body;
	try {
		body = JSON.parse(context.request.body);
	}
	catch (e) {
		return JSON.stringify({ error: "Invalid request body: " + e.message });
	}

	const sql = (body.query || "").trim();
	if (! sql) {
		return JSON.stringify({ error: "Empty query" });
	}

	const pageIndex = Number.isInteger(body.pageIndex) ? body.pageIndex : 0;
	const pageSize = Number.isInteger(body.pageSize) ? body.pageSize : 1000;

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

		const page = paged.fetch({ index: pageIndex });
		// page.data is a ResultSet (not a plain array). asMappedResults() gives
		// plain objects keyed by column alias — easiest to serialize.
		const mapped = page.data.asMappedResults();
		const columns = mapped.length > 0 ? Object.keys(mapped[0]) : [];
		const rows = mapped.map(m => columns.map(c => m[c]));

		return JSON.stringify({
			totalCount,
			pageCount,
			pageSize,
			pageIndex,
			columns,
			rows,
		});
	}
	catch (e) {
		return JSON.stringify({ error: e.message });
	}
}

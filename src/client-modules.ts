// Map of client-side ES module ids to their source text. Loaded into the
// Suitelet bundle via Rollup's ?raw plugin (which transpiles `.client.ts`
// to JS), then embedded into each rendered page as data: URLs in the
// import map (see main.ts#renderPage and layout.html). Ids correspond to
// bare specifiers in that import map.

import csvSource from "./client/csv.client.ts?raw";
import bulkRunnerSource from "./client/bulk-runner.client.ts?raw";
import editRecordsSource from "./pages/edit-records/page.client.ts?raw";
import recordTypeSource from "./pages/record-type/page.client.ts?raw";
import suiteqlSource from "./pages/suiteql/page.client.ts?raw";

export const clientModules: Record<string, string> = {
	csv: csvSource,
	"bulk-runner": bulkRunnerSource,
	"edit-records": editRecordsSource,
	"record-type": recordTypeSource,
	suiteql: suiteqlSource,
};

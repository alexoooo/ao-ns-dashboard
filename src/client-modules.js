// Map of client-side ES module ids to their source text. Loaded into the
// Suitelet bundle via Rollup's ?raw plugin, then embedded into each rendered
// page as data: URLs in the import map (see main.js#renderPage and
// layout.html). Ids correspond to bare specifiers in that import map.

import csvSource from "./client/csv.client.js?raw";
import bulkRunnerSource from "./client/bulk-runner.client.js?raw";
import editRecordsSource from "./pages/edit-records/client.client.js?raw";
import recordTypeSource from "./pages/record-type/client.client.js?raw";
import suiteqlSource from "./pages/suiteql/client.client.js?raw";


export const clientModules = {
	"csv": csvSource,
	"bulk-runner": bulkRunnerSource,
	"edit-records": editRecordsSource,
	"record-type": recordTypeSource,
	"suiteql": suiteqlSource,
};

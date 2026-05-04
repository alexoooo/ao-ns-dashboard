// Single source of truth for client-side ES modules.
//
// Each entry maps a bare specifier (the import name used by `*.client.ts`
// files) to the source text for that module. Rollup's `?raw` plugin loads
// each `.client.ts` file as a string, transpiling TS → JS first so the
// browser can execute it directly. At request time, `main.ts` wraps each
// source string in a `data:text/javascript;` URL and writes the full
// `<script type="importmap">` JSON into the rendered page.
//
// Adding a new client module is a single edit here — no other files to
// touch. `layout.html` consumes the import map via the `{{importMapJsonJs}}`
// placeholder.

import separatorsSource from "../shared/separators.ts?raw";
import apiSource from "../client/api.client.ts?raw";
import csvSource from "../client/csv.client.ts?raw";
import bulkRunnerSource from "../client/bulk-runner.client.ts?raw";
import editRecordsSource from "../pages/edit-records/page.client.ts?raw";
import recordTypeSource from "../pages/record-type/page.client.ts?raw";
import suiteqlSource from "../pages/suiteql/page.client.ts?raw";
import recordDetailsSource from "../pages/record-details/page.client.ts?raw";

// Bare-specifier → module source. Order matches the import map output for
// readability in the rendered HTML; it doesn't affect resolution.
export const clientModules: Record<string, string> = {
	separators: separatorsSource,
	api: apiSource,
	csv: csvSource,
	"bulk-runner": bulkRunnerSource,
	"edit-records": editRecordsSource,
	"record-type": recordTypeSource,
	"record-details": recordDetailsSource,
	suiteql: suiteqlSource,
};

// External (non-data:) entries kept in the import map alongside the bundled
// modules. Lit is loaded from a CDN at runtime — bundling would inflate the
// per-page bundle by ~20 KB and Lit 3 is stable on jsdelivr. Pinned to match
// the version installed locally for type checking (see package.json).
const externalImports: Record<string, string> = {
	lit: "https://cdn.jsdelivr.net/npm/lit@3.2.1/+esm",
};

// Build the JSON for `<script type="importmap">…</script>`. The `lit` CDN
// URL passes through verbatim; bundled modules become `data:` URLs.
export function buildImportMapJson(): string {
	const imports: Record<string, string> = {...externalImports};
	for (const [id, source] of Object.entries(clientModules)) {
		imports[id] = "data:text/javascript;charset=utf-8," + encodeURIComponent(source);
	}
	return JSON.stringify({imports}, null, "\t");
}

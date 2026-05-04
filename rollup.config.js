// Rollup config — bundles src/ into a single AMD file for upload as a NetSuite
// Script File. Kept as .js (not .ts) so it can run without a build step itself.

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import typescript from "@rollup/plugin-typescript";

const banner = fs.readFileSync("src/banner.txt", "utf8");

// Custom plugin: imports ending in `?raw` (or `.html` / `.client.ts` /
// `.client.js`) resolve to the file's source text exported as the default
// export.
//
// - `.html` / `.html?raw` are embedded verbatim (page templates).
// - `.client.js?raw` is embedded verbatim (legacy fallback, in case any client
//   modules remain in plain JS during a migration).
// - `.client.ts?raw` is **transpiled to JS first**, then embedded — the browser
//   loads each client module as a native ES module via a data: URL in the
//   import map (see src/layout.html), so the embedded source must be valid JS.
//
// Type checking for `.client.ts` happens via `npm run typecheck` (which runs
// the full TS program over every file in tsconfig's `include`). The transpile
// here is a fast, single-file syntax-stripping pass; it does not type-check.
const rawText = {
	name: "raw-text",
	resolveId(source, importer) {
		if (source.endsWith("?raw") && importer) {
			const cleaned = source.replace(/\?raw$/, "");
			return path.resolve(path.dirname(importer), cleaned) + "?raw";
		}
		return null;
	},
	load(id) {
		const cleaned = id.replace(/\?raw$/, "");
		const isRaw = id.endsWith("?raw");
		const isTemplate = cleaned.endsWith(".html");
		const isClientTs = cleaned.endsWith(".client.ts");
		const isClientJs = cleaned.endsWith(".client.js");
		if (!(isRaw || isTemplate || isClientTs || isClientJs)) {
			return null;
		}
		const source = fs.readFileSync(cleaned, "utf8");
		const emitted = isClientTs ? transpileClientModule(source, cleaned) : source;
		return {
			code: `export default ${JSON.stringify(emitted)};`,
			map: {mappings: ""},
		};
	},
};

function transpileClientModule(source, fileName) {
	const result = ts.transpileModule(source, {
		fileName,
		compilerOptions: {
			target: ts.ScriptTarget.ES2020,
			module: ts.ModuleKind.ES2022,
			moduleResolution: ts.ModuleResolutionKind.Bundler,
			isolatedModules: true,
			verbatimModuleSyntax: true,
			useDefineForClassFields: true,
			experimentalDecorators: false,
			sourceMap: false,
			removeComments: false,
		},
	});
	if (result.diagnostics && result.diagnostics.length > 0) {
		const formatted = ts.formatDiagnosticsWithColorAndContext(result.diagnostics, {
			getCanonicalFileName: f => f,
			getCurrentDirectory: () => process.cwd(),
			getNewLine: () => "\n",
		});
		throw new Error(`TypeScript transpile errors in ${fileName}:\n${formatted}`);
	}
	return result.outputText;
}

export default {
	input: "src/index.ts",
	output: {
		file: "ao-ns-dashboard.js",
		format: "amd",
		exports: "default",
		banner,
		indent: false,
		sourcemap: false,
	},
	external: ["N/record", "N/search", "N/query", "N/runtime"],
	treeshake: false,
	onwarn(warning, warn) {
		if (warning.code === "UNUSED_EXTERNAL_IMPORT") return;
		warn(warning);
	},
	plugins: [
		// Order matters: the raw-text loader must run before the TS compiler so
		// `*.client.ts?raw` is captured as a string literal rather than being
		// pulled into the server bundle's module graph.
		rawText,
		typescript({
			tsconfig: "./tsconfig.json",
			noEmitOnError: true,
			compilerOptions: {
				noEmit: false,
				declaration: false,
				sourceMap: false,
			},
		}),
	],
};

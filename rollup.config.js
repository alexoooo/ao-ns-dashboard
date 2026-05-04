// Rollup config — bundles src/ into a single AMD file for upload as a NetSuite
// Script File. Kept as .js (not .ts) so it can run without a build step itself.

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import typescript from "@rollup/plugin-typescript";

const banner = fs.readFileSync("src/app/banner.txt", "utf8");

// Custom plugin: certain imports resolve to a file's source text exported
// as the default export, so it can be embedded into the bundle.
//
// Triggers on:
//   - `*.html` (no suffix) — page template literals (e.g.
//     `import templateHtml from "./template.html"`).
//   - `*?raw` — any file imported with the `?raw` query, used by
//     `client-modules.ts` to embed client-side ES modules into the import
//     map at runtime.
//
// `.ts` sources (whether `.client.ts` or any other `.ts?raw`) are
// **transpiled to JS first**, since the browser runs the embedded text as
// a native ES module via a data: URL and can't parse TypeScript syntax.
//
// Type checking happens via `npm run typecheck` (the full TS program over
// every file in tsconfig's `include`); the transpile here is a fast,
// single-file syntax-stripping pass that does not type-check.
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
		// Only intercept `?raw` imports and `.html` imports. Regular `.ts`
		// module imports (without `?raw`) fall through to the typescript
		// plugin so they're compiled into the server bundle normally.
		if (!isRaw && !isTemplate) {
			return null;
		}
		const source = fs.readFileSync(cleaned, "utf8");
		const emitted = cleaned.endsWith(".ts") ? transpileClientModule(source, cleaned) : source;
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
	input: "src/app/index.ts",
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

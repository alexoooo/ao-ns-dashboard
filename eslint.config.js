// Flat ESLint config (ESLint v9+).
// Run with: npm run lint  (eslint src tests)

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

// AST selectors that catch SuiteScript API calls at module top level.
// Per AGENTS.md, NetSuite throws SUITESCRIPT_API_UNAVAILABLE_IN_DEFINE if the
// `record`, `search`, `query`, or `runtime` modules are invoked while the AMD
// `define` callback is still running. Wrap any such initialization in a
// function that only runs during request handling. See `record-types.ts` for
// the lazy-init pattern.
const netsuiteRuntimeModules = ["record", "search", "query", "runtime"];

// Match only CallExpressions that are direct module-top-level statements:
//   record.foo(...);          → ExpressionStatement → CallExpression
//   const x = search.foo(...) → VariableDeclaration → VariableDeclarator → CallExpression
// Calls inside function/method bodies are not flagged because the selector
// uses direct-child combinators (`>`) all the way from Program.
const topLevelNsApiSelector = netsuiteRuntimeModules
	.flatMap(mod => [
		`Program > ExpressionStatement > CallExpression[callee.type='MemberExpression'][callee.object.name='${mod}']`,
		`Program > VariableDeclaration > VariableDeclarator > CallExpression[callee.type='MemberExpression'][callee.object.name='${mod}']`,
	])
	.join(", ");

export default tseslint.config(
	{
		ignores: ["node_modules/**", "ao-ns-dashboard.js", "coverage/**", "*.tsbuildinfo"],
	},

	// Type-checked rules for src + tests
	{
		files: ["src/**/*.ts", "tests/**/*.ts"],
		extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
		languageOptions: {
			parserOptions: {
				project: ["./tsconfig.json"],
				tsconfigRootDir: import.meta.dirname,
			},
			globals: {
				...globals.browser,
			},
		},
		rules: {
			// SuiteScript constraint — block top-level NetSuite API calls.
			"no-restricted-syntax": [
				"error",
				{
					selector: topLevelNsApiSelector,
					message:
						"Do not call N/* SuiteScript APIs at module top level — NetSuite throws SUITESCRIPT_API_UNAVAILABLE_IN_DEFINE. Wrap in a function that runs during request handling. See src/record-types.ts for the lazy-init pattern.",
				},
			],

			// Cross-page server imports are a smell — pages should not depend on
			// each other's internals. Shared logic belongs in src/server/.
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						{
							group: ["**/pages/*/server", "**/pages/*/server.ts", "**/pages/*/server.js"],
							message:
								"Pages must not import from each other's server.ts. Move shared logic into src/server/ instead.",
						},
					],
				},
			],

			// TypeScript hygiene
			"@typescript-eslint/no-floating-promises": "error",
			"@typescript-eslint/no-misused-promises": "error",
			"@typescript-eslint/consistent-type-imports": [
				"error",
				{prefer: "type-imports", fixStyle: "inline-type-imports"},
			],
			"@typescript-eslint/no-unused-vars": [
				"error",
				{argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_"},
			],

			// NetSuite types (@hitc/netsuite-types) declare many properties as
			// `any` — most prominently `request.parameters` and `request.body`.
			// We cast at the boundary (see src/url.ts and the page handlers) so
			// these `no-unsafe-*` rules fire on every parameter read despite the
			// cast. Disabling them avoids per-line noise; real `any` usage in
			// our own code is caught by `noImplicitAny` in tsconfig instead.
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-argument": "off",
			"@typescript-eslint/no-unsafe-return": "off",
			"@typescript-eslint/no-unsafe-call": "off",

			// Lit binds method references in template event handlers
			// (`@click=${this.runAll}`) so unbound-method is a false positive
			// in `*.client.ts`. We keep it enabled elsewhere via the override
			// below.
			"@typescript-eslint/unbound-method": "off",

			// Project conventions
			// `x == null` and `x != null` are common JS idioms for "null or
			// undefined" — keep them allowed; demand `===`/`!==` everywhere else.
			eqeqeq: ["error", "always", {null: "ignore"}],
			"prefer-const": "error",
			"no-var": "error",
		},
	},

	// pages/index.ts is the one place that legitimately re-exports every page
	// (it's the page registry). Allow cross-page imports there.
	{
		files: ["src/pages/index.ts"],
		rules: {
			"no-restricted-imports": "off",
		},
	},

	// Config files don't need type-aware rules.
	{
		files: ["rollup.config.ts", "vitest.config.ts", "eslint.config.js"],
		extends: [js.configs.recommended],
		languageOptions: {
			globals: {
				...globals.node,
			},
		},
	}
);

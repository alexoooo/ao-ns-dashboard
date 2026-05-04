import {defineConfig} from "vitest/config";

export default defineConfig({
	test: {
		include: ["tests/**/*.test.ts"],
		environment: "node",
		// Tests cover pure logic only (parsing, escape handling, HTML helpers).
		// SuiteScript-API code is verified manually in a NetSuite sandbox; see
		// CONTRIBUTING.md for the manual test checklist.
		coverage: {
			provider: "v8",
			include: ["src/**/*.ts"],
			exclude: [
				"src/**/*.client.ts",
				"src/pages/**/server.ts",
				"src/main.ts",
				"src/index.ts",
				"src/record-types.ts",
			],
		},
	},
});

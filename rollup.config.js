import fs from "node:fs";
import path from "node:path";

const banner = fs.readFileSync("src/banner.txt", "utf8");

const rawText = {
	name: "raw-text",
	resolveId(source, importer) {
		if (source.endsWith("?raw") && importer) {
			const cleaned = source.replace(/\?raw$/, "");
			return path.resolve(path.dirname(importer), cleaned) + "?raw";
		}
	},
	load(id) {
		const cleaned = id.replace(/\?raw$/, "");
		if (id.endsWith("?raw") || cleaned.endsWith(".html") || cleaned.endsWith(".client.js")) {
			return `export default ${JSON.stringify(fs.readFileSync(cleaned, "utf8"))};`;
		}
	},
};

export default {
	input: "src/index.js",
	output: {
		file: "ao-ns-dashboard.js",
		format: "amd",
		exports: "default",
		banner,
		indent: false,
	},
	external: ["N/record", "N/search", "N/query", "N/runtime"],
	treeshake: false,
	onwarn(warning, warn) {
		if (warning.code === "UNUSED_EXTERNAL_IMPORT") return;
		warn(warning);
	},
	plugins: [rawText],
};

// Bump the version constant in src/app/constants.ts.
//
// Format: yyyy.mm.dd<suffix>, where <suffix> is a/b/c/.../z/aa/ab/...
// - Same day as previous version: advance the suffix by one.
// - Different day: reset to "<today>a".
//
// Invoked from `npm run build` before rollup runs, so rollup picks up the
// new version when it computes the output filename.

import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const constantsPath = path.join(repoRoot, "src", "app", "constants.ts");
const versionRegex = /(export const version = ")(\d{4}\.\d{2}\.\d{2}[a-z]+)(")/;

const src = fs.readFileSync(constantsPath, "utf8");
const match = src.match(versionRegex);
if (!match) {
	throw new Error(`Could not find version constant in ${constantsPath}`);
}
const oldVersion = match[2];

const now = new Date();
const today = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;

const parts = oldVersion.match(/^(\d{4}\.\d{2}\.\d{2})([a-z]+)$/);
let newVersion;
if (parts && parts[1] === today) {
	newVersion = `${today}${incrementSuffix(parts[2])}`;
} else {
	newVersion = `${today}a`;
}

const newSrc = src.replace(versionRegex, `$1${newVersion}$3`);
fs.writeFileSync(constantsPath, newSrc);
console.log(`Version bumped: ${oldVersion} -> ${newVersion}`);

function incrementSuffix(s) {
	const chars = s.split("");
	for (let i = chars.length - 1; i >= 0; i--) {
		if (chars[i] !== "z") {
			chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1);
			return chars.join("");
		}
		chars[i] = "a";
	}
	return "a" + chars.join("");
}

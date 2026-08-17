export interface ReverseLookupInput {
	url?: string;
	type?: string;
	id?: string;
	parentScriptId?: string;
}

export interface SourceScanOptions {
	folderPath: string;
}

export interface ReverseLookupRequest {
	input?: ReverseLookupInput;
	sourceScan?: SourceScanOptions;
}

export type ReverseLookupKind = "record" | "file" | "script" | "script-deployment" | "saved-search";

export interface ReverseLookupTarget {
	key: string;
	kind: ReverseLookupKind;
	type: string;
	id: string;
	label: string;
	scriptId?: string;
	filePath?: string;
	parentScriptId?: string;
}

export interface ReverseLookupNode {
	target: ReverseLookupTarget;
	evidence: string;
	url?: string;
}

export interface RelationshipGroup {
	id: string;
	label: string;
	confidence: "structured" | "heuristic";
	status: "ok" | "error";
	results: ReverseLookupNode[];
	truncated: boolean;
	message?: string;
}

export interface ReverseLookupResponse {
	target: ReverseLookupTarget;
	groups: RelationshipGroup[];
	notices: string[];
}

const routeTypes: Readonly<Record<string, string>> = {
	"mediaitem.nl": "file",
	"script.nl": "script",
	"scriptrecord.nl": "scriptdeployment",
	"scriptdeploy.nl": "scriptdeployment",
	"scriptdeployment.nl": "scriptdeployment",
	"savedsearch.nl": "savedsearch",
	"search.nl": "savedsearch",
	"searchresults.nl": "savedsearch",
	"vendor.nl": "vendor",
	"employee.nl": "employee",
	"contact.nl": "contact",
	"item.nl": "item",
	"acct.nl": "account",
	"department.nl": "department",
	"class.nl": "classification",
	"location.nl": "location",
	"salesord.nl": "salesorder",
	"custinvc.nl": "invoice",
	"custcred.nl": "creditmemo",
	"cashsale.nl": "cashsale",
	"purchord.nl": "purchaseorder",
	"vendbill.nl": "vendorbill",
	"vendcred.nl": "vendorcredit",
	"journal.nl": "journalentry",
};

export function parseReverseLookupInput(input: ReverseLookupInput): {
	type: string;
	id: string;
	parentScriptId?: string;
} {
	const rawUrl = input.url?.trim() ?? "";
	if (rawUrl !== "") {
		return parseNetSuiteUrl(rawUrl);
	}

	const type = normalizeTargetType(input.type ?? "");
	const id = (input.id ?? "").trim();
	if (type === "") throw new Error("Type is required");
	if (id === "") throw new Error("ID is required");
	return input.parentScriptId ? {type, id, parentScriptId: input.parentScriptId.trim()} : {type, id};
}

export function parseNetSuiteUrl(value: string): {type: string; id: string; parentScriptId?: string} {
	const trimmed = value.trim();
	const withoutFragment = trimmed.split("#", 1)[0] ?? "";
	const question = withoutFragment.indexOf("?");
	const path = question < 0 ? withoutFragment : withoutFragment.slice(0, question);
	const query = question < 0 ? "" : withoutFragment.slice(question + 1);
	const filename = path.replace(/\/+$/, "").split("/").pop()?.toLowerCase() ?? "";
	const params = parseQueryParameters(query);
	if (filename === "" || !filename.endsWith(".nl")) throw new Error("Invalid URL");

	if (filename === "scriptlet.nl" || filename === "restlet.nl") {
		const script = params["script"]?.trim() ?? "";
		const deploy = params["deploy"]?.trim() ?? "";
		if (deploy === "") throw new Error("The script URL does not contain a deployment ID");
		return script === ""
			? {type: "scriptdeployment", id: deploy}
			: {type: "scriptdeployment", id: deploy, parentScriptId: script};
	}

	const rectype = params["rectype"]?.trim();
	const routeType = rectype || routeTypes[filename];
	const searchId = params["searchid"]?.trim();
	const id = (searchId || params["id"] || params["e"] || "").trim();
	if (id === "") throw new Error("The URL does not contain a recognizable ID");
	if (routeType) return {type: normalizeTargetType(routeType), id};

	throw new Error(`The URL contains ID ${id}, but its record type is ambiguous; choose a type and use the ID field`);
}

function parseQueryParameters(query: string): Record<string, string> {
	const params: Record<string, string> = {};
	for (const part of query.replace(/&amp;/gi, "&").split("&")) {
		if (part === "") continue;
		const equals = part.indexOf("=");
		const rawKey = equals < 0 ? part : part.slice(0, equals);
		const rawValue = equals < 0 ? "" : part.slice(equals + 1);
		try {
			const key = decodeURIComponent(rawKey.replace(/\+/g, " ")).toLowerCase();
			if (!(key in params)) params[key] = decodeURIComponent(rawValue.replace(/\+/g, " "));
		} catch (_e) {
			throw new Error("Invalid URL");
		}
	}
	return params;
}

export function normalizeTargetType(value: string): string {
	const raw = value.trim().toLowerCase();
	const aliasKey = raw.replace(/[\s_-]+/g, "");
	const aliases: Readonly<Record<string, string>> = {
		filecabinetfile: "file",
		savedsearch: "savedsearch",
		scriptdeployment: "scriptdeployment",
		class: "classification",
		transaction: "transaction",
		scriptrecord: "script",
	};
	return aliases[aliasKey] ?? raw;
}

export function targetKind(type: string): ReverseLookupKind {
	if (type === "file") return "file";
	if (type === "script") return "script";
	if (type === "scriptdeployment") return "script-deployment";
	if (type === "savedsearch") return "saved-search";
	return "record";
}

export function targetKey(type: string, id: string): string {
	return normalizeTargetType(type) + ":" + id.trim().toLowerCase();
}

export function normalizeFolderPath(value: string): string {
	const path = value
		.trim()
		.replace(/\\/g, "/")
		.replace(/^\/+|\/+$/g, "")
		.replace(/\/{2,}/g, "/");
	if (path === "") throw new Error("A File Cabinet folder path is required for source scanning");
	if (path.split("/").some(part => part === "." || part === "..")) {
		throw new Error("Folder paths cannot contain . or .. segments");
	}
	return path;
}

export interface SourceMatch {
	line: number;
	excerpt: string;
}

export function findStableIdentifierMatches(source: string, identifier: string, limit = 20): SourceMatch[] {
	const needle = identifier.trim();
	if (needle === "" || /^-?\d+$/.test(needle)) return [];
	const stableId = /^custom(?:search|script|deploy)[a-z0-9_]*$/i.test(needle);
	const haystack = source.toLowerCase();
	const lowerNeedle = needle.toLowerCase();
	const matches: SourceMatch[] = [];
	let from = 0;

	while (matches.length < limit) {
		const index = haystack.indexOf(lowerNeedle, from);
		if (index < 0) break;
		from = index + lowerNeedle.length;
		if (stableId) {
			const before = index > 0 ? source[index - 1]! : "";
			const after = source[index + needle.length] ?? "";
			if (/[a-z0-9_]/i.test(before) || /[a-z0-9_]/i.test(after)) continue;
		}
		const lineStart = source.lastIndexOf("\n", index - 1) + 1;
		const nextNewline = source.indexOf("\n", index);
		const lineEnd = nextNewline < 0 ? source.length : nextNewline;
		const rawLine = source.slice(lineStart, lineEnd).trim();
		matches.push({
			line: source.slice(0, index).split("\n").length,
			excerpt: rawLine.length <= 180 ? rawLine : rawLine.slice(0, 177) + "...",
		});
	}
	return matches;
}

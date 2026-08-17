import file from "N/file";
import query from "N/query";
import search from "N/search";
import nsUrl from "N/url";
import type {QueryResultMap} from "N/query";

import {errorMessage} from "../lib/error-utils";
import {
	findStableIdentifierMatches,
	normalizeFolderPath,
	parseReverseLookupInput,
	targetKey,
	targetKind,
	type RelationshipGroup,
	type ReverseLookupNode,
	type ReverseLookupRequest,
	type ReverseLookupResponse,
	type ReverseLookupTarget,
} from "../lib/reverse-lookup";

const resultLimit = 100;
const sourceFileLimit = 50;

type MappedRow = QueryResultMap;

interface Provider {
	id: string;
	label: string;
	run(target: ReverseLookupTarget): ReverseLookupNode[];
}

export function runReverseLookup(request: ReverseLookupRequest): ReverseLookupResponse {
	if (!request.input) throw new Error("Lookup input is required");
	const parsed = parseReverseLookupInput(request.input);
	const target = resolveTarget(parsed.type, parsed.id, parsed.parentScriptId);
	const notices: string[] = [];
	const providers = providersFor(target);
	const groups = providers.map(provider => runProvider(provider, target));

	if (providers.length === 0) {
		notices.push(`No structured reverse-reference checks are registered for ${target.type}`);
	}

	if (request.sourceScan) {
		const identifier = target.scriptId ?? target.filePath ?? "";
		if (identifier === "") {
			notices.push(
				"Source scanning was skipped because this target has no stable script ID or File Cabinet path"
			);
		} else {
			groups.push(runSourceScan(target, identifier, request.sourceScan.folderPath));
		}
	}

	return {target, groups, notices};
}

function resolveTarget(type: string, id: string, parentScriptId?: string): ReverseLookupTarget {
	const kind = targetKind(type);
	if (kind === "file") {
		const loaded = file.load({id});
		return makeTarget(type, String(loaded.id), `File: ${loaded.path}`, {
			filePath: loaded.path,
		});
	}
	if (kind === "saved-search") {
		let loaded;
		try {
			loaded = search.load({id});
		} catch (e) {
			if (/^customsearch_/i.test(id)) {
				return makeTarget(type, id, `Saved Search: ${id}`, {scriptId: id});
			}
			throw e;
		}
		const internalId = loaded.searchId == null ? id : String(loaded.searchId);
		const scriptId = loaded.id || "";
		return makeTarget(
			type,
			internalId,
			`Saved Search: ${loaded.title || scriptId || internalId}`,
			scriptId ? {scriptId} : {}
		);
	}
	if (kind === "script") {
		const rows = selectRows(
			/^\d+$/.test(id)
				? "SELECT id, name, scriptid FROM script WHERE id = ? FETCH FIRST 1 ROWS ONLY"
				: "SELECT id, name, scriptid FROM script WHERE LOWER(scriptid) = LOWER(?) FETCH FIRST 1 ROWS ONLY",
			[id]
		);
		const row = rows[0];
		if (!row) throw new Error(`Script ${id} was not found`);
		const scriptId = stringValue(row, "scriptid");
		return makeTarget(
			type,
			stringValue(row, "id"),
			`Script: ${stringValue(row, "name") || id}`,
			scriptId ? {scriptId} : {}
		);
	}
	if (kind === "script-deployment") {
		const options = parentScriptId ? {parentScriptId} : {};
		return makeTarget(type, id, `Script Deployment: ${id}`, options);
	}
	return makeTarget(type, id, `${displayType(type)}: ${id}`);
}

function makeTarget(
	type: string,
	id: string,
	label: string,
	extra: Pick<ReverseLookupTarget, "scriptId" | "filePath" | "parentScriptId"> = {}
): ReverseLookupTarget {
	return {
		key: targetKey(type, id),
		kind: targetKind(type),
		type,
		id,
		label,
		...(extra.scriptId ? {scriptId: extra.scriptId} : {}),
		...(extra.filePath ? {filePath: extra.filePath} : {}),
		...(extra.parentScriptId ? {parentScriptId: extra.parentScriptId} : {}),
	};
}

function providersFor(target: ReverseLookupTarget): Provider[] {
	const providers: Provider[] = [];
	if (target.kind === "file") providers.push(fileScriptsProvider);
	if (target.kind === "script") providers.push(scriptDeploymentsProvider);

	if (entityTypes.has(target.type)) providers.push(entityTransactionsProvider);
	if (target.type === "customer") providers.push(customerContactsProvider, customerProjectsProvider);
	if (target.type === "item" || target.type.endsWith("item")) providers.push(itemTransactionsProvider);
	if (target.type === "account") providers.push(accountTransactionsProvider);
	if (target.type === "department" || target.type === "classification" || target.type === "location") {
		providers.push(classificationTransactionsProvider(target.type));
	}
	if (transactionTypes.has(target.type)) {
		providers.push(createdFromTransactionsProvider, linkedTransactionsProvider);
	}
	return providers;
}

function runProvider(provider: Provider, target: ReverseLookupTarget): RelationshipGroup {
	try {
		const found = provider.run(target);
		return {
			id: provider.id,
			label: provider.label,
			confidence: "structured",
			status: "ok",
			results: found.slice(0, resultLimit),
			truncated: found.length > resultLimit,
		};
	} catch (e) {
		return {
			id: provider.id,
			label: provider.label,
			confidence: "structured",
			status: "error",
			results: [],
			truncated: false,
			message: errorMessage(e),
		};
	}
}

const fileScriptsProvider: Provider = {
	id: "file-scripts",
	label: "Scripts using this file",
	run(target) {
		return rowsToNodes(
			selectRows(
				"SELECT id, name, scriptid FROM script WHERE scriptfile = ? ORDER BY id FETCH FIRST 101 ROWS ONLY",
				[target.id]
			),
			"script",
			row => `Script: ${stringValue(row, "name") || stringValue(row, "scriptid")}`,
			"Script File points to this File Cabinet file"
		);
	},
};

const scriptDeploymentsProvider: Provider = {
	id: "script-deployments",
	label: "Deployments of this script",
	run(target) {
		const deploymentSearch = search.create({
			type: search.Type.SCRIPT_DEPLOYMENT,
			filters: [
				search.createFilter({
					name: "script",
					operator: search.Operator.ANYOF,
					values: target.id,
				}),
			],
			columns: [
				search.createColumn({name: "internalid", sort: search.Sort.ASC}),
				search.createColumn({name: "title"}),
				search.createColumn({name: "scriptid"}),
			],
		});
		return (deploymentSearch.run().getRange({start: 0, end: resultLimit + 1}) ?? []).map(result => {
			const id = result.id;
			const title = String(result.getValue({name: "title"}) || "");
			const scriptId = String(result.getValue({name: "scriptid"}) || "");
			return {
				target: makeTarget("scriptdeployment", id, `Deployment: ${title || scriptId || id}`, {
					parentScriptId: target.id,
				}),
				evidence: "Deployment Script points to this script",
				...recordUrl("scriptdeployment", id),
			};
		});
	},
};

const entityTransactionsProvider: Provider = {
	id: "entity-transactions",
	label: "Transactions referring to this entity",
	run(target) {
		return transactionNodes(
			"SELECT id, tranid, type FROM transaction WHERE entity = ? ORDER BY id FETCH FIRST 101 ROWS ONLY",
			[target.id],
			"Transaction Entity points to this record"
		);
	},
};

const customerContactsProvider: Provider = {
	id: "customer-contacts",
	label: "Contacts belonging to this customer",
	run(target) {
		return rowsToNodes(
			selectRows("SELECT id, entityid FROM contact WHERE company = ? ORDER BY id FETCH FIRST 101 ROWS ONLY", [
				target.id,
			]),
			"contact",
			row => `Contact: ${stringValue(row, "entityid") || stringValue(row, "id")}`,
			"Contact Company points to this customer"
		);
	},
};

const customerProjectsProvider: Provider = {
	id: "customer-projects",
	label: "Projects belonging to this customer",
	run(target) {
		return rowsToNodes(
			selectRows("SELECT id, entityid FROM job WHERE customer = ? ORDER BY id FETCH FIRST 101 ROWS ONLY", [
				target.id,
			]),
			"job",
			row => `Project: ${stringValue(row, "entityid") || stringValue(row, "id")}`,
			"Project Customer points to this customer"
		);
	},
};

const itemTransactionsProvider: Provider = {
	id: "item-transactions",
	label: "Transactions containing this item",
	run(target) {
		return transactionNodes(
			"SELECT DISTINCT t.id, t.tranid, t.type FROM transaction t INNER JOIN transactionline tl ON tl.transaction = t.id WHERE tl.item = ? ORDER BY t.id FETCH FIRST 101 ROWS ONLY",
			[target.id],
			"A Transaction Line Item points to this item"
		);
	},
};

const accountTransactionsProvider: Provider = {
	id: "account-transactions",
	label: "Transactions posting to this account",
	run(target) {
		return transactionNodes(
			"SELECT DISTINCT t.id, t.tranid, t.type FROM transaction t INNER JOIN transactionaccountingline tal ON tal.transaction = t.id WHERE tal.account = ? ORDER BY t.id FETCH FIRST 101 ROWS ONLY",
			[target.id],
			"A Transaction Accounting Line Account points to this account"
		);
	},
};

function classificationTransactionsProvider(type: string): Provider {
	const field = type === "classification" ? "class" : type;
	return {
		id: `${type}-transactions`,
		label: `Transactions using this ${displayType(type)}`,
		run(target) {
			return transactionNodes(
				`SELECT DISTINCT t.id, t.tranid, t.type FROM transaction t INNER JOIN transactionline tl ON tl.transaction = t.id WHERE tl.${field} = ? ORDER BY t.id FETCH FIRST 101 ROWS ONLY`,
				[target.id],
				`A Transaction Line ${displayType(type)} points to this record`
			);
		},
	};
}

const createdFromTransactionsProvider: Provider = {
	id: "created-from-transactions",
	label: "Transactions created from this transaction",
	run(target) {
		return transactionNodes(
			"SELECT DISTINCT t.id, t.tranid, t.type FROM transaction t INNER JOIN transactionline tl ON tl.transaction = t.id WHERE tl.createdfrom = ? ORDER BY t.id FETCH FIRST 101 ROWS ONLY",
			[target.id],
			"Created From points to this transaction"
		);
	},
};

const linkedTransactionsProvider: Provider = {
	id: "linked-transactions",
	label: "Applying or downstream transactions",
	run(target) {
		return transactionNodes(
			"SELECT DISTINCT t.id, t.tranid, t.type FROM nexttransactionlinelink l INNER JOIN transaction t ON t.id = l.nextdoc WHERE l.previousdoc = ? ORDER BY t.id FETCH FIRST 101 ROWS ONLY",
			[target.id],
			"NetSuite's transaction link points back to this transaction"
		);
	},
};

function transactionNodes(sql: string, params: (string | number | boolean)[], evidence: string): ReverseLookupNode[] {
	return rowsToNodes(
		selectRows(sql, params),
		"transaction",
		row => `Transaction: ${stringValue(row, "tranid") || stringValue(row, "id")} (${stringValue(row, "type")})`,
		evidence
	);
}

function rowsToNodes(
	rows: MappedRow[],
	type: string,
	label: (row: MappedRow) => string,
	evidence: string,
	parentScriptId?: string
): ReverseLookupNode[] {
	return rows.map(row => {
		const id = stringValue(row, "id");
		const extra = parentScriptId ? {parentScriptId} : {};
		const target = makeTarget(type, id, label(row), extra);
		if (type === "script") {
			const scriptId = stringValue(row, "scriptid");
			if (scriptId) target.scriptId = scriptId;
		}
		return {
			target,
			evidence,
			...recordUrl(type, id),
		};
	});
}

function recordUrl(type: string, id: string): {url?: string} {
	try {
		return {url: nsUrl.resolveRecord({recordType: type, recordId: id})};
	} catch (_e) {
		return {};
	}
}

function selectRows(sql: string, params: (string | number | boolean)[]): MappedRow[] {
	return query.runSuiteQL({query: sql, params}).asMappedResults();
}

function stringValue(row: MappedRow, key: string): string {
	const value = row[key];
	return value == null ? "" : String(value);
}

function displayType(type: string): string {
	return type.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, c => c.toUpperCase());
}

function runSourceScan(target: ReverseLookupTarget, identifier: string, folderPath: string): RelationshipGroup {
	try {
		const normalizedPath = normalizeFolderPath(folderPath);
		const folderIds = descendantFolderIds(normalizedPath);
		const candidates = javascriptFiles(folderIds);
		const results: ReverseLookupNode[] = [];
		const identifiers = [identifier];
		if (target.kind === "file") {
			identifiers.push(identifier.startsWith("/") ? identifier.slice(1) : "/" + identifier);
		}

		for (const candidate of candidates.slice(0, sourceFileLimit)) {
			const loaded = file.load({id: candidate.id});
			const contents = loaded.getContents();
			for (const scanIdentifier of identifiers) {
				for (const match of findStableIdentifierMatches(contents, scanIdentifier)) {
					results.push({
						target: makeTarget("file", String(loaded.id), `File: ${loaded.path}`, {
							filePath: loaded.path,
						}),
						evidence: `Line ${match.line}: ${match.excerpt}`,
						...recordUrl("file", String(loaded.id)),
					});
				}
			}
		}

		return {
			id: "source-scan",
			label: `JavaScript source references to ${identifier}`,
			confidence: "heuristic",
			status: "ok",
			results: dedupeNodes(results).slice(0, resultLimit),
			truncated: candidates.length > sourceFileLimit || results.length > resultLimit,
			message: `Scanned ${Math.min(candidates.length, sourceFileLimit)} JavaScript file(s) below ${normalizedPath}`,
		};
	} catch (e) {
		return {
			id: "source-scan",
			label: `JavaScript source references to ${identifier}`,
			confidence: "heuristic",
			status: "error",
			results: [],
			truncated: false,
			message: errorMessage(e),
		};
	}
}

function descendantFolderIds(folderPath: string): string[] {
	const folderSearch = search.create({
		type: search.Type.FOLDER,
		filters: [],
		columns: [
			search.createColumn({name: "internalid", sort: search.Sort.ASC}),
			search.createColumn({name: "name"}),
			search.createColumn({name: "parent"}),
		],
	});
	const folders = new Map<string, {name: string; parent: string}>();
	const paged = folderSearch.runPaged({pageSize: 1000});
	for (const range of paged.pageRanges) {
		for (const result of paged.fetch({index: range.index}).data) {
			folders.set(result.id, {
				name: String(result.getValue({name: "name"})),
				parent: String(result.getValue({name: "parent"}) || ""),
			});
		}
	}

	const wanted = folderPath.toLowerCase();
	const root = [...folders.keys()].find(id => folderFullPath(id, folders).toLowerCase() === wanted);
	if (!root) throw new Error(`File Cabinet folder not found: ${folderPath}`);
	const ids = [root];
	for (let i = 0; i < ids.length; i++) {
		const parent = ids[i]!;
		for (const [id, folder] of folders) {
			if (folder.parent === parent && !ids.includes(id)) ids.push(id);
		}
	}
	return ids;
}

function folderFullPath(id: string, folders: Map<string, {name: string; parent: string}>): string {
	const parts: string[] = [];
	const seen = new Set<string>();
	let current = id;
	while (current !== "" && !seen.has(current)) {
		seen.add(current);
		const folder = folders.get(current);
		if (!folder) break;
		parts.unshift(folder.name);
		current = folder.parent;
	}
	return parts.join("/");
}

function javascriptFiles(folderIds: string[]): {id: string; name: string}[] {
	const fileSearch = search.create({
		type: "file",
		filters: [
			search.createFilter({name: "folder", operator: search.Operator.ANYOF, values: folderIds}),
			search.createFilter({name: "filetype", operator: search.Operator.ANYOF, values: "JAVASCRIPT"}),
		],
		columns: [
			search.createColumn({name: "internalid", sort: search.Sort.ASC}),
			search.createColumn({name: "name"}),
		],
	});
	return (fileSearch.run().getRange({start: 0, end: sourceFileLimit + 1}) ?? []).map(result => ({
		id: result.id,
		name: String(result.getValue({name: "name"})),
	}));
}

function dedupeNodes(nodes: ReverseLookupNode[]): ReverseLookupNode[] {
	const seen = new Set<string>();
	return nodes.filter(node => {
		const key = node.target.key + "|" + node.evidence;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

const entityTypes = new Set(["customer", "lead", "prospect", "vendor", "employee", "partner", "job", "othername"]);
const transactionTypes = new Set([
	"transaction",
	"salesorder",
	"invoice",
	"creditmemo",
	"cashsale",
	"purchaseorder",
	"vendorbill",
	"vendorcredit",
	"journalentry",
	"customerpayment",
	"itemfulfillment",
	"itemreceipt",
	"returnauthorization",
	"vendorreturnauthorization",
]);

import runtime from "N/runtime";

import {interpolate} from "./html";
import layoutHtml from "./layout.html";
import {version, mdlCssUrl, mdlJsUrl, paramPage, paramCommand} from "./constants";
import {setPageParam} from "./url";
import {clientModules} from "./client-modules";
import pages from "./pages/index";
import type {PageDef, SuiteletContext} from "./types";

export function main(context: SuiteletContext): void {
	const command = (context.request.parameters[paramCommand] as string | undefined) ?? "";
	if (command !== "") {
		dispatchCommand(context, command);
		return;
	}
	renderPage(context);
}

// Embeds the module source as a data: URL so the browser can load it without
// hitting NetSuite's Content-Type restrictions on Suitelet responses.
function moduleDataUrl(id: string): string {
	const source = clientModules[id];
	if (source === undefined) {
		throw new Error(`Unknown client module id: ${id}`);
	}
	return "data:text/javascript;charset=utf-8," + encodeURIComponent(source);
}

function dispatchCommand(context: SuiteletContext, command: string): void {
	const page = pages.find(p => p.commands && command in p.commands);
	let responseText: string;
	if (!page || !page.commands) {
		responseText = `Error: unknown command '${command}'`;
	} else {
		try {
			const handler = page.commands[command]!;
			responseText = "" + String(handler(context));
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			responseText = `Error: ${message}`;
		}
	}
	context.response.write(responseText || "(blank)");
}

function renderPage(context: SuiteletContext): void {
	const requestedPage = context.request.parameters[paramPage] as string | undefined;
	const defaultPage = pages[0]!;
	const page = pages.find(p => p.name === requestedPage) ?? defaultPage;

	const navigationLink = (p: PageDef): string => `
		<a class="mdl-navigation__link ${p.name === page.name ? "mdl-navigation__link--current" : ""}"
				href="${setPageParam(context, p.name)}">
			${p.label}
		</a>`;

	const navHtml = navigationLink(defaultPage) + "<hr/>" + pages.slice(1).map(navigationLink).join("");

	context.response.write(
		interpolate(layoutHtml, {
			title: `${page.label} - AO Dashboard`,
			mdlCssUrl,
			mdlJsUrl,
			version,
			nsVersion: runtime.version || "[unknown version]",
			navHtml,
			clientCsvUrlJs: moduleDataUrl("csv"),
			clientBulkRunnerUrlJs: moduleDataUrl("bulk-runner"),
			clientEditRecordsUrlJs: moduleDataUrl("edit-records"),
			clientRecordTypeUrlJs: moduleDataUrl("record-type"),
			clientSuiteqlUrlJs: moduleDataUrl("suiteql"),
			bodyHtml: page.render(context),
		})
	);
}

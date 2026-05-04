import runtime from "N/runtime";

import {interpolate, escapeHtml} from "../lib/html";
import layoutHtml from "./layout.html";
import {version, mdlCssUrl, mdlJsUrl, paramPage, paramCommand} from "./constants";
import {setPageParam} from "../lib/url";
import {buildImportMapJson} from "./client-modules";
import {failure, fromError} from "./command";
import pages from "../pages/index";
import type {CommandResponse, PageDef, SuiteletContext} from "./types";

export function main(context: SuiteletContext): void {
	const command = (context.request.parameters[paramCommand] as string | undefined) ?? "";
	if (command !== "") {
		dispatchCommand(context, command);
		return;
	}
	renderPage(context);
}

function dispatchCommand(context: SuiteletContext, command: string): void {
	const page = pages.find(p => p.commands && command in p.commands);
	let envelope: CommandResponse;
	if (!page || !page.commands) {
		envelope = failure(`Unknown command '${command}'`, "UNKNOWN_COMMAND");
	} else {
		try {
			envelope = page.commands[command]!(context);
		} catch (e) {
			envelope = fromError(e);
		}
	}
	context.response.write(JSON.stringify(envelope));
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
			// `Js` suffix: the import map JSON contains `&` and `"` that must
			// not be HTML-escaped — it lives inside a <script> block.
			importMapJsonJs: buildImportMapJson(),
			// Pages can opt into layout-level overrides via PageDef.bodyClass.
			// Escaped because it's a regular HTML attribute value.
			bodyClassesHtml: escapeHtml(page.bodyClass ?? ""),
			bodyHtml: page.render(context),
		})
	);
}

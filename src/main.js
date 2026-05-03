import runtime from "N/runtime";

import { interpolate } from "./html.js";
import layoutHtml from "./layout.html";
import { version, mdlCssUrl, mdlJsUrl, paramPage, paramCommand } from "./constants.js";
import { setPageParam } from "./url.js";
import pages from "./pages/index.js";


export function main(context) {
	const command = context.request.parameters[paramCommand] || "";
	if (command !== "") {
		dispatchCommand(context, command);
		return;
	}
	renderPage(context);
}


function dispatchCommand(context, command) {
	const page = pages.find(p => p.commands && command in p.commands);
	let responseText;
	if (! page) {
		responseText = `Error: unknown command '${command}'`;
	}
	else {
		try {
			responseText = "" + page.commands[command](context);
		}
		catch (e) {
			responseText = `Error: ${e.message}`;
		}
	}
	context.response.write(responseText || "(blank)");
}


function renderPage(context) {
	const requestedPage = context.request.parameters[paramPage];
	const page = pages.find(p => p.name === requestedPage) || pages[0];
	const defaultPage = pages[0];

	const navigationLink = p => `
		<a class="mdl-navigation__link ${p.name === page.name ? 'mdl-navigation__link--current' : ''}"
				href="${setPageParam(context, p.name)}">
			${p.label}
		</a>`;

	const navHtml = navigationLink(defaultPage)
		+ "<hr/>"
		+ pages.slice(1).map(navigationLink).join("");

	context.response.write(interpolate(layoutHtml, {
		title: `${page.label} - AO Dashboard`,
		mdlCssUrl,
		mdlJsUrl,
		version,
		nsVersion: runtime.version || "[unknown version]",
		navHtml,
		bodyHtml: page.render(context),
	}));
}

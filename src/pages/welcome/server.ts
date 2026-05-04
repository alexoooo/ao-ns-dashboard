import runtime from "N/runtime";

import {interpolate} from "../../html";
import templateHtml from "./template.html";
import type {PageDef, SuiteletContext} from "../../types";

const welcomePage: PageDef = {
	name: "welcome",
	label: "Welcome",

	render(_context: SuiteletContext): string {
		const displayName = runtime.getCurrentUser().name;
		const name = displayName.startsWith("EMP") ? displayName.split(" ").slice(1).join(" ") : displayName;
		return interpolate(templateHtml, {name});
	},
};

export default welcomePage;

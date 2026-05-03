import runtime from "N/runtime";

import { interpolate } from "../../html.js";
import templateHtml from "./template.html";


export default {
	name: "welcome",
	label: "Welcome",

	render(context) {
		const displayName = runtime.getCurrentUser().name;
		const name = displayName.startsWith("EMP")
			? displayName.split(" ").slice(1).join(" ")
			: displayName;
		return interpolate(templateHtml, { name });
	},
};

import { paramCommand, paramPage } from "./constants.js";


export function getCommandParam(context) {
	return context.request.parameters[paramCommand] || "";
}


export function scriptDeployParam(context) {
	return "?script=" + context.request.parameters["script"] + "&" +
		"deploy=" + context.request.parameters["deploy"];
}


export function setPageParam(context, page) {
	return scriptDeployParam(context) + "&" +
		paramPage + "=" + page;
}

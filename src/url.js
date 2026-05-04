import { paramCommand, paramPage } from "./constants.js";


export function getCommandParam(context) {
	return context.request.parameters[paramCommand] || "";
}


export function scriptDeployParam(context) {
	const script = context.request.parameters["script"];
	const deploy = context.request.parameters["deploy"];
	if (! /^\d+$/.test(script || "") || ! /^\d+$/.test(deploy || "")) {
		throw new Error("Invalid script/deploy parameters");
	}
	return "?script=" + script + "&deploy=" + deploy;
}


export function setPageParam(context, page) {
	return scriptDeployParam(context) + "&" +
		paramPage + "=" + page;
}

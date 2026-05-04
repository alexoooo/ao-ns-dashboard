import {paramCommand, paramPage} from "../app/constants";
import type {SuiteletContext} from "../app/types";

export function getCommandParam(context: SuiteletContext): string {
	return (context.request.parameters[paramCommand] as string | undefined) || "";
}

export function scriptDeployParam(context: SuiteletContext): string {
	const script = context.request.parameters["script"] as string | undefined;
	const deploy = context.request.parameters["deploy"] as string | undefined;
	if (!/^\d+$/.test(script || "") || !/^\d+$/.test(deploy || "")) {
		throw new Error("Invalid script/deploy parameters");
	}
	return "?script=" + script + "&deploy=" + deploy;
}

export function setPageParam(context: SuiteletContext, page: string): string {
	return scriptDeployParam(context) + "&" + paramPage + "=" + page;
}

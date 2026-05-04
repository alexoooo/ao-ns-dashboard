// Command response envelope helpers.
//
// Every `?command=<name>` POST returns a JSON-serialized `CommandResponse<T>`
// (see types.ts). The dispatcher wraps invocations in a try/catch so individual
// handlers don't have to. Use `success(data)` / `failure(message, code?)` from
// inside a handler; the dispatcher will JSON-stringify the result.

import {errorMessage, errorName} from "./error-utils";
import type {CommandResponse} from "./types";

export function success<T>(data: T): CommandResponse<T> {
	return {ok: true, data};
}

export function failure(message: string, code?: string): CommandResponse<never> {
	return {ok: false, error: code !== undefined && code !== "" ? {code, message} : {message}};
}

// Wrap a thrown error as a `failure` envelope, preserving its `.name` as the
// error code where available (e.g. NetSuite's `RCRD_DSNT_EXIST`).
export function fromError(e: unknown): CommandResponse<never> {
	return failure(errorMessage(e), errorName(e));
}

// Typed helpers for `N/record` load/delete with consistent error code mapping.
//
// NetSuite throws `SuiteScriptError` with `name` codes like `RCRD_DSNT_EXIST`
// and `INVALID_RCRD_TYPE`. These helpers re-throw with the same name preserved
// so command handlers can either catch+convert or let the dispatcher's
// `fromError()` build a typed `failure` envelope.

import record from "N/record";
import type {Record as NsRecord} from "N/record";

// Codes worth handling explicitly in callers; treat any other thrown error
// as an opaque internal failure.
export const errorCodes = {
	recordDoesNotExist: "RCRD_DSNT_EXIST",
	invalidRecordType: "INVALID_RCRD_TYPE",
} as const;

export function loadRecord(type: string, id: string | number): NsRecord {
	return record.load({type, id});
}

export function deleteRecord(type: string, id: string | number): void {
	record.delete({type, id});
}

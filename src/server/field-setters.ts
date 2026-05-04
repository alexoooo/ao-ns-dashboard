// Shared field-mutation helpers for the edit-records and create-records pages.
//
// Two call shapes:
//
//   - `setRecordField` / `setSublistField` — *edit* semantics: read existing
//     value first, only write if changed, return a validator that compares
//     before / after / target on the reloaded record.
//   - `setRecordFieldDefault` — *create-default* semantics: set
//     unconditionally during `record.create({defaultValues})` flow, return a
//     validator that confirms the value persisted.
//
// All four `set*` functions return a `Validator` thunk that produces a
// human-readable message when invoked against the reloaded record.

import type {Record as NsRecord, FieldValue} from "N/record";

import {listsEqual} from "../lib/utils";
import {getSublistLine} from "./sublist";

// Returned by every set-* function: a thunk that takes the reloaded record
// and produces a message describing what actually happened.
export type Validator = (reload: NsRecord) => string;

// =============================================================================
// Edit semantics: compare existing → set if changed → validate after save.
// =============================================================================

export function setRecordField(rec: NsRecord, fieldId: string, fieldText: string | string[]): Validator {
	const field = rec.getField({fieldId});
	if (field == null) {
		throw new Error("Field not found: " + fieldId);
	}
	if (field.type === "select" || field.type === "multiselect") {
		return setRecordSelect(rec, fieldId, fieldText, field.type === "multiselect");
	}

	if (Array.isArray(fieldText)) {
		throw new Error("Single value expected (" + fieldId + "): " + fieldText.join(","));
	}

	const existingText = readText(() => rec.getText({fieldId}));
	if (existingText !== fieldText) {
		rec.setText({fieldId, text: fieldText});
	}

	return reload => {
		const afterUpdate = readText(() => reload.getText({fieldId}));
		return validateSetField(fieldId, existingText, fieldText, afterUpdate);
	};
}

function setRecordSelect(rec: NsRecord, fieldId: string, fieldText: string | string[], multi: boolean): Validator {
	const norm = normalizeSelectInput(fieldId, fieldText, multi);

	if (norm.kind === "ids") {
		const existingValue = rec.getValue({fieldId});
		const existingList = toList<unknown>(existingValue);
		if (!listsEqual(norm.asList, existingList)) {
			rec.setValue({
				fieldId,
				value: (multi ? norm.fieldValues : norm.fieldValues[0]) as FieldValue,
			});
		}
		return reload => {
			const afterUpdate = reload.getValue({fieldId});
			return validateSetField(
				fieldId,
				"" + String(existingList),
				"" + norm.asList.join(","),
				"" + String(afterUpdate)
			);
		};
	}

	const existingText = rec.getText({fieldId});
	const existingList = toList<string>(existingText);

	if (!listsEqual(norm.asList, existingList)) {
		rec.setText({fieldId, text: (multi ? norm.asList : norm.asList[0]) as string});
	}

	return reload => {
		const afterUpdate = readText(() => reload.getText({fieldId}));
		const target = typeof fieldText === "string" ? fieldText : fieldText.join(",");
		return validateSetField(fieldId, "" + String(existingText), "" + target, "" + afterUpdate);
	};
}

export function setSublistField(
	rec: NsRecord,
	sublistId: string,
	sublistLineQuery: string,
	fieldId: string,
	fieldText: string | string[]
): Validator {
	const sublistLine = getSublistLine(rec, sublistId, sublistLineQuery);

	const field = rec.getSublistField({sublistId, fieldId, line: sublistLine});
	if (field == null) {
		throw new Error("Sublist field not found: " + sublistId + "/" + fieldId);
	}
	if (field.type === "select" || field.type === "multiselect") {
		return setSublistSelect(
			rec,
			sublistId,
			sublistLineQuery,
			fieldId,
			sublistLine,
			fieldText,
			field.type === "multiselect"
		);
	}

	if (Array.isArray(fieldText)) {
		throw new Error(
			"Single value expected (" + sublistId + "/" + sublistLineQuery + "/" + fieldId + "): " + fieldText.join(",")
		);
	}

	const existingText = rec.getSublistText({sublistId, fieldId, line: sublistLine});

	if (existingText !== fieldText) {
		rec.setSublistText({sublistId, fieldId, line: sublistLine, text: fieldText});
	}

	return reload => {
		const reloadSublistLine = getSublistLine(reload, sublistId, sublistLineQuery);
		const afterUpdate = reload.getSublistText({sublistId, fieldId, line: reloadSublistLine});
		return validateSetField(fieldId, existingText, fieldText, afterUpdate);
	};
}

function setSublistSelect(
	rec: NsRecord,
	sublistId: string,
	sublistLineQuery: string,
	fieldId: string,
	sublistLine: number,
	fieldText: string | string[],
	multi: boolean
): Validator {
	const where = sublistId + "/" + sublistLineQuery + "/" + fieldId;
	const norm = normalizeSelectInput(where, fieldText, multi);

	if (norm.kind === "ids") {
		const existingValue = rec.getSublistValue({sublistId, fieldId, line: sublistLine});
		const existingList = toList<unknown>(existingValue);
		if (!listsEqual(norm.asList, existingList)) {
			rec.setSublistValue({
				sublistId,
				fieldId,
				line: sublistLine,
				value: (multi ? norm.fieldValues : norm.fieldValues[0]) as FieldValue,
			});
		}
		return reload => {
			const afterUpdate = reload.getSublistValue({sublistId, fieldId, line: sublistLine});
			return validateSetField(
				fieldId,
				"" + String(existingList),
				"" + norm.asList.join(","),
				"" + String(afterUpdate)
			);
		};
	}

	const existingText = rec.getSublistText({sublistId, fieldId, line: sublistLine});
	const existingList = toList<string>(existingText);

	if (!listsEqual(norm.asList, existingList)) {
		rec.setSublistText({
			sublistId,
			fieldId,
			line: sublistLine,
			text: (multi ? norm.asList : norm.asList[0]) as string,
		});
	}

	return reload => {
		const reloadSublistLine = getSublistLine(reload, sublistId, sublistLineQuery);
		const afterUpdate = reload.getSublistText({sublistId, fieldId, line: reloadSublistLine});
		const afterUpdateAsList = toList<string>(afterUpdate);
		return validateSetField(
			fieldId,
			"" + JSON.stringify(existingList),
			"" + JSON.stringify(norm.asList),
			"" + JSON.stringify(afterUpdateAsList)
		);
	};
}

export function validateSetField(
	fieldId: string,
	existingText: string,
	fieldText: string,
	afterUpdate: string
): string {
	if (existingText === fieldText) {
		if (existingText === afterUpdate) {
			return `Did not change ${fieldId}, already set to '${existingText}'`;
		}
		return `Unexpected change ${fieldId}, was already '${existingText}' but now '${afterUpdate}'`;
	}
	if (existingText === afterUpdate) {
		return `Unable to change ${fieldId}, still '${existingText}'`;
	}
	if (fieldText === afterUpdate) {
		return `Changed ${fieldId} from '${existingText}' to '${afterUpdate}'`;
	}
	return `Unexpected ${fieldId} change, tried '${fieldText}' but got '${afterUpdate}'`;
}

// =============================================================================
// Create-default semantics: set unconditionally, validator confirms persistence.
// =============================================================================

export function setRecordFieldDefault(rec: NsRecord, fieldId: string, fieldText: string | string[]): Validator {
	const field = rec.getField({fieldId});
	if (field == null) {
		throw new Error("Field not found: " + fieldId);
	}
	if (field.type === "select" || field.type === "multiselect") {
		return setRecordSelectDefault(rec, fieldId, fieldText, field.type === "multiselect");
	}

	if (Array.isArray(fieldText)) {
		throw new Error("Single value expected (" + fieldId + "): " + fieldText.join(","));
	}

	rec.setText({fieldId, text: fieldText});

	return reload => {
		const afterSave = readText(() => reload.getText({fieldId}));
		return afterSave === fieldText
			? `Default ${fieldId} to '${fieldText}'`
			: `Unexpected ${fieldId} default, tried '${fieldText}' but got '${afterSave}'`;
	};
}

function setRecordSelectDefault(
	rec: NsRecord,
	fieldId: string,
	fieldText: string | string[],
	multi: boolean
): Validator {
	const norm = normalizeSelectInput(fieldId, fieldText, multi);
	const target = typeof fieldText === "string" ? fieldText : fieldText.join(",");

	if (norm.kind === "ids") {
		rec.setValue({
			fieldId,
			value: (multi ? norm.fieldValues : norm.fieldValues[0]) as FieldValue,
		});
		return reload => {
			const afterSave = reload.getValue({fieldId});
			const afterSaveList = toList<unknown>(afterSave);
			return listsEqual(norm.asList, afterSaveList)
				? `Default ${fieldId} to '${target}'`
				: `Unexpected ${fieldId} default, tried '${target}' but got '${String(afterSave)}'`;
		};
	}

	rec.setText({fieldId, text: (multi ? norm.asList : norm.asList[0]) as string});

	return reload => {
		const afterSave = reload.getText({fieldId});
		const afterSaveList = toList<string>(afterSave);
		return listsEqual(norm.asList, afterSaveList)
			? `Default ${fieldId} to '${target}'`
			: `Unexpected ${fieldId} default, tried '${target}' but got '${String(afterSave)}'`;
	};
}

// =============================================================================
// Internal helpers
// =============================================================================

interface NormalizedIds {
	kind: "ids";
	asList: string[];
	fieldValues: number[];
}

interface NormalizedText {
	kind: "text";
	asList: string[];
}

type NormalizedSelectInput = NormalizedIds | NormalizedText;

// Normalise a `select`/`multiselect` input. NetSuite accepts either numeric
// IDs or display text but not a mix. This helper enforces that and reports
// which form the caller supplied.
function normalizeSelectInput(where: string, fieldText: string | string[], multi: boolean): NormalizedSelectInput {
	const asList = Array.isArray(fieldText) ? fieldText : [fieldText];
	if (!multi && asList.length > 1) {
		throw new Error("Single value expected (" + where + "): " + asList.join(","));
	}

	const allIds = asList.every(i => /^-?\d+$/.test(i.trim()));
	const someIds = asList.some(i => /^-?\d+$/.test(i.trim()));
	if (someIds && !allIds) {
		throw new Error("All must be text or all must be IDs (" + where + "): " + asList.join(","));
	}

	if (allIds) {
		return {kind: "ids", asList, fieldValues: asList.map(i => parseInt(i))};
	}
	return {kind: "text", asList};
}

function toList<T>(value: unknown): T[] {
	return Array.isArray(value) ? (value as T[]) : ([value] as T[]);
}

// `getText` and `getSublistText` can return `string | string[]`. Normalise to
// a flat string so comparisons with the input fieldText (always a string in
// non-array codepaths) work correctly.
function readText(fn: () => string | string[]): string {
	const raw = fn();
	return Array.isArray(raw) ? raw.join(",") : raw;
}

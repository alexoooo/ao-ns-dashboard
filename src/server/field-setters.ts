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

import type {Record as NsRecord, Field as NsField, FieldValue} from "N/record";

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
		return setRecordSelect(rec, field, fieldId, fieldText, field.type === "multiselect");
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

function setRecordSelect(
	rec: NsRecord,
	field: NsField,
	fieldId: string,
	fieldText: string | string[],
	multi: boolean
): Validator {
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
		const valueBefore = rec.getValue({fieldId});
		rec.setText({fieldId, text: (multi ? norm.asList : norm.asList[0]) as string});
		assertSelectTextResolved(
			field,
			fieldId,
			norm.asList,
			valueBefore,
			rec.getValue({fieldId}),
			rec.getText({fieldId})
		);
	}

	return reload => {
		const afterUpdate = readText(() => reload.getText({fieldId}));
		return validateSetField(fieldId, "" + String(existingText), "" + norm.asList.join(","), "" + afterUpdate);
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
			field,
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
	field: NsField,
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
		const valueBefore = rec.getSublistValue({sublistId, fieldId, line: sublistLine});
		rec.setSublistText({
			sublistId,
			fieldId,
			line: sublistLine,
			text: (multi ? norm.asList : norm.asList[0]) as string,
		});
		assertSelectTextResolved(
			field,
			where,
			norm.asList,
			valueBefore,
			rec.getSublistValue({sublistId, fieldId, line: sublistLine}),
			rec.getSublistText({sublistId, fieldId, line: sublistLine})
		);
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

// Compares before / target / after on the reloaded record and describes what
// happened. Failure messages are prefixed with `Error:` on purpose: the
// bulk-runner colours a result row red when its text contains "error"
// (bulk-runner.client.ts), and without the prefix a field that silently
// refused to change looked exactly like a success.
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
		return `Error: unexpected change ${fieldId}, was already '${existingText}' but now '${afterUpdate}'`;
	}
	if (existingText === afterUpdate) {
		return `Error: unable to change ${fieldId}, still '${existingText}'`;
	}
	if (fieldText === afterUpdate) {
		return `Changed ${fieldId} from '${existingText}' to '${afterUpdate}'`;
	}
	return `Error: unexpected ${fieldId} change, tried '${fieldText}' but got '${afterUpdate}'`;
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
		return setRecordSelectDefault(rec, field, fieldId, fieldText, field.type === "multiselect");
	}

	if (Array.isArray(fieldText)) {
		throw new Error("Single value expected (" + fieldId + "): " + fieldText.join(","));
	}

	rec.setText({fieldId, text: fieldText});

	return reload => {
		const afterSave = readText(() => reload.getText({fieldId}));
		return afterSave === fieldText
			? `Default ${fieldId} to '${fieldText}'`
			: `Error: unexpected ${fieldId} default, tried '${fieldText}' but got '${afterSave}'`;
	};
}

function setRecordSelectDefault(
	rec: NsRecord,
	field: NsField,
	fieldId: string,
	fieldText: string | string[],
	multi: boolean
): Validator {
	const norm = normalizeSelectInput(fieldId, fieldText, multi);
	const target = norm.asList.join(",");

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
				: `Error: unexpected ${fieldId} default, tried '${target}' but got '${String(afterSave)}'`;
		};
	}

	const valueBefore = rec.getValue({fieldId});
	rec.setText({fieldId, text: (multi ? norm.asList : norm.asList[0]) as string});
	assertSelectTextResolved(field, fieldId, norm.asList, valueBefore, rec.getValue({fieldId}), rec.getText({fieldId}));

	return reload => {
		const afterSave = reload.getText({fieldId});
		const afterSaveList = toList<string>(afterSave);
		return listsEqual(norm.asList, afterSaveList)
			? `Default ${fieldId} to '${target}'`
			: `Error: unexpected ${fieldId} default, tried '${target}' but got '${String(afterSave)}'`;
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
//
// Values are trimmed: surrounding whitespace is never meaningful in an option
// label, and `setText(" Sales")` silently matches nothing, so an input like
// `dept= Sales` used to look like it applied but quietly did nothing. IDs were
// already whitespace-tolerant via `parseInt`.
export function normalizeSelectInput(
	where: string,
	fieldText: string | string[],
	multi: boolean
): NormalizedSelectInput {
	const asList = (Array.isArray(fieldText) ? fieldText : [fieldText]).map(i => i.trim());
	if (!multi && asList.length > 1) {
		throw new Error("Single value expected (" + where + "): " + asList.join(","));
	}

	const allIds = asList.every(i => /^-?\d+$/.test(i));
	const someIds = asList.some(i => /^-?\d+$/.test(i));
	if (someIds && !allIds) {
		throw new Error("All must be text or all must be IDs (" + where + "): " + asList.join(","));
	}

	if (allIds) {
		return {kind: "ids", asList, fieldValues: asList.map(i => parseInt(i))};
	}
	return {kind: "text", asList};
}

// `setText` on a select field does nothing at all when the text matches no
// available option — no throw, no partial write. The common causes are a
// wrong case, a leaf name where NetSuite displays the full `Parent : Child`
// label, and options past the 1000-entry cap that text lookup can't see.
// Detect it here, while the record is still unsaved, so the task fails loudly
// instead of reporting a change that never happened.
function assertSelectTextResolved(
	field: NsField,
	where: string,
	wanted: string[],
	valueBefore: unknown,
	valueAfter: unknown,
	textAfter: string | string[]
): void {
	// The underlying value moved, so the text did resolve to an option.
	if ("" + String(valueBefore) !== "" + String(valueAfter)) {
		return;
	}
	// Value unchanged but the field now reads back as what was asked for —
	// it was already set to that option.
	if (listsEqual(wanted, toList<string>(textAfter))) {
		return;
	}
	throw new Error(
		"Could not resolve text for " + where + ": '" + wanted.join(",") + "'" + selectOptionHint(field, wanted)
	);
}

// Best-effort "did you mean" for an unresolved option label. `getSelectOptions`
// throws on field types it doesn't support and returns [] when the list is
// longer than 1000 entries, so both are treated as "no suggestions".
function selectOptionHint(field: NsField, wanted: string[]): string {
	const candidates: string[] = [];
	try {
		for (const text of wanted) {
			for (const option of field.getSelectOptions({filter: text, operator: "contains"})) {
				if (option.text && !candidates.includes(option.text)) {
					candidates.push(option.text);
				}
			}
		}
	} catch (_e) {
		// Unsupported field type — fall through to the generic hint.
	}

	if (candidates.length === 0) {
		return " - no matching option found (text lookup cannot see past the first 1000 options; use the internal ID instead)";
	}
	return (
		" - did you mean: " +
		candidates
			.slice(0, 5)
			.map(i => "'" + i + "'")
			.join(", ") +
		"?"
	);
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

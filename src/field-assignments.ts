// Parsing for the `fieldId=value` syntax used in task strings on
// lookup-fields, edit-records, and create-records pages.

import {normalizeKey, splitAmpersand} from "./utils";

export interface FieldAssignment {
	fieldId: string;
	fieldText: string | string[];
}

export function parseFieldAssignment(fieldAssignment: string): FieldAssignment {
	const firstEquals = fieldAssignment.indexOf("=");
	if (firstEquals === -1) {
		throw new Error("Field assignment expected (fieldId=value): " + fieldAssignment);
	}

	const fieldId = fieldAssignment.substring(0, firstEquals);
	const fieldText = fieldAssignment.substring(firstEquals + 1);

	return {
		fieldId: normalizeKey(fieldId),
		fieldText,
	};
}

// Parses an `&`-separated list of `fieldId=value` pairs into an array
// of `{fieldId, fieldText}` objects. When a fieldId appears multiple
// times its values are gathered into an array (multi-select fields).
export function parseFieldAssignmentList(fieldAssignmentList: string): FieldAssignment[] {
	if (fieldAssignmentList === "") {
		return [];
	}

	const parts = splitAmpersand(fieldAssignmentList);
	const assignments = parts.map(i => parseFieldAssignment(i));

	const groupByFieldId: Record<string, FieldAssignment[]> = {};
	for (const i of assignments) {
		const existing = groupByFieldId[i.fieldId] ?? [];
		existing.push(i);
		groupByFieldId[i.fieldId] = existing;
	}

	const withMultiSelect: FieldAssignment[] = [];
	for (const fieldId of Object.keys(groupByFieldId)) {
		const fieldAssignments = groupByFieldId[fieldId]!;
		if (fieldAssignments.length === 1) {
			withMultiSelect.push(fieldAssignments[0]!);
		} else {
			withMultiSelect.push({
				fieldId,
				fieldText: fieldAssignments.map(i => i.fieldText as string),
			});
		}
	}

	return withMultiSelect;
}

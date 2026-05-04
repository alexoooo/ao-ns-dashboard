// Sublist line resolution helpers.
//
// Used by lookup-fields and edit-records to translate a textual line query
// (a number, a `fieldId=value` predicate, or `&`-joined predicates) into
// concrete line numbers on a NetSuite record's sublist.

import type {Record as NsRecord} from "N/record";

import {splitAmpersand} from "../utils";
import {parseFieldAssignment} from "../field-assignments";

// Resolve a sublist-line query that must match exactly one line. Throws if
// zero or more-than-one lines match.
export function getSublistLine(rec: NsRecord, sublistId: string, sublistLineQuery: string): number {
	const matches = findSublistLines(rec, sublistId, sublistLineQuery);
	if (matches.length === 0) {
		throw new Error("Sublist line not found: " + sublistLineQuery);
	}
	if (matches.length > 1) {
		throw new Error(`Multiple matching sublist lines (${matches.join(",")}): ${sublistLineQuery}`);
	}
	return matches[0]!;
}

// Resolve a sublist-line query to candidate line numbers. The query is a
// `&`-joined conjunction of predicates; each predicate is either:
//   - a numeric line index (negative counts from end; `-0` = "after last")
//   - a `fieldId=value` clause matched against `getSublistText` then by number.
export function findSublistLines(rec: NsRecord, sublistId: string, sublistLineQuery: string): number[] {
	const count = rec.getLineCount({sublistId});

	const conjunctions = splitAmpersand(sublistLineQuery);

	let candidates = [...Array(count).keys()];
	for (const conjunction of conjunctions) {
		if (candidates.length === 0) {
			return [];
		}

		const asNumber = Number(conjunction);
		if (Number.isInteger(asNumber)) {
			// NB: negative numbers count from the end. `-0` is the special
			// "after last" sentinel used by the insert action.
			if (!conjunction.startsWith("-")) {
				if (asNumber >= candidates.length) {
					throw new Error(`Line ${asNumber} is too big: ${candidates.join(",")}`);
				}
				return [candidates[asNumber]!];
			}
			if (-asNumber > candidates.length) {
				throw new Error(`Line ${asNumber} is too small: ${candidates.join(",")}`);
			}
			if (asNumber === 0) {
				// negative zero: insert past the last line
				return [candidates[candidates.length - 1]! + 1];
			}
			return [candidates[candidates.length + asNumber]!];
		}

		const queryField = parseFieldAssignment(conjunction);

		const remainingCandidates: number[] = [];
		for (let i = 0; i < candidates.length; i++) {
			const sublistFieldText = rec.getSublistText({
				sublistId,
				fieldId: queryField.fieldId,
				line: candidates[i]!,
			});

			if (sublistFieldText === queryField.fieldText) {
				remainingCandidates.push(candidates[i]!);
				continue;
			}

			if (Number.isInteger(Number(queryField.fieldText))) {
				const sublistValue = rec.getSublistValue({
					sublistId,
					fieldId: queryField.fieldId,
					line: candidates[i]!,
				});

				if (Number(queryField.fieldText) === Number("" + String(sublistValue))) {
					remainingCandidates.push(candidates[i]!);
				}
			}
		}
		candidates = remainingCandidates;
	}

	return candidates;
}

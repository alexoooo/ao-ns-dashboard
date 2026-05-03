import record from "N/record";


export const undocumentedRecordTypes = {
	"TRANSFER": "transfer",
	"CURRENCY_REVALUATION": "fxreval",
};


// Lazy: NetSuite forbids SuiteScript API access during the AMD define
// callback, so we can't touch `record.Type` at module load time.
let cached = null;
export function allRecordTypes() {
	if (cached === null) {
		const all = {};
		Object.keys(record.Type).forEach(k => {
			if (! k.startsWith("CUSTOM_")) {
				all[k] = record.Type[k];
			}
		});
		Object.keys(undocumentedRecordTypes).forEach(k => all[k] = undocumentedRecordTypes[k]);
		cached = all;
	}
	return cached;
}


const lettersOnly = /[^a-zA-Z]/g;


export function getRecordType(recordType) {
	const all = allRecordTypes();
	if (recordType in all) {
		return all[recordType];
	}

	const normalized = recordType.replace(lettersOnly, "").toLowerCase();
	if (Object.values(all).includes(normalized)) {
		return normalized;
	}

	const matchingKey = Object.keys(all).find(k => k.replace(lettersOnly, "").toLowerCase() === normalized);
	if (matchingKey) {
		return all[matchingKey];
	}

	return normalized;
}


export function recordTypeOptions(selectedRecordType) {
	const all = allRecordTypes();
	return Object.keys(all).map(type => {
		const formatted = type.split("_").map(i => i[0] + i.substring(1).toLowerCase()).join(" ");
		const suffix = (type in undocumentedRecordTypes) ? " (undocumented)" : "";
		return `
			<option
				value="${all[type]}"
				${all[type] === selectedRecordType ? 'selected="selected"' : ""}
			>${formatted}${suffix}</option>`;
	}).join("");
}

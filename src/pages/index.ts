// Ordered list of pages. Order controls the navigation drawer.
// The first entry is the default page (loaded when no ?page= is given).

import welcome from "./welcome/server";
import recordType from "./record-type/server";
import recordDetails from "./record-details/server";
import lookupFields from "./lookup-fields/server";
import editRecords from "./edit-records/server";
import createRecords from "./create-records/server";
import massSave from "./mass-save/server";
import massDelete from "./mass-delete/server";
import suiteql from "./suiteql/server";
import type {PageDef} from "../app/types";

const pages: PageDef[] = [
	welcome,
	recordType,
	recordDetails,
	lookupFields,
	editRecords,
	createRecords,
	massSave,
	suiteql,
	massDelete,
];

export default pages;

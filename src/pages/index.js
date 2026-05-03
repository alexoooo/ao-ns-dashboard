// Ordered list of pages. Order controls the navigation drawer.
// The first entry is the default page (loaded when no ?page= is given).

import welcome from "./welcome/server.js";
import recordType from "./record-type/server.js";
import recordDetails from "./record-details/server.js";
import lookupFields from "./lookup-fields/server.js";
import editRecords from "./edit-records/server.js";
import createRecords from "./create-records/server.js";
import massSave from "./mass-save/server.js";
import massDelete from "./mass-delete/server.js";


export default [
	welcome,
	recordType,
	recordDetails,
	lookupFields,
	editRecords,
	createRecords,
	massSave,
	massDelete,
];

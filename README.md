# ao-ns-dashboard

NetSuite automation dashboard

Extend NetSuite with the following capabilities:

- Detect record type by internal ID
- Display all available data related to a record in one place
- Systematically look up record and sublist fields
- Systematically edit one or more records, including setting fields and creating/updating/deleting sublist lines
- Mass creating/deleting/saving of record

Installation:

- Customization / Scripting / Scripts / New
- [+] add Script File, Choose file, Select downloaded js, "file name" as "ao-ns-dashboard.js", [Save]
- [Create Script Record]
- Deployments / Add new

Building from source:

- Source files live under `src/`; `ao-ns-dashboard.js` at the repo root is the build output uploaded to NetSuite.
- Requires Node.js (any recent LTS).
- One-time: `npm install`
- Build: `npm run build` (produces `ao-ns-dashboard.js`)
- Watch mode (rebuild on save): `npm run dev`

Screenshot:
![Screenshot](screenshot.png)

# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project overview

NetSuite SuiteScript 2.1 Suitelet that extends a NetSuite account with admin/automation tooling: detect record type from internal ID, view full record + sublist details, look up arbitrary record/sublist fields, and edit / mass-create / mass-save / mass-delete records in bulk.

Source lives under `src/` as ES modules. Rollup bundles it into a single AMD `define([...], function(...) { ... })` file at the repo root (`ao-ns-dashboard.js`) — that's what gets uploaded to NetSuite as a Script File.

## Build

- One-time: `npm install`
- Build: `npm run build` → produces `ao-ns-dashboard.js` at repo root
- Watch: `npm run dev`

`ao-ns-dashboard.js` is the build artifact but is committed to the repo (the README installation instructions point at it). Re-run `npm run build` whenever `src/` changes.

There is no lint or automated test. Verification is manual: deploy to a NetSuite sandbox and exercise the relevant page.

## Layout

```
src/
├─ index.js                       Entry — exports default { onRequest: main }
├─ main.js                        Dispatcher: routes ?page= and ?command= against the pages array
├─ banner.txt                     License + @NApiVersion/@NScriptType comment prepended to the bundle
├─ layout.html                    Outer page shell (drawer, header, body wrapper)
├─ html.js                        interpolate(tpl, vars), escapeHtml, documentationSection
├─ constants.js                   param names, version, MDL URLs
├─ url.js                         scriptDeployParam, setPageParam, getCommandParam
├─ utils.js                       normalizeKey, splitAmpersand/VerticalBar/Slash
├─ field-assignments.js           parseFieldAssignment[List] (used by lookup/edit/create pages)
├─ record-types.js                allRecordTypes (lazy), getRecordType, recordTypeOptions
├─ bulk-runner.js                 bulkRunnerScaffold(label) — server-side HTML for the bulk-task UI
├─ client/
│  └─ bulk-runner.client.js       Browser-side runtime (model, runCommand, runNext, render, ...)
└─ pages/
   ├─ index.js                    Ordered array of page defs (drawer order; element 0 is default)
   ├─ welcome/{server.js, template.html}
   ├─ record-type/{server.js, template.html}
   ├─ record-details/{server.js, template.html}
   ├─ lookup-fields/{server.js, template.html}
   ├─ edit-records/{server.js, template.html}
   ├─ create-records/{server.js, template.html}
   ├─ mass-save/{server.js, template.html}
   └─ mass-delete/{server.js, template.html}
```

## Architecture

### Request dispatch

`main(context)` reads two query parameters:
- `page=<name>` — selects which page to render. Defaults to the first entry in `pages/index.js` (welcome).
- `command=<name>` — when present, treats the request as a JSON-body POST callback; response is plain text written via `context.response.write`.

Each page is a default-exported object:

```js
export default {
    name: "edit-records",
    label: "Edit Records",
    render(context) { ... },          // returns HTML string for the body
    commands: { [name]: handler },    // optional — JSON-body POST handlers
};
```

`pages/index.js` aggregates them in an ordered array. `main` indexes by `name` for routing, and order in the array controls the navigation drawer order.

### Adding a new page

1. Create `src/pages/<name>/{server.js, template.html}`.
2. Append the import + entry to `src/pages/index.js`.
3. Run `npm run build`.

### Templates and HTML escaping

`src/html.js` exports `interpolate(template, vars)` which substitutes `{{key}}` markers in a template string with values from `vars`:

- Default: HTML-escape the value (safe for body text, attribute values).
- Keys ending in `Html`: insert verbatim (caller already produced safe markup).
- Keys ending in `Js`: insert verbatim (caller already produced safe JavaScript text).

Use the appropriate suffix for placeholders inside `<script>` tags or wherever HTML escaping would corrupt the value (e.g. URLs containing `&`).

### Client-side code (`*.client.js`)

`*.client.js` files are [Lit](https://lit.dev) custom elements written as **module fragments**. The page's server.js imports them via `?raw` and the page template inlines them inside a `<script type="module">` block. The template provides the Lit `import` once at the top of the script; the inlined fragments themselves do **not** carry their own `import` statements (those would clash when fragments are concatenated).

Each module fragment defines a class extending `LitElement` and registers it with `customElements.define(...)`. Components use **light DOM** (`createRenderRoot() { return this; }`) so MDL CSS classes still apply. Use `componentHandler.upgradeElements(this)` in `updated()` to re-init MDL on freshly rendered nodes.

Lit is loaded as native ESM from a CDN (`https://cdn.jsdelivr.net/npm/lit@3.2.1/+esm`) — same pattern as MDL/jQuery/Select2. No bundling step required.

The shared bulk-task component is `client/bulk-runner.client.js` (`<bulk-runner>`). Properties: `task-type-label`, `command-post-url`. Override `groupKey(task)` in a subclass to enable batching — see `pages/edit-records/client.client.js` (`<bulk-runner-edit-records>`) which groups by record type + ID. Pages that don't need batching (lookup-fields, create-records, mass-save, mass-delete) use the base `<bulk-runner>` directly. SuiteQL has its own component `<suiteql-page>`.

For a page that subclasses, the template inlines the base fragment **before** the subclass fragment so the base class is in scope when the subclass declaration runs.

### Task input format

Pipe-delimited per line, e.g. `Record Type|Internal ID|Location|Field Values|Action`. Within segments:

- Field Values: `&`-separated `fieldId=value` pairs. Escape with `\&`.
- Location (sublist path): `/`-separated. Escape with `\/`.
- Pipe inside a segment: escape with `\|`.

Always use `splitVerticalBar` / `splitAmpersand` / `splitSlash` from `utils.js` rather than `String.split`. The helpers handle the escapes via random-sentinel substitution.

### NetSuite API constraint: lazy module init

NetSuite throws `SUITESCRIPT_API_UNAVAILABLE_IN_DEFINE` if a SuiteScript API module (`record`, `search`, `query`, `runtime`) is invoked while the AMD `define` callback is still running. **Do not call into `record.*` / `search.*` / `runtime.*` at module top level.** Wrap any such initialization in a function that runs during request handling. See `record-types.js` for an example of the lazy `cached` pattern.

### Record-type resolution

`record-types.js` builds `allRecordTypes` lazily on first call, from `record.Type` plus a small `undocumentedRecordTypes` map (currently `TRANSFER` → `transfer`, `CURRENCY_REVALUATION` → `fxreval`). `getRecordType(input)` accepts the `record.Type` key, the underlying string value, or a fuzzy version with non-letters stripped. When adding support for new undocumented record types, edit that map.

### Conventions

- `version` constant in `constants.js` shows in the header — bump it when shipping a user-visible change.
- The header turns red on non-sandbox environments (hostname doesn't contain `-sb`) — see `layout.html`.
- External CSS/JS is loaded from cdnjs.cloudflare.com (Material Design Lite, jQuery, Select2).
- Indentation: tabs. Preserve indentation in template literals — leading whitespace in `<script>` tags shows up in the rendered HTML.
- Cross-page references use the imported page def's `.label` (e.g. `${lookupFieldsPage.label}`) so renaming a page is a single-file edit.

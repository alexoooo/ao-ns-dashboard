# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project overview

NetSuite SuiteScript 2.1 Suitelet that extends a NetSuite account with admin/automation tooling: detect record type from internal ID, view full record + sublist details, look up arbitrary record/sublist fields, and edit / mass-create / mass-save / mass-delete records in bulk. There is also a SuiteQL query page.

Source lives under `src/` as TypeScript ES modules. Rollup bundles it into a single AMD `define([...], function(...) { ... })` file at the repo root (`ao-ns-dashboard.js`) — that's what gets uploaded to NetSuite as a Script File.

## Build & checks

- One-time: `npm install` (Node ≥ 20).
- Build: `npm run build` → produces `ao-ns-dashboard.js` at the repo root.
- Watch: `npm run dev`.
- Unified gate: `npm run check` runs `tsc --noEmit && eslint && prettier --check && vitest run` — must be green before committing.
- Individually: `npm run typecheck`, `npm run lint`, `npm run lint:fix`, `npm run format`, `npm run format:check`, `npm test`, `npm run test:watch`.

`ao-ns-dashboard.js` is the build artifact but is committed to the repo (the README installation instructions point at it). Re-run `npm run build` whenever `src/` changes.

End-to-end verification is manual — deploy the bundle to a NetSuite sandbox and exercise each page. See `CONTRIBUTING.md` for the manual test checklist.

## Layout

```
src/
├─ app/                           Suitelet entry, layout, dispatcher + cross-cutting contracts
│  ├─ index.ts                    Entry — exports default { onRequest: main }
│  ├─ main.ts                     Dispatcher: routes ?page= and ?command=
│  ├─ banner.txt                  License + @NApiVersion/@NScriptType comment prepended to the bundle
│  ├─ layout.html                 Outer page shell (drawer, header, body wrapper, importmap placeholder)
│  ├─ globals.d.ts                Ambient declarations for ?raw imports + window.componentHandler
│  ├─ client-modules.ts           Single source of truth for client-side ES modules (id → source map)
│  ├─ constants.ts                param names, version, MDL URLs
│  ├─ types.ts                    Core types: PageDef, CommandHandler, CommandResponse<T>, SuiteletContext
│  └─ command.ts                  success() / failure() / fromError() — CommandResponse builders
├─ lib/                           Generic helpers — no NetSuite imports, fully testable
│  ├─ html.ts                     interpolate(tpl, vars), escapeHtml, documentationSection
│  ├─ url.ts                      scriptDeployParam, setPageParam, getCommandParam
│  ├─ error-utils.ts              errorMessage(e) / errorName(e) — duck-typed error narrowing
│  ├─ help.ts                     pageLink(context, pageDef), taskInputFormatHelp()
│  ├─ field-assignments.ts        parseFieldAssignment[List] (used by lookup/edit/create pages)
│  └─ utils.ts                    normalizeKey, listsEqual; re-exports splitters from shared/separators
├─ shared/                        Code that runs on both client + server
│  └─ separators.ts               splitAmpersand / splitVerticalBar / splitSlash
├─ server/                        Server-only helpers (NetSuite N/* imports allowed)
│  ├─ record-types.ts             allRecordTypes (lazy), getRecordType, recordTypeOptions
│  ├─ sublist.ts                  getSublistLine / findSublistLines (sublist line resolution)
│  ├─ field-setters.ts            setRecordField / setSublistField / setRecordFieldDefault — shared by edit/create
│  └─ record-loader.ts            loadRecord / deleteRecord wrappers + error code constants
├─ client/                        Client-side modules embedded into the import map
│  ├─ api.client.ts               postJson<T>(url, body, signal?) — shared CommandResponse fetch
│  ├─ csv.client.ts               csvEncode (formula-injection-safe CSV encoder)
│  └─ bulk-runner.client.ts       <bulk-runner> Lit component for bulk-task pages
└─ pages/                         One folder per Suitelet page
   ├─ index.ts                    Ordered array of page defs (drawer order; element 0 is default)
   ├─ welcome/{server.ts, template.html}
   ├─ record-type/{server.ts, template.html, page.client.ts}
   ├─ record-details/{server.ts, template.html, page.client.ts}
   ├─ lookup-fields/{server.ts, template.html}
   ├─ edit-records/{server.ts, template.html, page.client.ts}
   ├─ create-records/{server.ts, template.html}
   ├─ mass-save/{server.ts, template.html}
   ├─ mass-delete/{server.ts, template.html}
   └─ suiteql/{server.ts, template.html, page.client.ts}
```

## Architecture

### Request dispatch

`main(context)` in `src/app/main.ts` reads two query parameters:

- `page=<name>` — selects which page to render. Defaults to the first entry in `pages/index.ts` (welcome).
- `command=<name>` — when present, treats the request as a JSON-body POST callback. The dispatcher invokes the matching `CommandHandler`, wraps thrown errors via `fromError()`, and writes the JSON-serialized `CommandResponse<T>` envelope to the response body.

Each page is a default-exported `PageDef`:

```ts
const editRecordsPage: PageDef = {
    name: "edit-records",
    label: "Edit Records",
    bodyClass: "page-wide",                  // optional — see "Layout-level overrides"
    render(context) { ... },                 // returns HTML string for the body
    commands: { [name]: handler },           // optional — JSON-body POST handlers
};
export default editRecordsPage;
```

`pages/index.ts` aggregates them in an ordered array. `main` indexes by `name` for routing, and order in the array controls the navigation drawer order.

### Command response envelope

Every `?command=` response is a JSON-serialised `CommandResponse<T>`:

```ts
type CommandResponse<T> = {ok: true; data: T} | {ok: false; error: {code?: string; message: string}};
```

Build envelopes inside a handler with `success(data)` / `failure(message, code?)` from `src/app/command.ts`. Thrown errors are caught by the dispatcher and turned into `failure` envelopes via `fromError(e)` (which preserves `e.name` as the error `code`, e.g. `RCRD_DSNT_EXIST`).

Bulk-task pages return `CommandResponse<string[]>` — one message per task in the batch. `<bulk-runner>` reads `data` and renders each entry into the result table; on `ok: false` it marks the whole batch with the error message. SuiteQL returns `CommandResponse<SuiteqlResultPage>`.

### Adding a new page

1. Create `src/pages/<name>/{server.ts, template.html}` (and `page.client.ts` if it needs interactive UI beyond the shared `<bulk-runner>`).
2. Append the import + entry to `src/pages/index.ts`.
3. If you added a `page.client.ts`, register it in `src/app/client-modules.ts` and `tsconfig.json` `paths` (single edit each — see "Adding a new client module").
4. `npm run check && npm run build`.

### Templates and HTML escaping

`src/lib/html.ts` exports `interpolate(template, vars)` which substitutes `{{key}}` markers in a template string with values from `vars`:

- Default: HTML-escape the value (safe for body text, attribute values).
- Keys ending in `Html`: insert verbatim (caller already produced safe markup).
- Keys ending in `Js`: insert verbatim (caller already produced safe JavaScript text).

Use the appropriate suffix for placeholders inside `<script>` tags or wherever HTML escaping would corrupt the value (e.g. URLs containing `&`, JSON blobs, data: URLs). For HTML chunks that go into a custom-element attribute, use a non-suffixed key so it gets HTML-escaped — the browser's attribute parser will unescape it on the way in.

### Client-side code (`*.client.ts`)

`*.client.ts` files are [Lit](https://lit.dev) custom elements delivered as native ES modules via **`data:` URLs in an HTML import map**. The Rollup raw-text plugin reads each `.client.ts`, **transpiles it to JS** with `ts.transpileModule`, and embeds the JS source as a string. At request time `main.ts` wraps each source string in a `data:text/javascript;...` URL and writes the full `<script type="importmap">…</script>` block via the `{{importMapJsonJs}}` placeholder.

(We tried serving the modules from a `?clientJs=<id>` Suitelet route, but NetSuite's Content-Type handling on Suitelet responses makes that path unreliable for module loads — embedding sidesteps it entirely.)

Each module:

- Has real `import` / `export` statements (e.g. `import { LitElement, html } from "lit"`, `import { csvEncode } from "csv"`, `import { postJson } from "api"`).
- Defines a class extending `LitElement` and registers it with `customElements.define(...)` at the bottom (side effect of the module load).
- Uses **light DOM** (`createRenderRoot() { return this; }`) so MDL CSS classes still apply.
- Calls `window.componentHandler?.upgradeElements(this)` in `updated()` to re-init MDL on freshly rendered nodes.
- Adds `disconnectedCallback()` to `abort()` any in-flight `postJson` request when the component unmounts.

Lit (`"lit"`) is loaded from a CDN (`https://cdn.jsdelivr.net/npm/lit@3.2.1/+esm`) declared in the same import map. The runtime version is also pinned in `package.json` so TypeScript can resolve `"lit"` types from `node_modules` at compile time.

The shared bulk-task component is `client/bulk-runner.client.ts` (`<bulk-runner>`). Properties: `task-type-label`, `command-post-url`. Override `groupKey(task)` in a subclass to enable batching — see `pages/edit-records/page.client.ts` (`<bulk-runner-edit-records>`) which groups by record type + ID. Pages that don't need batching (lookup-fields, create-records, mass-save, mass-delete) use the base `<bulk-runner>` directly. SuiteQL has its own `<suiteql-page>`. Record-details has `<record-details-page>`.

`client/api.client.ts` exports `postJson<T>(url, body, signal?)` — every component that calls a `?command=` endpoint goes through it. It returns a typed `CommandResponse<T>` and converts network errors into `failure` envelopes; only `AbortError` is rethrown so callers can distinguish cancellation.

`client/csv.client.ts` exports `csvEncode(value)` — used by `bulk-runner.client.ts#downloadStatus` and `suiteql/page.client.ts#downloadCsv`. Modules that need it `import { csvEncode } from "csv"`.

`shared/separators.ts` is loaded both ways — server modules import it via `src/lib/utils.ts` re-exports, client modules import it as `from "separators"` — so the escape semantics in `splitVerticalBar` / `splitAmpersand` / `splitSlash` can never drift between sides.

### Adding a new client module

`src/app/client-modules.ts` is the single source of truth — adding a new module is **one file edit** (plus the new file itself):

1. Create `src/client/<name>.client.ts` (or `src/pages/<page>/page.client.ts`).
2. Import it in `src/app/client-modules.ts` and add an entry to the `clientModules` map.
3. Add the same id to the `paths` field of `tsconfig.json` so other client modules can reference it as a bare specifier with proper types.
4. The page's template just needs `<script type="module">import "<id>"</script>`.

`main.ts#renderPage` calls `buildImportMapJson()` which iterates `clientModules` and writes the full `<script type="importmap">` block via the `{{importMapJsonJs}}` placeholder in `layout.html`. There's nothing else to keep in sync.

Browser support: the import map needs Chrome ≥89 / Firefox ≥108 / Safari ≥16.4. NetSuite admin UI generally tracks evergreen browsers.

### Layout-level overrides (`bodyClass`)

Pages that need page-wide CSS overrides set `bodyClass: "<class>"` on their `PageDef`. The class is applied to the `<body>` element via the `{{bodyClassesHtml}}` placeholder, and the rule lives once in `src/app/layout.html`'s `<style>` block. Currently:

- `page-wide` — overrides MDL's default `overflow-x: hidden` on `.mdl-layout__content` so wide tables can scroll horizontally without breaking page-level sticky elements (used by the SuiteQL page; see "MDL horizontal-scroll gotcha" below).

### Sticky pinned-bar pattern (controls + thead above a results table)

Pages with a controls row above a results table (`suiteql/page.client.ts`, `client/bulk-runner.client.ts`) use a single convention so the controls and column headers stay visible while scrolling:

- All primary controls (run, download, pagination, status) live on a **single** action row above the table — no nested rows or `<hr>` separators.
- Action row: `position: sticky; top: 0; background: white; z-index: 1; padding: 0.5em 0; box-shadow: 0 4px 4px -4px rgba(0,0,0,0.3)`.
- Thead `<th>`: `position: sticky; top: var(--<scope>-actions-height, <fallback>); background: white; z-index: 2; box-shadow: 0 4px 4px -4px rgba(0,0,0,0.3)` — same shadow value.
- Set the CSS variable from JS in `updated()` so the thead always lands flush below the action row regardless of pagination wrapping or content changes:
  ```ts
  const actions = this.querySelector<HTMLElement>(".<scope>-actions");
  if (actions) {
    this.style.setProperty("--<scope>-actions-height", actions.offsetHeight + "px");
  }
  ```
- **Z-index ordering matters**: action row `z-index: 1`, thead `z-index: 2`. The thead's white background then occludes the action row's bottom shadow where they meet — without the swap you get a double shadow line.
- **Shadow value rationale**: `0 4px 4px -4px rgba(0,0,0,0.3)`. Negative spread cancels lateral blur (no overspill on the sides), and offset-y matches the blur radius (no overspill above the element's bottom edge).
- The table must **not** be wrapped in an element with `overflow` set on either axis — that creates a scroll container and `position: sticky` on the thead becomes relative to that wrapper instead of `mdl-layout__content`. See the next note.

### MDL horizontal-scroll gotcha

`.mdl-layout__content` ships with `overflow-x: hidden`, which clips content wider than the viewport. Wrapping wide content in `overflow-x: auto` does **not** work as a fix: per spec, setting one overflow axis to non-`visible` computes the other to `auto`, and the wrapper becomes a scroll container that breaks any page-level `position: sticky` inside it.

For pages that need both horizontal scroll and page-level sticky elements, set `bodyClass: "page-wide"` on the `PageDef` (see "Layout-level overrides" above) — the rule overrides `overflow-x` on `.mdl-layout__content` for that page only.

### Task input format

Pipe-delimited per line, e.g. `Record Type|Internal ID|Location|Field Values|Action`. Within segments:

- Field Values: `&`-separated `fieldId=value` pairs. Escape with `\&`.
- Location (sublist path): `/`-separated. Escape with `\/`.
- Pipe inside a segment: escape with `\|`.

Always use `splitVerticalBar` / `splitAmpersand` / `splitSlash` from `src/shared/separators.ts` (re-exported by `src/lib/utils.ts`) rather than `String.split`. The helpers handle the escapes via random-sentinel substitution. The same module is loaded as the `"separators"` client module so client code uses the exact same implementation.

### NetSuite API constraint: lazy module init

NetSuite throws `SUITESCRIPT_API_UNAVAILABLE_IN_DEFINE` if a SuiteScript API module (`record`, `search`, `query`, `runtime`) is invoked while the AMD `define` callback is still running. **Do not call into `record.*` / `search.*` / `runtime.*` at module top level.** Wrap any such initialization in a function that runs during request handling. See `record-types.ts` for the lazy `cached` pattern.

This is enforced mechanically by an ESLint rule in `eslint.config.js` (`no-restricted-syntax` selector matching top-level `record.*` / `search.*` / `query.*` / `runtime.*` calls). The rule fires only on calls that are direct children of `Program` — calls inside method/function bodies are fine.

### Record-type resolution

`record-types.ts` builds `allRecordTypes` lazily on first call, from `record.Type` plus a small `undocumentedRecordTypes` map (currently `TRANSFER` → `transfer`, `CURRENCY_REVALUATION` → `fxreval`). `getRecordType(input)` accepts the `record.Type` key, the underlying string value, or a fuzzy version with non-letters stripped. When adding support for new undocumented record types, edit that map.

### Error narrowing

NetSuite's `SuiteScriptError` doesn't reliably pass `e instanceof Error` in the AMD bundle context (different `Error` prototype than TypeScript's lib references). Use `errorMessage(e)` / `errorName(e)` from `src/lib/error-utils.ts` — they duck-type on `.message` / `.name`. **Never** fall back to `String(e)` for an unknown error: it serialises the whole error object including the stack trace.

### Type system

Strict TypeScript (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`). NetSuite's `@hitc/netsuite-types` types `request.parameters` and `request.body` as `any`; the project disables `@typescript-eslint/no-unsafe-*` because casting at every read site is noise. Real implicit-`any` mistakes are still caught by `noImplicitAny`.

Tests live under `tests/` and run via Vitest. Target pure logic only (parsing, escapes, HTML helpers, field-assignment grouping) — SuiteScript-API code is verified manually against a sandbox.

### Conventions

- `version` constant in `constants.ts` shows in the header — bump it when shipping a user-visible change.
- The header turns red on non-sandbox environments (hostname doesn't contain `-sb`) — see `layout.html`.
- External CSS/JS is loaded from cdnjs.cloudflare.com (Material Design Lite, jQuery, Select2).
- Indentation: tabs, width 4 (enforced by Prettier + `.editorconfig`). Preserve indentation in template literals — leading whitespace in `<script>` tags shows up in the rendered HTML.
- Cross-page references use the imported page def's `.label` (e.g. `${lookupFieldsPage.label}`) so renaming a page is a single-file edit. Importing a page def for `pageLink(context, pageDef)` is the only legitimate cross-page server import — internal helper logic belongs in `src/server/`, not in another page's `server.ts`.
- **Page documentation** is rendered by `documentationSection(html)` in `src/lib/html.ts`, which wraps the body in a native `<details>/<summary>` disclosure. Compose the body with `<ul>/<li>` (not `<h3>·` fakery). Use `pageLink(context, otherPageDef)` from `src/lib/help.ts` for cross-page hyperlinks, and `taskInputFormatHelp()` from the same module for the shared pipe / `&` / `/` / `\\` escape spec on any bulk-task page (lookup-fields, edit-records, create-records, mass-save, mass-delete).

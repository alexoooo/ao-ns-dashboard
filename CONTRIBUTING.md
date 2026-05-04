# Contributing

Read [AGENTS.md](AGENTS.md) first — it covers the architecture, conventions, and the gotchas you'll trip on otherwise.

## Local development

```bash
npm install              # one-time
npm run dev              # rollup in watch mode → ao-ns-dashboard.js
```

`npm run dev` rebuilds the bundle whenever you save a `src/**` file. Verify changes by uploading the regenerated `ao-ns-dashboard.js` to a NetSuite sandbox and exercising the relevant page (see "Manual sandbox checklist" below).

### Required pre-commit checks

```bash
npm run check            # tsc --noEmit && eslint && prettier --check && vitest run
```

This is the full gate. If any step fails, fix it before committing — there's no CI yet, so the local check is the only safety net.

Quick fixes:

- `npm run lint:fix` — ESLint auto-fix (most formatting / unused-import issues).
- `npm run format` — Prettier apply.

## Adding a new page

1. Create `src/pages/<name>/{server.ts, template.html}`. If the page needs interactive UI beyond the shared `<bulk-runner>`, also create `page.client.ts`.
2. Append the import + entry to `src/pages/index.ts`.
3. If you added a `page.client.ts`:
   - Register it in `src/client-modules.ts` (`clientModules` map).
   - Add the matching id to `tsconfig.json`'s `paths` field so other client modules can import it as a bare specifier with proper types.
4. The page's `template.html` just needs `<script type="module">import "<id>"</script>` at the top.
5. `npm run check && npm run build`, deploy, exercise.

Each `server.ts` exports a `PageDef`. Its `commands` map uses `success(data)` / `failure(message, code?)` from `src/command.ts` to build `CommandResponse<T>` envelopes — the dispatcher handles JSON serialisation and converts thrown errors via `fromError(e)`.

## Adding a new client module

1. Create `src/client/<name>.client.ts` with bare-specifier imports (e.g. `from "lit"`, `from "csv"`).
2. Add the entry to `src/client-modules.ts` and the `paths` mapping in `tsconfig.json`. That's it — no other files to touch.
3. Pages that use it: `<script type="module">import "<id>"</script>`.

## Bumping the version

Edit `src/constants.ts` `version` — that's what shows in the page header. The version in `package.json` is unused (this project isn't published to npm); keep it at `1.0.0`.

## Manual sandbox checklist

NetSuite has no test harness, so end-to-end verification is manual. After deploying a new bundle, exercise:

- [ ] **Welcome** — page loads, name shown.
- [ ] **Detect Record Type** — enter a known internal ID, click Run All, confirm `*** Internal ID found` (or external ID lookup) appears.
- [ ] **Record Details** — pick a record type via Select2, enter an ID, submit. Spinner appears, then field/sublist tables render. Refresh on the same URL re-renders without errors.
- [ ] **Lookup Fields** — paste a few `recordType|id|location|fieldIds` lines, Run All. Sublist/line lookup works (`item/0`, `item/code=ABC`, `item/-1`).
- [ ] **Edit Records** — multi-task batch (same record id) saves as a single transaction; verify `Changed X from 'a' to 'b'` messages.
- [ ] **Create Records** — provides default values + field values, returns a new internal ID. Then **Edit Records** the new id to confirm a round-trip.
- [ ] **Mass Edit/Save** — runs without modification (triggers downstream automation).
- [ ] **Mass Delete** — confirm "Delete successful" or "Does not exist" surfaces correctly. Use a sandbox-only test record.
- [ ] **SuiteQL Query** — run a paginated query (>1000 rows). Pagination works, Download CSV produces a sane file, error path (`SELECT ... FROM nope`) shows `Error: ...` in the status line and recovery is possible without page reload.
- [ ] **Navigation drawer** — every page is reachable; current-page highlight is correct.
- [ ] **Sticky header behaviour** — scroll the bulk-runner result table and the SuiteQL results table; the action row + thead stay pinned with no double-shadow line.
- [ ] **Production banner** — open the bundle from a non-`-sb` host (or fake it) and confirm the header turns red.

## Code style

- Indentation: tabs, width 4. JSON / YAML / Markdown use spaces (Prettier override).
- Strict TypeScript everywhere. `noImplicitAny` is enforced; `noUnusedLocals` style hygiene via ESLint.
- Comments explain _why_, not _what_. If a comment is restating what the code does, delete it. If a behaviour will surprise the next reader (e.g. a NetSuite-specific gotcha or a workaround), comment it.
- No `console.log` left in client modules — they fire on every page load.

## Project hygiene

- `node_modules` and `coverage` are ignored — never commit them.
- `.idea` (JetBrains) and `.vscode` are ignored. Don't commit IDE config.
- The build artifact `ao-ns-dashboard.js` **is** committed — re-run `npm run build` and stage it as part of any commit that touches `src/`. The README install instructions point users to the file.
- LICENSE and `src/app/banner.txt` should both reflect the current copyright year range.

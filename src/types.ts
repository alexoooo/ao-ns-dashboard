// Core types shared across the Suitelet. Server modules and Lit client modules
// both reference these — the client builds rely on the structural shapes only,
// so importing `types` from a client module is safe (no runtime dependency).

import type {EntryPoints} from "N/types";

// The single argument every page render() and command handler receives.
export type SuiteletContext = EntryPoints.Suitelet.onRequestContext;

// Uniform JSON envelope for every command response. The bulk-runner client
// and SuiteQL client both expect this shape so the server contract is
// inspectable and predictable. Adopted in Phase 2.1.
export type CommandResponse<T = unknown> = {ok: true; data: T} | {ok: false; error: {code?: string; message: string}};

// Per-task result emitted by bulk-task command handlers (lookup-fields,
// edit-records, create-records, mass-save, mass-delete). The bulk-runner
// renders `message` (in red when `status` is `"error"`) into the result table.
export interface BulkTaskResult {
	status: "ok" | "error";
	message: string;
}

// Server-side handler for a `?command=<name>` POST. Each page may declare zero
// or more commands. The dispatcher (main.ts) wraps invocations in a try/catch
// and writes the returned string to the response body.
//
// Today handlers return a raw JSON string (e.g. `JSON.stringify([...])`). In
// Phase 2.1 of the role-model overhaul this contract will tighten to
// `CommandResponse<T>` so the bulk-runner client can parse predictably.
// Until then `string` keeps the surface honest.
export type CommandHandler = (context: SuiteletContext) => string;

// The shape every page module default-exports. `pages/index.ts` aggregates
// these into the ordered registry; element 0 is the default landing page.
export interface PageDef {
	name: string;
	label: string;
	render(context: SuiteletContext): string;
	commands?: Record<string, CommandHandler>;

	// Optional CSS class added to the layout `<body>`. Pages that need
	// layout-level overrides (e.g. `overflow-x: auto` for horizontally-wide
	// tables) can declare them here instead of injecting per-page <style>
	// blocks. See AGENTS.md "MDL horizontal-scroll gotcha" for context.
	bodyClass?: string;
}

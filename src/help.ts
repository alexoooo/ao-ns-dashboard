// Shared helpers for building per-page Help section content.

import {setPageParam} from "./url";
import type {PageDef, SuiteletContext} from "./types";

// Hyperlink to another page in this Suitelet. Use inside documentationSection
// content instead of `[Page Label] (left menu)` plain-text references.
export function pageLink(context: SuiteletContext, pageDef: Pick<PageDef, "name" | "label">): string {
	return `<a href="${setPageParam(context, pageDef.name)}">${pageDef.label}</a>`;
}

// Shared spec for the bulk-task pipe-delimited input format. Used by
// lookup-fields, edit-records, create-records, mass-save, mass-delete — any
// page whose textarea is parsed via splitVerticalBar / splitAmpersand /
// splitSlash from utils. Embed inside documentationSection content.
export function taskInputFormatHelp(): string {
	return `
		<p><strong>Input format</strong> — each line is one task; columns are separated by <code>|</code> (the exact columns depend on the page, see above).</p>
		<ul>
			<li><strong>Field values</strong>: <code>fieldId=value</code> pairs joined by <code>&amp;</code>. Example: <code>memo=Hello&amp;trandate=2025-01-15</code>.</li>
			<li><strong>Sublist paths</strong>: joined by <code>/</code>. Example: <code>item/0</code> = line 0 of the <code>item</code> sublist.</li>
			<li><strong>Escapes</strong>: a literal <code>|</code>, <code>&amp;</code>, or <code>/</code> inside a value must be prefixed with <code>\\</code>. Example: <code>memo=Acme \\&amp; Co.</code>.</li>
		</ul>
	`;
}

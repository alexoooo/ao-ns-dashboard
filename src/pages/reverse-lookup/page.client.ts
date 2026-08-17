import {LitElement, html, type TemplateResult} from "lit";
import {postJson} from "api";
import type {
	RelationshipGroup,
	ReverseLookupInput,
	ReverseLookupNode,
	ReverseLookupResponse,
} from "../../lib/reverse-lookup";

interface BranchState {
	response: ReverseLookupResponse | null;
	loading: boolean;
	error: string;
	children: Map<string, BranchState>;
}

function emptyBranch(): BranchState {
	return {response: null, loading: false, error: "", children: new Map()};
}

class ReverseLookupPage extends LitElement {
	static override properties = {
		commandPostUrl: {type: String, attribute: "command-post-url"},
		typeOptionsHtml: {type: String, attribute: "type-options-html"},
		root: {state: true},
	};

	declare commandPostUrl: string;
	declare typeOptionsHtml: string;
	declare root: BranchState;

	private readonly cache = new Map<string, ReverseLookupResponse>();
	private readonly abortControllers = new Set<AbortController>();

	constructor() {
		super();
		this.commandPostUrl = "";
		this.typeOptionsHtml = "";
		this.root = emptyBranch();
	}

	override createRenderRoot() {
		return this;
	}

	override firstUpdated(): void {
		const select = this.querySelector<HTMLSelectElement>("#reverse-type");
		if (select) select.innerHTML = '<option value=""></option>' + this.typeOptionsHtml;
	}

	override updated(): void {
		window.componentHandler?.upgradeElements(this);
	}

	override disconnectedCallback(): void {
		super.disconnectedCallback();
		for (const controller of this.abortControllers) controller.abort();
		this.abortControllers.clear();
	}

	override render(): TemplateResult {
		return html`
			<h2>Find what refers to a NetSuite object</h2>
			<form @submit=${this.runRoot}>
				<fieldset style="max-width: 70em">
					<legend>Target</legend>
					<div class="mdl-textfield mdl-js-textfield" style="width: 60em; max-width: 100%">
						<input class="mdl-textfield__input" id="reverse-url" type="text" />
						<label class="mdl-textfield__label" for="reverse-url">NetSuite URL (takes precedence)</label>
					</div>
					<div style="display: flex; gap: 1em; align-items: end; flex-wrap: wrap">
						<label>
							Type<br />
							<select id="reverse-type" style="min-width: 22em; height: 2.5em"></select>
						</label>
						<div class="mdl-textfield mdl-js-textfield">
							<input class="mdl-textfield__input" id="reverse-id" type="text" />
							<label class="mdl-textfield__label" for="reverse-id">ID</label>
						</div>
					</div>
				</fieldset>
				<fieldset style="max-width: 70em; margin-top: 0.75em">
					<legend>Optional heuristic scan</legend>
					<label class="mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect" for="reverse-scan">
						<input type="checkbox" id="reverse-scan" class="mdl-checkbox__input" />
						<span class="mdl-checkbox__label">Scan JavaScript source</span>
					</label>
					<div class="mdl-textfield mdl-js-textfield" style="width: 30em; max-width: 100%; margin-left: 1em">
						<input
							class="mdl-textfield__input"
							id="reverse-folder"
							type="text"
							placeholder="SuiteScripts/ao"
						/>
						<label class="mdl-textfield__label" for="reverse-folder">Required recursive folder</label>
					</div>
				</fieldset>
				<button
					type="submit"
					class="mdl-button mdl-js-button mdl-button--raised mdl-button--colored"
					style="margin-top: 0.75em"
					?disabled=${this.root.loading}
				>
					<span class="material-icons md-18">account_tree</span> Reverse Lookup
				</button>
			</form>
			<hr />
			${this.root.loading ? html`<div class="mdl-spinner mdl-js-spinner is-active"></div>` : ""}
			${this.root.error ? html`<p style="color: red">Error: ${this.root.error}</p>` : ""}
			${this.root.response ? this.renderResponse(this.root, new Set()) : ""}
		`;
	}

	private renderResponse(branch: BranchState, ancestors: Set<string>): TemplateResult {
		const response = branch.response!;
		const nextAncestors = new Set(ancestors);
		nextAncestors.add(response.target.key);
		return html`
			<section style="margin: 0.75em 0 1.25em 0">
				<h3 style="margin-bottom: 0.25em">${response.target.label}</h3>
				<div style="color: #666; font-family: monospace">${response.target.type} | ${response.target.id}</div>
				${response.notices.map(notice => html`<p style="color: #8a5a00">${notice}</p>`)}
				${response.groups.map(group => this.renderGroup(branch, group, nextAncestors))}
			</section>
		`;
	}

	private renderGroup(branch: BranchState, group: RelationshipGroup, ancestors: Set<string>): TemplateResult {
		return html`
			<div style="margin: 1em 0">
				<h4 style="margin-bottom: 0.35em">
					${group.label}
					<span style="font-size: 0.75em; color: ${group.confidence === "heuristic" ? "#8a5a00" : "#555"}"
						>(${group.confidence})</span
					>
				</h4>
				${group.message
					? html`<div style="color: ${group.status === "error" ? "red" : "#666"}">${group.message}</div>`
					: ""}
				${group.status === "ok" && group.results.length === 0 ? html`<div>No references found.</div>` : ""}
				${group.truncated ? html`<div style="color: #8a5a00">Results were truncated.</div>` : ""}
				${group.results.length > 0
					? html`
							<table
								class="mdl-data-table mdl-js-data-table mdl-shadow--2dp"
								style="white-space: normal; width: 100%"
							>
								<thead>
									<tr>
										<th class="mdl-data-table__cell--non-numeric">Referrer</th>
										<th class="mdl-data-table__cell--non-numeric">Evidence</th>
										<th class="mdl-data-table__cell--non-numeric">Actions</th>
									</tr>
								</thead>
								<tbody>
									${group.results.map(node => this.renderNode(branch, node, ancestors))}
								</tbody>
							</table>
						`
					: ""}
			</div>
		`;
	}

	private renderNode(branch: BranchState, node: ReverseLookupNode, ancestors: Set<string>): TemplateResult {
		const child = branch.children.get(node.target.key);
		const cycle = ancestors.has(node.target.key);
		return html`
			<tr>
				<td class="mdl-data-table__cell--non-numeric">
					<strong>${node.target.label}</strong><br />
					<code>${node.target.type} | ${node.target.id}</code>
				</td>
				<td class="mdl-data-table__cell--non-numeric" style="max-width: 45em; word-break: break-word">
					${node.evidence}
				</td>
				<td class="mdl-data-table__cell--non-numeric" style="white-space: nowrap">
					<button
						class="mdl-button mdl-js-button mdl-button--raised"
						?disabled=${cycle || child?.loading === true}
						@click=${() => this.toggleOrExpand(branch, node, ancestors)}
					>
						${cycle ? "Cycle" : child?.response ? "Collapse" : child?.error ? "Retry" : "Expand"}
					</button>
					${node.url
						? html`<a class="mdl-button mdl-js-button" href=${node.url} target="_blank" rel="noopener"
								>Open</a
							>`
						: ""}
				</td>
			</tr>
			${child
				? html`<tr>
						<td
							colspan="3"
							class="mdl-data-table__cell--non-numeric"
							style="padding-left: 2em; background: #fafafa"
						>
							${child.loading ? html`Loading…` : ""}
							${child.error ? html`<span style="color: red">Error: ${child.error}</span>` : ""}
							${child.response ? this.renderResponse(child, ancestors) : ""}
						</td>
					</tr>`
				: ""}
		`;
	}

	private runRoot(event: Event): void {
		event.preventDefault();
		const url = this.querySelector<HTMLInputElement>("#reverse-url")!.value.trim();
		const type = this.querySelector<HTMLSelectElement>("#reverse-type")!.value;
		const id = this.querySelector<HTMLInputElement>("#reverse-id")!.value.trim();
		const input: ReverseLookupInput = url ? {url} : {type, id};
		this.root = emptyBranch();
		void this.loadBranch(this.root, input);
	}

	private toggleOrExpand(parent: BranchState, node: ReverseLookupNode, ancestors: Set<string>): void {
		if (ancestors.has(node.target.key)) return;
		const existing = parent.children.get(node.target.key);
		if (existing?.response) {
			parent.children.delete(node.target.key);
			this.requestUpdate();
			return;
		}
		const child = existing ?? emptyBranch();
		parent.children.set(node.target.key, child);
		void this.loadBranch(child, {
			type: node.target.type,
			id: node.target.id,
			...(node.target.parentScriptId ? {parentScriptId: node.target.parentScriptId} : {}),
		});
	}

	private async loadBranch(branch: BranchState, input: ReverseLookupInput): Promise<void> {
		branch.loading = true;
		branch.error = "";
		branch.response = null;
		this.requestUpdate();
		const scan = this.querySelector<HTMLInputElement>("#reverse-scan")?.checked === true;
		const folderPath = this.querySelector<HTMLInputElement>("#reverse-folder")?.value.trim() ?? "";
		if (scan && folderPath === "") {
			branch.loading = false;
			branch.error = "A File Cabinet folder is required when source scanning is enabled";
			this.requestUpdate();
			return;
		}
		const cacheKey = `${input.type ?? input.url}:${input.id ?? ""}|${scan ? folderPath : ""}`;
		const cached = this.cache.get(cacheKey);
		if (cached) {
			branch.loading = false;
			branch.response = cached;
			if (branch === this.root) this.populateRootFields(cached);
			this.requestUpdate();
			return;
		}

		const controller = new AbortController();
		this.abortControllers.add(controller);
		try {
			const envelope = await postJson<ReverseLookupResponse>(
				this.commandPostUrl,
				{input, ...(scan ? {sourceScan: {folderPath}} : {})},
				controller.signal
			);
			if (!envelope.ok) {
				branch.error = envelope.error.message;
			} else {
				branch.response = envelope.data;
				this.cache.set(cacheKey, envelope.data);
				if (branch === this.root) this.populateRootFields(envelope.data);
			}
		} catch (e) {
			if (!(e instanceof DOMException && e.name === "AbortError")) {
				branch.error = e instanceof Error ? e.message : String(e);
			}
		} finally {
			branch.loading = false;
			this.abortControllers.delete(controller);
			this.requestUpdate();
		}
	}

	private populateRootFields(response: ReverseLookupResponse): void {
		const type = this.querySelector<HTMLSelectElement>("#reverse-type");
		const id = this.querySelector<HTMLInputElement>("#reverse-id");
		if (type) type.value = response.target.type;
		if (id) {
			id.value = response.target.id;
			id.parentElement?.classList.toggle("is-dirty", id.value !== "");
		}
	}
}

customElements.define("reverse-lookup-page", ReverseLookupPage);

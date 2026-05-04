// Ambient module declarations for build-time imports.
//
// The Rollup `?raw` plugin (rollup.config.js) loads files with these patterns
// as their literal source text exported as the default export. TypeScript
// doesn't know about that plugin, so we declare the shapes here.

declare module "*.html" {
	const source: string;
	export default source;
}

declare module "*.html?raw" {
	const source: string;
	export default source;
}

declare module "*.client.ts?raw" {
	const source: string;
	export default source;
}

declare module "*.client.js?raw" {
	const source: string;
	export default source;
}

// MDL global injected by the Material Design Lite script. We call it after
// each Lit render in light-DOM components.
interface Window {
	componentHandler?: {
		upgradeElements(node: Element): void;
	};
}

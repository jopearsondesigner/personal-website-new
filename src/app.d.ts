// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

declare global {
	interface Window {
		gameStoreUpdater: (gameData: any) => void;
		isPaused?: boolean;
	}
}

// ✅ COMPLETE Svelte type declarations
declare module '*.svelte' {
	import type { ComponentType, SvelteComponent } from 'svelte';
	const component: ComponentType<SvelteComponent>;
	export default component;
}

// ✅ COMPLETE svelteHTML namespace (this fixes the error)
declare namespace svelteHTML {
	interface HTMLAttributes<T> {
		[key: string]: any;
		class?: string;
		style?: string;
		id?: string;
		role?: string;
		tabindex?: number | string;
		'aria-label'?: string;
		'aria-labelledby'?: string;
		'aria-describedby'?: string;
		'data-control'?: string;
	}

	interface IntrinsicElements {
		[elemName: string]: any;
	}
}

// ✅ Global svelteHTML declaration
declare global {
	namespace svelteHTML {
		interface HTMLAttributes<T> {
			[key: string]: any;
			class?: string;
			style?: string;
			id?: string;
			role?: string;
			tabindex?: number | string;
			'aria-label'?: string;
			'aria-labelledby'?: string;
			'aria-describedby'?: string;
			'data-control'?: string;
		}
	}
}

export {};

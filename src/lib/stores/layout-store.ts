// src/lib/stores/layout-store.ts
// CHANGELOG (2025-08-10)
// - Typed the layout store state.
// - Kept the same `layoutStore` API and `cssVars` derived store.
// - No star-field specifics.

import { writable, derived, type Readable } from 'svelte/store';

export interface LayoutStoreState {
	navbarHeight: number;
	isNavbarVisible?: boolean; // optional, present in some callers
	previousNavbarHeight?: number; // optional, present in some callers
}

function createLayoutStore() {
	const { subscribe, set, update } = writable<LayoutStoreState>({
		navbarHeight: 0
	});

	return {
		subscribe,
		setNavbarHeight: (height: number) => {
			update((state) => ({
				...state,
				previousNavbarHeight: state.navbarHeight ?? 0,
				navbarHeight: height
			}));
		},
		toggleNavbarVisibility: () =>
			update((state) => ({
				...state,
				isNavbarVisible: !(state.isNavbarVisible ?? true)
			})),
		reset: () =>
			set({
				navbarHeight: 0,
				isNavbarVisible: true,
				previousNavbarHeight: 0
			})
	};
}

export const layoutStore = createLayoutStore();

/** Derived CSS variables for convenience */
export const cssVars: Readable<Record<string, string>> = derived(layoutStore, ($layout) => ({
	'--navbar-height': `${$layout.navbarHeight ?? 0}px`
}));

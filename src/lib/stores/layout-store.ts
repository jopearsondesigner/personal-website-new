// src/lib/stores/layout-store.ts
import { writable, derived } from 'svelte/store';

function createLayoutStore() {
	const { subscribe, set, update } = writable({
		navbarHeight: 0
	});

	return {
		subscribe,
		setNavbarHeight: (height) => {
			update((state) => ({ ...state, navbarHeight: height }));
		},
		reset: () => set({ navbarHeight: 0 })
	};
}

export const layoutStore = createLayoutStore();

// Derived store for CSS variables
export const cssVars = derived(layoutStore, ($layoutStore) => {
	return {
		'--navbar-height': `${$layoutStore.navbarHeight}px`
	};
});

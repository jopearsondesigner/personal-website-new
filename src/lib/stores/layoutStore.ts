// src/lib/stores/store.ts
import { writable } from 'svelte/store';

function createLayoutStore() {
	const { subscribe, set, update } = writable({
		navbarHeight: 0
	});

	return {
		subscribe,
		setNavbarHeight: (height: number) => update((state) => ({ ...state, navbarHeight: height })),
		reset: () => set({ navbarHeight: 0 })
	};
}

export const layoutStore = createLayoutStore();

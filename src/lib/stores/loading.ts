// src/lib/stores/loading.ts
import { writable } from 'svelte/store';

export const loadingStore = writable(true);

export function initializeLoading() {
	// The initial loader is already showing, we just need to handle the transition
	return new Promise((resolve) => {
		Promise.all([
			document.fonts.ready,
			new Promise((r) => {
				if (document.readyState === 'complete') {
					r(true);
				} else {
					window.addEventListener('load', () => r(true), { once: true });
				}
			})
		]).then(() => {
			// Ensure minimum display time
			setTimeout(() => {
				loadingStore.set(false);
				resolve(true);
			}, 1500);
		});
	});
}

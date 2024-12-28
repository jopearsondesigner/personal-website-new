// src/lib/stores/control-store.js
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

function createControlStore() {
	// Initialize with default values
	const defaultState = {
		position: { x: 20, y: window.innerHeight - 220 },
		isDragging: false,
		isVisible: true
	};

	const { subscribe, set, update } = writable(defaultState);

	return {
		subscribe,
		setPosition: (x, y) =>
			update((state) => ({
				...state,
				position: { x, y }
			})),
		setDragging: (isDragging) =>
			update((state) => ({
				...state,
				isDragging
			})),
		setVisibility: (isVisible) =>
			update((state) => ({
				...state,
				isVisible
			})),
		resetPosition: () => {
			const isLandscape = window.innerWidth > window.innerHeight;
			const defaultPos = isLandscape
				? { x: 20, y: window.innerHeight - 180 }
				: { x: 20, y: window.innerHeight - 220 };

			update((state) => ({
				...state,
				position: defaultPos
			}));

			if (browser) {
				localStorage.setItem('controlsPosition', JSON.stringify(defaultPos));
			}
		},
		loadSavedPosition: () => {
			if (browser) {
				const savedPosition = localStorage.getItem('controlsPosition');
				if (savedPosition) {
					update((state) => ({
						...state,
						position: JSON.parse(savedPosition)
					}));
				}
			}
		}
	};
}

export const controlStore = createControlStore();

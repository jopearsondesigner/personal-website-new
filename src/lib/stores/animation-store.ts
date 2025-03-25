// src/lib/stores/animation-store.ts
import { writable } from 'svelte/store';

// Animation state store
function createAnimationStore() {
	const defaultState = {
		isAnimating: false,
		stars: []
	};

	const { subscribe, set, update } = writable(defaultState);

	return {
		subscribe,
		set,
		update,
		setAnimating: (isAnimating) => {
			update((state) => ({ ...state, isAnimating }));
		},
		setStars: (stars) => {
			update((state) => ({ ...state, stars }));
		},
		reset: () => set(defaultState),
		resetAnimationState: () => {
			set({
				...defaultState,
				stars: []
			});
		}
	};
}

export const animationState = createAnimationStore();
export const screenStore = writable('main');

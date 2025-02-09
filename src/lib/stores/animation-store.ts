// File: src/lib/stores/animation-store.ts
import type { Star, AnimationState } from '$lib/types/animation';

import { writable } from 'svelte/store';
import { animations } from '$lib/utils/animation-utils';

interface Star {
	id: number;
	x: number;
	y: number;
	z: number;
	opacity: number;
	style: string;
}

interface AnimationState {
	stars: Star[];
	glitchInterval: number | null;
	animationFrame: number | null;
	glowAnimation: any | null;
	isAnimating: boolean;
}

function createAnimationStore() {
	const { subscribe, set, update } = writable<AnimationState>({
		// Use the imported animations.initStars() instead
		stars: animations.initStars(),
		glitchInterval: null,
		animationFrame: null,
		glowAnimation: null,
		isAnimating: false
	});

	return {
		subscribe,
		set,
		update,
		updateStars: (stars: Star[]) => update((state) => ({ ...state, stars })),
		reset: () =>
			update((state) => ({
				...state,
				isAnimating: false,
				glitchInterval: null,
				animationFrame: null,
				glowAnimation: null
			}))
	};
}

export const animationState = createAnimationStore();
export const screenStore = writable('main');

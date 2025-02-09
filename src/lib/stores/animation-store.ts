// File: src/lib/stores/animation-store.ts

import { writable } from 'svelte/store';

interface Star {
	id: number; // Add this line
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
		stars: Array(300)
			.fill(null)
			.map((_, index) => ({
				id: index, // Add unique id
				x: Math.random() * 100,
				y: Math.random() * 100,
				z: Math.random() * 0.7 + 0.1,
				opacity: Math.random() * 0.5 + 0.5,
				style: ''
			})),
		glitchInterval: null,
		animationFrame: null,
		glowAnimation: null,
		isAnimating: false
	});

	return {
		subscribe,
		set,
		update,
		updateStars: (stars: Star[]) => update((state) => ({ ...state, stars }))
	};
}

export const animationState = createAnimationStore();
export const screenStore = writable('main');

import { writable } from 'svelte/store';

interface Star {
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

export const animationState = writable<AnimationState>({
	stars: Array(300)
		.fill(null)
		.map(() => ({
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

export const screenStore = writable('main');

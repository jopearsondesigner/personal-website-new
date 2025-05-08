// File: src/lib/stores/animation-store.ts
import { writable } from 'svelte/store';

// Define the Star interface
export interface Star {
	id: number;
	x: number;
	y: number;
	z: number;
	size?: number;
	opacity?: number;
	color?: string;
	style?: string;
	prevX?: number;
	prevY?: number;
}

// Define possible screen states
export type ScreenType = 'main' | 'game' | 'about' | 'contact' | 'loading';

// Define animation state interface
export interface AnimationState {
	stars: Star[];
	glitchInterval: number | null;
	animationFrame: number | null;
	glowAnimation: any | null;
	isAnimating: boolean;
	lastUpdateTime?: number;
	boostMode?: boolean;
	qualityLevel?: number;
}

// Create animation state store with additional methods
function createAnimationStore() {
	const { subscribe, set, update } = writable<AnimationState>({
		stars: [],
		glitchInterval: null,
		animationFrame: null,
		glowAnimation: null,
		isAnimating: false,
		lastUpdateTime: 0,
		boostMode: false,
		qualityLevel: 1.0
	});

	return {
		subscribe,
		set,
		update,

		// Update stars array
		updateStars: (stars: Star[]) =>
			update((state) => ({
				...state,
				stars,
				lastUpdateTime: Date.now()
			})),

		// Reset all animation state
		reset: () =>
			update((state) => ({
				...state,
				isAnimating: false,
				glitchInterval: null,
				animationFrame: null,
				glowAnimation: null,
				boostMode: false
			})),

		// Reset just the animation flag
		resetAnimationState: () =>
			update((state) => ({
				...state,
				isAnimating: false
			})),

		// Set boost mode
		setBoostMode: (active: boolean) =>
			update((state) => ({
				...state,
				boostMode: active
			})),

		// Set quality level (0.0 - 1.0)
		setQualityLevel: (level: number) =>
			update((state) => ({
				...state,
				qualityLevel: Math.max(0, Math.min(1, level))
			}))
	};
}

// Create screen state store
function createScreenStore() {
	const { subscribe, set, update } = writable<ScreenType>('main');

	return {
		subscribe,
		set,
		update,

		// Change screen with transition state
		changeScreen: (screen: ScreenType) => {
			set(screen);
		}
	};
}

// Export the stores
export const animationState = createAnimationStore();
export const screenStore = createScreenStore();

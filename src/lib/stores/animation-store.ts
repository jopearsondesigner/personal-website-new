// src/lib/stores/animation-store.ts
// CHANGELOG
// - Removed star-field imports and any reliance on star-specific utils (e.g., animations.initStars()).
// - Replaced star-specific type with a generic VisualElement interface.
// - Kept state property name `stars` and method `updateStars` as legacy compatibility surfaces
//   to avoid breaking imports. Both are documented as generic now.
// - Added `updateElements` as the preferred generic API and wired it to the same updater.
// - Ensured initial state uses an empty array (no effect instances pre-created).
// - No other star-field specifics remain.
// - Commented legacy surfaces with: `// Legacy compatibility: no star-field specifics`.

import { writable } from 'svelte/store';

/**
 * A generic visual/effect instance tracked by the animation store.
 * This is intentionally minimal and non-prescriptive so future systems
 * (particles, shaders, DOM nodes, canvases) can map to it as needed.
 */
export interface VisualElement {
	id: number;
	x: number;
	y: number;
	/**
	 * Optional depth or layering hint. Future effect systems may ignore or repurpose.
	 */
	z?: number;
	opacity?: number;
	style?: string;
}

export interface AnimationState {
	/**
	 * Legacy name retained for compatibility. Interpreted as a generic collection
	 * of visual/effect instances rather than any star-field concept.
	 * // Legacy compatibility: no star-field specifics
	 */
	stars: VisualElement[];

	glitchInterval: number | null;
	animationFrame: number | null;
	glowAnimation: unknown | null;
	isAnimating: boolean;
}

function createAnimationStore() {
	const { subscribe, set, update } = writable<AnimationState>({
		// Start with zero effect instances; future systems can populate as needed.
		stars: [],
		glitchInterval: null,
		animationFrame: null,
		glowAnimation: null,
		isAnimating: false
	});

	const setElements = (elements: VisualElement[]) =>
		update((state) => ({ ...state, stars: elements }));

	return {
		subscribe,
		set,
		update,

		/**
		 * Preferred generic API for replacing the current set of visual/effect instances.
		 */
		updateElements: (elements: VisualElement[]) => setElements(elements),

		/**
		 * Legacy name retained to avoid breaking existing imports or call sites.
		 * Interprets input as a generic collection of visual/effect instances.
		 * // Legacy compatibility: no star-field specifics
		 */
		updateStars: (elements: VisualElement[]) => setElements(elements),

		reset: () =>
			update((state) => ({
				...state,
				isAnimating: false,
				glitchInterval: null,
				animationFrame: null,
				glowAnimation: null
			})),

		// Keeps the public API intact; semantics remain generic.
		resetAnimationState: () =>
			update((state) => ({
				...state,
				isAnimating: false
			}))
	};
}

export const animationState = createAnimationStore();

/**
 * Screen/route/section indicator; semantics remain app-defined.
 * Export name preserved for compatibility.
 */
export const screenStore = writable('main');

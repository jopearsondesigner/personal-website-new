// DO NOT REMOVE THIS COMMENT
// /src/lib/stores/screen-store.ts
// DO NOT REMOVE THIS COMMENT
import { writable } from 'svelte/store';

// Define valid screen types
export type ScreenType = 'main' | 'game' | 'about' | 'contact';

// Create the screen store with type safety
function createScreenStore() {
	const { subscribe, set, update } = writable<ScreenType>('main');

	return {
		subscribe,
		set: (screen: ScreenType) => set(screen),
		// Helper method to safely update the screen
		updateScreen: (newScreen: ScreenType) => {
			update(() => newScreen);
		},
		// Reset to main screen
		reset: () => set('main')
	};
}

export const screenStore = createScreenStore();

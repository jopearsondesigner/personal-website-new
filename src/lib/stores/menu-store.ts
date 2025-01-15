import { writable, derived } from 'svelte/store';
import type { Writable } from 'svelte/store';

// Define menu types
export type MenuType = 'main' | 'pause' | 'settings' | 'controls' | null;

// Interface for menu state
interface MenuState {
	isOpen: boolean;
	currentType: MenuType;
	previousType: MenuType;
	selectedIndex: number;
}

// Initial state
const initialState: MenuState = {
	isOpen: false,
	currentType: null,
	previousType: null,
	selectedIndex: 0
};

// Create the menu store
function createMenuStore() {
	const { subscribe, set, update }: Writable<MenuState> = writable(initialState);

	return {
		subscribe,

		// Open menu with specific type
		open: (menuType: MenuType = 'main') =>
			update((state) => ({
				...state,
				isOpen: true,
				previousType: state.currentType,
				currentType: menuType
			})),

		// Close menu
		close: () =>
			update((state) => ({
				...state,
				isOpen: false,
				previousType: state.currentType,
				currentType: null,
				selectedIndex: 0
			})),

		// Toggle menu state
		toggle: () =>
			update((state) => ({
				...state,
				isOpen: !state.isOpen
			})),

		// Switch to a different menu type
		switchTo: (menuType: MenuType) =>
			update((state) => ({
				...state,
				previousType: state.currentType,
				currentType: menuType
			})),

		// Go back to previous menu
		back: () =>
			update((state) => ({
				...state,
				currentType: state.previousType,
				previousType: null
			})),

		// Update selected index
		setSelectedIndex: (index: number) =>
			update((state) => ({
				...state,
				selectedIndex: index
			})),

		// Reset store to initial state
		reset: () => set(initialState)
	};
}

// Export the store instance
export const menuStore = createMenuStore();

// Convenience exports
export const isMenuOpen = {
	subscribe: derived(menuStore, ($menuStore) => $menuStore.isOpen).subscribe
};

export const currentMenuType = {
	subscribe: derived(menuStore, ($menuStore) => $menuStore.currentType).subscribe
};

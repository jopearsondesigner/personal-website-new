import { writable, type Writable } from 'svelte/store';

interface LayoutStore {
	navbarHeight: number;
	isNavbarVisible: boolean;
	previousNavbarHeight: number;
}

const createLayoutStore = () => {
	const defaultValues: LayoutStore = {
		navbarHeight: 0,
		isNavbarVisible: true,
		previousNavbarHeight: 0
	};

	const { subscribe, set, update } = writable<LayoutStore>(defaultValues);

	return {
		subscribe,
		setNavbarHeight: (height: number) =>
			update((state) => ({
				...state,
				previousNavbarHeight: state.navbarHeight,
				navbarHeight: height
			})),
		toggleNavbarVisibility: () =>
			update((state) => ({
				...state,
				isNavbarVisible: !state.isNavbarVisible
			})),
		reset: () => set(defaultValues)
	};
};

export const layoutStore = createLayoutStore();

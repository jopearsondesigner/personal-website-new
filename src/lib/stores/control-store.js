// src/lib/stores/control-store.js
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

function createControlStore() {
	// Default joystick settings
	const defaultJoystickSettings = {
		sensitivity: 1.35,
		accelerationCurve: 0.7,
		// Default zone thresholds
		zones: {
			deadzone: 0.12,
			precision: 0.38,
			standard: 0.75,
			rapid: 1.0
		},
		// Default acceleration multipliers
		acceleration: {
			precision: 0.4,
			standard: 1.0,
			rapid: 1.8
		}
	};

	// Initialize with default values
	const defaultState = {
		position: { x: 20, y: window.innerHeight - 220 },
		isDragging: false,
		isVisible: true,
		joystickSettings: defaultJoystickSettings
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
		},
		updateJoystickSettings: (settings) =>
			update((state) => ({
				...state,
				joystickSettings: {
					...state.joystickSettings,
					...settings
				}
			})),

		saveJoystickSettings: () => {
			update((state) => {
				if (browser && state.joystickSettings) {
					localStorage.setItem('joystickSettings', JSON.stringify(state.joystickSettings));
				}
				return state;
			});
		},

		loadJoystickSettings: () => {
			if (browser) {
				const savedSettings = localStorage.getItem('joystickSettings');
				if (savedSettings) {
					update((state) => ({
						...state,
						joystickSettings: {
							...defaultJoystickSettings,
							...JSON.parse(savedSettings)
						}
					}));
				} else {
					update((state) => ({
						...state,
						joystickSettings: defaultJoystickSettings
					}));
				}
			}
		},

		resetJoystickSettings: () => {
			update((state) => ({
				...state,
				joystickSettings: defaultJoystickSettings
			}));

			if (browser) {
				localStorage.removeItem('joystickSettings');
			}
		}
	};
}

export const controlStore = createControlStore();

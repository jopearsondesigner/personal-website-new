// src/lib/stores/controls.ts

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import type {
	ControlsState,
	ControlsConfig,
	Vector2D,
	SafeAreaInsets,
	ControlPosition
} from '$lib/types/controls';

const STORAGE_KEY = 'game-controls-position';
const DEFAULT_SAFE_AREA = { top: 0, right: 0, bottom: 0, left: 0 };

// Initialize default state
const defaultState: ControlsState = {
	joystick: {
		position: { x: 0, y: 0 },
		isActive: false
	},
	buttons: {},
	isDragging: false,
	safeArea: DEFAULT_SAFE_AREA
};

// Create the main controls store
function createControlsStore() {
	const { subscribe, set, update } = writable<ControlsState>(defaultState);

	// Load saved positions from localStorage
	const loadSavedPositions = () => {
		if (!browser) return;
		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved) {
				const positions = JSON.parse(saved);
				update((state) => ({
					...state,
					joystick: {
						...state.joystick,
						basePosition: positions.joystick
					}
				}));
			}
		} catch (error) {
			console.error('Error loading saved control positions:', error);
		}
	};

	// Save positions to localStorage
	const savePositions = (positions: { joystick?: ControlPosition }) => {
		if (!browser) return;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
		} catch (error) {
			console.error('Error saving control positions:', error);
		}
	};

	// Update safe area insets
	const updateSafeArea = (insets: SafeAreaInsets) => {
		update((state) => ({
			...state,
			safeArea: insets
		}));
	};

	// Update joystick position
	const updateJoystickPosition = (position: Vector2D) => {
		update((state) => ({
			...state,
			joystick: {
				...state.joystick,
				position
			}
		}));
	};

	// Update button state
	const updateButtonState = (buttonId: string, isPressed: boolean) => {
		update((state) => ({
			...state,
			buttons: {
				...state.buttons,
				[buttonId]: {
					isPressed,
					lastPressed: isPressed ? Date.now() : state.buttons[buttonId]?.lastPressed
				}
			}
		}));
	};

	// Update drag state
	const updateDragState = (isDragging: boolean) => {
		update((state) => ({
			...state,
			isDragging
		}));
	};

	// Reset all controls to default state
	const reset = () => {
		set(defaultState);
	};

	return {
		subscribe,
		updateSafeArea,
		updateJoystickPosition,
		updateButtonState,
		updateDragState,
		loadSavedPositions,
		savePositions,
		reset
	};
}

// Create and export the store
export const controlsStore = createControlsStore();

// Derived store for normalized joystick values
export const normalizedJoystick = derived(controlsStore, ($controls) => {
	const { x, y } = $controls.joystick.position;
	const magnitude = Math.sqrt(x * x + y * y);
	const maxRadius = 60; // Maximum joystick radius

	if (magnitude === 0) return { x: 0, y: 0 };

	const normalized = {
		x: (x / magnitude) * Math.min(magnitude / maxRadius, 1),
		y: (y / magnitude) * Math.min(magnitude / maxRadius, 1)
	};

	return normalized;
});

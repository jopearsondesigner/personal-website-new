// src/lib/stores/game-store.js
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

function createGameStore() {
	// Default initial state
	const defaultState = {
		score: 0,
		highScore: 0,
		lives: 3,
		heatseekerCount: 3,
		gameActive: false,
		isPaused: false,
		isGameOver: false
	};

	// Load high score from localStorage if available
	const initialState = { ...defaultState };
	if (browser && localStorage.getItem('lumara_highScore')) {
		initialState.highScore = parseInt(localStorage.getItem('lumara_highScore'), 10);
	}

	const { subscribe, set, update } = writable(initialState);

	return {
		subscribe,

		// Update score and check for high score
		setScore: (score) =>
			update((state) => {
				const newState = { ...state, score };

				// Update high score if needed
				if (score > state.highScore) {
					newState.highScore = score;

					// Persist high score
					if (browser) {
						localStorage.setItem('lumara_highScore', score.toString());
					}
				}

				return newState;
			}),

		// Update lives count
		setLives: (lives) => update((state) => ({ ...state, lives })),

		// Update heatseeker ammo count
		setHeatseekerCount: (count) => update((state) => ({ ...state, heatseekerCount: count })),

		// Update game status
		setGameActive: (isActive) => update((state) => ({ ...state, gameActive: isActive })),
		setGameOver: (isOver) => update((state) => ({ ...state, isGameOver: isOver })),
		setPaused: (isPaused) => update((state) => ({ ...state, isPaused })),

		// Reset game state but preserve high score
		resetGame: () =>
			update((state) => {
				return {
					...defaultState,
					highScore: state.highScore
				};
			}),

		// For testing: reset everything including high score
		resetAll: () => {
			if (browser) {
				localStorage.removeItem('lumara_highScore');
			}
			set(defaultState);
		},

		// Update multiple properties at once
		updateState: (newValues) =>
			update((state) => {
				return { ...state, ...newValues };
			})
	};
}

export const gameStore = createGameStore();

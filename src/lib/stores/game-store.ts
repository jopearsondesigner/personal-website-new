// src/lib/stores/game-store.ts
import { writable, type Writable } from 'svelte/store';

/**
 * The concrete shape of the Game store's value.
 * Add/adjust fields as your UI needs.
 */
export type GameStoreState = {
	// Session flags
	gameActive: boolean;
	isPaused: boolean;
	isGameOver: boolean;

	// HUD / scoreboard
	score: number;
	highScore: number;
	lives: number;
	heatseekerCount: number;

	// Optional extras you might add later:
	// level?: number;
	// wave?: number;
};

/** Initial state */
const initialState: GameStoreState = {
	gameActive: false,
	isPaused: false,
	isGameOver: false,

	score: 0,
	highScore: 0,
	lives: 3,
	heatseekerCount: 3
};

/** Public API for the store */
export type GameStoreApi = {
	subscribe: Writable<GameStoreState>['subscribe'];
	updateState: (data: Partial<GameStoreState>) => void;
	setPaused: (paused: boolean) => void;
	reset: () => void;
};

/** Factory */
function createGameStore(): GameStoreApi {
	const store: Writable<GameStoreState> = writable(initialState);

	return {
		subscribe: store.subscribe,

		updateState: (data: Partial<GameStoreState>) => {
			store.update((s) => ({ ...s, ...data }));
		},

		setPaused: (paused: boolean) => {
			store.update((s) => ({ ...s, isPaused: paused }));
		},

		reset: () => {
			store.set(initialState);
		}
	};
}

/** Singleton */
export const gameStore: GameStoreApi = createGameStore();

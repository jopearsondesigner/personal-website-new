// src/lib/stores/game-store.ts

import { writable, type Writable } from 'svelte/store';
import type { GameState, GameData } from '$lib/types/game';

// ---------------------------------------------
// Initial state — adjust to your actual GameState
// ---------------------------------------------
const initialState: GameState = {
	gameActive: false,
	isPaused: false,
	isGameOver: false
	// add any other properties required by your GameState
};

// ---------------------------------------------
// API definition
// ---------------------------------------------
export type GameStoreApi = {
	subscribe: Writable<GameState>['subscribe'];
	updateState: (data: GameData) => void;
	setPaused: (paused: boolean) => void;
	reset: () => void;
	// add other methods if needed
};

// ---------------------------------------------
// Factory function for the store
// ---------------------------------------------
function createGameStore(): GameStoreApi {
	const store: Writable<GameState> = writable(initialState);

	return {
		subscribe: store.subscribe,

		updateState: (data: GameData) => {
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

// ---------------------------------------------
// Export singleton instance
// ---------------------------------------------
export const gameStore: GameStoreApi = createGameStore();

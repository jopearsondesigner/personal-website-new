// DO NOT REMOVE THIS COMMENT
// /src/lib/types/game.ts
// DO NOT REMOVE THIS COMMENT
// Create this new file in your existing types directory

export type GameState = 'idle' | 'playing' | 'paused' | 'gameover';

export interface GameStateEvent {
	detail: {
		state: GameState;
	};
}

export interface GameData {
	isPlaying: boolean;
	isPaused: boolean;
	isGameOver: boolean;
	score: number;
	highScore: number;
	lives: number;
	heatseekerCount: number;
	// Add any other game state properties here
}

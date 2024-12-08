/**
 * @fileoverview Game State Manager - Handles game state management and flow control
 * @module src/lib/components/game/managers/gameManager.js
 * @requires module:src/lib/components/game/constants
 */

import { GAME_STATES, INITIAL_STATE } from '../constants';

/**
 * @class GameManager
 * @description Manages game state, flow control, save/load, and options
 * @implements {CleanupInterface}
 */
export class GameManager {
	constructor() {
		this.currentState = INITIAL_STATE;
		this.stateStack = [];
		this.savedState = null;
		this.options = {
			difficulty: 'normal',
			soundEnabled: true
			// Add more options as needed
		};
	}

	/**
	 * @method setState
	 * @param {string} state - The state to transition to
	 * @throws {Error} If the state transition is invalid
	 */
	setState(state) {
		if (!Object.values(GAME_STATES).includes(state)) {
			throw new Error(`Invalid game state: ${state}`);
		}

		this.stateStack.push(this.currentState);
		this.currentState = state;

		debugLog(`Transitioned to state: ${state}`);

		// Trigger state-specific behavior or events
		switch (state) {
			case 'title':
				// Show title screen
				break;
			case 'playing':
				// Start game loop
				break;
			case 'paused':
				// Pause game loop
				break;
			case 'gameOver':
				// Show game over screen
				break;
			// Add more cases for other states
		}
	}

	/**
	 * @method previousState
	 * @description Transitions back to the previous state
	 * @throws {Error} If there is no previous state
	 */
	previousState() {
		if (this.stateStack.length === 0) {
			throw new Error('No previous state available');
		}

		this.currentState = this.stateStack.pop();
		debugLog(`Returned to previous state: ${this.currentState}`);
	}

	/**
	 * @method saveGame
	 * @description Saves the current game state
	 */
	saveGame() {
		try {
			this.savedState = {
				state: this.currentState
				// Save other relevant game data
			};
			localStorage.setItem('savedGame', JSON.stringify(this.savedState));
			debugLog('Game state saved');
		} catch (error) {
			console.error('[GameManager] Failed to save game:', error);
		}
	}

	/**
	 * @method loadGame
	 * @description Loads the saved game state
	 */
	loadGame() {
		try {
			const savedGame = localStorage.getItem('savedGame');
			if (savedGame) {
				this.savedState = JSON.parse(savedGame);
				this.currentState = this.savedState.state;
				// Load other saved game data
				debugLog('Game state loaded');
			} else {
				debugLog('No saved game found');
			}
		} catch (error) {
			console.error('[GameManager] Failed to load game:', error);
		}
	}

	/**
	 * @method getOption
	 * @param {string} optionName - The name of the option
	 * @returns {any} The value of the option
	 */
	getOption(optionName) {
		return this.options[optionName];
	}

	/**
	 * @method setOption
	 * @param {string} optionName - The name of the option
	 * @param {any} value - The value to set the option to
	 */
	setOption(optionName, value) {
		this.options[optionName] = value;
		debugLog(`Option '${optionName}' set to:`, value);
	}

	/**
	 * @method cleanup
	 * @description Performs necessary cleanup operations
	 */
	cleanup() {
		this.currentState = INITIAL_STATE;
		this.stateStack = [];
		this.savedState = null;
		// Reset options if needed
		debugLog('Game manager cleaned up');
	}
}

// Debug utility function
const DEBUG = process.env.NODE_ENV === 'development';

function debugLog(...args) {
	if (DEBUG) {
		console.log('[GameManager]', ...args);
	}
}

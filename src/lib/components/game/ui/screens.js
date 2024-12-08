/**
 * @fileoverview GameScreens - Manages game screens and transitions
 * @module src/lib/components/game/ui/screens.js
 * @requires src/lib/components/game/managers/assetManager.js
 * @requires src/lib/components/game/managers/inputManager.js
 * @requires src/lib/components/game/managers/gameManager.js
 */

import AssetManager from '../managers/assetManager.js';
import InputManager from '../managers/inputManager.js';
import { GameManager } from '../managers/gameManager.js';

const DEBUG = process.env.NODE_ENV === 'development';

function debugLog(...args) {
	if (DEBUG) {
		console.log(`[GameScreens]`, ...args);
	}
}

/**
 * @class Screen
 * @description Base class for game screens
 */
class Screen {
	constructor(ctx, gameState) {
		this.ctx = ctx;
		this.gameState = gameState;
		this.isActive = false;
	}

	activate() {
		this.isActive = true;
	}

	deactivate() {
		this.isActive = false;
	}

	handleInput(input) {
		// Override in derived classes
	}

	update(deltaTime) {
		// Override in derived classes
	}

	render() {
		// Override in derived classes
	}
}

/**
 * @class TitleScreen
 * @description Represents the title screen
 * @extends Screen
 */
class TitleScreen extends Screen {
	constructor(ctx, gameState) {
		super(ctx, gameState);
		this.startGameCallback = null;
	}

	handleInput(input) {
		if (input.isKeyPressed('Enter')) {
			if (this.startGameCallback) {
				this.startGameCallback();
			}
		}
	}

	render() {
		drawTitleScreen(this.ctx, this.ctx.canvas.width, this.ctx.canvas.height);
	}

	setStartGameCallback(callback) {
		this.startGameCallback = callback;
	}
}

/**
 * Draws the title screen
 * @param {CanvasRenderingContext2D} ctx - The canvas context
 * @param {number} width - The canvas width
 * @param {number} height - The canvas height
 */
export function drawTitleScreen(ctx, width, height) {
	ctx.fillStyle = '#000';
	ctx.fillRect(0, 0, width, height);
	ctx.fillStyle = '#fff';
	ctx.font = '48px sans-serif';
	ctx.textAlign = 'center';
	ctx.fillText('Guardians of Lumara', width / 2, height / 2);

	// Render start game prompt
	ctx.font = '24px sans-serif';
	ctx.fillText('Press Enter to Start', width / 2, height / 2 + 50);
}

/**
 * @class GameOverScreen
 * @description Represents the game over screen
 * @extends Screen
 */
class GameOverScreen extends Screen {
	constructor(ctx, gameState) {
		super(ctx, gameState);
		this.restartGameCallback = null;
	}

	handleInput(input) {
		if (input.isKeyPressed('Enter')) {
			if (this.restartGameCallback) {
				this.restartGameCallback();
			}
		}
	}

	render() {
		drawGameOverScreen(
			this.ctx,
			this.ctx.canvas.width,
			this.ctx.canvas.height,
			this.gameState.score
		);
	}

	setRestartGameCallback(callback) {
		this.restartGameCallback = callback;
	}
}

/**
 * Draws the game over screen
 * @param {CanvasRenderingContext2D} ctx - The canvas context
 * @param {number} width - The canvas width
 * @param {number} height - The canvas height
 * @param {number} score - The final game score
 */
export function drawGameOverScreen(ctx, width, height, score) {
	ctx.fillStyle = '#000';
	ctx.fillRect(0, 0, width, height);
	ctx.fillStyle = '#fff';
	ctx.font = '48px sans-serif';
	ctx.textAlign = 'center';
	ctx.fillText('Game Over', width / 2, height / 2);

	// Render final score
	ctx.font = '24px sans-serif';
	ctx.fillText(`Final Score: ${score}`, width / 2, height / 2 + 50);

	// Render restart game prompt
	ctx.fillText('Press Enter to Restart', width / 2, height / 2 + 100);
}

/**
 * @class PauseScreen
 * @description Represents the pause screen
 * @extends Screen
 */
class PauseScreen extends Screen {
	constructor(ctx, gameState) {
		super(ctx, gameState);
		this.resumeGameCallback = null;
	}

	handleInput(input) {
		if (input.isKeyPressed('Escape')) {
			if (this.resumeGameCallback) {
				this.resumeGameCallback();
			}
		}
	}

	render() {
		// Render pause screen content
		this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
		this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
		this.ctx.fillStyle = '#fff';
		this.ctx.font = '48px sans-serif';
		this.ctx.textAlign = 'center';
		this.ctx.fillText('Paused', this.ctx.canvas.width / 2, this.ctx.canvas.height / 2);

		// Render resume game prompt
		this.ctx.font = '24px sans-serif';
		this.ctx.fillText(
			'Press Escape to Resume',
			this.ctx.canvas.width / 2,
			this.ctx.canvas.height / 2 + 50
		);
	}

	setResumeGameCallback(callback) {
		this.resumeGameCallback = callback;
	}
}

/**
 * @class OptionsScreen
 * @description Represents the options screen
 * @extends Screen
 */
class OptionsScreen extends Screen {
	constructor(ctx, gameState) {
		super(ctx, gameState);
		this.backToTitleCallback = null;
	}

	handleInput(input) {
		if (input.isKeyPressed('Escape')) {
			if (this.backToTitleCallback) {
				this.backToTitleCallback();
			}
		}
	}

	render() {
		// Render options screen content
		this.ctx.fillStyle = '#000';
		this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
		this.ctx.fillStyle = '#fff';
		this.ctx.font = '48px sans-serif';
		this.ctx.textAlign = 'center';
		this.ctx.fillText('Options', this.ctx.canvas.width / 2, this.ctx.canvas.height / 2);

		// Render back to title prompt
		this.ctx.font = '24px sans-serif';
		this.ctx.fillText(
			'Press Escape to Return to Title',
			this.ctx.canvas.width / 2,
			this.ctx.canvas.height / 2 + 50
		);
	}

	setBackToTitleCallback(callback) {
		this.backToTitleCallback = callback;
	}
}

/**
 * @class GameScreens
 * @description Manages game screens and transitions
 * @implements {CleanupInterface}
 */
export default class GameScreens {
	constructor(ctx, gameState) {
		this.ctx = ctx;
		this.gameState = gameState;
		this.currentScreen = null;
		this.screens = {
			title: new TitleScreen(this.ctx, this.gameState),
			gameOver: new GameOverScreen(this.ctx, this.gameState),
			pause: new PauseScreen(this.ctx, this.gameState),
			options: new OptionsScreen(this.ctx, this.gameState)
		};

		this.setupScreenCallbacks();
	}

	setupScreenCallbacks() {
		this.screens.title.setStartGameCallback(() => {
			this.transitionToScreen(null);
			GameManager.startGame();
		});

		this.screens.gameOver.setRestartGameCallback(() => {
			this.transitionToScreen(null);
			GameManager.restartGame();
		});

		this.screens.pause.setResumeGameCallback(() => {
			this.transitionToScreen(null);
			GameManager.resumeGame();
		});

		this.screens.options.setBackToTitleCallback(() => {
			this.transitionToScreen('title');
		});
	}

	handleInput(input) {
		if (this.currentScreen) {
			this.currentScreen.handleInput(input);
		}
	}

	update(deltaTime) {
		if (this.currentScreen) {
			this.currentScreen.update(deltaTime);
		}
	}

	render() {
		if (this.currentScreen) {
			this.currentScreen.render();
		}
	}

	transitionToScreen(screenName) {
		if (this.currentScreen) {
			this.currentScreen.deactivate();
		}

		if (screenName) {
			this.currentScreen = this.screens[screenName];
			this.currentScreen.activate();
		} else {
			this.currentScreen = null;
		}
	}

	showTitleScreen() {
		this.transitionToScreen('title');
	}

	showGameOverScreen() {
		this.transitionToScreen('gameOver');
	}

	showPauseScreen() {
		this.transitionToScreen('pause');
	}

	showOptionsScreen() {
		this.transitionToScreen('options');
	}

	cleanup() {
		this.currentScreen = null;
	}
}

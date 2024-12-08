/**
 * @fileoverview game.js - Master game file for Guardians of Lumara: Vela's Voyage
 * @module src/lib/components/game/game.js
 * @requires ./constants, ./managers/assetManager, ./managers/inputManager, ./managers/gameManager, ./ui/screens, ./ui/hud, ./utils/helpers
 */

import { DEBUG_MODE, GAME_STATES, CANVAS_WIDTH, CANVAS_HEIGHT, TARGET_FPS } from './constants.js';
import AssetManager from './managers/assetManager.js';
import InputManager from './managers/inputManager.js';
import GameManager from './managers/gameManager.js';
import { drawTitleScreen, drawGameOverScreen } from './ui/screens.js';
import { drawHUD } from './ui/hud.js';
import { debugLog } from './utils/helpers';

let canvas;
let ctx;
let currentState;
let assetManager;
let inputManager;
let gameManager;
let lastFrameTime;

/**
 * @function initializeGame
 * @description Initializes the game canvas, loads assets, and sets up game systems.
 * @param {HTMLCanvasElement} gameCanvas - The canvas element to use for the game.
 */
export async function initializeGame(gameCanvas) {
	try {
		canvas = gameCanvas;
		ctx = canvas.getContext('2d');
		canvas.width = CANVAS_WIDTH;
		canvas.height = CANVAS_HEIGHT;

		currentState = GAME_STATES.TITLE;
		assetManager = new AssetManager();
		inputManager = new InputManager();
		gameManager = new GameManager();

		await assetManager.loadAssets();
		inputManager.setupInputListeners();
		gameManager.initialize(ctx, assetManager);

		lastFrameTime = performance.now();
	} catch (error) {
		console.error('Game initialization failed:', error);
	}
}

/**
 * @function animate
 * @description The main game loop that updates and renders the game based on the current state.
 */
export function animate() {
	const currentTime = performance.now();
	const deltaTime = (currentTime - lastFrameTime) / 1000;

	if (deltaTime >= 1 / TARGET_FPS) {
		update(deltaTime);
		render();
		drawHUD(ctx, gameManager.score, gameManager.lives);
		lastFrameTime = currentTime;
	}

	requestAnimationFrame(animate);
}

/**
 * @function update
 * @description Updates the game state and all game systems based on the current state.
 * @param {number} deltaTime - The time elapsed since the last frame.
 */
function update(deltaTime) {
	switch (currentState) {
		case GAME_STATES.TITLE:
			updateTitleScreen();
			break;
		case GAME_STATES.PLAYING:
			updatePlayingState(deltaTime);
			break;
		case GAME_STATES.PAUSED:
			updatePausedState();
			break;
		case GAME_STATES.GAME_OVER:
			updateGameOverScreen();
			break;
	}
}

/**
 * @function updateTitleScreen
 * @description Updates the title screen state.
 */
function updateTitleScreen() {
	if (inputManager.enterPressed()) {
		currentState = GAME_STATES.PLAYING;
		gameManager.startNewGame();
	}
}

/**
 * @function updatePlayingState
 * @description Updates the playing state by updating all game systems.
 * @param {number} deltaTime - The time elapsed since the last frame.
 */
function updatePlayingState(deltaTime) {
	if (inputManager.pausePressed()) {
		currentState = GAME_STATES.PAUSED;
		return;
	}

	gameManager.update(deltaTime);
	inputManager.update();

	if (gameManager.isGameOver()) {
		currentState = GAME_STATES.GAME_OVER;
	}
}

/**
 * @function updatePausedState
 * @description Updates the paused state.
 */
function updatePausedState() {
	if (inputManager.pausePressed()) {
		currentState = GAME_STATES.PLAYING;
	}
}

/**
 * @function updateGameOverScreen
 * @description Updates the game over screen state.
 */
function updateGameOverScreen() {
	if (inputManager.enterPressed()) {
		currentState = GAME_STATES.TITLE;
	}
}

/**
 * @function render
 * @description Renders the game based on the current state.
 */
function render() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	switch (currentState) {
		case GAME_STATES.TITLE:
			drawTitleScreen(ctx);
			break;
		case GAME_STATES.PLAYING:
			renderPlayingState();
			break;
		case GAME_STATES.PAUSED:
			renderPlayingState();
			renderPauseScreen();
			break;
		case GAME_STATES.GAME_OVER:
			drawGameOverScreen(ctx, gameManager.score);
			break;
	}
}

/**
 * @function renderPlayingState
 * @description Renders the playing state by rendering all game entities and UI elements.
 */
function renderPlayingState() {
	gameManager.render();
	drawHUD(ctx, gameManager.score, gameManager.lives);
}

/**
 * @function renderPauseScreen
 * @description Renders the pause screen overlay.
 */
function renderPauseScreen() {
	ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.font = '48px Arial';
	ctx.fillStyle = 'white';
	ctx.textAlign = 'center';
	ctx.fillText('Paused', canvas.width / 2, canvas.height / 2);
}

/**
 * @function cleanup
 * @description Cleans up the game resources and resets the game state.
 */
function cleanup() {
	gameManager.cleanup();
	inputManager.cleanup();
	currentState = GAME_STATES.TITLE;
}

export { DEBUG_MODE };

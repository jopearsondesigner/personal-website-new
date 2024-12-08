/**
 * @fileoverview HUD - Manages game heads-up display
 * @module src/lib/components/game/ui/hud.js
 * @requires src/lib/components/game/managers/gameManager.js
 * @requires src/lib/components/game/managers/assetManager.js
 * @requires src/lib/components/game/constants.js
 */

import { CANVAS_WIDTH, CANVAS_HEIGHT, HUD_FONT, HUD_MARGIN } from '../constants.js';

const DEBUG = process.env.NODE_ENV === 'development';

/**
 * @class drawHUD
 * @description Manages the game's heads-up display
 */
export default class drawHUD {
	/**
	 * @param {CanvasRenderingContext2D} ctx - Canvas context
	 * @param {GameManager} gameManager - Reference to the game manager
	 * @param {AssetManager} assetManager - Reference to the asset manager
	 */
	constructor(ctx, gameManager, assetManager) {
		this.ctx = ctx;
		this.gameManager = gameManager;
		this.assetManager = assetManager;
		this.fontSize = 16;
		this.margin = HUD_MARGIN;
		this.elementsToUpdate = new Set();
	}

	/**
	 * @method init
	 * @description Initializes the HUD
	 */
	init() {
		this.debugLog('Initializing HUD');
		this.setupHUDElements();
		this.registerEventListeners();
	}

	/**
	 * @method update
	 * @description Updates the HUD
	 */
	update() {
		this.updateHUDElements();
	}

	/**
	 * @method draw
	 * @description Draws the HUD
	 */
	draw() {
		this.drawHUDBackground();
		this.drawHUDElements();
	}

	/**
	 * @method setupHUDElements
	 * @description Sets up the HUD elements
	 */
	setupHUDElements() {
		this.hudElements = {
			score: {
				label: 'Score',
				value: () => this.gameManager.getScore(),
				position: { x: this.margin, y: this.margin }
			},
			lives: {
				label: 'Lives',
				value: () => this.gameManager.getLives(),
				position: { x: CANVAS_WIDTH - this.margin, y: this.margin, align: 'right' }
			},
			powerUp: {
				label: 'Power Up',
				value: () => this.gameManager.getPowerUpStatus(),
				position: { x: this.margin, y: CANVAS_HEIGHT - this.margin }
			},
			weapon: {
				label: 'Weapon',
				value: () => this.gameManager.getWeapon(),
				position: { x: CANVAS_WIDTH - this.margin, y: CANVAS_HEIGHT - this.margin, align: 'right' }
			}
		};
	}

	/**
	 * @method updateHUDElements
	 * @description Updates the HUD elements
	 */
	updateHUDElements() {
		for (const element of this.elementsToUpdate) {
			this.hudElements[element].value = this.hudElements[element].value();
		}
		this.elementsToUpdate.clear();
	}

	/**
	 * @method drawHUDBackground
	 * @description Draws the HUD background
	 */
	drawHUDBackground() {
		this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
		this.ctx.fillRect(0, 0, CANVAS_WIDTH, this.fontSize * 2);
		this.ctx.fillRect(0, CANVAS_HEIGHT - this.fontSize * 2, CANVAS_WIDTH, this.fontSize * 2);
	}

	/**
	 * @method drawHUDElements
	 * @description Draws the HUD elements
	 */
	drawHUDElements() {
		this.ctx.font = `${this.fontSize}px ${HUD_FONT}`;
		this.ctx.fillStyle = 'white';
		this.ctx.textBaseline = 'top';

		for (const element in this.hudElements) {
			const { label, value, position } = this.hudElements[element];
			const { x, y, align } = position;

			this.ctx.textAlign = align || 'left';
			this.ctx.fillText(`${label}: ${value}`, x, y);
		}
	}

	/**
	 * @method registerEventListeners
	 * @description Registers event listeners
	 */
	registerEventListeners() {
		window.addEventListener('resize', this.handleResize.bind(this));
		this.gameManager.on('scoreUpdate', () => this.queueUpdate('score'));
		this.gameManager.on('livesUpdate', () => this.queueUpdate('lives'));
		this.gameManager.on('powerUpUpdate', () => this.queueUpdate('powerUp'));
		this.gameManager.on('weaponUpdate', () => this.queueUpdate('weapon'));
	}

	/**
	 * @method handleResize
	 * @description Handles window resize
	 */
	handleResize() {
		this.debugLog('Handling window resize');
		// Recalculate HUD element positions based on new canvas size
		for (const element in this.hudElements) {
			const { position } = this.hudElements[element];
			if (position.align === 'right') {
				position.x = CANVAS_WIDTH - this.margin;
			}
			if (position.y === CANVAS_HEIGHT - this.margin) {
				position.y = CANVAS_HEIGHT - this.margin;
			}
		}
	}

	/**
	 * @method queueUpdate
	 * @param {string} element - HUD element to update
	 * @description Queues an HUD element for update
	 */
	queueUpdate(element) {
		this.elementsToUpdate.add(element);
	}

	/**
	 * @method cleanup
	 * @description Cleans up the HUD
	 */
	cleanup() {
		this.debugLog('Cleaning up HUD');
		window.removeEventListener('resize', this.handleResize);
		this.gameManager.off('scoreUpdate', this.queueUpdate);
		this.gameManager.off('livesUpdate', this.queueUpdate);
		this.gameManager.off('powerUpUpdate', this.queueUpdate);
		this.gameManager.off('weaponUpdate', this.queueUpdate);
	}

	/**
	 * @method debugLog
	 * @param {...any} args - Arguments to log
	 * @description Logs debug messages
	 */
	debugLog(...args) {
		if (DEBUG) {
			console.log('[HUD]', ...args);
		}
	}
}

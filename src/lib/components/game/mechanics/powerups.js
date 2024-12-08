/**
 * @fileoverview PowerUpSystem - Manages game power-ups and their effects
 * @module src/lib/components/game/mechanics/powerups.js
 * @requires src/lib/components/game/managers/assetManager.js
 * @requires src/lib/components/game/managers/gameManager.js
 * @requires src/lib/components/game/ui/effects.js
 */

import AssetManager from '../managers/assetManager.js';
import GameManager from '../managers/gameManager.js';
import { createPowerUpEffects } from '../ui/effects.js';

const DEBUG = process.env.NODE_ENV === 'development';

function debugLog(...args) {
	if (DEBUG) {
		console.log('[PowerUpSystem]', ...args);
	}
}

/**
 * @class PowerUp
 * @description Represents a power-up entity in the game
 */
class PowerUp {
	/**
	 * @constructor
	 * @param {string} type - The type of the power-up
	 * @param {number} x - The x-coordinate of the power-up
	 * @param {number} y - The y-coordinate of the power-up
	 * @param {number} duration - The duration of the power-up effect (in frames)
	 */
	constructor(type, x, y, duration) {
		this.type = type;
		this.x = x;
		this.y = y;
		this.duration = duration;
		this.sprite = AssetManager.getPowerUpSprite(type);
	}

	/**
	 * @method update
	 * @description Updates the power-up state
	 */
	update() {
		// Implement power-up movement or animation
	}

	/**
	 * @method draw
	 * @description Draws the power-up on the canvas
	 * @param {CanvasRenderingContext2D} ctx - The canvas context
	 */
	draw(ctx) {
		ctx.drawImage(this.sprite, this.x, this.y);
	}
}

/**
 * @class PowerUpSystem
 * @description Manages power-ups and their effects in the game
 * @implements {CleanupInterface}
 */
export default class PowerUpSystem {
	/**
	 * @constructor
	 * @param {CanvasRenderingContext2D} ctx - The canvas context
	 * @param {GameManager} gameManager - The game manager instance
	 */
	constructor(ctx, gameManager) {
		this.ctx = ctx;
		this.gameManager = gameManager;
		this.powerUps = [];
		this.activePowerUps = {};
	}

	/**
	 * @method spawnPowerUp
	 * @description Spawns a new power-up in the game
	 * @param {string} type - The type of the power-up to spawn
	 * @param {number} x - The x-coordinate of the power-up
	 * @param {number} y - The y-coordinate of the power-up
	 * @param {number} duration - The duration of the power-up effect (in frames)
	 */
	spawnPowerUp(type, x, y, duration) {
		const powerUp = new PowerUp(type, x, y, duration);
		this.powerUps.push(powerUp);
	}

	/**
	 * @method update
	 * @description Updates the power-up system state
	 */
	update() {
		this.powerUps.forEach((powerUp, index) => {
			powerUp.update();

			// Check for power-up collision with the player
			if (this.gameManager.player.collidesWith(powerUp)) {
				this.activatePowerUp(powerUp);
				this.powerUps.splice(index, 1);
			}
		});

		// Update active power-up durations
		Object.keys(this.activePowerUps).forEach((type) => {
			const powerUp = this.activePowerUps[type];
			powerUp.duration--;

			if (powerUp.duration <= 0) {
				this.deactivatePowerUp(type);
			}
		});
	}

	/**
	 * @method draw
	 * @description Draws the power-ups on the canvas
	 */
	draw() {
		this.powerUps.forEach((powerUp) => {
			powerUp.draw(this.ctx);
		});
	}

	/**
	 * @method activatePowerUp
	 * @description Activates a power-up effect
	 * @param {PowerUp} powerUp - The power-up to activate
	 */
	activatePowerUp(powerUp) {
		debugLog(`Activating power-up: ${powerUp.type}`);

		switch (powerUp.type) {
			case 'invincibility':
				this.gameManager.player.invincible = true;
				break;
			case 'speedBoost':
				this.gameManager.player.speed *= 1.5;
				break;
			case 'weaponUpgrade':
				this.gameManager.player.weaponLevel++;
				break;
			case 'extraLife':
				this.gameManager.player.lives++;
				break;
			default:
				console.warn(`Unknown power-up type: ${powerUp.type}`);
				return;
		}

		this.activePowerUps[powerUp.type] = powerUp;
		createPowerUpEffects(powerUp.type, this.gameManager.player);
	}

	/**
	 * @method deactivatePowerUp
	 * @description Deactivates a power-up effect
	 * @param {string} type - The type of the power-up to deactivate
	 */
	deactivatePowerUp(type) {
		debugLog(`Deactivating power-up: ${type}`);

		switch (type) {
			case 'invincibility':
				this.gameManager.player.invincible = false;
				break;
			case 'speedBoost':
				this.gameManager.player.speed /= 1.5;
				break;
			case 'weaponUpgrade':
				this.gameManager.player.weaponLevel--;
				break;
			default:
				console.warn(`Unknown power-up type: ${type}`);
				return;
		}

		delete this.activePowerUps[type];
	}

	/**
	 * @method cleanup
	 * @description Cleans up the power-up system resources
	 */
	cleanup() {
		this.powerUps = [];
		this.activePowerUps = {};
	}
}

// Named exports for utility functions
export { PowerUp };

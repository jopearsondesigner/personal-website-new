/**

@fileoverview enemy.js - Implements enemy classes and behaviors
@module src/lib/components/game/sprites/enemy.js
@requires src/lib/components/game/constants.js
@requires src/lib/components/game/managers/assetManager.js
*/

import { CANVAS_WIDTH, CANVAS_HEIGHT, ENEMY_SPAWN_INTERVAL, ENEMY_SPEED } from '../constants.js';
import { getImage } from '../managers/assetManager.js';
/**

@class Enemy
@description Base class for all enemy types
@implements {CleanupInterface}
*/
export class Enemy {
	constructor() {
		this.x = 0;
		this.y = 0;
		this.width = 65;
		this.height = 65;
		this.speed = ENEMY_SPEED;
		this.isActive = false;
		this.image = getImage('enemy');
	}

	/**

@method update
@description Updates enemy state and behavior
*/
	update() {
		// Implement in derived classes
	}

	/**

@method draw
@description Renders enemy on the canvas
@param {CanvasRenderingContext2D} ctx - Canvas context
*/
	draw(ctx) {
		if (!this.isActive) return;
		ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
	}
	/**

@method cleanup
@description Resets enemy state and releases resources
*/
	cleanup() {
		this.isActive = false;
		this.x = 0;
		this.y = 0;
	}
}

/**

@class StandardEnemy
@extends Enemy
@description Standard enemy with basic movement and attack patterns
*/
export class StandardEnemy extends Enemy {
	constructor() {
		super();
		this.speed = ENEMY_SPEED;
		this.FireRate = 150;
		this.lastShotTime = 0;
	}

	update(gameState) {
		if (!this.isActive) return;

		this.y += this.speed * gameState.gameSpeed;

		if (this.y > CANVAS_HEIGHT) {
			this.cleanup();
			return;
		}

		const currentTime = Date.now();
		if (currentTime - this.lastShotTime > this.FireRate) {
			this.lastShotTime = currentTime;
			// Fire projectile logic
		}
	}
	static spawn(gameState) {
		const enemy = gameState.enemyPool.acquire(StandardEnemy);
		if (!enemy) return;
		enemy.isActive = true;
		enemy.x = Math.random() * (CANVAS_WIDTH - enemy.width);
		enemy.y = -enemy.height;
	}
}
/**

@class CityEnemy
@extends Enemy
@description Enemy that emerges from the city and targets the player
*/
export class CityEnemy extends Enemy {
	constructor() {
		super();
		this.speed = ENEMY_SPEED * 0.8;
		this.targetX = 0;
		this.targetY = 0;
		this.isReady = false;
	}

	update(gameState) {
		if (!this.isActive) return;
		if (!this.isReady) {
			this.y -= this.speed;
			if (this.y <= this.targetY) {
				this.isReady = true;
			}
		} else {
			const angle = Math.atan2(gameState.player.y - this.y, gameState.player.x - this.x);
			this.x += Math.cos(angle) * this.speed;
			this.y += Math.sin(angle) * this.speed;

			// Fire projectile logic
		}

		if (this.y < 0 || this.x < 0 || this.x > CANVAS_WIDTH || this.y > CANVAS_HEIGHT) {
			this.cleanup();
		}
	}
	static spawn(gameState) {
		const enemy = gameState.enemyPool.acquire(CityEnemy);
		if (!enemy) return;
		enemy.isActive = true;
		enemy.x = Math.random() * CANVAS_WIDTH;
		enemy.y = CANVAS_HEIGHT;
		enemy.targetX = Math.random() * CANVAS_WIDTH;
		enemy.targetY = Math.random() * (CANVAS_HEIGHT / 2);
	}
}
/**

@class ZigzagEnemy
@extends Enemy
@description Enemy that moves in a zigzag pattern
*/
export class ZigzagEnemy extends Enemy {
	constructor() {
		super();
		this.speed = ENEMY_SPEED * 1.2;
		this.amplitude = 2;
		this.frequency = 0.1;
	}

	update(gameState) {
		if (!this.isActive) return;
		this.y += this.speed * gameState.gameSpeed;
		this.x += Math.sin(this.y * this.frequency) * this.amplitude;

		// Fire projectile logic

		if (this.y > CANVAS_HEIGHT) {
			this.cleanup();
		}
	}
	static spawn(gameState) {
		const enemy = gameState.enemyPool.acquire(ZigzagEnemy);
		if (!enemy) return;
		enemy.isActive = true;
		enemy.x = Math.random() * (CANVAS_WIDTH - enemy.width);
		enemy.y = -enemy.height;
	}
}
/**

@function spawnEnemies
@description Spawns enemies based on game state and spawn interval
@param {Object} gameState - Current game state
*/
export function spawnEnemies(gameState) {
	if (gameState.frame % ENEMY_SPAWN_INTERVAL === 0) {
		const enemyTypes = [StandardEnemy, CityEnemy, ZigzagEnemy];
		const enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
		enemyType.spawn(gameState);
	}
}

/**

@function updateEnemies
@description Updates all active enemies
@param {Object} gameState - Current game state
*/
export function updateEnemies(gameState) {
	gameState.enemyPool.getPool().forEach((enemy) => {
		enemy.update(gameState);
	});
}

/**

@function drawEnemies
@description Renders all active enemies on the canvas
@param {Object} gameState - Current game state
*/
export function drawEnemies(gameState) {
	gameState.enemyPool.getPool().forEach((enemy) => {
		enemy.draw(gameState.ctx);
	});
}

// Usage Example:
// import { StandardEnemy, CityEnemy, ZigzagEnemy, spawnEnemies, updateEnemies, drawEnemies } from './enemy.js';
//
// // Initialize enemy pool
// gameState.enemyPool = new ObjectPool(10, [StandardEnemy, CityEnemy, ZigzagEnemy]);
//
// // Game loop
// function gameLoop() {
//   spawnEnemies(gameState);
//   updateEnemies(gameState);
//   drawEnemies(gameState);
//   // ...
// }
// Integration Notes:
// - Requires access to canvas context (ctx), game state, asset manager
// - Assumes existence of ObjectPool for enemy pooling
// - Communicates with other modules through game state
// - Handles enemy spawning, updates, rendering
// Testing Considerations:
// - Verify enemy spawning based on spawn interval
// - Test enemy movement patterns and state transitions
// - Ensure proper cleanup and resource management
// - Validate interactions with player and projectiles
// - Monitor performance with large number of enemies
// - Check for memory leaks and proper pool usage CopyRetryClaude does not have the ability to run the code it generates yet.

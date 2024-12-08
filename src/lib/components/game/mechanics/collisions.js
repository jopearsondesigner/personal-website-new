/**
 * @fileoverview Collision System - Handles collision detection and response for all game entities
 * @module src/lib/components/game/mechanics/collisions.js
 * @requires src/lib/components/game/managers/gameManager.js
 * @requires src/lib/components/game/sprites/player.js
 * @requires src/lib/components/game/sprites/enemy.js
 * @requires src/lib/components/game/sprites/projectile.js
 * @requires src/lib/components/game/mechanics/powerups.js
 */

import { getGameState } from '../managers/gameManager.js';
import { Player } from '../sprites/player.js';
import { Enemy } from '../sprites/enemy.js';
import { Projectile } from '../sprites/projectile.js';
import { collectPowerUp } from './powerups.js';

const DEBUG = process.env.NODE_ENV === 'development';

/**
 * @class CollisionSystem
 * @description Manages collision detection and response for all game entities
 * @implements {CleanupInterface}
 */
export default class CollisionSystem {
	constructor(ctx) {
		this.ctx = ctx;
		this.spatialHash = new Map();
		this.cellSize = 64;
	}

	/**
	 * @method update
	 * @description Updates the collision system and checks for collisions
	 */
	update() {
		this.clearSpatialHash();
		this.populateSpatialHash();
		this.checkCollisions();
	}

	/**
	 * @method clearSpatialHash
	 * @description Clears the spatial hash map
	 */
	clearSpatialHash() {
		this.spatialHash.clear();
	}

	/**
	 * @method populateSpatialHash
	 * @description Populates the spatial hash with game entities
	 */
	populateSpatialHash() {
		const { player, enemies, projectiles, powerUps } = getGameState();

		this.insertIntoHash(player);
		enemies.forEach((enemy) => this.insertIntoHash(enemy));
		projectiles.forEach((projectile) => this.insertIntoHash(projectile));
		powerUps.forEach((powerUp) => this.insertIntoHash(powerUp));
	}

	/**
	 * @method insertIntoHash
	 * @param {Object} entity - The game entity to insert into the spatial hash
	 */
	insertIntoHash(entity) {
		const { x, y, width, height } = entity;
		const startX = Math.floor(x / this.cellSize);
		const startY = Math.floor(y / this.cellSize);
		const endX = Math.floor((x + width) / this.cellSize);
		const endY = Math.floor((y + height) / this.cellSize);

		for (let i = startX; i <= endX; i++) {
			for (let j = startY; j <= endY; j++) {
				const key = `${i},${j}`;
				if (!this.spatialHash.has(key)) {
					this.spatialHash.set(key, []);
				}
				this.spatialHash.get(key).push(entity);
			}
		}
	}

	/**
	 * @method checkCollisions
	 * @description Checks for collisions between game entities
	 */
	checkCollisions() {
		this.spatialHash.forEach((cell) => {
			for (let i = 0; i < cell.length; i++) {
				for (let j = i + 1; j < cell.length; j++) {
					const entity1 = cell[i];
					const entity2 = cell[j];

					if (this.isColliding(entity1, entity2)) {
						this.resolveCollision(entity1, entity2);
					}
				}
			}
		});
	}

	/**
	 * @method isColliding
	 * @param {Object} entity1 - The first entity to check for collision
	 * @param {Object} entity2 - The second entity to check for collision
	 * @returns {boolean} Whether the two entities are colliding
	 */
	isColliding(entity1, entity2) {
		const padding = 20; // Adjust the padding value as needed
		return (
			entity1.x < entity2.x + entity2.width - padding &&
			entity1.x + entity1.width > entity2.x + padding &&
			entity1.y < entity2.y + entity2.height - padding &&
			entity1.y + entity1.height > entity2.y + padding
		);
	}

	/**
	 * @method resolveCollision
	 * @param {Object} entity1 - The first entity involved in the collision
	 * @param {Object} entity2 - The second entity involved in the collision
	 */
	resolveCollision(entity1, entity2) {
		if (entity1 instanceof Player && entity2 instanceof Enemy) {
			this.handlePlayerEnemyCollision(entity1, entity2);
		} else if (entity1 instanceof Projectile && entity2 instanceof Enemy) {
			this.handleProjectileEnemyCollision(entity1, entity2);
		} else if (entity1 instanceof Player && entity2 instanceof PowerUp) {
			this.handlePlayerPowerUpCollision(entity1, entity2);
		}
		// Add more collision resolution cases as needed
	}

	/**
	 * @method handlePlayerEnemyCollision
	 * @param {Player} player - The player entity
	 * @param {Enemy} enemy - The enemy entity
	 */
	handlePlayerEnemyCollision(player, enemy) {
		if (!player.isInvincible) {
			player.takeDamage();
			// Apply additional collision effects or logic
		}
	}

	/**
	 * @method handleProjectileEnemyCollision
	 * @param {Projectile} projectile - The projectile entity
	 * @param {Enemy} enemy - The enemy entity
	 */
	handleProjectileEnemyCollision(projectile, enemy) {
		projectile.destroy();
		enemy.takeDamage(projectile.damage);
		// Apply additional collision effects or logic
	}

	/**
	 * @method handlePlayerPowerUpCollision
	 * @param {Player} player - The player entity
	 * @param {PowerUp} powerUp - The power-up entity
	 */
	handlePlayerPowerUpCollision(player, powerUp) {
		collectPowerUp(powerUp);
		powerUp.destroy();
	}

	/**
	 * @method cleanup
	 * @description Cleans up the collision system resources
	 */
	cleanup() {
		this.clearSpatialHash();
		// Perform any additional cleanup tasks
	}

	/**
	 * @method drawDebug
	 * @description Draws debug information for the collision system
	 */
	drawDebug() {
		if (DEBUG) {
			this.ctx.strokeStyle = 'red';
			this.spatialHash.forEach((cell, key) => {
				const [x, y] = key.split(',');
				this.ctx.strokeRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
			});
		}
	}
}

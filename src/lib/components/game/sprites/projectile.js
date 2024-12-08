/**
 * @fileoverview Projectile System - Manages all projectile types and their behaviors
 * @module src/lib/components/game/sprites/projectile.js
 * @requires src/lib/components/game/constants.js
 * @requires src/lib/components/game/managers/assetManager.js
 * @requires src/lib/components/game/effects/particles.js
 * @requires src/lib/components/game/mechanics/collisions.js
 */

import { PROJECTILE_TYPES, PROJECTILE_CONFIGS } from '../constants.js';
import { AssetManager } from '../managers/assetManager.js';
import { ParticleSystem } from '../effects/particles.js';
import { checkCollision } from '../mechanics/collisions.js';

const DEBUG = process.env.NODE_ENV === 'development';

function debugLog(...args) {
	if (DEBUG) {
		console.log(`[ProjectileSystem]`, ...args);
	}
}

/**
 * @class Projectile
 * @description Base class for all projectile types
 */
class Projectile {
	constructor(x, y, type, direction) {
		this.x = x;
		this.y = y;
		this.type = type;
		this.direction = direction;
		this.config = PROJECTILE_CONFIGS[type];
		this.isActive = true;
		this.loadAssets();
	}

	loadAssets() {
		try {
			this.image = AssetManager.getImage(this.config.imagePath);
		} catch (error) {
			console.error(`[Projectile] Failed to load assets:`, error);
			// Fallback to placeholder image
			this.image = AssetManager.getImage('placeholder.png');
		}
	}

	update() {
		this.x += Math.cos(this.direction) * this.config.speed;
		this.y += Math.sin(this.direction) * this.config.speed;

		if (this.x < 0 || this.x > ctx.canvas.width || this.y < 0 || this.y > ctx.canvas.height) {
			this.isActive = false;
		}
	}

	draw() {
		ctx.save();
		ctx.translate(this.x, this.y);
		ctx.rotate(this.direction);
		ctx.drawImage(
			this.image,
			-this.config.width / 2,
			-this.config.height / 2,
			this.config.width,
			this.config.height
		);
		ctx.restore();
	}

	/**
	 * @method reset
	 * @description Resets the projectile to its initial state
	 */
	reset() {
		this.isActive = false;
		// Reset position and direction
		this.x = 0;
		this.y = 0;
		this.direction = 0;
	}
}

/**
 * @class StandardProjectile
 * @description Standard player projectile
 * @extends Projectile
 */
class StandardProjectile extends Projectile {
	constructor(x, y) {
		super(x, y, PROJECTILE_TYPES.STANDARD, -Math.PI / 2);
	}
}

/**
 * @class EnemyProjectile
 * @description Enemy projectile
 * @extends Projectile
 */
class EnemyProjectile extends Projectile {
	constructor(x, y, direction) {
		super(x, y, PROJECTILE_TYPES.ENEMY, direction);
	}
}

/**
 * @class HeatseekerMissile
 * @description Heatseeker missile projectile
 * @extends Projectile
 */
class HeatseekerMissile extends Projectile {
	constructor(x, y) {
		super(x, y, PROJECTILE_TYPES.HEATSEEKER, 0);
		this.target = null;
		this.particles = new ParticleSystem();
	}

	update(enemies) {
		if (!this.target || !this.target.isActive) {
			this.acquireTarget(enemies);
		}

		if (this.target) {
			const angleToTarget = Math.atan2(this.target.y - this.y, this.target.x - this.x);
			this.direction += Math.sign(angleToTarget - this.direction) * this.config.turnRate;
		}

		super.update();

		this.particles.createParticles(this.x, this.y, this.config.particleConfig);
		this.particles.update();
	}

	draw() {
		this.particles.draw();
		super.draw();
	}

	acquireTarget(enemies) {
		let closestDistance = Infinity;
		let closestEnemy = null;

		enemies.forEach((enemy) => {
			const distance = Math.hypot(enemy.x - this.x, enemy.y - this.y);
			if (distance < closestDistance) {
				closestDistance = distance;
				closestEnemy = enemy;
			}
		});

		this.target = closestEnemy;
	}

	triggerEffect() {
		// Trigger explosion effect
		// ...
	}

	checkCollision(entity) {
		if (checkCollision(this, entity)) {
			this.isActive = false;
			this.triggerEffect();
			return true;
		}
		return false;
	}

	reset() {
		super.reset();
		this.target = null;
		this.particles.reset();
	}
}

/**
 * @class ProjectilePool
 * @description Object pool for projectiles
 */
class ProjectilePool {
	constructor(type, size) {
		this.type = type;
		this.size = size;
		this.pool = [];
		this.createPool();
	}

	createPool() {
		for (let i = 0; i < this.size; i++) {
			let projectile;
			switch (this.type) {
				case PROJECTILE_TYPES.STANDARD:
					projectile = new StandardProjectile();
					break;
				case PROJECTILE_TYPES.ENEMY:
					projectile = new EnemyProjectile();
					break;
				case PROJECTILE_TYPES.HEATSEEKER:
					projectile = new HeatseekerMissile();
					break;
				default:
					throw new Error(`Invalid projectile type: ${this.type}`);
			}
			projectile.reset();
			this.pool.push(projectile);
		}
	}

	getProjectile(x, y, direction) {
		for (let i = 0; i < this.size; i++) {
			if (!this.pool[i].isActive) {
				const projectile = this.pool[i];
				projectile.x = x;
				projectile.y = y;
				projectile.isActive = true;

				if (this.type === PROJECTILE_TYPES.ENEMY) {
					projectile.direction = direction;
				}

				return projectile;
			}
		}

		// If no inactive projectile found, return null
		debugLog(`No inactive projectile available in pool type: ${this.type}`);
		return null;
	}

	/**
	 * @method reset
	 * @description Resets all projectiles in the pool to their initial state
	 */
	reset() {
		this.pool.forEach((projectile) => projectile.reset());
	}
}

/**
 * @class ProjectileSystem
 * @description Manages all projectile pools and behaviors
 * @implements {CleanupInterface}
 */
export default class ProjectileSystem {
	constructor() {
		this.pools = {};
		PROJECTILE_TYPES.forEach((type) => {
			this.pools[type] = new ProjectilePool(type, PROJECTILE_CONFIGS[type].poolSize);
		});
		this.projectiles = [];
	}

	update(enemies) {
		this.projectiles.forEach((projectile) => {
			projectile.update(enemies);
			if (!projectile.isActive) {
				this.returnToPool(projectile);
			}
		});

		// Remove inactive projectiles from the active list
		this.projectiles = this.projectiles.filter((projectile) => projectile.isActive);
	}

	draw() {
		this.projectiles.forEach((projectile) => projectile.draw());
	}

	fire(type, x, y, direction) {
		const projectile = this.pools[type].getProjectile(x, y, direction);
		if (projectile) {
			this.projectiles.push(projectile);
		}
	}

	returnToPool(projectile) {
		const pool = this.pools[projectile.type];
		if (pool) {
			projectile.reset();
			pool.pool.push(projectile);
		}
	}

	checkCollisions(entities) {
		this.projectiles.forEach((projectile) => {
			entities.forEach((entity) => {
				if (projectile.checkCollision(entity)) {
					// Handle collision logic
					// ...
				}
			});
		});
	}

	/**
	 * @method cleanup
	 * @description Cleans up the projectile system, resetting all pools and clearing active projectiles
	 */
	cleanup() {
		Object.values(this.pools).forEach((pool) => pool.reset());
		this.projectiles = [];
	}
}

// Usage examples:

// Creating an instance of the ProjectileSystem
const projectileSystem = new ProjectileSystem();

// Firing a standard projectile
projectileSystem.fire(PROJECTILE_TYPES.STANDARD, player.x, player.y);

// Firing an enemy projectile
projectileSystem.fire(PROJECTILE_TYPES.ENEMY, enemy.x, enemy.y, enemy.direction);

// Firing a heatseeker missile
projectileSystem.fire(PROJECTILE_TYPES.HEATSEEKER, player.x, player.y);

// Updating and drawing the projectile system
function gameLoop() {
	// ...
	projectileSystem.update(enemies);
	projectileSystem.draw();
	projectileSystem.checkCollisions(enemies);
	// ...
}

// Cleaning up the projectile system
function cleanup() {
	projectileSystem.cleanup();
}

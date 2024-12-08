/**
 * @fileoverview Particle System - Manages particle effects and pools
 * @module src/lib/components/game/effects/particles.js
 * @requires src/lib/components/game/managers/assetManager.js
 * @requires src/lib/components/game/utils/math.js
 */

import { AssetManager } from '../managers/assetManager.js';
import { lerp, randomRange } from '../utils/math.js';

const DEBUG = process.env.NODE_ENV === 'development';

function debugLog(...args) {
	if (DEBUG) {
		console.log(`[ParticleSystem]`, ...args);
	}
}

/**
 * @class Particle
 * @description Base particle class
 */
class Particle {
	constructor() {
		this.x = 0;
		this.y = 0;
		this.size = 1;
		this.color = '#FFF';
		this.alpha = 1;
		this.velocity = { x: 0, y: 0 };
		this.gravity = 0;
		this.lifetimeMax = 60;
		this.lifetimeRemaining = this.lifetimeMax;
		this.active = false;
	}

	/**
	 * @method spawn
	 * @param {Object} properties - Particle properties
	 */
	spawn(properties) {
		Object.assign(this, properties);
		this.lifetimeRemaining = this.lifetimeMax;
		this.active = true;
	}

	/**
	 * @method update
	 * @param {number} dt - Delta time
	 */
	update(dt) {
		if (!this.active) return;

		this.x += this.velocity.x * dt;
		this.y += this.velocity.y * dt;
		this.velocity.y += this.gravity * dt;
		this.size *= 0.98;
		this.alpha = this.lifetimeRemaining / this.lifetimeMax;

		this.lifetimeRemaining--;
		if (this.lifetimeRemaining <= 0) {
			this.active = false;
		}
	}

	/**
	 * @method draw
	 * @param {CanvasRenderingContext2D} ctx - Canvas context
	 */
	draw(ctx) {
		if (!this.active) return;

		ctx.save();
		ctx.globalAlpha = this.alpha;
		ctx.fillStyle = this.color;
		ctx.beginPath();
		ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}
}

/**
 * @class ExplosionParticle
 * @extends Particle
 * @description Particle for explosion effects
 */
class ExplosionParticle extends Particle {
	constructor() {
		super();
		this.size = randomRange(2, 5);
		this.velocity = {
			x: randomRange(-2, 2),
			y: randomRange(-2, 2)
		};
		this.gravity = 0.1;
		this.lifetimeMax = 60;
	}
}

/**
 * @class TrailParticle
 * @extends Particle
 * @description Particle for trail effects
 */
class TrailParticle extends Particle {
	constructor() {
		super();
		this.size = randomRange(1, 3);
		this.velocity = {
			x: randomRange(-0.5, 0.5),
			y: randomRange(-0.5, 0.5)
		};
		this.gravity = 0;
		this.lifetimeMax = 30;
	}
}

/**
 * @class SmokeParticle
 * @extends Particle
 * @description Particle for smoke effects
 */
class SmokeParticle extends Particle {
	constructor() {
		super();
		this.size = randomRange(3, 6);
		this.velocity = {
			x: randomRange(-0.2, 0.2),
			y: randomRange(-0.5, -1)
		};
		this.gravity = -0.05;
		this.lifetimeMax = 120;
	}
}

/**
 * @class FireParticle
 * @extends Particle
 * @description Particle for fire effects
 */
class FireParticle extends Particle {
	constructor() {
		super();
		this.size = randomRange(2, 4);
		this.velocity = {
			x: randomRange(-0.5, 0.5),
			y: randomRange(-1, -2)
		};
		this.gravity = -0.1;
		this.lifetimeMax = 60;
	}
}

/**
 * @class ParticlePool
 * @description Object pool for particles
 */
class ParticlePool {
	constructor(ParticleType, size) {
		this.ParticleType = ParticleType;
		this.size = size;
		this.pool = [];

		this.createPool();
	}

	/**
	 * @method createPool
	 * @description Creates the particle pool
	 */
	createPool() {
		for (let i = 0; i < this.size; i++) {
			const particle = new this.ParticleType();
			this.pool.push(particle);
		}
	}

	/**
	 * @method getParticle
	 * @returns {Particle} Available particle from the pool
	 */
	getParticle() {
		for (let particle of this.pool) {
			if (!particle.active) {
				return particle;
			}
		}

		// If no particles are available, expand the pool
		debugLog('Expanding particle pool');
		const particle = new this.ParticleType();
		this.pool.push(particle);
		return particle;
	}
}

/**
 * @class ParticleSystem
 * @description Manages particle effects and pools
 * @implements {CleanupInterface}
 */
export default class ParticleSystem {
	constructor(ctx, assets) {
		this.ctx = ctx;
		this.assets = assets;

		this.explosionPool = new ParticlePool(ExplosionParticle, 100);
		this.trailPool = new ParticlePool(TrailParticle, 50);
		this.smokePool = new ParticlePool(SmokeParticle, 30);
		this.firePool = new ParticlePool(FireParticle, 50);

		this.particles = [];
	}

	/**
	 * @method spawnExplosion
	 * @param {number} x - X position
	 * @param {number} y - Y position
	 * @param {number} [count=10] - Number of particles
	 * @param {string} [color='#FFF'] - Particle color
	 */
	spawnExplosion(x, y, count = 10, color = '#FFF') {
		for (let i = 0; i < count; i++) {
			const particle = this.explosionPool.getParticle();
			particle.spawn({
				x: x,
				y: y,
				color: color
			});
			this.particles.push(particle);
		}
	}

	/**
	 * @method spawnTrail
	 * @param {number} x - X position
	 * @param {number} y - Y position
	 * @param {number} [count=5] - Number of particles
	 * @param {string} [color='#FFF'] - Particle color
	 */
	spawnTrail(x, y, count = 5, color = '#FFF') {
		for (let i = 0; i < count; i++) {
			const particle = this.trailPool.getParticle();
			particle.spawn({
				x: x,
				y: y,
				color: color
			});
			this.particles.push(particle);
		}
	}

	/**
	 * @method spawnSmoke
	 * @param {number} x - X position
	 * @param {number} y - Y position
	 * @param {number} [count=3] - Number of particles
	 */
	spawnSmoke(x, y, count = 3) {
		for (let i = 0; i < count; i++) {
			const particle = this.smokePool.getParticle();
			particle.spawn({
				x: x,
				y: y,
				color: `hsl(0, 0%, ${randomRange(50, 80)}%)`
			});
			this.particles.push(particle);
		}
	}

	/**
	 * @method spawnFire
	 * @param {number} x - X position
	 * @param {number} y - Y position
	 * @param {number} [count=5] - Number of particles
	 */
	spawnFire(x, y, count = 5) {
		for (let i = 0; i < count; i++) {
			const particle = this.firePool.getParticle();
			particle.spawn({
				x: x,
				y: y,
				color: `hsl(${randomRange(0, 60)}, 100%, 50%)`
			});
			this.particles.push(particle);
		}
	}

	/**
	 * @method update
	 * @param {number} dt - Delta time
	 */
	update(dt) {
		for (let i = this.particles.length - 1; i >= 0; i--) {
			const particle = this.particles[i];
			particle.update(dt);
			if (!particle.active) {
				this.particles.splice(i, 1);
			}
		}
	}

	/**
	 * @method draw
	 */
	draw() {
		for (let particle of this.particles) {
			particle.draw(this.ctx);
		}

		if (DEBUG) {
			this.debugDraw();
		}
	}

	/**
	 * @method debugDraw
	 * @description Draws debug information
	 */
	debugDraw() {
		this.ctx.save();
		this.ctx.fillStyle = 'white';
		this.ctx.font = '16px Arial';
		this.ctx.fillText(`Particles: ${this.particles.length}`, 10, 30);
		this.ctx.restore();
	}

	/**
	 * @method cleanup
	 * @description Cleans up particle system resources
	 */
	cleanup() {
		this.particles.length = 0;
	}
}

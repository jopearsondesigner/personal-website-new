// File: /src/lib/workers/star-field-worker.ts

// Star interface with inUse property for pooling
interface Star {
	inUse: boolean;
	x: number;
	y: number;
	z: number;
	prevX: number;
	prevY: number;
}

// Pool implementation for the worker
class StarPool {
	private pool: Star[];
	private capacity: number;
	private size: number;

	constructor(initialCapacity: number) {
		this.capacity = initialCapacity;
		this.size = 0;
		this.pool = new Array(initialCapacity);

		// Pre-allocate all stars
		this.preAllocate();
	}

	private preAllocate(): void {
		for (let i = 0; i < this.capacity; i++) {
			this.pool[i] = {
				inUse: false,
				x: 0,
				y: 0,
				z: 0,
				prevX: 0,
				prevY: 0
			};
		}
		this.size = this.capacity;
	}

	get(): Star {
		// Find an unused star
		for (let i = 0; i < this.size; i++) {
			if (!this.pool[i].inUse) {
				this.pool[i].inUse = true;
				return this.pool[i];
			}
		}

		// If we need more capacity, expand the pool
		if (this.size < this.capacity) {
			const star = {
				inUse: true,
				x: 0,
				y: 0,
				z: 0,
				prevX: 0,
				prevY: 0
			};
			this.pool[this.size] = star;
			this.size++;
			return star;
		}

		// All stars are in use, reuse the oldest one
		const star = this.pool[0];
		star.inUse = true;

		// Move to end of array (circular buffer approach)
		this.pool.push(this.pool.shift()!);

		return star;
	}

	release(star: Star): void {
		star.inUse = false;
	}

	releaseAll(): void {
		for (let i = 0; i < this.size; i++) {
			this.pool[i].inUse = false;
		}
	}
}

// Configuration interface
interface StarFieldConfig {
	starCount: number;
	maxDepth: number;
	speed: number;
	baseSpeed: number;
	boostSpeed: number;
	containerWidth: number;
	containerHeight: number;
}

// Global state
let stars: Star[] = [];
let starPool: StarPool | null = null;
let config: StarFieldConfig = {
	starCount: 300,
	maxDepth: 32,
	speed: 0.25,
	baseSpeed: 0.25,
	boostSpeed: 2,
	containerWidth: 800,
	containerHeight: 600
};

/**
 * Initialize the star field with given configuration using object pooling
 */
function initializeStars(count: number, width: number, height: number, depth: number): Star[] {
	const newStars: Star[] = [];

	// Initialize the star pool if needed
	if (!starPool) {
		// Create a pool with 20% extra capacity
		starPool = new StarPool(Math.ceil(count * 1.2));
	} else {
		// Release all stars back to the pool
		starPool.releaseAll();
	}

	// Get stars from the pool
	for (let i = 0; i < count; i++) {
		const star = starPool.get();
		initStar(star, width, height, depth);
		newStars.push(star);
	}

	return newStars;
}

/**
 * Initialize a star with random position
 */
function initStar(star: Star, width: number, height: number, depth: number): void {
	star.x = Math.random() * width * 2 - width;
	star.y = Math.random() * height * 2 - height;
	star.z = Math.random() * depth;
	star.prevX = star.x;
	star.prevY = star.y;
}

/**
 * Reset a star to a new position without creating a new object
 */
function resetStar(star: Star, width: number, height: number, depth: number): void {
	star.x = Math.random() * width * 2 - width;
	star.y = Math.random() * height * 2 - height;
	star.z = depth;
	star.prevX = star.x;
	star.prevY = star.y;
}

/**
 * Update star positions based on time delta
 */
function updateStars(deltaTime: number): void {
	const { containerWidth, containerHeight, maxDepth, speed } = config;

	// Calculate time-based movement scale
	const timeScale = deltaTime / 16.7; // Normalized to 60fps

	// Update each star position
	for (let i = 0; i < stars.length; i++) {
		const star = stars[i];

		// Store previous position for trails
		star.prevX = star.x;
		star.prevY = star.y;

		// Move star closer to viewer with time-based movement
		star.z -= speed * timeScale;

		// If star passed the viewer, reset it to far distance
		if (star.z <= 0) {
			resetStar(star, containerWidth, containerHeight, maxDepth);
		}
	}
}

/**
 * Set boost mode for the stars
 */
function setBoost(boosting: boolean): void {
	config.speed = boosting ? config.boostSpeed : config.baseSpeed;
}

/**
 * Process incoming messages
 */
self.onmessage = function (e: MessageEvent) {
	const { type, data } = e.data;

	switch (type) {
		case 'init':
			// Initialize with new configuration
			config = { ...config, ...data.config };
			stars = initializeStars(
				config.starCount,
				config.containerWidth,
				config.containerHeight,
				config.maxDepth
			);

			// Send back the initialized stars
			self.postMessage({
				type: 'initialized',
				data: { stars, config }
			});
			break;

		case 'requestFrame':
			// Update star positions
			updateStars(data.deltaTime);

			// If dimensions changed, update container size
			if (data.dimensions) {
				config.containerWidth = data.dimensions.width;
				config.containerHeight = data.dimensions.height;
			}

			// Gradually return to base speed when not boosting
			if (config.speed > config.baseSpeed) {
				config.speed = Math.max(config.baseSpeed, config.speed * 0.98);
			}

			// Send back updated stars
			self.postMessage({
				type: 'frameUpdate',
				data: { stars, config }
			});
			break;

		case 'setBoost':
			// Update boost state
			setBoost(data.boosting);
			break;

		case 'setDimensions':
			// Update container dimensions
			config.containerWidth = data.width;
			config.containerHeight = data.height;
			break;

		case 'updateConfig':
			// Update any configuration properties
			config = { ...config, ...data.config };

			// If star count changed, reinitialize stars
			if (data.config.starCount && data.config.starCount !== stars.length) {
				stars = initializeStars(
					config.starCount,
					config.containerWidth,
					config.containerHeight,
					config.maxDepth
				);
			}
			break;

		case 'reset':
			// Reinitialize the stars
			stars = initializeStars(
				config.starCount,
				config.containerWidth,
				config.containerHeight,
				config.maxDepth
			);

			// Send back the reset stars
			self.postMessage({
				type: 'reset',
				data: { stars, config }
			});
			break;
	}
};

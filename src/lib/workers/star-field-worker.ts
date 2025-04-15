// File: /src/lib/workers/star-field-worker.ts

// Star interface
interface Star {
	x: number;
	y: number;
	z: number;
	prevX: number;
	prevY: number;
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
 * Initialize the star field with given configuration
 */
function initializeStars(count: number, width: number, height: number, depth: number): Star[] {
	const newStars: Star[] = [];

	for (let i = 0; i < count; i++) {
		newStars.push(createStar(width, height, depth));
	}

	return newStars;
}

/**
 * Create a single star at random position
 */
function createStar(width: number, height: number, depth: number): Star {
	return {
		x: Math.random() * width * 2 - width,
		y: Math.random() * height * 2 - height,
		z: Math.random() * depth,
		prevX: 0,
		prevY: 0
	};
}

/**
 * Reset a star to a new position
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

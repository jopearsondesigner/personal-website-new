// File: /src/lib/workers/star-field-worker.ts

// Type definitions
interface Star {
	x: number;
	y: number;
	z: number;
	size: number;
	opacity: number;
	// Add calculated rendering properties to avoid recalculations
	renderedX?: number;
	renderedY?: number;
	pixelX?: number;
	pixelY?: number;
	scale?: number;
	prevX?: number;
	prevY?: number;
}

interface WorkerConfig {
	updateInterval: number;
	speed: number;
	maxDepth: number;
	maxStars: number;
	boosting: boolean;
}

// Keep state in the worker to reduce message passing
let stars: Star[] = [];
let lastUpdateTime = 0;
let config: WorkerConfig = {
	updateInterval: 16, // ~60fps
	speed: 0.25,
	maxDepth: 32,
	maxStars: 60,
	boosting: false
};
let isProcessing = false;
let isDesktop = false;
let containerWidth = 0;
let containerHeight = 0;
let previousTimeStamp = 0;
let starColors: string[] = [
	'#0033ff', // Dim blue
	'#4477ff',
	'#6699ff',
	'#88bbff',
	'#aaddff',
	'#ffffff' // Bright white
];

// Listen for messages from the main thread
self.onmessage = (event) => {
	const { type, data } = event.data;

	switch (type) {
		case 'init':
			// Initialize worker with stars and configuration
			stars = data.stars;
			if (data.config) {
				config = { ...config, ...data.config };
			}
			isDesktop = data.isDesktop || false;
			containerWidth = data.containerWidth || 0;
			containerHeight = data.containerHeight || 0;
			lastUpdateTime = performance.now();
			previousTimeStamp = lastUpdateTime;

			// Start update loop
			scheduleUpdate();
			break;

		case 'updateConfig':
			// Update configuration without restarting
			if (data.config) {
				config = { ...config, ...data.config };
			}
			break;

		case 'updateStars':
			// Update stars array (when receiving new stars from main thread)
			stars = data.stars;
			isDesktop = data.isDesktop || isDesktop;

			// Update boost mode and speed if included
			if (data.boosting !== undefined) {
				config.boosting = data.boosting;
			}

			if (data.speed !== undefined) {
				config.speed = data.speed;
			}

			if (data.maxDepth !== undefined) {
				config.maxDepth = data.maxDepth;
			}

			scheduleUpdate();
			break;

		case 'updateDimensions':
			// Update container dimensions
			containerWidth = data.width || containerWidth;
			containerHeight = data.height || containerHeight;
			break;

		case 'stop':
			// Stop the update loop by not rescheduling
			isProcessing = false;
			break;

		case 'resume':
			// Resume the update loop
			if (!isProcessing) {
				previousTimeStamp = performance.now();
				scheduleUpdate();
			}
			break;

		default:
			console.error('Unknown message type in star-field-worker:', type);
	}
};

// Improved update scheduling with consistent timing
function scheduleUpdate() {
	if (isProcessing) return;
	isProcessing = true;

	const now = performance.now();
	const elapsed = now - previousTimeStamp;
	previousTimeStamp = now;

	// Use a fixed timestep for physics updates
	const fixedDeltaTime = Math.min(elapsed / 1000, 0.1); // Cap at 100ms to prevent huge jumps

	// Calculate star speed based on elapsed time
	const starSpeed = config.speed * (60 * fixedDeltaTime);

	// Update stars with proper time-based movement
	updateStarPositions(starSpeed);

	// Send updated stars back to main thread
	self.postMessage({
		type: 'starsUpdated',
		data: stars,
		timestamp: now
	});

	// Schedule next update with proper timing
	setTimeout(() => {
		isProcessing = false;
		scheduleUpdate();
	}, config.updateInterval);
}

// More efficient update function that modifies stars in place
function updateStarPositions(starSpeed) {
	const sizeMultiplier = isDesktop ? 2.0 : 1.5;
	const minSize = isDesktop ? 2 : 1;
	const centerX = containerWidth / 2;
	const centerY = containerHeight / 2;

	// Update each star in place
	for (let i = 0; i < stars.length; i++) {
		const star = stars[i];

		// Store previous position for trails
		star.prevX = star.x;
		star.prevY = star.y;

		// Update z-position (depth) with time-based movement
		star.z -= starSpeed;

		// Reset star if it goes too far
		if (star.z <= 0) {
			star.z = config.maxDepth;
			star.x = Math.random() * containerWidth * 2 - containerWidth;
			star.y = Math.random() * containerHeight * 2 - containerHeight;
			star.prevX = star.x;
			star.prevY = star.y;
			continue;
		}

		// Project 3D position to 2D screen coordinates
		const scale = config.maxDepth / star.z;
		const x2d = (star.x - centerX) * scale + centerX;
		const y2d = (star.y - centerY) * scale + centerY;

		// Store calculated properties
		star.renderedX = x2d;
		star.renderedY = y2d;
		star.scale = scale;

		// Star size based on depth
		star.size = (1 - star.z / config.maxDepth) * 3;

		// Star opacity
		star.opacity = Math.min(1, (Math.random() * 0.5 + 0.5) * (star.z * 3));
	}
}

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
}

interface WorkerConfig {
	updateInterval: number;
	starSpeed: number;
	maxStars: number;
}

// Keep state in the worker to reduce message passing
let stars: Star[] = [];
let lastUpdateTime = 0;
let config: WorkerConfig = {
	updateInterval: 16, // ~60fps
	starSpeed: 0.004,
	maxStars: 60
};
let isProcessing = false;
let isDesktop = false;
let containerWidth = 0;
let containerHeight = 0;
let previousTimeStamp = 0;

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
	const starSpeed = config.starSpeed * (60 * fixedDeltaTime);

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

	// Pre-calculate container ratios once
	const containerWidthRatio = containerWidth / 100;
	const containerHeightRatio = containerHeight / 100;

	// Update each star in place
	for (let i = 0; i < stars.length; i++) {
		const star = stars[i];

		// Update z-position (depth) with time-based movement
		star.z -= starSpeed;

		// Reset star if it goes too far
		if (star.z <= 0) {
			star.z = 0.8;
			star.x = Math.random() * 100;
			star.y = Math.random() * 100;

			// Recalculate size and opacity for new position
			star.size = Math.max(star.z * sizeMultiplier, minSize);
			star.opacity = Math.min(1, (Math.random() * 0.5 + 0.5) * (star.z * 3));
		}

		// Pre-calculate rendering properties if container dimensions are known
		if (containerWidth > 0 && containerHeight > 0) {
			const scale = 0.2 / star.z;
			star.scale = scale;
			star.renderedX = (star.x - 50) * scale + 50;
			star.renderedY = (star.y - 50) * scale + 50;
			star.pixelX = star.renderedX * containerWidthRatio;
			star.pixelY = star.renderedY * containerHeightRatio;
			star.size = Math.max(scale * sizeMultiplier, minSize);
		}
	}
}

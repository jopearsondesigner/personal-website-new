// File: /src/lib/workers/star-field-worker.ts

// Type definitions
interface Star {
	x: number;
	y: number;
	z: number;
	prevX: number;
	prevY: number;
}

interface WorkerConfig {
	starCount: number;
	maxDepth: number;
	boosting: boolean;
	speed: number;
	baseSpeed: number;
	boostSpeed: number;
	containerWidth: number;
	containerHeight: number;
}

// Default configuration that matches the reference implementation
const defaultConfig: WorkerConfig = {
	starCount: 300,
	maxDepth: 32,
	boosting: false,
	speed: 0.25,
	baseSpeed: 0.25,
	boostSpeed: 2,
	containerWidth: 800,
	containerHeight: 600
};

// Colors (blue to white gradient for stars) - exact match from reference
const starColors = [
	'#0033ff', // Dim blue
	'#4477ff',
	'#6699ff',
	'#88bbff',
	'#aaddff',
	'#ffffff' // Bright white
];

// Keep state in the worker to reduce message passing
let stars: Star[] = [];
let config = { ...defaultConfig };
let isProcessing = false;

// Initialize stars
function initStars() {
	stars = [];
	for (let i = 0; i < config.starCount; i++) {
		createStar();
	}
	return stars;
}

function createStar() {
	// Random position in 3D space - exact match to reference
	const star = {
		x: Math.random() * config.containerWidth * 2 - config.containerWidth,
		y: Math.random() * config.containerHeight * 2 - config.containerHeight,
		z: Math.random() * config.maxDepth,
		prevX: 0,
		prevY: 0
	};

	stars.push(star);
}

// Update star positions
function updateStars() {
	const centerX = config.containerWidth / 2;
	const centerY = config.containerHeight / 2;

	// Update each star's position
	for (let i = 0; i < stars.length; i++) {
		const star = stars[i];

		// Store previous position for trails
		star.prevX = star.x;
		star.prevY = star.y;

		// Move star closer to viewer
		star.z -= config.speed;

		// If star passed the viewer, reset it to far distance
		if (star.z <= 0) {
			star.x = Math.random() * config.containerWidth * 2 - config.containerWidth;
			star.y = Math.random() * config.containerHeight * 2 - config.containerHeight;
			star.z = config.maxDepth;
			star.prevX = star.x;
			star.prevY = star.y;
			continue;
		}
	}

	// Gradually return to base speed when not boosting
	if (!config.boosting && config.speed > config.baseSpeed) {
		config.speed = Math.max(config.baseSpeed, config.speed * 0.98);
	}

	return stars;
}

// Listen for messages from the main thread
self.onmessage = (event) => {
	const { type, data } = event.data;

	switch (type) {
		case 'init':
			// Initialize worker with configuration
			if (data.config) {
				config = { ...config, ...data.config };
			}

			// Initialize stars
			stars = initStars();

			// Send stars back to main thread
			self.postMessage({
				type: 'initialized',
				stars: stars
			});
			break;

		case 'updateConfig':
			// Update configuration
			if (data.config) {
				config = { ...config, ...data.config };
			}
			break;

		case 'requestFrame':
			// Update star positions
			stars = updateStars();

			// Send updated stars back to main thread
			self.postMessage({
				type: 'frameUpdate',
				stars: stars,
				config: {
					speed: config.speed,
					boosting: config.boosting
				}
			});
			break;

		case 'setBoost':
			// Update boost state
			config.boosting = data.boosting;
			config.speed = data.boosting ? config.boostSpeed : config.baseSpeed;
			break;

		case 'setDimensions':
			// Update container dimensions
			if (data.width && data.height) {
				config.containerWidth = data.width;
				config.containerHeight = data.height;
			}
			break;

		case 'reset':
			// Reset stars
			stars = initStars();

			// Send reset stars back to main thread
			self.postMessage({
				type: 'reset',
				stars: stars
			});
			break;

		default:
			console.error('Unknown message type:', type);
	}
};

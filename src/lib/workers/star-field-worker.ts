// src/workers/star-field-worker.ts

import { StarPool } from '$lib/utils/star-pool';
import type { StarPoolObject } from '$lib/utils/star-pool';

// Worker-compatible star object interface
interface WorkerStar extends StarPoolObject {
	x: number;
	y: number;
	z: number;
	prevX: number;
	prevY: number;
	velocity: {
		x: number;
		y: number;
		z: number;
	};
	size: number;
	color: string;
	alpha: number;
	brightness: number;
	age: number;
	maxAge: number;
	isVisible: boolean;
	isDirty: boolean;
	batchGroup: number;
}

interface StarFieldConfig {
	starCount: number;
	maxDepth: number;
	speed: number;
	baseSpeed: number;
	boostSpeed: number;
	containerWidth: number;
	containerHeight: number;
}
interface WorkerConfig {
	starCount: number;
	maxDepth: number;
	speed: number;
	baseSpeed: number;
	boostSpeed: number;
	containerWidth: number;
	containerHeight: number;
}

interface WorkerStats {
	created: number;
	reused: number;
	active: number;
	total: number;
}

// Configuration
let config: StarFieldConfig = {
	starCount: 300,
	maxDepth: 32,
	speed: 0.25,
	baseSpeed: 0.25,
	boostSpeed: 2,
	containerWidth: 800,
	containerHeight: 600
};

// Star pool instance
let starPool: StarPool<WorkerStar> | null = null;
let activeStars: Map<number, WorkerStar> = new Map();
let nextStarId = 0;

// Performance tracking
let lastUpdateTime = 0;
let frameCounter = 0;
let isRunning = false;

// Statistics tracking
let statsBuffer = {
	created: 0,
	reused: 0,
	lastReportTime: 0
};

// Star colors for worker calculations
const STAR_COLORS = ['#0033ff', '#4477ff', '#6699ff', '#88bbff', '#aaddff', '#ffffff'];

// Factory function for creating new star objects
function createStarFactory(): () => WorkerStar {
	return () => {
		const star: WorkerStar = {
			// StarPoolObject properties
			inUse: false,
			poolIndex: undefined,
			lastAccessTime: 0,

			// WorkerStar properties
			x: 0,
			y: 0,
			z: 0,
			prevX: 0,
			prevY: 0,
			velocity: { x: 0, y: 0, z: 0 },
			size: 1,
			color: STAR_COLORS[0],
			alpha: 1,
			brightness: 1,
			age: 0,
			maxAge: 10000,
			isVisible: false,
			isDirty: false,
			batchGroup: 0
		};

		// Track creation for statistics
		statsBuffer.created++;

		return star;
	};
}

// Reset function for star objects
function resetStar(star: WorkerStar): void {
	star.x = 0;
	star.y = 0;
	star.z = 0;
	star.prevX = 0;
	star.prevY = 0;
	star.velocity.x = 0;
	star.velocity.y = 0;
	star.velocity.z = 0;
	star.size = 1;
	star.color = STAR_COLORS[0];
	star.alpha = 1;
	star.brightness = 1;
	star.age = 0;
	star.maxAge = 10000;
	star.isVisible = false;
	star.isDirty = false;
	star.batchGroup = 0;
	star.inUse = false;

	// Track reuse for statistics
	statsBuffer.reused++;
}

// Initialize star pool
function initializeStarPool(capacity: number): void {
	if (starPool) {
		starPool.destroy();
	}

	starPool = new StarPool<WorkerStar>(capacity, createStarFactory(), resetStar, {
		preAllocate: true,
		hibernationThreshold: 30000,
		statsReportThreshold: 10
	});

	console.log(`Star pool initialized with capacity: ${capacity}`);
}

// Create a star at specific position
function createStarAt(x: number, y: number, z: number): WorkerStar | null {
	if (!starPool) return null;

	const star = starPool.get();
	if (!star) return null;

	// Initialize star properties
	star.x = x;
	star.y = y;
	star.z = z;
	star.prevX = x;
	star.prevY = y;

	// Calculate properties based on depth
	const depthRatio = 1 - z / config.maxDepth;
	star.size = depthRatio * 3;

	// Select color based on depth
	const colorIndex = Math.floor(depthRatio * (STAR_COLORS.length - 1));
	star.color = STAR_COLORS[colorIndex];

	star.brightness = depthRatio;
	star.alpha = Math.max(0.3, depthRatio);
	star.batchGroup = Math.floor(star.size);

	// Set random age and max age
	star.age = 0;
	star.maxAge = 5000 + Math.random() * 10000;

	// Set initial velocity
	star.velocity.z = -config.baseSpeed;

	star.isVisible = true;
	star.isDirty = true;

	// Add to active stars tracking
	const starId = nextStarId++;
	activeStars.set(starId, star);

	return star;
}

// Populate initial star field
function populateStarField(starCount: number): void {
	if (!starPool) return;

	// Clear existing stars
	for (const [starId, star] of activeStars.entries()) {
		starPool.release(star);
	}
	activeStars.clear();

	const halfWidth = config.containerWidth / 2;
	const halfHeight = config.containerHeight / 2;

	for (let i = 0; i < starCount; i++) {
		const x = Math.random() * config.containerWidth * 2 - halfWidth;
		const y = Math.random() * config.containerHeight * 2 - halfHeight;
		const z = Math.random() * config.maxDepth;

		createStarAt(x, y, z);
	}

	console.log(`Populated star field with ${activeStars.size} stars`);
}

// Update stars position and properties
function updateStars(deltaTime: number): void {
	if (!starPool) return;

	const timeScale = deltaTime / 16.67; // Normalize to 60fps
	const starsToRemove: number[] = [];

	for (const [starId, star] of activeStars.entries()) {
		// Store previous position
		star.prevX = star.x;
		star.prevY = star.y;

		// Update position
		star.z -= config.speed * timeScale;
		star.age += deltaTime;

		// Check if star needs to be recycled
		if (star.z <= 0 || star.age > star.maxAge) {
			starsToRemove.push(starId);
			continue;
		}

		// Calculate visibility and screen position
		const scale = config.maxDepth / star.z;
		const screenX = (star.x - config.containerWidth / 2) * scale + config.containerWidth / 2;
		const screenY = (star.y - config.containerHeight / 2) * scale + config.containerHeight / 2;

		// Check visibility with margin
		const margin = 50;
		star.isVisible =
			screenX >= -margin &&
			screenX <= config.containerWidth + margin &&
			screenY >= -margin &&
			screenY <= config.containerHeight + margin;

		// Update visual properties based on depth
		const depthRatio = 1 - star.z / config.maxDepth;
		star.size = depthRatio * 3;
		star.alpha = Math.max(0.3, depthRatio);
		star.brightness = depthRatio;

		// Update color based on depth
		const colorIndex = Math.floor(depthRatio * (STAR_COLORS.length - 1));
		star.color = STAR_COLORS[colorIndex];

		// Mark as dirty if moved significantly
		const movement = Math.abs(star.x - star.prevX) + Math.abs(star.y - star.prevY);
		star.isDirty = movement > 0.5;

		// Update batch group for rendering optimization
		star.batchGroup = Math.floor(star.size);
	}

	// Remove and recycle expired stars
	for (const starId of starsToRemove) {
		const star = activeStars.get(starId);
		if (star) {
			starPool.release(star);
			activeStars.delete(starId);
		}
	}

	// Maintain target star count
	maintainStarCount();
}

// Maintain target number of stars
function maintainStarCount(): void {
	const targetCount = config.starCount;
	const currentCount = activeStars.size;

	if (currentCount < targetCount) {
		const starsNeeded = targetCount - currentCount;
		const halfWidth = config.containerWidth / 2;
		const halfHeight = config.containerHeight / 2;

		for (let i = 0; i < starsNeeded; i++) {
			const x = Math.random() * config.containerWidth * 2 - halfWidth;
			const y = Math.random() * config.containerHeight * 2 - halfHeight;
			const z = config.maxDepth * (0.8 + Math.random() * 0.2); // Spawn in back

			createStarAt(x, y, z);
		}
	}
}

// Convert stars to transferable data for main thread
function getTransferableStarData(): any[] {
	const starData: any[] = [];

	for (const star of activeStars.values()) {
		if (!star.isVisible) continue;

		// Calculate screen position for main thread rendering
		const scale = config.maxDepth / star.z;
		const x2d = (star.x - config.containerWidth / 2) * scale + config.containerWidth / 2;
		const y2d = (star.y - config.containerHeight / 2) * scale + config.containerHeight / 2;

		// Calculate previous screen position for trails
		const prevScale = config.maxDepth / (star.z + config.speed);
		const prevX2d =
			(star.prevX - config.containerWidth / 2) * prevScale + config.containerWidth / 2;
		const prevY2d =
			(star.prevY - config.containerHeight / 2) * prevScale + config.containerHeight / 2;

		starData.push({
			x2d,
			y2d,
			prevX2d,
			prevY2d,
			size: star.size,
			color: star.color,
			alpha: star.alpha,
			brightness: star.brightness,
			z: star.z,
			batchGroup: star.batchGroup
		});
	}

	return starData;
}

// Get current pool statistics
function getPoolStats(): WorkerStats {
	if (!starPool) {
		return { created: 0, reused: 0, active: 0, total: 0 };
	}

	const poolStats = starPool.getStats();

	return {
		created: poolStats.created,
		reused: poolStats.reused,
		active: activeStars.size,
		total: poolStats.total
	};
}

// Report statistics to main thread
function reportStats(): void {
	const now = performance.now();
	const timeSinceLastReport = now - statsBuffer.lastReportTime;

	if (timeSinceLastReport >= 250) {
		// Report every 250ms
		const poolStats = getPoolStats();

		self.postMessage({
			type: 'statsUpdate',
			data: {
				created: statsBuffer.created,
				reused: statsBuffer.reused,
				active: poolStats.active,
				total: poolStats.total,
				utilizationRate: poolStats.total > 0 ? poolStats.active / poolStats.total : 0,
				reuseRatio:
					poolStats.created + poolStats.reused > 0
						? poolStats.reused / (poolStats.created + poolStats.reused)
						: 0
			}
		});

		// Reset incremental counters
		statsBuffer.created = 0;
		statsBuffer.reused = 0;
		statsBuffer.lastReportTime = now;
	}
}

// Set boost mode
function setBoost(boosting: boolean): void {
	config.speed = boosting ? config.boostSpeed : config.baseSpeed;

	// Update velocity for all active stars
	for (const star of activeStars.values()) {
		star.velocity.z = -config.speed;
	}
}

// Animation loop
function animate(): void {
	if (!isRunning) return;

	const now = performance.now();
	const deltaTime = now - lastUpdateTime;
	lastUpdateTime = now;

	// Update stars
	updateStars(deltaTime);

	// Get star data for rendering
	const starData = getTransferableStarData();

	// Send frame data to main thread
	self.postMessage({
		type: 'frameUpdate',
		data: {
			stars: starData,
			frameTime: deltaTime,
			starCount: activeStars.size,
			config: config
		}
	});

	// Report statistics periodically
	reportStats();

	// Continue animation
	setTimeout(animate, 16); // ~60fps
}

// Cleanup function
function cleanup(): void {
	isRunning = false;

	if (starPool) {
		// Release all active stars
		for (const star of activeStars.values()) {
			starPool.release(star);
		}
		activeStars.clear();

		// Destroy pool
		starPool.destroy();
		starPool = null;
	}

	// Reset counters
	nextStarId = 0;
	frameCounter = 0;
	statsBuffer = { created: 0, reused: 0, lastReportTime: 0 };

	console.log('Worker cleanup completed');
}

// Message handler
self.onmessage = function (e: MessageEvent) {
	const { type, data } = e.data;

	switch (type) {
		case 'init': {
			console.log('Initializing star field worker with StarPool');

			// Update configuration
			config = { ...config, ...data.config };

			// Initialize star pool
			initializeStarPool(config.starCount * 2); // Double capacity for flexibility

			if (starPool) {
				// Populate initial star field
				populateStarField(config.starCount);

				self.postMessage({
					type: 'initialized',
					data: {
						success: true,
						config: config,
						poolStats: getPoolStats()
					}
				});
			} else {
				self.postMessage({
					type: 'initialized',
					data: {
						success: false,
						error: 'Failed to initialize star pool'
					}
				});
			}
			break;
		}

		case 'startAnimation': {
			if (!isRunning && starPool) {
				isRunning = true;
				lastUpdateTime = performance.now();
				animate();

				console.log('Animation started');
			}
			break;
		}

		case 'stopAnimation': {
			isRunning = false;
			console.log('Animation stopped');
			break;
		}

		case 'requestFrame': {
			if (starPool && !isRunning) {
				// Manual frame update
				const deltaTime = data.deltaTime || 16.67;
				updateStars(deltaTime);

				const starData = getTransferableStarData();

				self.postMessage({
					type: 'frameUpdate',
					data: {
						stars: starData,
						frameTime: deltaTime,
						starCount: activeStars.size,
						config: config
					}
				});

				reportStats();
			}
			break;
		}

		case 'setBoost': {
			setBoost(data.boosting);
			break;
		}

		case 'setDimensions': {
			config.containerWidth = data.width;
			config.containerHeight = data.height;

			console.log(`Dimensions updated: ${data.width}x${data.height}`);
			break;
		}

		case 'updateConfig': {
			const oldStarCount = config.starCount;
			config = { ...config, ...data.config };

			// Handle star count changes
			if (data.config.starCount && data.config.starCount !== oldStarCount) {
				if (starPool) {
					// Resize pool if needed
					const newCapacity = Math.max(config.starCount * 2, oldStarCount);
					starPool.resize(newCapacity);

					// Adjust active star count
					if (config.starCount > activeStars.size) {
						populateStarField(config.starCount);
					} else if (config.starCount < activeStars.size) {
						// Remove excess stars
						const starsToRemove = Array.from(activeStars.keys()).slice(config.starCount);
						for (const starId of starsToRemove) {
							const star = activeStars.get(starId);
							if (star) {
								starPool.release(star);
								activeStars.delete(starId);
							}
						}
					}
				}

				console.log(`Star count updated: ${oldStarCount} -> ${config.starCount}`);
			}

			self.postMessage({
				type: 'configUpdated',
				data: {
					config: config,
					poolStats: getPoolStats()
				}
			});
			break;
		}

		case 'getStats': {
			self.postMessage({
				type: 'statsUpdate',
				data: getPoolStats()
			});
			break;
		}

		case 'reset': {
			if (starPool) {
				// Release all stars and repopulate
				for (const star of activeStars.values()) {
					starPool.release(star);
				}
				activeStars.clear();

				populateStarField(config.starCount);

				self.postMessage({
					type: 'reset',
					data: {
						success: true,
						poolStats: getPoolStats()
					}
				});

				console.log('Star field reset completed');
			}
			break;
		}

		case 'cleanup': {
			cleanup();

			self.postMessage({
				type: 'cleanupComplete',
				data: { success: true }
			});
			break;
		}

		default: {
			console.warn(`Unknown message type: ${type}`);
			break;
		}
	}
};

// Handle worker errors
self.onerror = function (error) {
	console.error('Star field worker error:', error);

	self.postMessage({
		type: 'error',
		data: {
			message: error.message,
			filename: error.filename,
			lineno: error.lineno
		}
	});
};

// Initialize on worker load
console.log('Star field worker loaded with StarPool integration');

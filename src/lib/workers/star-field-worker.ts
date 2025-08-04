// src/workers/star-field-worker.ts

import { EfficientObjectPool, CommonPools, PoolFactory } from '$lib/utils/efficient-object-pool';
import type { PoolableObject, PoolStatistics } from '$lib/utils/efficient-object-pool';

// Worker-compatible star object interface - now extends PoolableObject
interface WorkerStar extends PoolableObject {
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

// Efficient object pool instance
let starPool: EfficientObjectPool<WorkerStar> | null = null;
let activeStars: Map<number, WorkerStar> = new Map();
let nextStarId = 0;

// Performance tracking
let lastUpdateTime = 0;
let frameCounter = 0;
let isRunning = false;

// Star colors for worker calculations
const STAR_COLORS = ['#0033ff', '#4477ff', '#6699ff', '#88bbff', '#aaddff', '#ffffff'];

// Simplified factory function for creating new star objects
function createStarFactory(): WorkerStar {
	return {
		// PoolableObject properties
		__pooled: true,

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
}

// Simplified reset function for star objects
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
}

// Initialize efficient star pool
function initializeStarPool(capacity: number): void {
	if (starPool) {
		starPool.destroy();
	}

	// Create efficient object pool with simplified configuration
	starPool = new EfficientObjectPool<WorkerStar>(createStarFactory, resetStar, {
		name: 'workerStars',
		initialCapacity: capacity,
		maxCapacity: capacity * 2,
		preAllocate: true,
		enableStatistics: true,
		objectSizeEstimate: 240, // ~240 bytes per star
		resetOnRelease: true
	});

	console.log(`Efficient star pool initialized with capacity: ${capacity}`);
}

// Create a star at specific position - optimized for >80% reuse
function createStarAt(x: number, y: number, z: number): WorkerStar | null {
	if (!starPool) return null;

	// Get from pool (high probability of reuse due to efficient implementation)
	const star = starPool.get();
	if (!star) return null;

	// Initialize star properties (reset already called by pool)
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

	// Clear existing stars - return to pool for reuse
	const starsToRelease: WorkerStar[] = [];
	for (const [starId, star] of activeStars.entries()) {
		starsToRelease.push(star);
	}

	// Batch release for efficiency
	starPool.releaseAll(starsToRelease);
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
	const starsToRelease: WorkerStar[] = [];

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
			starsToRelease.push(star);
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

	// Remove expired stars from tracking
	for (const starId of starsToRemove) {
		activeStars.delete(starId);
	}

	// Batch release expired stars back to pool for reuse
	if (starsToRelease.length > 0) {
		starPool.releaseAll(starsToRelease);
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

// Get current pool statistics - now from EfficientObjectPool
function getPoolStats(): WorkerStats {
	if (!starPool) {
		return { created: 0, reused: 0, active: 0, total: 0 };
	}

	const poolStats = starPool.getStatistics();

	return {
		created: poolStats.totalCreated,
		reused: poolStats.totalReused,
		active: activeStars.size,
		total: poolStats.capacity
	};
}

// Report statistics to main thread - simplified with efficient pool stats
function reportStats(): void {
	const poolStats = getPoolStats();

	self.postMessage({
		type: 'statsUpdate',
		data: {
			created: poolStats.created,
			reused: poolStats.reused,
			active: poolStats.active,
			total: poolStats.total,
			utilizationRate: poolStats.total > 0 ? poolStats.active / poolStats.total : 0,
			reuseRatio:
				poolStats.created + poolStats.reused > 0
					? poolStats.reused / (poolStats.created + poolStats.reused)
					: 0
		}
	});
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
			config: config,
			poolStats: getPoolStats() // Include pool stats in frame update
		}
	});

	// Report statistics periodically
	reportStats();

	// Continue animation
	setTimeout(animate, 16); // ~60fps
}

// Cleanup function - now uses efficient pool cleanup
function cleanup(): void {
	isRunning = false;

	if (starPool) {
		// Release all active stars back to pool
		const starsToRelease: WorkerStar[] = [];
		for (const star of activeStars.values()) {
			starsToRelease.push(star);
		}
		starPool.releaseAll(starsToRelease);
		activeStars.clear();

		// Destroy pool cleanly
		starPool.destroy();
		starPool = null;
	}

	// Reset counters
	nextStarId = 0;
	frameCounter = 0;

	console.log('Worker cleanup completed with efficient pool');
}

// Message handler - same interface, optimized internals
self.onmessage = function (e: MessageEvent) {
	const { type, data } = e.data;

	switch (type) {
		case 'init': {
			console.log('Initializing star field worker with EfficientObjectPool');

			// Update configuration
			config = { ...config, ...data.config };

			// Initialize efficient star pool
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
						error: 'Failed to initialize efficient star pool'
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

				console.log('Animation started with efficient pooling');
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
						config: config,
						poolStats: getPoolStats()
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
					// Adjust active star count
					if (config.starCount > activeStars.size) {
						populateStarField(config.starCount);
					} else if (config.starCount < activeStars.size) {
						// Remove excess stars and return to pool
						const starsToRemove = Array.from(activeStars.entries()).slice(config.starCount);
						const starsToRelease: WorkerStar[] = [];

						for (const [starId, star] of starsToRemove) {
							activeStars.delete(starId);
							starsToRelease.push(star);
						}

						// Batch release excess stars
						starPool.releaseAll(starsToRelease);
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
				const starsToRelease: WorkerStar[] = [];
				for (const star of activeStars.values()) {
					starsToRelease.push(star);
				}
				starPool.releaseAll(starsToRelease);
				activeStars.clear();

				populateStarField(config.starCount);

				self.postMessage({
					type: 'reset',
					data: {
						success: true,
						poolStats: getPoolStats()
					}
				});

				console.log('Star field reset completed with efficient pooling');
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

	// Cast to ErrorEvent to access error properties
	const errorEvent = error as ErrorEvent;

	self.postMessage({
		type: 'error',
		data: {
			message: errorEvent.message || 'Unknown error',
			filename: errorEvent.filename || 'unknown',
			lineno: errorEvent.lineno || 0
		}
	});
};

// Initialize on worker load
console.log('Star field worker loaded with EfficientObjectPool integration');

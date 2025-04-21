// src/lib/workers/star-field-worker.ts

// Constants for TypedArray structure
const STAR_DATA_ELEMENTS = 6; // x, y, z, prevX, prevY, inUse
const FLOAT32_BYTES = 4;

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
let config: StarFieldConfig = {
	starCount: 300,
	maxDepth: 32,
	speed: 0.25,
	baseSpeed: 0.25,
	boostSpeed: 2,
	containerWidth: 800,
	containerHeight: 600
};

// Statistics tracking
let statsObjectsCreated = 0;
let statsObjectsReused = 0;
let lastStatsReport = 0;
const statsReportInterval = 250; // More frequent reporting (250ms)

// TypedArray for efficiently storing and transferring star data
// Format: [x1, y1, z1, prevX1, prevY1, inUse1, x2, y2, z2, prevX2, prevY2, inUse2, ...]
let starData: Float32Array;

/**
 * Initialize the star field with given configuration using TypedArrays
 */
function initializeStars(
	count: number,
	width: number,
	height: number,
	depth: number
): Float32Array {
	// Create a new Float32Array to hold all star data
	// Each star has 6 values: x, y, z, prevX, prevY, inUse
	const dataSize = count * STAR_DATA_ELEMENTS;
	const newStarData = new Float32Array(dataSize);

	// Track object creation - increment by actual count
	statsObjectsCreated += count;

	// Initialize stars with random positions
	for (let i = 0; i < count; i++) {
		const baseIndex = i * STAR_DATA_ELEMENTS;

		// Set random position
		newStarData[baseIndex] = Math.random() * width * 2 - width; // x
		newStarData[baseIndex + 1] = Math.random() * height * 2 - height; // y
		newStarData[baseIndex + 2] = Math.random() * depth; // z

		// Set previous position (same as current initially)
		newStarData[baseIndex + 3] = newStarData[baseIndex]; // prevX
		newStarData[baseIndex + 4] = newStarData[baseIndex + 1]; // prevY

		// Set inUse flag (1.0 = true, 0.0 = false)
		newStarData[baseIndex + 5] = 1.0; // inUse
	}

	// Force stats report after initialization
	reportStats(true);

	return newStarData;
}

/**
 * Reset a star to a new position
 */
function resetStar(index: number, width: number, height: number, depth: number): void {
	const baseIndex = index * STAR_DATA_ELEMENTS;

	// Track object reuse - increment by one for each reset
	statsObjectsReused++;

	// Set new random position
	starData[baseIndex] = Math.random() * width * 2 - width; // x
	starData[baseIndex + 1] = Math.random() * height * 2 - height; // y
	starData[baseIndex + 2] = depth; // z

	// Set previous position
	starData[baseIndex + 3] = starData[baseIndex]; // prevX
	starData[baseIndex + 4] = starData[baseIndex + 1]; // prevY
}

/**
 * Report statistics to main thread
 */
function reportStats(force: boolean = false): void {
	const now = performance.now();

	// Only report at intervals, unless forced
	if (!force && now - lastStatsReport < statsReportInterval) return;

	// Only send non-zero stats or if forced
	if (statsObjectsCreated > 0 || statsObjectsReused > 0 || force) {
		// Clone the stats before sending to prevent race conditions
		const statsToReport = {
			created: statsObjectsCreated,
			reused: statsObjectsReused
		};

		self.postMessage({
			type: 'statsUpdate',
			data: statsToReport
		});

		// Reset counters after reporting
		statsObjectsCreated = 0;
		statsObjectsReused = 0;
		lastStatsReport = now;
	}
}

/**
 * Update star positions based on time delta
 */
function updateStars(deltaTime: number): void {
	const { containerWidth, containerHeight, maxDepth, speed } = config;

	// Calculate time-based movement scale
	const timeScale = deltaTime / 16.7; // Normalized to 60fps

	// Count of reset stars in this update (for reporting)
	let resetCount = 0;

	// Update each star position
	for (let i = 0; i < config.starCount; i++) {
		const baseIndex = i * STAR_DATA_ELEMENTS;

		// Skip stars that are not in use
		if (starData[baseIndex + 5] < 0.5) continue;

		// Store previous position for trails
		starData[baseIndex + 3] = starData[baseIndex]; // prevX = x
		starData[baseIndex + 4] = starData[baseIndex + 1]; // prevY = y

		// Move star closer to viewer with time-based movement
		starData[baseIndex + 2] -= speed * timeScale; // z -= speed

		// If star passed the viewer, reset it to far distance
		if (starData[baseIndex + 2] <= 0) {
			resetStar(i, containerWidth, containerHeight, maxDepth);
			resetCount++;
		}
	}

	// Report stats if we had resets or regularly based on time
	if (resetCount > 0) {
		// Force report if we had any resets to ensure they're captured
		reportStats(resetCount > 0);
	} else if (performance.now() - lastStatsReport >= statsReportInterval) {
		// Regular reporting based on time interval
		reportStats();
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
		case 'init': {
			// Initialize with new configuration
			config = { ...config, ...data.config };

			// Initialize star data
			starData = initializeStars(
				config.starCount,
				config.containerWidth,
				config.containerHeight,
				config.maxDepth
			);

			// Send back the initialized stars using transferable objects
			self.postMessage(
				{
					type: 'initialized',
					data: {
						starData,
						config
					}
				},
				[starData.buffer]
			);
			break;
		}

		case 'requestStats': {
			// Force immediate stats report
			reportStats(true);
			break;
		}

		case 'updatePoolStats': {
			// Acknowledge receipt of pool stats
			self.postMessage({
				type: 'poolStatsUpdated',
				data: {
					success: true
				}
			});
			break;
		}

		case 'requestFrame': {
			// Receive the star data back from the main thread
			if (data.starData) {
				starData = data.starData;
			}

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

			// Send back updated stars using transferable objects
			self.postMessage(
				{
					type: 'frameUpdate',
					data: {
						starData,
						config
					}
				},
				[starData.buffer]
			);

			break;
		}

		case 'setBoost': {
			// Update boost state
			setBoost(data.boosting);
			break;
		}

		case 'setDimensions': {
			// Update container dimensions
			config.containerWidth = data.width;
			config.containerHeight = data.height;
			break;
		}

		case 'updateConfig': {
			// Update any configuration properties
			const oldStarCount = config.starCount;
			config = { ...config, ...data.config };

			// If star count changed, reinitialize stars
			if (data.config.starCount && data.config.starCount !== oldStarCount) {
				starData = initializeStars(
					config.starCount,
					config.containerWidth,
					config.containerHeight,
					config.maxDepth
				);

				// Send back the updated star data
				self.postMessage(
					{
						type: 'starCountChanged',
						data: {
							starData,
							config
						}
					},
					[starData.buffer]
				);
			}
			break;
		}

		case 'reset': {
			// Reinitialize the stars
			starData = initializeStars(
				config.starCount,
				config.containerWidth,
				config.containerHeight,
				config.maxDepth
			);

			// Send back the reset stars
			self.postMessage(
				{
					type: 'reset',
					data: {
						starData,
						config
					}
				},
				[starData.buffer]
			);

			break;
		}

		case 'adaptToDevice': {
			// Handle device-specific adaptations
			self.postMessage({
				type: 'deviceAdapted',
				data: {
					success: true
				}
			});
			break;
		}
	}
};

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
let statsInterval: number | null = null; // Added for cleanup handler

// TypedArray for efficiently storing and transferring star data
// Format: [x1, y1, z1, prevX1, prevY1, inUse1, x2, y2, z2, prevX2, prevY2, inUse2, ...]
let starData: Float32Array;

// Track if the starData buffer has been transferred
let starDataBufferTransferred = false;

/**
 * Optimization: Enhanced change detection with significance tracking
 * Benefit: Enables more efficient partial updates
 */
let changedStarIndices: number[] = [];
let significantChanges = false;

/**
 * Optimization: Batch statistics reporting
 * Benefit: Reduces message passing overhead
 */
let batchedStats = {
	created: 0,
	reused: 0,
	lastReportTime: 0
};

/**
 * Initialize the star field with given configuration using TypedArrays
 */
function initializeStars(
	count: number,
	width: number,
	height: number,
	depth: number
): Float32Array {
	const startTime = performance.now();

	// Create a new Float32Array to hold all star data
	// Each star has 6 values: x, y, z, prevX, prevY, inUse
	const dataSize = count * STAR_DATA_ELEMENTS;
	const newStarData = new Float32Array(dataSize);

	// Track object creation - increment by actual count
	statsObjectsCreated += count;
	batchedStats.created += count;

	// Initialize stars with random positions
	// Using a more optimized loop without unnecessary calculations per iteration
	for (let i = 0, baseIndex = 0; i < count; i++, baseIndex += STAR_DATA_ELEMENTS) {
		// Set random position - precalculate range values
		const randomX = Math.random() * width * 2 - width;
		const randomY = Math.random() * height * 2 - height;
		const randomZ = Math.random() * depth;

		// Set current position
		newStarData[baseIndex] = randomX; // x
		newStarData[baseIndex + 1] = randomY; // y
		newStarData[baseIndex + 2] = randomZ; // z

		// Set previous position (same as current initially)
		newStarData[baseIndex + 3] = randomX; // prevX
		newStarData[baseIndex + 4] = randomY; // prevY

		// Set inUse flag (1.0 = true, 0.0 = false)
		newStarData[baseIndex + 5] = 1.0; // inUse
	}

	// Force stats report after initialization
	reportStats(true);

	// Report initialization time
	const initTime = performance.now() - startTime;
	console.debug(`Star field initialized ${count} stars in ${initTime.toFixed(2)}ms`);

	return newStarData;
}

/**
 * Reset a star to a new position
 */
function resetStar(index: number, width: number, height: number, depth: number): void {
	const baseIndex = index * STAR_DATA_ELEMENTS;

	// Track object reuse - increment by one for each reset
	statsObjectsReused++;
	batchedStats.reused++;

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

	// Only report at intervals or when forced
	if (!force && now - batchedStats.lastReportTime < statsReportInterval) {
		// Just accumulate stats
		return;
	}

	// Only send non-zero stats or if forced
	if (batchedStats.created > 0 || batchedStats.reused > 0 || force) {
		// Clone the stats before sending
		const statsToReport = {
			created: batchedStats.created,
			reused: batchedStats.reused
		};

		self.postMessage({
			type: 'statsUpdate',
			data: statsToReport
		});

		// Reset accumulated stats
		batchedStats.created = 0;
		batchedStats.reused = 0;
		batchedStats.lastReportTime = now;
	}
}

/**
 * Update star positions based on time delta
 */
function updateStars(deltaTime: number): void {
	if (starDataBufferTransferred) {
		// If our buffer was transferred, recreate it
		starData = initializeStars(
			config.starCount,
			config.containerWidth,
			config.containerHeight,
			config.maxDepth
		);
		starDataBufferTransferred = false;
	}

	const { containerWidth, containerHeight, maxDepth, speed } = config;

	// Clear previous change tracking
	changedStarIndices = [];
	significantChanges = false;

	// Calculate time-based movement scale
	const timeScale = deltaTime / 16.7; // Normalized to 60fps

	// Threshold for considering a star's movement "significant"
	const movementThreshold = 0.1;

	// Update each star position
	for (let i = 0; i < config.starCount; i++) {
		const baseIndex = i * STAR_DATA_ELEMENTS;

		// Skip stars that are not in use
		if (starData[baseIndex + 5] < 0.5) continue;

		// Store previous position for trails
		const prevX = starData[baseIndex];
		const prevY = starData[baseIndex + 1];
		const prevZ = starData[baseIndex + 2];

		starData[baseIndex + 3] = prevX; // prevX = x
		starData[baseIndex + 4] = prevY; // prevY = y

		// Move star closer to viewer with time-based movement
		starData[baseIndex + 2] -= speed * timeScale; // z -= speed

		// If star passed the viewer, reset it to far distance
		if (starData[baseIndex + 2] <= 0) {
			resetStar(i, containerWidth, containerHeight, maxDepth);
			// Track this change
			changedStarIndices.push(i);
			significantChanges = true; // Reset is always significant
		} else if (Math.abs(starData[baseIndex + 2] - prevZ) > movementThreshold) {
			// Also track stars that moved significantly
			changedStarIndices.push(i);
		}
	}

	// Report stats if we had changes
	if (significantChanges) {
		// Force report if we had any resets to ensure they're captured
		reportStats(true);
	} else if (changedStarIndices.length > 0) {
		reportStats(false);
	}
}

/**
 * Get array of indices for stars that have changed
 */
function getChangedStarIndices(): number[] {
	return changedStarIndices;
}

/**
 * Extract partial star data for only the changed stars
 */
function extractPartialStarData(indices: number[]): Float32Array {
	// If more than 40% of stars changed, just send the whole array
	// This avoids the overhead of extracting too many individual stars
	if (indices.length > config.starCount * 0.4) {
		// Create a copy of the full star data to avoid transferring the original
		const fullCopy = new Float32Array(starData);
		return fullCopy;
	}

	const partialData = new Float32Array(indices.length * STAR_DATA_ELEMENTS);

	for (let i = 0; i < indices.length; i++) {
		const starIndex = indices[i];
		const sourceBaseIndex = starIndex * STAR_DATA_ELEMENTS;
		const destBaseIndex = i * STAR_DATA_ELEMENTS;

		// Copy all elements for this star
		for (let j = 0; j < STAR_DATA_ELEMENTS; j++) {
			partialData[destBaseIndex + j] = starData[sourceBaseIndex + j];
		}
	}

	return partialData;
}

/**
 * Update only specific stars in the star data
 */
function updatePartialStarData(indices: number[], partialData: Float32Array): void {
	for (let i = 0; i < indices.length; i++) {
		const starIndex = indices[i];
		const destBaseIndex = starIndex * STAR_DATA_ELEMENTS;
		const sourceBaseIndex = i * STAR_DATA_ELEMENTS;

		// Copy all elements for this star
		for (let j = 0; j < STAR_DATA_ELEMENTS; j++) {
			starData[destBaseIndex + j] = partialData[sourceBaseIndex + j];
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
 * Enhanced cleanup with better memory management
 */
function performCleanup() {
	// 1. Nullify large TypedArrays
	if (starData) {
		// Create a tiny replacement to release memory
		starData = new Float32Array(1);
	}

	// 2. Clear any timers or intervals
	if (statsInterval) {
		clearInterval(statsInterval);
		statsInterval = null;
	}

	// 3. Reset all counters and accumulators
	statsObjectsCreated = 0;
	statsObjectsReused = 0;
	lastStatsReport = 0;
	starDataBufferTransferred = false;
	batchedStats = {
		created: 0,
		reused: 0,
		lastReportTime: 0
	};
	changedStarIndices = [];

	// 4. Null out config reference
	config = {
		starCount: 0,
		maxDepth: 0,
		speed: 0,
		baseSpeed: 0,
		boostSpeed: 0,
		containerWidth: 0,
		containerHeight: 0
	};

	// 5. Tell the browser to optimize garbage collection
	if (typeof globalThis.gc !== 'undefined') {
		try {
			(globalThis as any).gc();
		} catch (e) {
			// GC not available, ignore
		}
	}

	// 6. Report completion
	return { success: true };
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

			// Reset our tracking flag when we create new data
			starDataBufferTransferred = false;

			// Create a copy for transferring
			const starDataCopy = new Float32Array(starData);

			// Send back the initialized stars using transferable objects
			self.postMessage(
				{
					type: 'initialized',
					data: {
						starData: starDataCopy,
						config
					}
				},
				[starDataCopy.buffer]
			);

			// We don't mark the original buffer as transferred
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
			// Timestamp start of processing for performance monitoring
			const processingStart = performance.now();

			// Receive the star data back from the main thread
			if (data.starData) {
				starData = data.starData;
				starDataBufferTransferred = false; // Reset flag as we have new data
			}

			// If the buffer was transferred, we need to recreate it
			if (starDataBufferTransferred) {
				starData = initializeStars(
					config.starCount,
					config.containerWidth,
					config.containerHeight,
					config.maxDepth
				);
				starDataBufferTransferred = false;
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

			// Create a copy for transferring
			const starDataCopy = new Float32Array(starData);

			// Add processing time to monitor performance
			const processingTime = performance.now() - processingStart;

			// Send back updated stars using transferable objects
			self.postMessage(
				{
					type: 'frameUpdate',
					data: {
						starData: starDataCopy,
						config,
						processingTime,
						isFullUpdate: true
					}
				},
				[starDataCopy.buffer]
			);

			// We don't mark our original buffer as transferred
			break;
		}

		case 'requestPartialFrame': {
			// Timestamp start of processing for performance monitoring
			const processingStart = performance.now();

			// Handle partial updates for changed stars only
			if (data.changedIndices && data.changedStarData) {
				// Check if we received the full array or just partial data
				const isFullUpdate = data.changedStarData.length === starData.length;

				if (isFullUpdate) {
					// Fast path: direct assignment if full data
					starData = data.changedStarData;
					starDataBufferTransferred = false; // Reset flag as we have new data
				} else {
					// If our buffer was transferred, we need a new one first
					if (starDataBufferTransferred) {
						// Recreate star data if it was transferred
						starData = initializeStars(
							config.starCount,
							config.containerWidth,
							config.containerHeight,
							config.maxDepth
						);
						starDataBufferTransferred = false;
					}

					// Update only the changed star data
					updatePartialStarData(data.changedIndices, data.changedStarData);
				}
			}

			// If our buffer was transferred, we need a new one
			if (starDataBufferTransferred) {
				// Recreate star data if it was transferred
				starData = initializeStars(
					config.starCount,
					config.containerWidth,
					config.containerHeight,
					config.maxDepth
				);
				starDataBufferTransferred = false;
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

			// Get the updated changed indices
			const changedIndices = getChangedStarIndices();

			// Create a new buffer for transfer - NEVER use the original
			let dataToTransfer;
			const isFullData = changedIndices.length > config.starCount * 0.4;

			if (isFullData) {
				// Create a complete copy for transfer
				dataToTransfer = new Float32Array(starData);
			} else {
				// Create partial data for transfer (using a safer approach)
				const bufferSize = changedIndices.length * STAR_DATA_ELEMENTS;
				dataToTransfer = new Float32Array(bufferSize);

				for (let i = 0; i < changedIndices.length; i++) {
					const starIndex = changedIndices[i];
					const sourceBaseIndex = starIndex * STAR_DATA_ELEMENTS;
					const destBaseIndex = i * STAR_DATA_ELEMENTS;

					// Copy all elements for this star
					for (let j = 0; j < STAR_DATA_ELEMENTS; j++) {
						dataToTransfer[destBaseIndex + j] = starData[sourceBaseIndex + j];
					}
				}
			}

			// Add processing time to monitor performance
			const processingTime = performance.now() - processingStart;

			// Adapt to send either partial or full update based on what's more efficient
			if (changedIndices.length > 0) {
				if (isFullData) {
					// Full data transfer is more efficient when many stars change
					self.postMessage(
						{
							type: 'frameUpdate',
							data: {
								starData: dataToTransfer,
								config,
								processingTime,
								isFullUpdate: true
							}
						},
						[dataToTransfer.buffer]
					);
				} else {
					// Partial update when only a few stars changed
					self.postMessage(
						{
							type: 'partialFrameUpdate',
							data: {
								changedIndices: changedIndices,
								changedStarData: dataToTransfer,
								config,
								processingTime,
								isFullUpdate: false
							}
						},
						[dataToTransfer.buffer]
					);
				}

				// We don't mark our original buffer as transferred
			} else {
				// If no changes, just send a no-change signal
				self.postMessage({
					type: 'noChanges',
					data: {
						config,
						processingTime
					}
				});
				// No buffer transferred in this case
			}

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
				// Recreate stars with new count
				starData = initializeStars(
					config.starCount,
					config.containerWidth,
					config.containerHeight,
					config.maxDepth
				);
				starDataBufferTransferred = false;

				// Create a copy for transferring
				const starDataCopy = new Float32Array(starData);

				// Send back the updated star data
				self.postMessage(
					{
						type: 'starCountChanged',
						data: {
							starData: starDataCopy,
							config
						}
					},
					[starDataCopy.buffer]
				);

				// We don't mark our original buffer as transferred
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
			starDataBufferTransferred = false;

			// Create a copy for transferring
			const starDataCopy = new Float32Array(starData);

			// Send back the reset stars
			self.postMessage(
				{
					type: 'reset',
					data: {
						starData: starDataCopy,
						config
					}
				},
				[starDataCopy.buffer]
			);

			// We don't mark our original buffer as transferred
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

		case 'cleanup': {
			// Perform worker cleanup
			const result = performCleanup();

			// Send acknowledgement before termination
			self.postMessage({
				type: 'cleanupComplete',
				data: result
			});

			break;
		}
	}
};

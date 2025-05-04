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

/**
 * Optimization: Enhanced change detection that tracks modified star indices and their properties
 * Benefit: Enables more granular partial updates
 */
let changedStarIndices: number[] = [];
let changedStarFlags: Uint8Array; // Bitmask of which properties changed

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
 * Optimization flags to control worker behavior
 */
const WORKER_FLAGS = {
	ENABLE_BATCHING: true,
	ENABLE_PARTIAL_UPDATES: true,
	ENABLE_DELTA_COMPRESSION: true,
	USE_TRANSFERABLE_OBJECTS: true
};

/**
 * Message batching system to reduce communication overhead
 * Benefit: Fewer postMessage calls with more data per message
 */
let pendingMessages: any[] = [];
let batchingEnabled = true;
let batchTimer: number | null = null;
const BATCH_INTERVAL = 16; // ms (roughly one frame at 60fps)

/**
 * Message priority levels
 */
const MESSAGE_PRIORITY = {
	HIGH: 0, // Immediate (cleanup, reset, critical commands)
	NORMAL: 1, // Standard (frame updates, config changes)
	LOW: 2 // Background (stats, non-critical updates)
};

// Priority queue implementation
let priorityQueue: { priority: number; msg: any }[] = [];

/**
 * Initialize change tracking arrays
 */
function initializeChangeTracking(count: number): void {
	changedStarIndices = [];
	changedStarFlags = new Uint8Array(count);
}

/**
 * Mark a star as changed with optional property flags
 */
function markStarChanged(index: number, flags: number = 0xff): void {
	// If this star wasn't already marked as changed, add it to the index list
	if (changedStarFlags[index] === 0) {
		changedStarIndices.push(index);
	}
	// Update flags with bitwise OR to track specific properties that changed
	changedStarFlags[index] |= flags;
}

/**
 * Reset change tracking for a new frame
 */
function resetChangeTracking(): void {
	changedStarIndices = [];
	changedStarFlags.fill(0);
}

/**
 * Queue a message with priority for batched sending
 */
function queueMessageWithPriority(
	priority: number,
	type: string,
	data: any,
	transfer?: Transferable[]
): void {
	if (!batchingEnabled) {
		// If batching is disabled, send immediately
		self.postMessage({ type, data }, transfer);
		return;
	}

	// Add to priority queue
	priorityQueue.push({
		priority,
		msg: { type, data, transfer }
	});

	// Sort queue by priority (lower number = higher priority)
	priorityQueue.sort((a, b) => a.priority - b.priority);

	// Schedule processing if not already scheduled
	if (batchTimer === null) {
		batchTimer = setTimeout(processPriorityQueue, BATCH_INTERVAL) as unknown as number;
	}
}

/**
 * Process the priority queue, handling high priority messages first
 */
function processPriorityQueue(): void {
	batchTimer = null;

	if (priorityQueue.length === 0) return;

	// Group messages by priority
	const highPriorityMsgs = priorityQueue.filter((item) => item.priority === MESSAGE_PRIORITY.HIGH);
	const normalPriorityMsgs = priorityQueue.filter(
		(item) => item.priority === MESSAGE_PRIORITY.NORMAL
	);
	const lowPriorityMsgs = priorityQueue.filter((item) => item.priority === MESSAGE_PRIORITY.LOW);

	// Process high priority messages immediately and individually
	highPriorityMsgs.forEach((item) => {
		const msg = item.msg;
		self.postMessage({ type: msg.type, data: msg.data }, msg.transfer);
	});

	// Batch normal priority messages if multiple exist
	if (normalPriorityMsgs.length > 0) {
		const msgs = normalPriorityMsgs.map((item) => item.msg);
		processBatchedMessages(msgs);
	}

	// Only process low priority if we have capacity
	if (lowPriorityMsgs.length > 0 && highPriorityMsgs.length === 0) {
		const msgs = lowPriorityMsgs.map((item) => item.msg);
		processBatchedMessages(msgs);
	}

	// Clear the queue
	priorityQueue = [];
}

/**
 * Process a batch of messages, combining them if possible
 */
function processBatchedMessages(messages: any[]): void {
	if (messages.length === 0) return;

	// If only one message, send it directly
	if (messages.length === 1) {
		const msg = messages[0];
		self.postMessage({ type: msg.type, data: msg.data }, msg.transfer);
	} else {
		// Batch multiple messages
		const batchedData = messages.map((msg) => ({ type: msg.type, data: msg.data }));

		// Collect all transferables
		const allTransferables: Transferable[] = [];
		messages.forEach((msg) => {
			if (msg.transfer) {
				allTransferables.push(...msg.transfer);
			}
		});

		self.postMessage(
			{
				type: 'batchedMessages',
				data: batchedData
			},
			allTransferables
		);
	}
}

/**
 * Queue a message for batched sending
 */
function queueMessage(type: string, data: any, transfer?: Transferable[]): void {
	if (!batchingEnabled) {
		// If batching is disabled, send immediately
		self.postMessage({ type, data }, transfer);
		return;
	}

	// Add to pending queue
	pendingMessages.push({ type, data, transfer });

	// Schedule batch processing if not already scheduled
	if (batchTimer === null) {
		batchTimer = setTimeout(processBatch, BATCH_INTERVAL) as unknown as number;
	}
}

/**
 * Process the batch of pending messages
 */
function processBatch(): void {
	batchTimer = null;

	if (pendingMessages.length === 0) return;

	// If only one message, send it directly
	if (pendingMessages.length === 1) {
		const msg = pendingMessages[0];
		self.postMessage({ type: msg.type, data: msg.data }, msg.transfer);
	} else {
		// Batch multiple messages into a single message
		const batchedData = pendingMessages.map((msg) => ({ type: msg.type, data: msg.data }));

		// Collect all transferables
		const allTransferables: Transferable[] = [];
		pendingMessages.forEach((msg) => {
			if (msg.transfer) {
				allTransferables.push(...msg.transfer);
			}
		});

		self.postMessage(
			{
				type: 'batchedMessages',
				data: batchedData
			},
			allTransferables
		);
	}

	// Clear the queue
	pendingMessages = [];
}

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
	batchedStats.created += count;

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

	// Initialize change tracking
	initializeChangeTracking(count);

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

		// Queue with LOW priority since stats are non-critical
		queueMessageWithPriority(MESSAGE_PRIORITY.LOW, 'statsUpdate', statsToReport);

		// Reset accumulated stats
		batchedStats.created = 0;
		batchedStats.reused = 0;
		batchedStats.lastReportTime = now;
	}
}

/**
 * Enhanced update function with better change detection
 */
function updateStars(deltaTime: number): void {
	const { containerWidth, containerHeight, maxDepth, speed } = config;

	// Reset previous change tracking for this frame
	resetChangeTracking();

	// Calculate time-based movement scale
	const timeScale = deltaTime / 16.7; // Normalized to 60fps

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

		// Check if this star needs to be reset
		if (starData[baseIndex + 2] <= 0) {
			resetStar(i, containerWidth, containerHeight, maxDepth);
			markStarChanged(i);
		}
		// Check if this star moved significantly
		else if (Math.abs(starData[baseIndex + 2] - prevZ) > 0.1) {
			markStarChanged(i);
		}
	}

	// Report stats if we had changes
	if (changedStarIndices.length > 0) {
		// Force report if we had any resets to ensure they're captured
		reportStats(changedStarIndices.length > 0);
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
 * Process incoming messages with enhanced message handling
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
			queueMessageWithPriority(
				MESSAGE_PRIORITY.HIGH,
				'initialized',
				{
					starData,
					config
				},
				[starData.buffer]
			);

			// Create a new buffer since we transferred the old one
			starData = new Float32Array(config.starCount * STAR_DATA_ELEMENTS);
			break;
		}

		case 'requestStats': {
			// Force immediate stats report
			reportStats(true);
			break;
		}

		case 'updatePoolStats': {
			// Acknowledge receipt of pool stats
			queueMessageWithPriority(MESSAGE_PRIORITY.LOW, 'poolStatsUpdated', {
				success: true
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

			// Decide whether to send partial or full update
			if (
				WORKER_FLAGS.ENABLE_PARTIAL_UPDATES &&
				changedStarIndices.length < config.starCount * 0.3
			) {
				// If fewer than 30% of stars changed, send partial update
				const partialData = extractPartialStarData(changedStarIndices);

				queueMessageWithPriority(
					MESSAGE_PRIORITY.NORMAL,
					'partialFrameUpdate',
					{
						changedIndices: changedStarIndices,
						changedStarData: partialData,
						config
					},
					[partialData.buffer]
				);
			} else {
				// Otherwise send full update with transferable object
				queueMessageWithPriority(
					MESSAGE_PRIORITY.NORMAL,
					'frameUpdate',
					{
						starData,
						config
					},
					WORKER_FLAGS.USE_TRANSFERABLE_OBJECTS ? [starData.buffer] : undefined
				);

				// Create a new buffer since we transferred the old one
				if (WORKER_FLAGS.USE_TRANSFERABLE_OBJECTS) {
					starData = new Float32Array(config.starCount * STAR_DATA_ELEMENTS);
				}
			}
			break;
		}

		case 'requestPartialFrame': {
			// Handle partial updates for changed stars only
			if (data.changedIndices && data.changedStarData) {
				// Update only the changed star data
				updatePartialStarData(data.changedIndices, data.changedStarData);
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

			// Send back only changed stars this time
			if (changedStarIndices.length > 0) {
				const partialData = extractPartialStarData(changedStarIndices);
				queueMessageWithPriority(
					MESSAGE_PRIORITY.NORMAL,
					'partialFrameUpdate',
					{
						changedIndices: changedStarIndices,
						changedStarData: partialData,
						config
					},
					[partialData.buffer]
				);
			} else {
				// If no changes, just send a no-change signal
				queueMessageWithPriority(MESSAGE_PRIORITY.LOW, 'noChanges', { config });
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

		case 'toggleOptimizations': {
			// Allow enabling/disabling optimizations at runtime
			if (data.batching !== undefined) WORKER_FLAGS.ENABLE_BATCHING = data.batching;
			if (data.partialUpdates !== undefined)
				WORKER_FLAGS.ENABLE_PARTIAL_UPDATES = data.partialUpdates;
			if (data.deltaCompression !== undefined)
				WORKER_FLAGS.ENABLE_DELTA_COMPRESSION = data.deltaCompression;
			if (data.transferableObjects !== undefined)
				WORKER_FLAGS.USE_TRANSFERABLE_OBJECTS = data.transferableObjects;

			// Apply batching setting
			batchingEnabled = WORKER_FLAGS.ENABLE_BATCHING;

			queueMessageWithPriority(MESSAGE_PRIORITY.LOW, 'optimizationsUpdated', {
				success: true,
				currentFlags: { ...WORKER_FLAGS }
			});
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
				queueMessageWithPriority(
					MESSAGE_PRIORITY.HIGH,
					'starCountChanged',
					{
						starData,
						config
					},
					[starData.buffer]
				);

				// Create a new buffer since we transferred the old one
				starData = new Float32Array(config.starCount * STAR_DATA_ELEMENTS);
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
			queueMessageWithPriority(
				MESSAGE_PRIORITY.HIGH,
				'reset',
				{
					starData,
					config
				},
				[starData.buffer]
			);

			// Create a new buffer since we transferred the old one
			starData = new Float32Array(config.starCount * STAR_DATA_ELEMENTS);
			break;
		}

		case 'adaptToDevice': {
			// Handle device-specific adaptations
			queueMessageWithPriority(MESSAGE_PRIORITY.LOW, 'deviceAdapted', {
				success: true,
				performanceTier: data.performanceTier || 2
			});
			break;
		}

		case 'cleanup': {
			// Enhanced cleanup that cancels pending operations
			if (batchTimer !== null) {
				clearTimeout(batchTimer);
				batchTimer = null;
			}

			// Process any pending messages before cleanup
			processBatch();
			processPriorityQueue();

			// Nullify large TypedArrays
			if (starData) {
				// Create a tiny replacement to release memory
				starData = new Float32Array(1);
			}

			// Clear change tracking arrays
			changedStarIndices = [];
			if (changedStarFlags) {
				changedStarFlags = new Uint8Array(1);
			}

			// Clear any timers or intervals
			if (statsInterval) {
				clearInterval(statsInterval);
				statsInterval = null;
			}

			// Reset all counters and accumulators
			statsObjectsCreated = 0;
			statsObjectsReused = 0;
			lastStatsReport = 0;

			// Clear pending message queues
			pendingMessages = [];
			priorityQueue = [];

			// Send acknowledgement before termination
			self.postMessage({
				type: 'cleanupComplete',
				data: { success: true }
			});

			break;
		}
	}
};

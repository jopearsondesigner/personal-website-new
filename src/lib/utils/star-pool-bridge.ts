// src/lib/utils/star-pool-bridge.ts
import { browser } from '$app/environment';
import { starPoolTracker } from './pool-stats-tracker';
import { get } from 'svelte/store';
import { objectPoolStatsStore, updateObjectPoolStats } from './device-performance';
import { PoolStatsDebugger } from './debug-pool-stats';

// Define interface for worker statistics
interface WorkerStats {
	created: number;
	reused: number;
	active?: number;
	total?: number;
}

/**
 * Bridge to connect StarPool statistics with the CanvasStarField worker
 * Ensures proper propagation of object creation and reuse metrics
 */
class StarPoolBridge {
	private lastReportTime = 0;
	private lastSyncTime = 0;
	private reportInterval = 1000; // Increased to 1000ms to reduce update frequency
	private worker: Worker | null = null;
	private workerStatsBuffer: WorkerStats = {
		created: 0,
		reused: 0,
		active: 0,
		total: 0
	};
	private initialized = false;
	private debugMode = false;
	private statsSyncScheduled = false;
	private activeListeners = new Set<string>();

	// Optimization: Add batch update threshold
	private updateThreshold = 5; // Minimum updates before sending
	private pendingCreated = 0;
	private pendingReused = 0;

	constructor() {
		if (browser) {
			this.setupIntervalCheck();
			// Initialize the tracker with some baseline values
			this.initializeStatsStore();

			// Check for debug mode
			try {
				this.debugMode = localStorage.getItem('starPoolDebugMode') === 'true';
			} catch (e) {
				// Ignore localStorage errors
				this.debugMode = false;
			}

			// Add cleanup handler on page unload
			this.setupUnloadHandler();
		}
	}

	/**
	 /**
	 * Setup cleanup handler on page unload
	 * Benefit: Ensures resources are properly released when navigating away
	 */
	private setupUnloadHandler(): void {
		if (!browser) return;

		window.addEventListener('beforeunload', () => {
			// Flush any pending stats
			this.flushStatsBuffer(true);

			// Disconnect from worker
			this.cleanup();
		});
	}

	/**
	 * Enable or disable debug mode
	 */
	setDebugMode(enabled: boolean): void {
		this.debugMode = enabled;
		if (browser) {
			try {
				localStorage.setItem('starPoolDebugMode', String(enabled));
			} catch (e) {
				// Ignore localStorage errors
			}
		}
	}

	/**
	 * Initialize the stats store with baseline values
	 */
	private initializeStatsStore(): void {
		if (!browser || this.initialized) return;

		// Set initial values to ensure the store is populated
		updateObjectPoolStats({
			poolName: 'Stars',
			poolType: 'Star',
			totalCapacity: 0,
			activeObjects: 0,
			utilizationRate: 0,
			objectsCreated: 0,
			objectsReused: 0,
			reuseRatio: 0,
			estimatedMemorySaved: 0
		});

		this.initialized = true;
	}

	/**
	 * Connect to a worker to send and receive statistics updates
	 */
	connectWorker(worker: Worker): void {
		// Cleanup existing worker connection if any
		if (this.worker) {
			this.cleanup();
		}

		this.worker = worker;

		// Initial stats sync
		this.forceSyncStats();

		// Set up message handler for worker stats
		const messageHandlerKey = 'statsUpdate';
		if (!this.activeListeners.has(messageHandlerKey)) {
			worker.addEventListener('message', this.handleWorkerMessage);
			this.activeListeners.add(messageHandlerKey);
		}

		if (this.debugMode) {
			console.log('StarPoolBridge: Connected to worker');
		}
	}

	/**
	 * Handle messages from worker
	 */
	private handleWorkerMessage = (event: MessageEvent): void => {
		if (!event.data || !event.data.type) return;

		// Check for statistics updates
		if (event.data.type === 'statsUpdate' && event.data.data) {
			this.handleStatsUpdate(event.data.data);
		}
	};

	/**
	 * Handle statistics updates from the worker
	 */
	private handleStatsUpdate(data: WorkerStats): void {
		if (!data) return;

		// Debug logging
		if (this.debugMode) {
			console.debug(
				`StarPoolBridge: Received stats - Created: ${data.created}, Reused: ${data.reused}`
			);
		}

		// Validate data to prevent NaN or undefined values
		const created = typeof data.created === 'number' && !isNaN(data.created) ? data.created : 0;
		const reused = typeof data.reused === 'number' && !isNaN(data.reused) ? data.reused : 0;
		const active = typeof data.active === 'number' && !isNaN(data.active) ? data.active : undefined;
		const total = typeof data.total === 'number' && !isNaN(data.total) ? data.total : undefined;

		// Accumulate stats from worker
		this.workerStatsBuffer.created += created;
		this.workerStatsBuffer.reused += reused;

		// Update active/total counts if provided
		if (active !== undefined) {
			this.workerStatsBuffer.active = active;
		}

		if (total !== undefined) {
			this.workerStatsBuffer.total = total;
		}

		// Only flush if we have pending stats and exceed threshold
		if (this.workerStatsBuffer.created + this.workerStatsBuffer.reused >= this.updateThreshold) {
			this.flushStatsBuffer();
		}
	}

	/**
	 * Flush the stats buffer to the tracker
	 */
	private flushStatsBuffer(force: boolean = false): void {
		// Skip if no stats to report and not forced
		if (!force && this.workerStatsBuffer.created === 0 && this.workerStatsBuffer.reused === 0)
			return;

		if (this.debugMode) {
			console.debug(
				`StarPoolBridge: Flushing stats - Created: ${this.workerStatsBuffer.created}, Reused: ${this.workerStatsBuffer.reused}`
			);
		}

		// Report the buffered stats to the tracker
		if (this.workerStatsBuffer.created > 0) {
			starPoolTracker.recordObjectCreated(this.workerStatsBuffer.created);
			// Store locally for batched updates
			this.pendingCreated += this.workerStatsBuffer.created;
			this.workerStatsBuffer.created = 0;
		}

		if (this.workerStatsBuffer.reused > 0) {
			starPoolTracker.recordObjectReused(this.workerStatsBuffer.reused);
			// Store locally for batched updates
			this.pendingReused += this.workerStatsBuffer.reused;
			this.workerStatsBuffer.reused = 0;
		}

		// Update pool state if active/total counts are available
		if (
			typeof this.workerStatsBuffer.active === 'number' &&
			typeof this.workerStatsBuffer.total === 'number'
		) {
			starPoolTracker.updatePoolState(this.workerStatsBuffer.active, this.workerStatsBuffer.total);
		}

		// Only force UI update on threshold or force
		if (force || this.pendingCreated + this.pendingReused >= this.updateThreshold) {
			// Force immediate UI update
			starPoolTracker.reportNow();
			this.pendingCreated = 0;
			this.pendingReused = 0;
		}

		this.lastReportTime = performance.now();

		// Log stats after update if in debug mode
		if (this.debugMode) {
			// Delay logging to allow for store updates
			setTimeout(() => {
				PoolStatsDebugger.logStats();
			}, 50);
		}
	}

	/**
	 * Setup interval to periodically check and sync statistics
	 */
	private setupIntervalCheck(): void {
		if (!browser) return;

		// Check less frequently to reduce performance impact
		const intervalId = setInterval(() => {
			// Only flush if we have something to report
			if (
				this.workerStatsBuffer.created > 0 ||
				this.workerStatsBuffer.reused > 0 ||
				this.pendingCreated > 0 ||
				this.pendingReused > 0
			) {
				this.flushStatsBuffer(true);
			}

			// Only do full stats sync less frequently
			const now = performance.now();
			if (now - this.lastReportTime >= this.reportInterval) {
				this.syncStats();
				this.lastReportTime = now;
			}
		}, 1000); // Increased to 1 second

		// Store the interval ID for cleanup
		(this as any).intervalId = intervalId;
	}

	/**
	 * Fix: Ensure stats consistency between worker and main thread
	 */
	syncStats(force = false): void {
		const now = performance.now();

		// Throttle updates unless forced
		if (!force && now - this.lastSyncTime < 500) return;

		// Prevent multiple concurrent syncs
		if (this.statsSyncScheduled && !force) return;

		this.lastSyncTime = now;
		this.statsSyncScheduled = true;

		if (!this.worker) {
			this.statsSyncScheduled = false;
			return;
		}

		// Schedule the actual sync for next frame to reduce jank
		if (browser && typeof requestAnimationFrame !== 'undefined') {
			requestAnimationFrame(() => {
				this.performStatsSync();
				this.statsSyncScheduled = false;
			});
		} else {
			// Fallback if requestAnimationFrame is not available
			setTimeout(() => {
				this.performStatsSync();
				this.statsSyncScheduled = false;
			}, 0);
		}
	}

	/**
	 * Perform the actual stats synchronization
	 */
	private performStatsSync(): void {
		if (!this.worker) return;

		// Get current stats with proper defensive access
		let stats = null;
		try {
			stats = get(objectPoolStatsStore);
		} catch (e) {
			// Handle potential error during store access
			console.warn('Error accessing objectPoolStatsStore:', e);
		}

		if (!stats) {
			stats = {
				activeObjects: 0,
				totalCapacity: 0,
				objectsCreated: 0,
				objectsReused: 0
			};
		}

		// Ensure we're not sending NaN or undefined
		const safeStats = {
			activeObjects: Math.max(0, stats.activeObjects || 0),
			totalCapacity: Math.max(1, stats.totalCapacity || 1),
			objectsCreated: Math.max(0, stats.objectsCreated || 0),
			objectsReused: Math.max(0, stats.objectsReused || 0)
		};

		// Verify utilization is valid (0-1)
		const utilization = safeStats.activeObjects / safeStats.totalCapacity;
		if (isNaN(utilization) || utilization < 0 || utilization > 1) {
			// Fix invalid utilization
			safeStats.activeObjects = Math.min(safeStats.activeObjects, safeStats.totalCapacity);
		}

		// Send corrected stats to worker
		try {
			this.worker.postMessage({
				type: 'updatePoolStats',
				data: safeStats
			});

			// Request fresh stats from worker
			this.worker.postMessage({
				type: 'requestStats'
			});
		} catch (e) {
			// Handle potential error during postMessage
			console.warn('Error communicating with worker:', e);

			// Worker might be terminated or disconnected
			this.worker = null;
		}
	}

	/**
	 * Record object creation directly from main thread
	 */
	recordCreated(count: number = 1): void {
		if (count <= 0) return;

		if (this.debugMode) {
			console.debug(`StarPoolBridge: Recording ${count} object(s) created`);
		}

		// Store for batched updates
		this.pendingCreated += count;

		starPoolTracker.recordObjectCreated(count);

		// Only flush on threshold
		if (this.pendingCreated + this.pendingReused >= this.updateThreshold) {
			this.flushStatsBuffer();
		}
	}

	/**
	 * Record object reuse directly from main thread
	 */
	recordReused(count: number = 1): void {
		if (count <= 0) return;

		if (this.debugMode) {
			console.debug(`StarPoolBridge: Recording ${count} object(s) reused`);
		}

		// Store for batched updates
		this.pendingReused += count;

		starPoolTracker.recordObjectReused(count);

		// Only flush on threshold
		if (this.pendingCreated + this.pendingReused >= this.updateThreshold) {
			this.flushStatsBuffer();
		}
	}

	/**
	 * Force synchronization of statistics immediately
	 */
	forceSyncStats(): void {
		if (!browser) return;

		// Initialize if needed
		this.initializeStatsStore();

		// Flush any pending stats
		this.flushStatsBuffer(true);

		// Sync with worker
		this.syncStats(true); // Force the sync

		// Force UI update
		starPoolTracker.reportNow();

		if (this.debugMode) {
			console.debug('StarPoolBridge: Forced stats sync complete');
		}
	}

	/**
	 * Update active object count
	 */
	updateActiveCount(active: number, total: number): void {
		if (!browser) return;

		// Ensure values are valid
		active = Math.max(0, active);
		total = Math.max(active, total);

		if (this.debugMode) {
			console.debug(`StarPoolBridge: Updating active count - ${active}/${total}`);
		}

		// Update local buffer
		this.workerStatsBuffer.active = active;
		this.workerStatsBuffer.total = total;

		starPoolTracker.updatePoolState(active, total);
	}

	/**
	 * Cleanup resources when no longer needed
	 */
	cleanup(): void {
		// Flush any pending stats
		this.flushStatsBuffer(true);

		// Remove event listener if worker exists
		if (this.worker) {
			this.worker.removeEventListener('message', this.handleWorkerMessage);
			this.activeListeners.clear();
			this.worker = null;
		}

		// Clear interval if it exists
		if ((this as any).intervalId) {
			clearInterval((this as any).intervalId);
			(this as any).intervalId = null;
		}

		// Clear stats buffers
		this.workerStatsBuffer = {
			created: 0,
			reused: 0,
			active: 0,
			total: 0
		};

		this.pendingCreated = 0;
		this.pendingReused = 0;
		this.statsSyncScheduled = false;
	}
}

// Export singleton instance
export const starPoolBridge = new StarPoolBridge();

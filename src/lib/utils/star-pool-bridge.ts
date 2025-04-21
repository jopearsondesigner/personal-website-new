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
}

/**
 * Bridge to connect StarPool statistics with the CanvasStarField worker
 * Ensures proper propagation of object creation and reuse metrics
 */
class StarPoolBridge {
	private lastReportTime = 0;
	private lastSyncTime = 0; // Added for the new syncStats method
	private reportInterval = 500; // Reduced to 500ms for more frequent updates
	private worker: Worker | null = null;
	private workerStatsBuffer: WorkerStats = {
		created: 0,
		reused: 0
	};
	private initialized = false;
	private debugMode = false;

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
		}
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
		this.worker = worker;

		// Initial stats sync
		this.forceSyncStats();

		// Set up message handler for worker stats
		worker.addEventListener('message', this.handleWorkerMessage);

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

		// Accumulate stats from worker with proper type checking
		if (data.created && typeof data.created === 'number') {
			this.workerStatsBuffer.created += data.created;
		}

		if (data.reused && typeof data.reused === 'number') {
			this.workerStatsBuffer.reused += data.reused;
		}

		// Report immediately if we have statistics to report
		if (this.workerStatsBuffer.created > 0 || this.workerStatsBuffer.reused > 0) {
			this.flushStatsBuffer();
		}
	}

	/**
	 * Flush the stats buffer to the tracker
	 */
	private flushStatsBuffer(): void {
		if (this.workerStatsBuffer.created === 0 && this.workerStatsBuffer.reused === 0) return;

		if (this.debugMode) {
			console.debug(
				`StarPoolBridge: Flushing stats - Created: ${this.workerStatsBuffer.created}, Reused: ${this.workerStatsBuffer.reused}`
			);
		}

		// Report the buffered stats to the tracker
		if (this.workerStatsBuffer.created > 0) {
			starPoolTracker.recordObjectCreated(this.workerStatsBuffer.created);
		}

		if (this.workerStatsBuffer.reused > 0) {
			starPoolTracker.recordObjectReused(this.workerStatsBuffer.reused);
		}

		// Force immediate UI update
		starPoolTracker.reportNow();

		// Reset the buffer
		this.workerStatsBuffer.created = 0;
		this.workerStatsBuffer.reused = 0;

		this.lastReportTime = performance.now();

		// Log stats after update if in debug mode
		if (this.debugMode) {
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

		// Check more frequently for better responsiveness
		setInterval(() => {
			this.flushStatsBuffer();

			// Only do full stats sync less frequently to reduce overhead
			const now = performance.now();
			if (now - this.lastReportTime >= this.reportInterval) {
				this.syncStats();
				this.lastReportTime = now;
			}
		}, 250);
	}

	/**
	 * Fix: Ensure stats consistency between worker and main thread
	 */
	syncStats(force = false): void {
		const now = performance.now();

		// Throttle updates unless forced
		if (!force && now - this.lastSyncTime < 100) return;
		this.lastSyncTime = now;

		if (!this.worker) return;

		// Get current stats with proper defensive access
		const stats = get(objectPoolStatsStore) || {
			activeObjects: 0,
			totalCapacity: 0,
			objectsCreated: 0,
			objectsReused: 0
		};

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
		this.worker.postMessage({
			type: 'updatePoolStats',
			data: safeStats
		});

		// Request fresh stats from worker
		this.worker.postMessage({
			type: 'requestStats'
		});
	}

	/**
	 * Record object creation directly from main thread
	 */
	recordCreated(count: number = 1): void {
		if (count <= 0) return;

		if (this.debugMode) {
			console.debug(`StarPoolBridge: Recording ${count} object(s) created`);
		}

		starPoolTracker.recordObjectCreated(count);
		this.flushStatsBuffer();
	}

	/**
	 * Record object reuse directly from main thread
	 */
	recordReused(count: number = 1): void {
		if (count <= 0) return;

		if (this.debugMode) {
			console.debug(`StarPoolBridge: Recording ${count} object(s) reused`);
		}

		starPoolTracker.recordObjectReused(count);
		this.flushStatsBuffer();
	}

	/**
	 * Force synchronization of statistics immediately
	 */
	forceSyncStats(): void {
		if (!browser) return;

		// Initialize if needed
		this.initializeStatsStore();

		// Flush any pending stats
		this.flushStatsBuffer();

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

		if (this.debugMode) {
			console.debug(`StarPoolBridge: Updating active count - ${active}/${total}`);
		}

		starPoolTracker.updatePoolState(active, total);
	}

	/**
	 * Cleanup resources when no longer needed
	 */
	cleanup(): void {
		if (this.worker) {
			this.worker.removeEventListener('message', this.handleWorkerMessage);
			this.worker = null;
		}
	}
}

// Export singleton instance
export const starPoolBridge = new StarPoolBridge();

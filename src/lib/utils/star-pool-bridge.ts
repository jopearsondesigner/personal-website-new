// src/lib/utils/star-pool-bridge.ts
import { browser } from '$app/environment';
import { starPoolTracker } from './pool-stats-tracker';
import { updateObjectPoolStats } from './device-performance';
import { PoolStatsDebugger } from './debug-pool-stats';

/**
 * Simplified worker statistics interface - matches EfficientObjectPool format
 */
interface WorkerPoolStats {
	// Core pool metrics
	totalCreated: number;
	totalReused: number;
	active: number;
	capacity: number;

	// Calculated metrics
	utilizationRate: number;
	reuseRatio: number;

	// Performance metrics
	operationsPerSecond?: number;
	memoryEstimate?: number;
}

/**
 * Simplified Star Pool Bridge for EfficientObjectPool integration
 *
 * Key simplifications:
 * - Direct pool statistics integration (no complex buffering)
 * - Event-based communication (no manual sync loops)
 * - Unified statistics format (matches EfficientObjectPool)
 * - Reduced overhead (leverages pool's internal batching)
 */
class StarPoolBridge {
	private worker: Worker | null = null;
	private initialized = false;
	private debugMode = false;

	// Current statistics - simplified single source of truth
	private currentStats: WorkerPoolStats = {
		totalCreated: 0,
		totalReused: 0,
		active: 0,
		capacity: 0,
		utilizationRate: 0,
		reuseRatio: 0
	};

	// Performance optimization
	private lastStatsUpdate = 0;
	private statsUpdateThreshold = 500; // 500ms minimum between updates

	constructor() {
		if (browser) {
			this.initializeStatsStore();
			this.setupDebugMode();
			this.setupUnloadHandler();
		}
	}

	/**
	 * Setup debug mode from localStorage
	 */
	private setupDebugMode(): void {
		try {
			this.debugMode = localStorage.getItem('starPoolDebugMode') === 'true';
		} catch (e) {
			this.debugMode = false;
		}
	}

	/**
	 * Setup cleanup handler on page unload
	 */
	private setupUnloadHandler(): void {
		if (!browser) return;

		window.addEventListener('beforeunload', () => {
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
	 * Connect to worker - simplified for EfficientObjectPool
	 */
	connectWorker(worker: Worker): void {
		// Cleanup existing connection
		if (this.worker) {
			this.cleanup();
		}

		this.worker = worker;

		// Set up direct message handler for pool statistics
		worker.addEventListener('message', this.handleWorkerMessage);

		// Force initial stats sync
		this.requestWorkerStats();

		if (this.debugMode) {
			console.log('StarPoolBridge: Connected to worker with EfficientObjectPool');
		}
	}

	/**
	 * Handle messages from worker - simplified for new pool format
	 */
	private handleWorkerMessage = (event: MessageEvent): void => {
		if (!event.data || !event.data.type) return;

		switch (event.data.type) {
			case 'frameUpdate':
				// Handle pool stats from frame updates
				if (event.data.data && event.data.data.poolStats) {
					this.updateStatsFromWorker(event.data.data.poolStats);
				}
				break;

			case 'statsUpdate':
				// Handle direct stats updates
				if (event.data.data) {
					this.updateStatsFromWorker(event.data.data);
				}
				break;

			case 'initialized':
			case 'reset':
			case 'configUpdated':
				// Handle pool stats from worker lifecycle events
				if (event.data.data && event.data.data.poolStats) {
					this.updateStatsFromWorker(event.data.data.poolStats);
				}
				break;
		}
	};

	/**
	 * Update statistics from worker - unified format handling
	 */
	private updateStatsFromWorker(data: any): void {
		if (!data) return;

		const now = performance.now();

		// Throttle updates to prevent excessive store updates
		if (now - this.lastStatsUpdate < this.statsUpdateThreshold) {
			return;
		}

		this.lastStatsUpdate = now;

		// Handle both old format (for compatibility) and new PoolStatistics format
		const stats: WorkerPoolStats = {
			totalCreated: data.totalCreated || data.created || 0,
			totalReused: data.totalReused || data.reused || 0,
			active: data.active || 0,
			capacity: data.capacity || data.total || 0,
			utilizationRate: data.utilizationRate || 0,
			reuseRatio: data.reuseRatio || 0,
			operationsPerSecond: data.operationsPerSecond,
			memoryEstimate: data.memoryEstimate
		};

		// Validate and sanitize data
		stats.totalCreated = Math.max(0, stats.totalCreated);
		stats.totalReused = Math.max(0, stats.totalReused);
		stats.active = Math.max(0, stats.active);
		stats.capacity = Math.max(1, stats.capacity);

		// Calculate derived metrics if not provided
		if (!stats.utilizationRate) {
			stats.utilizationRate = stats.active / stats.capacity;
		}

		if (!stats.reuseRatio && stats.totalCreated + stats.totalReused > 0) {
			stats.reuseRatio = stats.totalReused / (stats.totalCreated + stats.totalReused);
		}

		// Update current stats
		this.currentStats = stats;

		if (this.debugMode) {
			console.debug('StarPoolBridge: Updated stats', {
				created: stats.totalCreated,
				reused: stats.totalReused,
				active: stats.active,
				capacity: stats.capacity,
				reuse: `${(stats.reuseRatio * 100).toFixed(1)}%`,
				utilization: `${(stats.utilizationRate * 100).toFixed(1)}%`
			});
		}

		// Update tracking systems
		this.updateTrackingSystems(stats);
	}

	/**
	 * Update all tracking systems with unified statistics
	 */
	private updateTrackingSystems(stats: WorkerPoolStats): void {
		// Update pool stats tracker
		starPoolTracker.updatePoolState(stats.active, stats.capacity);

		// Update device performance store
		updateObjectPoolStats({
			poolName: 'Stars',
			poolType: 'Star',
			totalCapacity: stats.capacity,
			activeObjects: stats.active,
			utilizationRate: stats.utilizationRate,
			objectsCreated: stats.totalCreated,
			objectsReused: stats.totalReused,
			reuseRatio: stats.reuseRatio,
			estimatedMemorySaved: stats.totalReused * 0.24 // ~240 bytes per star
		});

		// Force immediate UI update
		starPoolTracker.reportNow();

		// Debug logging if enabled
		if (this.debugMode) {
			setTimeout(() => {
				PoolStatsDebugger.logStats();
			}, 50);
		}
	}

	/**
	 * Request statistics from worker
	 */
	private requestWorkerStats(): void {
		if (!this.worker) return;

		try {
			this.worker.postMessage({
				type: 'getStats'
			});
		} catch (error) {
			console.warn('Error requesting worker stats:', error);
		}
	}

	/**
	 * Record object creation directly from main thread (simplified)
	 */
	recordCreated(count: number = 1): void {
		if (count <= 0) return;

		// Update current stats
		this.currentStats.totalCreated += count;
		this.updateDerivedMetrics();

		// Update tracking systems
		starPoolTracker.recordObjectCreated(count);

		if (this.debugMode) {
			console.debug(`StarPoolBridge: Recording ${count} object(s) created`);
		}
	}

	/**
	 * Record object reuse directly from main thread (simplified)
	 */
	recordReused(count: number = 1): void {
		if (count <= 0) return;

		// Update current stats
		this.currentStats.totalReused += count;
		this.updateDerivedMetrics();

		// Update tracking systems
		starPoolTracker.recordObjectReused(count);

		if (this.debugMode) {
			console.debug(`StarPoolBridge: Recording ${count} object(s) reused`);
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

		// Update current stats
		this.currentStats.active = active;
		this.currentStats.capacity = total;
		this.updateDerivedMetrics();

		// Update tracking systems
		starPoolTracker.updatePoolState(active, total);

		if (this.debugMode) {
			console.debug(`StarPoolBridge: Updating active count - ${active}/${total}`);
		}
	}

	/**
	 * Update derived metrics
	 */
	private updateDerivedMetrics(): void {
		const { totalCreated, totalReused, active, capacity } = this.currentStats;

		// Update utilization rate
		this.currentStats.utilizationRate = capacity > 0 ? active / capacity : 0;

		// Update reuse ratio
		const totalOperations = totalCreated + totalReused;
		this.currentStats.reuseRatio = totalOperations > 0 ? totalReused / totalOperations : 0;
	}

	/**
	 * Force synchronization of statistics
	 */
	forceSyncStats(): void {
		if (!browser) return;

		// Initialize if needed
		this.initializeStatsStore();

		// Request fresh stats from worker
		this.requestWorkerStats();

		// Update tracking systems with current stats
		this.updateTrackingSystems(this.currentStats);

		if (this.debugMode) {
			console.debug('StarPoolBridge: Forced stats sync complete');
		}
	}

	/**
	 * Get current statistics
	 */
	getCurrentStats(): WorkerPoolStats {
		return { ...this.currentStats };
	}

	/**
	 * Get performance summary
	 */
	getPerformanceSummary(): {
		reuseRatioPercent: number;
		utilizationPercent: number;
		totalOperations: number;
		isOptimal: boolean;
	} {
		const { totalCreated, totalReused, utilizationRate, reuseRatio } = this.currentStats;
		const totalOperations = totalCreated + totalReused;

		return {
			reuseRatioPercent: reuseRatio * 100,
			utilizationPercent: utilizationRate * 100,
			totalOperations,
			isOptimal: reuseRatio > 0.8 && utilizationRate < 0.9 // >80% reuse, <90% utilization
		};
	}

	/**
	 * Cleanup resources
	 */
	cleanup(): void {
		// Remove event listener if worker exists
		if (this.worker) {
			this.worker.removeEventListener('message', this.handleWorkerMessage);
			this.worker = null;
		}

		// Reset current stats
		this.currentStats = {
			totalCreated: 0,
			totalReused: 0,
			active: 0,
			capacity: 0,
			utilizationRate: 0,
			reuseRatio: 0
		};

		if (this.debugMode) {
			console.log('StarPoolBridge: Cleaned up');
		}
	}
}

// Export singleton instance
export const starPoolBridge = new StarPoolBridge();

// src/lib/utils/pool-stats-tracker.ts
import { browser } from '$app/environment';
import { get } from 'svelte/store';
import { objectPoolStatsStore, updateObjectPoolStats } from './device-performance';
import type { ObjectPoolStats } from './device-performance';

/**
 * Statistics tracker for object pools
 * Collects and reports metrics on object pool usage
 */
export class PoolStatsTracker {
	private poolName: string;
	private poolType: string;
	private objectSize: number; // approximate size in bytes
	private startTime: number;
	private objectsCreated: number = 0;
	private objectsReused: number = 0;
	private lastReportTime: number = 0;
	private reportInterval: number = 500; // Report more frequently (500ms)
	private activeObjects: number = 0;
	private totalCapacity: number = 0;
	private initialized: boolean = false;

	constructor(poolName: string, poolType: string, objectSize: number = 200) {
		this.poolName = poolName;
		this.poolType = poolType;
		this.objectSize = objectSize;
		this.startTime = browser ? performance.now() : 0;
		this.lastReportTime = this.startTime;

		// Initialize stats store with pool identity and zeros
		this.initializeStats();
	}

	/**
	 * Initialize the stats with baseline values
	 */
	private initializeStats(): void {
		if (this.initialized) return;

		this.updateStats({
			poolName: this.poolName,
			poolType: this.poolType,
			objectsCreated: 0,
			objectsReused: 0,
			reuseRatio: 0,
			estimatedMemorySaved: 0,
			activeObjects: 0,
			totalCapacity: 0,
			utilizationRate: 0
		});

		this.initialized = true;
	}

	/**
	 * Record a new object creation event
	 * @param count Number of objects created (default: 1)
	 */
	recordObjectCreated(count: number = 1): void {
		if (count <= 0) return;

		this.objectsCreated += count;

		// Log for debugging
		if (browser) {
			console.debug(
				`PoolStatsTracker: Recorded ${count} object(s) created, total: ${this.objectsCreated}`
			);
		}

		this.checkReportStats();
	}

	/**
	 * Record an object reuse event
	 * @param count Number of objects reused (default: 1)
	 */
	recordObjectReused(count: number = 1): void {
		if (count <= 0) return;

		this.objectsReused += count;

		// Log for debugging
		if (browser) {
			console.debug(
				`PoolStatsTracker: Recorded ${count} object(s) reused, total: ${this.objectsReused}`
			);
		}

		this.checkReportStats();
	}

	/**
	 * Record batch statistics from worker
	 */
	recordBatch(created: number, reused: number): void {
		let hasUpdates = false;

		if (created > 0) {
			this.objectsCreated += created;
			hasUpdates = true;

			// Log for debugging
			if (browser) {
				console.debug(
					`PoolStatsTracker: Batch recorded ${created} object(s) created, total: ${this.objectsCreated}`
				);
			}
		}

		if (reused > 0) {
			this.objectsReused += reused;
			hasUpdates = true;

			// Log for debugging
			if (browser) {
				console.debug(
					`PoolStatsTracker: Batch recorded ${reused} object(s) reused, total: ${this.objectsReused}`
				);
			}
		}

		if (hasUpdates) {
			this.checkReportStats();
		}
	}

	/**
	 * Update pool capacity and utilization statistics
	 */
	updatePoolState(activeObjects: number, totalCapacity: number): void {
		if (this.activeObjects === activeObjects && this.totalCapacity === totalCapacity) {
			return; // No change, skip update
		}

		this.activeObjects = activeObjects;
		this.totalCapacity = totalCapacity;

		this.updateStats({
			activeObjects,
			totalCapacity,
			utilizationRate: totalCapacity > 0 ? activeObjects / totalCapacity : 0
		});

		this.checkReportStats();
	}

	/**
	 * Force reporting of current statistics
	 */
	reportNow(): void {
		this.updateStats({
			objectsCreated: this.objectsCreated,
			objectsReused: this.objectsReused,
			reuseRatio: this.calculateReuseRatio(),
			estimatedMemorySaved: this.calculateMemorySaved(),
			activeObjects: this.activeObjects,
			totalCapacity: this.totalCapacity,
			utilizationRate: this.totalCapacity > 0 ? this.activeObjects / this.totalCapacity : 0
		});

		this.lastReportTime = browser ? performance.now() : 0;
	}

	/**
	 * Reset the statistics counters
	 */
	reset(): void {
		this.objectsCreated = 0;
		this.objectsReused = 0;
		this.startTime = browser ? performance.now() : 0;
		this.lastReportTime = this.startTime;

		// Reset the store values but maintain pool identity
		this.updateStats({
			objectsCreated: 0,
			objectsReused: 0,
			reuseRatio: 0,
			estimatedMemorySaved: 0,
			activeObjects: 0,
			totalCapacity: 0,
			utilizationRate: 0
		});
	}

	/**
	 * Calculate the ratio of reused objects to total objects processed
	 */
	private calculateReuseRatio(): number {
		const total = this.objectsCreated + this.objectsReused;
		return total > 0 ? this.objectsReused / total : 0;
	}

	/**
	 * Estimate memory savings from object reuse in KB
	 */
	private calculateMemorySaved(): number {
		return (this.objectsReused * this.objectSize) / 1024;
	}

	/**
	 * Check if it's time to report updated statistics
	 */
	private checkReportStats(): void {
		if (!browser) return;

		const now = performance.now();
		if (now - this.lastReportTime >= this.reportInterval) {
			this.reportNow();
		}
	}

	/**
	 * Update the statistics store with new values
	 */
	private updateStats(stats: Partial<ObjectPoolStats>): void {
		if (!browser) return;

		// Ensure we're not updating with undefined values
		Object.keys(stats).forEach((key) => {
			if (stats[key] === undefined) {
				delete stats[key];
			}
		});

		// Make sure estimatedMemorySaved is calculated correctly
		if (stats.objectsReused !== undefined && stats.estimatedMemorySaved === undefined) {
			stats.estimatedMemorySaved = (stats.objectsReused * this.objectSize) / 1024;
		}

		// Ensure reuseRatio is calculated from the correct values
		if (
			(stats.objectsCreated !== undefined || stats.objectsReused !== undefined) &&
			stats.reuseRatio === undefined
		) {
			const total =
				(stats.objectsCreated ?? this.objectsCreated) + (stats.objectsReused ?? this.objectsReused);
			stats.reuseRatio = total > 0 ? (stats.objectsReused ?? this.objectsReused) / total : 0;
		}

		updateObjectPoolStats(stats);
	}

	/**
	 * Get the current statistics snapshot
	 */
	getStats(): ObjectPoolStats {
		// Get the current store state
		const currentStats = get(objectPoolStatsStore);

		// Return a merged version with our local counters
		return {
			...currentStats,
			objectsCreated: this.objectsCreated,
			objectsReused: this.objectsReused,
			reuseRatio: this.calculateReuseRatio(),
			estimatedMemorySaved: this.calculateMemorySaved(),
			activeObjects: this.activeObjects,
			totalCapacity: this.totalCapacity,
			utilizationRate: this.totalCapacity > 0 ? this.activeObjects / this.totalCapacity : 0
		};
	}
}

// Singleton instance for the star pool
export const starPoolTracker = new PoolStatsTracker('Stars', 'Star', 240);

/**
 * Create a new pool stats tracker instance
 */
export function createPoolStatsTracker(
	poolName: string,
	poolType: string,
	objectSize: number = 200
): PoolStatsTracker {
	return new PoolStatsTracker(poolName, poolType, objectSize);
}

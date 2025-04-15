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
	private reportInterval: number = 1000; // report every second

	constructor(poolName: string, poolType: string, objectSize: number = 200) {
		this.poolName = poolName;
		this.poolType = poolType;
		this.objectSize = objectSize;
		this.startTime = browser ? performance.now() : 0;
		this.lastReportTime = this.startTime;

		// Initialize stats store with pool identity
		this.updateStats({
			poolName: this.poolName,
			poolType: this.poolType
		});
	}

	/**
	 * Record a new object creation event
	 */
	recordObjectCreated(): void {
		this.objectsCreated++;
		this.checkReportStats();
	}

	/**
	 * Record an object reuse event
	 */
	recordObjectReused(): void {
		this.objectsReused++;
		this.checkReportStats();
	}

	/**
	 * Update pool capacity and utilization statistics
	 */
	updatePoolState(activeObjects: number, totalCapacity: number): void {
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
			estimatedMemorySaved: this.calculateMemorySaved()
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

		// Reset the store values
		this.updateStats({
			objectsCreated: 0,
			objectsReused: 0,
			reuseRatio: 0,
			estimatedMemorySaved: 0
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
		updateObjectPoolStats(stats);
	}

	/**
	 * Get the current statistics snapshot
	 */
	getStats(): ObjectPoolStats {
		return {
			...get(objectPoolStatsStore),
			objectsCreated: this.objectsCreated,
			objectsReused: this.objectsReused,
			reuseRatio: this.calculateReuseRatio(),
			estimatedMemorySaved: this.calculateMemorySaved()
		};
	}
}

/**
 * Global pool stats tracker instance for the star pool
 */
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

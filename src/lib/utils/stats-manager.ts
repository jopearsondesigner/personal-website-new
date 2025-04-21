// NEW FILE: src/lib/utils/stats-manager.ts
import { browser } from '$app/environment';
import { get } from 'svelte/store';
import { objectPoolStatsStore, updateObjectPoolStats } from './device-performance';
import { starPoolTracker } from './pool-stats-tracker';
import { starPoolBridge } from './star-pool-bridge';

/**
 * Central manager for object pool statistics
 * Provides a unified interface for all components to update and retrieve stats
 */
class StatsManager {
	private initialized = false;
	private debugMode = false;

	constructor() {
		if (browser) {
			this.initialize();

			// Check for debug mode
			try {
				this.debugMode = localStorage.getItem('poolStatsDebugMode') === 'true';
			} catch (e) {
				this.debugMode = false;
			}
		}
	}

	/**
	 * Initialize the statistics system
	 */
	public initialize(): void {
		if (!browser || this.initialized) return;

		// Initialize the stats store with default values
		this.ensureStoreInitialized();

		// Force initial reporting
		this.refreshStats();

		this.initialized = true;

		if (this.debugMode) {
			console.debug('StatsManager: Initialized');
		}
	}

	/**
	 * Ensure the stats store is initialized with proper values
	 */
	private ensureStoreInitialized(): void {
		// Check current state
		const currentStats = get(objectPoolStatsStore);

		// Only initialize if needed
		if (!currentStats || currentStats.totalCapacity === 0 || !currentStats.poolName) {
			// Directly update store instead of going through trackers
			updateObjectPoolStats({
				poolName: 'Stars',
				poolType: 'Star',
				objectsCreated: 0,
				objectsReused: 0,
				reuseRatio: 0,
				estimatedMemorySaved: 0,
				activeObjects: 0,
				totalCapacity: 300, // Default expected capacity
				utilizationRate: 0
			});

			if (this.debugMode) {
				console.debug('StatsManager: Store initialized with defaults');
			}
		}
	}

	/**
	 * Refresh all statistics from all sources
	 */
	public refreshStats(): void {
		if (!browser) return;

		// Ensure initialized first
		this.ensureStoreInitialized();

		// IMPORTANT: Use setTimeout to prevent potential stack overflow
		setTimeout(() => {
			try {
				// Force tracker to report directly
				if (starPoolTracker) {
					starPoolTracker.reportNow();
				}

				// Force bridge to sync with delay
				setTimeout(() => {
					if (starPoolBridge) {
						starPoolBridge.forceSyncStats();
					}
				}, 0);

				if (this.debugMode) {
					console.debug('StatsManager: Stats refreshed');
					this.logCurrentStats();
				}
			} catch (error) {
				console.error('Error refreshing stats:', error);
			}
		}, 0);
	}

	/**
	 * Record object creation
	 */
	public recordCreated(count: number): void {
		if (!browser || count <= 0) return;

		starPoolTracker.recordObjectCreated(count);
		this.refreshStats();
	}

	/**
	 * Record object reuse
	 */
	public recordReused(count: number): void {
		if (!browser || count <= 0) return;

		starPoolTracker.recordObjectReused(count);
		this.refreshStats();
	}

	/**
	 * Update active object counts
	 */
	public updateActiveCount(active: number, total: number): void {
		if (!browser) return;

		starPoolTracker.updatePoolState(active, total);
		this.refreshStats();
	}

	/**
	 * Reset all statistics
	 */
	public resetStats(): void {
		if (!browser) return;

		starPoolTracker.reset();
		this.refreshStats();

		if (this.debugMode) {
			console.debug('StatsManager: Stats reset');
		}
	}

	/**
	 * Log current statistics (for debugging)
	 */
	public logCurrentStats(): void {
		if (!browser) return;

		const stats = get(objectPoolStatsStore);
		console.log('========== Pool Stats ==========');
		console.log(`Pool: ${stats.poolName} (${stats.poolType})`);
		console.log(
			`Objects: ${stats.activeObjects}/${stats.totalCapacity} (${(stats.utilizationRate * 100).toFixed(1)}%)`
		);
		console.log(`Created: ${stats.objectsCreated}, Reused: ${stats.objectsReused}`);
		console.log(`Reuse ratio: ${(stats.reuseRatio * 100).toFixed(1)}%`);
		console.log(`Memory saved: ${stats.estimatedMemorySaved.toFixed(1)} KB`);
		console.log('================================');
	}

	/**
	 * Set debug mode
	 */
	public setDebugMode(enabled: boolean): void {
		this.debugMode = enabled;

		if (browser) {
			try {
				localStorage.setItem('poolStatsDebugMode', String(enabled));
			} catch (e) {
				// Ignore localStorage errors
			}
		}

		// Log current state if enabling
		if (enabled) {
			this.logCurrentStats();
		}
	}
}

// Export singleton instance
export const statsManager = new StatsManager();

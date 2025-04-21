// Create this as src/lib/utils/debug-pool-stats.ts
import { browser } from '$app/environment';
import { get } from 'svelte/store';
import { objectPoolStatsStore } from './device-performance';

/**
 * Debug utility to test and fix object pool statistics
 */
export const PoolStatsDebugger = {
	/**
	 * Log current pool statistics
	 */
	logStats(): void {
		if (!browser) return;

		try {
			const stats = get(objectPoolStatsStore);
			console.group('📊 Object Pool Statistics');
			console.log('Active/Total:', stats.activeObjects, '/', stats.totalCapacity);
			console.log('Created:', stats.objectsCreated);
			console.log('Reused:', stats.objectsReused);
			console.log('Reuse Ratio:', (stats.reuseRatio * 100).toFixed(1) + '%');
			console.log('Memory Saved:', stats.estimatedMemorySaved.toFixed(1) + ' KB');
			console.groupEnd();
		} catch (error) {
			console.error('Error accessing pool stats:', error);
		}
	},

	/**
	 * Generate test statistics to verify the UI is working
	 */
	injectTestData(created: number = 50, reused: number = 100): void {
		if (!browser) return;

		console.log(`Injecting test data: ${created} created, ${reused} reused`);

		import('./pool-stats-tracker')
			.then((module) => {
				if (module.starPoolTracker) {
					module.starPoolTracker.recordBatch(created, reused);
					module.starPoolTracker.updatePoolState(
						Math.floor(created / 2), // active objects
						created // total capacity
					);
					module.starPoolTracker.reportNow();

					setTimeout(() => {
						this.logStats();
					}, 100);
				}
			})
			.catch((error) => {
				console.error('Error importing pool-stats-tracker:', error);
			});
	},

	/**
	 * Force stats update from all sources
	 */
	forceUpdate(): void {
		if (!browser) return;

		console.log('Forcing stats update from all sources...');

		// Update from pool tracker
		import('./pool-stats-tracker')
			.then((module) => {
				if (module.starPoolTracker) {
					module.starPoolTracker.reportNow();
				}
			})
			.catch((err) => console.error('Error with pool tracker:', err));

		// Update from bridge
		import('./star-pool-bridge')
			.then((module) => {
				if (module.starPoolBridge) {
					module.starPoolBridge.forceSyncStats();
				}
			})
			.catch((err) => console.error('Error with pool bridge:', err));

		// Check the results after a short delay
		setTimeout(() => {
			this.logStats();
		}, 200);
	}
};

// Export a helper method to directly invoke from the console
export function debugPoolStats(): void {
	PoolStatsDebugger.logStats();
	console.log(
		'To inject test data, run: import { PoolStatsDebugger } from "$lib/utils/debug-pool-stats"; PoolStatsDebugger.injectTestData();'
	);
}

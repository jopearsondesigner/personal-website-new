// src/lib/utils/star-pool.ts
import { browser } from '$app/environment';
import { starPoolTracker } from './pool-stats-tracker';

/**
 * Interface for objects that can be managed by the star pool
 */
export interface StarPoolObject {
	inUse: boolean;
	[key: string]: any;
}

/**
 * Generic object pool implementation for managing reusable objects
 * Prevents garbage collection by reusing existing objects instead of creating new ones
 */
export class StarPool<T extends StarPoolObject> {
	private pool: T[];
	private factory: () => T;
	private reset: (obj: T) => void;
	private capacity: number;
	private size: number;
	private objectsCreated: number = 0;
	private objectsReused: number = 0;
	private currentLRUIndex: number = 0;
	private lastAccessTimes: number[] | null = null;
	private lastHibernationCheck: number = 0;

	/**
	 * Optimization: Add batch statistics reporting
	 * Benefit: Reduces store updates and potential re-renders
	 */
	private pendingStatsUpdates = { created: 0, reused: 0 };
	private statsUpdateScheduled = false;

	/**
	 * Create a new object pool
	 * @param initialCapacity Maximum number of objects in the pool
	 * @param factory Function to create new objects
	 * @param reset Function to reset/reinitialize objects for reuse
	 */
	constructor(initialCapacity: number, factory: () => T, reset: (obj: T) => void) {
		this.capacity = initialCapacity;
		this.factory = factory;
		this.reset = reset;
		this.size = 0;
		this.pool = [];

		// Pre-allocate all objects during initialization
		this.preAllocate();

		// Report initial pool stats to tracker
		this.reportPoolStats();
	}

	/**
	 * Pre-allocate all objects in the pool
	 * This prevents runtime allocations and reduces garbage collection
	 */
	private preAllocate(): void {
		for (let i = 0; i < this.capacity; i++) {
			const obj = this.factory();
			obj.inUse = false;
			this.pool.push(obj);
			this.objectsCreated++;
		}
		this.size = this.capacity;

		if (browser) {
			starPoolTracker.recordObjectCreated();
		}
	}

	/**
	 * Get an object from the pool
	 * @returns An available object
	 */
	get(): T {
		// First try to find an unused object in the pool
		for (let i = 0; i < this.size; i++) {
			if (!this.pool[i].inUse) {
				this.pool[i].inUse = true;

				// Track object reuse for statistics
				if (browser) {
					this.objectsReused++;
					// Batch statistics updates instead of immediate reporting
					this.pendingStatsUpdates.reused++;
					this.scheduleBatchStatsUpdate();
				}

				// Update last access time if tracking
				if (this.lastAccessTimes) {
					this.lastAccessTimes[i] = performance.now();
				}

				this.reportPoolStats();
				return this.pool[i];
			}
		}

		// If we still have room in the pool, create a new object
		if (this.size < this.capacity) {
			const obj = this.factory();
			obj.inUse = true;
			this.pool[this.size] = obj;
			this.size++;

			// Track object creation for statistics
			if (browser) {
				this.objectsCreated++;
				// Batch statistics updates instead of immediate reporting
				this.pendingStatsUpdates.created++;
				this.scheduleBatchStatsUpdate();
			}

			// Initialize last access time if tracking
			if (this.lastAccessTimes) {
				this.lastAccessTimes[this.size - 1] = performance.now();
			}

			this.reportPoolStats();
			return obj;
		}

		// If all objects are in use, reuse the oldest one using the optimized approach
		return this.reuseObject();
	}

	/**
	 * Optimization: Replace shift/push LRU with circular buffer pattern for O(1) operations
	 * Benefit: Eliminates expensive array shifts which have O(n) complexity
	 */
	private reuseObject(): T {
		// Use a circular buffer approach with pointer instead of shift/push
		const obj = this.pool[this.currentLRUIndex];
		this.reset(obj);
		obj.inUse = true;

		// Update pointer for next LRU position
		this.currentLRUIndex = (this.currentLRUIndex + 1) % this.size;

		// Track object reuse for statistics
		if (browser) {
			this.objectsReused++;
			// Batch statistics updates instead of immediate reporting
			this.pendingStatsUpdates.reused++;
			this.scheduleBatchStatsUpdate();
		}

		// Update last access time if tracking
		if (this.lastAccessTimes) {
			this.lastAccessTimes[this.currentLRUIndex] = performance.now();
		}

		this.reportPoolStats();
		return obj;
	}

	/**
	 * Optimization: Add batch statistics reporting
	 * Benefit: Reduces store updates and potential re-renders
	 */
	private scheduleBatchStatsUpdate(): void {
		if (this.statsUpdateScheduled) return;

		this.statsUpdateScheduled = true;

		// Use requestAnimationFrame for stats updates to align with rendering
		requestAnimationFrame(() => {
			starPoolTracker.recordBatch(
				this.pendingStatsUpdates.created,
				this.pendingStatsUpdates.reused
			);

			this.pendingStatsUpdates.created = 0;
			this.pendingStatsUpdates.reused = 0;
			this.statsUpdateScheduled = false;
		});
	}

	/**
	 * Release an object back to the pool
	 * @param obj The object to release
	 */
	release(obj: T): void {
		obj.inUse = false;

		// Update last access time for released object if tracking
		if (this.lastAccessTimes) {
			// Find the index of the object in the pool
			const index = this.pool.indexOf(obj);
			if (index !== -1) {
				this.lastAccessTimes[index] = performance.now();
			}
		}

		this.reportPoolStats();
	}

	/**
	 * Release all objects back to the pool
	 */
	releaseAll(): void {
		const now = performance.now();

		for (let i = 0; i < this.size; i++) {
			this.pool[i].inUse = false;

			// Update last access times if tracking
			if (this.lastAccessTimes) {
				this.lastAccessTimes[i] = now;
			}
		}

		this.reportPoolStats();
	}

	/**
	 * Get number of currently active (in use) objects
	 * @returns Count of active objects
	 */
	getActiveCount(): number {
		let count = 0;
		for (let i = 0; i < this.size; i++) {
			if (this.pool[i].inUse) {
				count++;
			}
		}
		return count;
	}

	/**
	 * Get total number of objects in the pool
	 * @returns Total object count
	 */
	getTotalCount(): number {
		return this.size;
	}

	/**
	 * Get memory usage statistics for the pool
	 * Useful for debugging and performance monitoring
	 */
	getStats(): {
		active: number;
		total: number;
		usage: number;
		created: number;
		reused: number;
		reuseRatio: number;
	} {
		const active = this.getActiveCount();
		const total = this.getTotalCount();
		const totalProcessed = this.objectsCreated + this.objectsReused;

		return {
			active,
			total,
			usage: total > 0 ? active / total : 0,
			created: this.objectsCreated,
			reused: this.objectsReused,
			reuseRatio: totalProcessed > 0 ? this.objectsReused / totalProcessed : 0
		};
	}

	/**
	 * Report pool statistics to tracking system
	 */
	private reportPoolStats(): void {
		if (!browser) return;

		const active = this.getActiveCount();
		const total = this.getTotalCount();

		// Update pool state in tracker
		starPoolTracker.updatePoolState(active, total);
	}

	/**
	 * Log pool statistics to console
	 * Useful for debugging
	 */
	logPoolStats(): void {
		const stats = this.getStats();
		console.log(`
    Star Pool Stats:
    ---------------
    Active objects: ${stats.active}/${stats.total} (${(stats.usage * 100).toFixed(2)}%)
    Created: ${stats.created}, Reused: ${stats.reused}
    Reuse ratio: ${(stats.reuseRatio * 100).toFixed(2)}%
    `);
	}

	/**
	 * Resize the pool capacity
	 * Useful for adapting to changing performance requirements
	 * @param newCapacity New maximum pool size
	 */
	resize(newCapacity: number): void {
		// Cannot reduce below the number of objects currently in use
		const activeCount = this.getActiveCount();
		if (newCapacity < activeCount) {
			newCapacity = activeCount;
		}

		// If increasing capacity, create new objects
		if (newCapacity > this.capacity) {
			// Create new array with larger capacity
			const newPool = new Array(newCapacity);

			// Create new lastAccessTimes array if tracking
			const newLastAccessTimes = this.lastAccessTimes ? new Array(newCapacity) : null;
			const now = performance.now();

			// Copy existing objects
			for (let i = 0; i < this.size; i++) {
				newPool[i] = this.pool[i];
				if (newLastAccessTimes && this.lastAccessTimes) {
					newLastAccessTimes[i] = this.lastAccessTimes[i];
				}
			}

			// Create new objects to fill expanded capacity
			for (let i = this.size; i < newCapacity; i++) {
				const obj = this.factory();
				obj.inUse = false;
				newPool[i] = obj;
				if (newLastAccessTimes) {
					newLastAccessTimes[i] = now;
				}
				this.objectsCreated++;

				// Track object creation for statistics
				if (browser) {
					// Batch statistics updates instead of immediate reporting
					this.pendingStatsUpdates.created++;
					this.scheduleBatchStatsUpdate();
				}
			}

			// Update pool, lastAccessTimes, and size
			this.pool = newPool;
			if (this.lastAccessTimes) {
				this.lastAccessTimes = newLastAccessTimes;
			}
			this.size = newCapacity;
		}
		// If reducing capacity, keep the first 'newCapacity' objects
		else if (newCapacity < this.capacity) {
			// Keep only active objects and as many inactive as will fit
			const activeObjects: T[] = [];
			const inactiveObjects: T[] = [];
			const activeIndices: number[] = [];
			const inactiveIndices: number[] = [];

			// Separate active and inactive objects and track their indices
			for (let i = 0; i < this.size; i++) {
				if (this.pool[i].inUse) {
					activeObjects.push(this.pool[i]);
					activeIndices.push(i);
				} else if (inactiveObjects.length < newCapacity - activeObjects.length) {
					inactiveObjects.push(this.pool[i]);
					inactiveIndices.push(i);
				}
			}

			// Create new array with proper capacity
			const newPool = new Array(newCapacity);
			const newLastAccessTimes = this.lastAccessTimes ? new Array(newCapacity) : null;

			// Add all active objects
			let index = 0;
			for (let i = 0; i < activeObjects.length; i++) {
				newPool[index] = activeObjects[i];
				if (newLastAccessTimes && this.lastAccessTimes) {
					newLastAccessTimes[index] = this.lastAccessTimes[activeIndices[i]];
				}
				index++;
			}

			// Add inactive objects to fill remaining space
			for (let i = 0; i < inactiveObjects.length; i++) {
				newPool[index] = inactiveObjects[i];
				if (newLastAccessTimes && this.lastAccessTimes) {
					newLastAccessTimes[index] = this.lastAccessTimes[inactiveIndices[i]];
				}
				index++;
			}

			// Update pool, lastAccessTimes, and size
			this.pool = newPool;
			if (this.lastAccessTimes) {
				this.lastAccessTimes = newLastAccessTimes;
			}
			this.size = newCapacity;

			// Ensure currentLRUIndex is within bounds
			if (this.currentLRUIndex >= this.size) {
				this.currentLRUIndex = 0;
			}
		}

		// Update capacity
		this.capacity = newCapacity;

		// Report updated stats
		this.reportPoolStats();
	}

	/**
	 * Optimization: Add pool hibernation capability for long-term memory optimization
	 * Benefit: Release memory when pool usage is low for extended periods
	 */
	hibernateUnusedObjects(unusedTimeThreshold: number = 30000): void {
		const now = performance.now();

		if (!this.lastAccessTimes) {
			// Initialize if needed
			this.lastAccessTimes = new Array(this.capacity).fill(now);
			return;
		}

		let hibernatedCount = 0;

		// Only check every N seconds to reduce overhead
		if (now - this.lastHibernationCheck < 5000) return;
		this.lastHibernationCheck = now;

		// Check for objects unused for the threshold period
		for (let i = 0; i < this.size; i++) {
			if (!this.pool[i].inUse && now - this.lastAccessTimes[i] > unusedTimeThreshold) {
				// Nullify references within the object to help GC
				for (const key in this.pool[i]) {
					if (key !== 'inUse') {
						this.pool[i][key] = null;
					}
				}
				hibernatedCount++;
			}
		}

		// If significant hibernation occurred, hint GC
		if (hibernatedCount > this.size * 0.1) {
			this.hintGarbageCollection();
		}
	}

	/**
	 * Optimization: Add GC hint function
	 * Benefit: Encourages browser to collect garbage when appropriate
	 */
	private hintGarbageCollection(): void {
		if (!browser) return;

		// Null out references to help GC
		for (let i = 0; i < 20; i++) {
			const arr = new Array(1000);
			arr.length = 0;
		}

		// Try to use GC if available (Chrome dev tools)
		if (typeof window !== 'undefined' && (window as any).gc) {
			try {
				(window as any).gc();
			} catch (e) {
				// GC not available
			}
		}
	}

	/**
	 * Enhanced cleanup and deallocation for StarPool
	 */
	public destroy(): void {
		// 1. First release all objects
		this.releaseAll();

		// 2. For objects that have custom cleanup capability, call it
		for (let i = 0; i < this.size; i++) {
			// Check if object has a destroy or cleanup method
			if (typeof this.pool[i].destroy === 'function') {
				this.pool[i].destroy();
			} else if (typeof this.pool[i].cleanup === 'function') {
				this.pool[i].cleanup();
			}

			// For objects with typedArray or large properties, null them
			for (const key in this.pool[i]) {
				// Skip inUse flag
				if (key === 'inUse') continue;

				// Check for TypedArrays and nullify them
				if (this.pool[i][key] instanceof Float32Array || this.pool[i][key] instanceof Uint8Array) {
					this.pool[i][key] = null;
				}

				// Check for large objects/arrays
				if (Array.isArray(this.pool[i][key]) && this.pool[i][key].length > 0) {
					this.pool[i][key].length = 0;
					this.pool[i][key] = null;
				}
			}

			// Nullify the object
			this.pool[i] = null;
		}

		// 3. Clear the pool array itself
		this.pool = null;

		// 4. Clear stats to prevent memory leaks through closures
		this.objectsCreated = 0;
		this.objectsReused = 0;

		// 5. De-reference factory and reset functions that might hold closures
		this.factory = null;
		this.reset = null;
	}
}

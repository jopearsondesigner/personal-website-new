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
		this.pool = new Array(initialCapacity);

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
			this.pool[i] = obj;
			this.objectsCreated++;
		}
		this.size = this.capacity;

		// Update statistics for initial allocation
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
					starPoolTracker.recordObjectReused();
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
				starPoolTracker.recordObjectCreated();
			}

			this.reportPoolStats();
			return obj;
		}

		// If all objects are in use, reuse the oldest one
		// This implements a basic LRU (Least Recently Used) strategy
		const obj = this.pool[0];
		this.reset(obj);
		obj.inUse = true;

		// Move the reused object to the end of the array (circular buffer)
		this.pool.push(this.pool.shift()!);

		// Track object reuse for statistics
		if (browser) {
			this.objectsReused++;
			starPoolTracker.recordObjectReused();
		}

		this.reportPoolStats();
		return obj;
	}

	/**
	 * Release an object back to the pool
	 * @param obj The object to release
	 */
	release(obj: T): void {
		obj.inUse = false;
		this.reportPoolStats();
	}

	/**
	 * Release all objects back to the pool
	 */
	releaseAll(): void {
		for (let i = 0; i < this.size; i++) {
			this.pool[i].inUse = false;
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

			// Copy existing objects
			for (let i = 0; i < this.size; i++) {
				newPool[i] = this.pool[i];
			}

			// Create new objects to fill expanded capacity
			for (let i = this.size; i < newCapacity; i++) {
				const obj = this.factory();
				obj.inUse = false;
				newPool[i] = obj;
				this.objectsCreated++;

				// Track object creation for statistics
				if (browser) {
					starPoolTracker.recordObjectCreated();
				}
			}

			// Update pool and size
			this.pool = newPool;
			this.size = newCapacity;
		}
		// If reducing capacity, keep the first 'newCapacity' objects
		else if (newCapacity < this.capacity) {
			// Keep only active objects and as many inactive as will fit
			const activeObjects: T[] = [];
			const inactiveObjects: T[] = [];

			// Separate active and inactive objects
			for (let i = 0; i < this.size; i++) {
				if (this.pool[i].inUse) {
					activeObjects.push(this.pool[i]);
				} else if (inactiveObjects.length < newCapacity - activeObjects.length) {
					inactiveObjects.push(this.pool[i]);
				}
			}

			// Create new array with proper capacity
			const newPool = new Array(newCapacity);

			// Add all active objects
			let index = 0;
			for (let i = 0; i < activeObjects.length; i++) {
				newPool[index++] = activeObjects[i];
			}

			// Add inactive objects to fill remaining space
			for (let i = 0; i < inactiveObjects.length; i++) {
				newPool[index++] = inactiveObjects[i];
			}

			// Update pool and size
			this.pool = newPool;
			this.size = newCapacity;
		}

		// Update capacity
		this.capacity = newCapacity;

		// Report updated stats
		this.reportPoolStats();
	}
}

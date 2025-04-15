// src/lib/utils/star-pool.ts

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
		}
		this.size = this.capacity;
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
				return this.pool[i];
			}
		}

		// If we still have room in the pool, create a new object
		if (this.size < this.capacity) {
			const obj = this.factory();
			obj.inUse = true;
			this.pool[this.size] = obj;
			this.size++;
			return obj;
		}

		// If all objects are in use, reuse the oldest one
		// This implements a basic LRU (Least Recently Used) strategy
		const obj = this.pool[0];
		this.reset(obj);
		obj.inUse = true;

		// Move the reused object to the end of the array (circular buffer)
		this.pool.push(this.pool.shift()!);

		return obj;
	}

	/**
	 * Release an object back to the pool
	 * @param obj The object to release
	 */
	release(obj: T): void {
		obj.inUse = false;
	}

	/**
	 * Release all objects back to the pool
	 */
	releaseAll(): void {
		for (let i = 0; i < this.size; i++) {
			this.pool[i].inUse = false;
		}
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
	getStats(): { active: number; total: number; usage: number } {
		const active = this.getActiveCount();
		return {
			active,
			total: this.size,
			usage: active / this.size
		};
	}

	logPoolStats(): void {
		const stats = this.getStats();
		console.log(`
    Star Pool Stats:
    ---------------
    Active objects: ${stats.active}/${stats.total} (${(stats.usage * 100).toFixed(2)}%)
    `);
	}
}

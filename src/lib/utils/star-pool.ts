// src/lib/utils/star-pool.ts
import { browser } from '$app/environment';
import { starPoolTracker } from './pool-stats-tracker';

/**
 * Interface for objects that can be managed by the star pool
 */
export interface StarPoolObject {
	inUse: boolean;
	poolIndex?: number; // Track object's position in pool
	lastAccessTime?: number; // For true LRU implementation
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

	// Optimization: True LRU tracking with timestamp-based approach
	private lruIndices: number[] = [];
	private lastAccessTimes: number[] = [];
	private lastHibernationCheck: number = 0;
	private hibernationThreshold: number = 30000; // Default: 30 seconds

	// Optimization: Deep property tracking for better cleanup
	private propertyTypes: Map<string, string> = new Map();
	private trackedArrayProperties: Set<string> = new Set();
	private trackedObjectProperties: Set<string> = new Set();

	/**
	 * Optimization: Add batch statistics reporting
	 * Benefit: Reduces store updates and potential re-renders
	 */
	private pendingStatsUpdates = { created: 0, reused: 0 };
	private statsUpdateScheduled = false;
	private statsReportThreshold = 10; // Report after 10 operations

	/**
	 * Create a new object pool
	 * @param initialCapacity Maximum number of objects in the pool
	 * @param factory Function to create new objects
	 * @param reset Function to reset/reinitialize objects for reuse
	 * @param options Additional pool configuration options
	 */
	constructor(
		initialCapacity: number,
		factory: () => T,
		reset: (obj: T) => void,
		options: {
			preAllocate?: boolean;
			hibernationThreshold?: number;
			statsReportThreshold?: number;
		} = {}
	) {
		this.capacity = initialCapacity;
		this.factory = factory;
		this.reset = reset;
		this.size = 0;
		this.pool = [];
		this.lruIndices = new Array(initialCapacity);
		this.lastAccessTimes = new Array(initialCapacity);

		// Configure options
		if (options.hibernationThreshold) {
			this.hibernationThreshold = options.hibernationThreshold;
		}

		if (options.statsReportThreshold) {
			this.statsReportThreshold = options.statsReportThreshold;
		}

		// Pre-allocate objects if specified (default: true)
		if (options.preAllocate !== false) {
			this.preAllocate();
		}

		// Report initial pool stats to tracker
		this.reportPoolStats();

		// Analyze first created object to detect property types for better cleanup
		if (this.size > 0) {
			this.analyzeObjectProperties(this.pool[0]);
		}
	}

	/**
	 * Pre-allocate all objects in the pool
	 * This prevents runtime allocations and reduces garbage collection
	 */
	private preAllocate(): void {
		for (let i = 0; i < this.capacity; i++) {
			const obj = this.factory();
			obj.inUse = false;
			obj.poolIndex = i;
			obj.lastAccessTime = performance.now();
			this.pool.push(obj);
			this.lruIndices[i] = i;
			this.lastAccessTimes[i] = performance.now();
			this.objectsCreated++;
		}
		this.size = this.capacity;

		if (browser) {
			this.pendingStatsUpdates.created += this.capacity;
			this.scheduleBatchStatsUpdate(true); // Force immediate update
		}
	}

	/**
	 * Optimization: Analyze object properties for better cleanup
	 * Benefit: Ensures all properties are properly reset
	 */
	private analyzeObjectProperties(obj: T): void {
		// Skip if no object provided
		if (!obj) return;

		// Clear previous analysis
		this.propertyTypes.clear();
		this.trackedArrayProperties.clear();
		this.trackedObjectProperties.clear();

		// Analyze all properties
		for (const key in obj) {
			// Skip special pool properties
			if (key === 'inUse' || key === 'poolIndex' || key === 'lastAccessTime') continue;

			const value = obj[key];
			const type = typeof value;

			this.propertyTypes.set(key, type);

			// Track arrays and TypedArrays for special cleanup
			if (
				Array.isArray(value) ||
				value instanceof Float32Array ||
				value instanceof Uint8Array ||
				value instanceof Uint16Array ||
				value instanceof Uint32Array
			) {
				this.trackedArrayProperties.add(key);
			}

			// Track objects for deep cleanup
			if (
				type === 'object' &&
				value !== null &&
				!(value instanceof Array) &&
				!(value instanceof Float32Array) &&
				!(value instanceof Uint8Array)
			) {
				this.trackedObjectProperties.add(key);
			}
		}
	}

	/**
	 * Get an object from the pool
	 * @returns An available object
	 */
	get(): T {
		const now = performance.now();

		// First try to find an unused object in the pool
		for (let i = 0; i < this.size; i++) {
			if (!this.pool[i].inUse) {
				this.pool[i].inUse = true;
				this.pool[i].lastAccessTime = now;

				// Update access time
				const index = this.pool[i].poolIndex !== undefined ? this.pool[i].poolIndex : i;
				this.lastAccessTimes[index] = now;

				// Move this object to end of LRU list (most recently used)
				this.updateLRUIndex(index);

				// Track object reuse for statistics
				if (browser) {
					this.objectsReused++;
					this.pendingStatsUpdates.reused++;
					this.scheduleBatchStatsUpdate();
				}

				this.reportPoolStats();
				return this.pool[i];
			}
		}

		// If we still have room in the pool, create a new object
		if (this.size < this.capacity) {
			const obj = this.factory();
			obj.inUse = true;
			obj.poolIndex = this.size;
			obj.lastAccessTime = now;
			this.pool[this.size] = obj;

			// Add to LRU tracking
			this.lruIndices[this.size] = this.size;
			this.lastAccessTimes[this.size] = now;

			// If first object, analyze its properties
			if (this.size === 0) {
				this.analyzeObjectProperties(obj);
			}

			this.size++;

			// Track object creation for statistics
			if (browser) {
				this.objectsCreated++;
				this.pendingStatsUpdates.created++;
				this.scheduleBatchStatsUpdate();
			}

			this.reportPoolStats();
			return obj;
		}

		// If all objects are in use, reuse the least recently used one
		return this.reuseObject();
	}

	/**
	 * Optimization: True LRU implementation instead of circular buffer
	 * Benefit: Ensures truly least-used objects are recycled first
	 */
	private reuseObject(): T {
		const now = performance.now();

		// Get the least recently used object index
		const lruIndex = this.lruIndices[0];
		const obj = this.pool[lruIndex];

		// Perform deep reset on the object
		this.deepReset(obj);
		obj.inUse = true;
		obj.lastAccessTime = now;

		// Update access time and LRU status
		this.lastAccessTimes[lruIndex] = now;
		this.updateLRUIndex(lruIndex);

		// Track object reuse for statistics
		if (browser) {
			this.objectsReused++;
			this.pendingStatsUpdates.reused++;
			this.scheduleBatchStatsUpdate();
		}

		this.reportPoolStats();
		return obj;
	}

	/**
	 * Update LRU index when an object is accessed
	 * @param index Index of accessed object
	 */
	private updateLRUIndex(index: number): void {
		// Find current position in LRU array
		const currentPos = this.lruIndices.indexOf(index);
		if (currentPos >= 0) {
			// Remove from current position
			this.lruIndices.splice(currentPos, 1);
			// Add to end (most recently used)
			this.lruIndices.push(index);
		}
	}

	/**
	 * Optimization: Deep reset of object properties based on analyzed types
	 * Benefit: Ensures complete cleanup of all properties
	 */
	private deepReset(obj: T): void {
		// First call user-defined reset function
		this.reset(obj);

		// Then perform deep cleanup based on property analysis
		for (const [key, type] of this.propertyTypes.entries()) {
			// Skip special pool properties
			if (key === 'inUse' || key === 'poolIndex' || key === 'lastAccessTime') continue;

			// Set default values based on type
			if (this.trackedArrayProperties.has(key)) {
				const arr = obj[key];
				// Clear arrays differently based on type
				if (
					arr instanceof Float32Array ||
					arr instanceof Uint8Array ||
					arr instanceof Uint16Array ||
					arr instanceof Uint32Array
				) {
					// For typed arrays, fill with zeros
					arr.fill(0);
				} else if (Array.isArray(arr)) {
					// For regular arrays, set length to zero
					arr.length = 0;
				}
			} else if (this.trackedObjectProperties.has(key)) {
				// For objects, clear all properties
				const subObj = obj[key];
				if (subObj && typeof subObj === 'object') {
					for (const subKey in subObj) {
						if (Object.prototype.hasOwnProperty.call(subObj, subKey)) {
							subObj[subKey] = null;
						}
					}
				}
			} else {
				// For primitive types, reset to default values
				switch (type) {
					case 'number':
						obj[key] = 0;
						break;
					case 'string':
						obj[key] = '';
						break;
					case 'boolean':
						obj[key] = false;
						break;
					case 'object':
						obj[key] = null;
						break;
					// Functions and other types are left unchanged
				}
			}
		}

		// Mark as not in use
		obj.inUse = false;
	}

	/**
	 * Optimization: Add batch statistics reporting
	 * Benefit: Reduces store updates and potential re-renders
	 */
	private scheduleBatchStatsUpdate(force: boolean = false): void {
		if (this.statsUpdateScheduled && !force) return;

		// Only schedule update if we've accumulated enough operations or force update
		if (
			!force &&
			this.pendingStatsUpdates.created + this.pendingStatsUpdates.reused < this.statsReportThreshold
		) {
			return;
		}

		this.statsUpdateScheduled = true;

		// Use requestAnimationFrame for stats updates to align with rendering
		if (browser && typeof requestAnimationFrame !== 'undefined') {
			requestAnimationFrame(() => {
				this.flushStats();
			});
		} else {
			// Fallback if requestAnimationFrame is not available
			setTimeout(() => {
				this.flushStats();
			}, 0);
		}
	}

	/**
	 * Flush pending statistics updates
	 */
	private flushStats(): void {
		if (!browser) {
			this.statsUpdateScheduled = false;
			return;
		}

		if (this.pendingStatsUpdates.created > 0 || this.pendingStatsUpdates.reused > 0) {
			starPoolTracker.recordBatch(
				this.pendingStatsUpdates.created,
				this.pendingStatsUpdates.reused
			);

			this.pendingStatsUpdates.created = 0;
			this.pendingStatsUpdates.reused = 0;
		}

		this.statsUpdateScheduled = false;
	}

	/**
	 * Release an object back to the pool
	 * @param obj The object to release
	 */
	release(obj: T): void {
		if (!obj) return;

		const now = performance.now();
		obj.inUse = false;
		obj.lastAccessTime = now;

		// Update access time using poolIndex
		if (obj.poolIndex !== undefined && obj.poolIndex >= 0 && obj.poolIndex < this.size) {
			const index = obj.poolIndex;
			this.lastAccessTimes[index] = now;

			// Move to front of LRU list (least recently used)
			const currentPos = this.lruIndices.indexOf(index);
			if (currentPos >= 0) {
				this.lruIndices.splice(currentPos, 1);
				this.lruIndices.unshift(index);
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
			// Only perform deep reset if object was in use
			if (this.pool[i].inUse) {
				this.deepReset(this.pool[i]);
			}

			this.pool[i].inUse = false;
			this.pool[i].lastAccessTime = now;

			// Update access times
			this.lastAccessTimes[i] = now;
		}

		// Reset LRU indices to default order
		this.lruIndices = Array.from({ length: this.size }, (_, i) => i);

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
		estimatedMemoryUsed: number;
	} {
		const active = this.getActiveCount();
		const total = this.getTotalCount();
		const totalProcessed = this.objectsCreated + this.objectsReused;

		// Estimate memory usage (rough approximation)
		let estimatedMemoryUsed = 0;
		if (this.size > 0 && this.pool[0]) {
			// Count number of properties as a rough size estimate
			let propCount = 0;
			for (const key in this.pool[0]) {
				if (Object.prototype.hasOwnProperty.call(this.pool[0], key)) {
					propCount++;
				}
			}
			// Rough estimate: 8 bytes per property plus overhead
			estimatedMemoryUsed = this.size * propCount * 8;
		}

		return {
			active,
			total,
			usage: total > 0 ? active / total : 0,
			created: this.objectsCreated,
			reused: this.objectsReused,
			reuseRatio: totalProcessed > 0 ? this.objectsReused / totalProcessed : 0,
			estimatedMemoryUsed
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
    Est. memory: ${(stats.estimatedMemoryUsed / 1024).toFixed(2)} KB
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
			// Expand arrays
			const oldSize = this.size;

			// Create new tracking arrays
			const newLRUIndices = new Array(newCapacity);
			const newLastAccessTimes = new Array(newCapacity);
			const now = performance.now();

			// Copy existing tracking data
			for (let i = 0; i < this.size; i++) {
				newLRUIndices[i] = this.lruIndices[i];
				newLastAccessTimes[i] = this.lastAccessTimes[i];
			}

			// Create new objects to fill expanded capacity
			for (let i = this.size; i < newCapacity; i++) {
				const obj = this.factory();
				obj.inUse = false;
				obj.poolIndex = i;
				obj.lastAccessTime = now;
				this.pool[i] = obj;

				// Update tracking arrays
				newLRUIndices[i] = i;
				newLastAccessTimes[i] = now;

				this.objectsCreated++;

				// Track object creation for statistics
				if (browser) {
					this.pendingStatsUpdates.created++;
				}
			}

			// Update tracking arrays
			this.lruIndices = newLRUIndices;
			this.lastAccessTimes = newLastAccessTimes;

			// Add new LRU indices at the beginning (least recently used)
			for (let i = oldSize; i < newCapacity; i++) {
				// Remove if already in array (shouldn't happen)
				const existingIndex = this.lruIndices.indexOf(i);
				if (existingIndex !== -1) {
					this.lruIndices.splice(existingIndex, 1);
				}
				// Add at beginning as least recently used
				this.lruIndices.unshift(i);
			}

			this.size = newCapacity;

			// Force stats update for created objects
			if (browser) {
				this.scheduleBatchStatsUpdate(true);
			}
		}
		// If reducing capacity, keep the most recently used objects
		else if (newCapacity < this.capacity) {
			// Determine which objects to keep based on LRU order
			const indicesToKeep = new Set<number>();

			// First, add all active objects to the keep set
			for (let i = 0; i < this.size; i++) {
				if (this.pool[i].inUse) {
					indicesToKeep.add(i);
				}
			}

			// Then, add most recently used inactive objects until we reach capacity
			for (let i = this.lruIndices.length - 1; i >= 0 && indicesToKeep.size < newCapacity; i--) {
				const index = this.lruIndices[i];
				if (!this.pool[index].inUse) {
					indicesToKeep.add(index);
				}
			}

			// Create new arrays with proper capacity
			const newPool: T[] = new Array(newCapacity);
			const newLRUIndices = new Array(newCapacity);
			const newLastAccessTimes = new Array(newCapacity);

			// Map old indices to new indices
			const indexMap = new Map<number, number>();
			let newIndex = 0;

			// Copy kept objects and update their poolIndex
			for (let oldIndex = 0; oldIndex < this.size; oldIndex++) {
				if (indicesToKeep.has(oldIndex)) {
					newPool[newIndex] = this.pool[oldIndex];
					newPool[newIndex].poolIndex = newIndex;
					newLastAccessTimes[newIndex] = this.lastAccessTimes[oldIndex];

					// Map old index to new index
					indexMap.set(oldIndex, newIndex);
					newIndex++;
				} else {
					// Clean up discarded objects
					this.cleanupObject(this.pool[oldIndex]);
				}
			}

			// Rebuild LRU indices using the mapping
			for (let i = 0; i < this.lruIndices.length && i < newCapacity; i++) {
				const oldIndex = this.lruIndices[i];
				if (indexMap.has(oldIndex)) {
					newLRUIndices[i] = indexMap.get(oldIndex)!;
				}
			}

			// Update pool and tracking arrays
			this.pool = newPool;
			this.lruIndices = newLRUIndices;
			this.lastAccessTimes = newLastAccessTimes;
			this.size = newCapacity;
		}

		// Update capacity
		this.capacity = newCapacity;

		// Report updated stats
		this.reportPoolStats();
	}

	/**
	 * Optimization: Enhanced hibernation for memory optimization
	 * Benefit: More aggressive memory reclamation for inactive objects
	 * @param unusedTimeThreshold Time in ms before considering an object for hibernation
	 * @param forceAll Force hibernation of all inactive objects
	 */
	hibernateUnusedObjects(unusedTimeThreshold: number = 30000, forceAll: boolean = false): void {
		const now = performance.now();

		// Only check every 5 seconds to reduce overhead
		if (!forceAll && now - this.lastHibernationCheck < 5000) return;
		this.lastHibernationCheck = now;

		let hibernatedCount = 0;
		const threshold = forceAll ? 0 : unusedTimeThreshold;

		// Check for objects unused for the threshold period
		for (let i = 0; i < this.size; i++) {
			if (!this.pool[i].inUse && (forceAll || now - this.lastAccessTimes[i] > threshold)) {
				// Deeply clean object properties
				this.hibernateObject(this.pool[i]);
				hibernatedCount++;
			}
		}

		// If significant hibernation occurred, hint GC
		if (hibernatedCount > 0) {
			if (hibernatedCount > this.size * 0.1 || forceAll) {
				this.hintGarbageCollection();
			}

			// Report stats update
			this.reportPoolStats();
		}
	}

	/**
	 * Hibernate a single object by clearing its memory usage
	 */
	private hibernateObject(obj: T): void {
		if (!obj) return;

		// Perform deep cleanup of the object
		for (const key in obj) {
			// Skip special pool properties
			if (key === 'inUse' || key === 'poolIndex' || key === 'lastAccessTime') continue;

			const value = obj[key];

			// Handle arrays specially
			if (Array.isArray(value)) {
				value.length = 0;
			}
			// Handle TypedArrays specially
			else if (
				value instanceof Float32Array ||
				value instanceof Uint8Array ||
				value instanceof Uint16Array ||
				value instanceof Uint32Array
			) {
				value.fill(0);
			}
			// Set object properties to null
			else if (typeof value === 'object' && value !== null) {
				obj[key] = null;
			}
			// Reset primitives to default values
			else {
				switch (typeof value) {
					case 'number':
						obj[key] = 0;
						break;
					case 'string':
						obj[key] = '';
						break;
					case 'boolean':
						obj[key] = false;
						break;
					// Functions left unchanged
				}
			}
		}
	}

	/**
	 * Cleanup a single object's resources
	 */
	private cleanupObject(obj: T): void {
		if (!obj) return;

		// First, try to use object's own cleanup method if available
		if (typeof obj.cleanup === 'function') {
			try {
				obj.cleanup();
			} catch (e) {
				// Ignore errors in cleanup
				console.warn('Error during object cleanup:', e);
			}
		} else if (typeof obj.destroy === 'function') {
			try {
				obj.destroy();
			} catch (e) {
				// Ignore errors in destroy
				console.warn('Error during object destroy:', e);
			}
		}

		// Then do our own deep cleanup
		this.hibernateObject(obj);

		// Break circular references
		obj.poolIndex = undefined;
		obj.lastAccessTime = undefined;
	}

	/**
	 * Optimization: Add GC hint function
	 * Benefit: Encourages browser to collect garbage when appropriate
	 */
	private hintGarbageCollection(): void {
		if (!browser) return;

		// Create and discard temporary objects to hint GC
		const tempArrays = [];
		for (let i = 0; i < 10; i++) {
			tempArrays.push(new Array(1000).fill(0));
		}

		// Clear references
		for (let i = 0; i < tempArrays.length; i++) {
			tempArrays[i] = null;
		}

		// Try to use GC if available (Chrome dev tools)
		if (typeof window !== 'undefined' && (window as any).gc) {
			try {
				(window as any).gc();
			} catch (e) {
				// GC not available, ignore
			}
		}
	}

	/**
	 * Enhanced cleanup and deallocation for StarPool
	 */
	public destroy(): void {
		// 1. First release and clean up all objects
		this.releaseAll();
		this.hibernateUnusedObjects(0, true); // Force hibernation of all objects

		// 2. Deep cleanup of all objects
		for (let i = 0; i < this.size; i++) {
			this.cleanupObject(this.pool[i]);
			this.pool[i] = null;
		}

		// 3. Clear the pool array and tracking arrays
		this.pool = null;
		this.lruIndices = null;
		this.lastAccessTimes = null;

		// 4. Clear property tracking
		this.propertyTypes.clear();
		this.trackedArrayProperties.clear();
		this.trackedObjectProperties.clear();

		// 5. Clear stats to prevent memory leaks through closures
		this.objectsCreated = 0;
		this.objectsReused = 0;
		this.pendingStatsUpdates.created = 0;
		this.pendingStatsUpdates.reused = 0;

		// 6. Flush any pending stats before destruction
		if (this.statsUpdateScheduled) {
			this.flushStats();
		}

		// 7. De-reference factory and reset functions that might hold closures
		this.factory = null;
		this.reset = null;

		// 8. Hint garbage collection
		this.hintGarbageCollection();
	}
}

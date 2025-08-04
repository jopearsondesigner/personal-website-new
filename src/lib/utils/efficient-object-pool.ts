// src/lib/utils/efficient-object-pool.ts
import { browser } from '$app/environment';

/**
 * Base interface for poolable objects
 */
export interface PoolableObject {
	__pooled?: boolean; // Minimal pool tracking
}

/**
 * Object factory function type
 */
export type ObjectFactory<T> = () => T;

/**
 * Object reset function type
 */
export type ObjectReset<T> = (obj: T) => void;

/**
 * Pool statistics interface
 */
export interface PoolStatistics {
	name: string;
	type: string;
	capacity: number;
	active: number;
	available: number;
	utilizationRate: number;
	totalCreated: number;
	totalReused: number;
	reuseRatio: number;
	memoryEstimate: number;
	operationsPerSecond: number;
}

/**
 * Pool configuration options
 */
export interface PoolConfig {
	name: string;
	initialCapacity: number;
	maxCapacity?: number;
	preAllocate?: boolean;
	enableStatistics?: boolean;
	objectSizeEstimate?: number;
	resetOnRelease?: boolean;
	validateObjects?: boolean;
}

/**
 * EfficientObjectPool - High-performance generic object pool
 *
 * Key optimizations:
 * - Stack-based allocation (O(1) get/release)
 * - Zero-allocation hot paths
 * - Minimal object metadata
 * - Batched statistics updates
 * - Memory leak prevention
 */
export class EfficientObjectPool<T extends PoolableObject> {
	private readonly config: Required<PoolConfig>;
	private readonly factory: ObjectFactory<T>;
	private readonly reset: ObjectReset<T>;

	// Core pool storage - simple array for maximum performance
	private readonly pool: T[] = [];
	private readonly inUse = new Set<T>(); // Track active objects for statistics only

	// Statistics (batched for performance)
	private stats = {
		totalCreated: 0,
		totalReused: 0,
		lastOperationTime: 0,
		operationCount: 0,
		lastStatsUpdate: 0
	};

	// Performance optimization flags
	private statsUpdateScheduled = false;
	private readonly statsUpdateInterval = 1000; // Update stats every 1s

	constructor(factory: ObjectFactory<T>, reset: ObjectReset<T>, config: PoolConfig) {
		this.factory = factory;
		this.reset = reset;

		// Merge with defaults
		this.config = {
			maxCapacity: config.initialCapacity * 2,
			preAllocate: true,
			enableStatistics: true,
			objectSizeEstimate: 200,
			resetOnRelease: true,
			validateObjects: false,
			...config
		} as Required<PoolConfig>;

		// Pre-allocate objects if requested
		if (this.config.preAllocate) {
			this.preAllocateObjects();
		}

		// Setup statistics updates
		if (this.config.enableStatistics && browser) {
			this.scheduleStatsUpdate();
		}
	}

	/**
	 * Pre-allocate objects to avoid runtime allocation
	 */
	private preAllocateObjects(): void {
		for (let i = 0; i < this.config.initialCapacity; i++) {
			const obj = this.factory();
			obj.__pooled = true;
			this.pool.push(obj);
			this.stats.totalCreated++;
		}
	}

	/**
	 * Get object from pool - Zero allocation hot path
	 */
	public get(): T {
		const now = browser ? performance.now() : 0;
		let obj: T;

		// Try to reuse from pool first
		if (this.pool.length > 0) {
			obj = this.pool.pop()!;
			this.stats.totalReused++;
		} else {
			// Create new object if pool is empty
			obj = this.factory();
			obj.__pooled = true;
			this.stats.totalCreated++;
		}

		// Track as active
		this.inUse.add(obj);

		// Update operation stats
		this.stats.lastOperationTime = now;
		this.stats.operationCount++;

		return obj;
	}

	/**
	 * Release object back to pool - Zero allocation hot path
	 */
	public release(obj: T): void {
		if (!obj || !obj.__pooled) {
			console.warn('Attempted to release non-pooled object');
			return;
		}

		// Remove from active tracking
		if (!this.inUse.delete(obj)) {
			console.warn('Attempted to release object not from this pool');
			return;
		}

		// Reset object if configured
		if (this.config.resetOnRelease) {
			try {
				this.reset(obj);
			} catch (error) {
				console.error('Error resetting object:', error);
				// Don't return to pool if reset failed
				return;
			}
		}

		// Check pool capacity
		if (this.pool.length < this.config.maxCapacity) {
			this.pool.push(obj);
		} else {
			// Pool is full, let object be garbage collected
			obj.__pooled = false;
		}

		// Update operation stats
		this.stats.operationCount++;
	}

	/**
	 * Release multiple objects efficiently
	 */
	public releaseAll(objects: T[]): void {
		for (let i = 0; i < objects.length; i++) {
			this.release(objects[i]);
		}
	}

	/**
	 * Get current pool statistics
	 */
	public getStatistics(): PoolStatistics {
		const now = browser ? performance.now() : 0;
		const totalOperations = this.stats.totalCreated + this.stats.totalReused;
		const timeSinceLastOp = now - this.stats.lastOperationTime;

		return {
			name: this.config.name,
			type: 'EfficientObjectPool',
			capacity: this.config.maxCapacity,
			active: this.inUse.size,
			available: this.pool.length,
			utilizationRate: this.inUse.size / this.config.maxCapacity,
			totalCreated: this.stats.totalCreated,
			totalReused: this.stats.totalReused,
			reuseRatio: totalOperations > 0 ? this.stats.totalReused / totalOperations : 0,
			memoryEstimate: (this.stats.totalCreated * this.config.objectSizeEstimate) / 1024, // KB
			operationsPerSecond:
				timeSinceLastOp > 0 ? this.stats.operationCount / (timeSinceLastOp / 1000) : 0
		};
	}

	/**
	 * Schedule periodic statistics updates
	 */
	private scheduleStatsUpdate(): void {
		if (!browser || this.statsUpdateScheduled) return;

		this.statsUpdateScheduled = true;

		setTimeout(() => {
			this.updateStatistics();
			this.statsUpdateScheduled = false;

			// Schedule next update
			if (this.config.enableStatistics) {
				this.scheduleStatsUpdate();
			}
		}, this.statsUpdateInterval);
	}

	/**
	 * Update statistics and emit events
	 */
	private updateStatistics(): void {
		const stats = this.getStatistics();

		// Emit custom event for statistics tracking
		if (browser) {
			const event = new CustomEvent('poolStatistics', {
				detail: { poolName: this.config.name, statistics: stats }
			});
			window.dispatchEvent(event);
		}

		this.stats.lastStatsUpdate = browser ? performance.now() : 0;
	}

	/**
	 * Trim excess objects from pool to save memory
	 */
	public trim(targetSize?: number): number {
		const target = targetSize ?? this.config.initialCapacity;
		const excess = Math.max(0, this.pool.length - target);

		if (excess > 0) {
			// Remove excess objects
			const removed = this.pool.splice(0, excess);

			// Clear pool references
			for (const obj of removed) {
				obj.__pooled = false;
			}
		}

		return excess;
	}

	/**
	 * Clear all objects from pool
	 */
	public clear(): void {
		// Clear pool references
		for (const obj of this.pool) {
			obj.__pooled = false;
		}

		// Clear active references
		for (const obj of this.inUse) {
			obj.__pooled = false;
		}

		this.pool.length = 0;
		this.inUse.clear();

		// Reset statistics
		this.stats = {
			totalCreated: 0,
			totalReused: 0,
			lastOperationTime: 0,
			operationCount: 0,
			lastStatsUpdate: 0
		};
	}

	/**
	 * Validate pool integrity (development only)
	 */
	public validate(): boolean {
		if (!this.config.validateObjects) return true;

		let isValid = true;

		// Check for duplicate objects in pool
		const poolSet = new Set(this.pool);
		if (poolSet.size !== this.pool.length) {
			console.error('Pool contains duplicate objects');
			isValid = false;
		}

		// Check for objects in both pool and active sets
		for (const obj of this.pool) {
			if (this.inUse.has(obj)) {
				console.error('Object found in both pool and active sets');
				isValid = false;
			}
		}

		return isValid;
	}

	/**
	 * Destroy pool and cleanup all references
	 */
	public destroy(): void {
		this.clear();
		this.statsUpdateScheduled = false;
	}
}

/**
 * Pool factory for creating optimized pools for specific object types
 */
export class PoolFactory {
	private static pools = new Map<string, EfficientObjectPool<any>>();

	/**
	 * Create or get existing pool
	 */
	static getPool<T extends PoolableObject>(
		name: string,
		factory: ObjectFactory<T>,
		reset: ObjectReset<T>,
		config: Omit<PoolConfig, 'name'>
	): EfficientObjectPool<T> {
		if (!this.pools.has(name)) {
			const pool = new EfficientObjectPool(factory, reset, { ...config, name });
			this.pools.set(name, pool);
		}

		return this.pools.get(name)!;
	}

	/**
	 * Get all pool statistics
	 */
	static getAllStatistics(): PoolStatistics[] {
		return Array.from(this.pools.values()).map((pool) => pool.getStatistics());
	}

	/**
	 * Cleanup all pools
	 */
	static cleanup(): void {
		for (const pool of this.pools.values()) {
			pool.destroy();
		}
		this.pools.clear();
	}
}

/**
 * Star object interface
 */
export interface PooledStar extends PoolableObject {
	x: number;
	y: number;
	z: number;
	prevX: number;
	prevY: number;
	size: number;
	color: string;
	alpha: number;
	velocity: { x: number; y: number; z: number };
	age: number;
	maxAge: number;
	isVisible: boolean;
}

/**
 * Canvas context interface
 */
export interface PooledCanvas extends PoolableObject {
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
	width: number;
	height: number;
	devicePixelRatio: number;
}

/**
 * Render batch interface
 */
export interface PooledRenderBatch extends PoolableObject {
	positions: Float32Array;
	colors: Uint8Array;
	sizes: Float32Array;
	count: number;
}

/**
 * Factory functions for common object types
 */
export const ObjectFactories = {
	/**
	 * Star object factory
	 */
	createStar: (): PooledStar => ({
		__pooled: true,
		x: 0,
		y: 0,
		z: 0,
		prevX: 0,
		prevY: 0,
		size: 1,
		color: '#ffffff',
		alpha: 1,
		velocity: { x: 0, y: 0, z: 0 },
		age: 0,
		maxAge: 10000,
		isVisible: false
	}),

	/**
	 * Canvas object factory
	 */
	createCanvas: (): PooledCanvas => {
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d')!;

		return {
			__pooled: true,
			canvas,
			ctx,
			width: 0,
			height: 0,
			devicePixelRatio: 1
		};
	},

	/**
	 * Render batch factory
	 */
	createRenderBatch: (): PooledRenderBatch => ({
		__pooled: true,
		positions: new Float32Array(300), // 100 stars * 3 coords
		colors: new Uint8Array(400), // 100 stars * 4 RGBA
		sizes: new Float32Array(100), // 100 star sizes
		count: 0
	})
};

/**
 * Reset functions for common object types
 */
export const ObjectResets = {
	/**
	 * Reset star object
	 */
	resetStar: (star: PooledStar): void => {
		star.x = 0;
		star.y = 0;
		star.z = 0;
		star.prevX = 0;
		star.prevY = 0;
		star.size = 1;
		star.color = '#ffffff';
		star.alpha = 1;
		star.velocity.x = 0;
		star.velocity.y = 0;
		star.velocity.z = 0;
		star.age = 0;
		star.maxAge = 10000;
		star.isVisible = false;
	},

	/**
	 * Reset canvas object
	 */
	resetCanvas: (canvas: PooledCanvas): void => {
		// Clear canvas
		canvas.ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Reset context state
		canvas.ctx.globalAlpha = 1;
		canvas.ctx.globalCompositeOperation = 'source-over';
		canvas.ctx.setTransform(1, 0, 0, 1, 0, 0);

		// Reset properties
		canvas.width = 0;
		canvas.height = 0;
		canvas.devicePixelRatio = 1;
	},

	/**
	 * Reset render batch
	 */
	resetRenderBatch: (batch: PooledRenderBatch): void => {
		batch.count = 0;
		// Keep typed arrays allocated for reuse
	}
};

/**
 * Pre-configured pools for common use cases
 */
export const CommonPools = {
	/**
	 * Get star pool
	 */
	getStarPool: () =>
		PoolFactory.getPool('stars', ObjectFactories.createStar, ObjectResets.resetStar, {
			initialCapacity: 500,
			maxCapacity: 1000,
			objectSizeEstimate: 240, // ~240 bytes per star
			preAllocate: true
		}),

	/**
	 * Get canvas pool
	 */
	getCanvasPool: () =>
		PoolFactory.getPool('canvases', ObjectFactories.createCanvas, ObjectResets.resetCanvas, {
			initialCapacity: 5,
			maxCapacity: 10,
			objectSizeEstimate: 1024, // ~1KB per canvas
			preAllocate: false // Don't pre-allocate canvases
		}),

	/**
	 * Get render batch pool
	 */
	getRenderBatchPool: () =>
		PoolFactory.getPool(
			'renderBatches',
			ObjectFactories.createRenderBatch,
			ObjectResets.resetRenderBatch,
			{
				initialCapacity: 10,
				maxCapacity: 20,
				objectSizeEstimate: 2048, // ~2KB per batch
				preAllocate: true
			}
		)
};

/**
 * Global pool statistics aggregator
 */
export class PoolStatisticsAggregator {
	private static instance: PoolStatisticsAggregator;
	private listeners: Array<(stats: PoolStatistics[]) => void> = [];

	private constructor() {
		if (browser) {
			// Listen for pool statistics events
			window.addEventListener('poolStatistics', this.handlePoolStatistics as EventListener);
		}
	}

	static getInstance(): PoolStatisticsAggregator {
		if (!this.instance) {
			this.instance = new PoolStatisticsAggregator();
		}
		return this.instance;
	}

	private handlePoolStatistics = (event: Event) => {
		// Cast to CustomEvent to access detail property
		const customEvent = event as CustomEvent;
		// Aggregate all pool statistics and notify listeners
		const allStats = PoolFactory.getAllStatistics();
		this.notifyListeners(allStats);
	};

	/**
	 * Add statistics listener
	 */
	addListener(listener: (stats: PoolStatistics[]) => void): () => void {
		this.listeners.push(listener);

		// Immediately notify with current stats
		const allStats = PoolFactory.getAllStatistics();
		listener(allStats);

		return () => {
			this.listeners = this.listeners.filter((l) => l !== listener);
		};
	}

	private notifyListeners(stats: PoolStatistics[]): void {
		for (const listener of this.listeners) {
			try {
				listener(stats);
			} catch (error) {
				console.error('Error in pool statistics listener:', error);
			}
		}
	}

	/**
	 * Get current aggregated statistics
	 */
	getAggregatedStats(): {
		totalPools: number;
		totalObjects: number;
		totalActive: number;
		averageUtilization: number;
		totalReuseRatio: number;
		totalMemoryEstimate: number;
	} {
		const allStats = PoolFactory.getAllStatistics();

		if (allStats.length === 0) {
			return {
				totalPools: 0,
				totalObjects: 0,
				totalActive: 0,
				averageUtilization: 0,
				totalReuseRatio: 0,
				totalMemoryEstimate: 0
			};
		}

		const totalObjects = allStats.reduce((sum, stat) => sum + stat.capacity, 0);
		const totalActive = allStats.reduce((sum, stat) => sum + stat.active, 0);
		const totalOperations = allStats.reduce(
			(sum, stat) => sum + stat.totalCreated + stat.totalReused,
			0
		);
		const totalReused = allStats.reduce((sum, stat) => sum + stat.totalReused, 0);

		return {
			totalPools: allStats.length,
			totalObjects,
			totalActive,
			averageUtilization: totalObjects > 0 ? totalActive / totalObjects : 0,
			totalReuseRatio: totalOperations > 0 ? totalReused / totalOperations : 0,
			totalMemoryEstimate: allStats.reduce((sum, stat) => sum + stat.memoryEstimate, 0)
		};
	}

	/**
	 * Cleanup
	 */
	cleanup(): void {
		if (browser) {
			window.removeEventListener('poolStatistics', this.handlePoolStatistics as EventListener);
		}
		this.listeners = [];
	}
}

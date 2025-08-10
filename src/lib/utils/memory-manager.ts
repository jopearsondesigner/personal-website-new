// src/lib/utils/memory-manager.ts
import { browser } from '$app/environment';
import { writable, derived, type Writable } from 'svelte/store';

/**
 * Memory usage information interface
 */
export interface MemoryInfo {
	usedJSHeapSize: number;
	totalJSHeapSize: number;
	jsHeapSizeLimit: number;
	usagePercentage: number;
	availableMB: number;
	usedMB: number;
	limitMB: number;
	timestamp: number;
}

/**
 * Memory pressure levels
 */
export type MemoryPressure = 'low' | 'medium' | 'high' | 'critical';

/**
 * Memory event interface
 */
export interface MemoryEvent {
	type: 'warning' | 'critical' | 'cleanup' | 'optimization' | 'gc' | 'pressure';
	timestamp: number;
	memoryInfo: MemoryInfo;
	action?: string;
	severity: 'info' | 'warning' | 'critical';
	details: string;
}

/**
 * Object pool statistics interface (generic)
 */
export interface ObjectPoolStats {
	totalCapacity: number;
	activeObjects: number;
	utilizationRate: number;
	objectsCreated: number;
	objectsReused: number;
	reuseRatio: number;
	estimatedMemorySaved: number; // in KB (approx)
	poolName: string;
	poolType: string; // e.g., "Effect", "Geometry", "Generic"
}

/**
 * Memory optimization configuration
 */
export interface MemoryOptimizationConfig {
	enableAggressiveGC: boolean;
	maxMemoryUsage: number; // MB guardrail (advisory)
	gcThreshold: number; // 0..1 (usagePercentage) to hint GC
	hibernationEnabled: boolean;
	hibernationDelay: number; // ms
	poolSizeLimit: number;
	enableMemoryWarnings: boolean;
	logMemoryStats: boolean;
	monitoringInterval: number; // ms
	batchUpdateInterval: number; // ms
}

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
	fps: number;
	frameTime: number;
	quality: number;
	renderTime: number;
	updateTime: number;
}

/**
 * Unified Memory Manager
 * Single source of truth for all memory management operations
 * Generalized (no star-field specific logic)
 */
class MemoryManager {
	// Configuration
	private config: MemoryOptimizationConfig;

	// Core state
	private isInitialized = false;
	private isMonitoring = false;
	private currentMemoryInfo: MemoryInfo | null = null;
	private currentPressure: MemoryPressure = 'low';
	private performanceMetrics: PerformanceMetrics;

	// Memory history and events
	private memoryHistory: MemoryInfo[] = [];
	private memoryEvents: MemoryEvent[] = [];
	private maxHistorySize = 100;
	private maxEventsSize = 50;

	// Object pools registry
	private objectPools = new Map<string, any[]>();
	private poolStats = new Map<string, ObjectPoolStats>();

	// Monitoring and batching
	private monitoringRAFId: number | null = null;
	private batchUpdateTimer: ReturnType<typeof setTimeout> | null = null;
	private lastMonitorTime = 0;

	// Cleanup management
	private cleanupTasks: Array<() => void> = [];
	private emergencyCleanupCallbacks: Array<() => void> = [];

	// Event listeners
	private memoryListeners: Array<(info: MemoryInfo) => void> = [];
	private eventListeners: Array<(event: MemoryEvent) => void> = [];
	private pressureListeners: Array<(pressure: MemoryPressure) => void> = [];

	// Performance optimization flags
	private isPageHidden = false;
	private lastGCTime = 0;
	private gcCooldownPeriod = 5000;

	// Batch update queue
	private pendingStoreUpdates = new Map<string, any>();
	private storeUpdateQueue: Array<() => void> = [];

	// Memory thresholds
	private readonly THRESHOLDS = {
		MEDIUM_PRESSURE: 0.6,
		HIGH_PRESSURE: 0.75,
		CRITICAL_PRESSURE: 0.9,
		CLEANUP_THRESHOLD: 0.85,
		GC_THRESHOLD: 0.8
	};

	constructor(config?: Partial<MemoryOptimizationConfig>) {
		// Default configuration optimized for minimal overhead
		this.config = {
			enableAggressiveGC: false,
			maxMemoryUsage: 512,
			gcThreshold: 0.8,
			hibernationEnabled: true,
			hibernationDelay: 30000,
			poolSizeLimit: 1000,
			enableMemoryWarnings: true,
			logMemoryStats: false,
			monitoringInterval: 2000, // 2 seconds
			batchUpdateInterval: 500, // half second
			...config
		};

		// Initialize performance metrics
		this.performanceMetrics = {
			fps: 60,
			frameTime: 16.67,
			quality: 1.0,
			renderTime: 0,
			updateTime: 0
		};

		if (browser) {
			this.safeInitialize();
		}
	}

	/**
	 * Safe initialization that only runs in browser context
	 */
	private safeInitialize(): void {
		if (!browser || this.isInitialized) return;

		try {
			if (!this.isMemoryAPIAvailable() && this.config.logMemoryStats) {
				console.warn('Memory API not available - using fallback estimation');
			}

			// Initialize generic/default pools (no star-field specifics)
			this.initializeDefaultPools();

			// Setup event listeners
			this.setupEventListeners();

			// Start monitoring
			this.startMonitoring();

			// Start batch updates
			this.initializeBatchUpdates();

			this.isInitialized = true;

			if (this.config.logMemoryStats) {
				console.log('🧠 MemoryManager initialized');
			}
		} catch (error) {
			console.error('Error initializing MemoryManager:', error);
		}
	}

	/**
	 * Check if the Memory API is available
	 */
	private isMemoryAPIAvailable(): boolean {
		return (
			browser &&
			'performance' in window &&
			'memory' in (performance as any) &&
			typeof (performance as any).memory === 'object'
		);
	}

	/**
	 * Initialize default object pools (generic)
	 */
	private initializeDefaultPools(): void {
		// Generic effect object pool
		this.createObjectPool(
			'visual-effects',
			() => ({
				inUse: false,
				reset() {
					this.inUse = false;
				}
			}),
			200
		);

		// Render batch pool (generic typed arrays kept for reuse)
		this.createObjectPool(
			'render-batches',
			() => ({
				positions: new Float32Array(100),
				colors: new Uint8Array(400),
				sizes: new Float32Array(100),
				count: 0,
				reset() {
					this.count = 0;
				}
			}),
			10
		);

		// Performance snapshot pool (generic)
		this.createObjectPool(
			'perf-snapshots',
			() => ({
				timestamp: 0,
				fps: 0,
				frameTime: 0,
				memoryUsage: 0,
				reset() {
					this.timestamp = 0;
					this.fps = 0;
					this.frameTime = 0;
					this.memoryUsage = 0;
				}
			}),
			20
		);
	}

	/**
	 * Setup event listeners for page lifecycle
	 */
	private setupEventListeners(): void {
		if (!browser) return;

		document.addEventListener('visibilitychange', this.handleVisibilityChange);
		window.addEventListener('beforeunload', this.handlePageUnload);

		// Memory pressure events (if supported)
		if ('memory' in navigator && 'addEventListener' in (navigator as any).memory) {
			try {
				(navigator as any).memory.addEventListener('pressure', this.handleMemoryPressureEvent);
			} catch {
				/* ignore */
			}
		}

		// Custom events
		window.addEventListener('memoryOptimization', this.handleMemoryOptimizationEvent);
		window.addEventListener('memoryHibernation', this.handleMemoryHibernationEvent);
	}

	/**
	 * Start the unified monitoring system
	 */
	public startMonitoring(): void {
		if (!browser || this.isMonitoring) return;

		this.isMonitoring = true;
		this.scheduleMonitoringCheck();

		if (this.config.logMemoryStats) {
			console.log('📊 Unified memory monitoring started');
		}
	}

	/**
	 * Stop monitoring
	 */
	public stopMonitoring(): void {
		if (!this.isMonitoring) return;
		this.isMonitoring = false;

		if (this.monitoringRAFId !== null) {
			cancelAnimationFrame(this.monitoringRAFId);
			this.monitoringRAFId = null;
		}

		if (this.config.logMemoryStats) {
			console.log('⏹️ Unified memory monitoring stopped');
		}
	}

	/**
	 * Schedule next monitoring check using RAF for optimal performance
	 */
	private scheduleMonitoringCheck(): void {
		if (!this.isMonitoring || !browser) return;

		this.monitoringRAFId = requestAnimationFrame((timestamp) => {
			// Only perform checks at specified intervals to reduce overhead
			if (timestamp - this.lastMonitorTime >= this.config.monitoringInterval) {
				this.performMonitoringCheck(timestamp);
				this.lastMonitorTime = timestamp;
			}

			// Schedule next check
			this.scheduleMonitoringCheck();
		});
	}

	/**
	 * Perform comprehensive monitoring check
	 */
	private performMonitoringCheck(timestamp: number): void {
		if (!browser || this.isPageHidden) return;

		try {
			const memoryInfo = this.getCurrentMemoryInfo(timestamp);
			if (!memoryInfo) return;

			this.currentMemoryInfo = memoryInfo;
			this.addToMemoryHistory(memoryInfo);
			this.detectGarbageCollection(memoryInfo);
			this.evaluateMemoryPressure(memoryInfo);
			this.updatePerformanceMetrics(timestamp);

			// Queue store updates (batched)
			this.scheduleBatchedStoreUpdate();

			// Perform periodic cleanup when necessary
			this.performPeriodicCleanup(memoryInfo);
		} catch (error) {
			console.error('Error in monitoring check:', error);
		}
	}

	/**
	 * Get current memory information with fallbacks
	 */
	private getCurrentMemoryInfo(timestamp: number): MemoryInfo | null {
		if (!browser) return null;

		try {
			if (this.isMemoryAPIAvailable()) {
				const memory = (performance as any).memory;
				const usedJSHeapSize = memory.usedJSHeapSize;
				const totalJSHeapSize = memory.totalJSHeapSize;
				const jsHeapSizeLimit = memory.jsHeapSizeLimit;

				return {
					usedJSHeapSize,
					totalJSHeapSize,
					jsHeapSizeLimit,
					usagePercentage: usedJSHeapSize / jsHeapSizeLimit,
					usedMB: usedJSHeapSize / (1024 * 1024),
					limitMB: jsHeapSizeLimit / (1024 * 1024),
					availableMB: (jsHeapSizeLimit - usedJSHeapSize) / (1024 * 1024),
					timestamp
				};
			} else {
				// Fallback estimation
				const estimatedUsage = this.estimateMemoryUsage();
				const estimatedLimit = 512 * 1024 * 1024; // 512MB

				return {
					usedJSHeapSize: estimatedUsage,
					totalJSHeapSize: estimatedUsage,
					jsHeapSizeLimit: estimatedLimit,
					usagePercentage: estimatedUsage / estimatedLimit,
					usedMB: estimatedUsage / (1024 * 1024),
					limitMB: estimatedLimit / (1024 * 1024),
					availableMB: (estimatedLimit - estimatedUsage) / (1024 * 1024),
					timestamp
				};
			}
		} catch (error) {
			console.warn('Error getting memory info:', error);
			return null;
		}
	}

	/**
	 * Estimate memory usage when Memory API is not available (generic)
	 */
	private estimateMemoryUsage(): number {
		let estimatedUsage = 0;

		// Estimate from object pools (assume ~160 bytes per pooled object on average)
		for (const [, stats] of this.poolStats) {
			const perObjectBytes = 160;
			estimatedUsage += stats.activeObjects * perObjectBytes;
		}

		// Estimate DOM overhead very roughly
		const elementCount = document.querySelectorAll('*').length;
		estimatedUsage += elementCount * 100; // ~100 bytes per element (very rough)

		// Base overhead
		estimatedUsage += 10 * 1024 * 1024; // 10MB baseline

		return estimatedUsage;
	}

	/**
	 * Add memory info to history with size management
	 */
	private addToMemoryHistory(memoryInfo: MemoryInfo): void {
		this.memoryHistory.push(memoryInfo);
		if (this.memoryHistory.length > this.maxHistorySize) {
			this.memoryHistory = this.memoryHistory.slice(-this.maxHistorySize);
		}
	}

	/**
	 * Detect garbage collection events (heuristic)
	 */
	private detectGarbageCollection(memoryInfo: MemoryInfo): boolean {
		if (this.memoryHistory.length < 2) return false;

		const previousInfo = this.memoryHistory[this.memoryHistory.length - 2];
		const memoryDrop = previousInfo.usedJSHeapSize - memoryInfo.usedJSHeapSize;
		const dropRatio = memoryDrop / Math.max(previousInfo.usedJSHeapSize, 1);

		const now = memoryInfo.timestamp;
		if (dropRatio > 0.1 && now - this.lastGCTime > this.gcCooldownPeriod) {
			this.lastGCTime = now;

			this.emitMemoryEvent({
				type: 'gc',
				timestamp: now,
				memoryInfo,
				severity: 'info',
				details: `Garbage collection detected. Memory reduced by ${(dropRatio * 100).toFixed(1)}%`
			});

			return true;
		}

		return false;
	}

	/**
	 * Evaluate memory pressure and take appropriate action
	 */
	private evaluateMemoryPressure(memoryInfo: MemoryInfo): void {
		const usage = memoryInfo.usagePercentage;
		let newPressure: MemoryPressure =
			usage >= this.THRESHOLDS.CRITICAL_PRESSURE
				? 'critical'
				: usage >= this.THRESHOLDS.HIGH_PRESSURE
					? 'high'
					: usage >= this.THRESHOLDS.MEDIUM_PRESSURE
						? 'medium'
						: 'low';

		if (newPressure !== this.currentPressure) {
			const prev = this.currentPressure;
			this.currentPressure = newPressure;

			this.emitMemoryEvent({
				type: 'pressure',
				timestamp: memoryInfo.timestamp,
				memoryInfo,
				severity:
					newPressure === 'critical' ? 'critical' : newPressure === 'high' ? 'warning' : 'info',
				details: `Memory pressure changed from ${prev} to ${newPressure}`
			});

			this.notifyPressureListeners(newPressure);
			this.handleMemoryPressure(newPressure, memoryInfo);
		}
	}

	/**
	 * Handle memory pressure with appropriate responses (generic)
	 */
	private handleMemoryPressure(pressure: MemoryPressure, memoryInfo: MemoryInfo): void {
		switch (pressure) {
			case 'medium':
				this.cleanupObjectPools();
				this.emitCustomEvent('memoryOptimization', {
					type: 'reduce_quality',
					factor: 0.85,
					reason: 'medium_pressure'
				});
				if (this.config.logMemoryStats) console.log('🟡 Medium memory pressure');
				break;
			case 'high':
				this.cleanupObjectPools();
				this.clearOldHistory();
				this.requestGarbageCollection();
				this.emitCustomEvent('memoryOptimization', {
					type: 'reduce_effects',
					factor: 0.6,
					reason: 'high_pressure'
				});
				if (this.config.logMemoryStats) console.log('🟠 High memory pressure');
				break;
			case 'critical':
				this.performEmergencyCleanup();
				this.requestGarbageCollection(true);
				this.emitCustomEvent('memoryOptimization', {
					type: 'emergency_mode',
					factor: 0.3,
					reason: 'critical_pressure'
				});
				console.error('🔴 Critical memory pressure');
				break;
			case 'low':
				// no-op
				break;
		}
	}

	/**
	 * Update performance metrics
	 */
	private updatePerformanceMetrics(timestamp: number): void {
		if (this.lastMonitorTime > 0) {
			const dt = timestamp - this.lastMonitorTime;
			this.performanceMetrics.frameTime = dt;
			this.performanceMetrics.fps = dt > 0 ? 1000 / dt : 60;
		}
		this.performanceMetrics.updateTime = performance.now() - timestamp;
	}

	/**
	 * Initialize batched store update system
	 */
	private initializeBatchUpdates(): void {
		if (this.batchUpdateTimer) clearTimeout(this.batchUpdateTimer);
		this.scheduleBatchUpdate();
	}

	/**
	 * Queue/store batched updates
	 */
	private scheduleBatchedStoreUpdate(): void {
		if (!this.currentMemoryInfo) return;
		this.pendingStoreUpdates.set('memoryInfo', this.currentMemoryInfo);
		this.pendingStoreUpdates.set('memoryPressure', this.currentPressure);
		this.pendingStoreUpdates.set('performanceMetrics', { ...this.performanceMetrics });
	}

	/**
	 * Schedule next batch update
	 */
	private scheduleBatchUpdate(): void {
		if (!browser) return;
		this.batchUpdateTimer = setTimeout(() => {
			this.processBatchedUpdates();
			this.scheduleBatchUpdate();
		}, this.config.batchUpdateInterval);
	}

	/**
	 * Process pending batched updates
	 */
	private processBatchedUpdates(): void {
		if (this.pendingStoreUpdates.size === 0) return;

		try {
			const memoryInfo = this.pendingStoreUpdates.get('memoryInfo');
			if (memoryInfo) this.notifyMemoryListeners(memoryInfo);

			const memoryPressure = this.pendingStoreUpdates.get('memoryPressure');
			if (memoryPressure) this.notifyPressureListeners(memoryPressure);

			while (this.storeUpdateQueue.length > 0) {
				const updateFn = this.storeUpdateQueue.shift();
				if (updateFn) updateFn();
			}

			this.pendingStoreUpdates.clear();
		} catch (error) {
			console.error('Error processing batched updates:', error);
		}
	}

	/**
	 * Queue a store update for batching
	 */
	public queueStoreUpdate(updateFn: () => void): void {
		this.storeUpdateQueue.push(updateFn);
	}

	/**
	 * Create an object pool
	 */
	public createObjectPool<T>(name: string, factory: () => T, initialSize: number = 10): void {
		const pool: T[] = [];
		for (let i = 0; i < initialSize; i++) pool.push(factory());
		this.objectPools.set(name, pool);

		this.poolStats.set(name, {
			totalCapacity: initialSize,
			activeObjects: 0,
			utilizationRate: 0,
			objectsCreated: initialSize,
			objectsReused: 0,
			reuseRatio: 0,
			estimatedMemorySaved: 0,
			poolName: name,
			poolType: 'Generic'
		});

		if (this.config.logMemoryStats) {
			console.log(`🏊 Created object pool '${name}' with ${initialSize} objects`);
		}
	}

	/**
	 * Get an object from pool
	 */
	public getFromPool<T>(name: string, factory?: () => T): T | null {
		const pool = this.objectPools.get(name);
		const stats = this.poolStats.get(name);
		if (!pool || !stats) {
			console.warn(`Pool '${name}' not found`);
			return null;
		}

		let obj: T;
		if (pool.length > 0) {
			obj = pool.pop() as T;
			stats.objectsReused++;
			stats.estimatedMemorySaved += 0.16; // ~160 bytes saved per reuse (approx KB)
		} else if (factory) {
			obj = factory();
			stats.objectsCreated++;
		} else {
			return null;
		}

		stats.activeObjects++;
		stats.utilizationRate = stats.totalCapacity > 0 ? stats.activeObjects / stats.totalCapacity : 0;

		const totalOps = stats.objectsCreated + stats.objectsReused;
		stats.reuseRatio = totalOps > 0 ? stats.objectsReused / totalOps : 0;

		if (typeof obj === 'object' && obj !== null && 'inUse' in (obj as any)) {
			(obj as any).inUse = true;
		}

		return obj;
	}

	/**
	 * Return object to pool
	 */
	public returnToPool(name: string, obj: any): void {
		const pool = this.objectPools.get(name);
		const stats = this.poolStats.get(name);
		if (!pool || !stats) {
			console.warn(`Pool '${name}' not found`);
			return;
		}

		if (typeof obj?.reset === 'function') {
			obj.reset();
		}
		if ('inUse' in obj) {
			obj.inUse = false;
		}

		pool.push(obj);
		stats.activeObjects = Math.max(0, stats.activeObjects - 1);
		stats.utilizationRate = stats.totalCapacity > 0 ? stats.activeObjects / stats.totalCapacity : 0;
	}

	/**
	 * Update object pool statistics manually
	 */
	public updatePoolStats(name: string, updates: Partial<ObjectPoolStats>): void {
		const stats = this.poolStats.get(name);
		if (!stats) return;
		Object.assign(stats, updates);

		// Recalculate derived values
		if (stats.totalCapacity > 0) {
			stats.utilizationRate = stats.activeObjects / stats.totalCapacity;
		}
		const totalOps = stats.objectsCreated + stats.objectsReused;
		stats.reuseRatio = totalOps > 0 ? stats.objectsReused / totalOps : 0;
	}

	/**
	 * Cleanup object pools (reduce unused objects; keep small buffer)
	 */
	private cleanupObjectPools(): void {
		for (const [name, pool] of this.objectPools) {
			const stats = this.poolStats.get(name);
			if (!stats) continue;

			// Keep at most 50 unused objects
			const excess = Math.max(0, pool.length - 50);
			if (excess > 0) {
				pool.splice(0, excess);
				if (this.config.logMemoryStats) {
					console.log(`🧹 Cleaned ${excess} objects from pool '${name}'`);
				}
			}
		}
	}

	/**
	 * Clear old memory history/events
	 */
	private clearOldHistory(): void {
		if (this.memoryHistory.length > 50) this.memoryHistory = this.memoryHistory.slice(-50);
		if (this.memoryEvents.length > 25) this.memoryEvents = this.memoryEvents.slice(-25);
	}

	/**
	 * Perform general cleanup
	 */
	public performCleanup(): void {
		for (const task of this.cleanupTasks) {
			try {
				task();
			} catch (error) {
				console.warn('Error in cleanup task:', error);
			}
		}

		this.cleanupObjectPools();
		this.clearOldHistory();

		if (this.currentMemoryInfo) {
			this.emitMemoryEvent({
				type: 'cleanup',
				timestamp: performance.now(),
				memoryInfo: this.currentMemoryInfo,
				severity: 'info',
				details: 'General cleanup completed'
			});
		}
	}

	/**
	 * Perform emergency cleanup (generic)
	 */
	private performEmergencyCleanup(): void {
		for (const callback of this.emergencyCleanupCallbacks) {
			try {
				callback();
			} catch (error) {
				console.error('Error in emergency cleanup callback:', error);
			}
		}

		// Aggressively trim all pools (keep minimal buffer)
		for (const [, pool] of this.objectPools) {
			pool.length = Math.min(pool.length, 10);
		}

		this.memoryHistory = this.memoryHistory.slice(-10);
		this.memoryEvents = this.memoryEvents.slice(-10);

		this.performCleanup();
	}

	/**
	 * Perform periodic cleanup when memory usage is high
	 */
	private performPeriodicCleanup(memoryInfo: MemoryInfo): void {
		if (memoryInfo.usagePercentage > this.THRESHOLDS.CLEANUP_THRESHOLD) {
			this.performCleanup();
		}
	}

	/**
	 * Request garbage collection (where available) or hint
	 */
	private requestGarbageCollection(force: boolean = false): void {
		const now = performance.now();
		if (!force && now - this.lastGCTime < this.gcCooldownPeriod) return;
		this.lastGCTime = now;

		try {
			if ((window as any).gc) {
				(window as any).gc();
				if (this.config.logMemoryStats) console.log('🗑️ Manual GC triggered');
			}
		} catch {
			/* ignore */
		}

		this.createGCHint();
	}

	/**
	 * Create GC hints by allocating and releasing temporary objects
	 */
	private createGCHint(): void {
		const temp: Array<{ data: number[] }> = [];
		for (let i = 0; i < 100; i++) temp.push({ data: new Array(100).fill(i) });
		const sum = temp.reduce((acc, o) => acc + o.data.length, 0);
		void sum;
		temp.length = 0;

		Promise.resolve().then(() => {
			const asyncHint = new Array(1000).fill(1);
			void asyncHint.length;
		});
	}

	/**
	 * Register cleanup task
	 */
	public registerCleanupTask(task: () => void): () => void {
		this.cleanupTasks.push(task);
		return () => {
			this.cleanupTasks = this.cleanupTasks.filter((t) => t !== task);
		};
	}

	/**
	 * Register emergency cleanup callback
	 */
	public registerEmergencyCleanup(callback: () => void): () => void {
		this.emergencyCleanupCallbacks.push(callback);
		return () => {
			this.emergencyCleanupCallbacks = this.emergencyCleanupCallbacks.filter((c) => c !== callback);
		};
	}

	/**
	 * Legacy/starfield hook retained for compatibility (now generic no-op-ish).
	 * If a 'starfield' pool exists, it will be trimmed; otherwise this simply registers
	 * a small cleanup task to trim any pool prefixed with 'starfield' if present later.
	 */
	public registerStarfieldCleanup(): () => void {
		const cleanup = () => {
			for (const [name, pool] of this.objectPools) {
				if (name === 'starfield' || name.startsWith('starfield')) {
					pool.length = Math.min(pool.length, 20);
				}
			}
		};
		return this.registerCleanupTask(cleanup);
	}

	/**
	 * Subscribe/listen helpers
	 */
	public onMemoryChange(listener: (info: MemoryInfo) => void): () => void {
		this.memoryListeners.push(listener);
		if (this.currentMemoryInfo) listener(this.currentMemoryInfo);
		return () => {
			this.memoryListeners = this.memoryListeners.filter((l) => l !== listener);
		};
	}

	public onMemoryEvent(listener: (event: MemoryEvent) => void): () => void {
		this.eventListeners.push(listener);
		return () => {
			this.eventListeners = this.eventListeners.filter((l) => l !== listener);
		};
	}

	public onMemoryPressure(listener: (pressure: MemoryPressure) => void): () => void {
		this.pressureListeners.push(listener);
		listener(this.currentPressure);
		return () => {
			this.pressureListeners = this.pressureListeners.filter((l) => l !== listener);
		};
	}

	/**
	 * Emitters
	 */
	private emitMemoryEvent(event: MemoryEvent): void {
		this.memoryEvents.push(event);
		if (this.memoryEvents.length > this.maxEventsSize) {
			this.memoryEvents = this.memoryEvents.slice(-this.maxEventsSize);
		}
		this.notifyEventListeners(event);

		if (this.config.logMemoryStats) {
			const log =
				event.severity === 'critical'
					? console.error
					: event.severity === 'warning'
						? console.warn
						: console.info;
			log(`[Memory] ${event.details}`);
		}
	}

	private emitCustomEvent(eventName: string, detail: any): void {
		if (!browser) return;
		const event = new CustomEvent(eventName, { detail });
		window.dispatchEvent(event);
	}

	private notifyMemoryListeners(memoryInfo: MemoryInfo): void {
		for (const listener of this.memoryListeners) {
			try {
				listener(memoryInfo);
			} catch (error) {
				console.error('Error in memory listener:', error);
			}
		}
	}

	private notifyEventListeners(event: MemoryEvent): void {
		for (const listener of this.eventListeners) {
			try {
				listener(event);
			} catch (error) {
				console.error('Error in event listener:', error);
			}
		}
	}

	private notifyPressureListeners(pressure: MemoryPressure): void {
		for (const listener of this.pressureListeners) {
			try {
				listener(pressure);
			} catch (error) {
				console.error('Error in pressure listener:', error);
			}
		}
	}

	/**
	 * Visibility/unload handlers
	 */
	private handleVisibilityChange = (): void => {
		if (!browser) return;
		this.isPageHidden = document.hidden;

		if (document.hidden) {
			this.performCleanup();
			if (this.config.hibernationEnabled) {
				setTimeout(() => {
					if (document.hidden) {
						this.handleHibernation();
					}
				}, this.config.hibernationDelay);
			}
		} else {
			this.handleResume();
		}
	};

	private handlePageUnload = (): void => {
		this.cleanup();
	};

	private handleMemoryPressureEvent = (): void => {
		if (this.currentMemoryInfo) this.handleMemoryPressure('critical', this.currentMemoryInfo);
	};

	private handleMemoryOptimizationEvent = (event: any): void => {
		if (this.config.logMemoryStats) console.log('Memory optimization event:', event?.detail);
	};

	private handleMemoryHibernationEvent = (event: any): void => {
		const { detail } = event;
		if (detail?.action === 'hibernate') this.handleHibernation();
		else if (detail?.action === 'resume') this.handleResume();
	};

	private handleHibernation(): void {
		this.config.monitoringInterval *= 4;
		this.config.batchUpdateInterval *= 2;
		this.performCleanup();
		if (this.config.logMemoryStats) console.log('📱 Entered hibernation mode');
	}

	private handleResume(): void {
		this.config.monitoringInterval = Math.max(2000, this.config.monitoringInterval / 4);
		this.config.batchUpdateInterval = Math.max(500, this.config.batchUpdateInterval / 2);
		if (this.config.logMemoryStats) console.log('👁️ Resumed from hibernation');
	}

	/**
	 * Public API / getters
	 */
	public getCurrentMemory(): MemoryInfo | null {
		return this.currentMemoryInfo;
	}

	public getMemoryHistory(): MemoryInfo[] {
		return [...this.memoryHistory];
	}

	public getMemoryEvents(): MemoryEvent[] {
		return [...this.memoryEvents];
	}

	public getMemoryPressure(): MemoryPressure {
		return this.currentPressure;
	}

	public getPoolStats(name?: string): ObjectPoolStats | Map<string, ObjectPoolStats> {
		if (name) {
			return this.poolStats.get(name) || (null as any);
		}
		return new Map(this.poolStats);
	}

	public getPerformanceMetrics(): PerformanceMetrics {
		return { ...this.performanceMetrics };
	}

	public updateConfig(newConfig: Partial<MemoryOptimizationConfig>): void {
		this.config = { ...this.config, ...newConfig };
	}

	public forceMemoryCheck(): void {
		if (browser) this.performMonitoringCheck(performance.now());
	}

	public getMemoryReport(): string {
		if (!this.currentMemoryInfo) return 'No memory data available';

		const memory = this.currentMemoryInfo;
		let report = '## Unified Memory Manager Report\n\n';
		report += `Generated: ${new Date().toLocaleString()}\n\n`;

		// Current state
		report += '### Current State\n\n';
		report += `- Memory Usage: ${(memory.usagePercentage * 100).toFixed(1)}%\n`;
		report += `- Used Heap: ${memory.usedMB.toFixed(1)} MB / ${memory.limitMB.toFixed(1)} MB\n`;
		report += `- Available: ${memory.availableMB.toFixed(1)} MB\n`;
		report += `- Pressure Level: ${this.currentPressure}\n\n`;

		// Object pools
		report += '### Object Pools\n\n';
		for (const [, stats] of this.poolStats) {
			report += `**${stats.poolName} (${stats.poolType})**\n`;
			report += `- Utilization: ${(stats.utilizationRate * 100).toFixed(1)}% (${stats.activeObjects}/${stats.totalCapacity})\n`;
			report += `- Reuse Ratio: ${(stats.reuseRatio * 100).toFixed(1)}%\n`;
			report += `- Memory Saved (est): ${stats.estimatedMemorySaved.toFixed(1)} KB\n\n`;
		}

		// Recent events
		report += '### Recent Events\n\n';
		const recent = this.memoryEvents.slice(-10);
		for (const event of recent) {
			const time = new Date(event.timestamp).toLocaleTimeString();
			report += `- ${time}: [${event.severity.toUpperCase()}] ${event.details}\n`;
		}

		return report;
	}

	/**
	 * Cleanup all resources
	 */
	public cleanup(): void {
		this.stopMonitoring();

		if (this.batchUpdateTimer) {
			clearTimeout(this.batchUpdateTimer);
			this.batchUpdateTimer = null;
		}

		if (browser) {
			document.removeEventListener('visibilitychange', this.handleVisibilityChange);
			window.removeEventListener('beforeunload', this.handlePageUnload);
			window.removeEventListener('memoryOptimization', this.handleMemoryOptimizationEvent);
			window.removeEventListener('memoryHibernation', this.handleMemoryHibernationEvent);
		}

		this.objectPools.clear();
		this.poolStats.clear();
		this.memoryHistory = [];
		this.memoryEvents = [];
		this.cleanupTasks = [];
		this.emergencyCleanupCallbacks = [];
		this.memoryListeners = [];
		this.eventListeners = [];
		this.pressureListeners = [];
		this.pendingStoreUpdates.clear();
		this.storeUpdateQueue = [];
		this.isInitialized = false;

		if (this.config.logMemoryStats) console.log('🧹 MemoryManager cleaned up');
	}
}

// Create singleton instance
export const memoryManager = new MemoryManager();

/**
 * Svelte stores for reactive integration
 */
export const currentMemoryInfo = writable<MemoryInfo | null>(null);
export const memoryEvents = writable<MemoryEvent[]>([]);
export const memoryPressure = writable<MemoryPressure>('low');
export const memoryUsageStore = writable<number>(0);

/**
 * Expose a single pool stats store for dashboards.
 * We’ll publish aggregated stats across all pools to keep
 * consumers stable without star-field specific assumptions.
 */
export const objectPoolStatsStore = writable<ObjectPoolStats>({
	totalCapacity: 0,
	activeObjects: 0,
	utilizationRate: 0,
	objectsCreated: 0,
	objectsReused: 0,
	reuseRatio: 0,
	estimatedMemorySaved: 0,
	poolName: 'All Pools',
	poolType: 'Aggregate'
});

// Setup store synchronization in browser
if (browser) {
	setTimeout(() => {
		// Subscribe to memory changes
		memoryManager.onMemoryChange((info) => {
			currentMemoryInfo.set(info);
			memoryUsageStore.set(info.usagePercentage);
		});

		// Subscribe to memory events
		memoryManager.onMemoryEvent((event) => {
			memoryEvents.update((events) => [...events, event].slice(-50));
		});

		// Subscribe to pressure changes
		memoryManager.onMemoryPressure((pressure) => {
			memoryPressure.set(pressure);
		});

		// Aggregate pool stats periodically
		const updateAggregatedPoolStats = () => {
			const statsMap = memoryManager.getPoolStats() as Map<string, ObjectPoolStats>;
			let aggregate: ObjectPoolStats = {
				totalCapacity: 0,
				activeObjects: 0,
				utilizationRate: 0,
				objectsCreated: 0,
				objectsReused: 0,
				reuseRatio: 0,
				estimatedMemorySaved: 0,
				poolName: 'All Pools',
				poolType: 'Aggregate'
			};

			if (statsMap && statsMap.size > 0) {
				let pools = 0;
				for (const [, stats] of statsMap) {
					aggregate.totalCapacity += stats.totalCapacity;
					aggregate.activeObjects += stats.activeObjects;
					aggregate.objectsCreated += stats.objectsCreated;
					aggregate.objectsReused += stats.objectsReused;
					aggregate.estimatedMemorySaved += stats.estimatedMemorySaved;
					pools++;
				}
				aggregate.utilizationRate =
					aggregate.totalCapacity > 0 ? aggregate.activeObjects / aggregate.totalCapacity : 0;

				const totalOps = aggregate.objectsCreated + aggregate.objectsReused;
				aggregate.reuseRatio = totalOps > 0 ? aggregate.objectsReused / totalOps : 0;
			}

			objectPoolStatsStore.set(aggregate);
		};

		setInterval(updateAggregatedPoolStats, 1000);
		updateAggregatedPoolStats();
	}, 100);
}

/**
 * Derived stores
 */
export const memoryUsagePercentage = derived(
	currentMemoryInfo,
	($info) => $info?.usagePercentage || 0
);

export const availableMemoryMB = derived(currentMemoryInfo, ($info) => $info?.availableMB || 0);

/**
 * Utility helpers
 */
export function formatBytes(bytes: number): string {
	const sizes = ['Bytes', 'KB', 'MB', 'GB'];
	if (bytes === 0) return '0 Bytes';
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Generic recommendations based on current pressure level.
 * No star-field specifics; suitable for any visual system.
 */
export function getMemoryRecommendations(): string[] {
	const pressure = memoryManager.getMemoryPressure();
	const recs: string[] = [];

	switch (pressure) {
		case 'low':
			recs.push('Memory usage is within normal range.');
			break;
		case 'medium':
			recs.push('Reduce non-essential visual effects by ~10–20%.');
			recs.push('Ensure unused objects are returned to pools.');
			break;
		case 'high':
			recs.push('Disable expensive effects (blur/shadows) and lower render quality.');
			recs.push('Increase pooling and avoid per-frame allocations.');
			recs.push('Consider lowering update frequency for background animations.');
			break;
		case 'critical':
			recs.push('Emergency: disable non-essential features and pause background animations.');
			recs.push('Trigger cleanup and consider forcing a soft reload if pressure persists.');
			break;
	}

	return recs;
}

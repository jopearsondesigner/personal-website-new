// src/lib/utils/memory-manager.ts
import { browser } from '$app/environment';
import { writable, derived, get, type Writable } from 'svelte/store';

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
 * Object pool statistics interface
 */
export interface ObjectPoolStats {
	totalCapacity: number;
	activeObjects: number;
	utilizationRate: number;
	objectsCreated: number;
	objectsReused: number;
	reuseRatio: number;
	estimatedMemorySaved: number;
	poolName: string;
	poolType: string;
}

/**
 * Memory optimization configuration
 */
export interface MemoryOptimizationConfig {
	enableAggressiveGC: boolean;
	maxMemoryUsage: number;
	gcThreshold: number;
	hibernationEnabled: boolean;
	hibernationDelay: number;
	poolSizeLimit: number;
	enableMemoryWarnings: boolean;
	logMemoryStats: boolean;
	monitoringInterval: number;
	batchUpdateInterval: number;
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
 * Eliminates store conflicts and reduces monitoring overhead
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
	private lastBatchUpdate = 0;

	// Cleanup management
	private cleanupTasks: Array<() => void> = [];
	private emergencyCleanupCallbacks: Array<() => void> = [];

	// Event listeners
	private memoryListeners: Array<(info: MemoryInfo) => void> = [];
	private eventListeners: Array<(event: MemoryEvent) => void> = [];
	private pressureListeners: Array<(pressure: MemoryPressure) => void> = [];

	// Performance optimization flags
	private isPageHidden = false;
	private isLowPowerMode = false;
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
			monitoringInterval: 2000, // 2 seconds between checks
			batchUpdateInterval: 500, // Batch store updates every 500ms
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

		// Browser-only initialization
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
			// Check if memory API is available
			if (!this.isMemoryAPIAvailable()) {
				console.warn('Memory API not available - using fallback monitoring');
			}

			// Initialize object pools
			this.initializeDefaultPools();

			// Setup event listeners
			this.setupEventListeners();

			// Start monitoring
			this.startMonitoring();

			// Initialize batch update system
			this.initializeBatchUpdates();

			this.isInitialized = true;

			if (this.config.logMemoryStats) {
				console.log('🧠 MemoryManager initialized successfully');
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
	 * Initialize default object pools
	 */
	private initializeDefaultPools(): void {
		// Create star objects pool
		this.createObjectPool(
			'stars',
			() => ({
				x: 0,
				y: 0,
				z: 0,
				prevX: 0,
				prevY: 0,
				inUse: false,
				reset() {
					this.x = 0;
					this.y = 0;
					this.z = 0;
					this.prevX = 0;
					this.prevY = 0;
					this.inUse = false;
				}
			}),
			300 // Initial capacity
		);

		// Create render batch pool
		this.createObjectPool(
			'renderBatches',
			() => ({
				positions: new Float32Array(100),
				colors: new Uint8Array(400),
				sizes: new Float32Array(100),
				count: 0,
				reset() {
					this.count = 0;
					// Keep typed arrays for reuse
				}
			}),
			10
		);

		// Create performance snapshot pool
		this.createObjectPool(
			'performanceSnapshots',
			() => ({
				timestamp: 0,
				fps: 0,
				frameTime: 0,
				memoryUsage: 0,
				starCount: 0,
				reset() {
					this.timestamp = 0;
					this.fps = 0;
					this.frameTime = 0;
					this.memoryUsage = 0;
					this.starCount = 0;
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

		// Visibility change handler
		document.addEventListener('visibilitychange', this.handleVisibilityChange);

		// Page unload cleanup
		window.addEventListener('beforeunload', this.handlePageUnload);

		// Memory pressure events (if supported)
		if ('memory' in navigator && 'addEventListener' in (navigator as any).memory) {
			try {
				(navigator as any).memory.addEventListener('pressure', this.handleMemoryPressureEvent);
			} catch (error) {
				// Memory pressure events not supported
			}
		}

		// Listen for custom memory events
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
			// Get current memory information
			const memoryInfo = this.getCurrentMemoryInfo(timestamp);
			if (!memoryInfo) return;

			// Update current state
			this.currentMemoryInfo = memoryInfo;

			// Add to history
			this.addToMemoryHistory(memoryInfo);

			// Detect garbage collection
			this.detectGarbageCollection(memoryInfo);

			// Evaluate memory pressure
			this.evaluateMemoryPressure(memoryInfo);

			// Update performance metrics
			this.updatePerformanceMetrics(timestamp);

			// Schedule batched store updates
			this.scheduleBatchedStoreUpdate();

			// Perform cleanup if needed
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
				// Fallback estimation based on object pools and DOM
				const estimatedUsage = this.estimateMemoryUsage();
				const estimatedLimit = 512 * 1024 * 1024; // 512MB estimate

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
	 * Estimate memory usage when Memory API is not available
	 */
	private estimateMemoryUsage(): number {
		let estimatedUsage = 0;

		// Estimate from object pools
		for (const [name, stats] of this.poolStats) {
			// Rough estimate: 240 bytes per star object
			if (name === 'stars') {
				estimatedUsage += stats.activeObjects * 240;
			}
			// Other pools
			else {
				estimatedUsage += stats.activeObjects * 100;
			}
		}

		// Estimate DOM overhead
		const elementCount = document.querySelectorAll('*').length;
		estimatedUsage += elementCount * 100; // ~100 bytes per element

		// Add base overhead
		estimatedUsage += 10 * 1024 * 1024; // 10MB base

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
	 * Detect garbage collection events
	 */
	private detectGarbageCollection(memoryInfo: MemoryInfo): boolean {
		if (this.memoryHistory.length < 2) return false;

		const previousInfo = this.memoryHistory[this.memoryHistory.length - 2];
		const memoryDrop = previousInfo.usedJSHeapSize - memoryInfo.usedJSHeapSize;
		const dropRatio = memoryDrop / previousInfo.usedJSHeapSize;

		// Significant drop suggests GC
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
		const usagePercentage = memoryInfo.usagePercentage;
		let newPressure: MemoryPressure;

		if (usagePercentage >= this.THRESHOLDS.CRITICAL_PRESSURE) {
			newPressure = 'critical';
		} else if (usagePercentage >= this.THRESHOLDS.HIGH_PRESSURE) {
			newPressure = 'high';
		} else if (usagePercentage >= this.THRESHOLDS.MEDIUM_PRESSURE) {
			newPressure = 'medium';
		} else {
			newPressure = 'low';
		}

		if (newPressure !== this.currentPressure) {
			const previousPressure = this.currentPressure;
			this.currentPressure = newPressure;

			// Emit pressure change event
			this.emitMemoryEvent({
				type: 'pressure',
				timestamp: memoryInfo.timestamp,
				memoryInfo,
				severity:
					newPressure === 'critical' ? 'critical' : newPressure === 'high' ? 'warning' : 'info',
				details: `Memory pressure changed from ${previousPressure} to ${newPressure}`
			});

			// Notify pressure listeners
			this.notifyPressureListeners(newPressure);

			// Take pressure-specific actions
			this.handleMemoryPressure(newPressure, memoryInfo);
		}
	}

	/**
	 * Handle memory pressure with appropriate responses
	 */
	private handleMemoryPressure(pressure: MemoryPressure, memoryInfo: MemoryInfo): void {
		switch (pressure) {
			case 'medium':
				this.handleMediumPressure(memoryInfo);
				break;
			case 'high':
				this.handleHighPressure(memoryInfo);
				break;
			case 'critical':
				this.handleCriticalPressure(memoryInfo);
				break;
			case 'low':
				// Allow recovery
				break;
		}
	}

	/**
	 * Handle medium memory pressure
	 */
	private handleMediumPressure(memoryInfo: MemoryInfo): void {
		// Clean object pools
		this.cleanupObjectPools();

		// Emit optimization event
		this.emitCustomEvent('memoryOptimization', {
			type: 'reduce_quality',
			factor: 0.8,
			reason: 'medium_pressure'
		});

		if (this.config.logMemoryStats) {
			console.log('🟡 Medium memory pressure - gentle optimization');
		}
	}

	/**
	 * Handle high memory pressure
	 */
	private handleHighPressure(memoryInfo: MemoryInfo): void {
		// More aggressive cleanup
		this.cleanupObjectPools();
		this.clearOldHistory();

		// Request garbage collection
		this.requestGarbageCollection();

		// Emit optimization event
		this.emitCustomEvent('memoryOptimization', {
			type: 'reduce_effects',
			factor: 0.6,
			reason: 'high_pressure'
		});

		if (this.config.logMemoryStats) {
			console.log('🟠 High memory pressure - aggressive optimization');
		}
	}

	/**
	 * Handle critical memory pressure
	 */
	private handleCriticalPressure(memoryInfo: MemoryInfo): void {
		// Emergency cleanup
		this.performEmergencyCleanup();

		// Force garbage collection
		this.requestGarbageCollection(true);

		// Emit critical optimization event
		this.emitCustomEvent('memoryOptimization', {
			type: 'emergency_mode',
			factor: 0.3,
			reason: 'critical_pressure'
		});

		console.error('🔴 Critical memory pressure - emergency optimization');
	}

	/**
	 * Update performance metrics
	 */
	private updatePerformanceMetrics(timestamp: number): void {
		if (this.lastMonitorTime > 0) {
			const deltaTime = timestamp - this.lastMonitorTime;
			this.performanceMetrics.frameTime = deltaTime;
			this.performanceMetrics.fps = deltaTime > 0 ? 1000 / deltaTime : 60;
		}

		this.performanceMetrics.updateTime = performance.now() - timestamp;
	}

	/**
	 * Initialize batched store update system
	 */
	private initializeBatchUpdates(): void {
		// Clear any existing timer
		if (this.batchUpdateTimer) {
			clearTimeout(this.batchUpdateTimer);
		}

		// Start batch update cycle
		this.scheduleBatchUpdate();
	}

	/**
	 * Schedule batched store update
	 */
	private scheduleBatchedStoreUpdate(): void {
		if (!this.currentMemoryInfo) return;

		// Queue memory info update
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
			this.scheduleBatchUpdate(); // Schedule next batch
		}, this.config.batchUpdateInterval);
	}

	/**
	 * Process all pending store updates in a single batch
	 */
	private processBatchedUpdates(): void {
		if (this.pendingStoreUpdates.size === 0) return;

		try {
			// Process memory info update
			const memoryInfo = this.pendingStoreUpdates.get('memoryInfo');
			if (memoryInfo) {
				this.notifyMemoryListeners(memoryInfo);
			}

			// Process other updates
			const memoryPressure = this.pendingStoreUpdates.get('memoryPressure');
			if (memoryPressure) {
				this.notifyPressureListeners(memoryPressure);
			}

			// Execute queued store updates
			while (this.storeUpdateQueue.length > 0) {
				const updateFn = this.storeUpdateQueue.shift();
				if (updateFn) {
					updateFn();
				}
			}

			// Clear pending updates
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

		// Pre-populate pool
		for (let i = 0; i < initialSize; i++) {
			pool.push(factory());
		}

		this.objectPools.set(name, pool);

		// Initialize stats
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
	 * Get object from pool
	 */
	public getFromPool<T>(name: string, factory?: () => T): T | null {
		const pool = this.objectPools.get(name);
		const stats = this.poolStats.get(name);

		if (!pool || !stats) {
			console.warn(`Pool '${name}' not found`);
			return null;
		}

		let obj: T;

		// Try to reuse from pool
		if (pool.length > 0) {
			obj = pool.pop()!;
			stats.objectsReused++;
			stats.estimatedMemorySaved += 0.24; // ~240 bytes saved per reuse
		} else if (factory) {
			// Create new object if pool empty
			obj = factory();
			stats.objectsCreated++;
		} else {
			return null;
		}

		// Update utilization
		stats.activeObjects++;
		stats.utilizationRate = stats.activeObjects / stats.totalCapacity;
		stats.reuseRatio = stats.objectsReused / (stats.objectsCreated + stats.objectsReused);

		// Mark as in use
		if (typeof obj === 'object' && obj !== null && 'inUse' in obj) {
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

		// Reset object if it has reset method
		if (typeof obj.reset === 'function') {
			obj.reset();
		}

		// Mark as not in use
		if ('inUse' in obj) {
			obj.inUse = false;
		}

		// Return to pool
		pool.push(obj);
		stats.activeObjects = Math.max(0, stats.activeObjects - 1);
		stats.utilizationRate = stats.activeObjects / stats.totalCapacity;
	}

	/**
	 * Update object pool statistics manually
	 */
	public updatePoolStats(name: string, updates: Partial<ObjectPoolStats>): void {
		const stats = this.poolStats.get(name);
		if (!stats) return;

		// Apply updates
		Object.assign(stats, updates);

		// Recalculate derived values
		if (stats.totalCapacity > 0) {
			stats.utilizationRate = stats.activeObjects / stats.totalCapacity;
		}

		const totalOperations = stats.objectsCreated + stats.objectsReused;
		if (totalOperations > 0) {
			stats.reuseRatio = stats.objectsReused / totalOperations;
		}
	}

	/**
	 * Cleanup object pools
	 */
	private cleanupObjectPools(): void {
		for (const [name, pool] of this.objectPools) {
			const stats = this.poolStats.get(name);
			if (!stats) continue;

			// Reduce pool size if too large
			const excessSize = pool.length - 50; // Keep max 50 unused objects
			if (excessSize > 0) {
				pool.splice(0, excessSize);

				if (this.config.logMemoryStats) {
					console.log(`🧹 Cleaned up ${excessSize} objects from pool '${name}'`);
				}
			}
		}
	}

	/**
	 * Clear old memory history
	 */
	private clearOldHistory(): void {
		// Keep only recent history
		if (this.memoryHistory.length > 50) {
			this.memoryHistory = this.memoryHistory.slice(-50);
		}

		// Keep only recent events
		if (this.memoryEvents.length > 25) {
			this.memoryEvents = this.memoryEvents.slice(-25);
		}
	}

	/**
	 * Perform general cleanup
	 */
	public performCleanup(): void {
		// Run registered cleanup tasks
		for (const task of this.cleanupTasks) {
			try {
				task();
			} catch (error) {
				console.warn('Error in cleanup task:', error);
			}
		}

		// Cleanup object pools
		this.cleanupObjectPools();

		// Clear old data
		this.clearOldHistory();

		this.emitMemoryEvent({
			type: 'cleanup',
			timestamp: performance.now(),
			memoryInfo: this.currentMemoryInfo!,
			severity: 'info',
			details: 'General cleanup completed'
		});
	}

	/**
	 * Perform emergency cleanup
	 */
	private performEmergencyCleanup(): void {
		// Run emergency callbacks
		for (const callback of this.emergencyCleanupCallbacks) {
			try {
				callback();
			} catch (error) {
				console.error('Error in emergency cleanup:', error);
			}
		}

		// Aggressive pool cleanup
		for (const [name, pool] of this.objectPools) {
			if (name !== 'stars') {
				// Keep essential pools
				pool.length = 0;
			}
		}

		// Clear most history
		this.memoryHistory = this.memoryHistory.slice(-10);
		this.memoryEvents = this.memoryEvents.slice(-10);

		// Force cleanup
		this.performCleanup();

		console.log('🚨 Emergency cleanup completed');
	}

	/**
	 * Perform periodic cleanup based on memory state
	 */
	private performPeriodicCleanup(memoryInfo: MemoryInfo): void {
		// Only cleanup if memory usage is high
		if (memoryInfo.usagePercentage > this.THRESHOLDS.CLEANUP_THRESHOLD) {
			this.performCleanup();
		}
	}

	/**
	 * Request garbage collection
	 */
	private requestGarbageCollection(force: boolean = false): void {
		const now = performance.now();

		// Respect cooldown unless forced
		if (!force && now - this.lastGCTime < this.gcCooldownPeriod) {
			return;
		}

		this.lastGCTime = now;

		try {
			// Try manual GC if available
			if ((window as any).gc) {
				(window as any).gc();

				if (this.config.logMemoryStats) {
					console.log('🗑️ Manual garbage collection triggered');
				}
			}
		} catch (error) {
			// GC not available
		}

		// Alternative GC hints
		this.createGCHint();
	}

	/**
	 * Create GC hints by allocating and releasing objects
	 */
	private createGCHint(): void {
		// Create temporary objects to hint GC
		const tempObjects = [];
		for (let i = 0; i < 100; i++) {
			tempObjects.push({ data: new Array(100).fill(i) });
		}

		// Force computation
		const sum = tempObjects.reduce((acc, obj) => acc + obj.data.length, 0);

		// Clear references
		tempObjects.length = 0;

		// Additional async hint
		Promise.resolve().then(() => {
			const asyncHint = new Array(1000).fill(sum);
			asyncHint.length = 0;
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
	 * Add memory change listener
	 */
	public onMemoryChange(listener: (info: MemoryInfo) => void): () => void {
		this.memoryListeners.push(listener);

		// Immediately notify with current state
		if (this.currentMemoryInfo) {
			listener(this.currentMemoryInfo);
		}

		return () => {
			this.memoryListeners = this.memoryListeners.filter((l) => l !== listener);
		};
	}

	/**
	 * Add memory event listener
	 */
	public onMemoryEvent(listener: (event: MemoryEvent) => void): () => void {
		this.eventListeners.push(listener);

		return () => {
			this.eventListeners = this.eventListeners.filter((l) => l !== listener);
		};
	}

	/**
	 * Add memory pressure listener
	 */
	public onMemoryPressure(listener: (pressure: MemoryPressure) => void): () => void {
		this.pressureListeners.push(listener);

		// Immediately notify with current state
		listener(this.currentPressure);

		return () => {
			this.pressureListeners = this.pressureListeners.filter((l) => l !== listener);
		};
	}

	/**
	 * Emit memory event
	 */
	private emitMemoryEvent(event: MemoryEvent): void {
		// Add to events history
		this.memoryEvents.push(event);

		// Trim history
		if (this.memoryEvents.length > this.maxEventsSize) {
			this.memoryEvents = this.memoryEvents.slice(-this.maxEventsSize);
		}

		// Notify listeners
		this.notifyEventListeners(event);

		// Log if enabled
		if (this.config.logMemoryStats) {
			const logMethod =
				event.severity === 'critical'
					? console.error
					: event.severity === 'warning'
						? console.warn
						: console.info;
			logMethod(`[Memory] ${event.details}`);
		}
	}

	/**
	 * Emit custom DOM event
	 */
	private emitCustomEvent(eventName: string, detail: any): void {
		if (!browser) return;

		const event = new CustomEvent(eventName, { detail });
		window.dispatchEvent(event);
	}

	/**
	 * Notify memory listeners
	 */
	private notifyMemoryListeners(memoryInfo: MemoryInfo): void {
		for (const listener of this.memoryListeners) {
			try {
				listener(memoryInfo);
			} catch (error) {
				console.error('Error in memory listener:', error);
			}
		}
	}

	/**
	 * Notify event listeners
	 */
	private notifyEventListeners(event: MemoryEvent): void {
		for (const listener of this.eventListeners) {
			try {
				listener(event);
			} catch (error) {
				console.error('Error in event listener:', error);
			}
		}
	}

	/**
	 * Notify pressure listeners
	 */
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
	 * Handle visibility change
	 */
	private handleVisibilityChange = (): void => {
		if (!browser) return;

		this.isPageHidden = document.hidden;

		if (document.hidden) {
			// Page hidden - trigger hibernation
			this.performCleanup();
			if (this.config.hibernationEnabled) {
				setTimeout(() => {
					if (document.hidden) {
						this.handleHibernation();
					}
				}, this.config.hibernationDelay);
			}
		} else {
			// Page visible - resume normal operation
			this.handleResume();
		}
	};

	/**
	 * Handle page unload
	 */
	private handlePageUnload = (): void => {
		this.cleanup();
	};

	/**
	 * Handle memory pressure event from browser
	 */
	private handleMemoryPressureEvent = (event: any): void => {
		if (this.currentMemoryInfo) {
			this.handleCriticalPressure(this.currentMemoryInfo);
		}
	};

	/**
	 * Handle memory optimization event
	 */
	private handleMemoryOptimizationEvent = (event: any): void => {
		const { detail } = event;
		if (this.config.logMemoryStats) {
			console.log('Memory optimization event:', detail);
		}
	};

	/**
	 * Handle memory hibernation event
	 */
	private handleMemoryHibernationEvent = (event: any): void => {
		const { detail } = event;
		if (detail.action === 'hibernate') {
			this.handleHibernation();
		} else if (detail.action === 'resume') {
			this.handleResume();
		}
	};

	/**
	 * Handle hibernation mode
	 */
	private handleHibernation(): void {
		// Reduce monitoring frequency
		this.config.monitoringInterval *= 4;
		this.config.batchUpdateInterval *= 2;

		// Perform cleanup
		this.performCleanup();

		if (this.config.logMemoryStats) {
			console.log('📱 Entered hibernation mode');
		}
	}

	/**
	 * Handle resume from hibernation
	 */
	private handleResume(): void {
		// Restore normal monitoring frequency
		this.config.monitoringInterval = Math.max(2000, this.config.monitoringInterval / 4);
		this.config.batchUpdateInterval = Math.max(500, this.config.batchUpdateInterval / 2);

		if (this.config.logMemoryStats) {
			console.log('👁️ Resumed from hibernation');
		}
	}

	/**
	 * Public API Methods
	 */

	/**
	 * Get current memory information
	 */
	public getCurrentMemory(): MemoryInfo | null {
		return this.currentMemoryInfo;
	}

	/**
	 * Get memory history
	 */
	public getMemoryHistory(): MemoryInfo[] {
		return [...this.memoryHistory];
	}

	/**
	 * Get memory events
	 */
	public getMemoryEvents(): MemoryEvent[] {
		return [...this.memoryEvents];
	}

	/**
	 * Get current memory pressure
	 */
	public getMemoryPressure(): MemoryPressure {
		return this.currentPressure;
	}

	/**
	 * Get object pool statistics
	 */
	public getPoolStats(name?: string): ObjectPoolStats | Map<string, ObjectPoolStats> {
		if (name) {
			return this.poolStats.get(name) || (null as any);
		}
		return new Map(this.poolStats);
	}

	/**
	 * Get performance metrics
	 */
	public getPerformanceMetrics(): PerformanceMetrics {
		return { ...this.performanceMetrics };
	}

	/**
	 * Update configuration
	 */
	public updateConfig(newConfig: Partial<MemoryOptimizationConfig>): void {
		this.config = { ...this.config, ...newConfig };
	}

	/**
	 * Force memory check
	 */
	public forceMemoryCheck(): void {
		if (browser) {
			this.performMonitoringCheck(performance.now());
		}
	}

	/**
	 * Get memory leak diagnostic report
	 */
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
		for (const [name, stats] of this.poolStats) {
			report += `**${stats.poolName} (${stats.poolType})**\n`;
			report += `- Utilization: ${(stats.utilizationRate * 100).toFixed(1)}% (${stats.activeObjects}/${stats.totalCapacity})\n`;
			report += `- Reuse Ratio: ${(stats.reuseRatio * 100).toFixed(1)}%\n`;
			report += `- Memory Saved: ${stats.estimatedMemorySaved.toFixed(1)} KB\n\n`;
		}

		// Recent events
		report += '### Recent Events\n\n';
		const recentEvents = this.memoryEvents.slice(-10);
		for (const event of recentEvents) {
			const time = new Date(event.timestamp).toLocaleTimeString();
			report += `- ${time}: [${event.severity.toUpperCase()}] ${event.details}\n`;
		}

		return report;
	}

	/**
	 * Cleanup all resources
	 */
	public cleanup(): void {
		// Stop monitoring
		this.stopMonitoring();

		// Clear timers
		if (this.batchUpdateTimer) {
			clearTimeout(this.batchUpdateTimer);
			this.batchUpdateTimer = null;
		}

		// Remove event listeners
		if (browser) {
			document.removeEventListener('visibilitychange', this.handleVisibilityChange);
			window.removeEventListener('beforeunload', this.handlePageUnload);
			window.removeEventListener('memoryOptimization', this.handleMemoryOptimizationEvent);
			window.removeEventListener('memoryHibernation', this.handleMemoryHibernationEvent);
		}

		// Clear pools and data
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

		if (this.config.logMemoryStats) {
			console.log('🧹 MemoryManager cleaned up');
		}
	}
}

// Create singleton instance
export const memoryManager = new MemoryManager();

// Svelte stores for reactive integration
export const currentMemoryInfo = writable<MemoryInfo | null>(null);
export const memoryEvents = writable<MemoryEvent[]>([]);
export const memoryPressure = writable<MemoryPressure>('low');
export const memoryUsageStore = writable<number>(0);
export const objectPoolStatsStore = writable<ObjectPoolStats>({
	totalCapacity: 0,
	activeObjects: 0,
	utilizationRate: 0,
	objectsCreated: 0,
	objectsReused: 0,
	reuseRatio: 0,
	estimatedMemorySaved: 0,
	poolName: 'Stars',
	poolType: 'Star'
});

// Setup store synchronization in browser
if (browser) {
	// Delay initialization to avoid SSR issues
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

		// Setup pool stats synchronization
		const updatePoolStats = () => {
			const stats = memoryManager.getPoolStats('stars') as ObjectPoolStats;
			if (stats) {
				objectPoolStatsStore.set(stats);
			}
		};

		// Update pool stats periodically
		setInterval(updatePoolStats, 1000);
		updatePoolStats(); // Initial update
	}, 100);
}

// Derived stores
export const memoryUsagePercentage = derived(
	currentMemoryInfo,
	($info) => $info?.usagePercentage || 0
);

export const availableMemoryMB = derived(currentMemoryInfo, ($info) => $info?.availableMB || 0);

// Utility functions
export function formatBytes(bytes: number): string {
	const sizes = ['Bytes', 'KB', 'MB', 'GB'];
	if (bytes === 0) return '0 Bytes';
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}

export function getMemoryRecommendations(): string[] {
	const pressure = memoryManager.getMemoryPressure();
	const recommendations: string[] = [];

	switch (pressure) {
		case 'low':
			recommendations.push('Memory usage is optimal');
			break;
		case 'medium':
			recommendations.push('Consider reducing star count by 10-20%');
			recommendations.push('Clean up unused objects');
			break;
		case 'high':
			recommendations.push('Reduce visual effects');
			recommendations.push('Lower rendering quality');
			recommendations.push('Enable object pooling');
			break;
		case 'critical':
			recommendations.push('Emergency: Disable non-essential features');
			recommendations.push('Force garbage collection');
			recommendations.push('Restart application if issues persist');
			break;
	}

	return recommendations;
}

// Export the manager instance for external use
// (Already exported elsewhere, so this export is removed to fix redeclaration error)

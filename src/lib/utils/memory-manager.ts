// DO NOT REMOVE THIS COMMENT
// /src/lib/utils/memory-manager.ts
// DO NOT REMOVE THIS COMMENT

import { browser } from '$app/environment';
import { writable, derived } from 'svelte/store';

// Memory usage information interface
export interface MemoryInfo {
	usedJSHeapSize: number;
	totalJSHeapSize: number;
	jsHeapSizeLimit: number;
	usagePercentage: number;
	availableMB: number;
	usedMB: number;
	limitMB: number;
}

// Memory pressure levels
export type MemoryPressure = 'low' | 'medium' | 'high' | 'critical';

// Memory optimization strategies
export interface MemoryOptimization {
	level: MemoryPressure;
	actions: string[];
	starCountReduction: number;
	qualityReduction: number;
	disableEffects: string[];
	forceGC: boolean;
}

// Memory event interface
export interface MemoryEvent {
	type: 'warning' | 'critical' | 'cleanup' | 'optimization';
	timestamp: number;
	memoryInfo: MemoryInfo;
	action?: string;
}

/**
 * Comprehensive memory management system for StarField optimization
 */
class MemoryManager {
	// State management
	private isMonitoring = false;
	private memoryHistory: MemoryInfo[] = [];
	private memoryEvents: MemoryEvent[] = [];
	private listeners: Array<(info: MemoryInfo) => void> = [];
	private eventListeners: Array<(event: MemoryEvent) => void> = [];

	// Configuration
	private monitoringInterval = 2000; // 2 seconds
	private historyMaxSize = 100; // ~3+ minutes of history
	private eventsMaxSize = 50;

	// Monitoring timer
	private monitoringTimer: ReturnType<typeof setInterval> | null = null;

	// Memory thresholds (percentages)
	private readonly THRESHOLDS = {
		MEDIUM_PRESSURE: 0.6, // 60%
		HIGH_PRESSURE: 0.75, // 75%
		CRITICAL_PRESSURE: 0.9, // 90%
		CLEANUP_THRESHOLD: 0.85 // 85%
	};

	// Object pools for memory optimization
	private objectPools = new Map<string, any[]>();
	private poolStats = new Map<string, { created: number; reused: number; active: number }>();

	// Cleanup registry
	private cleanupTasks: Array<() => void> = [];
	private gcHintTimer: ReturnType<typeof setTimeout> | null = null;

	constructor() {
		if (browser && this.isMemoryAPIAvailable()) {
			this.initializeMemoryManager();
		}
	}

	/**
	 * Check if the Memory API is available
	 */
	private isMemoryAPIAvailable(): boolean {
		return (
			'performance' in window &&
			'memory' in (performance as any) &&
			typeof (performance as any).memory === 'object'
		);
	}

	/**
	 * Initialize the memory management system
	 */
	private initializeMemoryManager(): void {
		console.log('🧠 Initializing memory management system...');

		// Initialize object pools
		this.initializeObjectPools();

		// Start monitoring
		this.startMonitoring();

		// Handle visibility changes
		document.addEventListener('visibilitychange', this.handleVisibilityChange);

		// Handle page unload cleanup
		window.addEventListener('beforeunload', this.handlePageUnload);

		// Schedule periodic cleanup
		this.schedulePeriodicCleanup();

		console.log('✅ Memory manager initialized');
	}

	/**
	 * Initialize object pools for common objects
	 */
	private initializeObjectPools(): void {
		// Pool for star objects
		this.createObjectPool(
			'stars',
			() => ({
				x: 0,
				y: 0,
				z: 0,
				prevX: 0,
				prevY: 0,
				inUse: false
			}),
			50
		);

		// Pool for render batches
		this.createObjectPool(
			'renderBatches',
			() => ({
				positions: new Float32Array(100),
				colors: new Uint8Array(400),
				sizes: new Float32Array(100),
				count: 0
			}),
			10
		);

		// Pool for performance snapshots
		this.createObjectPool(
			'performanceSnapshots',
			() => ({
				timestamp: 0,
				fps: 0,
				frameTime: 0,
				memoryUsage: 0,
				starCount: 0
			}),
			20
		);

		console.log('🏊 Object pools initialized');
	}

	/**
	 * Create an object pool for a specific type
	 */
	public createObjectPool<T>(name: string, factory: () => T, initialSize: number = 10): void {
		const pool: T[] = [];

		// Pre-populate pool
		for (let i = 0; i < initialSize; i++) {
			pool.push(factory());
		}

		this.objectPools.set(name, pool);
		this.poolStats.set(name, { created: initialSize, reused: 0, active: 0 });

		console.log(`🏊 Created object pool '${name}' with ${initialSize} objects`);
	}

	/**
	 * Get an object from the pool
	 */
	public getFromPool<T>(name: string, factory?: () => T): T | null {
		const pool = this.objectPools.get(name);
		const stats = this.poolStats.get(name);

		if (!pool || !stats) {
			console.warn(`Pool '${name}' not found`);
			return null;
		}

		// Try to reuse an object from pool
		if (pool.length > 0) {
			const obj = pool.pop()!;
			stats.reused++;
			stats.active++;
			return obj;
		}

		// Create new object if pool is empty and factory provided
		if (factory) {
			const obj = factory();
			stats.created++;
			stats.active++;
			return obj;
		}

		return null;
	}

	/**
	 * Return an object to the pool
	 */
	public returnToPool(name: string, obj: any): void {
		const pool = this.objectPools.get(name);
		const stats = this.poolStats.get(name);

		if (!pool || !stats) {
			console.warn(`Pool '${name}' not found`);
			return;
		}

		// Reset object state if it has a reset method
		if (typeof obj.reset === 'function') {
			obj.reset();
		}

		// Mark as not in use
		if ('inUse' in obj) {
			obj.inUse = false;
		}

		pool.push(obj);
		stats.active = Math.max(0, stats.active - 1);
	}

	/**
	 * Start memory monitoring
	 */
	public startMonitoring(): void {
		if (this.isMonitoring || !this.isMemoryAPIAvailable()) return;

		this.isMonitoring = true;

		this.monitoringTimer = setInterval(() => {
			if (!document.hidden) {
				this.checkMemoryUsage();
			}
		}, this.monitoringInterval);

		console.log('📊 Memory monitoring started');
	}

	/**
	 * Stop memory monitoring
	 */
	public stopMonitoring(): void {
		if (!this.isMonitoring) return;

		this.isMonitoring = false;

		if (this.monitoringTimer) {
			clearInterval(this.monitoringTimer);
			this.monitoringTimer = null;
		}

		console.log('⏹️ Memory monitoring stopped');
	}

	/**
	 * Check current memory usage and trigger optimizations if needed
	 */
	private checkMemoryUsage(): void {
		try {
			const memoryInfo = this.getCurrentMemoryInfo();

			// Add to history
			this.memoryHistory.push(memoryInfo);
			if (this.memoryHistory.length > this.historyMaxSize) {
				this.memoryHistory = this.memoryHistory.slice(-this.historyMaxSize);
			}

			// Notify listeners
			this.notifyListeners(memoryInfo);

			// Check for memory pressure and take action
			this.handleMemoryPressure(memoryInfo);
		} catch (error) {
			console.warn('Error checking memory usage:', error);
		}
	}

	/**
	 * Get current memory information
	 */
	private getCurrentMemoryInfo(): MemoryInfo {
		const memory = (performance as any).memory;

		const usedJSHeapSize = memory.usedJSHeapSize;
		const totalJSHeapSize = memory.totalJSHeapSize;
		const jsHeapSizeLimit = memory.jsHeapSizeLimit;

		const usagePercentage = usedJSHeapSize / jsHeapSizeLimit;
		const usedMB = usedJSHeapSize / (1024 * 1024);
		const limitMB = jsHeapSizeLimit / (1024 * 1024);
		const availableMB = limitMB - usedMB;

		return {
			usedJSHeapSize,
			totalJSHeapSize,
			jsHeapSizeLimit,
			usagePercentage,
			usedMB,
			limitMB,
			availableMB
		};
	}

	/**
	 * Handle memory pressure by taking appropriate actions
	 */
	private handleMemoryPressure(memoryInfo: MemoryInfo): void {
		const pressure = this.getMemoryPressureLevel(memoryInfo.usagePercentage);

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
		}

		// Trigger cleanup if threshold exceeded
		if (memoryInfo.usagePercentage > this.THRESHOLDS.CLEANUP_THRESHOLD) {
			this.performCleanup();
		}
	}

	/**
	 * Get memory pressure level based on usage percentage
	 */
	private getMemoryPressureLevel(usagePercentage: number): MemoryPressure {
		if (usagePercentage >= this.THRESHOLDS.CRITICAL_PRESSURE) return 'critical';
		if (usagePercentage >= this.THRESHOLDS.HIGH_PRESSURE) return 'high';
		if (usagePercentage >= this.THRESHOLDS.MEDIUM_PRESSURE) return 'medium';
		return 'low';
	}

	/**
	 * Handle medium memory pressure
	 */
	private handleMediumPressure(memoryInfo: MemoryInfo): void {
		this.emitMemoryEvent('warning', memoryInfo, 'Medium memory pressure detected');

		// Gentle optimizations
		this.cleanupObjectPools();
		this.requestGarbageCollection(1000); // Delayed GC hint
	}

	/**
	 * Handle high memory pressure
	 */
	private handleHighPressure(memoryInfo: MemoryInfo): void {
		this.emitMemoryEvent('warning', memoryInfo, 'High memory pressure detected');

		// More aggressive optimizations
		this.cleanupObjectPools();
		this.clearOldHistory();
		this.requestGarbageCollection(500); // Faster GC hint
	}

	/**
	 * Handle critical memory pressure
	 */
	private handleCriticalPressure(memoryInfo: MemoryInfo): void {
		this.emitMemoryEvent('critical', memoryInfo, 'Critical memory pressure - emergency cleanup');

		// Emergency cleanup
		this.performEmergencyCleanup();
		this.requestGarbageCollection(0); // Immediate GC hint
	}

	/**
	 * Emit a memory event
	 */
	private emitMemoryEvent(
		type: MemoryEvent['type'],
		memoryInfo: MemoryInfo,
		action?: string
	): void {
		const event: MemoryEvent = {
			type,
			timestamp: Date.now(),
			memoryInfo,
			action
		};

		this.memoryEvents.push(event);

		// Trim events history
		if (this.memoryEvents.length > this.eventsMaxSize) {
			this.memoryEvents = this.memoryEvents.slice(-this.eventsMaxSize);
		}

		// Notify event listeners
		this.notifyEventListeners(event);

		console.log(`🧠 Memory Event [${type.toUpperCase()}]: ${action}`);
	}

	/**
	 * Cleanup object pools
	 */
	private cleanupObjectPools(): void {
		for (const [name, pool] of this.objectPools) {
			// Reduce pool size if it's grown too large
			if (pool.length > 20) {
				const excessObjects = pool.splice(20);
				console.log(`🧹 Cleaned up ${excessObjects.length} objects from pool '${name}'`);
			}
		}
	}

	/**
	 * Clear old history to free memory
	 */
	private clearOldHistory(): void {
		// Keep only recent memory history
		if (this.memoryHistory.length > 50) {
			this.memoryHistory = this.memoryHistory.slice(-50);
		}

		// Keep only recent events
		if (this.memoryEvents.length > 25) {
			this.memoryEvents = this.memoryEvents.slice(-25);
		}

		console.log('🧹 Cleared old memory history');
	}

	/**
	 * Perform general cleanup
	 */
	public performCleanup(): void {
		this.emitMemoryEvent('cleanup', this.getCurrentMemoryInfo(), 'Performing general cleanup');

		// Run all registered cleanup tasks
		this.cleanupTasks.forEach((task) => {
			try {
				task();
			} catch (error) {
				console.warn('Error in cleanup task:', error);
			}
		});

		// Cleanup object pools
		this.cleanupObjectPools();

		// Clear old data
		this.clearOldHistory();

		console.log('🧹 General cleanup completed');
	}

	/**
	 * Perform emergency cleanup for critical memory situations
	 */
	private performEmergencyCleanup(): void {
		console.warn('🚨 Performing emergency memory cleanup');

		// Clear all pools except essential ones
		for (const [name, pool] of this.objectPools) {
			if (name !== 'stars') {
				// Keep stars pool as it's essential
				pool.length = 0;
			}
		}

		// Clear most history
		this.memoryHistory = this.memoryHistory.slice(-10);
		this.memoryEvents = this.memoryEvents.slice(-10);

		// Force immediate cleanup
		this.performCleanup();

		console.log('🚨 Emergency cleanup completed');
	}

	/**
	 * Request garbage collection (with delay to avoid spamming)
	 */
	private requestGarbageCollection(delay: number = 1000): void {
		if (this.gcHintTimer) {
			clearTimeout(this.gcHintTimer);
		}

		this.gcHintTimer = setTimeout(() => {
			// Try manual GC if available (Chrome DevTools)
			if ((window as any).gc) {
				try {
					(window as any).gc();
					console.log('🗑️ Manual garbage collection triggered');
				} catch (error) {
					// GC not available
				}
			}

			// Alternative GC hints
			this.createGCHint();

			this.gcHintTimer = null;
		}, delay);
	}

	/**
	 * Create objects that hint to the browser to garbage collect
	 */
	private createGCHint(): void {
		// Create and immediately discard objects to hint GC
		const tempObjects = [];
		for (let i = 0; i < 100; i++) {
			tempObjects.push({ data: new Array(100).fill(i) });
		}

		// Force computation to prevent optimization
		const sum = tempObjects.reduce((acc, obj) => acc + obj.data.length, 0);

		// Clear references
		tempObjects.length = 0;

		// Create a promise to delay execution slightly
		Promise.resolve().then(() => {
			// Additional hint
			const anotherHint = new Array(1000).fill(sum);
			anotherHint.length = 0;
		});
	}

	/**
	 * Schedule periodic cleanup
	 */
	private schedulePeriodicCleanup(): void {
		setInterval(() => {
			if (!document.hidden) {
				this.performCleanup();
			}
		}, 30000); // Every 30 seconds
	}

	/**
	 * Register a cleanup task
	 */
	public registerCleanupTask(task: () => void): () => void {
		this.cleanupTasks.push(task);

		// Return unregister function
		return () => {
			this.cleanupTasks = this.cleanupTasks.filter((t) => t !== task);
		};
	}

	/**
	 * Handle visibility change
	 */
	private handleVisibilityChange = (): void => {
		if (document.hidden) {
			// Page hidden - perform cleanup
			this.performCleanup();
			this.stopMonitoring();
		} else {
			// Page visible - resume monitoring
			setTimeout(() => {
				this.startMonitoring();
			}, 1000);
		}
	};

	/**
	 * Handle page unload
	 */
	private handlePageUnload = (): void => {
		this.cleanup();
	};

	/**
	 * Notify memory listeners
	 */
	private notifyListeners(memoryInfo: MemoryInfo): void {
		this.listeners.forEach((listener) => {
			try {
				listener(memoryInfo);
			} catch (error) {
				console.error('Error in memory listener:', error);
			}
		});
	}

	/**
	 * Notify event listeners
	 */
	private notifyEventListeners(event: MemoryEvent): void {
		this.eventListeners.forEach((listener) => {
			try {
				listener(event);
			} catch (error) {
				console.error('Error in memory event listener:', error);
			}
		});
	}

	/**
	 * Public API methods
	 */
	public getCurrentMemory(): MemoryInfo | null {
		return this.isMemoryAPIAvailable() ? this.getCurrentMemoryInfo() : null;
	}

	public getMemoryHistory(): MemoryInfo[] {
		return [...this.memoryHistory];
	}

	public getMemoryEvents(): MemoryEvent[] {
		return [...this.memoryEvents];
	}

	public getPoolStats(): Map<string, { created: number; reused: number; active: number }> {
		return new Map(this.poolStats);
	}

	public getMemoryOptimization(): MemoryOptimization {
		const currentMemory = this.getCurrentMemory();
		const pressure = currentMemory
			? this.getMemoryPressureLevel(currentMemory.usagePercentage)
			: 'low';

		const optimizations: Record<MemoryPressure, MemoryOptimization> = {
			low: {
				level: 'low',
				actions: ['No optimization needed'],
				starCountReduction: 0,
				qualityReduction: 0,
				disableEffects: [],
				forceGC: false
			},
			medium: {
				level: 'medium',
				actions: ['Clean object pools', 'Clear old history'],
				starCountReduction: 0.1,
				qualityReduction: 0.1,
				disableEffects: [],
				forceGC: false
			},
			high: {
				level: 'high',
				actions: ['Reduce star count', 'Disable non-essential effects', 'Clear caches'],
				starCountReduction: 0.2,
				qualityReduction: 0.2,
				disableEffects: ['parallax'],
				forceGC: true
			},
			critical: {
				level: 'critical',
				actions: ['Emergency cleanup', 'Minimal star count', 'Disable all effects'],
				starCountReduction: 0.5,
				qualityReduction: 0.4,
				disableEffects: ['glow', 'trails', 'parallax'],
				forceGC: true
			}
		};

		return optimizations[pressure];
	}

	public onMemoryChange(listener: (info: MemoryInfo) => void): () => void {
		this.listeners.push(listener);
		return () => {
			this.listeners = this.listeners.filter((l) => l !== listener);
		};
	}

	public onMemoryEvent(listener: (event: MemoryEvent) => void): () => void {
		this.eventListeners.push(listener);
		return () => {
			this.eventListeners = this.eventListeners.filter((l) => l !== listener);
		};
	}

	/**
	 * Cleanup the memory manager
	 */
	public cleanup(): void {
		this.stopMonitoring();

		// Clear timers
		if (this.gcHintTimer) {
			clearTimeout(this.gcHintTimer);
			this.gcHintTimer = null;
		}

		// Remove event listeners
		document.removeEventListener('visibilitychange', this.handleVisibilityChange);
		window.removeEventListener('beforeunload', this.handlePageUnload);

		// Clear all pools
		this.objectPools.clear();
		this.poolStats.clear();

		// Clear data
		this.memoryHistory = [];
		this.memoryEvents = [];
		this.listeners = [];
		this.eventListeners = [];
		this.cleanupTasks = [];

		console.log('🧹 Memory manager cleaned up');
	}
}

// Create singleton instance
const memoryManager = new MemoryManager();

// Create Svelte stores
export const currentMemoryInfo = writable<MemoryInfo | null>(null);
export const memoryEvents = writable<MemoryEvent[]>([]);

// Subscribe to memory updates only in browser
if (browser) {
	// Delay initialization to avoid SSR issues
	setTimeout(() => {
		try {
			memoryManager.onMemoryChange((info) => {
				currentMemoryInfo.set(info);
			});

			memoryManager.onMemoryEvent((event) => {
				memoryEvents.update((events) => [...events, event]);
			});
		} catch (error) {
			console.warn('Failed to setup memory monitoring subscriptions:', error);
		}
	}, 100);
}

// Derived stores
export const memoryPressure = derived(currentMemoryInfo, ($info) => {
	if (!$info) return 'low';
	if ($info.usagePercentage >= 0.9) return 'critical';
	if ($info.usagePercentage >= 0.75) return 'high';
	if ($info.usagePercentage >= 0.6) return 'medium';
	return 'low';
});

export const memoryUsagePercentage = derived(
	currentMemoryInfo,
	($info) => $info?.usagePercentage || 0
);

export const availableMemoryMB = derived(currentMemoryInfo, ($info) => $info?.availableMB || 0);

// Export the manager instance and utilities
export { memoryManager };

// Utility functions
export function formatBytes(bytes: number): string {
	const sizes = ['Bytes', 'KB', 'MB', 'GB'];
	if (bytes === 0) return '0 Bytes';
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}

export function getMemoryRecommendations(): string[] {
	const optimization = memoryManager.getMemoryOptimization();
	const recommendations: string[] = [];

	if (optimization.level === 'low') {
		recommendations.push('Memory usage is optimal');
	} else {
		recommendations.push(...optimization.actions);

		if (optimization.starCountReduction > 0) {
			recommendations.push(
				`Consider reducing star count by ${Math.round(optimization.starCountReduction * 100)}%`
			);
		}

		if (optimization.qualityReduction > 0) {
			recommendations.push(
				`Consider reducing quality by ${Math.round(optimization.qualityReduction * 100)}%`
			);
		}

		if (optimization.disableEffects.length > 0) {
			recommendations.push(`Consider disabling: ${optimization.disableEffects.join(', ')}`);
		}
	}

	return recommendations;
}

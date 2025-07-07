// src/lib/utils/unified-memory-manager.ts
import { browser } from '$app/environment';
import { writable, derived, get } from 'svelte/store';
import { canvasPoolManager } from './canvas-pool-manager';
import { starPoolBridge } from './star-pool-bridge';
import { frameRateController } from './frame-rate-controller';
import { deviceCapabilities } from './device-performance';

/**
 * Memory usage breakdown by component
 */
interface MemoryBreakdown {
	canvasPool: number; // MB
	starPool: number; // MB
	renderBuffers: number; // MB
	workerMemory: number; // MB
	domElements: number; // MB
	jsHeap: number; // MB
	total: number; // MB
}

/**
 * Memory optimization settings
 */
interface MemoryOptimizationConfig {
	enableAgressiveGC: boolean;
	maxMemoryUsage: number; // MB
	gcThreshold: number; // Ratio (0-1)
	hibernationEnabled: boolean;
	hibernationDelay: number; // ms
	poolSizeLimit: number;
	canvasLimit: number;
	enableMemoryWarnings: boolean;
	logMemoryStats: boolean;
}

/**
 * Memory pressure levels
 */
enum MemoryPressure {
	LOW = 'low',
	MEDIUM = 'medium',
	HIGH = 'high',
	CRITICAL = 'critical'
}

/**
 * Memory event types
 */
interface MemoryEvent {
	type: 'pressure' | 'warning' | 'gc' | 'optimization';
	level: MemoryPressure;
	data: any;
	timestamp: number;
}

/**
 * Unified memory management system that coordinates all memory-intensive components
 * Provides centralized monitoring, optimization, and emergency cleanup
 */
export class UnifiedMemoryManager {
	private config: MemoryOptimizationConfig;
	private memoryBreakdown: MemoryBreakdown;
	private currentPressure: MemoryPressure = MemoryPressure.LOW;
	private lastGCTime = 0;
	private lastMemoryCheck = 0;
	private memoryCheckInterval = 2000; // Check every 2 seconds
	private memoryHistory: number[] = [];
	private maxHistoryLength = 10;

	// Monitoring
	private monitoringInterval: ReturnType<typeof setInterval> | null = null;
	private performanceObserver: PerformanceObserver | null = null;
	private memoryEventListeners: ((event: MemoryEvent) => void)[] = [];

	// Emergency cleanup callbacks
	private emergencyCleanupCallbacks: (() => void)[] = [];

	// Optimization states
	private isOptimizing = false;
	private optimizationQueue: (() => Promise<void>)[] = [];
	private lastOptimizationTime = 0;

	constructor(config?: Partial<MemoryOptimizationConfig>) {
		// Default configuration
		this.config = {
			enableAgressiveGC: false,
			maxMemoryUsage: 512, // 512MB default limit
			gcThreshold: 0.8, // Trigger cleanup at 80% usage
			hibernationEnabled: true,
			hibernationDelay: 30000, // 30 seconds
			poolSizeLimit: 1000,
			canvasLimit: 8,
			enableMemoryWarnings: true,
			logMemoryStats: false,
			...config
		};

		// Initialize memory breakdown
		this.memoryBreakdown = {
			canvasPool: 0,
			starPool: 0,
			renderBuffers: 0,
			workerMemory: 0,
			domElements: 0,
			jsHeap: 0,
			total: 0
		};

		if (browser) {
			this.initializeMonitoring();
			this.setupDeviceOptimizations();
		}
	}

	/**
	 * Initialize memory monitoring systems
	 */
	private initializeMonitoring(): void {
		// Setup periodic memory checks
		this.monitoringInterval = setInterval(() => {
			this.checkMemoryUsage();
		}, this.memoryCheckInterval);

		// Setup Performance Observer for memory monitoring
		if ('PerformanceObserver' in window) {
			try {
				this.performanceObserver = new PerformanceObserver((list) => {
					for (const entry of list.getEntries()) {
						if (entry.entryType === 'measure' && entry.name.includes('memory')) {
							this.handlePerformanceEntry(entry);
						}
					}
				});

				this.performanceObserver.observe({ entryTypes: ['measure'] });
			} catch (error) {
				console.warn('PerformanceObserver not fully supported:', error);
			}
		}

		// Listen for browser memory pressure events
		if ('memory' in performance) {
			// Monitor JS heap size changes
			this.setupHeapMonitoring();
		}

		// Setup page visibility change listener
		document.addEventListener('visibilitychange', () => {
			if (document.hidden) {
				this.onPageHidden();
			} else {
				this.onPageVisible();
			}
		});

		// Setup beforeunload cleanup
		window.addEventListener('beforeunload', () => {
			this.emergencyCleanup();
		});
	}

	/**
	 * Setup heap memory monitoring
	 */
	private setupHeapMonitoring(): void {
		if (!('memory' in performance)) return;

		// Check heap usage more frequently during heavy operations
		const heapCheckInterval = setInterval(() => {
			try {
				const memory = (performance as any).memory;
				if (memory) {
					const usedHeap = memory.usedJSHeapSize;
					const totalHeap = memory.totalJSHeapSize;
					const heapLimit = memory.jsHeapSizeLimit;

					this.memoryBreakdown.jsHeap = usedHeap / (1024 * 1024);

					// Check for memory pressure
					const heapPressure = usedHeap / heapLimit;
					if (heapPressure > 0.9) {
						this.handleMemoryPressure(MemoryPressure.CRITICAL);
					} else if (heapPressure > 0.8) {
						this.handleMemoryPressure(MemoryPressure.HIGH);
					} else if (heapPressure > 0.6) {
						this.handleMemoryPressure(MemoryPressure.MEDIUM);
					}
				}
			} catch (error) {
				// Ignore errors accessing memory API
			}
		}, 5000);

		// Store interval for cleanup
		(this as any).heapCheckInterval = heapCheckInterval;
	}

	/**
	 * Setup device-specific optimizations
	 */
	private setupDeviceOptimizations(): void {
		const capabilities = get(deviceCapabilities);

		if (capabilities) {
			// Adjust limits based on device capabilities
			if (capabilities.tier === 'low') {
				this.config.maxMemoryUsage = Math.min(this.config.maxMemoryUsage, 256);
				this.config.poolSizeLimit = Math.min(this.config.poolSizeLimit, 300);
				this.config.canvasLimit = Math.min(this.config.canvasLimit, 4);
				this.config.enableAgressiveGC = true;
			} else if (capabilities.tier === 'high') {
				this.config.maxMemoryUsage = Math.max(this.config.maxMemoryUsage, 1024);
				this.config.poolSizeLimit = Math.max(this.config.poolSizeLimit, 2000);
			}

			// Mobile-specific optimizations
			if (capabilities.isMobile) {
				this.config.hibernationDelay = Math.min(this.config.hibernationDelay, 15000);
				this.config.gcThreshold = Math.min(this.config.gcThreshold, 0.7);
			}

			// Low memory device optimizations
			if (capabilities.isLowPowerDevice) {
				this.config.enableAgressiveGC = true;
				this.config.maxMemoryUsage = Math.min(this.config.maxMemoryUsage, 128);
				this.config.hibernationDelay = 10000;
			}
		}
	}

	/**
	 * Check current memory usage across all components
	 */
	private async checkMemoryUsage(): Promise<void> {
		const now = performance.now();
		if (now - this.lastMemoryCheck < this.memoryCheckInterval) return;

		this.lastMemoryCheck = now;

		try {
			// Get canvas pool memory usage
			const canvasStats = canvasPoolManager.getStats();
			this.memoryBreakdown.canvasPool = canvasStats.totalCanvasMemory || 0;

			// Get star pool memory usage from bridge
			const starPoolStats = starPoolBridge ? await this.getStarPoolMemory() : 0;
			this.memoryBreakdown.starPool = starPoolStats;

			// Estimate DOM element memory usage
			this.memoryBreakdown.domElements = this.estimateDOMMemory();

			// Get JS heap usage if available
			if ('memory' in performance) {
				const memory = (performance as any).memory;
				if (memory) {
					this.memoryBreakdown.jsHeap = memory.usedJSHeapSize / (1024 * 1024);
				}
			}

			// Calculate total memory usage
			this.memoryBreakdown.total =
				this.memoryBreakdown.canvasPool +
				this.memoryBreakdown.starPool +
				this.memoryBreakdown.renderBuffers +
				this.memoryBreakdown.workerMemory +
				this.memoryBreakdown.domElements;

			// Update memory history
			this.memoryHistory.push(this.memoryBreakdown.total);
			if (this.memoryHistory.length > this.maxHistoryLength) {
				this.memoryHistory.shift();
			}

			// Check for memory pressure
			this.evaluateMemoryPressure();

			// Log stats if enabled
			if (this.config.logMemoryStats) {
				this.logMemoryStats();
			}
		} catch (error) {
			console.error('Error checking memory usage:', error);
		}
	}

	/**
	 * Get star pool memory usage estimate
	 */
	private async getStarPoolMemory(): Promise<number> {
		try {
			// This would need to be implemented based on the actual star pool usage
			// For now, estimate based on typical star object size
			const estimatedStarSize = 0.2; // KB per star
			const activeStars = 500; // Estimate, would need actual count
			return (activeStars * estimatedStarSize) / 1024; // Convert to MB
		} catch (error) {
			return 0;
		}
	}

	/**
	 * Estimate DOM element memory usage
	 */
	private estimateDOMMemory(): number {
		try {
			// Rough estimate based on DOM complexity
			const elements = document.querySelectorAll('*').length;
			const estimatedSizePerElement = 0.1; // KB per element
			return (elements * estimatedSizePerElement) / 1024; // Convert to MB
		} catch (error) {
			return 0;
		}
	}

	/**
	 * Evaluate current memory pressure level
	 */
	private evaluateMemoryPressure(): void {
		const memoryRatio = this.memoryBreakdown.total / this.config.maxMemoryUsage;
		let newPressure: MemoryPressure;

		if (memoryRatio > 0.95) {
			newPressure = MemoryPressure.CRITICAL;
		} else if (memoryRatio > 0.85) {
			newPressure = MemoryPressure.HIGH;
		} else if (memoryRatio > 0.7) {
			newPressure = MemoryPressure.MEDIUM;
		} else {
			newPressure = MemoryPressure.LOW;
		}

		if (newPressure !== this.currentPressure) {
			this.handleMemoryPressure(newPressure);
		}
	}

	/**
	 * Handle memory pressure level changes
	 */
	private handleMemoryPressure(level: MemoryPressure): void {
		const previousPressure = this.currentPressure;
		this.currentPressure = level;

		// Emit memory event
		this.emitMemoryEvent({
			type: 'pressure',
			level,
			data: { previous: previousPressure, current: level },
			timestamp: performance.now()
		});

		// Take action based on pressure level
		switch (level) {
			case MemoryPressure.MEDIUM:
				this.scheduleOptimization(() => this.mediumPressureOptimization());
				break;

			case MemoryPressure.HIGH:
				this.scheduleOptimization(() => this.highPressureOptimization());
				break;

			case MemoryPressure.CRITICAL:
				this.emergencyOptimization();
				break;

			case MemoryPressure.LOW:
				// Allow some recovery optimizations
				this.scheduleOptimization(() => this.lowPressureRecovery());
				break;
		}
	}

	/**
	 * Medium pressure optimization
	 */
	private async mediumPressureOptimization(): Promise<void> {
		console.log('🟡 Medium memory pressure - starting optimization');

		// Reduce quality settings
		frameRateController.setQualityOverride(0.8);

		// Trigger canvas pool cleanup
		if (canvasPoolManager) {
			// This would need to be implemented in canvas pool manager
			// canvasPoolManager.optimizeMemory();
		}

		// Reduce star pool sizes
		this.optimizeStarPools(0.8);

		// Emit optimization event
		this.emitMemoryEvent({
			type: 'optimization',
			level: MemoryPressure.MEDIUM,
			data: { action: 'medium_pressure_optimization' },
			timestamp: performance.now()
		});
	}

	/**
	 * High pressure optimization
	 */
	private async highPressureOptimization(): Promise<void> {
		console.log('🟠 High memory pressure - aggressive optimization');

		// Significantly reduce quality
		frameRateController.setQualityOverride(0.6);

		// Aggressive canvas cleanup
		// Force canvas pool to release unused canvases

		// Reduce star pools more aggressively
		this.optimizeStarPools(0.6);

		// Force garbage collection if available
		this.forceGarbageCollection();

		// Emit optimization event
		this.emitMemoryEvent({
			type: 'optimization',
			level: MemoryPressure.HIGH,
			data: { action: 'high_pressure_optimization' },
			timestamp: performance.now()
		});
	}

	/**
	 * Emergency optimization for critical memory pressure
	 */
	private emergencyOptimization(): void {
		console.error('🔴 Critical memory pressure - emergency optimization');

		// Stop all non-essential operations
		frameRateController.setQualityOverride(0.3);

		// Emergency cleanup
		this.emergencyCleanup();

		// Emit critical event
		this.emitMemoryEvent({
			type: 'warning',
			level: MemoryPressure.CRITICAL,
			data: { action: 'emergency_optimization' },
			timestamp: performance.now()
		});
	}

	/**
	 * Low pressure recovery operations
	 */
	private async lowPressureRecovery(): Promise<void> {
		// Gradually restore quality if memory pressure is low
		const currentQuality = frameRateController.getCurrentQuality();
		if (currentQuality < 1.0) {
			frameRateController.setQualityOverride(Math.min(1.0, currentQuality + 0.1));
		}
	}

	/**
	 * Optimize star pools based on memory pressure
	 */
	private optimizeStarPools(qualityFactor: number): void {
		// This would need integration with actual star pool implementations
		// For now, emit events that components can listen to

		const event = new CustomEvent('memoryOptimization', {
			detail: {
				type: 'starPool',
				qualityFactor,
				action: 'reduce_capacity'
			}
		});

		if (browser) {
			window.dispatchEvent(event);
		}
	}

	/**
	 * Force garbage collection if available
	 */
	private forceGarbageCollection(): void {
		const now = performance.now();

		// Don't force GC too frequently
		if (now - this.lastGCTime < 5000) return;

		this.lastGCTime = now;

		try {
			// Try to force GC in development/testing environments
			if ((window as any).gc) {
				(window as any).gc();
				console.log('🗑️ Forced garbage collection');
			}
		} catch (error) {
			// GC not available
		}

		// Alternative GC hint by creating and releasing large objects
		this.hintGarbageCollection();

		// Emit GC event
		this.emitMemoryEvent({
			type: 'gc',
			level: this.currentPressure,
			data: { forced: true },
			timestamp: now
		});
	}

	/**
	 * Hint garbage collection by creating temporary objects
	 */
	private hintGarbageCollection(): void {
		// Create and immediately release temporary objects to hint GC
		const tempArrays: any[] = [];

		for (let i = 0; i < 10; i++) {
			tempArrays.push(new Array(1000).fill(null));
		}

		// Clear references
		tempArrays.length = 0;
	}

	/**
	 * Schedule optimization to run on next frame
	 */
	private scheduleOptimization(optimization: () => Promise<void>): void {
		if (this.isOptimizing) {
			this.optimizationQueue.push(optimization);
			return;
		}

		this.isOptimizing = true;

		requestAnimationFrame(async () => {
			try {
				await optimization();
				this.lastOptimizationTime = performance.now();
			} catch (error) {
				console.error('Optimization error:', error);
			} finally {
				this.isOptimizing = false;

				// Process queued optimizations
				if (this.optimizationQueue.length > 0) {
					const nextOptimization = this.optimizationQueue.shift();
					if (nextOptimization) {
						this.scheduleOptimization(nextOptimization);
					}
				}
			}
		});
	}

	/**
	 * Handle page becoming hidden
	 */
	private onPageHidden(): void {
		console.log('📱 Page hidden - triggering hibernation');

		// Trigger hibernation in all components
		if (this.config.hibernationEnabled) {
			const event = new CustomEvent('memoryHibernation', {
				detail: { action: 'hibernate' }
			});

			if (browser) {
				window.dispatchEvent(event);
			}
		}

		// Reduce monitoring frequency
		if (this.monitoringInterval) {
			clearInterval(this.monitoringInterval);
			this.monitoringInterval = setInterval(() => {
				this.checkMemoryUsage();
			}, this.memoryCheckInterval * 4); // Check 4x less frequently
		}
	}

	/**
	 * Handle page becoming visible
	 */
	private onPageVisible(): void {
		console.log('👁️ Page visible - resuming normal operation');

		// Resume normal operation
		const event = new CustomEvent('memoryHibernation', {
			detail: { action: 'resume' }
		});

		if (browser) {
			window.dispatchEvent(event);
		}

		// Resume normal monitoring frequency
		if (this.monitoringInterval) {
			clearInterval(this.monitoringInterval);
			this.monitoringInterval = setInterval(() => {
				this.checkMemoryUsage();
			}, this.memoryCheckInterval);
		}
	}

	/**
	 * Emergency cleanup of all resources
	 */
	private emergencyCleanup(): void {
		console.log('🚨 Emergency cleanup initiated');

		// Run all registered emergency cleanup callbacks
		for (const callback of this.emergencyCleanupCallbacks) {
			try {
				callback();
			} catch (error) {
				console.error('Emergency cleanup callback error:', error);
			}
		}

		// Force aggressive garbage collection
		this.forceGarbageCollection();
	}

	/**
	 * Handle performance entries from PerformanceObserver
	 */
	private handlePerformanceEntry(entry: PerformanceEntry): void {
		// Process performance entries related to memory
		if (entry.name.includes('memory') || entry.name.includes('gc')) {
			console.log('Performance entry:', entry);
		}
	}

	/**
	 * Emit memory event to listeners
	 */
	private emitMemoryEvent(event: MemoryEvent): void {
		for (const listener of this.memoryEventListeners) {
			try {
				listener(event);
			} catch (error) {
				console.error('Memory event listener error:', error);
			}
		}

		// Also emit as DOM event for component integration
		if (browser) {
			const domEvent = new CustomEvent('memoryEvent', { detail: event });
			window.dispatchEvent(domEvent);
		}
	}

	/**
	 * Log memory statistics to console
	 */
	private logMemoryStats(): void {
		console.group('💾 Memory Usage Breakdown');
		console.log('Canvas Pool:', `${this.memoryBreakdown.canvasPool.toFixed(2)} MB`);
		console.log('Star Pool:', `${this.memoryBreakdown.starPool.toFixed(2)} MB`);
		console.log('Render Buffers:', `${this.memoryBreakdown.renderBuffers.toFixed(2)} MB`);
		console.log('Worker Memory:', `${this.memoryBreakdown.workerMemory.toFixed(2)} MB`);
		console.log('DOM Elements:', `${this.memoryBreakdown.domElements.toFixed(2)} MB`);
		console.log('JS Heap:', `${this.memoryBreakdown.jsHeap.toFixed(2)} MB`);
		console.log('Total:', `${this.memoryBreakdown.total.toFixed(2)} MB`);
		console.log('Pressure Level:', this.currentPressure);
		console.groupEnd();
	}

	/**
	 * Public API methods
	 */

	/**
	 * Register an emergency cleanup callback
	 */
	public registerEmergencyCleanup(callback: () => void): void {
		this.emergencyCleanupCallbacks.push(callback);
	}

	/**
	 * Add memory event listener
	 */
	public addEventListener(listener: (event: MemoryEvent) => void): void {
		this.memoryEventListeners.push(listener);
	}

	/**
	 * Remove memory event listener
	 */
	public removeEventListener(listener: (event: MemoryEvent) => void): void {
		const index = this.memoryEventListeners.indexOf(listener);
		if (index >= 0) {
			this.memoryEventListeners.splice(index, 1);
		}
	}

	/**
	 * Get current memory breakdown
	 */
	public getMemoryBreakdown(): MemoryBreakdown {
		return { ...this.memoryBreakdown };
	}

	/**
	 * Get current memory pressure level
	 */
	public getMemoryPressure(): MemoryPressure {
		return this.currentPressure;
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
		this.checkMemoryUsage();
	}

	/**
	 * Cleanup all resources
	 */
	public cleanup(): void {
		// Clear intervals
		if (this.monitoringInterval) {
			clearInterval(this.monitoringInterval);
		}

		if ((this as any).heapCheckInterval) {
			clearInterval((this as any).heapCheckInterval);
		}

		// Disconnect performance observer
		if (this.performanceObserver) {
			this.performanceObserver.disconnect();
		}

		// Clear event listeners
		this.memoryEventListeners = [];
		this.emergencyCleanupCallbacks = [];

		// Clear optimization queue
		this.optimizationQueue = [];

		console.log('🧹 UnifiedMemoryManager cleaned up');
	}
}

// Create and export singleton instance
export const unifiedMemoryManager = new UnifiedMemoryManager();

// Export stores for reactive integration
export const memoryBreakdownStore = writable<MemoryBreakdown>({
	canvasPool: 0,
	starPool: 0,
	renderBuffers: 0,
	workerMemory: 0,
	domElements: 0,
	jsHeap: 0,
	total: 0
});

export const memoryPressureStore = writable<MemoryPressure>(MemoryPressure.LOW);

// Update stores when memory manager updates
if (browser) {
	unifiedMemoryManager.addEventListener((event) => {
		if (event.type === 'pressure') {
			memoryPressureStore.set(event.level);
		}
	});

	// Periodic store updates
	setInterval(() => {
		memoryBreakdownStore.set(unifiedMemoryManager.getMemoryBreakdown());
		memoryPressureStore.set(unifiedMemoryManager.getMemoryPressure());
	}, 5000);
}

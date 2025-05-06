// src/lib/utils/memory-monitor.ts
import { browser } from '$app/environment';
import { writable, get, type Writable } from 'svelte/store';
import { deviceCapabilities } from './device-performance';

// Memory snapshot interface
export interface MemorySnapshot {
	timestamp: number;
	jsHeapSizeLimit: number;
	totalJSHeapSize: number;
	usedJSHeapSize: number;
	usageRatio: number;
	gcDetected: boolean;
}

// Memory event types
export enum MemoryEventType {
	GC_DETECTED = 'gc_detected',
	MEMORY_PRESSURE = 'memory_pressure',
	LEAK_SUSPECTED = 'leak_suspected',
	NORMAL = 'normal'
}

// Memory event interface
export interface MemoryEvent {
	type: MemoryEventType;
	timestamp: number;
	snapshot: MemorySnapshot;
	details: string;
	severity: 'info' | 'warning' | 'critical';
}

// Define the stores
export const memorySnapshotsStore: Writable<MemorySnapshot[]> = writable([]);
export const memoryEventsStore: Writable<MemoryEvent[]> = writable([]);
export const currentMemoryStore: Writable<MemorySnapshot | null> = writable(null);
export const memoryUsageStore: Writable<number> = writable(0);

/**
 * Memory Monitor
 * Provides detailed memory tracking, leak detection, and garbage collection analysis
 */
export class MemoryMonitor {
	private intervalId: ReturnType<typeof setInterval> | null = null;
	private checkInterval: number;
	private snapshots: MemorySnapshot[] = [];
	private events: MemoryEvent[] = [];
	private maxSnapshots: number = 100;
	private maxEvents: number = 50;
	private minGCDetectionThreshold: number = 0.1; // 10% drop for GC detection
	private memoryPressureThreshold: number = 0.85; // 85% usage warning
	private memoryLeakDetectionPeriod: number = 10; // Check last 10 snapshots for leaks
	private memoryLeakGrowthThreshold: number = 0.05; // 5% consistent growth suggests a leak
	private isMonitoring: boolean = false;
	private lastReportTime: number = 0;
	private lastGCTime: number = 0;
	private gcCooldownPeriod: number = 5000; // Minimum 5s between GC events

	// Memory allocation tracking
	private allocationTrackingEnabled: boolean = false;
	private allocationSites: Map<string, { count: number; size: number }> = new Map();

	private onMemoryPressureCallback: ((snapshot: MemorySnapshot) => void) | null = null;
	private onGCDetectedCallback: ((snapshot: MemorySnapshot) => void) | null = null;
	private onLeakSuspectedCallback: ((snapshot: MemorySnapshot) => void) | null = null;

	constructor(
		checkInterval = 2000, // Check every 2 seconds
		options: {
			maxSnapshots?: number;
			maxEvents?: number;
			gcDetectionThreshold?: number;
			memoryPressureThreshold?: number;
			leakDetectionPeriod?: number;
			leakGrowthThreshold?: number;
		} = {}
	) {
		this.checkInterval = checkInterval;

		// Apply custom options
		if (options.maxSnapshots) this.maxSnapshots = options.maxSnapshots;
		if (options.maxEvents) this.maxEvents = options.maxEvents;
		if (options.gcDetectionThreshold) this.minGCDetectionThreshold = options.gcDetectionThreshold;
		if (options.memoryPressureThreshold)
			this.memoryPressureThreshold = options.memoryPressureThreshold;
		if (options.leakDetectionPeriod) this.memoryLeakDetectionPeriod = options.leakDetectionPeriod;
		if (options.leakGrowthThreshold) this.memoryLeakGrowthThreshold = options.leakGrowthThreshold;
	}

	/**
	 * Start memory monitoring
	 */
	start(): void {
		if (!browser || this.isMonitoring) return;

		// Only start if performance.memory is available
		if (!('performance' in window) || !('memory' in (performance as any))) {
			console.warn('Memory monitoring not available in this browser');
			return;
		}

		this.isMonitoring = true;

		// Do an initial check
		this.checkMemory();

		// Start periodic checking
		this.intervalId = setInterval(() => {
			this.checkMemory();
		}, this.checkInterval);

		console.debug('Memory Monitor started');
	}

	/**
	 * Stop memory monitoring
	 */
	stop(): void {
		if (!this.isMonitoring) return;

		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}

		this.isMonitoring = false;
		console.debug('Memory Monitor stopped');
	}

	/**
	 * Set callback for memory pressure events
	 */
	onMemoryPressure(callback: (snapshot: MemorySnapshot) => void): MemoryMonitor {
		this.onMemoryPressureCallback = callback;
		return this;
	}

	/**
	 * Set callback for garbage collection events
	 */
	onGCDetected(callback: (snapshot: MemorySnapshot) => void): MemoryMonitor {
		this.onGCDetectedCallback = callback;
		return this;
	}

	/**
	 * Set callback for leak detection events
	 */
	onLeakSuspected(callback: (snapshot: MemorySnapshot) => void): MemoryMonitor {
		this.onLeakSuspectedCallback = callback;
		return this;
	}

	/**
	 * Check current memory usage
	 */
	private checkMemory(): void {
		if (!browser || !('performance' in window) || !('memory' in (performance as any))) return;

		const now = performance.now();
		const memory = (performance as any).memory;

		// Create memory snapshot
		const snapshot: MemorySnapshot = {
			timestamp: now,
			jsHeapSizeLimit: memory.jsHeapSizeLimit,
			totalJSHeapSize: memory.totalJSHeapSize,
			usedJSHeapSize: memory.usedJSHeapSize,
			usageRatio: memory.usedJSHeapSize / memory.jsHeapSizeLimit,
			gcDetected: false
		};

		// Check for garbage collection
		const gcDetected = this.detectGarbageCollection(snapshot);
		snapshot.gcDetected = gcDetected;

		// Check for memory pressure
		const isUnderMemoryPressure = this.detectMemoryPressure(snapshot);

		// Check for memory leaks
		const leakDetected = this.detectMemoryLeak();

		// Store snapshot
		this.addSnapshot(snapshot);

		// Update stores
		this.updateStores(snapshot);

		// Handle events
		if (gcDetected) {
			this.handleGCDetected(snapshot);
		}

		if (isUnderMemoryPressure) {
			this.handleMemoryPressure(snapshot);
		}

		if (leakDetected) {
			this.handleLeakDetected(snapshot);
		}
	}

	/**
	 * Detect garbage collection by looking for significant memory drops
	 */
	private detectGarbageCollection(snapshot: MemorySnapshot): boolean {
		if (this.snapshots.length === 0) return false;

		const previousSnapshot = this.snapshots[this.snapshots.length - 1];
		const memoryDrop = previousSnapshot.usedJSHeapSize - snapshot.usedJSHeapSize;
		const dropRatio = memoryDrop / previousSnapshot.usedJSHeapSize;

		// Significant drop in memory usage suggests garbage collection
		// But only if we haven't detected GC recently (avoid duplicates)
		const now = snapshot.timestamp;
		if (dropRatio > this.minGCDetectionThreshold && now - this.lastGCTime > this.gcCooldownPeriod) {
			this.lastGCTime = now;
			return true;
		}

		return false;
	}

	/**
	 * Detect when the application is under memory pressure
	 */
	private detectMemoryPressure(snapshot: MemorySnapshot): boolean {
		return snapshot.usageRatio > this.memoryPressureThreshold;
	}

	/**
	 * Detect potential memory leaks by analyzing memory usage patterns
	 */
	private detectMemoryLeak(): boolean {
		if (this.snapshots.length < this.memoryLeakDetectionPeriod) return false;

		// Get last N snapshots
		const recentSnapshots = this.snapshots.slice(-this.memoryLeakDetectionPeriod);

		// Check if memory usage is consistently increasing
		let consistentGrowth = true;
		let totalGrowthRatio = 0;

		for (let i = 1; i < recentSnapshots.length; i++) {
			const prev = recentSnapshots[i - 1];
			const current = recentSnapshots[i];

			// If memory decreased (e.g., due to GC), not a consistent increase
			if (current.usedJSHeapSize <= prev.usedJSHeapSize) {
				consistentGrowth = false;
				break;
			}

			// Calculate growth ratio
			const growthRatio = (current.usedJSHeapSize - prev.usedJSHeapSize) / prev.usedJSHeapSize;
			totalGrowthRatio += growthRatio;
		}

		// If memory consistently grew and total growth exceeds threshold
		const averageGrowthRatio = totalGrowthRatio / (recentSnapshots.length - 1);
		return consistentGrowth && averageGrowthRatio > this.memoryLeakGrowthThreshold;
	}

	/**
	 * Add a snapshot to the collection, maintaining maximum size
	 */
	private addSnapshot(snapshot: MemorySnapshot): void {
		this.snapshots.push(snapshot);

		// Keep collection size under limit
		if (this.snapshots.length > this.maxSnapshots) {
			this.snapshots.shift();
		}
	}

	/**
	 * Update the Svelte stores with latest data
	 */
	private updateStores(snapshot: MemorySnapshot): void {
		// Update current memory store
		currentMemoryStore.set(snapshot);

		// Update memory usage store (percentage)
		memoryUsageStore.set(snapshot.usageRatio);

		// Update snapshots store (for visualization)
		memorySnapshotsStore.update((snapshots) => {
			const updated = [...snapshots, snapshot];
			if (updated.length > this.maxSnapshots) {
				return updated.slice(-this.maxSnapshots);
			}
			return updated;
		});
	}

	/**
	 * Handle garbage collection detected event
	 */
	private handleGCDetected(snapshot: MemorySnapshot): void {
		const event: MemoryEvent = {
			type: MemoryEventType.GC_DETECTED,
			timestamp: snapshot.timestamp,
			snapshot,
			details: `Garbage collection detected. Memory reduced by ${((snapshot.usedJSHeapSize / this.snapshots[this.snapshots.length - 2].usedJSHeapSize) * 100 - 100).toFixed(1)}%`,
			severity: 'info'
		};

		this.addEvent(event);

		// Notify callback if registered
		if (this.onGCDetectedCallback) {
			this.onGCDetectedCallback(snapshot);
		}
	}

	/**
	 * Handle memory pressure event
	 */
	private handleMemoryPressure(snapshot: MemorySnapshot): void {
		// Only report memory pressure at most once per minute to avoid spam
		const now = snapshot.timestamp;
		if (now - this.lastReportTime < 60000) return;

		this.lastReportTime = now;

		const event: MemoryEvent = {
			type: MemoryEventType.MEMORY_PRESSURE,
			timestamp: snapshot.timestamp,
			snapshot,
			details: `Memory pressure detected. Usage: ${(snapshot.usageRatio * 100).toFixed(1)}%`,
			severity: snapshot.usageRatio > 0.95 ? 'critical' : 'warning'
		};

		this.addEvent(event);

		// Notify callback if registered
		if (this.onMemoryPressureCallback) {
			this.onMemoryPressureCallback(snapshot);
		}

		// Suggest garbage collection
		this.suggestGarbageCollection();
	}

	/**
	 * Handle memory leak detected event
	 */
	private handleLeakDetected(snapshot: MemorySnapshot): void {
		// Only report leaks once per minute to avoid spam
		const now = snapshot.timestamp;
		if (now - this.lastReportTime < 60000) return;

		this.lastReportTime = now;

		// Calculate growth rate
		const oldestSnapshot = this.snapshots[this.snapshots.length - this.memoryLeakDetectionPeriod];
		const memoryGrowth = snapshot.usedJSHeapSize - oldestSnapshot.usedJSHeapSize;
		const growthRate = (memoryGrowth / (snapshot.timestamp - oldestSnapshot.timestamp)) * 1000; // Bytes per second

		const event: MemoryEvent = {
			type: MemoryEventType.LEAK_SUSPECTED,
			timestamp: snapshot.timestamp,
			snapshot,
			details: `Possible memory leak detected. Memory growing at ${(growthRate / 1024).toFixed(1)} KB/s`,
			severity: 'warning'
		};

		this.addEvent(event);

		// Notify callback if registered
		if (this.onLeakSuspectedCallback) {
			this.onLeakSuspectedCallback(snapshot);
		}
	}

	/**
	 * Add an event to the collection, maintaining maximum size
	 */
	private addEvent(event: MemoryEvent): void {
		this.events.push(event);

		// Keep collection size under limit
		if (this.events.length > this.maxEvents) {
			this.events.shift();
		}

		// Update events store
		memoryEventsStore.update((events) => {
			const updated = [...events, event];
			if (updated.length > this.maxEvents) {
				return updated.slice(-this.maxEvents);
			}
			return updated;
		});

		// Log to console
		if (browser) {
			const logMethod =
				event.severity === 'critical'
					? console.error
					: event.severity === 'warning'
						? console.warn
						: console.info;

			logMethod(`[Memory Monitor] ${event.details}`);
		}
	}

	/**
	 * Helper to suggest garbage collection
	 */
	suggestGarbageCollection(): void {
		if (!browser) return;

		// First, directly request GC if available
		if ('gc' in window) {
			try {
				(window as any).gc();
				console.debug('Explicit garbage collection requested');
			} catch (e) {
				// GC not available or not permitted
			}
		}

		// Next, try to help trigger GC indirectly

		// 1. Clear any large arrays or objects
		const temp: any[] = [];
		for (let i = 0; i < 10000; i++) {
			temp.push({});
		}
		temp.length = 0;

		// 2. Apply CPU and allocation pressure
		setTimeout(() => {
			const start = performance.now();
			while (performance.now() - start < 100) {
				// Busy wait to trigger potential GC
				const obj = { text: 'temporary object for GC pressure' };
				obj.toString();
			}
		}, 0);

		// 3. Use the console directly
		console.debug('Suggesting garbage collection');
	}

	/**
	 * Get a memory leak diagnostic report
	 */
	getMemoryLeakReport(): string {
		if (!browser) return 'Memory leak reporting requires browser environment';

		// Get current memory stats
		const memory = (performance as any).memory;
		const currentUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;

		// Start building report
		let report = '## Memory Leak Diagnostic Report\n\n';
		report += `Generated: ${new Date().toLocaleString()}\n\n`;

		// Current memory stats
		report += '### Current Memory Usage\n\n';
		report += `- Total Memory Usage: ${(currentUsage * 100).toFixed(1)}%\n`;
		report += `- JS Heap Size: ${(memory.usedJSHeapSize / (1024 * 1024)).toFixed(1)} MB / ${(memory.jsHeapSizeLimit / (1024 * 1024)).toFixed(1)} MB\n`;
		report += `- Total JS Heap Size: ${(memory.totalJSHeapSize / (1024 * 1024)).toFixed(1)} MB\n\n`;

		// Memory trend analysis
		report += '### Memory Trend Analysis\n\n';

		if (this.snapshots.length < 2) {
			report += 'Insufficient data for trend analysis. Please wait for more data collection.\n\n';
		} else {
			// Calculate growth rate
			const first = this.snapshots[0];
			const last = this.snapshots[this.snapshots.length - 1];
			const memoryGrowth = last.usedJSHeapSize - first.usedJSHeapSize;
			const timeSpan = (last.timestamp - first.timestamp) / 1000; // seconds

			report += `- Monitoring Period: ${timeSpan.toFixed(1)} seconds\n`;
			report += `- Memory Change: ${(memoryGrowth / (1024 * 1024)).toFixed(2)} MB (${memoryGrowth > 0 ? '+' : ''}${((memoryGrowth / first.usedJSHeapSize) * 100).toFixed(1)}%)\n`;

			if (timeSpan > 0) {
				const growthRate = memoryGrowth / timeSpan; // Bytes per second
				report += `- Growth Rate: ${(growthRate / 1024).toFixed(1)} KB/s\n\n`;

				// Extrapolate time until memory pressure
				if (growthRate > 0) {
					const remainingMemory = memory.jsHeapSizeLimit - memory.usedJSHeapSize;
					const secondsUntilFull = remainingMemory / growthRate;

					if (secondsUntilFull < 3600) {
						report += `- Memory pressure expected in approximately ${(secondsUntilFull / 60).toFixed(1)} minutes if growth continues at this rate\n\n`;
					} else {
						report += `- Memory pressure expected in approximately ${(secondsUntilFull / 3600).toFixed(1)} hours if growth continues at this rate\n\n`;
					}
				}
			}

			// Memory stability analysis
			const growthPoints = [];
			const dropPoints = [];

			for (let i = 1; i < this.snapshots.length; i++) {
				const prev = this.snapshots[i - 1];
				const current = this.snapshots[i];
				const change = current.usedJSHeapSize - prev.usedJSHeapSize;

				if (change > 0) {
					growthPoints.push(change);
				} else if (change < 0) {
					dropPoints.push(Math.abs(change));
				}
			}

			report += `- Growth Events: ${growthPoints.length}\n`;
			report += `- Reduction Events: ${dropPoints.length}\n`;

			if (growthPoints.length > 0) {
				const avgGrowth = growthPoints.reduce((sum, val) => sum + val, 0) / growthPoints.length;
				report += `- Average Growth: ${(avgGrowth / 1024).toFixed(1)} KB\n`;
			}

			if (dropPoints.length > 0) {
				const avgDrop = dropPoints.reduce((sum, val) => sum + val, 0) / dropPoints.length;
				report += `- Average Reduction: ${(avgDrop / 1024).toFixed(1)} KB\n`;
			}

			report += '\n';
		}

		// Memory events analysis
		report += '### Memory Events\n\n';

		// Count event types
		const gcEvents = this.events.filter((e) => e.type === MemoryEventType.GC_DETECTED);
		const pressureEvents = this.events.filter((e) => e.type === MemoryEventType.MEMORY_PRESSURE);
		const leakEvents = this.events.filter((e) => e.type === MemoryEventType.LEAK_SUSPECTED);

		report += `- Garbage Collection Events: ${gcEvents.length}\n`;
		report += `- Memory Pressure Events: ${pressureEvents.length}\n`;
		report += `- Leak Detection Events: ${leakEvents.length}\n\n`;

		// Recent events
		report += '### Recent Events\n\n';

		if (this.events.length === 0) {
			report += 'No memory events recorded yet.\n\n';
		} else {
			report += '| Time | Type | Details | Severity |\n';
			report += '|------|------|---------|----------|\n';

			// Show most recent 10 events
			const recentEvents = this.events.slice(-10).reverse();

			for (const event of recentEvents) {
				const time = new Date(event.timestamp).toLocaleTimeString();
				report += `| ${time} | ${event.type} | ${event.details} | ${event.severity} |\n`;
			}

			report += '\n';
		}

		// Recommendations
		report += '### Recommendations\n\n';

		if (leakEvents.length > 2) {
			report +=
				'- **Critical**: Multiple memory leak events detected. Review recent code changes and consider implementing the following strategies:\n';
			report += "  - Check for event listeners that aren't being properly removed\n";
			report += '  - Look for objects being stored in closures or global state\n';
			report += '  - Review object pool implementation for potential leaks\n';
			report += '  - Consider using weak references for caches\n';
		} else if (pressureEvents.length > 2) {
			report +=
				'- **Warning**: Multiple memory pressure events detected. Consider implementing the following optimizations:\n';
			report += '  - Increase object pooling usage\n';
			report += '  - Reduce the maximum number of animated objects\n';
			report += '  - Implement aggressive resource cleanup for inactive elements\n';
		} else if (currentUsage > 0.7) {
			report +=
				'- **Suggestion**: Memory usage is moderately high. Consider implementing preemptive memory optimizations.\n';
		} else if (gcEvents.length < 2 && this.events.length > 5) {
			report +=
				'- **Information**: Few garbage collection events detected. This might indicate efficient memory usage or potential memory accumulation.\n';
		} else {
			report +=
				'- **Information**: Memory usage appears stable. Continue monitoring for changes.\n';
		}

		return report;
	}

	/**
	 * Enable allocation tracking (if available)
	 * Note: This is experimental and only works in certain environments
	 */
	enableAllocationTracking(): void {
		if (!browser || this.allocationTrackingEnabled) return;

		// Check if allocation tracking is supported
		if (typeof (performance as any).memory?.usedJSHeapSize === 'undefined') {
			console.warn('Allocation tracking not supported in this browser');
			return;
		}

		this.allocationTrackingEnabled = true;

		// Initialize tracking
		this.allocationSites.clear();

		// Enable performance observer if available
		if ('PerformanceObserver' in window) {
			try {
				const observer = new PerformanceObserver((list) => {
					for (const entry of list.getEntries()) {
						if (entry.entryType === 'memory') {
							this.checkMemory();
						}
					}
				});

				observer.observe({ entryTypes: ['memory'] });
			} catch (e) {
				console.warn('PerformanceObserver for memory not supported');
			}
		}

		console.debug('Allocation tracking enabled');
	}

	/**
	 * Disable allocation tracking
	 */
	disableAllocationTracking(): void {
		this.allocationTrackingEnabled = false;
		this.allocationSites.clear();
	}

	/**
	 * Get all recorded memory snapshots
	 */
	getSnapshots(): MemorySnapshot[] {
		return [...this.snapshots];
	}

	/**
	 * Get all recorded memory events
	 */
	getEvents(): MemoryEvent[] {
		return [...this.events];
	}

	/**
	 * Clear all recorded data
	 */
	clearData(): void {
		this.snapshots = [];
		this.events = [];
		this.allocationSites.clear();

		// Update stores
		memorySnapshotsStore.set([]);
		memoryEventsStore.set([]);
	}

	/**
	 * Force a memory snapshot
	 */
	takeSnapshot(): MemorySnapshot | null {
		if (!browser || !('performance' in window) || !('memory' in (performance as any))) {
			return null;
		}

		const now = performance.now();
		const memory = (performance as any).memory;

		const snapshot: MemorySnapshot = {
			timestamp: now,
			jsHeapSizeLimit: memory.jsHeapSizeLimit,
			totalJSHeapSize: memory.totalJSHeapSize,
			usedJSHeapSize: memory.usedJSHeapSize,
			usageRatio: memory.usedJSHeapSize / memory.jsHeapSizeLimit,
			gcDetected: false
		};

		// Add to snapshots
		this.addSnapshot(snapshot);

		// Update stores
		this.updateStores(snapshot);

		return snapshot;
	}
}

// Export singleton instance
export const memoryMonitor = new MemoryMonitor();

// Start monitoring when in browser environment
if (browser) {
	// Start monitoring on next tick to avoid startup impact
	setTimeout(() => {
		memoryMonitor.start();

		// Set up warning handler
		memoryMonitor.onMemoryPressure((snapshot) => {
			console.warn(`Memory pressure detected: ${(snapshot.usageRatio * 100).toFixed(1)}% used`);

			// Attempt to reduce memory pressure
			memoryMonitor.suggestGarbageCollection();
		});

		// Set up leak detection handler
		memoryMonitor.onLeakSuspected((snapshot) => {
			console.warn('Possible memory leak detected');
		});
	}, 1000);

	// Expose to window for debugging
	(window as any).memoryMonitor = memoryMonitor;
}

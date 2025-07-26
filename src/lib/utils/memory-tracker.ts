// src/lib/utils/memory-tracker.ts
import { browser } from '$app/environment';
import { writable, derived } from 'svelte/store';

// Core interfaces
export interface MemoryInfo {
	usedMB: number;
	limitMB: number;
	usagePercentage: number;
	lastUpdated: number;
}

export type MemoryPressure = 'low' | 'medium' | 'high' | 'critical';

export interface MemoryEvent {
	type: 'pressure' | 'gc_hint';
	level: MemoryPressure;
	timestamp: number;
	usagePercentage: number;
}

/**
 * Lightweight memory tracker with minimal overhead
 * Consolidates functionality from 4 previous memory management systems
 */
class MemoryTracker {
	private isMonitoring = false;
	private monitoringTimer: ReturnType<typeof setInterval> | null = null;
	private lastGCHint = 0;
	private eventListeners: ((event: MemoryEvent) => void)[] = [];

	// Configuration
	private readonly GC_HINT_COOLDOWN = 5000; // 5 seconds
	private readonly UPDATE_INTERVAL = 2000; // 2 seconds
	private readonly PRESSURE_THRESHOLDS = {
		MEDIUM: 0.8, // 80%
		HIGH: 0.9, // 90%
		CRITICAL: 0.95 // 95%
	};

	constructor() {
		if (browser && this.isMemoryAPIAvailable()) {
			this.initialize();
		}
	}

	private isMemoryAPIAvailable(): boolean {
		try {
			return (
				'performance' in window &&
				'memory' in (performance as any) &&
				typeof (performance as any).memory === 'object'
			);
		} catch {
			return false;
		}
	}

	private initialize(): void {
		// Start monitoring
		this.start();

		// Handle page visibility changes
		document.addEventListener('visibilitychange', () => {
			if (document.hidden) {
				this.stop();
			} else {
				setTimeout(() => this.start(), 1000);
			}
		});

		// Cleanup on page unload
		window.addEventListener('beforeunload', () => this.cleanup());
	}

	start(): void {
		if (!browser || this.isMonitoring || !this.isMemoryAPIAvailable()) return;

		this.isMonitoring = true;
		this.updateMemoryInfo(); // Initial check

		this.monitoringTimer = setInterval(() => {
			if (!document.hidden) {
				this.updateMemoryInfo();
			}
		}, this.UPDATE_INTERVAL);
	}

	stop(): void {
		if (!this.isMonitoring) return;

		this.isMonitoring = false;
		if (this.monitoringTimer) {
			clearInterval(this.monitoringTimer);
			this.monitoringTimer = null;
		}
	}

	private updateMemoryInfo(): void {
		try {
			const memory = (performance as any).memory;
			if (!memory) return;

			const usedMB = memory.usedJSHeapSize / (1024 * 1024);
			const limitMB = memory.jsHeapSizeLimit / (1024 * 1024);
			const usagePercentage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;

			const memoryInfo: MemoryInfo = {
				usedMB: Math.round(usedMB * 10) / 10, // 0.1 MB accuracy
				limitMB: Math.round(limitMB * 10) / 10,
				usagePercentage: Math.round(usagePercentage * 1000) / 1000, // 0.1% accuracy
				lastUpdated: Date.now()
			};

			// Update stores efficiently
			currentMemoryInfo.set(memoryInfo);

			// Handle memory pressure
			this.handleMemoryPressure(usagePercentage);
		} catch (error) {
			console.warn('Memory tracking error:', error);
		}
	}

	private handleMemoryPressure(usage: number): void {
		const pressure = this.getMemoryPressure(usage);
		const previousPressure = get(memoryPressureLevel);

		// Only update if pressure level changed
		if (pressure !== previousPressure) {
			memoryPressureLevel.set(pressure);
			this.emitEvent({
				type: 'pressure',
				level: pressure,
				timestamp: Date.now(),
				usagePercentage: usage
			});
		}

		// Trigger GC hint if pressure is medium or higher and cooldown has passed
		if (usage >= this.PRESSURE_THRESHOLDS.MEDIUM) {
			const now = Date.now();
			if (now - this.lastGCHint > this.GC_HINT_COOLDOWN) {
				this.hintGarbageCollection(usage);
				this.lastGCHint = now;
			}
		}
	}

	private getMemoryPressure(usage: number): MemoryPressure {
		if (usage >= this.PRESSURE_THRESHOLDS.CRITICAL) return 'critical';
		if (usage >= this.PRESSURE_THRESHOLDS.HIGH) return 'high';
		if (usage >= this.PRESSURE_THRESHOLDS.MEDIUM) return 'medium';
		return 'low';
	}

	private hintGarbageCollection(usage: number): void {
		try {
			// Try explicit GC if available (dev tools)
			if ((window as any).gc) {
				(window as any).gc();
			}

			// Create temporary pressure to hint GC
			const temp = new Array(1000).fill({ data: new Array(100) });
			temp.length = 0;

			this.emitEvent({
				type: 'gc_hint',
				level: this.getMemoryPressure(usage),
				timestamp: Date.now(),
				usagePercentage: usage
			});
		} catch {
			// Ignore GC hint errors
		}
	}

	private emitEvent(event: MemoryEvent): void {
		this.eventListeners.forEach((listener) => {
			try {
				listener(event);
			} catch (error) {
				console.error('Memory event listener error:', error);
			}
		});
	}

	// Public API
	getCurrentMemory(): MemoryInfo | null {
		if (!this.isMemoryAPIAvailable()) return null;

		try {
			const memory = (performance as any).memory;
			return {
				usedMB: Math.round((memory.usedJSHeapSize / (1024 * 1024)) * 10) / 10,
				limitMB: Math.round((memory.jsHeapSizeLimit / (1024 * 1024)) * 10) / 10,
				usagePercentage: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 1000) / 1000,
				lastUpdated: Date.now()
			};
		} catch {
			return null;
		}
	}

	addEventListener(listener: (event: MemoryEvent) => void): () => void {
		this.eventListeners.push(listener);
		return () => {
			const index = this.eventListeners.indexOf(listener);
			if (index >= 0) this.eventListeners.splice(index, 1);
		};
	}

	forceGarbageCollection(): void {
		const now = Date.now();
		if (now - this.lastGCHint < 1000) return; // Rate limit to 1 second

		const current = this.getCurrentMemory();
		if (current) {
			this.hintGarbageCollection(current.usagePercentage);
			this.lastGCHint = now;
		}
	}

	cleanup(): void {
		this.stop();
		this.eventListeners = [];
	}
}

// Create singleton instance
const memoryTracker = new MemoryTracker();

// Svelte stores - optimized for reactivity
export const currentMemoryInfo = writable<MemoryInfo | null>(null);
export const memoryPressureLevel = writable<MemoryPressure>('low');

// Derived stores for common use cases
export const memoryUsagePercentage = derived(
	currentMemoryInfo,
	($info) => $info?.usagePercentage || 0
);

export const isMemoryPressure = derived(memoryPressureLevel, ($pressure) => $pressure !== 'low');

export const memoryStatus = derived(
	[currentMemoryInfo, memoryPressureLevel],
	([$info, $pressure]) => ({
		info: $info,
		pressure: $pressure,
		isHealthy: $pressure === 'low',
		needsAttention: $pressure === 'medium' || $pressure === 'high',
		isCritical: $pressure === 'critical'
	})
);

// Helper function to get current store value without subscription
function get<T>(store: { subscribe: (fn: (value: T) => void) => () => void }): T {
	let value: T;
	const unsubscribe = store.subscribe((v) => (value = v));
	unsubscribe();
	return value!;
}

// Export tracker instance for direct access
export { memoryTracker };

// Utility functions
export function formatMemorySize(mb: number): string {
	if (mb < 1) return `${Math.round(mb * 1024)} KB`;
	if (mb < 1024) return `${mb.toFixed(1)} MB`;
	return `${(mb / 1024).toFixed(2)} GB`;
}

export function getMemoryRecommendations(pressure: MemoryPressure): string[] {
	switch (pressure) {
		case 'critical':
			return [
				'Critical memory usage detected',
				'Immediate cleanup recommended',
				'Reduce active objects and animations'
			];
		case 'high':
			return [
				'High memory usage',
				'Consider optimizing resource usage',
				'Monitor for potential issues'
			];
		case 'medium':
			return ['Moderate memory usage', 'Watch for increasing trends'];
		default:
			return ['Memory usage is optimal'];
	}
}

export function getMemoryHealthScore(info: MemoryInfo | null): number {
	if (!info) return 1;
	return Math.max(0, Math.min(1, 1 - info.usagePercentage));
}

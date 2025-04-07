// File: /src/lib/utils/memory-monitor.ts

import { browser } from '$app/environment';
import { writable } from 'svelte/store';

// Create memory usage store
export const memoryUsage = writable<number>(0);

// Memory monitoring class
export class MemoryMonitor {
	private intervalId: ReturnType<typeof setInterval> | null = null;
	private checkInterval: number;
	private warningThreshold: number;
	private criticalThreshold: number;
	private onWarning: (() => void) | null = null;
	private onCritical: (() => void) | null = null;

	constructor(
		checkInterval = 10000, // Check every 10 seconds
		warningThreshold = 0.7, // 70% memory usage
		criticalThreshold = 0.85, // 85% memory usage
		onWarning: (() => void) | null = null,
		onCritical: (() => void) | null = null
	) {
		this.checkInterval = checkInterval;
		this.warningThreshold = warningThreshold;
		this.criticalThreshold = criticalThreshold;
		this.onWarning = onWarning;
		this.onCritical = onCritical;
	}

	start() {
		if (!browser || this.intervalId) return;

		// Only start if performance.memory is available
		if (!('performance' in window) || !('memory' in (performance as any))) {
			console.warn('Memory monitoring not available in this browser');
			return;
		}

		this.intervalId = setInterval(() => {
			this.checkMemory();
		}, this.checkInterval);

		// Do an initial check
		this.checkMemory();
	}

	stop() {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}

	private checkMemory() {
		if (!browser || !('performance' in window) || !('memory' in (performance as any))) return;

		const memory = (performance as any).memory;
		const memUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;

		// Update the store
		memoryUsage.set(memUsage);

		// Check thresholds
		if (memUsage >= this.criticalThreshold && this.onCritical) {
			this.onCritical();
		} else if (memUsage >= this.warningThreshold && this.onWarning) {
			this.onWarning();
		}
	}

	// Helper to suggest garbage collection
	suggestGarbageCollection() {
		if (!browser) return;

		// Clear any large arrays and objects
		// This doesn't directly trigger GC but helps suggest it
		if ((window as any).gc) {
			try {
				(window as any).gc();
			} catch (e) {
				// GC not available
			}
		}

		// Alternative approach: create temporary objects and delete them
		const temp: any[] = [];
		for (let i = 0; i < 10000; i++) {
			temp.push({});
		}
		temp.length = 0;
	}
}

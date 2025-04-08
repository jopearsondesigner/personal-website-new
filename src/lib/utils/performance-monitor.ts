// File: /src/lib/utils/performance-monitor.ts

import { browser } from '$app/environment';
import { writable } from 'svelte/store';

// Store for performance metrics
export const performanceMetrics = writable({
	fps: 0,
	memory: 0,
	memoryLimit: 0,
	frameTime: 0,
	isLowPerformance: false
});

/**
 * Performance monitor class for tracking FPS and memory usage
 */
export class PerformanceMonitor {
	private frameCount = 0;
	private lastFrameTime = 0;
	private frameStartTime = 0;
	private frameTimes: number[] = [];
	private lastCheck = 0;
	private animationFrameId: number | null = null;
	private checkInterval = 1000; // 1 second
	private running = false;

	constructor(interval = 1000) {
		this.checkInterval = interval;
	}

	start() {
		if (!browser || this.running) return;

		this.running = true;
		this.lastCheck = performance.now();
		this.lastFrameTime = performance.now();
		this.frameCount = 0;
		this.frameTimes = [];

		const loop = (timestamp: number) => {
			if (!this.running) return;

			// Measure frame start time
			this.frameStartTime = performance.now();

			// Calculate time since last frame
			const frameDelta = this.frameStartTime - this.lastFrameTime;
			this.lastFrameTime = this.frameStartTime;

			// Keep the last 60 frame times for average calculation
			this.frameTimes.push(frameDelta);
			if (this.frameTimes.length > 60) {
				this.frameTimes.shift();
			}

			this.frameCount++;

			// Check if we should update metrics
			if (timestamp - this.lastCheck >= this.checkInterval) {
				const elapsedSeconds = (timestamp - this.lastCheck) / 1000;
				const fps = Math.round(this.frameCount / elapsedSeconds);

				// Calculate average frame time
				const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;

				// Get memory usage if available
				let memory = 0;
				let memoryLimit = 0;
				if (performance && (performance as any).memory) {
					memory = (performance as any).memory.usedJSHeapSize / (1024 * 1024);
					memoryLimit = (performance as any).memory.jsHeapSizeLimit / (1024 * 1024);
				}

				// Determine if device is struggling with performance
				const isLowPerformance = fps < 30 || avgFrameTime > 33;

				// Update metrics store
				performanceMetrics.set({
					fps,
					memory,
					memoryLimit,
					frameTime: avgFrameTime,
					isLowPerformance
				});

				// Reset counters
				this.frameCount = 0;
				this.lastCheck = timestamp;
			}

			this.animationFrameId = requestAnimationFrame(loop);
		};

		this.animationFrameId = requestAnimationFrame(loop);
	}

	stop() {
		this.running = false;
		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}
	}

	getMetrics() {
		return {
			fps: Math.round(
				1000 / (this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length || 16.7)
			),
			frameTime: this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length || 0
		};
	}
}

// Memory management utilities
export function suggestGarbageCollection() {
	if (!browser) return;

	// Clear any large arrays or objects
	// This doesn't directly trigger GC but helps suggest it
	setTimeout(() => {
		if ((window as any).gc) {
			try {
				(window as any).gc();
			} catch (e) {
				// GC not available
			}
		}
	}, 0);
}

/**
 * Creates a lightweight object pool to reduce garbage collection
 */
export function createObjectPool<T>(
	factory: () => T,
	reset?: (obj: T) => void,
	initialSize = 100
): {
	get: () => T;
	release: (obj: T) => void;
	clear: () => void;
} {
	const pool: T[] = [];

	// Pre-fill pool
	for (let i = 0; i < initialSize; i++) {
		pool.push(factory());
	}

	return {
		get: () => {
			return pool.length > 0 ? pool.pop()! : factory();
		},
		release: (obj: T) => {
			if (reset) reset(obj);
			pool.push(obj);
		},
		clear: () => {
			pool.length = 0;
		}
	};
}

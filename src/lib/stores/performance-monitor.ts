import { browser } from '$app/environment';
import { writable } from 'svelte/store';

// Performance metrics interface
interface PerformanceMetrics {
	fps: number;
	memory?: {
		used: number;
		limit: number;
		usedPercentage: number;
	};
	longFrames: number; // Frames taking > 16ms
	averageFrameTime: number;
	lastUpdated: number;
}

// Create a performance monitoring utility
class PerformanceMonitor {
	private isRunning = false;
	private frameCount = 0;
	private frameTimeTotal = 0;
	private lastFrameTime = 0;
	private longFrameCount = 0;
	private lastSampleTime = 0;
	private sampleInterval = 1000; // 1 second
	private animationFrameId: number | null = null;
	private store = writable<PerformanceMetrics>({
		fps: 60,
		longFrames: 0,
		averageFrameTime: 16.67,
		lastUpdated: Date.now()
	});

	constructor() {
		if (browser) {
			// Add performance mark to track initial load time
			performance.mark('app-init');
		}
	}

	// Start monitoring
	start() {
		if (!browser || this.isRunning) return;

		this.isRunning = true;
		this.frameCount = 0;
		this.frameTimeTotal = 0;
		this.longFrameCount = 0;
		this.lastSampleTime = performance.now();
		this.lastFrameTime = this.lastSampleTime;

		// Record initialization time
		performance.measure('app-initialization', 'app-init');

		// Start frame loop
		this.animationFrameId = requestAnimationFrame(this.frameLoop);

		return this;
	}

	// Stop monitoring
	stop() {
		if (!browser || !this.isRunning) return;

		this.isRunning = false;

		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}

		return this;
	}

	// Frame tracking loop
	private frameLoop = (timestamp: number) => {
		if (!this.isRunning) return;

		// Calculate frame time
		const frameTime = timestamp - this.lastFrameTime;
		this.lastFrameTime = timestamp;

		// Track frame data
		this.frameCount++;
		this.frameTimeTotal += frameTime;

		// Track long frames (> 16.67ms for 60fps)
		if (frameTime > 16.67) {
			this.longFrameCount++;
		}

		// Check if it's time to update metrics
		const elapsed = timestamp - this.lastSampleTime;
		if (elapsed >= this.sampleInterval) {
			this.updateMetrics(elapsed);
			this.lastSampleTime = timestamp;
		}

		// Continue the loop
		this.animationFrameId = requestAnimationFrame(this.frameLoop);
	};

	// Update metrics in the store
	private updateMetrics(elapsed: number) {
		if (this.frameCount === 0) return;

		// Calculate FPS and average frame time
		const fps = Math.round((this.frameCount * 1000) / elapsed);
		const averageFrameTime = this.frameTimeTotal / this.frameCount;

		// Get memory info if available
		let memory: PerformanceMetrics['memory'] | undefined = undefined;

		if ((performance as any).memory) {
			const memoryInfo = (performance as any).memory;

			memory = {
				used: memoryInfo.usedJSHeapSize,
				limit: memoryInfo.jsHeapSizeLimit,
				usedPercentage: (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100
			};
		}

		// Update store with metrics
		this.store.update(() => ({
			fps,
			memory,
			longFrames: this.longFrameCount,
			averageFrameTime,
			lastUpdated: Date.now()
		}));

		// Log to console if enabled
		if (this.logToConsole) {
			console.log(
				`FPS: ${fps} | Avg Frame Time: ${averageFrameTime.toFixed(2)}ms | Long Frames: ${this.longFrameCount}`
			);

			if (memory) {
				console.log(
					`Memory: ${(memory.used / 1024 / 1024).toFixed(2)}MB / ${(memory.limit / 1024 / 1024).toFixed(2)}MB (${memory.usedPercentage.toFixed(1)}%)`
				);
			}
		}

		// Reset counters for next sample
		this.frameCount = 0;
		this.frameTimeTotal = 0;
		this.longFrameCount = 0;
	}

	// Log performance issues to console
	private logToConsole = false;

	enableConsoleLogging(enable = true) {
		this.logToConsole = enable;
		return this;
	}

	// Get performance metrics store
	getStore() {
		return this.store;
	}

	// Record a custom performance mark
	mark(name: string) {
		if (browser) {
			performance.mark(name);
		}
		return this;
	}

	// Measure between two marks
	measure(name: string, startMark: string, endMark?: string) {
		if (browser) {
			try {
				if (endMark) {
					performance.measure(name, startMark, endMark);
				} else {
					performance.measure(name, startMark);
				}

				// Log the measure if console logging is enabled
				if (this.logToConsole) {
					const entries = performance.getEntriesByName(name, 'measure');
					if (entries.length > 0) {
						console.log(`Performance Measure - ${name}: ${entries[0].duration.toFixed(2)}ms`);
					}
				}
			} catch (e) {
				console.error('Performance measurement error:', e);
			}
		}
		return this;
	}

	// Clear marks and measures
	clearMarks() {
		if (browser) {
			performance.clearMarks();
			performance.clearMeasures();
		}
		return this;
	}
}

// Create a singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Start monitoring in development only
if (browser && process.env.NODE_ENV === 'development') {
	performanceMonitor.enableConsoleLogging().start();
}

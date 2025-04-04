// src/lib/utils/frame-rate-controller.ts

import { browser } from '$app/environment';
import { deviceCapabilities } from './device-performance';
import { get } from 'svelte/store';
import { writable } from 'svelte/store';

type QualityCallback = (quality: number) => void;
type FPSCallback = (fps: number) => void;

// Create stores for memory usage and FPS monitoring
export const memoryUsageStore = writable<number>(0);
export const fpsStore = writable<number>(60);

/**
 * Manages frame rate monitoring and adaptive quality control
 * Provides frame skipping and quality adjustment mechanisms
 */
class FrameRateController {
	// Configuration
	private targetFPS = 60;
	private maxSkippedFrames = 2;
	private measurementInterval = 1000; // 1 second
	private fpsHistorySize = 60; // Store last 60 frames for FPS calculation
	private qualityAdjustmentThreshold = 0.05; // Minimum quality change to notify
	private hysteresisThreshold = 0.1; // Prevent oscillation between quality levels
	private qualityIncreaseDelay = 5000; // Wait time before increasing quality (ms)
	private lastQualityIncreaseTime = 0;

	// State
	private qualitySubscribers: QualityCallback[] = [];
	private fpsSubscribers: FPSCallback[] = [];
	private frameCount = 0;
	private skippedFrames = 0;
	private lastFrameTime = 0;
	private lastMeasurementTime = 0;
	private currentFPS = 60;
	private currentQuality = 1.0;
	private adaptiveEnabled = true;
	private lastFrameTimestamps: number[] = [];
	private frameTimeDiffs: number[] = [];
	private isMonitoring = false;
	private monitoringRAFId: number | null = null;
	private consecutiveLowFPSFrames = 0;
	private consecutiveHighFPSFrames = 0;
	private debugMode = false;
	private memoryCheckInterval: ReturnType<typeof setInterval> | null = null;
	private lastMemoryUsage = 0;
	private qualityTrend: number[] = []; // Track recent quality adjustments

	constructor() {
		if (browser) {
			this.setupMonitoring();
			this.setupMemoryMonitoring();

			// Handle visibility change to pause/resume monitoring
			document.addEventListener('visibilitychange', this.handleVisibilityChange);

			// Handle orientation changes which may affect performance
			window.addEventListener('orientationchange', this.handleOrientationChange);
		}
	}

	/**
	 * Setup RAF loop for monitoring FPS
	 */
	private setupMonitoring() {
		if (this.isMonitoring || !browser) return;
		this.isMonitoring = true;

		const monitorLoop = () => {
			const now = performance.now();

			// Calculate time since last frame
			if (this.lastFrameTime > 0) {
				const frameDiff = now - this.lastFrameTime;

				// Filter out unreasonable values (tab switches, etc)
				if (frameDiff > 0 && frameDiff < 1000) {
					this.frameTimeDiffs.push(frameDiff);

					// Keep buffer size in check
					while (this.frameTimeDiffs.length > this.fpsHistorySize) {
						this.frameTimeDiffs.shift();
					}
				}
			}

			this.lastFrameTime = now;

			// Process timestamps to calculate FPS
			this.lastFrameTimestamps.push(now);

			// Keep buffer size in check
			while (this.lastFrameTimestamps.length > this.fpsHistorySize) {
				this.lastFrameTimestamps.shift();
			}

			if (this.lastFrameTimestamps.length >= 2) {
				// Calculate FPS from the sliding window of frames
				const timeSpan =
					this.lastFrameTimestamps[this.lastFrameTimestamps.length - 1] -
					this.lastFrameTimestamps[0];
				const frameCount = this.lastFrameTimestamps.length - 1;
				if (timeSpan > 0) {
					// More accurate FPS calculation using frame time diffs
					if (this.frameTimeDiffs.length > 0) {
						const avgFrameTime =
							this.frameTimeDiffs.reduce((sum, time) => sum + time, 0) / this.frameTimeDiffs.length;
						this.currentFPS = avgFrameTime > 0 ? 1000 / avgFrameTime : this.targetFPS;
					} else {
						this.currentFPS = (frameCount * 1000) / timeSpan;
					}

					// Notify FPS subscribers
					this.notifyFPSSubscribers(this.currentFPS);
				}

				// Adjust quality if needed (every second)
				if (now - this.lastMeasurementTime > this.measurementInterval) {
					this.lastMeasurementTime = now;
					this.adjustQuality();

					// Check for consistent performance trends
					this.analyzePerformanceTrend();
				}
			}

			this.monitoringRAFId = requestAnimationFrame(monitorLoop);
		};

		this.monitoringRAFId = requestAnimationFrame(monitorLoop);
	}

	/**
	 * Analyze longer-term performance trends
	 */
	private analyzePerformanceTrend() {
		// Only start trend analysis after collecting enough data
		if (this.qualityTrend.length < 5) return;

		// Check if all recent adjustments were in the same direction
		const allDecreasing = this.qualityTrend.every((change) => change <= 0);
		const allIncreasing = this.qualityTrend.every((change) => change >= 0);

		// Reset trend data periodically
		if (this.qualityTrend.length > 10) {
			this.qualityTrend = this.qualityTrend.slice(-5);
		}

		// If performance continues to degrade even at lowest quality,
		// suggest more drastic optimization to device capabilities
		if (allDecreasing && this.currentQuality <= 0.4 && this.currentFPS < this.targetFPS * 0.5) {
			const capabilities = get(deviceCapabilities);
			if (capabilities.tier !== 'low') {
				// Log suggestion only in debug mode
				if (this.debugMode) {
					console.warn(
						'Critical performance issue detected: Recommend enabling low tier optimizations'
					);
				}
			}
		}
	}

	/**
	 * Handle visibility change to conserve resources when tab not visible
	 */
	private handleVisibilityChange = () => {
		if (!browser) return;

		if (document.hidden) {
			this.stopMonitoring();
		} else {
			// Reset measurements when becoming visible again
			this.lastFrameTime = 0;
			this.lastMeasurementTime = 0;
			this.lastFrameTimestamps = [];
			this.frameTimeDiffs = [];
			this.setupMonitoring();
		}
	};

	/**
	 * Handle orientation changes which may affect performance
	 */
	private handleOrientationChange = () => {
		if (!browser) return;

		// Reset measurements on orientation change
		setTimeout(() => {
			this.lastFrameTime = 0;
			this.lastMeasurementTime = 0;
			this.lastFrameTimestamps = [];
			this.frameTimeDiffs = [];
		}, 500);
	};

	/**
	 * Stop the monitoring RAF loop
	 */
	private stopMonitoring() {
		if (!this.isMonitoring || !this.monitoringRAFId || !browser) return;

		cancelAnimationFrame(this.monitoringRAFId);
		this.monitoringRAFId = null;
		this.isMonitoring = false;
	}

	/**
	 * Setup memory monitoring
	 */
	private setupMemoryMonitoring() {
		// Check if performance.memory is available
		if (browser && 'memory' in performance) {
			this.memoryCheckInterval = setInterval(() => {
				const memory = (performance as any).memory;
				if (memory) {
					const memUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;

					// Store memory usage in shared store
					if (memoryUsageStore) {
						memoryUsageStore.set(memUsage);
					}

					// Detect large increases in memory usage
					if (this.lastMemoryUsage > 0) {
						const memoryIncrease = memUsage - this.lastMemoryUsage;
						if (memoryIncrease > 0.1) {
							// Significant memory increase
							if (this.debugMode) {
								console.warn(
									`Significant memory usage increase detected: ${(memoryIncrease * 100).toFixed(1)}%`
								);
							}

							// Force garbage collection hint
							this.forceGarbageCollectionHint();
						}
					}

					this.lastMemoryUsage = memUsage;
				}
			}, 10000); // Check every 10 seconds
		}
	}

	/**
	 * Hint to browser to perform garbage collection
	 * Note: This doesn't directly trigger GC but helps hint the browser
	 */
	private forceGarbageCollectionHint() {
		if (!browser) return;

		// Clear unused arrays
		this.lastFrameTimestamps = this.lastFrameTimestamps.slice(-30);
		this.frameTimeDiffs = this.frameTimeDiffs.slice(-30);

		// Hint to browser to garbage collect
		if ((window as any).gc) {
			try {
				(window as any).gc();
			} catch (e) {
				// GC not available or not permitted
			}
		}

		// Alternative approach to hint GC
		if (this.lastFrameTimestamps.length > 30) {
			const temp = this.lastFrameTimestamps;
			this.lastFrameTimestamps = [];
			setTimeout(() => {
				this.lastFrameTimestamps = temp.slice(-30);
			}, 0);
		}
	}

	/**
	 * Adjust quality based on measured FPS with hysteresis
	 */
	private adjustQuality() {
		if (!this.adaptiveEnabled) return;

		// Calculate new quality level based on FPS with hysteresis
		let newQuality = this.currentQuality;
		const now = performance.now();

		if (this.currentFPS < this.targetFPS * 0.5) {
			// Severe performance issues - reduce quality significantly
			newQuality = Math.max(0.3, this.currentQuality - 0.15);
			this.consecutiveLowFPSFrames++;
			this.consecutiveHighFPSFrames = 0;
		} else if (this.currentFPS < this.targetFPS * 0.75) {
			// Moderate performance issues - reduce quality slightly
			newQuality = Math.max(0.5, this.currentQuality - 0.1);
			this.consecutiveLowFPSFrames++;
			this.consecutiveHighFPSFrames = 0;
		} else if (this.currentFPS > this.targetFPS * 0.9 && this.currentQuality < 1.0) {
			// Only increase quality if we've been stable for a while (hysteresis)
			if (now - this.lastQualityIncreaseTime > this.qualityIncreaseDelay) {
				// Good performance - gradually restore quality
				newQuality = Math.min(1.0, this.currentQuality + 0.05);
				this.lastQualityIncreaseTime = now;
			}
			this.consecutiveHighFPSFrames++;
			this.consecutiveLowFPSFrames = 0;
		}

		// Track quality change for trend analysis
		const qualityDiff = newQuality - this.currentQuality;
		if (qualityDiff !== 0) {
			this.qualityTrend.push(qualityDiff);
		}

		// Only notify if quality changed significantly
		if (Math.abs(newQuality - this.currentQuality) > this.qualityAdjustmentThreshold) {
			this.currentQuality = newQuality;
			this.notifyQualitySubscribers(newQuality);

			if (this.debugMode) {
				console.log(
					`Quality adjusted to: ${(newQuality * 100).toFixed(0)}% (FPS: ${this.currentFPS.toFixed(1)})`
				);
			}
		}
	}

	/**
	 * Check if we should render this frame based on adaptive frame skipping
	 */
	public shouldRenderFrame(): boolean {
		if (!browser) return true;

		const now = performance.now();
		const elapsed = now - this.lastFrameTime;
		this.frameCount++;

		// Get the maximum frame skip from device capabilities
		const capabilities = get(deviceCapabilities);
		const maxSkip = capabilities.frameSkip;

		// Always render if enough time has passed regardless of skipping
		// This ensures animations don't appear frozen
		if (elapsed > 100) {
			this.lastFrameTime = now;
			this.skippedFrames = 0;
			return true;
		}

		// Adaptive frame skipping based on quality level
		// Higher quality = less skipping, lower quality = more skipping
		const adaptiveMaxSkip = Math.round(maxSkip + (1 - this.currentQuality) * 2);

		// Skip frames based on quality and device capability
		if (this.skippedFrames >= adaptiveMaxSkip) {
			this.lastFrameTime = now;
			this.skippedFrames = 0;
			return true;
		} else {
			// Skip this frame
			this.skippedFrames++;
			return false;
		}
	}

	/**
	 * Subscribe to quality changes
	 */
	public subscribeQuality(callback: QualityCallback): () => void {
		this.qualitySubscribers.push(callback);

		// Immediately invoke with current quality
		callback(this.currentQuality);

		// Return unsubscribe function
		return () => {
			this.qualitySubscribers = this.qualitySubscribers.filter((cb) => cb !== callback);
		};
	}

	/**
	 * Subscribe to FPS updates
	 */
	public subscribeFPS(callback: FPSCallback): () => void {
		this.fpsSubscribers.push(callback);

		// Immediately invoke with current FPS
		callback(this.currentFPS);

		// Return unsubscribe function
		return () => {
			this.fpsSubscribers = this.fpsSubscribers.filter((cb) => cb !== callback);
		};
	}

	/**
	 * Notify all quality subscribers
	 */
	private notifyQualitySubscribers(quality: number) {
		this.qualitySubscribers.forEach((callback) => {
			try {
				callback(quality);
			} catch (error) {
				console.error('Error in quality subscriber:', error);
			}
		});
	}

	/**
	 * Notify all FPS subscribers
	 */
	private notifyFPSSubscribers(fps: number) {
		this.fpsSubscribers.forEach((callback) => {
			try {
				callback(fps);
			} catch (error) {
				console.error('Error in FPS subscriber:', error);
			}
		});
	}

	/**
	 * Set target FPS
	 */
	public setTargetFPS(fps: number) {
		this.targetFPS = fps;
	}

	/**
	 * Set maximum frame skipping
	 */
	public setMaxSkippedFrames(max: number) {
		this.maxSkippedFrames = max;
	}

	/**
	 * Enable/disable adaptive quality
	 */
	public setAdaptiveEnabled(enabled: boolean) {
		this.adaptiveEnabled = enabled;
	}

	/**
	 * Enable/disable debug mode
	 */
	public setDebugMode(enabled: boolean) {
		this.debugMode = enabled;
	}

	/**
	 * Get current estimated FPS
	 */
	public getCurrentFPS(): number {
		return this.currentFPS;
	}

	/**
	 * Get current quality level (0.0 - 1.0)
	 */
	public getCurrentQuality(): number {
		return this.currentQuality;
	}

	/**
	 * Get performance metrics for debugging
	 */
	public getPerformanceMetrics() {
		return {
			fps: this.currentFPS,
			quality: this.currentQuality,
			frameCount: this.frameCount,
			skippedFrames: this.skippedFrames,
			consecutiveLowFPSFrames: this.consecutiveLowFPSFrames,
			consecutiveHighFPSFrames: this.consecutiveHighFPSFrames,
			lastQualityChangeTime: this.lastQualityIncreaseTime,
			memoryUsage: this.lastMemoryUsage
		};
	}

	/**
	 * Manual quality override (for testing or user preferences)
	 */
	public setQualityOverride(quality: number) {
		if (quality >= 0 && quality <= 1) {
			this.currentQuality = quality;
			this.notifyQualitySubscribers(quality);
		}
	}

	/**
	 * Cleanup resources
	 */
	public cleanup() {
		if (!browser) return;

		this.stopMonitoring();
		this.qualitySubscribers = [];
		this.fpsSubscribers = [];

		// Clear memory monitoring interval
		if (this.memoryCheckInterval) {
			clearInterval(this.memoryCheckInterval);
			this.memoryCheckInterval = null;
		}

		// Remove event listeners
		document.removeEventListener('visibilitychange', this.handleVisibilityChange);
		window.removeEventListener('orientationchange', this.handleOrientationChange);
	}
}

// Singleton instance
export const frameRateController = new FrameRateController();

// Subscribe to FPS updates to update the store
frameRateController.subscribeFPS((fps) => {
	fpsStore.set(fps);
});

// src/lib/utils/frame-rate-controller.ts

import { browser } from '$app/environment';
import { deviceCapabilities } from './device-performance';
import { get } from 'svelte/store';
import { writable } from 'svelte/store';
import {
	memoryManager,
	currentMemoryInfo,
	memoryEvents,
	memoryPressure,
	memoryUsageStore,
	type MemoryInfo
} from '$lib/utils/memory-manager';

type QualityCallback = (quality: number) => void;
type FPSCallback = (fps: number) => void;

export const fpsStore = writable<number>(60);

/**
 * Manages frame rate monitoring and adaptive quality control
 * Provides frame skipping and quality adjustment mechanisms
 * Optimized for minimal overhead during animation
 */
class FrameRateController {
	// Configuration
	private targetFPS = 60;
	private maxSkippedFrames = 2;
	private measurementInterval = 1000; // 1 second
	private qualityAdjustmentThreshold = 0.05; // Minimum quality change to notify
	private qualityIncreaseDelay = 5000; // Wait time before increasing quality (ms)
	private minQuality = 0.4; // Minimum quality level to maintain
	private maxQuality = 1.0; // Maximum quality level
	private qualityStep = 0.1; // Step size for quality adjustments
	private memoryUnsubscribers: (() => void)[] = [];

	// State
	private qualitySubscribers: QualityCallback[] = [];
	private fpsSubscribers: FPSCallback[] = [];
	private frameCount = 0;
	private skippedFrames = 0;
	private lastFrameTime = 0;
	private lastMeasurementTime = 0;
	private lastQualityAdjustTime = 0;
	private lastQualityIncreaseTime = 0;
	private currentFPS = 60;
	private currentQuality = 1.0;
	private adaptiveEnabled = true;
	private isMonitoring = false;
	private monitoringRAFId: number | null = null;
	private memoryCheckInterval: ReturnType<typeof setInterval> | null = null;
	private lastMemoryUsage = 0;
	private qualityTrend: number[] = []; // Track recent quality adjustments (limited to 5 items)
	private debugMode = false;
	private onBatteryPower = false;
	private lowBatteryMode = false;

	constructor() {
		if (browser) {
			// FIXED: Add safety checks for browser APIs before using them
			this.safeInitialize();
			// Start unified memory monitoring
			memoryManager.startMonitoring();
		}
	}

	/**
	 * Safe initialization that only runs in browser context
	 */
	private safeInitialize() {
		if (!browser || typeof window === 'undefined' || typeof document === 'undefined') {
			return;
		}

		try {
			// Check for battery status to enable additional optimizations
			this.checkBatteryStatus();

			this.setupMonitoring();
			this.setupMemoryMonitoring();

			// Handle visibility change to pause/resume monitoring
			document.addEventListener('visibilitychange', this.handleVisibilityChange);

			// Handle orientation changes which may affect performance
			window.addEventListener('orientationchange', this.handleOrientationChange);

			// Listen for device power changes
			this.setupPowerModeListeners();
		} catch (error) {
			if (this.debugMode) {
				console.error('Error during FrameRateController initialization:', error);
			}
		}
	}

	/**
	 * Setup RAF loop for monitoring FPS - simplified to reduce overhead
	 */
	private setupMonitoring() {
		if (
			this.isMonitoring ||
			!browser ||
			typeof window === 'undefined' ||
			typeof document === 'undefined'
		) {
			return;
		}

		this.isMonitoring = true;

		const monitorLoop = () => {
			// FIXED: Add safety check for document
			if (!browser || typeof document === 'undefined') {
				return;
			}

			// Skip processing when document is hidden to save resources
			if (!document.hidden) {
				const now = performance.now();

				// Increment frame count for FPS calculation
				this.frameCount++;

				// Calculate FPS and adjust quality on measurement interval
				if (now - this.lastMeasurementTime >= this.measurementInterval) {
					this.calculateFPS(now);
					this.adjustQuality(now);
					this.lastMeasurementTime = now;
				}

				this.lastFrameTime = now;
			}

			// FIXED: Add safety check for window before using requestIdleCallback
			if (browser && typeof window !== 'undefined') {
				// Use requestIdleCallback when available for less critical task
				if ('requestIdleCallback' in window) {
					try {
						(window as any).requestIdleCallback(
							() => {
								if (browser && typeof window !== 'undefined') {
									this.monitoringRAFId = requestAnimationFrame(monitorLoop);
								}
							},
							{ timeout: 1000 / 30 }
						); // Ensure we run at least at 30fps
					} catch (error) {
						// Fallback to regular RAF if requestIdleCallback fails
						this.monitoringRAFId = requestAnimationFrame(monitorLoop);
					}
				} else {
					this.monitoringRAFId = requestAnimationFrame(monitorLoop);
				}
			}
		};

		if (browser && typeof window !== 'undefined') {
			this.monitoringRAFId = requestAnimationFrame(monitorLoop);
		}
	}

	/**
	 * Simplified FPS calculation with less overhead
	 */
	private calculateFPS(now: number): void {
		// Calculate time span since last measurement
		const timeSpan = now - this.lastMeasurementTime;

		if (timeSpan <= 0 || this.frameCount <= 0) return;

		// Calculate frames per second based on frame count
		const rawFPS = (this.frameCount * 1000) / timeSpan;
		this.frameCount = 0; // Reset frame count

		// Apply bounds to prevent unrealistic values
		const boundedFPS = Math.max(1, Math.min(120, rawFPS));

		// Apply smoothing for UI stability (less aggressive)
		this.currentFPS = this.currentFPS * 0.7 + boundedFPS * 0.3;

		// Update store and notify subscribers
		fpsStore.set(this.currentFPS);
		this.notifyFPSSubscribers(this.currentFPS);
	}

	/**
	 * Improved adaptive quality control with hysteresis and better stability
	 */
	private adjustQuality(now: number): void {
		if (!this.adaptiveEnabled) return;

		const targetFPS = this.targetFPS;
		const currentFPS = this.currentFPS;

		// Calculate FPS ratio
		const fpsRatio = currentFPS / targetFPS;

		// More aggressive downscaling when FPS is very low
		if (fpsRatio < 0.5) {
			// FPS is critically low - reduce quality more aggressively
			const newQuality = Math.max(this.minQuality, this.currentQuality - this.qualityStep * 2);

			if (Math.abs(newQuality - this.currentQuality) >= this.qualityAdjustmentThreshold) {
				this.currentQuality = newQuality;
				this.qualityTrend.push(-this.qualityStep * 2);
				this.notifyQualitySubscribers(this.currentQuality);
			}
		}
		// Normal downscaling when FPS is moderately low
		else if (fpsRatio < 0.85) {
			const newQuality = Math.max(this.minQuality, this.currentQuality - this.qualityStep);

			if (Math.abs(newQuality - this.currentQuality) >= this.qualityAdjustmentThreshold) {
				this.currentQuality = newQuality;
				this.qualityTrend.push(-this.qualityStep);
				this.notifyQualitySubscribers(this.currentQuality);
			}
		}
		// Increase quality when FPS is stable and high enough
		else if (fpsRatio > 1.1 && now - this.lastQualityIncreaseTime > this.qualityIncreaseDelay) {
			// FPS is higher than target - we can increase quality
			const newQuality = Math.min(this.maxQuality, this.currentQuality + this.qualityStep * 0.5);

			if (Math.abs(newQuality - this.currentQuality) >= this.qualityAdjustmentThreshold) {
				this.currentQuality = newQuality;
				this.qualityTrend.push(this.qualityStep * 0.5);
				this.lastQualityIncreaseTime = now;
				this.notifyQualitySubscribers(this.currentQuality);
			}
		}

		// Trim quality trend history
		if (this.qualityTrend.length > 5) {
			this.qualityTrend = this.qualityTrend.slice(-5);
		}
	}

	/**
	 * Handle visibility change to conserve resources when tab not visible
	 */
	private handleVisibilityChange = () => {
		if (!browser || typeof document === 'undefined') return;

		try {
			if (document.hidden) {
				this.stopMonitoring();
			} else {
				// Reset measurements when becoming visible again
				this.lastFrameTime = 0;
				this.lastMeasurementTime = 0;
				this.frameCount = 0;
				this.setupMonitoring();
			}
		} catch (error) {
			if (this.debugMode) {
				console.error('Error in handleVisibilityChange:', error);
			}
		}
	};

	/**
	 * Handle orientation changes which may affect performance
	 */
	private handleOrientationChange = () => {
		if (!browser) return;

		try {
			// Reset measurements on orientation change
			setTimeout(() => {
				this.lastFrameTime = 0;
				this.lastMeasurementTime = 0;
				this.frameCount = 0;
			}, 300); // Shorter delay than before
		} catch (error) {
			if (this.debugMode) {
				console.error('Error in handleOrientationChange:', error);
			}
		}
	};

	/**
	 * Stop the monitoring RAF loop
	 */
	private stopMonitoring() {
		if (!this.isMonitoring || !this.monitoringRAFId || !browser || typeof window === 'undefined') {
			return;
		}

		try {
			cancelAnimationFrame(this.monitoringRAFId);
			this.monitoringRAFId = null;
			this.isMonitoring = false;
		} catch (error) {
			if (this.debugMode) {
				console.error('Error stopping monitoring:', error);
			}
		}
	}

	/**
	 * Setup memory monitoring using unified memory manager
	 */
	private setupMemoryMonitoring() {
		if (!browser || typeof window === 'undefined') {
			return;
		}

		try {
			// Subscribe to memory changes from unified system
			const unsubscribeMemory = memoryManager.onMemoryChange((memoryInfo: MemoryInfo) => {
				// Apply smoothing to avoid jumps
				this.lastMemoryUsage = this.lastMemoryUsage * 0.7 + memoryInfo.usagePercentage * 0.3;

				// If memory usage is high, trigger cleanup
				if (this.lastMemoryUsage > 0.7) {
					this.forceGarbageCollectionHint();
				}
			});

			// Subscribe to memory pressure events - handle different pressure type formats
			const unsubscribePressure = memoryManager.onMemoryPressure((pressure) => {
				// Handle pressure as either string or object
				const pressureLevel = typeof pressure === 'string' ? pressure : pressure?.level || pressure;

				if (pressureLevel === 'critical' || pressureLevel === 'high') {
					// More aggressive quality reduction under memory pressure
					const pressureQuality = pressureLevel === 'critical' ? 0.3 : 0.5;
					this.setQualityOverride(Math.min(this.currentQuality, pressureQuality));
				}
			});

			// Store unsubscribe functions for cleanup
			this.memoryUnsubscribers = [unsubscribeMemory, unsubscribePressure];
		} catch (error) {
			if (this.debugMode) {
				console.error('Error setting up memory monitoring:', error);
			}
		}
	}

	/**
	 * Trigger cleanup using unified memory manager
	 */
	private forceGarbageCollectionHint() {
		if (!browser || typeof window === 'undefined') return;

		try {
			// Use unified memory manager for cleanup
			memoryManager.performCleanup();

			// Additional hint for quality trend cleanup
			if (this.qualityTrend.length > 0) {
				const temp = this.qualityTrend;
				this.qualityTrend = [];
				setTimeout(() => {
					this.qualityTrend = temp.slice(-5);
				}, 0);
			}
		} catch (error) {
			if (this.debugMode) {
				console.error('Error in forceGarbageCollectionHint:', error);
			}
		}
	}

	/**
	 * Check battery status for additional optimizations
	 */
	private async checkBatteryStatus(): Promise<void> {
		if (!browser || typeof navigator === 'undefined' || !('getBattery' in navigator)) {
			return;
		}

		try {
			// @ts-ignore - Battery API
			const battery = await navigator.getBattery();

			// Apply more aggressive optimizations on battery power
			this.onBatteryPower = !battery.charging;
			this.lowBatteryMode = battery.level < 0.2;

			if (this.onBatteryPower) {
				// Increase frame skipping on battery power
				deviceCapabilities.update((caps) => ({
					...caps,
					frameSkip: caps.frameSkip + 1,
					updateInterval: Math.max(caps.updateInterval, 32) // Minimum 30fps target
				}));

				if (this.lowBatteryMode) {
					// Even more aggressive for low battery
					deviceCapabilities.update((caps) => ({
						...caps,
						tier: 'low',
						frameSkip: caps.frameSkip + 2,
						updateInterval: Math.max(caps.updateInterval, 50), // ~20fps target
						enableShadows: false,
						enableBlur: false,
						enableGlow: false,
						enableParallax: false,
						maxEffectObjects: Math.min(caps.maxEffectObjects, 30),
						backgroundEffect: {
							...caps.backgroundEffect,
							maxObjects: Math.min(caps.backgroundEffect.maxObjects, 30),
							animationSpeed: Math.min(caps.backgroundEffect.animationSpeed, 0.6),
							qualityLevel: 'minimal'
						}
					}));

					// Set lower quality on low battery
					this.setQualityOverride(0.5);
				}
			}

			// Listen for battery changes
			battery.addEventListener('chargingchange', () => this.checkBatteryStatus());
			battery.addEventListener('levelchange', () => this.checkBatteryStatus());
		} catch (e) {
			// Battery API not available
			if (this.debugMode) {
				console.error('Battery API error:', e);
			}
		}
	}

	/**
	 * Setup listeners for device power mode changes
	 */
	private setupPowerModeListeners(): void {
		if (!browser || typeof navigator === 'undefined' || typeof window === 'undefined') {
			return;
		}

		try {
			// Listen for Data Saver mode
			if ('connection' in navigator) {
				const connection = (navigator as any).connection;
				if (connection) {
					const connectionChangeHandler = () => {
						if (connection.saveData) {
							// Data saver mode is enabled - use low power settings
							deviceCapabilities.update((caps) => ({
								...caps,
								tier: 'low',
								frameSkip: Math.max(2, caps.frameSkip),
								enableShadows: false,
								enableBlur: false,
								enableGlow: false,
								useCanvas: true, // Canvas is typically more efficient
								maxEffectObjects: Math.min(caps.maxEffectObjects, 30),
								backgroundEffect: {
									...caps.backgroundEffect,
									maxObjects: Math.min(caps.backgroundEffect.maxObjects, 30),
									animationSpeed: Math.min(caps.backgroundEffect.animationSpeed, 0.6),
									qualityLevel: 'minimal'
								}
							}));

							this.setQualityOverride(0.4);
						}
					};

					connection.addEventListener('change', connectionChangeHandler);

					// Initial check
					connectionChangeHandler();
				}
			}

			// Respond to device theme preference for potential power saving
			const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
			if (darkModeMediaQuery.matches) {
				// Dark mode might indicate user preference for battery saving
				this.setQualityOverride(Math.min(this.currentQuality, 0.9));
			}

			// Detect reduced motion preference
			const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
			if (reducedMotionQuery.matches) {
				// User prefers reduced motion - likely wants battery saving too
				deviceCapabilities.update((caps) => ({
					...caps,
					enableParallax: false,
					enablePulse: false,
					frameSkip: Math.max(1, caps.frameSkip),
					backgroundEffect: {
						...caps.backgroundEffect,
						animationSpeed: Math.min(caps.backgroundEffect.animationSpeed, 0.5),
						qualityLevel: 'minimal'
					}
				}));

				this.setQualityOverride(Math.min(this.currentQuality, 0.7));
			}
		} catch (error) {
			if (this.debugMode) {
				console.error('Error setting up power mode listeners:', error);
			}
		}
	}

	/**
	 * Improved frame skipping logic with better adaptation to device performance
	 */
	public shouldRenderFrame(): boolean {
		if (!browser || typeof window === 'undefined' || typeof document === 'undefined') {
			return true;
		}

		try {
			// Always skip if document is hidden (we're not animating anyway)
			if (document.hidden) {
				return false;
			}

			// Count frames for FPS calculation
			this.frameCount++;

			const now = performance.now();
			const elapsed = now - this.lastFrameTime;

			// Always render first frame after initialization
			if (this.lastFrameTime === 0) {
				this.lastFrameTime = now;
				return true;
			}

			// Always render if enough time has passed to maintain minimum responsiveness
			const minFrameInterval = 1000 / 30; // Minimum 30fps equivalent
			if (elapsed > minFrameInterval) {
				this.lastFrameTime = now;
				this.skippedFrames = 0;
				return true;
			}

			// Adaptive frame skipping based on device capabilities and current quality
			const capabilities = get(deviceCapabilities);

			// Dynamic skip rate based on current quality and device tier
			const baseSkipRate = capabilities.frameSkip;
			const qualityFactor = Math.max(0, 2 - this.currentQuality * 2); // 0 at quality 1.0, 2 at quality 0

			// Determine skip rate
			const skipRate = Math.min(3, Math.floor(baseSkipRate + qualityFactor));

			// Use aggressive frame skipping for low FPS situations
			if (this.currentFPS < this.targetFPS * 0.7) {
				// In low FPS scenarios, skip more frames
				if (this.skippedFrames >= skipRate) {
					this.lastFrameTime = now;
					this.skippedFrames = 0;
					return true;
				} else {
					this.skippedFrames++;
					return false;
				}
			}

			// More conservative frame skipping for higher FPS
			if (this.skippedFrames >= Math.max(0, skipRate - 1)) {
				this.lastFrameTime = now;
				this.skippedFrames = 0;
				return true;
			} else {
				this.skippedFrames++;
				return false;
			}
		} catch (error) {
			if (this.debugMode) {
				console.error('Error in shouldRenderFrame:', error);
			}
			// Default to true on error
			return true;
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
		for (let i = 0; i < this.qualitySubscribers.length; i++) {
			try {
				this.qualitySubscribers[i](quality);
			} catch (error) {
				if (this.debugMode) {
					console.error('Error in quality subscriber:', error);
				}
			}
		}
	}

	/**
	 * Notify all FPS subscribers
	 */
	private notifyFPSSubscribers(fps: number) {
		for (let i = 0; i < this.fpsSubscribers.length; i++) {
			try {
				this.fpsSubscribers[i](fps);
			} catch (error) {
				if (this.debugMode) {
					console.error('Error in FPS subscriber:', error);
				}
			}
		}
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
		const currentMemory = memoryManager.getCurrentMemory();
		const currentPressure = get(memoryPressure);

		return {
			fps: this.currentFPS,
			quality: this.currentQuality,
			frameCount: this.frameCount,
			skippedFrames: this.skippedFrames,
			memoryUsage: currentMemory?.usagePercentage ?? this.lastMemoryUsage,
			memoryPressure:
				typeof currentPressure === 'string'
					? currentPressure
					: currentPressure && 'level' in currentPressure
						? (currentPressure as { level: string }).level
						: 'normal',
			onBatteryPower: this.onBatteryPower,
			lowBatteryMode: this.lowBatteryMode
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

		try {
			this.stopMonitoring();
			this.qualitySubscribers = [];
			this.fpsSubscribers = [];

			// Cleanup memory monitoring subscriptions
			if (this.memoryUnsubscribers) {
				this.memoryUnsubscribers.forEach((unsubscribe) => unsubscribe());
				this.memoryUnsubscribers = [];
			}

			// Clear memory monitoring interval (legacy - now handled by unified system)
			if (this.memoryCheckInterval) {
				clearInterval(this.memoryCheckInterval);
				this.memoryCheckInterval = null;
			}

			// Remove event listeners - with safety checks
			if (typeof document !== 'undefined') {
				document.removeEventListener('visibilitychange', this.handleVisibilityChange);
			}
			if (typeof window !== 'undefined') {
				window.removeEventListener('orientationchange', this.handleOrientationChange);
			}
		} catch (error) {
			if (this.debugMode) {
				console.error('Error during cleanup:', error);
			}
		}
	}
}

// Singleton instance
export const frameRateController = new FrameRateController();

// Re-export the unified memory usage store
export { memoryUsageStore };

// Subscribe to FPS updates to update the store
if (browser) {
	frameRateController.subscribeFPS((fps) => {
		fpsStore.set(fps);
	});
}

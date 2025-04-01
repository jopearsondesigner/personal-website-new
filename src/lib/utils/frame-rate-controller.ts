// Optimized frame-rate-controller.ts
import { browser } from '$app/environment';
import { deviceCapabilities } from './device-performance';
import { get } from 'svelte/store';

type QualityCallback = (quality: number) => void;

class FrameRateController {
	private targetFPS = 60;
	private maxSkippedFrames = 2;
	private measurementInterval = 1000; // 1 second
	private qualitySubscribers: QualityCallback[] = [];
	private frameCount = 0;
	private skippedFrames = 0;
	private lastFrameTime = 0;
	private lastMeasurementTime = 0;
	private currentFPS = 60;
	private currentQuality = 1.0;
	private adaptiveEnabled = true;
	private lastFrameTimestamps: number[] = [];
	private isMonitoring = false;
	private monitoringRAFId: number | null = null;
	private lowFPSCounter = 0;
	private stableFPSCounter = 0;
	private qualityChangeThreshold = 3; // Number of consecutive measurements before changing quality
	private minQuality = 0.3;
	private isScreenFocused = true; // Track if window/tab is focused
	private deviceTier: 'low' | 'medium' | 'high' = 'high';
	private adaptiveThrottling = false;
	private throttledUpdateInterval = 16; // Default to 60fps
	private lastQualityAdjustment = 0;

	constructor() {
		if (browser) {
			// Initialize with device-specific settings
			this.initFromDeviceCapabilities();
			this.setupFocusTracking();
			this.setupMonitoring();
		}
	}

	private initFromDeviceCapabilities() {
		if (!browser) return;

		try {
			const capabilities = get(deviceCapabilities);
			this.deviceTier = capabilities.tier;

			// Set initial values based on device tier
			switch (capabilities.tier) {
				case 'low':
					this.targetFPS = 30;
					this.maxSkippedFrames = 3;
					this.currentQuality = 0.5;
					this.throttledUpdateInterval = 50; // ~20fps
					this.adaptiveThrottling = true;
					break;

				case 'medium':
					this.targetFPS = 45;
					this.maxSkippedFrames = 2;
					this.currentQuality = 0.75;
					this.throttledUpdateInterval = 32; // ~30fps
					this.adaptiveThrottling = true;
					break;

				case 'high':
				default:
					this.targetFPS = 60;
					this.maxSkippedFrames = 1;
					this.currentQuality = 1.0;
					this.throttledUpdateInterval = 16; // ~60fps
					this.adaptiveThrottling = false;
					break;
			}

			// Subscribe to future changes
			deviceCapabilities.subscribe((newCapabilities) => {
				this.deviceTier = newCapabilities.tier;

				// Update max skipped frames based on tier
				this.maxSkippedFrames = newCapabilities.frameSkip || this.maxSkippedFrames;

				// Update throttled update interval
				this.throttledUpdateInterval =
					newCapabilities.updateInterval || this.throttledUpdateInterval;

				// Adjust target FPS based on device tier
				this.targetFPS =
					newCapabilities.tier === 'low' ? 30 : newCapabilities.tier === 'medium' ? 45 : 60;
			});
		} catch (error) {
			console.error('Error initializing from device capabilities:', error);
		}
	}

	private setupFocusTracking() {
		if (!browser) return;

		// Track window focus/blur
		window.addEventListener(
			'focus',
			() => {
				this.isScreenFocused = true;
			},
			{ passive: true }
		);

		window.addEventListener(
			'blur',
			() => {
				this.isScreenFocused = false;
			},
			{ passive: true }
		);

		// Track visibility changes
		document.addEventListener(
			'visibilitychange',
			() => {
				this.isScreenFocused = document.visibilityState === 'visible';
			},
			{ passive: true }
		);
	}

	private setupMonitoring() {
		if (this.isMonitoring) return;
		this.isMonitoring = true;

		const monitorLoop = () => {
			const now = performance.now();

			// Process timestamps to calculate FPS
			this.lastFrameTimestamps.push(now);

			// Keep array at reasonable size
			while (this.lastFrameTimestamps.length > 60) {
				this.lastFrameTimestamps.shift();
			}

			if (this.lastFrameTimestamps.length >= 2) {
				// Calculate FPS from the last 60 frames or what we have
				const timeSpan =
					this.lastFrameTimestamps[this.lastFrameTimestamps.length - 1] -
					this.lastFrameTimestamps[0];
				const frameCount = this.lastFrameTimestamps.length - 1;
				if (timeSpan > 0) {
					this.currentFPS = (frameCount * 1000) / timeSpan;
				}

				// Adjust quality if needed (throttle to every second)
				if (now - this.lastMeasurementTime > this.measurementInterval) {
					this.lastMeasurementTime = now;
					this.adjustQuality();
				}
			}

			this.monitoringRAFId = requestAnimationFrame(monitorLoop);
		};

		this.monitoringRAFId = requestAnimationFrame(monitorLoop);
	}

	private stopMonitoring() {
		if (!this.isMonitoring || !this.monitoringRAFId) return;

		cancelAnimationFrame(this.monitoringRAFId);
		this.monitoringRAFId = null;
		this.isMonitoring = false;
	}

	// Adjust quality based on measured FPS with hysteresis
	private adjustQuality() {
		if (!this.adaptiveEnabled || !this.isScreenFocused) return;

		const now = performance.now();
		// Throttle quality adjustments to avoid rapid changes
		if (now - this.lastQualityAdjustment < 2000) return;

		// Calculate new quality level based on FPS
		let qualityChanged = false;
		let newQuality = this.currentQuality;

		// Severe performance issues - target is less than 50% of desired FPS
		if (this.currentFPS < this.targetFPS * 0.5) {
			this.lowFPSCounter++;
			this.stableFPSCounter = 0;

			// Only reduce quality after consistent low FPS
			if (this.lowFPSCounter >= this.qualityChangeThreshold) {
				newQuality = Math.max(this.minQuality, this.currentQuality - 0.2);
				qualityChanged = newQuality !== this.currentQuality;
				this.lowFPSCounter = 0;
			}
		}
		// Moderate performance issues - target is between 50% and 75% of desired FPS
		else if (this.currentFPS < this.targetFPS * 0.75) {
			this.lowFPSCounter++;
			this.stableFPSCounter = 0;

			// Only reduce quality after consistent moderate FPS issues
			if (this.lowFPSCounter >= this.qualityChangeThreshold) {
				newQuality = Math.max(this.minQuality + 0.2, this.currentQuality - 0.1);
				qualityChanged = newQuality !== this.currentQuality;
				this.lowFPSCounter = 0;
			}
		}
		// Good performance - gradually restore quality
		else if (this.currentFPS > this.targetFPS * 0.95 && this.currentQuality < 1.0) {
			this.stableFPSCounter++;
			this.lowFPSCounter = 0;

			// Only increase quality after consistently good FPS
			if (this.stableFPSCounter >= this.qualityChangeThreshold * 2) {
				// Require longer stable periods
				newQuality = Math.min(1.0, this.currentQuality + 0.05);
				qualityChanged = newQuality !== this.currentQuality;
				this.stableFPSCounter = 0;
			}
		} else {
			// Reset counters when FPS is in an acceptable range
			this.lowFPSCounter = Math.max(0, this.lowFPSCounter - 1);
			this.stableFPSCounter = Math.max(0, this.stableFPSCounter - 1);
		}

		// Only notify if quality changed
		if (qualityChanged) {
			this.currentQuality = newQuality;
			this.lastQualityAdjustment = now;
			this.notifyQualitySubscribers(newQuality);

			// Adjust adaptive throttling based on quality
			if (this.adaptiveThrottling) {
				if (newQuality < 0.5) {
					this.throttledUpdateInterval = 50; // ~20fps
				} else if (newQuality < 0.8) {
					this.throttledUpdateInterval = 32; // ~30fps
				} else {
					this.throttledUpdateInterval = 16; // ~60fps
				}
			}
		}
	}

	// Check if we should render this frame based on adaptive frame skipping
	public shouldRenderFrame(): boolean {
		if (!browser) return true;
		if (!this.isScreenFocused) return false;

		const now = performance.now();
		const elapsed = now - this.lastFrameTime;
		this.frameCount++;

		// Get the maximum frame skip from device capabilities or use default
		const maxSkip = this.maxSkippedFrames;

		// Always render if enough time has passed
		if (elapsed > 100) {
			this.lastFrameTime = now;
			this.skippedFrames = 0;
			return true;
		}

		// Apply adaptive throttling based on quality and FPS
		if (this.adaptiveThrottling && elapsed < this.throttledUpdateInterval) {
			return false;
		}

		// Skip frames based on quality and device capability
		if (this.skippedFrames >= maxSkip) {
			this.lastFrameTime = now;
			this.skippedFrames = 0;
			return true;
		} else {
			// Skip this frame
			this.skippedFrames++;
			return false;
		}
	}

	// Subscribe to quality changes
	public subscribeQuality(callback: QualityCallback): () => void {
		this.qualitySubscribers.push(callback);

		// Immediately invoke with current quality
		callback(this.currentQuality);

		// Return unsubscribe function
		return () => {
			this.qualitySubscribers = this.qualitySubscribers.filter((cb) => cb !== callback);
		};
	}

	// Notify all quality subscribers
	private notifyQualitySubscribers(quality: number) {
		this.qualitySubscribers.forEach((callback) => {
			try {
				callback(quality);
			} catch (error) {
				console.error('Error in quality subscriber:', error);
			}
		});
	}

	// Set target FPS
	public setTargetFPS(fps: number) {
		this.targetFPS = fps;
	}

	// Set maximum frame skipping
	public setMaxSkippedFrames(max: number) {
		this.maxSkippedFrames = max;
	}

	// Enable/disable adaptive quality
	public setAdaptiveEnabled(enabled: boolean) {
		this.adaptiveEnabled = enabled;
	}

	// Get current estimated FPS
	public getCurrentFPS(): number {
		return this.currentFPS;
	}

	// Get current quality level (0.0 - 1.0)
	public getCurrentQuality(): number {
		return this.currentQuality;
	}

	// Force a specific quality level
	public forceQualityLevel(quality: number): void {
		const newQuality = Math.max(this.minQuality, Math.min(1.0, quality));
		if (newQuality !== this.currentQuality) {
			this.currentQuality = newQuality;
			this.notifyQualitySubscribers(newQuality);
		}
	}

	// Cleanup resources
	public cleanup() {
		this.stopMonitoring();
		this.qualitySubscribers = [];
	}
}

// Singleton instance
export const frameRateController = new FrameRateController();

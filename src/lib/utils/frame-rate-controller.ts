// src/lib/utils/frame-rate-controller.ts
import { browser } from '$app/environment';
import { deviceCapabilities } from './device-performance';
import { get, writable } from 'svelte/store';

export type QualityLevel = 'ultra' | 'high' | 'medium' | 'low' | 'minimal';
export type QualityCallback = (quality: number, qualityLevel: QualityLevel) => void;

// Quality settings with more granular control and specific features
export interface QualitySettings {
	level: QualityLevel;
	qualityFactor: number; // 0.0 - 1.0 numerical representation
	particleCount: number;
	effectsEnabled: {
		glow: boolean;
		blur: boolean;
		shadows: boolean;
		reflections: boolean;
		parallax: boolean;
		scanlines: boolean;
		particles: boolean;
		animation: boolean;
	};
	renderSettings: {
		resolution: number; // 1.0 = full resolution, 0.5 = half, etc.
		antialiasing: boolean;
		textureQuality: 'high' | 'medium' | 'low';
		drawDistance: number;
	};
}

// Performance metrics store for external consumption
export const performanceMetrics = writable({
	fps: 60,
	quality: 1.0,
	qualityLevel: 'high' as QualityLevel,
	memoryUsage: 0,
	cpuLoad: 0,
	isThrottled: false,
	deviceTier: 'high' as 'low' | 'medium' | 'high',
	adaptiveEnabled: true,
	lastQualityChange: 0,
	frameSkip: 0,
	eventLog: [] as { timestamp: number; event: string; data?: any }[],
	debugMode: false
});

// Quality levels with specific settings
const qualityPresets: Record<QualityLevel, QualitySettings> = {
	ultra: {
		level: 'ultra',
		qualityFactor: 1.0,
		particleCount: 80,
		effectsEnabled: {
			glow: true,
			blur: true,
			shadows: true,
			reflections: true,
			parallax: true,
			scanlines: true,
			particles: true,
			animation: true
		},
		renderSettings: {
			resolution: 1.0,
			antialiasing: true,
			textureQuality: 'high',
			drawDistance: 100
		}
	},
	high: {
		level: 'high',
		qualityFactor: 0.8,
		particleCount: 60,
		effectsEnabled: {
			glow: true,
			blur: true,
			shadows: true,
			reflections: false,
			parallax: true,
			scanlines: true,
			particles: true,
			animation: true
		},
		renderSettings: {
			resolution: 1.0,
			antialiasing: true,
			textureQuality: 'high',
			drawDistance: 80
		}
	},
	medium: {
		level: 'medium',
		qualityFactor: 0.6,
		particleCount: 40,
		effectsEnabled: {
			glow: true,
			blur: false,
			shadows: false,
			reflections: false,
			parallax: true,
			scanlines: true,
			particles: true,
			animation: true
		},
		renderSettings: {
			resolution: 0.8,
			antialiasing: false,
			textureQuality: 'medium',
			drawDistance: 60
		}
	},
	low: {
		level: 'low',
		qualityFactor: 0.4,
		particleCount: 20,
		effectsEnabled: {
			glow: false,
			blur: false,
			shadows: false,
			reflections: false,
			parallax: false,
			scanlines: true,
			particles: true,
			animation: true
		},
		renderSettings: {
			resolution: 0.6,
			antialiasing: false,
			textureQuality: 'low',
			drawDistance: 40
		}
	},
	minimal: {
		level: 'minimal',
		qualityFactor: 0.2,
		particleCount: 10,
		effectsEnabled: {
			glow: false,
			blur: false,
			shadows: false,
			reflections: false,
			parallax: false,
			scanlines: false,
			particles: false,
			animation: true
		},
		renderSettings: {
			resolution: 0.5,
			antialiasing: false,
			textureQuality: 'low',
			drawDistance: 20
		}
	}
};

class FrameRateController {
	private targetFPS = 60;
	private maxSkippedFrames = 2;
	private measurementInterval = 500; // Reduced from 1000ms for faster response
	private qualitySubscribers: QualityCallback[] = [];
	private frameCount = 0;
	private skippedFrames = 0;
	private lastFrameTime = 0;
	private lastMeasurementTime = 0;
	private currentFPS = 60;
	private currentQuality = 1.0;
	private currentQualityLevel: QualityLevel = 'high';
	private adaptiveEnabled = true;
	private frameTimestamps: number[] = [];
	private frameDurations: number[] = [];
	private isMonitoring = false;
	private monitoringRAFId: number | null = null;
	private lowFPSCounter = 0;
	private stableFPSCounter = 0;
	private qualityChangeThreshold = 3;
	private qualityIncreaseThreshold = 6; // Higher threshold for increasing quality
	private minQuality = 0.2;
	private isScreenFocused = true;
	private deviceTier: 'low' | 'medium' | 'high' = 'high';
	private adaptiveThrottling = false;
	private throttledUpdateInterval = 16; // Default to 60fps
	private lastQualityAdjustment = 0;
	private qualityChangeInterval = 2000; // Minimum time between quality changes
	private memoryUsage = 0;
	private memoryMonitoringEnabled = true;
	private memoryMonitorInterval: ReturnType<typeof setInterval> | null = null;
	private qualityTransitionStartTime = 0;
	private qualityTransitionDuration = 1000; // 1 second for smooth transitions
	private targetQuality = 1.0;
	private previousQuality = 1.0;
	private isTransitioningQuality = false;
	private debugMode = false;
	private eventLog: { timestamp: number; event: string; data?: any }[] = [];
	private fpsHistory: number[] = []; // Store FPS history for trend analysis
	private fpsHistoryMaxLength = 20; // Store last 20 FPS measurements
	private performanceTrend: 'improving' | 'stable' | 'degrading' = 'stable';
	private lastPerformanceUpdate = 0;
	private performanceUpdateInterval = 5000; // Update performance metrics every 5 seconds
	private predictiveThrottling = false; // Enable predictive throttling based on trends
	private transitioning = false;
	private transitionTarget: QualityLevel | null = null;
	private transitionProgress = 0;

	constructor() {
		if (browser) {
			this.initFromDeviceCapabilities();
			this.setupFocusTracking();
			this.setupMonitoring();
			this.setupMemoryMonitoring();
			this.logEvent('FrameRateController initialized');
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
					this.currentQuality = 0.4;
					this.currentQualityLevel = 'low';
					this.throttledUpdateInterval = 50; // ~20fps
					this.adaptiveThrottling = true;
					this.qualityChangeThreshold = 4; // More stable on low-end devices
					break;

				case 'medium':
					this.targetFPS = 45;
					this.maxSkippedFrames = 2;
					this.currentQuality = 0.6;
					this.currentQualityLevel = 'medium';
					this.throttledUpdateInterval = 32; // ~30fps
					this.adaptiveThrottling = true;
					break;

				case 'high':
				default:
					this.targetFPS = 60;
					this.maxSkippedFrames = 1;
					this.currentQuality = 1.0;
					this.currentQualityLevel = 'high';
					this.throttledUpdateInterval = 16; // ~60fps
					this.adaptiveThrottling = false;
					break;
			}

			// Disable certain features on iOS devices
			if (capabilities.isIOS) {
				this.predictiveThrottling = true; // More aggressive throttling for iOS

				// iPhone-specific optimizations
				if (capabilities.isMobile && !capabilities.isTablet) {
					this.maxSkippedFrames = Math.min(4, this.maxSkippedFrames + 1);
					this.qualityTransitionDuration = 500; // Faster transitions on mobile

					// If it's older hardware, be more aggressive
					if (capabilities.tier === 'low' || capabilities.tier === 'medium') {
						this.targetFPS = 30; // Lower target on older iOS devices
						this.currentQuality = 0.4;
						this.currentQualityLevel = 'low';
					}
				}
			}

			// Subscribe to future changes in device capabilities
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

				this.logEvent('Device capabilities updated', { tier: newCapabilities.tier });

				// Update performance metrics store
				this.updatePerformanceMetrics();
			});

			this.logEvent('Device capabilities initialized', { tier: capabilities.tier });
		} catch (error) {
			console.error('Error initializing from device capabilities:', error);
			this.logEvent('Error initializing device capabilities', { error });
		}
	}

	private setupFocusTracking() {
		if (!browser) return;

		// Track window focus/blur
		window.addEventListener(
			'focus',
			() => {
				this.isScreenFocused = true;
				this.logEvent('Window focused');
			},
			{ passive: true }
		);

		window.addEventListener(
			'blur',
			() => {
				this.isScreenFocused = false;
				this.logEvent('Window blurred');
			},
			{ passive: true }
		);

		// Track visibility changes
		document.addEventListener(
			'visibilitychange',
			() => {
				this.isScreenFocused = document.visibilityState === 'visible';
				this.logEvent('Visibility changed', { visible: this.isScreenFocused });

				// Reset measurements when returning to visible
				if (this.isScreenFocused) {
					this.frameDurations = [];
					this.frameTimestamps = [];
					this.lastMeasurementTime = performance.now();
				}
			},
			{ passive: true }
		);

		// Track orientation changes
		if (window.matchMedia) {
			const mediaQuery = window.matchMedia('(orientation: portrait)');

			const orientationChangeHandler = () => {
				this.logEvent('Orientation changed', { portrait: mediaQuery.matches });

				// Reset performance measurements after orientation change
				this.frameDurations = [];
				this.frameTimestamps = [];
				this.lastMeasurementTime = performance.now();

				// Temporarily lower quality during orientation change
				const currentQuality = this.currentQuality;
				const currentLevel = this.currentQualityLevel;

				this.forceQualityLevel(0.4);

				// Restore quality after a delay
				setTimeout(() => {
					this.forceQualityLevel(currentQuality);
					this.currentQualityLevel = currentLevel;
					this.notifyQualitySubscribers(currentQuality, currentLevel);
				}, 500);
			};

			// Modern browsers
			if (mediaQuery.addEventListener) {
				mediaQuery.addEventListener('change', orientationChangeHandler);
			}
			// Older browsers
			else if ('addListener' in mediaQuery) {
				// @ts-ignore - older browser support
				mediaQuery.addListener(orientationChangeHandler);
			}
		}
	}

	private setupMonitoring() {
		if (this.isMonitoring) return;
		this.isMonitoring = true;

		const monitorLoop = () => {
			const now = performance.now();

			// Skip monitoring when tab is not focused to save resources
			if (!this.isScreenFocused && !get(deviceCapabilities).animateInBackground) {
				this.monitoringRAFId = requestAnimationFrame(monitorLoop);
				return;
			}

			// Calculate frame duration
			if (this.frameTimestamps.length > 0) {
				const lastTimestamp = this.frameTimestamps[this.frameTimestamps.length - 1];
				const frameDuration = now - lastTimestamp;

				// Filter out unreasonable values (tab switches, sleep, etc.)
				if (frameDuration > 0 && frameDuration < 1000) {
					this.frameDurations.push(frameDuration);

					// Keep reasonable number of measurements
					while (this.frameDurations.length > 60) {
						this.frameDurations.shift();
					}
				}
			}

			// Store frame timestamp
			this.frameTimestamps.push(now);

			// Keep array at reasonable size
			while (this.frameTimestamps.length > 120) {
				this.frameTimestamps.shift();
			}

			// Calculate FPS from valid frame durations
			if (this.frameDurations.length >= 5) {
				// Use median instead of mean for more stability
				const sortedDurations = [...this.frameDurations].sort((a, b) => a - b);
				const medianDuration = sortedDurations[Math.floor(sortedDurations.length / 2)];

				if (medianDuration > 0) {
					const newFPS = 1000 / medianDuration;

					// Apply smoothing for less jittery readings (exponential moving average)
					this.currentFPS = this.currentFPS * 0.8 + newFPS * 0.2;

					// Store FPS history for trend analysis
					this.fpsHistory.push(this.currentFPS);
					if (this.fpsHistory.length > this.fpsHistoryMaxLength) {
						this.fpsHistory.shift();
					}

					// Update performance trend analysis every 5 seconds
					if (now - this.lastPerformanceUpdate > this.performanceUpdateInterval) {
						this.analyzePerformanceTrend();
						this.lastPerformanceUpdate = now;
					}
				}
			}

			// Adjust quality if needed (throttled)
			if (now - this.lastMeasurementTime > this.measurementInterval) {
				this.lastMeasurementTime = now;

				// Handle transitions
				if (this.isTransitioningQuality) {
					this.updateQualityTransition(now);
				} else {
					this.adjustQuality();
				}

				// Update the performance metrics for external consumption
				this.updatePerformanceMetrics();
			}

			this.monitoringRAFId = requestAnimationFrame(monitorLoop);
		};

		this.monitoringRAFId = requestAnimationFrame(monitorLoop);
		this.logEvent('Performance monitoring started');
	}

	private updateQualityTransition(now: number) {
		const elapsed = now - this.qualityTransitionStartTime;

		if (elapsed >= this.qualityTransitionDuration) {
			// Transition complete
			this.currentQuality = this.targetQuality;
			this.isTransitioningQuality = false;
			this.logEvent('Quality transition completed', { quality: this.currentQuality });
			this.notifyQualitySubscribers(this.currentQuality, this.currentQualityLevel);
		} else {
			// In transition - calculate interpolated quality
			const progress = elapsed / this.qualityTransitionDuration;
			this.currentQuality =
				this.previousQuality + (this.targetQuality - this.previousQuality) * progress;
			this.notifyQualitySubscribers(this.currentQuality, this.currentQualityLevel);
		}
	}

	private stopMonitoring() {
		if (!this.isMonitoring || !this.monitoringRAFId) return;

		cancelAnimationFrame(this.monitoringRAFId);
		this.monitoringRAFId = null;
		this.isMonitoring = false;
		this.logEvent('Performance monitoring stopped');
	}

	private setupMemoryMonitoring() {
		if (!browser || !this.memoryMonitoringEnabled) return;

		// Use memory API if available (Chrome only)
		const updateMemoryUsage = () => {
			try {
				if ('memory' in performance) {
					// @ts-ignore - performance.memory is non-standard
					const memoryInfo = performance.memory;
					if (memoryInfo) {
						this.memoryUsage = memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit;

						// If memory usage is extremely high, force garbage collection hint
						if (this.memoryUsage > 0.8) {
							this.logEvent('High memory usage detected', { usage: this.memoryUsage });
							this.hintGarbageCollection();

							// Force a quality reduction if memory usage is critical
							if (this.memoryUsage > 0.9 && this.currentQuality > 0.3) {
								this.forceQualityLevel(Math.max(0.3, this.currentQuality - 0.2));
								this.logEvent('Emergency quality reduction due to memory pressure');
							}
						}
					}
				}
			} catch (e) {
				// Memory API access might be restricted
				this.memoryMonitoringEnabled = false;
				if (this.memoryMonitorInterval) {
					clearInterval(this.memoryMonitorInterval);
					this.memoryMonitorInterval = null;
				}
			}
		};

		// Poll memory usage every 5 seconds
		this.memoryMonitorInterval = setInterval(updateMemoryUsage, 5000);
		updateMemoryUsage(); // Initial check
	}

	// Give hints to browser for garbage collection during idle periods
	private hintGarbageCollection() {
		if (!browser) return;

		// Use window.requestIdleCallback if available
		if ('requestIdleCallback' in window) {
			// @ts-ignore - TS might not know requestIdleCallback
			window.requestIdleCallback(() => {
				// Clear large arrays that we don't need to keep
				if (this.frameDurations.length > 30) {
					this.frameDurations = this.frameDurations.slice(-30);
				}

				if (this.frameTimestamps.length > 60) {
					this.frameTimestamps = this.frameTimestamps.slice(-60);
				}

				if (this.eventLog.length > 100) {
					this.eventLog = this.eventLog.slice(-100);
				}

				// Force array cleanup
				this.frameDurations = [...this.frameDurations];
				this.frameTimestamps = [...this.frameTimestamps];
				this.eventLog = [...this.eventLog];

				this.logEvent('Garbage collection hint');
			});
		} else {
			// Fallback for browsers without requestIdleCallback
			setTimeout(() => {
				if (this.frameDurations.length > 30) {
					this.frameDurations = this.frameDurations.slice(-30);
				}

				if (this.frameTimestamps.length > 60) {
					this.frameTimestamps = this.frameTimestamps.slice(-60);
				}

				if (this.eventLog.length > 100) {
					this.eventLog = this.eventLog.slice(-100);
				}
			}, 1000);
		}
	}

	// Analyze performance trend to predict issues before they become severe
	private analyzePerformanceTrend() {
		if (this.fpsHistory.length < 10) return; // Need enough data points

		// Get first and last 5 FPS readings
		const firstHalf = this.fpsHistory.slice(0, Math.floor(this.fpsHistory.length / 2));
		const secondHalf = this.fpsHistory.slice(Math.floor(this.fpsHistory.length / 2));

		// Calculate averages
		const firstAvg = firstHalf.reduce((sum, fps) => sum + fps, 0) / firstHalf.length;
		const secondAvg = secondHalf.reduce((sum, fps) => sum + fps, 0) / secondHalf.length;

		// Determine trend
		const difference = secondAvg - firstAvg;
		const percentChange = (difference / firstAvg) * 100;

		const oldTrend = this.performanceTrend;

		if (percentChange < -10) {
			this.performanceTrend = 'degrading';
		} else if (percentChange > 10) {
			this.performanceTrend = 'improving';
		} else {
			this.performanceTrend = 'stable';
		}

		// Log trend changes
		if (oldTrend !== this.performanceTrend) {
			this.logEvent('Performance trend changed', {
				from: oldTrend,
				to: this.performanceTrend,
				percentChange
			});

			// Apply predictive throttling if enabled
			if (this.predictiveThrottling && this.performanceTrend === 'degrading') {
				// Preemptively reduce quality if we detect a degrading trend
				const preemptiveReduction = Math.max(this.minQuality, this.currentQuality - 0.1);

				// Only apply if we're not already at minimum quality
				if (preemptiveReduction > this.minQuality && preemptiveReduction < this.currentQuality) {
					this.logEvent('Predictive quality reduction', {
						from: this.currentQuality,
						to: preemptiveReduction
					});
					this.transitionToQuality(preemptiveReduction);
				}
			}
		}
	}

	// Adjust quality based on measured FPS with hysteresis
	private adjustQuality() {
		if (!this.adaptiveEnabled || !this.isScreenFocused) return;

		const now = performance.now();

		// Throttle quality adjustments to avoid rapid changes
		if (now - this.lastQualityAdjustment < this.qualityChangeInterval) return;

		// Calculate new quality level based on FPS
		let qualityChanged = false;
		let newQuality = this.currentQuality;
		let newQualityLevel = this.currentQualityLevel;

		// Severe performance issues - less than 50% of target FPS
		if (this.currentFPS < this.targetFPS * 0.5) {
			this.lowFPSCounter++;
			this.stableFPSCounter = 0;

			// Only reduce quality after consistent low FPS
			if (this.lowFPSCounter >= this.qualityChangeThreshold) {
				// More aggressive reduction for severe issues
				newQuality = Math.max(this.minQuality, this.currentQuality - 0.2);

				// Determine new quality level
				newQualityLevel = this.getQualityLevelForFactor(newQuality);

				qualityChanged = newQuality !== this.currentQuality;
				this.lowFPSCounter = 0;
			}
		}
		// Moderate performance issues - between 50% and 80% of target FPS
		else if (this.currentFPS < this.targetFPS * 0.8) {
			this.lowFPSCounter++;
			this.stableFPSCounter = 0;

			// Only reduce quality after consistent moderate FPS issues
			if (this.lowFPSCounter >= this.qualityChangeThreshold) {
				// Smaller reduction for moderate issues
				newQuality = Math.max(this.minQuality, this.currentQuality - 0.1);

				// Determine new quality level
				newQualityLevel = this.getQualityLevelForFactor(newQuality);

				qualityChanged = newQuality !== this.currentQuality;
				this.lowFPSCounter = 0;
			}
		}
		// Good performance - gradually restore quality
		else if (this.currentFPS > this.targetFPS * 0.95 && this.currentQuality < 1.0) {
			this.stableFPSCounter++;
			this.lowFPSCounter = 0;

			// Only increase quality after consistently good FPS - higher threshold for increases
			if (this.stableFPSCounter >= this.qualityIncreaseThreshold) {
				// Very gradual quality improvement
				newQuality = Math.min(1.0, this.currentQuality + 0.05);

				// Determine new quality level
				newQualityLevel = this.getQualityLevelForFactor(newQuality);

				qualityChanged = newQuality !== this.currentQuality;
				this.stableFPSCounter = 0;
			}
		} else {
			// Reset counters when FPS is in an acceptable range
			this.lowFPSCounter = Math.max(0, this.lowFPSCounter - 1);
			this.stableFPSCounter = Math.max(0, this.stableFPSCounter - 1);
		}

		// Only apply changes if quality level changed significantly
		if (qualityChanged) {
			this.lastQualityAdjustment = now;
			this.logEvent('Quality adjusted', {
				from: this.currentQuality,
				to: newQuality,
				fromLevel: this.currentQualityLevel,
				toLevel: newQualityLevel,
				fps: this.currentFPS
			});

			// Transition to new quality smoothly
			this.transitionToQuality(newQuality);
			this.currentQualityLevel = newQualityLevel;

			// Update adaptive throttling based on new quality
			this.updateAdaptiveThrottling(newQuality);
		}
	}

	// Helper to get quality level enum from quality factor
	private getQualityLevelForFactor(factor: number): QualityLevel {
		if (factor >= 0.9) return 'ultra';
		if (factor >= 0.7) return 'high';
		if (factor >= 0.5) return 'medium';
		if (factor >= 0.3) return 'low';
		return 'minimal';
	}

	// Transition smoothly between quality levels
	private transitionToQuality(targetQuality: number) {
		// Avoid redundant transitions
		if (targetQuality === this.currentQuality) return;

		this.previousQuality = this.currentQuality;
		this.targetQuality = targetQuality;
		this.qualityTransitionStartTime = performance.now();
		this.isTransitioningQuality = true;

		// Immediately notify of transition start
		this.notifyQualitySubscribers(this.currentQuality, this.currentQualityLevel);
	}

	// Helper to get quality factor from a tier name
	public getQualityFactorForTier(tier: 'ultra' | 'high' | 'medium' | 'low' | 'minimal'): number {
		switch (tier) {
			case 'ultra':
				return 1.0;
			case 'high':
				return 0.8;
			case 'medium':
				return 0.6;
			case 'low':
				return 0.4;
			case 'minimal':
				return 0.2;
			default:
				return 0.6;
		}
	}

	// Update throttling parameters based on quality
	private updateAdaptiveThrottling(quality: number) {
		if (!this.adaptiveThrottling) return;

		if (quality < 0.3) {
			this.throttledUpdateInterval = 60; // ~16fps
			this.maxSkippedFrames = Math.min(5, this.maxSkippedFrames + 1);
		} else if (quality < 0.5) {
			this.throttledUpdateInterval = 50; // ~20fps
			this.maxSkippedFrames = Math.min(4, this.maxSkippedFrames);
		} else if (quality < 0.7) {
			this.throttledUpdateInterval = 32; // ~30fps
			this.maxSkippedFrames = Math.min(3, this.maxSkippedFrames);
		} else {
			this.throttledUpdateInterval = 16; // ~60fps
			this.maxSkippedFrames = Math.min(2, this.maxSkippedFrames);
		}
	}

	// Check if we should render this frame based on adaptive frame skipping
	public shouldRenderFrame(): boolean {
		if (!browser) return true;
		if (!this.isScreenFocused && !get(deviceCapabilities).animateInBackground) return false;

		const now = performance.now();
		const elapsed = now - this.lastFrameTime;
		this.frameCount++;

		// Always render if enough time has passed (prevents complete freezing)
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
		if (this.skippedFrames >= this.maxSkippedFrames) {
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
		callback(this.currentQuality, this.currentQualityLevel);

		// Return unsubscribe function
		return () => {
			this.qualitySubscribers = this.qualitySubscribers.filter((cb) => cb !== callback);
		};
	}

	// Notify all quality subscribers
	private notifyQualitySubscribers(quality: number, qualityLevel: QualityLevel) {
		this.qualitySubscribers.forEach((callback) => {
			try {
				callback(quality, qualityLevel);
			} catch (error) {
				console.error('Error in quality subscriber:', error);
			}
		});
	}

	// Update metrics in the Svelte store for external consumption
	private updatePerformanceMetrics() {
		performanceMetrics.set({
			fps: Math.round(this.currentFPS * 10) / 10, // Round to 1 decimal place
			quality: this.currentQuality,
			qualityLevel: this.currentQualityLevel,
			memoryUsage: this.memoryUsage,
			cpuLoad: Math.min(
				1,
				(this.targetFPS - Math.min(this.currentFPS, this.targetFPS)) / this.targetFPS
			),
			isThrottled: this.adaptiveThrottling && this.currentQuality < 0.8,
			deviceTier: this.deviceTier,
			adaptiveEnabled: this.adaptiveEnabled,
			lastQualityChange: this.lastQualityAdjustment,
			frameSkip: this.maxSkippedFrames,
			eventLog: this.debugMode ? this.eventLog : [],
			debugMode: this.debugMode
		});
	}

	// Log events for debugging
	private logEvent(event: string, data?: any) {
		const timestamp = performance.now();
		const logEntry = { timestamp, event, data };

		this.eventLog.push(logEntry);

		// Keep log size reasonable
		if (this.eventLog.length > 200) {
			this.eventLog.shift();
		}

		// Log to console in debug mode
		if (this.debugMode) {
			console.debug(`[FrameController] ${event}`, data || '');
		}
	}

	// Set target FPS
	public setTargetFPS(fps: number) {
		this.targetFPS = fps;
		this.logEvent('Target FPS changed', { fps });
		this.updatePerformanceMetrics();
	}

	// Set maximum frame skipping
	public setMaxSkippedFrames(max: number) {
		this.maxSkippedFrames = max;
		this.logEvent('Max skipped frames changed', { max });
		this.updatePerformanceMetrics();
	}

	// Enable/disable adaptive quality
	public setAdaptiveEnabled(enabled: boolean) {
		this.adaptiveEnabled = enabled;
		this.logEvent('Adaptive quality toggled', { enabled });
		this.updatePerformanceMetrics();
	}

	// Set debug mode
	public setDebugMode(enabled: boolean) {
		this.debugMode = enabled;
		this.logEvent('Debug mode toggled', { enabled });
		this.updatePerformanceMetrics();
	}

	// Make transitionToQuality public
	public transitionToQuality(targetQuality: number) {
		// Avoid redundant transitions
		if (targetQuality === this.currentQuality) return;

		this.previousQuality = this.currentQuality;
		this.targetQuality = targetQuality;
		this.qualityTransitionStartTime = performance.now();
		this.isTransitioningQuality = true;

		// Immediately notify of transition start
		this.notifyQualitySubscribers(this.currentQuality, this.currentQualityLevel);
	}

	// Get current estimated FPS
	public getCurrentFPS(): number {
		return this.currentFPS;
	}

	// Get current quality level (0.0 - 1.0)
	public getCurrentQuality(): number {
		return this.currentQuality;
	}

	// Get current quality settings
	public getCurrentQualitySettings(): QualitySettings {
		return qualityPresets[this.currentQualityLevel];
	}

	// Force a specific quality level
	public forceQualityLevel(quality: number): void {
		const newQuality = Math.max(this.minQuality, Math.min(1.0, quality));

		if (newQuality !== this.currentQuality) {
			this.logEvent('Quality forced', { from: this.currentQuality, to: newQuality });

			// Use smooth transition
			this.transitionToQuality(newQuality);

			// Update quality level enum
			this.currentQualityLevel = this.getQualityLevelForFactor(newQuality);

			// Update metrics
			this.updatePerformanceMetrics();
		}
	}

	// Force a specific quality preset
	public forceQualityPreset(level: QualityLevel): void {
		const preset = qualityPresets[level];
		this.currentQualityLevel = level;

		this.logEvent('Quality preset forced', { level });
		this.transitionToQuality(preset.qualityFactor);
		this.updatePerformanceMetrics();
	}

	// Get current performance trend
	public getPerformanceTrend(): 'improving' | 'stable' | 'degrading' {
		return this.performanceTrend;
	}

	// Export performance data for analysis
	public exportPerformanceData(): any {
		return {
			fps: this.currentFPS,
			quality: this.currentQuality,
			qualityLevel: this.currentQualityLevel,
			fpsHistory: [...this.fpsHistory],
			memoryUsage: this.memoryUsage,
			trend: this.performanceTrend,
			deviceTier: this.deviceTier,
			eventLog: [...this.eventLog]
		};
	}

	// Cleanup resources
	public cleanup() {
		this.stopMonitoring();
		this.qualitySubscribers = [];

		if (this.memoryMonitorInterval) {
			clearInterval(this.memoryMonitorInterval);
			this.memoryMonitorInterval = null;
		}

		this.logEvent('Resources cleaned up');

		// Clear arrays to free memory
		this.frameDurations = [];
		this.frameTimestamps = [];
		this.fpsHistory = [];
		this.eventLog = [];
	}
}

// Singleton instance
export const frameRateController = new FrameRateController();

// Helper function to get quality preset settings
export function getQualityPreset(level: QualityLevel): QualitySettings {
	return qualityPresets[level];
}

// Debug function to inspect the frame rate controller
export function debugFrameRateController(enable: boolean = true): void {
	frameRateController.setDebugMode(enable);

	if (enable && browser) {
		// Expose controller to window for console debugging
		// @ts-ignore
		window.__frameRateController = frameRateController;
		console.log(
			'Frame rate controller debug mode enabled. Access via window.__frameRateController'
		);
	}
}

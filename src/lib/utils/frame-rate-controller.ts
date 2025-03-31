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

	constructor() {
		if (browser) {
			this.setupMonitoring();
		}
	}

	private setupMonitoring() {
		if (this.isMonitoring) return;
		this.isMonitoring = true;

		const monitorLoop = () => {
			const now = performance.now();

			// Process timestamps to calculate FPS
			this.lastFrameTimestamps.push(now);
			if (this.lastFrameTimestamps.length > 60) {
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

				// Adjust quality if needed (every second)
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

	// Adjust quality based on measured FPS
	private adjustQuality() {
		if (!this.adaptiveEnabled) return;

		// Calculate new quality level based on FPS
		let newQuality = this.currentQuality;

		if (this.currentFPS < this.targetFPS * 0.5) {
			// Severe performance issues - reduce quality significantly
			newQuality = Math.max(0.3, this.currentQuality - 0.2);
		} else if (this.currentFPS < this.targetFPS * 0.75) {
			// Moderate performance issues - reduce quality slightly
			newQuality = Math.max(0.5, this.currentQuality - 0.1);
		} else if (this.currentFPS > this.targetFPS * 0.95 && this.currentQuality < 1.0) {
			// Good performance - gradually restore quality
			newQuality = Math.min(1.0, this.currentQuality + 0.05);
		}

		// Only notify if quality changed significantly
		if (Math.abs(newQuality - this.currentQuality) > 0.05) {
			this.currentQuality = newQuality;
			this.notifyQualitySubscribers(newQuality);
		}
	}

	// Check if we should render this frame based on adaptive frame skipping
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

	// Cleanup resources
	public cleanup() {
		this.stopMonitoring();
		this.qualitySubscribers = [];
	}
}

// Singleton instance
export const frameRateController = new FrameRateController();

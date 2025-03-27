// src/lib/utils/frame-rate-controller.ts
import { browser } from '$app/environment';
import { writable, derived } from 'svelte/store';
import { animationMode, type AnimationMode } from './animation-mode';

interface FrameRateOptions {
	targetFps: number;
	minFps: number;
	measurementInterval: number;
	adaptationRate: number;
}

// Frame rate controller for adaptive performance
export class FrameRateController {
	private options: FrameRateOptions;
	private frameCount = 0;
	private lastFpsUpdateTime = 0;
	private frameSkip = 0;
	private frameSkipCounter = 0;
	private running = false;
	private lastFrameTime = 0;
	private animationFrameId: number | null = null;

	// Stores for monitoring
	private currentFps = writable(0);
	private qualityLevel = writable(1.0);
	private skippingFrames = writable(false);

	constructor(options: Partial<FrameRateOptions> = {}) {
		this.options = {
			targetFps: options.targetFps || 60,
			minFps: options.minFps || 30,
			measurementInterval: options.measurementInterval || 1000,
			adaptationRate: options.adaptationRate || 0.1
		};
	}

	// Start monitoring frame rate
	start() {
		if (!browser || this.running) return;

		this.running = true;
		this.lastFpsUpdateTime = performance.now();
		this.frameCount = 0;
		this.lastFrameTime = performance.now();
		this.monitorFrameRate();
	}

	// Stop monitoring
	stop() {
		if (!browser || !this.running) return;

		this.running = false;
		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}
	}

	// Monitor frame rate and adjust quality dynamically
	private monitorFrameRate = () => {
		if (!browser || !this.running) return;

		const now = performance.now();
		this.frameCount++;

		// Calculate FPS every interval
		if (now - this.lastFpsUpdateTime >= this.options.measurementInterval) {
			const fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdateTime));
			this.currentFps.set(fps);

			// Adjust quality based on performance
			this.adjustQuality(fps);

			// Reset counters
			this.lastFpsUpdateTime = now;
			this.frameCount = 0;
		}

		this.animationFrameId = requestAnimationFrame(this.monitorFrameRate);
	};

	// Adjust quality settings based on performance
	private adjustQuality(fps: number) {
		if (fps < this.options.minFps) {
			// Performance is poor, reduce quality
			const newQuality = Math.max(0.2, this.getQuality() - this.options.adaptationRate);
			this.qualityLevel.set(newQuality);

			// Calculate frame skip based on performance
			const targetRatio = fps / this.options.targetFps;
			this.frameSkip = targetRatio < 0.5 ? 2 : targetRatio < 0.75 ? 1 : 0;
			this.skippingFrames.set(this.frameSkip > 0);
		} else if (fps > this.options.targetFps * 0.9 && this.getQuality() < 1.0) {
			// Performance is good, increase quality gradually
			const newQuality = Math.min(1.0, this.getQuality() + this.options.adaptationRate / 2);
			this.qualityLevel.set(newQuality);

			// Reduce frame skipping
			if (fps > this.options.targetFps * 0.95) {
				this.frameSkip = 0;
				this.skippingFrames.set(false);
			}
		}
	}

	// Check if the current frame should be rendered or skipped
	shouldRenderFrame() {
		if (this.frameSkip === 0) return true;

		this.frameSkipCounter = (this.frameSkipCounter + 1) % (this.frameSkip + 1);
		return this.frameSkipCounter === 0;
	}

	// Frame delta time for consistent animations regardless of frame rate
	getDeltaTime() {
		const now = performance.now();
		const delta = now - this.lastFrameTime;
		this.lastFrameTime = now;
		return delta;
	}

	// Get current quality level (0.2 to 1.0)
	getQuality() {
		let quality = 1.0;
		this.qualityLevel.subscribe((q) => {
			quality = q;
		})();
		return quality;
	}

	// Subscribe to FPS updates
	subscribeFps(callback: (fps: number) => void) {
		return this.currentFps.subscribe(callback);
	}

	// Subscribe to quality level updates
	subscribeQuality(callback: (quality: number) => void) {
		return this.qualityLevel.subscribe(callback);
	}

	// Get derived store for animation settings based on quality and mode
	getAnimationSettings() {
		return derived([this.qualityLevel, animationMode], ([$quality, $mode]) => {
			const particleCount = Math.round($quality * getBaseParticleCount($mode));
			const effectsIntensity = $quality * getBaseEffectsIntensity($mode);
			const renderShadows = $quality > 0.4;
			const renderReflections = $quality > 0.6;
			const useBlur = $quality > 0.7;

			return {
				particleCount,
				effectsIntensity,
				renderShadows,
				renderReflections,
				useBlur,
				qualityLevel: $quality,
				frameSkip: this.frameSkip
			};
		});
	}

	// Clean up resources
	destroy() {
		this.stop();
	}
}

// Helper functions for base settings by animation mode
function getBaseParticleCount(mode: AnimationMode): number {
	switch (mode) {
		case 'minimal':
			return 20;
		case 'reduced':
			return 40;
		case 'normal':
			return 60;
		default:
			return 30;
	}
}

function getBaseEffectsIntensity(mode: AnimationMode): number {
	switch (mode) {
		case 'minimal':
			return 0.3;
		case 'reduced':
			return 0.7;
		case 'normal':
			return 1.0;
		default:
			return 0.5;
	}
}

// Singleton instance for app-wide use
export const frameRateController = new FrameRateController();

// src/lib/utils/animation-controller.ts - Optimized animation utilities

import { browser } from '$app/environment';
import { frameRateController, performanceMetrics } from './frame-rate-controller';
import { deviceCapabilities } from './device-performance';
import { get } from 'svelte/store';
import gsap from 'gsap';

/**
 * Optimized animation controller for GSAP and other animations
 * Ensures animations run smoothly on all devices
 */
class AnimationController {
	private timeScaleFactor = 1.0;
	private lastQuality = 1.0;
	private isReducedMotion = false;
	private initialized = false;
	private eventListeners: (() => void)[] = [];

	constructor() {
		if (browser) {
			this.initFromDeviceCapabilities();
			this.setupQualitySubscription();
			this.setupReducedMotionListener();
		}
	}

	/**
	 * Initialize animation settings based on device capabilities
	 */
	private initFromDeviceCapabilities() {
		if (!browser) return;

		try {
			const capabilities = get(deviceCapabilities);

			// Set animation speed based on device tier
			switch (capabilities.tier) {
				case 'low':
					this.timeScaleFactor = 0.7; // Slower animations for low-end devices
					break;
				case 'medium':
					this.timeScaleFactor = 0.85; // Slightly slower for medium devices
					break;
				default:
					this.timeScaleFactor = 1.0; // Normal speed for high-end devices
			}

			// Check for reduced motion preference
			this.isReducedMotion = capabilities.motionReduction;

			// Apply global GSAP configuration
			this.applyGSAPConfig();

			this.initialized = true;
		} catch (error) {
			console.error('Error initializing animation controller:', error);
		}
	}

	/**
	 * Set up subscription to quality changes from frame rate controller
	 */
	private setupQualitySubscription() {
		if (!browser) return;

		const unsubscribe = frameRateController.subscribeQuality((quality) => {
			// Only make changes if quality changed significantly
			if (Math.abs(this.lastQuality - quality) > 0.1) {
				this.lastQuality = quality;

				// Adjust animation complexity based on quality
				this.adjustAnimationComplexity(quality);
			}
		});

		this.eventListeners.push(unsubscribe);
	}

	/**
	 * Listen for changes to reduced motion preference
	 */
	private setupReducedMotionListener() {
		if (!browser) return;

		// Listen for changes to prefers-reduced-motion
		const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

		const handleReducedMotionChange = () => {
			this.isReducedMotion = reducedMotionQuery.matches;
			this.applyGSAPConfig(); // Reconfigure GSAP
		};

		// Modern browsers
		if (reducedMotionQuery.addEventListener) {
			reducedMotionQuery.addEventListener('change', handleReducedMotionChange);

			// Add cleanup function
			this.eventListeners.push(() => {
				reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
			});
		}
		// Older browsers
		else if ('addListener' in reducedMotionQuery) {
			// @ts-ignore - older browser support
			reducedMotionQuery.addListener(handleReducedMotionChange);

			// Add cleanup function
			this.eventListeners.push(() => {
				// @ts-ignore - older browser support
				reducedMotionQuery.removeListener(handleReducedMotionChange);
			});
		}
	}

	/**
	 * Apply global GSAP configuration based on device capabilities and preferences
	 */
	private applyGSAPConfig() {
		if (!browser || !gsap) return;

		// Set global time scale for all GSAP animations
		gsap.globalTimeline.timeScale(this.getEffectiveTimeScale());

		// Configure GSAP ticker to use requestAnimationFrame
		// and respect frame rate controller's frame skipping
		gsap.ticker.lagSmoothing(0); // Disable built-in lag smoothing

		// On low-end devices, further optimize ticker
		const capabilities = get(deviceCapabilities);
		if (capabilities.tier === 'low' || capabilities.batteryOptimization) {
			gsap.ticker.sleep(); // Pause default ticker

			// Create custom ticker that respects frame rate controller
			const customTick = () => {
				if (frameRateController.shouldRenderFrame()) {
					gsap.ticker.tick();
				}
				requestAnimationFrame(customTick);
			};

			requestAnimationFrame(customTick);
		}
	}

	/**
	 * Calculate effective time scale based on quality and user preferences
	 */
	private getEffectiveTimeScale(): number {
		// Start with base time scale for device tier
		let effectiveTimeScale = this.timeScaleFactor;

		// Reduce for lower quality levels
		if (this.lastQuality < 0.5) {
			effectiveTimeScale *= 0.7; // Slow down animations at low quality
		} else if (this.lastQuality < 0.8) {
			effectiveTimeScale *= 0.85; // Slightly slow animations at medium quality
		}

		// Honor reduced motion preference
		if (this.isReducedMotion) {
			effectiveTimeScale *= 0.5; // Further reduce animation speed
		}

		return effectiveTimeScale;
	}

	/**
	 * Adjust animation complexity based on current quality level
	 */
	private adjustAnimationComplexity(quality: number) {
		if (!browser || !gsap) return;

		// Update global time scale
		gsap.globalTimeline.timeScale(this.getEffectiveTimeScale());

		// Could implement more complex adaptations here
		// such as dynamically changing easing functions or skipping animations
	}

	/**
	 * Create an optimized GSAP timeline
	 * This is a wrapper around gsap.timeline with performance optimizations
	 */
	public createTimeline(vars?: gsap.TimelineVars): gsap.core.Timeline {
		if (!browser || !gsap) {
			// Return dummy timeline for SSR
			return {} as gsap.core.Timeline;
		}

		// Get current device capabilities and quality
		const capabilities = get(deviceCapabilities);
		const quality = this.lastQuality;

		// Prepare optimized vars
		const optimizedVars: gsap.TimelineVars = {
			...vars,
			paused: true // Start paused so we can optimize before playing
		};

		// Create timeline
		const timeline = gsap.timeline(optimizedVars);

		// Apply adaptive animation simplification for low-end devices
		if (capabilities.tier === 'low' || quality < 0.4) {
			// Replace complex eases with simpler ones
			timeline.eventCallback('onStart', () => {
				// Find and simplify all tweens in the timeline
				const allTweens = timeline.getChildren(false, true, true);
				allTweens.forEach((tween) => {
					// @ts-ignore - accessing internal GSAP properties
					if (tween.vars && tween.vars.ease) {
						// Simplify easing function for low-power devices
						// @ts-ignore - dynamically setting ease
						tween.vars.ease = 'power1.out';
					}

					// Simplify other properties as needed
				});
			});
		}

		// Helper to play the timeline with frame rate controller integration
		const optimizedPlay = () => {
			// Ensure we only play when frame rate controller allows
			if (frameRateController.shouldRenderFrame()) {
				timeline.play();
			} else {
				// Try again on next frame
				requestAnimationFrame(optimizedPlay);
			}
		};

		// Override play method with optimized version
		const originalPlay = timeline.play;
		timeline.play = function (from?: any, suppressEvents?: boolean) {
			if (frameRateController.shouldRenderFrame()) {
				return originalPlay.call(this, from, suppressEvents);
			} else {
				requestAnimationFrame(() => originalPlay.call(this, from, suppressEvents));
				return this;
			}
		};

		return timeline;
	}

	/**
	 * Create an optimized tween
	 * This is a wrapper around gsap.to with performance optimizations
	 */
	public createTween(target: gsap.TweenTarget, vars: gsap.TweenVars): gsap.core.Tween {
		if (!browser || !gsap) {
			// Return dummy tween for SSR
			return {} as gsap.core.Tween;
		}

		// Get current device capabilities and quality
		const capabilities = get(deviceCapabilities);
		const quality = this.lastQuality;

		// Optimize duration and easing based on device capabilities
		let optimizedVars = { ...vars };

		// Adjust animation duration based on quality
		if (vars.duration) {
			const durationFactor = this.getEffectiveTimeScale();
			optimizedVars.duration = (vars.duration as number) / durationFactor;
		}

		// Simplify easing for low-end devices
		if ((capabilities.tier === 'low' || quality < 0.4) && vars.ease) {
			// Use simpler easing functions on low-end devices
			optimizedVars.ease = 'power1.out';
		}

		// Create tween with optimized settings
		return gsap.to(target, optimizedVars);
	}

	/**
	 * Animate with conditional execution based on quality level
	 * This allows selectively executing animations only when quality is sufficient
	 */
	public conditionalAnimate(
		qualityThreshold: number,
		animationFn: () => void,
		fallbackFn?: () => void
	): void {
		if (!browser) return;

		if (this.lastQuality >= qualityThreshold) {
			// Quality is sufficient - execute animation
			animationFn();
		} else if (fallbackFn) {
			// Quality is too low - execute fallback animation if provided
			fallbackFn();
		}
	}

	/**
	 * Clean up all event listeners
	 */
	public cleanup(): void {
		for (const removeListener of this.eventListeners) {
			removeListener();
		}

		this.eventListeners = [];
	}
}

// Singleton instance
export const animationController = new AnimationController();

// Convenience wrapper for GSAP timelines
export function createOptimizedTimeline(vars?: gsap.TimelineVars): gsap.core.Timeline {
	return animationController.createTimeline(vars);
}

// Convenience wrapper for GSAP tweens
export function createOptimizedTween(
	target: gsap.TweenTarget,
	vars: gsap.TweenVars
): gsap.core.Tween {
	return animationController.createTween(target, vars);
}

// Example usage in a Svelte component:
/*
<script>
  import { onMount } from 'svelte';
  import { createOptimizedTimeline, animationController } from '$lib/utils/animation-controller';

  let element;
  let timeline;

  onMount(() => {
    // Create optimized timeline
    timeline = createOptimizedTimeline();

    // Add animations with quality-based conditions
    animationController.conditionalAnimate(
      0.7, // Only run when quality is 70% or higher
      () => {
        // Complex animation for high-quality mode
        timeline.to(element, {
          rotation: 360,
          scale: 1.2,
          opacity: 0.8,
          duration: 1.5,
          ease: 'elastic.out(1, 0.3)'
        });
      },
      () => {
        // Simple fallback animation for low-quality mode
        timeline.to(element, {
          rotation: 360,
          duration: 1,
          ease: 'power1.out'
        });
      }
    );

    // Play the timeline
    timeline.play();

    return () => {
      // Clean up
      if (timeline) timeline.kill();
    };
  });
</script>

<div bind:this={element}>
  Animated Element
</div>
*/

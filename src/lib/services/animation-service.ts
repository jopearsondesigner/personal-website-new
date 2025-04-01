// src/lib/services/animation-service.ts
import { browser } from '$app/environment';
import { get } from 'svelte/store';
import { animationMode, type AnimationMode } from '$lib/utils/animation-mode';
import { deviceCapabilities } from '$lib/utils/device-performance';
import {
	createOptimizedTimeline,
	createOptimizedTween,
	animationController
} from '$lib/utils/animation-controller';
import { frameRateController } from '$lib/utils/frame-rate-controller';

// Enhanced animation service using performance infrastructure
class AnimationService {
	private timelines: Map<string, any> = new Map();
	private isInitialized: boolean = false;

	constructor() {
		if (browser) {
			this.init();
		}
	}

	init() {
		if (this.isInitialized || !browser) return;
		this.isInitialized = true;
	}

	createTimeline(id: string, config: any = {}) {
		if (!browser) return null;

		// Clean up existing timeline
		this.killTimeline(id);

		try {
			// Create new timeline with optimized controller
			const timeline = createOptimizedTimeline({
				paused: true,
				...config
			});

			this.timelines.set(id, timeline);
			return timeline;
		} catch (error) {
			console.error('Failed to create timeline:', error);
			return null;
		}
	}

	killTimeline(id: string) {
		if (!browser) return;

		const timeline = this.timelines.get(id);
		if (timeline) {
			try {
				timeline.kill();
			} catch (error) {
				console.error('Failed to kill timeline:', error);
			}
			this.timelines.delete(id);
		}
	}

	getAnimationConfig(elementType: string): any {
		if (!browser) return { starCount: 30 };

		try {
			const mode = get(animationMode) as AnimationMode;
			const capabilities = get(deviceCapabilities);
			const quality = frameRateController.getQuality();

			// Base configs for different animation modes
			const configs: Record<AnimationMode, any> = {
				minimal: {
					header: {
						duration: 0.5,
						y: '+=1',
						repeat: 1,
						yoyo: true
					},
					starCount: 20
				},
				reduced: {
					header: {
						duration: 0.3,
						y: '+=2',
						repeat: 3,
						yoyo: true
					},
					starCount: 40
				},
				normal: {
					header: {
						duration: 0.1,
						y: '+=2',
						repeat: 3,
						yoyo: true
					},
					starCount: 60
				}
			};

			// Get base config
			let config = configs[mode] || configs.normal;

			// Further adjust based on device capabilities
			if (capabilities.tier === 'low' || quality < 0.3) {
				config = {
					...config,
					starCount: Math.min(config.starCount, 20),
					header: {
						...config.header,
						ease: 'power1.out', // Simpler easing
						duration: config.header.duration * 1.5, // Slower animations
						repeat: Math.min(config.header.repeat, 1) // Fewer repeats
					}
				};
			}

			return config;
		} catch (error) {
			console.error('Error getting animation config:', error);
			return { starCount: 30 };
		}
	}

	// New method for conditional animations
	conditionalAnimate(
		element: any,
		qualityThreshold: number,
		highQualityAnimation: any,
		lowQualityAnimation: any
	) {
		return animationController.conditionalAnimate(
			qualityThreshold,
			() => createOptimizedTween(element, highQualityAnimation),
			() => createOptimizedTween(element, lowQualityAnimation)
		);
	}

	cleanup() {
		if (!browser) return;

		this.timelines.forEach((timeline) => {
			try {
				timeline.kill();
			} catch (error) {
				console.error('Error cleaning up timeline:', error);
			}
		});

		this.timelines.clear();
		this.isInitialized = false;
	}
}

export const animationService = new AnimationService();

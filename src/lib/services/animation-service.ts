// src/lib/services/animation-service.ts
import { browser } from '$app/environment';
import { get } from 'svelte/store';
import { animationMode, type AnimationMode } from '$lib/utils/animation-mode';

// Animation configuration interface
interface AnimationConfig {
	[key: string]: any;
	starCount: number;
}

// Simple animation service
class AnimationService {
	private timelines: Map<string, any> = new Map();
	private isInitialized: boolean = false;
	private gsapInstance: any = null;

	constructor() {
		// Initialize in browser only
		if (browser) {
			this.init();
		}
	}

	init() {
		if (this.isInitialized || !browser) return;

		try {
			// Get GSAP instance and configure it
			if (typeof window !== 'undefined' && (window as any).gsap) {
				this.gsapInstance = (window as any).gsap;
				this.gsapInstance.config({
					force3D: true,
					nullTargetWarn: false
				});

				this.isInitialized = true;
			} else {
				// Wait for GSAP to load
				window.addEventListener('DOMContentLoaded', () => {
					if ((window as any).gsap) {
						this.gsapInstance = (window as any).gsap;
						this.gsapInstance.config({
							force3D: true,
							nullTargetWarn: false
						});

						this.isInitialized = true;
					}
				});
			}
		} catch (error) {
			console.error('Failed to initialize GSAP:', error);
		}
	}

	createTimeline(id: string, config: any = {}) {
		if (!browser || !this.gsapInstance) return null;

		// Clean up existing timeline
		this.killTimeline(id);

		try {
			// Create new timeline
			const timeline = this.gsapInstance.timeline({
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

	getAnimationConfig(elementType: string): AnimationConfig {
		if (!browser) return { starCount: 30 };

		try {
			const mode = get(animationMode) as AnimationMode;

			const configs: Record<AnimationMode, AnimationConfig> = {
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

			return configs[mode] || configs.normal;
		} catch (error) {
			console.error('Error getting animation config:', error);
			return { starCount: 30 };
		}
	}

	cleanup() {
		if (!browser) return;

		// Kill all timelines
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

// src/lib/utils/optimized-star-field.ts
import { browser } from '$app/environment';
import type { Writable } from 'svelte/store';

// Star interface
interface Star {
	id: string;
	style: string;
}

// Animation state store interface
interface AnimationState {
	isAnimating: boolean;
	stars: Star[];
}

export class OptimizedStarFieldManager {
	private stars: Star[] = [];
	private isRunning = false;
	private animationFrameId: number | null = null;
	private container: HTMLElement | null = null;
	private store: Writable<AnimationState> | null = null;
	private lastTime = 0;
	private updateInterval = 50; // ms between star field updates

	constructor(store: any, count = 60) {
		this.store = store;

		if (browser) {
			this.generateStars(count);
		}
	}

	setContainer(element: HTMLElement) {
		if (!browser) return;
		this.container = element;
	}

	generateStars(count: number) {
		if (!browser) return;

		const stars: Star[] = [];

		for (let i = 0; i < count; i++) {
			// Use bitwise operations for better performance
			const size = (Math.random() * 2 + 1) | 0;
			const x = Math.random() * 100;
			const y = Math.random() * 100;
			const opacity = Math.random() * 0.7 + 0.3;
			const z = Math.random() * 100;

			stars.push({
				id: `star-${i}`,
				style: `width: ${size}px; height: ${size}px; opacity: ${opacity}; left: ${x}%; top: ${y}%; transform: translateZ(${-z}px);`
			});
		}

		this.stars = stars;

		if (this.store && typeof this.store.update === 'function') {
			this.store.update((state: AnimationState) => ({ ...state, stars }));
		}
	}

	start() {
		if (!browser || this.isRunning) return;

		this.isRunning = true;
		this.lastTime = performance.now();
		this.animationFrameId = requestAnimationFrame(this.animate);
	}

	stop() {
		if (!browser) return;

		this.isRunning = false;

		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}
	}

	animate = (timestamp: number) => {
		if (!browser || !this.isRunning) return;

		const elapsed = timestamp - this.lastTime;

		// Only update stars every updateInterval ms to reduce CPU usage
		if (elapsed > this.updateInterval) {
			this.lastTime = timestamp;

			if (this.container) {
				// Use sin/cos for smooth movement
				const xOffset = Math.sin(timestamp / 4000) * 10;
				const yOffset = Math.cos(timestamp / 5000) * 5;

				// Use transform3d for hardware acceleration
				this.container.style.transform = `translate3d(${xOffset}px, ${yOffset}px, 0)`;
			}
		}

		this.animationFrameId = requestAnimationFrame(this.animate);
	};

	cleanup() {
		if (!browser) return;

		this.stop();
		this.stars = [];
		this.container = null;
	}
}

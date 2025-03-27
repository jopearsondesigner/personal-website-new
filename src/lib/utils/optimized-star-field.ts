// src/lib/utils/optimized-star-field.ts
import { browser } from '$app/environment';
import type { Writable } from 'svelte/store';
import { frameRateController } from './frame-rate-controller';

// Star interface
interface Star {
	id: string;
	x: number;
	y: number;
	z: number;
	size: number;
	opacity: number;
	style: string;
	quadrant: number; // For spatial partitioning
	isDesktop?: boolean; // Flag for desktop-specific rendering
}

// Animation state store interface
interface AnimationState {
	isAnimating: boolean;
	stars: Partial<Star>[];
}

// Simple Quadtree for spatial partitioning
class Quadrant {
	stars: Star[] = [];
	isActive: boolean = false;
	lastUpdateTime: number = 0;
}

export class OptimizedStarFieldManager {
	private stars: Star[] = [];
	private isRunning = false;
	private animationFrameId: number | null = null;
	private container: HTMLElement | null = null;
	private store: Writable<AnimationState> | null = null;
	private lastTime = 0;
	private updateInterval = 50; // ms between updates
	private quadrants: Quadrant[] = [];
	private quadrantSize = 4; // 4x4 grid
	private visibleQuadrants: Set<number> = new Set();
	private worker: Worker | null = null;
	private frameSkipCounter = 0;
	private useWorker = false;
	private useContainerParallax = true; // Container parallax flag

	constructor(store: any, count = 60, useWorker = true, useContainerParallax = true) {
		this.store = store;
		this.useWorker = useWorker && browser && 'Worker' in window;
		this.useContainerParallax = useContainerParallax; // Set container parallax flag

		// Initialize quadrants (4x4 grid = 16 quadrants)
		for (let i = 0; i < this.quadrantSize * this.quadrantSize; i++) {
			this.quadrants.push(new Quadrant());
		}

		if (browser) {
			this.initializeStars(count);
		}
	}

	setContainer(element: HTMLElement) {
		if (!browser) return;
		this.container = element;

		// Set up intersection observer to detect visible quadrants
		if ('IntersectionObserver' in window) {
			this.setupVisibilityTracking();
		}
	}

	private setupVisibilityTracking() {
		if (!this.container) return;

		// Create small divs for each quadrant to track visibility
		const containerRect = this.container.getBoundingClientRect();
		const quadWidth = containerRect.width / this.quadrantSize;
		const quadHeight = containerRect.height / this.quadrantSize;

		// Create observer
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					const quadIndex = parseInt(entry.target.getAttribute('data-quadrant') || '0');
					if (entry.isIntersecting) {
						this.visibleQuadrants.add(quadIndex);
						this.quadrants[quadIndex].isActive = true;
					} else {
						this.visibleQuadrants.delete(quadIndex);
						this.quadrants[quadIndex].isActive = false;
					}
				});
			},
			{ threshold: 0.1 }
		);

		// Create and observe tracking elements for each quadrant
		for (let y = 0; y < this.quadrantSize; y++) {
			for (let x = 0; x < this.quadrantSize; x++) {
				const quadIndex = y * this.quadrantSize + x;
				const tracker = document.createElement('div');

				tracker.style.position = 'absolute';
				tracker.style.left = `${x * quadWidth}px`;
				tracker.style.top = `${y * quadHeight}px`;
				tracker.style.width = `${quadWidth}px`;
				tracker.style.height = `${quadHeight}px`;
				tracker.style.pointerEvents = 'none';
				tracker.style.opacity = '0';
				tracker.setAttribute('data-quadrant', quadIndex.toString());

				this.container.appendChild(tracker);
				observer.observe(tracker);
			}
		}
	}

	private initializeStars(count: number) {
		if (this.useWorker) {
			this.initializeWithWorker(count);
		} else {
			this.initializeLocally(count);
		}
	}

	private initializeWithWorker(count: number) {
		try {
			// Create Web Worker for star generation
			this.worker = new Worker(new URL('../workers/animation-worker.js', import.meta.url));

			this.worker.onmessage = (e) => {
				const { type, data } = e.data;
				if (type === 'starsGenerated') {
					// Update stars in store
					this.stars = data.stars;
					this.assignStarsToQuadrants();
					this.updateStoreStars();
				} else if (type === 'starsUpdated') {
					// Update star positions from worker
					this.stars = data.stars;
					this.assignStarsToQuadrants();
					this.updateStoreStars();
				}
			};

			// Request star generation from worker
			this.worker.postMessage({
				type: 'generateStars',
				data: {
					count,
					quadrantSize: this.quadrantSize,
					isDesktop: browser && window.innerWidth >= 1024 // Pass desktop flag to worker
				}
			});
		} catch (error) {
			console.error('Web Worker creation failed:', error);
			this.useWorker = false;
			this.initializeLocally(count);
		}
	}

	private initializeLocally(count: number) {
		// Create stars locally (without worker)
		const isDesktop = browser && window.innerWidth >= 1024;
		const sizeMultiplier = isDesktop ? 2.0 : 1.5; // Larger multiplier for desktop

		this.stars = Array.from({ length: count }, (_, index) => {
			const x = Math.random() * 100;
			const y = Math.random() * 100;
			const z = Math.random() * 0.7 + 0.1;
			const size = Math.max(z * sizeMultiplier, isDesktop ? 2 : 1); // Larger minimum size on desktop
			const opacity = Math.min(1, (Math.random() * 0.5 + 0.5) * (z * 3));

			// Calculate which quadrant this star belongs to
			const quadX = Math.floor((x / 100) * this.quadrantSize);
			const quadY = Math.floor((y / 100) * this.quadrantSize);
			const quadrant = quadY * this.quadrantSize + quadX;

			return {
				id: `star-${index}`,
				x,
				y,
				z,
				size,
				opacity,
				quadrant,
				isDesktop, // Store desktop flag
				style: this.generateStarStyle(x, y, z, size, opacity)
			};
		});

		this.assignStarsToQuadrants();
		this.updateStoreStars();
	}

	private assignStarsToQuadrants() {
		// Reset quadrants
		this.quadrants.forEach((q) => (q.stars = []));

		// Assign stars to quadrants
		this.stars.forEach((star) => {
			if (star.quadrant >= 0 && star.quadrant < this.quadrants.length) {
				this.quadrants[star.quadrant].stars.push(star);
			}
		});
	}

	private updateStoreStars() {
		if (!this.store) return;

		// Only send visible stars to the store to minimize updates
		const visibleStars = this.getVisibleStars();

		this.store.update((state: AnimationState) => ({
			...state,
			stars: visibleStars.map((star) => ({
				id: star.id,
				style: star.style
			}))
		}));
	}

	private getVisibleStars(): Star[] {
		// If no visibility tracking, return all stars
		if (this.visibleQuadrants.size === 0) {
			return this.stars;
		}

		// Only include stars from visible quadrants
		const visibleStars: Star[] = [];
		this.visibleQuadrants.forEach((quadIndex) => {
			visibleStars.push(...this.quadrants[quadIndex].stars);
		});

		return visibleStars;
	}

	private generateStarStyle(
		x: number,
		y: number,
		z: number,
		size: number,
		opacity: number
	): string {
		// Enhanced style generation with better performance properties
		return `width: ${size}px; height: ${size}px; opacity: ${opacity}; left: ${x}%; top: ${y}%; transform: translateZ(${-z * 100}px);`;
	}

	start() {
		if (!browser || this.isRunning) return;

		this.isRunning = true;
		this.lastTime = performance.now();

		if (this.useWorker && this.worker) {
			// Start worker-based animation
			this.worker.postMessage({
				type: 'startAnimation',
				data: {
					updateInterval: this.updateInterval,
					isDesktop: window.innerWidth >= 1024 // Pass desktop flag to worker
				}
			});

			// Still need a frame loop to update the visible stars in the UI
			this.animationFrameId = requestAnimationFrame(this.updateVisibility);
		} else {
			// Start local animation
			this.animationFrameId = requestAnimationFrame(this.animate);
		}
	}

	private updateVisibility = () => {
		if (!this.isRunning) return;

		// Update the visible stars in the UI
		this.updateStoreStars();

		// Continue the loop
		this.animationFrameId = requestAnimationFrame(this.updateVisibility);
	};

	stop() {
		if (!browser) return;

		this.isRunning = false;

		if (this.worker) {
			this.worker.postMessage({ type: 'stopAnimation' });
		}

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

			// Check if we should skip this frame
			if (frameRateController.shouldRenderFrame()) {
				// Update star positions - only update active quadrants for efficiency
				const now = performance.now();
				this.visibleQuadrants.forEach((quadIndex) => {
					const quadrant = this.quadrants[quadIndex];

					// Further optimization: Only update each quadrant every 2-3 frames
					// based on distance from center (further = less frequent updates)
					if (now - quadrant.lastUpdateTime > this.updateInterval) {
						quadrant.lastUpdateTime = now;

						quadrant.stars.forEach((star) => {
							this.updateStar(star);
						});
					}
				});

				// If no visibility tracking is set up, update all stars
				if (this.visibleQuadrants.size === 0) {
					this.stars.forEach((star) => this.updateStar(star));
				}

				this.updateStoreStars();
			}

			// Add container movement for parallax effect only if enabled
			if (this.container && this.useContainerParallax) {
				// Use sin/cos for smooth movement but with reduced amplitude on desktop
				const isMobile = window.innerWidth < 768;
				const xAmplitude = isMobile ? 10 : 5; // Less movement on desktop
				const yAmplitude = isMobile ? 5 : 2; // Less movement on desktop

				const xOffset = Math.sin(timestamp / 4000) * xAmplitude;
				const yOffset = Math.cos(timestamp / 5000) * yAmplitude;

				// Use transform3d for hardware acceleration
				this.container.style.transform = `translate3d(${xOffset}px, ${yOffset}px, 0)`;
			}
		}

		this.animationFrameId = requestAnimationFrame(this.animate);
	};

	private updateStar(star: Star) {
		// Check if we're on desktop
		const isDesktop = star.isDesktop || (browser && window.innerWidth >= 1024);

		// Update z-position (depth)
		star.z -= 0.004;

		// Reset star if it goes too far
		if (star.z <= 0) {
			star.z = 0.8;
			star.x = Math.random() * 100;
			star.y = Math.random() * 100;

			// Recalculate quadrant
			const quadX = Math.floor((star.x / 100) * this.quadrantSize);
			const quadY = Math.floor((star.y / 100) * this.quadrantSize);
			star.quadrant = quadY * this.quadrantSize + quadX;
		}

		// Calculate visual properties with desktop-specific adjustments
		const scale = 0.2 / star.z;
		const x = (star.x - 50) * scale + 50;
		const y = (star.y - 50) * scale + 50;
		const sizeMultiplier = isDesktop ? 2.0 : 1.5; // Larger multiplier for desktop
		const size = Math.max(scale * sizeMultiplier, isDesktop ? 2 : 1); // Larger minimum size on desktop
		const opacity = Math.min(1, star.opacity * (scale * 3));

		// Update style
		star.style = this.generateStarStyle(x, y, star.z, size, opacity);
	}

	cleanup() {
		if (!browser) return;

		this.stop();

		if (this.worker) {
			this.worker.terminate();
			this.worker = null;
		}

		this.stars = [];
		this.container = null;
		this.quadrants = [];
		this.visibleQuadrants.clear();
	}
}

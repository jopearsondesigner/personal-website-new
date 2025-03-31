// NEW FILE: /src/lib/utils/canvas-star-field.ts
import { browser } from '$app/environment';
import type { Writable } from 'svelte/store';
import { frameRateController } from './frame-rate-controller';

interface Star {
	x: number;
	y: number;
	z: number;
	size: number;
	opacity: number;
}

interface AnimationState {
	isAnimating: boolean;
	canvasId: string;
}

export class CanvasStarFieldManager {
	private stars: Star[] = [];
	private isRunning = false;
	private animationFrameId: number | null = null;
	private container: HTMLElement | null = null;
	private canvas: HTMLCanvasElement | null = null;
	private ctx: CanvasRenderingContext2D | null = null;
	private store: Writable<AnimationState> | null = null;
	private lastTime = 0;
	private updateInterval = 16; // ~60fps
	private worker: Worker | null = null;
	private useWorker = false;
	private useContainerParallax = true;
	private containerWidth = 0;
	private containerHeight = 0;
	private devicePixelRatio = 1;
	private initialized = false;

	constructor(store: any, count = 60, useWorker = false, useContainerParallax = true) {
		this.store = store;
		this.useWorker = useWorker && browser && 'Worker' in window;
		this.useContainerParallax = useContainerParallax;

		if (browser) {
			this.devicePixelRatio = window.devicePixelRatio || 1;
			this.initializeStars(count);
		}
	}

	setContainer(element: HTMLElement) {
		if (!browser || this.initialized) return;

		this.container = element;
		this.setupCanvas();
		this.initialized = true;
	}

	private setupCanvas() {
		if (!this.container) return;

		// Create canvas element
		this.canvas = document.createElement('canvas');
		this.canvas.className = 'star-field-canvas';
		this.canvas.style.position = 'absolute';
		this.canvas.style.top = '0';
		this.canvas.style.left = '0';
		this.canvas.style.width = '100%';
		this.canvas.style.height = '100%';
		this.canvas.style.pointerEvents = 'none';
		this.container.appendChild(this.canvas);

		// Set up canvas context
		this.ctx = this.canvas.getContext('2d', {
			alpha: true,
			desynchronized: true, // Potentially improve performance by reducing main thread blocking
			willReadFrequently: false
		});

		// Set initial size and listen for container size changes
		this.resizeCanvas();

		// Setup minimal ResizeObserver to handle size changes efficiently
		const resizeObserver = new ResizeObserver(this.resizeCanvas.bind(this));
		resizeObserver.observe(this.container);
	}

	private resizeCanvas() {
		if (!this.canvas || !this.container || !this.ctx) return;

		// Get container dimensions
		const rect = this.container.getBoundingClientRect();
		this.containerWidth = rect.width;
		this.containerHeight = rect.height;

		// Set canvas size with pixel ratio for sharper rendering
		this.canvas.width = this.containerWidth * this.devicePixelRatio;
		this.canvas.height = this.containerHeight * this.devicePixelRatio;

		// Scale context to match device pixel ratio
		this.ctx.scale(this.devicePixelRatio, this.devicePixelRatio);
	}

	private initializeStars(count: number) {
		const isDesktop = browser && window.innerWidth >= 1024;
		const sizeMultiplier = isDesktop ? 2.0 : 1.5;

		this.stars = Array.from({ length: count }, () => {
			const x = Math.random() * 100;
			const y = Math.random() * 100;
			const z = Math.random() * 0.7 + 0.1;
			const size = Math.max(z * sizeMultiplier, isDesktop ? 2 : 1);
			const opacity = Math.min(1, (Math.random() * 0.5 + 0.5) * (z * 3));

			return { x, y, z, size, opacity };
		});
	}

	start() {
		if (!browser || this.isRunning) return;

		this.isRunning = true;
		this.lastTime = performance.now();

		// Update store state
		if (this.store) {
			this.store.update((state) => ({
				...state,
				isAnimating: true,
				canvasId: this.canvas?.id || 'star-canvas'
			}));
		}

		// Start animation loop
		this.animationFrameId = requestAnimationFrame(this.animate);
	}

	stop() {
		if (!browser || !this.isRunning) return;

		this.isRunning = false;

		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}

		// Update store state
		if (this.store) {
			this.store.update((state) => ({
				...state,
				isAnimating: false
			}));
		}
	}

	animate = (timestamp: number) => {
		if (!browser || !this.isRunning || !this.ctx || !this.canvas) return;

		const elapsed = timestamp - this.lastTime;

		// Limit updates for consistent performance
		if (elapsed > this.updateInterval) {
			this.lastTime = timestamp;

			// Only render when frameRateController allows
			if (frameRateController.shouldRenderFrame()) {
				// Clear canvas with full opacity black
				this.ctx.clearRect(0, 0, this.containerWidth, this.containerHeight);

				// Update and draw stars
				this.stars.forEach((star) => {
					this.updateStar(star);
					this.drawStar(star);
				});

				// Add container movement for parallax effect only if enabled
				if (this.container && this.useContainerParallax) {
					const isMobile = window.innerWidth < 768;
					const xAmplitude = isMobile ? 10 : 5;
					const yAmplitude = isMobile ? 5 : 2;

					const xOffset = Math.sin(timestamp / 4000) * xAmplitude;
					const yOffset = Math.cos(timestamp / 5000) * yAmplitude;

					this.container.style.transform = `translate3d(${xOffset}px, ${yOffset}px, 0)`;
				}
			}
		}

		this.animationFrameId = requestAnimationFrame(this.animate);
	};

	private updateStar(star: Star) {
		const isDesktop = browser && window.innerWidth >= 1024;

		// Update z-position (depth)
		star.z -= 0.004;

		// Reset star if it goes too far
		if (star.z <= 0) {
			star.z = 0.8;
			star.x = Math.random() * 100;
			star.y = Math.random() * 100;
		}

		// No need to update styles since we're drawing to canvas!
	}

	private drawStar(star: Star) {
		if (!this.ctx) return;

		const scale = 0.2 / star.z;
		const x = (star.x - 50) * scale + 50;
		const y = (star.y - 50) * scale + 50;

		// Convert percentage to actual pixels
		const pixelX = (x / 100) * this.containerWidth;
		const pixelY = (y / 100) * this.containerHeight;

		// Scale for desktop/mobile
		const isDesktop = browser && window.innerWidth >= 1024;
		const sizeMultiplier = isDesktop ? 2.0 : 1.5;
		const size = Math.max(scale * sizeMultiplier, isDesktop ? 2 : 1);
		const opacity = Math.min(1, star.opacity * (scale * 3));

		// Draw the star
		this.ctx.beginPath();
		this.ctx.arc(pixelX, pixelY, size / 2, 0, Math.PI * 2);
		this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
		this.ctx.fill();

		// Optional: Add glow effect for larger stars
		if (size > 1.5) {
			this.ctx.beginPath();
			this.ctx.arc(pixelX, pixelY, size, 0, Math.PI * 2);
			this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.3})`;
			this.ctx.fill();
		}
	}

	cleanup() {
		if (!browser) return;

		this.stop();

		if (this.worker) {
			this.worker.terminate();
			this.worker = null;
		}

		// Remove canvas element
		if (this.canvas && this.canvas.parentNode) {
			this.canvas.parentNode.removeChild(this.canvas);
		}

		this.canvas = null;
		this.ctx = null;
		this.container = null;
		this.stars = [];
	}
}

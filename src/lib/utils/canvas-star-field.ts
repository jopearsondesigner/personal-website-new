// File: /src/lib/utils/canvas-star-field.ts
// This is already a canvas implementation, but with additional optimizations

import { browser } from '$app/environment';
import type { Writable } from 'svelte/store';
import { frameRateController } from './frame-rate-controller';
import { deviceCapabilities, type DeviceCapabilities } from './device-performance';
import { get } from 'svelte/store';
import { createThrottledRAF } from './animation-helpers';
import { MemoryMonitor } from './memory-monitor';

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
	private wasRunning = false;
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
	private enableGlow = true;
	private visibilityHandler: (() => void) | null = null;
	private memoryMonitor: MemoryMonitor | null = null;

	constructor(store: any, count = 60, useWorker = false, useContainerParallax = true) {
		this.store = store;
		this.useWorker = useWorker && browser && 'Worker' in window;
		this.useContainerParallax = useContainerParallax;

		// Get device capabilities if available
		if (browser) {
			const capabilities = get(deviceCapabilities);
			if (capabilities) {
				// Adjust star count based on device tier
				count = capabilities.maxStars || count;
				this.updateInterval = capabilities.updateInterval || this.updateInterval;
				this.useContainerParallax = capabilities.enableParallax && useContainerParallax;
				this.enableGlow = capabilities.enableGlow;
			}

			this.devicePixelRatio = window.devicePixelRatio || 1;
			this.initializeStars(count);

			// Initialize worker if enabled
			if (this.useWorker) {
				this.initWorker();
			}

			// Setup visibility handling
			this.setupVisibilityHandler();
		}

		if (browser && 'performance' in window && 'memory' in (performance as any)) {
			this.memoryMonitor = new MemoryMonitor(
				30000, // Check every 30 seconds
				0.7, // Warning at 70%
				0.85, // Critical at 85%
				() => {
					// On warning - reduce effects
					this.enableGlow = false;
				},
				() => {
					// On critical - reduce star count and effects
					const currentCount = this.stars.length;
					this.setStarCount(Math.floor(currentCount * 0.6)); // Reduce by 40%
					this.enableGlow = false;
					this.useContainerParallax = false;

					// Suggest garbage collection
					this.memoryMonitor?.suggestGarbageCollection();
				}
			);

			this.memoryMonitor.start();
		}
	}

	setContainer(element: HTMLElement) {
		if (!browser) return;

		this.container = element;

		// Check if we already have a canvas in this container
		const existingCanvas = element.querySelector('.star-field-canvas');
		if (existingCanvas) {
			// Reuse the existing canvas if possible
			this.canvas = existingCanvas as HTMLCanvasElement;
			this.ctx = this.canvas.getContext('2d', {
				alpha: true,
				desynchronized: true,
				willReadFrequently: false
			});
		} else {
			// Create a new canvas if needed
			this.setupCanvas();
		}

		// Always resize the canvas to match current container dimensions
		this.resizeCanvas();

		// Mark as initialized
		this.initialized = true;

		// Apply iOS Safari optimizations
		this.applyIOSSafariOptimizations();

		// Adapt to device capabilities
		const capabilities = get(deviceCapabilities);
		if (capabilities) {
			this.adaptToDeviceCapabilities(capabilities);
		}
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

	private initWorker() {
		if (!browser || !this.useWorker || !window.Worker) return;

		try {
			this.worker = new Worker(new URL('../workers/star-field-worker.ts', import.meta.url));

			this.worker.onmessage = (event) => {
				const { type, data } = event.data;

				if (type === 'starsUpdated') {
					this.stars = data;
				}
			};
		} catch (error) {
			console.error('Failed to initialize star field worker:', error);
			this.worker = null;
			this.useWorker = false;
		}
	}

	private updateStarsWithWorker() {
		if (!this.worker) return;

		const isDesktop = browser && window.innerWidth >= 1024;

		this.worker.postMessage({
			type: 'updateStars',
			data: {
				stars: this.stars,
				isDesktop
			}
		});
	}

	private setupVisibilityHandler() {
		if (!browser) return;

		this.visibilityHandler = () => {
			if (document.hidden) {
				// Pause animation when tab is not visible
				this.pause();
			} else {
				// Resume animation when tab is visible again
				this.resume();
			}
		};

		document.addEventListener('visibilitychange', this.visibilityHandler);
	}

	private applyIOSSafariOptimizations() {
		if (!browser) return;

		const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
		const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

		if (isIOS && isSafari) {
			// Reduce update frequency
			this.updateInterval = 32; // ~30fps

			// Use simpler star rendering
			this.enableGlow = false;

			// Disable parallax to prevent scrolling issues
			this.useContainerParallax = false;

			// Add CSS overscroll fix for iOS Safari
			if (this.container) {
				this.container.style.WebkitOverflowScrolling = 'touch';
			}
		}
	}

	adaptToDeviceCapabilities(capabilities: DeviceCapabilities) {
		if (!browser) return;

		// Adjust star count
		const newStarCount = capabilities.maxStars;
		if (newStarCount !== this.stars.length) {
			this.initializeStars(newStarCount);
		}

		// Adjust update interval
		this.updateInterval = capabilities.updateInterval;

		// Adjust parallax effect
		this.useContainerParallax = capabilities.enableParallax && this.useContainerParallax;

		// Adjust glow effect for stars
		this.enableGlow = capabilities.enableGlow;

		// If device has battery issues, reduce effects
		if (capabilities.hasBatteryIssues) {
			this.useContainerParallax = false;
			this.enableGlow = false;
		}

		// iOS specific optimizations
		if (capabilities.isIOS) {
			this.useContainerParallax = capabilities.optimizeForIOSSafari
				? false
				: this.useContainerParallax;
		}
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

		// Use throttled RAF for iOS Safari
		const isIOS = browser && /iPad|iPhone|iPod/.test(navigator.userAgent);
		const isSafari =
			browser && /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

		if (isIOS && isSafari) {
			// Use throttled RAF with 30ms (~ 30fps) for iOS Safari
			const throttledRAF = createThrottledRAF(30);
			this.animationFrameId = throttledRAF(this.animate);
		} else {
			// Start normal animation loop
			this.animationFrameId = requestAnimationFrame(this.animate);
		}
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

	pause() {
		if (!this.isRunning) return;

		this.wasRunning = true;
		this.stop();
	}

	resume() {
		if (!this.wasRunning) return;

		this.wasRunning = false;
		this.start();
	}

	setStarCount(count: number) {
		if (!browser || count === this.stars.length) return;

		this.initializeStars(count);
	}

	setUseWorker(useWorker: boolean) {
		if (this.useWorker === useWorker) return;

		this.useWorker = useWorker && browser && 'Worker' in window;

		if (this.useWorker && !this.worker) {
			this.initWorker();
		} else if (!this.useWorker && this.worker) {
			this.worker.terminate();
			this.worker = null;
		}
	}

	setUseContainerParallax(useParallax: boolean) {
		this.useContainerParallax = useParallax;
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

				// Update stars either with worker or directly
				if (this.useWorker && this.worker) {
					this.updateStarsWithWorker();
				} else {
					// Update stars directly on main thread
					this.stars.forEach((star) => this.updateStar(star));
				}

				// Begin path once for all stars of similar size (batching)
				const smallStars: Star[] = [];
				const mediumStars: Star[] = [];
				const largeStars: Star[] = [];

				// Group stars by size for batched rendering
				this.stars.forEach((star) => {
					const scale = 0.2 / star.z;
					const size = Math.max(
						scale * (browser && window.innerWidth >= 1024 ? 2.0 : 1.5),
						browser && window.innerWidth >= 1024 ? 2 : 1
					);

					if (size <= 1.5) smallStars.push(star);
					else if (size <= 2.5) mediumStars.push(star);
					else largeStars.push(star);
				});

				// Draw small stars in one batch
				if (smallStars.length > 0) {
					this.ctx.beginPath();
					smallStars.forEach((star) => {
						const scale = 0.2 / star.z;
						const x = (star.x - 50) * scale + 50;
						const y = (star.y - 50) * scale + 50;
						const pixelX = (x / 100) * this.containerWidth;
						const pixelY = (y / 100) * this.containerHeight;
						this.ctx.moveTo(pixelX, pixelY);
						this.ctx.arc(pixelX, pixelY, 0.75, 0, Math.PI * 2);
					});
					this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
					this.ctx.fill();
				}

				// Draw medium stars
				if (mediumStars.length > 0) {
					this.ctx.beginPath();
					mediumStars.forEach((star) => {
						const scale = 0.2 / star.z;
						const x = (star.x - 50) * scale + 50;
						const y = (star.y - 50) * scale + 50;
						const pixelX = (x / 100) * this.containerWidth;
						const pixelY = (y / 100) * this.containerHeight;
						const opacity = Math.min(1, star.opacity * (scale * 3));
						this.ctx.moveTo(pixelX, pixelY);
						this.ctx.arc(pixelX, pixelY, 1.5, 0, Math.PI * 2);
					});
					this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
					this.ctx.fill();
				}

				// Draw large stars individually (with glow)
				largeStars.forEach((star) => {
					const scale = 0.2 / star.z;
					const x = (star.x - 50) * scale + 50;
					const y = (star.y - 50) * scale + 50;
					const pixelX = (x / 100) * this.containerWidth;
					const pixelY = (y / 100) * this.containerHeight;
					const size = Math.max(
						scale * (browser && window.innerWidth >= 1024 ? 2.0 : 1.5),
						browser && window.innerWidth >= 1024 ? 2 : 1
					);
					const opacity = Math.min(1, star.opacity * (scale * 3));

					// Draw the star
					this.ctx.beginPath();
					this.ctx.arc(pixelX, pixelY, size / 2, 0, Math.PI * 2);
					this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
					this.ctx.fill();

					// Add glow for larger stars
					if (this.enableGlow) {
						this.ctx.beginPath();
						this.ctx.arc(pixelX, pixelY, size, 0, Math.PI * 2);
						this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.3})`;
						this.ctx.fill();
					}
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
		if (this.enableGlow && size > 1.5) {
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

		// Remove event listeners
		if (this.visibilityHandler) {
			document.removeEventListener('visibilitychange', this.visibilityHandler);
			this.visibilityHandler = null;
		}

		this.canvas = null;
		this.ctx = null;
		this.container = null;
		this.stars = [];
	}
}

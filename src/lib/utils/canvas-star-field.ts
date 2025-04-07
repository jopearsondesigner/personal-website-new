// File: /src/lib/utils/canvas-star-field.ts

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
	renderedX?: number;
	renderedY?: number;
	pixelX?: number;
	pixelY?: number;
	scale?: number;
	prevX?: number;
	prevY?: number;
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
	private starCache: {
		smallStars: Star[];
		mediumStars: Star[];
		largeStars: Star[];
		needsRebatch: boolean;
	} | null = null;
	private frameTimeHistory: number[] = [];
	private frameTimeHistoryMax = 60;
	private debugMode = false;
	private fpsDisplay: HTMLElement | null = null;
	private lastFrameTime = 0;

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

			// Initialize debug display if enabled
			this.initializeDebugDisplay();
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

		// Apply Firefox optimizations
		this.applyFirefoxOptimizations();

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
			// Prevent the address bar from appearing/disappearing during scroll
			document.documentElement.style.height = '100%';
			document.body.style.height = '100%';
			document.body.style.position = 'fixed';
			document.body.style.overflow = 'hidden';

			// Use a simplified animation approach
			this.enableGlow = false;
			this.useContainerParallax = false;

			// Use a fixed small canvas size for better performance
			if (this.canvas) {
				// Reduce resolution on iOS
				const scaleFactor = 0.75 * this.devicePixelRatio;
				this.canvas.width = this.containerWidth * scaleFactor;
				this.canvas.height = this.containerHeight * scaleFactor;
				this.ctx?.scale(scaleFactor, scaleFactor);

				// Prevent touch actions that might interfere with animation
				this.canvas.style.touchAction = 'none';
			}

			// Use hardware accelerated layers
			if (this.container) {
				this.container.style.transform = 'translateZ(0)';
				this.container.style.willChange = 'transform';
				this.container.style.webkitBackfaceVisibility = 'hidden';
				this.container.style.webkitPerspective = '1000';
			}

			// Replace standard RAF with a more consistent approach for iOS
			const originalAnimate = this.animate;
			this.animate = (timestamp: number) => {
				// iOS Safari can have inconsistent RAF timing
				// Use a fixed delta time approach
				originalAnimate(timestamp);
			};

			// More aggressive optimizations for iOS Safari

			// Reduce update frequency even more
			this.updateInterval = Math.max(32, this.updateInterval); // At least 30fps

			// Reduce star count by 30%
			if (this.stars.length > 20) {
				this.setStarCount(Math.floor(this.stars.length * 0.7));
			}

			// Add CSS overscroll fix for iOS Safari
			if (this.container) {
				this.container.style.WebkitOverflowScrolling = 'touch';

				// Prevent momentum scrolling issues
				this.container.style.overscrollBehavior = 'none';
			}

			// Use a smaller canvas size on older iOS devices
			const isOlderDevice = /(iPhone [6-8]|iOS 1[0-2])/.test(navigator.userAgent);
			if (isOlderDevice && this.canvas) {
				// Reduce resolution by 25% on older devices
				const scaleFactor = 0.75 * this.devicePixelRatio;
				this.canvas.width = this.containerWidth * scaleFactor;
				this.canvas.height = this.containerHeight * scaleFactor;
				this.ctx?.scale(scaleFactor, scaleFactor);
			}
		}
	}

	private applyFirefoxOptimizations() {
		if (!browser) return;

		const isFirefox = navigator.userAgent.indexOf('Firefox') !== -1;

		if (isFirefox) {
			// Firefox performs better with fewer, larger stars
			if (this.stars.length > 40) {
				this.setStarCount(40);
			}

			// Firefox benefits from explicit hardware acceleration hints
			if (this.canvas) {
				this.canvas.style.transform = 'translateZ(0)';
				this.canvas.style.willChange = 'transform';
			}

			// Use simpler drawing operations
			this.enableGlow = false;
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

	private initializeDebugDisplay() {
		if (!browser || !this.debugMode) return;

		this.fpsDisplay = document.createElement('div');
		this.fpsDisplay.style.position = 'fixed';
		this.fpsDisplay.style.bottom = '10px';
		this.fpsDisplay.style.right = '10px';
		this.fpsDisplay.style.background = 'rgba(0,0,0,0.7)';
		this.fpsDisplay.style.color = 'white';
		this.fpsDisplay.style.padding = '5px';
		this.fpsDisplay.style.zIndex = '9999';
		document.body.appendChild(this.fpsDisplay);
	}

	start() {
		if (!browser || this.isRunning) return;

		this.isRunning = true;
		this.lastTime = performance.now();
		this.lastFrameTime = performance.now();

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

	private interpolateStarPositions(
		stars: Star[],
		alpha: number,
		containerWidthRatio: number,
		containerHeightRatio: number
	) {
		for (let i = 0; i < stars.length; i++) {
			const star = stars[i];

			if (star.prevX !== undefined && star.prevY !== undefined) {
				// Interpolate between previous and current position
				star.renderedX = star.prevX + (star.renderedX! - star.prevX) * alpha;
				star.renderedY = star.prevY + (star.renderedY! - star.prevY) * alpha;
				star.pixelX = star.renderedX * containerWidthRatio;
				star.pixelY = star.renderedY * containerHeightRatio;
			}

			// Store current position as previous for next frame
			star.prevX = star.renderedX;
			star.prevY = star.renderedY;
		}
	}

	animate = (timestamp: number) => {
		if (!browser || !this.isRunning || !this.ctx || !this.canvas) return;

		// Calculate delta time properly
		const currentTime = timestamp;
		const deltaTime = this.lastTime ? (currentTime - this.lastTime) / 1000 : 0; // Convert to seconds
		this.lastTime = currentTime;

		// Use a fixed timestep for physics
		const fixedDeltaTime = Math.min(deltaTime, 0.1); // Cap at 100ms to prevent huge jumps

		// Clear canvas with full opacity black
		this.ctx.clearRect(0, 0, this.containerWidth, this.containerHeight);

		// Add to the animate method after clearing the canvas
		// Apply a subtle motion blur effect for smoother visuals
		if (this.enableGlow && !isLowPerformanceDevice) {
			// Create a blurred effect of the previous frame
			this.ctx.globalAlpha = 0.2; // Subtle trailing effect
			this.ctx.drawImage(this.canvas, 0, 0);
			this.ctx.globalAlpha = 1.0;
		}

		// Pre-calculate values used in the loop
		const isDesktop = browser && window.innerWidth >= 1024;
		const sizeMultiplier = isDesktop ? 2.0 : 1.5;
		const containerWidthRatio = this.containerWidth / 100;
		const containerHeightRatio = this.containerHeight / 100;

		// Use frame interpolation for smoother animation
		const starSpeed = 0.004 * (60 * fixedDeltaTime); // Scale speed by time elapsed for consistent motion

		// Update stars positions with proper time-based movement
		for (let i = 0; i < this.stars.length; i++) {
			const star = this.stars[i];

			// Update z-position (depth) based on time elapsed
			star.z -= starSpeed;

			// Reset star if it goes too far
			if (star.z <= 0) {
				star.z = 0.8;
				star.x = Math.random() * 100;
				star.y = Math.random() * 100;
				// Clear cached values when position resets
				star.renderedX = undefined;
				star.renderedY = undefined;
				star.pixelX = undefined;
				star.pixelY = undefined;
				star.prevX = undefined;
				star.prevY = undefined;
			}

			// Calculate render values only once per frame
			const scale = 0.2 / star.z;
			star.renderedX = (star.x - 50) * scale + 50;
			star.renderedY = (star.y - 50) * scale + 50;
			star.pixelX = star.renderedX * containerWidthRatio;
			star.pixelY = star.renderedY * containerHeightRatio;
			star.size = Math.max(scale * sizeMultiplier, isDesktop ? 2 : 1);
			star.opacity = Math.min(1, (Math.random() * 0.5 + 0.5) * (scale * 3));
		}

		// Apply interpolation for smoother movement
		this.interpolateStarPositions(this.stars, 0.5, containerWidthRatio, containerHeightRatio);

		// Sort stars by z-index for proper layering and more efficient batching
		this.stars.sort((a, b) => a.z - b.z);

		// Use fewer draw calls by drawing stars in fewer batches
		// Small stars
		this.ctx.beginPath();
		this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';

		for (let i = 0; i < this.stars.length; i++) {
			const star = this.stars[i];
			if (star.size <= 1.5) {
				this.ctx.moveTo(star.pixelX, star.pixelY);
				this.ctx.arc(star.pixelX, star.pixelY, 0.75, 0, Math.PI * 2);
			}
		}
		this.ctx.fill();

		// Medium stars
		this.ctx.beginPath();
		this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';

		for (let i = 0; i < this.stars.length; i++) {
			const star = this.stars[i];
			if (star.size > 1.5 && star.size <= 2.5) {
				this.ctx.moveTo(star.pixelX, star.pixelY);
				this.ctx.arc(star.pixelX, star.pixelY, 1.5, 0, Math.PI * 2);
			}
		}
		this.ctx.fill();

		// Large stars
		if (this.stars.some((s) => s.size > 2.5)) {
			// Draw glow effect first if enabled
			if (this.enableGlow) {
				this.ctx.beginPath();
				this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';

				for (let i = 0; i < this.stars.length; i++) {
					const star = this.stars[i];
					if (star.size > 2.5) {
						this.ctx.moveTo(star.pixelX, star.pixelY);
						this.ctx.arc(star.pixelX, star.pixelY, star.size, 0, Math.PI * 2);
					}
				}
				this.ctx.fill();
			}

			// Draw star centers
			this.ctx.beginPath();
			this.ctx.fillStyle = 'rgba(255, 255, 255, 1)';

			for (let i = 0; i < this.stars.length; i++) {
				const star = this.stars[i];
				if (star.size > 2.5) {
					this.ctx.moveTo(star.pixelX, star.pixelY);
					this.ctx.arc(star.pixelX, star.pixelY, star.size / 2, 0, Math.PI * 2);
				}
			}
			this.ctx.fill();
		}

		// Add container movement for parallax effect only if enabled
		if (this.container && this.useContainerParallax) {
			const isMobile = window.innerWidth < 768;
			const xAmplitude = isMobile ? 10 : 5;
			const yAmplitude = isMobile ? 5 : 2;

			// Use animation time for smooth parallax
			const xOffset = Math.sin(timestamp / 4000) * xAmplitude;
			const yOffset = Math.cos(timestamp / 5000) * yAmplitude;

			// Use transform3d for hardware acceleration and add will-change for better performance
			if (!this.container.style.willChange) {
				this.container.style.willChange = 'transform';
			}

			this.container.style.transform = `translate3d(${xOffset}px, ${yOffset}px, 0)`;
		}

		// Calculate frame time variance to detect jank
		const frameTime = timestamp - this.lastFrameTime;
		this.frameTimeHistory.push(frameTime);
		if (this.frameTimeHistory.length > this.frameTimeHistoryMax) {
			this.frameTimeHistory.shift();
		}

		// Calculate frame time variance to detect jank
		if (this.frameTimeHistory.length > 10) {
			const avgFrameTime =
				this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
			const variance =
				this.frameTimeHistory.reduce((a, b) => a + Math.pow(b - avgFrameTime, 2), 0) /
				this.frameTimeHistory.length;
			const stdDev = Math.sqrt(variance);

			// High standard deviation indicates inconsistent frame times (jank)
			if (stdDev > avgFrameTime * 0.5) {
				console.warn(
					'Detected animation jank, std dev:',
					stdDev.toFixed(2),
					'avg:',
					avgFrameTime.toFixed(2)
				);
			}
		}

		// Update debug display in animation frame
		if (this.debugMode && this.fpsDisplay) {
			const fps = 1000 / frameTime;
			this.fpsDisplay.textContent = `FPS: ${fps.toFixed(1)} | Frame: ${frameTime.toFixed(1)}ms`;

			// Color-code based on performance
			if (fps < 30) {
				this.fpsDisplay.style.color = 'red';
			} else if (fps < 50) {
				this.fpsDisplay.style.color = 'yellow';
			} else {
				this.fpsDisplay.style.color = 'lime';
			}
		}

		this.lastFrameTime = timestamp;

		// Request next frame directly without frameRateController for smoother animation
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

		// Clean up debug display
		if (this.fpsDisplay && this.fpsDisplay.parentNode) {
			this.fpsDisplay.parentNode.removeChild(this.fpsDisplay);
			this.fpsDisplay = null;
		}

		this.canvas = null;
		this.ctx = null;
		this.container = null;
		this.stars = [];
	}
}

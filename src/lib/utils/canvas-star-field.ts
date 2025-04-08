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
	stars: any[];
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
	public enableGlow = true;
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
	private speed = 0.25;
	private baseSpeed = 0.25;
	private boostSpeed = 2;
	private boosting = false;
	private starColors: string[] = [
		'#0033ff', // Dim blue
		'#4477ff',
		'#6699ff',
		'#88bbff',
		'#aaddff',
		'#ffffff' // Bright white
	];
	private maxDepth = 32;

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
			desynchronized: true,
			willReadFrequently: false
		});

		// Set initial size
		this.resizeCanvas();
	}

	resizeCanvas() {
		if (!this.canvas || !this.container || !this.ctx) return;

		// Get container dimensions directly from the element
		const rect = this.container.getBoundingClientRect();
		this.containerWidth = rect.width;
		this.containerHeight = rect.height;

		// Set canvas size with pixel ratio for sharper rendering
		this.canvas.width = this.containerWidth * this.devicePixelRatio;
		this.canvas.height = this.containerHeight * this.devicePixelRatio;

		// Clear any existing transformation
		this.ctx.setTransform(1, 0, 0, 1, 0, 0);

		// Scale context to match device pixel ratio
		this.ctx.scale(this.devicePixelRatio, this.devicePixelRatio);

		// Force a redraw if animation is running
		if (this.isRunning) {
			// Use next animation frame to ensure smooth rendering
			if (this.animationFrameId === null) {
				this.animationFrameId = requestAnimationFrame(this.animate);
			}
		}
	}

	private initializeStars(count: number) {
		const isDesktop = browser && window.innerWidth >= 1024;

		this.stars = [];
		for (let i = 0; i < count; i++) {
			this.createStar();
		}
	}

	private createStar() {
		// Random position in 3D space
		const star = {
			x: Math.random() * this.containerWidth * 2 - this.containerWidth,
			y: Math.random() * this.containerHeight * 2 - this.containerHeight,
			z: Math.random() * this.maxDepth,
			size: 0,
			opacity: 0
		};

		this.stars.push(star);
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
				isDesktop,
				boosting: this.boosting,
				speed: this.speed,
				maxDepth: this.maxDepth
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

	// Get current star count
	getStarCount(): number {
		return this.stars.length;
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

	// New method to control boost mode
	setBoostMode(boost: boolean) {
		this.boosting = boost;
		this.speed = boost ? this.boostSpeed : this.baseSpeed;
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
		if (this.enableGlow) {
			// Create a blurred effect of the previous frame
			this.ctx.globalAlpha = 0.2; // Subtle trailing effect
			this.ctx.drawImage(this.canvas, 0, 0);
			this.ctx.globalAlpha = 1.0;

			// Apply a blue tint to the canvas for a space effect
			this.ctx.fillStyle = 'rgba(0, 0, 20, 0.1)';
			this.ctx.fillRect(0, 0, this.containerWidth, this.containerHeight);
		}

		// Center of the screen (our viewing point)
		const centerX = this.containerWidth / 2;
		const centerY = this.containerHeight / 2;

		// Use Worker if available
		if (this.useWorker && this.worker) {
			this.updateStarsWithWorker();
		} else {
			// Update star positions directly
			this.updateStarsDirectly(fixedDeltaTime, centerX, centerY);
		}

		// Draw stars
		this.drawStars(centerX, centerY);

		// Add container movement for parallax effect only if enabled
		this.applyParallaxEffect(timestamp);

		// Monitor performance
		this.monitorPerformance(timestamp);

		// Request next frame
		this.animationFrameId = requestAnimationFrame(this.animate);
	};

	private updateStarsDirectly(fixedDeltaTime: number, centerX: number, centerY: number) {
		// Star speed based on time elapsed for consistent motion
		const starSpeed = this.speed * (60 * fixedDeltaTime);

		// Update stars positions
		for (let i = 0; i < this.stars.length; i++) {
			const star = this.stars[i];

			// Store previous position for trails
			star.prevX = star.x;
			star.prevY = star.y;

			// Move star closer to viewer
			star.z -= starSpeed;

			// If star passed the viewer, reset it to far distance
			if (star.z <= 0) {
				star.x = Math.random() * this.containerWidth * 2 - this.containerWidth;
				star.y = Math.random() * this.containerHeight * 2 - this.containerHeight;
				star.z = this.maxDepth;
				star.prevX = star.x;
				star.prevY = star.y;
				continue;
			}
		}
	}

	private drawStars(centerX: number, centerY: number) {
		if (!this.ctx) return;

		// Sort stars by z-index for proper layering
		this.stars.sort((a, b) => a.z - b.z);

		// Use fewer draw calls by drawing stars in batches
		// Small stars
		this.ctx.beginPath();
		this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';

		// Medium stars
		const mediumStars: Star[] = [];

		// Large stars
		const largeStars: Star[] = [];
		const largeStarsWithGlow: Star[] = [];

		// Pre-sort stars into batches
		for (let i = 0; i < this.stars.length; i++) {
			const star = this.stars[i];

			// Project 3D position to 2D screen coordinates
			const scale = this.maxDepth / star.z;
			const x2d = (star.x - centerX) * scale + centerX;
			const y2d = (star.y - centerY) * scale + centerY;

			// Only process stars on screen
			if (x2d < 0 || x2d >= this.containerWidth || y2d < 0 || y2d >= this.containerHeight) {
				continue;
			}

			// Star size based on depth
			const size = (1 - star.z / this.maxDepth) * 3;

			// Store projected coordinates
			star.renderedX = x2d;
			star.renderedY = y2d;
			star.size = size;

			// Sort stars by size for batch rendering
			if (size <= 1.5) {
				// Small stars
				this.ctx.moveTo(x2d, y2d);
				this.ctx.arc(x2d, y2d, 0.75, 0, Math.PI * 2);
			} else if (size <= 2.5) {
				// Medium stars
				mediumStars.push(star);
			} else {
				// Large stars
				largeStars.push(star);
				if (this.enableGlow) {
					largeStarsWithGlow.push(star);
				}
			}
		}

		this.ctx.fill();

		// Draw medium stars
		if (mediumStars.length > 0) {
			this.ctx.beginPath();
			this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';

			for (let i = 0; i < mediumStars.length; i++) {
				const star = mediumStars[i];
				this.ctx.moveTo(star.renderedX!, star.renderedY!);
				this.ctx.arc(star.renderedX!, star.renderedY!, 1.5, 0, Math.PI * 2);
			}
			this.ctx.fill();
		}

		// Draw glow for large stars
		if (largeStarsWithGlow.length > 0 && this.enableGlow) {
			this.ctx.beginPath();
			this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';

			for (let i = 0; i < largeStarsWithGlow.length; i++) {
				const star = largeStarsWithGlow[i];
				this.ctx.moveTo(star.renderedX!, star.renderedY!);
				this.ctx.arc(star.renderedX!, star.renderedY!, star.size!, 0, Math.PI * 2);
			}
			this.ctx.fill();
		}

		// Draw large stars
		if (largeStars.length > 0) {
			this.ctx.beginPath();
			this.ctx.fillStyle = 'rgba(255, 255, 255, 1)';

			for (let i = 0; i < largeStars.length; i++) {
				const star = largeStars[i];
				this.ctx.moveTo(star.renderedX!, star.renderedY!);
				this.ctx.arc(star.renderedX!, star.renderedY!, star.size! / 2, 0, Math.PI * 2);
			}
			this.ctx.fill();
		}

		// Draw star trails when boosting
		if (this.boosting || this.speed > this.baseSpeed * 1.5) {
			this.drawStarTrails(centerX, centerY);
		}
	}

	private drawStarTrails(centerX: number, centerY: number) {
		if (!this.ctx) return;

		for (let i = 0; i < this.stars.length; i++) {
			const star = this.stars[i];

			// Skip stars that don't have previous positions or rendered positions
			if (
				star.prevX === undefined ||
				star.prevY === undefined ||
				star.renderedX === undefined ||
				star.renderedY === undefined
			) {
				continue;
			}

			// Skip offscreen stars
			if (
				star.renderedX < 0 ||
				star.renderedX >= this.containerWidth ||
				star.renderedY < 0 ||
				star.renderedY >= this.containerHeight
			) {
				continue;
			}

			// Star color based on depth (closer = brighter)
			const colorIndex = Math.floor((1 - star.z / this.maxDepth) * (this.starColors.length - 1));
			const color = this.starColors[colorIndex];

			// Calculate previous position
			const prevScale = this.maxDepth / (star.z + this.speed);
			const prevX = (star.prevX - centerX) * prevScale + centerX;
			const prevY = (star.prevY - centerY) * prevScale + centerY;

			// Draw trail
			this.ctx.beginPath();
			this.ctx.moveTo(prevX, prevY);
			this.ctx.lineTo(star.renderedX, star.renderedY);
			this.ctx.strokeStyle = color;
			this.ctx.lineWidth = star.size || 1;
			this.ctx.stroke();
		}
	}

	private applyParallaxEffect(timestamp: number) {
		if (!this.useContainerParallax || !this.container) return;

		// Apply subtle parallax effect based on container position
		// This adds depth to the star field
		const rect = this.container.getBoundingClientRect();
		const centerX = window.innerWidth / 2;
		const centerY = window.innerHeight / 2;
		const offsetX = (rect.left + rect.width / 2 - centerX) / centerX;
		const offsetY = (rect.top + rect.height / 2 - centerY) / centerY;

		// Apply subtle tilt to the star container
		this.container.style.transform = `perspective(1000px) rotateX(${offsetY * 5}deg) rotateY(${
			-offsetX * 5
		}deg)`;
	}

	private monitorPerformance(timestamp: number) {
		if (!this.debugMode || !this.fpsDisplay) return;

		// Calculate FPS
		const frameTime = timestamp - this.lastFrameTime;
		this.lastFrameTime = timestamp;

		// Add to history
		this.frameTimeHistory.push(frameTime);
		if (this.frameTimeHistory.length > this.frameTimeHistoryMax) {
			this.frameTimeHistory.shift();
		}

		// Calculate average FPS
		const averageFrameTime =
			this.frameTimeHistory.reduce((sum, time) => sum + time, 0) / this.frameTimeHistory.length;
		const fps = Math.round(1000 / averageFrameTime);

		// Update display
		if (this.fpsDisplay) {
			this.fpsDisplay.textContent = `FPS: ${fps} | Stars: ${this.stars.length}`;
		}
	}

	cleanup() {
		if (!browser) return;

		// Stop animation
		this.stop();

		// Terminate worker if exists
		if (this.worker) {
			this.worker.terminate();
			this.worker = null;
		}

		// Remove visibility handler
		if (this.visibilityHandler) {
			document.removeEventListener('visibilitychange', this.visibilityHandler);
			this.visibilityHandler = null;
		}

		// Clean up debug display
		if (this.fpsDisplay && this.fpsDisplay.parentNode) {
			this.fpsDisplay.parentNode.removeChild(this.fpsDisplay);
			this.fpsDisplay = null;
		}

		// Stop memory monitoring
		if (this.memoryMonitor) {
			this.memoryMonitor.stop();
			this.memoryMonitor = null;
		}

		// Nullify context first (important for memory cleanup)
		if (this.ctx) {
			this.ctx = null;
		}

		// Remove canvas element
		if (this.canvas && this.canvas.parentNode) {
			this.canvas.parentNode.removeChild(this.canvas);
			this.canvas = null; // Nullify after removal
		}

		// Clear all references to DOM elements
		this.container = null;

		// Clear data structures
		this.stars = [];
		this.frameTimeHistory = [];
		this.starCache = null;

		// Clear any remaining timeouts or intervals
		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}

		// Force garbage collection hint when available (optional)
		if (typeof window !== 'undefined' && (window as any).gc) {
			try {
				(window as any).gc();
			} catch (e) {
				// Ignore errors in garbage collection
			}
		}
	}
}

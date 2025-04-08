// File: /src/lib/utils/canvas-star-field.ts

import { browser } from '$app/environment';
import type { Writable } from 'svelte/store';

interface Star {
	x: number;
	y: number;
	z: number;
	prevX: number;
	prevY: number;
}

interface AnimationState {
	isAnimating: boolean;
	stars: any[];
}

export class CanvasStarFieldManager {
	private stars: Star[] = [];
	private isRunning = false;
	private isPaused = false;
	private animationFrameId: number | null = null;
	private container: HTMLElement | null = null;
	private canvas: HTMLCanvasElement | null = null;
	private ctx: CanvasRenderingContext2D | null = null;
	private store: Writable<AnimationState> | null = null;
	private lastTime = 0;
	private worker: Worker | null = null;
	private useWorker = false;
	private containerWidth = 0;
	private containerHeight = 0;
	private devicePixelRatio = 1;
	public enableGlow = true;
	private visibilityHandler: (() => void) | null = null;

	// Star field parameters - exact match to reference implementation
	private starCount = 300;
	private maxDepth = 32;
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

	constructor(store: any, count = 300, useWorker = false, useContainerParallax = false) {
		this.store = store;
		this.starCount = count;
		this.useWorker = useWorker && browser && 'Worker' in window;

		if (browser) {
			this.devicePixelRatio = window.devicePixelRatio || 1;
			this.initializeStars();

			// Initialize worker if enabled
			if (this.useWorker) {
				this.initWorker();
			}

			// Setup visibility handling
			this.setupVisibilityHandler();
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
				alpha: true
			});
		} else {
			// Create a new canvas if needed
			this.setupCanvas();
		}

		// Always resize the canvas to match current container dimensions
		this.resizeCanvas();
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
			alpha: true
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

	private initializeStars() {
		this.stars = [];
		for (let i = 0; i < this.starCount; i++) {
			this.createStar();
		}
	}

	private createStar() {
		// Random position in 3D space - exact match to reference implementation
		const star = {
			x: Math.random() * this.containerWidth * 2 - this.containerWidth,
			y: Math.random() * this.containerHeight * 2 - this.containerHeight,
			z: Math.random() * this.maxDepth,
			prevX: 0,
			prevY: 0
		};

		this.stars.push(star);
	}

	private initWorker() {
		if (!browser || !this.useWorker || !window.Worker) return;

		try {
			this.worker = new Worker(new URL('../workers/star-field-worker.ts', import.meta.url));

			this.worker.onmessage = (event) => {
				const { type, data } = event.data;

				if (type === 'frameUpdate') {
					this.stars = data.stars;
					this.speed = data.config.speed;
					this.boosting = data.config.boosting;
				} else if (type === 'initialized' || type === 'reset') {
					this.stars = data.stars;
				}
			};

			// Initialize the worker
			this.worker.postMessage({
				type: 'init',
				data: {
					config: {
						starCount: this.starCount,
						maxDepth: this.maxDepth,
						speed: this.speed,
						baseSpeed: this.baseSpeed,
						boostSpeed: this.boostSpeed,
						containerWidth: this.containerWidth,
						containerHeight: this.containerHeight
					}
				}
			});
		} catch (error) {
			console.error('Failed to initialize star field worker:', error);
			this.worker = null;
			this.useWorker = false;
		}
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

	// Get current star count
	getStarCount(): number {
		return this.stars.length;
	}

	setStarCount(count: number) {
		if (!browser || count === this.starCount) return;

		this.starCount = count;
		this.initializeStars();

		// Update worker if using one
		if (this.useWorker && this.worker) {
			this.worker.postMessage({
				type: 'updateConfig',
				data: {
					config: {
						starCount: this.starCount
					}
				}
			});

			// Request a reset to apply new star count
			this.worker.postMessage({
				type: 'reset'
			});
		}
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

	// New method to control boost mode - exactly like reference
	setBoostMode(boost: boolean) {
		this.boosting = boost;
		this.speed = boost ? this.boostSpeed : this.baseSpeed;

		// Update worker if using one
		if (this.useWorker && this.worker) {
			this.worker.postMessage({
				type: 'setBoost',
				data: {
					boosting: boost
				}
			});
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
				isAnimating: true
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

	pause() {
		if (!this.isRunning || this.isPaused) return;

		this.isPaused = true;

		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}
	}

	resume() {
		if (!this.isRunning || !this.isPaused) return;

		this.isPaused = false;
		this.lastTime = performance.now();
		this.animationFrameId = requestAnimationFrame(this.animate);
	}

	animate = (timestamp: number) => {
		if (!browser || !this.isRunning || !this.ctx || !this.canvas || this.isPaused) return;

		// Calculate delta time
		const currentTime = timestamp;
		this.lastTime = currentTime;

		// If using worker, request next frame
		if (this.useWorker && this.worker) {
			this.worker.postMessage({
				type: 'requestFrame'
			});
		} else {
			// Update star positions directly
			this.updateStars();
		}

		// Clear canvas with slight fade for motion blur - exactly like reference
		this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
		this.ctx.fillRect(0, 0, this.containerWidth, this.containerHeight);

		// Draw stars
		this.drawStars();

		// Request next frame
		this.animationFrameId = requestAnimationFrame(this.animate);
	};

	private updateStars() {
		// Center of the screen (our viewing point)
		const centerX = this.containerWidth / 2;
		const centerY = this.containerHeight / 2;

		// Update stars positions - exactly like reference implementation
		for (let i = 0; i < this.stars.length; i++) {
			const star = this.stars[i];

			// Store previous position for trails
			star.prevX = star.x;
			star.prevY = star.y;

			// Move star closer to viewer
			star.z -= this.speed;

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

		// Gradually return to base speed when not boosting - exactly like reference
		if (!this.boosting && this.speed > this.baseSpeed) {
			this.speed = Math.max(this.baseSpeed, this.speed * 0.98);
		}
	}

	private drawStars() {
		if (!this.ctx) return;

		const centerX = this.containerWidth / 2;
		const centerY = this.containerHeight / 2;

		// Draw each star
		for (let i = 0; i < this.stars.length; i++) {
			const star = this.stars[i];

			// Project 3D position to 2D screen coordinates
			const scale = this.maxDepth / star.z;
			const x2d = (star.x - centerX) * scale + centerX;
			const y2d = (star.y - centerY) * scale + centerY;

			// Only draw stars on screen
			if (x2d < 0 || x2d >= this.containerWidth || y2d < 0 || y2d >= this.containerHeight) {
				continue;
			}

			// Star size based on depth - exactly like reference
			const size = (1 - star.z / this.maxDepth) * 3;

			// Star color based on depth (closer = brighter) - exactly like reference
			const colorIndex = Math.floor((1 - star.z / this.maxDepth) * (this.starColors.length - 1));
			const color = this.starColors[colorIndex];

			// Draw star trail when moving fast - exactly like reference
			if (this.speed > this.baseSpeed * 1.5) {
				const prevScale = this.maxDepth / (star.z + this.speed);
				const prevX = (star.prevX - centerX) * prevScale + centerX;
				const prevY = (star.prevY - centerY) * prevScale + centerY;

				this.ctx.beginPath();
				this.ctx.moveTo(prevX, prevY);
				this.ctx.lineTo(x2d, y2d);
				this.ctx.strokeStyle = color;
				this.ctx.lineWidth = size;
				this.ctx.stroke();
			} else {
				// Draw star as circle - exactly like reference
				this.ctx.beginPath();
				this.ctx.arc(x2d, y2d, size, 0, Math.PI * 2);
				this.ctx.fillStyle = color;
				this.ctx.fill();
			}
		}
	}

	adaptToDeviceCapabilities(capabilities: any) {
		// This method can remain as a pass-through to maintain compatibility
		// but we'll ensure star count and other key parameters don't change

		// Keep star count at 300 to match reference
		this.starCount = 300;
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

		// Clear any remaining timeouts or intervals
		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}
	}
}

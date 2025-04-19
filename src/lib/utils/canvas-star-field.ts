// /src/lib/utils/canvas-star-field.ts

import { browser } from '$app/environment';
import type { Writable } from 'svelte/store';
import { get } from 'svelte/store';

// Constants for TypedArray structure
const STAR_DATA_ELEMENTS = 6; // x, y, z, prevX, prevY, inUse

// Interfaces for TypedArray star data
interface StarFieldConfig {
	starCount: number;
	maxDepth: number;
	speed: number;
	baseSpeed: number;
	boostSpeed: number;
	containerWidth: number;
	containerHeight: number;
}

interface AnimationState {
	isAnimating: boolean;
	starData?: Float32Array;
}

export class CanvasStarFieldManager {
	private starData: Float32Array | null = null;
	private isRunning = false;
	private isPaused = false;
	private animationFrameId: number | null = null;
	private container: HTMLElement | null = null;
	private canvas: HTMLCanvasElement | null = null;
	private ctx: CanvasRenderingContext2D | null = null;
	private store: Writable<AnimationState> | null = null;
	private lastTime = 0;
	private worker: Worker | null = null;
	private containerWidth = 0;
	private containerHeight = 0;
	private devicePixelRatio = 1;
	private dimensionsChanged = false;
	private lastWorkerUpdateTime = 0;
	private workerUpdateInterval = 50; // ms

	// Star field parameters
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

	constructor(store: any, count = 300) {
		this.store = store;
		this.starCount = count;

		if (browser) {
			this.devicePixelRatio = window.devicePixelRatio || 1;

			// Initialize the worker
			this.initWorker();
		}
	}

	private initWorker() {
		if (!browser || !window.Worker) return;

		try {
			this.worker = new Worker(new URL('../workers/star-field-worker.ts', import.meta.url));

			// Handle messages from worker
			this.worker.onmessage = (event) => {
				const { type, data } = event.data;

				switch (type) {
					case 'initialized':
					case 'reset':
					case 'frameUpdate':
					case 'starCountChanged': {
						// Store the received TypedArray
						this.starData = data.starData;

						// Update store if needed
						if (this.store) {
							this.store.update((state) => ({
								...state,
								starData: this.starData
							}));
						}

						// Immediately request next frame for frame updates
						if (type === 'frameUpdate' && this.isRunning && !this.isPaused) {
							this.requestNextFrame();
						}
						break;
					}
				}
			};

			// Initialize the worker with current configuration
			this.initializeWorker();
		} catch (error) {
			console.error('Failed to initialize optimized star field worker:', error);
			this.worker = null;
		}
	}

	private initializeWorker() {
		if (!this.worker) return;

		// Send initial configuration to worker
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
	}

	setContainer(element: HTMLElement) {
		if (!browser) return;

		this.container = element;

		// Create canvas if needed
		this.setupCanvas();

		// Get container dimensions
		const rect = this.container.getBoundingClientRect();
		this.containerWidth = rect.width;
		this.containerHeight = rect.height;

		// Resize canvas to fit container
		this.resizeCanvas();

		// Setup resize observer
		this.setupResizeObserver();
	}

	private setupCanvas() {
		if (!this.container) return;

		// Create canvas element if it doesn't exist
		if (!this.canvas) {
			this.canvas = document.createElement('canvas');
			this.canvas.className = 'star-field-canvas';
			this.canvas.style.position = 'absolute';
			this.canvas.style.top = '0';
			this.canvas.style.left = '0';
			this.canvas.style.width = '100%';
			this.canvas.style.height = '100%';
			this.canvas.style.pointerEvents = 'none';
			this.container.appendChild(this.canvas);
		}

		// Get canvas context
		this.ctx = this.canvas.getContext('2d', {
			alpha: true
		});
	}

	private resizeCanvas() {
		if (!this.canvas || !this.container || !this.ctx) return;

		// Get container dimensions
		const rect = this.container.getBoundingClientRect();
		const width = rect.width;
		const height = rect.height;

		// Only resize if dimensions actually changed
		if (width !== this.containerWidth || height !== this.containerHeight) {
			const dpr = this.devicePixelRatio;

			// Set canvas size with dpr for sharp rendering
			this.canvas.width = width * dpr;
			this.canvas.height = height * dpr;

			// Clear any existing transformation
			this.ctx.setTransform(1, 0, 0, 1, 0, 0);

			// Scale context to match device pixel ratio
			this.ctx.scale(dpr, dpr);

			// Update stored dimensions
			this.containerWidth = width;
			this.containerHeight = height;

			// Flag dimensions changed for worker updates
			this.dimensionsChanged = true;

			// Update worker dimensions
			if (this.worker) {
				this.worker.postMessage({
					type: 'setDimensions',
					data: {
						width: this.containerWidth,
						height: this.containerHeight
					}
				});
			}
		}
	}

	private setupResizeObserver() {
		if (!this.container || !browser) return;

		const resizeObserver = new ResizeObserver(() => {
			this.resizeCanvas();
		});

		resizeObserver.observe(this.container);
	}

	start() {
		if (!browser || this.isRunning) return;

		this.isRunning = true;
		this.isPaused = false;
		this.lastTime = performance.now();

		// Update store state
		if (this.store) {
			this.store.update((state) => ({
				...state,
				isAnimating: true
			}));
		}

		// Request first frame
		this.requestNextFrame();

		// Start render loop
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

	private requestNextFrame() {
		if (!this.worker || !this.isRunning || this.isPaused) return;

		const now = performance.now();

		// Only request new frame at specific intervals to avoid overwhelming the worker
		if (now - this.lastWorkerUpdateTime < this.workerUpdateInterval) return;

		this.lastWorkerUpdateTime = now;

		// Request next frame from worker, transferring the TypedArray back to it
		if (this.starData) {
			this.worker.postMessage(
				{
					type: 'requestFrame',
					data: {
						deltaTime: now - this.lastTime,
						dimensions: this.dimensionsChanged
							? {
									width: this.containerWidth,
									height: this.containerHeight
								}
							: null,
						starData: this.starData
					}
				},
				[this.starData.buffer] // Transfer ownership back to worker
			);

			// Reset dimensions changed flag
			this.dimensionsChanged = false;

			// Clear our reference since we transferred ownership
			this.starData = null;
		}
	}

	animate = (timestamp: number) => {
		if (!browser || !this.isRunning || !this.ctx || !this.canvas || this.isPaused) return;

		// Request next animation frame
		this.animationFrameId = requestAnimationFrame(this.animate);

		// Calculate delta time
		const deltaTime = timestamp - this.lastTime;
		this.lastTime = timestamp;

		// Clear canvas
		this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
		this.ctx.fillRect(0, 0, this.containerWidth, this.containerHeight);

		// Render stars if we have data
		if (this.starData) {
			this.renderStars();
		}

		// Request next frame from worker at appropriate intervals
		this.requestNextFrame();
	};

	private renderStars() {
		if (!this.ctx || !this.starData) return;

		const centerX = this.containerWidth / 2;
		const centerY = this.containerHeight / 2;

		// Group stars by color for efficient rendering
		const starsByColor = new Map<string, { x: number; y: number; size: number }[]>();

		// Process all stars from TypedArray
		for (let i = 0; i < this.starCount; i++) {
			const baseIndex = i * STAR_DATA_ELEMENTS;

			// Skip stars that are not in use
			if (this.starData[baseIndex + 5] < 0.5) continue;

			// Extract position data
			const x = this.starData[baseIndex];
			const y = this.starData[baseIndex + 1];
			const z = this.starData[baseIndex + 2];

			// Project 3D position to 2D screen coordinates
			const scale = this.maxDepth / z;
			const x2d = (x - centerX) * scale + centerX;
			const y2d = (y - centerY) * scale + centerY;

			// Skip offscreen stars
			if (x2d < 0 || x2d >= this.containerWidth || y2d < 0 || y2d >= this.containerHeight) {
				continue;
			}

			// Calculate size and color
			const size = (1 - z / this.maxDepth) * 3;
			const colorIndex = Math.floor((1 - z / this.maxDepth) * (this.starColors.length - 1));
			const color = this.starColors[colorIndex];

			// Group by color
			if (!starsByColor.has(color)) {
				starsByColor.set(color, []);
			}

			starsByColor.get(color)?.push({ x: x2d, y: y2d, size });
		}

		// Render stars by color group
		starsByColor.forEach((stars, color) => {
			this.ctx!.fillStyle = color;
			this.ctx!.beginPath();

			for (const star of stars) {
				this.ctx!.moveTo(star.x + star.size, star.y);
				this.ctx!.arc(star.x, star.y, star.size, 0, Math.PI * 2);
			}

			this.ctx!.fill();
		});
	}

	public adaptToDeviceCapabilities(capabilities: any) {
		if (!capabilities) return;

		// Adapt star count based on device tier
		if (capabilities.maxStars && capabilities.maxStars !== this.starCount) {
			this.setStarCount(capabilities.maxStars);
		}

		// Update worker with adaptive settings if available
		if (this.worker) {
			this.worker.postMessage({
				type: 'adaptToDevice',
				data: {
					useGlow: capabilities.enableGlow !== false,
					useParallax: capabilities.enableParallax !== false,
					useShadersIfAvailable: capabilities.useShadersIfAvailable !== false
				}
			});
		}
	}

	setStarCount(count: number) {
		if (count === this.starCount || !this.worker) return;

		this.starCount = count;

		// Update worker configuration
		this.worker.postMessage({
			type: 'updateConfig',
			data: {
				config: {
					starCount: count
				}
			}
		});
	}

	setBoostMode(boost: boolean) {
		if (!this.worker) return;

		this.boosting = boost;

		// Update worker
		this.worker.postMessage({
			type: 'setBoost',
			data: {
				boosting: boost
			}
		});
	}

	resetStars() {
		if (!this.worker) return;

		// Request reset from worker
		this.worker.postMessage({
			type: 'reset'
		});
	}

	// Proper cleanup to prevent memory leaks
	cleanup() {
		// Stop animation
		this.stop();

		// Terminate worker
		if (this.worker) {
			this.worker.terminate();
			this.worker = null;
		}

		// Remove canvas
		if (this.canvas && this.canvas.parentNode) {
			this.canvas.parentNode.removeChild(this.canvas);
		}

		// Clear references
		this.canvas = null;
		this.ctx = null;
		this.container = null;
		this.starData = null;
	}
}

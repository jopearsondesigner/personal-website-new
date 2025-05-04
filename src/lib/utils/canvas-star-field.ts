// /src/lib/utils/canvas-star-field.ts

import { browser } from '$app/environment';
import type { Writable } from 'svelte/store';
import { get } from 'svelte/store';
import { starPoolBridge } from './star-pool-bridge';
import { StarRenderer, RENDER_MODE } from './star-renderer';
import type { RenderedStar } from './star-renderer';

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
	starData?: Float32Array | null;
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
	private useWorker = true;

	// Added for optimizations
	private offscreenCanvas: HTMLCanvasElement | null = null;
	private offscreenCtx: CanvasRenderingContext2D | null = null;
	private resizeObserver: ResizeObserver | null = null;
	private changedStarIndices: number[] = [];
	private requestFrameFn: (callback: FrameRequestCallback) => number = requestAnimationFrame;
	private cancelFrameFn: (handle: number) => void = cancelAnimationFrame;

	// Added for worker communication optimization
	private frameRequestTimer: number | null = null;
	private workerRequestInterval = 16.7; // Target 60fps

	// Star field parameters
	private starCount = 300;
	private maxDepth = 32;
	private speed = 0.25;
	private baseSpeed = 0.25;
	private boostSpeed = 2;
	private boosting = false;

	// VISUAL FIX 1: Restored exact star colors from reference
	private starColors: string[] = [
		'#0033ff', // Dim blue
		'#4477ff',
		'#6699ff',
		'#88bbff',
		'#aaddff',
		'#ffffff' // Bright white
	];

	private useContainerParallax = false;
	private starRenderer: StarRenderer | null = null;
	private cleanupInProgress = false;
	private renderCallback: (() => void) | null = null;

	constructor(store: any, count = 300) {
		this.store = store;
		this.starCount = count;

		if (browser) {
			this.devicePixelRatio = window.devicePixelRatio || 1;

			// Initialize the worker
			this.initWorker();

			// Setup animation frame provider
			this.setupAnimationFrameProvider();
		}
	}

	/**
	 * Optimization: Use Animation Frame Provider for consistent timing
	 * Benefit: More consistent frame timing aligned with monitor refresh rate
	 */
	private setupAnimationFrameProvider() {
		if (!browser) return;

		// Try to use RequestPostAnimationFrame if available for more consistent timing
		if ('requestPostAnimationFrame' in window) {
			this.requestFrameFn = (window as any).requestPostAnimationFrame.bind(window);
			this.cancelFrameFn = (window as any).cancelPostAnimationFrame.bind(window);
		} else {
			this.requestFrameFn = window.requestAnimationFrame.bind(window);
			this.cancelFrameFn = window.cancelAnimationFrame.bind(window);
		}
	}

	public setBaseSpeed(speed: number): void {
		if (speed > 0) {
			this.baseSpeed = speed;

			// Update the worker if it exists
			if (this.worker) {
				this.worker.postMessage({
					type: 'updateConfig',
					data: {
						config: {
							baseSpeed: speed
						}
					}
				});
			}
		}
	}

	public setBoostSpeed(speed: number): void {
		if (speed > 0) {
			this.boostSpeed = speed;

			// Update the worker if it exists
			if (this.worker) {
				this.worker.postMessage({
					type: 'updateConfig',
					data: {
						config: {
							boostSpeed: speed
						}
					}
				});
			}
		}
	}

	/**
	 * Enhanced worker initialization with better error handling
	 */
	private initWorker() {
		if (!browser || !window.Worker) return;

		try {
			// Create worker with { type: 'module' } to support ES modules
			this.worker = new Worker(new URL('../workers/star-field-worker.ts', import.meta.url), {
				type: 'module'
			});

			// Connect the worker to the bridge for statistics tracking
			starPoolBridge.connectWorker(this.worker);

			// Setup enhanced message handler
			this.setupWorkerMessageHandler();

			// Initialize the worker with current configuration
			this.initializeWorker();
		} catch (error) {
			console.error('Failed to initialize optimized star field worker:', error);
			this.worker = null;
		}
	}

	/**
	 * Enhanced handler for worker messages with support for batched and partial updates
	 */
	private setupWorkerMessageHandler() {
		if (!this.worker) return;

		this.worker.onmessage = (event) => {
			const { type, data } = event.data;

			// Handle batched messages
			if (type === 'batchedMessages') {
				// Process each message in the batch
				data.forEach((msg: { type: string; data: any }) => {
					this.handleWorkerMessage(msg.type, msg.data);
				});
				return;
			}

			// Handle individual messages
			this.handleWorkerMessage(type, data);
		};
	}

	/**
	 * Process individual worker messages
	 */
	private handleWorkerMessage(type: string, data: any) {
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

				// Update pool statistics
				if (data.config) {
					// Update active object count (all stars are active in initialized state)
					starPoolBridge.updateActiveCount(data.config.starCount, data.config.starCount);
				}

				// Schedule next frame for continuous animation
				if (type === 'frameUpdate' && this.isRunning && !this.isPaused) {
					this.scheduleNextFrameRequest();
				}
				break;
			}

			case 'partialFrameUpdate': {
				// Handle partial updates - apply only the changed stars
				if (data.changedIndices && data.changedStarData && this.starData) {
					this.applyPartialUpdate(data.changedIndices, data.changedStarData);
				}

				// Update config if provided
				if (data.config) {
					this.updateConfigFromWorker(data.config);
				}

				// Schedule next frame
				if (this.isRunning && !this.isPaused) {
					this.scheduleNextFrameRequest();
				}
				break;
			}

			case 'noChanges': {
				// Handle the case where no stars changed
				if (data.config) {
					this.updateConfigFromWorker(data.config);
				}

				// Schedule next frame
				if (this.isRunning && !this.isPaused) {
					this.scheduleNextFrameRequest();
				}
				break;
			}

			case 'statsUpdate': {
				// Forward stats to the bridge
				if (data && (data.created > 0 || data.reused > 0)) {
					if (data.created) starPoolBridge.recordCreated(data.created);
					if (data.reused) starPoolBridge.recordReused(data.reused);
				}
				break;
			}

			case 'poolStatsUpdated': {
				// Force sync of stats to ensure UI updates
				starPoolBridge.forceSyncStats();
				break;
			}

			case 'cleanupComplete': {
				// Handle worker cleanup completion
				console.log('Worker cleanup completed successfully');

				// Proceed with termination if needed
				if (this.worker && this.cleanupInProgress) {
					this.worker.terminate();
					this.worker = null;
				}
				break;
			}

			case 'optimizationsUpdated': {
				// Log optimization changes
				console.log('Worker optimizations updated:', data.currentFlags);
				break;
			}
		}
	}

	/**
	 * Apply partial updates to the star data
	 */
	private applyPartialUpdate(indices: number[], partialData: Float32Array): void {
		if (!this.starData) return;

		for (let i = 0; i < indices.length; i++) {
			const starIndex = indices[i];
			const sourceBaseIndex = i * STAR_DATA_ELEMENTS;
			const destBaseIndex = starIndex * STAR_DATA_ELEMENTS;

			// Copy all elements for this star
			for (let j = 0; j < STAR_DATA_ELEMENTS; j++) {
				this.starData[destBaseIndex + j] = partialData[sourceBaseIndex + j];
			}
		}
	}

	/**
	 * Update local config from worker config
	 */
	private updateConfigFromWorker(workerConfig: StarFieldConfig): void {
		// Only update values that we care about on the main thread
		if (workerConfig.speed !== undefined) this.speed = workerConfig.speed;
		if (workerConfig.baseSpeed !== undefined) this.baseSpeed = workerConfig.baseSpeed;
		if (workerConfig.boostSpeed !== undefined) this.boostSpeed = workerConfig.boostSpeed;
	}

	/**
	 * Use a timer to batch frame requests to the worker
	 */
	private scheduleNextFrameRequest(): void {
		// Cancel existing timer if any
		if (this.frameRequestTimer !== null) {
			clearTimeout(this.frameRequestTimer);
		}

		const now = performance.now();
		const timeSinceLastRequest = now - this.lastWorkerUpdateTime;

		// Determine when to send the next request
		let delay = 0;
		if (timeSinceLastRequest < this.workerRequestInterval) {
			// Wait until we reach our target interval
			delay = this.workerRequestInterval - timeSinceLastRequest;
		}

		// Schedule the next request
		this.frameRequestTimer = setTimeout(() => {
			this.frameRequestTimer = null;
			this.lastWorkerUpdateTime = performance.now();
			this.requestNextFrame();
		}, delay) as unknown as number;
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

	/**
	 * Dynamically adjust worker communication frequency based on device performance
	 */
	public setWorkerUpdateInterval(interval: number): void {
		if (interval >= 8 && interval <= 100) {
			// Sanity check (8ms-100ms)
			this.workerRequestInterval = interval;
		}
	}

	/**
	 * Configure worker optimization flags
	 */
	public configureWorkerOptimizations(options: {
		batching?: boolean;
		partialUpdates?: boolean;
		deltaCompression?: boolean;
		transferableObjects?: boolean;
	}): void {
		if (!this.worker) return;

		this.worker.postMessage({
			type: 'toggleOptimizations',
			data: options
		});
	}

	/**
	 * Adaptive worker strategy that adjusts based on device performance
	 */
	public adaptWorkerStrategy(devicePerformance: {
		tier: number; // 1=low, 2=medium, 3=high
		fps: number;
		memoryUsage: number;
	}): void {
		if (!this.worker) return;

		// Adjust worker communication frequency
		if (devicePerformance.tier === 1) {
			// Low-end device - reduce update frequency
			this.workerRequestInterval = 33.3; // Target 30fps

			// Reduce data transfer with aggressive partial updates
			this.configureWorkerOptimizations({
				partialUpdates: true,
				deltaCompression: true,
				transferableObjects: true
			});
		} else if (devicePerformance.tier === 2) {
			// Mid-tier device - balanced approach
			this.workerRequestInterval = 20; // Target ~50fps

			// Use partial updates but not delta compression
			this.configureWorkerOptimizations({
				partialUpdates: true,
				deltaCompression: false,
				transferableObjects: true
			});
		} else {
			// High-end device - maximize quality
			this.workerRequestInterval = 16.7; // Target 60fps

			// Use all optimizations
			this.configureWorkerOptimizations({
				partialUpdates: true,
				deltaCompression: true,
				transferableObjects: true
			});
		}

		// Update worker with adaptive settings
		this.worker.postMessage({
			type: 'adaptToDevice',
			data: {
				performanceTier: devicePerformance.tier,
				targetFps: Math.floor(1000 / this.workerRequestInterval)
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

	/**
	 * Helper method to create partial star data for optimization
	 */
	private createPartialStarData(indices: number[]): Float32Array {
		if (!this.starData) return new Float32Array(0);

		const partialData = new Float32Array(indices.length * STAR_DATA_ELEMENTS);

		for (let i = 0; i < indices.length; i++) {
			const starIndex = indices[i];
			const sourceOffset = starIndex * STAR_DATA_ELEMENTS;
			const destOffset = i * STAR_DATA_ELEMENTS;

			for (let j = 0; j < STAR_DATA_ELEMENTS; j++) {
				partialData[destOffset + j] = this.starData[sourceOffset + j];
			}
		}

		return partialData;
	}

	/**
	 * Optimization: Implement double buffering to reduce visual artifacts
	 * Benefit: Smoother rendering with fewer visual glitches
	 */
	private setupCanvas() {
		if (!this.container) return;

		// Create main canvas
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

			// Add GPU acceleration hints
			this.canvas.style.transform = 'translateZ(0)';
			this.canvas.style.backfaceVisibility = 'hidden';
		}

		// Create off-screen buffer for double buffering
		this.offscreenCanvas = document.createElement('canvas');
		this.offscreenCtx = this.offscreenCanvas.getContext('2d', {
			alpha: true,
			willReadFrequently: false // Performance hint
		});

		// Get main canvas context
		this.ctx = this.canvas.getContext('2d', {
			alpha: true,
			willReadFrequently: false
		});

		// Add high performance context attributes
		if (this.ctx) {
			// Tell browser we don't need preserveDrawingBuffer
			(this.ctx as any).getContextAttributes = function () {
				return { preserveDrawingBuffer: false };
			};
		}

		// Initialize the optimized star renderer
		// Determine render mode based on device characteristics
		const isMobileDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
		const renderMode =
			this.devicePixelRatio > 1
				? RENDER_MODE.HIGH_DPI
				: isMobileDevice
					? RENDER_MODE.MOBILE
					: RENDER_MODE.STANDARD;

		this.starRenderer = new StarRenderer(
			this.offscreenCtx || this.ctx!,
			this.containerWidth,
			this.containerHeight,
			this.maxDepth,
			this.starColors,
			true, // enableGlow
			renderMode,
			this.devicePixelRatio
		);
	}

	private resizeCanvas() {
		if (!this.canvas || !this.container || !this.ctx) return;

		// Get container dimensions
		const rect = this.container.getBoundingClientRect();
		const width = rect.width;
		const height = rect.height;

		// Update star renderer dimensions
		if (this.starRenderer) {
			this.starRenderer.updateDimensions(this.containerWidth, this.containerHeight);
		}

		// Only resize if dimensions actually changed
		if (width !== this.containerWidth || height !== this.containerHeight) {
			const dpr = this.devicePixelRatio;

			// Set canvas size with dpr for sharp rendering
			this.canvas.width = width * dpr;
			this.canvas.height = height * dpr;

			// Also resize offscreen canvas if it exists
			if (this.offscreenCanvas) {
				this.offscreenCanvas.width = width * dpr;
				this.offscreenCanvas.height = height * dpr;
			}

			// Clear any existing transformation
			this.ctx.setTransform(1, 0, 0, 1, 0, 0);

			// Do the same for offscreen context
			if (this.offscreenCtx) {
				this.offscreenCtx.setTransform(1, 0, 0, 1, 0, 0);
				this.offscreenCtx.scale(dpr, dpr);
			}

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

		this.resizeObserver = new ResizeObserver(() => {
			this.resizeCanvas();
		});

		this.resizeObserver.observe(this.container);
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
		this.animationFrameId = this.requestFrameFn(this.animate);

		// Ensure pool statistics are initialized and synced
		starPoolBridge.forceSyncStats();

		// Update active star count (all stars are active when starting)
		if (this.worker) {
			starPoolBridge.updateActiveCount(this.starCount, this.starCount);
		}
	}

	stop() {
		if (!browser || !this.isRunning) return;

		this.isRunning = false;

		if (this.animationFrameId) {
			this.cancelFrameFn(this.animationFrameId);
			this.animationFrameId = null;
		}

		// Update store state
		if (this.store) {
			this.store.update((state) => ({
				...state,
				isAnimating: false
			}));
		}

		// Final stats update before stopping
		starPoolBridge.forceSyncStats();
	}

	/**
	 * Improved requestNextFrame that uses our established patterns
	 */
	private requestNextFrame() {
		if (!this.worker || !this.isRunning || this.isPaused) return;

		const now = performance.now();
		const deltaTime = now - this.lastTime;

		// Determine whether to send partial or full update request
		const usePartialUpdate =
			this.starData &&
			this.changedStarIndices &&
			this.changedStarIndices.length > 0 &&
			this.changedStarIndices.length < this.starCount / 2;

		if (usePartialUpdate) {
			// Send partial update request
			this.worker.postMessage({
				type: 'requestPartialFrame',
				data: {
					deltaTime,
					dimensions: this.dimensionsChanged
						? {
								width: this.containerWidth,
								height: this.containerHeight
							}
						: null,
					changedIndices: this.changedStarIndices,
					changedStarData: this.createPartialStarData(this.changedStarIndices)
				}
			});

			// Reset indices
			this.changedStarIndices = [];
		} else if (this.starData) {
			// Send full update request with transferable
			this.worker.postMessage(
				{
					type: 'requestFrame',
					data: {
						deltaTime,
						dimensions: this.dimensionsChanged
							? {
									width: this.containerWidth,
									height: this.containerHeight
								}
							: null,
						starData: this.starData
					}
				},
				[this.starData.buffer]
			);

			// Null out the reference since we transferred it
			this.starData = null;
		}

		// Reset dimensions changed flag
		this.dimensionsChanged = false;
	}

	animate = (timestamp: number) => {
		if (!browser || !this.isRunning || !this.ctx || !this.canvas || this.isPaused) return;

		// Request next animation frame
		this.animationFrameId = this.requestFrameFn(this.animate);

		// Calculate delta time
		const deltaTime = timestamp - this.lastTime;
		this.lastTime = timestamp;

		// Render to offscreen canvas first if double buffering is enabled
		if (this.offscreenCtx && this.offscreenCanvas) {
			// VISUAL FIX: Restore exact motion blur from reference
			this.offscreenCtx.fillStyle = 'rgba(0, 0, 0, 0.2)';
			this.offscreenCtx.fillRect(0, 0, this.containerWidth, this.containerHeight);

			// Render stars to offscreen canvas if we have data
			if (this.starData) {
				this.renderStars(this.offscreenCtx);
			}

			// Clear main canvas
			this.ctx.clearRect(0, 0, this.containerWidth, this.containerHeight);

			// Copy from offscreen to main canvas
			this.ctx.drawImage(this.offscreenCanvas, 0, 0);
		} else {
			// Original direct rendering if offscreen canvas isn't available
			// VISUAL FIX: Restore exact motion blur from reference
			this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
			this.ctx.fillRect(0, 0, this.containerWidth, this.containerHeight);

			// Render stars if we have data
			if (this.starData) {
				this.renderStars(this.ctx);
			}
		}

		// Request next frame from worker at appropriate intervals
		this.scheduleNextFrameRequest();
	};

	// Updated renderStars method that uses the optimized renderer:
	private renderStars(context: CanvasRenderingContext2D) {
		if (!this.starData || !this.starRenderer) return;

		// Project and collect visible stars
		const projectedStars: RenderedStar[] = [];

		// Process all stars from TypedArray
		for (let i = 0; i < this.starCount; i++) {
			const baseIndex = i * STAR_DATA_ELEMENTS;

			// Skip stars that are not in use
			if (this.starData[baseIndex + 5] < 0.5) continue;

			// Extract star properties
			const starProps = {
				x: this.starData[baseIndex],
				y: this.starData[baseIndex + 1],
				z: this.starData[baseIndex + 2],
				prevX: this.starData[baseIndex + 3],
				prevY: this.starData[baseIndex + 4],
				inUse: this.starData[baseIndex + 5]
			};

			// Project and cull star
			const star = this.starRenderer.projectStar(starProps);
			if (star) {
				projectedStars.push(star);
			}
		}

		// Render all visible stars with optimized batching
		this.starRenderer.drawStars(projectedStars, this.speed);
	}

	public adaptToDeviceCapabilities(capabilities: any) {
		if (!capabilities) return;

		// Adapt star count based on device tier
		if (capabilities.maxStars && capabilities.maxStars !== this.starCount) {
			this.setStarCount(capabilities.maxStars);
		}

		// Set render quality based on device capabilities
		if (this.starRenderer && capabilities.renderQuality !== undefined) {
			this.starRenderer.setRenderQuality(capabilities.renderQuality);
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

	/**
	 * Enable or disable worker usage
	 */
	public setUseWorker(useWorker: boolean): void {
		if (!browser) return;

		// Store the setting
		this.useWorker = useWorker;

		// If we're changing the setting while running, restart
		const wasRunning = this.isRunning;
		if (wasRunning) {
			this.stop();
		}

		// Cleanup existing worker if disabling
		if (!useWorker && this.worker) {
			this.worker.terminate();
			this.worker = null;
		}

		// Initialize a new worker if enabling
		if (useWorker && !this.worker) {
			this.initWorker();
		}

		// Restart if needed
		if (wasRunning) {
			this.start();
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

	/**
	 * Enable or disable container parallax effect
	 */
	public setUseContainerParallax(useParallax: boolean): void {
		if (!browser) return;

		// Store the setting
		this.useContainerParallax = useParallax;

		// Apply parallax effect if container exists
		if (this.container) {
			if (useParallax) {
				// Add event listeners for mouse movement
				this.container.addEventListener('mousemove', this.handleMouseMove);

				// Add data attribute for CSS targeting
				this.container.setAttribute('data-parallax', 'true');
			} else {
				// Remove event listeners
				this.container.removeEventListener('mousemove', this.handleMouseMove);

				// Reset any applied transforms
				this.container.style.transform = '';

				// Remove data attribute
				this.container.removeAttribute('data-parallax');
			}
		}
	}

	/**
	 * Handle mouse movement for parallax effect
	 */
	private handleMouseMove = (event: MouseEvent): void => {
		if (!this.container || !this.useContainerParallax) return;

		// Calculate mouse position relative to container center
		const rect = this.container.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;

		// Calculate offset from center (normalized to -1 to 1)
		const offsetX = (event.clientX - centerX) / (rect.width / 2);
		const offsetY = (event.clientY - centerY) / (rect.height / 2);

		// Apply subtle parallax effect
		const moveX = offsetX * 5; // 5px maximum movement
		const moveY = offsetY * 5;

		// Use requestAnimationFrame for smooth animation
		requestAnimationFrame(() => {
			if (this.container) {
				this.container.style.transform = `translate(${moveX}px, ${moveY}px)`;
			}
		});
	};

	setBoostMode(boost: boolean) {
		if (!this.worker) return;

		this.boosting = boost;
		this.speed = boost ? this.boostSpeed : this.baseSpeed;

		// Update worker
		this.worker.postMessage({
			type: 'setBoost',
			data: {
				boosting: boost
			}
		});
	}

	/**
	 * Reset and recreate all stars
	 */
	resetStars() {
		if (!this.worker) return;

		// Request reset from worker
		this.worker.postMessage({
			type: 'reset'
		});

		// Force stats sync after reset
		setTimeout(() => {
			starPoolBridge.forceSyncStats();
		}, 100);
	}

	/**
	 * Enhanced cleanup method that properly releases resources and cancels pending operations
	 */
	public cleanup() {
		// 1. Stop animation to prevent further rendering
		this.stop();

		// 2. Ensure final stats sync only once
		if (!this.cleanupInProgress) {
			this.cleanupInProgress = true;
			starPoolBridge.forceSyncStats();
		}

		// 3. Cancel any pending frame requests
		if (this.frameRequestTimer !== null) {
			clearTimeout(this.frameRequestTimer);
			this.frameRequestTimer = null;
		}

		// 4. Properly terminate worker with clean shutdown
		if (this.worker) {
			// Send cleanup message to allow worker to clean up its resources
			this.worker.postMessage({ type: 'cleanup' });

			// Give worker a small window to process cleanup message before terminating
			setTimeout(() => {
				this.worker.terminate();
				this.worker = null;
			}, 50);
		}

		// 5. Disconnect ResizeObserver
		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
			this.resizeObserver = null;
		}

		// 6. Remove canvas with proper GPU resource release
		if (this.canvas) {
			// Clear any content to help release WebGL contexts/resources
			if (this.ctx) {
				// Clear with transparent black to release texture memory
				this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
				// Explicitly reset any custom properties
				this.ctx.globalAlpha = 1;
				this.ctx.shadowBlur = 0;
				this.ctx.shadowColor = 'transparent';
				this.ctx.filter = 'none';
				this.ctx = null;
			}

			// Remove from DOM
			if (this.canvas.parentNode) {
				this.canvas.parentNode.removeChild(this.canvas);
			}
			this.canvas = null;
		}

		// 7. Do the same for offscreen canvas if used
		if (this.offscreenCanvas) {
			if (this.offscreenCtx) {
				this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
				this.offscreenCtx = null;
			}
			this.offscreenCanvas = null;
		}

		// 8. Clear TypedArray references
		if (this.starData) {
			// Clear the reference - TypedArrays aren't easily "cleared" otherwise
			this.starData = null;
		}

		// 9. Release container reference
		this.container = null;

		// 10. Clean up star renderer
		this.starRenderer = null;

		// 11. Break potential circular references
		if (this.renderCallback) {
			this.renderCallback = null;
		}

		// 12. Help garbage collector by nullifying object properties
		this.dimensionsChanged = false;
		this.isRunning = false;
		this.isPaused = false;
		this.changedStarIndices = [];
		this.lastWorkerUpdateTime = 0;

		// 13. Suggest garbage collection (this won't force it, just hints)
		setTimeout(() => {
			// Create temporary large object and discard it
			const tempArray = new Array(1000).fill(0);
			tempArray.length = 0;

			// Try explicit GC if available (Chrome dev tools)
			try {
				if ((window as any).gc) {
					(window as any).gc();
				}
			} catch (e) {
				// GC not available - ignore error
			}
		}, 100);
	}
}

// File: /src/lib/utils/canvas-star-field.ts

import { browser } from '$app/environment';
import type { Writable } from 'svelte/store';
import { get } from 'svelte/store';
import { deviceCapabilities, type DeviceCapabilities } from './device-performance';
import { frameRateController } from './frame-rate-controller';
import { StarPool, type StarPoolObject } from './star-pool';

interface Star extends StarPoolObject {
	inUse: boolean;
	x: number;
	y: number;
	z: number;
	prevX: number;
	prevY: number;
	sectorId?: string; // Add this property to track star's sector
}

interface AnimationState {
	isAnimating: boolean;
	stars: any[];
}

interface RenderStats {
	frameCount: number;
	fps: number;
	renderTime: number;
	starsRendered: number;
	lastUpdateTime: number;
	spatialPartitioning?: {
		visibleSectors?: number;
		totalSectors?: number;
		visibleStars?: number;
		totalStars?: number;
		processingRatio?: number;
		estimatedCpuSavings?: number;
	};
}

interface RenderedStar {
	x2d: number;
	y2d: number;
	size: number;
	prevX: number;
	prevY: number;
	z: number;
}

interface SpatialSector {
	id: string; // Unique sector identifier (e.g. "2,3" for grid position)
	x: number; // Grid x position
	y: number; // Grid y position
	stars: Star[]; // Stars currently in this sector
	isVisible: boolean; // Whether this sector is currently visible
}

interface SpatialGrid {
	sectors: Map<string, SpatialSector>; // Map of sector ID to sector
	sectorSize: number; // Size of each sector in pixels
	gridWidth: number; // Number of sectors horizontally
	gridHeight: number; // Number of sectors vertically
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
	private frameCount = 0;
	private worker: Worker | null = null;
	private useWorker = false;
	private containerWidth = 0;
	private containerHeight = 0;
	private devicePixelRatio = 1;
	private resizeObserver: ResizeObserver | null = null;
	private resizeHandler: WeakRef<EventListener> | null = null;
	private visibilityHandler: WeakRef<EventListener> | null = null;
	private dimensionsChanged = false;
	private workerCommunicationHandler: ((timestamp: number) => void) | null = null;
	private lastWorkerUpdateTime = 0;
	private workerUpdateInterval = 50; // ms
	private eventManager: EventManager | null = null;
	private memoryCheckInterval = 10000; // 10 seconds
	private lastMemoryCheck = 0;
	private renderStats: RenderStats = {
		frameCount: 0,
		fps: 0,
		renderTime: 0,
		starsRendered: 0,
		lastUpdateTime: 0
	};
	private useSimpleRender = false;
	private highDpiMode = false;
	private isSafari = false;
	private isFirefox = false;
	private isIEEdge = false;
	private useImageSmoothing = true;
	private starPool: StarPool<Star> | null = null;
	private frameSkip = 0;

	// Feature flags
	public enableGlow = true;
	public enableParallax = true;

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

	// Spatial partitioning properties
	private spatialGrid: SpatialGrid | null = null;
	private sectorSize = 200; // Size of each grid sector in pixels
	private visibleSectorsCache: Set<string> = new Set(); // Cache of currently visible sectors
	private lastGridRebuildTime = 0;
	private gridRebuildInterval = 5000; // Rebuild grid every 5 seconds
	private enableSpatialPartitioning = true; // Flag to enable/disable partitioning
	private sectorSizeAdaptive = true; // Flag to enable dynamic sector sizing
	private sectorSizeMin = 100; // Minimum sector size in pixels
	private sectorSizeMax = 400; // Maximum sector size in pixels
	private sectorStarThreshold = 10; // Target stars per sector for adaptive sizing
	private spatialPartitioningMetrics = {
		frameTimeWithPartitioning: 0,
		frameTimeWithoutPartitioning: 0,
		sampleCount: 0,
		performanceImprovement: 0
	};

	constructor(store: any, count = 300, useWorker = false, useContainerParallax = false) {
		this.store = store;
		this.starCount = count;
		this.useWorker = useWorker && browser && 'Worker' in window;
		this.enableParallax = useContainerParallax;
		this.eventManager = new EventManager();

		if (browser) {
			this.devicePixelRatio = window.devicePixelRatio || 1;
			this.highDpiMode = this.devicePixelRatio > 1;

			// Initialize the star pool and stars
			this.initializeStarPool();

			// Set up browser-specific optimizations
			this.setupBrowserCompatibility();

			// Set up device-specific optimizations
			this.setupDeviceOptimizations();

			// Initialize worker if enabled
			if (this.useWorker) {
				this.initWorker();
			}

			// Setup visibility handling
			this.setupVisibilityHandler();
		}
	}

	private setupBrowserCompatibility() {
		if (!browser) return;

		const ua = navigator.userAgent;

		// Safari-specific optimizations (Safari has some canvas performance issues)
		if (/Safari/.test(ua) && !/Chrome/.test(ua)) {
			this.isSafari = true;

			// Safari performs better with simpler rendering techniques
			this.useSimpleRender = true;

			// Disable some effects that are slow in Safari
			this.enableGlow = false;
		}

		// Firefox-specific optimizations
		if (/Firefox/.test(ua)) {
			this.isFirefox = true;

			// Firefox has good canvas performance but benefits from these tweaks
			this.useImageSmoothing = false; // Disable image smoothing for better performance
		}

		// IE/Edge legacy support
		if (/Trident|Edge/.test(ua)) {
			this.isIEEdge = true;

			// Fallback for older browsers
			this.useSimpleRender = true;
			this.frameCount = 1;
		}
	}

	private setupDeviceOptimizations() {
		if (!browser) return;

		const isMobile =
			window.innerWidth < 768 ||
			/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

		if (isMobile) {
			// Get device capabilities
			const capabilities = get(deviceCapabilities);

			// Apply mobile-specific optimizations
			if (capabilities.tier === 'low') {
				// Ultra-low settings for very weak devices
				this.starCount = Math.min(this.starCount, 100);
				this.useSimpleRender = true;
				this.enableGlow = false;
				this.enableParallax = false;
			} else {
				// Standard mobile optimizations
				this.starCount = Math.min(this.starCount, 200);
				this.useSimpleRender = capabilities.tier !== 'high';
			}
		}
	}

	private setupMobileOptimizations() {
		if (!browser) return;

		const isMobile =
			window.innerWidth < 768 ||
			/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

		if (isMobile) {
			// Reduce star count
			this.starCount = Math.min(this.starCount, 150);

			// Disable expensive effects
			this.enableGlow = false;

			// Use simpler rendering techniques
			this.useSimpleRender = true;

			// Increase frame skipping
			this.frameSkip = 1; // Render every other frame

			// Use optimized mobile draw method with lower quality
			this.drawStars = this.drawStarsMobile;
		}
	}

	private drawStarsMobile() {
		if (!this.ctx) return;

		// Mobile-optimized rendering with simpler effects
		const centerX = this.containerWidth / 2;
		const centerY = this.containerHeight / 2;

		// Draw all stars with a single color to reduce context switches
		this.ctx.fillStyle = '#ffffff';
		this.ctx.beginPath();

		for (let i = 0; i < this.stars.length; i++) {
			const star = this.stars[i];

			// Project 3D position to 2D screen coordinates
			const scale = this.maxDepth / star.z;
			const x2d = (star.x - centerX) * scale + centerX;
			const y2d = (star.y - centerY) * scale + centerY;

			// Skip offscreen stars
			if (x2d < 0 || x2d >= this.containerWidth || y2d < 0 || y2d >= this.containerHeight) {
				continue;
			}

			// Simpler sizing for mobile
			const size = (1 - star.z / this.maxDepth) * 2;

			// Use rectangle for better performance on mobile
			this.ctx.rect(x2d - size / 2, y2d - size / 2, size, size);
		}

		// Single fill call for all stars
		this.ctx.fill();
	}

	setContainer(element: HTMLElement) {
		if (!browser) return;

		// Clean up previous container observer if it exists
		if (this.resizeObserver && this.container) {
			this.resizeObserver.disconnect();
		}

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

		// Set up resize observer for the container
		this.setupResizeObserver();

		// Set up high DPI handling
		this.setupHighDPI();

		// Always resize the canvas to match current container dimensions
		this.resizeCanvas();

		// Apply browser-specific canvas settings
		if (this.ctx) {
			// Control image smoothing based on browser
			if ('imageSmoothingEnabled' in this.ctx) {
				this.ctx.imageSmoothingEnabled = !this.useSimpleRender;
			}

			// IE/Edge compatibility
			if (this.isIEEdge && 'msImageSmoothingEnabled' in this.ctx) {
				(this.ctx as any).msImageSmoothingEnabled = !this.useSimpleRender;
			}
		}

		// Initialize spatial partitioning grid
		if (this.enableSpatialPartitioning) {
			this.initializeSpatialGrid();
		}
	}

	private setupResizeObserver() {
		if (!this.container || !browser) return;

		// Create throttled resize handler
		const handleResize = createThrottledRAF(() => {
			if (!this.ctx || !this.canvas || !this.container) return;

			this.resizeCanvas();
		});

		// Use ResizeObserver for efficient size updates
		this.resizeObserver = new ResizeObserver(handleResize);
		this.resizeObserver.observe(this.container);
	}

	private setupHighDPI() {
		if (!browser || !this.canvas || !this.ctx) return;

		// Get the device pixel ratio
		const dpr = window.devicePixelRatio || 1;

		// Adjust canvas size based on DPI
		const rect = this.container.getBoundingClientRect();
		const width = rect.width;
		const height = rect.height;

		// Set the canvas's internal dimensions to match DPI
		this.canvas.width = width * dpr;
		this.canvas.height = height * dpr;

		// Scale the rendering context
		this.ctx.scale(dpr, dpr);

		// Set CSS size to maintain layout dimensions
		this.canvas.style.width = width + 'px';
		this.canvas.style.height = height + 'px';

		// Store actual drawing dimensions
		this.containerWidth = width;
		this.containerHeight = height;

		// For high-DPI displays, we can use finer star effects
		if (dpr > 1) {
			this.highDpiMode = true;
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

		// Add hardware acceleration hints
		this.canvas.style.transform = 'translateZ(0)';
		this.canvas.style.backfaceVisibility = 'hidden';

		this.container.appendChild(this.canvas);

		// Set up canvas context with alpha for transparency
		this.ctx = this.canvas.getContext('2d', {
			alpha: true
		});
	}

	resizeCanvas() {
		if (!this.canvas || !this.container || !this.ctx) return;

		// Get container dimensions directly from the element
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

			// Update stars positions for new dimensions
			this.adjustStarsForNewDimensions(width, height);

			// Update spatial grid when dimensions change
			if (this.enableSpatialPartitioning) {
				this.initializeSpatialGrid(); // Rebuild grid with new dimensions
			}
		}
	}

	private adjustStarsForNewDimensions(newWidth: number, newHeight: number) {
		// Rescale stars to new container dimensions
		for (let i = 0; i < this.stars.length; i++) {
			const star = this.stars[i];

			// Keep stars within the new boundaries
			if (Math.abs(star.x) > newWidth) {
				star.x = (Math.random() * 2 - 1) * newWidth;
			}

			if (Math.abs(star.y) > newHeight) {
				star.y = (Math.random() * 2 - 1) * newHeight;
			}
		}

		// Update worker if using one
		if (this.useWorker && this.worker) {
			this.worker.postMessage({
				type: 'setDimensions',
				data: {
					width: newWidth,
					height: newHeight
				}
			});
		}
	}

	private initializeStarPool() {
		// Create a star pool with extra capacity for flexibility
		const poolCapacity = Math.ceil(this.starCount * 1.2); // 20% extra capacity

		// Create factory function for creating stars
		const createStarFactory = () => ({
			inUse: false,
			x: Math.random() * this.containerWidth * 2 - this.containerWidth,
			y: Math.random() * this.containerHeight * 2 - this.containerHeight,
			z: Math.random() * this.maxDepth,
			prevX: 0,
			prevY: 0
		});

		// Create reset function for reusing stars
		const resetStarFunction = (star: Star) => {
			star.x = Math.random() * this.containerWidth * 2 - this.containerWidth;
			star.y = Math.random() * this.containerHeight * 2 - this.containerHeight;
			star.z = this.maxDepth;
			star.prevX = star.x;
			star.prevY = star.y;
		};

		// Initialize the star pool
		this.starPool = new StarPool<Star>(poolCapacity, createStarFactory, resetStarFunction);

		// Pre-allocate the stars array with fixed size
		this.stars = new Array(this.starCount);

		// Fill stars array with objects from the pool
		for (let i = 0; i < this.starCount; i++) {
			this.stars[i] = this.starPool.get();
		}
	}

	private createStar(): Star {
		// Get a star from the pool instead of creating a new one
		if (this.starPool) {
			return this.starPool.get();
		}

		// Fallback to original method if pool not initialized
		return {
			inUse: true,
			x: Math.random() * this.containerWidth * 2 - this.containerWidth,
			y: Math.random() * this.containerHeight * 2 - this.containerHeight,
			z: Math.random() * this.maxDepth,
			prevX: 0,
			prevY: 0
		};
	}

	private resetStar(star: Star): Star {
		// Update star properties without creating a new object
		star.x = Math.random() * this.containerWidth * 2 - this.containerWidth;
		star.y = Math.random() * this.containerHeight * 2 - this.containerHeight;
		star.z = this.maxDepth;
		star.prevX = star.x;
		star.prevY = star.y;

		// Update sector assignment
		if (this.enableSpatialPartitioning && this.spatialGrid) {
			const sectorId = this.getSectorIdForPosition(star.x, star.y);

			// Remove from old sector if it exists
			if (star.sectorId) {
				const oldSector = this.spatialGrid.sectors.get(star.sectorId);
				if (oldSector) {
					const index = oldSector.stars.indexOf(star);
					if (index !== -1) {
						oldSector.stars.splice(index, 1);
					}
				}
			}

			// Add to new sector
			let newSector = this.spatialGrid.sectors.get(sectorId);
			if (!newSector) {
				const sectorX = Math.floor(star.x / this.sectorSize);
				const sectorY = Math.floor(star.y / this.sectorSize);

				newSector = {
					id: sectorId,
					x: sectorX,
					y: sectorY,
					stars: [],
					isVisible: this.visibleSectorsCache.has(sectorId)
				};

				this.spatialGrid.sectors.set(sectorId, newSector);
			}

			newSector.stars.push(star);
			star.sectorId = sectorId;
		}

		return star;
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

			// Initialize the worker with current configuration
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
						containerHeight: this.containerHeight,
						sectorSize: this.sectorSize // Add this property
					}
				}
			});

			// Set up worker communication handler for animation loop
			this.setupWorkerCommunication();
		} catch (error) {
			console.error('Failed to initialize star field worker:', error);
			this.worker = null;
			this.useWorker = false;
		}
	}

	private setupWorkerCommunication() {
		if (!this.worker) return;

		// Create a function that handles worker communication
		this.workerCommunicationHandler = (timestamp: number) => {
			// Only send updates at specific intervals
			if (timestamp - this.lastWorkerUpdateTime < this.workerUpdateInterval) return;
			this.lastWorkerUpdateTime = timestamp;

			// Only send necessary data (delta time and dimensions if changed)
			const message: any = {
				type: 'requestFrame',
				data: {
					deltaTime: timestamp - this.lastTime,
					dimensions: this.dimensionsChanged
						? {
								width: this.containerWidth,
								height: this.containerHeight
							}
						: null
				}
			};

			this.dimensionsChanged = false;
			this.worker?.postMessage(message);
		};
	}

	private setupVisibilityHandler() {
		if (!browser) return;

		const handleVisibilityChange = () => {
			if (document.hidden) {
				// Pause animation when tab is not visible
				this.pause();
			} else {
				// Resume animation when tab is visible again
				this.resume();
			}
		};

		// Store weak reference to handler to avoid memory leaks
		this.visibilityHandler = new WeakRef(handleVisibilityChange);

		// Add visibility change listener
		this.eventManager?.add(document, 'visibilitychange', handleVisibilityChange);
	}

	// Get current star count
	getStarCount(): number {
		return this.stars.length;
	}

	setStarCount(count: number) {
		if (!browser || count === this.starCount) return;

		const oldCount = this.starCount;
		this.starCount = count;

		// If we need more stars, get them from the pool
		if (count > oldCount) {
			// Expand the array
			this.stars.length = count;

			// Fill with new objects from pool
			for (let i = oldCount; i < count; i++) {
				this.stars[i] = this.createStar();
			}
		}
		// If we need fewer stars, release extra ones back to the pool
		else if (count < oldCount) {
			// Release extra stars back to the pool
			if (this.starPool) {
				for (let i = count; i < oldCount; i++) {
					this.starPool.release(this.stars[i]);
				}
			}

			// Truncate the array
			this.stars.length = count;
		}

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

		// Rebuild spatial grid
		if (this.enableSpatialPartitioning) {
			this.assignStarsToSectors(true);
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

	setUseContainerParallax(useParallax: boolean) {
		this.enableParallax = useParallax;
	}

	// Control boost mode - exactly like reference
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
		this.isPaused = false;
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

		// Request next frame first to maintain smooth animation
		this.animationFrameId = requestAnimationFrame(this.animate);

		// Calculate delta time with a maximum to prevent large jumps
		const deltaTime = Math.min(timestamp - this.lastTime, 50); // Cap at 50ms
		this.lastTime = timestamp;

		// Skip frames if necessary based on device capability
		const capabilities = get(deviceCapabilities);
		if (capabilities.frameSkip > 0) {
			this.frameCount = (this.frameCount + 1) % (capabilities.frameSkip + 1);
			if (this.frameCount !== 0) {
				return; // Skip this frame
			}
		}

		// Calculate time-based movement scale
		const timeScale = deltaTime / 16.7; // Normalized to 60fps

		// Use offscreen canvas if available for better performance
		const ctx = this.ctx;

		// Clear canvas with slight fade for motion blur
		ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
		ctx.fillRect(0, 0, this.containerWidth, this.containerHeight);

		// If using worker, handle worker communication
		if (this.useWorker && this.worker && this.workerCommunicationHandler) {
			this.workerCommunicationHandler(timestamp);

			// Update spatial grid after worker updates star positions
			if (this.enableSpatialPartitioning && this.spatialGrid) {
				this.updateVisibleSectors();
				this.assignStarsToSectors();
			}
		} else {
			// Update star positions directly with time scaling
			this.updateStars(timeScale);

			// Update spatial grid after updating star positions
			if (this.enableSpatialPartitioning && this.spatialGrid) {
				this.updateVisibleSectors();
				this.assignStarsToSectors();
			}
		}

		// Choose the appropriate drawing method based on device and browser
		if (this.enableSpatialPartitioning && this.spatialGrid) {
			// Draw only stars in visible sectors
			if (this.useSimpleRender) {
				this.drawStarsSimpleWithPartitioning();
			} else if (this.highDpiMode && !this.isSafari) {
				this.drawStarsHighDPIWithPartitioning();
			} else {
				this.drawStarsWithPartitioning();
			}
		} else {
			// Fall back to original rendering methods
			if (this.useSimpleRender) {
				this.drawStarsSimple();
			} else if (this.highDpiMode && !this.isSafari) {
				this.drawStarsHighDPI();
			} else {
				this.drawStars();
			}
		}

		// Update performance metrics
		this.updatePerformanceMetrics(timestamp);

		// Periodically adapt sector size if enabled
		if (this.sectorSizeAdaptive && this.enableSpatialPartitioning && this.spatialGrid) {
			if (timestamp - this.lastGridRebuildTime > this.gridRebuildInterval * 10) {
				this.adaptSectorSize();
			}
		}
	};

	private updatePerformanceMetrics(timestamp: number) {
		// Only update performance metrics once per second
		if (timestamp - this.renderStats.lastUpdateTime > 1000) {
			const fps = Math.round(
				(this.renderStats.frameCount * 1000) / (timestamp - this.renderStats.lastUpdateTime)
			);

			this.renderStats = {
				fps,
				frameCount: 0,
				renderTime: 0,
				starsRendered: 0,
				lastUpdateTime: timestamp
			};

			// Report to frame rate controller if available
			if (frameRateController) {
				frameRateController.reportFPS(fps);
			}

			// Add spatial partitioning metrics
			if (this.enableSpatialPartitioning && this.spatialGrid) {
				const visibleSectors = Array.from(this.visibleSectorsCache).length;
				const totalSectors = this.spatialGrid.sectors.size;
				const totalStars = this.stars.length;
				const visibleStars = this.renderStats.starsRendered;

				// Calculate percentage of stars processed vs total
				const processingRatio = totalStars > 0 ? visibleStars / totalStars : 0;

				// Add to performance metrics
				this.renderStats.spatialPartitioning = {
					visibleSectors,
					totalSectors,
					visibleStars,
					totalStars,
					processingRatio
				};
			}
		} else {
			this.renderStats.frameCount++;
		}

		// Check memory usage periodically to prevent memory leaks
		if (timestamp - this.lastMemoryCheck > this.memoryCheckInterval) {
			this.lastMemoryCheck = timestamp;
			this.checkMemoryUsage();
		}
	}

	private checkMemoryUsage() {
		if (!browser || !('performance' in window) || !('memory' in (performance as any))) return;

		const memory = (performance as any).memory;
		const memUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;

		// If memory usage is high, take action to reduce it
		if (memUsage > 0.8) {
			// Reduce star count if very high memory usage
			if (memUsage > 0.9 && this.starCount > 100) {
				this.setStarCount(Math.floor(this.starCount * 0.8));
			}

			// Suggest garbage collection
			this.suggestGarbageCollection();
		}
	}

	private suggestGarbageCollection() {
		if (!browser) return;

		// Clear any large arrays and objects
		// This doesn't directly trigger GC but helps suggest it
		if ((window as any).gc) {
			try {
				(window as any).gc();
			} catch (e) {
				// GC not available
			}
		}
	}

	private updateStars(timeScale = 1) {
		// Center of the screen (our viewing point)
		const centerX = this.containerWidth / 2;
		const centerY = this.containerHeight / 2;

		// Update stars positions with time scaling
		for (let i = 0; i < this.stars.length; i++) {
			const star = this.stars[i];

			// Store previous position for trails
			star.prevX = star.x;
			star.prevY = star.y;

			// Move star closer to viewer - scaled by time for consistent speed
			star.z -= this.speed * timeScale;

			// If star passed the viewer, reset it to far distance
			if (star.z <= 0) {
				this.resetStar(star);
				continue;
			}
		}

		// Gradually return to base speed when not boosting
		if (!this.boosting && this.speed > this.baseSpeed) {
			this.speed = Math.max(this.baseSpeed, this.speed * 0.98);
		}
	}

	private drawStars() {
		if (!this.ctx) return;

		const centerX = this.containerWidth / 2;
		const centerY = this.containerHeight / 2;

		// Pre-sort stars by color and size to batch similar operations
		const starsByColor = new Map<string, RenderedStar[]>();
		let totalStarsRendered = 0;

		// Group stars by color/rendering mode
		for (let i = 0; i < this.stars.length; i++) {
			const star = this.stars[i];

			// Project coordinates
			const scale = this.maxDepth / star.z;
			const x2d = (star.x - centerX) * scale + centerX;
			const y2d = (star.y - centerY) * scale + centerY;

			// Skip offscreen stars - this is a major optimization
			if (
				x2d < -10 ||
				x2d >= this.containerWidth + 10 ||
				y2d < -10 ||
				y2d >= this.containerHeight + 10
			) {
				continue;
			}

			totalStarsRendered++;

			// Calculate size and color only once
			const size = (1 - star.z / this.maxDepth) * 3;
			const colorIndex = Math.floor((1 - star.z / this.maxDepth) * (this.starColors.length - 1));
			const color = this.starColors[colorIndex];

			// Group by rendering mode and color
			const key = this.speed > this.baseSpeed * 1.5 ? 'trail_' + color : 'circle_' + color;

			if (!starsByColor.has(key)) {
				starsByColor.set(key, []);
			}

			// Store calculated values to avoid recalculating
			starsByColor.get(key)?.push({
				x2d,
				y2d,
				size,
				prevX: star.prevX,
				prevY: star.prevY,
				z: star.z
			});
		}

		// Track stars drawn for performance monitoring
		this.renderStats.starsRendered = totalStarsRendered;

		// Draw stars grouped by color/mode to minimize context changes
		starsByColor.forEach((stars, key) => {
			const isTrail = key.startsWith('trail_');
			const color = key.substring(key.indexOf('_') + 1);

			// Set style only once per batch
			if (isTrail) {
				this.ctx!.strokeStyle = color;
			} else {
				this.ctx!.fillStyle = color;
			}

			// Begin a single path for all stars of same color
			this.ctx!.beginPath();

			for (const star of stars) {
				if (isTrail) {
					const prevScale = this.maxDepth / (star.z + this.speed);
					const prevX = (star.prevX - centerX) * prevScale + centerX;
					const prevY = (star.prevY - centerY) * prevScale + centerY;

					this.ctx!.lineWidth = star.size;
					this.ctx!.moveTo(prevX, prevY);
					this.ctx!.lineTo(star.x2d, star.y2d);
				} else {
					// Add circle to the current path
					this.ctx!.moveTo(star.x2d + star.size, star.y2d);
					this.ctx!.arc(star.x2d, star.y2d, star.size, 0, Math.PI * 2);
				}
			}

			// Draw all stars of this type at once
			if (isTrail) {
				this.ctx!.stroke();
			} else {
				this.ctx!.fill();
			}
		});
	}

	private drawStarsSimple() {
		if (!this.ctx) return;

		// Mobile-optimized rendering with simpler effects
		const centerX = this.containerWidth / 2;
		const centerY = this.containerHeight / 2;

		// Draw all stars with a single color to reduce context switches
		this.ctx.fillStyle = '#ffffff';
		this.ctx.beginPath();

		for (let i = 0; i < this.stars.length; i++) {
			const star = this.stars[i];

			// Project 3D position to 2D screen coordinates
			const scale = this.maxDepth / star.z;
			const x2d = (star.x - centerX) * scale + centerX;
			const y2d = (star.y - centerY) * scale + centerY;

			// Skip offscreen stars
			if (x2d < 0 || x2d >= this.containerWidth || y2d < 0 || y2d >= this.containerHeight) {
				continue;
			}

			// Simpler sizing for mobile
			const size = (1 - star.z / this.maxDepth) * 2;

			// Use rectangle for better performance
			this.ctx.rect(x2d - size / 2, y2d - size / 2, size, size);
		}

		// Single fill call for all stars
		this.ctx.fill();
	}

	private drawStarsHighDPI() {
		if (!this.ctx) return;

		// Enhanced rendering for high-DPI displays
		const centerX = this.containerWidth / 2;
		const centerY = this.containerHeight / 2;

		// Use standard drawing method but with more detail
		const starsByColor = new Map<string, RenderedStar[]>();
		let totalStarsRendered = 0;

		// Only process stars in visible sectors
		this.spatialGrid.sectors.forEach((sector) => {
			if (!sector.isVisible) return; // Skip non-visible sectors

			// Group stars by color/rendering mode
			for (let i = 0; i < sector.stars.length; i++) {
				const star = sector.stars[i];

				// Project coordinates
				const scale = this.maxDepth / star.z;
				const x2d = (star.x - centerX) * scale + centerX;
				const y2d = (star.y - centerY) * scale + centerY;

				// Skip offscreen stars
				if (x2d < 0 || x2d >= this.containerWidth || y2d < 0 || y2d >= this.containerHeight) {
					continue;
				}

				totalStarsRendered++;

				// Calculate size and color with more detail for high DPI
				const size = (1 - star.z / this.maxDepth) * 4; // Slightly larger stars for high DPI
				const colorIndex = Math.floor((1 - star.z / this.maxDepth) * (this.starColors.length - 1));
				const color = this.starColors[colorIndex];

				// Group by rendering mode and color
				const key = this.speed > this.baseSpeed * 1.5 ? 'trail_' + color : 'circle_' + color;

				if (!starsByColor.has(key)) {
					starsByColor.set(key, []);
				}

				// Store calculated values
				starsByColor.get(key)?.push({
					x2d,
					y2d,
					size,
					prevX: star.prevX,
					prevY: star.prevY,
					z: star.z
				});
			}
		});

		// Track stars drawn for performance monitoring
		this.renderStats.starsRendered = totalStarsRendered;

		// Draw stars grouped by color/mode with enhanced quality
		starsByColor.forEach((stars, key) => {
			const isTrail = key.startsWith('trail_');
			const color = key.substring(key.indexOf('_') + 1);

			if (isTrail) {
				// For trails, use individual paths with enhanced quality
				this.ctx!.strokeStyle = color;

				for (const star of stars) {
					const prevScale = this.maxDepth / (star.z + this.speed);
					const prevX = (star.prevX - centerX) * prevScale + centerX;
					const prevY = (star.prevY - centerY) * prevScale + centerY;

					// Add glow effect for high DPI displays
					if (this.enableGlow) {
						// Create glow effect
						this.ctx!.shadowColor = color;
						this.ctx!.shadowBlur = star.size * 2;
					}

					this.ctx!.beginPath();
					this.ctx!.lineWidth = star.size;
					this.ctx!.moveTo(prevX, prevY);
					this.ctx!.lineTo(star.x2d, star.y2d);
					this.ctx!.stroke();
				}

				// Reset shadow for next batch
				if (this.enableGlow) {
					this.ctx!.shadowColor = 'transparent';
					this.ctx!.shadowBlur = 0;
				}
			} else {
				// For circles, use batched path with glow for brightest stars
				this.ctx!.fillStyle = color;

				// Separate larger stars for glow effect
				const largeStars = stars.filter((s) => s.size > 2);
				const smallStars = stars.filter((s) => s.size <= 2);

				// Draw small stars in one batch without glow
				if (smallStars.length > 0) {
					this.ctx!.beginPath();
					for (const star of smallStars) {
						this.ctx!.moveTo(star.x2d + star.size, star.y2d);
						this.ctx!.arc(star.x2d, star.y2d, star.size, 0, Math.PI * 2);
					}
					this.ctx!.fill();
				}

				// Draw large stars individually with glow
				if (largeStars.length > 0 && this.enableGlow) {
					for (const star of largeStars) {
						this.ctx!.shadowColor = color;
						this.ctx!.shadowBlur = star.size * 1.5;

						this.ctx!.beginPath();
						this.ctx!.moveTo(star.x2d + star.size, star.y2d);
						this.ctx!.arc(star.x2d, star.y2d, star.size, 0, Math.PI * 2);
						this.ctx!.fill();
					}

					// Reset shadow
					this.ctx!.shadowColor = 'transparent';
					this.ctx!.shadowBlur = 0;
				} else if (largeStars.length > 0) {
					// Draw large stars without glow
					this.ctx!.beginPath();
					for (const star of largeStars) {
						this.ctx!.moveTo(star.x2d + star.size, star.y2d);
						this.ctx!.arc(star.x2d, star.y2d, star.size, 0, Math.PI * 2);
					}
					this.ctx!.fill();
				}
			}
		});
	}

	// Add debug rendering method to visualize the grid (for development)
	private renderDebugGrid(): void {
		if (!this.ctx || !this.spatialGrid) return;

		// Save context state
		this.ctx.save();

		// Style for grid lines
		this.ctx.strokeStyle = 'rgba(100, 100, 255, 0.3)';
		this.ctx.lineWidth = 1;

		// Draw vertical grid lines
		for (let x = 0; x <= this.spatialGrid.gridWidth; x++) {
			const posX = x * this.spatialGrid.sectorSize;
			this.ctx.beginPath();
			this.ctx.moveTo(posX, 0);
			this.ctx.lineTo(posX, this.containerHeight);
			this.ctx.stroke();
		}

		// Draw horizontal grid lines
		for (let y = 0; y <= this.spatialGrid.gridHeight; y++) {
			const posY = y * this.spatialGrid.sectorSize;
			this.ctx.beginPath();
			this.ctx.moveTo(0, posY);
			this.ctx.lineTo(this.containerWidth, posY);
			this.ctx.stroke();
		}

		// Highlight visible sectors
		this.ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
		this.spatialGrid.sectors.forEach((sector) => {
			if (sector.isVisible) {
				const x = sector.x * this.spatialGrid.sectorSize;
				const y = sector.y * this.spatialGrid.sectorSize;
				this.ctx.fillRect(x, y, this.spatialGrid.sectorSize, this.spatialGrid.sectorSize);

				// Add star count labels
				this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
				this.ctx.font = '10px Arial';
				this.ctx.fillText(`Stars: ${sector.stars.length}`, x + 5, y + 15);
				this.ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
			}
		});

		// Restore context state
		this.ctx.restore();
	}

	// Add this method to enable/disable spatial partitioning
	public setSpatialPartitioning(enable: boolean): void {
		if (this.enableSpatialPartitioning === enable) return;

		this.enableSpatialPartitioning = enable;

		if (enable && !this.spatialGrid) {
			this.initializeSpatialGrid();
		} else if (!enable) {
			// Clean up the spatial grid to free memory
			this.spatialGrid = null;
			this.visibleSectorsCache.clear();

			// Clear sector IDs from stars
			for (let i = 0; i < this.stars.length; i++) {
				delete this.stars[i].sectorId;
			}
		}
	}

	// Method to dynamically adjust sector size based on performance
	private adaptSectorSize(): void {
		if (!this.spatialGrid || !this.sectorSizeAdaptive) return;

		// Calculate the average number of stars per visible sector
		let totalStarsInVisibleSectors = 0;
		let visibleSectorCount = 0;

		this.spatialGrid.sectors.forEach((sector) => {
			if (sector.isVisible) {
				totalStarsInVisibleSectors += sector.stars.length;
				visibleSectorCount++;
			}
		});

		const avgStarsPerSector =
			visibleSectorCount > 0 ? totalStarsInVisibleSectors / visibleSectorCount : 0;

		// Adjust sector size based on average density
		// If we have too many stars per sector, make sectors smaller
		// If we have too few stars per sector, make sectors larger
		if (avgStarsPerSector > this.sectorStarThreshold * 2) {
			// Too many stars per sector - reduce sector size
			this.sectorSize = Math.max(this.sectorSizeMin, this.sectorSize * 0.8);
			this.initializeSpatialGrid(); // Rebuild grid with new size
		} else if (avgStarsPerSector < this.sectorStarThreshold / 2) {
			// Too few stars per sector - increase sector size
			this.sectorSize = Math.min(this.sectorSizeMax, this.sectorSize * 1.2);
			this.initializeSpatialGrid(); // Rebuild grid with new size
		}
	}

	// Method to benchmark partitioning performance
	public benchmarkSpatialPartitioning(sampleCount = 100): Promise<any> {
		return new Promise((resolve) => {
			if (!browser) {
				resolve({ error: 'Benchmarking only available in browser environment' });
				return;
			}

			// Reset metrics
			this.spatialPartitioningMetrics = {
				frameTimeWithPartitioning: 0,
				frameTimeWithoutPartitioning: 0,
				sampleCount: 0,
				performanceImprovement: 0
			};

			let samplesCollected = 0;
			const maxSamples = sampleCount;

			// Function to collect a benchmark sample
			const collectSample = () => {
				// Measure frame time with partitioning
				this.setSpatialPartitioning(true);
				let startTime = performance.now();
				this.renderFrame(true); // Force render a frame
				let endTime = performance.now();
				this.spatialPartitioningMetrics.frameTimeWithPartitioning += endTime - startTime;

				// Measure frame time without partitioning
				this.setSpatialPartitioning(false);
				startTime = performance.now();
				this.renderFrame(true); // Force render a frame
				endTime = performance.now();
				this.spatialPartitioningMetrics.frameTimeWithoutPartitioning += endTime - startTime;

				// Restore original setting
				this.setSpatialPartitioning(true);

				// Increment counter
				samplesCollected++;
				this.spatialPartitioningMetrics.sampleCount = samplesCollected;

				// Calculate improvement ratio
				const withPartitioning =
					this.spatialPartitioningMetrics.frameTimeWithPartitioning / samplesCollected;
				const withoutPartitioning =
					this.spatialPartitioningMetrics.frameTimeWithoutPartitioning / samplesCollected;

				if (withoutPartitioning > 0) {
					this.spatialPartitioningMetrics.performanceImprovement =
						(withoutPartitioning - withPartitioning) / withoutPartitioning;
				}

				// Continue sampling or resolve
				if (samplesCollected < maxSamples) {
					// Use requestAnimationFrame to spread measurements across frames
					requestAnimationFrame(collectSample);
				} else {
					// Calculate final metrics
					const finalMetrics = {
						avgFrameTimeWithPartitioning:
							this.spatialPartitioningMetrics.frameTimeWithPartitioning / maxSamples,
						avgFrameTimeWithoutPartitioning:
							this.spatialPartitioningMetrics.frameTimeWithoutPartitioning / maxSamples,
						performanceImprovement: this.spatialPartitioningMetrics.performanceImprovement,
						sampleCount: maxSamples,
						starCount: this.stars.length,
						sectorSize: this.sectorSize,
						visibleSectors: this.visibleSectorsCache.size,
						totalSectors: this.spatialGrid ? this.spatialGrid.sectors.size : 0,
						processingRatio: this.renderStats.spatialPartitioning
							? this.renderStats.spatialPartitioning.processingRatio
							: 1
					};

					resolve(finalMetrics);
				}
			};

			// Start sampling
			collectSample();
		});
	}

	// Helper method to force a frame render for benchmarking
	private renderFrame(skipAnimationLoop = false): void {
		if (!this.ctx || !this.canvas) return;

		const timestamp = performance.now();
		const deltaTime = timestamp - this.lastTime;
		this.lastTime = timestamp;

		// Clear canvas
		this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
		this.ctx.fillRect(0, 0, this.containerWidth, this.containerHeight);

		// Update stars
		if (!this.useWorker) {
			this.updateStars(deltaTime / 16.7);
		}

		// Update spatial grid
		if (this.enableSpatialPartitioning && this.spatialGrid) {
			this.updateVisibleSectors();
			this.assignStarsToSectors();
		}

		// Draw stars
		if (this.enableSpatialPartitioning && this.spatialGrid) {
			if (this.useSimpleRender) {
				this.drawStarsSimpleWithPartitioning();
			} else if (this.highDpiMode && !this.isSafari) {
				this.drawStarsHighDPIWithPartitioning();
			} else {
				this.drawStarsWithPartitioning();
			}
		} else {
			if (this.useSimpleRender) {
				this.drawStarsSimple();
			} else if (this.highDpiMode && !this.isSafari) {
				this.drawStarsHighDPI();
			} else {
				this.drawStars();
			}
		}
	}

	// Add utility method to find optimal sector size
	public findOptimalSectorSize(): Promise<any> {
		return new Promise(async (resolve) => {
			if (!browser) {
				resolve({ error: 'Optimization only available in browser environment' });
				return;
			}

			const results = [];
			const originalSectorSize = this.sectorSize;

			// Test a range of sector sizes
			const testSizes = [100, 150, 200, 250, 300, 350, 400];

			for (const size of testSizes) {
				// Set the sector size
				this.sectorSize = size;
				this.initializeSpatialGrid();

				// Run a mini benchmark
				const benchmarkResult = await this.benchmarkSpatialPartitioning(50);
				results.push({
					sectorSize: size,
					...benchmarkResult
				});

				// Short pause to let the browser breathe
				await new Promise((r) => setTimeout(r, 100));
			}

			// Find the size with the best performance
			let bestSize = originalSectorSize;
			let bestImprovement = 0;

			for (const result of results) {
				if (result.performanceImprovement > bestImprovement) {
					bestImprovement = result.performanceImprovement;
					bestSize = result.sectorSize;
				}
			}

			// Restore the best size
			this.sectorSize = bestSize;
			this.initializeSpatialGrid();

			// Return all results and the best size
			resolve({
				bestSectorSize: bestSize,
				bestPerformanceImprovement: bestImprovement,
				allResults: results
			});
		});
	}

	// Method to calculate optimal sector size based on star density
	private calculateOptimalSectorSize(): number {
		// A good heuristic is to aim for 10-20 stars per sector for a balance
		// between having too many sectors (overhead) and too few (no partitioning benefit)
		const optimalStarsPerSector = 15;

		// Calculate total area and density
		const totalArea = this.containerWidth * this.containerHeight;
		const starDensity = this.stars.length / totalArea;

		// Calculate the area each sector should have to contain optimal number of stars
		const optimalSectorArea = optimalStarsPerSector / starDensity;

		// Convert to a square dimension
		let optimalSize = Math.sqrt(optimalSectorArea);

		// Constrain to reasonable limits
		optimalSize = Math.max(this.sectorSizeMin, Math.min(this.sectorSizeMax, optimalSize));

		// Round to nearest multiple of 50 for cleaner grid
		return Math.round(optimalSize / 50) * 50;
	}

	// Add a toggle method for adaptive sector sizing
	public setAdaptiveSectorSizing(enable: boolean): void {
		this.sectorSizeAdaptive = enable;

		if (enable && this.enableSpatialPartitioning) {
			// Calculate and set optimal sector size immediately
			this.sectorSize = this.calculateOptimalSectorSize();
			this.initializeSpatialGrid();
		}
	}

	// Add a method to export performance data for visualization
	public exportPerformanceData(): any {
		return {
			spatialPartitioning: {
				enabled: this.enableSpatialPartitioning,
				adaptiveSizing: this.sectorSizeAdaptive,
				currentSectorSize: this.sectorSize,
				visibleSectors: this.visibleSectorsCache.size,
				totalSectors: this.spatialGrid ? this.spatialGrid.sectors.size : 0,
				starCounts: this.getStarDistributionData(),
				performanceMetrics: {
					...this.spatialPartitioningMetrics,
					fps: this.renderStats.fps,
					starsRendered: this.renderStats.starsRendered,
					estimatedCpuSavings: this.renderStats.spatialPartitioning
						? this.renderStats.spatialPartitioning.estimatedCpuSavings
						: 0
				}
			}
		};
	}

	// Helper method to get star distribution data
	private getStarDistributionData(): any {
		if (!this.spatialGrid) return { max: 0, average: 0, distribution: [] };

		const distribution: number[] = [];
		let total = 0;
		let max = 0;
		let sectorCount = 0;

		this.spatialGrid.sectors.forEach((sector) => {
			const count = sector.stars.length;
			distribution.push(count);
			total += count;
			max = Math.max(max, count);
			sectorCount++;
		});

		return {
			max,
			average: total / Math.max(1, sectorCount),
			distribution
		};
	}

	adaptToDeviceCapabilities(capabilities: DeviceCapabilities) {
		if (!browser) return;

		// Update star count based on device capabilities
		if (capabilities.maxStars && capabilities.maxStars !== this.starCount) {
			this.setStarCount(capabilities.maxStars);
		}

		// Update effects based on device capabilities
		this.enableGlow = capabilities.enableGlow && this.enableGlow;
		this.useSimpleRender = capabilities.tier === 'low' || this.isSafari;

		// Adjust worker usage
		if (capabilities.tier === 'low') {
			this.setUseWorker(false);
		}

		// Adjust parallax usage
		this.enableParallax = capabilities.enableParallax && this.enableParallax;

		// Update worker config if using one
		if (this.useWorker && this.worker) {
			this.worker.postMessage({
				type: 'updateConfig',
				data: {
					config: {
						starCount: this.starCount
					}
				}
			});
		}
	}

	// Use weak references for event callbacks
	private setupEventListeners() {
		if (!browser) return;

		// Store weak references to handlers
		// WeakRef allows garbage collection of the referenced object when it's no longer used elsewhere
		this.resizeHandler = new WeakRef(this.handleResize.bind(this));
		this.visibilityHandler = new WeakRef(this.handleVisibilityChange.bind(this));

		// Add event listeners
		window.addEventListener('resize', this.resizeHandler.deref());
		document.addEventListener('visibilitychange', this.visibilityHandler.deref());
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

		// Clean up the star pool
		if (this.starPool) {
			this.starPool.releaseAll();
			this.starPool = null;
		}

		// Clean up event listeners
		if (this.eventManager) {
			this.eventManager.clearAll();
			this.eventManager = null;
		}

		// Clean up resize observer
		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
			this.resizeObserver = null;
		}

		// Important: Nullify context first (important for memory cleanup)
		this.ctx = null;

		// Remove canvas element
		if (this.canvas && this.canvas.parentNode) {
			this.canvas.parentNode.removeChild(this.canvas);
			this.canvas = null; // Nullify after removal
		}

		// Clear all references to DOM elements
		this.container = null;

		// Clear data structures
		this.stars = [];

		// Clean up spatial partitioning data
		this.spatialGrid = null;
		this.visibleSectorsCache.clear();

		// Clear any remaining timeouts or intervals
		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}

		// Clear all handlers
		this.resizeHandler = null;
		this.visibilityHandler = null;
		this.workerCommunicationHandler = null;

		// Force garbage collection hint
		if (browser && (window as any).gc) {
			try {
				(window as any).gc();
			} catch (e) {
				// Ignore errors in garbage collection
			}
		}

		// Remove event listeners using the weak references
		if (this.resizeHandler) {
			const handler = this.resizeHandler.deref();
			if (handler) {
				window.removeEventListener('resize', handler);
			}
		}

		if (this.visibilityHandler) {
			const handler = this.visibilityHandler.deref();
			if (handler) {
				document.removeEventListener('visibilitychange', handler);
			}
		}

		// Clear references
		this.resizeHandler = null;
		this.visibilityHandler = null;
	}

	// Spatial Partitioning Methods

	// Add this method to initialize the spatial grid
	private initializeSpatialGrid(): void {
		if (!this.containerWidth || !this.containerHeight) return;

		// Calculate grid dimensions based on container size
		const gridWidth = Math.ceil(this.containerWidth / this.sectorSize) + 2; // Add buffer zones
		const gridHeight = Math.ceil(this.containerHeight / this.sectorSize) + 2;

		// Create the grid structure
		this.spatialGrid = {
			sectors: new Map<string, SpatialSector>(),
			sectorSize: this.sectorSize,
			gridWidth,
			gridHeight
		};

		// Initialize all sectors (only create them as needed to save memory)
		this.updateVisibleSectors();

		// Assign all stars to their initial sectors
		this.assignStarsToSectors(true); // force rebuild
	}

	// Add this method to assign stars to sectors
	private assignStarsToSectors(forceRebuild = false): void {
		if (!this.spatialGrid || !this.enableSpatialPartitioning) return;

		const currentTime = performance.now();

		// Only rebuild grid periodically or when forced to save CPU
		if (!forceRebuild && currentTime - this.lastGridRebuildTime < this.gridRebuildInterval) {
			// Just update existing assignments without full rebuild
			this.updateStarSectorAssignments();
			return;
		}

		this.lastGridRebuildTime = currentTime;

		// Clear all existing sector assignments
		this.spatialGrid.sectors.forEach((sector) => {
			sector.stars = [];
		});

		// Assign each star to its appropriate sector
		for (let i = 0; i < this.stars.length; i++) {
			const star = this.stars[i];
			const sectorId = this.getSectorIdForPosition(star.x, star.y);

			// Get or create the sector
			let sector = this.spatialGrid.sectors.get(sectorId);
			if (!sector) {
				const sectorX = Math.floor(star.x / this.sectorSize);
				const sectorY = Math.floor(star.y / this.sectorSize);

				sector = {
					id: sectorId,
					x: sectorX,
					y: sectorY,
					stars: [],
					isVisible: this.visibleSectorsCache.has(sectorId)
				};

				this.spatialGrid.sectors.set(sectorId, sector);
			}

			// Add star to the sector
			sector.stars.push(star);

			// Update star's sector ID
			star.sectorId = sectorId;
		}
	}

	// Method to update star sector assignments (lighter than full rebuild)
	private updateStarSectorAssignments(): void {
		if (!this.spatialGrid || !this.enableSpatialPartitioning) return;

		for (let i = 0; i < this.stars.length; i++) {
			const star = this.stars[i];
			const sectorId = this.getSectorIdForPosition(star.x, star.y);

			// Check if star's sector has changed
			const currentSectorId = star.sectorId;
			if (currentSectorId !== sectorId) {
				// Remove from old sector if it exists
				if (currentSectorId) {
					const oldSector = this.spatialGrid.sectors.get(currentSectorId);
					if (oldSector) {
						const index = oldSector.stars.indexOf(star);
						if (index !== -1) {
							oldSector.stars.splice(index, 1);
						}
					}
				}

				// Add to new sector
				let newSector = this.spatialGrid.sectors.get(sectorId);
				if (!newSector) {
					const sectorX = Math.floor(star.x / this.sectorSize);
					const sectorY = Math.floor(star.y / this.sectorSize);

					newSector = {
						id: sectorId,
						x: sectorX,
						y: sectorY,
						stars: [],
						isVisible: this.visibleSectorsCache.has(sectorId)
					};

					this.spatialGrid.sectors.set(sectorId, newSector);
				}

				newSector.stars.push(star);

				// Update star's sector id
				star.sectorId = sectorId;
			}
		}
	}

	// Add this method to determine which sectors are currently visible
	private updateVisibleSectors(): void {
		if (!this.spatialGrid || !this.containerWidth || !this.containerHeight) return;

		// Clear the current cache of visible sectors
		this.visibleSectorsCache.clear();

		// Calculate the range of visible sectors with buffer
		const startSectorX = Math.floor(-this.sectorSize / this.containerWidth) - 1;
		const endSectorX = Math.ceil(this.containerWidth / this.sectorSize) + 1;
		const startSectorY = Math.floor(-this.sectorSize / this.containerHeight) - 1;
		const endSectorY = Math.ceil(this.containerHeight / this.sectorSize) + 1;

		// Mark sectors as visible
		for (let x = startSectorX; x <= endSectorX; x++) {
			for (let y = startSectorY; y <= endSectorY; y++) {
				const sectorId = `${x},${y}`;
				this.visibleSectorsCache.add(sectorId);

				// Update existing sector visibility if it exists
				const sector = this.spatialGrid.sectors.get(sectorId);
				if (sector) {
					sector.isVisible = true;
				}
			}
		}

		// Update all other sectors as not visible
		this.spatialGrid.sectors.forEach((sector) => {
			if (!this.visibleSectorsCache.has(sector.id)) {
				sector.isVisible = false;
			}
		});
	}

	// Helper method to get sector ID for a position
	private getSectorIdForPosition(x: number, y: number): string {
		if (!this.spatialGrid) return '0,0';
		const sectorX = Math.floor(x / this.sectorSize);
		const sectorY = Math.floor(y / this.sectorSize);
		return `${sectorX},${sectorY}`;
	}

	// Drawing methods for spatial partitioning
	private drawStarsWithPartitioning(): void {
		if (!this.ctx || !this.spatialGrid) return;

		const centerX = this.containerWidth / 2;
		const centerY = this.containerHeight / 2;

		// Pre-sort stars by color and size to batch similar operations
		const starsByColor = new Map<string, RenderedStar[]>();
		let totalStarsRendered = 0;

		// Only process stars in visible sectors
		this.spatialGrid.sectors.forEach((sector) => {
			if (!sector.isVisible) return; // Skip non-visible sectors

			// Group stars by color/rendering mode
			for (let i = 0; i < sector.stars.length; i++) {
				const star = sector.stars[i];

				// Project coordinates
				const scale = this.maxDepth / star.z;
				const x2d = (star.x - centerX) * scale + centerX;
				const y2d = (star.y - centerY) * scale + centerY;

				// Skip offscreen stars - an additional check for boundary cases
				if (
					x2d < -10 ||
					x2d >= this.containerWidth + 10 ||
					y2d < -10 ||
					y2d >= this.containerHeight + 10
				) {
					continue;
				}

				totalStarsRendered++;

				// Calculate size and color only once
				const size = (1 - star.z / this.maxDepth) * 3;
				const colorIndex = Math.floor((1 - star.z / this.maxDepth) * (this.starColors.length - 1));
				const color = this.starColors[colorIndex];

				// Group by rendering mode and color
				const key = this.speed > this.baseSpeed * 1.5 ? 'trail_' + color : 'circle_' + color;

				if (!starsByColor.has(key)) {
					starsByColor.set(key, []);
				}

				// Store calculated values to avoid recalculating
				starsByColor.get(key)?.push({
					x2d,
					y2d,
					size,
					prevX: star.prevX,
					prevY: star.prevY,
					z: star.z
				});
			}
		});

		// Track stars drawn for performance monitoring
		this.renderStats.starsRendered = totalStarsRendered;

		// Draw stars grouped by color/mode to minimize context changes
		starsByColor.forEach((stars, key) => {
			const isTrail = key.startsWith('trail_');
			const color = key.substring(key.indexOf('_') + 1);

			// Set style only once per batch
			if (isTrail) {
				this.ctx!.strokeStyle = color;
			} else {
				this.ctx!.fillStyle = color;
			}

			// Begin a single path for all stars of same color
			this.ctx!.beginPath();

			for (const star of stars) {
				if (isTrail) {
					const prevScale = this.maxDepth / (star.z + this.speed);
					const prevX = (star.prevX - centerX) * prevScale + centerX;
					const prevY = (star.prevY - centerY) * prevScale + centerY;

					this.ctx!.lineWidth = star.size;
					this.ctx!.moveTo(prevX, prevY);
					this.ctx!.lineTo(star.x2d, star.y2d);
				} else {
					// Add circle to the current path
					this.ctx!.moveTo(star.x2d + star.size, star.y2d);
					this.ctx!.arc(star.x2d, star.y2d, star.size, 0, Math.PI * 2);
				}
			}

			// Draw all stars of this type at once
			if (isTrail) {
				this.ctx!.stroke();
			} else {
				this.ctx!.fill();
			}
		});
	}

	// Simple render version with spatial partitioning
	private drawStarsSimpleWithPartitioning(): void {
		if (!this.ctx || !this.spatialGrid) return;

		// Mobile-optimized rendering with simpler effects
		const centerX = this.containerWidth / 2;
		const centerY = this.containerHeight / 2;

		// Draw all stars with a single color to reduce context switches
		this.ctx.fillStyle = '#ffffff';
		this.ctx.beginPath();

		let totalStarsRendered = 0;

		// Only process stars in visible sectors
		this.spatialGrid.sectors.forEach((sector) => {
			if (!sector.isVisible) return; // Skip non-visible sectors

			for (let i = 0; i < sector.stars.length; i++) {
				const star = sector.stars[i];

				// Project 3D position to 2D screen coordinates
				const scale = this.maxDepth / star.z;
				const x2d = (star.x - centerX) * scale + centerX;
				const y2d = (star.y - centerY) * scale + centerY;

				// Skip offscreen stars
				if (x2d < 0 || x2d >= this.containerWidth || y2d < 0 || y2d >= this.containerHeight) {
					continue;
				}

				totalStarsRendered++;

				// Simpler sizing for mobile
				const size = (1 - star.z / this.maxDepth) * 2;

				// Use rectangle for better performance
				this.ctx.rect(x2d - size / 2, y2d - size / 2, size, size);
			}
		});

		// Track stars drawn for performance monitoring
		this.renderStats.starsRendered = totalStarsRendered;

		// Single fill call for all stars
		this.ctx.fill();
	}

	// High DPI version with spatial partitioning
	private drawStarsHighDPIWithPartitioning(): void {
		if (!this.ctx || !this.spatialGrid) return;

		// Enhanced rendering for high-DPI displays
		const centerX = this.containerWidth / 2;
		const centerY = this.containerHeight / 2;

		// Use standard drawing method but with more detail
		const starsByColor = new Map<string, RenderedStar[]>();
		let totalStarsRendered = 0;

		// Only process stars in visible sectors
		this.spatialGrid.sectors.forEach((sector) => {
			if (!sector.isVisible) return; // Skip non-visible sectors

			// Group stars by color/rendering mode
			for (let i = 0; i < sector.stars.length; i++) {
				const star = sector.stars[i];

				// Project coordinates
				const scale = this.maxDepth / star.z;
				const x2d = (star.x - centerX) * scale + centerX;
				const y2d = (star.y - centerY) * scale + centerY;

				// Skip offscreen stars
				if (x2d < 0 || x2d >= this.containerWidth || y2d < 0 || y2d >= this.containerHeight) {
					continue;
				}

				totalStarsRendered++;

				// Calculate size and color with more detail for high DPI
				const size = (1 - star.z / this.maxDepth) * 4; // Slightly larger stars for high DPI
				const colorIndex = Math.floor((1 - star.z / this.maxDepth) * (this.starColors.length - 1));
				const color = this.starColors[colorIndex];

				// Group by rendering mode and color
				const key = this.speed > this.baseSpeed * 1.5 ? 'trail_' + color : 'circle_' + color;

				if (!starsByColor.has(key)) {
					starsByColor.set(key, []);
				}

				// Store calculated values
				starsByColor.get(key)?.push({
					x2d,
					y2d,
					size,
					prevX: star.prevX,
					prevY: star.prevY,
					z: star.z
				});
			}
		});

		// Track stars drawn for performance monitoring
		this.renderStats.starsRendered = totalStarsRendered;

		// Draw stars grouped by color/mode with enhanced quality
		starsByColor.forEach((stars, key) => {
			const isTrail = key.startsWith('trail_');
			const color = key.substring(key.indexOf('_') + 1);

			if (isTrail) {
				// For trails, use individual paths with enhanced quality
				this.ctx!.strokeStyle = color;

				for (const star of stars) {
					const prevScale = this.maxDepth / (star.z + this.speed);
					const prevX = (star.prevX - centerX) * prevScale + centerX;
					const prevY = (star.prevY - centerY) * prevScale + centerY;

					// Add glow effect for high DPI displays
					if (this.enableGlow) {
						// Create glow effect
						this.ctx!.shadowColor = color;
						this.ctx!.shadowBlur = star.size * 2;
					}

					this.ctx!.beginPath();
					this.ctx!.lineWidth = star.size;
					this.ctx!.moveTo(prevX, prevY);
					this.ctx!.lineTo(star.x2d, star.y2d);
					this.ctx!.stroke();
				}

				// Reset shadow for next batch
				if (this.enableGlow) {
					this.ctx!.shadowColor = 'transparent';
					this.ctx!.shadowBlur = 0;
				}
			} else {
				// For circles, use batched path with glow for brightest stars
				this.ctx!.fillStyle = color;

				// Separate larger stars for glow effect
				const largeStars = stars.filter((s) => s.size > 2);
				const smallStars = stars.filter((s) => s.size <= 2);

				// Draw small stars in one batch without glow
				if (smallStars.length > 0) {
					this.ctx!.beginPath();
					for (const star of smallStars) {
						this.ctx!.moveTo(star.x2d + star.size, star.y2d);
						this.ctx!.arc(star.x2d, star.y2d, star.size, 0, Math.PI * 2);
					}
					this.ctx!.fill();
				}

				// Draw large stars individually with glow
				if (largeStars.length > 0 && this.enableGlow) {
					for (const star of largeStars) {
						this.ctx!.shadowColor = color;
						this.ctx!.shadowBlur = star.size * 1.5;

						this.ctx!.beginPath();
						this.ctx!.moveTo(star.x2d + star.size, star.y2d);
						this.ctx!.arc(star.x2d, star.y2d, star.size, 0, Math.PI * 2);
						this.ctx!.fill();
					}

					// Reset shadow
					this.ctx!.shadowColor = 'transparent';
					this.ctx!.shadowBlur = 0;
				} else if (largeStars.length > 0) {
					// Draw large stars without glow
					this.ctx!.beginPath();
					for (const star of largeStars) {
						this.ctx!.moveTo(star.x2d + star.size, star.y2d);
						this.ctx!.arc(star.x2d, star.y2d, star.size, 0, Math.PI * 2);
					}
					this.ctx!.fill();
				}
			}
		});
	}

	// Add debug rendering method to visualize the grid (for development)
	private renderDebugGrid(): void {
		if (!this.ctx || !this.spatialGrid) return;

		// Save context state
		this.ctx.save();

		// Style for grid lines
		this.ctx.strokeStyle = 'rgba(100, 100, 255, 0.3)';
		this.ctx.lineWidth = 1;

		// Draw vertical grid lines
		for (let x = 0; x <= this.spatialGrid.gridWidth; x++) {
			const posX = x * this.spatialGrid.sectorSize;
			this.ctx.beginPath();
			this.ctx.moveTo(posX, 0);
			this.ctx.lineTo(posX, this.containerHeight);
			this.ctx.stroke();
		}

		// Draw horizontal grid lines
		for (let y = 0; y <= this.spatialGrid.gridHeight; y++) {
			const posY = y * this.spatialGrid.sectorSize;
			this.ctx.beginPath();
			this.ctx.moveTo(0, posY);
			this.ctx.lineTo(this.containerWidth, posY);
			this.ctx.stroke();
		}

		// Highlight visible sectors
		this.ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
		this.spatialGrid.sectors.forEach((sector) => {
			if (sector.isVisible) {
				const x = sector.x * this.spatialGrid.sectorSize;
				const y = sector.y * this.spatialGrid.sectorSize;
				this.ctx.fillRect(x, y, this.spatialGrid.sectorSize, this.spatialGrid.sectorSize);

				// Add star count labels
				this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
				this.ctx.font = '10px Arial';
				this.ctx.fillText(`Stars: ${sector.stars.length}`, x + 5, y + 15);
				this.ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
			}
		});

		// Restore context state
		this.ctx.restore();
	}

	// Add this method to enable/disable spatial partitioning
	public setSpatialPartitioning(enable: boolean): void {
		if (this.enableSpatialPartitioning === enable) return;

		this.enableSpatialPartitioning = enable;

		if (enable && !this.spatialGrid) {
			this.initializeSpatialGrid();
		} else if (!enable) {
			// Clean up the spatial grid to free memory
			this.spatialGrid = null;
			this.visibleSectorsCache.clear();

			// Clear sector IDs from stars
			for (let i = 0; i < this.stars.length; i++) {
				delete this.stars[i].sectorId;
			}
		}
	}

	// Method to dynamically adjust sector size based on performance
	private adaptSectorSize(): void {
		if (!this.spatialGrid || !this.sectorSizeAdaptive) return;

		// Calculate the average number of stars per visible sector
		let totalStarsInVisibleSectors = 0;
		let visibleSectorCount = 0;

		this.spatialGrid.sectors.forEach((sector) => {
			if (sector.isVisible) {
				totalStarsInVisibleSectors += sector.stars.length;
				visibleSectorCount++;
			}
		});

		const avgStarsPerSector =
			visibleSectorCount > 0 ? totalStarsInVisibleSectors / visibleSectorCount : 0;

		// Adjust sector size based on average density
		// If we have too many stars per sector, make sectors smaller
		// If we have too few stars per sector, make sectors larger
		if (avgStarsPerSector > this.sectorStarThreshold * 2) {
			// Too many stars per sector - reduce sector size
			this.sectorSize = Math.max(this.sectorSizeMin, this.sectorSize * 0.8);
			this.initializeSpatialGrid(); // Rebuild grid with new size
		} else if (avgStarsPerSector < this.sectorStarThreshold / 2) {
			// Too few stars per sector - increase sector size
			this.sectorSize = Math.min(this.sectorSizeMax, this.sectorSize * 1.2);
			this.initializeSpatialGrid(); // Rebuild grid with new size
		}
	}

	// Method to benchmark partitioning performance
	public benchmarkSpatialPartitioning(sampleCount = 100): Promise<any> {
		return new Promise((resolve) => {
			if (!browser) {
				resolve({ error: 'Benchmarking only available in browser environment' });
				return;
			}

			// Reset metrics
			this.spatialPartitioningMetrics = {
				frameTimeWithPartitioning: 0,
				frameTimeWithoutPartitioning: 0,
				sampleCount: 0,
				performanceImprovement: 0
			};

			let samplesCollected = 0;
			const maxSamples = sampleCount;

			// Function to collect a benchmark sample
			const collectSample = () => {
				// Measure frame time with partitioning
				this.setSpatialPartitioning(true);
				let startTime = performance.now();
				this.renderFrame(true); // Force render a frame
				let endTime = performance.now();
				this.spatialPartitioningMetrics.frameTimeWithPartitioning += endTime - startTime;

				// Measure frame time without partitioning
				this.setSpatialPartitioning(false);
				startTime = performance.now();
				this.renderFrame(true); // Force render a frame
				endTime = performance.now();
				this.spatialPartitioningMetrics.frameTimeWithoutPartitioning += endTime - startTime;

				// Restore original setting
				this.setSpatialPartitioning(true);

				// Increment counter
				samplesCollected++;
				this.spatialPartitioningMetrics.sampleCount = samplesCollected;

				// Calculate improvement ratio
				const withPartitioning =
					this.spatialPartitioningMetrics.frameTimeWithPartitioning / samplesCollected;
				const withoutPartitioning =
					this.spatialPartitioningMetrics.frameTimeWithoutPartitioning / samplesCollected;

				if (withoutPartitioning > 0) {
					this.spatialPartitioningMetrics.performanceImprovement =
						(withoutPartitioning - withPartitioning) / withoutPartitioning;
				}

				// Continue sampling or resolve
				if (samplesCollected < maxSamples) {
					// Use requestAnimationFrame to spread measurements across frames
					requestAnimationFrame(collectSample);
				} else {
					// Calculate final metrics
					const finalMetrics = {
						avgFrameTimeWithPartitioning:
							this.spatialPartitioningMetrics.frameTimeWithPartitioning / maxSamples,
						avgFrameTimeWithoutPartitioning:
							this.spatialPartitioningMetrics.frameTimeWithoutPartitioning / maxSamples,
						performanceImprovement: this.spatialPartitioningMetrics.performanceImprovement,
						sampleCount: maxSamples,
						starCount: this.stars.length,
						sectorSize: this.sectorSize,
						visibleSectors: this.visibleSectorsCache.size,
						totalSectors: this.spatialGrid ? this.spatialGrid.sectors.size : 0,
						processingRatio: this.renderStats.spatialPartitioning
							? this.renderStats.spatialPartitioning.processingRatio
							: 1
					};

					resolve(finalMetrics);
				}
			};

			// Start sampling
			collectSample();
		});
	}

	// Helper method to force a frame render for benchmarking
	private renderFrame(skipAnimationLoop = false): void {
		if (!this.ctx || !this.canvas) return;

		const timestamp = performance.now();
		const deltaTime = timestamp - this.lastTime;
		this.lastTime = timestamp;

		// Clear canvas
		this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
		this.ctx.fillRect(0, 0, this.containerWidth, this.containerHeight);

		// Update stars
		if (!this.useWorker) {
			this.updateStars(deltaTime / 16.7);
		}

		// Update spatial grid
		if (this.enableSpatialPartitioning && this.spatialGrid) {
			this.updateVisibleSectors();
			this.assignStarsToSectors();
		}

		// Draw stars
		if (this.enableSpatialPartitioning && this.spatialGrid) {
			if (this.useSimpleRender) {
				this.drawStarsSimpleWithPartitioning();
			} else if (this.highDpiMode && !this.isSafari) {
				this.drawStarsHighDPIWithPartitioning();
			} else {
				this.drawStarsWithPartitioning();
			}
		} else {
			if (this.useSimpleRender) {
				this.drawStarsSimple();
			} else if (this.highDpiMode && !this.isSafari) {
				this.drawStarsHighDPI();
			} else {
				this.drawStars();
			}
		}
	}

	// Add utility method to find optimal sector size
	public findOptimalSectorSize(): Promise<any> {
		return new Promise(async (resolve) => {
			if (!browser) {
				resolve({ error: 'Optimization only available in browser environment' });
				return;
			}

			const results = [];
			const originalSectorSize = this.sectorSize;

			// Test a range of sector sizes
			const testSizes = [100, 150, 200, 250, 300, 350, 400];

			for (const size of testSizes) {
				// Set the sector size
				this.sectorSize = size;
				this.initializeSpatialGrid();

				// Run a mini benchmark
				const benchmarkResult = await this.benchmarkSpatialPartitioning(50);
				results.push({
					sectorSize: size,
					...benchmarkResult
				});

				// Short pause to let the browser breathe
				await new Promise((r) => setTimeout(r, 100));
			}

			// Find the size with the best performance
			let bestSize = originalSectorSize;
			let bestImprovement = 0;

			for (const result of results) {
				if (result.performanceImprovement > bestImprovement) {
					bestImprovement = result.performanceImprovement;
					bestSize = result.sectorSize;
				}
			}

			// Restore the best size
			this.sectorSize = bestSize;
			this.initializeSpatialGrid();

			// Return all results and the best size
			resolve({
				bestSectorSize: bestSize,
				bestPerformanceImprovement: bestImprovement,
				allResults: results
			});
		});
	}

	// Method to calculate optimal sector size based on star density
	private calculateOptimalSectorSize(): number {
		// A good heuristic is to aim for 10-20 stars per sector for a balance
		// between having too many sectors (overhead) and too few (no partitioning benefit)
		const optimalStarsPerSector = 15;

		// Calculate total area and density
		const totalArea = this.containerWidth * this.containerHeight;
		const starDensity = this.stars.length / totalArea;

		// Calculate the area each sector should have to contain optimal number of stars
		const optimalSectorArea = optimalStarsPerSector / starDensity;

		// Convert to a square dimension
		let optimalSize = Math.sqrt(optimalSectorArea);

		// Constrain to reasonable limits
		optimalSize = Math.max(this.sectorSizeMin, Math.min(this.sectorSizeMax, optimalSize));

		// Round to nearest multiple of 50 for cleaner grid
		return Math.round(optimalSize / 50) * 50;
	}

	// Add a toggle method for adaptive sector sizing
	public setAdaptiveSectorSizing(enable: boolean): void {
		this.sectorSizeAdaptive = enable;

		if (enable && this.enableSpatialPartitioning) {
			// Calculate and set optimal sector size immediately
			this.sectorSize = this.calculateOptimalSectorSize();
			this.initializeSpatialGrid();
		}
	}

	// Add a method to export performance data for visualization
	public exportPerformanceData(): any {
		return {
			spatialPartitioning: {
				enabled: this.enableSpatialPartitioning,
				adaptiveSizing: this.sectorSizeAdaptive,
				currentSectorSize: this.sectorSize,
				visibleSectors: this.visibleSectorsCache.size,
				totalSectors: this.spatialGrid ? this.spatialGrid.sectors.size : 0,
				starCounts: this.getStarDistributionData(),
				performanceMetrics: {
					...this.spatialPartitioningMetrics,
					fps: this.renderStats.fps,
					starsRendered: this.renderStats.starsRendered,
					estimatedCpuSavings: this.renderStats.spatialPartitioning
						? this.renderStats.spatialPartitioning.estimatedCpuSavings
						: 0
				}
			}
		};
	}

	// Helper method to get star distribution data
	private getStarDistributionData(): any {
		if (!this.spatialGrid) return { max: 0, average: 0, distribution: [] };

		const distribution: number[] = [];
		let total = 0;
		let max = 0;
		let sectorCount = 0;

		this.spatialGrid.sectors.forEach((sector) => {
			const count = sector.stars.length;
			distribution.push(count);
			total += count;
			max = Math.max(max, count);
			sectorCount++;
		});

		return {
			max,
			average: total / Math.max(1, sectorCount),
			distribution
		};
	}
}

// Helper class for event management
class EventManager {
	private listeners: Map<string, Map<EventListener, EventListener>> = new Map();

	constructor() {
		if (!browser) return;
	}

	// Add event listener with automatic tracking
	public add(
		target: EventTarget,
		type: string,
		callback: EventListener,
		options?: boolean | AddEventListenerOptions
	) {
		if (!browser || !target) return this;

		// Store the listener for later removal
		if (!this.listeners.has(type)) {
			this.listeners.set(type, new Map());
		}

		this.listeners.get(type)?.set(callback, callback);
		target.addEventListener(type, callback, options);

		return this;
	}

	// Remove specific event listener
	public remove(target: EventTarget, type: string, callback: EventListener) {
		if (!browser || !target) return this;

		const typeListeners = this.listeners.get(type);
		if (typeListeners && typeListeners.has(callback)) {
			target.removeEventListener(type, callback);
			typeListeners.delete(callback);
		}

		return this;
	}

	// Remove all listeners of a specific type
	public removeAll(target: EventTarget, type?: string) {
		if (!browser || !target) return this;

		if (type) {
			// Remove all listeners of specific type
			const typeListeners = this.listeners.get(type);
			if (typeListeners) {
				typeListeners.forEach((callback) => {
					target.removeEventListener(type, callback);
				});
				this.listeners.delete(type);
			}
		} else {
			// Remove all listeners of all types
			this.listeners.forEach((typeListeners, listenerType) => {
				typeListeners.forEach((callback) => {
					target.removeEventListener(listenerType, callback);
				});
			});
			this.listeners.clear();
		}

		return this;
	}

	// Clear all tracked listeners
	public clearAll() {
		this.listeners.clear();
	}
}

// Helper function for RAF-based throttling
function createThrottledRAF<T extends (...args: any[]) => void>(callback: T): T {
	let ticking = false;

	const throttled = ((...args: any[]) => {
		if (!ticking) {
			requestAnimationFrame(() => {
				callback(...args);
				ticking = false;
			});
			ticking = true;
		}
	}) as T;

	return throttled;
}

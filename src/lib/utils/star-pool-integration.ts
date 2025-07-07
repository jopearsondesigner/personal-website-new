// src/lib/utils/star-pool-integration.ts
import { browser } from '$app/environment';
import { StarPool } from './star-pool';
import { StarRenderer } from './star-renderer';
import { DirtyRectangleTracker } from './dirty-rectangle-tracker';
import { canvasPoolManager } from './canvas-pool-manager';
import { starPoolBridge } from './star-pool-bridge';
import type { StarPoolObject } from './star-pool';
import type { DirtyRegion } from './dirty-rectangle-tracker';

/**
 * Enhanced star object with pooling capabilities
 */
export interface PooledStar extends StarPoolObject {
	// Core position and movement
	x: number;
	y: number;
	z: number;
	prevX: number;
	prevY: number;

	// Rendering properties
	size: number;
	color: string;
	alpha: number;

	// Movement and physics
	velocity: { x: number; y: number; z: number };
	acceleration: { x: number; y: number; z: number };

	// Visual effects
	glowRadius: number;
	trailLength: number;
	brightness: number;

	// State management
	isVisible: boolean;
	isDirty: boolean;
	lastRenderTime: number;

	// Optimization flags
	skipTrail: boolean;
	skipGlow: boolean;
	batchGroup: number;

	// Lifecycle
	age: number;
	maxAge: number;

	// Pool management (inherited from StarPoolObject)
	// inUse: boolean;
	// poolIndex?: number;
	// lastAccessTime?: number;
}

/**
 * Configuration for star pool integration
 */
interface StarPoolConfig {
	initialCapacity: number;
	maxCapacity: number;
	starColors: string[];
	enableTrails: boolean;
	enableGlow: boolean;
	maxDepth: number;
	baseSpeed: number;
	boostSpeed: number;
	qualityScaling: boolean;
}

/**
 * Performance metrics for star pool
 */
interface PoolPerformanceMetrics {
	starsActive: number;
	starsVisible: number;
	poolUtilization: number;
	renderTime: number;
	updateTime: number;
	memoryUsed: number;
	reuseRatio: number;
}

/**
 * Integrates object pooling with star field rendering for optimal performance
 * Manages star lifecycle, rendering batching, and memory optimization
 */
export class StarPoolIntegration {
	private starPool: StarPool<PooledStar>;
	private renderer: StarRenderer | null = null;
	private dirtyTracker: DirtyRectangleTracker | null = null;
	private config: StarPoolConfig;
	private activeStars: Map<number, PooledStar> = new Map();
	private starBatches: Map<string, PooledStar[]> = new Map();
	private nextStarId = 0;

	// Performance optimization
	private lastUpdateTime = 0;
	private frameSkipCounter = 0;
	private targetFrameTime = 16.67; // ~60fps
	private adaptiveQuality = 1.0;
	private performanceMetrics: PoolPerformanceMetrics;

	// Canvas management
	private canvasId: string;
	private canvasWidth = 0;
	private canvasHeight = 0;
	private devicePixelRatio = 1;

	// Update scheduling
	private updateScheduled = false;
	private renderScheduled = false;

	constructor(config: Partial<StarPoolConfig> = {}) {
		// Default configuration optimized for star field
		this.config = {
			initialCapacity: 500,
			maxCapacity: 2000,
			starColors: ['#000080', '#0066ff', '#00aaff', '#ffaa00', '#ffff00', '#ffffff'],
			enableTrails: true,
			enableGlow: true,
			maxDepth: 32,
			baseSpeed: 0.25,
			boostSpeed: 2.0,
			qualityScaling: true,
			...config
		};

		// Initialize performance metrics
		this.performanceMetrics = {
			starsActive: 0,
			starsVisible: 0,
			poolUtilization: 0,
			renderTime: 0,
			updateTime: 0,
			memoryUsed: 0,
			reuseRatio: 0
		};

		// Create star pool with optimized factory and reset functions
		this.starPool = new StarPool<PooledStar>(
			this.config.initialCapacity,
			() => this.createStar(),
			(star) => this.resetStar(star),
			{
				preAllocate: true,
				hibernationThreshold: 30000,
				statsReportThreshold: 10
			}
		);

		// Generate unique canvas ID
		this.canvasId = `starpool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		if (browser) {
			this.setupPerformanceMonitoring();
		}
	}

	/**
	 * Factory function to create new star objects
	 */
	private createStar(): PooledStar {
		const star: PooledStar = {
			// Position and movement
			x: 0,
			y: 0,
			z: 0,
			prevX: 0,
			prevY: 0,

			// Rendering
			size: 1,
			color: this.config.starColors[0],
			alpha: 1,

			// Physics
			velocity: { x: 0, y: 0, z: 0 },
			acceleration: { x: 0, y: 0, z: 0 },

			// Effects
			glowRadius: 0,
			trailLength: 0,
			brightness: 1,

			// State
			isVisible: false,
			isDirty: false,
			lastRenderTime: 0,

			// Optimization
			skipTrail: false,
			skipGlow: false,
			batchGroup: 0,

			// Lifecycle
			age: 0,
			maxAge: 10000, // 10 seconds default

			// Pool management
			inUse: false
		};

		// Report creation to bridge
		starPoolBridge.recordCreated(1);

		return star;
	}

	/**
	 * Reset function to prepare star for reuse
	 */
	private resetStar(star: PooledStar): void {
		// Reset position
		star.x = 0;
		star.y = 0;
		star.z = 0;
		star.prevX = 0;
		star.prevY = 0;

		// Reset rendering properties
		star.size = 1;
		star.color = this.config.starColors[0];
		star.alpha = 1;

		// Reset physics
		star.velocity.x = 0;
		star.velocity.y = 0;
		star.velocity.z = 0;
		star.acceleration.x = 0;
		star.acceleration.y = 0;
		star.acceleration.z = 0;

		// Reset effects
		star.glowRadius = 0;
		star.trailLength = 0;
		star.brightness = 1;

		// Reset state
		star.isVisible = false;
		star.isDirty = false;
		star.lastRenderTime = 0;

		// Reset optimization flags
		star.skipTrail = false;
		star.skipGlow = false;
		star.batchGroup = 0;

		// Reset lifecycle
		star.age = 0;
		star.maxAge = 10000;

		star.inUse = false;

		// Report reuse to bridge
		starPoolBridge.recordReused(1);
	}

	/**
	 * Initialize canvas and rendering components
	 */
	public initializeCanvas(
		containerElement: HTMLElement,
		width: number,
		height: number,
		devicePixelRatio: number = window.devicePixelRatio || 1
	): boolean {
		try {
			this.canvasWidth = width;
			this.canvasHeight = height;
			this.devicePixelRatio = devicePixelRatio;

			// Get canvas from pool manager
			const pooledCanvas = canvasPoolManager.getCanvas(
				width,
				height,
				devicePixelRatio,
				this.canvasId
			);

			// Append canvas to container
			if (containerElement && !containerElement.contains(pooledCanvas.canvas)) {
				containerElement.appendChild(pooledCanvas.canvas);
			}

			// Initialize renderer
			this.renderer = new StarRenderer(
				pooledCanvas.ctx,
				width,
				height,
				this.config.maxDepth,
				this.config.starColors,
				this.config.enableGlow,
				'standard', // render mode
				devicePixelRatio
			);

			// Initialize dirty rectangle tracker
			this.dirtyTracker = new DirtyRectangleTracker(width, height, {
				maxRegions: 100,
				mergeThreshold: 15,
				minimumRegionSize: 4,
				fullClearRatio: 0.7,
				priorityThreshold: 5
			});

			console.log(`✅ StarPoolIntegration canvas initialized: ${width}x${height}`);
			return true;
		} catch (error) {
			console.error('Failed to initialize StarPoolIntegration canvas:', error);
			return false;
		}
	}

	/**
	 * Create a new star with specified parameters
	 */
	public createStarAt(
		x: number,
		y: number,
		z: number = Math.random() * this.config.maxDepth
	): PooledStar | null {
		const star = this.starPool.get();

		if (!star) return null;

		// Initialize star properties
		star.x = x;
		star.y = y;
		star.z = z;
		star.prevX = x;
		star.prevY = y;

		// Set rendering properties based on depth
		const depthRatio = 1 - z / this.config.maxDepth;
		star.size = depthRatio * 3;

		// Select color based on depth
		const colorIndex = Math.floor(depthRatio * (this.config.starColors.length - 1));
		star.color = this.config.starColors[colorIndex];

		star.brightness = depthRatio;
		star.alpha = Math.max(0.3, depthRatio);

		// Set visual effects
		star.glowRadius = this.config.enableGlow ? star.size * 2 : 0;
		star.trailLength = this.config.enableTrails ? star.size * 4 : 0;

		// Quality scaling
		if (this.config.qualityScaling) {
			star.skipGlow = this.adaptiveQuality < 0.6;
			star.skipTrail = this.adaptiveQuality < 0.4;
		}

		// Set batch group for optimized rendering
		star.batchGroup = Math.floor(star.size);

		// Lifecycle
		star.age = 0;
		star.maxAge = 5000 + Math.random() * 10000; // 5-15 seconds
		star.isVisible = true;
		star.isDirty = true;

		// Store active star
		const starId = this.nextStarId++;
		this.activeStars.set(starId, star);

		return star;
	}

	/**
	 * Populate the star field with initial stars
	 */
	public populateStarField(starCount: number): void {
		const halfWidth = this.canvasWidth / 2;
		const halfHeight = this.canvasHeight / 2;

		for (let i = 0; i < starCount; i++) {
			const x = Math.random() * this.canvasWidth * 2 - halfWidth;
			const y = Math.random() * this.canvasHeight * 2 - halfHeight;
			const z = Math.random() * this.config.maxDepth;

			const star = this.createStarAt(x, y, z);
			if (star) {
				// Set initial velocity
				star.velocity.z = -this.config.baseSpeed;
			}
		}

		console.log(`🌟 Populated star field with ${this.activeStars.size} stars`);
	}

	/**
	 * Update all active stars
	 */
	public updateStars(deltaTime: number, speed: number = this.config.baseSpeed): void {
		if (this.updateScheduled) return;
		this.updateScheduled = true;

		const updateStart = performance.now();

		// Update each active star
		const starsToRemove: number[] = [];

		for (const [starId, star] of this.activeStars.entries()) {
			// Store previous position for dirty tracking
			star.prevX = star.x;
			star.prevY = star.y;

			// Update position
			star.z -= speed * deltaTime;

			// Age the star
			star.age += deltaTime;

			// Check if star should be removed
			if (star.z <= 0 || star.age > star.maxAge) {
				starsToRemove.push(starId);
				continue;
			}

			// Project to screen coordinates for visibility check
			const scale = this.config.maxDepth / star.z;
			const screenX = (star.x - this.canvasWidth / 2) * scale + this.canvasWidth / 2;
			const screenY = (star.y - this.canvasHeight / 2) * scale + this.canvasHeight / 2;

			// Update visibility
			const margin = 50; // Off-screen margin
			star.isVisible =
				screenX >= -margin &&
				screenX <= this.canvasWidth + margin &&
				screenY >= -margin &&
				screenY <= this.canvasHeight + margin;

			// Update size and alpha based on depth
			const depthRatio = 1 - star.z / this.config.maxDepth;
			star.size = depthRatio * 3 * this.adaptiveQuality;
			star.alpha = Math.max(0.3, depthRatio);

			// Mark as dirty if moved significantly
			const movement = Math.abs(star.x - star.prevX) + Math.abs(star.y - star.prevY);
			if (movement > 0.5) {
				star.isDirty = true;

				// Add to dirty tracker if visible
				if (star.isVisible && this.dirtyTracker) {
					this.dirtyTracker.addStarMovement(
						star.prevX,
						star.prevY,
						star.x,
						star.y,
						star.size,
						Math.floor(star.size) // Priority based on size
					);
				}
			}
		}

		// Remove expired stars and return to pool
		for (const starId of starsToRemove) {
			const star = this.activeStars.get(starId);
			if (star) {
				this.starPool.release(star);
				this.activeStars.delete(starId);
			}
		}

		// Create new stars to maintain count
		this.maintainStarCount();

		// Update performance metrics
		const updateTime = performance.now() - updateStart;
		this.performanceMetrics.updateTime = updateTime;
		this.performanceMetrics.starsActive = this.activeStars.size;

		// Update bridge stats
		starPoolBridge.updateActiveCount(this.activeStars.size, this.starPool.getTotalCount());

		this.updateScheduled = false;
	}

	/**
	 * Maintain target star count by creating new stars
	 */
	private maintainStarCount(): void {
		const targetCount = Math.floor(this.config.initialCapacity * this.adaptiveQuality);
		const currentCount = this.activeStars.size;

		if (currentCount < targetCount) {
			const starsNeeded = targetCount - currentCount;
			const halfWidth = this.canvasWidth / 2;
			const halfHeight = this.canvasHeight / 2;

			for (let i = 0; i < starsNeeded; i++) {
				const x = Math.random() * this.canvasWidth * 2 - halfWidth;
				const y = Math.random() * this.canvasHeight * 2 - halfHeight;
				const z = this.config.maxDepth * (0.8 + Math.random() * 0.2); // Start far back

				const star = this.createStarAt(x, y, z);
				if (star) {
					star.velocity.z = -this.config.baseSpeed;
				}
			}
		}
	}

	/**
	 * Render all visible stars using batched rendering
	 */
	public renderStars(): void {
		if (!this.renderer || this.renderScheduled) return;
		this.renderScheduled = true;

		const renderStart = performance.now();

		// Prepare star batches for optimized rendering
		this.prepareBatches();

		// Get visible stars
		const visibleStars = Array.from(this.activeStars.values()).filter((star) => star.isVisible);

		// Use renderer's optimized rendering
		if (visibleStars.length > 0) {
			// Convert to renderer format
			const renderedStars = visibleStars.map((star) => {
				const scale = this.config.maxDepth / star.z;
				const x2d = (star.x - this.canvasWidth / 2) * scale + this.canvasWidth / 2;
				const y2d = (star.y - this.canvasHeight / 2) * scale + this.canvasHeight / 2;

				const prevScale = this.config.maxDepth / (star.z + this.config.baseSpeed);
				const prevX2d = (star.prevX - this.canvasWidth / 2) * prevScale + this.canvasWidth / 2;
				const prevY2d = (star.prevY - this.canvasHeight / 2) * prevScale + this.canvasHeight / 2;

				return {
					x2d,
					y2d,
					size: star.size,
					prevX2d,
					prevY2d,
					z: star.z,
					color: star.color,
					sizeGroup: star.batchGroup
				};
			});

			// Render using optimized renderer
			this.renderer.drawStars(renderedStars, this.config.baseSpeed);
		}

		// Update performance metrics
		const renderTime = performance.now() - renderStart;
		this.performanceMetrics.renderTime = renderTime;
		this.performanceMetrics.starsVisible = visibleStars.length;
		this.performanceMetrics.poolUtilization =
			this.starPool.getActiveCount() / this.starPool.getTotalCount();

		// Adaptive quality adjustment
		this.adjustQuality(renderTime);

		this.renderScheduled = false;
	}

	/**
	 * Prepare star batches for optimized rendering
	 */
	private prepareBatches(): void {
		this.starBatches.clear();

		for (const star of this.activeStars.values()) {
			if (!star.isVisible) continue;

			// Create batch key based on rendering properties
			const batchKey = `${star.batchGroup}_${star.color}_${star.skipGlow ? 'noglow' : 'glow'}`;

			if (!this.starBatches.has(batchKey)) {
				this.starBatches.set(batchKey, []);
			}

			this.starBatches.get(batchKey)!.push(star);
		}
	}

	/**
	 * Adaptive quality adjustment based on performance
	 */
	private adjustQuality(renderTime: number): void {
		const targetFrameTime = this.targetFrameTime;

		if (renderTime > targetFrameTime * 1.2) {
			// Performance is poor, reduce quality
			this.adaptiveQuality = Math.max(0.3, this.adaptiveQuality * 0.95);
		} else if (renderTime < targetFrameTime * 0.8) {
			// Performance is good, increase quality
			this.adaptiveQuality = Math.min(1.0, this.adaptiveQuality * 1.02);
		}

		// Update renderer quality if available
		if (this.renderer) {
			this.renderer.setRenderQuality(this.adaptiveQuality);
		}
	}

	/**
	 * Setup performance monitoring
	 */
	private setupPerformanceMonitoring(): void {
		setInterval(() => {
			// Update memory usage estimate
			const poolStats = this.starPool.getStats();
			this.performanceMetrics.memoryUsed = poolStats.estimatedMemoryUsed;
			this.performanceMetrics.reuseRatio = poolStats.reuseRatio;

			// Log performance if needed
			if (this.performanceMetrics.renderTime > 20) {
				console.warn('StarPoolIntegration performance warning:', this.performanceMetrics);
			}
		}, 5000);
	}

	/**
	 * Set boost mode
	 */
	public setBoost(enabled: boolean): void {
		const speed = enabled ? this.config.boostSpeed : this.config.baseSpeed;

		// Update all active stars
		for (const star of this.activeStars.values()) {
			star.velocity.z = -speed;
		}
	}

	/**
	 * Resize the canvas and update components
	 */
	public resize(width: number, height: number, devicePixelRatio?: number): void {
		this.canvasWidth = width;
		this.canvasHeight = height;

		if (devicePixelRatio) {
			this.devicePixelRatio = devicePixelRatio;
		}

		// Resize canvas
		canvasPoolManager.resizeCanvas(this.canvasId, width, height, this.devicePixelRatio);

		// Update renderer
		if (this.renderer) {
			this.renderer.updateDimensions(width, height);
		}

		// Update dirty tracker
		if (this.dirtyTracker) {
			this.dirtyTracker.updateDimensions(width, height);
		}
	}

	/**
	 * Get current performance metrics
	 */
	public getPerformanceMetrics(): PoolPerformanceMetrics {
		return { ...this.performanceMetrics };
	}

	/**
	 * Get pool statistics
	 */
	public getPoolStats() {
		return this.starPool.getStats();
	}

	/**
	 * Clean up resources
	 */
	public cleanup(): void {
		// Release all active stars
		for (const star of this.activeStars.values()) {
			this.starPool.release(star);
		}
		this.activeStars.clear();

		// Release canvas
		canvasPoolManager.releaseCanvas(this.canvasId);

		// Destroy pool
		this.starPool.destroy();

		// Clear references
		this.renderer = null;
		this.dirtyTracker = null;
		this.starBatches.clear();

		console.log('🧹 StarPoolIntegration cleaned up');
	}
}

/**
 * Factory function to create StarPoolIntegration with optimal defaults
 */
export function createStarPoolIntegration(config?: Partial<StarPoolConfig>): StarPoolIntegration {
	return new StarPoolIntegration(config);
}

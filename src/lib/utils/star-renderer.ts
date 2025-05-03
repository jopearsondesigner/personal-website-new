// src/lib/utils/star-renderer.ts

type CanvasRenderingContext2D = globalThis.CanvasRenderingContext2D;

// Constants for rendering modes
export const RENDER_MODE = {
	STANDARD: 'standard',
	MOBILE: 'mobile',
	HIGH_DPI: 'highDPI',
	SIMPLE: 'simple'
} as const;

export type RenderMode = (typeof RENDER_MODE)[keyof typeof RENDER_MODE];

// Interface for star properties
export interface StarProperties {
	x: number;
	y: number;
	z: number;
	prevX: number;
	prevY: number;
	inUse: number;
}

// Interface for rendered star
export interface RenderedStar {
	x2d: number;
	y2d: number;
	size: number;
	prevX2d: number;
	prevY2d: number;
	z: number;
	color: string;
	sizeGroup: number; // Added for more granular batching
}

// Constants for spatial partitioning
const SPATIAL_GRID_SIZE = 4; // 4x4x4 grid (64 cells)
const FRUSTUM_CULLING_MARGIN = 0.2; // 20% extra margin for frustum culling

export class StarRenderer {
	private ctx: CanvasRenderingContext2D;
	private containerWidth: number;
	private containerHeight: number;
	private maxDepth: number;
	private starColors: string[];
	private enableGlow: boolean;
	private renderMode: RenderMode;
	private devicePixelRatio: number;
	private quality: number = 1.0;
	private maxGlowStars: number = 50;
	private useSimplifiedRendering: boolean = false;
	private skipDetailedEffects: boolean = false;
	private reduceBatchSize: boolean = false;

	// Optimization: Pre-calculate frequently used values
	private colorCache: Map<number, string> = new Map();
	private sizeCache: Map<number, number> = new Map();

	// Spatial partitioning - organize stars in a 3D grid for quick culling
	private spatialGrid: Map<string, StarProperties[]> = new Map();

	// Precomputed projection matrices/values
	private centerX: number;
	private centerY: number;
	private invMaxDepth: number; // 1/maxDepth for faster calculations

	// Fast paths for common operations
	private projectionMatrix: number[] = new Array(16).fill(0);
	private frustumPlanes: number[][] = []; // For quick frustum culling

	// Batching optimization
	private maxBatchSize: number = 512;
	private batchGroups: Map<string, RenderedStar[]> = new Map();

	// Stats for adaptive quality adjustment
	private lastFrameTime: number = 0;
	private movingAvgFrameTime: number = 16.67; // Target 60fps
	private frameCounter: number = 0;
	private statsInterval: number = 30; // Check performance every 30 frames

	constructor(
		ctx: CanvasRenderingContext2D,
		containerWidth: number,
		containerHeight: number,
		maxDepth: number,
		starColors: string[],
		enableGlow: boolean,
		renderMode: RenderMode,
		devicePixelRatio: number
	) {
		this.ctx = ctx;
		this.containerWidth = containerWidth;
		this.containerHeight = containerHeight;
		this.maxDepth = maxDepth;
		this.starColors = starColors;
		this.enableGlow = enableGlow;
		this.renderMode = renderMode;
		this.devicePixelRatio = devicePixelRatio;

		// Initialize caches and precalculated values
		this.centerX = this.containerWidth / 2;
		this.centerY = this.containerHeight / 2;
		this.invMaxDepth = 1 / this.maxDepth;

		// Setup frustum culling planes for fast checks
		this.initFrustumPlanes();

		// Initialize color and size caches
		this.updateColorCache();
	}

	/**
	 * Initialize frustum planes for faster culling
	 */
	private initFrustumPlanes(): void {
		// Calculate the view frustum planes for culling
		// We need 6 planes: left, right, top, bottom, near, far
		this.frustumPlanes = [];

		// Add margin to avoid pop-in at edges
		const margin = FRUSTUM_CULLING_MARGIN;
		const w = this.containerWidth * (1 + margin);
		const h = this.containerHeight * (1 + margin);
		const marginX = (w - this.containerWidth) / 2;
		const marginY = (h - this.containerHeight) / 2;

		// Simplified frustum planes for our specific use case
		// Left plane
		this.frustumPlanes.push([-1, 0, 0, -marginX]);
		// Right plane
		this.frustumPlanes.push([1, 0, 0, -(this.containerWidth + marginX)]);
		// Top plane
		this.frustumPlanes.push([0, -1, 0, -marginY]);
		// Bottom plane
		this.frustumPlanes.push([0, 1, 0, -(this.containerHeight + marginY)]);
	}

	/**
	 * Update dimensions when container is resized
	 */
	public updateDimensions(width: number, height: number): void {
		this.containerWidth = width;
		this.containerHeight = height;
		this.centerX = width / 2;
		this.centerY = height / 2;

		// Update frustum planes with new dimensions
		this.initFrustumPlanes();
	}

	/**
	 * Implement render quality levels that adapt to performance
	 */
	public setRenderQuality(quality: number): void {
		// Quality is a value between 0 and 1
		this.quality = Math.max(0, Math.min(1, quality));

		// Adjust rendering based on quality
		this.maxGlowStars = Math.floor(100 * this.quality);
		this.useSimplifiedRendering = this.quality < 0.7;
		this.skipDetailedEffects = this.quality < 0.5;
		this.reduceBatchSize = this.quality < 0.3;

		// Adjust batch size based on quality
		this.maxBatchSize = this.reduceBatchSize ? 128 : 512;

		// Update internal caches with new quality settings
		this.updateColorCache();
	}

	/**
	 * Pre-calculate frequently used values for faster rendering
	 */
	private updateColorCache(): void {
		this.colorCache.clear();
		this.sizeCache.clear();

		// Preallocate some common size values for fast lookup
		const depthStep = this.maxDepth / 20; // 20 discrete depth levels

		for (let depth = 0; depth <= this.maxDepth; depth += depthStep) {
			const normalizedDepth = depth * this.invMaxDepth; // Use invMaxDepth for multiplication instead of division
			const colorIndex = Math.floor((1 - normalizedDepth) * (this.starColors.length - 1));
			this.colorCache.set(Math.round(depth), this.starColors[colorIndex]);

			// Pre-calculate sizes with appropriate scaling for device
			const baseSize = (1 - normalizedDepth) * 3;
			const size = this.calculateStarSize(baseSize);
			this.sizeCache.set(Math.round(depth), size);
		}
	}

	/**
	 * Spatial partitioning for star culling - dramatically reduces processing
	 * Works by dividing 3D space into a grid and only processing cells that
	 * intersect with the viewing frustum
	 */
	public organizeStarsInSpatialGrid(stars: StarProperties[]): void {
		// Clear existing grid
		this.spatialGrid.clear();

		// Calculate grid cell size based on container dimensions and maxDepth
		const cellWidth = this.containerWidth / SPATIAL_GRID_SIZE;
		const cellHeight = this.containerHeight / SPATIAL_GRID_SIZE;
		const cellDepth = this.maxDepth / SPATIAL_GRID_SIZE;

		// Organize stars into grid cells
		for (const star of stars) {
			if (star.inUse < 0.5) continue; // Skip stars not in use

			// Determine grid cell indices
			const gridX = Math.floor((star.x + this.containerWidth / 2) / cellWidth);
			const gridY = Math.floor((star.y + this.containerHeight / 2) / cellHeight);
			const gridZ = Math.floor(star.z / cellDepth);

			// Clamp to valid grid range
			const x = Math.max(0, Math.min(SPATIAL_GRID_SIZE - 1, gridX));
			const y = Math.max(0, Math.min(SPATIAL_GRID_SIZE - 1, gridY));
			const z = Math.max(0, Math.min(SPATIAL_GRID_SIZE - 1, gridZ));

			// Create grid cell key
			const cellKey = `${x},${y},${z}`;

			// Add star to appropriate cell
			if (!this.spatialGrid.has(cellKey)) {
				this.spatialGrid.set(cellKey, []);
			}
			this.spatialGrid.get(cellKey)?.push(star);
		}
	}

	/**
	 * Fast check if a grid cell intersects the view frustum
	 */
	private isCellVisible(x: number, y: number, z: number): boolean {
		// Quick calculation based on cell coordinates
		const cellWidth = this.containerWidth / SPATIAL_GRID_SIZE;
		const cellHeight = this.containerHeight / SPATIAL_GRID_SIZE;
		const cellDepth = this.maxDepth / SPATIAL_GRID_SIZE;

		// Calculate cell bounds
		const minX = x * cellWidth - this.containerWidth / 2;
		const maxX = minX + cellWidth;
		const minY = y * cellHeight - this.containerHeight / 2;
		const maxY = minY + cellHeight;
		const minZ = z * cellDepth;
		const maxZ = minZ + cellDepth;

		// Very simple visibility check for our specific case
		// Cells closer to the camera are always visible
		if (z === 0) return true;

		// For cells at middle depths, use a wider test area
		if (z < SPATIAL_GRID_SIZE / 2) {
			// Check if cell is potentially visible with a wide margin
			return (
				maxX >= -this.containerWidth &&
				minX <= this.containerWidth * 2 &&
				maxY >= -this.containerHeight &&
				minY <= this.containerHeight * 2
			);
		}

		// For far cells, they're only visible if they overlap with screen center area
		return (
			maxX >= -this.containerWidth / 4 &&
			minX <= (this.containerWidth * 5) / 4 &&
			maxY >= -this.containerHeight / 4 &&
			minY <= (this.containerHeight * 5) / 4
		);
	}

	/**
	 * Process and project stars - now with spatial optimization
	 */
	public processStars(stars: StarProperties[], speed: number): RenderedStar[] {
		// Use spatial partitioning to reduce the number of stars we need to process
		this.organizeStarsInSpatialGrid(stars);

		// We'll collect visible stars here
		const visibleStars: RenderedStar[] = [];
		const isTrailMode = speed > 0.25 * 1.5; // Base speed * 1.5

		// Process only cells that might be visible
		for (let x = 0; x < SPATIAL_GRID_SIZE; x++) {
			for (let y = 0; y < SPATIAL_GRID_SIZE; y++) {
				for (let z = 0; z < SPATIAL_GRID_SIZE; z++) {
					// Skip processing cells that are definitely not visible
					if (!this.isCellVisible(x, y, z)) continue;

					const cellKey = `${x},${y},${z}`;
					const cellStars = this.spatialGrid.get(cellKey);

					// If no stars in this cell, skip
					if (!cellStars || cellStars.length === 0) continue;

					// Process stars in this cell
					for (const star of cellStars) {
						const projectedStar = this.projectStar(star, isTrailMode);
						if (projectedStar) {
							visibleStars.push(projectedStar);
						}
					}
				}
			}
		}

		// Adaptive quality adjustment based on star count
		if (this.frameCounter++ % this.statsInterval === 0) {
			this.adaptQualityBasedOnStarCount(visibleStars.length);
		}

		return visibleStars;
	}

	/**
	 * Adaptive quality based on visible star count
	 */
	private adaptQualityBasedOnStarCount(visibleStarCount: number): void {
		// If we have too many stars, reduce quality
		const now = performance.now();
		if (this.lastFrameTime > 0) {
			const frameTime = now - this.lastFrameTime;
			this.movingAvgFrameTime = this.movingAvgFrameTime * 0.8 + frameTime * 0.2;

			// Target 16.67ms for 60fps, adjust quality if we're off
			if (this.movingAvgFrameTime > 18 && this.quality > 0.1) {
				// Reduce quality if frames are slow
				this.setRenderQuality(this.quality * 0.9);
			} else if (this.movingAvgFrameTime < 14 && this.quality < 1.0) {
				// Increase quality if frames are fast
				this.setRenderQuality(this.quality * 1.1);
			}
		}
		this.lastFrameTime = now;
	}

	/**
	 * Project a single star with optimized calculations
	 */
	private projectStar(star: StarProperties, isTrailMode: boolean): RenderedStar | null {
		// Fast path for stars not in use
		if (star.inUse < 0.5) return null;

		// Use cached variables to avoid property lookups in hot path
		const centerX = this.centerX;
		const centerY = this.centerY;

		// Calculate scale factor
		// Use multiplication by inverse instead of division
		const scale = this.maxDepth * this.invMaxDepth * this.invMaxDepth * star.z;

		// Project 3D position to 2D screen coordinates
		const x2d = (star.x - centerX) * scale + centerX;
		const y2d = (star.y - centerY) * scale + centerY;

		// Fast frustum culling with margin for offscreen stars
		// This prevents stars from "popping" at screen edges
		const margin = 20; // pixels
		if (
			x2d < -margin ||
			x2d > this.containerWidth + margin ||
			y2d < -margin ||
			y2d > this.containerHeight + margin
		) {
			return null;
		}

		// Calculate previous position only if needed (for trails)
		let prevX2d = 0;
		let prevY2d = 0;

		if (isTrailMode) {
			const prevScale = this.maxDepth / (star.z + 0.25); // Base speed
			prevX2d = (star.prevX - centerX) * prevScale + centerX;
			prevY2d = (star.prevY - centerY) * prevScale + centerY;
		}

		// Get cached values for size and color if available
		// Round z to nearest integer to use cache effectively
		const roundedZ = Math.round(star.z);

		let size = this.sizeCache.get(roundedZ);
		if (size === undefined) {
			// Calculate size if not in cache
			const depthRatio = 1 - star.z * this.invMaxDepth;
			size = this.calculateStarSize(depthRatio * 3);

			// Cache for future use
			this.sizeCache.set(roundedZ, size);
		}

		let color = this.colorCache.get(roundedZ);
		if (color === undefined) {
			// Calculate color if not in cache
			const colorIndex = Math.floor((1 - star.z * this.invMaxDepth) * (this.starColors.length - 1));
			color = this.starColors[colorIndex];

			// Cache for future use
			this.colorCache.set(roundedZ, color);
		}

		// Group similar sized stars for more efficient batching
		// Use log scale to create fewer size groups
		const sizeGroup = Math.floor(Math.log2(1 + size) * 4);

		return {
			x2d,
			y2d,
			size,
			prevX2d,
			prevY2d,
			z: star.z,
			color,
			sizeGroup
		};
	}

	private calculateStarSize(baseSize: number): number {
		switch (this.renderMode) {
			case RENDER_MODE.HIGH_DPI:
				return baseSize * this.devicePixelRatio;
			case RENDER_MODE.MOBILE:
			case RENDER_MODE.SIMPLE:
				return baseSize * 0.8;
			default:
				return baseSize;
		}
	}

	/**
	 * Optimized batch-based rendering for stars
	 */
	public drawStars(stars: RenderedStar[], speed: number): void {
		if (stars.length === 0) return;

		const startTime = performance.now();

		// Choose rendering strategy based on quality setting
		if (this.useSimplifiedRendering) {
			this.drawStarsSimplified(stars);
		} else {
			// Enhanced batching - more granular than before
			this.drawStarsBatched(stars, speed);
		}

		// Track render time for adaptive quality
		const renderTime = performance.now() - startTime;

		// If render time is too high, reduce quality
		if (renderTime > 8 && this.quality > 0.1) {
			// If rendering takes > 8ms, reduce quality
			this.setRenderQuality(this.quality * 0.95);
		}
	}

	/**
	 * Extremely simplified rendering path for low-end devices
	 */
	private drawStarsSimplified(stars: RenderedStar[]): void {
		// Very simple approach - Just draw squares instead of circles
		// Group stars by color only - reduces state changes
		const starsByColor = new Map<string, RenderedStar[]>();

		for (const star of stars) {
			if (!starsByColor.has(star.color)) {
				starsByColor.set(star.color, []);
			}
			starsByColor.get(star.color)?.push(star);
		}

		// Disable expensive effects
		this.ctx.shadowBlur = 0;
		this.ctx.shadowColor = 'transparent';

		// Batch draw all stars of each color
		starsByColor.forEach((starsOfColor, color) => {
			this.ctx.fillStyle = color;
			this.ctx.beginPath();

			// Draw all stars of this color at once
			for (const star of starsOfColor) {
				// Use squares instead of circles for better performance
				const halfSize = Math.max(0.5, star.size / 2);
				this.ctx.rect(star.x2d - halfSize, star.y2d - halfSize, halfSize * 2, halfSize * 2);
			}

			this.ctx.fill();
		});
	}

	/**
	 * Enhanced batched rendering approach
	 * Groups similar stars together and processes them in optimal order
	 */
	private drawStarsBatched(stars: RenderedStar[], speed: number): void {
		// Reset batch groups
		this.batchGroups.clear();

		const isTrailMode = speed > 0.25 * 1.5;

		// Group stars by mode, size group, and color
		// This creates optimal batches with minimal state changes
		for (const star of stars) {
			const renderType = isTrailMode ? 'trail' : 'circle';
			const batchKey = `${renderType}_${star.sizeGroup}_${star.color}`;

			if (!this.batchGroups.has(batchKey)) {
				this.batchGroups.set(batchKey, []);
			}

			const batch = this.batchGroups.get(batchKey);
			if (batch) {
				batch.push(star);

				// If batch is full, render it immediately
				if (batch.length >= this.maxBatchSize) {
					this.renderBatch(batchKey, batch, isTrailMode);
					// Clear batch but keep the array reference
					batch.length = 0;
				}
			}
		}

		// Render remaining batches - process larger stars first for better visual appearance
		const sortedKeys = Array.from(this.batchGroups.keys()).sort((a, b) => {
			const sizeA = parseInt(a.split('_')[1]);
			const sizeB = parseInt(b.split('_')[1]);
			return sizeB - sizeA; // Larger stars first
		});

		for (const key of sortedKeys) {
			const batch = this.batchGroups.get(key);
			if (batch && batch.length > 0) {
				this.renderBatch(key, batch, isTrailMode);
			}
		}
	}

	/**
	 * Render a single batch of stars efficiently
	 */
	private renderBatch(batchKey: string, stars: RenderedStar[], isTrailMode: boolean): void {
		const [renderType, sizeGroupStr, color] = batchKey.split('_');

		// Set color once for the entire batch
		if (renderType === 'trail') {
			this.ctx.strokeStyle = color;
		} else {
			this.ctx.fillStyle = color;
		}

		// Determine if we should use glow effect
		const useGlow =
			this.enableGlow && !this.skipDetailedEffects && stars.length <= this.maxGlowStars;

		// Apply glow effect if needed
		if (useGlow) {
			this.ctx.shadowColor = color;
			this.ctx.shadowBlur = parseFloat(sizeGroupStr) * 0.5;
		}

		// Begin path once for all stars in batch
		this.ctx.beginPath();

		if (renderType === 'trail') {
			// Draw trails with a single path
			for (const star of stars) {
				this.ctx.lineWidth = star.size;
				this.ctx.moveTo(star.prevX2d, star.prevY2d);
				this.ctx.lineTo(star.x2d, star.y2d);
			}
			this.ctx.stroke();
		} else {
			// Draw circles with a single path
			for (const star of stars) {
				// For small stars, use a square (faster)
				if (star.size < 1.5 && this.useSimplifiedRendering) {
					const halfSize = star.size / 2;
					this.ctx.rect(star.x2d - halfSize, star.y2d - halfSize, star.size, star.size);
				} else {
					// For larger stars, use a circle
					this.ctx.moveTo(star.x2d + star.size, star.y2d);
					this.ctx.arc(star.x2d, star.y2d, star.size, 0, Math.PI * 2);
				}
			}
			this.ctx.fill();
		}

		// Reset shadow effects
		if (useGlow) {
			this.ctx.shadowColor = 'transparent';
			this.ctx.shadowBlur = 0;
		}
	}
}

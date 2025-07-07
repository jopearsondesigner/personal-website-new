// src/lib/utils/canvas-pool-manager.ts
import { browser } from '$app/environment';
import { StarPool } from './star-pool';
import type { StarPoolObject } from './star-pool';

/**
 * Interface for pooled canvas objects
 */
interface PooledCanvas extends StarPoolObject {
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
	width: number;
	height: number;
	devicePixelRatio: number;
	lastUsedTime: number;
	isDirty: boolean;
	dirtyRegions: DOMRect[];
}

/**
 * Canvas context configuration for optimal performance
 */
interface CanvasConfig {
	alpha: boolean;
	desynchronized: boolean;
	colorSpace: PredefinedColorSpace;
	willReadFrequently: boolean;
	powerPreference: CanvasPowerPreference;
}

/**
 * Manages a pool of canvas elements and contexts for optimal reuse
 * Prevents expensive canvas creation/destruction and context initialization
 */
export class CanvasPoolManager {
	private canvasPool: StarPool<PooledCanvas>;
	private activeCanvases: Map<string, PooledCanvas> = new Map();
	private defaultConfig: CanvasConfig;
	private nextCanvasId = 0;
	private maxCanvasSize = 4096; // Maximum canvas dimension
	private minCanvasSize = 256; // Minimum canvas dimension
	private maxPoolSize = 8; // Maximum number of pooled canvases
	private cleanupInterval: ReturnType<typeof setInterval> | null = null;
	private cleanupThreshold = 30000; // 30 seconds of inactivity before cleanup

	constructor() {
		// Optimal canvas configuration for starfield rendering
		this.defaultConfig = {
			alpha: true, // We need transparency for starfield
			desynchronized: false, // Keep synchronized for better visual quality
			colorSpace: 'srgb',
			willReadFrequently: false, // We're mainly writing, not reading
			powerPreference: 'high-performance' // Prefer performance over battery
		};

		// Initialize canvas pool
		this.canvasPool = new StarPool<PooledCanvas>(
			this.maxPoolSize,
			() => this.createPooledCanvas(),
			(canvas) => this.resetPooledCanvas(canvas),
			{
				preAllocate: false, // Don't pre-allocate canvases - create on demand
				hibernationThreshold: this.cleanupThreshold,
				statsReportThreshold: 5
			}
		);

		if (browser) {
			this.setupCleanupInterval();
			this.setupDeviceChangeListeners();
		}
	}

	/**
	 * Create a new pooled canvas object
	 */
	private createPooledCanvas(): PooledCanvas {
		const canvas = document.createElement('canvas');
		canvas.style.position = 'absolute';
		canvas.style.top = '0';
		canvas.style.left = '0';
		canvas.style.pointerEvents = 'none';

		// Add hardware acceleration hints
		canvas.style.transform = 'translateZ(0)';
		canvas.style.backfaceVisibility = 'hidden';
		canvas.style.willChange = 'transform';

		// Get optimized context
		const ctx = canvas.getContext('2d', this.defaultConfig);

		if (!ctx) {
			throw new Error('Failed to create 2D rendering context');
		}

		// Set optimal context properties
		this.optimizeContext(ctx);

		const pooledCanvas: PooledCanvas = {
			canvas,
			ctx,
			width: 0,
			height: 0,
			devicePixelRatio: 1,
			lastUsedTime: performance.now(),
			isDirty: false,
			dirtyRegions: [],
			inUse: false
		};

		return pooledCanvas;
	}

	/**
	 * Reset a pooled canvas for reuse
	 */
	private resetPooledCanvas(pooledCanvas: PooledCanvas): void {
		const { canvas, ctx } = pooledCanvas;

		// Clear the canvas completely
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Reset context state
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = 'source-over';
		ctx.fillStyle = '#000000';
		ctx.strokeStyle = '#000000';
		ctx.lineWidth = 1;
		ctx.lineCap = 'butt';
		ctx.lineJoin = 'miter';
		ctx.miterLimit = 10;
		ctx.shadowColor = 'transparent';
		ctx.shadowBlur = 0;
		ctx.shadowOffsetX = 0;
		ctx.shadowOffsetY = 0;

		// Reset transform
		ctx.setTransform(1, 0, 0, 1, 0, 0);

		// Reset dirty state
		pooledCanvas.isDirty = false;
		pooledCanvas.dirtyRegions = [];
		pooledCanvas.lastUsedTime = performance.now();
	}

	/**
	 * Optimize context for starfield rendering
	 */
	private optimizeContext(ctx: CanvasRenderingContext2D): void {
		// Set optimal context properties for starfield
		ctx.imageSmoothingEnabled = false; // Crisp stars, no anti-aliasing
		ctx.imageSmoothingQuality = 'low';

		// Optimize text rendering (if needed)
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';

		// Set optimal composite operation for additive blending
		ctx.globalCompositeOperation = 'source-over';
	}

	/**
	 * Get or create a canvas with specified dimensions
	 */
	public getCanvas(
		width: number,
		height: number,
		devicePixelRatio: number = window.devicePixelRatio || 1,
		id?: string
	): PooledCanvas {
		// Clamp dimensions to reasonable limits
		width = Math.max(this.minCanvasSize, Math.min(this.maxCanvasSize, width));
		height = Math.max(this.minCanvasSize, Math.min(this.maxCanvasSize, height));

		// Generate ID if not provided
		const canvasId = id || `canvas_${this.nextCanvasId++}`;

		// Check if we already have an active canvas with this ID
		const existingCanvas = this.activeCanvases.get(canvasId);
		if (
			existingCanvas &&
			existingCanvas.width === width &&
			existingCanvas.height === height &&
			existingCanvas.devicePixelRatio === devicePixelRatio
		) {
			existingCanvas.lastUsedTime = performance.now();
			return existingCanvas;
		}

		// Get a canvas from the pool
		const pooledCanvas = this.canvasPool.get();

		// Configure the canvas
		this.configureCanvas(pooledCanvas, width, height, devicePixelRatio);

		// Store as active canvas
		this.activeCanvases.set(canvasId, pooledCanvas);

		return pooledCanvas;
	}

	/**
	 * Configure canvas dimensions and pixel ratio
	 */
	private configureCanvas(
		pooledCanvas: PooledCanvas,
		width: number,
		height: number,
		devicePixelRatio: number
	): void {
		const { canvas, ctx } = pooledCanvas;

		// Only reconfigure if dimensions changed
		if (
			pooledCanvas.width !== width ||
			pooledCanvas.height !== height ||
			pooledCanvas.devicePixelRatio !== devicePixelRatio
		) {
			// Set actual canvas size
			canvas.width = width * devicePixelRatio;
			canvas.height = height * devicePixelRatio;

			// Set display size
			canvas.style.width = `${width}px`;
			canvas.style.height = `${height}px`;

			// Scale context for high DPI
			ctx.scale(devicePixelRatio, devicePixelRatio);

			// Re-optimize context after scaling
			this.optimizeContext(ctx);

			// Update pooled canvas properties
			pooledCanvas.width = width;
			pooledCanvas.height = height;
			pooledCanvas.devicePixelRatio = devicePixelRatio;
		}

		pooledCanvas.lastUsedTime = performance.now();
	}

	/**
	 * Release a canvas back to the pool
	 */
	public releaseCanvas(id: string): void {
		const canvas = this.activeCanvases.get(id);
		if (canvas) {
			// Remove from active canvases
			this.activeCanvases.delete(id);

			// Return to pool
			this.canvasPool.release(canvas);
		}
	}

	/**
	 * Get a canvas for off-screen rendering (worker compatible)
	 */
	public getOffscreenCanvas(width: number, height: number): OffscreenCanvas | HTMLCanvasElement {
		if (typeof OffscreenCanvas !== 'undefined') {
			const offscreen = new OffscreenCanvas(width, height);
			return offscreen;
		} else {
			// Fallback to regular canvas for older browsers
			const pooledCanvas = this.getCanvas(width, height, 1, `offscreen_${Date.now()}`);
			return pooledCanvas.canvas;
		}
	}

	/**
	 * Batch clear multiple dirty regions efficiently
	 */
	public batchClearRegions(canvas: PooledCanvas, regions: DOMRect[]): void {
		if (regions.length === 0) return;

		const { ctx } = canvas;

		// If too many small regions, clear the entire canvas instead
		if (regions.length > 20) {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			canvas.isDirty = false;
			canvas.dirtyRegions = [];
			return;
		}

		// Sort regions by area (clear larger regions first)
		const sortedRegions = regions.sort((a, b) => b.width * b.height - a.width * a.height);

		// Batch clearing with minimal context state changes
		ctx.save();
		ctx.globalCompositeOperation = 'destination-out';

		for (const region of sortedRegions) {
			// Add small padding to ensure complete clearing
			const padding = 1;
			ctx.clearRect(
				region.x - padding,
				region.y - padding,
				region.width + padding * 2,
				region.height + padding * 2
			);
		}

		ctx.restore();
		canvas.isDirty = false;
		canvas.dirtyRegions = [];
	}

	/**
	 * Mark a region as dirty for optimized clearing
	 */
	public markDirtyRegion(
		canvas: PooledCanvas,
		x: number,
		y: number,
		width: number,
		height: number
	): void {
		canvas.isDirty = true;
		canvas.dirtyRegions.push(new DOMRect(x, y, width, height));

		// Merge overlapping regions to optimize clearing
		if (canvas.dirtyRegions.length > 5) {
			this.mergeDirtyRegions(canvas);
		}
	}

	/**
	 * Merge overlapping dirty regions to reduce clear operations
	 */
	private mergeDirtyRegions(canvas: PooledCanvas): void {
		const regions = canvas.dirtyRegions;
		const merged: DOMRect[] = [];

		for (const region of regions) {
			let wasMerged = false;

			for (let i = 0; i < merged.length; i++) {
				const existing = merged[i];

				// Check if regions overlap or are adjacent
				if (this.regionsOverlap(region, existing)) {
					// Merge regions
					const newX = Math.min(region.x, existing.x);
					const newY = Math.min(region.y, existing.y);
					const newWidth = Math.max(region.x + region.width, existing.x + existing.width) - newX;
					const newHeight = Math.max(region.y + region.height, existing.y + existing.height) - newY;

					merged[i] = new DOMRect(newX, newY, newWidth, newHeight);
					wasMerged = true;
					break;
				}
			}

			if (!wasMerged) {
				merged.push(region);
			}
		}

		canvas.dirtyRegions = merged;
	}

	/**
	 * Check if two regions overlap or are adjacent
	 */
	private regionsOverlap(a: DOMRect, b: DOMRect): boolean {
		const margin = 5; // Small margin to merge nearby regions
		return !(
			a.x > b.x + b.width + margin ||
			b.x > a.x + a.width + margin ||
			a.y > b.y + b.height + margin ||
			b.y > a.y + a.height + margin
		);
	}

	/**
	 * Setup periodic cleanup of inactive canvases
	 */
	private setupCleanupInterval(): void {
		this.cleanupInterval = setInterval(() => {
			this.cleanupInactiveCanvases();
		}, 10000); // Check every 10 seconds
	}

	/**
	 * Clean up canvases that haven't been used recently
	 */
	private cleanupInactiveCanvases(): void {
		const now = performance.now();
		const threshold = this.cleanupThreshold;

		// Find inactive canvases
		const inactiveIds: string[] = [];

		for (const [id, canvas] of this.activeCanvases.entries()) {
			if (now - canvas.lastUsedTime > threshold) {
				inactiveIds.push(id);
			}
		}

		// Release inactive canvases
		for (const id of inactiveIds) {
			this.releaseCanvas(id);
		}

		// Force pool hibernation for memory optimization
		this.canvasPool.hibernateUnusedObjects(threshold);
	}

	/**
	 * Setup listeners for device changes that affect canvas performance
	 */
	private setupDeviceChangeListeners(): void {
		// Listen for DPI changes
		const mediaQuery = window.matchMedia('screen and (min-resolution: 2dppx)');
		mediaQuery.addEventListener('change', () => {
			// Release all active canvases to force recreation with new DPI
			const activeIds = Array.from(this.activeCanvases.keys());
			for (const id of activeIds) {
				this.releaseCanvas(id);
			}
		});

		// Listen for orientation changes
		window.addEventListener('orientationchange', () => {
			setTimeout(() => {
				// Clear all canvases after orientation change
				const activeIds = Array.from(this.activeCanvases.keys());
				for (const id of activeIds) {
					this.releaseCanvas(id);
				}
			}, 100);
		});
	}

	/**
	 * Get canvas pool statistics
	 */
	public getStats() {
		return {
			poolStats: this.canvasPool.getStats(),
			activeCanvases: this.activeCanvases.size,
			totalCanvasMemory: this.calculateTotalCanvasMemory()
		};
	}

	/**
	 * Calculate estimated memory usage of all active canvases
	 */
	private calculateTotalCanvasMemory(): number {
		let totalMemory = 0;

		for (const canvas of this.activeCanvases.values()) {
			// Estimate 4 bytes per pixel (RGBA)
			const pixelCount = canvas.canvas.width * canvas.canvas.height;
			totalMemory += pixelCount * 4;
		}

		return totalMemory / (1024 * 1024); // Return in MB
	}

	/**
	 * Force immediate cleanup of all resources
	 */
	public cleanup(): void {
		// Release all active canvases
		const activeIds = Array.from(this.activeCanvases.keys());
		for (const id of activeIds) {
			this.releaseCanvas(id);
		}

		// Destroy the pool
		this.canvasPool.destroy();

		// Clear cleanup interval
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = null;
		}

		// Clear references
		this.activeCanvases.clear();
	}

	/**
	 * Resize an existing canvas efficiently
	 */
	public resizeCanvas(
		id: string,
		width: number,
		height: number,
		devicePixelRatio?: number
	): PooledCanvas | null {
		const canvas = this.activeCanvases.get(id);
		if (!canvas) return null;

		const dpr = devicePixelRatio || canvas.devicePixelRatio;
		this.configureCanvas(canvas, width, height, dpr);

		return canvas;
	}
}

// Export singleton instance
export const canvasPoolManager = new CanvasPoolManager();

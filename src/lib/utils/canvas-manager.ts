// src/lib/utils/canvas-manager.ts - CENTRALIZED CANVAS OPTIMIZATION

import { browser } from '$app/environment';
import { frameRateController, type CanvasOptimizationSettings } from './frame-rate-controller';
import { starPoolBridge } from './star-pool-bridge';

/**
 * Canvas context configuration options
 */
export interface CanvasContextOptions {
	alpha?: boolean;
	willReadFrequently?: boolean;
	powerPreference?: 'default' | 'high-performance' | 'low-power';
	desynchronized?: boolean;
	colorSpace?: 'srgb' | 'display-p3';
}

/**
 * Dirty rectangle for optimized clearing
 */
export interface DirtyRect {
	x: number;
	y: number;
	width: number;
	height: number;
	priority?: number; // Higher priority rectangles are processed first
}

/**
 * Render operation for batched drawing
 */
export interface RenderOperation {
	type: string;
	priority: number;
	execute: (ctx: CanvasRenderingContext2D) => void;
	bounds?: DirtyRect;
	batchable?: boolean;
}

/**
 * Canvas performance metrics
 */
export interface CanvasMetrics {
	renderTime: number;
	clearTime: number;
	operationCount: number;
	dirtyRectCount: number;
	memoryUsage: number;
	lastFrameTime: number;
}

/**
 * Centralized canvas management with optimization features
 * Handles context pooling, dirty rectangles, batched operations, and performance monitoring
 */
export class CanvasManager {
	private static instance: CanvasManager | null = null;

	// Canvas and context pools
	private canvasPool: HTMLCanvasElement[] = [];
	private contextPool: CanvasRenderingContext2D[] = [];
	private activeCanvases = new Map<string, HTMLCanvasElement>();
	private activeContexts = new Map<string, CanvasRenderingContext2D>();
	private offscreenCanvases = new Map<string, OffscreenCanvas>();

	// Optimization state
	private dirtyRects = new Map<string, DirtyRect[]>();
	private renderQueues = new Map<string, RenderOperation[]>();
	private lastClearTime = new Map<string, number>();
	private canvasMetrics = new Map<string, CanvasMetrics>();

	// Performance settings
	private optimizationSettings: CanvasOptimizationSettings = {
		enableDirtyRectangles: true,
		enableBatchedDrawing: true,
		maxBatchSize: 512,
		clearStrategy: 'dirty',
		enableFrameSkipping: true,
		skipFrameThreshold: 2,
		enableContextCaching: true,
		enableOffscreenCanvas: false
	};

	// Throttling and performance
	private clearThrottle = 16.67; // ~60fps
	private maxDirtyRects = 20;
	private batchExecutionScheduled = false;
	private performanceMonitoringEnabled = true;

	// WebGL detection and fallback
	private webglSupported = false;
	private webgl2Supported = false;

	private constructor() {
		if (browser) {
			this.detectCapabilities();
			this.setupPerformanceMonitoring();
			this.subscribeToOptimizationSettings();
		}
	}

	/**
	 * Get singleton instance
	 */
	public static getInstance(): CanvasManager {
		if (!CanvasManager.instance) {
			CanvasManager.instance = new CanvasManager();
		}
		return CanvasManager.instance;
	}

	// ======================================================================
	// INITIALIZATION AND CAPABILITIES
	// ======================================================================

	/**
	 * Detect browser canvas capabilities
	 */
	private detectCapabilities(): void {
		if (!browser) return;

		try {
			// Test WebGL support
			const testCanvas = document.createElement('canvas');
			const webglContext = testCanvas.getContext('webgl');
			const webgl2Context = testCanvas.getContext('webgl2');

			this.webglSupported = !!webglContext;
			this.webgl2Supported = !!webgl2Context;

			// Test OffscreenCanvas support
			this.optimizationSettings.enableOffscreenCanvas = typeof OffscreenCanvas !== 'undefined';

			console.log('🎨 Canvas capabilities detected:', {
				webgl: this.webglSupported,
				webgl2: this.webgl2Supported,
				offscreen: this.optimizationSettings.enableOffscreenCanvas
			});
		} catch (error) {
			console.warn('Error detecting canvas capabilities:', error);
		}
	}

	/**
	 * Setup performance monitoring integration
	 */
	private setupPerformanceMonitoring(): void {
		// Subscribe to frame rate controller optimization settings
		this.subscribeToOptimizationSettings();

		// Report canvas statistics to pool bridge
		setInterval(() => {
			this.reportCanvasStatistics();
		}, 2000);
	}

	/**
	 * Subscribe to optimization settings from frame rate controller
	 */
	private subscribeToOptimizationSettings(): void {
		frameRateController.subscribeCanvasOptimization((settings) => {
			this.optimizationSettings = { ...settings };
			console.log('🔧 Updated canvas optimization settings:', settings);
		});
	}

	/**
	 * Report canvas statistics to performance monitoring
	 */
	private reportCanvasStatistics(): void {
		const totalCanvases = this.activeCanvases.size;
		const totalContexts = this.activeContexts.size;

		let totalRenderTime = 0;
		let totalOperations = 0;

		this.canvasMetrics.forEach((metrics) => {
			totalRenderTime += metrics.renderTime;
			totalOperations += metrics.operationCount;
		});

		// Report to pool bridge if connected
		starPoolBridge.updateActiveCount(totalCanvases, totalCanvases + this.canvasPool.length);
	}

	// ======================================================================
	// CANVAS AND CONTEXT MANAGEMENT
	// ======================================================================

	/**
	 * Create or retrieve optimized canvas context
	 */
	public getContext(
		id: string,
		container: HTMLElement,
		options: {
			width?: number;
			height?: number;
			contextOptions?: CanvasContextOptions;
			enableOptimizations?: boolean;
		} = {}
	): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
		// Check if already exists
		if (this.activeCanvases.has(id) && this.activeContexts.has(id)) {
			return {
				canvas: this.activeCanvases.get(id)!,
				ctx: this.activeContexts.get(id)!
			};
		}

		try {
			// Get canvas from pool or create new
			let canvas = this.canvasPool.pop();
			if (!canvas) {
				canvas = this.createOptimizedCanvas();
			}

			// Configure canvas
			this.configureCanvas(canvas, id, container, options);

			// Get context from pool or create new
			let ctx = this.contextPool.pop();
			if (!ctx) {
				ctx = this.createOptimizedContext(canvas, options.contextOptions);
			}

			if (!ctx) {
				console.error('Failed to create canvas context');
				return null;
			}

			// Setup canvas dimensions and scaling
			this.setupCanvasDimensions(canvas, ctx, container, options);

			// Store active references
			this.activeCanvases.set(id, canvas);
			this.activeContexts.set(id, ctx);
			this.dirtyRects.set(id, []);
			this.renderQueues.set(id, []);
			this.canvasMetrics.set(id, this.createInitialMetrics());

			// Setup offscreen canvas if enabled
			if (options.enableOptimizations !== false) {
				this.setupOffscreenCanvas(id, canvas);
			}

			// Register with frame rate controller
			frameRateController.registerCanvas(id, canvas, ctx);

			console.log(`✅ Canvas context created for ${id}`);
			return { canvas, ctx };
		} catch (error) {
			console.error('Failed to create canvas context:', error);
			return null;
		}
	}

	/**
	 * Create optimized canvas element
	 */
	private createOptimizedCanvas(): HTMLCanvasElement {
		const canvas = document.createElement('canvas');

		// Apply hardware acceleration and optimization hints
		canvas.style.cssText = `
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			pointer-events: none;
			transform: translateZ(0);
			backface-visibility: hidden;
			will-change: transform;
			image-rendering: -webkit-optimize-contrast;
			image-rendering: crisp-edges;
		`;

		return canvas;
	}

	/**
	 * Create optimized 2D context
	 */
	private createOptimizedContext(
		canvas: HTMLCanvasElement,
		options: CanvasContextOptions = {}
	): CanvasRenderingContext2D | null {
		const contextOptions: CanvasRenderingContext2DSettings = {
			alpha: options.alpha !== false,
			willReadFrequently: options.willReadFrequently || false,
			powerPreference: options.powerPreference || 'high-performance',
			desynchronized: options.desynchronized || true,
			colorSpace: options.colorSpace || 'srgb'
		};

		return canvas.getContext('2d', contextOptions);
	}

	/**
	 * Configure canvas element
	 */
	private configureCanvas(
		canvas: HTMLCanvasElement,
		id: string,
		container: HTMLElement,
		options: any
	): void {
		canvas.id = `canvas-${id}`;
		container.appendChild(canvas);
	}

	/**
	 * Setup canvas dimensions with HiDPI support
	 */
	private setupCanvasDimensions(
		canvas: HTMLCanvasElement,
		ctx: CanvasRenderingContext2D,
		container: HTMLElement,
		options: any
	): void {
		const rect = container.getBoundingClientRect();
		const width = options.width || rect.width;
		const height = options.height || rect.height;
		const dpr = window.devicePixelRatio || 1;

		// Set actual canvas size
		canvas.width = width * dpr;
		canvas.height = height * dpr;

		// Set CSS size
		canvas.style.width = `${width}px`;
		canvas.style.height = `${height}px`;

		// Scale context for HiDPI
		ctx.scale(dpr, dpr);
	}

	/**
	 * Setup offscreen canvas for complex operations
	 */
	private setupOffscreenCanvas(id: string, canvas: HTMLCanvasElement): void {
		if (!this.optimizationSettings.enableOffscreenCanvas) return;

		try {
			const offscreen = new OffscreenCanvas(canvas.width, canvas.height);
			this.offscreenCanvases.set(id, offscreen);
			console.log(`📱 Created offscreen canvas for ${id}`);
		} catch (error) {
			console.warn('Failed to create offscreen canvas:', error);
		}
	}

	/**
	 * Create initial metrics object
	 */
	private createInitialMetrics(): CanvasMetrics {
		return {
			renderTime: 0,
			clearTime: 0,
			operationCount: 0,
			dirtyRectCount: 0,
			memoryUsage: 0,
			lastFrameTime: performance.now()
		};
	}

	// ======================================================================
	// DIRTY RECTANGLE OPTIMIZATION
	// ======================================================================

	/**
	 * Add dirty rectangle for optimized clearing
	 */
	public addDirtyRect(id: string, rect: DirtyRect): void {
		if (!this.optimizationSettings.enableDirtyRectangles) return;

		const rects = this.dirtyRects.get(id) || [];

		// Merge overlapping rectangles
		const mergedRect = this.mergeOverlappingRects(rects, rect);

		if (mergedRect) {
			// Replace overlapping rects with merged one
			this.dirtyRects.set(id, [mergedRect]);
		} else {
			// Add new rect
			rects.push(rect);

			// Limit number of dirty rects to prevent performance issues
			if (rects.length > this.maxDirtyRects) {
				// Merge all rects into one large rect
				const bounds = this.calculateBoundingRect(rects);
				this.dirtyRects.set(id, [bounds]);
			} else {
				this.dirtyRects.set(id, rects);
			}
		}

		// Update metrics
		const metrics = this.canvasMetrics.get(id);
		if (metrics) {
			metrics.dirtyRectCount = this.dirtyRects.get(id)?.length || 0;
		}
	}

	/**
	 * Merge overlapping rectangles
	 */
	private mergeOverlappingRects(rects: DirtyRect[], newRect: DirtyRect): DirtyRect | null {
		const overlapping = rects.filter((rect) => this.rectsOverlap(rect, newRect));

		if (overlapping.length === 0) return null;

		// Remove overlapping rects from array
		const remaining = rects.filter((rect) => !this.rectsOverlap(rect, newRect));

		// Calculate bounding rect of all overlapping rects plus new rect
		const allRects = [...overlapping, newRect];
		const merged = this.calculateBoundingRect(allRects);

		// Update the array
		this.dirtyRects.set(this.getCanvasIdFromRects(rects), [...remaining, merged]);

		return merged;
	}

	/**
	 * Check if two rectangles overlap
	 */
	private rectsOverlap(rect1: DirtyRect, rect2: DirtyRect): boolean {
		return !(
			rect1.x + rect1.width < rect2.x ||
			rect2.x + rect2.width < rect1.x ||
			rect1.y + rect1.height < rect2.y ||
			rect2.y + rect2.height < rect1.y
		);
	}

	/**
	 * Calculate bounding rectangle of multiple rects
	 */
	private calculateBoundingRect(rects: DirtyRect[]): DirtyRect {
		if (rects.length === 0) {
			return { x: 0, y: 0, width: 0, height: 0 };
		}

		const minX = Math.min(...rects.map((r) => r.x));
		const minY = Math.min(...rects.map((r) => r.y));
		const maxX = Math.max(...rects.map((r) => r.x + r.width));
		const maxY = Math.max(...rects.map((r) => r.y + r.height));

		return {
			x: minX,
			y: minY,
			width: maxX - minX,
			height: maxY - minY
		};
	}

	/**
	 * Helper to get canvas ID (placeholder - would need proper implementation)
	 */
	private getCanvasIdFromRects(rects: DirtyRect[]): string {
		// This would need to be implemented based on how rects are tracked
		// For now, return a default
		return 'default';
	}

	// ======================================================================
	// CANVAS CLEARING OPTIMIZATION
	// ======================================================================

	/**
	 * Clear canvas using optimal strategy
	 */
	public clearCanvas(id: string, force: boolean = false): void {
		const ctx = this.activeContexts.get(id);
		const canvas = this.activeCanvases.get(id);
		if (!ctx || !canvas) return;

		const now = performance.now();
		const lastClear = this.lastClearTime.get(id) || 0;

		// Throttle clearing unless forced
		if (!force && now - lastClear < this.clearThrottle) return;

		const startTime = performance.now();
		const strategy = this.optimizationSettings.clearStrategy;
		const dirtyRects = this.dirtyRects.get(id) || [];

		switch (strategy) {
			case 'full':
				this.clearCanvasFull(ctx, canvas);
				break;
			case 'dirty':
				this.clearCanvasDirty(ctx, canvas, dirtyRects);
				break;
			case 'partial':
				this.clearCanvasPartial(ctx, canvas);
				break;
		}

		// Update metrics
		const clearTime = performance.now() - startTime;
		const metrics = this.canvasMetrics.get(id);
		if (metrics) {
			metrics.clearTime = clearTime;
		}

		// Clear dirty rects and update time
		this.dirtyRects.set(id, []);
		this.lastClearTime.set(id, now);
	}

	/**
	 * Full canvas clear
	 */
	private clearCanvasFull(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
	}

	/**
	 * Dirty rectangle clearing
	 */
	private clearCanvasDirty(
		ctx: CanvasRenderingContext2D,
		canvas: HTMLCanvasElement,
		dirtyRects: DirtyRect[]
	): void {
		if (dirtyRects.length === 0 || dirtyRects.length > 10) {
			// Fall back to full clear
			this.clearCanvasFull(ctx, canvas);
		} else {
			// Clear only dirty rectangles
			for (const rect of dirtyRects) {
				ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
			}
		}
	}

	/**
	 * Partial clear with motion blur effect
	 */
	private clearCanvasPartial(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
		ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	}

	// ======================================================================
	// BATCHED RENDERING
	// ======================================================================

	/**
	 * Add render operation to batch queue
	 */
	public addRenderOperation(id: string, operation: RenderOperation): void {
		if (!this.optimizationSettings.enableBatchedDrawing) {
			// Execute immediately if batching disabled
			this.executeOperation(id, operation);
			return;
		}

		const queue = this.renderQueues.get(id) || [];
		queue.push(operation);

		// Sort by priority
		queue.sort((a, b) => b.priority - a.priority);

		// Execute batch if it reaches max size
		if (queue.length >= this.optimizationSettings.maxBatchSize) {
			this.executeBatch(id);
		} else {
			this.renderQueues.set(id, queue);
			this.scheduleBatchExecution(id);
		}
	}

	/**
	 * Schedule batch execution on next frame
	 */
	private scheduleBatchExecution(id: string): void {
		if (this.batchExecutionScheduled) return;

		this.batchExecutionScheduled = true;
		requestAnimationFrame(() => {
			this.executeBatch(id);
			this.batchExecutionScheduled = false;
		});
	}

	/**
	 * Execute batch of render operations
	 */
	public executeBatch(id: string): void {
		const queue = this.renderQueues.get(id) || [];
		if (queue.length === 0) return;

		const ctx = this.activeContexts.get(id);
		if (!ctx) return;

		const startTime = performance.now();

		// Group batchable operations
		const batchableOps = queue.filter((op) => op.batchable);
		const nonBatchableOps = queue.filter((op) => !op.batchable);

		// Execute non-batchable operations first
		for (const op of nonBatchableOps) {
			this.executeOperation(id, op);
		}

		// Execute batchable operations together
		if (batchableOps.length > 0) {
			ctx.save();
			for (const op of batchableOps) {
				op.execute(ctx);
			}
			ctx.restore();
		}

		// Update metrics
		const renderTime = performance.now() - startTime;
		const metrics = this.canvasMetrics.get(id);
		if (metrics) {
			metrics.renderTime = renderTime;
			metrics.operationCount = queue.length;
		}

		// Clear queue
		this.renderQueues.set(id, []);
	}

	/**
	 * Execute single render operation
	 */
	private executeOperation(id: string, operation: RenderOperation): void {
		const ctx = this.activeContexts.get(id);
		if (!ctx) return;

		try {
			operation.execute(ctx);

			// Add dirty rect if bounds provided
			if (operation.bounds) {
				this.addDirtyRect(id, operation.bounds);
			}
		} catch (error) {
			console.error('Error executing render operation:', error);
		}
	}

	// ======================================================================
	// RESOURCE MANAGEMENT
	// ======================================================================

	/**
	 * Release canvas back to pool
	 */
	public releaseCanvas(id: string): void {
		const canvas = this.activeCanvases.get(id);
		const ctx = this.activeContexts.get(id);

		if (canvas && ctx) {
			// Clear canvas before pooling
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.resetTransform();

			// Remove from DOM
			if (canvas.parentNode) {
				canvas.parentNode.removeChild(canvas);
			}

			// Return to pools
			this.canvasPool.push(canvas);
			this.contextPool.push(ctx);

			// Clean up tracking
			this.activeCanvases.delete(id);
			this.activeContexts.delete(id);
			this.dirtyRects.delete(id);
			this.renderQueues.delete(id);
			this.lastClearTime.delete(id);
			this.canvasMetrics.delete(id);
			this.offscreenCanvases.delete(id);

			// Unregister from frame rate controller
			frameRateController.unregisterCanvas(id);

			console.log(`🗑️ Released canvas ${id}`);
		}
	}

	/**
	 * Resize canvas and update tracking
	 */
	public resizeCanvas(id: string, width: number, height: number): void {
		const canvas = this.activeCanvases.get(id);
		const ctx = this.activeContexts.get(id);

		if (!canvas || !ctx) return;

		const dpr = window.devicePixelRatio || 1;

		// Update canvas size
		canvas.width = width * dpr;
		canvas.height = height * dpr;
		canvas.style.width = `${width}px`;
		canvas.style.height = `${height}px`;

		// Re-scale context
		ctx.scale(dpr, dpr);

		// Clear dirty rects (they're now invalid)
		this.dirtyRects.set(id, []);

		// Update offscreen canvas if it exists
		const offscreen = this.offscreenCanvases.get(id);
		if (offscreen) {
			offscreen.width = canvas.width;
			offscreen.height = canvas.height;
		}

		console.log(`📐 Resized canvas ${id}: ${width}x${height}`);
	}

	/**
	 * Get canvas performance metrics
	 */
	public getMetrics(id: string): CanvasMetrics | null {
		return this.canvasMetrics.get(id) || null;
	}

	/**
	 * Get all canvas metrics
	 */
	public getAllMetrics(): Map<string, CanvasMetrics> {
		return new Map(this.canvasMetrics);
	}

	/**
	 * Cleanup all resources
	 */
	public cleanup(): void {
		// Release all active canvases
		for (const id of this.activeCanvases.keys()) {
			this.releaseCanvas(id);
		}

		// Clear pools
		this.canvasPool = [];
		this.contextPool = [];

		console.log('🧹 Canvas manager cleanup complete');
	}

	// ======================================================================
	// STATIC CONVENIENCE METHODS
	// ======================================================================

	/**
	 * Create optimized render operation
	 */
	public static createRenderOperation(
		type: string,
		priority: number,
		execute: (ctx: CanvasRenderingContext2D) => void,
		options: {
			bounds?: DirtyRect;
			batchable?: boolean;
		} = {}
	): RenderOperation {
		return {
			type,
			priority,
			execute,
			bounds: options.bounds,
			batchable: options.batchable !== false
		};
	}

	/**
	 * Create dirty rectangle
	 */
	public static createDirtyRect(
		x: number,
		y: number,
		width: number,
		height: number,
		priority?: number
	): DirtyRect {
		return { x, y, width, height, priority };
	}
}

// Export singleton instance
export const canvasManager = CanvasManager.getInstance();

// Export convenience functions
export const {
	getContext,
	clearCanvas,
	addDirtyRect,
	addRenderOperation,
	executeBatch,
	releaseCanvas,
	resizeCanvas,
	getMetrics,
	cleanup
} = canvasManager;

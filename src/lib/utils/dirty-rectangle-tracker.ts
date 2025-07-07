// src/lib/utils/dirty-rectangle-tracker.ts
import { browser } from '$app/environment';

/**
 * Represents a dirty region that needs to be redrawn
 */
export interface DirtyRegion {
	x: number;
	y: number;
	width: number;
	height: number;
	priority: number; // Higher priority regions are processed first
	timestamp: number;
	type: 'star' | 'trail' | 'effect' | 'ui' | 'background';
}

/**
 * Configuration for dirty rectangle optimization
 */
interface DirtyRectConfig {
	maxRegions: number; // Maximum number of regions before full clear
	mergeThreshold: number; // Distance threshold for merging regions
	minimumRegionSize: number; // Minimum size of a dirty region
	fullClearRatio: number; // Ratio of screen coverage before full clear
	priorityThreshold: number; // Priority level for immediate processing
}

/**
 * Optimizes canvas clearing by tracking dirty regions instead of clearing everything
 * Significantly improves performance for sparse updates
 */
export class DirtyRectangleTracker {
	private dirtyRegions: DirtyRegion[] = [];
	private canvasWidth: number = 0;
	private canvasHeight: number = 0;
	private config: DirtyRectConfig;
	private lastFullClear: number = 0;
	private fullClearInterval: number = 5000; // Force full clear every 5 seconds
	private framesSinceLastClear: number = 0;
	private stats = {
		regionsTracked: 0,
		regionsMerged: 0,
		fullClears: 0,
		partialClears: 0,
		averageRegionSize: 0
	};

	// Optimization: Spatial hash for fast region overlap detection
	private spatialGrid: Map<string, DirtyRegion[]> = new Map();
	private gridSize: number = 64; // Size of each grid cell
	private gridCols: number = 0;
	private gridRows: number = 0;

	constructor(canvasWidth: number, canvasHeight: number, config?: Partial<DirtyRectConfig>) {
		this.canvasWidth = canvasWidth;
		this.canvasHeight = canvasHeight;

		// Default configuration optimized for starfield rendering
		this.config = {
			maxRegions: 50,
			mergeThreshold: 20,
			minimumRegionSize: 4,
			fullClearRatio: 0.6, // Clear full canvas if 60% is dirty
			priorityThreshold: 8,
			...config
		};

		this.updateSpatialGrid();
	}

	/**
	 * Update canvas dimensions and recalculate spatial grid
	 */
	public updateDimensions(width: number, height: number): void {
		this.canvasWidth = width;
		this.canvasHeight = height;
		this.updateSpatialGrid();
		this.clearAllRegions(); // Clear existing regions as they're now invalid
	}

	/**
	 * Setup spatial grid for efficient region management
	 */
	private updateSpatialGrid(): void {
		this.gridCols = Math.ceil(this.canvasWidth / this.gridSize);
		this.gridRows = Math.ceil(this.canvasHeight / this.gridSize);
		this.spatialGrid.clear();
	}

	/**
	 * Get spatial grid key for a position
	 */
	private getGridKey(x: number, y: number): string {
		const col = Math.floor(x / this.gridSize);
		const row = Math.floor(y / this.gridSize);
		return `${Math.max(0, Math.min(this.gridCols - 1, col))},${Math.max(0, Math.min(this.gridRows - 1, row))}`;
	}

	/**
	 * Add a dirty region to track
	 */
	public addDirtyRegion(
		x: number,
		y: number,
		width: number,
		height: number,
		type: DirtyRegion['type'] = 'star',
		priority: number = 1
	): void {
		// Clamp region to canvas bounds
		const clampedX = Math.max(0, Math.min(this.canvasWidth, x));
		const clampedY = Math.max(0, Math.min(this.canvasHeight, y));
		const clampedWidth = Math.max(
			this.config.minimumRegionSize,
			Math.min(this.canvasWidth - clampedX, width)
		);
		const clampedHeight = Math.max(
			this.config.minimumRegionSize,
			Math.min(this.canvasHeight - clampedY, height)
		);

		// Skip regions that are too small or invalid
		if (
			clampedWidth < this.config.minimumRegionSize ||
			clampedHeight < this.config.minimumRegionSize
		) {
			return;
		}

		const region: DirtyRegion = {
			x: clampedX,
			y: clampedY,
			width: clampedWidth,
			height: clampedHeight,
			priority,
			timestamp: performance.now(),
			type
		};

		// Add to spatial grid for fast overlap detection
		this.addToSpatialGrid(region);

		// Check for immediate merging with nearby regions
		const mergedRegion = this.attemptMergeWithNearby(region);

		if (mergedRegion) {
			// Region was merged, don't add separately
			this.stats.regionsMerged++;
		} else {
			// Add new region
			this.dirtyRegions.push(region);
			this.stats.regionsTracked++;
		}

		// Trigger immediate optimization if needed
		if (this.dirtyRegions.length > this.config.maxRegions) {
			this.optimizeRegions();
		}
	}

	/**
	 * Add a region to the spatial grid
	 */
	private addToSpatialGrid(region: DirtyRegion): void {
		// Add region to all grid cells it overlaps
		const startCol = Math.floor(region.x / this.gridSize);
		const endCol = Math.floor((region.x + region.width) / this.gridSize);
		const startRow = Math.floor(region.y / this.gridSize);
		const endRow = Math.floor((region.y + region.height) / this.gridSize);

		for (let col = startCol; col <= endCol; col++) {
			for (let row = startRow; row <= endRow; row++) {
				const key = `${col},${row}`;
				if (!this.spatialGrid.has(key)) {
					this.spatialGrid.set(key, []);
				}
				this.spatialGrid.get(key)!.push(region);
			}
		}
	}

	/**
	 * Attempt to merge a new region with nearby existing regions
	 */
	private attemptMergeWithNearby(newRegion: DirtyRegion): DirtyRegion | null {
		// Find nearby regions using spatial grid
		const nearbyRegions = this.getNearbyRegions(newRegion);

		for (const existingRegion of nearbyRegions) {
			if (this.shouldMergeRegions(newRegion, existingRegion)) {
				// Merge regions
				const merged = this.mergeRegions(newRegion, existingRegion);

				// Remove old region and add merged region
				this.removeRegion(existingRegion);
				this.addToSpatialGrid(merged);

				// Replace in main array
				const index = this.dirtyRegions.indexOf(existingRegion);
				if (index >= 0) {
					this.dirtyRegions[index] = merged;
				}

				return merged;
			}
		}

		return null;
	}

	/**
	 * Get regions near a given region using spatial grid
	 */
	private getNearbyRegions(region: DirtyRegion): DirtyRegion[] {
		const nearby: Set<DirtyRegion> = new Set();

		// Check grid cells that the region overlaps
		const startCol = Math.floor(region.x / this.gridSize);
		const endCol = Math.floor((region.x + region.width) / this.gridSize);
		const startRow = Math.floor(region.y / this.gridSize);
		const endRow = Math.floor((region.y + region.height) / this.gridSize);

		for (let col = startCol; col <= endCol; col++) {
			for (let row = startRow; row <= endRow; row++) {
				const key = `${col},${row}`;
				const cellRegions = this.spatialGrid.get(key);
				if (cellRegions) {
					cellRegions.forEach((r) => nearby.add(r));
				}
			}
		}

		// Remove the region itself from the set
		nearby.delete(region);

		return Array.from(nearby);
	}

	/**
	 * Check if two regions should be merged
	 */
	private shouldMergeRegions(region1: DirtyRegion, region2: DirtyRegion): boolean {
		// Check if regions are close enough to merge
		const distance = this.getRegionDistance(region1, region2);

		// Merge if regions overlap or are very close
		if (distance <= this.config.mergeThreshold) {
			// Additional checks for merge efficiency
			const merged = this.mergeRegions(region1, region2);
			const originalArea = this.getRegionArea(region1) + this.getRegionArea(region2);
			const mergedArea = this.getRegionArea(merged);

			// Only merge if the combined area isn't too much larger
			const efficiency = originalArea / mergedArea;
			return efficiency > 0.6; // Merge if we maintain 60% efficiency
		}

		return false;
	}

	/**
	 * Calculate distance between two regions
	 */
	private getRegionDistance(region1: DirtyRegion, region2: DirtyRegion): number {
		// Calculate the minimum distance between region boundaries
		const left1 = region1.x;
		const right1 = region1.x + region1.width;
		const top1 = region1.y;
		const bottom1 = region1.y + region1.height;

		const left2 = region2.x;
		const right2 = region2.x + region2.width;
		const top2 = region2.y;
		const bottom2 = region2.y + region2.height;

		// Check if regions overlap (distance = 0)
		if (left1 < right2 && right1 > left2 && top1 < bottom2 && bottom1 > top2) {
			return 0;
		}

		// Calculate minimum distance
		const dx = Math.max(0, Math.max(left1 - right2, left2 - right1));
		const dy = Math.max(0, Math.max(top1 - bottom2, top2 - bottom1));

		return Math.sqrt(dx * dx + dy * dy);
	}

	/**
	 * Merge two regions into one
	 */
	private mergeRegions(region1: DirtyRegion, region2: DirtyRegion): DirtyRegion {
		const minX = Math.min(region1.x, region2.x);
		const minY = Math.min(region1.y, region2.y);
		const maxX = Math.max(region1.x + region1.width, region2.x + region2.width);
		const maxY = Math.max(region1.y + region1.height, region2.y + region2.height);

		return {
			x: minX,
			y: minY,
			width: maxX - minX,
			height: maxY - minY,
			priority: Math.max(region1.priority, region2.priority),
			timestamp: Math.min(region1.timestamp, region2.timestamp),
			type: region1.priority >= region2.priority ? region1.type : region2.type
		};
	}

	/**
	 * Get the area of a region
	 */
	private getRegionArea(region: DirtyRegion): number {
		return region.width * region.height;
	}

	/**
	 * Remove a region from tracking
	 */
	private removeRegion(region: DirtyRegion): void {
		// Remove from main array
		const index = this.dirtyRegions.indexOf(region);
		if (index >= 0) {
			this.dirtyRegions.splice(index, 1);
		}

		// Remove from spatial grid
		this.removeFromSpatialGrid(region);
	}

	/**
	 * Remove a region from the spatial grid
	 */
	private removeFromSpatialGrid(region: DirtyRegion): void {
		const startCol = Math.floor(region.x / this.gridSize);
		const endCol = Math.floor((region.x + region.width) / this.gridSize);
		const startRow = Math.floor(region.y / this.gridSize);
		const endRow = Math.floor((region.y + region.height) / this.gridSize);

		for (let col = startCol; col <= endCol; col++) {
			for (let row = startRow; row <= endRow; row++) {
				const key = `${col},${row}`;
				const cellRegions = this.spatialGrid.get(key);
				if (cellRegions) {
					const regionIndex = cellRegions.indexOf(region);
					if (regionIndex >= 0) {
						cellRegions.splice(regionIndex, 1);
					}

					// Clean up empty cells
					if (cellRegions.length === 0) {
						this.spatialGrid.delete(key);
					}
				}
			}
		}
	}

	/**
	 * Optimize regions by merging overlapping and nearby ones
	 */
	private optimizeRegions(): void {
		// Sort regions by priority and timestamp
		this.dirtyRegions.sort((a, b) => {
			if (a.priority !== b.priority) {
				return b.priority - a.priority; // Higher priority first
			}
			return a.timestamp - b.timestamp; // Older regions first
		});

		// Merge overlapping regions
		const optimized: DirtyRegion[] = [];
		const processed = new Set<DirtyRegion>();

		for (const region of this.dirtyRegions) {
			if (processed.has(region)) continue;

			let currentRegion = region;
			processed.add(region);

			// Try to merge with subsequent regions
			for (const otherRegion of this.dirtyRegions) {
				if (processed.has(otherRegion)) continue;

				if (this.shouldMergeRegions(currentRegion, otherRegion)) {
					currentRegion = this.mergeRegions(currentRegion, otherRegion);
					processed.add(otherRegion);
					this.stats.regionsMerged++;
				}
			}

			optimized.push(currentRegion);
		}

		// Update regions and rebuild spatial grid
		this.dirtyRegions = optimized;
		this.rebuildSpatialGrid();
	}

	/**
	 * Rebuild the spatial grid from current regions
	 */
	private rebuildSpatialGrid(): void {
		this.spatialGrid.clear();
		for (const region of this.dirtyRegions) {
			this.addToSpatialGrid(region);
		}
	}

	/**
	 * Check if a full clear is needed
	 */
	public shouldFullClear(): boolean {
		const now = performance.now();

		// Force full clear periodically
		if (now - this.lastFullClear > this.fullClearInterval) {
			return true;
		}

		// Full clear if too many regions
		if (this.dirtyRegions.length > this.config.maxRegions) {
			return true;
		}

		// Full clear if dirty area is too large
		const totalDirtyArea = this.dirtyRegions.reduce(
			(sum, region) => sum + this.getRegionArea(region),
			0
		);
		const canvasArea = this.canvasWidth * this.canvasHeight;
		const dirtyRatio = totalDirtyArea / canvasArea;

		if (dirtyRatio > this.config.fullClearRatio) {
			return true;
		}

		return false;
	}

	/**
	 * Get regions that need to be cleared, sorted by priority
	 */
	public getRegionsToClear(): DirtyRegion[] {
		// If full clear is needed, return empty array (caller will clear all)
		if (this.shouldFullClear()) {
			return [];
		}

		// Optimize regions before returning
		if (this.dirtyRegions.length > 10) {
			this.optimizeRegions();
		}

		// Return copy sorted by priority
		return [...this.dirtyRegions].sort((a, b) => {
			if (a.priority !== b.priority) {
				return b.priority - a.priority;
			}
			return a.timestamp - b.timestamp;
		});
	}

	/**
	 * Clear all tracked dirty regions
	 */
	public clearAllRegions(): void {
		this.dirtyRegions = [];
		this.spatialGrid.clear();
		this.lastFullClear = performance.now();
		this.framesSinceLastClear = 0;
		this.stats.fullClears++;
	}

	/**
	 * Clear specific regions that have been processed
	 */
	public clearProcessedRegions(regions: DirtyRegion[]): void {
		for (const region of regions) {
			this.removeRegion(region);
		}
		this.framesSinceLastClear++;
		this.stats.partialClears++;
	}

	/**
	 * Add a star movement as a dirty region
	 */
	public addStarMovement(
		prevX: number,
		prevY: number,
		currentX: number,
		currentY: number,
		size: number,
		priority: number = 1
	): void {
		// Create region that encompasses both previous and current position
		const minX = Math.min(prevX, currentX) - size;
		const maxX = Math.max(prevX, currentX) + size;
		const minY = Math.min(prevY, currentY) - size;
		const maxY = Math.max(prevY, currentY) + size;

		this.addDirtyRegion(minX, minY, maxX - minX, maxY - minY, 'star', priority);
	}

	/**
	 * Add a trail effect as a dirty region
	 */
	public addTrailEffect(
		startX: number,
		startY: number,
		endX: number,
		endY: number,
		width: number,
		priority: number = 2
	): void {
		// Create region that encompasses the entire trail
		const minX = Math.min(startX, endX) - width / 2;
		const maxX = Math.max(startX, endX) + width / 2;
		const minY = Math.min(startY, endY) - width / 2;
		const maxY = Math.max(startY, endY) + width / 2;

		this.addDirtyRegion(minX, minY, maxX - minX, maxY - minY, 'trail', priority);
	}

	/**
	 * Get performance statistics
	 */
	public getStats() {
		return {
			...this.stats,
			currentRegions: this.dirtyRegions.length,
			totalDirtyArea: this.dirtyRegions.reduce(
				(sum, region) => sum + this.getRegionArea(region),
				0
			),
			averageRegionSize:
				this.dirtyRegions.length > 0
					? this.dirtyRegions.reduce((sum, region) => sum + this.getRegionArea(region), 0) /
						this.dirtyRegions.length
					: 0
		};
	}

	/**
	 * Update configuration
	 */
	public updateConfig(newConfig: Partial<DirtyRectConfig>): void {
		this.config = { ...this.config, ...newConfig };
	}

	/**
	 * Reset all statistics
	 */
	public resetStats(): void {
		this.stats = {
			regionsTracked: 0,
			regionsMerged: 0,
			fullClears: 0,
			partialClears: 0,
			averageRegionSize: 0
		};
	}
}

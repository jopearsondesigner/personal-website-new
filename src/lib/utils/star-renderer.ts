// src/lib/utils/star-renderer.ts
//
// // Use the correct type from the DOM
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
}

export class StarRenderer {
	private ctx: CanvasRenderingContext2D;
	private containerWidth: number;
	private containerHeight: number;
	private maxDepth: number;
	private starColors: string[];
	private enableGlow: boolean;
	private renderMode: RenderMode;
	private devicePixelRatio: number;
	private quality: number = 1.0; // Default maximum quality
	private maxGlowStars: number = 50;
	private useSimplifiedRendering: boolean = false;
	private skipDetailedEffects: boolean = false;
	private reduceBatchSize: boolean = false;

	// Optimization: Pre-calculate frequently used values
	private colorCache: Map<number, string> = new Map();
	private sizeCache: Map<number, number> = new Map();

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

		// Initialize color cache
		this.updateColorCache();
	}

	/**
	 * Optimization: Implement render quality levels
	 * Benefit: Automatically scales rendering detail based on performance
	 */
	public setRenderQuality(quality: number): void {
		// Quality is a value between 0 and 1
		this.quality = Math.max(0, Math.min(1, quality));

		// Adjust rendering based on quality
		this.maxGlowStars = Math.floor(50 * this.quality);
		this.useSimplifiedRendering = this.quality < 0.7;
		this.skipDetailedEffects = this.quality < 0.5;
		this.reduceBatchSize = this.quality < 0.3;

		// Update internal caches
		this.updateColorCache();
	}

	/**
	 * Optimization: Pre-calculate frequently used values
	 * Benefit: Reduces calculations in render loop
	 */
	private updateColorCache(): void {
		this.colorCache.clear();
		this.sizeCache.clear();

		// Pre-calculate color values for common depth levels
		for (let depth = 0; depth <= this.maxDepth; depth++) {
			const normalizedDepth = depth / this.maxDepth;
			const colorIndex = Math.floor((1 - normalizedDepth) * (this.starColors.length - 1));
			this.colorCache.set(depth, this.starColors[colorIndex]);

			// Pre-calculate sizes
			const baseSize = (1 - normalizedDepth) * 3;
			this.sizeCache.set(depth, this.calculateStarSize(baseSize));
		}
	}

	public projectStar(star: StarProperties): RenderedStar | null {
		const centerX = this.containerWidth / 2;
		const centerY = this.containerHeight / 2;
		const scale = this.maxDepth / star.z;

		const x2d = (star.x - centerX) * scale + centerX;
		const y2d = (star.y - centerY) * scale + centerY;

		// Skip offscreen stars with margin
		if (
			x2d < -10 ||
			x2d >= this.containerWidth + 10 ||
			y2d < -10 ||
			y2d >= this.containerHeight + 10
		) {
			return null;
		}

		const prevScale = this.maxDepth / (star.z + 0.25); // Base speed
		const prevX2d = (star.prevX - centerX) * prevScale + centerX;
		const prevY2d = (star.prevY - centerY) * prevScale + centerY;

		// Use cached values if available
		const size =
			this.sizeCache.get(Math.round(star.z)) ||
			this.calculateStarSize((1 - star.z / this.maxDepth) * 3);
		const color = this.colorCache.get(Math.round(star.z)) || this.calculateStarColor(star.z);

		return {
			x2d,
			y2d,
			size,
			prevX2d,
			prevY2d,
			z: star.z,
			color
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

	private calculateStarColor(z: number): string {
		const colorIndex = Math.floor((1 - z / this.maxDepth) * (this.starColors.length - 1));
		return this.starColors[colorIndex];
	}

	/**
	 * Optimization: Simplified drawing path for low-end devices
	 * Benefit: Faster rendering on devices that need it most
	 */
	public drawStars(stars: RenderedStar[], speed: number): void {
		if (stars.length === 0) return;

		// Choose rendering strategy based on quality setting
		if (this.useSimplifiedRendering) {
			this.drawStarsSimplified(stars);
		} else {
			this.drawStarsDetailed(stars, speed);
		}
	}

	private drawStarsSimplified(stars: RenderedStar[]): void {
		// Group stars by color only
		const starsByColor = new Map<string, RenderedStar[]>();

		// Simplified star processing - less granular batching
		for (const star of stars) {
			if (!starsByColor.has(star.color)) {
				starsByColor.set(star.color, []);
			}
			starsByColor.get(star.color)?.push(star);
		}

		// Disable glow for simplified rendering
		if (this.ctx.shadowBlur > 0) {
			this.ctx.shadowBlur = 0;
			this.ctx.shadowColor = 'transparent';
		}

		// Draw all stars of each color
		starsByColor.forEach((groupStars, color) => {
			this.ctx.fillStyle = color;
			this.ctx.beginPath();

			for (const star of groupStars) {
				// Simplified circle drawing - fixed size approach
				this.ctx.rect(star.x2d - star.size / 2, star.y2d - star.size / 2, star.size, star.size);
			}

			this.ctx.fill();
		});
	}

	private drawStarsDetailed(stars: RenderedStar[], speed: number): void {
		// Group stars by rendering mode and color
		const starsByMode = new Map<string, RenderedStar[]>();

		for (const star of stars) {
			const isTrail = speed > 0.25 * 1.5; // Base speed * 1.5
			const key = `${isTrail ? 'trail' : 'circle'}_${star.color}`;

			if (!starsByMode.has(key)) {
				starsByMode.set(key, []);
			}
			starsByMode.get(key)?.push(star);
		}

		// Draw each group
		starsByMode.forEach((groupStars, key) => {
			if (groupStars.length === 0) return;

			const isTrail = key.startsWith('trail_');
			const color = key.substring(key.indexOf('_') + 1);

			if (isTrail) {
				this.drawTrails(groupStars, color);
			} else {
				this.drawCircles(groupStars, color);
			}
		});
	}

	private drawTrails(stars: RenderedStar[], color: string): void {
		this.ctx.strokeStyle = color;
		this.ctx.beginPath();

		const enableGlowForThisGroup =
			this.enableGlow && !this.skipDetailedEffects && stars.length <= this.maxGlowStars;

		for (const star of stars) {
			if (enableGlowForThisGroup) {
				this.ctx.shadowColor = color;
				this.ctx.shadowBlur = star.size * 2;
			}

			this.ctx.lineWidth = star.size;
			this.ctx.moveTo(star.prevX2d, star.prevY2d);
			this.ctx.lineTo(star.x2d, star.y2d);
		}

		this.ctx.stroke();

		if (enableGlowForThisGroup) {
			this.ctx.shadowColor = 'transparent';
			this.ctx.shadowBlur = 0;
		}
	}

	private drawCircles(stars: RenderedStar[], color: string): void {
		this.ctx.fillStyle = color;
		this.ctx.beginPath();

		const enableGlowForThisGroup =
			this.enableGlow && !this.skipDetailedEffects && stars.length <= this.maxGlowStars;

		for (const star of stars) {
			if (enableGlowForThisGroup) {
				this.ctx.shadowColor = color;
				this.ctx.shadowBlur = star.size * 2;
			}

			this.ctx.moveTo(star.x2d + star.size, star.y2d);
			this.ctx.arc(star.x2d, star.y2d, star.size, 0, Math.PI * 2);
		}

		this.ctx.fill();

		if (enableGlowForThisGroup) {
			this.ctx.shadowColor = 'transparent';
			this.ctx.shadowBlur = 0;
		}
	}
}

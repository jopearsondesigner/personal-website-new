// Use the correct type from the DOM
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

		const size = this.calculateStarSize(star.z);
		const color = this.calculateStarColor(star.z);

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

	private calculateStarSize(z: number): number {
		const baseSize = (1 - z / this.maxDepth) * 3;

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

	public drawStars(stars: RenderedStar[], speed: number): void {
		if (stars.length === 0) return;

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

		for (const star of stars) {
			if (this.enableGlow) {
				this.ctx.shadowColor = color;
				this.ctx.shadowBlur = star.size * 2;
			}

			this.ctx.lineWidth = star.size;
			this.ctx.moveTo(star.prevX2d, star.prevY2d);
			this.ctx.lineTo(star.x2d, star.y2d);
		}

		this.ctx.stroke();

		if (this.enableGlow) {
			this.ctx.shadowColor = 'transparent';
			this.ctx.shadowBlur = 0;
		}
	}

	private drawCircles(stars: RenderedStar[], color: string): void {
		this.ctx.fillStyle = color;
		this.ctx.beginPath();

		for (const star of stars) {
			if (this.enableGlow) {
				this.ctx.shadowColor = color;
				this.ctx.shadowBlur = star.size * 2;
			}

			this.ctx.moveTo(star.x2d + star.size, star.y2d);
			this.ctx.arc(star.x2d, star.y2d, star.size, 0, Math.PI * 2);
		}

		this.ctx.fill();

		if (this.enableGlow) {
			this.ctx.shadowColor = 'transparent';
			this.ctx.shadowBlur = 0;
		}
	}
}

// File: src/lib/types/animation.ts

export interface Star {
	id: number;
	inUse: boolean;
	x: number;
	y: number;
	z: number;
	opacity: number;
	style: string;
}

export interface AnimationState {
	stars: Star[];
	glitchInterval: number | null;
	animationFrame: number | null;
	glowAnimation: any | null;
	isAnimating: boolean;
}

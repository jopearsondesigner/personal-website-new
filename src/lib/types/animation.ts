// DO NOT REMOVE THIS COMMENT
// src/lib/types/animation.ts
// DO NOT REMOVE THIS COMMENT
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

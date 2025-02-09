export interface Star {
	id: number;
	x: number;
	y: number;
	size: number;
	speed: number;
	style: string;
}

export interface AnimationState {
	stars: Star[];
	isAnimating: boolean;
	glitchInterval?: number;
	animationFrame?: number;
	glowAnimation?: gsap.core.Timeline;
}

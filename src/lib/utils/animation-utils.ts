// File: src/lib/utils/animation-utils.ts
import type { Star } from '$lib/types/animation';

interface Star {
	id: number; // Add this line
	x: number;
	y: number;
	z: number;
	opacity: number;
	style: string;
}

// Define individual functions first
function createGlitchEffect(element: HTMLElement | null) {
	if (!element) return;

	// Lightweight random calculation
	const intensity = Math.random();
	if (intensity > 0.92) {
		// Only trigger 8% of the time for performance
		const offsetX = (Math.random() * 6 - 3) | 0; // Bitwise OR for faster integer conversion
		const offsetY = (Math.random() * 6 - 3) | 0;
		const blur = (Math.random() * 4 + 1) | 0;

		element.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
		element.style.filter = `blur(${blur}px)`;

		// Use requestAnimationFrame for better performance
		requestAnimationFrame(() => {
			setTimeout(() => {
				if (element) {
					element.style.transform = '';
					element.style.filter = '';
				}
			}, 50);
		});
	}
}

function initStars(count = 300): Star[] {
	return Array.from({ length: count }, (_, index) => ({
		id: index, // Add unique id
		x: Math.random() * 100,
		y: Math.random() * 100,
		z: Math.random() * 0.7 + 0.1,
		opacity: Math.random() * 0.5 + 0.5,
		style: ''
	}));
}

function updateStars(stars: Star[]): Star[] {
	return stars.map((star) => {
		const newZ = star.z - 0.004;
		const finalZ = newZ <= 0 ? 0.8 : newZ;
		const newX = newZ <= 0 ? Math.random() * 100 : star.x;
		const newY = newZ <= 0 ? Math.random() * 100 : star.y;

		const scale = 0.2 / finalZ;
		const x = (newX - 50) * scale + 50;
		const y = (newY - 50) * scale + 50;
		const size = Math.max(scale * 1.5, 1);
		const opacity = Math.min(1, star.opacity * (scale * 3));

		return {
			id: star.id, // Preserve the id
			x: newX,
			y: newY,
			z: finalZ,
			opacity: star.opacity,
			style: `left: ${x}%; top: ${y}%; width: ${size}px; height: ${size}px; opacity: ${opacity}; transform: translateZ(${finalZ * 100}px);`
		};
	});
}

// Create a class for managing glitch effects
class GlitchManager {
	private elements: HTMLElement[] = [];
	private interval: number | null = null;
	private frameId: number | null = null;
	private isRunning: boolean = false;

	start(elements: HTMLElement[]) {
		this.elements = elements;
		this.isRunning = true;

		const glitchLoop = () => {
			if (!this.isRunning) return;

			this.elements.forEach((element) => {
				if (!element) return;

				// Increase probability of glitch effect
				const intensity = Math.random();
				if (intensity > 0.85) {
					// Increased from 0.92 to 0.85 for more frequent glitches
					const offsetX = (Math.random() * 8 - 4) | 0; // Increased range
					const offsetY = (Math.random() * 8 - 4) | 0;
					const blur = (Math.random() * 2) | 0;
					const opacity = Math.random() * 0.3 + 0.7;

					// Apply multiple transformations for a more intense effect
					element.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
					element.style.filter = `blur(${blur}px) brightness(${1 + Math.random() * 0.4})`;
					element.style.opacity = `${opacity}`;

					// Add color shift occasionally
					if (Math.random() > 0.7) {
						const rgb = [0, 1, 2].map(() => Math.random() * 10 - 5);
						element.style.textShadow = `
				${rgb[0]}px 0 rgba(255,0,0,0.5),
				${rgb[1]}px 0 rgba(0,255,0,0.5),
				${rgb[2]}px 0 rgba(0,0,255,0.5)
			  `;
					}

					// Reset after a short delay
					requestAnimationFrame(() => {
						setTimeout(
							() => {
								if (element && this.isRunning) {
									element.style.transform = '';
									element.style.filter = '';
									element.style.opacity = '';
									element.style.textShadow = '';
								}
							},
							50 + Math.random() * 50
						); // Randomized reset timing
					});
				}
			});

			// Randomize the interval between glitches
			const nextFrame = 30 + Math.random() * 100; // More frequent updates
			this.frameId = requestAnimationFrame(() => {
				setTimeout(glitchLoop, nextFrame);
			});
		};

		glitchLoop();
	}

	stop() {
		this.isRunning = false;
		if (this.frameId) {
			cancelAnimationFrame(this.frameId);
			this.frameId = null;
		}
	}

	cleanup() {
		this.stop();
		this.elements.forEach((element) => {
			if (element) {
				element.style.transform = '';
				element.style.filter = '';
				element.style.opacity = '';
				element.style.textShadow = '';
			}
		});
		this.elements = [];
	}
}

// Create a class for managing star fields
class StarFieldManager {
	private stars: Star[];
	private animationFrame: number | null = null;
	private store: typeof animationState;
	private isRunning: boolean = false;

	constructor(store: typeof animationState) {
		this.stars = initStars();
		this.store = store;
	}

	start() {
		if (this.isRunning) return;
		this.isRunning = true;

		const animate = () => {
			if (!this.isRunning) return;
			this.stars = updateStars(this.stars);
			this.store.updateStars(this.stars);
			this.animationFrame = requestAnimationFrame(animate);
		};
		animate();
	}

	stop() {
		this.isRunning = false;
		if (this.animationFrame) {
			cancelAnimationFrame(this.animationFrame);
			this.animationFrame = null;
		}
	}

	getStars() {
		return this.stars;
	}

	cleanup() {
		this.stop();
		this.stars = [];
		this.isRunning = false;
	}
}

// Export the animations object with all the functionality
export const animations = {
	createGlitchEffect,
	initStars,
	updateStars,
	GlitchManager,
	StarFieldManager
};

// Add to your main animation file
const gsapDebug = {
	activeTimelines: [],
	activeScrollTriggers: [],

	init() {
		// Monkey patch GSAP timeline creation
		const originalTimeline = gsap.timeline;
		gsap.timeline = function (...args) {
			const tl = originalTimeline.apply(this, args);
			gsapDebug.activeTimelines.push(tl);

			// Track when timeline is killed
			const originalKill = tl.kill;
			tl.kill = function () {
				const index = gsapDebug.activeTimelines.indexOf(this);
				if (index > -1) {
					gsapDebug.activeTimelines.splice(index, 1);
				}
				return originalKill.apply(this, arguments);
			};

			return tl;
		};

		// Log stats periodically
		setInterval(() => {
			console.log(`Active GSAP timelines: ${this.activeTimelines.length}`);
			console.log(`Active ScrollTriggers: ${ScrollTrigger?.getAll()?.length || 0}`);
		}, 5000);
	}
};

// Initialize after GSAP is loaded
gsapDebug.init();

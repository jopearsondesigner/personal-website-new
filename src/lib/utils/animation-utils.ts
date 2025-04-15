// File: src/lib/utils/animation-utils.ts
import type { Star } from '$lib/types/animation';

interface Star {
	id: number;
	inUse: boolean; // Add this for pooling
	x: number;
	y: number;
	z: number;
	opacity: number;
	style: string;
}

/**
 * Star object pool for efficient memory management
 * Prevents garbage collection pauses by reusing star objects
 */
class StarPool {
	private pool: Star[];
	private capacity: number;
	private size: number;
	private nextId: number = 0;

	constructor(initialCapacity: number) {
		this.capacity = initialCapacity;
		this.size = 0;
		this.pool = new Array(initialCapacity);

		// Pre-allocate all stars during initialization
		this.preAllocate();
	}

	private preAllocate(): void {
		for (let i = 0; i < this.capacity; i++) {
			this.pool[i] = {
				id: this.nextId++,
				inUse: false,
				x: 0,
				y: 0,
				z: 0,
				opacity: 0,
				style: ''
			};
		}
		this.size = this.capacity;
	}

	get(): Star {
		// Find an unused star
		for (let i = 0; i < this.size; i++) {
			if (!this.pool[i].inUse) {
				this.pool[i].inUse = true;
				return this.pool[i];
			}
		}

		// If we need more capacity, expand the pool
		if (this.size < this.capacity) {
			const star = {
				id: this.nextId++,
				inUse: true,
				x: 0,
				y: 0,
				z: 0,
				opacity: 0,
				style: ''
			};
			this.pool[this.size] = star;
			this.size++;
			return star;
		}

		// All stars are in use, reuse the oldest one
		const star = this.pool[0];
		star.inUse = true;

		// Move to end of array (circular buffer approach)
		this.pool.push(this.pool.shift()!);

		return star;
	}

	release(star: Star): void {
		star.inUse = false;
	}

	releaseAll(): void {
		for (let i = 0; i < this.size; i++) {
			this.pool[i].inUse = false;
		}
	}

	getStats(): { active: number; total: number; usage: number } {
		const active = this.getActiveCount();
		return {
			active,
			total: this.size,
			usage: active / this.size
		};
	}

	getActiveCount(): number {
		let count = 0;
		for (let i = 0; i < this.size; i++) {
			if (this.pool[i].inUse) {
				count++;
			}
		}
		return count;
	}

	getTotalCount(): number {
		return this.size;
	}
}

// Create a global star pool
let starPool: StarPool | null = null;

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
	// Initialize the pool if it doesn't exist
	if (!starPool) {
		starPool = new StarPool(Math.ceil(count * 1.2)); // 20% extra capacity
	}

	const stars: Star[] = [];

	// Get stars from the pool and initialize them
	for (let i = 0; i < count; i++) {
		const star = starPool.get();
		star.x = Math.random() * 100;
		star.y = Math.random() * 100;
		star.z = Math.random() * 0.7 + 0.1;
		star.opacity = Math.random() * 0.5 + 0.5;
		star.style = '';
		stars.push(star);
	}

	return stars;
}

function updateStars(stars: Star[]): Star[] {
	// Create a new array for active stars
	const updatedStars: Star[] = [];

	for (let i = 0; i < stars.length; i++) {
		const star = stars[i];

		const newZ = star.z - 0.004;
		// If star passed beyond view, release it back to pool and get a new one
		if (newZ <= 0) {
			if (starPool) {
				starPool.release(star);
				const newStar = starPool.get();
				newStar.x = Math.random() * 100;
				newStar.y = Math.random() * 100;
				newStar.z = 0.8; // Reset to far distance
				newStar.opacity = Math.random() * 0.5 + 0.5;

				const scale = 0.2 / newStar.z;
				const x = (newStar.x - 50) * scale + 50;
				const y = (newStar.y - 50) * scale + 50;
				const size = Math.max(scale * 1.5, 1);
				const opacity = Math.min(1, newStar.opacity * (scale * 3));

				newStar.style = `left: ${x}%; top: ${y}%; width: ${size}px; height: ${size}px; opacity: ${opacity}; transform: translateZ(${newStar.z * 100}px);`;

				updatedStars.push(newStar);
			}
		} else {
			// Update existing star
			const finalZ = newZ;

			const scale = 0.2 / finalZ;
			const x = (star.x - 50) * scale + 50;
			const y = (star.y - 50) * scale + 50;
			const size = Math.max(scale * 1.5, 1);
			const opacity = Math.min(1, star.opacity * (scale * 3));

			// Update star properties without creating a new object
			star.z = finalZ;
			star.style = `left: ${x}%; top: ${y}%; width: ${size}px; height: ${size}px; opacity: ${opacity}; transform: translateZ(${finalZ * 100}px);`;

			updatedStars.push(star);
		}
	}

	return updatedStars;
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

		// Release all stars back to the pool
		if (starPool) {
			for (const star of this.stars) {
				starPool.release(star);
			}
		}

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

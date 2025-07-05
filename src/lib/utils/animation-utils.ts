// File: src/lib/utils/animation-utils.ts - SIMPLIFIED FOR FAST STARTUP
import type { Star as ImportedStar } from '$lib/types/animation';

export interface Star {
	id: number;
	inUse: boolean;
	x: number;
	y: number;
	z: number;
	opacity: number;
	style: string;
}

/**
 * SIMPLIFIED Star object pool for efficient memory management
 * Optimized for fast initialization with minimal overhead
 */
class FastStarPool {
	private pool: Star[];
	private capacity: number;
	private size: number;
	private nextId: number = 0;
	private stats = {
		created: 0,
		reused: 0,
		active: 0
	};

	constructor(initialCapacity: number) {
		this.capacity = initialCapacity;
		this.size = 0;
		this.pool = [];
		
		// Pre-allocate only essential stars for immediate use
		this.preAllocateEssential();
	}

	private preAllocateEssential(): void {
		// Only pre-allocate half the capacity for faster startup
		const essentialCount = Math.floor(this.capacity / 2);
		
		for (let i = 0; i < essentialCount; i++) {
			this.pool[i] = this.createStarObject();
		}
		
		this.size = essentialCount;
		this.stats.created = essentialCount;
	}

	private createStarObject(): Star {
		return {
			id: this.nextId++,
			inUse: false,
			x: 0,
			y: 0,
			z: 0,
			opacity: 0,
			style: ''
		};
	}

	get(): Star {
		// Try to reuse existing star
		for (let i = 0; i < this.size; i++) {
			if (!this.pool[i].inUse) {
				this.pool[i].inUse = true;
				this.stats.reused++;
				this.stats.active++;
				return this.pool[i];
			}
		}

		// Create new star if pool has space
		if (this.size < this.capacity) {
			const star = this.createStarObject();
			star.inUse = true;
			this.pool[this.size] = star;
			this.size++;
			this.stats.created++;
			this.stats.active++;
			return star;
		}

		// Fallback: reuse oldest star
		const star = this.pool[0];
		star.inUse = true;
		this.stats.reused++;
		return star;
	}

	release(star: Star): void {
		star.inUse = false;
		this.stats.active = Math.max(0, this.stats.active - 1);
	}

	releaseAll(): void {
		for (let i = 0; i < this.size; i++) {
			this.pool[i].inUse = false;
		}
		this.stats.active = 0;
	}

	getStats() {
		return {
			...this.stats,
			total: this.size,
			usage: this.stats.active / this.size,
			capacity: this.capacity
		};
	}
}

// Global star pool instance
let starPool: FastStarPool | null = null;

/**
 * FAST star initialization - no complex calculations
 */
function initStars(count = 300): Star[] {
	// Initialize pool if needed
	if (!starPool) {
		starPool = new FastStarPool(Math.ceil(count * 1.3)); // 30% extra capacity
	}

	const stars: Star[] = [];

	// Get stars from pool and set basic properties
	for (let i = 0; i < count; i++) {
		const star = starPool.get();
		
		// Simple initialization - fast and efficient
		star.x = Math.random() * 100;
		star.y = Math.random() * 100;
		star.z = Math.random() * 0.7 + 0.3; // Avoid very far stars for startup
		star.opacity = Math.random() * 0.4 + 0.6; // Keep stars visible
		star.style = '';
		
		stars.push(star);
	}

	return stars;
}

/**
 * OPTIMIZED star update - minimal calculations for smooth animation
 */
function updateStars(stars: Star[]): Star[] {
	const updatedStars: Star[] = [];
	const moveSpeed = 0.004; // Consistent speed

	for (let i = 0; i < stars.length; i++) {
		const star = stars[i];
		const newZ = star.z - moveSpeed;

		if (newZ <= 0 && starPool) {
			// Recycle star
			starPool.release(star);
			const newStar = starPool.get();
			
			// Reset to starting position
			newStar.x = Math.random() * 100;
			newStar.y = Math.random() * 100;
			newStar.z = 0.8;
			newStar.opacity = Math.random() * 0.4 + 0.6;
			
			// Quick style calculation
			updateStarStyle(newStar);
			updatedStars.push(newStar);
		} else {
			// Update existing star
			star.z = newZ;
			updateStarStyle(star);
			updatedStars.push(star);
		}
	}

	return updatedStars;
}

/**
 * FAST style update - optimized for performance
 */
function updateStarStyle(star: Star): void {
	const scale = 0.2 / star.z;
	const x = (star.x - 50) * scale + 50;
	const y = (star.y - 50) * scale + 50;
	const size = Math.max(scale * 1.5, 0.5);
	const opacity = Math.min(1, star.opacity * (scale * 3));

	// Single style assignment for better performance
	star.style = `left:${x}%;top:${y}%;width:${size}px;height:${size}px;opacity:${opacity};transform:translateZ(${star.z * 100}px)`;
}

/**
 * SIMPLIFIED glitch effect - fast and lightweight
 */
function createGlitchEffect(element: HTMLElement | null) {
	if (!element || Math.random() > 0.15) return; // 15% chance for better performance

	const intensity = Math.random();
	if (intensity > 0.7) { // Reduced from original for performance
		const offsetX = (Math.random() * 4 - 2) | 0; // Smaller offsets
		const offsetY = (Math.random() * 4 - 2) | 0;
		const blur = (Math.random() * 2) | 0;

		element.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
		element.style.filter = `blur(${blur}px)`;

		// Quick reset
		setTimeout(() => {
			if (element) {
				element.style.transform = '';
				element.style.filter = '';
			}
		}, 30); // Faster reset
	}
}

/**
 * ENHANCED GlitchManager - optimized for better performance
 */
class GlitchManager {
	private elements: HTMLElement[] = [];
	private isRunning: boolean = false;
	private intervalId: number | null = null;

	start(elements: HTMLElement[]) {
		if (this.isRunning) return;
		
		this.elements = elements.filter(el => el !== null);
		this.isRunning = true;

		// Use interval instead of RAF for more predictable timing
		this.intervalId = window.setInterval(() => {
			this.processGlitch();
		}, 80 + Math.random() * 40); // 80-120ms intervals
	}

	private processGlitch() {
		if (!this.isRunning || this.elements.length === 0) return;

		// Only glitch one element at a time for better performance
		const element = this.elements[Math.floor(Math.random() * this.elements.length)];
		createGlitchEffect(element);
	}

	stop() {
		this.isRunning = false;
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}

	cleanup() {
		this.stop();
		
		// Reset all elements
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

/**
 * SIMPLIFIED StarFieldManager - basic DOM-based starfield for fallback
 */
class StarFieldManager {
	private stars: Star[];
	private animationFrame: number | null = null;
	private store: any;
	private isRunning: boolean = false;

	constructor(store: any) {
		this.stars = initStars(30); // Smaller count for DOM fallback
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
	}
}

/**
 * LIGHTWEIGHT fixed timestep loop - simplified version
 */
function createFixedTimestepLoop(
	update: (deltaTime: number) => void,
	targetFPS: number = 60
) {
	const targetFrameTime = 1000 / targetFPS;
	let running = false;
	let rafId: number | null = null;
	let lastTime = 0;

	function loop(timestamp: number) {
		if (!running) return;

		if (lastTime === 0) {
			lastTime = timestamp;
		}

		const deltaTime = Math.min(timestamp - lastTime, targetFrameTime * 2); // Cap delta
		lastTime = timestamp;

		if (deltaTime >= targetFrameTime) {
			update(deltaTime);
		}

		rafId = requestAnimationFrame(loop);
	}

	return {
		start: () => {
			if (running) return;
			running = true;
			lastTime = 0;
			rafId = requestAnimationFrame(loop);
		},
		stop: () => {
			running = false;
			if (rafId !== null) {
				cancelAnimationFrame(rafId);
				rafId = null;
			}
		}
	};
}

/**
 * Get pool statistics for monitoring
 */
export function getPoolStats() {
	return starPool ? starPool.getStats() : null;
}

/**
 * Force cleanup of pool to free memory
 */
export function cleanupPool() {
	if (starPool) {
		starPool.releaseAll();
	}
}

// Export the simplified animations object
export const animations = {
	createGlitchEffect,
	initStars,
	updateStars,
	GlitchManager,
	StarFieldManager,
	createFixedTimestepLoop
};
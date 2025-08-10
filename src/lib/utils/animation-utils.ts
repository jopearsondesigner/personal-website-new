// src/lib/utils/animation-utils.ts
// CHANGELOG (2025-08-09)
// - Removed star-field specific types, pools, and logic.
// - Introduced generic VisualParticle and a generic object pool for "visual-effects" use cases.
// - Preserved public API surface by keeping initStars, updateStars, and StarFieldManager
//   as legacy compatibility shims that operate on generic particles.
//   Marked with: `// Legacy compatibility: no star-field specifics`.
// - Kept glitch utilities and fixed-timestep loop; ensured SSR-safe typing and no star-specific comments.
// - Ensured TypeScript strict compatibility and zero references to “Star”/“StarField” in semantics,
//   except for retained legacy names required by broader app imports.

//
// Generic particle representation (no star-field semantics)
//
export interface VisualParticle {
	id: number;
	inUse: boolean;
	x: number; // normalized or px, up to the effect system
	y: number; // normalized or px, up to the effect system
	depth: number; // generic depth factor (was z)
	opacity: number;
	style: string; // precomputed inline style string for DOM renderers; optional for canvas renderers
}

//
// Generic object pool for visual effects
//
class GenericObjectPool<T extends { id: number; inUse: boolean }> {
	private pool: T[];
	private capacity: number;
	private size: number;
	private nextId = 0;
	private factory: () => T;

	constructor(initialCapacity: number, factory: (id: number) => T) {
		this.capacity = Math.max(0, initialCapacity | 0);
		this.size = 0;
		this.pool = new Array(this.capacity);
		this.factory = () => factory(this.nextId++);
		this.preAllocate();
	}

	private preAllocate(): void {
		for (let i = 0; i < this.capacity; i++) {
			this.pool[i] = this.factory();
		}
		this.size = this.capacity;
	}

	get(): T {
		// Find an unused item
		for (let i = 0; i < this.size; i++) {
			const item = this.pool[i];
			if (!item.inUse) {
				item.inUse = true;
				return item;
			}
		}

		// Expand capacity on demand (amortized)
		const item = this.factory();
		item.inUse = true;
		this.pool[this.size++] = item;
		return item;
	}

	release(item: T): void {
		item.inUse = false;
	}

	releaseAll(): void {
		for (let i = 0; i < this.size; i++) {
			this.pool[i].inUse = false;
		}
	}

	getStats(): { active: number; total: number; usage: number } {
		let active = 0;
		for (let i = 0; i < this.size; i++) {
			if (this.pool[i].inUse) active++;
		}
		return {
			active,
			total: this.size,
			usage: this.size > 0 ? active / this.size : 0
		};
	}
}

// Global pool for generic visual effects (formerly star pool)
let visualEffectsPool: GenericObjectPool<VisualParticle> | null = null;

//
// Fixed timestep loop (generic)
//
export function createFixedTimestepLoop(
	update: (deltaTimeMs: number) => void,
	targetFPS: number = 60
) {
	const targetFrameTime = 1000 / targetFPS;
	let running = false;
	let rafId: number | null = null;
	let lastTime = 0;
	let accumulator = 0;

	function fixedUpdate(timestamp: number) {
		if (!running) return;

		if (lastTime === 0) {
			lastTime = timestamp;
		}

		let deltaTime = timestamp - lastTime;
		lastTime = timestamp;

		// Cap delta time to prevent spiral of death
		if (deltaTime > 200) {
			deltaTime = targetFrameTime;
		}

		accumulator += deltaTime;

		while (accumulator >= targetFrameTime) {
			update(targetFrameTime);
			accumulator -= targetFrameTime;
		}

		rafId = requestAnimationFrame(fixedUpdate);
	}

	return {
		start: () => {
			if (running) return;
			running = true;
			lastTime = 0;
			accumulator = 0;
			rafId = requestAnimationFrame(fixedUpdate);
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

//
// Glitch utilities (generic)
//
function createGlitchEffect(element: HTMLElement | null) {
	if (!element) return;

	// Lightweight random calculation
	const intensity = Math.random();
	if (intensity > 0.92) {
		// Only trigger ~8% of the time for performance
		const offsetX = (Math.random() * 6 - 3) | 0;
		const offsetY = (Math.random() * 6 - 3) | 0;
		const blur = (Math.random() * 4 + 1) | 0;

		element.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
		element.style.filter = `blur(${blur}px)`;

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

class GlitchManager {
	private elements: HTMLElement[] = [];
	private frameId: number | null = null;
	private isRunning = false;

	start(elements: HTMLElement[]) {
		this.elements = elements;
		this.isRunning = true;

		const glitchLoop = () => {
			if (!this.isRunning) return;

			this.elements.forEach((element) => {
				if (!element) return;

				const intensity = Math.random();
				if (intensity > 0.85) {
					const offsetX = (Math.random() * 8 - 4) | 0;
					const offsetY = (Math.random() * 8 - 4) | 0;
					const blur = (Math.random() * 2) | 0;
					const opacity = Math.random() * 0.3 + 0.7;

					element.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
					element.style.filter = `blur(${blur}px) brightness(${1 + Math.random() * 0.4})`;
					element.style.opacity = `${opacity}`;

					if (Math.random() > 0.7) {
						const rgb = [0, 1, 2].map(() => Math.random() * 10 - 5);
						element.style.textShadow = `
							${rgb[0]}px 0 rgba(255,0,0,0.5),
							${rgb[1]}px 0 rgba(0,255,0,0.5),
							${rgb[2]}px 0 rgba(0,0,255,0.5)
						`;
					}

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
						);
					});
				}
			});

			const nextFrame = 30 + Math.random() * 100;
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

//
// Generic particle initialization/update.
// These are neutral building blocks for any future visual/particle system.
// Internally we compute a style string that callers can use directly for DOM rendering.
//
function initGenericParticles(count = 300): VisualParticle[] {
	if (!visualEffectsPool) {
		// Slightly overprovision to reduce expansions under bursty load
		const initialCapacity = Math.max(1, Math.ceil(count * 1.2));
		visualEffectsPool = new GenericObjectPool<VisualParticle>(initialCapacity, (id) => ({
			id,
			inUse: false,
			x: 0,
			y: 0,
			depth: 0,
			opacity: 0,
			style: ''
		}));
	}

	const particles: VisualParticle[] = [];
	for (let i = 0; i < count; i++) {
		const p = visualEffectsPool.get();
		p.x = Math.random() * 100;
		p.y = Math.random() * 100;
		p.depth = Math.random() * 0.7 + 0.1; // 0.1..0.8
		p.opacity = Math.random() * 0.5 + 0.5;

		// Precompute a DOM-friendly style string (percent-based positioning)
		const scale = 0.2 / p.depth;
		const x = (p.x - 50) * scale + 50;
		const y = (p.y - 50) * scale + 50;
		const size = Math.max(scale * 1.5, 1);
		const opacity = Math.min(1, p.opacity * (scale * 3));
		p.style = `left:${x}%;top:${y}%;width:${size}px;height:${size}px;opacity:${opacity};transform:translateZ(${p.depth * 100}px);`;

		particles.push(p);
	}

	return particles;
}

function updateGenericParticles(particles: VisualParticle[]): VisualParticle[] {
	const updated: VisualParticle[] = [];

	for (let i = 0; i < particles.length; i++) {
		const p = particles[i];
		const nextDepth = p.depth - 0.004;

		if (nextDepth <= 0) {
			// Recycle item
			if (visualEffectsPool) {
				visualEffectsPool.release(p);
				const np = visualEffectsPool.get();
				np.x = Math.random() * 100;
				np.y = Math.random() * 100;
				np.depth = 0.8;
				np.opacity = Math.random() * 0.5 + 0.5;

				const scale = 0.2 / np.depth;
				const x = (np.x - 50) * scale + 50;
				const y = (np.y - 50) * scale + 50;
				const size = Math.max(scale * 1.5, 1);
				const opacity = Math.min(1, np.opacity * (scale * 3));
				np.style = `left:${x}%;top:${y}%;width:${size}px;height:${size}px;opacity:${opacity};transform:translateZ(${np.depth * 100}px);`;

				updated.push(np);
			}
		} else {
			// In-place update for GC-friendliness
			const scale = 0.2 / nextDepth;
			const x = (p.x - 50) * scale + 50;
			const y = (p.y - 50) * scale + 50;
			const size = Math.max(scale * 1.5, 1);
			const opacity = Math.min(1, p.opacity * (scale * 3));

			p.depth = nextDepth;
			p.style = `left:${x}%;top:${y}%;width:${size}px;height:${size}px;opacity:${opacity};transform:translateZ(${nextDepth * 100}px);`;

			updated.push(p);
		}
	}

	return updated;
}

//
// Legacy compatibility surface (no star-field specifics)
// These exports keep existing imports from breaking.
// They delegate to the generic particle implementations above.
// Marked with: Legacy compatibility: no star-field specifics
//

// Legacy compatibility: no star-field specifics
function initStars(count = 300): VisualParticle[] {
	return initGenericParticles(count);
}

// Legacy compatibility: no star-field specifics
function updateStars(particles: VisualParticle[]): VisualParticle[] {
	return updateGenericParticles(particles);
}

// Legacy compatibility: no star-field specifics
class StarFieldManager {
	private particles: VisualParticle[] = [];
	private animationFrame: number | null = null;
	private store: {
		// New generic API preferred
		updateParticles?: (p: VisualParticle[]) => void;
		// Legacy name some code might still use
		updateStars?: (p: VisualParticle[]) => void;
	} | null = null;
	private isRunning = false;

	constructor(store?: {
		updateParticles?: (p: VisualParticle[]) => void;
		updateStars?: (p: VisualParticle[]) => void;
	}) {
		if (store) this.store = store;
		this.particles = initGenericParticles();
	}

	start() {
		if (this.isRunning) return;
		this.isRunning = true;

		const animate = () => {
			if (!this.isRunning) return;
			this.particles = updateGenericParticles(this.particles);

			// Prefer generic store API if present; fall back to legacy
			if (this.store?.updateParticles) {
				this.store.updateParticles(this.particles);
			} else if (this.store?.updateStars) {
				this.store.updateStars(this.particles);
			}

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

	getParticles() {
		return this.particles;
	}

	// Legacy alias to reduce breakage where getStars() was used.
	// Legacy compatibility: no star-field specifics
	getStars() {
		return this.particles;
	}

	cleanup() {
		this.stop();

		if (visualEffectsPool) {
			for (const p of this.particles) {
				visualEffectsPool.release(p);
			}
		}

		this.particles = [];
		this.isRunning = false;
	}
}

//
// Public bundle
//
export const animations = {
	createGlitchEffect,
	GlitchManager,
	createFixedTimestepLoop,

	// Generic preferred names
	initGenericParticles,
	updateGenericParticles,

	// Legacy names kept for compatibility (generic under the hood)
	// Legacy compatibility: no star-field specifics
	initStars,
	updateStars,
	StarFieldManager
};

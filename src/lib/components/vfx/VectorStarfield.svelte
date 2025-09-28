<!-- src/lib/components/vfx/VectorStarfield.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { memoryManager } from '$lib/utils/memory-manager';

	/*** Public props (tunable) ***/
	export let enabled: boolean = true;

	// Visual & behavior
	export let layers: number = 3; // 1–3 recommended
	export let density: number = 1.0; // 0.5 (light) .. 2.0 (busy)
	export let maxStars: number = 700; // hard cap
	export let baseSpeed: number = 0.32; // world units / second
	export let speedJitter: number = 0.25; // +- % variance per star
	export let perspective: number | null = null; // null => auto (min(w,h)*0.9)
	export let color: string = '#CFFFE6'; // vector-like minty white/green
	export let lineWidth: number = 1.0; // logical px before DPR scaling
	export let brightnessMin: number = 0.7; // 0..1
	export let brightnessMax: number = 1.0; // 0..1
	// Rendering mode
	export let opaque: boolean = false; // false => transparent canvas
	export let fovScale: number = 0.34; // 0.28..0.40 sweet spot; higher = wider spread

	// Performance
	export let targetFPS: number = 60; // 30 for low-end
	export let qualityScale: number = 1.0; // 0.5..1.0; multiplies star budget
	export let lowPowerMode: boolean = false; // force lighter settings

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = null;

	let width = 0,
		height = 0,
		dpr = 1;
	let running = false;
	let rafId = 0;

	type Star = {
		// Direction from center in normalized screen space (unit vector)
		ux: number;
		uy: number;
		// depth (z) in [zNear, zFar] where smaller z => closer
		z: number;
		// base speed factor by layer
		s: number;
		// visual jitter
		bright: number;
		// layer index (0..layers-1)
		layer: number;
		// Pool management
		inUse: boolean;
		reset(): void;
	};

	let stars: Star[] = [];
	let lastTs = 0;

	// Object pool management
	const POOL_NAME = 'starfield-objects';
	let poolInitialized = false;
	let cleanupUnsubscriber: (() => void) | null = null;

	// Performance tracking
	let frameCount = 0;
	let lastStatsUpdate = 0;
	let statsUpdateInterval = 1000; // Update stats every second

	// Layer speed multipliers (near -> faster)
	function layerSpeedMultiplier(i: number, total: number): number {
		if (total <= 1) return 1;
		// roughly [0.5, 1.0, 1.8] for 3 layers
		const base = 0.5;
		const step = (1.8 - base) / Math.max(1, total - 1);
		return base + i * step;
	}

	function pick(n1: number, n2: number) {
		return n1 + Math.random() * (n2 - n1);
	}

	function clamp(n: number, a: number, b: number) {
		return Math.max(a, Math.min(b, n));
	}

	function setupCanvas() {
		if (!canvas) return;

		const container = canvas.parentElement as HTMLElement | null;
		const rect = (container ?? canvas).getBoundingClientRect();

		const nextDpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
		const cssW = Math.max(1, Math.floor(rect.width));
		const cssH = Math.max(1, Math.floor(rect.height));

		if (cssW === width && cssH === height && nextDpr === dpr && ctx) return;

		dpr = nextDpr;
		width = cssW;
		height = cssH;

		const bsW = Math.floor(width * dpr);
		const bsH = Math.floor(height * dpr);
		if (canvas.width !== bsW) canvas.width = bsW;
		if (canvas.height !== bsH) canvas.height = bsH;

		canvas.style.width = `${width}px`;
		canvas.style.height = `${height}px`;

		ctx = canvas.getContext('2d', {
			alpha: !opaque, // ← transparent when opaque=false
			desynchronized: true
		}) as CanvasRenderingContext2D;

		if (ctx) {
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			ctx.lineCap = 'round';
			ctx.globalCompositeOperation = 'source-over';
		}
	}

	function starBudget(): number {
		// Area-based budget with density/quality caps
		const area = width * height;
		const auto = Math.round((area / 4500) * density * qualityScale);
		const capped = Math.min(maxStars, auto);
		// lowPowerMode trims further
		return Math.max(50, Math.floor(lowPowerMode ? capped * 0.6 : capped));
	}

	function initializeObjectPool() {
		if (poolInitialized || typeof window === 'undefined') return;

		try {
			// Create the star factory function
			const starFactory = (): Star => ({
				ux: 0,
				uy: 0,
				z: 1,
				s: 1,
				bright: 1,
				layer: 0,
				inUse: false,
				reset() {
					this.inUse = false;
					this.ux = 0;
					this.uy = 0;
					this.z = 1;
					this.s = 1;
					this.bright = 1;
					this.layer = 0;
				}
			});

			// Create pool with initial capacity
			const initialPoolSize = Math.min(maxStars, 1000);
			memoryManager.createObjectPool(POOL_NAME, starFactory, initialPoolSize);

			// Register cleanup callback
			cleanupUnsubscriber = memoryManager.registerCleanupTask(() => {
				// Return all active stars to pool during cleanup
				for (const star of stars) {
					if (star.inUse) {
						memoryManager.returnToPool(POOL_NAME, star);
					}
				}
				stars.length = 0;
			});

			poolInitialized = true;
			console.log(`🌟 Starfield object pool initialized with ${initialPoolSize} objects`);
		} catch (error) {
			console.error('Failed to initialize starfield object pool:', error);
		}
	}

	function createStarFromPool(layer: number): Star | null {
		if (!poolInitialized) return null;

		try {
			const star = memoryManager.getFromPool<Star>(POOL_NAME, () => ({
				ux: 0,
				uy: 0,
				z: 1,
				s: 1,
				bright: 1,
				layer: 0,
				inUse: false,
				reset() {
					this.inUse = false;
					this.ux = 0;
					this.uy = 0;
					this.z = 1;
					this.s = 1;
					this.bright = 1;
					this.layer = 0;
				}
			}));

			if (star) {
				// Initialize star properties
				const theta = Math.random() * Math.PI * 2;
				star.ux = Math.cos(theta);
				star.uy = Math.sin(theta);
				star.bright = pick(brightnessMin, brightnessMax);
				star.z = pick(0.55, 1.1);
				star.s = layerSpeedMultiplier(layer, layers) * (1 + (Math.random() * 2 - 1) * speedJitter);
				star.layer = layer;
				star.inUse = true;
			}

			return star;
		} catch (error) {
			console.error('Error getting star from pool:', error);
			return null;
		}
	}

	function returnStarToPool(star: Star) {
		if (!poolInitialized || !star.inUse) return;

		try {
			memoryManager.returnToPool(POOL_NAME, star);
		} catch (error) {
			console.error('Error returning star to pool:', error);
		}
	}

	function rebuildPool() {
		if (!poolInitialized) {
			initializeObjectPool();
		}

		// Return all current stars to pool
		for (const star of stars) {
			if (star.inUse) {
				returnStarToPool(star);
			}
		}
		stars.length = 0;

		const count = starBudget();

		// Get new stars from pool
		for (let i = 0; i < count; i++) {
			const layer = layers > 1 ? i % layers : 0;
			const star = createStarFromPool(layer);
			if (star) {
				stars.push(star);
			}
		}

		// Update pool statistics
		updatePoolStatistics();
	}

	function updatePoolStatistics() {
		if (!poolInitialized) return;

		try {
			const now = performance.now();

			// Bail out quickly if we do not need to emit an update yet.
			if (now - lastStatsUpdate <= statsUpdateInterval) {
				return;
			}

			// Calculating active stars by filtering on every animation frame was
			// surprisingly expensive (it allocates a fresh array and walks the
			// entire star list). In practice every star in the list is "active"
			// while the effect is running, so we can just report the length.
			// This keeps the update O(1) and avoids the per-frame GC pressure
			// that was contributing to low FPS on mid-tier devices.
			const activeStars = stars.length;

			memoryManager.updatePoolStats(POOL_NAME, {
				activeObjects: activeStars,
				poolName: 'Starfield',
				poolType: 'Visual Effect'
			});
			lastStatsUpdate = now;
		} catch (error) {
			console.error('Error updating pool statistics:', error);
		}
	}

	function recycleStar(star: Star) {
		if (!poolInitialized) return;

		// Reset star to far distance
		star.z = pick(0.6, 1.0);

		// Randomize direction slightly on recycle
		const theta = Math.random() * Math.PI * 2;
		star.ux = Math.cos(theta);
		star.uy = Math.sin(theta);
		star.bright = pick(brightnessMin, brightnessMax);

		// This counts as a "reuse" in pool statistics
		// The memory manager will track this automatically
	}

	function projectAndDraw(now: number) {
		if (!ctx) return;

		// If a global frameRateController exists, allow it to throttle
		const frc: any = (window as any)?.frameRateController ?? null;
		if (frc?.shouldRenderFrame && !frc.shouldRenderFrame()) {
			rafId = requestAnimationFrame(projectAndDraw);
			return;
		}

		const dt = Math.min(0.05, (now - lastTs) / 1000 || 0);
		lastTs = now;
		frameCount++;

		// Optional target FPS frame skipping
		if (targetFPS && targetFPS < 60) {
			// simple accumulator skip
			const frameInterval = 1 / targetFPS;
			(projectAndDraw as any)._acc = ((projectAndDraw as any)._acc || 0) + dt;
			if ((projectAndDraw as any)._acc < frameInterval * 0.9) {
				rafId = requestAnimationFrame(projectAndDraw);
				return;
			}
			(projectAndDraw as any)._acc = 0;
		}

		// Clear frame: transparent if not opaque; solid black if opaque
		if (opaque) {
			ctx.fillStyle = '#000';
			ctx.fillRect(0, 0, width, height);
		} else {
			ctx.clearRect(0, 0, width, height);
		}

		const cx = width / 2;
		const cy = height / 2;
		// AFTER: tunable FOV
		const fov = perspective ?? fovScale * Math.min(width, height);
		const lw = Math.max(0.5, lineWidth); // logical px; DPR is in transform

		ctx.save();
		ctx.lineWidth = lw;
		ctx.strokeStyle = color;

		for (let i = 0; i < stars.length; i++) {
			const st = stars[i];
			if (!st.inUse) continue;

			// advance depth
			const zSpeed = baseSpeed * st.s;
			st.z -= zSpeed * dt;

			// recycle when too close
			if (st.z < 0.08) {
				recycleStar(st);
				continue;
			}

			// project to screen
			const invz = 1 / st.z;
			const sx = cx + st.ux * fov * invz;
			const sy = cy + st.uy * fov * invz;

			// streak length scales with speed and depth (shorter when far)
			const streak = clamp(zSpeed * 22 * invz, 1, 6);
			// compute tail (toward center = opposite direction of motion)
			const tx = sx - st.ux * streak;
			const ty = sy - st.uy * streak;

			// skip if outside screen (with small margin)
			if (sx < -8 || sx > width + 8 || sy < -8 || sy > height + 8) continue;

			// brightness per star (alpha)
			const a = clamp(st.bright, 0, 1);
			ctx.globalAlpha = a;

			// draw line
			ctx.beginPath();
			ctx.moveTo(tx, ty);
			ctx.lineTo(sx, sy);
			ctx.stroke();
		}

		ctx.restore();

		// Update pool statistics periodically
		updatePoolStatistics();

		rafId = requestAnimationFrame(projectAndDraw);
	}

	function start() {
		if (running) return;
		running = true;
		lastTs = performance.now();
		rafId = requestAnimationFrame(projectAndDraw);
	}

	function stop() {
		running = false;
		if (rafId) cancelAnimationFrame(rafId);
		rafId = 0;
	}

	function resize() {
		const prevW = width,
			prevH = height,
			prevDpr = dpr;
		setupCanvas();
		if (width !== prevW || height !== prevH || dpr !== prevDpr) {
			rebuildPool();
		}
	}

	let ro: ResizeObserver | null = null;

	onMount(() => {
		if (typeof window === 'undefined') return;

		// Initialize object pool first
		initializeObjectPool();

		setupCanvas();
		rebuildPool();

		// Optional: respond to frameRateController quality
		const frc: any = (window as any)?.frameRateController ?? null;
		let unsubscribe: (() => void) | null = null;
		if (frc?.subscribeQuality) {
			unsubscribe = frc.subscribeQuality((q: number) => {
				qualityScale = clamp(q, 0.4, 1.2);
				rebuildPool();
			});
		}

		// Observe the CONTAINER (parent of canvas)
		const container = canvas.parentElement as HTMLElement | null;
		let ro: ResizeObserver | null = null;
		if (typeof ResizeObserver !== 'undefined' && container) {
			ro = new ResizeObserver(() => {
				resize();
			});
			ro.observe(container);
		}

		// Fallback: window resize (throttled)
		const onWinResize = (() => {
			let raf = 0;
			return () => {
				if (raf) return;
				raf = requestAnimationFrame(() => {
					raf = 0;
					resize();
				});
			};
		})();
		window.addEventListener('resize', onWinResize, { passive: true });

		if (enabled) start();

		return () => {
			stop();

			// Return all stars to pool before cleanup
			for (const star of stars) {
				if (star.inUse) {
					returnStarToPool(star);
				}
			}
			stars.length = 0;

			if (ro) ro.disconnect();
			window.removeEventListener('resize', onWinResize);
			if (unsubscribe) unsubscribe();
			if (cleanupUnsubscriber) cleanupUnsubscriber();
			ctx = null;
		};
	});

	$: {
		// react to toggling
		if (enabled && !running && typeof window !== 'undefined') start();
		if (!enabled && running) stop();
	}

	// Rebuild if key visual knobs change at runtime
	$: if (layers || density || maxStars || baseSpeed || brightnessMin || brightnessMax) {
		if (typeof window !== 'undefined') rebuildPool();
	}
</script>

<!-- Absolute-fill canvas; inherits rounded corners from parent container -->
<canvas
	bind:this={canvas}
	aria-hidden="true"
	style="
		position:absolute;
		inset:0;
		width:100%;
		height:100%;
		pointer-events:none;
	"
/>

<style>
	/* Keep styles minimal—radius is inherited from parent container via clipping */
	:global(.starfield-container) {
		position: absolute;
		inset: 0;
		border-radius: var(--border-radius);
		overflow: hidden;
		z-index: 2;
		pointer-events: none;
	}
</style>

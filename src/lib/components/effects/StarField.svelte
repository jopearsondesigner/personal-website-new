<!-- src/lib/components/effects/StarField.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { StarPool, type StarPoolObject } from '$lib/utils/star-pool';
	import { starPoolBridge } from '$lib/utils/star-pool-bridge';
	import { starPoolTracker } from '$lib/utils/pool-stats-tracker';

	// Props
	export let containerElement: HTMLElement | null = null;
	export let autoStart = true;
	export let starCount = 300;
	export let enableBoost = true;
	export let maxDepth = 32;
	// FASTER MOVEMENT: Increased base and boost speeds
	export let baseSpeed = 0.5; // Doubled from 0.25
	export let boostSpeed = 4; // Doubled from 2

	// Pooled Star Interface
	interface PooledStar extends StarPoolObject {
		x: number;
		y: number;
		z: number;
		prevX: number;
		prevY: number;
		size: number;
		color: string;
		alpha: number;
		age: number;
		maxAge: number;
		isDirty: boolean;
	}

	// Component state
	let canvasElement: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = null;
	let starPool: StarPool<PooledStar>;
	let activeStars: PooledStar[] = [];
	let isRunning = false;
	let boosting = false;
	let animationFrameId: number | null = null;
	let speed = baseSpeed;
	let poolInitialized = false;

	// Star colors with glow
	const starColors = [
		'#0033ff', // Dim blue
		'#4477ff',
		'#6699ff',
		'#88bbff',
		'#aaddff',
		'#ffffff' // Bright white
	];

	// Pool Configuration
	const POOL_CAPACITY = Math.max(starCount * 2, 400); // 2x capacity for efficiency
	const POOL_PREALLOC = true;

	// Star Factory Function
	function createPooledStar(): PooledStar {
		return {
			inUse: false,
			x: 0,
			y: 0,
			z: 0,
			prevX: 0,
			prevY: 0,
			size: 0,
			color: '#ffffff',
			alpha: 1,
			age: 0,
			maxAge: 1000,
			isDirty: false
		};
	}

	// Star Reset Function
	function resetPooledStar(star: PooledStar): void {
		if (!canvasElement) return;

		star.x = Math.random() * canvasElement.width * 2 - canvasElement.width;
		star.y = Math.random() * canvasElement.height * 2 - canvasElement.height;
		star.z = maxDepth; // ✅ FIX: Always start at far end
		star.prevX = star.x;
		star.prevY = star.y;
		star.size = 0;
		star.color = starColors[Math.floor(Math.random() * starColors.length)];
		star.alpha = 1;
		star.age = 0;
		star.maxAge = 1000 + Math.random() * 2000;
		star.isDirty = false;
	}

	// Initialize star pool
	function initStarPool() {
		try {
			if (poolInitialized) {
				return;
			}

			starPool = new StarPool<PooledStar>(POOL_CAPACITY, createPooledStar, resetPooledStar, {
				preAllocate: POOL_PREALLOC,
				hibernationThreshold: 30000,
				statsReportThreshold: 10
			});

			// Initialize active stars from pool
			activeStars = [];
			for (let i = 0; i < starCount; i++) {
				const star = starPool.get();
				resetPooledStar(star);
				activeStars.push(star);
			}

			poolInitialized = true;

			// Report initial pool state
			starPoolBridge.updateActiveCount(activeStars.length, POOL_CAPACITY);
			starPoolTracker.recordObjectCreated(starCount);

			console.log(
				`StarField: Pool initialized with ${starCount} active stars, ${POOL_CAPACITY} total capacity`
			);
		} catch (error) {
			console.error(
				'StarField: Failed to initialize object pool, falling back to simple array:',
				error
			);
			// Fallback to simple initialization if pool fails
			initStarsSimple();
		}
	}

	// Fallback simple initialization (backup)
	function initStarsSimple() {
		activeStars = [];
		for (let i = 0; i < starCount; i++) {
			activeStars.push(createSimpleStar());
		}
	}

	function createSimpleStar(): PooledStar {
		if (!canvasElement) {
			return createPooledStar();
		}

		const star = createPooledStar();
		star.inUse = true;
		resetPooledStar(star);
		return star;
	}

	// Setup canvas
	function setupCanvas() {
		if (!containerElement) return;

		canvasElement = document.createElement('canvas');
		canvasElement.id = 'starfield';
		canvasElement.style.position = 'absolute';
		canvasElement.style.top = '0';
		canvasElement.style.left = '0';
		canvasElement.style.width = '100%';
		canvasElement.style.height = '100%';
		containerElement.appendChild(canvasElement);

		ctx = canvasElement.getContext('2d');
		resizeCanvas();
	}

	// Resize canvas
	function resizeCanvas() {
		if (!canvasElement) return;
		canvasElement.width = window.innerWidth;
		canvasElement.height = window.innerHeight;
	}

	// Get or create star from pool
	function getPooledStar(): PooledStar {
		if (!poolInitialized || !starPool) {
			return createSimpleStar();
		}

		try {
			const star = starPool.get();
			resetPooledStar(star);
			starPoolBridge.recordReused(1);
			return star;
		} catch (error) {
			console.warn('StarField: Pool get failed, creating simple star:', error);
			return createSimpleStar();
		}
	}

	// Release star back to pool
	function releasePooledStar(star: PooledStar) {
		if (!poolInitialized || !starPool) {
			return;
		}

		try {
			starPool.release(star);
		} catch (error) {
			console.warn('StarField: Pool release failed:', error);
		}
	}

	// Animation loop with enhanced effects and object pooling
	function animate() {
		if (!isRunning) return;

		animationFrameId = requestAnimationFrame(animate);

		if (!ctx || !canvasElement) return;

		// LONGER TAILS: Reduced alpha for slower fade, creating longer trails
		ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
		ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);

		const centerX = canvasElement.width / 2;
		const centerY = canvasElement.height / 2;

		// Track active/inactive count for pool reporting
		let activeCount = 0;

		for (let i = 0; i < activeStars.length; i++) {
			const star = activeStars[i];
			if (!star) continue;

			activeCount++;

			star.prevX = star.x;
			star.prevY = star.y;

			star.z -= speed;
			star.age++;

			// Check if star needs to be recycled
			if (star.z <= 0) {
				// Reset star to far end instead of getting new one
				if (poolInitialized) {
					// Don't release/get new star, just reset current one
					resetPooledStar(star);
					// Update pool stats for reuse
					starPoolBridge.recordReused(1);
				} else {
					// Fallback: reset in place
					resetPooledStar(star);
				}
				// Skip rendering this frame to avoid flash
				continue;
			}

			const scale = maxDepth / star.z;
			const x2d = (star.x - centerX) * scale + centerX;
			const y2d = (star.y - centerY) * scale + centerY;

			if (x2d < 0 || x2d >= canvasElement.width || y2d < 0 || y2d >= canvasElement.height) {
				continue;
			}

			// LARGER STARS: Increased size for more visibility
			const size = (1 - star.z / maxDepth) * 4; // Changed from 3 to 4
			star.size = size;

			const colorIndex = Math.floor((1 - star.z / maxDepth) * (starColors.length - 1));
			const color = starColors[colorIndex];
			star.color = color;

			// GLOW EFFECT: Add glow to stars
			ctx.shadowColor = color;
			ctx.shadowBlur = size * 3; // Glow radius

			if (speed > baseSpeed * 1.5) {
				const prevScale = maxDepth / (star.z + speed);
				const prevX = (star.prevX - centerX) * prevScale + centerX;
				const prevY = (star.prevY - centerY) * prevScale + centerY;

				// ENHANCED TRAILS: Add glow to trails too
				ctx.beginPath();
				ctx.moveTo(prevX, prevY);
				ctx.lineTo(x2d, y2d);
				ctx.strokeStyle = color;
				ctx.lineWidth = size;
				ctx.stroke();
			} else {
				ctx.beginPath();
				ctx.arc(x2d, y2d, size, 0, Math.PI * 2);
				ctx.fillStyle = color;
				ctx.fill();
			}

			// Reset shadow for next star
			ctx.shadowBlur = 0;
		}

		// Update pool statistics periodically
		if (poolInitialized && Math.random() < 0.01) {
			// 1% chance per frame
			starPoolBridge.updateActiveCount(activeCount, POOL_CAPACITY);
		}

		if (!boosting && speed > baseSpeed) {
			speed = Math.max(baseSpeed, speed * 0.98);
		}
	}

	// Event handlers
	function handleKeyDown(e: KeyboardEvent) {
		if (e.code === 'Space') {
			e.preventDefault();
			boosting = true;
			speed = boostSpeed;
		}
	}

	function handleKeyUp(e: KeyboardEvent) {
		if (e.code === 'Space') {
			e.preventDefault();
			boosting = false;
		}
	}

	function handleTouchStart() {
		boosting = true;
		speed = boostSpeed;
	}

	function handleTouchEnd() {
		boosting = false;
	}

	// Start animation
	export function start() {
		if (isRunning) return;
		isRunning = true;
		animate();
	}

	// Stop animation
	export function stop() {
		isRunning = false;
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
	}

	// Public boost methods
	export function boost() {
		boosting = true;
		speed = boostSpeed;
	}

	export function unboost() {
		boosting = false;
	}

	// Get pool statistics (for debugging)
	export function getPoolStats() {
		if (!poolInitialized || !starPool) {
			return {
				active: activeStars.length,
				total: activeStars.length,
				usage: 1,
				created: activeStars.length,
				reused: 0,
				reuseRatio: 0,
				poolInitialized: false
			};
		}

		return {
			...starPool.getStats(),
			poolInitialized: true
		};
	}

	// Log pool statistics
	export function logPoolStats() {
		const stats = getPoolStats();
		console.log('StarField Pool Stats:', stats);

		if (poolInitialized && starPool) {
			starPool.logPoolStats();
		}
	}

	// Lifecycle
	onMount(() => {
		if (!browser) return;

		if (containerElement) {
			setupCanvas();

			// Initialize pool after canvas is ready
			setTimeout(() => {
				initStarPool();

				if (enableBoost) {
					window.addEventListener('keydown', handleKeyDown);
					window.addEventListener('keyup', handleKeyUp);
					window.addEventListener('touchstart', handleTouchStart);
					window.addEventListener('touchend', handleTouchEnd);
				}

				window.addEventListener('resize', resizeCanvas);

				if (autoStart) {
					start();
				}
			}, 0);
		}
	});

	onDestroy(() => {
		if (!browser) return;

		// Stop animation
		stop();

		// Clean up event listeners
		if (enableBoost) {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
			window.removeEventListener('touchstart', handleTouchStart);
			window.removeEventListener('touchend', handleTouchEnd);
		}

		window.removeEventListener('resize', resizeCanvas);

		// Clean up pool and release all stars
		if (poolInitialized && starPool) {
			try {
				// Release all active stars back to pool
				for (const star of activeStars) {
					if (star && star.inUse) {
						starPool.release(star);
					}
				}

				// Clean up pool
				starPool.releaseAll();
				starPool.destroy();

				// Final stats report
				starPoolBridge.forceSyncStats();

				console.log('StarField: Pool cleanup complete');
			} catch (error) {
				console.warn('StarField: Error during pool cleanup:', error);
			}
		}

		// Clear references
		activeStars = [];
		poolInitialized = false;

		// Remove canvas
		if (canvasElement && canvasElement.parentNode) {
			canvasElement.parentNode.removeChild(canvasElement);
		}
	});
</script>

<div class="starfield-wrapper w-full h-full">
	<slot></slot>
</div>

<style>
	.starfield-wrapper {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
		display: block;
	}
</style>

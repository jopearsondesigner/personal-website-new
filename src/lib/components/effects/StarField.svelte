<!-- src/lib/components/effects/StarField.svelte -->
<script lang="ts">
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { browser } from '$app/environment';
	import { get } from 'svelte/store';
	import { deviceCapabilities } from '$lib/utils/device-performance';
	import { animationState } from '$lib/stores/animation-store';
	import { createThrottledRAF, createFixedTimestepLoop } from '$lib/utils/animation-helpers';

	// Props
	export let containerElement: HTMLElement | null = null;
	export let autoStart = true;
	export let starCount = 300; // Updated to match reference
	export let enableBoost = true;
	export let enableGlow = true;
	export let gameTitle: string | undefined = undefined;
	export let startText: string | undefined = undefined;
	export let withStartScreen = false;

	// Component state
	let canvasElement: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = null;
	let stars: Star[] = [];
	let isRunning = false;
	let isBoosting = false;
	let isPaused = false;
	let animationFrameId: number | null = null;
	let dispatch = createEventDispatcher();
	let resizeObserver: ResizeObserver | null = null;
	let lastTime = 0;
	let frameCount = 0;
	let fixedStepLoop: { start: () => void; stop: () => void } | null = null;

	// Performance monitoring
	let fpsMonitor = {
		frames: 0,
		lastCheck: 0,
		fps: 0
	};

	// Star properties
	let maxDepth = 32;
	let speed = 0.25;
	let baseSpeed = 0.25;
	let boostSpeed = 2;

	// Colors (blue to white gradient for stars)
	const starColors = [
		'#0033ff', // Dim blue
		'#4477ff',
		'#6699ff',
		'#88bbff',
		'#aaddff',
		'#ffffff' // Bright white
	];

	// Star interface
	interface Star {
		x: number;
		y: number;
		z: number;
		prevX: number;
		prevY: number;
	}

	// Batch star interface for optimized rendering
	interface BatchStar {
		x2d: number; // Projected x coordinate
		y2d: number; // Projected y coordinate
		size: number; // Rendered size
		prevX2d?: number; // Previous projected x (for trails)
		prevY2d?: number; // Previous projected y (for trails)
	}

	// Initialize stars
	function initStars() {
		stars = [];
		const containerWidth = containerElement?.clientWidth || window.innerWidth;
		const containerHeight = containerElement?.clientHeight || window.innerHeight;

		for (let i = 0; i < starCount; i++) {
			createStar(containerWidth, containerHeight);
		}
	}

	function createStar(containerWidth: number, containerHeight: number) {
		// Random position in 3D space
		const star = {
			x: Math.random() * containerWidth * 2 - containerWidth,
			y: Math.random() * containerHeight * 2 - containerHeight,
			z: Math.random() * maxDepth,
			prevX: 0,
			prevY: 0
		};

		stars.push(star);
	}

	// Set up canvas
	function setupCanvas() {
		if (!containerElement) return;

		// Check if canvas already exists
		canvasElement = containerElement.querySelector('.star-field-canvas') as HTMLCanvasElement;

		if (!canvasElement) {
			// Create new canvas
			canvasElement = document.createElement('canvas');
			canvasElement.className = 'star-field-canvas';
			canvasElement.style.position = 'absolute';
			canvasElement.style.top = '0';
			canvasElement.style.left = '0';
			canvasElement.style.width = '100%';
			canvasElement.style.height = '100%';
			canvasElement.style.pointerEvents = 'none';
			containerElement.appendChild(canvasElement);
		}

		// Set canvas size to match container
		resizeCanvas();

		// Get context with alpha for proper blending
		ctx = canvasElement.getContext('2d', { alpha: true });

		// Apply hardware acceleration hints
		if (canvasElement) {
			canvasElement.style.transform = 'translateZ(0)';
			canvasElement.style.backfaceVisibility = 'hidden';
		}
	}

	// Resize canvas to match container
	function resizeCanvas() {
		if (!canvasElement || !containerElement) return;

		const { width, height } = containerElement.getBoundingClientRect();
		const dpr = window.devicePixelRatio || 1;

		// Set internal dimensions for high DPI displays
		canvasElement.width = width * dpr;
		canvasElement.height = height * dpr;

		// Set display size
		canvasElement.style.width = `${width}px`;
		canvasElement.style.height = `${height}px`;

		// Scale context to account for high DPI displays
		if (ctx) {
			ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
			ctx.scale(dpr, dpr);
		}
	}

	function setupResizeObserver() {
		if (!containerElement || !browser) return;

		// Create throttled resize handler using RAF
		const handleResize = createThrottledRAF(() => {
			if (!ctx || !canvasElement || !containerElement) return;
			resizeCanvas();
		});

		// Use ResizeObserver for efficient size updates
		resizeObserver = new ResizeObserver(handleResize);
		resizeObserver.observe(containerElement);
	}

	// New animation setup with fixed timestep loop
	function setupAnimation() {
		if (fixedStepLoop) {
			fixedStepLoop.stop();
		}

		// Create a fixed timestep loop for physics updates
		fixedStepLoop = createFixedTimestepLoop((deltaTime) => {
			if (!isRunning || !ctx || !canvasElement || !containerElement) return;

			// Get device capabilities for adaptive rendering
			const capabilities = get(deviceCapabilities);

			// Update phase - consistent updates regardless of rendering frame rate
			updateStars(deltaTime);

			// Render phase - can potentially skip frames based on device capabilities
			if (shouldRenderCurrentFrame(capabilities)) {
				renderStars();
			}
		}, 60); // Target 60 physics updates per second

		// Start the loop
		fixedStepLoop.start();
	}

	// Separate update logic from rendering
	function updateStars(deltaTime: number) {
		const containerWidth = containerElement!.clientWidth;
		const containerHeight = containerElement!.clientHeight;
		const centerX = containerWidth / 2;
		const centerY = containerHeight / 2;

		// Calculate time-based movement scale
		const timeScale = deltaTime / 16.7; // Normalized to 60fps

		for (let i = 0; i < stars.length; i++) {
			const star = stars[i];

			// Store previous position for trails
			star.prevX = star.x;
			star.prevY = star.y;

			// Move star closer to viewer with time-based movement
			star.z -= speed * timeScale;

			// If star passed the viewer, reset it to far distance
			if (star.z <= 0) {
				star.x = Math.random() * containerWidth * 2 - containerWidth;
				star.y = Math.random() * containerHeight * 2 - containerHeight;
				star.z = maxDepth;
				star.prevX = star.x;
				star.prevY = star.y;
			}
		}

		// Gradually return to base speed when not boosting
		if (!isBoosting && speed > baseSpeed) {
			speed = Math.max(baseSpeed, speed * 0.98);
		}

		// Update FPS monitor
		fpsMonitor.frames++;
		const now = performance.now();
		if (now - fpsMonitor.lastCheck >= 1000) {
			fpsMonitor.fps = fpsMonitor.frames;
			fpsMonitor.frames = 0;
			fpsMonitor.lastCheck = now;
		}
	}

	// Determine if we should render this frame (adaptive frame skipping)
	function shouldRenderCurrentFrame(capabilities: any): boolean {
		if (!capabilities) return true;

		if (capabilities.frameSkip > 0) {
			frameCount = (frameCount + 1) % (capabilities.frameSkip + 1);
			return frameCount === 0;
		}

		return true;
	}

	// Optimized rendering separate from updates
	function renderStars() {
		if (!ctx || !containerElement) return;

		const containerWidth = containerElement.clientWidth;
		const containerHeight = containerElement.clientHeight;
		const centerX = containerWidth / 2;
		const centerY = containerHeight / 2;

		// Clear canvas with slight alpha for motion blur effect
		ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
		ctx.fillRect(0, 0, containerWidth, containerHeight);

		// Group stars by rendering properties
		const starsBatches = new Map<string, BatchStar[]>();

		// Project and filter visible stars
		for (let i = 0; i < stars.length; i++) {
			const star = stars[i];

			// Project 3D position to 2D screen
			const scale = maxDepth / star.z;
			const x2d = (star.x - centerX) * scale + centerX;
			const y2d = (star.y - centerY) * scale + centerY;

			// Skip stars that are offscreen (with small buffer for trails)
			if (x2d < -10 || x2d > containerWidth + 10 || y2d < -10 || y2d > containerHeight + 10) {
				continue;
			}

			// Calculate star size based on depth
			const size = Math.max(0.5, (1 - star.z / maxDepth) * 3);

			// Calculate star color based on depth
			const colorIndex = Math.min(
				starColors.length - 1,
				Math.floor((1 - star.z / maxDepth) * starColors.length)
			);
			const color = starColors[colorIndex];

			// Determine rendering mode (point or trail)
			const isTrail = speed > baseSpeed * 1.5;
			const batchKey = isTrail ? `trail_${color}` : `circle_${color}`;

			// Create batch if it doesn't exist
			if (!starsBatches.has(batchKey)) {
				starsBatches.set(batchKey, []);
			}

			// Create batch star with pre-calculated projection data
			const batchStar: BatchStar = { x2d, y2d, size };

			// For trails, calculate previous projected position
			if (isTrail) {
				const prevScale = maxDepth / (star.z + speed);
				batchStar.prevX2d = (star.prevX - centerX) * prevScale + centerX;
				batchStar.prevY2d = (star.prevY - centerY) * prevScale + centerY;
			}

			// Add star to the appropriate batch
			starsBatches.get(batchKey)!.push(batchStar);
		}

		// Render each batch with minimal context state changes
		starsBatches.forEach((batchStars, key) => {
			// Skip empty batches
			if (batchStars.length === 0) return;

			const isTrail = key.startsWith('trail_');
			const color = key.substring(key.indexOf('_') + 1);

			// Set style only once per batch
			if (isTrail) {
				ctx.strokeStyle = color;
			} else {
				ctx.fillStyle = color;
			}

			// Begin a single path for all stars in this batch
			ctx.beginPath();

			// Add all stars to the path
			for (const star of batchStars) {
				if (isTrail) {
					// For trails, draw lines
					ctx!.lineWidth = star.size;
					ctx!.moveTo(star.prevX2d!, star.prevY2d!);
					ctx!.lineTo(star.x2d, star.y2d);
				} else {
					// For circles, add to the current path
					ctx.moveTo(star.x2d + star.size, star.y2d);
					ctx.arc(star.x2d, star.y2d, star.size, 0, Math.PI * 2);
				}
			}

			// Draw all stars of this type with a single call
			if (isTrail) {
				ctx.stroke();
			} else {
				ctx.fill();
			}
		});
	}

	// Original animate function kept for reference (will not be used with fixed timestep)
	function animate(timestamp: number) {
		if (!isRunning || !ctx || !canvasElement || !containerElement) return;

		// Request next frame first for smoother animation
		animationFrameId = requestAnimationFrame(animate);

		// Calculate delta time with a maximum to prevent large jumps after tab switching
		const deltaTime = Math.min(timestamp - lastTime, 50);
		lastTime = timestamp;

		// FPS monitoring
		fpsMonitor.frames++;
		if (timestamp - fpsMonitor.lastCheck >= 1000) {
			fpsMonitor.fps = fpsMonitor.frames;
			fpsMonitor.frames = 0;
			fpsMonitor.lastCheck = timestamp;
		}

		// Skip frames if necessary based on device capability
		const capabilities = get(deviceCapabilities);
		if (capabilities.frameSkip > 0) {
			frameCount = (frameCount + 1) % (capabilities.frameSkip + 1);
			if (frameCount !== 0) {
				return; // Skip this frame
			}
		}

		const containerWidth = containerElement.clientWidth;
		const containerHeight = containerElement.clientHeight;

		// Clear canvas with slight alpha for motion blur effect
		ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
		ctx.fillRect(0, 0, containerWidth, containerHeight);

		// Center of the screen (our viewing point)
		const centerX = containerWidth / 2;
		const centerY = containerHeight / 2;

		// Calculate time-based movement scale
		const timeScale = deltaTime / 16.7; // Normalized to 60fps

		// ============= PHASE 1: Update Star Positions =============
		// Update all star positions first, keeping this separate from rendering
		for (let i = 0; i < stars.length; i++) {
			const star = stars[i];

			// Store previous position for trails
			star.prevX = star.x;
			star.prevY = star.y;

			// Move star closer to viewer with time-based movement
			star.z -= speed * timeScale;

			// If star passed the viewer, reset it to far distance
			if (star.z <= 0) {
				star.x = Math.random() * containerWidth * 2 - containerWidth;
				star.y = Math.random() * containerHeight * 2 - containerHeight;
				star.z = maxDepth;
				star.prevX = star.x;
				star.prevY = star.y;
			}
		}

		// ============= PHASE 2: Create Optimized Batches =============
		// Group stars by rendering properties to minimize context changes
		const starsBatches = new Map<string, BatchStar[]>();

		// Project and sort stars into batches - only process visible stars
		for (let i = 0; i < stars.length; i++) {
			const star = stars[i];

			// Project 3D position to 2D screen
			const scale = maxDepth / star.z;
			const x2d = (star.x - centerX) * scale + centerX;
			const y2d = (star.y - centerY) * scale + centerY;

			// Skip stars that are offscreen (with small buffer for trails)
			if (x2d < -10 || x2d > containerWidth + 10 || y2d < -10 || y2d > containerHeight + 10) {
				continue;
			}

			// Calculate star size based on depth
			const size = Math.max(0.5, (1 - star.z / maxDepth) * 3);

			// Calculate star color based on depth
			const colorIndex = Math.min(
				starColors.length - 1,
				Math.floor((1 - star.z / maxDepth) * starColors.length)
			);
			const color = starColors[colorIndex];

			// Determine rendering mode (point or trail)
			const isTrail = speed > baseSpeed * 1.5;
			const batchKey = isTrail ? `trail_${color}` : `circle_${color}`;

			// Create batch if it doesn't exist
			if (!starsBatches.has(batchKey)) {
				starsBatches.set(batchKey, []);
			}

			// Create batch star with pre-calculated projection data
			const batchStar: BatchStar = { x2d, y2d, size };

			// For trails, calculate previous projected position
			if (isTrail) {
				const prevScale = maxDepth / (star.z + speed * timeScale);
				batchStar.prevX2d = (star.prevX - centerX) * prevScale + centerX;
				batchStar.prevY2d = (star.prevY - centerY) * prevScale + centerY;
			}

			// Add star to the appropriate batch
			starsBatches.get(batchKey)!.push(batchStar);
		}

		// ============= PHASE 3: Render Batches Efficiently =============
		// Render each batch with minimal context state changes
		starsBatches.forEach((batchStars, key) => {
			// Skip empty batches
			if (batchStars.length === 0) return;

			const isTrail = key.startsWith('trail_');
			const color = key.substring(key.indexOf('_') + 1);

			// Set style only once per batch
			if (isTrail) {
				ctx.strokeStyle = color;
			} else {
				ctx.fillStyle = color;
			}

			// Begin a single path for all stars in this batch
			ctx.beginPath();

			// Add all stars to the path
			for (const star of batchStars) {
				if (isTrail) {
					// For trails, draw lines
					ctx!.lineWidth = star.size;
					ctx!.moveTo(star.prevX2d!, star.prevY2d!);
					ctx!.lineTo(star.x2d, star.y2d);
				} else {
					// For circles, add to the current path
					ctx.moveTo(star.x2d + star.size, star.y2d);
					ctx.arc(star.x2d, star.y2d, star.size, 0, Math.PI * 2);
				}
			}

			// Draw all stars of this type with a single call
			if (isTrail) {
				ctx.stroke();
			} else {
				ctx.fill();
			}
		});

		// Gradually return to base speed when not boosting
		if (!isBoosting && speed > baseSpeed) {
			speed = Math.max(baseSpeed, speed * 0.98);
		}
	}

	// Start animation
	export function start() {
		if (isRunning) return;

		if (!containerElement) return;

		// Setup canvas if not already done
		if (!canvasElement) {
			setupCanvas();
		}

		// Initialize stars if needed
		if (stars.length === 0) {
			initStars();
		}

		isRunning = true;
		lastTime = performance.now();

		// Use the fixed timestep loop instead of requestAnimationFrame
		setupAnimation();

		dispatch('start');
	}

	// Stop animation
	export function stop() {
		if (!isRunning) return;

		isRunning = false;

		// Stop the fixed timestep loop
		if (fixedStepLoop) {
			fixedStepLoop.stop();
		}

		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}

		dispatch('stop');
	}

	// Pause animation
	export function pause() {
		if (!isRunning || isPaused) return;

		isPaused = true;

		// Stop the fixed timestep loop
		if (fixedStepLoop) {
			fixedStepLoop.stop();
		}

		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}

		dispatch('pause');
	}

	// Resume animation
	export function resume() {
		if (!isRunning || !isPaused) return;

		isPaused = false;
		lastTime = performance.now();

		// Restart the fixed timestep loop
		setupAnimation();

		dispatch('resume');
	}

	// Toggle boost mode
	export function toggleBoost(boost: boolean) {
		if (!enableBoost) return;

		isBoosting = boost;
		speed = boost ? boostSpeed : baseSpeed;

		dispatch('boost', { active: boost });
	}

	// Event handlers
	function handleKeyDown(e: KeyboardEvent) {
		if (!enableBoost) return;

		if (e.code === 'Space') {
			toggleBoost(true);
		}
	}

	function handleKeyUp(e: KeyboardEvent) {
		if (!enableBoost) return;

		if (e.code === 'Space') {
			toggleBoost(false);
		}
	}

	function handleTouchStart() {
		if (!enableBoost) return;
		toggleBoost(true);
	}

	function handleTouchEnd() {
		if (!enableBoost) return;
		toggleBoost(false);
	}

	function handleVisibilityChange() {
		if (document.hidden) {
			if (isRunning && !isPaused) {
				pause();
			}
		} else {
			if (isRunning && isPaused) {
				resume();
			}
		}
	}

	// Lifecycle hooks
	onMount(() => {
		if (!browser) return;

		// Wait for next tick to ensure DOM is ready
		setTimeout(() => {
			// Initialize if containerElement is available
			if (containerElement) {
				setupCanvas();
				initStars();
				setupResizeObserver();

				if (autoStart) {
					start();
				}
			}
		}, 0);

		// Add event listeners
		if (enableBoost) {
			window.addEventListener('keydown', handleKeyDown, { passive: true });
			window.addEventListener('keyup', handleKeyUp, { passive: true });
			window.addEventListener('touchstart', handleTouchStart, { passive: true });
			window.addEventListener('touchend', handleTouchEnd, { passive: true });
		}

		// Add visibility change handler
		document.addEventListener('visibilitychange', handleVisibilityChange);
	});

	onDestroy(() => {
		if (!browser) return;

		// Stop animation loop
		stop();

		// Clean up fixed timestep loop
		if (fixedStepLoop) {
			fixedStepLoop.stop();
			fixedStepLoop = null;
		}

		// Remove event listeners
		if (enableBoost) {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
			window.removeEventListener('touchstart', handleTouchStart);
			window.removeEventListener('touchend', handleTouchEnd);
		}

		// Remove visibility change handler
		document.removeEventListener('visibilitychange', handleVisibilityChange);

		// Clean up resize observer
		if (resizeObserver) {
			resizeObserver.disconnect();
			resizeObserver = null;
		}

		// Clean up canvas
		if (ctx) {
			ctx = null;
		}

		if (canvasElement && canvasElement.parentNode) {
			canvasElement.parentNode.removeChild(canvasElement);
		}

		canvasElement = null;
		containerElement = null;

		// Clear arrays
		stars = [];

		// Clear state
		isRunning = false;
		isPaused = false;
		isBoosting = false;
	});

	// Watch for container element changes and initialize if needed
	$: if (containerElement && browser && !canvasElement) {
		// Use a small delay to ensure the DOM is ready
		setTimeout(() => {
			setupCanvas();
			initStars();

			if (autoStart) {
				start();
			}
		}, 0);
	}
</script>

<div class="starfield-wrapper w-full h-full">
	{#if withStartScreen && (gameTitle || startText)}
		<div class="game-title">{gameTitle || 'COSMIC VOYAGER'}</div>
		<div class="start-text">{startText || 'PRESS ANY KEY TO START'}</div>
	{/if}
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

	.game-title {
		position: absolute;
		bottom: 20px;
		left: 0;
		width: 100%;
		text-align: center;
		color: #ffffff;
		font-size: 24px;
		text-transform: uppercase;
		letter-spacing: 3px;
		z-index: 100;
		text-shadow:
			0 0 10px #0066ff,
			0 0 20px #0044ff;
		font-family: 'Courier New', monospace;
	}

	.start-text {
		position: absolute;
		top: 60%;
		left: 0;
		width: 100%;
		text-align: center;
		color: #ffffff;
		font-size: 18px;
		z-index: 100;
		animation: blink 1s infinite;
		font-family: 'Courier New', monospace;
	}

	@keyframes blink {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0;
		}
	}
</style>

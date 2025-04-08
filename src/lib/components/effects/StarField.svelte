<script lang="ts">
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { browser } from '$app/environment';
	import { get } from 'svelte/store';
	import { deviceCapabilities } from '$lib/utils/device-performance';
	import { animationState } from '$lib/stores/animation-store';

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

	// Star properties directly from reference implementation
	let maxDepth = 32;
	let speed = 0.25;
	let baseSpeed = 0.25;
	let boostSpeed = 2;
	let lastTime = 0;

	// Colors (blue to white gradient for stars) - exact match from reference
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
		// Random position in 3D space - exact logic from reference
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

		// Get context
		ctx = canvasElement.getContext('2d');
	}

	// Resize canvas to match container
	function resizeCanvas() {
		if (!canvasElement || !containerElement) return;

		const { width, height } = containerElement.getBoundingClientRect();
		const dpr = window.devicePixelRatio || 1;

		canvasElement.width = width * dpr;
		canvasElement.height = height * dpr;

		if (ctx) {
			ctx.scale(dpr, dpr);
		}
	}

	// Animation function - directly based on reference implementation
	function animate(timestamp: number) {
		if (!isRunning || !ctx || !canvasElement || !containerElement) return;

		const now = timestamp;
		const deltaTime = now - lastTime;
		lastTime = now;

		const containerWidth = containerElement.clientWidth;
		const containerHeight = containerElement.clientHeight;

		// Clear canvas with slight fade for motion blur - exactly like reference
		ctx.fillStyle = 'rgba(0, 0, 0, 0.0)';
		ctx.fillRect(0, 0, containerWidth, containerHeight);

		// Center of the screen (our viewing point)
		const centerX = containerWidth / 2;
		const centerY = containerHeight / 2;

		// Update and draw stars - exactly like reference
		for (let i = 0; i < stars.length; i++) {
			const star = stars[i];

			// Store previous position for trails
			star.prevX = star.x;
			star.prevY = star.y;

			// Move star closer to viewer
			star.z -= speed;

			// If star passed the viewer, reset it to far distance
			if (star.z <= 0) {
				star.x = Math.random() * containerWidth * 2 - containerWidth;
				star.y = Math.random() * containerHeight * 2 - containerHeight;
				star.z = maxDepth;
				star.prevX = star.x;
				star.prevY = star.y;
				continue;
			}

			// Project 3D position to 2D screen coordinates
			const scale = maxDepth / star.z;
			const x2d = (star.x - centerX) * scale + centerX;
			const y2d = (star.y - centerY) * scale + centerY;

			// Only draw stars on screen
			if (x2d < 0 || x2d >= containerWidth || y2d < 0 || y2d >= containerHeight) {
				continue;
			}

			// Star size based on depth
			const size = (1 - star.z / maxDepth) * 3;

			// Star color based on depth (closer = brighter)
			const colorIndex = Math.floor((1 - star.z / maxDepth) * (starColors.length - 1));
			const color = starColors[colorIndex];

			// Draw star trail when moving fast
			if (speed > baseSpeed * 1.5) {
				const prevScale = maxDepth / (star.z + speed);
				const prevX = (star.prevX - centerX) * prevScale + centerX;
				const prevY = (star.prevY - centerY) * prevScale + centerY;

				ctx.beginPath();
				ctx.moveTo(prevX, prevY);
				ctx.lineTo(x2d, y2d);
				ctx.strokeStyle = color;
				ctx.lineWidth = size;
				ctx.stroke();
			} else {
				// Draw star as circle
				ctx.beginPath();
				ctx.arc(x2d, y2d, size, 0, Math.PI * 2);
				ctx.fillStyle = color;
				ctx.fill();
			}
		}

		// Gradually return to base speed when not boosting
		if (!isBoosting && speed > baseSpeed) {
			speed = Math.max(baseSpeed, speed * 0.98);
		}

		// Request next frame
		animationFrameId = requestAnimationFrame(animate);
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
		animationFrameId = requestAnimationFrame(animate);

		dispatch('start');
	}

	// Stop animation
	export function stop() {
		if (!isRunning) return;

		isRunning = false;

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
		animationFrameId = requestAnimationFrame(animate);

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

		// Cleanup
		stop();

		// Remove event listeners
		if (enableBoost) {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
			window.removeEventListener('touchstart', handleTouchStart);
			window.removeEventListener('touchend', handleTouchEnd);
		}

		// Remove visibility change handler
		document.removeEventListener('visibilitychange', handleVisibilityChange);
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
		/* Ensure the wrapper fills its container */
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

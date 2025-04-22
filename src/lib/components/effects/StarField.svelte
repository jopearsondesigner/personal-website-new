<!-- src/lib/components/effects/StarField.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	// Props
	export let containerElement: HTMLElement | null = null;
	export let autoStart = true;
	export let starCount = 300;
	export let enableBoost = true;
	export let maxDepth = 32;
	// FASTER MOVEMENT: Increased base and boost speeds
	export let baseSpeed = 0.5; // Doubled from 0.25
	export let boostSpeed = 4; // Doubled from 2

	// Component state
	let canvasElement: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = null;
	let stars: Array<{
		x: number;
		y: number;
		z: number;
		prevX: number;
		prevY: number;
	}> = [];
	let isRunning = false;
	let boosting = false;
	let animationFrameId: number | null = null;
	let speed = baseSpeed;

	// Star colors with glow
	const starColors = [
		'#0033ff', // Dim blue
		'#4477ff',
		'#6699ff',
		'#88bbff',
		'#aaddff',
		'#ffffff' // Bright white
	];

	// Initialize stars
	function initStars() {
		stars = [];
		for (let i = 0; i < starCount; i++) {
			createStar();
		}
	}

	function createStar() {
		const star = {
			x: Math.random() * canvasElement.width * 2 - canvasElement.width,
			y: Math.random() * canvasElement.height * 2 - canvasElement.height,
			z: Math.random() * maxDepth,
			prevX: 0,
			prevY: 0
		};
		stars.push(star);
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
		canvasElement.width = window.innerWidth;
		canvasElement.height = window.innerHeight;
	}

	// Animation loop with enhanced effects
	function animate() {
		requestAnimationFrame(animate);

		// LONGER TAILS: Reduced alpha for slower fade, creating longer trails
		ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
		ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);

		const centerX = canvasElement.width / 2;
		const centerY = canvasElement.height / 2;

		for (let i = 0; i < stars.length; i++) {
			const star = stars[i];

			star.prevX = star.x;
			star.prevY = star.y;

			star.z -= speed;

			if (star.z <= 0) {
				star.x = Math.random() * canvasElement.width * 2 - canvasElement.width;
				star.y = Math.random() * canvasElement.height * 2 - canvasElement.height;
				star.z = maxDepth;
				star.prevX = star.x;
				star.prevY = star.y;
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

			const colorIndex = Math.floor((1 - star.z / maxDepth) * (starColors.length - 1));
			const color = starColors[colorIndex];

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

		if (!boosting && speed > baseSpeed) {
			speed = Math.max(baseSpeed, speed * 0.98);
		}
	}

	// Event handlers
	function handleKeyDown(e: KeyboardEvent) {
		if (e.code === 'Space') {
			boosting = true;
			speed = boostSpeed;
		}
	}

	function handleKeyUp(e: KeyboardEvent) {
		if (e.code === 'Space') {
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

	// Public boost methods
	export function boost() {
		boosting = true;
		speed = boostSpeed;
	}

	export function unboost() {
		boosting = false;
	}

	// Lifecycle
	onMount(() => {
		if (!browser) return;

		if (containerElement) {
			setupCanvas();
			initStars();

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
		}
	});

	onDestroy(() => {
		if (!browser) return;

		if (enableBoost) {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
			window.removeEventListener('touchstart', handleTouchStart);
			window.removeEventListener('touchend', handleTouchEnd);
		}

		window.removeEventListener('resize', resizeCanvas);

		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
		}

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

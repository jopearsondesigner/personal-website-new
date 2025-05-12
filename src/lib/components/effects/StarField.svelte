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
	// Keep original speeds for stability
	export let baseSpeed = 0.25; // Original value for consistent animation
	export let boostSpeed = 2;   // Original value for consistent animation

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
	let canvasInitialized = false; // Track canvas initialization
	let errorCount = 0; // Track number of errors for recovery purposes

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
		console.log('StarField: Initializing stars array with count:', starCount);
		stars = [];
		for (let i = 0; i < starCount; i++) {
			createStar();
		}
	}

	function createStar() {
		// Ensure canvas is available before creating stars
		if (!canvasElement) {
			console.warn('StarField: Cannot create star - canvas not initialized');
			return;
		}
		
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
		if (!containerElement) {
			console.error('StarField error: containerElement is null or undefined');
			return false;
		}

		try {
			// Check if canvas already exists to prevent duplicates
			const existingCanvas = containerElement.querySelector('canvas.star-field-canvas'); // Unified class name
			if (existingCanvas) {
				console.log('Using existing canvas element');
				canvasElement = existingCanvas as HTMLCanvasElement;
			} else {
				console.log('Creating new canvas element for container', containerElement);
				canvasElement = document.createElement('canvas');
				canvasElement.id = 'starfield';
				canvasElement.className = 'star-field-canvas'; // Add unified class name
				canvasElement.style.position = 'absolute';
				canvasElement.style.top = '0';
				canvasElement.style.left = '0';
				canvasElement.style.width = '100%';
				canvasElement.style.height = '100%';
				canvasElement.style.pointerEvents = 'none'; // Prevent interference with interactions
				containerElement.appendChild(canvasElement);
			}

			ctx = canvasElement.getContext('2d');
			if (!ctx) {
				console.error('Failed to get canvas context');
				return false;
			}
			
			resizeCanvas();
			canvasInitialized = true; // Mark canvas as initialized
			console.log('Canvas initialized successfully with size', canvasElement.width, 'x', canvasElement.height);
			return true;
		} catch (error) {
			console.error('Error setting up canvas:', error);
			return false;
		}
	}

	// Resize canvas
	function resizeCanvas() {
		if (!canvasElement) return;
		
		// Set canvas dimensions to match window size
		canvasElement.width = window.innerWidth;
		canvasElement.height = window.innerHeight;
		
		console.log('Canvas resized to', canvasElement.width, 'x', canvasElement.height);
		
		// Reinitialize stars after resize
		if (stars.length > 0) {
			initStars();
		}
	}

	// Animation loop with enhanced effects
	function animate() {
		// Always clear previous animation frame to prevent duplicates
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}

		if (!ctx || !canvasElement || !isRunning) {
			// Skip animation if not properly initialized or not running
			return;
		}

		try {
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
				const size = (1 - star.z / maxDepth) * 3; // Back to original value 3

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
			
			// Schedule next frame using requestAnimationFrame
			if (isRunning) {
				animationFrameId = requestAnimationFrame(animate);
			}
		} catch (error) {
			console.error('Error in StarField animation loop:', error);
			errorCount++;
			
			// Recovery mechanism - if too many errors, stop animation
			if (errorCount > 10) {
				console.error('Too many errors, stopping animation');
				isRunning = false;
				return;
			}
			
			// Try to continue animation despite error
			if (isRunning) {
				animationFrameId = requestAnimationFrame(animate);
			}
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
		
		// Reset error count on start
		errorCount = 0;
		isRunning = true;
		
		if (!canvasInitialized && containerElement) {
			const success = setupCanvas();
			if (!success) {
				console.error('StarField: Failed to set up canvas, cannot start animation');
				isRunning = false;
				return;
			}
			initStars();
		}
		animate();
		console.log('StarField animation started');
	}

	// Public boost methods
	export function boost() {
		boosting = true;
		speed = boostSpeed;
	}

	export function unboost() {
		boosting = false;
	}

	// Stop animation
	export function stop() {
		isRunning = false;
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
		console.log('StarField animation stopped');
	}

	// Lifecycle
	onMount(() => {
		if (!browser) return;

		if (containerElement) {
			const success = setupCanvas();
			if (success) {
				initStars();

				if (enableBoost) {
					window.addEventListener('keydown', handleKeyDown);
					window.addEventListener('keyup', handleKeyUp);
					window.addEventListener('touchstart', handleTouchStart);
					window.addEventListener('touchend', handleTouchEnd);
				}

				window.addEventListener('resize', resizeCanvas);

				if (autoStart) {
					// Slight delay to ensure everything is ready
					setTimeout(() => {
						start();
					}, 100);
				}
			} else {
				console.error('StarField: Failed to set up canvas');
			}
		} else {
			console.error('StarField error: No container element provided');
		}
	});

	onDestroy(() => {
		if (!browser) return;

		// Stop animation
		stop();

		// Remove event listeners
		if (enableBoost) {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
			window.removeEventListener('touchstart', handleTouchStart);
			window.removeEventListener('touchend', handleTouchEnd);
		}

		window.removeEventListener('resize', resizeCanvas);

		// Clean up canvas element
		if (canvasElement && canvasElement.parentNode) {
			canvasElement.parentNode.removeChild(canvasElement);
		}
		
		console.log('StarField destroyed and cleaned up');
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
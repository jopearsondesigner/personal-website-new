<!-- src/lib/components/effects/StarFieldManager.svelte -->
<script lang="ts">
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { browser } from '$app/environment';
	import { get } from 'svelte/store';
	import { deviceCapabilities } from '$lib/utils/device-performance';
	import { frameRateController } from '$lib/utils/frame-rate-controller';

	// Props
	export let containerElement: HTMLElement;
	export let starCount: number = 300;
	export let enableBoost: boolean = true;
	export let baseSpeed: number = 0.25;
	export let boostSpeed: number = 2;
	export let maxDepth: number = 32;
	export let enableGlow: boolean = true;

	// Internal state
	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D;
	let stars = [];
	let isRunning = false;
	let isPaused = false;
	let isBoosting = false;
	let animationFrameId = null;
	let adaptiveQualityEnabled = true;

	// Event dispatcher
	const dispatch = createEventDispatcher();

	// Initialize the star field
	function initStarField() {
		if (!canvas || !ctx || !containerElement) return;

		// Adjust canvas size to container
		resizeCanvas();

		// Set up stars
		createStars();

		// Start animation loop if not already running
		if (!isRunning) {
			isRunning = true;
			animationLoop();
		}
	}

	// Create stars
	function createStars() {
		// Clear existing stars
		stars = [];

		// Create new stars
		for (let i = 0; i < starCount; i++) {
			stars.push({
				x: Math.random() * canvas.width - canvas.width / 2,
				y: Math.random() * canvas.height - canvas.height / 2,
				z: Math.random() * maxDepth,
				prevX: 0,
				prevY: 0,
				size: Math.random() * 2,
				color: `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.5})`
			});
		}
	}

	// Resize canvas to match container
	export function resizeCanvas() {
		if (!canvas || !containerElement) return;

		const rect = containerElement.getBoundingClientRect();
		canvas.width = rect.width;
		canvas.height = rect.height;

		// Re-create stars after resize
		if (stars.length > 0) {
			createStars();
		}
	}

	// Animation loop
	function animationLoop() {
		if (!isRunning || isPaused || !ctx) {
			return;
		}

		// Only render if frame should be rendered (performance optimization)
		if (frameRateController.shouldRenderFrame()) {
			// Clear canvas
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			// Set center point
			const centerX = canvas.width / 2;
			const centerY = canvas.height / 2;

			// Calculate current speed
			const currentSpeed = isBoosting ? boostSpeed : baseSpeed;

			// Update and draw stars
			for (let i = 0; i < stars.length; i++) {
				const star = stars[i];

				// Save previous position for trails
				star.prevX = star.x;
				star.prevY = star.y;

				// Move star forward
				star.z -= currentSpeed;

				// Reset star if it goes too far
				if (star.z <= 0) {
					star.z = maxDepth;
					star.x = Math.random() * canvas.width - centerX;
					star.y = Math.random() * canvas.height - centerY;
					star.prevX = star.x;
					star.prevY = star.y;
				}

				// Calculate 3D projection
				const scale = maxDepth / star.z;
				const x = star.x * scale + centerX;
				const y = star.y * scale + centerY;
				const size = star.size * scale;

				// Only draw if in canvas bounds
				if (x >= 0 && x <= canvas.width && y >= 0 && y <= canvas.height) {
					// Draw star
					ctx.beginPath();
					ctx.fillStyle = star.color;
					ctx.arc(x, y, size, 0, Math.PI * 2);
					ctx.fill();

					// Draw trail if boosting and glow is enabled
					if (isBoosting && enableGlow) {
						const prevScale = maxDepth / (star.z + currentSpeed);
						const prevX = star.prevX * prevScale + centerX;
						const prevY = star.prevY * prevScale + centerY;

						// Create gradient for trail
						const gradient = ctx.createLinearGradient(prevX, prevY, x, y);
						gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
						gradient.addColorStop(1, 'rgba(255, 255, 255, 0.5)');

						// Draw trail line
						ctx.beginPath();
						ctx.strokeStyle = gradient;
						ctx.lineWidth = size * 0.8;
						ctx.moveTo(prevX, prevY);
						ctx.lineTo(x, y);
						ctx.stroke();
					}
				}
			}
		}

		// Request next frame
		animationFrameId = requestAnimationFrame(animationLoop);
	}

	// Public methods
	export function start() {
		if (!isRunning) {
			isRunning = true;
			isPaused = false;
			if (canvas && containerElement) {
				initStarField();
			}
		} else if (isPaused) {
			isPaused = false;
			animationLoop();
		}
	}

	export function stop() {
		isRunning = false;
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
	}

	export function pause() {
		isPaused = true;
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
	}

	export function resume() {
		if (isRunning && isPaused) {
			isPaused = false;
			animationLoop();
		}
	}

	export function boost() {
		isBoosting = true;
	}

	export function unboost() {
		isBoosting = false;
	}

	// Adapt to device capabilities
	export function adaptToDeviceCapabilities(capabilities) {
		if (!capabilities) return;

		// Adapt star count
		if (capabilities.maxStars && capabilities.maxStars !== starCount) {
			starCount = capabilities.maxStars;
			if (stars.length > 0) {
				createStars();
			}
		}

		// Adapt glow effects
		enableGlow = capabilities.enableGlow !== undefined ? capabilities.enableGlow : enableGlow;
	}

	// Monitor window resize
	function setupResizeObserver() {
		if (!browser || !containerElement) return null;

		const resizeObserver = new ResizeObserver(() => {
			// Only resize if we're running
			if (isRunning) {
				resizeCanvas();
			}
		});

		resizeObserver.observe(containerElement);
		return resizeObserver;
	}

	// Lifecycle
	let resizeObserver = null;

	onMount(() => {
		if (!browser || !containerElement) return;

		// Create canvas element
		canvas = document.createElement('canvas');
		canvas.classList.add('star-field-canvas');
		canvas.style.position = 'absolute';
		canvas.style.inset = '0';
		canvas.style.pointerEvents = 'none';

		// Add canvas to container with a console log for debugging
		console.log('Adding canvas to container', containerElement);
		containerElement.appendChild(canvas);

		// Get context and check if it's valid
		ctx = canvas.getContext('2d');
		if (!ctx) {
			console.error('Failed to get canvas context');
			return;
		}

		// Set up resize observer
		resizeObserver = setupResizeObserver();

		// Initialize if enabled
		if (isRunning) {
			// Delay to ensure sizing is correct
			setTimeout(() => {
				initStarField();
			}, 50);
		}
	});

	onDestroy(() => {
		// Stop animation
		stop();

		// Clean up resize observer
		if (resizeObserver) {
			resizeObserver.disconnect();
			resizeObserver = null;
		}

		// Remove canvas from container
		if (canvas && containerElement && containerElement.contains(canvas)) {
			containerElement.removeChild(canvas);
		}

		// Clear references
		canvas = null;
		ctx = null;
		stars = [];
	});
</script>

<!-- This component doesn't render any visible elements directly, it creates canvas programmatically -->

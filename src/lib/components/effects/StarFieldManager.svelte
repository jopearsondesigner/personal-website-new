<!-- src/lib/components/effects/StarFieldManager.svelte -->
<script lang="ts">
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { browser } from '$app/environment';
	import { get } from 'svelte/store';
	import { deviceCapabilities } from '$lib/utils/device-performance';
	import { frameRateController } from '$lib/utils/frame-rate-controller';

	// Props - Make containerElement nullable to match StarField
	export let containerElement: HTMLElement | null = null;
	export let starCount: number = 300;
	export let enableBoost: boolean = true;
	export let baseSpeed: number = 0.25;
	export let boostSpeed: number = 2;
	export let maxDepth: number = 32;
	export let enableGlow: boolean = true;
	export let debugMode: boolean = false; // New prop to enable/disable debug mode

	// Internal state
	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D;
	let stars = [];
	let isRunning = false;
	let isPaused = false;
	let isBoosting = false;
	let animationFrameId = null;
	let adaptiveQualityEnabled = true;
	let isCanvasInitialized = false; // Canvas initialization tracking
	let errorCount = 0; // Track errors for recovery

	// Event dispatcher
	const dispatch = createEventDispatcher();

	// Initialize the star field
	function initStarField() {
		if (!canvas || !ctx || !containerElement) {
			console.error('StarFieldManager: Cannot initialize star field - missing canvas, context, or container');
			return false;
		}

		try {
			// Adjust canvas size to container
			resizeCanvas();

			// Set up stars
			createStars();

			// Start animation loop if not already running
			if (!isRunning) {
				isRunning = true;
				animationLoop();
				console.log('StarFieldManager: Animation started');
			}
			
			return true;
		} catch (error) {
			console.error('StarFieldManager: Error initializing star field:', error);
			return false;
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
		console.log(`StarFieldManager: Created ${stars.length} stars`);
	}

	// Resize canvas to match container
	export function resizeCanvas() {
		if (!canvas || !containerElement) return false;

		try {
			const rect = containerElement.getBoundingClientRect();
			
			// Make sure dimensions are valid numbers
			if (rect.width && rect.height && rect.width > 0 && rect.height > 0) {
				canvas.width = rect.width;
				canvas.height = rect.height;
				
				console.log('StarFieldManager: Canvas resized to', canvas.width, 'x', canvas.height);
				
				// Re-create stars after resize
				if (stars.length > 0) {
					createStars();
				}
				return true;
			} else {
				console.error('StarFieldManager: Invalid container dimensions:', rect);
				return false;
			}
		} catch (error) {
			console.error('StarFieldManager: Error during resize:', error);
			return false;
		}
	}

	// Animation loop
	function animationLoop() {
		if (!isRunning || isPaused || !ctx) {
			// Safely exit if we shouldn't be running
			return;
		}

		try {
			// Re-enable frame rate controller but keep in debug mode if needed
			if (debugMode || frameRateController.shouldRenderFrame()) {
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
						continue;
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

			// Request next frame with proper tracking
			if (animationFrameId) {
				cancelAnimationFrame(animationFrameId);
			}
			animationFrameId = requestAnimationFrame(animationLoop);
			
		} catch (error) {
			console.error('StarFieldManager: Error in animation loop:', error);
			errorCount++;
			
			// Stop animation if too many errors
			if (errorCount > 10) {
				dispatch('error', { message: 'Too many errors in animation loop' });
				stop();
				return;
			}
			
			// Error recovery - try again after a delay
			isPaused = true;
			setTimeout(() => {
				isPaused = false;
				animationLoop();
			}, 1000);
		}
	}

	// Public methods
	export function start() {
		if (!isRunning) {
			console.log('StarFieldManager: Starting animation');
			isRunning = true;
			isPaused = false;
			errorCount = 0; // Reset error count
			
			if (canvas && containerElement) {
				initStarField();
			} else {
				console.error('StarFieldManager: Cannot start - missing canvas or container');
				dispatch('error', { message: 'Cannot start - missing canvas or container' });
			}
		} else if (isPaused) {
			isPaused = false;
			animationLoop();
		}
	}

	export function stop() {
		console.log('StarFieldManager: Stopping animation');
		isRunning = false;
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
		dispatch('stop');
	}

	export function pause() {
		isPaused = true;
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
		dispatch('pause');
	}

	export function resume() {
		if (isRunning && isPaused) {
			isPaused = false;
			animationLoop();
			dispatch('resume');
		}
	}

	export function boost() {
		isBoosting = true;
		dispatch('boost');
	}

	export function unboost() {
		isBoosting = false;
		dispatch('unboost');
	}

	// Adapt to device capabilities
	export function adaptToDeviceCapabilities(capabilities) {
		if (!capabilities) return;

		console.log('StarFieldManager: Adapting to device capabilities', capabilities);

		// Adapt star count
		if (capabilities.maxStars && capabilities.maxStars !== starCount) {
			starCount = capabilities.maxStars;
			if (stars.length > 0) {
				createStars();
			}
		}

		// Adapt glow effects
		enableGlow = capabilities.enableGlow !== undefined ? capabilities.enableGlow : enableGlow;
		
		dispatch('adapted', { capabilities });
	}

	// Monitor window resize
	function setupResizeObserver() {
		if (!browser || !containerElement) return null;

		console.log('StarFieldManager: Setting up resize observer');
		const resizeObserver = new ResizeObserver(() => {
			// Only resize if we're running and initialized
			if (isRunning && isCanvasInitialized) {
				console.log('StarFieldManager: Resize detected');
				resizeCanvas();
				dispatch('resize', { width: canvas.width, height: canvas.height });
			}
		});

		resizeObserver.observe(containerElement);
		return resizeObserver;
	}

	// Lifecycle
	let resizeObserver = null;

	onMount(() => {
		if (!browser) {
			console.error('StarFieldManager: Cannot initialize - browser unavailable');
			return;
		}

		if (!containerElement) {
			console.error('StarFieldManager: Cannot initialize - no container element provided');
			dispatch('error', { message: 'No container element provided' });
			return;
		}

		console.log('StarFieldManager: Mounting component');

		try {
			// Check if canvas already exists to prevent duplicates
			let existingCanvas = containerElement.querySelector('canvas.star-field-canvas');
			
			if (existingCanvas) {
				console.log('StarFieldManager: Using existing canvas');
				canvas = existingCanvas as HTMLCanvasElement;
			} else {
				// Create canvas element
				console.log('StarFieldManager: Creating new canvas element');
				canvas = document.createElement('canvas');
				canvas.classList.add('star-field-canvas');
				canvas.id = 'starfield'; // Unified ID with StarField component
				canvas.style.position = 'absolute';
				canvas.style.inset = '0';
				canvas.style.pointerEvents = 'none';
				
				// Add canvas to container
				console.log('StarFieldManager: Adding canvas to container', containerElement);
				containerElement.appendChild(canvas);
			}

			// Get context and check if it's valid
			ctx = canvas.getContext('2d');
			if (!ctx) {
				console.error('StarFieldManager: Failed to get canvas context');
				dispatch('error', { message: 'Failed to get canvas context' });
				return;
			}

			// Set initial dimensions
			canvas.width = containerElement.clientWidth || window.innerWidth;
			canvas.height = containerElement.clientHeight || window.innerHeight;
			isCanvasInitialized = true;
			dispatch('initialized');

			// Set up resize observer
			resizeObserver = setupResizeObserver();

			// Initialize if enabled - delay to ensure DOM is ready
			setTimeout(() => {
				start();
			}, 100);
		} catch (error) {
			console.error('StarFieldManager: Error during initialization:', error);
			dispatch('error', { message: 'Error during initialization', error });
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
		
		console.log('StarFieldManager: Component destroyed and cleaned up');
		dispatch('destroyed');
	});
</script>

<!-- This component doesn't render any visible elements directly, it creates canvas programmatically -->

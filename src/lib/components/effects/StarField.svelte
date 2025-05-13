<!-- src/lib/components/effects/StarField.svelte -->
<script lang="ts">
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { browser } from '$app/environment';
	import { frameRateController } from '$lib/utils/frame-rate-controller';

	// Props
	export let containerElement: HTMLElement | null = null;
	export let autoStart = true;
	export let starCount = 300;
	export let enableBoost = true;
	export let maxDepth = 32;
	export let baseSpeed = 0.25;
	export let boostSpeed = 2;
	export let enableGlow = true;
	export let enableTrails = true;
	export let debugMode = false;

	// Component state
	let canvasElement: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = null;
	let stars: Array<{
		x: number;
		y: number;
		z: number;
		prevX: number;
		prevY: number;
		size: number;
		color: string;
		id?: number; // For debugging
	}> = [];
	let isRunning = false;
	let boosting = false;
	let animationFrameId: number | null = null;
	let speed = baseSpeed;
	let canvasInitialized = false;
	let errorCount = 0;
	let lastFrameTime = 0;
	let frameSkipCounter = 0;
	let totalFrames = 0;
	let droppedFrames = 0;

	// Performance optimization states
	let dynamicQuality = 1.0;
	let adaptiveStarCount = starCount;
	let useFrameSkipping = true;
	let lastPerformanceCheck = 0;
	let averageFrameTime = 16.67; // 60fps target

	// Create event dispatcher
	const dispatch = createEventDispatcher();

	// EXACT star colors from reference implementation
	const starColors = [
		'#0033ff', // Dim blue
		'#4477ff',
		'#6699ff',
		'#88bbff',
		'#aaddff',
		'#ffffff' // Bright white
	];

	// Subscribe to frame rate controller for adaptive performance
	let frameRateUnsubscribe: (() => void) | null = null;
	let qualityUnsubscribe: (() => void) | null = null;

	// Initialize stars (matching reference implementation)
	function initStars() {
		console.log('StarField: Initializing stars array with count:', adaptiveStarCount);
		stars = [];

		if (!canvasElement) {
			console.warn('StarField: Cannot initialize stars - canvas not ready');
			return;
		}

		for (let i = 0; i < adaptiveStarCount; i++) {
			createStar(i);
		}

		dispatch('stars-initialized', { count: stars.length });
	}

	function createStar(id?: number) {
		if (!canvasElement) {
			console.warn('StarField: Cannot create star - canvas not initialized');
			return;
		}

		// EXACT star creation logic from reference
		const star = {
			x: Math.random() * canvasElement.width * 2 - canvasElement.width,
			y: Math.random() * canvasElement.height * 2 - canvasElement.height,
			z: Math.random() * maxDepth,
			prevX: 0,
			prevY: 0,
			size: Math.random() * 2 + 1, // Variable size for visual interest
			color: starColors[Math.floor(Math.random() * starColors.length)],
			id: id // For debugging
		};

		star.prevX = star.x;
		star.prevY = star.y;
		stars.push(star);
	}

	// Setup canvas with better error handling
	function setupCanvas() {
		if (!containerElement) {
			console.error('StarField error: containerElement is null or undefined');
			dispatch('error', { message: 'Container element is null' });
			return false;
		}

		try {
			// Check for existing canvas
			const existingCanvas = containerElement.querySelector('canvas.star-field-canvas');
			if (existingCanvas) {
				console.log('StarField: Using existing canvas element');
				canvasElement = existingCanvas as HTMLCanvasElement;
			} else {
				console.log('StarField: Creating new canvas element');
				canvasElement = document.createElement('canvas');
				canvasElement.id = 'starfield';
				canvasElement.className = 'star-field-canvas';

				// Improved canvas styling
				Object.assign(canvasElement.style, {
					position: 'absolute',
					top: '0',
					left: '0',
					width: '100%',
					height: '100%',
					pointerEvents: 'none',
					touchAction: 'none'
				});

				containerElement.appendChild(canvasElement);
			}

			ctx = canvasElement.getContext('2d');
			if (!ctx) {
				console.error('Failed to get canvas context');
				dispatch('error', { message: 'Failed to get canvas context' });
				return false;
			}

			// Set context properties for better performance
			ctx.imageSmoothingEnabled = true;
			ctx.imageSmoothingQuality = 'high';

			resizeCanvas();
			canvasInitialized = true;

			console.log(
				'Canvas initialized successfully:',
				canvasElement.width,
				'x',
				canvasElement.height
			);
			dispatch('canvas-initialized', { width: canvasElement.width, height: canvasElement.height });

			// Add boost interaction area
			const boostArea = document.createElement('div');
			boostArea.className = 'boost-interaction-area';
			Object.assign(boostArea.style, {
				position: 'absolute',
				top: '0',
				left: '0',
				width: '100%',
				height: '100%',
				pointerEvents: 'auto',
				touchAction: 'none',
				zIndex: '1'
			});
			containerElement.appendChild(boostArea);

			// Add touch handlers to the boost area instead of the canvas
			boostArea.addEventListener('touchstart', handleTouchStart, { passive: false });
			boostArea.addEventListener('touchend', handleTouchEnd, { passive: false });

			return true;
		} catch (error) {
			console.error('Error setting up canvas:', error);
			dispatch('error', { error });
			return false;
		}
	}

	// Improved resize handling
	function resizeCanvas() {
		if (!canvasElement || !containerElement) return;

		// Use container's actual dimensions
		const rect = containerElement.getBoundingClientRect();
		canvasElement.width = rect.width || window.innerWidth;
		canvasElement.height = rect.height || window.innerHeight;

		console.log('Canvas resized to', canvasElement.width, 'x', canvasElement.height);
		dispatch('resize', { width: canvasElement.width, height: canvasElement.height });

		// Reinitialize stars after resize to ensure proper distribution
		if (stars.length > 0) {
			initStars();
		}
	}

	// Performance monitoring
	function checkPerformance(now: number) {
		totalFrames++;

		if (now - lastPerformanceCheck > 1000) {
			// Check every second
			const currentFPS = 1000 / averageFrameTime;

			if (debugMode) {
				console.log(
					`StarField Performance: FPS: ${currentFPS.toFixed(1)}, Dropped: ${droppedFrames}, Quality: ${dynamicQuality.toFixed(2)}`
				);
			}

			dispatch('performance', {
				fps: currentFPS,
				droppedFrames,
				totalFrames,
				quality: dynamicQuality
			});

			lastPerformanceCheck = now;
			droppedFrames = 0;
		}
	}

	// Animation loop matching the reference implementation exactly
	function animate() {
		// Clear any existing animation frame
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}

		if (!ctx || !canvasElement || !isRunning) {
			return;
		}

		const now = performance.now();
		const deltaTime = now - lastFrameTime;
		lastFrameTime = now;

		// Calculate moving average frame time
		averageFrameTime = averageFrameTime * 0.9 + deltaTime * 0.1;

		// Check if we should skip this frame for performance
		if (useFrameSkipping && !frameRateController.shouldRenderFrame()) {
			frameSkipCounter++;
			droppedFrames++;
			// Still schedule next frame even if skipping
			if (isRunning) {
				animationFrameId = requestAnimationFrame(animate);
			}
			return;
		}

		try {
			// Performance check
			checkPerformance(now);

			// EXACT trail effect from reference - using 0.2 opacity for longer trails
			const trailOpacity = dynamicQuality > 0.5 ? 0.2 : 0.3;
			ctx.fillStyle = `rgba(0, 0, 0, ${trailOpacity})`;
			ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);

			// Center of the screen (our viewing point)
			const centerX = canvasElement.width / 2;
			const centerY = canvasElement.height / 2;

			// Batch operations for better performance
			ctx.save();

			// Update and draw stars - EXACT logic from reference
			for (let i = 0; i < stars.length; i++) {
				const star = stars[i];

				// Store previous position for trails
				star.prevX = star.x;
				star.prevY = star.y;

				// Move star closer to viewer
				star.z -= speed;

				// If star passed the viewer, reset it to far distance
				if (star.z <= 0) {
					star.x = Math.random() * canvasElement.width * 2 - canvasElement.width;
					star.y = Math.random() * canvasElement.height * 2 - canvasElement.height;
					star.z = maxDepth;
					star.prevX = star.x;
					star.prevY = star.y;
					continue;
				}

				// EXACT 3D projection from reference
				const scale = maxDepth / star.z;
				const x2d = (star.x - centerX) * scale + centerX;
				const y2d = (star.y - centerY) * scale + centerY;

				// Only draw stars on screen
				if (x2d < 0 || x2d >= canvasElement.width || y2d < 0 || y2d >= canvasElement.height) {
					continue;
				}

				// EXACT star size calculation from reference
				const size = (1 - star.z / maxDepth) * 3;

				// EXACT color selection from reference
				const colorIndex = Math.floor((1 - star.z / maxDepth) * (starColors.length - 1));
				const color = starColors[colorIndex];

				// Optional glow effect (disabled by default for reference match)
				if (enableGlow && dynamicQuality > 0.7 && size > 0.8) {
					ctx.shadowColor = color;
					ctx.shadowBlur = size * 2;
				}

				// EXACT trail/star drawing logic from reference
				if (enableTrails && speed > baseSpeed * 1.5) {
					// Draw trails when moving fast
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

				// Reset shadow
				if (enableGlow && ctx.shadowBlur > 0) {
					ctx.shadowBlur = 0;
				}
			}

			ctx.restore();

			// EXACT speed transition from reference
			if (!boosting && speed > baseSpeed) {
				speed = Math.max(baseSpeed, speed * 0.98);
			}

			// Continue animation
			if (isRunning) {
				animationFrameId = requestAnimationFrame(animate);
			}
		} catch (error) {
			console.error('Error in StarField animation:', error);
			errorCount++;

			// Error recovery
			if (errorCount > 10) {
				console.error('Too many errors, stopping animation');
				stop();
				dispatch('error', { message: 'Animation stopped due to errors', error });
				return;
			}

			// Try to continue despite error
			if (isRunning) {
				animationFrameId = requestAnimationFrame(animate);
			}
		}
	}

	// Event handlers
	function handleKeyDown(e: KeyboardEvent) {
		if (e.code === 'Space') {
			e.preventDefault();
			boost();
		}
	}

	function handleKeyUp(e: KeyboardEvent) {
		if (e.code === 'Space') {
			e.preventDefault();
			unboost();
		}
	}

	function handleTouchStart(e: TouchEvent) {
		const target = e.target as HTMLElement;
		// Only prevent default if we're not touching a UI element
		if (!target.closest('nav, button, a, input, select, textarea')) {
			e.preventDefault();
			boost();
		}
	}

	function handleTouchEnd(e: TouchEvent) {
		const target = e.target as HTMLElement;
		// Only prevent default if we're not touching a UI element
		if (!target.closest('nav, button, a, input, select, textarea')) {
			e.preventDefault();
			unboost();
		}
	}

	// Public methods
	export function start() {
		if (isRunning) return;

		errorCount = 0;
		isRunning = true;
		lastFrameTime = performance.now();
		totalFrames = 0;
		droppedFrames = 0;

		if (!canvasInitialized && containerElement) {
			const success = setupCanvas();
			if (!success) {
				console.error('StarField: Failed to set up canvas, cannot start');
				isRunning = false;
				dispatch('error', { message: 'Failed to start animation' });
				return;
			}
			initStars();
		}

		animate();
		console.log('StarField animation started');
		dispatch('started');
	}

	export function boost() {
		if (!enableBoost) return;
		boosting = true;
		speed = boostSpeed;
		dispatch('boost', { active: true });
	}

	export function unboost() {
		if (!enableBoost) return;
		boosting = false;
		dispatch('boost', { active: false });
	}

	export function stop() {
		isRunning = false;
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
		console.log('StarField animation stopped');
		dispatch('stopped');
	}

	export function pause() {
		if (!isRunning) return;
		isRunning = false;
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
		dispatch('paused');
	}

	export function resume() {
		if (isRunning) return;
		isRunning = true;
		lastFrameTime = performance.now();
		animate();
		dispatch('resumed');
	}

	export function getCanvasElement() {
		return canvasElement;
	}

	export function getStarCount() {
		return stars.length;
	}

	export function getPerformanceStats() {
		return {
			totalFrames,
			droppedFrames,
			averageFrameTime,
			quality: dynamicQuality,
			starCount: stars.length
		};
	}

	// Reactive updates for star count changes
	$: if (canvasInitialized && Math.abs(stars.length - adaptiveStarCount) > 5) {
		console.log(`Updating star count from ${stars.length} to ${adaptiveStarCount}`);
		initStars();
	}

	// Update adaptive star count based on quality
	$: if (dynamicQuality < 0.4) {
		adaptiveStarCount = Math.max(50, Math.floor(starCount * 0.5));
	} else if (dynamicQuality < 0.6) {
		adaptiveStarCount = Math.max(100, Math.floor(starCount * 0.7));
	} else {
		adaptiveStarCount = starCount;
	}

	// Lifecycle
	onMount(() => {
		if (!browser) return;

		console.log('StarField mounting');

		// Subscribe to frame rate controller for performance adaptation
		qualityUnsubscribe = frameRateController.subscribeQuality((quality) => {
			dynamicQuality = quality;
		});

		if (containerElement) {
			const success = setupCanvas();
			if (success) {
				initStars();

				// Set up event listeners for boost
				if (enableBoost) {
					window.addEventListener('keydown', handleKeyDown);
					window.addEventListener('keyup', handleKeyUp);
				}

				// Handle window resize
				window.addEventListener('resize', resizeCanvas);

				// Auto-start if enabled
				if (autoStart) {
					setTimeout(start, 100);
				}
			} else {
				console.error('StarField: Failed to set up canvas');
				dispatch('error', { message: 'Failed to initialize StarField' });
			}
		} else {
			console.error('StarField error: No container element provided');
			dispatch('error', { message: 'No container element provided' });
		}
	});

	onDestroy(() => {
		if (!browser) return;

		console.log('StarField destroying');

		// Stop animation
		stop();

		// Unsubscribe from frame rate controller
		if (frameRateUnsubscribe) {
			frameRateUnsubscribe();
			frameRateUnsubscribe = null;
		}

		if (qualityUnsubscribe) {
			qualityUnsubscribe();
			qualityUnsubscribe = null;
		}

		// Remove event listeners
		if (enableBoost) {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
		}

		window.removeEventListener('resize', resizeCanvas);

		// Clean up canvas
		if (canvasElement?.parentNode) {
			canvasElement.parentNode.removeChild(canvasElement);
		}

		// Remove boost area
		const boostArea = containerElement?.querySelector('.boost-interaction-area');
		if (boostArea) {
			boostArea.removeEventListener('touchstart', handleTouchStart);
			boostArea.removeEventListener('touchend', handleTouchEnd);
			boostArea.remove();
		}

		dispatch('destroyed');
	});
</script>

<!-- This component manages its own canvas -->
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

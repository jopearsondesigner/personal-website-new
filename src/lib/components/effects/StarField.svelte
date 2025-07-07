<!-- src/lib/components/effects/StarField.svelte - ENHANCED WITH TOUCHMANAGER -->
<script lang="ts">
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { browser } from '$app/environment';

	// Import TouchManager for centralized touch handling
	import {
		TouchManager,
		createBoostTouchHandler,
		TOUCH_PRIORITIES
	} from '$lib/utils/touch-manager';
	import type { TouchHandler } from '$lib/utils/touch-manager';

	// Props - Matching original inspiration with performance options
	export let containerElement: HTMLElement | null = null;
	export let autoStart = true;
	export let starCount = 300;
	export let enableBoost = true;
	export let maxDepth = 32;
	export let baseSpeed = 0.25; // Match original
	export let boostSpeed = 2; // Match original
	export let enableGlow = true;
	export let enableTrails = true;
	export let enableAdaptiveQuality = true;
	export let enableHighDPI = true;
	export let targetFPS = 60;

	// Component state
	let canvasElement: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = null;
	let internalContainer: HTMLElement;
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
	let quality = 1.0;
	let currentFPS = 60;
	let frameCount = 0;
	let lastFrameTime = 0;
	let fpsUpdateTime = 0;
	let isReady = false;
	let setupComplete = false;

	// TouchManager integration
	let boostTouchHandler: TouchHandler | null = null;

	// Performance monitoring
	let performanceMetrics = {
		fps: 60,
		frameTime: 16,
		quality: 1.0,
		activeStars: starCount,
		droppedFrames: 0
	};

	// Enhanced visual settings
	let devicePixelRatio = 1;
	let canvasWidth = 0;
	let canvasHeight = 0;

	// Classic arcade star colors - choose your style!

	// Option 1: Star Wars Arcade (1983) - Most iconic starfield
	const starColors = [
		'#000080', // Deep blue (far)
		'#0066ff', // Bright blue
		'#00aaff', // Cyan blue
		'#ffaa00', // Amber/orange
		'#ffff00', // Bright yellow
		'#ffffff' // Pure white (near)
	];

	// Event dispatcher
	const dispatch = createEventDispatcher<{
		ready: void;
		error: { message: string };
		performanceChange: {
			fps: number;
			quality: number;
			frameTime: number;
			activeStars: number;
		};
	}>();

	// ======================================================================
	// REACTIVE STATEMENTS
	// ======================================================================

	// Watch for container element changes
	$: if (containerElement && !setupComplete) {
		setupStarField();
	}

	// ======================================================================
	// FAST INITIALIZATION
	// ======================================================================

	/**
	 * Setup the entire starfield when container is available
	 */
	function setupStarField() {
		if (!browser || setupComplete) return;

		const container = containerElement || internalContainer;
		if (!container) return;

		console.log('🚀 Setting up StarField...');

		const success = setupCanvas(container);
		if (success) {
			initStars();
			setupTouchHandling();
			setupComplete = true;

			if (autoStart) {
				requestAnimationFrame(() => {
					start();
				});
			}
		}
	}

	/**
	 * Initialize stars immediately - no async dependencies
	 */
	function initStars() {
		stars = [];
		for (let i = 0; i < starCount; i++) {
			createStar();
		}
		console.log(`✨ Initialized ${stars.length} stars`);
	}

	/**
	 * Create a single star - matches original inspiration
	 */
	function createStar() {
		const star = {
			x: Math.random() * canvasWidth * 2 - canvasWidth,
			y: Math.random() * canvasHeight * 2 - canvasHeight,
			z: Math.random() * maxDepth,
			prevX: 0,
			prevY: 0
		};
		stars.push(star);
	}

	/**
	 * Setup canvas with enhanced features
	 */
	function setupCanvas(container: HTMLElement): boolean {
		try {
			// Create canvas element
			canvasElement = document.createElement('canvas');
			canvasElement.id = 'starfield-enhanced';
			canvasElement.style.position = 'absolute';
			canvasElement.style.top = '0';
			canvasElement.style.left = '0';
			canvasElement.style.width = '100%';
			canvasElement.style.height = '100%';
			canvasElement.style.pointerEvents = 'none';

			// Add hardware acceleration hints
			canvasElement.style.transform = 'translateZ(0)';
			canvasElement.style.backfaceVisibility = 'hidden';

			container.appendChild(canvasElement);

			// Get context with optimized settings
			ctx = canvasElement.getContext('2d', {
				alpha: true,
				willReadFrequently: false,
				powerPreference: 'high-performance'
			});

			if (!ctx) {
				throw new Error('Failed to get 2D rendering context');
			}

			// Setup canvas dimensions
			resizeCanvas();

			return true;
		} catch (error) {
			console.error('Canvas setup failed:', error);
			dispatch('error', { message: `Canvas setup failed: ${error.message}` });
			return false;
		}
	}

	/**
	 * Setup TouchManager-based touch handling
	 */
	function setupTouchHandling() {
		if (!enableBoost || !browser) return;

		// Create boost touch handler using TouchManager
		boostTouchHandler = createBoostTouchHandler(
			() => {
				console.log('👆 Touch boost activated');
				boost();
			},
			() => {
				console.log('👆 Touch boost deactivated');
				unboost();
			},
			{
				// Bind to the container for better touch area
				element: containerElement || internalContainer,
				requireLongPress: false // Immediate boost, like original
			}
		);

		// Register with TouchManager
		TouchManager.registerHandler(boostTouchHandler);

		console.log('👆 Touch handling setup complete');
	}

	/**
	 * Cleanup touch handling
	 */
	function cleanupTouchHandling() {
		if (boostTouchHandler) {
			TouchManager.unregisterHandler(boostTouchHandler.id);
			boostTouchHandler = null;
			console.log('👆 Touch handling cleaned up');
		}
	}

	/**
	 * Resize canvas with high DPI support
	 */
	function resizeCanvas() {
		if (!canvasElement || !setupComplete) return;

		const container = containerElement || internalContainer;
		if (!container) return;

		const rect = container.getBoundingClientRect();
		canvasWidth = rect.width;
		canvasHeight = rect.height;

		// High DPI support
		devicePixelRatio = enableHighDPI ? window.devicePixelRatio || 1 : 1;

		// Set canvas size
		canvasElement.width = canvasWidth * devicePixelRatio;
		canvasElement.height = canvasHeight * devicePixelRatio;
		canvasElement.style.width = `${canvasWidth}px`;
		canvasElement.style.height = `${canvasHeight}px`;

		// Scale context for high DPI
		if (ctx) {
			ctx.scale(devicePixelRatio, devicePixelRatio);
		}

		console.log(`📐 Canvas resized: ${canvasWidth}x${canvasHeight} (DPR: ${devicePixelRatio})`);
	}

	// ======================================================================
	// ENHANCED ANIMATION LOOP
	// ======================================================================

	/**
	 * Main animation loop with performance monitoring
	 */
	function animate(timestamp: number) {
		if (!isRunning || !ctx) return;

		// Request next frame immediately to maintain consistent timing
		animationFrameId = requestAnimationFrame(animate);

		// Calculate frame timing
		const deltaTime = timestamp - lastFrameTime;
		lastFrameTime = timestamp;

		// Update FPS calculation
		frameCount++;
		if (timestamp - fpsUpdateTime >= 1000) {
			currentFPS = frameCount;
			frameCount = 0;
			fpsUpdateTime = timestamp;

			// Update performance metrics
			performanceMetrics.fps = currentFPS;
			performanceMetrics.frameTime = deltaTime;
			performanceMetrics.activeStars = stars.length;

			// Dispatch performance update
			dispatch('performanceChange', performanceMetrics);

			// Adaptive quality adjustment
			if (enableAdaptiveQuality) {
				adjustQuality();
			}
		}

		// Clear canvas with semi-transparent overlay - matches original
		ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
		ctx.fillRect(0, 0, canvasWidth, canvasHeight);

		// Render stars
		renderStars();

		// Gradually return to base speed when not boosting - matches original
		if (!boosting && speed > baseSpeed) {
			speed = Math.max(baseSpeed, speed * 0.98);
		}
	}

	/**
	 * Star rendering - matches original inspiration with performance optimizations
	 */
	function renderStars() {
		if (!ctx) return;

		const centerX = canvasWidth / 2;
		const centerY = canvasHeight / 2;
		const effectiveStarCount = Math.floor(starCount * quality);

		for (let i = 0; i < Math.min(stars.length, effectiveStarCount); i++) {
			const star = stars[i];

			// Store previous position for trails
			star.prevX = star.x;
			star.prevY = star.y;

			// Move star closer to viewer
			star.z -= speed;

			// If star passed the viewer, reset it to far distance
			if (star.z <= 0) {
				star.x = Math.random() * canvasWidth * 2 - canvasWidth;
				star.y = Math.random() * canvasHeight * 2 - canvasHeight;
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
			if (x2d < 0 || x2d >= canvasWidth || y2d < 0 || y2d >= canvasHeight) {
				continue;
			}

			// Star size based on depth - matches original
			const size = (1 - star.z / maxDepth) * 3;

			// Star color based on depth (closer = brighter) - matches original
			const colorIndex = Math.floor((1 - star.z / maxDepth) * (starColors.length - 1));
			const color = starColors[colorIndex];

			// Draw star trail when moving fast - matches original
			if (enableTrails && speed > baseSpeed * 1.5) {
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
				// Draw star as circle - matches original
				ctx.beginPath();
				ctx.arc(x2d, y2d, size, 0, Math.PI * 2);
				ctx.fillStyle = color;
				ctx.fill();
			}
		}
	}

	/**
	 * Adaptive quality adjustment based on performance
	 */
	function adjustQuality() {
		const targetFPSRatio = currentFPS / targetFPS;

		if (targetFPSRatio < 0.8) {
			// Performance is poor, reduce quality
			quality = Math.max(0.3, quality - 0.1);
			console.log(`📉 Reduced quality to ${quality.toFixed(1)} (FPS: ${currentFPS})`);
		} else if (targetFPSRatio > 1.1 && quality < 1.0) {
			// Performance is good, can increase quality
			quality = Math.min(1.0, quality + 0.05);
			console.log(`📈 Increased quality to ${quality.toFixed(1)} (FPS: ${currentFPS})`);
		}

		performanceMetrics.quality = quality;
	}

	// ======================================================================
	// EVENT HANDLERS (Updated to use TouchManager)
	// ======================================================================

	/**
	 * Handle keyboard input for boost
	 */
	function handleKeyDown(e: KeyboardEvent) {
		if (e.code === 'Space' && enableBoost) {
			e.preventDefault();
			boost();
		}
	}

	function handleKeyUp(e: KeyboardEvent) {
		if (e.code === 'Space' && enableBoost) {
			e.preventDefault();
			unboost();
		}
	}

	// Touch handling is now managed by TouchManager
	// No direct touch event listeners needed

	// ======================================================================
	// PUBLIC API
	// ======================================================================

	/**
	 * Start the starfield animation
	 */
	export function start() {
		if (isRunning || !setupComplete) return;

		console.log('🚀 Starting StarField...');

		isRunning = true;
		speed = baseSpeed;
		lastFrameTime = performance.now();
		fpsUpdateTime = lastFrameTime;

		// Start animation loop
		animationFrameId = requestAnimationFrame(animate);

		// Setup keyboard event listeners
		if (enableBoost) {
			window.addEventListener('keydown', handleKeyDown);
			window.addEventListener('keyup', handleKeyUp);
		}

		// Touch events are handled by TouchManager, no need for manual setup

		// Mark as ready
		if (!isReady) {
			isReady = true;
			dispatch('ready');
		}

		console.log('✅ StarField started');
	}

	/**
	 * Stop the starfield animation
	 */
	export function stop() {
		if (!isRunning) return;

		console.log('⏹️ Stopping StarField...');

		isRunning = false;

		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}

		// Remove keyboard event listeners
		if (enableBoost) {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
		}

		// Touch events cleanup is handled by component destroy

		console.log('⏹️ StarField stopped');
	}

	/**
	 * Pause the starfield (keeps state)
	 */
	export function pause() {
		if (!isRunning) return;

		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
	}

	/**
	 * Resume the starfield
	 */
	export function resume() {
		if (!isRunning || animationFrameId) return;

		lastFrameTime = performance.now();
		animationFrameId = requestAnimationFrame(animate);
	}

	/**
	 * Activate boost mode
	 */
	export function boost() {
		boosting = true;
		speed = boostSpeed;
	}

	/**
	 * Deactivate boost mode - matches original gradual reduction
	 */
	export function unboost() {
		boosting = false;
		// The gradual speed reduction happens in the animation loop
	}

	/**
	 * Set quality level (0.0 - 1.0)
	 */
	export function setQuality(newQuality: number) {
		quality = Math.max(0.1, Math.min(1.0, newQuality));
		performanceMetrics.quality = quality;
		console.log(`🎚️ Quality set to ${quality.toFixed(1)}`);
	}

	/**
	 * Get current performance metrics
	 */
	export function getPerformanceMetrics() {
		return { ...performanceMetrics };
	}

	/**
	 * Resize the starfield
	 */
	export function resize() {
		resizeCanvas();
	}

	/**
	 * Get TouchManager instance for external boost control
	 */
	export function getTouchManager() {
		return TouchManager;
	}

	/**
	 * Check if boost is currently active (via touch or keyboard)
	 */
	export function isBoostActive(): boolean {
		return boosting || (boostTouchHandler && TouchManager.isHandlerActive(boostTouchHandler.id));
	}

	// ======================================================================
	// LIFECYCLE
	// ======================================================================

	onMount(() => {
		if (!browser) return;

		// Try initial setup if container is already available
		setupStarField();

		// Setup resize observer
		let resizeObserver: ResizeObserver | null = null;

		if (window.ResizeObserver) {
			resizeObserver = new ResizeObserver(() => {
				resizeCanvas();
			});

			const container = containerElement || internalContainer;
			if (container) {
				resizeObserver.observe(container);
			}
		}

		// Cleanup function
		return () => {
			if (resizeObserver) {
				resizeObserver.disconnect();
			}
		};
	});

	onDestroy(() => {
		if (!browser) return;

		stop();
		cleanupTouchHandling();

		// Clean up canvas
		if (canvasElement && canvasElement.parentNode) {
			canvasElement.parentNode.removeChild(canvasElement);
		}

		// Clear references
		ctx = null;
		stars = [];
		setupComplete = false;
	});
</script>

<!-- Wrapper for the canvas - serves as fallback container -->
<div class="starfield-wrapper w-full h-full" bind:this={internalContainer}>
	<slot></slot>
</div>

<style>
	.starfield-wrapper {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
		display: block;
		contain: layout style paint;
	}
</style>

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { frameRateController } from '$lib/utils/frame-rate-controller';
	import { memoryManager } from '$lib/utils/memory-manager';
	import { deviceCapabilities } from '$lib/utils/device-performance';
	import { get } from 'svelte/store';

	// Props
	export let theme: 'dark' | 'light' = 'dark';
	export let isVisible: boolean = true;

	// Canvas and context
	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = null;
	let animationId: number | null = null;
	let isInitialized = false;
	let isRunning = false;

	// Performance tracking
	let lastFrameTime = 0;
	let frameCount = 0;
	let lastQualityAdjustment = 0;
	let currentQuality = 1.0;

	// Star system configuration
	interface StarfieldConfig {
		starCount: number;
		speeds: number[];
		colors: string[];
		sizes: number[];
		opacity: number;
	}

	let config: StarfieldConfig;
	let stars: Array<{
		x: number;
		y: number;
		speed: number;
		size: number;
		color: string;
		opacity: number;
		inUse: boolean;
	}> = [];

	// Cleanup functions
	let frameRateUnsubscribe: (() => void) | null = null;
	let memoryUnsubscribe: (() => void) | null = null;
	let resizeObserver: ResizeObserver | null = null;
	let visibilityChangeHandler: (() => void) | null = null;

	/**
	 * Initialize starfield configuration based on device capabilities and theme
	 */
	function initializeConfig() {
		const capabilities = get(deviceCapabilities);

		// Base configuration
		const baseConfig: StarfieldConfig = {
			starCount: 50,
			speeds: [0.5, 1.0, 1.5, 2.0],
			colors:
				theme === 'dark'
					? ['rgba(255,255,255,0.8)', 'rgba(240,248,255,0.6)', 'rgba(255,248,220,0.4)']
					: ['rgba(100,100,100,0.6)', 'rgba(120,140,160,0.4)', 'rgba(140,120,100,0.3)'],
			sizes: [1, 1.5, 2],
			opacity: theme === 'dark' ? 0.7 : 0.4
		};

		// Adapt to device tier
		switch (capabilities.tier) {
			case 'low':
				config = {
					...baseConfig,
					starCount: 25,
					speeds: [0.5, 1.0],
					sizes: [1]
				};
				break;
			case 'medium':
				config = {
					...baseConfig,
					starCount: 40,
					speeds: [0.5, 1.0, 1.5]
				};
				break;
			case 'high':
			default:
				config = baseConfig;
				break;
		}

		// Further reduce for mobile devices
		if (capabilities.isMobile) {
			config.starCount = Math.min(config.starCount, 30);
		}

		// Respect reduced motion preference
		if (capabilities.preferReducedMotion) {
			config.speeds = config.speeds.map((speed) => speed * 0.3);
			config.opacity *= 0.5;
		}
	}

	/**
	 * Initialize star objects using memory manager's object pool
	 */
	function initializeStars() {
		if (!canvas || !ctx) return;

		// Create object pool for stars if it doesn't exist
		memoryManager.createObjectPool(
			'starfield-stars',
			() => ({
				x: 0,
				y: 0,
				speed: 0,
				size: 0,
				color: '',
				opacity: 0,
				inUse: false,
				reset() {
					this.x = 0;
					this.y = 0;
					this.speed = 0;
					this.size = 0;
					this.color = '';
					this.opacity = 0;
					this.inUse = false;
				}
			}),
			config.starCount + 10
		); // Extra capacity

		// Initialize stars
		stars = [];
		for (let i = 0; i < config.starCount; i++) {
			const star = memoryManager.getFromPool('starfield-stars');
			if (star) {
				resetStar(star);
				star.y = Math.random() * canvas.height; // Initial random distribution
				stars.push(star);
			}
		}
	}

	/**
	 * Reset a star to starting position with random properties
	 */
	function resetStar(star: any) {
		if (!canvas) return;

		star.x = Math.random() * canvas.width;
		star.y = -5; // Start above viewport
		star.speed = config.speeds[Math.floor(Math.random() * config.speeds.length)];
		star.size = config.sizes[Math.floor(Math.random() * config.sizes.length)];
		star.color = config.colors[Math.floor(Math.random() * config.colors.length)];
		star.opacity = config.opacity * (0.5 + Math.random() * 0.5);
		star.inUse = true;
	}

	/**
	 * Update star positions and handle recycling
	 */
	function updateStars(deltaTime: number) {
		if (!canvas) return;

		for (const star of stars) {
			// Move star downward
			star.y += star.speed * (deltaTime / 16); // Normalize to 60fps baseline

			// Recycle star when it goes off screen
			if (star.y > canvas.height + 10) {
				resetStar(star);
			}
		}
	}

	/**
	 * Render stars to canvas
	 */
	function renderStars() {
		if (!canvas || !ctx) return;

		// Clear canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Render each star
		for (const star of stars) {
			if (!star.inUse) continue;

			ctx.save();
			ctx.globalAlpha = star.opacity * currentQuality;

			// Set color
			ctx.fillStyle = star.color;

			// Draw star as filled circle
			ctx.beginPath();
			ctx.arc(star.x, star.y, star.size * currentQuality, 0, Math.PI * 2);
			ctx.fill();

			ctx.restore();
		}
	}

	/**
	 * Main animation loop
	 */
	function animate(timestamp: number) {
		if (!isRunning || !frameRateController.shouldRenderFrame()) {
			animationId = requestAnimationFrame(animate);
			return;
		}

		// Calculate delta time
		const deltaTime = timestamp - lastFrameTime;
		lastFrameTime = timestamp;

		// Update and render
		updateStars(deltaTime);
		renderStars();

		// Continue animation
		animationId = requestAnimationFrame(animate);
		frameCount++;
	}

	/**
	 * Handle canvas resize
	 */
	function handleResize() {
		if (!canvas || !ctx) return;

		const rect = canvas.parentElement?.getBoundingClientRect();
		if (!rect) return;

		// Update canvas size
		const pixelRatio = window.devicePixelRatio || 1;
		const width = rect.width;
		const height = rect.height;

		canvas.width = width * pixelRatio;
		canvas.height = height * pixelRatio;
		canvas.style.width = `${width}px`;
		canvas.style.height = `${height}px`;

		// Scale context for high DPI
		ctx.scale(pixelRatio, pixelRatio);

		// Redistribute stars for new canvas size
		if (stars.length > 0) {
			stars.forEach((star) => {
				star.x = Math.random() * width;
			});
		}
	}

	/**
	 * Handle quality changes from frame rate controller
	 */
	function handleQualityChange(quality: number) {
		currentQuality = quality;

		// Adjust star count based on quality
		const targetStarCount = Math.floor(config.starCount * quality);

		if (targetStarCount < stars.length) {
			// Remove excess stars
			const excessStars = stars.splice(targetStarCount);
			excessStars.forEach((star) => {
				memoryManager.returnToPool('starfield-stars', star);
			});
		} else if (targetStarCount > stars.length && targetStarCount <= config.starCount) {
			// Add more stars
			const needed = targetStarCount - stars.length;
			for (let i = 0; i < needed; i++) {
				const star = memoryManager.getFromPool('starfield-stars');
				if (star) {
					resetStar(star);
					star.y = Math.random() * (canvas?.height || 600);
					stars.push(star);
				}
			}
		}
	}

	/**
	 * Handle visibility changes
	 */
	function handleVisibilityChange() {
		if (document.hidden) {
			isRunning = false;
		} else if (isVisible && isInitialized) {
			isRunning = true;
			lastFrameTime = performance.now();
		}
	}

	/**
	 * Initialize the starfield
	 */
	function initialize() {
		if (!browser || !canvas || isInitialized) return;

		try {
			// Get canvas context
			ctx = canvas.getContext('2d');
			if (!ctx) {
				console.warn('Failed to get 2D canvas context for starfield');
				return;
			}

			// Initialize configuration
			initializeConfig();

			// Set up canvas
			handleResize();

			// Initialize stars
			initializeStars();

			// Set up performance monitoring
			frameRateUnsubscribe = frameRateController.subscribeQuality(handleQualityChange);

			// Set up resize observer
			if (ResizeObserver) {
				resizeObserver = new ResizeObserver(() => {
					if (frameRateController.shouldRenderFrame()) {
						handleResize();
					}
				});
				resizeObserver.observe(canvas.parentElement!);
			}

			// Set up visibility change handler
			visibilityChangeHandler = handleVisibilityChange;
			document.addEventListener('visibilitychange', visibilityChangeHandler);

			isInitialized = true;

			// Start animation if visible
			if (isVisible) {
				start();
			}
		} catch (error) {
			console.error('Failed to initialize starfield:', error);
			cleanup();
		}
	}

	/**
	 * Start the starfield animation
	 */
	function start() {
		if (!isInitialized || isRunning) return;

		isRunning = true;
		lastFrameTime = performance.now();

		if (animationId) {
			cancelAnimationFrame(animationId);
		}

		animationId = requestAnimationFrame(animate);
	}

	/**
	 * Stop the starfield animation
	 */
	function stop() {
		isRunning = false;

		if (animationId) {
			cancelAnimationFrame(animationId);
			animationId = null;
		}
	}

	/**
	 * Clean up all resources
	 */
	function cleanup() {
		// Stop animation
		stop();

		// Return stars to pool
		stars.forEach((star) => {
			memoryManager.returnToPool('starfield-stars', star);
		});
		stars = [];

		// Clean up subscriptions
		if (frameRateUnsubscribe) {
			frameRateUnsubscribe();
			frameRateUnsubscribe = null;
		}

		if (memoryUnsubscribe) {
			memoryUnsubscribe();
			memoryUnsubscribe = null;
		}

		// Clean up observers
		if (resizeObserver) {
			resizeObserver.disconnect();
			resizeObserver = null;
		}

		// Clean up event listeners
		if (visibilityChangeHandler) {
			document.removeEventListener('visibilitychange', visibilityChangeHandler);
			visibilityChangeHandler = null;
		}

		// Reset state
		isInitialized = false;
		isRunning = false;
		ctx = null;
	}

	// Reactive statements
	$: if (isVisible && isInitialized) {
		start();
	} else if (!isVisible && isRunning) {
		stop();
	}

	$: if (theme && isInitialized) {
		// Reinitialize with new theme
		initializeConfig();
		stars.forEach((star) => {
			star.color = config.colors[Math.floor(Math.random() * config.colors.length)];
			star.opacity = config.opacity * (0.5 + Math.random() * 0.5);
		});
	}

	// Lifecycle
	onMount(() => {
		if (browser) {
			// Delay initialization slightly to ensure parent layout is ready
			setTimeout(initialize, 50);
		}
	});

	onDestroy(() => {
		cleanup();
	});
</script>

<canvas bind:this={canvas} class="starfield-canvas" class:visible={isVisible} />

<style>
	.starfield-canvas {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		opacity: 0;
		transition: opacity 0.3s ease-out;
		z-index: 2; /* Above blank monitor background */
	}

	.starfield-canvas.visible {
		opacity: 1;
	}

	/* Ensure canvas respects border radius of parent */
	.starfield-canvas {
		border-radius: inherit;
		overflow: hidden;
	}

	/* Hardware acceleration */
	.starfield-canvas {
		transform: translateZ(0);
		backface-visibility: hidden;
		-webkit-backface-visibility: hidden;
		will-change: opacity;
	}
</style>

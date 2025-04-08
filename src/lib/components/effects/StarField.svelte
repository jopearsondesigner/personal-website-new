<script lang="ts">
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { browser } from '$app/environment';
	import { get } from 'svelte/store';
	import { deviceCapabilities } from '$lib/utils/device-performance';
	import { CanvasStarFieldManager } from '$lib/utils/canvas-star-field';
	import { animationState } from '$lib/stores/animation-store';

	// Props
	export let containerElement: HTMLElement | null = null;
	export let autoStart = true;
	export let starCount: number | undefined = undefined;
	export let enableBoost = true;
	export let enableGlow = true;
	export let gameTitle: string | undefined = undefined;
	export let startText: string | undefined = undefined;
	export let withStartScreen = false;

	// Component state
	let canvasElement: HTMLCanvasElement;
	let starfieldManager: CanvasStarFieldManager | null = null;
	let isRunning = false;
	let isBoosting = false;
	let isPaused = false;
	let isLowPerformanceDevice = false;
	let isInitialized = false;
	let dispatch = createEventDispatcher();

	// Define throttle function
	function throttle(func: Function, wait: number) {
		let lastCall = 0;
		return function (...args: any[]) {
			const now = Date.now();
			if (now - lastCall < wait) return;
			lastCall = now;
			return func(...args);
		};
	}

	// Initialize star field
	function initStarField() {
		if (!browser || !containerElement) return;

		// Detect device capabilities
		const capabilities = get(deviceCapabilities);
		isLowPerformanceDevice = capabilities.tier === 'low';

		// Determine appropriate star count based on device capabilities
		const autoStarCount =
			capabilities.maxStars || (isLowPerformanceDevice ? 100 : capabilities.isMobile ? 200 : 300);

		// Create star field manager with appropriate star count
		starfieldManager = new CanvasStarFieldManager(
			animationState,
			starCount || autoStarCount,
			!isLowPerformanceDevice, // Use worker on capable devices
			!isLowPerformanceDevice // Use parallax on capable devices
		);

		// Set container for the canvas
		starfieldManager.setContainer(containerElement);

		// Apply device-specific optimizations
		if (capabilities) {
			starfieldManager.adaptToDeviceCapabilities(capabilities);
		}

		// Mark as initialized
		isInitialized = true;

		// Auto start if enabled
		if (autoStart) {
			start();
		}
	}

	// Start animation
	export function start() {
		if (!starfieldManager || isRunning) return;
		starfieldManager.start();
		isRunning = true;
		dispatch('start');
	}

	// Stop animation
	export function stop() {
		if (!starfieldManager || !isRunning) return;
		starfieldManager.stop();
		isRunning = false;
		dispatch('stop');
	}

	// Pause animation
	export function pause() {
		if (!starfieldManager || !isRunning || isPaused) return;
		starfieldManager.pause();
		isPaused = true;
		dispatch('pause');
	}

	// Resume animation
	export function resume() {
		if (!starfieldManager || !isRunning || !isPaused) return;
		starfieldManager.resume();
		isPaused = false;
		dispatch('resume');
	}

	// Toggle boost mode
	export function toggleBoost(boost: boolean) {
		if (!starfieldManager || !enableBoost) return;

		starfieldManager.setBoostMode(boost);
		isBoosting = boost;
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
		if (!starfieldManager) return;

		if (document.hidden) {
			if (isRunning && !isPaused) {
				starfieldManager.pause();
				isPaused = true;
			}
		} else {
			if (isRunning && isPaused) {
				starfieldManager.resume();
				isPaused = false;
			}
		}
	}

	// Lifecycle hooks
	onMount(() => {
		if (!browser) return;

		// Wait for next tick to ensure DOM is ready
		setTimeout(() => {
			// Initialize starfield when containerElement is available
			if (containerElement && !isInitialized) {
				initStarField();
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
		if (starfieldManager) {
			starfieldManager.cleanup();
			starfieldManager = null;
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
	});

	// Watch for container element changes and initialize if needed
	$: if (containerElement && browser && !isInitialized) {
		// Use a small delay to ensure the DOM is ready
		setTimeout(() => {
			initStarField();
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

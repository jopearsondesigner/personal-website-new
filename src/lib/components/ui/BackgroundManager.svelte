<!-- src/lib/components/ui/BackgroundManager.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { get } from 'svelte/store';
	import StarFieldManager from '$lib/components/effects/StarFieldManager.svelte';
	import { animationState } from '$lib/stores/animation-store';
	import { deviceCapabilities } from '$lib/utils/device-performance';
	import { frameRateController } from '$lib/utils/frame-rate-controller';
	import { CanvasStarFieldManager } from '$lib/utils/canvas-star-field';

	// Props
	export let currentScreen = 'main';

	// Component state
	let starContainer: HTMLElement;
	let spaceBackground: HTMLElement;
	let canvasStarFieldManager: CanvasStarFieldManager | null = null;
	let starFieldComponent: StarFieldManager;

	// Device detection state
	let isMobileDevice = false;
	let isLowPerformanceDevice = false;
	let frameRateUnsubscribe: Function | null = null;

	// Initialize/reset stars when screen changes
	$: if (currentScreen === 'main' && browser && starContainer) {
		initializeStarField();
	}

	// Device detection
	function detectDeviceCapabilities() {
		if (!browser) return;

		// Check if mobile
		isMobileDevice = window.innerWidth < 768;

		// Try to detect lower-performance devices
		isLowPerformanceDevice =
			isMobileDevice &&
			(navigator.hardwareConcurrency <= 4 ||
				(navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')));
	}

	// Initialize star field
	function initializeStarField() {
		if (currentScreen !== 'main' || !browser || !starContainer) return;

		console.log('Initializing star field for screen:', currentScreen);

		// Reset animation state first
		animationState.resetAnimationState();

		// Small delay to ensure state is updated
		setTimeout(() => {
			// If we're using the StarField component, start/restart it
			if (starFieldComponent) {
				console.log('Starting StarField component');
				starFieldComponent.start();
			}
			// Rest of the function...
		}, 50);
	}

	// Stop star field animations
	function stopStarField() {
		if (!browser) return;

		// Stop StarField component if available
		if (starFieldComponent && typeof starFieldComponent.stop === 'function') {
			starFieldComponent.stop();
		}
		// Stop canvas star field
		else if (canvasStarFieldManager && typeof canvasStarFieldManager.stop === 'function') {
			canvasStarFieldManager.stop();
		}
	}

	// Handle boost state (speed up stars)
	function handleBoost(active: boolean) {
		// Update frameRateController's quality if boosting
		if (active) {
			// Ensure high quality during boost
			frameRateController.setQualityOverride(0.9);
		} else {
			// Reset to adaptive quality
			frameRateController.setAdaptiveEnabled(true);
		}

		if (starFieldComponent) {
			if (active) {
				starFieldComponent.boost();
			} else {
				starFieldComponent.unboost();
			}
		} else if (canvasStarFieldManager) {
			canvasStarFieldManager.setBoostMode(active);
		}
	}

	// Lifecycle
	onMount(() => {
		if (!browser) return;

		// Detect device capabilities
		detectDeviceCapabilities();

		// Delay initialization slightly to ensure DOM is ready
		setTimeout(() => {
			initializeStarField();
		}, 100);

		// Setup frame rate controller
		const capabilities = get(deviceCapabilities);
		const targetFPS = isLowPerformanceDevice ? 30 : 60;
		frameRateController.setTargetFPS(targetFPS);
		const maxSkip = capabilities.frameSkip || (isLowPerformanceDevice ? 2 : 0);
		frameRateController.setMaxSkippedFrames(maxSkip);
		frameRateController.setAdaptiveEnabled(true);

		// Subscribe to quality changes to adapt animations
		frameRateUnsubscribe = frameRateController.subscribeQuality((quality) => {
			// Update animations based on quality level
			try {
				if (canvasStarFieldManager) {
					// Adapt star field based on quality
					const capabilities = get(deviceCapabilities);
					const baseCount = capabilities.maxStars || 60;
					const adjustedCount = Math.max(20, Math.round(baseCount * quality));

					const currentCount = canvasStarFieldManager?.getStarCount?.() ?? 0;
					if (
						typeof canvasStarFieldManager.setStarCount === 'function' &&
						Math.abs(currentCount - adjustedCount) > 5
					) {
						canvasStarFieldManager.setStarCount(adjustedCount);
					}

					// Safely set properties
					if ('enableGlow' in canvasStarFieldManager) {
						canvasStarFieldManager.enableGlow = quality > 0.7;
					}

					if (typeof canvasStarFieldManager.setUseContainerParallax === 'function') {
						canvasStarFieldManager.setUseContainerParallax(
							quality > 0.8 && !isLowPerformanceDevice
						);
					}
				}

				if (starFieldComponent) {
					// Adapt StarField component based on quality
					starFieldComponent.enableGlow = quality > 0.7;
					const capabilities = get(deviceCapabilities);
					const baseCount = capabilities.maxStars || 60;
					const adjustedCount = Math.max(20, Math.round(baseCount * quality));

					// Only update if significantly different
					if (Math.abs(starFieldComponent.starCount - adjustedCount) > 5) {
						starFieldComponent.starCount = adjustedCount;
					}
				}
			} catch (error) {
				console.warn('Error in quality adjustment callback:', error);
			}
		});

		// Initialize star field
		initializeStarField();

		// Set up global event listener for boost events
		window.addEventListener('boost', (e: CustomEvent) => handleBoost(e.detail.active));
	});

	onDestroy(() => {
		if (!browser) return;

		// Stop animations and clean up
		stopStarField();

		// Cleanup canvas manager
		if (canvasStarFieldManager) {
			canvasStarFieldManager.cleanup();
			canvasStarFieldManager = null;
		}

		// Unsubscribe from frameRateController
		if (frameRateUnsubscribe) {
			frameRateUnsubscribe();
			frameRateUnsubscribe = null;
		}

		// Remove event listeners
		window.removeEventListener('boost', (e: CustomEvent) => handleBoost(e.detail.active));

		// Manual garbage collection hint
		if ((window as any).gc) {
			try {
				(window as any).gc();
			} catch (e) {
				// Ignore errors in garbage collection
			}
		}
	});
</script>

<div
	id="space-background"
	class="absolute inset-0 overflow-hidden pointer-events-none rounded-[3vmin] hardware-accelerated"
	bind:this={spaceBackground}
>
	<div
		class="canvas-star-container absolute inset-0 pointer-events-none rounded-[3vmin] hardware-accelerated"
		bind:this={starContainer}
	>
		{#if starContainer}
			<StarFieldManager
				bind:this={starFieldComponent}
				{starContainer}
				starCount={300}
				enableBoost={true}
				baseSpeed={0.25}
				boostSpeed={2}
				maxDepth={32}
			/>
		{/if}

		<!-- Fallback stars - only render if we need them -->
		{#if $animationState.stars && $animationState.stars.length > 0 && !starFieldComponent && !canvasStarFieldManager}
			{#each $animationState.stars as star (star.id)}
				<div class="star absolute" style={star.style}></div>
			{/each}
		{/if}
	</div>
</div>

<style>
	/* Space background */
	#space-background {
		position: absolute;
		inset: 0;
		background: radial-gradient(circle at center, #000 20%, #001c4d 80%, #000000);
		border-radius: var(--border-radius);
		overflow: hidden;
		z-index: 0;
		perspective: 1000px;
		/* Add the screen curvature effect */
		mask-image: radial-gradient(ellipse at center, black 90%, transparent 100%);
		-webkit-mask-image: radial-gradient(ellipse at center, black 90%, transparent 100%);
	}

	.star-container {
		position: absolute;
		inset: 0;
		perspective: 500px;
		transform-style: preserve-3d;
		z-index: 1;
		border-radius: var(--border-radius);
	}

	.star {
		position: absolute;
		background: #fff;
		border-radius: 50%;
		box-shadow: 0 0 2px 1px rgba(255, 255, 255, 0.5);
		pointer-events: none;
		transform: translateZ(0);
		will-change: transform;
		contain: layout style;
	}

	/* Mobile optimizations */
	@media (max-width: 768px) {
		/* Optimize star rendering on mobile */
		.star {
			will-change: transform;
			position: absolute;
			background: #fff;
			border-radius: 50%;
			box-shadow: 0 0 1px rgba(255, 255, 255, 0.5); /* Reduced shadow */
			pointer-events: none;
			contain: layout style;
		}
	}

	/* Hardware acceleration */
	.hardware-accelerated {
		transform: translateZ(0);
		backface-visibility: hidden;
		perspective: 1000px;
		will-change: transform, opacity;
		contain: layout style paint;
	}
</style>

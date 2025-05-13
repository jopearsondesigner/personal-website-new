<!-- src/lib/components/ui/BackgroundManager.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { get } from 'svelte/store';
	import StarField from '$lib/components/effects/StarField.svelte';
	import { animationState } from '$lib/stores/animation-store';
	import { deviceCapabilities } from '$lib/utils/device-performance';
	import { frameRateController } from '$lib/utils/frame-rate-controller';

	// Props
	export let currentScreen = 'main';

	// Component references
	let starContainer: HTMLElement;
	let spaceBackground: HTMLElement;
	let starFieldComponent: StarField;

	// State management
	let isMobileDevice = false;
	let isLowPerformanceDevice = false;
	let isInitialized = false;
	let frameRateUnsubscribe: (() => void) | null = null;
	let qualityUnsubscribe: (() => void) | null = null;
	let errorCount = 0;
	let maxRetries = 3;

	// Reactive statement to handle screen changes
	$: if (currentScreen === 'main' && browser && starContainer && !isInitialized) {
		initializeStarField();
	}

	// Device capability detection
	function detectDeviceCapabilities() {
		if (!browser) return;

		// Enhanced mobile detection
		isMobileDevice =
			/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
			window.innerWidth < 768;

		// Performance-based detection
		isLowPerformanceDevice =
			isMobileDevice &&
			(navigator.hardwareConcurrency <= 4 ||
				(navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')) ||
				window.innerWidth < 480);

		// Check for power saving mode
		if (navigator.getBattery) {
			navigator
				.getBattery()
				.then((battery) => {
					if (!battery.charging && battery.level < 0.2) {
						isLowPerformanceDevice = true;
					}
				})
				.catch(() => {
					// Battery API not available
				});
		}

		console.log('Device detected:', {
			mobile: isMobileDevice,
			lowPerf: isLowPerformanceDevice,
			cores: navigator.hardwareConcurrency,
			width: window.innerWidth
		});
	}

	// Get optimized star count based on device capabilities
	function getOptimizedStarCount(): number {
		const capabilities = get(deviceCapabilities);
		const baseCount = capabilities.maxStars || 300;

		// For reference implementation fidelity, be more conservative with reductions
		if (isLowPerformanceDevice) {
			return Math.max(100, Math.floor(baseCount * 0.6));
		} else if (isMobileDevice) {
			return Math.max(200, Math.floor(baseCount * 0.8));
		}

		return baseCount;
	}

	// Get optimized speeds based on device capabilities
	function getOptimizedSpeeds(): { baseSpeed: number; boostSpeed: number } {
		// Keep reference implementation speeds for visual consistency
		// Only reduce speeds for extremely low-performance devices
		if (isLowPerformanceDevice && navigator.hardwareConcurrency <= 2) {
			return { baseSpeed: 0.2, boostSpeed: 1.5 };
		}
		return { baseSpeed: 0.25, boostSpeed: 2 };
	}

	// Initialize star field with performance optimizations
	function initializeStarField() {
		if (!browser || !starContainer || isInitialized) return;

		console.log('Initializing star field for screen:', currentScreen);

		// Reset animation state
		animationState.resetAnimationState();

		// Configure frame rate controller based on device
		const capabilities = get(deviceCapabilities);
		const targetFPS = isLowPerformanceDevice ? 30 : 60;
		frameRateController.setTargetFPS(targetFPS);
		frameRateController.setAdaptiveEnabled(true);

		// Set maximum frame skip based on device capabilities
		const maxSkip = isLowPerformanceDevice ? 3 : isMobileDevice ? 2 : 1;
		frameRateController.setMaxSkippedFrames(maxSkip);

		// Subscribe to quality changes from frame rate controller
		qualityUnsubscribe = frameRateController.subscribeQuality((quality) => {
			if (!starFieldComponent || !isInitialized) return;

			try {
				// Dynamically adjust star count based on quality - more conservative
				const capabilities = get(deviceCapabilities);
				const baseCount = capabilities.maxStars || (isLowPerformanceDevice ? 150 : 300);
				const adjustedCount = Math.max(50, Math.round(baseCount * Math.max(0.4, quality)));

				// Only update if significantly different to avoid constant changes
				if (Math.abs(starFieldComponent.starCount - adjustedCount) > 20) {
					starFieldComponent.starCount = adjustedCount;
					console.log(
						`Adjusted star count to ${adjustedCount} based on quality ${quality.toFixed(2)}`
					);
				}
			} catch (error) {
				console.warn('Error in quality adjustment:', error);
			}
		});

		// Subscribe to FPS changes for monitoring
		frameRateUnsubscribe = frameRateController.subscribeFPS((fps) => {
			console.debug(`FPS: ${fps.toFixed(1)}`);
		});

		// Small delay ensures DOM is ready
		setTimeout(() => {
			if (starFieldComponent) {
				try {
					starFieldComponent.start();
					isInitialized = true;
					errorCount = 0;
					console.log('StarField component started successfully');
				} catch (error) {
					console.error('Error starting StarField:', error);
					handleInitializationError();
				}
			}
		}, 100);
	}

	// Handle initialization errors with retry logic
	function handleInitializationError() {
		errorCount++;
		if (errorCount < maxRetries) {
			console.log(`Retrying StarField initialization (attempt ${errorCount + 1}/${maxRetries})`);
			setTimeout(() => initializeStarField(), 1000 * errorCount);
		} else {
			console.error('Failed to initialize StarField after maximum retries');
			// Optionally fall back to a simpler version or show an error message
		}
	}

	// Stop star field animation
	function stopStarField() {
		if (!browser || !starFieldComponent) return;

		try {
			if (typeof starFieldComponent.stop === 'function') {
				starFieldComponent.stop();
				isInitialized = false;
				console.log('StarField stopped');
			}
		} catch (error) {
			console.error('Error stopping StarField:', error);
		}
	}

	// Handle boost state changes
	function handleBoost(active: boolean) {
		console.log('Boost state changed:', active);

		// Update frame rate controller during boost
		if (active) {
			frameRateController.setQualityOverride(1.0); // Maximum quality during boost
		} else {
			frameRateController.setAdaptiveEnabled(true); // Return to adaptive quality
		}

		// Apply boost to star field
		if (starFieldComponent) {
			try {
				if (active && typeof starFieldComponent.boost === 'function') {
					starFieldComponent.boost();
				} else if (!active && typeof starFieldComponent.unboost === 'function') {
					starFieldComponent.unboost();
				}
			} catch (error) {
				console.error('Error handling boost:', error);
			}
		}
	}

	// Handle window resize
	function handleResize() {
		if (!browser) return;

		detectDeviceCapabilities();

		// Re-initialize star field if device capabilities changed significantly
		if (starFieldComponent && isInitialized) {
			// Get new optimized parameters
			const newStarCount = getOptimizedStarCount();
			const currentCount = starFieldComponent.getStarCount();

			// Only reinitialize if star count changed significantly
			if (Math.abs(newStarCount - currentCount) > 50) {
				console.log('Device capabilities changed significantly, reinitializing');
				stopStarField();
				setTimeout(() => initializeStarField(), 100);
			}
		}
	}

	// Handle boost events
	function handleBoostEvent(event: CustomEvent) {
		if (event.detail && typeof event.detail.active === 'boolean') {
			handleBoost(event.detail.active);
		}
	}

	// Handle visibility change
	function handleVisibilityChange() {
		if (!browser) return;

		if (document.hidden) {
			stopStarField();
		} else {
			// Resume animation when tab becomes visible again
			if (currentScreen === 'main' && starContainer) {
				initializeStarField();
			}
		}
	}

	// Lifecycle management
	onMount(() => {
		if (!browser) return;

		console.log('BackgroundManager mounting');

		// Detect device capabilities first
		detectDeviceCapabilities();

		// Set up event listeners
		window.addEventListener('boost', handleBoostEvent);
		window.addEventListener('resize', handleResize);
		document.addEventListener('visibilitychange', handleVisibilityChange);

		// Initialize star field
		setTimeout(() => {
			if (currentScreen === 'main') {
				initializeStarField();
			}
		}, 50);
	});

	onDestroy(() => {
		if (!browser) return;

		console.log('BackgroundManager destroying');

		// Stop animations
		stopStarField();

		// Cleanup subscriptions
		if (frameRateUnsubscribe) {
			frameRateUnsubscribe();
			frameRateUnsubscribe = null;
		}

		if (qualityUnsubscribe) {
			qualityUnsubscribe();
			qualityUnsubscribe = null;
		}

		// Remove event listeners
		window.removeEventListener('boost', handleBoostEvent);
		window.removeEventListener('resize', handleResize);
		document.removeEventListener('visibilitychange', handleVisibilityChange);

		// Reset state
		isInitialized = false;
		errorCount = 0;
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
		{#if browser && starContainer}
			<StarField
				bind:this={starFieldComponent}
				containerElement={starContainer}
				starCount={getOptimizedStarCount()}
				enableBoost={true}
				baseSpeed={getOptimizedSpeeds().baseSpeed}
				boostSpeed={getOptimizedSpeeds().boostSpeed}
				maxDepth={32}
				autoStart={false}
				enableGlow={false}
				enableTrails={true}
			/>
		{/if}

		<!-- Fallback stars for extreme low-performance devices -->
		{#if isLowPerformanceDevice && $animationState.stars && $animationState.stars.length > 0}
			{#each $animationState.stars.slice(0, 30) as star (star.id)}
				<div class="star absolute" style={star.style}></div>
			{/each}
		{/if}
	</div>
</div>

<style>
	/* Space background with screen curvature */
	#space-background {
		position: absolute;
		inset: 0;
		background: radial-gradient(circle at center, #000 20%, #001c4d 70%, #000000 100%);
		border-radius: inherit;
		overflow: hidden;
		z-index: 0;
		perspective: 1000px;

		/* Screen curvature effect */
		mask-image: radial-gradient(ellipse at center, black 90%, transparent 100%);
		-webkit-mask-image: radial-gradient(ellipse at center, black 90%, transparent 100%);
	}

	.canvas-star-container {
		position: absolute;
		inset: 0;
		perspective: 500px;
		transform-style: preserve-3d;
		z-index: 1;
		border-radius: inherit;
	}

	/* Fallback star styles */
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
		.star {
			box-shadow: 0 0 1px rgba(255, 255, 255, 0.3);
		}
	}

	/* Performance optimizations */
	.hardware-accelerated {
		transform: translateZ(0);
		backface-visibility: hidden;
		perspective: 1000px;
		will-change: transform, opacity;
		contain: layout style paint;
	}
</style>

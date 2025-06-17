<!-- DO NOT REMOVE THIS COMMENT
/src/lib/components/ui/BackgroundManager.svelte
DO NOT REMOVE THIS COMMENT -->
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
	let isPageVisible = true;

	// FIXED: Network-resilient loading state
	let isComponentLoading = true;
	let hasNetworkIssues = false;
	let loadingTimeout: ReturnType<typeof setTimeout> | null = null;
	let fallbackStarsVisible = false;

	// FIXED: Detect network conditions
	function detectNetworkConditions() {
		if (!browser) return;

		// Check for slow network indicators
		const connection =
			(navigator as any).connection ||
			(navigator as any).mozConnection ||
			(navigator as any).webkitConnection;

		if (connection) {
			// Consider 2G, slow-2g, or low effective bandwidth as slow
			hasNetworkIssues =
				connection.effectiveType === 'slow-2g' ||
				connection.effectiveType === '2g' ||
				connection.downlink < 1.5;

			console.log('Network conditions:', {
				effectiveType: connection.effectiveType,
				downlink: connection.downlink,
				rtt: connection.rtt,
				hasIssues: hasNetworkIssues
			});
		}

		// Fallback detection based on loading times
		const loadStart = performance.now();
		loadingTimeout = setTimeout(() => {
			const loadTime = performance.now() - loadStart;
			if (loadTime > 3000) {
				// If initialization takes more than 3 seconds
				hasNetworkIssues = true;
				showFallbackStars();
				console.log('Slow loading detected, enabling fallback mode');
			}
		}, 3000);
	}

	// FIXED: Show CSS-only fallback stars for slow networks
	function showFallbackStars() {
		fallbackStarsVisible = true;

		// Create simple CSS-animated stars as immediate fallback
		if (spaceBackground && !spaceBackground.querySelector('.fallback-stars')) {
			const fallbackContainer = document.createElement('div');
			fallbackContainer.className = 'fallback-stars';
			fallbackContainer.innerHTML = generateFallbackStars();
			spaceBackground.appendChild(fallbackContainer);
		}
	}

	// FIXED: Generate simple CSS-only animated stars
	function generateFallbackStars() {
		const starCount = isMobileDevice ? 30 : 50;
		let starsHTML = '';

		for (let i = 0; i < starCount; i++) {
			const size = Math.random() * 2 + 1;
			const x = Math.random() * 100;
			const y = Math.random() * 100;
			const duration = Math.random() * 3 + 2;
			const delay = Math.random() * 2;

			starsHTML += `
				<div class="fallback-star" style="
					left: ${x}%;
					top: ${y}%;
					width: ${size}px;
					height: ${size}px;
					animation-duration: ${duration}s;
					animation-delay: ${delay}s;
				"></div>
			`;
		}

		return starsHTML;
	}

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
		let baseCount = capabilities.maxStars || 300;

		// FIXED: Reduce star count further on slow networks
		if (hasNetworkIssues) {
			baseCount = Math.floor(baseCount * 0.5);
		}

		if (isLowPerformanceDevice) {
			return Math.max(50, Math.floor(baseCount * 0.6));
		} else if (isMobileDevice) {
			return Math.max(100, Math.floor(baseCount * 0.8));
		}

		return baseCount;
	}

	// Get optimized speeds based on device capabilities
	function getOptimizedSpeeds(): { baseSpeed: number; boostSpeed: number } {
		// FIXED: Slower speeds for network issues
		if (hasNetworkIssues) {
			return { baseSpeed: 0.15, boostSpeed: 1.0 };
		}

		if (isLowPerformanceDevice && navigator.hardwareConcurrency <= 2) {
			return { baseSpeed: 0.2, boostSpeed: 1.5 };
		}
		return { baseSpeed: 0.25, boostSpeed: 2 };
	}

	// FIXED: Network-resilient initialization
	function initializeStarField() {
		if (!browser || !starContainer || isInitialized) return;

		console.log('Initializing star field for screen:', currentScreen);

		// Clear loading timeout if StarField initializes in time
		if (loadingTimeout) {
			clearTimeout(loadingTimeout);
			loadingTimeout = null;
		}

		// Reset animation state
		animationState.resetAnimationState();

		// Configure frame rate controller based on device and network
		const capabilities = get(deviceCapabilities);
		let targetFPS = isLowPerformanceDevice ? 30 : 60;

		// FIXED: Lower target FPS for slow networks
		if (hasNetworkIssues) {
			targetFPS = Math.min(targetFPS, 45);
		}

		frameRateController.setTargetFPS(targetFPS);
		frameRateController.setAdaptiveEnabled(true);

		// Set maximum frame skip based on device capabilities and network
		let maxSkip = isLowPerformanceDevice ? 3 : isMobileDevice ? 2 : 1;
		if (hasNetworkIssues) {
			maxSkip = Math.min(maxSkip + 1, 4); // Allow more frame skipping on slow networks
		}
		frameRateController.setMaxSkippedFrames(maxSkip);

		// Subscribe to quality changes from frame rate controller
		qualityUnsubscribe = frameRateController.subscribeQuality((quality) => {
			if (!starFieldComponent || !isInitialized) return;

			try {
				const capabilities = get(deviceCapabilities);
				let baseCount = capabilities.maxStars || (isLowPerformanceDevice ? 150 : 300);

				// FIXED: Further reduce for network issues
				if (hasNetworkIssues) {
					baseCount = Math.floor(baseCount * 0.7);
				}

				const adjustedCount = Math.max(30, Math.round(baseCount * Math.max(0.3, quality)));

				if (Math.abs(starFieldComponent.starCount - adjustedCount) > 15) {
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

		// FIXED: Longer delay for slow networks, shorter for fast
		const initDelay = hasNetworkIssues ? 500 : 100;

		setTimeout(() => {
			if (starFieldComponent) {
				try {
					starFieldComponent.start();
					isInitialized = true;
					isComponentLoading = false;
					errorCount = 0;

					// Hide fallback stars once real StarField is running
					if (fallbackStarsVisible) {
						const fallbackContainer = spaceBackground?.querySelector('.fallback-stars');
						if (fallbackContainer) {
							fallbackContainer.style.opacity = '0';
							setTimeout(() => {
								fallbackContainer.remove();
								fallbackStarsVisible = false;
							}, 1000);
						}
					}

					console.log('StarField component started successfully');
				} catch (error) {
					console.error('Error starting StarField:', error);
					handleInitializationError();
				}
			}
		}, initDelay);
	}

	// FIXED: Enhanced error handling for network issues
	function handleInitializationError() {
		errorCount++;

		// Show fallback stars immediately on error
		if (!fallbackStarsVisible) {
			showFallbackStars();
		}

		if (errorCount < maxRetries) {
			const retryDelay = hasNetworkIssues ? 2000 * errorCount : 1000 * errorCount;
			console.log(
				`Retrying StarField initialization (attempt ${errorCount + 1}/${maxRetries}) in ${retryDelay}ms`
			);
			setTimeout(() => initializeStarField(), retryDelay);
		} else {
			console.error('Failed to initialize StarField after maximum retries, using fallback');
			isComponentLoading = false;
			// Keep fallback stars visible permanently
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
			frameRateController.setQualityOverride(hasNetworkIssues ? 0.8 : 1.0);
		} else {
			frameRateController.setAdaptiveEnabled(true);
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

		if (starFieldComponent && isInitialized) {
			const newStarCount = getOptimizedStarCount();
			const currentCount = starFieldComponent.getStarCount();

			if (Math.abs(newStarCount - currentCount) > 30) {
				console.log('Device capabilities changed significantly, reinitializing');
				stopStarField();
				setTimeout(() => initializeStarField(), hasNetworkIssues ? 300 : 100);
			}
		}
	}

	// Handle boost events
	function handleBoostEvent(event: CustomEvent) {
		if (event.detail && typeof event.detail.active === 'boolean') {
			handleBoost(event.detail.active);
		}
	}

	// FIXED: Improved visibility change handler
	function handleVisibilityChange() {
		if (!browser) return;

		isPageVisible = !document.hidden;

		if (document.hidden) {
			if (starFieldComponent && typeof starFieldComponent.pause === 'function') {
				starFieldComponent.pause();
				console.log('StarField paused due to page visibility change');
			}
		} else {
			if (currentScreen === 'main' && starContainer && starFieldComponent) {
				if (typeof starFieldComponent.resume === 'function') {
					starFieldComponent.resume();
					console.log('StarField resumed due to page visibility change');
				} else if (!isInitialized) {
					initializeStarField();
				}
			}
		}
	}

	// Lifecycle management
	onMount(() => {
		if (!browser) return;

		console.log('BackgroundManager mounting');

		// FIXED: Detect network conditions first
		detectNetworkConditions();
		detectDeviceCapabilities();

		// Show fallback stars immediately for slow networks
		if (hasNetworkIssues) {
			showFallbackStars();
		}

		// Set up event listeners
		window.addEventListener('boost', handleBoostEvent);
		window.addEventListener('resize', handleResize);
		document.addEventListener('visibilitychange', handleVisibilityChange);

		// Initialize star field with network-aware delay
		const mountDelay = hasNetworkIssues ? 100 : 50;
		setTimeout(() => {
			if (currentScreen === 'main') {
				initializeStarField();
			}
		}, mountDelay);
	});

	onDestroy(() => {
		if (!browser) return;

		console.log('BackgroundManager destroying');

		// Clear any pending timeouts
		if (loadingTimeout) {
			clearTimeout(loadingTimeout);
			loadingTimeout = null;
		}

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
		isComponentLoading = false;
		fallbackStarsVisible = false;
	});
</script>

<div
	id="space-background"
	class="absolute inset-0 overflow-hidden pointer-events-none rounded-[3vmin] hardware-accelerated space-background-persistent"
	class:loading={isComponentLoading}
	class:network-fallback={hasNetworkIssues}
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
				maxDepth={hasNetworkIssues ? 24 : 32}
				autoStart={false}
				enableGlow={false}
				enableTrails={!hasNetworkIssues}
			/>
		{/if}

		<!-- FIXED: Enhanced fallback stars for network issues -->
		{#if isLowPerformanceDevice && $animationState.stars && $animationState.stars.length > 0}
			{#each $animationState.stars.slice(0, 20) as star (star.id)}
				<div class="star absolute" style={star.style}></div>
			{/each}
		{/if}
	</div>
</div>

<style>
	/* FIXED: Enhanced space background with network-resilient features */
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

	/* FIXED: Enhanced persistent background with network awareness */
	.space-background-persistent {
		will-change: auto;
		contain: layout style paint;
		isolation: isolate;
		z-index: 1 !important;
		opacity: 1;
		visibility: visible;
		background-attachment: local;
		background-repeat: no-repeat;
		background-size: cover;
		background-position: center;
	}

	/* FIXED: Loading state styling */
	.space-background-persistent.loading {
		/* Ensure background is always visible even during loading */
		background: radial-gradient(circle at center, #000 20%, #001c4d 70%, #000000 100%) !important;
	}

	/* FIXED: Network fallback mode styling */
	.space-background-persistent.network-fallback {
		/* Simpler background for slow networks */
		background: linear-gradient(180deg, #000 0%, #001122 50%, #000 100%) !important;
	}

	/* FIXED: Failsafe background layer */
	.space-background-persistent::before {
		content: '';
		position: absolute;
		inset: 0;
		background: #000;
		z-index: -1;
		opacity: 1;
		border-radius: inherit;
	}

	.canvas-star-container {
		position: absolute;
		inset: 0;
		perspective: 500px;
		transform-style: preserve-3d;
		z-index: 2;
		border-radius: inherit;
	}

	/* FIXED: CSS-only fallback stars for slow networks */
	:global(.fallback-stars) {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 1;
	}

	:global(.fallback-star) {
		position: absolute;
		background: #fff;
		border-radius: 50%;
		animation: twinkle linear infinite;
		opacity: 0.7;
	}

	@keyframes twinkle {
		0%,
		100% {
			opacity: 0.3;
			transform: scale(1);
		}
		50% {
			opacity: 1;
			transform: scale(1.2);
		}
	}

	/* Regular fallback star styles */
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

		.space-background-persistent {
			transform: translateZ(0);
			-webkit-transform: translateZ(0);
			backface-visibility: hidden;
			-webkit-backface-visibility: hidden;
		}

		/* FIXED: Simpler fallback stars for mobile */
		:global(.fallback-star) {
			animation-duration: 3s !important;
			opacity: 0.5;
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

	/* FIXED: Network-specific optimizations */
	.network-fallback :global(.fallback-star) {
		/* Simpler animations for slow networks */
		animation: simple-twinkle 4s ease-in-out infinite;
	}

	@keyframes simple-twinkle {
		0%,
		100% {
			opacity: 0.2;
		}
		50% {
			opacity: 0.8;
		}
	}
</style>

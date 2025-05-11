<!-- src/lib/components/ui/MainScreenContent.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { gsap } from 'gsap';
	import { get } from 'svelte/store';
	import ArcadeCtaButton from '$lib/components/ui/ArcadeCtaButton.svelte';
	import BoostCue from '$lib/components/ui/BoostCue.svelte';
	import { frameRateController } from '$lib/utils/frame-rate-controller';
	import { deviceCapabilities } from '$lib/utils/device-performance';
	import { animationState } from '$lib/stores/animation-store';

	// Component refs
	let header: HTMLElement;
	let insertConcept: HTMLElement;
	let currentTimeline: gsap.core.Timeline | null = null;

	// Device detection state
	let isMobileDevice = false;
	let isLowPerformanceDevice = false;

	// Device detection
	function detectDeviceCapabilities() {
		if (!browser) return;

		// Check if mobile
		isMobileDevice = window.innerWidth < 768;

		// Try to detect lower-performance devices
		isLowPerformanceDevice =
			isMobileDevice &&
			// Check for older/lower-powered devices
			(navigator.hardwareConcurrency <= 4 ||
				// iOS Safari can struggle with these effects
				(navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')));
	}

	// Timeline creation helper optimized for performance
	function createOptimizedTimeline(elements: any) {
		if (!browser) return null;

		try {
			const isMobile = window.innerWidth < 768;
			const isLowPerformance = isLowPerformanceDevice;

			// Get current quality level from frameRateController
			const qualityLevel = frameRateController.getCurrentQuality();

			// Clear any existing timelines
			if (currentTimeline) {
				currentTimeline.kill();
			}

			// When in lower performance mode, use simpler animations
			if (isLowPerformance || qualityLevel < 0.6) {
				// Create simpler timeline
				const timeline = gsap.timeline({
					paused: true,
					repeat: -1,
					defaults: {
						ease: 'power1.inOut',
						duration: 1.5,
						overwrite: true // Changed from 'auto' to 'true' for better performance
					}
				});

				// Use a single, simple animation for low-performance devices
				timeline.to(elements.insertConcept, {
					opacity: 0.3,
					yoyo: true,
					repeat: 1
				});

				return timeline;
			}

			// Standard timeline with device-appropriate settings
			const timeline = gsap.timeline({
				paused: true,
				defaults: {
					ease: 'power1.inOut',
					immediateRender: false,
					overwrite: true // Changed from 'auto' to 'true' for better performance
				}
			});

			// Adapt animation parameters for mobile
			const animDuration = isMobile ? 0.15 : 0.1; // Slower on mobile
			const animDistance = isMobile ? 1 : 2; // Less movement on mobile
			const opacityDuration = isMobile ? 1.5 : 1; // Slower fade on mobile

			// Use a single timeline.to call with multiple targets
			timeline
				.to([elements.header, elements.insertConcept], {
					duration: animDuration,
					y: `+=${animDistance}`,
					repeat: -1,
					yoyo: true
				})
				.to(
					elements.insertConcept,
					{
						duration: opacityDuration,
						opacity: 0,
						repeat: -1,
						yoyo: true,
						ease: 'none'
					},
					0
				);

			return timeline;
		} catch (error) {
			console.error('Failed to create GSAP timeline:', error);
			return null;
		}
	}

	// Start text animations
	function startAnimations() {
		try {
			const elements = { header, insertConcept };
			if (!elements.header || !elements.insertConcept) return;

			const state = get(animationState);
			if (state && state.isAnimating) {
				stopAnimations(); // Stop existing animations first
			}

			// Create and start optimized GSAP timeline
			const timeline = createOptimizedTimeline(elements);

			if (timeline) {
				currentTimeline = timeline;

				setTimeout(() => {
					timeline.play();
				}, 300); // Delay animations to start after power-up sequence begins
			}

			// Update animation state
			animationState.update((state) => ({
				...state,
				isAnimating: true
			}));
		} catch (error) {
			console.error('Animation initialization failed:', error);
			animationState.reset();
		}
	}

	// Stop animations
	function stopAnimations() {
		if (!browser) return;

		// Kill GSAP timeline with proper cleanup
		if (currentTimeline) {
			// First pause to stop animations
			if (typeof currentTimeline.pause === 'function') {
				currentTimeline.pause();
			}

			// Clear all tweens from the timeline
			if (typeof currentTimeline.clear === 'function') {
				currentTimeline.clear();
			}

			// Finally kill the timeline
			if (typeof currentTimeline.kill === 'function') {
				currentTimeline.kill();
			}

			// Remove reference
			currentTimeline = null;
		}

		// Safer approach to clean up GSAP animations
		if (typeof window !== 'undefined' && gsap) {
			// Kill all GSAP animations for specific elements
			if (typeof gsap.killTweensOf === 'function') {
				if (header) gsap.killTweensOf(header);
				if (insertConcept) gsap.killTweensOf(insertConcept);
			}
		}

		// Update animation state
		animationState.update((state) => ({
			...state,
			isAnimating: false
		}));
	}

	// Handle boost event
	function handleBoost(active: boolean) {
		// Dispatch boost event to parent components
		window.dispatchEvent(new CustomEvent('boost', { detail: { active } }));
	}

	// Lifecycle hooks
	onMount(() => {
		if (!browser) return;

		// Detect device capabilities
		detectDeviceCapabilities();

		// Start animations with a small delay to ensure DOM is ready
		setTimeout(startAnimations, 250);
	});

	onDestroy(() => {
		if (!browser) return;

		// Stop animations
		stopAnimations();

		// Clear references
		header = null;
		insertConcept = null;
		currentTimeline = null;
	});
</script>

<div
	id="text-wrapper"
	class="absolute inset-0 flex flex-col items-center justify-center z-0 p-2 mt-12 box-border"
>
	<div id="header" class="text-center mb-2 animate-transform" bind:this={header}>
		Power-up Your Brand!
	</div>

	<div class="mt-6">
		<ArcadeCtaButton />
	</div>
	<div id="insert-concept" class="text-center mt-3 animate-opacity" bind:this={insertConcept}>
		Insert Concept
	</div>
	<BoostCue on:boost={(e) => handleBoost(e.detail)} />
</div>

<style>
	/* Typography */
	#header {
		font-family: 'Pixelify Sans', sans-serif;
		font-size: var(--header-font-size);
		letter-spacing: 0.2vmin;
		line-height: 1.11;
		font-weight: 700;
		color: var(--header-text-color);
		text-shadow:
			0 0 1vmin rgba(39, 255, 153, 0.8),
			0 0 2vmin rgba(39, 255, 153, 0.7),
			0 0 3vmin rgba(39, 255, 153, 0.6),
			0 0 4vmin rgba(245, 245, 220, 0.5),
			0 0 7vmin rgba(245, 245, 220, 0.3),
			0 0 8vmin rgba(245, 245, 220, 0.1);
		position: relative;
		isolation: isolate;
		will-change: transform, filter;
		transition:
			transform 50ms ease-out,
			filter 50ms ease-out;
	}

	#header::before {
		content: '';
		position: absolute;
		inset: -2px;
		background: linear-gradient(
			90deg,
			transparent 0%,
			rgba(39, 255, 153, 0.2) 15%,
			transparent 25%
		);
		opacity: 0;
		animation: glitch-scan 4s linear infinite;
		pointer-events: none;
		mix-blend-mode: overlay;
	}

	#insert-concept {
		font-family: 'Press Start 2P', sans-serif;
		text-transform: uppercase;
		letter-spacing: 0.2vmin;
		font-size: var(--insert-concept-font-size);
		font-weight: 700;
		color: var(--insert-concept-color);
		text-shadow:
			0 0 0.15vmin rgba(250, 250, 240, 0.4),
			0 0 0.3vmin rgba(250, 250, 240, 0.45),
			0 0 1.2vmin rgba(250, 250, 240, 0.3),
			0 0 0.4vmin rgba(245, 245, 220, 0.25),
			0 0 1.5vmin rgba(245, 245, 220, 0.15),
			0 0 2vmin rgba(245, 245, 220, 0.05);
	}

	/* Animation classes */
	.animate-transform {
		will-change: transform;
		transform: translateZ(0);
	}

	.animate-opacity {
		will-change: opacity;
	}

	/* Glitch animation */
	@keyframes glitch-scan {
		0% {
			opacity: 0;
			transform: translateX(-100%);
		}
		10%,
		15% {
			opacity: 0.5;
		}
		50%,
		100% {
			opacity: 0;
			transform: translateX(100%);
		}
	}

	/* Light theme modifications */
	:global(html.light) .arcade-text {
		color: var(--arcade-black-500);
		opacity: 0.8;
	}

	/* Mobile optimizations */
	@media (max-width: 768px) {
		#header {
			will-change: transform;
		}

		#insert-concept {
			will-change: opacity;
		}

		/* Light theme mobile adjustments */
		:global(html.light) #header::before {
			animation-duration: 6s;
			opacity: 0.3;
			background: linear-gradient(
				90deg,
				transparent 0%,
				rgba(39, 255, 153, 0.1) 15%,
				transparent 25%
			);
		}
	}

	/* Disable text selection */
	#text-wrapper,
	#header,
	#insert-concept {
		user-select: none;
		-webkit-user-select: none;
		-moz-user-select: none;
		-ms-user-select: none;
	}
</style>

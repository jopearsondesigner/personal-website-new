<script lang="ts">
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { browser } from '$app/environment';
	import { get } from 'svelte/store';
	import ScreenEffects from './ScreenEffects.svelte';
	import BackgroundManager from './BackgroundManager.svelte';
	import MainScreenContent from './MainScreenContent.svelte';
	import GameScreen from '$lib/components/game/GameScreen.svelte';
	import { animationState } from '$lib/stores/animation-store';
	import { frameRateController } from '$lib/utils/frame-rate-controller';
	import { deviceCapabilities } from '$lib/utils/device-performance';
	import { createThrottledRAF } from '$lib/utils/animation-helpers';

	// Props
	export let currentScreen = 'main';

	// Local state
	let arcadeScreen: HTMLElement;
	let glassEffectsHandler: Function | null = null;
	let isMobileDevice = false;
	let isLowPerformanceDevice = false;
	let isInitializing = true;

	// Event dispatcher
	const dispatch = createEventDispatcher();

	// Screen state changed handler
	function handleGameStateChange(event) {
		dispatch('stateChange', event.detail);
	}

	// Initialize glass effects for enhanced realism
	function initializeGlassEffects() {
		if (!browser) return;

		// Get the glass container with a more specific selector
		const glassContainer = document.querySelector('.screen-glass-container');
		console.log('Glass container found:', !!glassContainer);
		
		if (!glassContainer) {
			console.error('Glass container not found');
			return;
		}

		// Apply initial glass physics based on screen type
		if (currentScreen === 'game') {
			// For game screen, slightly adjust glass properties for gameplay visibility
			document.documentElement.style.setProperty('--glass-reflectivity', '0.08');
			document.documentElement.style.setProperty('--glass-dust-opacity', '0.015');
			document.documentElement.style.setProperty('--glass-smudge-opacity', '0.02');
			document.documentElement.style.setProperty('--internal-reflection-opacity', '0.02');
		} else {
			// For main screen, use default glass settings
			document.documentElement.style.setProperty('--glass-reflectivity', '0.1');
			document.documentElement.style.setProperty('--glass-dust-opacity', '0.025');
			document.documentElement.style.setProperty('--glass-smudge-opacity', '0.03');
			document.documentElement.style.setProperty('--internal-reflection-opacity', '0.025');
		}

		// Set other required CSS variables
		document.documentElement.style.setProperty('--glass-thickness', '1px');
		document.documentElement.style.setProperty('--glass-edge-highlight', 'rgba(255, 255, 255, 0.05)');
		
		// Set brand teal colors for glass effects (very subtle)
		document.documentElement.style.setProperty('--teal-glass-100', 'rgba(240, 253, 253, 0.01)'); // Extremely subtle
		document.documentElement.style.setProperty('--teal-glass-200', 'rgba(191, 247, 247, 0.02)'); // Extremely subtle  
		document.documentElement.style.setProperty('--teal-glass-300', 'rgba(165, 243, 243, 0.03)'); // Very subtle
		document.documentElement.style.setProperty('--teal-glass-500', 'rgba(6, 161, 161, 0.05)'); // Subtle
		
		// IMPORTANT: Set default border-radius if not defined
		const computedStyle = getComputedStyle(document.documentElement);
		const currentBorderRadius = computedStyle.getPropertyValue('--border-radius').trim();
		if (!currentBorderRadius || currentBorderRadius === 'initial') {
			document.documentElement.style.setProperty('--border-radius', '3vmin');
		}

		// During initialization, set initial opacity for glass elements to 0
		if (isInitializing && glassContainer) {
			const glassElements = glassContainer.querySelectorAll('div');
			glassElements.forEach((el) => {
				(el as HTMLElement).style.opacity = '0';
			});
		}

		// Create subtle movement with mouse for glass reflections
		const handleMouseMove = (e) => {
			if (!glassContainer) return;

			// Skip updates on low-performance frames
			if (!frameRateController.shouldRenderFrame()) return;

			// Calculate relative position
			const rect = glassContainer.getBoundingClientRect();
			const centerX = rect.left + rect.width / 2;
			const centerY = rect.top + rect.height / 2;

			// Calculate normalized offsets (-1 to 1)
			const offsetX = (e.clientX - centerX) / (rect.width / 2);
			const offsetY = (e.clientY - centerY) / (rect.height / 2);

			// Calculate movement limits
			const maxMove = 4; // maximum movement in pixels (reduced for subtlety)
			const moveX = offsetX * maxMove;
			const moveY = offsetY * maxMove;

			// Apply transformation to glass reflection elements
			const specular = glassContainer.querySelector('.screen-glass-specular');
			const reflection = glassContainer.querySelector('.screen-glass-reflection');

			if (specular) {
				(specular as HTMLElement).style.transform =
					`translate(${-moveX * 0.5}px, ${-moveY * 0.5}px)`;
				(specular as HTMLElement).style.opacity = (
					0.1 +
					Math.abs(offsetX * offsetY) * 0.05
				).toString();
			}

			if (reflection) {
				(reflection as HTMLElement).style.transform =
					`translate(${moveX * 0.2}px, ${moveY * 0.2}px)`;
			}
		};

		// Throttle the handler for better performance
		const throttledHandler = createThrottledRAF(handleMouseMove, 32); // 30fps throttling

		// Add event listener
		document.addEventListener('mousemove', throttledHandler, { passive: true });

		// Return the handler for cleanup
		return throttledHandler;
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

		// Set a data attribute that CSS can use for selective effects
		document.documentElement.setAttribute(
			'data-device-type',
			isLowPerformanceDevice ? 'low-performance' : isMobileDevice ? 'mobile' : 'desktop'
		);
	}

	onMount(() => {
		if (!browser) return;

		// Detect device capabilities
		detectDeviceCapabilities();

		// Initialize glass effects first
		glassEffectsHandler = initializeGlassEffects();

		// Start power-up sequence with proper animation timing
		if (arcadeScreen) {
			// First add the power-sequence class to trigger the CRT power-up effect
			arcadeScreen.classList.add('power-sequence');

			// After a short delay, trigger the glass warm-up effect
			setTimeout(() => {
				const glassContainer = document.querySelector('.screen-glass-container');
				if (glassContainer) {
					glassContainer.classList.add('glass-warmup');
					isInitializing = false;
				}
			}, 150); // Short delay to ensure power sequence starts first
		}

		// Apply iOS-specific fixes
		if (browser && /iPad|iPhone|iPod/.test(navigator.userAgent)) {
			// Use transform for hardware acceleration
			if (arcadeScreen) {
				arcadeScreen.style.transform = 'translateZ(0)';
				arcadeScreen.style.backfaceVisibility = 'hidden';
				arcadeScreen.style.webkitBackfaceVisibility = 'hidden';
				arcadeScreen.classList.add('ios-optimized');
			}
		}
	});

	onDestroy(() => {
		if (!browser) return;

		// Remove event listeners
		if (glassEffectsHandler) {
			document.removeEventListener('mousemove', glassEffectsHandler as EventListener);
		}

		// Reset animation state
		animationState.resetAnimationState();
	});

	// Watch for screen changes to update glass effects
	$: if (browser && currentScreen) {
		// Use requestAnimationFrame to ensure DOM is ready
		requestAnimationFrame(() => {
			initializeGlassEffects();
		});
	}
</script>

<div
	id="arcade-screen"
	class="crt-screen hardware-accelerated relative glow rounded-[3vmin] overflow-hidden will-change-transform"
	bind:this={arcadeScreen}
>
	<!-- CRT screen effects - keep the z-index lower than content -->
	<ScreenEffects />

	<!-- Screen content based on current screen state -->
	{#if currentScreen === 'main'}
		<!-- Background with star field -->
		<BackgroundManager {currentScreen} />

		<!-- Main screen content -->
		<MainScreenContent />
	{:else if currentScreen === 'game'}
		<!-- Game screen component -->
		<GameScreen on:stateChange={handleGameStateChange} />
	{/if}

	<!-- Glass effects and overlays - SUBTLE and ELEGANT -->
	<div class="screen-glass-container rounded-[3vmin] hardware-accelerated">
		<div class="screen-glass-outer rounded-[3vmin]"></div>
		<div class="screen-glass-inner rounded-[3vmin]"></div>
		<div class="screen-glass-reflection rounded-[3vmin]"></div>
		<div class="screen-glass-edge rounded-[3vmin]"></div>
		<div class="screen-glass-smudges rounded-[3vmin]"></div>
		<div class="screen-glass-dust rounded-[3vmin]"></div>
		<div class="screen-glass-specular rounded-[3vmin]"></div>
		<div class="screen-internal-reflection rounded-[3vmin]"></div>
	</div>

	<div
		id="scanline-overlay"
		class="absolute inset-0 pointer-events-none z-10 rounded-[3vmin]"
	></div>
</div>

<style lang="css">
	/* CRT screen styling */
	#arcade-screen {
		width: var(--arcade-screen-width);
		height: var(--arcade-screen-height);
		border: none;
		border-radius: var(--border-radius);
		position: relative;
		overflow: hidden;
		z-index: 0;
		aspect-ratio: 4/3;
		box-shadow: var(--screen-shadow);
		background: linear-gradient(145deg, #111 0%, #444 100%);
		transform-style: preserve-3d;
		overflow: hidden;
	}

	/* CRT base styling */
	.crt-screen {
		--phosphor-decay: 16ms;
		--refresh-rate: 60Hz;
		--shadow-mask-size: 3px;
		--bloom-intensity: 0.4;
		--misconvergence-offset: 0.5px;
		position: relative;
		overflow: hidden;
		background: #000;
		border-radius: var(--border-radius);
		overflow: hidden;
	}

	/* Scanline overlay */
	#scanline-overlay {
		background: linear-gradient(0deg, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0.0675) 51%);
		background-size: 100% 4px;
		animation: scanline 0.2s linear infinite;
		border-radius: calc(var(--border-radius) - 0.5vmin);
		z-index: 25;
	}

	/* Screen glow effect */
	#arcade-screen.glow::after {
		content: '';
		position: absolute;
		inset: -2px;
		border-radius: calc(var(--border-radius) + 0.5vmin);
		background: linear-gradient(45deg, #00ffff80, #0000ff80, #ff00ff80, #ff000080);
		filter: blur(12px);
		opacity: var(--screen-glow-opacity);
		z-index: -1;
		mix-blend-mode: screen;
	}

	/* Glass container styling - SUBTLE, NO BACKGROUND TINT */
	.screen-glass-container {
		position: absolute;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
		z-index: 20;
		will-change: transform, filter;
		transform-style: preserve-3d;
		/* REMOVED: All testing background colors */
	}

	/* Glass effects with VERY SUBTLE, REALISTIC values */
	.screen-glass-outer {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			135deg,
			transparent 0%,
			var(--teal-glass-100) 20%,
			var(--teal-glass-200) 40%,
			var(--teal-glass-100) 60%,
			transparent 100%
		);
		border-radius: var(--border-radius, 3vmin);
		backdrop-filter: brightness(1.005) contrast(1.01);
		mix-blend-mode: overlay;
		transform: perspective(1000px) translateZ(var(--glass-thickness, 1px));
		opacity: 0.1; /* Very subtle */
	}

	.screen-glass-inner {
		position: absolute;
		inset: 0;
		background: radial-gradient(
			ellipse at center,
			transparent 40%,
			rgba(0, 0, 0, 0.01) 80%,
			rgba(0, 0, 0, 0.025) 100%
		);
		opacity: 0.2; /* Subtle */
		border-radius: var(--border-radius, 3vmin);
		transform: perspective(1000px) translateZ(calc(var(--glass-thickness, 1px) * 0.5));
	}

	.screen-glass-reflection {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			135deg,
			transparent 30%,
			var(--teal-glass-100) 45%,
			var(--teal-glass-200) 50%,
			var(--teal-glass-100) 55%,
			transparent 70%
		);
		opacity: 0.15; /* Subtle */
		border-radius: var(--border-radius, 3vmin);
		mix-blend-mode: screen;
		animation: slowGlassShift 10s ease-in-out infinite alternate;
	}

	.screen-glass-edge {
		position: absolute;
		inset: 0;
		border: 1px solid var(--teal-glass-300);
		border-radius: var(--border-radius, 3vmin);
		opacity: 0.3; /* Visible but not overwhelming */
		box-shadow: 
			inset 0 0 10px var(--teal-glass-500),
			0 0 4px var(--teal-glass-300);
		background: transparent;
		background-clip: padding-box;
		backdrop-filter: blur(0.25px);
	}

	.screen-glass-smudges {
		position: absolute;
		inset: 0;
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%%25' height='100%%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
		opacity: var(--glass-smudge-opacity, 0.03);
		filter: contrast(110%) brightness(130%);
		border-radius: var(--border-radius, 3vmin);
		mix-blend-mode: overlay;
		transform: scale(1.005);
	}

	.screen-glass-dust {
		position: absolute;
		inset: 0;
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='dust'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.15 0'/%3E%3C/filter%3E%3Crect width='100%%25' height='100%%25' filter='url(%23dust)'/%3E%3C/svg%3E");
		opacity: var(--glass-dust-opacity, 0.025);
		filter: contrast(120%) brightness(110%);
		border-radius: var(--border-radius, 3vmin);
		mix-blend-mode: overlay;
		transform: scale(1.01);
	}

	.screen-glass-specular {
		position: absolute;
		inset: 0;
		background: radial-gradient(
			ellipse at center,
			rgba(255, 255, 255, 0.04) 0%,
			rgba(255, 255, 255, 0.015) 50%,
			transparent 70%
		);
		opacity: 0.3; /* Subtle */
		border-radius: var(--border-radius, 3vmin);
		mix-blend-mode: screen;
		filter: blur(1px);
	}

	.screen-internal-reflection {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			45deg,
			transparent 35%,
			var(--teal-glass-500) 45%,
			var(--teal-glass-300) 50%,
			var(--teal-glass-500) 55%,
			transparent 65%
		);
		opacity: var(--internal-reflection-opacity, 0.025);
		border-radius: var(--border-radius, 3vmin);
		mix-blend-mode: screen;
		animation: slowInternalReflection 15s ease-in-out infinite alternate;
	}

	/* Subtle teal edge effect */  
	.screen-glass-container::after {
		content: '';
		position: absolute;
		inset: 0;
		border: 1px solid var(--teal-glass-300);
		border-radius: var(--border-radius, 3vmin);
		box-shadow: 
			inset 0 0 8px var(--teal-glass-500),
			0 0 4px var(--teal-glass-300);
		pointer-events: none;
		opacity: 0.8;
		mix-blend-mode: screen;
	}

	/* Proper warmup animation conditions */
	.screen-glass-container.glass-warmup .screen-glass-outer,
	.screen-glass-container.glass-warmup .screen-glass-inner,
	.screen-glass-container.glass-warmup .screen-glass-reflection,
	.screen-glass-container.glass-warmup .screen-glass-edge,
	.screen-glass-container.glass-warmup .screen-glass-smudges,
	.screen-glass-container.glass-warmup .screen-glass-dust,
	.screen-glass-container.glass-warmup .screen-glass-specular,
	.screen-glass-container.glass-warmup .screen-internal-reflection {
		animation: glassWarmUp 2s ease-out forwards;
	}

	/* Animation keyframes for glass effects */
	@keyframes slowGlassShift {
		0% {
			transform: translateX(-3px) translateY(-1px);
		}
		100% {
			transform: translateX(3px) translateY(1px);
		}
	}

	@keyframes slowInternalReflection {
		0% {
			opacity: var(--internal-reflection-opacity, 0.025);
			transform: translateX(-5px) translateY(-2px);
		}
		100% {
			opacity: calc(var(--internal-reflection-opacity, 0.025) * 1.2);
			transform: translateX(5px) translateY(2px);
		}
	}

	/* Scanline animation */
	@keyframes scanline {
		0% {
			background-position: 0 0;
		}
		100% {
			background-position: 0 4px;
		}
	}

	/* Hardware acceleration utility class */
	.hardware-accelerated {
		transform: translateZ(0);
		backface-visibility: hidden;
		perspective: 1000;
		will-change: transform, opacity;
	}

	/* Power-up sequence animation */
	#arcade-screen.power-sequence::before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(to bottom, #fff, #aaa);
		opacity: 0;
		z-index: 30;
		pointer-events: none;
		animation: powerSequence 1s ease-out forwards;
	}

	@keyframes powerSequence {
		0% {
			opacity: 1;
		}
		15% {
			opacity: 0.6;
		}
		30% {
			opacity: 0.3;
		}
		45% {
			opacity: 0.1;
		}
		100% {
			opacity: 0;
		}
	}

	/* Glass warmup animation - proper values */
	@keyframes glassWarmUp {
		0% {
			opacity: 0;
			filter: brightness(0.8) blur(1px);
		}
		40% {
			opacity: 0.5;
			filter: brightness(0.9) blur(0.5px);
		}
		100% {
			opacity: 1;
			filter: brightness(1) blur(0);
		}
	}

	/* iOS specific optimizations */
	#arcade-screen.ios-optimized {
		transform: translateZ(0);
		-webkit-transform: translateZ(0);
		backface-visibility: hidden;
		-webkit-backface-visibility: hidden;
		perspective: 1000;
		-webkit-perspective: 1000;
	}
</style>
<!-- DO NOT REMOVE THIS COMMENT
src/lib/components/ui/ArcadeScreen.svelte
DO NOT REMOVE THIS COMMENT -->

<!-- Restored ArcadeScreen.svelte - Exact Migration from Hero.svelte Glass Effects -->
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

	// Event dispatcher
	const dispatch = createEventDispatcher();

	// Screen state changed handler
	function handleGameStateChange(event) {
		dispatch('stateChange', event.detail);
	}

	// FIXED: Enhanced prevent mobile zoom with StarField boost compatibility
	function preventMobileZoom() {
		if (!browser) return;

		// Set viewport meta tag to prevent zoom
		let viewportMeta = document.querySelector('meta[name="viewport"]');
		if (!viewportMeta) {
			viewportMeta = document.createElement('meta');
			viewportMeta.setAttribute('name', 'viewport');
			document.head.appendChild(viewportMeta);
		}

		// Configure viewport to prevent zoom but allow StarField interactions
		viewportMeta.setAttribute(
			'content',
			'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no, viewport-fit=cover'
		);

		// FIXED: Only prevent multi-touch gestures, allow single touches for StarField
		document.addEventListener('touchstart', preventZoomGestures, { passive: false });
		document.addEventListener('touchmove', preventZoomGestures, { passive: false });
		document.addEventListener('gesturestart', preventZoomGestures, { passive: false });
		document.addEventListener('gesturechange', preventZoomGestures, { passive: false });
		document.addEventListener('gestureend', preventZoomGestures, { passive: false });

		// Prevent double-tap zoom specifically on the arcade screen, but not on StarField area
		if (arcadeScreen) {
			arcadeScreen.addEventListener('touchend', preventDoubleTapZoom, { passive: false });
		}
	}

	// FIXED: Improved zoom gesture prevention that doesn't interfere with StarField boost
	function preventZoomGestures(e: TouchEvent | Event) {
		// Only prevent pinch zoom (multi-touch), allow single touches
		if ('touches' in e && e.touches.length > 1) {
			e.preventDefault();
			return;
		}

		// Prevent gesture zoom
		if (e.type.startsWith('gesture')) {
			e.preventDefault();
			return;
		}

		// FIXED: Check if the touch is on the StarField boost area - if so, don't interfere
		if ('target' in e && e.target) {
			const target = e.target as HTMLElement;
			const isBoostArea = target.closest('.boost-interaction-area');

			// If touching the boost area, let StarField handle it
			if (isBoostArea) {
				return; // Don't prevent - let StarField handle this touch
			}
		}

		// For other UI elements, prevent if it's a potentially problematic gesture
		if ('touches' in e && e.touches.length === 1) {
			const target = e.target as HTMLElement;
			const isUIElement = target.closest(
				'nav, button, a, input, select, textarea, .cta-button, .hamburger-menu, [role="button"]'
			);

			// Only prevent on UI elements to avoid zoom
			if (isUIElement) {
				e.preventDefault();
			}
		}
	}

	// Prevent double-tap zoom with timing-based detection
	let lastTouchEnd = 0;
	function preventDoubleTapZoom(e: TouchEvent) {
		// FIXED: Check if this is on StarField boost area
		const target = e.target as HTMLElement;
		const isBoostArea = target.closest('.boost-interaction-area');

		// Don't prevent double-tap on boost area
		if (isBoostArea) {
			return;
		}

		const now = new Date().getTime();
		if (now - lastTouchEnd <= 300) {
			e.preventDefault();
		}
		lastTouchEnd = now;
	}

	// Initialize glass effects using CSS variables from variables.css - EXACT from Hero.svelte
	function initializeGlassEffects() {
		if (!browser) return;

		// Get the glass container
		const glassContainer = document.querySelector('.screen-glass-container');
		if (!glassContainer) return;

		// Apply initial glass physics based on screen type - EXACT from Hero.svelte
		if (currentScreen === 'game') {
			// For game screen, slightly adjust glass properties for gameplay visibility
			document.documentElement.style.setProperty('--glass-reflectivity', '0.12');
			document.documentElement.style.setProperty('--glass-dust-opacity', '0.02');
			document.documentElement.style.setProperty('--glass-smudge-opacity', '0.03');
			document.documentElement.style.setProperty('--internal-reflection-opacity', '0.035');
		} else {
			// For main screen, use default glass settings
			document.documentElement.style.setProperty('--glass-reflectivity', '0.15');
			document.documentElement.style.setProperty('--glass-dust-opacity', '0.03');
			document.documentElement.style.setProperty('--glass-smudge-opacity', '0.04');
			document.documentElement.style.setProperty('--internal-reflection-opacity', '0.045');
		}
	}

	// Glass effects for enhanced realism - EXACT from Hero.svelte
	function updateGlassEffects() {
		if (!browser) return;

		// Create subtle movement with mouse for glass reflections
		const glassContainer = document.querySelector('.screen-glass-container');
		if (!glassContainer) return;

		// Define a handler for mouse movement that uses frameRateController
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
			const maxMove = 8; // maximum movement in pixels
			const moveX = offsetX * maxMove;
			const moveY = offsetY * maxMove;

			// Apply transformation to glass reflection elements - EXACT from Hero.svelte
			const specular = glassContainer.querySelector('.screen-glass-specular');
			const reflection = glassContainer.querySelector('.screen-glass-reflection');

			if (specular) {
				specular.style.transform = `translate(${-moveX * 0.8}px, ${-moveY * 0.8}px)`;
				specular.style.opacity = 0.2 + Math.abs(offsetX * offsetY) * 0.1;
			}

			if (reflection) {
				reflection.style.transform = `translate(${moveX * 0.3}px, ${moveY * 0.3}px)`;
			}
		};

		// Throttle the handler more aggressively for better performance - EXACT from Hero.svelte
		const throttledHandler = createThrottledRAF(handleMouseMove, 32); // 30fps throttling

		// Add event listener
		document.addEventListener('mousemove', throttledHandler, { passive: true });

		// Return the handler for cleanup
		return throttledHandler;
	}

	// Device detection function optimized with memoization
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

		// Set a data attribute that CSS can use for selective effects
		document.documentElement.setAttribute(
			'data-device-type',
			isLowPerformanceDevice ? 'low-performance' : isMobileDevice ? 'mobile' : 'desktop'
		);
	}

	// Cleanup mobile zoom prevention
	function cleanupMobileZoom() {
		if (!browser) return;

		document.removeEventListener('touchstart', preventZoomGestures);
		document.removeEventListener('touchmove', preventZoomGestures);
		document.removeEventListener('gesturestart', preventZoomGestures);
		document.removeEventListener('gesturechange', preventZoomGestures);
		document.removeEventListener('gestureend', preventZoomGestures);

		if (arcadeScreen) {
			arcadeScreen.removeEventListener('touchend', preventDoubleTapZoom);
		}
	}

	onMount(() => {
		if (!browser) return;

		detectDeviceCapabilities();

		// Prevent mobile zoom for game screen
		if (isMobileDevice) {
			preventMobileZoom();
		}

		// Initialize glass effects
		initializeGlassEffects();

		// Add glass dynamics - EXACT from Hero.svelte
		glassEffectsHandler = updateGlassEffects();

		// Power-up sequence using CSS variables - EXACT from Hero.svelte
		if (arcadeScreen) {
			arcadeScreen.classList.add('power-sequence');
		}

		// iOS optimizations
		if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
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
		if (glassEffectsHandler) {
			document.removeEventListener('mousemove', glassEffectsHandler as EventListener);
		}

		// Cleanup mobile zoom prevention
		cleanupMobileZoom();

		animationState.resetAnimationState();
	});

	$: if (browser && currentScreen) {
		requestAnimationFrame(() => {
			initializeGlassEffects();
		});
	}
</script>

<div
	id="arcade-screen"
	class="crt-screen hardware-accelerated relative glow rounded-[3vmin] overflow-hidden mobile-zoom-prevention"
	bind:this={arcadeScreen}
>
	<!-- CRT screen effects -->
	<ScreenEffects />

	<!-- Screen content -->
	{#if currentScreen === 'main'}
		<BackgroundManager {currentScreen} />
		<MainScreenContent />
	{:else if currentScreen === 'game'}
		<GameScreen on:stateChange={handleGameStateChange} />
	{/if}

	<!-- Enhanced Glass Effects System - EXACT HTML structure from Hero.svelte -->
	<div class="screen-glass-container rounded-[3vmin] hardware-accelerated">
		<!-- Outer glass layer for depth -->
		<div class="screen-glass-outer rounded-[3vmin]"></div>

		<!-- Inner glass layer for inner shadow -->
		<div class="screen-glass-inner rounded-[3vmin]"></div>

		<!-- Main glass reflection -->
		<div class="screen-glass-reflection rounded-[3vmin]"></div>

		<!-- Edge effects -->
		<div class="screen-glass-edge rounded-[3vmin]"></div>

		<!-- Surface texture details -->
		<div class="screen-glass-smudges rounded-[3vmin]"></div>
		<div class="screen-glass-dust rounded-[3vmin]"></div>

		<!-- Specular highlight -->
		<div class="screen-glass-specular rounded-[3vmin]"></div>

		<!-- Internal reflection -->
		<div class="screen-internal-reflection rounded-[3vmin]"></div>
	</div>

	<!-- Scanline overlay - moved after glass for proper layering -->
	<div
		id="scanline-overlay"
		class="absolute inset-0 pointer-events-none z-10 rounded-[3vmin]"
	></div>
</div>

<style lang="css">
	/* CRT screen styling - EXACT from Hero.svelte */
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

	/* FIXED: Mobile zoom prevention that's compatible with StarField boost */
	.mobile-zoom-prevention {
		/* FIXED: Remove restrictive touch-action, let children handle their own touch behavior */
		-webkit-user-select: none;
		-moz-user-select: none;
		-ms-user-select: none;
		user-select: none;
		-webkit-touch-callout: none;
		-webkit-tap-highlight-color: transparent;
	}

	/* CRT base styling - EXACT from Hero.svelte */
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

	/* Scanlines - EXACT from Hero.svelte */
	#scanline-overlay {
		background: linear-gradient(0deg, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0.0675) 51%);
		background-size: 100% 4px;
		animation: scanline 0.2s linear infinite;
		border-radius: calc(var(--border-radius) - 0.5vmin);
		z-index: 25; /* Lower than StarField boost area (z-index: 35) */
	}

	/* Glow effect - EXACT from Hero.svelte */
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

	/* Power sequence - EXACT from Hero.svelte */
	.power-sequence {
		animation: powerUpSequence 2.5s ease-out;
	}

	/* Enhanced Glass Effects System - EXACT CSS from Hero.svelte */
	.screen-glass-container {
		position: absolute;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
		z-index: 20; /* Lower than StarField boost area (z-index: 35) */
		will-change: transform, filter;
		transform-style: preserve-3d;
	}

	.screen-glass-outer {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			135deg,
			transparent 0%,
			rgba(255, 255, 255, 0.01) 15%,
			rgba(255, 255, 255, var(--glass-reflectivity)) 45%,
			rgba(255, 255, 255, 0.01) 75%,
			transparent 100%
		);
		border-radius: var(--border-radius);
		backdrop-filter: brightness(1.03) contrast(1.05);
		mix-blend-mode: overlay;
		transform: perspective(1000px) translateZ(var(--glass-thickness));
		opacity: 0.7;
	}

	.screen-glass-inner {
		position: absolute;
		inset: 0;
		background: radial-gradient(
			ellipse at center,
			transparent 30%,
			rgba(0, 0, 0, 0.07) 75%,
			rgba(0, 0, 0, 0.15) 100%
		);
		opacity: 0.5;
		border-radius: var(--border-radius);
		transform: perspective(1000px) translateZ(calc(var(--glass-thickness) * 0.5));
	}

	.screen-glass-reflection {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			135deg,
			transparent 20%,
			rgba(255, 255, 255, 0.03) 40%,
			rgba(255, 255, 255, 0.07) 50%,
			rgba(255, 255, 255, 0.03) 60%,
			transparent 80%
		);
		opacity: 0.6;
		border-radius: var(--border-radius);
		mix-blend-mode: screen;
		animation: slowGlassShift 8s ease-in-out infinite alternate;
	}

	.screen-glass-edge {
		position: absolute;
		inset: 0;
		border: 2px solid var(--glass-edge-highlight);
		border-radius: var(--border-radius);
		opacity: 0.12;
		box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.1);
		background: transparent;
		background-clip: padding-box;
		backdrop-filter: blur(0.5px);
	}

	.screen-glass-smudges {
		position: absolute;
		inset: 0;
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
		opacity: var(--glass-smudge-opacity);
		filter: contrast(120%) brightness(150%);
		border-radius: var(--border-radius);
		mix-blend-mode: overlay;
		transform: scale(1.01);
	}

	.screen-glass-dust {
		position: absolute;
		inset: 0;
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='dust'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.5 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23dust)'/%3E%3C/svg%3E");
		opacity: var(--glass-dust-opacity);
		border-radius: var(--border-radius);
		mix-blend-mode: overlay;
		transform: scale(1.02);
	}

	.screen-glass-specular {
		position: absolute;
		inset: 0;
		background: radial-gradient(
			ellipse at 35% 25%,
			rgba(255, 255, 255, var(--glass-specular-intensity)) 0%,
			transparent 25%
		);
		opacity: 0.2;
		border-radius: var(--border-radius);
		mix-blend-mode: screen;
		filter: blur(3px);
		animation: subtleSpecularShift 10s ease-in-out infinite alternate;
	}

	.screen-internal-reflection {
		position: absolute;
		inset: 0;
		background-image: repeating-linear-gradient(
			135deg,
			transparent 0px,
			rgba(255, 255, 255, 0.015) 1px,
			transparent 2px,
			rgba(255, 255, 255, 0.02) 3px
		);
		opacity: var(--internal-reflection-opacity);
		border-radius: var(--border-radius);
		mix-blend-mode: screen;
		animation: subtleReflectionShift 15s ease-in-out infinite alternate;
	}

	/* Animation keyframes - EXACT from Hero.svelte */
	@keyframes scanline {
		0% {
			background-position: 0 0;
		}
		100% {
			background-position: 0 4px;
		}
	}

	@keyframes slowGlassShift {
		0% {
			opacity: 0.5;
			transform: translateY(-1px) scale(1.01);
		}
		100% {
			opacity: 0.65;
			transform: translateY(1px) scale(1.02);
		}
	}

	@keyframes subtleSpecularShift {
		0% {
			opacity: 0.15;
			transform: translate(-2px, -1px) scale(1);
		}
		100% {
			opacity: 0.22;
			transform: translate(2px, 1px) scale(1.03);
		}
	}

	@keyframes subtleReflectionShift {
		0% {
			opacity: var(--internal-reflection-opacity);
			transform: translateX(-1px) translateY(1px);
		}
		100% {
			opacity: calc(var(--internal-reflection-opacity) * 1.2);
			transform: translateX(1px) translateY(-1px);
		}
	}

	/* Hardware acceleration utility */
	.hardware-accelerated {
		transform: translateZ(0);
		backface-visibility: hidden;
		perspective: 1000px;
		will-change: transform, opacity;
		contain: layout style paint;
		content-visibility: auto;
		view-transition-name: screen;
	}

	/* iOS optimizations */
	.ios-optimized {
		transform: translateZ(0);
		-webkit-transform: translateZ(0);
		backface-visibility: hidden;
		-webkit-backface-visibility: hidden;
	}

	/* Light theme adjustments - EXACT from Hero.svelte */
	:global(html.light) #arcade-screen.glow::after {
		opacity: 0.15;
		filter: blur(8px);
		background: linear-gradient(
			45deg,
			rgba(0, 255, 255, 0.4),
			rgba(0, 0, 255, 0.4),
			rgba(255, 0, 255, 0.4),
			rgba(255, 0, 0, 0.4)
		);
	}

	:global(html.light) .screen-glass-edge {
		opacity: 0.12;
		box-shadow: inset 0 0 6px rgba(255, 255, 255, 0.3);
	}

	/* Dark theme specific */
	:global(html.dark) #arcade-screen::after {
		background: linear-gradient(45deg, #00ffff, #0000ff, #ff00ff, #ff0000);
		filter: blur(4vmin);
	}

	/* Mobile optimizations - EXACT from Hero.svelte with enhanced StarField compatibility */
	@media (max-width: 768px) {
		.hardware-accelerated {
			will-change: transform;
			contain: layout;
			content-visibility: auto;
			view-transition-name: none;
		}

		/* FIXED: Mobile zoom prevention that works with StarField boost */
		#arcade-screen {
			/* Remove conflicting touch-action, let StarField handle its own touches */
			-webkit-user-select: none;
			-moz-user-select: none;
			-ms-user-select: none;
			user-select: none;
			-webkit-touch-callout: none;
			-webkit-tap-highlight-color: transparent;
			overscroll-behavior: contain;
			-webkit-overflow-scrolling: touch;
		}

		#scanline-overlay {
			background-size: 100% 6px;
			animation: scanline 0.3s linear infinite;
			z-index: 25; /* Keep lower than StarField boost area */
		}

		/* Streamlined scanline effect */
		#scanline-overlay {
			background-size: 100% 6px; /* Wider scanlines */
			animation: scanline 0.3s linear infinite; /* Slower movement */
		}

		/* Mobile Light Mode Cabinet Styles */
		:global(html.light) #scanline-overlay {
			opacity: 0.2;
			background-size: 100% 4px;
			animation-duration: 0.3s;
		}

		/* Disable mouse interactions on mobile */
		.screen-glass-specular,
		.screen-glass-reflection {
			transform: none !important;
		}
	}

	/* Low performance device optimizations - EXACT from Hero.svelte */
	html[data-device-type='low-performance'] #scanline-overlay {
		opacity: 0.5;
		background-size: 100% 8px; /* Even simpler scanlines */
		animation: scanline 0.4s linear infinite; /* Even slower movement */
	}

	html[data-device-type='low-performance'] .screen-glass,
	html[data-device-type='low-performance'] .screen-reflection,
	html[data-device-type='low-performance'] .screen-glare {
		animation: none;
		transition: none;
	}

	/* iOS-specific optimizations - EXACT from Hero.svelte */
	.ios-optimized #scanline-overlay {
		opacity: 0.5;
		background-size: 100% 6px;
	}

	/* FIXED: Enhanced mobile touch handling that doesn't conflict with StarField */
	@media (max-width: 768px) {
		/* General touch optimizations */
		* {
			-webkit-touch-callout: none;
			-webkit-tap-highlight-color: transparent;
		}

		/* CRITICAL: Ensure StarField boost area can capture touch events */
		:global(.boost-interaction-area) {
			touch-action: none !important;
			pointer-events: auto !important;
			z-index: 35 !important; /* Higher than everything else */
		}
	}
</style>

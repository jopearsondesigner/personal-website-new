<!-- DO NOT REMOVE THIS COMMENT
src/lib/components/ui/ArcadeScreen.svelte
DO NOT REMOVE THIS COMMENT -->

<!-- Balanced ArcadeScreen.svelte - Fully Aligned with variables.css -->
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

	// Initialize glass effects using CSS variables from variables.css
	function initializeGlassEffects() {
		if (!browser) return;

		const glassContainer = document.querySelector('.screen-glass-container');
		if (!glassContainer) {
			console.error('Glass container not found');
			return;
		}

		// Apply glass physics based on screen type using CSS variables
		if (currentScreen === 'game') {
			// Game screen uses slightly lower values for visibility
			document.documentElement.style.setProperty('--glass-reflectivity', '0.10');
			document.documentElement.style.setProperty('--glass-surface-opacity', '0.025');
			document.documentElement.style.setProperty('--glass-edge-opacity', '0.03');
		} else {
			// Main screen uses default values from variables.css
			document.documentElement.style.setProperty('--glass-reflectivity', '0.15');
			document.documentElement.style.setProperty('--glass-surface-opacity', '0.04');
			document.documentElement.style.setProperty('--glass-edge-opacity', '0.05');
		}

		// Mouse tracking with configurable FPS
		const handleMouseMove = (e) => {
			if (!glassContainer) return;
			if (!frameRateController.shouldRenderFrame()) return;

			const rect = glassContainer.getBoundingClientRect();
			const centerX = rect.left + rect.width / 2;
			const centerY = rect.top + rect.height / 2;

			const offsetX = (e.clientX - centerX) / (rect.width / 2);
			const offsetY = (e.clientY - centerY) / (rect.height / 2);

			// Apply to interactive glass elements
			const mainGlass = glassContainer.querySelector('.screen-glass-main');
			const specularHighlight = glassContainer.querySelector('.screen-glass-specular');

			if (mainGlass) {
				const moveX = offsetX * 1.5;
				const moveY = offsetY * 1.5;
				(mainGlass as HTMLElement).style.transform =
					`translate(${moveX * 0.2}px, ${moveY * 0.2}px)`;
			}

			if (specularHighlight) {
				const moveX = offsetX * 2;
				const moveY = offsetY * 2;
				(specularHighlight as HTMLElement).style.transform =
					`translate(${moveX * 0.3}px, ${moveY * 0.3}px)`;
			}
		};

		// Use mouse tracking FPS from CSS variables
		const fps =
			parseInt(
				getComputedStyle(document.documentElement).getPropertyValue('--mouse-tracking-fps')
			) || 67;
		const throttledHandler = createThrottledRAF(handleMouseMove, fps);
		document.addEventListener('mousemove', throttledHandler, { passive: true });

		return throttledHandler;
	}

	// Device detection with CSS variable integration
	function detectDeviceCapabilities() {
		if (!browser) return;

		isMobileDevice = window.innerWidth < 768;
		isLowPerformanceDevice =
			isMobileDevice &&
			(navigator.hardwareConcurrency <= 4 ||
				(navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')));

		// Set device type for CSS targeting
		const deviceType = isLowPerformanceDevice
			? 'low-performance'
			: isMobileDevice
				? 'mobile'
				: 'desktop';
		document.documentElement.setAttribute('data-device-type', deviceType);
	}

	// Create throttled RAF using CSS variable timing
	function createThrottledRAF(fn: Function, delay: number) {
		let lastTime = 0;
		return function (this: any, ...args: any[]) {
			const currentTime = performance.now();
			if (currentTime - lastTime >= delay) {
				lastTime = currentTime;
				requestAnimationFrame(() => fn.apply(this, args));
			}
		};
	}

	onMount(() => {
		if (!browser) return;

		detectDeviceCapabilities();
		glassEffectsHandler = initializeGlassEffects();

		// Power-up sequence using CSS variables
		if (arcadeScreen) {
			arcadeScreen.classList.add('power-sequence');

			// Get warmup delay from CSS variables
			const warmupDelay =
				parseInt(
					getComputedStyle(document.documentElement).getPropertyValue('--glass-warmup-delay')
				) || 150;

			setTimeout(() => {
				const glassContainer = document.querySelector('.screen-glass-container');
				if (glassContainer) {
					glassContainer.classList.add('glass-warmup');
					isInitializing = false;
				}
			}, warmupDelay);
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
	class="crt-screen hardware-accelerated relative glow rounded-[3vmin] overflow-hidden"
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

	<!-- Glass effects using CSS variables -->
	<div class="screen-glass-container rounded-[3vmin] hardware-accelerated">
		<!-- Main glass layer -->
		<div class="screen-glass-main rounded-[3vmin]"></div>

		<!-- Edge effects -->
		<div class="screen-glass-edge rounded-[3vmin]"></div>

		<!-- Surface texture -->
		<div class="screen-glass-surface rounded-[3vmin]"></div>

		<!-- Specular highlight -->
		<div class="screen-glass-specular rounded-[3vmin]"></div>

		<!-- Inner reflection -->
		<div class="screen-glass-reflection rounded-[3vmin]"></div>
	</div>

	<!-- Enhanced scanlines -->
	<div
		id="scanline-overlay"
		class="absolute inset-0 pointer-events-none z-10 rounded-[3vmin]"
	></div>

	<!-- Chromatic aberration -->
	<div
		class="screen-chromatic-aberration absolute inset-0 pointer-events-none z-5 rounded-[3vmin]"
	></div>
</div>

<style lang="css">
	/* CRT screen styling - Uses variables from variables.css */
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
		background: linear-gradient(145deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%);
		transform-style: preserve-3d;
		contain: layout style paint;
	}

	/* CRT base styling using CSS variables */
	.crt-screen {
		--phosphor-decay: 16ms;
		--refresh-rate: 60Hz;
		--shadow-mask-size: var(--shadow-mask-size, 2px);
		--bloom-intensity: 0.6;
		--misconvergence-offset: 0.8px;
		position: relative;
		overflow: hidden;
		background: #000;
		border-radius: var(--border-radius);
		contain: layout style paint;
	}

	/* Scanlines using enhanced patterns */
	#scanline-overlay {
		background:
			/* Horizontal scanlines */
			linear-gradient(
				0deg,
				rgba(255, 255, 255, 0) 47%,
				rgba(255, 255, 255, 0.025) 49%,
				rgba(255, 255, 255, 0.08) 50%,
				rgba(255, 255, 255, 0.025) 51%,
				rgba(255, 255, 255, 0) 53%
			),
			/* Subtle vertical mask */
				linear-gradient(
					90deg,
					rgba(255, 255, 255, 0.02) 0%,
					transparent 50%,
					rgba(255, 255, 255, 0.02) 100%
				);
		background-size:
			100% 3px,
			100% 100%;
		animation: scanline 0.2s linear infinite;
		border-radius: calc(var(--border-radius) - 0.5vmin);
		z-index: 25;
		pointer-events: none;
	}

	/* Glow effect using CSS variables */
	#arcade-screen.glow::after {
		content: '';
		position: absolute;
		inset: -3px;
		border-radius: calc(var(--border-radius) + 0.5vmin);
		background: linear-gradient(
			45deg,
			var(--teal-glow-500),
			var(--teal-glow-300),
			var(--teal-glow-100),
			var(--teal-glow-300),
			var(--teal-glow-500)
		);
		filter: blur(15px);
		opacity: var(--screen-glow-opacity);
		z-index: -1;
		mix-blend-mode: screen;
		animation: glowPulse var(--glow-pulse-duration) ease-in-out infinite alternate;
	}

	/* Glass container with hardware acceleration */
	.screen-glass-container {
		position: absolute;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
		z-index: 20;
		will-change: transform;
		transform-style: preserve-3d;
		contain: layout style paint;
	}

	/* Main glass using CSS variables for conditional backdrop-filter */
	.screen-glass-main {
		position: absolute;
		inset: 0;
		background:
			/* Gradient reflections using teal colors */
			radial-gradient(ellipse at 30% 20%, var(--teal-glow-100) 0%, transparent 40%),
			radial-gradient(ellipse at 70% 80%, var(--teal-glow-50) 0%, transparent 50%),
			/* Subtle tint */
				linear-gradient(
					135deg,
					var(--teal-glow-50) 0%,
					transparent 25%,
					transparent 75%,
					var(--teal-glow-50) 100%
				);
		border-radius: var(--border-radius);
		opacity: var(--glass-reflectivity);
		mix-blend-mode: overlay;
		animation: glassShift var(--glass-shift-duration) ease-in-out infinite;
		transform: translateZ(0);
		will-change: transform;
	}

	/* Conditional backdrop-filter based on device capability */
	html[data-device-type='desktop'] .screen-glass-main {
		backdrop-filter: blur(calc(var(--glass-distortion) * 1.6)) saturate(110%);
		-webkit-backdrop-filter: blur(calc(var(--glass-distortion) * 1.6)) saturate(110%);
	}

	/* Edge effects using brand colors from variables */
	.screen-glass-edge {
		position: absolute;
		inset: 0;
		border: var(--glass-thickness) solid var(--teal-glow-300);
		border-radius: var(--border-radius);
		opacity: var(--glass-edge-opacity);
		box-shadow:
			/* Inner glow */
			inset 0 0 12px var(--teal-glow-500),
			inset 0 0 4px var(--teal-glow-300),
			/* Outer glow */ 0 0 8px var(--teal-glow-300),
			0 0 3px var(--teal-glow-500);
		transform: translateZ(0);
		will-change: transform;
	}

	/* Surface texture with CSS patterns */
	.screen-glass-surface {
		position: absolute;
		inset: 0;
		background-image:
			/* Dust particles */
			radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
			radial-gradient(circle at 60% 70%, rgba(255, 255, 255, 0.015) 1px, transparent 1px),
			radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.025) 1px, transparent 1px),
			/* Subtle scratches */
				linear-gradient(23deg, transparent 0px, rgba(255, 255, 255, 0.01) 1px, transparent 2px),
			linear-gradient(67deg, transparent 0px, rgba(255, 255, 255, 0.008) 1px, transparent 2px);
		background-size:
			30px 30px,
			40px 40px,
			25px 25px,
			200px 200px,
			150px 150px;
		opacity: var(--glass-surface-opacity);
		border-radius: var(--border-radius);
		mix-blend-mode: overlay;
		transform: scale(1.01) translateZ(0);
	}

	/* Specular highlight with variable strength */
	.screen-glass-specular {
		position: absolute;
		inset: 0;
		background: radial-gradient(
			circle at 50% 50%,
			rgba(255, 255, 255, var(--glass-specular-strength)) 0%,
			rgba(255, 255, 255, calc(var(--glass-specular-strength) * 0.5)) 20%,
			transparent 40%
		);
		border-radius: var(--border-radius);
		opacity: 0.6;
		mix-blend-mode: overlay;
		transform: translateZ(0);
		will-change: transform;
		animation: specularFloat var(--specular-float-duration) ease-in-out infinite alternate;
	}

	/* Inner reflection using animation from variables */
	.screen-glass-reflection {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			45deg,
			transparent 0%,
			rgba(255, 255, 255, 0.03) 20%,
			rgba(255, 255, 255, 0.02) 40%,
			transparent 60%
		);
		border-radius: var(--border-radius);
		opacity: 0.8;
		mix-blend-mode: soft-light;
		animation: reflectionShift var(--reflection-shift-duration) ease-in-out infinite alternate;
		transform: translateZ(0);
	}

	/* Chromatic aberration with variable amount */
	.screen-chromatic-aberration {
		background: radial-gradient(
			ellipse at center,
			transparent 60%,
			rgba(255, 0, 0, 0.005) 70%,
			rgba(0, 255, 0, 0.005) 80%,
			rgba(0, 0, 255, 0.005) 90%,
			transparent 100%
		);
		mix-blend-mode: screen;
		opacity: 0.3;
		transform: scale(calc(1 + var(--glass-chromatic-aberration) / 100));
	}

	/* Animation keyframes - using duration variables */
	@keyframes glassShift {
		0% {
			transform: translate(-0.5px, -0.5px) scale(1) translateZ(0);
		}
		100% {
			transform: translate(0.5px, 0.5px) scale(1.002) translateZ(0);
		}
	}

	@keyframes specularFloat {
		0% {
			transform: translate(-1px, -1px) rotate(0deg) translateZ(0);
		}
		100% {
			transform: translate(1px, 1px) rotate(0.5deg) translateZ(0);
		}
	}

	@keyframes reflectionShift {
		0% {
			transform: translate(0.5px, -0.5px) translateZ(0);
			opacity: 0.6;
		}
		100% {
			transform: translate(-0.5px, 0.5px) translateZ(0);
			opacity: 0.9;
		}
	}

	@keyframes glowPulse {
		0% {
			opacity: var(--screen-glow-opacity);
		}
		100% {
			opacity: calc(var(--screen-glow-opacity) * 1.3);
		}
	}

	@keyframes scanline {
		0% {
			background-position:
				0 0,
				0 0;
		}
		100% {
			background-position:
				0 3px,
				0 0;
		}
	}

	/* Glass warmup animation using variables */
	.screen-glass-container.glass-warmup .screen-glass-main,
	.screen-glass-container.glass-warmup .screen-glass-edge,
	.screen-glass-container.glass-warmup .screen-glass-surface,
	.screen-glass-container.glass-warmup .screen-glass-specular,
	.screen-glass-container.glass-warmup .screen-glass-reflection {
		animation: glassWarmUp var(--glass-warmup-duration) ease-out forwards;
	}

	@keyframes glassWarmUp {
		0% {
			opacity: 0;
			transform: scale(0.95) translateZ(0);
		}
		30% {
			opacity: 0.3;
			transform: scale(0.98) translateZ(0);
		}
		60% {
			opacity: 0.7;
			transform: scale(1.01) translateZ(0);
		}
		100% {
			opacity: 1;
			transform: scale(1) translateZ(0);
		}
	}

	/* Hardware acceleration from variables.css */
	.hardware-accelerated {
		transform: translateZ(0);
		backface-visibility: hidden;
		perspective: 1000;
		will-change: transform;
		contain: layout style paint;
		content-visibility: auto;
	}

	/* Power-up animation using variables */
	#arcade-screen.power-sequence::before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(to bottom, #fff, transparent 30%),
			linear-gradient(to right, transparent 0%, #fff 50%, transparent 100%);
		opacity: 0;
		z-index: 30;
		pointer-events: none;
		animation: powerSequence var(--power-sequence-duration) ease-out forwards;
		mix-blend-mode: screen;
	}

	@keyframes powerSequence {
		0% {
			opacity: 1;
		}
		5% {
			opacity: 0.9;
		}
		10% {
			opacity: 0.7;
		}
		15% {
			opacity: 0.9;
		}
		20% {
			opacity: 0.5;
		}
		25% {
			opacity: 0.8;
		}
		30% {
			opacity: 0.3;
		}
		40% {
			opacity: 0.6;
		}
		50% {
			opacity: 0.2;
		}
		60% {
			opacity: 0.4;
		}
		70% {
			opacity: 0.1;
		}
		80% {
			opacity: 0.3;
		}
		90% {
			opacity: 0.05;
		}
		100% {
			opacity: 0;
		}
	}

	/* iOS optimizations */
	#arcade-screen.ios-optimized {
		transform: translateZ(0);
		-webkit-transform: translateZ(0);
		backface-visibility: hidden;
		-webkit-backface-visibility: hidden;
		perspective: 1000;
		-webkit-perspective: 1000;
	}

	/* Device-specific optimizations using data attributes */
	html[data-device-type='low-performance'] .screen-glass-container {
		opacity: 0.7;
	}

	html[data-device-type='low-performance'] .screen-glass-specular,
	html[data-device-type='low-performance'] .screen-glass-reflection {
		display: none;
	}

	/* Mobile optimizations */
	@media (max-width: 768px) {
		.screen-glass-main {
			opacity: calc(var(--glass-reflectivity) * 0.7);
		}

		.screen-glass-edge {
			box-shadow: inset 0 0 8px var(--teal-glow-500);
		}

		/* Disable mouse interactions on mobile */
		.screen-glass-main,
		.screen-glass-specular {
			transform: none !important;
		}
	}

	/* High-performance desktop enhancements */
	@media (min-width: 1024px) {
		html[data-device-type='desktop'] .screen-glass-container {
			filter: contrast(1.05) brightness(1.02);
		}
	}
</style>

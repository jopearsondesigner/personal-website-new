<!-- src/lib/components/ui/ArcadeScreen.svelte -->
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

	// Initialize glass effects for enhanced realism
	function initializeGlassEffects() {
		if (!browser) return;

		// Get the glass container with a more specific selector
		const glassContainer = document.querySelector('.screen-glass-container');
		console.log('Glass container:', glassContainer);
		if (!glassContainer) {
			console.error('Glass container not found');
			return;
		}

		// Apply initial glass physics based on screen type
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
			const maxMove = 8; // maximum movement in pixels
			const moveX = offsetX * maxMove;
			const moveY = offsetY * maxMove;

			// Apply transformation to glass reflection elements
			const specular = glassContainer.querySelector('.screen-glass-specular');
			const reflection = glassContainer.querySelector('.screen-glass-reflection');

			if (specular) {
				(specular as HTMLElement).style.transform =
					`translate(${-moveX * 0.8}px, ${-moveY * 0.8}px)`;
				(specular as HTMLElement).style.opacity = 0.2 + Math.abs(offsetX * offsetY) * 0.1;
			}

			if (reflection) {
				(reflection as HTMLElement).style.transform =
					`translate(${moveX * 0.3}px, ${moveY * 0.3}px)`;
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

		// Initialize glass effects
		glassEffectsHandler = initializeGlassEffects();

		// Apply power-up sequence effect
		if (arcadeScreen) {
			arcadeScreen.classList.add('power-sequence');
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
	<!-- CRT screen effects -->
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

	<!-- Glass effects and overlays -->
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

	/* Glass container styling */
	.screen-glass-container {
		position: absolute;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
		z-index: 10; /* Increased z-index to be above all content */
		will-change: transform, filter;
		transform-style: preserve-3d;
	}

	/* Glass effects */
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
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='dust'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.15 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23dust)'/%3E%3C/svg%3E");
		opacity: var(--glass-dust-opacity);
		filter: contrast(150%) brightness(120%);
		border-radius: var(--border-radius);
		mix-blend-mode: overlay;
		transform: scale(1.02);
	}

	.screen-glass-specular {
		position: absolute;
		inset: 0;
		background: radial-gradient(
			ellipse at center,
			rgba(255, 255, 255, 0.2) 0%,
			rgba(255, 255, 255, 0.05) 60%,
			transparent 70%
		);
		opacity: 0.2;
		border-radius: var(--border-radius);
		mix-blend-mode: screen;
		filter: blur(2px);
	}

	.screen-internal-reflection {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			135deg,
			transparent 30%,
			rgba(0, 255, 255, 0.01) 40%,
			rgba(255, 0, 255, 0.02) 50%,
			rgba(0, 0, 255, 0.01) 60%,
			transparent 70%
		);
		opacity: var(--internal-reflection-opacity);
		border-radius: var(--border-radius);
		mix-blend-mode: screen;
		animation: slowInternalReflection 12s ease-in-out infinite alternate;
	}

	/* Animation keyframes for glass effects */
	@keyframes slowGlassShift {
		0% {
			transform: translateX(-5px) translateY(-2px);
		}
		100% {
			transform: translateX(5px) translateY(2px);
		}
	}

	@keyframes slowInternalReflection {
		0% {
			opacity: var(--internal-reflection-opacity);
			transform: translateX(-10px) translateY(-5px);
		}
		100% {
			opacity: calc(var(--internal-reflection-opacity) * 1.5);
			transform: translateX(10px) translateY(5px);
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
		animation: powerSequence 1.5s ease-out forwards;
	}

	@keyframes powerSequence {
		0% {
			opacity: 1;
		}
		10% {
			opacity: 0.8;
		}
		20% {
			opacity: 0.6;
		}
		30% {
			opacity: 0.8;
		}
		40% {
			opacity: 0.4;
		}
		60% {
			opacity: 0.2;
		}
		100% {
			opacity: 0;
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

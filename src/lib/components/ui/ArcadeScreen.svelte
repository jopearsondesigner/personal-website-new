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

		// Set other required CSS variables with increased visibility
		document.documentElement.style.setProperty('--glass-thickness', '2px');
		document.documentElement.style.setProperty('--glass-edge-highlight', 'rgba(255, 255, 255, 0.1)');
		
		// Set ACTUAL brand teal colors from your palette with opacity
		document.documentElement.style.setProperty('--teal-50', '#E0F7F7, 0.04'); // Teal 50 with opacity
		document.documentElement.style.setProperty('--teal-100', '#B3EFEF, 0.06'); // Teal 100 with opacity
		document.documentElement.style.setProperty('--teal-300', '#4DDCDC, 0.1');  // Teal 300 with opacity
		document.documentElement.style.setProperty('--teal-500', '#00A8A8, 0.12'); // Your brand teal with opacity
		
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

		// OPTIMIZED mouse movement handler - only move one element, throttle more aggressively
		const handleMouseMove = (e) => {
			if (!glassContainer) return;

			// More aggressive frame rate checking for better performance
			if (!frameRateController.shouldRenderFrame()) return;

			// Calculate relative position
			const rect = glassContainer.getBoundingClientRect();
			const centerX = rect.left + rect.width / 2;
			const centerY = rect.top + rect.height / 2;

			// Calculate normalized offsets (-1 to 1)
			const offsetX = (e.clientX - centerX) / (rect.width / 2);
			const offsetY = (e.clientY - centerY) / (rect.height / 2);

			// Only move the main reflection element for better performance
			const reflection = glassContainer.querySelector('.screen-glass-reflection');

			if (reflection) {
				// Only apply transform if movement is significant enough
				const moveThreshold = 0.05;
				if (Math.abs(offsetX) > moveThreshold || Math.abs(offsetY) > moveThreshold) {
					const moveX = offsetX * 4; // Reduced from 8
					const moveY = offsetY * 4; // Reduced from 8
					
					(reflection as HTMLElement).style.transform =
						`translate(${moveX * 0.2}px, ${moveY * 0.2}px)`;
				}
			}
		};

		// More aggressive throttling - 20fps instead of 30fps
		const throttledHandler = createThrottledRAF(handleMouseMove, 50); // 20fps throttling

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

	<!-- OPTIMIZED Glass effects - Fewer elements, less expensive operations -->
	<div class="screen-glass-container rounded-[3vmin] hardware-accelerated">
		<!-- Combined main reflection layer with your brand teal -->
		<div class="screen-glass-main rounded-[3vmin]"></div>
		<!-- Simplified edge effect -->
		<div class="screen-glass-edge rounded-[3vmin]"></div>
		<!-- Combined scratches and dust layer -->
		<div class="screen-glass-surface rounded-[3vmin]"></div>
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

	/* OPTIMIZED Glass container - fewer layers */
	.screen-glass-container {
		position: absolute;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
		z-index: 20;
		will-change: transform;
		transform-style: preserve-3d;
		contain: layout style paint; /* Optimize painting */
	}

	/* OPTIMIZED: Combined main glass effect - replaces multiple layers */
	.screen-glass-main {
		position: absolute;
		inset: 0;
		/* Multiple background effects combined into one */
		background: 
			/* Subtle teal gradient for main reflection */
			linear-gradient(
				135deg,
				transparent 0%,
				rgba(224, 247, 247, 0.03) 15%, /* Your teal-50 */
				rgba(179, 239, 239, 0.05) 45%, /* Your teal-100 */
				rgba(224, 247, 247, 0.03) 75%, /* Your teal-50 */
				transparent 100%
			),
			/* Inner shadow effect */
			radial-gradient(
				ellipse at center,
				transparent 40%,
				rgba(0, 0, 0, 0.02) 85%,
				rgba(0, 0, 0, 0.04) 100%
			);
		border-radius: var(--border-radius, 3vmin);
		opacity: 0.6;
		mix-blend-mode: overlay; /* Only one blend mode */
		animation: slowGlassShift 8s ease-in-out infinite alternate;
		/* Remove expensive backdrop-filter */
	}

	/* OPTIMIZED: Simplified edge effect */
	.screen-glass-edge {
		position: absolute;
		inset: 0;
		border: 1px solid rgba(77, 220, 220, 0.08); /* Your teal-300 with lower opacity */
		border-radius: var(--border-radius, 3vmin);
		opacity: 0.7;
		box-shadow: 
			inset 0 0 10px rgba(0, 168, 168, 0.08), /* Your teal-500 with lower opacity */
			0 0 6px rgba(77, 220, 220, 0.06); /* Your teal-300 with lower opacity */
		/* Remove expensive backdrop-filter */
	}

	/* OPTIMIZED: Combined surface effects (scratches + dust) */
	.screen-glass-surface {
		position: absolute;
		inset: 0;
		/* Simplified noise pattern - less complex */
		background-image: 
			url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence baseFrequency='0.7' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
		opacity: 0.04; /* Combined opacity for all surface effects */
		filter: contrast(110%) brightness(120%); /* Less aggressive filtering */
		border-radius: var(--border-radius, 3vmin);
		mix-blend-mode: overlay;
		transform: scale(1.01);
	}

	/* OPTIMIZED: Simplified glass warmup animation */
	.screen-glass-container.glass-warmup .screen-glass-main,
	.screen-glass-container.glass-warmup .screen-glass-edge,
	.screen-glass-container.glass-warmup .screen-glass-surface {
		animation: glassWarmUp 2s ease-out forwards; /* Shorter animation */
	}

	/* OPTIMIZED: Simpler animation keyframes */
	@keyframes slowGlassShift {
		0% {
			transform: translateX(-2px) translateY(-1px); /* Smaller movement */
		}
		100% {
			transform: translateX(2px) translateY(1px); /* Smaller movement */
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
		will-change: transform;
		contain: layout style paint;
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

	/* OPTIMIZED: Glass warmup animation - simpler values */
	@keyframes glassWarmUp {
		0% {
			opacity: 0;
		}
		50% {
			opacity: 0.5;
		}
		100% {
			opacity: 1;
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

	/* Performance optimizations for low-performance devices */
	html[data-device-type='low-performance'] .screen-glass-container {
		display: none; /* Hide glass effects entirely on very low-performance devices */
	}

	/* Reduced effects on mobile */
	@media (max-width: 768px) {
		.screen-glass-main {
			opacity: 0.4; /* Reduce opacity on mobile */
		}
		
		.screen-glass-edge {
			box-shadow: inset 0 0 5px rgba(0, 168, 168, 0.06); /* Simpler shadow */
		}
	}
</style>
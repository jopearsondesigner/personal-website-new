<!-- src/lib/components/Hero.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { gsap } from 'gsap';
	import { get } from 'svelte/store';
	import ArcadeCtaButton from '$lib/components/ui/ArcadeCtaButton.svelte';
	import ArcadeNavigation from '$lib/components/ui/ArcadeNavigation.svelte';
	import GameScreen from '$lib/components/game/GameScreen.svelte';
	import { animations } from '$lib/utils/animation-utils';
	import { animationState, screenStore } from '$lib/stores/animation-store';
	import { layoutStore } from '$lib/stores/store';
	import GameControls from '$lib/components/game/GameControls.svelte';

	// Optimized component state using typed definitions
	let currentTimeline: gsap.core.Timeline | null = null;
	let header: HTMLElement;
	let insertConcept: HTMLElement;
	let arcadeScreen: HTMLElement;
	let starContainer: HTMLElement;
	let spaceBackground: HTMLElement;
	let currentScreen = 'main';
	let stars: ReturnType<StarFieldManager['getStars']> = [];
	let starFieldManager: InstanceType<typeof animations.StarFieldManager>;
	let glitchManager: InstanceType<typeof animations.GlitchManager>;
	let resizeObserver: ResizeObserver | null = null;
	let orientationTimeout: number | null = null;
	let hasError = false;

	// Reactive statements with performance optimizations
	$: stars = $animationState.stars;

	$: if (browser) {
		requestAnimationFrame(() => {
			document.documentElement.style.setProperty(
				'--navbar-height',
				`${$layoutStore.navbarHeight}px`
			);
		});
	}

	// Optimized screen management with debouncing
	$: {
		if (currentScreen === 'main' && browser) {
			const elements = {
				header,
				insertConcept,
				arcadeScreen
			};

			if (elements.header && elements.insertConcept && elements.arcadeScreen) {
				// Reset animation state before starting new animations
				animationState.resetAnimationState();

				// Initialize starFieldManager if it doesn't exist
				if (!starFieldManager) {
					starFieldManager = new animations.StarFieldManager(animationState);
				}

				// Use Promise.resolve().then to ensure DOM is ready
				Promise.resolve().then(() => {
					starFieldManager?.start();
					startAnimations(elements);
				});
			}
		} else if (currentScreen !== 'main') {
			stopAnimations();
		}
	}

	// Event handlers with performance optimizations
	function handleScreenChange(event: CustomEvent) {
		const newScreen = event.detail;
		screenStore.set(newScreen);
		currentScreen = newScreen;
	}

	function handleControlInput(event: CustomEvent) {
		if (!browser) return;

		const { detail } = event;
		if (detail.type === 'joystick') {
			requestAnimationFrame(() => {
				if (detail.value.x < -0.5) {
					window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
				} else if (detail.value.x > 0.5) {
					window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
				} else {
					window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft' }));
					window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight' }));
				}

				if (detail.value.y < -0.5) {
					window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
				}
			});
		}
	}

	// Optimized animation management
	function startAnimations(elements: {
		header: HTMLElement;
		insertConcept: HTMLElement;
		arcadeScreen: HTMLElement;
	}) {
		try {
			const state = get(animationState);
			if (state.isAnimating) {
				stopAnimations(); // Stop existing animations first
			}

			const { header, insertConcept, arcadeScreen } = elements;

			// Initialize star field manager
			if (!starFieldManager) {
				starFieldManager = new animations.StarFieldManager(animationState);
				starFieldManager.start();
			}

			// Initialize glitch manager with enhanced settings
			if (glitchManager) {
				glitchManager.cleanup();
			}
			glitchManager = new animations.GlitchManager();
			glitchManager.start([header]); // Apply only to header

			// Create GSAP timeline with optimized settings
			const timeline = gsap.timeline({
				paused: true,
				onComplete: () => timeline.restart(),
				defaults: {
					ease: 'power1.inOut',
					immediateRender: false
				}
			});

			// Clear any existing timelines
			if (currentTimeline) {
				currentTimeline.kill();
			}

			timeline
				.to([header, insertConcept], {
					duration: 0.1,
					y: '+=2',
					repeat: -1,
					yoyo: true
				})
				.to(
					insertConcept,
					{
						duration: 1,
						opacity: 0,
						repeat: -1,
						yoyo: true,
						ease: 'none'
					},
					0
				);

			currentTimeline = timeline;
			timeline.play();

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

	function stopAnimations() {
		if (!browser) return;

		// Only stop glitch manager, keep star field running
		glitchManager?.stop();

		// Kill GSAP timeline with proper cleanup
		if (currentTimeline) {
			currentTimeline.kill();
			currentTimeline = null;
		}

		// Don't reset animation state entirely, just update isAnimating
		animationState.update((state) => ({
			...state,
			isAnimating: false
		}));
	}

	// Optimized handling of orientation changes
	function handleOrientation() {
		if (!browser) return;

		const isLandscape = window.innerWidth > window.innerHeight;
		requestAnimationFrame(() => {
			document.body.classList.toggle('landscape', isLandscape);
		});
	}

	// Debounced resize handler
	function debouncedOrientationCheck() {
		if (orientationTimeout) {
			clearTimeout(orientationTimeout);
		}
		orientationTimeout = window.setTimeout(handleOrientation, 150);
	}

	// Lifecycle hooks with proper cleanup
	onMount(() => {
		if (!browser) return;

		currentScreen = 'main';

		// Setup resize observer for performance
		resizeObserver = new ResizeObserver(debouncedOrientationCheck);
		if (arcadeScreen) {
			resizeObserver.observe(arcadeScreen);
		}

		// Initial setup
		requestAnimationFrame(() => {
			arcadeScreen?.classList.add('power-sequence');
			handleOrientation();
		});

		// Add event listener with passive option for better touch performance
		window.addEventListener('resize', debouncedOrientationCheck, { passive: true });

		return () => {
			window.removeEventListener('resize', debouncedOrientationCheck);
			orientationTimeout && clearTimeout(orientationTimeout);
		};
	});

	onDestroy(() => {
		if (!browser) return;

		// Cleanup all animations and managers
		stopAnimations();

		// Reset animation state
		animationState.reset();

		// Proper cleanup of managers
		if (starFieldManager) {
			starFieldManager.cleanup();
			starFieldManager = null;
		}

		if (glitchManager) {
			glitchManager.cleanup();
			glitchManager = null;
		}

		// Cleanup resize observer
		if (resizeObserver) {
			resizeObserver.disconnect();
			resizeObserver = null;
		}

		// Clear any remaining timeouts
		if (orientationTimeout) {
			clearTimeout(orientationTimeout);
			orientationTimeout = null;
		}
	});
</script>

<section
	id="hero"
	class="w-full relative overflow-hidden flex items-center justify-center"
	style="
    margin-top: calc(-.5 * {$layoutStore.navbarHeight}px);
    height: calc(100vh + {$layoutStore.navbarHeight}px);
  "
>
	<div
		id="arcade-cabinet"
		class="cabinet-metal w-full h-full relative flex items-center justify-center overflow-hidden"
	>
		<div class="cabinet-plastic overflow-hidden">
			<div class="cabinet-background absolute inset-0"></div>
			<div class="cabinet-wear absolute inset-0"></div>

			<div
				class="arcade-screen-wrapper relative overflow-hidden"
				style="margin-top: calc(-1 * var(--navbar-height, 64px));"
			>
				<div class="navigation-wrapper relative z-50">
					<ArcadeNavigation on:changeScreen={handleScreenChange} />
				</div>

				<!-- Add explicit border-radius and overflow-hidden -->
				<div class="screen-bezel rounded-[3vmin] overflow-hidden"></div>
				<div
					id="arcade-screen"
					class="crt-screen hardware-accelerated relative w-[90vw] h-[70vh] md:w-[80vw] md:h-[600px] glow rounded-[3vmin] overflow-hidden"
					bind:this={arcadeScreen}
				>
					<div class="phosphor-decay rounded-[3vmin]"></div>
					<div class="shadow-mask rounded-[3vmin]"></div>
					<div class="interlace rounded-[3vmin]"></div>

					<!-- Update all screen effects to include border radius -->
					<div class="screen-reflection rounded-[3vmin]"></div>
					<div class="screen-glare rounded-[3vmin]"></div>
					<div class="screen-glass rounded-[3vmin]"></div>
					<div class="glow-effect rounded-[3vmin]"></div>

					<div
						id="scanline-overlay"
						class="absolute inset-0 pointer-events-none z-10 rounded-[3vmin]"
					></div>

					{#if currentScreen === 'main'}
						<div
							id="space-background"
							class="absolute inset-0 overflow-hidden pointer-events-none rounded-[3vmin]"
							bind:this={spaceBackground}
						>
							<div
								class="star-container absolute inset-0 pointer-events-none rounded-[3vmin]"
								bind:this={starContainer}
							>
								{#each $animationState.stars as star (star.id)}
									<div class="star absolute" style={star.style}></div>
								{/each}
							</div>
						</div>
						<!-- Content wrapper -->
						<div
							id="text-wrapper"
							class="absolute inset-0 flex flex-col items-center justify-center z-0 p-2 mt-12 box-border"
						>
							<div id="header" class="text-center mb-2" bind:this={header}>
								Power-up Your Brand!
							</div>

							<div class="mt-6">
								<ArcadeCtaButton />
							</div>
							<div id="insert-concept" class="text-center mt-3" bind:this={insertConcept}>
								Insert Concept
							</div>
						</div>
					{:else if currentScreen === 'game'}
						<GameScreen />
					{/if}
				</div>
			</div>
		</div>
	</div>
	{#if currentScreen === 'game'}
		<div class="fixed-game-controls lg:hidden">
			<GameControls on:control={handleControlInput} />
		</div>
	{/if}
</section>

<style>
	/* ==========================================================================
   Root Variables
   ========================================================================== */
	:root {
		/* Layout */
		--arcade-screen-width: min(95vw, 800px);
		--arcade-screen-height: min(70vh, 600px);
		--border-radius: 4vmin;
		--cabinet-depth: 2.5vmin;
		--screen-recess: 1.8vmin;
		--bezel-thickness: 0.8vmin;

		/* Typography */
		--header-font-size: 70px;
		--insert-concept-font-size: 4.45vmin;

		/* Colors */
		--screen-border-color: rgba(226, 226, 189, 1);
		--header-text-color: rgba(227, 255, 238, 1);
		--insert-concept-color: rgba(245, 245, 220, 1);
		--cabinet-specular: rgba(255, 255, 255, 0.7);
		--glass-reflection: rgba(255, 255, 255, 0.15);
		--screen-glow-opacity: 0.6;

		/* Shadows & Effects */
		--cabinet-shadow: 0 20px 40px rgba(0, 0, 0, 0.25), 0 5px 15px rgba(0, 0, 0, 0.15),
			inset 0 3px 8px rgba(0, 0, 0, 0.2);

		--screen-shadow: 0 0 30px rgba(0, 0, 0, 0.8), inset 0 0 50px rgba(0, 0, 0, 0.9),
			inset 0 0 2px rgba(255, 255, 255, 0.3), inset 0 0 100px rgba(0, 0, 0, 0.7);

		--bezel-shadow: inset 0 0 20px rgba(0, 0, 0, 0.9), 0 0 2px var(--glass-reflection),
			0 0 15px rgba(39, 255, 153, 0.2);

		--screen-curve: radial-gradient(
			circle at 50% 50%,
			rgba(255, 255, 255, 0.1) 0%,
			rgba(255, 255, 255, 0.05) 40%,
			transparent 60%
		);
	}

	/* ==========================================================================
   Media Queries
   ========================================================================== */
	@media (min-width: 1020px) {
		:root {
			--arcade-screen-width: 80vw;
			--arcade-screen-height: 600px;
			--header-font-size: 100px;
			--insert-concept-font-size: 2.45vmin;
		}
	}

	/* ==========================================================================
   Layout Components
   ========================================================================== */
	section {
		height: calc(100vh - var(--navbar-height, 64px));
	}

	.fixed-game-controls {
		display: none;
	}

	@media (max-width: 1023px) {
		.fixed-game-controls {
			display: block;
		}
	}

	#arcade-cabinet {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		position: relative;
		isolation: isolate;
		transform-style: preserve-3d;
		background: linear-gradient(180deg, rgba(40, 40, 40, 1) 0%, rgba(20, 20, 20, 1) 100%);
		box-shadow: var(--cabinet-shadow);
	}

	/* ==========================================================================
   Screen Components
   ========================================================================== */
	.arcade-screen-wrapper {
		position: absolute;
		padding: var(--screen-recess);
		transform: perspective(1000px) rotateX(2deg);
		transform-style: preserve-3d;
		width: fit-content;
		height: fit-content;
		margin: 0 auto;
		border-radius: calc(var(--border-radius) + 8px);
		overflow: hidden;
	}

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

	/* ==========================================================================
   Visual Effects
   ========================================================================== */
	.screen-reflection,
	.screen-glare,
	.screen-glass,
	.glow-effect,
	.phosphor-decay,
	.shadow-mask,
	.interlace {
		border-radius: var(--border-radius);
	}

	/* Additional helper class for consistent border radius */
	.rounded-arcade {
		border-radius: var(--border-radius);
		overflow: hidden;
	}

	.screen-reflection {
		position: absolute;
		inset: 0;
		background: var(--screen-curve),
			linear-gradient(
				35deg,
				transparent 0%,
				rgba(255, 255, 255, 0.02) 25%,
				rgba(255, 255, 255, 0.05) 47%,
				rgba(255, 255, 255, 0.02) 50%,
				transparent 100%
			);
		mix-blend-mode: overlay;
		opacity: 0.7;
	}

	:global(html.light) .screen-reflection {
		opacity: 0.4;
		background: linear-gradient(
			35deg,
			transparent 0%,
			rgba(255, 255, 255, 0.03) 25%,
			rgba(255, 255, 255, 0.06) 47%,
			rgba(255, 255, 255, 0.03) 50%,
			transparent 100%
		);
	}

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

	.glow-effect {
		will-change: opacity;
	}

	/* ==========================================================================
   Typography
   ========================================================================== */
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

	:global(html.light) .arcade-text {
		color: var(--arcade-black-500);
		opacity: 0.8;
	}

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

	/* ==========================================================================
   Animations
   ========================================================================== */
	@keyframes scanline {
		0% {
			background-position: 0 0;
		}
		100% {
			background-position: 0 4px;
		}
	}

	@keyframes tmoldingPulse {
		0%,
		100% {
			opacity: 0.8;
		}
		50% {
			opacity: 1;
		}
	}

	/* ==========================================================================
   Theme-Specific Styles
   ========================================================================== */
	/* Light Theme */
	:global(html.light) #arcade-cabinet {
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, transparent 15%),
			linear-gradient(
				90deg,
				rgba(160, 160, 160, 1) 0%,
				rgba(200, 200, 200, 0) 15%,
				rgba(200, 200, 200, 0) 85%,
				rgba(160, 160, 160, 1) 100%
			),
			linear-gradient(170deg, #e0e0e0 0%, #b0b0b0 40%, #909090 70%, #808080 100%);
		box-shadow:
			0 20px 40px rgba(0, 0, 0, 0.3),
			0 10px 30px rgba(0, 0, 0, 0.2),
			inset 0 2px 3px rgba(255, 255, 255, 0.9),
			inset -3px 0 8px rgba(0, 0, 0, 0.15),
			inset 3px 0 8px rgba(0, 0, 0, 0.15),
			inset 0 -3px 6px rgba(0, 0, 0, 0.2);
	}

	/* Dark Theme */
	:global(html.dark) #arcade-screen::after {
		background: linear-gradient(45deg, #00ffff, #0000ff, #ff00ff, #ff0000);
		filter: blur(4vmin);
	}

	/* ==========================================================================
   Utility Classes
   ========================================================================== */
	.hardware-accelerated {
		transform: translateZ(0);
		backface-visibility: hidden;
		perspective: 1000px;
		will-change: transform, opacity;
		contain: layout style paint;
		content-visibility: auto;
		view-transition-name: screen;
	}

	/* ==========================================================================
   CRT Effects
   ========================================================================== */
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

	.phosphor-decay {
		position: absolute;
		inset: 0;
		mix-blend-mode: screen;
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 20%);
		animation: phosphorPersistence var(--phosphor-decay) linear infinite;
	}

	.shadow-mask {
		position: absolute;
		inset: 0;
		background-image: repeating-linear-gradient(
			90deg,
			rgba(255, 0, 0, 0.1),
			rgba(0, 255, 0, 0.1),
			rgba(0, 0, 255, 0.1)
		);
		background-size: var(--shadow-mask-size) var(--shadow-mask-size);
		pointer-events: none;
		opacity: 0.3;
	}

	/* ==========================================================================
   Cabinet Effects
   ========================================================================== */
	.cabinet-wear {
		border-radius: 0;
		background: repeating-linear-gradient(
			45deg,
			transparent 0px,
			transparent 5px,
			rgba(0, 0, 0, 0.02) 5px,
			rgba(0, 0, 0, 0.02) 6px
		);
		opacity: 0.3;
		mix-blend-mode: multiply;
		backdrop-filter: contrast(1.02);
	}

	.screen-bezel {
		position: absolute;
		inset: 0;
		border-radius: calc(var(--border-radius) + var(--bezel-thickness));
		background: repeating-linear-gradient(
				45deg,
				rgba(255, 255, 255, 0.03) 0px,
				rgba(255, 255, 255, 0.03) 1px,
				transparent 1px,
				transparent 2px
			),
			linear-gradient(to bottom, rgba(40, 40, 40, 1), rgba(60, 60, 60, 1));
		transform: translateZ(-1px);
		box-shadow: var(--bezel-shadow);
		overflow: hidden;
	}

	.screen-glare {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			35deg,
			transparent 0%,
			rgba(255, 255, 255, 0.05) 25%,
			rgba(255, 255, 255, 0.1) 47%,
			rgba(255, 255, 255, 0.05) 50%,
			transparent 100%
		);
		pointer-events: none;
		z-index: 2;
	}

	.screen-glass {
		position: absolute;
		inset: 0;
		border-radius: var(--border-radius);
		background: linear-gradient(
			35deg,
			transparent 0%,
			rgba(255, 255, 255, 0.02) 25%,
			rgba(255, 255, 255, 0.05) 47%,
			rgba(255, 255, 255, 0.02) 50%,
			transparent 100%
		);
		pointer-events: none;
		mix-blend-mode: overlay;
		opacity: 0.8;
		z-index: 2;
	}

	:global(html.light) .screen-glass {
		background: linear-gradient(
			35deg,
			transparent 0%,
			rgba(255, 255, 255, 0.01) 25%,
			rgba(255, 255, 255, 0.02) 47%,
			rgba(255, 255, 255, 0.01) 50%,
			transparent 100%
		);
		opacity: 0.6;
	}

	/* ==========================================================================
   Lighting Effects
   ========================================================================== */
	.t-molding {
		position: absolute;
		inset: -4px;
		border-radius: calc(var(--border-radius) + 8px);
		background: transparent;
		overflow: hidden;
		z-index: -1;
	}

	.t-molding::before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(
			90deg,
			rgba(255, 0, 98, 0.8) 0%,
			rgba(255, 0, 98, 0.4) 50%,
			rgba(255, 0, 98, 0.8) 100%
		);
		filter: blur(3px);
		animation: tmoldingPulse 4s infinite;
	}

	.t-molding::after {
		content: '';
		position: absolute;
		inset: 0;
		background: rgba(255, 255, 255, 0.1);
		box-shadow:
			inset 0 0 15px rgba(255, 255, 255, 0.2),
			0 0 20px rgba(255, 0, 98, 0.4);
	}

	.control-panel-light {
		position: absolute;
		bottom: -20px;
		left: 10%;
		right: 10%;
		height: 20px;
		background: linear-gradient(to bottom, rgba(0, 255, 255, 0.4), transparent);
		filter: blur(8px);
		transform: perspective(500px) rotateX(60deg);
		transform-origin: top;
		opacity: 0.6;
		animation: controlPanelGlow 2s ease-in-out infinite alternate;
	}

	.corner-accent {
		position: absolute;
		width: 30px;
		height: 30px;
		background: radial-gradient(
			circle at center,
			rgba(255, 255, 255, 0.9),
			rgba(255, 255, 255, 0.1) 70%,
			transparent 100%
		);
		filter: blur(2px);
		opacity: 0.7;
	}

	/* Corner accent positions */
	.corner-accent.top-left {
		top: -15px;
		left: -15px;
	}
	.corner-accent.top-right {
		top: -15px;
		right: -15px;
	}
	.corner-accent.bottom-left {
		bottom: -15px;
		left: -15px;
	}
	.corner-accent.bottom-right {
		bottom: -15px;
		right: -15px;
	}

	.light-spill {
		position: absolute;
		inset: -50px;
		background: radial-gradient(circle at 50% 50%, rgba(255, 0, 98, 0.15), transparent 70%);
		filter: blur(20px);
		mix-blend-mode: screen;
		pointer-events: none;
		z-index: -2;
	}

	/* ==========================================================================
   Space Background
   ========================================================================== */
	#space-background {
		position: absolute;
		inset: 0;
		background: radial-gradient(circle at center, #000 20%, #001c4d 80%, #000000);
		border-radius: var(--border-radius);
		overflow: hidden;
		z-index: 0;
		perspective: 1000px;
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

	/* ==========================================================================
   Additional Animations
   ========================================================================== */
	@keyframes controlPanelGlow {
		from {
			opacity: 0.5;
		}
		to {
			opacity: 0.7;
		}
	}

	@keyframes screenFlicker {
		0%,
		100% {
			opacity: 0;
		}
		50% {
			opacity: 1;
		}
	}

	@keyframes powerUpSequence {
		0% {
			filter: brightness(0) blur(2px);
			transform: scale(0.98);
		}
		5% {
			filter: brightness(0.3) blur(1px);
			transform: scale(0.99);
		}
		10% {
			filter: brightness(0.1) blur(2px);
			transform: scale(0.98);
		}
		15% {
			filter: brightness(0.5) blur(0.5px);
			transform: scale(1);
		}
		30% {
			filter: brightness(0.3) blur(1px);
			transform: scale(0.99);
		}
		100% {
			filter: brightness(1) blur(0);
			transform: scale(1);
		}
	}

	@keyframes phosphorPersistence {
		0% {
			opacity: 1;
		}
		50% {
			opacity: 0.7;
		}
		100% {
			opacity: 0;
		}
	}

	@keyframes interlaceFlicker {
		0% {
			opacity: 1;
		}
		50% {
			opacity: 0.7;
		}
		100% {
			opacity: 1;
		}
	}

	/* ==========================================================================
   Additional Theme-Specific Styles
   ========================================================================== */
	:global(html.light) .cabinet-wear {
		background: repeating-linear-gradient(
			45deg,
			transparent 0px,
			transparent 5px,
			rgba(0, 0, 0, 0.03) 5px,
			rgba(0, 0, 0, 0.03) 6px
		);
		opacity: 0.4;
	}

	:global(html.light) .screen-bezel {
		background: linear-gradient(to bottom, rgba(210, 210, 210, 1) 0%, rgba(190, 190, 190, 1) 100%);
		box-shadow:
        /* Inner shadow for depth */
			inset 0 2px 4px rgba(0, 0, 0, 0.15),
			/* Subtle outer glow */ 0 0 1px rgba(255, 255, 255, 0.8),
			/* Gentle ambient shadow */ 0 4px 6px rgba(0, 0, 0, 0.06);
		border-radius: calc(var(--border-radius) + 0.5vmin);
	}

	:global(html.light) .t-molding::before {
		opacity: 0.4;
		background: linear-gradient(
			90deg,
			rgba(0, 150, 255, 0.6) 0%,
			rgba(0, 150, 255, 0.3) 50%,
			rgba(0, 150, 255, 0.6) 100%
		);
	}

	:global(html.light) .control-panel-light {
		opacity: 0.3;
		background: linear-gradient(to bottom, rgba(0, 150, 255, 0.3), transparent);
	}

	:global(html.light) .crt-screen {
		--bloom-intensity: 0.3;
		--shadow-mask-size: 2.5px;
		background: linear-gradient(180deg, #111 0%, #222 100%);
	}

	:global(html.light) .shadow-mask {
		opacity: 0.2;
	}

	/* Cabinet Materials Light Theme */
	:global(html.light) .cabinet-metal {
		background: linear-gradient(
			180deg,
			rgba(255, 255, 255, 1) 0%,
			rgba(240, 240, 240, 1) 15%,
			rgba(230, 230, 230, 1) 85%,
			rgba(220, 220, 220, 1) 100%
		);
		box-shadow:
			0 20px 40px rgba(0, 0, 0, 0.1),
			0 10px 30px rgba(0, 0, 0, 0.05),
			inset 0 2px 4px rgba(255, 255, 255, 1),
			inset -3px 0 10px rgba(0, 0, 0, 0.03),
			inset 3px 0 10px rgba(0, 0, 0, 0.03),
			inset 0 -5px 15px rgba(0, 0, 0, 0.05);
	}
	:global(html.light) .cabinet-plastic {
		background: linear-gradient(
			180deg,
			rgba(240, 240, 240, 1) 0%,
			rgba(230, 230, 230, 1) 50%,
			rgba(225, 225, 225, 1) 100%
		);
		box-shadow:
        /* Top highlight */
			inset 0 1px 2px rgba(255, 255, 255, 0.95),
			/* Subtle depth shadows */ inset 0 10px 20px rgba(0, 0, 0, 0.02),
			inset -4px 0 15px rgba(0, 0, 0, 0.01),
			inset 4px 0 15px rgba(0, 0, 0, 0.01),
			inset 0 -4px 15px rgba(0, 0, 0, 0.02);
	}

	:global(html.light) .cabinet-background {
		background: linear-gradient(
			45deg,
			rgba(140, 140, 140, 0.5) 0%,
			rgba(180, 180, 180, 0.5) 50%,
			rgba(140, 140, 140, 0.5) 100%
		);
		mix-blend-mode: multiply;
	}

	/* ==========================================================================
   Cabinet Materials and Structure
   ========================================================================== */
	.cabinet-metal {
		background: linear-gradient(180deg, rgba(40, 40, 40, 1) 0%, rgba(20, 20, 20, 1) 100%);
		box-shadow: var(--cabinet-shadow);
	}

	.cabinet-plastic {
		position: relative;
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		border-radius: 0;
		overflow: hidden;
		background: linear-gradient(180deg, rgba(40, 40, 40, 1) 0%, rgba(20, 20, 20, 1) 100%);
		box-shadow:
			inset 0 10px 30px rgba(0, 0, 0, 0.4),
			inset -5px 0 15px rgba(0, 0, 0, 0.3),
			inset 5px 0 15px rgba(0, 0, 0, 0.3),
			inset 0 -5px 15px rgba(0, 0, 0, 0.4);
		padding: 2vmin;
	}

	.cabinet-plastic::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 0;
		background: radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.1), transparent 70%);
		pointer-events: none;
	}

	.cabinet-background {
		background: linear-gradient(
			45deg,
			rgba(20, 20, 20, 0.4) 0%,
			rgba(40, 40, 40, 0.4) 50%,
			rgba(20, 20, 20, 0.4) 100%
		);
		border-radius: 0;
	}

	:global(html.light) .side-panel {
		border-color: rgba(0, 0, 0, 0.06);
	}

	/* ==========================================================================
   Screen Effects and Overlays
   ========================================================================== */
	#scanline-overlay {
		background: linear-gradient(0deg, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0.1) 51%);
		background-size: 100% 4px;
		animation: scanline 0.2s linear infinite;
		border-radius: calc(var(--border-radius) - 0.5vmin);
		z-index: 1;
	}

	:global(html.light) #scanline-overlay {
		opacity: 0.4;
		background-size: 100% 3px;
	}

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

	.screen-flicker {
		position: absolute;
		inset: 0;
		background: linear-gradient(transparent 0%, rgba(255, 255, 255, 0.05) 50%, transparent 100%);
		opacity: 0;
		animation: screenFlicker 0.1s steps(2) infinite;
	}

	/* ==========================================================================
   Additional CRT Effects
   ========================================================================== */
	.interlace {
		position: absolute;
		inset: 0;
		background: repeating-linear-gradient(
			0deg,
			rgba(0, 0, 0, 0.2) 0px,
			transparent 1px,
			transparent 2px
		);
		animation: interlaceFlicker calc(1000ms / var(--refresh-rate)) steps(2) infinite;
	}

	.color-bleed {
		position: absolute;
		inset: 0;
		filter: blur(1.5px);
		opacity: 0.4;
		mix-blend-mode: screen;
	}

	.misconvergence {
		position: absolute;
		inset: 0;
		transform: translate3d(var(--misconvergence-offset), 0, 0);
		mix-blend-mode: screen;
		opacity: 0.4;
	}

	.power-sequence {
		animation: powerUpSequence 2.5s ease-out;
	}

	/* ==========================================================================
   Insert Concept Styles
   ========================================================================== */
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

	/* ==========================================================================
   Performance Optimizations
   ========================================================================== */
	.hardware-accelerated {
		transform: translateZ(0);
		backface-visibility: hidden;
		perspective: 1000px;
		will-change: transform, opacity;
	}

	/* ==========================================================================
   Additional Theme-Specific Adjustments
   ========================================================================== */
	:global(html.light) #arcade-screen {
		box-shadow:
			0 0 30px rgba(0, 0, 0, 0.1),
			inset 0 0 50px rgba(0, 0, 0, 0.2),
			inset 0 0 2px rgba(255, 255, 255, 0.5),
			inset 0 0 100px rgba(0, 0, 0, 0.1);
	}

	:global(html.light) #arcade-screen {
		background: linear-gradient(145deg, #111 0%, #222 100%);
		box-shadow:
        /* Screen recess shadow */
			0 0 20px rgba(0, 0, 0, 0.08),
			/* Inner screen shadow */ inset 0 0 40px rgba(0, 0, 0, 0.25),
			/* Subtle glass effect */ inset 0 0 2px rgba(255, 255, 255, 0.4);
	}
</style>

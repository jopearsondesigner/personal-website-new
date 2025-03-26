<!-- src/lib/components/Hero.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { gsap } from 'gsap';
	import { get } from 'svelte/store';
	import { throttle, debounce } from '$lib/utils/lodash-utils';
	import ArcadeCtaButton from '$lib/components/ui/ArcadeCtaButton.svelte';
	import ArcadeNavigation from '$lib/components/ui/ArcadeNavigation.svelte';
	import GameScreen from '$lib/components/game/GameScreen.svelte';
	import { animations } from '$lib/utils/animation-utils';
	import { animationState, screenStore } from '$lib/stores/animation-store';
	import { layoutStore } from '$lib/stores/store';
	import GameControls from '$lib/components/game/GameControls.svelte';

	// Import new optimization utilities
	import { animationService } from '$lib/services/animation-service';
	import { animationMode, initAnimationMode } from '$lib/utils/animation-mode';
	import { OptimizedStarFieldManager } from '$lib/utils/optimized-star-field';

	// Component state
	let currentTimeline: gsap.core.Timeline | null = null;
	let header: HTMLElement;
	let insertConcept: HTMLElement;
	let arcadeScreen: HTMLElement;
	let starContainer: HTMLElement;
	let spaceBackground: HTMLElement;
	let currentScreen = 'main';
	let starFieldManager: OptimizedStarFieldManager | null = null;
	let glitchManager: InstanceType<typeof animations.GlitchManager> | null = null;
	let resizeObserver: ResizeObserver | null = null;
	let orientationTimeout: number | null = null;
	let isInView = false;
	let intersectionObserver: IntersectionObserver | null = null;
	let worker: Worker | null = null;

	// Reactive statements
	$: if (browser) {
		document.documentElement.style.setProperty('--navbar-height', `${$layoutStore.navbarHeight}px`);
	}

	$: {
		if (currentScreen === 'main' && browser && isInView) {
			if (header && insertConcept && arcadeScreen) {
				// Reset animation state before starting new animations
				animationState.resetAnimationState();

				// Defer animation start for better performance
				setTimeout(() => {
					startAnimations({
						header,
						insertConcept,
						arcadeScreen
					});
				}, 50);
			}
		} else if (currentScreen !== 'main' || !isInView) {
			stopAnimations();
		}
	}

	// Event handlers
	function handleScreenChange(event: CustomEvent) {
		currentScreen = event.detail;
		screenStore.set(event.detail);
	}

	// Optimized joystick input handler with throttle
	const handleControlInput = throttle((event) => {
		if (!browser) return;

		const { detail } = event;
		if (detail.type === 'joystick') {
			// Schedule UI updates with requestAnimationFrame
			requestAnimationFrame(() => {
				if (detail.x < -0.5) {
					window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
				} else if (detail.x > 0.5) {
					window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
				} else {
					window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft' }));
					window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight' }));
				}

				if (detail.y < -0.5) {
					window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
				}
			});
		}
	}, 16); // ~60fps

	// Animation management
	// Animation management
	function startAnimations(elements: {
		header: HTMLElement;
		insertConcept: HTMLElement;
		arcadeScreen: HTMLElement;
	}) {
		try {
			// Ensure we stop existing animations first
			stopAnimations();

			const { header, insertConcept } = elements;

			// Get device-specific optimizations
			const mode = get(animationMode);
			const config = animationService.getAnimationConfig('hero');
			const starCount = config.starCount || 30;

			// Initialize star field based on device capabilities
			if (browser && window.Worker && !worker) {
				try {
					// Create Web Worker for star generation
					worker = new Worker(new URL('$lib/workers/animation-worker.js', import.meta.url));

					worker.onmessage = (e) => {
						const { type, data } = e.data;
						if (type === 'starsGenerated') {
							// Update stars in store
							animationState.setStars(data.stars);
						}
					};

					// Request star generation from worker
					worker.postMessage({
						type: 'generateStars',
						data: { count: starCount }
					});
				} catch (error) {
					console.error('Web Worker creation failed:', error);

					// Fallback to main thread star generation
					if (!starFieldManager) {
						starFieldManager = new OptimizedStarFieldManager(animationState, starCount);
						if (starContainer) {
							starFieldManager.setContainer(starContainer);
						}
					}
					starFieldManager.start();
				}
			} else {
				// Fallback to synchronous star generation
				if (!starFieldManager) {
					starFieldManager = new OptimizedStarFieldManager(animationState, starCount);
					if (starContainer) {
						starFieldManager.setContainer(starContainer);
					}
				}
				starFieldManager.start();
			}

			// Apply glitch effects based on device capability
			if (mode === 'minimal') {
				// Use CSS-only glitch for low-end devices
				if (glitchManager) {
					glitchManager.cleanup();
					glitchManager = null;
				}

				// Add simple CSS class for basic effect
				if (header) {
					header.classList.add('simple-glitch-effect');
				}
			} else {
				// Use JS-based glitch effect for better devices
				if (glitchManager) {
					glitchManager.cleanup();
				}

				// Create appropriate glitch manager
				const intensity = mode === 'reduced' ? 0.3 : 0.8;
				glitchManager = new animations.GlitchManager({
					intensity,
					frequency: mode === 'reduced' ? 0.3 : 0.6
				});

				glitchManager.start([header]);
			}

			// Check if GSAP is available
			if (browser && typeof gsap !== 'undefined') {
				// Create timeline directly with GSAP
				const timeline = gsap.timeline({
					paused: true,
					repeat: -1,
					defaults: {
						ease: 'power1.inOut',
						force3D: true
					}
				});

				// Apply device-specific animations
				if (mode === 'minimal') {
					// Minimal animations for low-end devices
					if (insertConcept) {
						insertConcept.classList.add('mobile-blink-animation');
					}

					if (header) {
						timeline.to(header, {
							duration: 0.5,
							y: '+=1',
							yoyo: true,
							repeat: 1,
							repeatDelay: 2
						});
					}
				} else if (mode === 'reduced') {
					// Reduced animations for mid-range devices
					if (header) {
						timeline.to(header, {
							duration: 0.3,
							y: '+=2',
							yoyo: true,
							repeat: 3
						});
					}

					if (insertConcept) {
						timeline.to(
							insertConcept,
							{
								duration: 1.5,
								opacity: 0.5,
								yoyo: true,
								repeat: 1
							},
							0
						);
					}
				} else {
					// Full animations for high-end devices
					if (header && insertConcept) {
						timeline.to([header, insertConcept], {
							duration: 0.1,
							y: '+=2',
							yoyo: true,
							repeat: 3
						});

						timeline.to(
							insertConcept,
							{
								duration: 1,
								opacity: 0,
								yoyo: true,
								repeat: 1
							},
							0
						);
					}
				}

				currentTimeline = timeline;
				timeline.play();
			} else {
				// Fallback for when GSAP is not available
				console.info('GSAP not available, using CSS animations instead');
				if (header) {
					header.classList.add('simple-glitch-effect');
				}
				if (insertConcept) {
					insertConcept.classList.add('mobile-blink-animation');
				}
			}

			// Update animation state
			animationState.setAnimating(true);
		} catch (error) {
			console.error('Animation initialization failed:', error);
			animationState.reset();

			// Apply fallback CSS animations on error
			if (header) {
				header.classList.add('simple-glitch-effect');
			}
			if (insertConcept) {
				insertConcept.classList.add('mobile-blink-animation');
			}
		}
	}

	function stopAnimations() {
		if (!browser) return;

		// Stop glitch manager
		if (glitchManager) {
			glitchManager.stop();
		}

		// Remove CSS classes
		if (header) header.classList.remove('simple-glitch-effect');
		if (insertConcept) insertConcept.classList.remove('mobile-blink-animation');

		// Kill GSAP timeline
		if (currentTimeline) {
			currentTimeline.kill();
			currentTimeline = null;
		}

		// Update animation state
		animationState.setAnimating(false);
	}

	// Handle orientation changes
	const handleOrientation = () => {
		if (!browser) return;

		const isLandscape = window.innerWidth > window.innerHeight;
		requestAnimationFrame(() => {
			document.body.classList.toggle('landscape', isLandscape);
		});
	};

	// Debounced orientation check
	const debouncedOrientationCheck = debounce(handleOrientation, 150);

	// Lifecycle hooks
	onMount(() => {
		if (!browser) return;

		// Initialize animation mode
		initAnimationMode();

		// Set initial screen
		currentScreen = 'main';

		// Initialize animation state
		animationState.reset();

		// Setup intersection observer for visibility detection
		intersectionObserver = new IntersectionObserver(
			(entries) => {
				const [entry] = entries;
				isInView = entry.isIntersecting;

				// Start/stop animations based on visibility
				if (isInView && currentScreen === 'main') {
					if (!$animationState.isAnimating && header && insertConcept && arcadeScreen) {
						startAnimations({ header, insertConcept, arcadeScreen });
					}
				} else {
					stopAnimations();
				}
			},
			{ threshold: 0.1 }
		);

		// Observe hero section
		const heroSection = document.getElementById('hero');
		if (heroSection) {
			intersectionObserver.observe(heroSection);
		}

		// Initialize star field manager
		starFieldManager = new OptimizedStarFieldManager(animationState, 60);
		if (starContainer) {
			starFieldManager.setContainer(starContainer);
		}

		// Setup resize observer
		resizeObserver = new ResizeObserver(debouncedOrientationCheck);
		if (arcadeScreen) {
			resizeObserver.observe(arcadeScreen);
		}

		// Set initial orientation
		handleOrientation();

		// Add event listeners
		window.addEventListener('resize', debouncedOrientationCheck, { passive: true });

		// Configure GSAP
		gsap.config({
			force3D: true,
			nullTargetWarn: false
		});
	});

	onDestroy(() => {
		if (!browser) return;

		// Stop animations
		stopAnimations();

		// Clear timeouts
		if (orientationTimeout) {
			clearTimeout(orientationTimeout);
		}

		// Reset animation state
		animationState.reset();

		// Clean up managers
		if (starFieldManager) {
			starFieldManager.cleanup();
		}

		if (glitchManager) {
			glitchManager.cleanup();
		}

		// Disconnect observers
		if (intersectionObserver) {
			intersectionObserver.disconnect();
		}

		// Clean up star field
		if (starFieldManager) {
			starFieldManager.cleanup();
		}

		if (resizeObserver) {
			resizeObserver.disconnect();
		}

		// Terminate worker
		if (worker) {
			worker.terminate();
		}

		// Kill GSAP animations
		if (currentTimeline) {
			currentTimeline.kill();
		}

		// Clean up through animation service
		animationService.cleanup();

		// Remove event listeners
		window.removeEventListener('resize', debouncedOrientationCheck);
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

				<div class="screen-bezel rounded-[3vmin] overflow-hidden"></div>
				<div
					id="arcade-screen"
					class="crt-screen hardware-accelerated relative w-[90vw] h-[70vh] md:w-[80vw] md:h-[600px] glow rounded-[3vmin] overflow-hidden"
					bind:this={arcadeScreen}
				>
					<div class="phosphor-decay rounded-[3vmin]"></div>
					<div class="shadow-mask rounded-[3vmin]"></div>
					<div class="interlace rounded-[3vmin]"></div>

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
		--header-font-size: 110px;
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
			--header-font-size: 140px;
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

	/* ==========================================================================
Mobile Optimizations - Simplified Effects for Performance
========================================================================== */
	@media (max-width: 767px) {
		/* Simplified gradients for mobile */
		.screen-reflection {
			position: absolute;
			inset: 0;
			/* Simpler gradient with fewer color stops */
			background: linear-gradient(
				35deg,
				transparent 0%,
				rgba(255, 255, 255, 0.03) 50%,
				transparent 100%
			);
			/* Remove expensive mix-blend-mode */
			mix-blend-mode: normal;
			opacity: 0.5;
		}

		/* Remove expensive effects on mobile */
		.glow-effect,
		.phosphor-decay,
		.shadow-mask,
		.interlace {
			display: none;
		}

		/* Simplified arcade screen for mobile */
		#arcade-screen {
			box-shadow: 0 0 15px rgba(0, 0, 0, 0.5) !important;
			/* Simpler background */
			background: #111 !important;
		}

		/* Simplified hardware acceleration for mobile */
		.hardware-accelerated {
			/* Only use the most effective GPU acceleration properties */
			transform: translateZ(0);
			/* Remove expensive CSS properties */
			backface-visibility: visible;
			perspective: none;
			/* More selective will-change */
			will-change: transform;
			/* Remove expensive contain property on mobile */
			contain: none;
			content-visibility: visible;
		}

		/* Simplified bezel for mobile */
		.screen-bezel {
			box-shadow: none !important;
			background: #333 !important;
		}

		/* Simplified reflection for mobile */
		.screen-glass {
			opacity: 0.4 !important;
			background: linear-gradient(
				35deg,
				transparent 0%,
				rgba(255, 255, 255, 0.02) 50%,
				transparent 100%
			) !important;
		}

		/* Optimize scanlines for mobile */
		#scanline-overlay {
			opacity: 0.3;
			background-size: 100% 6px !important;
		}
	}

	/* Add CSS animation classes for mobile optimization */
	.mobile-blink-animation {
		animation: blink 2s ease-in-out infinite;
	}

	.simple-glitch-effect {
		animation: simpleGlitch 4s ease-in-out infinite;
	}

	@keyframes blink {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0;
		}
	}

	@keyframes simpleGlitch {
		0%,
		5%,
		10%,
		100% {
			transform: translateX(0);
		}
		2.5% {
			transform: translateX(2px);
		}
		7.5% {
			transform: translateX(-2px);
		}
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
		/* Add these properties */
		max-width: 80%;
		margin: 0 auto;
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

	:global(html.light) #arcade-screen {
		box-shadow:
			0 0 30px rgba(0, 0, 0, 0.1),
			inset 0 0 50px rgba(0, 0, 0, 0.2),
			inset 0 0 2px rgba(255, 255, 255, 0.5),
			inset 0 0 100px rgba(0, 0, 0, 0.1);
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
	/* Power sequence with simplified animation for mobile */
	@media (max-width: 767px) {
		@keyframes mobilePowerUpSequence {
			0% {
				filter: brightness(0.8) blur(1px);
				transform: scale(0.99);
			}
			100% {
				filter: brightness(1) blur(0);
				transform: scale(1);
			}
		}

		.power-sequence {
			animation-name: mobilePowerUpSequence;
			animation-duration: 1.5s;
		}

		/* Reduce shadow intensity for better performance */
		#arcade-screen {
			box-shadow: 0 0 20px rgba(0, 0, 0, 0.6);
		}

		/* Simplify text shadow for better performance */
		#header {
			text-shadow:
				0 0 5px rgba(39, 255, 153, 0.8),
				0 0 10px rgba(39, 255, 153, 0.6);
		}

		#insert-concept {
			text-shadow:
				0 0 5px rgba(250, 250, 240, 0.5),
				0 0 10px rgba(250, 250, 240, 0.3);
		}
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

	/* ==========================================================================
   Mobile Dark Mode Cabinet Rounded Corners (768px and below)
   ========================================================================== */
	@media (max-width: 768px) {
		/* Apply rounded cabinet styles to dark mode */
		#arcade-cabinet {
			border-radius: var(--border-radius, 12px);
			overflow: hidden;
		}

		.cabinet-plastic {
			border-radius: var(--border-radius, 12px);
			overflow: hidden;
		}

		.cabinet-background,
		.cabinet-wear {
			border-radius: var(--border-radius, 12px);
		}

		.screen-bezel {
			border-radius: calc(var(--border-radius, 12px) + var(--bezel-thickness, 0.8vmin));
			overflow: hidden;
		}

		/* Ensure proper border-radius on all elements that need it */
		.arcade-screen-wrapper,
		.screen-bezel {
			overflow: hidden;
			border-radius: var(--border-radius, 12px);
		}
	}

	/* ==========================================================================
   Mobile Light Mode Animation Adjustments
   ========================================================================== */
	@media (max-width: 768px) {
		/* Soften glitch effects for mobile light mode */
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

		/* Smoother scanline effect */
		:global(html.light) #scanline-overlay {
			opacity: 0.2;
			background-size: 100% 4px;
			animation-duration: 0.3s;
		}

		/* Reduce power-up sequence intensity for light mode */
		:global(html.light) .power-sequence {
			animation-duration: 2s;
		}

		@keyframes mobileLightPowerUp {
			0% {
				filter: brightness(0.8) blur(1px);
				transform: scale(0.99);
			}
			100% {
				filter: brightness(1) blur(0);
				transform: scale(1);
			}
		}

		:global(html.light) .power-sequence {
			animation-name: mobileLightPowerUp;
		}
	}

	/* ==========================================================================
   Mobile Light Mode Cabinet Styles (768px and below)
   ========================================================================== */
	@media (max-width: 768px) {
		:global(html.light) #arcade-cabinet {
			background: linear-gradient(
				180deg,
				var(--light-cabinet-primary, #f0f0f0) 0%,
				var(--light-cabinet-secondary, #e0e0e0) 100%
			);
			box-shadow:
				0 10px 20px rgba(0, 0, 0, 0.08),
				0 5px 15px rgba(0, 0, 0, 0.04),
				inset 0 1px 2px var(--light-highlight, rgba(255, 255, 255, 0.9));
			border-radius: var(--light-cabinet-border-radius, 12px);
		}

		:global(html.light) .cabinet-plastic {
			background: linear-gradient(
				180deg,
				var(--light-cabinet-secondary, #e0e0e0) 0%,
				var(--light-cabinet-tertiary, #d0d0d0) 100%
			);
			box-shadow:
				inset 0 5px 15px rgba(0, 0, 0, 0.02),
				inset -3px 0 8px rgba(0, 0, 0, 0.01),
				inset 3px 0 8px rgba(0, 0, 0, 0.01),
				inset 0 -3px 8px rgba(0, 0, 0, 0.02);
			border-radius: var(--light-cabinet-border-radius, 12px);
			border: 1px solid var(--light-cabinet-border-color, rgba(0, 0, 0, 0.05));
		}

		:global(html.light) .cabinet-background {
			background: linear-gradient(
				45deg,
				rgba(240, 240, 240, 0.2) 0%,
				rgba(250, 250, 250, 0.2) 50%,
				rgba(240, 240, 240, 0.2) 100%
			);
			opacity: 0.6;
			mix-blend-mode: overlay;
		}

		:global(html.light) .cabinet-wear {
			background: repeating-linear-gradient(
				45deg,
				transparent 0px,
				transparent 5px,
				rgba(0, 0, 0, var(--light-cabinet-texture-opacity, 0.02)) 5px,
				rgba(0, 0, 0, var(--light-cabinet-texture-opacity, 0.02)) 6px
			);
			opacity: 0.2;
			mix-blend-mode: soft-light;
		}

		:global(html.light) .screen-bezel {
			background: linear-gradient(
				to bottom,
				var(--light-bezel-gradient-start, #d0d0d0) 0%,
				var(--light-bezel-gradient-end, #c0c0c0) 100%
			);
			box-shadow:
				inset 0 1px 3px rgba(0, 0, 0, 0.08),
				0 0 1px rgba(255, 255, 255, 0.9),
				0 2px 4px rgba(0, 0, 0, 0.03);
			border-radius: calc(var(--border-radius) + 4px);
		}

		/* Enhanced mobile t-molding with subtler effect */
		:global(html.light) .t-molding::before {
			opacity: 0.2;
			background: linear-gradient(
				90deg,
				var(--light-cabinet-accent, rgba(0, 150, 255, 0.3)) 0%,
				rgba(0, 150, 255, 0.2) 50%,
				var(--light-cabinet-accent, rgba(0, 150, 255, 0.3)) 100%
			);
			filter: blur(3px);
		}

		:global(html.light) .t-molding::after {
			opacity: 0.15;
			box-shadow:
				inset 0 0 6px rgba(255, 255, 255, 0.3),
				0 0 8px var(--light-cabinet-accent, rgba(0, 150, 255, 0.3));
		}

		/* Refined corner accents for mobile light mode */
		:global(html.light) .corner-accent {
			opacity: 0.3;
			background: radial-gradient(
				circle at center,
				rgba(255, 255, 255, 0.7),
				rgba(255, 255, 255, 0.05) 70%,
				transparent 100%
			);
			filter: blur(1px);
		}

		/* Softer light spill for mobile light mode */
		:global(html.light) .light-spill {
			background: radial-gradient(
				circle at 50% 50%,
				var(--light-cabinet-accent, rgba(0, 150, 255, 0.1)),
				transparent 70%
			);
			opacity: 0.06;
			filter: blur(15px);
		}

		/* Subtler control panel light in mobile light mode */
		:global(html.light) .control-panel-light {
			opacity: 0.15;
			background: linear-gradient(
				to bottom,
				var(--light-cabinet-accent, rgba(0, 150, 255, 0.1)),
				transparent
			);
		}

		/* Adjust arcade-screen-wrapper margin for mobile */
		:global(html.light) .arcade-screen-wrapper {
			margin-top: calc(-0.8 * var(--navbar-height, 64px));
		}

		/* Ensure proper border-radius on all elements that need it */
		:global(html.light) .cabinet-plastic,
		:global(html.light) .arcade-screen-wrapper,
		:global(html.light) .screen-bezel {
			overflow: hidden;
			border-radius: var(--light-cabinet-border-radius, 12px);
		}

		/* Optimized star rendering for mobile */
		.star {
			width: 2px;
			height: 2px;
			transform: translateZ(0);
		}

		/* Reduce animation complexity on mobile */
		#header::before {
			animation-duration: 8s;
		}

		/* Optimize scanline effect for mobile */
		#scanline-overlay {
			animation-duration: 0.4s;
			background-size: 100% 6px;
		}
	}

	/* ==========================================================================
   High-End Devices (Detected by animation mode)
   ========================================================================== */
	:global(.animation-mode-normal) .star-container {
		/* Enhanced 3D transforms for high-end devices */
		transform: perspective(1000px) rotateX(5deg);
		animation: starContainerRotate 20s infinite linear;
	}

	:global(.animation-mode-normal) .glow::after {
		animation: glowPulse 4s infinite alternate;
	}

	@keyframes starContainerRotate {
		0% {
			transform: perspective(1000px) rotateX(5deg) rotateY(0deg);
		}
		100% {
			transform: perspective(1000px) rotateX(5deg) rotateY(360deg);
		}
	}

	@keyframes glowPulse {
		0% {
			opacity: var(--screen-glow-opacity);
			filter: blur(12px);
		}
		100% {
			opacity: calc(var(--screen-glow-opacity) * 0.7);
			filter: blur(8px);
		}
	}

	/* ==========================================================================
   Low-End Devices (Detected by animation mode)
   ========================================================================== */
	:global(.animation-mode-minimal) .phosphor-decay,
	:global(.animation-mode-minimal) .shadow-mask,
	:global(.animation-mode-minimal) .interlace,
	:global(.animation-mode-minimal) .glow::after {
		display: none !important;
	}

	:global(.animation-mode-minimal) #scanline-overlay {
		background-size: 100% 8px;
		opacity: 0.2;
		animation-duration: 0.6s;
	}

	:global(.animation-mode-minimal) .screen-reflection {
		opacity: 0.3;
	}

	/* ==========================================================================
   Mid-Range Devices (Detected by animation mode)
   ========================================================================== */
	:global(.animation-mode-reduced) .phosphor-decay,
	:global(.animation-mode-reduced) .shadow-mask {
		display: none !important;
	}

	:global(.animation-mode-reduced) .interlace {
		opacity: 0.3;
	}

	:global(.animation-mode-reduced) .glow::after {
		opacity: calc(var(--screen-glow-opacity) * 0.5);
		filter: blur(6px);
	}

	:global(.animation-mode-reduced) #scanline-overlay {
		background-size: 100% 6px;
		opacity: 0.3;
	}

	/* ==========================================================================
   Responsive Typography Optimizations
   ========================================================================== */
	@media (max-width: 640px) {
		#header {
			font-size: max(88px, min(12vw, 110px));
			line-height: 1.1;
			max-width: 90%;
		}

		#insert-concept {
			font-size: max(12px, min(4vw, 18px));
		}
	}

	/* ==========================================================================
   Performance Class for Intersection Observer
   ========================================================================== */
	.paused-animations .star,
	.paused-animations #header::before,
	.paused-animations #scanline-overlay,
	.paused-animations .phosphor-decay,
	.paused-animations .interlace {
		animation-play-state: paused !important;
	}
	/* Force GPU acceleration for key elements */
	/* Hardware acceleration helpers */
	.hardware-accelerated {
		transform: translateZ(0);
		backface-visibility: hidden;
		will-change: transform;
	}

	/* Mobile optimizations */
	@media (max-width: 767px) {
		/* Simplified effects for mobile */
		.screen-reflection {
			position: absolute;
			inset: 0;
			background: linear-gradient(
				35deg,
				transparent 0%,
				rgba(255, 255, 255, 0.03) 50%,
				transparent 100%
			);
			mix-blend-mode: normal;
			opacity: 0.5;
		}

		/* Remove expensive effects on mobile */
		.glow-effect,
		.phosphor-decay,
		.shadow-mask,
		.interlace {
			display: none;
		}

		/* Simplified arcade screen */
		#arcade-screen {
			box-shadow: 0 0 15px rgba(0, 0, 0, 0.5) !important;
			background: #111 !important;
		}

		/* Simplified bezel */
		.screen-bezel {
			box-shadow: none !important;
			background: #333 !important;
		}

		:global(html.light) .screen-bezel {
			background: linear-gradient(
				to bottom,
				rgba(210, 210, 210, 1) 0%,
				rgba(190, 190, 190, 1) 100%
			) !important;
			box-shadow:
				inset 0 2px 4px rgba(0, 0, 0, 0.15),
				0 0 1px rgba(255, 255, 255, 0.8),
				0 4px 6px rgba(0, 0, 0, 0.06) !important;
		}

		/* Simplified scanlines */
		#scanline-overlay {
			opacity: 0.3;
			background-size: 100% 6px !important;
		}
	}
</style>

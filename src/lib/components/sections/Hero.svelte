<!-- src/lib/components/section/Hero.svelte - OPTIMIZED FOR FAST STARTUP -->
<script lang="ts">
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { browser } from '$app/environment';
	import { gsap } from 'gsap';

	// SIMPLIFIED IMPORTS - Only essential components
	import ArcadeCtaButton from '$lib/components/ui/ArcadeCtaButton.svelte';
	import ArcadeNavigation from '$lib/components/ui/ArcadeNavigation.svelte';
	import GameScreen from '$lib/components/game/GameScreen.svelte';
	import StarField from '$lib/components/effects/StarField.svelte';
	import BoostCue from '$lib/components/ui/BoostCue.svelte';
	import ControlsPortal from '$lib/components/ui/ControlsPortal.svelte';
	import GameControls from '$lib/components/game/GameControls.svelte';

	// FAST STORES - Immediately available
	import {
		deviceCapabilities,
		deviceTier,
		maxStars,
		performanceMode,
		initializeCapabilitiesSync
	} from '$lib/utils/device-capabilities';
	import { isAnimating } from '$lib/stores/is-animating';
	import { layoutStore } from '$lib/stores/store';
	import { animationState, screenStore } from '$lib/stores/animation-store';

	// OPTIONAL IMPORTS - Load asynchronously for progressive enhancement
	import { frameRateController } from '$lib/utils/frame-rate-controller';
	import { animations } from '$lib/utils/animation-utils';

	// TYPES
	import type { GameState } from '$lib/types/game';

	// ======================================================================
	// FAST INITIALIZATION STATE
	// ======================================================================

	// Device detection - immediate, non-blocking
	let capabilities = initializeCapabilitiesSync();

	// Component state - minimal for fast startup
	let currentTimeline: gsap.core.Timeline | null = null;
	let header: HTMLElement;
	let insertConcept: HTMLElement;
	let arcadeScreen: HTMLElement;
	let starContainer: HTMLElement;
	let currentScreen = 'main';
	let hasError = false;

	// StarField state - simplified
	let starFieldComponent: StarField;
	let starFieldConfig = {
		starCount: capabilities.maxStars,
		baseSpeed: capabilities.tier === 'low' ? 0.3 : 0.5,
		boostSpeed: capabilities.tier === 'low' ? 2 : 4,
		enableBoost: true,
		maxDepth: 32
	};

	// Game state
	let currentGameState: GameState = 'idle';

	// Event dispatcher
	const dispatch = createEventDispatcher<{
		performanceChange: any;
		starFieldReady: void;
		starFieldError: { message: string };
	}>();

	// ======================================================================
	// PROGRESSIVE ENHANCEMENT MANAGERS (loaded async)
	// ======================================================================

	let glitchManager: InstanceType<typeof animations.GlitchManager> | null = null;
	let enhancedFeaturesLoaded = false;

	// ======================================================================
	// REACTIVE STATEMENTS - Simplified and fast
	// ======================================================================

	// Update starfield config when device capabilities change
	$: if ($deviceCapabilities && starFieldComponent) {
		starFieldConfig.starCount = $maxStars;
		starFieldConfig.baseSpeed = $deviceTier === 'low' ? 0.3 : 0.5;
		starFieldConfig.boostSpeed = $deviceTier === 'low' ? 2 : 4;
	}

	// Handle navbar height changes
	$: if (browser && $layoutStore?.navbarHeight !== undefined) {
		document.documentElement.style.setProperty('--navbar-height', `${$layoutStore.navbarHeight}px`);
	}

	// Screen change handling
	$: if (currentScreen === 'main' && starFieldComponent) {
		// Start StarField when on main screen
		requestAnimationFrame(() => {
			if (starFieldComponent) {
				starFieldComponent.start();
				startMainScreenAnimations();
			}
		});
	} else if (currentScreen !== 'main' && starFieldComponent) {
		// Stop StarField when not on main screen
		starFieldComponent.stop();
		stopMainScreenAnimations();
	}

	// ======================================================================
	// FAST STARTUP FUNCTIONS
	// ======================================================================

	/**
	 * IMMEDIATE initialization - no async dependencies
	 */
	function initializeImmediately() {
		// Set screen to main
		currentScreen = 'main';
		screenStore.set('main');

		// Apply basic optimizations based on device tier
		applyDeviceOptimizations();

		// Initialize glass effects
		initializeGlassEffects();
	}

	/**
	 * Apply device optimizations immediately
	 */
	function applyDeviceOptimizations() {
		if (!browser) return;

		const tier = capabilities.tier;

		// Set data attributes for CSS targeting
		document.documentElement.setAttribute('data-device-tier', tier);
		document.documentElement.setAttribute(
			'data-device-type',
			capabilities.isMobile ? 'mobile' : 'desktop'
		);

		// iOS-specific optimizations
		if (capabilities.isIOS && arcadeScreen) {
			arcadeScreen.style.transform = 'translateZ(0)';
			arcadeScreen.style.backfaceVisibility = 'hidden';
			arcadeScreen.classList.add('ios-optimized');
		}
	}

	/**
	 * Start main screen animations immediately
	 */
	function startMainScreenAnimations() {
		if (!header || !insertConcept || !arcadeScreen) return;

		const elements = { header, insertConcept, arcadeScreen };

		// Create and start GSAP timeline immediately
		currentTimeline = createOptimizedTimeline(elements);
		if (currentTimeline) {
			currentTimeline.play();
		}

		// Update animation state
		isAnimating.set(true);
		animationState.update((state) => ({ ...state, isAnimating: true }));
	}

	/**
	 * Stop main screen animations
	 */
	function stopMainScreenAnimations() {
		if (currentTimeline) {
			currentTimeline.kill();
			currentTimeline = null;
		}

		// Clean up GSAP animations on elements
		if (header) gsap.killTweensOf(header);
		if (insertConcept) gsap.killTweensOf(insertConcept);
		if (arcadeScreen) gsap.killTweensOf(arcadeScreen);

		// Update animation state
		isAnimating.set(false);
		animationState.update((state) => ({ ...state, isAnimating: false }));
	}

	/**
	 * Create optimized GSAP timeline - fast and lightweight
	 */
	function createOptimizedTimeline(elements: any): gsap.core.Timeline | null {
		if (!browser) return null;

		try {
			const isMobile = capabilities.isMobile;
			const isLowPerformance = capabilities.tier === 'low';

			const timeline = gsap.timeline({
				paused: true,
				defaults: {
					ease: 'power1.inOut',
					immediateRender: false,
					overwrite: true
				}
			});

			if (isLowPerformance) {
				// Simplified animations for low performance
				timeline.to(elements.insertConcept, {
					duration: 1.5,
					opacity: 0.3,
					yoyo: true,
					repeat: -1
				});
			} else {
				// Standard animations
				const animDuration = isMobile ? 0.15 : 0.1;
				const animDistance = isMobile ? 1 : 2;
				const opacityDuration = isMobile ? 1.5 : 1;

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
			}

			return timeline;
		} catch (error) {
			console.error('Failed to create GSAP timeline:', error);
			return null;
		}
	}

	/**
	 * Initialize glass effects immediately
	 */
	function initializeGlassEffects() {
		if (!browser) return;

		// Set basic glass properties
		if (currentScreen === 'game') {
			document.documentElement.style.setProperty('--glass-reflectivity', '0.12');
			document.documentElement.style.setProperty('--glass-dust-opacity', '0.02');
		} else {
			document.documentElement.style.setProperty('--glass-reflectivity', '0.15');
			document.documentElement.style.setProperty('--glass-dust-opacity', '0.03');
		}
	}

	// ======================================================================
	// PROGRESSIVE ENHANCEMENT (loads after initial render)
	// ======================================================================

	/**
	 * Load enhanced features asynchronously
	 */
	async function loadEnhancedFeatures() {
		if (enhancedFeaturesLoaded || capabilities.tier === 'low') return;

		try {
			// Load glitch effects for medium/high tier devices
			if (capabilities.tier !== 'low' && animations?.GlitchManager) {
				glitchManager = new animations.GlitchManager();
				if (header && glitchManager.start) {
					glitchManager.start([header]);
				}
			}

			// Setup advanced glass effects
			setupAdvancedGlassEffects();

			// Setup performance monitoring
			setupPerformanceMonitoring();

			enhancedFeaturesLoaded = true;
			console.log('✨ Enhanced features loaded');
		} catch (error) {
			console.warn('Failed to load enhanced features:', error);
		}
	}

	/**
	 * Setup advanced glass effects with mouse interaction
	 */
	function setupAdvancedGlassEffects() {
		if (!browser || capabilities.tier === 'low') return;

		const glassContainer = document.querySelector('.screen-glass-container');
		if (!glassContainer) return;

		const handleMouseMove = (e: MouseEvent) => {
			const rect = glassContainer.getBoundingClientRect();
			const centerX = rect.left + rect.width / 2;
			const centerY = rect.top + rect.height / 2;

			const offsetX = (e.clientX - centerX) / (rect.width / 2);
			const offsetY = (e.clientY - centerY) / (rect.height / 2);

			const maxMove = 8;
			const moveX = offsetX * maxMove;
			const moveY = offsetY * maxMove;

			const specular = glassContainer.querySelector('.screen-glass-specular');
			const reflection = glassContainer.querySelector('.screen-glass-reflection');

			if (specular) {
				(specular as HTMLElement).style.transform =
					`translate(${-moveX * 0.8}px, ${-moveY * 0.8}px)`;
				(specular as HTMLElement).style.opacity = String(0.2 + Math.abs(offsetX * offsetY) * 0.1);
			}

			if (reflection) {
				(reflection as HTMLElement).style.transform =
					`translate(${moveX * 0.3}px, ${moveY * 0.3}px)`;
			}
		};

		// Throttled mouse handler
		let ticking = false;
		const throttledHandler = (e: MouseEvent) => {
			if (!ticking) {
				requestAnimationFrame(() => {
					handleMouseMove(e);
					ticking = false;
				});
				ticking = true;
			}
		};

		document.addEventListener('mousemove', throttledHandler, { passive: true });

		// Store cleanup function
		return () => {
			document.removeEventListener('mousemove', throttledHandler);
		};
	}

	/**
	 * Setup performance monitoring
	 */
	function setupPerformanceMonitoring() {
		if (!frameRateController || capabilities.tier === 'low') return;

		try {
			frameRateController.setTargetFPS(capabilities.tier === 'high' ? 60 : 30);
			frameRateController.setAdaptiveEnabled(true);
		} catch (error) {
			console.warn('Performance monitoring setup failed:', error);
		}
	}

	// ======================================================================
	// EVENT HANDLERS
	// ======================================================================

	function handleScreenChange(event: CustomEvent) {
		const newScreen = event.detail;
		if (newScreen === currentScreen) return;

		currentScreen = newScreen;
		screenStore.set(newScreen);

		// Update glass effects for new screen
		requestAnimationFrame(() => {
			initializeGlassEffects();
		});
	}

	function handleStarFieldReady() {
		console.log('✅ StarField ready');
		dispatch('starFieldReady');

		// Load enhanced features after StarField is ready
		setTimeout(() => {
			loadEnhancedFeatures();
		}, 500);
	}

	function handleStarFieldError(event: CustomEvent<{ message: string }>) {
		const { message } = event.detail;
		hasError = true;
		console.error('❌ StarField error:', message);
		dispatch('starFieldError', { message });
	}

	function handlePerformanceChange(event: CustomEvent) {
		dispatch('performanceChange', event.detail);
	}

	function handleBoost(active: boolean) {
		if (starFieldComponent) {
			if (active) {
				starFieldComponent.boost();
			} else {
				starFieldComponent.unboost();
			}
		}
	}

	function handleControlInput(event: CustomEvent) {
		if (!browser) return;

		const { detail } = event;
		if (detail.type === 'joystick') {
			requestAnimationFrame(() => {
				if (detail.value.x < -0.5) {
					window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
				} else if (detail.value.x > 0.5) {
					window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
				}
			});
		}
	}

	function handleGameStateChange(event: { detail: { state: GameState } }) {
		currentGameState = event.detail.state;
	}

	// ======================================================================
	// LIFECYCLE - Optimized for fast startup
	// ======================================================================

	onMount(() => {
		if (!browser) return;

		// IMMEDIATE initialization - no delays
		initializeImmediately();

		// Power-up sequence
		if (arcadeScreen) {
			arcadeScreen.classList.add('power-sequence');
		}

		// Start animations immediately when elements are ready
		const checkElements = () => {
			if (header && insertConcept && arcadeScreen) {
				startMainScreenAnimations();
			} else {
				requestAnimationFrame(checkElements);
			}
		};

		requestAnimationFrame(checkElements);
	});

	onDestroy(() => {
		if (!browser) return;

		// Stop animations
		stopMainScreenAnimations();

		// Clean up glitch manager
		if (glitchManager?.cleanup) {
			glitchManager.cleanup();
		}

		// Clear DOM references
		header = null!;
		insertConcept = null!;
		arcadeScreen = null!;
		starContainer = null!;
		currentTimeline = null;

		// Reset animation state
		animationState.reset();
	});
</script>

<!-- TEMPLATE - Simplified structure for fast rendering -->
<section
	id="hero"
	class="w-full relative overflow-hidden flex items-center justify-center hardware-accelerated"
	style="
		margin-top: calc(-0.5 * {$layoutStore.navbarHeight}px);
		height: calc(100vh + {$layoutStore.navbarHeight}px);
	"
>
	<div
		id="arcade-cabinet"
		class="cabinet-metal w-full h-full relative flex items-center justify-center overflow-hidden hardware-accelerated"
	>
		<div class="cabinet-plastic overflow-hidden hardware-accelerated">
			<div class="cabinet-background absolute inset-0"></div>
			<div class="cabinet-wear absolute inset-0"></div>

			<div
				class="arcade-screen-wrapper relative overflow-hidden hardware-accelerated"
				style="margin-top: calc(-1 * var(--navbar-height, 64px));"
			>
				<!-- Navigation -->
				<div class="navigation-wrapper relative z-50">
					<ArcadeNavigation on:changeScreen={handleScreenChange} />
				</div>

				<!-- Screen bezel -->
				<div class="screen-bezel rounded-[3vmin] overflow-hidden"></div>

				<!-- Main screen -->
				<div
					id="arcade-screen"
					class="crt-screen hardware-accelerated relative glow rounded-[3vmin] overflow-hidden will-change-transform"
					bind:this={arcadeScreen}
				>
					<!-- CRT effects -->
					<div class="phosphor-decay rounded-[3vmin]"></div>
					<div class="shadow-mask rounded-[3vmin]"></div>
					<div class="interlace rounded-[3vmin]"></div>
					<div class="screen-reflection rounded-[3vmin]"></div>
					<div class="screen-glare rounded-[3vmin]"></div>
					<div class="glow-effect rounded-[3vmin]"></div>

					<!-- MAIN SCREEN CONTENT -->
					{#if currentScreen === 'main'}
						<!-- StarField Background -->
						<div
							id="space-background"
							class="absolute inset-0 overflow-hidden pointer-events-none rounded-[3vmin] hardware-accelerated"
						>
							<div
								class="canvas-star-container absolute inset-0 pointer-events-none rounded-[3vmin] hardware-accelerated"
								bind:this={starContainer}
							>
								<!-- SIMPLIFIED STARFIELD - Single source of truth -->
								<StarField
									bind:this={starFieldComponent}
									containerElement={starContainer}
									starCount={starFieldConfig.starCount}
									enableBoost={starFieldConfig.enableBoost}
									baseSpeed={starFieldConfig.baseSpeed}
									boostSpeed={starFieldConfig.boostSpeed}
									maxDepth={starFieldConfig.maxDepth}
									autoStart={true}
									on:performanceChange={handlePerformanceChange}
									on:ready={handleStarFieldReady}
									on:error={handleStarFieldError}
								/>
							</div>
						</div>

						<!-- Main Content -->
						<div
							id="text-wrapper"
							class="absolute inset-0 flex flex-col items-center justify-center z-0 p-2 mt-12 box-border"
						>
							<!-- Header -->
							<div id="header" class="text-center mb-2 animate-transform" bind:this={header}>
								Power-up Your Brand!
							</div>

							<!-- CTA Button -->
							<div class="mt-6">
								<ArcadeCtaButton />
							</div>

							<!-- Insert Concept -->
							<div
								id="insert-concept"
								class="text-center mt-3 animate-opacity"
								bind:this={insertConcept}
							>
								Insert Concept
							</div>

							<!-- Boost Cue -->
							<BoostCue on:boost={(e) => handleBoost(e.detail)} />
						</div>

						<!-- GAME SCREEN -->
					{:else if currentScreen === 'game'}
						<GameScreen on:stateChange={handleGameStateChange} />
					{/if}

					<!-- Glass Effects -->
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

					<!-- Scanline overlay -->
					<div
						id="scanline-overlay"
						class="absolute inset-0 pointer-events-none z-10 rounded-[3vmin]"
					></div>
				</div>
			</div>
		</div>
	</div>

	<!-- Game Controls (only for game screen) -->
	{#if currentScreen === 'game'}
		<ControlsPortal>
			<div class="controls-container">
				<GameControls
					on:control={handleControlInput}
					gameState={currentGameState}
					allowReset={currentGameState === 'gameover'}
				/>
			</div>
		</ControlsPortal>
	{/if}
</section>

<!-- STYLES - Same as original but optimized for fast rendering -->
<style lang="css">
	/* Inherit all the existing styles from the original Hero.svelte */
	/* The CSS remains the same - optimization is in the JavaScript logic */
	@import './Hero.styles.css'; /* Move styles to separate file if preferred */

	/* Additional optimizations for fast startup */
	.hardware-accelerated {
		transform: translateZ(0);
		backface-visibility: hidden;
		perspective: 1000px;
		will-change: transform, opacity;
		contain: layout style paint;
	}

	/* Optimize for reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.animate-transform,
		.animate-opacity {
			animation: none !important;
			transition: none !important;
		}
	}

	/* Fast loading states */
	.power-sequence {
		animation: powerUpSequence 1.5s ease-out; /* Faster startup */
	}

	/* Low performance optimizations */
	html[data-device-tier='low'] .shadow-mask,
	html[data-device-tier='low'] .interlace,
	html[data-device-tier='low'] .phosphor-decay {
		display: none;
	}

	html[data-device-tier='low'] #scanline-overlay {
		opacity: 0.3;
		animation: none;
	}
</style>

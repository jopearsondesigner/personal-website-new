<!-- src/lib/components/section/Hero.svelte - FULL FEATURED WITH OPTIMIZED LOADING -->
<script lang="ts">
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { browser } from '$app/environment';
	import { gsap } from 'gsap';

	// CORE COMPONENTS - Essential imports
	import ArcadeCtaButton from '$lib/components/ui/ArcadeCtaButton.svelte';
	import ArcadeNavigation from '$lib/components/ui/ArcadeNavigation.svelte';
	import GameScreen from '$lib/components/game/GameScreen.svelte';
	import StarField from '$lib/components/effects/StarField.svelte';
	import BoostCue from '$lib/components/ui/BoostCue.svelte';
	import ControlsPortal from '$lib/components/ui/ControlsPortal.svelte';
	import GameControls from '$lib/components/game/GameControls.svelte';

	// TOUCHMANAGER INTEGRATION - Full feature preservation
	import {
		TouchManager,
		createZoomPreventionHandler,
		createUITouchHandler,
		TOUCH_PRIORITIES,
		isTouchSupported,
		isMobileDevice
	} from '$lib/utils/touch-manager';
	import type { TouchHandler } from '$lib/utils/touch-manager';

	// DEVICE CAPABILITIES - Fast + Enhanced detection
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

	// PERFORMANCE IMPORTS - Non-blocking loading
	import { frameRateController } from '$lib/utils/frame-rate-controller';
	import { animations } from '$lib/utils/animation-utils';

	// TYPES
	import type { GameState } from '$lib/types/game';

	// ======================================================================
	// OPTIMIZED INITIALIZATION STATE
	// ======================================================================

	// IMMEDIATE device detection - synchronous for fast startup
	let capabilities = initializeCapabilitiesSync();

	// Component state - optimized for fast render
	let currentTimeline: gsap.core.Timeline | null = null;
	let header: HTMLElement;
	let insertConcept: HTMLElement;
	let arcadeScreen: HTMLElement;
	let starContainer: HTMLElement;
	let currentScreen = 'main';
	let hasError = false;
	let isBaseInitialized = false;
	let isFullyInitialized = false;

	// TouchManager state - full preservation
	let touchHandlers: TouchHandler[] = [];
	let zoomPreventionHandler: TouchHandler | null = null;
	let advancedTouchFeaturesSetup = false;

	// StarField state - enhanced configuration
	let starFieldComponent: StarField;
	let starFieldConfig = {
		starCount: capabilities?.maxStars || 300,
		baseSpeed: capabilities?.tier === 'low' ? 0.3 : 0.5,
		boostSpeed: capabilities?.tier === 'low' ? 2 : 4,
		enableBoost: true,
		maxDepth: 32,
		enableGlow: capabilities?.tier !== 'low',
		enableTrails: capabilities?.tier === 'high',
		enableAdaptiveQuality: true,
		enableHighDPI: capabilities?.tier !== 'low',
		targetFPS: capabilities?.tier === 'low' ? 30 : 60
	};

	// Game state
	let currentGameState: GameState = 'idle';

	// Event dispatcher
	const dispatch = createEventDispatcher<{
		performanceChange: any;
		starFieldReady: void;
		starFieldError: { message: string };
	}>();

	// Progressive enhancement managers - preserved functionality
	let glitchManager: InstanceType<typeof animations.GlitchManager> | null = null;
	let enhancedFeaturesLoaded = false;
	let performanceMonitoringSetup = false;
	let advancedGlassCleanup: (() => void) | null = null;

	// ======================================================================
	// REACTIVE STATEMENTS - Optimized but complete
	// ======================================================================

	// Update starfield config when device capabilities change
	$: if ($deviceCapabilities && starFieldComponent && isBaseInitialized) {
		starFieldConfig.starCount = $maxStars;
		starFieldConfig.baseSpeed = $deviceTier === 'low' ? 0.3 : 0.5;
		starFieldConfig.boostSpeed = $deviceTier === 'low' ? 2 : 4;
		starFieldConfig.enableGlow = $deviceTier !== 'low';
		starFieldConfig.enableTrails = $deviceTier === 'high';
		starFieldConfig.enableHighDPI = $deviceTier !== 'low';
	}

	// Handle navbar height changes
	$: if (browser && $layoutStore?.navbarHeight !== undefined) {
		document.documentElement.style.setProperty('--navbar-height', `${$layoutStore.navbarHeight}px`);
	}

	// Screen change handling with optimization
	$: if (currentScreen === 'main' && starFieldComponent && isBaseInitialized) {
		requestAnimationFrame(() => {
			if (starFieldComponent) {
				starFieldComponent.start();
				startMainScreenAnimations();
			}
		});
	} else if (currentScreen !== 'main' && starFieldComponent) {
		starFieldComponent.stop();
		stopMainScreenAnimations();
	}

	// ======================================================================
	// PHASE 1: FAST BASE INITIALIZATION (0-100ms)
	// ======================================================================

	/**
	 * IMMEDIATE base initialization - synchronous, essential only
	 */
	function initializeBaseFast() {
		if (!browser || isBaseInitialized) return;

		console.log('⚡ Phase 1: Fast base initialization...');

		// Set screen state immediately
		currentScreen = 'main';
		screenStore.set('main');

		// Apply immediate device optimizations
		applyImmediateDeviceOptimizations();

		// Initialize basic glass effects
		initializeBasicGlassEffects();

		// Setup essential TouchManager features if needed
		if (isTouchSupported()) {
			setupEssentialTouchHandling();
		}

		// Mark base as initialized
		isBaseInitialized = true;

		console.log('✅ Phase 1: Base initialization complete');

		// Schedule Phase 2 immediately but non-blocking
		requestAnimationFrame(() => {
			initializeEnhancedFeatures();
		});
	}

	/**
	 * Apply immediate device optimizations - no async operations
	 */
	function applyImmediateDeviceOptimizations() {
		if (!browser || !capabilities) return;

		const tier = capabilities.tier;

		// Set data attributes for immediate CSS targeting
		document.documentElement.setAttribute('data-device-tier', tier);
		document.documentElement.setAttribute(
			'data-device-type',
			capabilities.isMobile ? 'mobile' : 'desktop'
		);

		// Enhanced mobile touch detection
		if (isTouchSupported()) {
			document.documentElement.setAttribute('data-touch-device', 'true');
		}

		if (isMobileDevice()) {
			document.documentElement.setAttribute('data-mobile-device', 'true');
		}

		// Browser-specific immediate optimizations
		if (capabilities.browserInfo?.isSafari && arcadeScreen) {
			arcadeScreen.style.transform = 'translateZ(0)';
			arcadeScreen.style.backfaceVisibility = 'hidden';
			arcadeScreen.classList.add('safari-optimized');
		}

		// Low power device optimizations
		if (capabilities.isLowPowerDevice) {
			document.documentElement.setAttribute('data-low-power', 'true');
		}
	}

	/**
	 * Setup essential TouchManager features - immediate, critical only
	 */
	function setupEssentialTouchHandling() {
		if (!browser || !isTouchSupported()) return;

		console.log('👆 Setting up essential touch handling...');

		// Create zoom prevention handler for arcade screen - essential for UX
		if (arcadeScreen) {
			zoomPreventionHandler = createZoomPreventionHandler(arcadeScreen);
			TouchManager.registerHandler(zoomPreventionHandler);
			touchHandlers.push(zoomPreventionHandler);
		}

		// Enable zoom prevention globally for arcade experience
		TouchManager.setZoomPrevention(true);

		console.log('👆 Essential touch handling setup complete');
	}

	// ======================================================================
	// PHASE 2: ENHANCED INITIALIZATION (100-500ms)
	// ======================================================================

	/**
	 * Load enhanced features - comprehensive but non-blocking
	 */
	async function initializeEnhancedFeatures() {
		if (enhancedFeaturesLoaded || !capabilities) return;

		console.log('✨ Phase 2: Enhanced features loading...');

		try {
			// Load performance monitoring
			await setupPerformanceMonitoring();

			// Load advanced TouchManager features
			await setupAdvancedTouchFeatures();

			// Load glitch effects for medium/high tier devices
			if (capabilities.tier !== 'low' && animations?.GlitchManager) {
				glitchManager = new animations.GlitchManager();
				if (header && glitchManager.start) {
					glitchManager.start([header]);
				}
			}

			// Setup advanced glass effects
			advancedGlassCleanup = setupAdvancedGlassEffects();

			enhancedFeaturesLoaded = true;
			isFullyInitialized = true;

			console.log('✅ Phase 2: Enhanced features loaded');
		} catch (error) {
			console.warn('Enhanced features failed to load:', error);
			// Continue without enhanced features
			isFullyInitialized = true;
		}
	}

	/**
	 * Setup performance monitoring - non-blocking
	 */
	async function setupPerformanceMonitoring() {
		if (performanceMonitoringSetup || !frameRateController || capabilities?.tier === 'low') return;

		try {
			frameRateController.setTargetFPS(capabilities.tier === 'high' ? 60 : 30);
			frameRateController.setAdaptiveEnabled(true);
			performanceMonitoringSetup = true;
			console.log('📊 Performance monitoring setup complete');
		} catch (error) {
			console.warn('Performance monitoring setup failed:', error);
		}
	}

	/**
	 * Setup advanced TouchManager features - comprehensive mobile support
	 */
	async function setupAdvancedTouchFeatures() {
		if (
			advancedTouchFeaturesSetup ||
			!browser ||
			capabilities?.tier === 'low' ||
			!isTouchSupported()
		)
			return;

		console.log('👆 Setting up advanced touch features...');

		// Add haptic feedback for boost (if supported) - preserved functionality
		if ('vibrate' in navigator && starFieldComponent) {
			const originalBoost = starFieldComponent.boost?.bind(starFieldComponent);
			const originalUnboost = starFieldComponent.unboost?.bind(starFieldComponent);

			if (originalBoost && originalUnboost) {
				starFieldComponent.boost = () => {
					originalBoost();
					// Light haptic feedback for boost start
					try {
						navigator.vibrate(50);
					} catch (e) {
						// Ignore vibration errors
					}
				};

				starFieldComponent.unboost = () => {
					originalUnboost();
					// Subtle haptic feedback for boost end
					try {
						navigator.vibrate(25);
					} catch (e) {
						// Ignore vibration errors
					}
				};
			}
		}

		// Setup additional UI touch handlers if needed
		setupUITouchHandlers();

		advancedTouchFeaturesSetup = true;
		console.log('👆 Advanced touch features setup complete');
	}

	/**
	 * Setup UI-specific touch handlers
	 */
	function setupUITouchHandlers() {
		if (!browser || !isTouchSupported()) return;

		// Create UI touch handler for better responsiveness
		const uiTouchHandler = createUITouchHandler(
			document.body,
			{
				onTouchStart: (e) => {
					// Enhanced touch start handling
					document.body.classList.add('touching');
				},
				onTouchEnd: (e) => {
					// Enhanced touch end handling
					document.body.classList.remove('touching');
				}
			},
			TOUCH_PRIORITIES.UI
		);

		if (uiTouchHandler) {
			TouchManager.registerHandler(uiTouchHandler);
			touchHandlers.push(uiTouchHandler);
		}
	}

	/**
	 * Cleanup TouchManager integration - comprehensive
	 */
	function cleanupTouchHandling() {
		if (!browser) return;

		console.log('👆 Cleaning up touch handling...');

		// Unregister all touch handlers
		touchHandlers.forEach((handler) => {
			TouchManager.unregisterHandler(handler.id);
		});

		touchHandlers = [];
		zoomPreventionHandler = null;

		// Reset TouchManager state
		TouchManager.setZoomPrevention(false);

		console.log('👆 Touch handling cleaned up');
	}

	// ======================================================================
	// ANIMATION FUNCTIONS - Preserved from original
	// ======================================================================

	/**
	 * Start main screen animations - optimized but complete
	 */
	function startMainScreenAnimations() {
		if (!header || !insertConcept || !arcadeScreen) return;

		const elements = { header, insertConcept, arcadeScreen };

		// Create and start GSAP timeline
		currentTimeline = createOptimizedTimeline(elements);
		if (currentTimeline) {
			currentTimeline.play();
		}

		// Update animation state
		isAnimating.set(true);
		animationState.update((state) => ({ ...state, isAnimating: true }));
	}

	/**
	 * Stop main screen animations - preserved functionality
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
	 * Create optimized GSAP timeline - enhanced from original
	 */
	function createOptimizedTimeline(elements: any): gsap.core.Timeline | null {
		if (!browser || !capabilities) return null;

		try {
			const isMobile = capabilities.isMobile;
			const isLowPerformance = capabilities.tier === 'low';
			const prefersReducedMotion = capabilities.prefersReducedMotion;

			const timeline = gsap.timeline({
				paused: true,
				defaults: {
					ease: 'power1.inOut',
					immediateRender: false,
					overwrite: true
				}
			});

			if (isLowPerformance || prefersReducedMotion) {
				// Simplified animations for low performance or accessibility
				timeline.to(elements.insertConcept, {
					duration: 1.5,
					opacity: 0.3,
					yoyo: true,
					repeat: -1
				});
			} else {
				// Standard animations - preserved complexity
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
	 * Initialize glass effects - immediate basic setup
	 */
	function initializeBasicGlassEffects() {
		if (!browser) return;

		// Set basic glass properties based on screen
		if (currentScreen === 'game') {
			document.documentElement.style.setProperty('--glass-reflectivity', '0.12');
			document.documentElement.style.setProperty('--glass-dust-opacity', '0.02');
		} else {
			document.documentElement.style.setProperty('--glass-reflectivity', '0.15');
			document.documentElement.style.setProperty('--glass-dust-opacity', '0.03');
		}
	}

	/**
	 * Setup advanced glass effects - preserved sophisticated interaction
	 */
	function setupAdvancedGlassEffects(): (() => void) | null {
		if (!browser || !capabilities || capabilities.tier === 'low') return null;

		const glassContainer = document.querySelector('.screen-glass-container');
		if (!glassContainer) return null;

		const handleMouseMove = (e: MouseEvent) => {
			const rect = glassContainer.getBoundingClientRect();
			const centerX = rect.left + rect.width / 2;
			const centerY = rect.top + rect.height / 2;

			const offsetX = (e.clientX - centerX) / (rect.width / 2);
			const offsetY = (e.clientY - centerY) / (rect.height / 2);

			const maxMove = capabilities.isMobile ? 4 : 8;
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

		// Throttled mouse handler - preserved optimization
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

		// Return cleanup function
		return () => {
			document.removeEventListener('mousemove', throttledHandler);
		};
	}

	// ======================================================================
	// EVENT HANDLERS - Preserved functionality
	// ======================================================================

	function handleScreenChange(event: CustomEvent) {
		const newScreen = event.detail;
		if (newScreen === currentScreen) return;

		currentScreen = newScreen;
		screenStore.set(newScreen);

		// Update glass effects for new screen
		requestAnimationFrame(() => {
			initializeBasicGlassEffects();
		});
	}

	function handleStarFieldReady() {
		console.log('✅ StarField ready');
		dispatch('starFieldReady');

		// Trigger enhanced features loading if not already done
		if (!enhancedFeaturesLoaded) {
			setTimeout(() => {
				initializeEnhancedFeatures();
			}, 200);
		}
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
	// LIFECYCLE - Optimized loading phases
	// ======================================================================

	onMount(() => {
		if (!browser) return;

		console.log('🚀 Hero component mounting...');

		// PHASE 1: Immediate base initialization (0-100ms)
		initializeBaseFast();

		// Power-up sequence for visual feedback
		if (arcadeScreen) {
			arcadeScreen.classList.add('power-sequence');
		}

		// Start animations as soon as elements are ready
		const checkElements = () => {
			if (header && insertConcept && arcadeScreen && isBaseInitialized) {
				startMainScreenAnimations();
			} else {
				requestAnimationFrame(checkElements);
			}
		};

		requestAnimationFrame(checkElements);

		console.log('✅ Hero component mounted with optimized loading');
	});

	onDestroy(() => {
		if (!browser) return;

		console.log('🧹 Cleaning up Hero component...');

		// Stop animations
		stopMainScreenAnimations();

		// Clean up TouchManager integration
		cleanupTouchHandling();

		// Clean up glitch manager
		if (glitchManager?.cleanup) {
			glitchManager.cleanup();
		}

		// Clean up advanced glass effects
		if (advancedGlassCleanup) {
			advancedGlassCleanup();
		}

		// Clear DOM references
		header = null!;
		insertConcept = null!;
		arcadeScreen = null!;
		starContainer = null!;
		currentTimeline = null;

		// Reset animation state
		animationState.reset();

		console.log('✅ Hero component cleanup complete');
	});
</script>

<!-- TEMPLATE - Complete preservation with optimized structure -->
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
					class="crt-screen hardware-accelerated relative glow rounded-[3vmin] overflow-hidden will-change-transform touch-screen"
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
								<!-- ENHANCED STARFIELD WITH FULL TOUCHMANAGER INTEGRATION -->
								<StarField
									bind:this={starFieldComponent}
									containerElement={starContainer}
									starCount={starFieldConfig.starCount}
									enableBoost={starFieldConfig.enableBoost}
									baseSpeed={starFieldConfig.baseSpeed}
									boostSpeed={starFieldConfig.boostSpeed}
									maxDepth={starFieldConfig.maxDepth}
									enableGlow={starFieldConfig.enableGlow}
									enableTrails={starFieldConfig.enableTrails}
									enableAdaptiveQuality={starFieldConfig.enableAdaptiveQuality}
									enableHighDPI={starFieldConfig.enableHighDPI}
									targetFPS={starFieldConfig.targetFPS}
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

					<!-- Glass Effects - Complete preservation -->
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

<!-- STYLES - Enhanced with all optimizations preserved -->
<style lang="css">
	@import './Hero.styles.css';

	/* Additional optimizations and enhancements below */

	/* Hardware acceleration for all key elements */
	.hardware-accelerated {
		transform: translateZ(0);
		backface-visibility: hidden;
		perspective: 1000px;
		will-change: transform, opacity;
		contain: layout style paint;
	}

	/* Touch screen optimizations - preserved functionality */
	.touch-screen {
		touch-action: pan-x pan-y; /* Allow panning but prevent zoom */
		-webkit-touch-callout: none; /* Disable iOS callout */
		-webkit-user-select: none; /* Disable text selection */
		user-select: none;
	}

	/* Mobile touch device optimizations */
	html[data-touch-device='true'] .arcade-screen-wrapper {
		/* Prevent bounce scrolling on mobile */
		-webkit-overflow-scrolling: touch;
		overscroll-behavior: contain;
	}

	html[data-mobile-device='true'] .screen-glass-container {
		/* Optimize glass effects on mobile */
		opacity: 0.9;
	}

	/* Enhanced touching state for better mobile feedback */
	body.touching .touch-screen {
		transform: translateZ(1px); /* Subtle depth change on touch */
	}

	/* Power-up sequence animation - preserved timing */
	.power-sequence {
		animation: powerUpSequence 1.5s ease-out;
	}

	@keyframes powerUpSequence {
		0% {
			opacity: 0;
			transform: scale(0.98);
		}
		50% {
			opacity: 0.8;
			transform: scale(1.01);
		}
		100% {
			opacity: 1;
			transform: scale(1);
		}
	}

	/* Device tier optimizations - preserved performance features */
	html[data-device-tier='low'] .shadow-mask,
	html[data-device-tier='low'] .interlace,
	html[data-device-tier='low'] .phosphor-decay {
		display: none;
	}

	html[data-device-tier='low'] #scanline-overlay {
		opacity: 0.3;
		animation: none;
	}

	html[data-device-tier='low'] .glow-effect {
		opacity: 0.5;
	}

	/* Safari-specific optimizations - enhanced */
	.safari-optimized {
		-webkit-transform: translate3d(0, 0, 0);
		-webkit-backface-visibility: hidden;
		-webkit-perspective: 1000px;
	}

	html[data-browser='safari'] .hardware-accelerated {
		/* Additional Safari optimizations */
		transform: translate3d(0, 0, 0);
		-webkit-transform: translate3d(0, 0, 0);
		-webkit-backface-visibility: hidden;
	}

	/* Low power device optimizations */
	html[data-low-power='true'] .glow-effect,
	html[data-low-power='true'] .screen-glass-specular {
		opacity: 0.3;
	}

	html[data-low-power='true'] .phosphor-decay,
	html[data-low-power='true'] .interlace {
		display: none;
	}

	/* Accessibility - preserve reduced motion support */
	@media (prefers-reduced-motion: reduce) {
		.animate-transform,
		.animate-opacity,
		.power-sequence {
			animation: none !important;
			transition: none !important;
		}

		.glow-effect {
			animation: none !important;
		}
	}

	/* Enhanced touch feedback animations */
	html[data-touch-device='true'] .hardware-accelerated {
		/* Better hardware acceleration for touch devices */
		transform: translate3d(0, 0, 0);
		-webkit-transform: translate3d(0, 0, 0);
	}

	/* Animation optimizations based on performance tier */
	html[data-device-tier='high'] .animate-transform {
		animation-duration: 0.08s; /* Faster on high-end devices */
	}

	html[data-device-tier='medium'] .animate-transform {
		animation-duration: 0.1s; /* Standard timing */
	}

	html[data-device-tier='low'] .animate-transform {
		animation-duration: 0.15s; /* Slower on low-end devices */
	}
</style>

<!-- DO NOT REMOVE THIS COMMENT
src/lib/components/section/Hero.svelte
DO NOT REMOVE THIS COMMENT -->
<script lang="ts">
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { browser } from '$app/environment';
	import { gsap } from 'gsap';
	import ArcadeCtaButton from '$lib/components/ui/ArcadeCtaButton.svelte';
	import ArcadeNavigation from '$lib/components/ui/ArcadeNavigation.svelte';
	import GameScreen from '$lib/components/game/GameScreen.svelte';
	import { animations } from '$lib/utils/animation-utils';
	import type { Star } from '$lib/utils/animation-utils';

	// OPTIMIZED IMPORTS - Enhanced stores and utilities
	import {
		animationState,
		screenStore,
		currentFPS,
		performanceMode,
		starFieldMode,
		isAnimating
	} from '$lib/stores/animation-store';
	import { layoutStore } from '$lib/stores/store';
	import ControlsPortal from '$lib/components/ui/ControlsPortal.svelte';
	import GameControls from '$lib/components/game/GameControls.svelte';

	// OPTIMIZED PERFORMANCE UTILITIES
	import {
		deviceCapabilities,
		deviceTier,
		maxStars,
		targetFPS,
		animationQuality,
		isLowPowerDevice,
		getOptimalSettings,
		shouldEnableEffect
	} from '$lib/utils/device-capabilities';
	import { CanvasStarFieldManager } from '$lib/utils/canvas-star-field';
	import {
		memoryManager,
		memoryPressure,
		getOptimalStarCount,
		isMemoryPressureHigh
	} from '$lib/utils/memory-manager';
	import {
		frameRateController,
		fpsStore,
		getOptimalSettings as getFrameSettings,
		isHighPerformanceDevice
	} from '$lib/utils/frame-rate-controller';
	import {
		createThrottledRAF,
		detectDevicePerformance,
		createPerformanceMonitor
	} from '$lib/utils/animation-helpers';

	// OPTIMIZED COMPONENTS
	import StarField from '$lib/components/effects/StarField.svelte';
	import BoostCue from '$lib/components/ui/BoostCue.svelte';
	import type { GameState } from '$lib/types/game';
	import type { PerformanceMetrics, StarFieldEvents } from '$lib/types/animation';

	// ENHANCED DEVICE DETECTION STATE
	let isMobileDevice = false;
	let isLowPerformanceDevice = false;
	let devicePerformanceLevel: 'low' | 'medium' | 'high' = 'medium';

	// OPTIMIZED COMPONENT STATE
	let currentTimeline: gsap.core.Timeline | null = null;
	let header: HTMLElement;
	let insertConcept: HTMLElement;
	let arcadeScreen: HTMLElement;
	let starContainer: HTMLElement;
	let spaceBackground: HTMLElement;
	let currentScreen = 'main';
	let stars: Star[] = [];
	let starFieldManager: InstanceType<typeof animations.StarFieldManager>;
	let canvasStarFieldManager: CanvasStarFieldManager | null = null;
	let glitchManager: InstanceType<typeof animations.GlitchManager>;
	let resizeObserver: ResizeObserver | null = null;
	let orientationTimeout: number | null = null;
	let hasError = false;

	// ENHANCED PERFORMANCE MONITORING
	let performanceMonitor: ReturnType<typeof createPerformanceMonitor> | null = null;
	let frameRateUnsubscribe: Function | null = null;
	let memoryCleanupTask: (() => void) | null = null;
	let qualityUnsubscribe: Function | null = null;

	// OPTIMIZED EVENT HANDLERS
	let eventHandlers: {
		resize?: EventListener;
		orientationChange?: EventListener;
		visibility?: EventListener;
		touchStart?: EventListener;
		glassEffects?: EventListener;
	} = {};

	// ENHANCED STARFIELD CONFIGURATION
	let starFieldComponent: StarField;
	let starFieldConfig = {
		starCount: 200,
		baseSpeed: 0.5,
		boostSpeed: 3,
		enableGlow: true,
		enableTrails: true,
		adaptiveQuality: true,
		enableBlur: false,
		enableShadows: false,
		enableParallax: false
	};

	// PERFORMANCE STATE
	let performanceMetrics: PerformanceMetrics = {
		fps: 60,
		frameTime: 16,
		memoryUsage: 0,
		activeStars: 0,
		droppedFrames: 0,
		quality: 1.0,
		deviceTier: 'medium',
		renderMode: 'canvas',
		workerActive: false,
		offscreenCanvas: false,
		lastUpdate: Date.now()
	};

	// COMPONENT STATE FLAGS
	let isStarFieldReady = false;
	let starFieldError: string | null = null;
	let fallbackActive = false;
	let performanceOptimized = false;
	let cleanupFunctions: (() => void)[] = [];

	// GAME STATE
	let currentGameState: GameState = 'idle';

	// EVENT DISPATCHER
	const dispatch = createEventDispatcher<{
		performanceChange: PerformanceMetrics;
		starFieldReady: void;
		starFieldError: { message: string };
	}>();

	// === ENHANCED REACTIVE STATEMENTS ===

	// Optimized stars binding
	$: stars = $animationState.stars;

	// Enhanced device adaptation
	$: if (browser && $deviceCapabilities) {
		const optimal = getOptimalSettings();

		starFieldConfig = {
			starCount: Math.min($maxStars, optimal.maxStars),
			baseSpeed: $deviceTier === 'low' ? 0.3 : 0.5,
			boostSpeed: $deviceTier === 'low' ? 2 : 3,
			enableGlow: optimal.enableGlow && shouldEnableEffect('glow'),
			enableTrails: optimal.enableTrails && shouldEnableEffect('trails') && $deviceTier !== 'low',
			enableBlur: optimal.enableBlur && shouldEnableEffect('blur'),
			enableShadows: optimal.enableShadows && shouldEnableEffect('shadows'),
			enableParallax: optimal.enableParallax && shouldEnableEffect('parallax'),
			adaptiveQuality: true
		};

		// Update device performance level
		devicePerformanceLevel = $deviceTier;
		isLowPerformanceDevice = $isLowPowerDevice || $deviceTier === 'low';
	}

	// Enhanced memory pressure response
	$: if ($memoryPressure === 'high' || $memoryPressure === 'critical') {
		handleMemoryPressure($memoryPressure);
	}

	// Performance mode adaptation
	$: if ($performanceMode && starFieldComponent) {
		applyPerformanceMode($performanceMode);
	}

	// Enhanced navbar height handling with frame rate control
	$: if (browser && $layoutStore?.navbarHeight !== undefined) {
		if (
			frameRateController.shouldRenderFrame() ||
			Math.abs(
				$layoutStore.navbarHeight -
					parseFloat(document.documentElement.style.getPropertyValue('--navbar-height') || '0')
			) > 2
		) {
			document.documentElement.style.setProperty(
				'--navbar-height',
				`${$layoutStore.navbarHeight}px`
			);
		}
	}

	// Fallback star visibility
	$: showFallbackStars =
		fallbackActive &&
		$starFieldMode !== 'canvas' &&
		$animationState.stars?.length > 0 &&
		!starFieldComponent &&
		!canvasStarFieldManager;

	// Dispatch performance metrics to layout store
	$: if (browser && performanceMetrics.lastUpdate) {
		// You can dispatch this to a layout store if needed
		window.dispatchEvent(
			new CustomEvent('component-performance', {
				detail: {
					component: 'hero',
					metrics: performanceMetrics
				}
			})
		);
	}

	// === ENHANCED DEVICE DETECTION ===

	function detectDeviceCapabilities() {
		if (!browser) return;

		// Enhanced device detection
		const capabilities = detectDevicePerformance();

		isMobileDevice = window.innerWidth < 768;
		isLowPerformanceDevice =
			capabilities.tier === 'low' || (isMobileDevice && navigator.hardwareConcurrency <= 4);

		// Set data attributes for CSS targeting
		document.documentElement.setAttribute(
			'data-device-type',
			isLowPerformanceDevice ? 'low-performance' : isMobileDevice ? 'mobile' : 'desktop'
		);

		document.documentElement.setAttribute('data-device-tier', capabilities.tier);

		// Update device capabilities store
		deviceCapabilities.detectCapabilities();
	}

	// === ENHANCED PERFORMANCE OPTIMIZATION ===

	function handleMemoryPressure(pressure: 'high' | 'critical') {
		if (!starFieldComponent && !canvasStarFieldManager) return;

		const optimalCount = getOptimalStarCount(starFieldConfig.starCount);

		if (pressure === 'critical') {
			// Emergency optimization
			if (starFieldComponent) {
				starFieldComponent.setQuality(0.3);
				starFieldConfig.starCount = Math.max(20, optimalCount * 0.3);
			}
			if (canvasStarFieldManager) {
				canvasStarFieldManager.setQuality(0.3);
				canvasStarFieldManager.setStarCount(Math.max(20, optimalCount * 0.3));
			}

			starFieldConfig.enableGlow = false;
			starFieldConfig.enableTrails = false;
			starFieldConfig.enableBlur = false;
			starFieldConfig.enableShadows = false;
			starFieldConfig.enableParallax = false;
		} else {
			// Gentle optimization
			if (starFieldComponent) {
				starFieldComponent.setQuality(0.6);
			}
			if (canvasStarFieldManager) {
				canvasStarFieldManager.setQuality(0.6);
			}

			starFieldConfig.starCount = Math.max(50, optimalCount * 0.7);
			starFieldConfig.enableGlow = false;
			starFieldConfig.enableTrails = false;
		}

		console.log(`🧠 Memory pressure (${pressure}): Reduced to ${starFieldConfig.starCount} stars`);
	}

	function applyPerformanceMode(mode: 'low' | 'medium' | 'high') {
		if (!starFieldComponent && !canvasStarFieldManager) return;

		switch (mode) {
			case 'low':
				if (starFieldComponent) starFieldComponent.setQuality(0.4);
				if (canvasStarFieldManager) canvasStarFieldManager.setQuality(0.4);

				starFieldConfig.starCount = Math.min(50, starFieldConfig.starCount);
				starFieldConfig.enableGlow = false;
				starFieldConfig.enableTrails = false;
				starFieldConfig.enableBlur = false;
				starFieldConfig.enableShadows = false;
				starFieldConfig.enableParallax = false;
				break;

			case 'medium':
				if (starFieldComponent) starFieldComponent.setQuality(0.7);
				if (canvasStarFieldManager) canvasStarFieldManager.setQuality(0.7);

				starFieldConfig.starCount = Math.min(150, starFieldConfig.starCount);
				starFieldConfig.enableGlow = $deviceTier !== 'low';
				starFieldConfig.enableTrails = false;
				starFieldConfig.enableBlur = false;
				starFieldConfig.enableShadows = false;
				starFieldConfig.enableParallax = false;
				break;

			case 'high':
				if (starFieldComponent) starFieldComponent.setQuality(1.0);
				if (canvasStarFieldManager) canvasStarFieldManager.setQuality(1.0);

				starFieldConfig.enableGlow = true;
				starFieldConfig.enableTrails = $deviceTier === 'high';
				starFieldConfig.enableBlur = $deviceTier === 'high';
				starFieldConfig.enableShadows = $deviceTier === 'high';
				starFieldConfig.enableParallax = $deviceTier === 'high';
				break;
		}

		console.log(
			`⚡ Performance mode (${mode}): ${starFieldConfig.starCount} stars, quality: ${starFieldComponent?.getPerformanceMetrics?.()?.quality || canvasStarFieldManager?.getPerformanceMetrics?.()?.quality || 'unknown'}`
		);
	}

	// === ENHANCED EVENT HANDLERS ===

	function handleStarFieldReady() {
		isStarFieldReady = true;
		starFieldError = null;

		console.log('✅ StarField ready');
		dispatch('starFieldReady');

		// Start performance monitoring
		startPerformanceMonitoring();
	}

	function handleStarFieldError(event: CustomEvent<{ message: string }>) {
		const { message } = event.detail;
		starFieldError = message;

		console.error('❌ StarField error:', message);
		dispatch('starFieldError', { message });

		// Fallback to DOM stars
		activateFallbackStars();
	}

	function handlePerformanceChange(
		event: CustomEvent<{ fps: number; quality: number; memoryUsage: number }>
	) {
		const { fps, quality, memoryUsage } = event.detail;

		// Update performance metrics
		performanceMetrics = {
			...performanceMetrics,
			fps,
			quality,
			memoryUsage,
			lastUpdate: Date.now()
		};

		// Dispatch to parent
		dispatch('performanceChange', performanceMetrics);

		// Also dispatch to window for layout-level monitor
		if (browser) {
			window.dispatchEvent(
				new CustomEvent('hero-performance-update', {
					detail: performanceMetrics
				})
			);
		}

		// Auto-optimization based on performance
		if (fps < $targetFPS * 0.7) {
			triggerPerformanceOptimization();
		}
	}

	function activateFallbackStars() {
		if (fallbackActive) return;

		fallbackActive = true;
		animationState.setStarFieldMode('dom');

		console.log('🔄 Activated fallback DOM stars');
	}

	function triggerPerformanceOptimization() {
		if (performanceOptimized) return;

		performanceOptimized = true;

		// Emergency performance optimization
		const currentMetrics =
			starFieldComponent?.getPerformanceMetrics?.() ||
			canvasStarFieldManager?.getPerformanceMetrics?.();

		if (currentMetrics) {
			if (currentMetrics.fps < 20) {
				// Critical performance - minimal settings
				if (starFieldComponent) starFieldComponent.setQuality(0.3);
				if (canvasStarFieldManager) canvasStarFieldManager.setQuality(0.3);

				starFieldConfig.starCount = 30;
				starFieldConfig.enableGlow = false;
				starFieldConfig.enableTrails = false;
				starFieldConfig.enableBlur = false;
				starFieldConfig.enableShadows = false;
				starFieldConfig.enableParallax = false;
			} else if (currentMetrics.fps < 35) {
				// Poor performance - reduce settings
				if (starFieldComponent) starFieldComponent.setQuality(0.5);
				if (canvasStarFieldManager) canvasStarFieldManager.setQuality(0.5);

				starFieldConfig.starCount = Math.max(50, starFieldConfig.starCount * 0.7);
				starFieldConfig.enableGlow = false;
				starFieldConfig.enableTrails = false;
			}
		}

		// Reset flag after delay
		setTimeout(() => {
			performanceOptimized = false;
		}, 5000);

		console.log('🚀 Emergency performance optimization applied');
	}

	function handleScreenChange(event: CustomEvent) {
		const newScreen = event.detail;
		const prevScreen = currentScreen;

		if (newScreen === prevScreen) return;

		screenStore.set(newScreen);
		currentScreen = newScreen;

		const performTransition = () => {
			if (prevScreen === 'main' && newScreen !== 'main') {
				stopAnimations();

				const glassContainer = document.querySelector('.screen-glass-container');
				if (glassContainer) {
					(glassContainer as HTMLElement).style.opacity = '1';
					(glassContainer as HTMLElement).style.pointerEvents = 'none';

					gsap.fromTo(
						glassContainer,
						{ filter: 'brightness(1.2) blur(0.5px)' },
						{ filter: 'brightness(1) blur(0px)', duration: 0.3 }
					);
				}
			} else if (newScreen === 'main' && prevScreen !== 'main') {
				const glassContainer = document.querySelector('.screen-glass-container');
				if (glassContainer) {
					gsap.fromTo(
						glassContainer,
						{ filter: 'brightness(1.1) blur(0.3px)' },
						{ filter: 'brightness(1) blur(0px)', duration: 0.3 }
					);
				}
			}
			initializeGlassEffects();
		};

		requestAnimationFrame(performTransition);
	}

	function handleControlInput(event: CustomEvent) {
		if (!browser) return;

		const { detail } = event;
		if (detail.type === 'joystick') {
			if (frameRateController.shouldRenderFrame()) {
				requestAnimationFrame(() => {
					if (detail.value.x < -0.5) {
						window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
					} else if (detail.value.x > 0.5) {
						window.dispatchEvent(
							new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
						);
					} else {
						window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft', bubbles: true }));
						window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight', bubbles: true }));
					}

					if (detail.value.y < -0.5) {
						window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
					}
				});
			}
		}
	}

	function handleGameStateChange(event: { detail: { state: GameState } }) {
		currentGameState = event.detail.state;
		console.log('Game state changed to:', currentGameState);
	}

	function handleBoost(active: boolean) {
		// Update frameRateController's quality if boosting
		if (active) {
			frameRateController.setQualityOverride(0.9);
		} else {
			frameRateController.setAdaptiveEnabled(true);
		}

		if (starFieldComponent) {
			if (active) {
				starFieldComponent.boost();
			} else {
				starFieldComponent.unboost();
			}
		} else if (canvasStarFieldManager) {
			canvasStarFieldManager.setBoostMode(active);
		}
	}

	// === ENHANCED PERFORMANCE MONITORING ===

	function startPerformanceMonitoring() {
		// Subscribe to FPS changes
		const fpsUnsubscribe = frameRateController.subscribeFPS((fps) => {
			performanceMetrics.fps = fps;

			// Dispatch to window for layout monitor
			if (browser) {
				window.dispatchEvent(
					new CustomEvent('hero-fps-update', {
						detail: { fps, source: 'hero' }
					})
				);
			}

			// Adaptive quality based on FPS
			if (fps < $targetFPS * 0.6) {
				const currentQuality =
					starFieldComponent?.getPerformanceMetrics?.()?.quality ||
					canvasStarFieldManager?.getPerformanceMetrics?.()?.quality ||
					1.0;
				if (currentQuality > 0.3) {
					const newQuality = Math.max(0.3, currentQuality - 0.1);
					if (starFieldComponent) starFieldComponent.setQuality(newQuality);
					if (canvasStarFieldManager) canvasStarFieldManager.setQuality(newQuality);
				}
			}
		});

		// Subscribe to quality changes
		qualityUnsubscribe = frameRateController.subscribeQuality((quality) => {
			performanceMetrics.quality = quality;

			// Dispatch to window for layout monitor
			if (browser) {
				window.dispatchEvent(
					new CustomEvent('hero-quality-update', {
						detail: { quality, source: 'hero' }
					})
				);
			}
		});

		// Monitor memory usage
		const memoryUnsubscribe = memoryManager.onMemoryChange((info) => {
			performanceMetrics.memoryUsage = info.usagePercentage;

			// Dispatch to window for layout monitor
			if (browser) {
				window.dispatchEvent(
					new CustomEvent('hero-memory-update', {
						detail: { memoryUsage: info.usagePercentage, source: 'hero' }
					})
				);
			}
		});

		// Store cleanup functions
		cleanupFunctions.push(fpsUnsubscribe, qualityUnsubscribe, memoryUnsubscribe);
	}

	// === ENHANCED INITIALIZATION ===

	function initializeGlassEffects() {
		if (!browser) return;

		const glassContainer = document.querySelector('.screen-glass-container');
		if (!glassContainer) return;

		if (currentScreen === 'game') {
			document.documentElement.style.setProperty('--glass-reflectivity', '0.12');
			document.documentElement.style.setProperty('--glass-dust-opacity', '0.02');
			document.documentElement.style.setProperty('--glass-smudge-opacity', '0.03');
			document.documentElement.style.setProperty('--internal-reflection-opacity', '0.035');
		} else {
			document.documentElement.style.setProperty('--glass-reflectivity', '0.15');
			document.documentElement.style.setProperty('--glass-dust-opacity', '0.03');
			document.documentElement.style.setProperty('--glass-smudge-opacity', '0.04');
			document.documentElement.style.setProperty('--internal-reflection-opacity', '0.045');
		}
	}

	function handleOrientation() {
		if (!browser) return;

		const isLandscape = window.innerWidth > window.innerHeight;

		if (frameRateController.shouldRenderFrame()) {
			requestAnimationFrame(() => {
				document.body.classList.toggle('landscape', isLandscape);
			});
		}
	}

	function debouncedOrientationCheck() {
		if (orientationTimeout) {
			clearTimeout(orientationTimeout);
		}
		orientationTimeout = window.setTimeout(handleOrientation, 150);
	}

	// === ENHANCED TIMELINE CREATION ===

	function createOptimizedTimeline(elements: any) {
		if (!browser) return null;

		try {
			const isMobile = window.innerWidth < 768;
			const qualityLevel = frameRateController.getCurrentQuality();

			if (currentTimeline) {
				currentTimeline.kill();
			}

			// Simplified animations for low performance
			if (isLowPerformanceDevice || qualityLevel < 0.6) {
				const timeline = gsap.timeline({
					paused: true,
					repeat: -1,
					defaults: {
						ease: 'power1.inOut',
						duration: 1.5,
						overwrite: true
					}
				});

				timeline.to(elements.insertConcept, {
					opacity: 0.3,
					yoyo: true,
					repeat: 1
				});

				return timeline;
			}

			// Standard timeline
			const timeline = gsap.timeline({
				paused: true,
				defaults: {
					ease: 'power1.inOut',
					immediateRender: false,
					overwrite: true
				}
			});

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

			return timeline;
		} catch (error) {
			console.error('Failed to create GSAP timeline:', error);
			return null;
		}
	}

	// === ENHANCED ANIMATION CONTROL ===

	function startAnimations(elements: {
		header: HTMLElement;
		insertConcept: HTMLElement;
		arcadeScreen: HTMLElement;
	}) {
		try {
			if ($animationState?.isAnimating) {
				stopAnimations();
			}

			const currentQuality = frameRateController.getCurrentQuality();

			// Start StarField component with enhanced configuration
			if (starFieldComponent) {
				if (currentQuality < 0.7) {
					starFieldComponent.setQuality(currentQuality);
				}
				starFieldComponent.start();
			}
			// Start canvas star field with enhanced settings
			else if (canvasStarFieldManager) {
				const capabilities = $deviceCapabilities;

				if (
					capabilities &&
					typeof canvasStarFieldManager.adaptToDeviceCapabilities === 'function'
				) {
					canvasStarFieldManager.adaptToDeviceCapabilities(capabilities);
				}

				if (currentQuality < 0.7) {
					const reducedStarCount = Math.floor((capabilities?.maxStars || 60) * currentQuality);
					canvasStarFieldManager.setStarCount(Math.max(20, reducedStarCount));
					canvasStarFieldManager.setQuality(currentQuality);
				}

				canvasStarFieldManager.start();
			}
			// Initialize canvas star field manager
			else if (starContainer && !starFieldComponent) {
				const capabilities = $deviceCapabilities;
				const baseStarCount =
					capabilities?.maxStars || (isLowPerformanceDevice ? 20 : isMobileDevice ? 40 : 60);
				const qualityAdjustedStarCount = Math.max(20, Math.floor(baseStarCount * currentQuality));

				canvasStarFieldManager = new CanvasStarFieldManager(
					animationState,
					qualityAdjustedStarCount
				);

				canvasStarFieldManager.setBaseSpeed(0.25);
				canvasStarFieldManager.setBoostSpeed(2);
				canvasStarFieldManager.setContainer(starContainer);

				// Configure features based on capabilities
				canvasStarFieldManager.setUseWorker(!isLowPerformanceDevice && currentQuality > 0.5);

				if (currentQuality < 0.7) {
					canvasStarFieldManager.setQuality(currentQuality);
				}

				canvasStarFieldManager.start();
			}

			// Initialize glitch manager for capable devices
			if (glitchManager && typeof glitchManager.cleanup === 'function') {
				glitchManager.cleanup();
			}

			if (!isLowPerformanceDevice && currentQuality > 0.6) {
				if (animations && typeof animations.GlitchManager === 'function') {
					glitchManager = new animations.GlitchManager();
					if (glitchManager && typeof glitchManager.start === 'function') {
						glitchManager.start([elements.header]);
					}
				}
			}

			// Create and start GSAP timeline
			const timeline = createOptimizedTimeline(elements);
			if (timeline) {
				currentTimeline = timeline;
				timeline.play();
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

	function stopAnimations() {
		if (!browser) return;

		// Stop StarField component
		if (starFieldComponent && typeof starFieldComponent.stop === 'function') {
			starFieldComponent.stop();
		}

		// Stop canvas star field
		if (canvasStarFieldManager && typeof canvasStarFieldManager.stop === 'function') {
			canvasStarFieldManager.stop();
		}

		// Stop glitch manager
		if (glitchManager) {
			if (typeof glitchManager.stop === 'function') {
				glitchManager.stop();
			} else if (typeof glitchManager.cleanup === 'function') {
				glitchManager.cleanup();
			}
		}

		// Clean up GSAP timeline
		if (currentTimeline) {
			if (typeof currentTimeline.pause === 'function') {
				currentTimeline.pause();
			}
			if (typeof currentTimeline.clear === 'function') {
				currentTimeline.clear();
			}
			if (typeof currentTimeline.kill === 'function') {
				currentTimeline.kill();
			}
			currentTimeline = null;
		}

		// Clean up GSAP animations
		if (typeof window !== 'undefined' && gsap) {
			if (typeof gsap.killTweensOf === 'function') {
				gsap.killTweensOf([]);
				if (header) gsap.killTweensOf(header);
				if (insertConcept) gsap.killTweensOf(insertConcept);
				if (arcadeScreen) gsap.killTweensOf(arcadeScreen);
			}
		}

		// Update animation state
		animationState.update((state) => ({
			...state,
			isAnimating: false
		}));
	}

	// === ENHANCED GLASS EFFECTS ===

	function updateGlassEffects() {
		if (!browser) return;

		const glassContainer = document.querySelector('.screen-glass-container');
		if (!glassContainer) return;

		const handleMouseMove = (e) => {
			if (!glassContainer || !frameRateController.shouldRenderFrame()) return;

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
				specular.style.transform = `translate(${-moveX * 0.8}px, ${-moveY * 0.8}px)`;
				specular.style.opacity = 0.2 + Math.abs(offsetX * offsetY) * 0.1;
			}

			if (reflection) {
				reflection.style.transform = `translate(${moveX * 0.3}px, ${moveY * 0.3}px)`;
			}
		};

		const throttledHandler = createThrottledRAF(handleMouseMove, 32);
		document.addEventListener('mousemove', throttledHandler, { passive: true });

		return throttledHandler;
	}

	// === ENHANCED INITIALIZATION FUNCTIONS ===

	function initializeComponents() {
		detectDeviceCapabilities();
		initializeMemoryMonitoring();

		// iOS optimizations
		if (browser && /iPad|iPhone|iPod/.test(navigator.userAgent)) {
			if (arcadeScreen) {
				arcadeScreen.style.transform = 'translateZ(0)';
				arcadeScreen.style.backfaceVisibility = 'hidden';
				arcadeScreen.style.webkitBackfaceVisibility = 'hidden';
				arcadeScreen.classList.add('ios-optimized');
			}

			if (starContainer) {
				starContainer.style.transform = 'translateZ(0)';
				starContainer.style.backfaceVisibility = 'hidden';
				starContainer.style.webkitBackfaceVisibility = 'hidden';
			}
		}

		const glassEffectsHandler = updateGlassEffects();
		if (glassEffectsHandler) {
			eventHandlers.glassEffects = glassEffectsHandler;
		}
	}

	function initializeMemoryMonitoring() {
		if (browser && 'performance' in window && 'memory' in (performance as any)) {
			memoryCleanupTask = memoryManager.registerCleanupTask(() => {
				// Enhanced cleanup for StarField
				if (fallbackActive) {
					animationState.updateStars([]);
					setTimeout(() => {
						// Use $animationState instead of get(animationState)
						const currentStars = $animationState.stars;
						animationState.updateStars(currentStars);
					}, 100);
				}

				// Force garbage collection hint
				if ((window as any).gc) {
					try {
						(window as any).gc();
					} catch (e) {
						// Ignore errors
					}
				}
			});
		}
	}

	function initializeAnimations() {
		if (currentScreen === 'main') {
			const elements = { header, insertConcept, arcadeScreen };
			if (elements.header && elements.insertConcept && elements.arcadeScreen) {
				animationState.resetAnimationState();
				startAnimations(elements);
			}
		}
	}

	function setupEventListeners() {
		const optimizedResizeCheck = createThrottledRAF(() => {
			if (!frameRateController.shouldRenderFrame()) return;

			detectDeviceCapabilities();
			debouncedOrientationCheck();

			if (canvasStarFieldManager && typeof canvasStarFieldManager.resizeCanvas === 'function') {
				canvasStarFieldManager.resizeCanvas();
			}
		}, 100);

		const visibilityHandler = () => {
			if (document.hidden) {
				// Pause animations
				if (canvasStarFieldManager) {
					if (typeof canvasStarFieldManager.pause === 'function') {
						canvasStarFieldManager.pause();
					} else if (typeof canvasStarFieldManager.stop === 'function') {
						canvasStarFieldManager.stop();
					}
				}

				if (starFieldComponent) {
					if (typeof starFieldComponent.pause === 'function') {
						starFieldComponent.pause();
					} else if (typeof starFieldComponent.stop === 'function') {
						starFieldComponent.stop();
					}
				}

				frameRateController.setAdaptiveEnabled(false);
			} else {
				// Resume animations
				if (canvasStarFieldManager) {
					if (typeof canvasStarFieldManager.resume === 'function') {
						canvasStarFieldManager.resume();
					} else if (typeof canvasStarFieldManager.start === 'function') {
						canvasStarFieldManager.start();
					}
				}

				if (starFieldComponent) {
					if (typeof starFieldComponent.resume === 'function') {
						starFieldComponent.resume();
					} else if (typeof starFieldComponent.start === 'function') {
						starFieldComponent.start();
					}
				}

				frameRateController.setAdaptiveEnabled(true);
			}
		};

		const orientationChangeHandler = () => {
			setTimeout(detectDeviceCapabilities, 300);
		};

		const touchStartHandler = (e: TouchEvent) => {
			if (currentScreen === 'game') {
				e.preventDefault();
			}
		};

		const passiveOptions = { passive: true };
		const nonPassiveOptions = { passive: false };

		// Setup resize observer
		if (typeof ResizeObserver === 'function') {
			resizeObserver = new ResizeObserver(optimizedResizeCheck);
			if (arcadeScreen) {
				resizeObserver.observe(arcadeScreen);

				if (isMobileDevice) {
					arcadeScreen.addEventListener('touchstart', touchStartHandler as any, nonPassiveOptions);
				}
			}
		}

		// Add event listeners
		if (typeof window !== 'undefined') {
			window.addEventListener('resize', optimizedResizeCheck, passiveOptions);
			window.addEventListener('orientationchange', orientationChangeHandler, passiveOptions);
		}

		if (typeof document !== 'undefined') {
			document.addEventListener('visibilitychange', visibilityHandler, passiveOptions);
		}

		if (isMobileDevice && typeof document !== 'undefined') {
			document.addEventListener('touchstart', () => {}, { passive: true });
			document.addEventListener('touchmove', () => {}, { passive: true });
		}

		eventHandlers = {
			resize: optimizedResizeCheck as EventListener,
			orientationChange: orientationChangeHandler as EventListener,
			visibility: visibilityHandler as EventListener,
			touchStart: touchStartHandler as EventListener
		};
	}

	function setupFrameRateController() {
		const capabilities = $deviceCapabilities;
		const targetFPS = isLowPerformanceDevice ? 30 : 60;

		frameRateController.setTargetFPS(targetFPS);
		frameRateController.setMaxSkippedFrames(
			capabilities.frameSkip || (isLowPerformanceDevice ? 2 : 0)
		);
		frameRateController.setAdaptiveEnabled(true);

		frameRateUnsubscribe = frameRateController.subscribeQuality((quality) => {
			try {
				if (canvasStarFieldManager) {
					const capabilities = $deviceCapabilities;
					const baseCount = capabilities.maxStars || 60;
					const adjustedCount = Math.max(20, Math.round(baseCount * quality));

					const currentCount = canvasStarFieldManager?.getStarCount?.() ?? 0;
					if (
						typeof canvasStarFieldManager.setStarCount === 'function' &&
						Math.abs(currentCount - adjustedCount) > 5
					) {
						canvasStarFieldManager.setStarCount(adjustedCount);
					}

					if (typeof canvasStarFieldManager.setQuality === 'function') {
						canvasStarFieldManager.setQuality(quality);
					}
				}

				if (starFieldComponent) {
					starFieldComponent.setQuality(quality);

					const capabilities = $deviceCapabilities;
					const baseCount = capabilities.maxStars || 60;
					const adjustedCount = Math.max(20, Math.round(baseCount * quality));

					if (Math.abs(starFieldConfig.starCount - adjustedCount) > 5) {
						starFieldConfig.starCount = adjustedCount;
					}
				}
			} catch (error) {
				console.warn('Error in quality adjustment callback:', error);
			}
		});
	}

	// Enhanced reactive statement for screen management
	$: {
		if (currentScreen === 'main' && browser) {
			const elements = { header, insertConcept, arcadeScreen };

			if (elements.header && elements.insertConcept && elements.arcadeScreen) {
				animationState.resetAnimationState();

				// Enhanced StarField initialization
				if (starFieldComponent && starContainer) {
					starFieldComponent.start();
				} else if (canvasStarFieldManager) {
					const canvasExists = starContainer && starContainer.querySelector('.star-field-canvas');
					if (!canvasExists) {
						canvasStarFieldManager.setContainer(starContainer);
					}
					canvasStarFieldManager.start();
				} else if (starContainer) {
					const capabilities = $deviceCapabilities;
					const starCount =
						capabilities.maxStars || (isLowPerformanceDevice ? 20 : isMobileDevice ? 40 : 60);

					canvasStarFieldManager = new CanvasStarFieldManager(animationState, starCount);
					canvasStarFieldManager.setContainer(starContainer);
					canvasStarFieldManager.setUseWorker(!isLowPerformanceDevice);
				}

				requestAnimationFrame(() => {
					if (!starFieldComponent && canvasStarFieldManager) {
						canvasStarFieldManager.start();
					}
					startAnimations(elements);
				});
			}
		} else if (currentScreen !== 'main') {
			stopAnimations();
		}
	}

	// === ENHANCED LIFECYCLE HOOKS ===

	onMount(() => {
		if (!browser) return;

		currentScreen = 'main';

		// Initialize performance monitoring
		performanceMonitor = createPerformanceMonitor();
		performanceMonitor.start();

		// Setup frame rate controller
		setupFrameRateController();

		// Initialize components
		initializeComponents();

		// Setup event listeners
		setupEventListeners();

		// Initial setup with RAF
		const initialRaf = requestAnimationFrame(() => {
			if (arcadeScreen) {
				arcadeScreen.classList.add('power-sequence');
			}

			handleOrientation();

			if (isMobileDevice) {
				setTimeout(initializeAnimations, 300);
			} else {
				initializeAnimations();
			}
		});

		return () => {
			if (initialRaf) cancelAnimationFrame(initialRaf);
		};
	});

	onDestroy(() => {
		if (!browser) return;

		const { resize, orientationChange, visibility, touchStart, glassEffects } = eventHandlers || {};

		// Stop all animations and managers
		stopAnimations();
		animationState.reset();

		// Cleanup performance monitoring
		if (performanceMonitor) {
			performanceMonitor.stop();
			performanceMonitor = null;
		}

		// Cleanup StarField components
		if (canvasStarFieldManager) {
			canvasStarFieldManager.cleanup();
			canvasStarFieldManager = null;
		}

		if (glitchManager) {
			glitchManager.cleanup();
			glitchManager = null;
		}

		// Cleanup memory monitoring
		if (memoryCleanupTask) {
			memoryCleanupTask();
			memoryCleanupTask = null;
		}

		// Cleanup frame rate controller
		if (frameRateUnsubscribe) {
			frameRateUnsubscribe();
			frameRateUnsubscribe = null;
		}

		if (qualityUnsubscribe) {
			qualityUnsubscribe();
			qualityUnsubscribe = null;
		}

		// Run all cleanup functions
		cleanupFunctions.forEach((cleanup) => {
			try {
				cleanup();
			} catch (error) {
				console.error('Error in cleanup:', error);
			}
		});

		// Cleanup resize observer
		if (resizeObserver) {
			resizeObserver.disconnect();
			resizeObserver = null;
		}

		// Clear timeouts
		if (orientationTimeout) {
			clearTimeout(orientationTimeout);
			orientationTimeout = null;
		}

		// Remove event listeners
		if (resize) window.removeEventListener('resize', resize);
		if (orientationChange) window.removeEventListener('orientationchange', orientationChange);
		if (visibility) document.removeEventListener('visibilitychange', visibility);
		if (glassEffects) document.removeEventListener('mousemove', glassEffects);
		if (arcadeScreen && touchStart) {
			arcadeScreen.removeEventListener('touchstart', touchStart);
		}

		// Clear DOM references
		header = null;
		insertConcept = null;
		arcadeScreen = null;
		starContainer = null;
		spaceBackground = null;
		currentTimeline = null;
		stars = [];

		// Force garbage collection if available
		if ((window as any).gc) {
			try {
				(window as any).gc();
			} catch (e) {
				// Ignore errors
			}
		}

		// Cleanup GSAP
		if (typeof window !== 'undefined' && gsap && gsap.ticker) {
			gsap.ticker.remove(() => {});
			gsap.globalTimeline.clear();
		}
	});
</script>

<section
	id="hero"
	class="w-full relative overflow-hidden flex items-center justify-center hardware-accelerated"
	style="
    margin-top: calc(-.5 * {$layoutStore.navbarHeight}px);
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
				<div class="navigation-wrapper relative z-50">
					<ArcadeNavigation on:changeScreen={handleScreenChange} />
				</div>

				<div class="screen-bezel rounded-[3vmin] overflow-hidden"></div>
				<div
					id="arcade-screen"
					class="crt-screen hardware-accelerated relative glow rounded-[3vmin] overflow-hidden will-change-transform"
					bind:this={arcadeScreen}
				>
					<div class="phosphor-decay rounded-[3vmin]"></div>
					<div class="shadow-mask rounded-[3vmin]"></div>
					<div class="interlace rounded-[3vmin]"></div>

					<div class="screen-reflection rounded-[3vmin]"></div>
					<div class="screen-glare rounded-[3vmin]"></div>
					<div class="glow-effect rounded-[3vmin]"></div>

					{#if currentScreen === 'main'}
						<div
							id="space-background"
							class="absolute inset-0 overflow-hidden pointer-events-none rounded-[3vmin] hardware-accelerated"
							bind:this={spaceBackground}
						>
							<div
								class="canvas-star-container absolute inset-0 pointer-events-none rounded-[3vmin] hardware-accelerated"
								bind:this={starContainer}
							>
								{#if starContainer}
									<StarField
										bind:this={starFieldComponent}
										containerElement={starContainer}
										starCount={starFieldConfig.starCount}
										enableBoost={true}
										baseSpeed={starFieldConfig.baseSpeed}
										boostSpeed={starFieldConfig.boostSpeed}
										maxDepth={32}
										enableTrails={starFieldConfig.enableTrails}
										enableGlow={starFieldConfig.enableGlow}
										adaptiveQuality={starFieldConfig.adaptiveQuality}
										on:performanceChange={handlePerformanceChange}
										on:ready={handleStarFieldReady}
										on:error={handleStarFieldError}
									/>
								{/if}

								<!-- Enhanced fallback stars -->
								{#if showFallbackStars}
									<div class="fallback-stars absolute inset-0" transition:fade={{ duration: 500 }}>
										{#each $animationState.stars as star (star.id)}
											<div
												class="star absolute"
												class:glow={starFieldConfig.enableGlow && $deviceTier !== 'low'}
												class:reduced-motion={$deviceCapabilities.prefersReducedMotion}
												style={star.style}
											></div>
										{/each}
									</div>
								{/if}

								<!-- Loading state -->
								{#if !isStarFieldReady && !starFieldError && !showFallbackStars}
									<div
										class="starfield-loading absolute inset-0"
										transition:fade={{ duration: 200 }}
									>
										<div class="text-white/50 text-sm">Initializing StarField...</div>
									</div>
								{/if}

								<!-- Error state with fallback option -->
								{#if starFieldError && !fallbackActive}
									<div
										class="starfield-error absolute inset-0 flex items-center justify-center"
										transition:fly={{ y: 20, duration: 300 }}
									>
										<div class="text-center">
											<div class="text-red-400 mb-2">StarField Error</div>
											<div class="text-red-300 text-sm mb-4">{starFieldError}</div>
											<button
												class="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded text-sm transition-colors"
												on:click={activateFallbackStars}
											>
												Use Fallback Stars
											</button>
										</div>
									</div>
								{/if}
							</div>
						</div>

						<!-- Content wrapper -->
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
							<div
								id="insert-concept"
								class="text-center mt-3 animate-opacity"
								bind:this={insertConcept}
							>
								Insert Concept
							</div>
							<BoostCue on:boost={(e) => handleBoost(e.detail)} />
						</div>
					{:else if currentScreen === 'game'}
						<GameScreen on:stateChange={handleGameStateChange} />
					{/if}

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
			</div>
		</div>
	</div>

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


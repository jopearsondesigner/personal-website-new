<!-- src/lib/components/section/Hero.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { gsap } from 'gsap';
	import { get } from 'svelte/store';
	import ArcadeCtaButton from '$lib/components/ui/ArcadeCtaButton.svelte';
	import ArcadeNavigation from '$lib/components/ui/ArcadeNavigation.svelte';
	import GameScreen from '$lib/components/game/GameScreen.svelte';
	import { animations } from '$lib/utils/animation-utils';
	import { screenStore } from '$lib/stores/animation-store';
	import { layoutStore } from '$lib/stores/store';
	import ControlsPortal from '$lib/components/ui/ControlsPortal.svelte';
	import GameControls from '$lib/components/game/GameControls.svelte';
	import ArcadeBackground from '$lib/components/vfx/ArcadeBackground.svelte';
	import VectorStarfield from '$lib/components/vfx/VectorStarfield.svelte';
	import {
		deviceCapabilities,
		setupPerformanceMonitoring,
		setupEventListeners as setupDevicePerfEventListeners
	} from '$lib/utils/device-performance';
	// Svelte auto-subscription: use $deviceCapabilities anywhere in <script> or markup
	import { bindFxIntensity } from '$lib/utils/fx-intensity-controller';
	import { fxTuner } from '$lib/actions/fx-tuner';

	import { memoryManager, type MemoryEvent, type MemoryPressure } from '$lib/utils/memory-manager';
	import { frameRateController } from '$lib/utils/frame-rate-controller';
	import { createThrottledRAF } from '$lib/utils/animation-helpers';

	import type { GameState } from '$lib/types/game';

	// Consolidate state management
	// Device detection state
	let isMobileDevice = false;
	let isLowPerformanceDevice = false;

	// Component state with typed definitions
	let currentTimeline: gsap.core.Timeline | null = null;
	let header: HTMLElement;
	let insertConcept: HTMLElement;
	let arcadeScreen: HTMLElement;
	let currentScreen = 'main';
	let glitchManager: InstanceType<typeof animations.GlitchManager>;
	let resizeObserver: ResizeObserver | null = null;
	let orientationTimeout: number | null = null;
	let memoryManagerUnsubscribes: (() => void)[] = [];
	let eventHandlers: {
		resize?: EventListener;
		orientationChange?: EventListener;
		visibility?: EventListener;
		touchStart?: EventListener;
		glassEffects?: EventListener;
		scroll?: EventListener;
	} = {};

	// Performance monitoring setup
	let perfMonitor: ReturnType<typeof setupPerformanceMonitoring> | null = null;
	let capsVisibilityCleanup: (() => void) | null = null;
	let frameRateUnsubscribe: Function | null = null;

	let currentGameState: GameState = 'idle';

	let unbindFx: () => void;

	//Isolate scroll state from animation logic
	let isScrolling = false;
	let scrollTimeout: number | null = null;
	let lastVisibilityState = true;
	let hasMounted = false;

	// Add animation state guards
	let isAnimationInitialized = false;
	let animationInitTimeout: number | null = null;
	let lastNavbarHeight = 0;

	// CSS Variable change detection with threshold
	const CSS_UPDATE_THRESHOLD = 2; // pixels
	$: if (browser && $layoutStore?.navbarHeight !== undefined) {
		const newHeight = $layoutStore.navbarHeight;
		// Only update if change is significant to prevent layout thrashing
		if (Math.abs(newHeight - lastNavbarHeight) > CSS_UPDATE_THRESHOLD) {
			// Use RAF for optimal performance timing
			if (frameRateController.shouldRenderFrame()) {
				requestAnimationFrame(() => {
					document.documentElement.style.setProperty('--navbar-height', `${newHeight}px`);
					lastNavbarHeight = newHeight;
				});
			}
		}
	}

	// Optimized animation reactive statement
	// Only trigger animations on specific state combinations, with debouncing
	$: if (currentScreen === 'main' && browser && hasMounted && !isAnimationInitialized) {
		// Debounce animation initialization to prevent rapid fire
		if (animationInitTimeout) {
			clearTimeout(animationInitTimeout);
		}

		animationInitTimeout = window.setTimeout(() => {
			const elements = { header, insertConcept, arcadeScreen };
			if (elements.header && elements.insertConcept && elements.arcadeScreen) {
				// PERFORMANCE: Only initialize if not already done
				if (!isAnimationInitialized) {
					requestAnimationFrame(() => {
						startAnimations(elements);
						isAnimationInitialized = true;
					});
				}
			}
		}, 50); // Small debounce to prevent rapid calls
	}

	// Reset animation state when leaving main screen
	$: if (currentScreen !== 'main' && isAnimationInitialized) {
		isAnimationInitialized = false;
		stopAnimations();
	}

	$: fxClass =
		$deviceCapabilities.effectsLevel === 'minimal'
			? 'fx-subtle'
			: $deviceCapabilities.effectsLevel === 'reduced'
				? 'fx-default'
				: 'fx-bold';

	// Device detection function optimized with memoization
	function detectDeviceCapabilities() {
		if (!browser) return;
		const tier = $deviceCapabilities?.tier ?? 'high';
		const isMobile = $deviceCapabilities?.isMobile ?? window.innerWidth < 768;
		isMobileDevice = !!isMobile;
		isLowPerformanceDevice = tier === 'low';
		document.documentElement.setAttribute(
			'data-device-type',
			tier === 'low' ? 'low-performance' : isMobile ? 'mobile' : 'desktop'
		);
	}

	// Optimize scroll handling with better isolation
	function handleScroll() {
		if (!browser) return;

		// Track scroll state without affecting animations
		const wasScrolling = isScrolling;
		isScrolling = true;

		// Clear existing timeout
		if (scrollTimeout) {
			clearTimeout(scrollTimeout);
		}

		// Debounce scroll end detection - don't trigger animations during scroll
		scrollTimeout = window.setTimeout(() => {
			isScrolling = false;
			// Only trigger updates if scroll state actually changed
			if (wasScrolling !== isScrolling) {
				// Scroll ended - opportunity to optimize
				requestAnimationFrame(() => {
					// Perform any scroll-end optimizations here
				});
			}
		}, 150);
	}

	function initializeGlassEffects() {
		if (!browser) return;

		// Get the glass container
		const glassContainer = document.querySelector('.screen-glass-container');
		if (!glassContainer) return;

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
	}

	// Event handlers
	function handleScreenChange(event: CustomEvent) {
		const newScreen = event.detail;
		const prevScreen = currentScreen;

		// Don't do anything if screen hasn't changed
		if (newScreen === prevScreen) return;

		// Remove scroll state check that was causing animation issues
		// Update the screen state
		screenStore.set(newScreen);
		currentScreen = newScreen;

		// Create a transition function to handle the change
		const performTransition = () => {
			// Stop current animations only if needed
			if (prevScreen === 'main' && newScreen !== 'main') {
				// We're leaving the main screen, stop animations
				stopAnimations();
				isAnimationInitialized = false; // PERFORMANCE: Reset state

				// Keep glass effects active even when switching screens
				const glassContainer = document.querySelector('.screen-glass-container');
				if (glassContainer) {
					// Ensure glass container remains visible during transition
					(glassContainer as HTMLElement).style.opacity = '1';
					(glassContainer as HTMLElement).style.pointerEvents = 'none';

					// Add a brief transition effect to simulate screen change under glass
					gsap.fromTo(
						glassContainer,
						{ filter: 'brightness(1.2) blur(0.5px)' },
						{ filter: 'brightness(1) blur(0px)', duration: 0.3 }
					);
				}
			} else if (newScreen === 'main' && prevScreen !== 'main') {
				// We're returning to main screen - animations will be handled by reactive statement

				// Add glass transition effect when returning to main screen
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

		// Use requestAnimationFrame for smoother transitions
		requestAnimationFrame(performTransition);
	}

	function handleControlInput(event: CustomEvent) {
		if (!browser) return;

		const { detail } = event;
		if (detail.type === 'joystick') {
			// Use throttled frame to optimize input handling
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

	// Orientation handling with throttling
	function handleOrientation() {
		if (!browser) return;

		const isLandscape = window.innerWidth > window.innerHeight;

		// Only update when needed based on frame rate controller
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

	// Enhanced animation control with state guards
	function startAnimations(elements: {
		header: HTMLElement;
		insertConcept: HTMLElement;
		arcadeScreen: HTMLElement;
	}) {
		try {
			// Guard against multiple initializations
			if (isAnimationInitialized) {
				console.log('⚡ Skipping animation start - already initialized');
				return;
			}

			// Stop existing animations first
			stopAnimations();

			// Get the current quality setting from frameRateController
			const currentQuality =
				frameRateController && typeof frameRateController.getCurrentQuality === 'function'
					? frameRateController.getCurrentQuality()
					: 1.0;

			// Initialize glitch manager with enhanced settings - only if quality allows
			if (glitchManager && typeof glitchManager.cleanup === 'function') {
				glitchManager.cleanup();
			}

			// Only use glitch effects on capable devices and at higher quality levels
			if (!isLowPerformanceDevice && currentQuality > 0.6) {
				if (animations && typeof animations.GlitchManager === 'function') {
					glitchManager = new animations.GlitchManager();
					if (glitchManager && typeof glitchManager.start === 'function') {
						glitchManager.start([elements.header]); // Apply only to header
					}
				}
			}

			// Create and start optimized GSAP timeline
			const timeline = gsap
				.timeline({
					paused: true,
					defaults: {
						ease: 'power2.out',
						duration: 1
					}
				})
				.fromTo(
					elements.header,
					{
						opacity: 0,
						y: -50,
						scale: 0.8
					},
					{
						opacity: 1,
						y: 0,
						scale: 1,
						duration: 1.2,
						ease: 'back.out(1.7)'
					},
					0
				)
				.fromTo(
					elements.insertConcept,
					{
						opacity: 0
					},
					{
						opacity: 1,
						duration: 0.8,
						ease: 'power2.out'
					},
					0.5
				);

			if (timeline) {
				currentTimeline = timeline;
				timeline.play();
				console.log('⚡ Animations started successfully');
			}
		} catch (error) {
			console.error('Animation initialization failed:', error);
			isAnimationInitialized = false; // Reset on error
		}
	}

	function stopAnimations() {
		if (!browser) return;

		console.log('⚡ Stopping animations');

		// Stop glitch manager
		if (glitchManager) {
			if (typeof glitchManager.stop === 'function') {
				glitchManager.stop();
			} else if (typeof glitchManager.cleanup === 'function') {
				// Fallback to cleanup if stop isn't available
				glitchManager.cleanup();
			}
		}

		// Kill GSAP timeline with proper cleanup
		if (currentTimeline) {
			// First pause to stop animations
			if (typeof currentTimeline.pause === 'function') {
				currentTimeline.pause();
			}

			// Clear all tweens from the timeline
			if (typeof currentTimeline.clear === 'function') {
				currentTimeline.clear();
			}

			// Finally kill the timeline
			if (typeof currentTimeline.kill === 'function') {
				currentTimeline.kill();
			}

			// Remove reference
			currentTimeline = null;
		}

		// Safer approach to clean up GSAP animations
		if (typeof window !== 'undefined' && gsap) {
			// Kill all GSAP animations
			if (typeof gsap.killTweensOf === 'function') {
				gsap.killTweensOf([]);

				// If you have specific elements that are animated:
				if (header) gsap.killTweensOf(header);
				if (insertConcept) gsap.killTweensOf(insertConcept);
				if (arcadeScreen) gsap.killTweensOf(arcadeScreen);
			}

			// If you need to completely clear GSAP's ticker:
			if (gsap.ticker && typeof gsap.ticker.remove === 'function') {
				gsap.ticker.remove(() => {}); // Pass an empty function instead of null
			}
		}
	}

	// Glass effects for enhanced realism - with frame rate controller integration
	function updateGlassEffects() {
		if (!browser) return;

		// Create subtle movement with mouse for glass reflections
		const glassContainer = document.querySelector('.screen-glass-container');
		if (!glassContainer) return;

		// Define a handler for mouse movement that uses frameRateController
		const handleMouseMove = (e: Event) => {
			if (!glassContainer) return;

			// Skip updates on low-performance frames
			if (!frameRateController.shouldRenderFrame() || $deviceCapabilities.preferReducedMotion)
				return;

			// Calculate relative position
			const rect = glassContainer.getBoundingClientRect();
			const centerX = rect.left + rect.width / 2;
			const centerY = rect.top + rect.height / 2;

			// Calculate normalized offsets (-1 to 1)
			const mouseEvent = e as MouseEvent;
			const offsetX = (mouseEvent.clientX - centerX) / (rect.width / 2);
			const offsetY = (mouseEvent.clientY - centerY) / (rect.height / 2);

			// Calculate movement limits
			const maxMove = 8; // maximum movement in pixels
			const moveX = offsetX * maxMove;
			const moveY = offsetY * maxMove;

			// Apply transformation to glass reflection elements
			const specular = glassContainer.querySelector('.screen-glass-specular');
			const reflection = glassContainer.querySelector('.screen-glass-reflection');

			if (specular) {
				specular.style.transform = `translate(${-moveX * 0.8}px, ${-moveY * 0.8}px)`;
				specular.style.opacity = String(0.2 + Math.abs(offsetX * offsetY) * 0.1);
			}

			if (reflection) {
				reflection.style.transform = `translate(${moveX * 0.3}px, ${moveY * 0.3}px)`;
			}
		};

		// Throttle the handler more aggressively for better performance
		const throttledHandler = createThrottledRAF(handleMouseMove, 32); // 30fps throttling

		// Add event listener
		document.addEventListener('mousemove', throttledHandler, { passive: true });

		// Return the handler for cleanup
		return throttledHandler;
	}

	// Focused initialization functions
	function initializeComponents() {
		// Detect device capabilities
		detectDeviceCapabilities();

		// Initialize memory monitoring
		initializeMemoryMonitoring();

		// Add iOS-specific fixes
		if (browser && /iPad|iPhone|iPod/.test(navigator.userAgent)) {
			// Apply iOS fixes to the arcade screen
			if (arcadeScreen) {
				arcadeScreen.style.backfaceVisibility = 'hidden';
				arcadeScreen.style.webkitBackfaceVisibility = 'hidden';
				arcadeScreen.classList.add('ios-optimized');
			}
		}

		// Add glass dynamics
		const glassEffectsHandler = updateGlassEffects();

		// Store handler for cleanup
		if (glassEffectsHandler) {
			eventHandlers.glassEffects = glassEffectsHandler;
		}
	}

	// Optimized memory monitoring initialization
	function initializeMemoryMonitoring() {
		if (
			memoryManagerUnsubscribes.length === 0 &&
			browser &&
			'performance' in window &&
			'memory' in (performance as any)
		) {
			try {
				// Start monitoring with the unified memory manager
				memoryManager.startMonitoring();

				// Subscribe to memory pressure events with throttling
				const pressureUnsubscribe = memoryManager.onMemoryPressure((pressure: MemoryPressure) => {
					// Only respond to significant pressure changes
					if (pressure === 'high' || pressure === 'critical') {
						// Reduce quality through frameRateController
						frameRateController.setQualityOverride(pressure === 'critical' ? 0.5 : 0.7);
						// Nudge capability limits so effect counts follow too
						deviceCapabilities.update((caps) => ({
							...caps,
							maxEffectUnits: Math.max(
								10,
								Math.floor(caps.maxEffectUnits * (pressure === 'critical' ? 0.6 : 0.8))
							),
							maxStars: Math.max(
								10,
								Math.floor(caps.maxEffectUnits * (pressure === 'critical' ? 0.6 : 0.8))
							), // legacy mirror
							starfield: {
								...caps.starfield,
								maxUnits: Math.max(
									10,
									Math.floor(caps.starfield.maxUnits * (pressure === 'critical' ? 0.6 : 0.8))
								),
								animationSpeed: Math.max(
									0.35,
									caps.starfield.animationSpeed * (pressure === 'critical' ? 0.8 : 0.9)
								),
								qualityLevel: pressure === 'critical' ? 'minimal' : caps.starfield.qualityLevel
							}
						}));
					}
				});

				// Subscribe to memory events for leak detection
				const eventUnsubscribe = memoryManager.onMemoryEvent((event: MemoryEvent) => {
					if (event.type === 'critical') {
						// Significantly reduce quality through frameRateController
						frameRateController.setQualityOverride(0.5);

						// Perform cleanup
						memoryManager.performCleanup();
					}
				});

				// Store unsubscribe functions for cleanup
				memoryManagerUnsubscribes.push(pressureUnsubscribe, eventUnsubscribe);
			} catch (error) {
				// Fallback: disable memory monitoring if initialization fails
				console.warn('Memory manager initialization failed, disabling memory monitoring:', error);
				memoryManagerUnsubscribes = [];
			}
		}
	}

	function setupHeroEventListeners() {
		// Define optimized event handlers
		const optimizedResizeCheck = createThrottledRAF(() => {
			if (!frameRateController.shouldRenderFrame()) return;
			detectDeviceCapabilities();
			debouncedOrientationCheck();
		}, 100);

		// Optimized visibility handler
		const visibilityHandler = () => {
			const isVisible = !document.hidden;
			if (lastVisibilityState === isVisible) return;
			lastVisibilityState = isVisible;

			if (document.hidden) {
				frameRateController.setAdaptiveEnabled(false);
			} else {
				frameRateController.setAdaptiveEnabled(true);
			}
		};

		const orientationChangeHandler = () => {
			setTimeout(() => {
				detectDeviceCapabilities();
			}, 300);
		};

		const touchStartHandler = (e: TouchEvent) => {
			if (currentScreen === 'game') e.preventDefault();
		};

		const passiveOptions = { passive: true };
		const nonPassiveOptions = { passive: false };

		if (typeof ResizeObserver === 'function') {
			resizeObserver = new ResizeObserver(optimizedResizeCheck);
			if (arcadeScreen) {
				resizeObserver.observe(arcadeScreen);
				if (isMobileDevice) {
					arcadeScreen.addEventListener('touchstart', touchStartHandler as any, nonPassiveOptions);
				}
			}
		}

		if (typeof window !== 'undefined') {
			window.addEventListener('resize', optimizedResizeCheck, passiveOptions);
			window.addEventListener('orientationchange', orientationChangeHandler, passiveOptions);
			window.addEventListener('scroll', handleScroll, passiveOptions);
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
			touchStart: touchStartHandler as EventListener,
			scroll: handleScroll as EventListener
		};
	}

	// Initialize frame rate controller settings
	function setupFrameRateController() {
		// Get device capabilities once
		const caps = get(deviceCapabilities);

		// Derive FPS target from caps.updateInterval if available,
		// otherwise fall back to 60 (high/medium) or 30 (low)
		let targetFPS: number;
		if (caps.updateInterval) {
			targetFPS = Math.max(15, Math.min(120, Math.round(1000 / (caps.updateInterval || 16))));
		} else {
			targetFPS = isLowPerformanceDevice ? 30 : 60;
		}

		frameRateController.setTargetFPS(targetFPS);

		// Set max frame skipping
		const maxSkip = caps.frameSkip ?? (isLowPerformanceDevice ? 2 : 0);
		frameRateController.setMaxSkippedFrames(maxSkip);

		// Enable adaptive quality control
		frameRateController.setAdaptiveEnabled(true);

		// Subscribe to quality changes to adapt animations
		frameRateUnsubscribe = frameRateController.subscribeQuality((quality) => {
			try {
				// Future: Adapt animation complexity based on quality
			} catch (error) {
				console.warn('Error in quality adjustment callback:', error);
			}
		});
	}

	// Lifecycle hooks
	onMount(() => {
		if (!browser) return;

		console.log('⚡ Hero component mounting');

		currentScreen = 'main';

		// Initialize performance monitoring first
		perfMonitor = setupPerformanceMonitoring();
		// Optional: also mirror module’s visibility optimizations
		capsVisibilityCleanup = setupDevicePerfEventListeners ? setupDevicePerfEventListeners() : null;

		hasMounted = true;

		// Setup frame rate controller
		setupFrameRateController();

		// Initialize core components
		initializeComponents();

		// Set up this component's own listeners
		setupHeroEventListeners();

		// Initial setup - use RAF for first render timing
		const initialRaf = requestAnimationFrame(() => {
			// Check orientation initially
			handleOrientation();

			// PERFORMANCE: Don't auto-start animations in onMount
			// Let reactive statement handle it based on proper conditions
		});

		// You can target #arcade-screen if you prefer scoping rather than :root
		unbindFx = bindFxIntensity({
			// target: document.getElementById('arcade-screen') as HTMLElement,
			// Optional: tweak the curve
			// qualityToIntensity: (q) => 0.5 + (q ** 1.15) * 0.8
		});

		return () => {
			// Cleanup function called if component is unmounted before destroy
			if (initialRaf) cancelAnimationFrame(initialRaf);
		};
	});

	onDestroy(() => {
		if (!browser) return;

		console.log('⚡ Hero component destroying');

		// Get handlers
		const { resize, orientationChange, visibility, touchStart, glassEffects, scroll } =
			eventHandlers || {};

		// Cleanup all animations and managers
		stopAnimations();
		isAnimationInitialized = false;

		// Cleanup other managers
		if (glitchManager) {
			glitchManager.cleanup();
		}

		if (memoryManagerUnsubscribes.length > 0) {
			memoryManager.stopMonitoring();
			memoryManagerUnsubscribes.forEach((unsubscribe) => unsubscribe());
			memoryManagerUnsubscribes = [];
		}

		// Clean up perfMonitor if it exists
		if (perfMonitor) {
			perfMonitor();
			perfMonitor = null;
			if (capsVisibilityCleanup) {
				capsVisibilityCleanup();
				capsVisibilityCleanup = null;
			}
		}

		// Unsubscribe from frameRateController
		if (frameRateUnsubscribe) {
			frameRateUnsubscribe();
			frameRateUnsubscribe = null;
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

		if (scrollTimeout) {
			clearTimeout(scrollTimeout);
			scrollTimeout = null;
		}

		// PERFORMANCE FIX #12: Clear animation timeout
		if (animationInitTimeout) {
			clearTimeout(animationInitTimeout);
			animationInitTimeout = null;
		}

		// Remove event listeners with the same handlers that were added
		if (resize) window.removeEventListener('resize', resize);
		if (orientationChange) window.removeEventListener('orientationchange', orientationChange);
		if (visibility) document.removeEventListener('visibilitychange', visibility);
		if (glassEffects) document.removeEventListener('mousemove', glassEffects);
		if (scroll) window.removeEventListener('scroll', scroll);

		// Remove any other event listeners that might have been added
		if (arcadeScreen && touchStart) {
			arcadeScreen.removeEventListener('touchstart', touchStart);
		}

		// Manually nullify references to DOM elements
		header = undefined as any;
		insertConcept = undefined as any;
		arcadeScreen = undefined as any;

		// Force garbage collection hint when available
		if ((window as any).gc) {
			try {
				(window as any).gc();
			} catch (e) {
				// Ignore errors in garbage collection
			}
		}

		// Clear any other references or pending operations
		currentTimeline = null;

		unbindFx?.();

		// Clean up any GSAP animations that might still be running
		if (typeof window !== 'undefined' && gsap && gsap.ticker) {
			gsap.ticker.remove(() => {}); // Pass an empty function instead of null
			gsap.globalTimeline.clear();
		}

		// Reset state flags
		isScrolling = false;
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

				<div class="screen-bezel"></div>

				<div
					id="arcade-screen"
					data-radius-sync
					class="crt-screen hardware-accelerated relative glow will-change-transform"
					use:fxTuner={{
						// Let quality auto-drive intensity ↓
						followQuality: true,

						// Give stars extra pop by default
						starContrast: 1.25,
						starBrightness: 1.08,
						starAlphaBoost: 1.05,

						// NOTE: If you want to force-disable glass from template, uncomment:
						intensity: 0.85,

						animSpeed: 0.9,
						blurMult: 0.9,

						// Small accessibility boost on hover/focus
						hoverBoost: { contrast: 1.12, brightness: 1.05, alpha: 1.0 }
					}}
					bind:this={arcadeScreen}
				>
					<!-- Every layer inside #arcade-screen inherits the same radius -->
					<div class="phosphor-decay rounded-arcade"></div>
					<div class="shadow-mask rounded-arcade"></div>
					<div class="interlace rounded-arcade"></div>

					<!-- Update all screen effects to include unified radius -->
					<div class="screen-reflection rounded-arcade"></div>
					<div class="screen-glare rounded-arcade"></div>

					<div class="glow-effect rounded-arcade"></div>

					{#if currentScreen === 'main'}
						<!-- Persistent Blank CRT Monitor Background -->
						<div
							id="blank-monitor-background"
							class="absolute inset-0 blank-crt-monitor rounded-arcade"
							style="z-index: 1;"
						></div>

						<!-- Starfield Layer (explicit z-index below glass/scanlines) -->
						<div class="starfield-container rounded-arcade" style="z-index: 15;">
							<VectorStarfield
								enabled={currentScreen === 'main'}
								layers={$deviceCapabilities.tier === 'high'
									? 3
									: $deviceCapabilities.tier === 'medium'
										? 2
										: 1}
								density={($deviceCapabilities.effectsLevel === 'normal'
									? 1.6
									: $deviceCapabilities.effectsLevel === 'reduced'
										? 1.2
										: 0.8) * frameRateController.getCurrentQuality()}
								maxStars={$deviceCapabilities.maxEffectUnits}
								targetFPS={Math.round(1000 / $deviceCapabilities.updateInterval)}
								baseSpeed={$deviceCapabilities.starfield.animationSpeed *
									(0.8 + 0.4 * frameRateController.getCurrentQuality())}
								qualityScale={frameRateController.getCurrentQuality()}
								lowPowerMode={$deviceCapabilities.tier === 'low' ||
									$deviceCapabilities.preferReducedMotion}
								lineWidth={1.1}
								color="#CFFFE6"
								opaque={false}
								fovScale={0.34}
							/>
						</div>

						<!-- UI -->
						<div
							id="text-wrapper"
							class="absolute inset-0 flex flex-col items-center justify-center p-2 mt-12 box-border"
							style="z-index: 40;"
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
						</div>
					{:else if currentScreen === 'game'}
						<GameScreen on:stateChange={handleGameStateChange} />
					{/if}

					<!-- Glass stack (now clearly above stars, below scanlines) -->
					<div
						class="screen-glass-container rounded-arcade hardware-accelerated {fxClass}"
						style="z-index: 20;"
					>
						<div class="screen-glass-outer rounded-arcade"></div>
						<div class="screen-glass-inner rounded-arcade"></div>
						<div class="screen-glass-reflection rounded-arcade"></div>
						<div class="screen-glass-edge rounded-arcade"></div>
						<div class="screen-glass-smudges rounded-arcade"></div>
						<div class="screen-glass-dust rounded-arcade"></div>
						<div class="screen-glass-specular rounded-arcade"></div>
						<div class="screen-internal-reflection rounded-arcade"></div>
					</div>

					<!-- Scanlines always on top (visual-only) -->
					<div
						id="scanline-overlay"
						class="absolute inset-0 pointer-events-none rounded-arcade"
						style="z-index: 30;"
					></div>
				</div>
			</div>
		</div>
	</div>

	{#if currentScreen === 'game'}
		<ControlsPortal>
			<div class="controls-container">
				<!-- Pass the current game state to GameControls -->
				<GameControls
					on:control={handleControlInput}
					gameState={currentGameState}
					allowReset={currentGameState === 'gameover'}
				/>
			</div>
		</ControlsPortal>
	{/if}
</section>

<style lang="css">
	/* ==========================================================================
       Root Variables
       ========================================================================== */
	:root {
		/* Layout */
		--arcade-screen-width: min(95vw, 800px);
		--arcade-screen-height: min(70vh, 600px);
		--border-radius: 4vmin;
		--screen-recess: 1.8vmin;
		--bezel-thickness: 0.8vmin;

		/* Typography */
		--header-font-size: 70px;
		--insert-concept-font-size: 4.45vmin;

		/* Colors */
		--header-text-color: rgba(227, 255, 238, 1);
		--insert-concept-color: rgba(245, 245, 220, 1);
		--cabinet-specular: rgba(255, 255, 255, 0.7);
		--glass-reflection: rgba(255, 255, 255, 0.15);
		--screen-glow-opacity: 0.6;

		/* Master intensity (0 = off, 1 = normal, >1 = stronger) */
		--fx-intensity: 1;

		/* Animation speed multiplier (0 = no motion, 1 = normal, 0.7 = calmer) */
		--fx-anim-speed: 1;

		/* Optional global blur multiplier for glassy looks */
		--fx-blur-mult: 1;

		/* Enhanced Glass Physics */
		--glass-thickness: 0.4vmin;
		--glass-reflectivity: 0.15;
		--glass-specular-intensity: 0.7;
		--glass-edge-highlight: rgba(255, 255, 255, 0.8);
		--glass-dust-opacity: 0.03;
		--glass-smudge-opacity: 0.04;
		--internal-reflection-opacity: 0.045;

		--fx-glass-reflectivity: calc(var(--glass-reflectivity) * var(--fx-intensity));
		--fx-glass-specular-intensity: calc(var(--glass-specular-intensity) * var(--fx-intensity));
		--fx-glass-smudge-opacity: calc(var(--glass-smudge-opacity) * var(--fx-intensity));
		--fx-glass-dust-opacity: calc(var(--glass-dust-opacity) * var(--fx-intensity));
		--fx-internal-reflection-opacity: calc(
			var(--internal-reflection-opacity) * var(--fx-intensity)
		);

		/* Defaults if not set by the action */
		--star-contrast: 1;
		--star-brightness: 1;
		--star-alpha: 1;

		/* Shadows & Effects */
		--cabinet-shadow:
			0 20px 40px rgba(0, 0, 0, 0.25), 0 5px 15px rgba(0, 0, 0, 0.15),
			inset 0 3px 8px rgba(0, 0, 0, 0.2);

		--screen-shadow:
			0 0 30px rgba(0, 0, 0, 0.8), inset 0 0 50px rgba(0, 0, 0, 0.9),
			inset 0 0 2px rgba(255, 255, 255, 0.3), inset 0 0 100px rgba(0, 0, 0, 0.7);

		--bezel-shadow:
			inset 0 0 20px rgba(0, 0, 0, 0.9), 0 0 2px var(--glass-reflection),
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
	@media (min-width: 768px) {
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

	/* Fix for Hero.svelte - keep this minimal so it doesn't interfere with GameControls */
	.fixed-game-controls {
		display: none; /* Default hidden on larger screens */
		/* Remove z-index since the portal will handle stacking context */
	}

	/* Add this to your media query for smaller screens if needed */
	@media (max-width: 1023px) {
		/* lg breakpoint in Tailwind */
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
		background: transparent !important;
		background-color: transparent !important;
		background-image: none !important;
		transform-style: preserve-3d;
		isolation: isolate; /* keep all blending local */
	}

	/* ==========================================================================
	   Rounded Corner Sync (single source of truth for all inner layers)
	   ========================================================================== */

	/* Make the radius enforceable at the container level */
	#arcade-screen[data-radius-sync] {
		/* Ensure the container itself has the canonical radius */
		border-radius: var(--border-radius);
		/* Strong clipping for children including blend/blur layers */
		overflow: hidden;

		/* GPU-safe clip to avoid subpixel bleed */
		clip-path: inset(0 round var(--border-radius));
		-webkit-clip-path: inset(0 round var(--border-radius));

		/* Helps Safari/WebKit clip certain composited effects reliably */
		-webkit-mask-image: radial-gradient(circle at 50% 50%, #000 70%, #000 71%);
		-webkit-mask-composite: source-over;
	}

	/* Any element meant to match the screen’s radius just opts into this */
	.rounded-arcade {
		border-radius: var(--border-radius) !important;
		overflow: hidden; /* prevent subtle corners from peeking through */
	}

	/* Safety net: the most common layers inside #arcade-screen inherit radius */
	#arcade-screen[data-radius-sync]
		:where(
			.blank-crt-monitor,
			.phosphor-decay,
			.shadow-mask,
			.interlace,
			.screen-reflection,
			.screen-glare,
			.glow-effect,
			.screen-glass-container,
			.screen-glass-container > div,
			#scanline-overlay
		) {
		border-radius: inherit;
	}

	/* Ensure the container actually provides the “inherit” value */
	#arcade-screen[data-radius-sync] {
		border-radius: var(--border-radius);
	}

	/* ==========================================================================
   Blank CRT Monitor Background - Starfield Ready
   ========================================================================== */
	.blank-crt-monitor {
		/* BULLETPROOF: Force immediate black background */
		background-color: #000 !important;
		background-image:
		/* Subtle CRT monitor texture */
			radial-gradient(circle at center, #000 0%, #0a0a0a 40%, #000 100%),
			/* Very subtle scanline texture */
				repeating-linear-gradient(0deg, transparent 0px, rgba(0, 20, 40, 0.1) 1px, transparent 2px) !important;

		/* BULLETPROOF: Ensure it's always visible and stable */
		opacity: 1 !important;
		visibility: visible !important;
		display: block !important;

		/* BULLETPROOF: Force hardware acceleration and prevent re-rendering */
		transform: translateZ(0) !important;
		backface-visibility: hidden !important;
		-webkit-backface-visibility: hidden !important;

		/* BULLETPROOF: Prevent any transition delays or animations */
		transition: none !important;
		animation: none !important;

		/* BULLETPROOF: Create isolation to prevent parent effects */
		isolation: isolate !important;
		contain: layout style paint !important;

		/* BULLETPROOF: Ensure it covers everything */
		position: absolute !important;
		inset: 0 !important;
		width: 100% !important;
		height: 100% !important;

		/* BULLETPROOF: Match the screen border radius */
		border-radius: var(--border-radius) !important;
		overflow: hidden !important;

		/* STARFIELD READY: Base layer positioning */
		z-index: 1 !important;
		pointer-events: none !important;

		/* BULLETPROOF: Override any competing styles */
		background-blend-mode: normal !important;
		mix-blend-mode: normal !important;
		filter: none !important;
		backdrop-filter: none !important;

		/* BULLETPROOF: Prevent scroll-induced re-rendering */
		will-change: auto !important;
		content-visibility: visible !important;
	}
	/* BULLETPROOF: Extra safety overrides for all scenarios */
	#blank-monitor-background.blank-crt-monitor {
		background: #000 !important;
		opacity: 1 !important;
	}

	/* BULLETPROOF: Scroll protection - never allow background changes during scroll */
	.blank-crt-monitor {
		opacity: 1 !important;
		visibility: visible !important;
		display: block !important;
		transform: translateZ(0) !important;
	}

	.blank-crt-monitor:after {
		content: '';
		position: absolute;
		inset: 0;
		background: radial-gradient(circle at center, #000 20%, #001c4d 70%, #000000 100%);
		z-index: -2;
	}

	/* BULLETPROOF: State change protection - maintain background during all state changes */
	#hero .blank-crt-monitor,
	#arcade-screen .blank-crt-monitor,
	.arcade-screen-wrapper .blank-crt-monitor {
		background-color: #000 !important;
		background-image:
			radial-gradient(circle at center, #000 0%, #0a0a0a 40%, #000 100%),
			repeating-linear-gradient(0deg, transparent 0px, rgba(0, 20, 40, 0.1) 1px, transparent 2px) !important;
	}

	/* ==========================================================================
   STARFIELD READY: Future starfield container preparation
   ========================================================================== */
	.starfield-container {
		position: absolute;
		inset: 0;
		contain: layout; /* no style/paint containment */
		content-visibility: visible;
		pointer-events: none;
		border-radius: var(--border-radius);
		overflow: hidden;
		isolation: auto;
	}

	.starfield-container canvas {
		filter: contrast(var(--star-contrast)) brightness(var(--star-brightness));
		opacity: var(--star-alpha);
		will-change: filter, opacity;
	}

	/* Add subtle CRT monitor characteristics */
	.blank-crt-monitor::before {
		content: '';
		position: absolute;
		inset: 0;

		/* Very subtle monitor curvature effect */
		background: radial-gradient(
			ellipse at center,
			transparent 0%,
			transparent 60%,
			rgba(0, 0, 0, 0.1) 80%,
			rgba(0, 0, 0, 0.3) 100%
		);

		/* Subtle inner shadow to simulate monitor depth */
		box-shadow: inset 0 0 50px rgba(0, 0, 0, 0.8);

		border-radius: inherit;
		pointer-events: none;
		z-index: 1;
	}

	/* Light theme variant */
	/* BULLETPROOF: Light theme variant - starfield ready */
	:global(html.light) .blank-crt-monitor {
		background-color: #111 !important;
		background-image:
			radial-gradient(circle at center, #111 0%, #222 40%, #111 100%),
			repeating-linear-gradient(
				0deg,
				transparent 0px,
				rgba(255, 255, 255, 0.02) 1px,
				transparent 2px
			) !important;

		/* BULLETPROOF: Extra safety for light theme */
		opacity: 1 !important;
		visibility: visible !important;
		display: block !important;
	}

	:global(html.light) .blank-crt-monitor::before {
		box-shadow: inset 0 0 50px rgba(0, 0, 0, 0.5);
	}

	/* BULLETPROOF: Light theme state protection */
	:global(html.light) #blank-monitor-background.blank-crt-monitor,
	:global(html.light) .blank-crt-monitor {
		background-color: #111 !important;
	}

	/* ==========================================================================
       Visual Effects Presets
       ========================================================================== */

	.fx-subtle {
		--fx-intensity: 0.55;
		--fx-anim-speed: 0.75;
		--fx-blur-mult: 0.75;
	}
	.fx-default {
		--fx-intensity: 1;
		--fx-anim-speed: 1;
		--fx-blur-mult: 1;
	}
	.fx-bold {
		--fx-intensity: 1.35;
		--fx-anim-speed: 1.05;
		--fx-blur-mult: 1.15;
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
		background:
			var(--screen-curve),
			linear-gradient(
				35deg,
				transparent 0%,
				rgba(255, 255, 255, 0.02) 25%,
				rgba(255, 255, 255, 0.05) 47%,
				rgba(255, 255, 255, 0.02) 50%,
				transparent 100%
			);
		mix-blend-mode: overlay;
		opacity: clamp(0, 1, calc(0.7 * var(--fx-intensity)));
	}

	:global(html.light) .screen-reflection {
		opacity: clamp(0, 1, calc(0.4 * var(--fx-intensity)));
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
		font-variation-settings: 'wght' 700;
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
       Theme-Specific Styles
       ========================================================================== */
	/* Light Theme */
	:global(html.light) #arcade-cabinet {
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, transparent 15%),
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
		will-change: transform;
		contain: layout style paint;
		content-visibility: visible;
	}

	/* Disable text selection in the Hero section */
	#hero,
	#text-wrapper,
	#header,
	#insert-concept {
		user-select: none;
		-webkit-user-select: none; /* Safari */
		-moz-user-select: none; /* Firefox */
		-ms-user-select: none; /* IE/Edge */
	}

	/* Only animate these properties, not both */
	@media (max-width: 768px) {
		#header {
			will-change: transform;
		}

		#insert-concept {
			will-change: opacity;
		}
	}

	.animate-transform {
		will-change: transform;
		transform: translateZ(0);
	}

	.animate-opacity {
		will-change: opacity;
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

		/* BULLETPROOF: Remove background - let blank monitor handle it */
		background: transparent !important;
		background-color: transparent !important;
		background-image: none !important;

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
		background:
			repeating-linear-gradient(
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
		opacity: clamp(0, 1, calc(0.5 * var(--fx-intensity)));
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
		opacity: clamp(0, 1, calc(0.8 * var(--fx-intensity)));
		z-index: 2;
	}

	:global(.game-screen-content) {
		/* These styles help game content appear properly through the glass */
		filter: contrast(1.05) brightness(1.1);
		will-change: transform;
		transform: translateZ(0);
	}

	/* ==========================================================================
       Screen Effects and Overlays
       ========================================================================== */
	#scanline-overlay {
		background: linear-gradient(0deg, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0.0675) 51%);
		background-size: 100% 4px;
		animation: scanline 0.2s linear infinite;
		border-radius: inherit;
		z-index: 25;
		pointer-events: none;
		/* ensure it doesn’t unexpectedly isolate/flatten other layers */
		isolation: auto;
		mix-blend-mode: normal;
		will-change: background-position;
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

	/* ==========================================================================
   Enhanced Glass Effects System - Performance Optimized (updated opacities)
   ========================================================================== */
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
		mix-blend-mode: overlay;
		transform: perspective(1000px) translateZ(var(--glass-thickness));
		opacity: clamp(0, 1, calc(0.7 * var(--fx-intensity)));
		backdrop-filter: brightness(1.03) contrast(1.05);
		/* optional, if you want blur to scale softly */
		filter: blur(calc(0px * var(--fx-blur-mult)));
	}

	/* Remove backdrop-filter on low-performance devices */
	html:not([data-device-type='low-performance']) .screen-glass-outer {
		backdrop-filter: brightness(1.03) contrast(1.05);
		filter: blur(calc(0px * var(--fx-blur-mult)));
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
		opacity: clamp(0, 1, calc(0.5 * var(--fx-intensity)));
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
		opacity: clamp(0, 1, calc(0.6 * var(--fx-intensity)));
		animation-duration: calc(8s / var(--fx-anim-speed));
		border-radius: var(--border-radius);
		mix-blend-mode: screen;
		animation: slowGlassShift ease-in-out infinite alternate;
	}

	/* Disable expensive glass reflection animation on low-performance devices */
	html[data-device-type='low-performance'] .screen-glass-reflection {
		animation: none;
		opacity: 0.3;
	}

	.screen-glass-edge {
		position: absolute;
		inset: 0;
		border: 2px solid var(--glass-edge-highlight);
		border-radius: var(--border-radius);
		opacity: clamp(0, 1, calc(0.12 * var(--fx-intensity)));
		box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.1);
		background: transparent;
		background-clip: padding-box;
		backdrop-filter: blur(0.5px);
	}

	.screen-glass-smudges {
		position: absolute;
		inset: 0;
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
		opacity: clamp(0, 1, var(--fx-glass-smudge-opacity));
		filter: contrast(120%) brightness(150%) blur(calc(0.2px * var(--fx-blur-mult)));
		border-radius: var(--border-radius);
		mix-blend-mode: overlay;
		transform: scale(1.01);
	}

	.screen-glass-dust {
		position: absolute;
		inset: 0;
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='dust'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.5 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23dust)'/%3E%3C/svg%3E");
		opacity: clamp(0, 1, var(--fx-glass-dust-opacity));
		filter: blur(calc(0.15px * var(--fx-blur-mult)));
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
		opacity: clamp(0, 1, calc(0.2 * var(--fx-intensity)));
		animation-duration: calc(10s / var(--fx-anim-speed));
		border-radius: var(--border-radius);
		mix-blend-mode: screen;
		filter: blur(3px);
		animation: subtleSpecularShift ease-in-out infinite alternate;
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
		opacity: clamp(0, 1, var(--fx-internal-reflection-opacity));
		animation-duration: calc(15s / var(--fx-anim-speed));
		border-radius: var(--border-radius);
		mix-blend-mode: screen;
		animation: subtleReflectionShift ease-in-out infinite alternate;
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

	/* ==========================================================================
       Light Theme Variants
       ========================================================================== */
	:global(html.light) .screen-glass {
		background: linear-gradient(
			35deg,
			transparent 0%,
			rgba(255, 255, 255, 0.01) 25%,
			rgba(255, 255, 255, 0.02) 47%,
			rgba(255, 255, 255, 0.01) 50%,
			transparent 100%
		);
		opacity: clamp(0, 1, calc(0.6 * var(--fx-intensity)));
	}

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

	:global(html.light) #scanline-overlay {
		opacity: calc(0.6 * var(--fx-intensity));
		animation-duration: calc(0.2s / var(--fx-anim-speed));
		background-size: 100% 3px;
	}

	:global(html.light) #arcade-screen {
		box-shadow:
			0 0 30px rgba(0, 0, 0, 0.1),
			inset 0 0 50px rgba(0, 0, 0, 0.2),
			inset 0 0 2px rgba(255, 255, 255, 0.5),
			inset 0 0 100px rgba(0, 0, 0, 0.1);
		background: linear-gradient(145deg, #111 0%, #222 100%);
		box-shadow:
        /* Screen recess shadow */
			0 0 20px rgba(0, 0, 0, 0.08),
			/* Inner screen shadow */ inset 0 0 40px rgba(0, 0, 0, 0.25),
			/* Subtle glass effect */ inset 0 0 2px rgba(255, 255, 255, 0.4);
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
			rgba(240, 240, 240, 0.2) 0%,
			rgba(250, 250, 250, 0.2) 50%,
			rgba(240, 240, 240, 0.2) 100%
		);
		mix-blend-mode: multiply;
	}

	/* ==========================================================================
      Mobile Optimizations
      ========================================================================== */
	@media (max-width: 768px) {
		/* Optimize CRT effects for mobile */
		.crt-screen {
			--shadow-mask-size: 2px; /* Smaller mask for better performance */
			--bloom-intensity: 0.3; /* Reduced bloom effect */
		}

		.shadow-mask {
			opacity: 0.2; /* Reduce opacity for better performance */
			background-size: 2px 2px; /* Simpler pattern */
		}

		.interlace {
			background: repeating-linear-gradient(
				0deg,
				rgba(0, 0, 0, 0.15) 0px,
				/* Less contrast */ transparent 1px,
				transparent 3px /* Wider spacing */
			);
		}

		/* Optimize phosphor decay animation */
		.phosphor-decay {
			animation: phosphorPersistence 24ms linear infinite; /* Slower updates */
		}

		/* Streamlined scanline effect */
		#scanline-overlay {
			background-size: 100% 6px; /* Wider scanlines */
			animation: scanline linear infinite; /* Slower movement */
		}

		/* Apply rounded cabinet styles for mobile */
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

		/* Ensure proper border-radius on all elements */
		.arcade-screen-wrapper,
		.screen-bezel {
			overflow: hidden;
			border-radius: var(--border-radius, 12px);
		}

		.hardware-accelerated {
			/* More targeted will-change on mobile */
			will-change: transform;
			/* Simplify containment for better mobile performance */
			contain: layout;
			content-visibility: auto;
			/* Don't use view transitions on mobile */
			view-transition-name: none;
		}
	}

	/* ==========================================================================
      Mobile Light Mode Optimizations
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

		/* Mobile Light Mode Cabinet Styles */
		:global(html.light) #arcade-cabinet {
			background: linear-gradient(
				180deg,
				var(--light-cabinet-primary) 0%,
				var(--light-cabinet-secondary) 100%
			);
			box-shadow:
				0 10px 20px rgba(0, 0, 0, 0.08),
				0 5px 15px rgba(0, 0, 0, 0.04),
				inset 0 1px 2px var(--light-highlight);
			border-radius: var(--light-cabinet-border-radius);
		}

		:global(html.light) .cabinet-plastic {
			background: linear-gradient(
				180deg,
				var(--light-cabinet-secondary) 0%,
				var(--light-cabinet-tertiary) 100%
			);
			box-shadow:
				inset 0 5px 15px rgba(0, 0, 0, 0.02),
				inset -3px 0 8px rgba(0, 0, 0, 0.01),
				inset 3px 0 8px rgba(0, 0, 0, 0.01),
				inset 0 -3px 8px rgba(0, 0, 0, 0.02);
			border-radius: var(--light-cabinet-border-radius);
			border: 1px solid var(--light-cabinet-border-color);
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
				rgba(0, 0, 0, var(--light-cabinet-texture-opacity)) 5px,
				rgba(0, 0, 0, var(--light-cabinet-texture-opacity)) 6px
			);
			opacity: 0.2;
			mix-blend-mode: soft-light;
		}

		:global(html.light) .screen-bezel {
			background: linear-gradient(
				to bottom,
				var(--light-bezel-gradient-start) 0%,
				var(--light-bezel-gradient-end) 100%
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
				var(--light-cabinet-accent) 0%,
				rgba(0, 150, 255, 0.2) 50%,
				var(--light-cabinet-accent) 100%
			);
			filter: blur(3px);
		}

		/* Adjust arcade-screen-wrapper margin for mobile */
		:global(html.light) .arcade-screen-wrapper {
			margin-top: calc(-0.8 * var(--navbar-height, 64px));
		}

		/* Ensure proper border-radius on light mode elements */
		:global(html.light) .cabinet-plastic,
		:global(html.light) .arcade-screen-wrapper,
		:global(html.light) .screen-bezel {
			overflow: hidden;
			border-radius: var(--light-cabinet-border-radius);
		}
	}

	/* ==========================================================================
      Low Performance Device Optimizations
      ========================================================================== */
	html[data-device-type='low-performance'] .shadow-mask,
	html[data-device-type='low-performance'] .interlace,
	html[data-device-type='low-performance'] .phosphor-decay {
		display: none; /* Disable expensive effects on low-performance devices */
	}

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

	/* iOS-specific optimizations */
	.ios-optimized .shadow-mask,
	.ios-optimized .phosphor-decay {
		display: none;
	}

	.ios-optimized .interlace {
		opacity: 0.3;
		background-size: 100% 6px;
	}

	.ios-optimized #scanline-overlay {
		opacity: 0.5;
		background-size: 100% 6px;
	}

	/* Auto-disable some layers when intensity is very low */
	.fx-subtle .screen-glass-smudges,
	.fx-subtle .screen-glass-dust {
		display: none;
	}

	html[data-device-type='low-performance'] .screen-glass-reflection,
	html[data-device-type='low-performance'] .screen-glare {
		animation: none;
	}

	/* ==========================================================================
      Fix iOS overscroll issues
      ========================================================================== */
	@supports (-webkit-overflow-scrolling: touch) {
		body,
		html {
			position: fixed;
			width: 100%;
			height: 100%;
			overflow: hidden;
		}

		#hero {
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			-webkit-overflow-scrolling: touch;
			overflow-y: scroll;
		}
	}
</style>

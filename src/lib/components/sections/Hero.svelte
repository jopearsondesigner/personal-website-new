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
	import { deviceCapabilities, setupPerformanceMonitoring } from '$lib/utils/device-performance';
	import {
		memoryManager,
		currentMemoryInfo,
		memoryEvents,
		memoryPressure,
		memoryUsageStore,
		objectPoolStatsStore,
		type MemoryInfo,
		type MemoryEvent,
		type MemoryPressure
	} from '$lib/utils/memory-manager';
	import { frameRateController } from '$lib/utils/frame-rate-controller';
	import { createThrottledRAF } from '$lib/utils/animation-helpers';
	import BoostCue from '$lib/components/ui/BoostCue.svelte';
	import type { GameState } from '$lib/types/game';

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
	let hasError = false;
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
	let frameRateUnsubscribe: Function | null = null;

	let currentGameState: GameState = 'idle';

	// FIXED: Add scroll state management to prevent unnecessary resets
	let isScrolling = false;
	let scrollTimeout: number | null = null;
	let lastVisibilityState = true;

	let hasMounted = false;

	// Use the frameRateController for efficient CSS updates
	$: if (browser && $layoutStore?.navbarHeight !== undefined) {
		// Only update if we should render this frame or the value has changed significantly
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

	// FIXED: Move all function declarations to the top before any reactive statements

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

	// FIXED: Add scroll event handler to prevent background resets during scroll
	function handleScroll() {
		if (!browser) return;

		isScrolling = true;

		// Clear existing timeout
		if (scrollTimeout) {
			clearTimeout(scrollTimeout);
		}

		// Debounce scroll end detection
		scrollTimeout = window.setTimeout(() => {
			isScrolling = false;
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

		// FIXED: Prevent screen changes during scroll to avoid background flicker
		if (isScrolling) return;

		// Update the screen state
		screenStore.set(newScreen);
		currentScreen = newScreen;

		// Create a transition function to handle the change
		const performTransition = () => {
			// Stop current animations only if needed
			if (prevScreen === 'main' && newScreen !== 'main') {
				// We're leaving the main screen, stop animations
				stopAnimations(false); // FIXED: Pass parameter to preserve background

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
				// We're returning to main screen, restart animations

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

	// FIXED: Modified animation control functions 
	function startAnimations(elements: {
		header: HTMLElement;
		insertConcept: HTMLElement;
		arcadeScreen: HTMLElement;
	}) {
		try {
			// Stop existing animations first
			stopAnimations(false);

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
				)
				.fromTo(
					elements.arcadeScreen,
					{
						filter: 'brightness(0) blur(2px)',
						transform: 'scale(0.98)'
					},
					{
						filter: 'brightness(1) blur(0)',
						transform: 'scale(1)',
						duration: 2.5,
						ease: 'power2.out'
					},
					0
				);

			if (timeline) {
				currentTimeline = timeline;
				timeline.play();
			}

		} catch (error) {
			console.error('Animation initialization failed:', error);
		}
	}

	// FIXED: Modified stopAnimations 
	function stopAnimations(clearBackground = true) {
		if (!browser) return;

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
			if (!frameRateController.shouldRenderFrame()) return;

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
				specular.style.opacity = 0.2 + Math.abs(offsetX * offsetY) * 0.1;
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
				// Use transform for hardware acceleration
				arcadeScreen.style.transform = 'translateZ(0)';
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

				// Subscribe to memory pressure events
				const pressureUnsubscribe = memoryManager.onMemoryPressure((pressure: MemoryPressure) => {
					// Reduce quality through frameRateController
					frameRateController.setQualityOverride(0.7);
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

	function initializeAnimations() {
		if (currentScreen === 'main') {
			const elements = { header, insertConcept, arcadeScreen };
			if (elements.header && elements.insertConcept && elements.arcadeScreen) {
				// Start animations with the validated elements
				startAnimations(elements);
			}
		}
	}

	function setupEventListeners() {
		// Define optimized event handlers
		const optimizedResizeCheck = createThrottledRAF(() => {
			// Only perform resize operations if frameRateController allows
			if (!frameRateController.shouldRenderFrame()) return;

			// Update device capabilities on resize
			detectDeviceCapabilities();
			debouncedOrientationCheck();

		}, 100);

		// FIXED: Modified visibility handler
		const visibilityHandler = () => {
			const isVisible = !document.hidden;

			// Track visibility changes to prevent unnecessary resets
			if (lastVisibilityState === isVisible) return;
			lastVisibilityState = isVisible;

			if (document.hidden) {
				// Pause frame rate controller
				if (frameRateController && typeof frameRateController.setAdaptiveEnabled === 'function') {
					frameRateController.setAdaptiveEnabled(false);
				}
			} else {
				// Resume frame rate controller
				if (frameRateController && typeof frameRateController.setAdaptiveEnabled === 'function') {
					frameRateController.setAdaptiveEnabled(true);
				}
			}
		};

		const orientationChangeHandler = () => {
			// Detect new device capabilities after orientation change
			setTimeout(() => {
				detectDeviceCapabilities();
			}, 300);
		};

		// Create touch event handler for mobile
		const touchStartHandler = (e: TouchEvent) => {
			if (currentScreen === 'game') {
				e.preventDefault();
			}
		};

		// Use passive option for all event listeners
		const passiveOptions = { passive: true };
		const nonPassiveOptions = { passive: false };

		// Setup resize observer with optimized callback
		if (typeof ResizeObserver === 'function') {
			resizeObserver = new ResizeObserver(optimizedResizeCheck);
			if (arcadeScreen) {
				resizeObserver.observe(arcadeScreen);

				// Add touch handler to arcade screen
				if (isMobileDevice) {
					arcadeScreen.addEventListener('touchstart', touchStartHandler as any, nonPassiveOptions);
				}
			}
		}

		// Add event listeners
		if (typeof window !== 'undefined') {
			window.addEventListener('resize', optimizedResizeCheck, passiveOptions);
			window.addEventListener('orientationchange', orientationChangeHandler, passiveOptions);
			// FIXED: Add scroll event listener
			window.addEventListener('scroll', handleScroll, passiveOptions);
		}

		if (typeof document !== 'undefined') {
			document.addEventListener('visibilitychange', visibilityHandler, passiveOptions);
		}

		// Add passive touch events for better scrolling performance on mobile
		if (isMobileDevice && typeof document !== 'undefined') {
			document.addEventListener('touchstart', () => {}, { passive: true });
			document.addEventListener('touchmove', () => {}, { passive: true });
		}

		// Store handlers for cleanup
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
		// Set target FPS based on device capabilities
		const capabilities = get(deviceCapabilities);

		// Setup target FPS (60 for high/medium, 30 for low)
		const targetFPS = isLowPerformanceDevice ? 30 : 60;
		frameRateController.setTargetFPS(targetFPS);

		// Set max frame skipping based on device capabilities
		const maxSkip = capabilities.frameSkip || (isLowPerformanceDevice ? 2 : 0);
		frameRateController.setMaxSkippedFrames(maxSkip);

		// Enable adaptive quality control
		frameRateController.setAdaptiveEnabled(true);

		// Subscribe to quality changes to adapt animations
		frameRateUnsubscribe = frameRateController.subscribeQuality((quality) => {
			// Update animations based on quality level
			try {
				// Animation quality adaptations can be added here if needed
			} catch (error) {
				console.warn('Error in quality adjustment callback:', error);
			}
		});
	}

	// FIXED: Optimized screen management with scroll protection
	$: {
		if (currentScreen === 'main' && browser && !isScrolling && hasMounted) {
			const elements = { header, insertConcept, arcadeScreen };

			if (elements.header && elements.insertConcept && elements.arcadeScreen) {
				requestAnimationFrame(() => {
					if (currentScreen === 'main' && !isScrolling) {
						startAnimations(elements);
					}
				});
			}
		}
	}

	// Lifecycle hooks
	onMount(() => {
		if (!browser) return;

		currentScreen = 'main';

		// Initialize performance monitoring first
		perfMonitor = setupPerformanceMonitoring();

		hasMounted = true;

		// Setup frame rate controller
		setupFrameRateController();

		// Initialize core components
		initializeComponents();

		// Set up event listeners (with passive option)
		setupEventListeners();

		// Initial setup - use RAF for first render timing
		const initialRaf = requestAnimationFrame(() => {
			// Apply power-up sequence effect
			if (arcadeScreen) {
				arcadeScreen.classList.add('power-sequence');
			}

			// Check orientation initially
			handleOrientation();

			// Delayed start of animations (helps with initial render)
			if (isMobileDevice) {
				setTimeout(initializeAnimations, 300);
			} else {
				initializeAnimations();
			}
		});

		return () => {
			// Cleanup function called if component is unmounted before destroy
			if (initialRaf) cancelAnimationFrame(initialRaf);
		};
	});

	onDestroy(() => {
		if (!browser) return;

		// Get handlers
		const { resize, orientationChange, visibility, touchStart, glassEffects, scroll } =
			eventHandlers || {};

		// Cleanup all animations and managers
		stopAnimations();

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

		// FIXED: Clear scroll timeout
		if (scrollTimeout) {
			clearTimeout(scrollTimeout);
			scrollTimeout = null;
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

				<!-- Add explicit border-radius and overflow-hidden -->
				<div class="screen-bezel rounded-[3vmin] overflow-hidden"></div>
				<div
					id="arcade-screen"
					class="crt-screen hardware-accelerated relative glow rounded-[3vmin] overflow-hidden will-change-transform"
					bind:this={arcadeScreen}
				>
					<div class="phosphor-decay rounded-[3vmin]"></div>
					<div class="shadow-mask rounded-[3vmin]"></div>
					<div class="interlace rounded-[3vmin]"></div>

					<!-- Update all screen effects to include border radius -->
					<div class="screen-reflection rounded-[3vmin]"></div>
					<div class="screen-glare rounded-[3vmin]"></div>

					<div class="glow-effect rounded-[3vmin]"></div>

{#if currentScreen === 'main'}
	<!-- Persistent Blank CRT Monitor Background -->
	<div
		id="blank-monitor-background"
		class="absolute inset-0 blank-crt-monitor"
		style="z-index: 1;"
	></div>

	<!-- Content wrapper -->
	<div
		id="text-wrapper"
		class="absolute inset-0 flex flex-col items-center justify-center p-2 mt-12 box-border"
		style="z-index: 5;"
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
							<BoostCue on:boost={(e) => console.log('Boost requested:', e.detail)} />
						</div>
					{:else if currentScreen === 'game'}
						<GameScreen on:stateChange={handleGameStateChange} />
					{/if}

					<div
						class="screen-glass-container rounded-[3vmin] hardware-accelerated"
						style="z-index: 3;"
					>
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
						class="absolute inset-0 pointer-events-none rounded-[3vmin]"
						style="z-index: 4;"
					></div>
				</div>
			</div>
		</div>
	</div>

	{#if currentScreen === 'game'}
		<ControlsPortal>
			<div class="controls-container">
				<!-- MODIFY THIS LINE: Pass the current game state to GameControls -->
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

		/* Enhanced Glass Physics */
		--glass-thickness: 0.4vmin;
		--glass-refraction: 1.2;
		--glass-reflectivity: 0.15;
		--glass-specular-intensity: 0.7;
		--glass-curvature: 3%;
		--glass-edge-highlight: rgba(255, 255, 255, 0.8);
		--glass-dust-opacity: 0.03;
		--glass-smudge-opacity: 0.04;
		--internal-reflection-opacity: 0.045;

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
		/* Use a dark background with subtle gradient */
		background-color: #000;
		background-image: linear-gradient(145deg, #111 0%, #444 100%);
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

	@keyframes tmoldingPulse {
		0%,
		100% {
			opacity: 0.8;
		}
		50% {
			opacity: 1;
		}
	}

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

	@keyframes glassWarmUp {
		0% {
			opacity: 0;
			filter: brightness(0.5) blur(2px);
		}
		30% {
			opacity: 0.3;
			filter: brightness(0.7) blur(1px);
		}
		60% {
			opacity: 0.5;
			filter: brightness(0.85) blur(0.5px);
		}
		100% {
			opacity: 1;
			filter: brightness(1) blur(0);
		}
	}

	.power-sequence .screen-glass-container > div {
		animation: glassWarmUp 3s ease-out forwards;
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
		will-change: transform, opacity;
		contain: layout style paint;
		content-visibility: auto;
		view-transition-name: screen;
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
		/* Use a dark background for CRT screen */
		background-color: #000;
		background-image: linear-gradient(145deg, #000 0%, #111 100%);
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

	:global(.game-screen-content) {
		/* These styles help game content appear properly through the glass */
		filter: contrast(1.05) brightness(1.1);
		will-change: transform;
		transform: translateZ(0);
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
       Screen Effects and Overlays
       ========================================================================== */
	#scanline-overlay {
		background: linear-gradient(0deg, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0.0675) 51%);
		background-size: 100% 4px;
		animation: scanline 0.2s linear infinite;
		border-radius: calc(var(--border-radius) - 0.5vmin);
		z-index: 25;
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

	/* Enhanced Glass Effects System */
	.screen-glass-container {
		position: absolute;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
		z-index: 20; /* Increased z-index to be above all content */
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
		opacity: 0.6;
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

	:global(html.light) #scanline-overlay {
		opacity: 0.4;
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
			rgba(140, 140, 140, 0.5) 0%,
			rgba(180, 180, 180, 0.5) 50%,
			rgba(140, 140, 140, 0.5) 100%
		);
		mix-blend-mode: multiply;
	}

	:global(html.light) .side-panel {
		border-color: rgba(0, 0, 0, 0.06);
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
			animation: scanline 0.3s linear infinite; /* Slower movement */
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

		:global(html.light) .t-molding::after {
			opacity: 0.15;
			box-shadow:
				inset 0 0 6px rgba(255, 255, 255, 0.3),
				0 0 8px var(--light-cabinet-accent);
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
			background: radial-gradient(circle at 50% 50%, var(--light-cabinet-accent), transparent 70%);
			opacity: 0.06;
			filter: blur(15px);
		}

		/* Subtler control panel light in mobile light mode */
		:global(html.light) .control-panel-light {
			opacity: 0.15;
			background: linear-gradient(to bottom, var(--light-cabinet-accent), transparent);
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
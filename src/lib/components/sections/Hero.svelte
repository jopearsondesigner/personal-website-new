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
	import { animationState, screenStore } from '$lib/stores/animation-store';
	import { layoutStore } from '$lib/stores/store';
	import GameControls from '$lib/components/game/GameControls.svelte';
	import { deviceCapabilities, setupPerformanceMonitoring } from '$lib/utils/device-performance';
	import { CanvasStarFieldManager } from '$lib/utils/canvas-star-field';
	import { MemoryMonitor } from '$lib/utils/memory-monitor';
	import { frameRateController } from '$lib/utils/frame-rate-controller';
	import { createThrottledRAF } from '$lib/utils/animation-helpers';

	// Device detection state
	let isMobileDevice = false;
	let isLowPerformanceDevice = false;

	// Component state with typed definitions
	let currentTimeline: gsap.core.Timeline | null = null;
	let header: HTMLElement;
	let insertConcept: HTMLElement;
	let arcadeScreen: HTMLElement;
	let starContainer: HTMLElement;
	let spaceBackground: HTMLElement;
	let currentScreen = 'main';
	let stars: ReturnType<StarFieldManager['getStars']> = [];
	let starFieldManager: InstanceType<typeof animations.StarFieldManager>;
	let canvasStarFieldManager: CanvasStarFieldManager | null = null;
	let glitchManager: InstanceType<typeof animations.GlitchManager>;
	let resizeObserver: ResizeObserver | null = null;
	let orientationTimeout: number | null = null;
	let hasError = false;
	let memoryMonitor: MemoryMonitor | null = null;
	let eventHandlers: {
		resize?: EventListener;
		orientationChange?: EventListener;
		visibility?: EventListener;
		touchStart?: EventListener;
	} = {};

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

	// Device detection function
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

	// Optimized screen management with debouncing
	$: {
		if (currentScreen === 'main' && browser) {
			const elements = {
				header,
				insertConcept,
				arcadeScreen
			};

			if (elements.header && elements.insertConcept && elements.arcadeScreen) {
				// We need to reset animation state AND check if we need to reinitialize the star field
				animationState.resetAnimationState();

				// If the star field manager exists but was stopped, we should restart it
				if (canvasStarFieldManager) {
					// First check if the canvas still exists - it might have been removed when switching screens
					const canvasExists = starContainer && starContainer.querySelector('.star-field-canvas');

					if (!canvasExists) {
						// Canvas was removed, we need to re-create it
						canvasStarFieldManager.setContainer(starContainer);
					}

					// Start the star field animation
					canvasStarFieldManager.start();
				}
				// Initialize canvas star field manager if it doesn't exist
				else if (starContainer) {
					// Get device-appropriate star count
					const capabilities = get(deviceCapabilities);
					const starCount =
						capabilities.maxStars || (isLowPerformanceDevice ? 20 : isMobileDevice ? 40 : 60);

					// Create a new canvas star field manager
					canvasStarFieldManager = new CanvasStarFieldManager(animationState, starCount);

					// Set the container for the canvas
					canvasStarFieldManager.setContainer(starContainer);

					// Configure features based on device capabilities
					canvasStarFieldManager.setUseWorker(!isLowPerformanceDevice);
					canvasStarFieldManager.setUseContainerParallax(!isLowPerformanceDevice);
				}

				// Use Promise.resolve().then to ensure DOM is ready
				Promise.resolve().then(() => {
					// Make sure we start the stars
					canvasStarFieldManager?.start();
					startAnimations(elements);
				});
			}
		} else if (currentScreen !== 'main') {
			stopAnimations();
		}
	}

	// Event handlers
	function handleScreenChange(event: CustomEvent) {
		const newScreen = event.detail;
		const prevScreen = currentScreen;

		// Don't do anything if screen hasn't changed
		if (newScreen === prevScreen) return;

		// Update the screen state
		screenStore.set(newScreen);
		currentScreen = newScreen;

		// Create a transition function to handle the change
		const performTransition = () => {
			// Stop current animations only if needed
			if (prevScreen === 'main' && newScreen !== 'main') {
				// We're leaving the main screen, stop animations
				stopAnimations();
			} else if (newScreen === 'main' && prevScreen !== 'main') {
				// We're returning to main screen, restart animations
				if (canvasStarFieldManager && starContainer) {
					// First ensure the container is properly set
					canvasStarFieldManager.setContainer(starContainer);

					// Then restart the animation
					canvasStarFieldManager.start();

					// Start other animations if elements exist
					const elements = { header, insertConcept, arcadeScreen };
					if (elements.header && elements.insertConcept && elements.arcadeScreen) {
						// Only reset animation state flags, not the whole state
						animationState.resetAnimationState();
						startAnimations(elements);
					}
				}
			}

			// Dispatch a custom event for screen transition complete
			const detail = { from: prevScreen, to: newScreen };
			if (arcadeScreen) {
				arcadeScreen.dispatchEvent(new CustomEvent('screentransitioncomplete', { detail }));
			}
		};

		// Use requestAnimationFrame for smoother transitions
		requestAnimationFrame(performTransition);
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

	// Orientation handling
	function handleOrientation() {
		if (!browser) return;

		const isLandscape = window.innerWidth > window.innerHeight;
		requestAnimationFrame(() => {
			document.body.classList.toggle('landscape', isLandscape);
		});
	}

	function debouncedOrientationCheck() {
		if (orientationTimeout) {
			clearTimeout(orientationTimeout);
		}
		orientationTimeout = window.setTimeout(handleOrientation, 150);
	}

	// Timeline creation helper
	function createOptimizedTimeline(elements: any) {
		if (!browser) return null;

		try {
			const isMobile = window.innerWidth < 768;
			const isLowPerformance = isLowPerformanceDevice;

			// Clear any existing timelines
			if (currentTimeline) {
				currentTimeline.kill();
			}

			// When in lower performance mode, use simpler animations
			if (isLowPerformance) {
				// Create simpler timeline
				const timeline = gsap.timeline({
					paused: true,
					repeat: -1,
					defaults: {
						ease: 'power1.inOut',
						duration: 1.5,
						overwrite: 'auto'
					}
				});

				// Use a single, simple animation for low-performance devices
				timeline.to(elements.insertConcept, {
					opacity: 0.3,
					yoyo: true,
					repeat: 1
				});

				return timeline;
			}

			// Standard timeline with device-appropriate settings
			const timeline = gsap.timeline({
				paused: true,
				defaults: {
					ease: 'power1.inOut',
					immediateRender: false,
					overwrite: 'auto'
				}
			});

			// Adapt animation parameters for mobile
			const animDuration = isMobile ? 0.15 : 0.1; // Slower on mobile
			const animDistance = isMobile ? 1 : 2; // Less movement on mobile
			const opacityDuration = isMobile ? 1.5 : 1; // Slower fade on mobile

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

	// Animation control functions
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

			// Start canvas star field if it exists
			if (canvasStarFieldManager) {
				// Get device-appropriate settings from capabilities
				const capabilities = get(deviceCapabilities);

				// Apply device capability adaptations if available
				if (capabilities) {
					canvasStarFieldManager.adaptToDeviceCapabilities(capabilities);
				}

				canvasStarFieldManager.start();
			}
			// Initialize canvas star field manager if it doesn't exist
			else if (starContainer) {
				// Get device-appropriate star count
				const capabilities = get(deviceCapabilities);
				const starCount =
					capabilities.maxStars || (isLowPerformanceDevice ? 20 : isMobileDevice ? 40 : 60);

				// Create a new canvas star field manager
				canvasStarFieldManager = new CanvasStarFieldManager(animationState, starCount);

				// Set the container for the canvas
				canvasStarFieldManager.setContainer(starContainer);

				// Configure features based on device capabilities
				canvasStarFieldManager.setUseWorker(!isLowPerformanceDevice);
				canvasStarFieldManager.setUseContainerParallax(!isLowPerformanceDevice);

				// Start the animation
				canvasStarFieldManager.start();
			}

			// Initialize glitch manager with enhanced settings
			if (glitchManager) {
				glitchManager.cleanup();
			}

			// Only use glitch effects on capable devices
			if (!isLowPerformanceDevice) {
				glitchManager = new animations.GlitchManager();

				// Use less intense glitch on mobile
				if (isMobileDevice) {
					glitchManager.setIntensity(0.5);
					glitchManager.setFrequency(0.3);
				}

				glitchManager.start([elements.header]); // Apply only to header
			}

			// Initialize memory monitoring if not already
			if (
				!memoryMonitor &&
				browser &&
				'performance' in window &&
				'memory' in (performance as any)
			) {
				memoryMonitor = new MemoryMonitor(
					30000, // Check every 30 seconds
					0.7, // Warning at 70%
					0.85, // Critical at 85%
					() => {
						// On warning - reduce effects
						if (canvasStarFieldManager) {
							canvasStarFieldManager.enableGlow = false;
						}
					},
					() => {
						// On critical - reduce star count and effects
						if (canvasStarFieldManager) {
							const currentCount = canvasStarFieldManager.getStarCount();
							canvasStarFieldManager.setStarCount(Math.floor(currentCount * 0.6)); // Reduce by 40%
							canvasStarFieldManager.enableGlow = false;
							canvasStarFieldManager.setUseContainerParallax(false);
						}

						// Suggest garbage collection
						memoryMonitor?.suggestGarbageCollection();
					}
				);

				memoryMonitor.start();
			}

			// Create and start optimized GSAP timeline
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

		// Stop canvas star field
		if (canvasStarFieldManager) {
			canvasStarFieldManager.stop();
		}

		// Stop glitch manager
		if (glitchManager) {
			glitchManager.stop();
		}

		// Kill GSAP timeline with proper cleanup
		if (currentTimeline) {
			// First pause to stop animations
			currentTimeline.pause();

			// Clear all tweens from the timeline
			currentTimeline.clear();

			// Finally kill the timeline
			currentTimeline.kill();

			// Remove reference
			currentTimeline = null;
		}

		// Clear any animation frames
		if (typeof window !== 'undefined' && gsap && gsap.ticker) {
			// No need for animateFunction reference that doesn't exist
			gsap.ticker.remove(null);
		}

		// Don't reset animation state entirely, just update isAnimating
		animationState.update((state) => ({
			...state,
			isAnimating: false
		}));
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

				// Fix flickering on scroll
				arcadeScreen.style.WebkitBackfaceVisibility = 'hidden';

				// Simplify effects for iOS performance
				arcadeScreen.classList.add('ios-optimized');
			}

			// Apply fixes to the star container
			if (starContainer) {
				starContainer.style.transform = 'translateZ(0)';
				starContainer.style.backfaceVisibility = 'hidden';
				starContainer.style.WebkitBackfaceVisibility = 'hidden';
			}
		}
	}

	function initializeMemoryMonitoring() {
		if (!memoryMonitor && browser && 'performance' in window && 'memory' in (performance as any)) {
			memoryMonitor = new MemoryMonitor(
				30000, // Check every 30 seconds
				0.7, // Warning at 70%
				0.85, // Critical at 85%
				() => {
					// On warning - reduce effects
					if (canvasStarFieldManager) {
						canvasStarFieldManager.enableGlow = false;
					}
				},
				() => {
					// On critical - reduce star count and effects
					if (canvasStarFieldManager) {
						const currentCount = canvasStarFieldManager.getStarCount();
						canvasStarFieldManager.setStarCount(Math.floor(currentCount * 0.6)); // Reduce by 40%
						canvasStarFieldManager.enableGlow = false;
						canvasStarFieldManager.setUseContainerParallax(false);
					}

					// Suggest garbage collection
					memoryMonitor?.suggestGarbageCollection();
				}
			);

			memoryMonitor.start();
		}
	}

	function initializeAnimations() {
		if (currentScreen === 'main') {
			const elements = { header, insertConcept, arcadeScreen };
			if (elements.header && elements.insertConcept && elements.arcadeScreen) {
				// Reset animation state flags only
				animationState.resetAnimationState();

				// Initialize and start starfield
				initializeStarField();

				// Start animations
				startAnimations(elements);
			}
		}
	}

	function initializeStarField() {
		if (!starContainer) return;

		// Get device-appropriate star count
		const capabilities = get(deviceCapabilities);
		const starCount =
			capabilities.maxStars || (isLowPerformanceDevice ? 20 : isMobileDevice ? 40 : 60);

		// Create a new canvas star field manager if needed
		if (!canvasStarFieldManager) {
			canvasStarFieldManager = new CanvasStarFieldManager(animationState, starCount);

			// Set the container for the canvas
			canvasStarFieldManager.setContainer(starContainer);

			// Configure features based on device capabilities
			canvasStarFieldManager.setUseWorker(!isLowPerformanceDevice);
			canvasStarFieldManager.setUseContainerParallax(!isLowPerformanceDevice);
		} else {
			// Reuse existing manager
			canvasStarFieldManager.setContainer(starContainer);
		}

		// Start the animation
		canvasStarFieldManager.start();
	}

	function setupEventListeners() {
		// Define optimized event handlers
		const optimizedResizeCheck = () => {
			// Update device capabilities on resize
			detectDeviceCapabilities();
			debouncedOrientationCheck();

			// Notify canvas manager of resize if it exists
			if (canvasStarFieldManager) {
				canvasStarFieldManager.resizeCanvas();
			}
		};

		const visibilityHandler = () => {
			if (document.hidden) {
				// Pause animations when tab is not visible
				if (canvasStarFieldManager) {
					canvasStarFieldManager.pause();
				}
			} else {
				// Resume animations when tab is visible again
				if (canvasStarFieldManager) {
					canvasStarFieldManager.resume();
				}
			}
		};

		const orientationChangeHandler = () => {
			// Detect new device capabilities after orientation change
			setTimeout(detectDeviceCapabilities, 300);
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
		resizeObserver = new ResizeObserver(optimizedResizeCheck);
		if (arcadeScreen) {
			resizeObserver.observe(arcadeScreen);

			// Add touch handler to arcade screen
			if (isMobileDevice) {
				arcadeScreen.addEventListener('touchstart', touchStartHandler as any, nonPassiveOptions);
			}
		}

		// Add event listeners
		window.addEventListener('resize', optimizedResizeCheck, passiveOptions);
		window.addEventListener('orientationchange', orientationChangeHandler, passiveOptions);
		document.addEventListener('visibilitychange', visibilityHandler, passiveOptions);

		// Add passive touch events for better scrolling performance on mobile
		if (isMobileDevice) {
			document.addEventListener('touchstart', () => {}, { passive: true });
			document.addEventListener('touchmove', () => {}, { passive: true });
		}

		// Store handlers for cleanup
		eventHandlers = {
			resize: optimizedResizeCheck as EventListener,
			orientationChange: orientationChangeHandler as EventListener,
			visibility: visibilityHandler as EventListener,
			touchStart: touchStartHandler as EventListener
		};
	}

	// Lifecycle hooks
	onMount(() => {
		if (!browser) return;

		currentScreen = 'main';

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
		const { resize, orientationChange, visibility, touchStart } = eventHandlers || {};

		// Cleanup all animations and managers
		stopAnimations();

		// Reset animation state
		animationState.reset();

		// Properly cleanup canvas star field manager
		if (canvasStarFieldManager) {
			canvasStarFieldManager.cleanup();
			canvasStarFieldManager = null;
		}

		// Cleanup other managers
		if (glitchManager) {
			glitchManager.cleanup();
			glitchManager = null;
		}

		// Stop memory monitoring
		if (memoryMonitor) {
			memoryMonitor.stop();
			memoryMonitor = null;
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

		// Remove event listeners with the same handlers that were added
		if (resize) window.removeEventListener('resize', resize);
		if (orientationChange) window.removeEventListener('orientationchange', orientationChange);
		if (visibility) document.removeEventListener('visibilitychange', visibility);

		// Remove any other event listeners that might have been added
		if (arcadeScreen && touchStart) {
			arcadeScreen.removeEventListener('touchstart', touchStart);
		}

		// Manually nullify references to DOM elements
		header = null;
		insertConcept = null;
		arcadeScreen = null;
		starContainer = null;
		spaceBackground = null;

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
		stars = [];

		// Clean up any GSAP animations that might still be running
		if (typeof window !== 'undefined' && gsap && gsap.ticker) {
			gsap.ticker.remove(null);
			gsap.globalTimeline.clear();
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
								class="canvas-star-container absolute inset-0 pointer-events-none rounded-[3vmin]"
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
	   Screen Effects and Overlays
	   ========================================================================== */
	#scanline-overlay {
		background: linear-gradient(0deg, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0.1) 51%);
		background-size: 100% 4px;
		animation: scanline 0.2s linear infinite;
		border-radius: calc(var(--border-radius) - 0.5vmin);
		z-index: 1;
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
		/* Optimize star rendering on mobile */
		.star {
			will-change: transform;
			position: absolute;
			background: #fff;
			border-radius: 50%;
			box-shadow: 0 0 1px rgba(255, 255, 255, 0.5); /* Reduced shadow */
			pointer-events: none;
			contain: layout style;
		}

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

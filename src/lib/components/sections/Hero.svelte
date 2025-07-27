<!-- src/lib/components/section/Hero.svelte -->
<!--
Integrated Star Field Effects:
- Mouse wheel: Change speed/color
- Space bar: Boost speed (hold)
- 1, 2, 3 keys: Switch between star effects
- Version 1: Classic streaking stars
- Version 2: 3D zoom effect
- Version 3: Warp speed effect
-->
<!-- src/lib/components/section/Hero.svelte -->
<!--
Integrated Star Field Effects:
- Hover zones: Control speed and effects with mouse hover
- Space bar: Boost speed (hold)
- Arrow keys: Control speed up/down
- 1, 2, 3 keys: Switch between star effects
- Version 1: Classic streaking stars
- Version 2: 3D zoom effect
- Version 3: Warp speed effect
- Mobile: Touch controls panel
-->
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
	import ControlsPortal from '$lib/components/ui/ControlsPortal.svelte';
	import GameControls from '$lib/components/game/GameControls.svelte';
	import { deviceCapabilities, setupPerformanceMonitoring } from '$lib/utils/device-performance';
	import { MemoryMonitor } from '$lib/utils/memory-monitor';
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
	let spaceBackground: HTMLElement;
	let currentScreen = 'main';
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
		glassEffects?: EventListener;
		scroll?: EventListener;
		keydown?: EventListener;
		keyup?: EventListener;
		interactiveControls?: Function;
	} = {};

	// Performance monitoring setup
	let perfMonitor: ReturnType<typeof setupPerformanceMonitoring> | null = null;
	let frameRateUnsubscribe: Function | null = null;

	let currentGameState: GameState = 'idle';

	// FIXED: Add scroll state management to prevent unnecessary resets
	let isScrolling = false;
	let scrollTimeout: number | null = null;
	let spaceBackgroundInitialized = false;
	let lastVisibilityState = true;

	// Add boosting state
	let boosting = false;

	let hasMounted = false;

	// Star field canvas and animation variables
	let starCanvas: HTMLCanvasElement;
	let starCtx: CanvasRenderingContext2D;
	let starAnimationId: number;
	let starEffect = 'version1'; // default effect
	let starSpeed = 0.04;
	let starSpeedMultiplier = 1;
	let stars: any[] = [];
	const numberOfStars = 600; // Optimized for performance

	// Star field classes
	class StarV1 {
		x: number;
		y: number;
		px: number;
		py: number;
		z: number;

		constructor() {
			this.x = Math.random() * starCanvas.width - starCanvas.width / 2;
			this.y = Math.random() * starCanvas.height - starCanvas.height / 2;
			this.px = this.x;
			this.py = this.y;
			this.z = Math.random() * 4;
		}

		update() {
			this.px = this.x;
			this.py = this.y;
			this.z += starSpeed * starSpeedMultiplier;
			this.x += this.x * (starSpeed * 0.2) * this.z;
			this.y += this.y * (starSpeed * 0.2) * this.z;

			if (
				this.x > starCanvas.width / 2 + 50 ||
				this.x < -starCanvas.width / 2 - 50 ||
				this.y > starCanvas.height / 2 + 50 ||
				this.y < -starCanvas.height / 2 - 50
			) {
				this.x = Math.random() * starCanvas.width - starCanvas.width / 2;
				this.y = Math.random() * starCanvas.height - starCanvas.height / 2;
				this.px = this.x;
				this.py = this.y;
				this.z = 0;
			}
		}

		show() {
			starCtx.lineWidth = this.z;
			starCtx.beginPath();
			starCtx.moveTo(this.x, this.y);
			starCtx.lineTo(this.px, this.py);
			starCtx.stroke();
		}
	}

	class StarV2 {
		x: number;
		y: number;
		counter: number;
		radiusMax: number;
		speed: number;
		starX: number;
		starY: number;
		radius: number;

		constructor() {
			this.x = this.getRandomInt(-starCanvas.width / 2, starCanvas.width / 2);
			this.y = this.getRandomInt(-starCanvas.height / 2, starCanvas.height / 2);
			this.counter = this.getRandomInt(1, starCanvas.width);
			this.radiusMax = 1 + Math.random() * 8;
			this.speed = this.getRandomInt(1, 4);
		}

		getRandomInt(min: number, max: number) {
			return Math.floor(Math.random() * (max - min + 1)) + min;
		}

		remap(value: number, istart: number, istop: number, ostart: number, ostop: number) {
			return ostart + (ostop - ostart) * ((value - istart) / (istop - istart));
		}

		update() {
			this.counter -= this.speed * starSpeedMultiplier;

			if (this.counter < 1) {
				this.counter = starCanvas.width;
				this.x = this.getRandomInt(-starCanvas.width / 2, starCanvas.width / 2);
				this.y = this.getRandomInt(-starCanvas.height / 2, starCanvas.height / 2);
				this.radiusMax = this.getRandomInt(1, 8);
				this.speed = this.getRandomInt(1, 4);
			}

			let xRatio = this.x / this.counter;
			let yRatio = this.y / this.counter;
			this.starX = this.remap(xRatio, 0, 1, 0, starCanvas.width);
			this.starY = this.remap(yRatio, 0, 1, 0, starCanvas.height);
			this.radius = this.remap(this.counter, 0, starCanvas.width, this.radiusMax, 0);
		}

		show() {
			starCtx.beginPath();
			starCtx.arc(this.starX, this.starY, this.radius, 0, Math.PI * 2, false);
			starCtx.closePath();
			starCtx.fillStyle = '#FFF';
			starCtx.fill();
		}
	}

	class StarV3 {
		x: number;
		y: number;
		z: number;
		prevX: number;
		prevY: number;

		constructor() {
			this.x = Math.random() * starCanvas.width;
			this.y = Math.random() * starCanvas.height;
			this.z = Math.random() * 1000;
			this.prevX = this.x;
			this.prevY = this.y;
		}

		update() {
			this.prevX = this.x;
			this.prevY = this.y;

			this.z -= 15 * starSpeedMultiplier;

			if (this.z <= 0) {
				this.z = 1000;
				this.x = Math.random() * starCanvas.width;
				this.y = Math.random() * starCanvas.height;
				this.prevX = this.x;
				this.prevY = this.y;
			}

			let scale = 1000 / this.z;
			this.x = (this.x - starCanvas.width / 2) * scale + starCanvas.width / 2;
			this.y = (this.y - starCanvas.height / 2) * scale + starCanvas.height / 2;
		}

		show() {
			let size = (1 - this.z / 1000) * 2;
			let opacity = 1 - this.z / 1000;

			// Draw trail
			starCtx.strokeStyle = `rgba(255,255,255,${opacity})`;
			starCtx.lineWidth = size;
			starCtx.beginPath();
			starCtx.moveTo(this.prevX, this.prevY);
			starCtx.lineTo(this.x, this.y);
			starCtx.stroke();

			// Draw star
			starCtx.fillStyle = `rgba(255,255,255,${opacity})`;
			starCtx.beginPath();
			starCtx.arc(this.x, this.y, size, 0, Math.PI * 2);
			starCtx.fill();
		}
	}

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

	// Star field functions
	function resizeStarCanvas() {
		if (!starCanvas || !spaceBackground) return;

		const rect = spaceBackground.getBoundingClientRect();
		starCanvas.width = rect.width;
		starCanvas.height = rect.height;

		// Reinitialize stars after resize
		initStars();
	}

	function initStars() {
		if (!starCanvas) return;

		stars = [];
		for (let i = 0; i < numberOfStars; i++) {
			switch (starEffect) {
				case 'version1':
					stars.push(new StarV1());
					break;
				case 'version2':
					stars.push(new StarV2());
					break;
				case 'version3':
					stars.push(new StarV3());
					break;
			}
		}
	}

	function animateStars() {
		if (!starCtx || !starCanvas) return;

		// Clear canvas with fade effect
		starCtx.fillStyle = 'rgba(0, 0, 0, 0.1)';
		starCtx.fillRect(0, 0, starCanvas.width, starCanvas.height);

		// Set stroke style for streaking effects
		if (starEffect === 'version1') {
			starCtx.strokeStyle = 'rgb(255, 255, 255)';
			starCtx.save();
			starCtx.translate(starCanvas.width / 2, starCanvas.height / 2);
		} else if (starEffect === 'version2') {
			starCtx.save();
			starCtx.translate(starCanvas.width / 2, starCanvas.height / 2);
		}

		// Update and draw stars
		for (let star of stars) {
			star.update();
			star.show();
		}

		// Reset translation
		if (starEffect === 'version1' || starEffect === 'version2') {
			starCtx.restore();
		}

		starAnimationId = requestAnimationFrame(animateStars);
	}

	function startStarEffect(effectName: string) {
		if (starAnimationId) {
			cancelAnimationFrame(starAnimationId);
		}

		starEffect = effectName;
		initStars();
		animateStars();
	}

	function stopStarAnimation() {
		if (starAnimationId) {
			cancelAnimationFrame(starAnimationId);
		}
	}

	// ✅ NEW: Hover-based control zones for starfield interaction
	function setupHoverControls() {
		if (!browser || !spaceBackground) return;

		// Create control zones (invisible overlays)
		const controlZones = {
			speed: null as HTMLElement | null,
			effects: null as HTMLElement | null,
			boost: null as HTMLElement | null
		};

		// Create speed control zone (left edge)
		const speedZone = document.createElement('div');
		speedZone.className = 'starfield-control-zone speed-zone';
		speedZone.setAttribute('data-control', 'speed');
		speedZone.setAttribute('aria-label', 'Hover to control starfield speed');
		speedZone.setAttribute('tabindex', '0');
		speedZone.style.cssText = `
			position: absolute;
			left: 0;
			top: 25%;
			width: 80px;
			height: 50%;
			z-index: 10;
			cursor: ns-resize;
			background: linear-gradient(to right, rgba(39, 255, 153, 0.1), transparent);
			opacity: 0;
			transition: opacity 0.3s ease;
			border-radius: 0 8px 8px 0;
		`;

		// Create effects control zone (right edge)
		const effectsZone = document.createElement('div');
		effectsZone.className = 'starfield-control-zone effects-zone';
		effectsZone.setAttribute('data-control', 'effects');
		effectsZone.setAttribute('aria-label', 'Hover to cycle starfield effects');
		effectsZone.setAttribute('tabindex', '0');
		effectsZone.style.cssText = `
			position: absolute;
			right: 0;
			top: 25%;
			width: 80px;
			height: 50%;
			z-index: 10;
			cursor: pointer;
			background: linear-gradient(to left, rgba(255, 39, 153, 0.1), transparent);
			opacity: 0;
			transition: opacity 0.3s ease;
			border-radius: 8px 0 0 8px;
		`;

		// Create boost zone (bottom center)
		const boostZone = document.createElement('div');
		boostZone.className = 'starfield-control-zone boost-zone';
		boostZone.setAttribute('data-control', 'boost');
		boostZone.setAttribute('aria-label', 'Hover to boost starfield speed');
		boostZone.setAttribute('tabindex', '0');
		boostZone.style.cssText = `
			position: absolute;
			bottom: 10%;
			left: 50%;
			transform: translateX(-50%);
			width: 120px;
			height: 60px;
			z-index: 10;
			cursor: pointer;
			background: radial-gradient(ellipse, rgba(255, 255, 39, 0.1), transparent);
			opacity: 0;
			transition: opacity 0.3s ease;
			border-radius: 30px;
		`;

		// Add zones to space background
		spaceBackground.appendChild(speedZone);
		spaceBackground.appendChild(effectsZone);
		spaceBackground.appendChild(boostZone);

		controlZones.speed = speedZone;
		controlZones.effects = effectsZone;
		controlZones.boost = boostZone;

		// Speed control logic
		const handleSpeedControl = (e: MouseEvent) => {
			const rect = speedZone.getBoundingClientRect();
			const relativeY = (e.clientY - rect.top) / rect.height;

			// Convert position to speed multiplier (top = fast, bottom = slow)
			const newSpeed = 0.2 + (1 - relativeY) * 2.8; // Range: 0.2 to 3.0
			starSpeedMultiplier = Math.max(0.1, Math.min(5, newSpeed));

			// Visual feedback
			speedZone.style.background = `linear-gradient(to right,
				rgba(39, 255, 153, ${0.2 + relativeY * 0.3}), transparent)`;
		};

		// Effects cycling logic
		let effectIndex = 0;
		const effects = ['version1', 'version2', 'version3'];
		const handleEffectCycle = () => {
			effectIndex = (effectIndex + 1) % effects.length;
			startStarEffect(effects[effectIndex]);

			// Visual feedback
			effectsZone.style.background = `linear-gradient(to left,
				rgba(255, 39, 153, 0.4), transparent)`;
			setTimeout(() => {
				effectsZone.style.background = `linear-gradient(to left,
					rgba(255, 39, 153, 0.1), transparent)`;
			}, 200);
		};

		// Boost logic
		let isBoostActive = false;

		const handleBoostStart = () => {
			if (!isBoostActive) {
				isBoostActive = true;
				starSpeedMultiplier *= 3;
				boosting = true;
				boostZone.style.background = `radial-gradient(ellipse,
					rgba(255, 255, 39, 0.4), transparent)`;
			}
		};

		const handleBoostEnd = () => {
			if (isBoostActive) {
				isBoostActive = false;
				starSpeedMultiplier /= 3;
				boosting = false;
				boostZone.style.background = `radial-gradient(ellipse,
					rgba(255, 255, 39, 0.1), transparent)`;
			}
		};

		// Add event listeners
		speedZone.addEventListener('mouseenter', () => {
			speedZone.style.opacity = '1';
		});

		speedZone.addEventListener('mouseleave', () => {
			speedZone.style.opacity = '0';
			speedZone.style.background = `linear-gradient(to right,
				rgba(39, 255, 153, 0.1), transparent)`;
		});

		speedZone.addEventListener('mousemove', handleSpeedControl);

		effectsZone.addEventListener('mouseenter', () => {
			effectsZone.style.opacity = '1';
		});

		effectsZone.addEventListener('mouseleave', () => {
			effectsZone.style.opacity = '0';
		});

		effectsZone.addEventListener('click', handleEffectCycle);
		effectsZone.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				handleEffectCycle();
			}
		});

		boostZone.addEventListener('mouseenter', () => {
			boostZone.style.opacity = '1';
			handleBoostStart();
		});

		boostZone.addEventListener('mouseleave', () => {
			boostZone.style.opacity = '0';
			handleBoostEnd();
		});

		boostZone.addEventListener('focus', () => {
			boostZone.style.opacity = '1';
		});

		boostZone.addEventListener('blur', () => {
			boostZone.style.opacity = '0';
		});

		// Store references for cleanup
		return {
			speedZone,
			effectsZone,
			boostZone,
			cleanup: () => {
				speedZone.remove();
				effectsZone.remove();
				boostZone.remove();
			}
		};
	}

	// ✅ NEW: Initialize interactive controls
	function initializeInteractiveControls() {
		if (!isMobileDevice) {
			return setupHoverControls();
		}
		return null;
	}

	// ✅ NEW: Handle mobile control changes
	function handleMobileControlChange(event: CustomEvent) {
		const { detail } = event;

		switch (event.type) {
			case 'speedChange':
				starSpeedMultiplier = detail.speed;
				break;
			case 'effectChange':
				startStarEffect(detail.effect);
				break;
			case 'boostToggle':
				if (detail.active) {
					starSpeedMultiplier *= 3;
					boosting = true;
				} else {
					starSpeedMultiplier /= 3;
					boosting = false;
				}
				break;
		}
	}

	// FIXED: Add scroll event handler to prevent background resets during scroll
	function handleScroll() {
		if (!browser) return;

		isScrolling = true;

		// FIXED: Ensure black background is maintained during scroll
		if (spaceBackground && currentScreen === 'main') {
			ensureImmediateBlackBackground();
		}

		// Clear existing timeout
		if (scrollTimeout) {
			clearTimeout(scrollTimeout);
		}

		// Debounce scroll end detection
		scrollTimeout = window.setTimeout(() => {
			isScrolling = false;

			// FIXED: Ensure space background is still intact after scroll with immediate black background
			if (currentScreen === 'main') {
				ensureImmediateBlackBackground();
				ensureSpaceBackgroundExists();
			}
		}, 150);
	}

	// FIXED: New function to ensure immediate black background coverage
	function ensureImmediateBlackBackground() {
		if (!spaceBackground) return;

		// Force immediate black background before any other operations
		spaceBackground.style.background =
			'radial-gradient(circle at center, #000 20%, #001c4d 80%, #000000)';
		spaceBackground.style.backgroundColor = '#000';
		spaceBackground.style.opacity = '1';
		spaceBackground.style.visibility = 'visible';
		spaceBackground.style.display = 'block';

		// Force immediate paint to prevent any gradient flash
		spaceBackground.offsetHeight; // Trigger reflow immediately
	}

	// FIXED: New function to ensure space background element exists and is stable
	function ensureSpaceBackgroundExists() {
		if (!spaceBackground) return;

		// FIXED: Force immediate black background first
		spaceBackground.style.background =
			'radial-gradient(circle at center, #000 20%, #001c4d 80%, #000000)';
		spaceBackground.style.backgroundColor = '#000';

		// Force space background to be visible and stable
		spaceBackground.style.opacity = '1';
		spaceBackground.style.visibility = 'visible';
		spaceBackground.style.display = 'block';
		spaceBackground.style.transform = 'translateZ(0)';
		spaceBackground.style.backfaceVisibility = 'hidden';
		spaceBackground.style.willChange = 'auto'; // FIXED: Remove aggressive will-change

		// Add persistent background class
		spaceBackground.classList.add('space-background-persistent');

		// Force immediate paint to prevent any flashing
		spaceBackground.offsetHeight; // Trigger reflow
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
				// We're leaving the main screen, stop animations but preserve space background
				stopAnimations(false); // FIXED: Pass parameter to preserve background
				stopStarAnimation();

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
				spaceBackgroundInitialized = false; // Allow reinit

				// Restart star animation
				if (starCanvas && starCtx) {
					startStarEffect(starEffect);
				}

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

	// FIXED: Modified animation control functions to preserve space background
	function startAnimations(elements: {
		header: HTMLElement;
		insertConcept: HTMLElement;
		arcadeScreen: HTMLElement;
	}) {
		try {
			const state = get(animationState);
			if (state && state.isAnimating) {
				stopAnimations(false); // Stop existing animations first but preserve background
			}

			// Get the current quality setting from frameRateController
			const currentQuality =
				frameRateController && typeof frameRateController.getCurrentQuality === 'function'
					? frameRateController.getCurrentQuality()
					: 1.0;

			// FIXED: Ensure space background is always present before starting other animations
			ensureSpaceBackgroundExists();

			// Start star animation
			if (starCanvas && starCtx) {
				startStarEffect(starEffect);
			}

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

			// Initialize memory monitoring if not already
			if (
				!memoryMonitor &&
				browser &&
				'performance' in window &&
				'memory' in (performance as any)
			) {
				// FIXED: Use individual parameters instead of config object
				try {
					memoryMonitor = new MemoryMonitor(
						30000, // interval: 30 seconds
						{
							memoryPressureThreshold: 0.7
						}
					);
					memoryMonitor
						.onMemoryPressure(() => {
							// onWarning callback
							if (
								frameRateController &&
								typeof frameRateController.setQualityOverride === 'function'
							) {
								frameRateController.setQualityOverride(0.7);
							}
						})
						.onLeakSuspected(() => {
							// onCritical callback - reduce effects
							if (
								frameRateController &&
								typeof frameRateController.setQualityOverride === 'function'
							) {
								frameRateController.setQualityOverride(0.5);
							}
							if (memoryMonitor && typeof memoryMonitor.suggestGarbageCollection === 'function') {
								memoryMonitor.suggestGarbageCollection();
							}
						});
				} catch (error) {
					// Fallback to simple constructor
					console.warn('MemoryMonitor initialization failed:', error);
					memoryMonitor = null;
				}

				if (memoryMonitor && typeof memoryMonitor.start === 'function') {
					memoryMonitor.start();
				}
			}

			// Create and start optimized GSAP timeline
			const timeline = createOptimizedTimeline(elements);

			if (timeline) {
				currentTimeline = timeline;
				timeline.play();
			}

			// Update animation state
			if (typeof animationState.update === 'function') {
				animationState.update((state) => ({
					...state,
					isAnimating: true
				}));
			}
		} catch (error) {
			console.error('Animation initialization failed:', error);
			if (typeof animationState.reset === 'function') {
				animationState.reset();
			}
		}
	}

	// FIXED: Modified stopAnimations to optionally preserve space background
	function stopAnimations(clearBackground = true) {
		if (!browser) return;

		// Stop star animation only if we're clearing background
		if (clearBackground) {
			stopStarAnimation();
		}

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

		// FIXED: Don't reset animation state entirely if preserving background
		if (clearBackground) {
			// Reset animation state completely
			if (typeof animationState.reset === 'function') {
				animationState.reset();
			}
			spaceBackgroundInitialized = false;
		} else {
			// Just update isAnimating flag
			if (typeof animationState.update === 'function') {
				animationState.update((state) => ({
					...state,
					isAnimating: false
				}));
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

	// FIXED: Updated memory monitoring initialization to use correct MemoryMonitor API
	function initializeMemoryMonitoring() {
		if (!memoryMonitor && browser && 'performance' in window && 'memory' in (performance as any)) {
			try {
				// Use correct constructor: interval and options object
				memoryMonitor = new MemoryMonitor(
					30000, // interval: Check every 30 seconds
					{
						memoryPressureThreshold: 0.7
						// Optionally add more options if needed
					}
				);

				memoryMonitor
					.onMemoryPressure(() => {
						// onWarning callback - reduce effects
						// Reduce quality through frameRateController
						frameRateController.setQualityOverride(0.7);
					})
					.onLeakSuspected(() => {
						// onCritical callback - reduce effects
						// Significantly reduce quality through frameRateController
						frameRateController.setQualityOverride(0.5);

						// Suggest garbage collection
						memoryMonitor?.suggestGarbageCollection();
					});
			} catch (error) {
				// Fallback: disable memory monitoring if constructor fails
				console.warn('MemoryMonitor initialization failed, disabling memory monitoring:', error);
				memoryMonitor = null;
				return;
			}

			// Start monitoring if successfully initialized
			if (memoryMonitor && typeof memoryMonitor.start === 'function') {
				memoryMonitor.start();
			}
		}
	}

	function initializeAnimations() {
		if (currentScreen === 'main') {
			const elements = { header, insertConcept, arcadeScreen };
			if (elements.header && elements.insertConcept && elements.arcadeScreen) {
				// FIXED: Only reset animation state if not already initialized
				if (!spaceBackgroundInitialized) {
					if (typeof animationState.resetAnimationState === 'function') {
						animationState.resetAnimationState();
					} else if (typeof animationState.reset === 'function') {
						// Fallback to reset if resetAnimationState isn't available
						animationState.reset();
					}
				}

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

			// Resize star canvas
			resizeStarCanvas();
		}, 100);

		// ✅ ENHANCED: Keyboard controls for star effects (now with arrow keys for speed)
		const keyDownHandler = (e: KeyboardEvent) => {
			if (currentScreen !== 'main') return;

			if (e.code === 'Space') {
				e.preventDefault();
				starSpeedMultiplier *= 3; // Boost
				boosting = true;
			} else if (e.code === 'Digit1') {
				e.preventDefault();
				startStarEffect('version1');
			} else if (e.code === 'Digit2') {
				e.preventDefault();
				startStarEffect('version2');
			} else if (e.code === 'Digit3') {
				e.preventDefault();
				startStarEffect('version3');
			} else if (e.code === 'ArrowUp') {
				e.preventDefault();
				starSpeedMultiplier = Math.min(5, starSpeedMultiplier * 1.2);
			} else if (e.code === 'ArrowDown') {
				e.preventDefault();
				starSpeedMultiplier = Math.max(0.1, starSpeedMultiplier * 0.8);
			}
		};

		const keyUpHandler = (e: KeyboardEvent) => {
			if (currentScreen !== 'main') return;

			if (e.code === 'Space') {
				e.preventDefault();
				starSpeedMultiplier /= 3; // Un-boost
				boosting = false;
			}
		};

		// FIXED: Modified visibility handler to preserve space background
		const visibilityHandler = () => {
			const isVisible = !document.hidden;

			// Track visibility changes to prevent unnecessary resets
			if (lastVisibilityState === isVisible) return;
			lastVisibilityState = isVisible;

			if (document.hidden) {
				// Pause animations when tab is not visible
				stopStarAnimation();

				// Pause frame rate controller
				if (frameRateController && typeof frameRateController.setAdaptiveEnabled === 'function') {
					frameRateController.setAdaptiveEnabled(false);
				}
			} else {
				// Resume animations when tab is visible again while preserving background
				ensureSpaceBackgroundExists(); // Ensure background is intact

				// Resume star animation
				if (starCanvas && starCtx) {
					startStarEffect(starEffect);
				}

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
				// FIXED: Ensure space background persists through orientation changes
				ensureSpaceBackgroundExists();
				resizeStarCanvas();
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
			window.addEventListener('keydown', keyDownHandler, nonPassiveOptions);
			window.addEventListener('keyup', keyUpHandler, nonPassiveOptions);
		}

		if (typeof document !== 'undefined') {
			document.addEventListener('visibilitychange', visibilityHandler, passiveOptions);
		}

		// Add passive touch events for better scrolling performance on mobile
		if (isMobileDevice && typeof document !== 'undefined') {
			document.addEventListener('touchstart', () => {}, { passive: true });
			document.addEventListener('touchmove', () => {}, { passive: true });
		}

		// ✅ NEW: Initialize interactive controls for desktop
		if (!isMobileDevice) {
			const interactiveControlsCleanup = initializeInteractiveControls();

			// Store cleanup function
			if (interactiveControlsCleanup) {
				eventHandlers.interactiveControls = interactiveControlsCleanup.cleanup;
			}
		}

		// Store handlers for cleanup
		eventHandlers = {
			...eventHandlers,
			resize: optimizedResizeCheck as EventListener,
			orientationChange: orientationChangeHandler as EventListener,
			visibility: visibilityHandler as EventListener,
			touchStart: touchStartHandler as EventListener,
			scroll: handleScroll as EventListener,
			keydown: keyDownHandler as EventListener,
			keyup: keyUpHandler as EventListener
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
				// Adjust star animation speed based on quality
				starSpeedMultiplier = Math.max(0.5, quality);
			} catch (error) {
				console.warn('Error in quality adjustment callback:', error);
			}
		});
	}

	// Handle boost state
	function handleBoost(active: boolean) {
		// Update frameRateController's quality if boosting
		if (active) {
			frameRateController.setQualityOverride(0.9);
			starSpeedMultiplier *= 3; // Boost star speed
			boosting = true;
		} else {
			frameRateController.setAdaptiveEnabled(true);
			starSpeedMultiplier /= 3; // Reset star speed
			boosting = false;
		}
	}

	// Create optimized GSAP timeline with performance considerations
	function createOptimizedTimeline(elements: {
		header: HTMLElement;
		insertConcept: HTMLElement;
		arcadeScreen: HTMLElement;
	}) {
		// Early return if elements aren't ready
		if (!elements.header || !elements.insertConcept || !elements.arcadeScreen) {
			console.warn('Timeline elements not ready');
			return null;
		}

		try {
			// Create timeline with optimized settings
			const timeline = gsap.timeline({
				paused: true,
				defaults: {
					duration: 0.8,
					ease: 'power2.out'
				}
			});

			// Get current device capabilities for animation adaptation
			const capabilities = get(deviceCapabilities);
			const shouldUseReducedAnimations = isLowPerformanceDevice || capabilities?.reduceMotion;

			if (shouldUseReducedAnimations) {
				// Simplified animations for low-performance devices
				timeline
					.set(elements.header, { opacity: 1, y: 0 })
					.set(elements.insertConcept, { opacity: 1 }, '-=0.3');
			} else {
				// Full animation sequence for capable devices
				timeline
					.fromTo(
						elements.header,
						{
							opacity: 0,
							y: 60,
							scale: 0.9,
							filter: 'blur(2px)'
						},
						{
							opacity: 1,
							y: 0,
							scale: 1,
							filter: 'blur(0px)',
							duration: 1.2,
							ease: 'back.out(1.7)'
						}
					)
					.fromTo(
						elements.insertConcept,
						{
							opacity: 0,
							y: 30
						},
						{
							opacity: 1,
							y: 0,
							duration: 0.8,
							ease: 'power2.out'
						},
						'-=0.6'
					)
					.fromTo(
						elements.arcadeScreen,
						{
							filter: 'brightness(0.7) contrast(0.8)'
						},
						{
							filter: 'brightness(1) contrast(1)',
							duration: 0.5,
							ease: 'power1.out'
						},
						'-=0.4'
					);

				// Add subtle glow animation to header
				timeline.to(
					elements.header,
					{
						textShadow:
							'0 0 1.2vmin rgba(39, 255, 153, 0.9), 0 0 2.5vmin rgba(39, 255, 153, 0.8), 0 0 4vmin rgba(39, 255, 153, 0.7)',
						duration: 0.3,
						ease: 'power2.inOut'
					},
					'-=0.2'
				);
			}

			return timeline;
		} catch (error) {
			console.error('Failed to create timeline:', error);
			return null;
		}
	}

	// Enhanced initialization function for persistent space background
	const initializePersistentSpaceBackground = async (): Promise<void> => {
		if (!spaceBackground || spaceBackgroundInitialized) return;

		// Ensure immediate black background coverage first
		ensureImmediateBlackBackground();

		// Create persistent space background
		ensureSpaceBackgroundExists();

		// Initialize star canvas animation
		if (starCanvas && starCtx) {
			// Get current quality from frameRateController
			const currentQuality =
				frameRateController && typeof frameRateController.getCurrentQuality === 'function'
					? frameRateController.getCurrentQuality()
					: 1.0;

			// Apply quality adaptive settings
			const capabilities = get(deviceCapabilities);
			const baseCount = capabilities?.maxStars || 60;
			const adjustedCount = Math.max(20, Math.round(baseCount * currentQuality));

			// Adjust star count based on quality
			let effectiveStarCount = adjustedCount;
			if (isLowPerformanceDevice) {
				effectiveStarCount = Math.min(adjustedCount, 30);
			}

			// Initialize with appropriate star count
			initStars();
			startStarEffect(starEffect);

			console.log(`✅ Initialized canvas star field with ${effectiveStarCount} stars`);
		}

		spaceBackgroundInitialized = true;
	};

	// FIXED: Optimized screen management with scroll protection and immediate background
	$: {
		if (currentScreen === 'main' && browser && !isScrolling && hasMounted) {
			const elements = { header, insertConcept, arcadeScreen };

			if (elements.header && elements.insertConcept && elements.arcadeScreen) {
				ensureImmediateBlackBackground();

				// FIXED: Add safety check for the function before calling it
				if (typeof initializePersistentSpaceBackground === 'function') {
					// FIXED: Use proper Promise handling with async IIFE
					(async () => {
						try {
							await initializePersistentSpaceBackground();
						} catch (error) {
							console.error('Failed to initialize space background:', error);
						}
					})();
				} else {
					console.error(
						'initializePersistentSpaceBackground is not a function:',
						typeof initializePersistentSpaceBackground
					);
				}

				requestAnimationFrame(() => {
					if (currentScreen === 'main' && !isScrolling) {
						startAnimations(elements);
					}
				});
			}
		}
	}

	$: {
		if (browser && currentScreen === 'main') {
			console.log('Star system status:', {
				starCanvas: !!starCanvas,
				starCtx: !!starCtx,
				starEffect,
				starSpeedMultiplier,
				currentScreen,
				spaceBackgroundInitialized
			});
		}
	}

	$: {
		if (browser && starCanvas) {
			console.log('Star canvas status:', {
				canvas: !!starCanvas,
				context: !!starCtx,
				width: starCanvas?.width,
				height: starCanvas?.height,
				starCount: stars.length
			});
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
			// FIXED: Ensure immediate black background on initial load
			if (spaceBackground) {
				ensureImmediateBlackBackground();
			}

			// Apply power-up sequence effect
			if (arcadeScreen) {
				arcadeScreen.classList.add('power-sequence');
			}

			// Check orientation initially
			handleOrientation();

			// FIXED: Initialize space background immediately
			ensureSpaceBackgroundExists();

			// Initialize star canvas
			if (starCanvas && spaceBackground) {
				starCtx = starCanvas.getContext('2d');
				resizeStarCanvas();
			}

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
		const {
			resize,
			orientationChange,
			visibility,
			touchStart,
			glassEffects,
			scroll,
			keydown,
			keyup,
			interactiveControls
		} = eventHandlers || {};

		// Cleanup all animations and managers
		stopAnimations();
		stopStarAnimation();

		// Reset animation state
		animationState.reset();

		// Cleanup other managers
		if (glitchManager) {
			glitchManager.cleanup();
		}

		// Stop memory monitoring
		if (memoryMonitor) {
			memoryMonitor.stop();
			memoryMonitor = null;
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
		if (keydown) window.removeEventListener('keydown', keydown);
		if (keyup) window.removeEventListener('keyup', keyup);

		// ✅ NEW: Cleanup interactive controls
		if (interactiveControls) {
			interactiveControls();
		}

		// Remove any other event listeners that might have been added
		if (arcadeScreen && touchStart) {
			arcadeScreen.removeEventListener('touchstart', touchStart);
		}

		// Manually nullify references to DOM elements
		header = undefined as any;
		insertConcept = undefined as any;
		arcadeScreen = undefined as any;
		spaceBackground = undefined as any;

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
		spaceBackgroundInitialized = false;
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
						<div
							id="space-background"
							class="absolute inset-0 overflow-hidden pointer-events-none rounded-[3vmin] hardware-accelerated space-background-persistent"
							style="z-index: 1;"
							bind:this={spaceBackground}
						>
							<!-- Star field canvas -->
							<canvas
								bind:this={starCanvas}
								class="absolute inset-0 w-full h-full pointer-events-none rounded-[3vmin]"
								style="z-index: 2;"
							></canvas>

							<!-- ✅ NEW: Desktop hover control hints -->
							{#if !isMobileDevice}
								<!-- Hover control hints -->
								<div class="starfield-hints" class:visible={spaceBackgroundInitialized}>
									<!-- Speed Control Hint -->
									<div class="control-hint speed-hint">
										<div class="hint-arrow speed-arrow"></div>
										<div class="hint-text">
											<span class="hint-title">Speed Control</span>
											<span class="hint-description">Hover & move mouse vertically</span>
											<span class="hint-keys">Or use ↑↓ arrow keys</span>
										</div>
									</div>

									<!-- Effects Control Hint -->
									<div class="control-hint effects-hint">
										<div class="hint-arrow effects-arrow"></div>
										<div class="hint-text">
											<span class="hint-title">Star Effects</span>
											<span class="hint-description">Hover & click to cycle</span>
											<span class="hint-keys">Or press 1, 2, 3 keys</span>
										</div>
									</div>

									<!-- Boost Control Hint -->
									<div class="control-hint boost-hint">
										<div class="hint-arrow boost-arrow"></div>
										<div class="hint-text">
											<span class="hint-title">Turbo Boost</span>
											<span class="hint-description">Hover for speed boost</span>
											<span class="hint-keys">Or hold Spacebar</span>
										</div>
									</div>
								</div>
							{/if}
						</div>

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
							<BoostCue on:boost={(e) => handleBoost(e.detail)} />
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

	<!-- ✅ NEW: Mobile controls (shown only on mobile) -->
	{#if isMobileDevice && currentScreen === 'main'}
		<div class="mobile-starfield-controls">
			<div class="controls-header">
				<span class="controls-title">✦ Starfield Controls</span>
				<button
					class="boost-button"
					class:active={boosting}
					on:click={() =>
						handleMobileControlChange({ type: 'boostToggle', detail: { active: !boosting } })}
					aria-label="Toggle turbo boost"
				>
					{boosting ? '🚀' : '⚡'}
				</button>
			</div>

			<div class="controls-content">
				<!-- Speed Control -->
				<div class="control-group">
					<label for="speed-slider" class="control-label">
						Speed: {starSpeedMultiplier.toFixed(1)}x
					</label>
					<input
						id="speed-slider"
						type="range"
						min="0.1"
						max="3.0"
						step="0.1"
						bind:value={starSpeedMultiplier}
						on:input={(e) =>
							handleMobileControlChange({
								type: 'speedChange',
								detail: { speed: parseFloat(e.target.value) }
							})}
						class="speed-slider"
					/>
				</div>

				<!-- Effect Selection -->
				<div class="control-group">
					<span class="control-label">Effects:</span>
					<div class="effect-buttons">
						<button
							class="effect-button"
							class:active={starEffect === 'version1'}
							on:click={() =>
								handleMobileControlChange({ type: 'effectChange', detail: { effect: 'version1' } })}
							aria-label="Switch to Streaks effect"
						>
							<span class="effect-icon">✦</span>
							<span class="effect-name">Streaks</span>
						</button>
						<button
							class="effect-button"
							class:active={starEffect === 'version2'}
							on:click={() =>
								handleMobileControlChange({ type: 'effectChange', detail: { effect: 'version2' } })}
							aria-label="Switch to Zoom effect"
						>
							<span class="effect-icon">◉</span>
							<span class="effect-name">Zoom</span>
						</button>
						<button
							class="effect-button"
							class:active={starEffect === 'version3'}
							on:click={() =>
								handleMobileControlChange({ type: 'effectChange', detail: { effect: 'version3' } })}
							aria-label="Switch to Warp effect"
						>
							<span class="effect-icon">⟫</span>
							<span class="effect-name">Warp</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}

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
		/* FIXED: Always black background first, then add gradient */
		background-color: #000;
		background-image: linear-gradient(145deg, #111 0%, #444 100%);
		transform-style: preserve-3d;
		overflow: hidden;
	}

	/* ==========================================================================
       FIXED: Enhanced Space Background Stability
       ========================================================================== */

	/* FIXED: Persistent space background with enhanced stability */
	.space-background-persistent {
		/* Force hardware acceleration and stable rendering */
		transform: translateZ(0) !important;
		backface-visibility: hidden !important;
		-webkit-backface-visibility: hidden !important;

		/* Prevent any will-change conflicts */
		will-change: auto !important;

		/* Ensure consistent painting */
		contain: layout style paint !important;

		/* Force visibility and opacity */
		opacity: 1 !important;
		visibility: visible !important;

		/* Prevent any transition interference */
		transition: none !important;

		/* Create isolation to prevent parent effects */
		isolation: isolate !important;

		/* Force consistent z-index */
		z-index: 0 !important;

		/* Enhanced background rendering */
		background-attachment: local !important;
		background-repeat: no-repeat !important;
		background-size: cover !important;
		background-position: center !important;
	}

	/* FIXED: Fallback background that always renders */
	.space-background-persistent::before {
		content: '';
		position: absolute;
		inset: 0;
		background: radial-gradient(circle at center, #000 20%, #001c4d 70%, #000000 100%);
		z-index: -1;
		opacity: 1;
		border-radius: inherit;
		/* This ensures there's always a background even if star field fails */
		pointer-events: none;
	}

	/* FIXED: Extra safety net for persistent space background during scroll */
	#space-background.space-background-persistent {
		/* Override any conflicting styles during scroll events */
		transform: translateZ(0) !important;
		opacity: 1 !important;
		visibility: visible !important;
		display: block !important;
	}

	/* ==========================================================================
       ✅ NEW: Starfield Control Hints
       ========================================================================== */
	.starfield-hints {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 15;
		opacity: 0;
		transition: opacity 0.5s ease-in-out;
	}

	.starfield-hints.visible {
		opacity: 1;
		animation: showHints 2s ease-in-out 3s forwards;
	}

	.control-hint {
		position: absolute;
		display: flex;
		align-items: center;
		gap: 12px;
		pointer-events: none;
		animation: hintPulse 3s ease-in-out infinite;
	}

	.speed-hint {
		left: 100px;
		top: 40%;
		flex-direction: row;
	}

	.effects-hint {
		right: 100px;
		top: 40%;
		flex-direction: row-reverse;
	}

	.boost-hint {
		bottom: 20%;
		left: 50%;
		transform: translateX(-50%);
		flex-direction: column;
		align-items: center;
	}

	.hint-arrow {
		width: 24px;
		height: 24px;
		border: 2px solid rgba(39, 255, 153, 0.8);
		position: relative;
	}

	.speed-arrow {
		border-left: none;
		border-top: none;
		transform: rotate(-45deg);
		border-radius: 0 4px 0 0;
	}

	.effects-arrow {
		border-right: none;
		border-top: none;
		transform: rotate(45deg);
		border-radius: 0 0 0 4px;
	}

	.boost-arrow {
		border-top: none;
		border-left: none;
		border-right: none;
		border-bottom: 2px solid rgba(255, 255, 39, 0.8);
		transform: rotate(45deg);
		border-radius: 0 0 4px 0;
	}

	.hint-text {
		display: flex;
		flex-direction: column;
		gap: 4px;
		background: rgba(0, 0, 0, 0.8);
		padding: 12px 16px;
		border-radius: 8px;
		border: 1px solid rgba(39, 255, 153, 0.3);
		backdrop-filter: blur(8px);
		max-width: 200px;
	}

	.boost-hint .hint-text {
		border-color: rgba(255, 255, 39, 0.3);
		text-align: center;
	}

	.effects-hint .hint-text {
		border-color: rgba(255, 39, 153, 0.3);
		text-align: right;
	}

	.hint-title {
		font-family: 'Press Start 2P', monospace;
		font-size: 11px;
		color: rgba(39, 255, 153, 1);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.effects-hint .hint-title {
		color: rgba(255, 39, 153, 1);
	}

	.boost-hint .hint-title {
		color: rgba(255, 255, 39, 1);
	}

	.hint-description {
		font-family: 'Pixelify Sans', sans-serif;
		font-size: 13px;
		color: rgba(255, 255, 255, 0.9);
		font-weight: 400;
	}

	.hint-keys {
		font-family: 'Press Start 2P', monospace;
		font-size: 9px;
		color: rgba(255, 255, 255, 0.6);
		margin-top: 4px;
	}

	@keyframes showHints {
		0% {
			opacity: 0;
		}
		100% {
			opacity: 1;
		}
	}

	@keyframes hintPulse {
		0%,
		100% {
			opacity: 0.7;
			transform: scale(1);
		}
		50% {
			opacity: 1;
			transform: scale(1.02);
		}
	}

	/* ==========================================================================
       ✅ NEW: Mobile Starfield Controls
       ========================================================================== */
	.mobile-starfield-controls {
		position: fixed;
		bottom: 20px;
		left: 50%;
		transform: translateX(-50%);
		background: rgba(0, 0, 0, 0.9);
		border: 1px solid rgba(39, 255, 153, 0.3);
		border-radius: 16px;
		padding: 16px;
		z-index: 30;
		backdrop-filter: blur(12px);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
		min-width: 280px;
		max-width: 90vw;
	}

	.controls-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12px;
		padding-bottom: 8px;
		border-bottom: 1px solid rgba(39, 255, 153, 0.2);
	}

	.controls-title {
		font-family: 'Press Start 2P', monospace;
		font-size: 10px;
		color: rgba(39, 255, 153, 1);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.boost-button {
		background: none;
		border: 2px solid rgba(255, 255, 39, 0.6);
		border-radius: 8px;
		padding: 8px 12px;
		font-size: 16px;
		cursor: pointer;
		transition: all 0.2s ease;
		color: rgba(255, 255, 39, 0.8);
	}

	.boost-button:hover,
	.boost-button.active {
		background: rgba(255, 255, 39, 0.2);
		border-color: rgba(255, 255, 39, 1);
		transform: scale(1.05);
	}

	.controls-content {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.control-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.control-label {
		font-family: 'Pixelify Sans', sans-serif;
		font-size: 12px;
		color: rgba(255, 255, 255, 0.9);
		font-weight: 500;
	}

	.speed-slider {
		appearance: none;
		width: 100%;
		height: 6px;
		border-radius: 3px;
		background: rgba(255, 255, 255, 0.2);
		outline: none;
		cursor: pointer;
	}

	.speed-slider::-webkit-slider-thumb {
		appearance: none;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: rgba(39, 255, 153, 1);
		cursor: pointer;
		box-shadow: 0 0 8px rgba(39, 255, 153, 0.5);
		transition: all 0.2s ease;
	}

	.speed-slider::-webkit-slider-thumb:hover {
		transform: scale(1.1);
		box-shadow: 0 0 12px rgba(39, 255, 153, 0.8);
	}

	.speed-slider::-moz-range-thumb {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: rgba(39, 255, 153, 1);
		cursor: pointer;
		border: none;
		box-shadow: 0 0 8px rgba(39, 255, 153, 0.5);
	}

	.effect-buttons {
		display: flex;
		gap: 8px;
		justify-content: space-between;
	}

	.effect-button {
		flex: 1;
		background: none;
		border: 2px solid rgba(255, 39, 153, 0.4);
		border-radius: 12px;
		padding: 12px 8px;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		min-height: 60px;
	}

	.effect-button:hover {
		border-color: rgba(255, 39, 153, 0.8);
		background: rgba(255, 39, 153, 0.1);
		transform: translateY(-2px);
	}

	.effect-button.active {
		border-color: rgba(255, 39, 153, 1);
		background: rgba(255, 39, 153, 0.2);
		box-shadow: 0 0 12px rgba(255, 39, 153, 0.4);
	}

	.effect-icon {
		font-size: 18px;
		color: rgba(255, 39, 153, 1);
	}

	.effect-name {
		font-family: 'Press Start 2P', monospace;
		font-size: 8px;
		color: rgba(255, 255, 255, 0.8);
		text-transform: uppercase;
		letter-spacing: 0.3px;
	}

	/* ==========================================================================
       ✅ NEW: Starfield Control Zones (for hover interactions)
       ========================================================================== */
	.starfield-control-zone {
		/* Ensure control zones are accessible */
		outline: none;
		transition: all 0.3s ease;
	}

	.starfield-control-zone:focus-visible {
		outline: 2px solid rgba(39, 255, 153, 0.8);
		outline-offset: 2px;
	}

	/* ==========================================================================
       ✅ NEW: Keyboard Navigation Instructions
       ========================================================================== */
	@media (min-width: 769px) {
		#hero::before {
			content: 'Controls: Hover edges for effects • Arrow keys for speed • Space to boost • 1,2,3 for effects';
			position: absolute;
			bottom: 10px;
			left: 50%;
			transform: translateX(-50%);
			font-family: 'Press Start 2P', monospace;
			font-size: 8px;
			color: rgba(255, 255, 255, 0.4);
			text-align: center;
			z-index: 100;
			pointer-events: none;
			opacity: 0;
			animation: showInstructions 2s ease-in-out 3s forwards;
			max-width: 80%;
			line-height: 1.4;
		}
	}

	@keyframes showInstructions {
		0% {
			opacity: 0;
			transform: translateX(-50%) translateY(10px);
		}
		100% {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
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

		/* Hide hints on mobile since hover doesn't work */
		.starfield-hints {
			display: none !important;
		}

		/* Hide desktop instructions on mobile */
		#hero::before {
			display: none !important;
		}

		/* Hide on desktop where hover controls work better */
		.mobile-starfield-controls {
			display: block;
		}
	}

	@media (min-width: 769px) {
		/* Hide mobile controls on desktop */
		.mobile-starfield-controls {
			display: none;
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
		/* FIXED: Always black background for CRT screen */
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
       Space Background
       ========================================================================== */
	#space-background {
		position: absolute;
		inset: 0;
		/* FIXED: Always start with solid black, then add gradient */
		background-color: #000;
		background-image: radial-gradient(circle at center, #000 20%, #001c4d 80%, #000000);
		border-radius: var(--border-radius);
		overflow: hidden;
		z-index: 0;
		perspective: 1000px;
		/* Add the screen curvature effect */
		mask-image: radial-gradient(ellipse at center, black 90%, transparent 100%);
		-webkit-mask-image: radial-gradient(ellipse at center, black 90%, transparent 100%);
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

		/* Adjust for very small screens */
		.mobile-starfield-controls {
			min-width: 260px;
			padding: 12px;
		}

		.effect-buttons {
			flex-wrap: wrap;
		}

		.effect-button {
			min-width: 70px;
		}
	}

	@media (max-width: 320px) {
		.mobile-starfield-controls {
			min-width: 260px;
			padding: 12px;
		}

		.effect-buttons {
			flex-wrap: wrap;
		}

		.effect-button {
			min-width: 70px;
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
      ✅ NEW: Accessibility & Reduced Motion
      ========================================================================== */
	/* Respect user preferences for reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.control-hint,
		.boost-button,
		.effect-button {
			animation: none;
			transition: none;
		}

		.starfield-hints {
			transition: none;
		}

		#hero::before {
			animation: none;
			opacity: 1;
		}

		.boost-button:hover,
		.boost-button.active {
			transform: none;
		}

		.effect-button:hover {
			transform: none;
		}
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

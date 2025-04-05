<!-- src/routes/+layout.svelte -->
<script lang="ts">
	import '../app.css';
	import Navbar from '$lib/components/layout/Navbar.svelte';
	import NavBrand from '$lib/components/layout/Navbrand.svelte';
	import Footer from '$lib/components/layout/Footer.svelte';
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { loadingStore } from '$lib/stores/loading';
	import logo from '$lib/assets/images/logo.svg';
	import { Sun, Moon } from 'svelte-bootstrap-icons';
	import LoadingScreen from '$lib/components/ui/LoadingScreen.svelte';
	import { theme } from '$lib/stores/theme';
	import Tooltip from '$lib/components/ui/Tooltip.svelte';
	import { browser } from '$app/environment';
	import { writable } from 'svelte/store';
	import { layoutStore } from '$lib/stores/store';
	import MobileNavMenu from '$lib/components/layout/MobileNavMenu.svelte';
	import Navigation from '$lib/components/layout/Navigation.svelte';
	import {
		deviceCapabilities,
		setupPerformanceMonitoring,
		setupEventListeners
	} from '$lib/utils/device-performance';
	import { frameRateController } from '$lib/utils/frame-rate-controller';
	import PerformanceMonitor from '$lib/components/devtools/PerformanceMonitor.svelte';

	// Set loading to true initially to ensure LoadingScreen shows first
	loadingStore.set(true);

	// Use ResizeObserver instead of window resize event
	let resizeObserver: ResizeObserver;
	let navbarElement: HTMLElement;
	let contentWrapper: HTMLElement;
	let isMenuOpen = false;
	let logoWrapper: HTMLElement;
	let viewportWidth = 0;
	let viewportHeight = 0;
	let isScrolled = false; // New state for tracking scroll position

	let cleanupPerformanceMonitoring: (() => void) | undefined = undefined;
	let cleanupEventListeners: (() => void) | undefined = undefined;

	// Create stores with initial values
	export const navbarHeight = writable(0);

	// Debounced navbar height update function
	const updateNavHeight = (() => {
		let frame: number;
		return () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => {
				if (navbarElement) {
					const height = navbarElement.offsetHeight;
					navbarHeight.set(height);
					layoutStore.setNavbarHeight(height);

					if (browser) {
						document.documentElement.style.setProperty('--navbar-height', `${height}px`);
					}
				}
			});
		};
	})();

	// Update logo position based on viewport width and orientation
	const updateLogoPosition = () => {
		if (browser && logoWrapper && navbarElement) {
			viewportWidth = window.innerWidth;
			viewportHeight = window.innerHeight;

			// Determine orientation
			const isLandscape = viewportWidth > viewportHeight;
			logoWrapper.setAttribute('data-orientation', isLandscape ? 'landscape' : 'portrait');

			// Only apply custom positioning on mobile layouts
			if (viewportWidth < 768) {
				const logoWidth = logoWrapper.offsetWidth;

				// Base position calculation for portrait mode
				let offsetPosition = viewportWidth * 0.23 - logoWidth / 2;

				// Adjust position for landscape mode
				if (isLandscape) {
					offsetPosition = viewportWidth * 0.25 - logoWidth / 2;
				}

				// Apply styles efficiently in a single batch
				Object.assign(logoWrapper.style, {
					transform: `translateX(${offsetPosition}px) translateY(-50%)`,
					position: 'absolute',
					top: '50%',
					height: 'auto'
				});
			} else {
				// Reset positioning for larger screens
				Object.assign(logoWrapper.style, {
					transform: 'none',
					position: 'relative',
					top: 'auto',
					height: 'auto'
				});
				logoWrapper.removeAttribute('data-orientation');
			}
		}
	};

	// Track scroll position for blur effect
	const handleScroll = () => {
		if (browser) {
			// Update the scroll state based on scroll position
			isScrolled = window.scrollY > 10;
		}
	};

	// Optimized theme toggle with minimal reflows
	function toggleTheme() {
		theme.update((currentTheme) => {
			const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
			const root = document.documentElement;

			// Batch DOM operations
			requestAnimationFrame(() => {
				root.classList.add('theme-transition');
				root.classList.toggle('dark', newTheme === 'dark');
				root.classList.toggle('light', newTheme === 'light');

				// Remove transition class after animation
				setTimeout(() => {
					root.classList.remove('theme-transition');
				}, 300);
			});

			localStorage.setItem('theme', newTheme);
			return newTheme;
		});
	}

	// Remove both existing monitor implementations and replace with this:
	let perfMonitorActive = false;

	function initPerformanceMonitor() {
		if (perfMonitorActive || !browser) return;
		perfMonitorActive = true;

		console.log('Initializing performance monitor...');

		// Create performance monitor element with high z-index
		const monitor = document.createElement('div');
		monitor.id = 'perf-monitor';
		monitor.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: black;
    color: lime;
    font-family: monospace;
    padding: 10px;
    border-radius: 4px;
    z-index: 10000000;
    font-size: 16px;
    text-align: left;
    width: auto;
    box-shadow: 0 0 5px rgba(0,0,0,0.5);
  `;

		document.body.appendChild(monitor);
		console.log('Monitor element added to DOM');

		// FPS tracking
		let frameCount = 0;
		let lastTime = performance.now();
		let fps = 0;

		// Memory tracking
		let memoryReadings = [];
		let startTime = performance.now();

		function updateStats() {
			// Update FPS
			frameCount++;
			const now = performance.now();
			if (now - lastTime >= 1000) {
				fps = Math.round((frameCount * 1000) / (now - lastTime));
				frameCount = 0;
				lastTime = now;

				// Track memory if available
				if (performance.memory) {
					const memoryUsed = Math.round(performance.memory.usedJSHeapSize / (1024 * 1024));
					memoryReadings.push(memoryUsed);
				}

				// Update display text
				monitor.innerHTML = `
        <div>FPS: ${fps}</div>
        ${
					performance.memory
						? `<div>Memory: ${Math.round(performance.memory.usedJSHeapSize / (1024 * 1024))}MB</div>`
						: '<div>Memory: Not available</div>'
				}
        <div>Runtime: ${Math.floor((now - startTime) / 1000)}s</div>
      `;

				// Log every 30 seconds
				const runTime = Math.floor((now - startTime) / 1000);
				if (runTime > 0 && runTime % 30 === 0 && fps > 0) {
					console.log(`=== PERFORMANCE DATA (${runTime}s) ===`);
					console.log(`Current FPS: ${fps}`);
					if (memoryReadings.length > 0) {
						console.log(`Memory readings: ${memoryReadings.join(', ')}MB`);
					}
				}
			}

			requestAnimationFrame(updateStats);
		}

		requestAnimationFrame(updateStats);
	}

	// Initialization and cleanup logic
	onMount(() => {
		// Theme initialization
		const savedTheme = localStorage.getItem('theme') || 'dark';
		theme.set(savedTheme);

		if (browser) {
			document.documentElement.classList.add(savedTheme);

			// Initialize ResizeObserver for navbar height
			if (navbarElement) {
				resizeObserver = new ResizeObserver(updateNavHeight);
				resizeObserver.observe(navbarElement);
			}

			// Enable performance monitoring
			if (typeof setupPerformanceMonitoring === 'function') {
				cleanupPerformanceMonitoring = setupPerformanceMonitoring();
			}

			if (typeof setupEventListeners === 'function') {
				cleanupEventListeners = setupEventListeners();
			}

			// Enable debug mode during development
			if (import.meta.env.DEV) {
				frameRateController.setDebugMode(true);
			}

			// Setup logo positioning
			updateLogoPosition();

			// Add multiple event listeners to catch all possible triggers
			window.addEventListener('resize', updateLogoPosition);
			window.addEventListener('orientationchange', updateLogoPosition);
			window.addEventListener('scroll', handleScroll, { passive: true }); // Add scroll listener with passive flag

			// Force repaint on orientation change with a slight delay
			window.addEventListener('orientationchange', () => {
				setTimeout(updateLogoPosition, 100);
			});
		}

		// Loading screen handling
		if (browser) {
			Promise.all([
				document.fonts.ready,
				new Promise((resolve) => {
					if (document.readyState === 'complete') {
						resolve(true);
					} else {
						window.addEventListener('load', () => resolve(true), { once: true });
					}
				})
			]).then(() => {
				setTimeout(() => loadingStore.set(false), 1500);
			});

			// Immediately try to remove any lingering initial-loader from app.html
			const initialLoader = document.getElementById('initial-loader');
			if (initialLoader) {
				initialLoader.style.display = 'none';
			}

			setTimeout(() => {
				initPerformanceMonitor();
			}, 1000);
		}
	});

	onDestroy(() => {
		if (browser) {
			if (resizeObserver) {
				resizeObserver.disconnect();
			}

			// Remove event listeners
			window.removeEventListener('resize', updateLogoPosition);
			window.removeEventListener('orientationchange', updateLogoPosition);
			window.removeEventListener('scroll', handleScroll); // Clean up scroll listener

			// Clean up monitoring
			if (cleanupPerformanceMonitoring) cleanupPerformanceMonitoring();
			if (cleanupEventListeners) cleanupEventListeners();
		}

		// Safely clean up controller only in browser context
		if (browser) {
			frameRateController.cleanup();
		}
	});
</script>

<!-- Template section -->
<LoadingScreen />

<nav
	bind:this={navbarElement}
	class="sticky relative
           border-b-2 border-arcadeBlack-500 border-opacity-30 dark:border-arcadeBlack-700 dark:border-opacity-50
           md:border-b-[2.5px] md:border-arcadeBlack-200 md:dark:border-arcadeBlack-600
           top-0 z-[101] {$theme === 'dark'
		? 'navbar-background-dark'
		: 'navbar-background-light'} p-container-padding box-border md:shadow-header
		{isScrolled ? 'mobile-navbar-blur' : ''}"
>
	<Navbar
		class="container max-w-screen-xl mx-auto px-4 py-px flex justify-between items-center bg-transparent"
	>
		<!-- Empty div for spacing on mobile -->
		<div class="w-9 h-9 md:hidden"></div>

		<!-- Logo wrapper with binding for positioning -->
		<div bind:this={logoWrapper} class="logo-wrapper md:hidden absolute z-30">
			<NavBrand href="/">
				<img src={logo} alt="Jo Pearson Logo" class="h-9 w-9 mr-[8px] pt-1 header-logo-pulse" />
			</NavBrand>
		</div>

		<!-- Desktop logo that remains left-aligned -->
		<div class="hidden md:block">
			<NavBrand href="/">
				<img src={logo} alt="Jo Pearson Logo" class="h-9 w-9 mr-[8px] pt-1 header-logo-pulse" />
				<span
					class="hidden lg:inline-block text-[16px] header-text text-[color:var(--arcade-black-500)] dark:text-[color:var(--arcade-white-300)] uppercase tracking-[24.96px] mt-[5px]"
				>
					Jo Pearson
				</span>
			</NavBrand>
		</div>

		<div class="flex md:order-2 items-center gap-4">
			<button
				on:click={toggleTheme}
				class="md:flex items-center justify-center w-10 h-10 rounded-full bg-opacity-20 hover:bg-opacity-30 transition-all duration-300 ease-in dark:text-[var(--arcade-white-300)] text-[var(--arcade-black-300)]"
				aria-label="Toggle Dark Mode"
			>
				{#if $theme === 'dark'}
					<Sun size={20} />
				{:else}
					<Moon size={20} />
				{/if}
			</button>

			<div class="lg:hidden flex items-center">
				<MobileNavMenu bind:isOpen={isMenuOpen} />
			</div>
		</div>

		<!-- Updated Navigation Component -->
		<Navigation />
	</Navbar>
</nav>

<main bind:this={contentWrapper} class="content-wrapper">
	<slot />
</main>

<Footer />

<!-- Add the Performance Monitor component if in development mode -->
{#if import.meta.env.DEV}
	<PerformanceMonitor />
{/if}

<style>
	:global(:root) {
		--navbar-height: 0px;
	}

	@media (max-width: 1023px) {
		.navbar-background-dark,
		.navbar-background-light {
			@apply overflow-hidden bg-transparent;
		}
	}

	@media (min-width: 1024px) {
		.navbar-background-dark {
			background-color: var(--dark-mode-bg);
			background-image: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 25%, transparent 25%),
				linear-gradient(225deg, rgba(255, 255, 255, 0.05) 25%, transparent 25%),
				linear-gradient(45deg, rgba(255, 255, 255, 0.05) 25%, transparent 25%),
				linear-gradient(315deg, rgba(255, 255, 255, 0.05) 25%, transparent 25%);
			background-size: 4px 4px;
		}

		.navbar-background-light {
			background-color: var(--light-mode-bg);
			background-image: linear-gradient(135deg, rgba(255, 255, 255, 0.3) 25%, transparent 25%),
				linear-gradient(225deg, rgba(255, 255, 255, 0.3) 25%, transparent 25%),
				linear-gradient(45deg, rgba(255, 255, 255, 0.3) 25%, transparent 25%),
				linear-gradient(315deg, rgba(255, 255, 255, 0.3) 25%, transparent 25%);
			background-size: 4px 4px;
		}
	}

	/* Mobile navbar blur effect - only applies on mobile */
	@media (max-width: 767px) {
		.mobile-navbar-blur {
			backdrop-filter: blur(2.5px);
			-webkit-backdrop-filter: blur(2.5px);
			background-color: rgba(255, 255, 255, 0.05); /* Very subtle background for dark mode */
		}

		.dark .mobile-navbar-blur {
			background-color: rgba(0, 0, 0, 0.1); /* Slightly darker background for light mode */
		}
	}

	.header-logo-pulse {
		animation: headerPulse 3s ease-in-out infinite;
	}

	/* Logo positioning styles */
	.logo-wrapper {
		transition: transform 0.3s ease-out;
		will-change: transform;
		line-height: 1; /* Reset line height to prevent vertical offset issues */
	}

	/* Additional CSS for landscape orientation */
	@media (orientation: landscape) and (max-width: 767px) {
		:global(.logo-wrapper[data-orientation='landscape']) {
			/* Force a different position in CSS as a backup */
			left: 30% !important;
		}
	}

	@keyframes headerPulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.7;
		}
	}

	/* Add will-change to optimize animations */
	.theme-transition {
		will-change: background-color, color;
		transition:
			background-color 0.3s ease,
			color 0.3s ease;
	}

	/* Improve mobile-navbar-blur for iOS */
	@media (max-width: 767px) {
		.mobile-navbar-blur {
			backdrop-filter: blur(2.5px);
			-webkit-backdrop-filter: blur(2.5px);
			background-color: rgba(255, 255, 255, 0.05);
			/* Force new stacking context on iOS */
			transform: translateZ(0);
			z-index: 100;
		}

		.dark .mobile-navbar-blur {
			background-color: rgba(0, 0, 0, 0.1);
		}
	}
</style>

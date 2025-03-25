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
	import { gsap } from 'gsap';
	import { throttle } from '$lib/utils/lodash-utils';
	import PerformanceMonitor from '$lib/components/ui/PerformanceMonitor.svelte';
	import { initAnimationMode } from '$lib/utils/animation-mode';

	// Enable/disable performance monitor
	const showPerformanceMonitor = writable(false);

	// Set loading to true initially to ensure LoadingScreen shows first
	loadingStore.set(true);

	// Element references
	let navbarElement: HTMLElement;
	let contentWrapper: HTMLElement;
	let isMenuOpen = false;
	let logoWrapper: HTMLElement;
	let isScrolled = false; // State for tracking scroll position

	// Optimize with ResizeObserver instead of window resize event
	let resizeObserver: ResizeObserver | null = null;
	let handlers: {
		throttledPositionUpdate: ReturnType<typeof throttle>;
		throttledScrollHandler: ReturnType<typeof throttle>;
	} | null = null;

	// Create store with initial value
	export const navbarHeight = writable(0);

	// Create throttled handlers outside of lifecycle hooks
	const createThrottledHandlers = () => {
		if (!browser) return { throttledPositionUpdate: () => {}, throttledScrollHandler: () => {} };

		// Throttle handlers to limit execution frequency
		const throttledPositionUpdate = throttle(
			() => {
				requestAnimationFrame(updateLogoPosition);
			},
			100,
			{ leading: true, trailing: true }
		);

		const throttledScrollHandler = throttle(
			() => {
				requestAnimationFrame(() => {
					isScrolled = window.scrollY > 10;
				});
			},
			100,
			{ leading: true, trailing: true }
		);

		return { throttledPositionUpdate, throttledScrollHandler };
	};

	// Debounced navbar height update function
	const updateNavHeight = (() => {
		if (!browser) return () => {};

		let frame: number;
		return () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => {
				if (navbarElement) {
					const height = navbarElement.offsetHeight;
					navbarHeight.set(height);
					layoutStore.setNavbarHeight(height);

					document.documentElement.style.setProperty('--navbar-height', `${height}px`);
				}
			});
		};
	})();

	// Update logo position based on viewport width and orientation
	const updateLogoPosition = () => {
		if (!browser || !logoWrapper || !navbarElement) return;

		// Read phase - gather all measurements first
		const width = window.innerWidth;
		const height = window.innerHeight;
		const isLandscape = width > height;
		const isMobile = width < 768;
		const logoWidth = isMobile ? logoWrapper.offsetWidth : 0;

		// Batch DOM writes with a single requestAnimationFrame
		requestAnimationFrame(() => {
			// Use GSAP for smoother animations with hardware acceleration
			if (isMobile) {
				const offsetPosition = isLandscape
					? width * 0.25 - logoWidth / 2
					: width * 0.23 - logoWidth / 2;

				gsap.set(logoWrapper, {
					attr: { 'data-orientation': isLandscape ? 'landscape' : 'portrait' },
					position: 'absolute',
					top: '50%',
					height: 'auto',
					xPercent: 0,
					yPercent: -50,
					x: offsetPosition,
					force3D: true, // Force hardware acceleration
					clearProps: 'z,perspective' // Clear unnecessary props
				});
			} else {
				gsap.set(logoWrapper, {
					clearProps: 'transform,position,top,height,data-orientation',
					force3D: true
				});
			}
		});
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

	// Toggle performance monitor
	function togglePerformanceMonitor() {
		showPerformanceMonitor.update((value) => !value);
	}

	// Initialization and cleanup logic
	onMount(() => {
		if (!browser) return;

		// Create handlers once
		handlers = createThrottledHandlers();

		// Initialize animation mode
		initAnimationMode();

		// Theme initialization - do this FIRST and only ONCE
		const savedTheme = localStorage.getItem('theme') || 'dark';
		theme.set(savedTheme);
		document.documentElement.classList.add(savedTheme);

		// Consolidated event registration with a single resize observer
		const resizeHandler = () => {
			if (handlers) handlers.throttledPositionUpdate();
			updateNavHeight();
		};

		// Initialize ResizeObserver for navbar height
		try {
			resizeObserver = new ResizeObserver(resizeHandler);

			// Observe only what's necessary
			if (navbarElement) {
				resizeObserver.observe(navbarElement);
				updateNavHeight(); // Update height once immediately
			}
		} catch (e) {
			// Fallback for browsers without ResizeObserver
			window.addEventListener('resize', resizeHandler, { passive: true });
		}

		// Use passive event listeners for better performance
		window.addEventListener('scroll', handlers.throttledScrollHandler, { passive: true });
		window.addEventListener('orientationchange', resizeHandler, { passive: true });

		// Initial positioning
		updateLogoPosition();

		// Loading screen handling with Promise.all for better coordination
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
			// Use requestIdleCallback if available, otherwise setTimeout
			if (window.requestIdleCallback) {
				window.requestIdleCallback(() => {
					loadingStore.set(false);
				});
			} else {
				setTimeout(() => loadingStore.set(false), 1500);
			}
		});
		// Performance monitor toggle (Ctrl+Shift+P)
		document.addEventListener('keydown', (event) => {
			if (event.ctrlKey && event.shiftKey && event.key === 'P') {
				togglePerformanceMonitor();
			}
		});
	});

	onDestroy(() => {
		// Complete cleanup to prevent memory leaks
		if (resizeObserver) {
			resizeObserver.disconnect();
			resizeObserver = null;
		}

		if (browser && handlers) {
			window.removeEventListener('scroll', handlers.throttledScrollHandler);
			// Remove event listeners
			window.removeEventListener('orientationchange', handlers.throttledPositionUpdate);

			// Cancel any pending throttled executions
			handlers.throttledPositionUpdate.cancel();
			handlers.throttledScrollHandler.cancel();
			handlers = null;
		}

		// Kill any GSAP animations to prevent memory leaks
		if (browser) {
			gsap.killTweensOf([logoWrapper, navbarElement]);
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

<!-- Add performance monitor (toggled with Ctrl+Shift+P) -->
{#if browser}
	<PerformanceMonitor enabled={$showPerformanceMonitor} />
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

	/* Mobile navbar blur effect - optimized for performance */
	@media (max-width: 767px) {
		/* Replace backdrop-filter with solid background on mobile */
		.mobile-navbar-blur {
			/* Remove expensive backdrop-filter for mobile */
			backdrop-filter: none;
			-webkit-backdrop-filter: none;
			/* Use solid background instead */
			background-color: rgba(20, 20, 20, 0.85);
			/* Keep GPU acceleration */
			transform: translateZ(0);
			z-index: 100;
		}

		.dark .mobile-navbar-blur {
			background-color: rgba(0, 0, 0, 0.85);
		}

		/* Restore backdrop-filter for high-end devices */
		@media (min-width: 768px), (min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
			.mobile-navbar-blur {
				backdrop-filter: blur(2.5px);
				-webkit-backdrop-filter: blur(2.5px);
				background-color: rgba(255, 255, 255, 0.05);
			}

			.dark .mobile-navbar-blur {
				background-color: rgba(0, 0, 0, 0.1);
			}
		}
	}

	.header-logo-pulse {
		animation: headerPulse 3s ease-in-out infinite;
	}

	/* Logo positioning styles with optimized animation */
	.logo-wrapper {
		transition: transform 0.3s ease-out;
		will-change: transform;
		line-height: 1;
		transform: translateZ(0); /* Force GPU acceleration */
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

	/* Optimized transition handling */
	.theme-transition {
		/* Only transition essential properties */
		transition: background-color 0.3s ease;
		/* Remove will-change except during transition */
		will-change: auto;
	}

	/* Improve mobile styles for iOS */
	@media (max-width: 767px) {
		/* Fix GPU rendering on iOS */
		.content-wrapper {
			-webkit-overflow-scrolling: touch;
			transform: translateZ(0);
		}
	}
	/* Force hardware acceleration on key elements */
	:global(.hardware-accelerated) {
		transform: translateZ(0);
		backface-visibility: hidden;
		will-change: transform;
	}

	/* Optimize mobile navbar blur effect */
	@media (max-width: 767px) {
		/* Replace backdrop-filter with solid background on mobile */
		.mobile-navbar-blur {
			/* Remove expensive backdrop-filter for mobile */
			backdrop-filter: none;
			-webkit-backdrop-filter: none;
			/* Use solid background instead */
			background-color: rgba(20, 20, 20, 0.85);
			/* Keep GPU acceleration */
			transform: translateZ(0);
			z-index: 100;
		}

		.dark .mobile-navbar-blur {
			background-color: rgba(0, 0, 0, 0.85);
		}

		/* Restore backdrop-filter for high-end devices */
		@media (min-width: 768px), (min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
			.mobile-navbar-blur {
				backdrop-filter: blur(2.5px);
				-webkit-backdrop-filter: blur(2.5px);
				background-color: rgba(255, 255, 255, 0.05);
			}

			.dark .mobile-navbar-blur {
				background-color: rgba(0, 0, 0, 0.1);
			}
		}
	}
</style>

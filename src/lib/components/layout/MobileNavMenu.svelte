<!-- src/lib/components/layout/MobileNavMenu.svelte -->
<script lang="ts">
	import { fly, fade, slide } from 'svelte/transition';
	import { cubicInOut } from 'svelte/easing';
	import { Sun, Moon, Gear } from 'svelte-bootstrap-icons';
	import { theme } from '$lib/stores/theme';
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { navSections, navigationStore } from '$lib/stores/navigation';
	import { tick } from 'svelte';
	import { base } from '$app/paths'; // Import the base path
	import { perfMonitorVisible, togglePerformanceMonitor } from '$lib/stores/performance-monitor';

	export let isOpen = false;

	// Current path tracking
	let currentPath = '/';
	// Store scroll position
	let scrollPosition = 0;
	// DOM elements
	let mobileMenuContainer: HTMLElement;
	let mobileMenuPanel: HTMLElement;

	// Settings submenu state
	let isSettingsOpen = false;

	// iOS detection - helps with specific fixes
	let isIOS = false;

	onMount(() => {
		// Detect iOS for specific fixes
		if (browser) {
			isIOS =
				/iPad|iPhone|iPod/.test(navigator.userAgent) ||
				(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
		}
	});

	// Toggle menu function with improved iOS support
	function toggleMenu(event?: Event) {
		if (event) {
			event.preventDefault();
		}

		if (!isOpen && browser) {
			// Save scroll position before opening menu
			scrollPosition = window.scrollY;

			// Apply fixed position to body with proper transform
			document.body.style.position = 'fixed';
			document.body.style.width = '100%';
			document.body.style.height = '100%';
			document.body.style.top = `-${scrollPosition}px`;
			document.body.style.overflow = 'hidden';
			document.body.style.touchAction = 'none';

			// Add class to body for styling hooks
			document.body.classList.add('menu-open');

			// iOS-specific overflow handling
			if (isIOS) {
				// Force layout calculation to ensure proper positioning
				document.documentElement.style.overflow = 'hidden';
				document.documentElement.style.height = '100%';

				// iOS scroll position prevention
				window.scrollTo(0, 0);
				setTimeout(() => {
					// Additional iOS fix for positioning
					if (mobileMenuPanel) {
						// Force position recalculation
						mobileMenuPanel.style.display = 'none';
						void mobileMenuPanel.offsetHeight; // Force reflow
						mobileMenuPanel.style.display = 'flex';
					}
				}, 10);
			}
		}

		isOpen = !isOpen;

		// Reset settings submenu when closing main menu
		if (!isOpen) {
			isSettingsOpen = false;
		}

		// If opening, apply additional iOS fixes after state update
		if (isOpen && isIOS && browser) {
			tick().then(() => {
				// Move the menu element to be a direct child of body for iOS
				if (mobileMenuContainer) {
					// Ensure menu is directly in body for proper stacking context
					document.body.appendChild(mobileMenuContainer);
				}
			});
		}
	}

	// Toggle settings submenu - isolated from performance monitor state
	function toggleSettings(event?: Event) {
		if (event) {
			event.preventDefault();
			event.stopPropagation(); // This is important to prevent event bubbling
		}

		// Only toggle settings state, don't affect performance monitor
		isSettingsOpen = !isSettingsOpen;
	}

	// Close menu when escape key is pressed
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			if (isSettingsOpen) {
				// First close settings submenu if open
				isSettingsOpen = false;
			} else if (isOpen) {
				// Then close main menu
				closeMenu();
			}
		}
	}

	// Toggle theme function
	function toggleTheme(event?: Event) {
		if (event) {
			event.preventDefault();
			event.stopPropagation();
		}

		theme.update((currentTheme) => {
			const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
			document.documentElement.classList.toggle('dark', newTheme === 'dark');
			document.documentElement.classList.toggle('light', newTheme === 'light');
			localStorage.setItem('theme', newTheme);
			return newTheme;
		});
	}

	// Toggle performance monitor - with isolated event handling to prevent menu interference
	function handleTogglePerfMonitor(event?: Event) {
		if (event) {
			event.preventDefault();
			event.stopPropagation();
		}

		// Use the imported function rather than directly modifying the store
		togglePerformanceMonitor();
	}

	// Improved smooth scroll function
	async function smoothScroll(target: string, e: MouseEvent) {
		e.preventDefault();

		if (!browser) return;

		// Extract section ID from target
		const sectionId = target.replace('#', '');

		// Check if we're on the homepage
		const isHomePage =
			currentPath === '/' ||
			currentPath === base + '/' ||
			window.location.pathname === '/' ||
			window.location.pathname === base + '/';

		// Close the menu first
		closeMenu();

		// Wait for a tick to ensure the menu closing state is properly updated
		await tick();

		// Then handle navigation differently based on current page
		setTimeout(() => {
			if (isHomePage) {
				// We're on the homepage - use the navigationStore to scroll
				navigationStore.scrollToSection(sectionId);
			} else {
				// We're on another page (e.g., blog) - navigate to homepage with hash
				window.location.href = `${base}/#${sectionId}`;
			}
		}, 150); // Add a small delay to ensure menu closing animation completes
	}

	// Improved close menu function
	function closeMenu() {
		if (isOpen) {
			isOpen = false;
			isSettingsOpen = false;

			// Wait a tick to ensure DOM updates
			tick().then(() => {
				if (browser) {
					// Store the scroll position we need to restore
					const scrollY = parseInt(document.body.style.top || '0') * -1;

					// Remove the fixed positioning and other properties
					document.body.classList.remove('menu-open');
					document.body.style.position = '';
					document.body.style.top = '';
					document.body.style.width = '';
					document.body.style.height = '';
					document.body.style.overflow = '';
					document.body.style.touchAction = '';

					// iOS-specific cleanup
					if (isIOS) {
						document.documentElement.style.overflow = '';
						document.documentElement.style.height = '';
					}

					// Restore scroll position with a small delay for iOS
					setTimeout(() => {
						window.scrollTo({
							top: scrollY,
							behavior: 'auto' // Use 'auto' to prevent any smooth scrolling interference
						});
					}, 10);
				}
			});
		}
	}

	// Update current path when page changes
	$: if (browser && $page) {
		currentPath = $page.url.pathname;
	}

	onDestroy(() => {
		if (browser) {
			document.body.classList.remove('menu-open');
			document.body.style.position = '';
			document.body.style.top = '';
			document.body.style.width = '';
			document.documentElement.style.overflow = '';
			document.documentElement.style.height = '';
		}
	});
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- Menu toggle button - stays inline in the navbar -->
<button
	on:click={toggleMenu}
	class="inline-flex z-50 p-2
		text-arcadeBlack-500 dark:text-arcadeWhite-300
		hover:bg-arcadeBlack-100/50 dark:hover:bg-arcadeBlack-700/50
		transition-all duration-300 items-center justify-center"
	aria-label={isOpen ? 'Close Menu' : 'Open Menu'}
	aria-expanded={isOpen}
	aria-controls="mobile-menu"
>
	<div class="flex items-center justify-center w-6 h-6">
		<div class="relative w-5 h-4 flex flex-col justify-between">
			<!-- Hamburger to X animation - simplified structure -->
			<span
				class="block w-full h-0.5 bg-current transform transition-transform duration-300 origin-center {isOpen
					? 'absolute rotate-45 top-1.5'
					: ''}"
			></span>
			<span
				class="block w-full h-0.5 bg-current transition-opacity duration-300 {isOpen
					? 'absolute opacity-0 top-1.5'
					: ''}"
			></span>
			<span
				class="block w-full h-0.5 bg-current transform transition-transform duration-300 origin-center {isOpen
					? 'absolute -rotate-45 top-1.5'
					: ''}"
			></span>
		</div>
	</div>
</button>

{#if isOpen}
	<!-- Overlay and menu container - using portal pattern for iOS -->
	<div
		bind:this={mobileMenuContainer}
		class="mobile-menu-container"
		role="dialog"
		aria-modal="true"
		aria-label="Mobile Navigation Menu"
	>
		<!-- Fixed overlay - using a proper button element -->
		<button
			class="fixed inset-0 z-[9999] bg-black/30 backdrop-blur-sm w-full h-full"
			style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; height: 100vh; width: 100vw; border: none;"
			on:click={closeMenu}
			on:keydown={(e) => e.key === 'Enter' && closeMenu()}
			aria-label="Close menu"
			transition:fade={{ duration: 200 }}
		></button>

		<!-- Menu Panel -->
		<div
			bind:this={mobileMenuPanel}
			id="mobile-menu"
			class="fixed inset-y-0 right-0 z-[10000] w-full max-w-xs
			bg-[var(--light-mode-bg)] dark:bg-[var(--dark-mode-bg)]
			shadow-xl flex flex-col overflow-y-auto
			transform will-change-transform"
			style="position: fixed; top: 0; bottom: 0; right: 0; height: 100vh; max-height: 100vh; width: 100%; max-width: 20rem;"
			transition:fly={{ x: 300, duration: 300, easing: cubicInOut }}
		>
			<!-- Top spacing area with settings gear -->
			<div class="px-4 py-4 h-16 flex justify-end items-center">
				<button
					on:click={toggleSettings}
					class="flex items-center justify-center w-7 h-7
						text-arcadeBlack-500 dark:text-arcadeBlack-300
						transition-all duration-300"
					aria-label="Settings"
					aria-expanded={isSettingsOpen}
					aria-controls="settings-submenu"
				>
					<Gear class="w-4 h-4" />
				</button>
			</div>

			<!-- Settings submenu -->
			{#if isSettingsOpen}
				<div
					id="settings-submenu"
					class="px-3 py-2 mb-2 mx-4
						bg-arcadeBlack-100/50 dark:bg-arcadeBlack-700/50"
					transition:slide={{ duration: 200 }}
				>
					<div
						class="text-[10px] uppercase tracking-wide mb-2 font-normal text-arcadeBlack-300 dark:text-arcadeBlack-400"
					>
						settings
					</div>
					<div class="ml-3">
						<!-- Theme toggle -->
						<button
							on:click={toggleTheme}
							class="flex items-center justify-between w-full py-1 px-1
							text-arcadeBlack-500 dark:text-arcadeWhite-300
							hover:bg-arcadeBlack-200/30 dark:hover:bg-arcadeBlack-600/30
							transition-colors duration-200 text-xs"
							aria-label={$theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
						>
							<div class="flex items-center space-x-2">
								{#if $theme === 'dark'}
									<Sun class="w-3 h-3 text-arcadeBlack-300 dark:text-arcadeBlack-400" />
									<span>Light Mode</span>
								{:else}
									<Moon class="w-3 h-3 text-arcadeBlack-300 dark:text-arcadeBlack-400" />
									<span>Dark Mode</span>
								{/if}
							</div>
							<div
								class="w-8 h-4 rounded-full
							{$theme === 'dark' ? 'bg-arcadeNeonOrange-500/20' : 'bg-arcadeNeonBlue-500/20'}
							relative flex items-center px-1"
							>
								<div
									class="w-2 h-2 rounded-full
								{$theme === 'dark' ? 'bg-arcadeNeonOrange-500 ml-auto' : 'bg-arcadeNeonBlue-500'}
								transition-transform duration-300"
								></div>
							</div>
						</button>

						<!-- Performance Monitor toggle -->
						<button
							on:click={handleTogglePerfMonitor}
							class="flex items-center justify-between w-full py-1 px-1
						text-arcadeBlack-500 dark:text-arcadeWhite-300
						hover:bg-arcadeBlack-200/30 dark:hover:bg-arcadeBlack-600/30
						transition-colors duration-200 mt-1 text-xs"
							aria-label="Toggle Performance Monitor"
							aria-pressed={$perfMonitorVisible}
						>
							<div class="flex items-center space-x-2">
								<div
									class="w-3 h-3 flex items-center justify-center text-arcadeBlack-300 dark:text-arcadeBlack-400"
								>
									<span class="text-xs font-mono scale-75">FPS</span>
								</div>
								<span>Performance Monitor</span>
							</div>
							<div
								class="w-8 h-4 rounded-full
						{$perfMonitorVisible
									? 'bg-arcadeNeonGreen-500/20'
									: 'bg-arcadeBlack-300/20 dark:bg-arcadeBlack-600/20'}
						relative flex items-center px-1"
							>
								<div
									class="w-2 h-2 rounded-full
							{$perfMonitorVisible
										? 'bg-arcadeNeonGreen-500 ml-auto'
										: 'bg-arcadeBlack-300 dark:bg-arcadeBlack-500'}
							transition-transform duration-300"
								></div>
							</div>
						</button>
					</div>
				</div>
			{/if}
			<nav class="flex-1 px-6 py-2">
				<ul class="space-y-5 list-none p-0 m-0">
					{#each $navSections as section}
						<li>
							<a
								href="{base}#{section.id}"
								class="menu-link block text-base group relative overflow-hidden px-2 py-1
									text-arcadeBlack-500 dark:text-arcadeWhite-300
									{section.isActive ? 'active-link dark:text-arcadeNeonGreen-500' : ''}"
								on:click={(e) => smoothScroll(`#${section.id}`, e)}
							>
								<!-- Glowing background effect that appears on hover -->
								<span
									class="absolute inset-0 bg-gradient-to-r
									from-arcadeNeonGreen-500/0 via-arcadeNeonGreen-500/10 to-arcadeNeonGreen-500/0
									dark:from-arcadeNeonGreen-500/0 dark:via-arcadeNeonGreen-500/20 dark:to-arcadeNeonGreen-500/0
									opacity-0 group-hover:opacity-100 transform translate-x-[-100%] group-hover:translate-x-[100%]
									transition-all duration-1000 ease-in-out"
								></span>
								<!-- Text with scan line effect -->
								<span class="relative z-10 inline-block">
									{section.title}

									<!-- Active indicator - vertical line -->
									<span class="arcade-active-indicator"></span>
								</span>
							</a>
						</li>
					{/each}

					<!-- Add blog link separately if needed -->
					<li>
						<a
							href="{base}/blog"
							class="menu-link block text-base group relative overflow-hidden px-2 py-1
								text-arcadeBlack-500 dark:text-arcadeWhite-300
								{currentPath === '/blog' || currentPath === base + '/blog'
								? 'active-link dark:text-arcadeNeonGreen-500'
								: ''}"
						>
							<!-- Glowing background effect that appears on hover -->
							<span
								class="absolute inset-0 bg-gradient-to-r
								from-arcadeNeonGreen-500/0 via-arcadeNeonGreen-500/10 to-arcadeNeonGreen-500/0
								dark:from-arcadeNeonGreen-500/0 dark:via-arcadeNeonGreen-500/20 dark:to-arcadeNeonGreen-500/0
								opacity-0 group-hover:opacity-100 transform translate-x-[-100%] group-hover:translate-x-[100%]
								transition-all duration-1000 ease-in-out"
							></span>

							<!-- Text with scan line effect -->
							<span class="relative z-10 inline-block">
								Blog

								<!-- Active indicator - vertical line -->
								<span class="arcade-active-indicator"></span>
							</span>
						</a>
					</li>
				</ul>
			</nav>

			<div class="h-4"></div>
		</div>
	</div>
{/if}

<style lang="postcss">
	/* Remove tap highlight on mobile */
	button,
	a {
		-webkit-tap-highlight-color: transparent;
		-webkit-touch-callout: none;
		-webkit-user-select: none;
		user-select: none;
	}

	/* Smooth scrolling for menu panel with hardware acceleration */
	div {
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	div::-webkit-scrollbar {
		display: none;
	}

	/* Enable hardware acceleration for smoother animations */
	div {
		transform: translateZ(0);
		backface-visibility: hidden;
		perspective: 1000px;
	}

	/* iOS-specific fixes */
	:global(.mobile-menu-container) {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		width: 100vw;
		height: 100vh;
		height: -webkit-fill-available;
		max-height: -webkit-fill-available;
		overflow: hidden;
		z-index: 9999;
		/* Force new stacking context outside of any other element */
		transform: translateZ(0);
		will-change: transform;
	}

	/* Fix for iOS - ensure proper positioning and dimensions */
	#mobile-menu {
		height: 100vh;
		height: -webkit-fill-available;
		max-height: -webkit-fill-available;
		width: 100%;
		max-width: 20rem;
		overflow-y: auto;
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		left: auto;
		/* Force hardware acceleration */
		-webkit-transform: translateZ(0);
		transform: translateZ(0);
		will-change: transform;
	}

	/* Improved iOS body lock */
	:global(body.menu-open) {
		overflow: hidden !important;
		position: fixed !important;
		width: 100% !important;
		height: 100% !important;
		touch-action: none !important;
		-webkit-overflow-scrolling: auto !important;
	}

	/* iOS height fixes for menu */
	@supports (-webkit-touch-callout: none) {
		#mobile-menu {
			height: -webkit-fill-available;
		}

		:global(.mobile-menu-container) {
			height: -webkit-fill-available;
		}
	}

	/* Active indicator for nav links */
	.arcade-active-indicator {
		position: absolute;
		left: -8px;
		top: 50%;
		transform: translateY(-50%);
		width: 2px;
		height: 0;
		background: theme('colors.arcadeNeonGreen.100');
		opacity: 0;
		transition:
			height 0.3s ease,
			opacity 0.3s ease;
	}

	/* Show the active indicator for active links */
	.active-link .arcade-active-indicator {
		height: 16px;
		opacity: 1;
		box-shadow:
			0 0 8px theme('colors.arcadeNeonGreen.300'),
			0 0 12px theme('colors.arcadeNeonGreen.200');
	}
</style>

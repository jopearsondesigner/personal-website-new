<!-- src/lib/components/layout/MobileNavMenu.svelte -->
<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { cubicInOut } from 'svelte/easing';
	import { Sun, Moon } from 'svelte-bootstrap-icons';
	import { theme } from '$lib/stores/theme';
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { navSections, navigationStore } from '$lib/stores/navigation';
	import { tick } from 'svelte';
	import { base } from '$app/paths'; // Import the base path

	export let isOpen = false;

	// Current path tracking
	let currentPath = '/';
	// Store scroll position
	let scrollPosition = 0;
	// DOM elements
	let mobileMenuContainer: HTMLElement;
	let mobileMenuPanel: HTMLElement;

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

	// Close menu when escape key is pressed
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && isOpen) {
			closeMenu();
		}
	}

	// Toggle theme function
	function toggleTheme() {
		theme.update((currentTheme) => {
			const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
			document.documentElement.classList.toggle('dark', newTheme === 'dark');
			document.documentElement.classList.toggle('light', newTheme === 'light');
			localStorage.setItem('theme', newTheme);
			return newTheme;
		});
	}

	// Improved smooth scroll function
	async function smoothScroll(target: string, e: MouseEvent) {
		e.preventDefault();
		if (!browser) return;

		// Close the menu first
		closeMenu();

		// Extract section ID from target
		const isHashLink = target.includes('#');
		const sectionId = isHashLink ? target.split('#')[1] : '';

		// If not a section link, just navigate normally
		if (!isHashLink) {
			window.location.href = target;
			return;
		}

		// Check if we're on the homepage
		const isHomePage =
			currentPath === '/' ||
			currentPath === base + '/' ||
			window.location.pathname === '/' ||
			window.location.pathname === base + '/';

		if (isHomePage) {
			// We're on homepage - use the robust hybrid approach
			await tick();

			// Find the section element
			const section = document.getElementById(sectionId);
			if (!section) {
				console.warn(`Section with ID '${sectionId}' not found`);
				return;
			}

			// Get navbar height for offset
			const navbarHeight = parseInt(
				document.documentElement.style.getPropertyValue('--navbar-height') || '64',
				10
			);

			// Calculate position with offset
			const top = section.getBoundingClientRect().top + window.scrollY - navbarHeight;

			// Update active section in store
			navigationStore.setActiveSection(sectionId);

			// Update URL hash without jumping (using history API)
			if (history.pushState) {
				// Avoid duplicate base paths in URL
				const basePath = base || '';
				history.pushState(null, '', `${basePath}/#${sectionId}`);
			}

			// Smooth scroll
			window.scrollTo({
				top,
				behavior: 'smooth'
			});
		} else {
			// We're on a different page - navigate to homepage with hash
			const basePath = base || '';
			window.location.href = `${basePath}/#${sectionId}`;
		}
	}

	// Improved close menu function
	function closeMenu() {
		if (isOpen) {
			isOpen = false;

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
						window.scrollTo(0, scrollY);
					}, 50);
				}
			});
		}
	}

	// Update current path when page changes
	$: if (browser && $page) {
		currentPath = $page.url.pathname;
	}

	// Clean up on component destroy
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
		on:click={closeMenu}
		on:keydown={(e) => e.key === 'Enter' && closeMenu()}
		role="presentation"
	>
		<!-- Fixed overlay for when menu is open - directly in body -->
		<div
			class="fixed inset-0 z-[9999] bg-black/30 backdrop-blur-sm"
			style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; height: 100vh; width: 100vw;"
			transition:fade={{ duration: 200 }}
		></div>

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
			on:click|stopPropagation
			on:keydown={(e) => e.key === 'Enter' && closeMenu()}
			role="dialog"
			tabindex="0"
		>
			<!-- Top spacing area - no button here -->
			<div class="px-4 py-4 h-16"></div>

			<!-- Navigation Links - Updated to use navSections -->
			<nav class="flex-1 px-6 py-2">
				<div class="space-y-5">
					{#each $navSections as section}
						<a
							href="{base}#{section.id}"
							class="block text-base
								text-arcadeBlack-500 dark:text-arcadeWhite-300
								hover:text-arcadeNeonGreen-500 dark:hover:text-arcadeNeonGreen-500
								{section.isActive ? 'text-arcadeNeonGreen-500' : ''}"
							on:click={(e) => smoothScroll(`#${section.id}`, e)}
						>
							{section.title}
						</a>
					{/each}

					<!-- Add blog link separately if needed -->
					<a
						href="{base}/blog"
						class="block text-base
							text-arcadeBlack-500 dark:text-arcadeWhite-300
							hover:text-arcadeNeonGreen-500 dark:hover:text-arcadeNeonGreen-500
							{currentPath === '/blog' || currentPath === base + '/blog' ? 'text-arcadeNeonGreen-500' : ''}"
					>
						Blog
					</a>
				</div>
			</nav>

			<!-- Footer -->
			<div class="px-6 py-4 border-t border-arcadeBlack-200 dark:border-arcadeBlack-600">
				<button
					on:click={toggleTheme}
					class="flex items-center justify-between w-full p-3 rounded-lg
						text-arcadeBlack-500 dark:text-arcadeWhite-300
						hover:bg-arcadeBlack-100 dark:hover:bg-arcadeBlack-600"
					aria-label={$theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
				>
					<div class="flex items-center space-x-3">
						{#if $theme === 'dark'}
							<Sun class="w-4 h-4" />
							<span>Light Mode</span>
						{:else}
							<Moon class="w-4 h-4" />
							<span>Dark Mode</span>
						{/if}
					</div>
					<svg
						class="w-3 h-3 text-arcadeBlack-400 dark:text-arcadeWhite-300"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5l5 5-5 5"
						/>
					</svg>
				</button>
			</div>
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
</style>

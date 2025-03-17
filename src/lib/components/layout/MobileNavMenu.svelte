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

	// Toggle menu function with scroll position preservation
	function toggleMenu(event?: Event) {
		if (event) {
			event.preventDefault();
		}

		if (!isOpen && browser) {
			// Save scroll position before opening menu
			scrollPosition = window.scrollY;
		}

		isOpen = !isOpen;
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
		const isHashLink = target.startsWith('#');
		const sectionId = isHashLink ? target.substring(1) : '';

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
			if (!section) return;

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
				history.pushState(null, null, `${base}/#${sectionId}`);
			}

			// Smooth scroll
			window.scrollTo({
				top,
				behavior: 'smooth'
			});
		} else {
			// We're on a different page - navigate to homepage with hash
			window.location.href = `${base}/#${sectionId}`;
		}
	}

	// Improved close menu function
	function closeMenu() {
		if (isOpen) {
			isOpen = false;

			// Wait a tick to ensure DOM updates
			tick().then(() => {
				if (browser) {
					// Remove the menu-open class first
					document.body.classList.remove('menu-open');

					// Restore previous scroll position
					window.scrollTo(0, scrollPosition);
				}
			});
		}
	}

	// Update current path when page changes
	$: if (browser && $page) {
		currentPath = $page.url.pathname;
	}

	// Improved body scroll lock with position preservation
	$: if (browser) {
		if (isOpen) {
			// Save current scroll position
			scrollPosition = window.scrollY;

			// Apply fixed positioning to body at the current scroll position
			document.body.style.top = `-${scrollPosition}px`;
			document.body.classList.add('menu-open');
		} else {
			document.body.classList.remove('menu-open');
			document.body.style.top = '';
		}
	}

	// Clean up on component destroy
	onDestroy(() => {
		if (browser) {
			document.body.classList.remove('menu-open');
			document.body.style.top = '';
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
	<!-- Fixed overlay for when menu is open -->
	<div
		class="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
		on:click={closeMenu}
		on:keydown={(e) => e.key === 'Enter' && closeMenu()}
		transition:fade={{ duration: 200 }}
		role="presentation"
	>
		<!-- Menu Panel -->
		<div
			id="mobile-menu"
			class="fixed inset-y-0 right-0 z-40 w-full max-w-xs
			bg-[var(--light-mode-bg)] dark:bg-[var(--dark-mode-bg)]
			shadow-xl flex flex-col overflow-y-auto
			transform will-change-transform"
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
		&::-webkit-scrollbar {
			display: none;
		}

		/* Enable hardware acceleration for smoother animations */
		transform: translateZ(0);
		backface-visibility: hidden;
		perspective: 1000px;
	}

	/* Improve body scroll locking for menu open */
	:global(body.menu-open) {
		overflow: hidden;
		position: fixed;
		width: 100%;
		height: 100%;
	}
</style>

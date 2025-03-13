<!-- src/lib/components/layout/MobileNavMenu.svelte -->
<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { cubicInOut } from 'svelte/easing';
	import { Sun, Moon } from 'svelte-bootstrap-icons';
	import { theme } from '$lib/stores/theme';
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { writable } from 'svelte/store';

	export let isOpen = false;

	// Active navigation item tracking
	const activeNavItem = writable('/');
	let currentPath = '/';

	// Navigation items
	const menuItems = [
		{ label: 'Home', href: '/' },
		{ label: 'Work', href: '/#work' },
		{ label: 'About', href: '/#about' },
		{ label: 'Contact', href: '/#contact' },
		{ label: 'Blog', href: '/blog' }
	];

	// Toggle menu function
	function toggleMenu() {
		isOpen = !isOpen;
	}

	// Close menu when escape key is pressed
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && isOpen) {
			isOpen = false;
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

	// Smooth scroll function
	function smoothScroll(target: string, e: MouseEvent) {
		e.preventDefault();

		if (!browser) return;

		const isSamePage = window.location.pathname === '/' || currentPath === '/';

		// If linking to a different page, navigate normally
		if (!isSamePage && !target.startsWith('/#')) {
			window.location.href = target;
			closeMenu();
			return;
		}

		// Handle hash navigation
		if (target.includes('#')) {
			const hash = target.split('#')[1];
			const element = document.getElementById(hash);

			if (element) {
				// If we're not on the homepage, navigate to homepage first
				if (window.location.pathname !== '/' && !isSamePage) {
					window.location.href = target;
					closeMenu();
					return;
				}

				// Set active nav item
				activeNavItem.set(target);

				// Get navbar height for offset
				const navbarHeight =
					document.documentElement.style.getPropertyValue('--navbar-height') || '64px';
				const offset = parseInt(navbarHeight, 10);

				// Calculate position
				const top = element.getBoundingClientRect().top + window.scrollY - offset;

				// Smooth scroll
				window.scrollTo({
					top,
					behavior: 'smooth'
				});

				// Update URL hash without scroll
				if (history.pushState) {
					history.pushState(null, null, `#${hash}`);
				} else {
					window.location.hash = hash;
				}

				closeMenu();
				return;
			}
		}

		// Regular navigation
		window.location.href = target;
		closeMenu();
	}

	// Close menu function
	function closeMenu() {
		isOpen = false;
	}

	// Update current path when page changes
	$: if (browser && $page) {
		currentPath = $page.url.pathname;

		// Check if current route matches any menu item
		const matchingItem = menuItems.find((item) => {
			if (item.href === '/') {
				return currentPath === '/';
			} else if (item.href.startsWith('/#')) {
				return currentPath === '/' && window.location.hash === item.href.substring(1);
			} else {
				return currentPath === item.href;
			}
		});

		if (matchingItem) {
			activeNavItem.set(matchingItem.href);
		}
	}

	// Lock body scroll when menu is open
	$: if (browser) {
		if (isOpen) {
			document.body.classList.add('menu-open');
		} else {
			document.body.classList.remove('menu-open');
		}
	}

	// Clean up on component destroy
	onDestroy(() => {
		if (browser) {
			document.body.classList.remove('menu-open');
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

			<!-- Navigation Links -->
			<nav class="flex-1 px-6 py-2">
				<div class="space-y-5">
					{#each menuItems as item, index}
						<a
							href={item.href}
							class="block text-base
								text-arcadeBlack-500 dark:text-arcadeWhite-300
								hover:text-arcadeNeonGreen-500 dark:hover:text-arcadeNeonGreen-500
								{$activeNavItem === item.href ? 'text-arcadeNeonGreen-500' : ''}"
							on:click={(e) => smoothScroll(item.href, e)}
						>
							{item.label}
						</a>
					{/each}
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

	/* Prevent body scroll when menu is open */
	:global(body.menu-open) {
		overflow: hidden;
		position: fixed;
		width: 100%;
		height: 100%;
	}
</style>

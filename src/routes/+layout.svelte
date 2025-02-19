<!-- +layout.svelte -->
<script lang="ts">
	import '../app.css';
	import { Navbar, NavBrand, Drawer, Button, CloseButton } from 'flowbite-svelte';
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { loadingStore } from '$lib/stores/loading';
	import logo from '$lib/assets/images/logo-black.svg';
	import { sineIn } from 'svelte/easing';
	import { Sun, Moon } from 'svelte-bootstrap-icons';
	import LoadingScreen from '$lib/components/LoadingScreen.svelte';
	import { theme } from '$lib/stores/theme';
	import Tooltip from '$lib/components/Tooltip.svelte';
	import { browser } from '$app/environment';
	import { writable } from 'svelte/store';
	import { layoutStore } from '$lib/stores/store';
	import MobileNavMenu from '$lib/components/MobileNavMenu.svelte';

	// Use ResizeObserver instead of window resize event
	let resizeObserver: ResizeObserver;
	let navbarElement: HTMLElement;
	let contentWrapper: HTMLElement;
	let isMenuOpen = false;
	let hidden = true;

	// Create stores with initial values
	export const navbarHeight = writable(0);
	const activeNavItem = writable('/');

	// Memoize transition parameters
	const transitionParamsRight = {
		x: 320,
		duration: 200,
		easing: sineIn
	};

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

	// Simplified nav link click handler
	function handleNavLinkClick(path: string) {
		activeNavItem.set(path);
	}

	function toggleDrawer() {
		hidden = !hidden;
	}

	// Initialization and cleanup logic
	onMount(() => {
		// Theme initialization
		const savedTheme = localStorage.getItem('theme') || 'dark';
		theme.set(savedTheme);
		document.documentElement.classList.add(savedTheme);

		// Initialize ResizeObserver
		if (navbarElement) {
			resizeObserver = new ResizeObserver(updateNavHeight);
			resizeObserver.observe(navbarElement);
		}

		// Loading screen handling
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
	});

	onDestroy(() => {
		if (resizeObserver) {
			resizeObserver.disconnect();
		}
	});
</script>

<!-- Template section -->
<svelte:head>
	<meta
		name="viewport"
		content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
	/>
	<link
		href="https://fonts.googleapis.com/css2?family=Gruppo&family=Press+Start+2P&family=Pixelify+Sans:wght@400;500;600;700&family=VT323&family=Roboto:wght@100;900&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<LoadingScreen />

<nav
	bind:this={navbarElement}
	class="sticky relative md:border-b-[2.5px] md:border-arcadeBlack-200 md:dark:border-arcadeBlack-600 top-0 z-[101] {$theme ===
	'dark'
		? 'navbar-background-dark'
		: 'navbar-background-light'} p-container-padding box-border md:shadow-header"
>
	<Navbar class="container max-w-screen-xl mx-auto px-4 flex justify-between items-center">
		<NavBrand href="/">
			<img src={logo} alt="Jo Pearson Logo" class="h-9 w-9 mr-[8px] pt-1 header-logo-pulse" />
			<span
				class="hidden lg:inline-block text-[16px] header-text text-[color:var(--arcade-black-500)] dark:text-[color:var(--arcade-white-300)] uppercase tracking-[24.96px] mt-[5px]"
			>
				Jo Pearson
			</span>
		</NavBrand>

		<div class="flex md:order-2 items-center gap-4">
			<Tooltip
				text={$theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
				position="bottom"
			>
				<button
					on:click={toggleTheme}
					class="md:flex items-center justify-center w-10 h-10 rounded-full bg-opacity-20 hover:bg-opacity-30 transition-all duration-300 ease-in dark:text-[var(--arcade-white-300)] text-[var(--arcade-black-500)]"
					aria-label="Toggle Dark Mode"
				>
					{#if $theme === 'dark'}
						<Sun size={20} />
					{:else}
						<Moon size={20} />
					{/if}
				</button>
			</Tooltip>

			<div class="lg:hidden">
				<MobileNavMenu bind:isOpen={isMenuOpen} />
			</div>
		</div>

		<!-- Navigation Links -->
		<div class="lg:flex lg:flex-wrap lg:order-1 hidden">
			{#each ['/', '/#work', '/#about', '/#contact', '/blog'] as path}
				<a
					href={path}
					class="nav-button"
					class:active={$activeNavItem === path}
					on:click={() => handleNavLinkClick(path)}
				>
					{path === '/'
						? 'Home'
						: path.replace(/\/$/, '').slice(2).charAt(0).toUpperCase() +
							path.replace(/\/$/, '').slice(3)}
				</a>
			{/each}
		</div>
	</Navbar>
</nav>

<!-- Mobile Drawer -->
<Drawer
	placement="right"
	transitionType="fly"
	transitionParams={transitionParamsRight}
	bind:hidden
	id="sidebar"
	class="{$theme === 'dark' ? 'navbar-background-dark' : 'navbar-background-light'} p-4"
>
	<div class="flex items-center justify-between">
		<h5
			id="drawer-label"
			class="inline-flex items-center mb-4 text-base font-semibold text-gray-500 dark:text-gray-400"
		>
			Navigation Menu
		</h5>
		<CloseButton on:click={toggleDrawer} class="mb-4 text-[color:var(--arcade-white-300)]" />
	</div>

	<div class="nav-button-group-mobile">
		{#each ['/', '/#work', '/#about', '/#contact', '/blog'] as path}
			<a
				href={path}
				class="nav-button-mobile"
				class:active={$activeNavItem === path}
				on:click={() => {
					handleNavLinkClick(path);
					toggleDrawer();
				}}
			>
				{path === '/' ? 'Home' : path.slice(2).charAt(0).toUpperCase() + path.slice(3)}
			</a>
		{/each}

		<button
			on:click={toggleTheme}
			class="nav-button-mobile flex items-center"
			aria-label="Toggle Dark Mode"
		>
			{#if $theme === 'dark'}
				<Sun class="mr-2" />
			{:else}
				<Moon class="mr-2" />
			{/if}
			Theme
		</button>
	</div>
</Drawer>

<main bind:this={contentWrapper} class="content-wrapper">
	<slot />
</main>

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

	.header-logo-pulse {
		animation: headerPulse 3s ease-in-out infinite;
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
</style>

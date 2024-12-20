<!-- +layout.svelte  -->
<script lang="ts">
	import '../app.css';
	import { Navbar, NavBrand, Drawer, Button, CloseButton } from 'flowbite-svelte';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { loadingStore } from '$lib/stores/loading';
	import logo from '$lib/assets/images/logo-black.svg';
	import { sineIn } from 'svelte/easing';
	import { Sun, Moon } from 'svelte-bootstrap-icons';
	import LoadingScreen from '$lib/components/LoadingScreen.svelte';
	import { theme, initializeTheme } from '$lib/stores/theme';
	import Tooltip from '$lib/components/Tooltip.svelte';
	import { browser } from '$app/environment';
	import { writable } from 'svelte/store';
	import { layoutStore } from '$lib/stores/store';
	import ArcadeNavMenu from '$lib/components/ArcadeNavMenu.svelte';

	let navbarElement: HTMLElement;

	let navHeight;

	let isMenuOpen = false;

	export const navbarHeight = writable(0);

	let activeNavItem = '/'; // Initialize with home path
	let contentWrapper: HTMLElement;

	let hidden = true;
	let transitionParamsRight = {
		x: 320,
		duration: 200,
		easing: sineIn
	};

	$: activeUrl = $page.url.pathname;

	// Define the updateNavHeight function
	function updateNavHeight() {
		if (navbarElement) {
			const height = navbarElement.offsetHeight;
			navbarHeight.set(height);
			layoutStore.setNavbarHeight(height); // Ensure layoutStore is updated too
		}
	}

	function toggleTheme() {
		theme.update((currentTheme) => {
			const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
			// Add a transition class to handle all color changes
			document.documentElement.classList.add('theme-transition');

			if (newTheme === 'dark') {
				document.documentElement.classList.add('dark');
				document.documentElement.classList.remove('light');
			} else {
				document.documentElement.classList.add('light');
				document.documentElement.classList.remove('dark');
			}

			// Remove the transition class after the transition is complete
			setTimeout(() => {
				document.documentElement.classList.remove('theme-transition');
			}, 300); // Match this with your transition duration

			localStorage.setItem('theme', newTheme);
			return newTheme;
		});
	}

	function handleNavLinkClick(event: MouseEvent, path: string) {
		const buttons = document.querySelectorAll('.nav-button');
		buttons.forEach((button) => button.classList.remove('active'));
		activeNavItem = path;
	}

	function toggleDrawer() {
		hidden = !hidden;
		console.log('Drawer toggled, hidden:', hidden);
	}

	onMount(() => {
		// Set the theme based on saved preference or default to 'dark'
		const savedTheme = localStorage.getItem('theme') || 'dark';
		theme.set(savedTheme);
		document.documentElement.classList.add(savedTheme);
		if (savedTheme === 'dark') {
			document.documentElement.classList.remove('light');
		} else {
			document.documentElement.classList.remove('dark');
		}

		// Handle loading screen
		const handleLoading = () => {
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
				setTimeout(() => {
					loadingStore.set(false);
				}, 1500); // Adjust the delay as needed
			});
		};

		handleLoading();

		// Update navbar height if the navbar element exists
		if (navbarElement) {
			updateNavHeight();
		}

		// Add resize listener to update navbar height dynamically
		window.addEventListener('resize', updateNavHeight);

		// Cleanup on component unmount
		return () => {
			window.removeEventListener('resize', updateNavHeight);
		};
	});

	$: if (browser && $layoutStore.navbarHeight > 0) {
		document.documentElement.style.setProperty('--navbar-height', `${$layoutStore.navbarHeight}px`);
	}
</script>

<svelte:head>
	<meta
		name="viewport"
		content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
	/>

	<link href="https://fonts.googleapis.com/css2?family=Gruppo&display=swap" rel="stylesheet" />
	<link
		href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
		rel="stylesheet"
	/>
	<link
		href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400;500;600;700&family=VT323&display=swap"
		rel="stylesheet"
	/>
	<link
		href="https://fonts.googleapis.com/css2?family=Roboto:wght@100;900&display=swap"
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
			</span></NavBrand
		>
		<div class="flex md:order-2 items-center gap-4">
			<!-- Theme toggle button for desktop -->
			<Tooltip
				text={$theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
				position="bottom"
			>
				<button
					on:click={toggleTheme}
					class=" md:flex items-center justify-center w-10 h-10 rounded-full bg-opacity-20 hover:bg-opacity-30 transition-all duration-300 ease-in dark:text-[var(--arcade-white-300)] text-[var(--arcade-black-500)]"
					aria-label="Toggle Dark Mode"
				>
					{#if $theme === 'dark'}
						<Sun size={20} />
					{:else}
						<Moon size={20} />
					{/if}
				</button>
			</Tooltip>

			<!-- Mobile menu button -->
			<div class="lg:hidden">
				<ArcadeNavMenu bind:isOpen={isMenuOpen} />
			</div>
		</div>

		<div class="lg:flex lg:flex-wrap lg:order-1 hidden">
			<a
				href="/"
				class:nav-button={true}
				class:active={activeNavItem === '/'}
				on:click={(e) => handleNavLinkClick(e, '/')}
			>
				Home
			</a>
			<a
				href="/#work"
				class:nav-button={true}
				class:active={activeNavItem === '/#work'}
				on:click={(e) => handleNavLinkClick(e, '/#work')}
			>
				Work
			</a>
			<a
				href="/#about"
				class:nav-button={true}
				class:active={activeNavItem === '/#about'}
				on:click={(e) => handleNavLinkClick(e, '/#about')}
			>
				About
			</a>
			<a
				href="/#contact"
				class:nav-button={true}
				class:active={activeNavItem === '/#contact'}
				on:click={(e) => handleNavLinkClick(e, '/#contact')}
			>
				Contact
			</a>
			<a
				href="/blog"
				class:nav-button={true}
				class:active={activeNavItem === '/#blog'}
				on:click={(e) => handleNavLinkClick(e, '/#blog')}
			>
				Blog
			</a>
		</div>
	</Navbar>
</nav>

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
		<CloseButton
			on:click={toggleDrawer}
			on:keydown={(e) => e.key === 'Enter' && toggleDrawer()}
			class="mb-4 text-[color:var(--arcade-white-300)]"
		/>
	</div>
	<div class="nav-button-group-mobile">
		<a
			href="/"
			class="nav-button-mobile"
			class:active={activeNavItem === '/'}
			on:click={(e) => {
				handleNavLinkClick(e, '/');
				toggleDrawer();
			}}
		>
			Home
		</a>
		<a
			href="/#work"
			class="nav-button-mobile"
			class:active={activeNavItem === '/#work'}
			on:click={(e) => {
				handleNavLinkClick(e, '/#work');
				toggleDrawer();
			}}
		>
			Work
		</a>
		<a
			href="/#about"
			class="nav-button-mobile"
			class:active={activeNavItem === '/#about'}
			on:click={(e) => {
				handleNavLinkClick(e, '/#about');
				toggleDrawer();
			}}
		>
			About
		</a>
		<a
			href="/#contact"
			class="nav-button-mobile"
			class:active={activeNavItem === '/#contact'}
			on:click={(e) => {
				handleNavLinkClick(e, '/#contact');
				toggleDrawer();
			}}
		>
			Contact
		</a>
		<a
			href="/#blog"
			class="nav-button-mobile"
			class:active={activeNavItem === '/#blog'}
			on:click={(e) => {
				handleNavLinkClick(e, '/#blog');
				toggleDrawer();
			}}
		>
			Blog
		</a>
		<button
			on:click={() => {
				toggleTheme();
			}}
			on:keydown={(e) => e.key === 'Enter' && toggleTheme()}
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
		.navbar-background-dark {
			@apply overflow-hidden bg-transparent;
		}

		.navbar-background-light {
			@apply overflow-hidden bg-transparent;
		}
	}

	/* Desktop styles */
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
</style>

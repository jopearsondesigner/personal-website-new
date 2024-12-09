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

	let activeNavItem = '/'; // Initialize with home path
	let contentWrapper: HTMLElement;

	let hidden = true;
	let transitionParamsRight = {
		x: 320,
		duration: 200,
		easing: sineIn
	};

	$: activeUrl = $page.url.pathname;

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
		const savedTheme = localStorage.getItem('theme') || 'dark';
		theme.set(savedTheme);
		document.documentElement.classList.add(savedTheme);
		if (savedTheme === 'dark') {
			document.documentElement.classList.remove('light');
		} else {
			document.documentElement.classList.remove('dark');
		}

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
				}, 1500);
			});
		};

		handleLoading();
	});
</script>

<svelte:head>
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
	class="sticky relative border-b-[2.5px] border-arcadeBlack-200 dark:border-arcadeBlack-600 top-0 shadow-header z-50 {$theme ===
	'dark'
		? 'navbar-background-dark'
		: 'navbar-background-light'} p-container-padding box-border"
>
	<Navbar class="container max-w-screen-xl mx-auto px-4 flex justify-between items-center">
		<NavBrand href="/">
			<img src={logo} alt="Jo Pearson Logo" class="h-11 w-11 mr-[2px] pt-1 header-logo-pulse" />
			<span
				class="hidden md:inline-block text-[20px] header-text text-[color:var(--arcade-black-500)] dark:text-[color:var(--arcade-white-300)] uppercase tracking-[21.96px] mt-[5px]"
			>
				Jo Pearson
			</span>
		</NavBrand>
		<div class="flex md:order-2 items-center gap-4">
			<!-- Theme toggle button for desktop -->
			<Tooltip
				text={$theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
				position="bottom"
			>
				<button
					on:click={toggleTheme}
					class="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-opacity-20 hover:bg-opacity-30 transition-all duration-300 ease-in dark:text-[var(--arcade-white-300)] text-[var(--arcade-black-500)]"
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
			<button
				on:click={toggleDrawer}
				class="focus:outline-none whitespace-normal m-0.5 rounded-lg focus:ring-2 p-1.5 focus:ring-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 md:hidden"
			>
				<svg
					class="w-6 h-6"
					fill="currentColor"
					viewBox="0 0 20 20"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						fill-rule="evenodd"
						d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
						clip-rule="evenodd"
					></path>
				</svg>
			</button>
		</div>

		<div class="md:flex md:flex-wrap md:order-1 hidden">
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
				href="/#blog"
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
	<div class="flex items-center">
		<h5
			id="drawer-label"
			class="inline-flex items-center mb-4 text-base font-semibold text-gray-500 dark:text-gray-400"
		></h5>
		<CloseButton on:click={toggleDrawer} class="mb-4 text-[color:var(--arcade-white-300)]" />
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
				toggleDrawer();
			}}
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
	.nav-link {
		position: relative;
		overflow: hidden;
	}

	.nav-link::after {
		content: '';
		position: absolute;
		bottom: 0;
		left: 50%;
		width: 0;
		height: 2px;
		background: var(--arcade-neon-green-500);
		transition: all 0.3s ease;
		transform: translateX(-50%);
	}

	.nav-link:hover::after {
		width: 100%;
	}

	@media (max-width: 768px) {
		.nav-link {
			padding: 0.5rem 1rem;
			width: 100%;
			text-align: center;
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

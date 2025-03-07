<!-- File: src/lib/components/MobileNavMenu.svelte -->
<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { cubicInOut } from 'svelte/easing';
	import { Sun, Moon } from 'svelte-bootstrap-icons';
	import { theme } from '$lib/stores/theme';
	import { onMount, onDestroy } from 'svelte';

	export let isOpen = false;

	const menuItems = [
		{ label: 'Home', href: '/' },
		{ label: 'Work', href: '/#work' },
		{ label: 'About', href: '/#about' },
		{ label: 'Contact', href: '/#contact' },
		{ label: 'Blog', href: '/blog' }
	];

	function toggleMenu() {
		isOpen = !isOpen;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && isOpen) {
			isOpen = false;
		}
	}

	function toggleTheme() {
		theme.update((currentTheme) => {
			const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
			document.documentElement.classList.toggle('dark', newTheme === 'dark');
			document.documentElement.classList.toggle('light', newTheme === 'light');
			localStorage.setItem('theme', newTheme);
			return newTheme;
		});
	}

	function closeMenu() {
		isOpen = false;
	}

	// Lock body scroll when menu is open
	$: if (typeof document !== 'undefined') {
		if (isOpen) {
			document.body.classList.add('menu-open');
		} else {
			document.body.classList.remove('menu-open');
		}
	}

	// Clean up on component destroy
	onDestroy(() => {
		if (typeof document !== 'undefined') {
			document.body.classList.remove('menu-open');
		}
	});
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- Hamburger Button (only shown when menu is closed) -->
{#if !isOpen}
	<button
		on:click={toggleMenu}
		class="relative z-50 p-2 rounded-full
			text-arcadeBlack-500 dark:text-arcadeWhite-300
			hover:bg-arcadeBlack-100/50 dark:hover:bg-arcadeBlack-700/50"
		aria-label="Open Menu"
		aria-expanded="false"
		aria-controls="mobile-menu"
	>
		<div class="w-6 h-6 flex items-center justify-center">
			<div class="relative w-5 h-4">
				<span class="absolute w-full h-0.5 bg-current top-0"></span>
				<span class="absolute w-full h-0.5 bg-current top-1.5"></span>
				<span class="absolute w-full h-0.5 bg-current top-3"></span>
			</div>
		</div>
	</button>
{/if}

{#if isOpen}
	<!-- Backdrop -->
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
			class="fixed inset-y-0 right-0 z-50 w-full max-w-xs
				bg-[var(--light-mode-bg)] dark:bg-[var(--dark-mode-bg)]
				shadow-xl flex flex-col overflow-y-auto"
			transition:fly={{ x: 300, duration: 300, easing: cubicInOut }}
			on:click|stopPropagation
		>
			<!-- Top area with close button (no header label) -->
			<div class="px-4 py-4 flex justify-end">
				<button
					on:click={closeMenu}
					class="p-2 rounded-full
						hover:bg-arcadeBlack-100 dark:hover:bg-arcadeBlack-600
						text-arcadeBlack-500 dark:text-arcadeWhite-300"
					aria-label="Close menu"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>

			<!-- Navigation Links -->
			<nav class="flex-1 px-6 py-2">
				<div class="space-y-5">
					{#each menuItems as item, index}
						<a
							href={item.href}
							class="block text-base
								text-arcadeBlack-500 dark:text-arcadeWhite-300
								hover:text-arcadeNeonGreen-500 dark:hover:text-arcadeNeonGreen-500"
							on:click={closeMenu}
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
							<span>{$theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
						{:else}
							<Moon class="w-4 h-4" />
							<span>{$theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
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

	/* Smooth scrolling for menu panel */
	div {
		scrollbar-width: none;
		-ms-overflow-style: none;
		&::-webkit-scrollbar {
			display: none;
		}
	}

	/* Prevent body scroll when menu is open */
	:global(body.menu-open) {
		overflow: hidden;
		position: fixed;
		width: 100%;
		height: 100%;
	}
</style>

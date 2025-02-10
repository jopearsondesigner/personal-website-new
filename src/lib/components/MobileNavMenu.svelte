<!-- File: src/lib/components/MobileNavMenu.svelte -->
<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { cubicInOut } from 'svelte/easing';
	import { Sun, Moon } from 'svelte-bootstrap-icons';
	import { theme } from '$lib/stores/theme';

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
			localStorage.setItem('theme', newTheme);
			return newTheme;
		});
	}

	function closeMenu() {
		isOpen = false;
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- Hamburger Button -->
<button
	on:click={toggleMenu}
	class="relative z-50 p-2 rounded-full transition-colors duration-200
           text-arcadeBlack-500 dark:text-arcadeWhite-300
           hover:bg-arcadeBlack-100/50 dark:hover:bg-arcadeBlack-700/50"
	aria-label="Toggle Menu"
	aria-expanded={isOpen}
>
	<div class="w-6 h-6 flex items-center justify-center">
		<div class="relative w-5 h-4">
			<span
				class="absolute w-full h-0.5 bg-current transform transition-all duration-200
                       {isOpen ? 'rotate-45 top-1.5' : 'rotate-0 top-0'}"
			></span>
			<span
				class="absolute w-full h-0.5 bg-current top-1.5 transition-opacity duration-200
                       {isOpen ? 'opacity-0' : 'opacity-100'}"
			></span>
			<span
				class="absolute w-full h-0.5 bg-current transform transition-all duration-200
                       {isOpen ? '-rotate-45 top-1.5' : 'rotate-0 top-3'}"
			></span>
		</div>
	</div>
</button>

{#if isOpen}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
		on:click={closeMenu}
		on:keydown={(e) => e.key === 'Enter' && closeMenu()}
		transition:fade={{ duration: 200 }}
		role="presentation"
	>
		<!-- Menu Panel -->
		<div
			class="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white/95 dark:bg-arcadeBlack-900/95
                   shadow-2xl flex flex-col overflow-y-auto"
			transition:fly={{ x: 300, duration: 300, easing: cubicInOut }}
			on:click|stopPropagation
		>
			<!-- Header -->
			<div
				class="sticky top-0 px-6 py-4 border-b border-arcadeBlack-200/10
                       dark:border-arcadeWhite-300/10 backdrop-blur-sm
                       bg-white/80 dark:bg-arcadeBlack-900/80
                       flex items-center justify-between"
			>
				<h2 class="text-lg font-medium text-arcadeBlack-800 dark:text-arcadeWhite-300">
					Navigation
				</h2>
				<button
					on:click={closeMenu}
					class="p-2 rounded-full hover:bg-arcadeBlack-100/50
                           dark:hover:bg-arcadeBlack-700/50 transition-colors duration-200"
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
			<nav class="flex-1 px-6 py-8">
				<div class="space-y-6">
					{#each menuItems as item, index}
						<a
							href={item.href}
							class="group block text-xl font-medium transform transition-all duration-200
							   text-arcadeBlack-700 dark:text-arcadeWhite-300
							   hover:text-arcadeNeonGreen-500 dark:hover:text-arcadeNeonGreen-500"
							style="transition-delay: {100 + index * 50}ms"
							on:click={closeMenu}
							transition:fly={{ x: 30, duration: 200, delay: 100 + index * 50 }}
						>
							<div class="flex items-center space-x-2">
								<span
									class="transform transition-transform duration-200
									   group-hover:translate-x-2"
								>
									{item.label}
								</span>
								<svg
									class="w-4 h-4 opacity-0 -translate-x-2 transition-all duration-200
									   group-hover:opacity-100 group-hover:translate-x-0"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 5l7 7-7 7"
									/>
								</svg>
							</div>
						</a>
					{/each}
				</div>
			</nav>

			<!-- Footer -->
			<div
				class="sticky bottom-0 px-6 py-4 border-t border-arcadeBlack-200/10
                       dark:border-arcadeWhite-300/10 backdrop-blur-sm
                       bg-white/80 dark:bg-arcadeBlack-900/80"
			>
				<button
					on:click={toggleTheme}
					class="flex items-center justify-between w-full p-3 rounded-lg
                           text-arcadeBlack-700 dark:text-arcadeWhite-300
                           hover:bg-arcadeBlack-100/50 dark:hover:bg-arcadeWhite-300/5
                           transition-colors duration-200"
				>
					<div class="flex items-center space-x-3">
						{#if $theme === 'dark'}
							<Sun class="w-5 h-5" />
							<span>Light Mode</span>
						{:else}
							<Moon class="w-5 h-5" />
							<span>Dark Mode</span>
						{/if}
					</div>
					<svg
						class="w-4 h-4 text-arcadeBlack-400 dark:text-arcadeWhite-500"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 9l-7 7-7-7"
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
	}

	/* Optional: Add subtle hover animation for menu items */
	a {
		position: relative;
	}

	a::after {
		content: '';
		position: absolute;
		bottom: -2px;
		left: 0;
		width: 0;
		height: 1px;
		background-color: theme(colors.arcadeNeonGreen.500);
		transition: width 0.2s ease;
	}

	a:hover::after {
		width: 100%;
	}

	/* Ensure smooth animations */
	* {
		backface-visibility: hidden;
		-webkit-backface-visibility: hidden;
	}
</style>

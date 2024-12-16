<!-- ArcadeNavMenu.svelte -->
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
		{ label: 'Blog', href: '/#blog' }
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
	class="relative z-50 p-2 text-arcadeBlack-500 dark:text-arcadeWhite-300 focus:outline-none
           hover:bg-arcadeBlack-100 dark:hover:bg-arcadeBlack-700 rounded-lg transition-colors"
	aria-label="Toggle Menu"
	aria-expanded={isOpen}
>
	<svg
		class="w-6 h-6 transition-transform duration-300 {isOpen ? 'rotate-90' : ''}"
		fill="none"
		stroke="currentColor"
		viewBox="0 0 24 24"
	>
		{#if isOpen}
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M6 18L18 6M6 6l12 12"
			/>
		{:else}
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M4 6h16M4 12h16M4 18h16"
			/>
		{/if}
	</svg>
</button>

{#if isOpen}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-40 backdrop-blur-sm bg-arcadeBlack-500/50"
		on:click={closeMenu}
		transition:fade={{ duration: 200 }}
	>
		<!-- Menu Panel -->
		<div
			class="absolute inset-y-0 right-0 w-full max-w-sm bg-gradient-to-bl from-arcadeBlack-600/95
               to-arcadeBlack-800/95 dark:from-arcadeBlack-800/95 dark:to-arcadeBlack-900/95 p-6
               flex flex-col justify-center shadow-xl"
			transition:fly={{ x: 300, duration: 300, easing: cubicInOut }}
			on:click|stopPropagation
		>
			<!-- Navigation Links -->
			<nav class="space-y-6">
				{#each menuItems as item, index}
					<a
						href={item.href}
						class="block text-2xl font-bold text-arcadeWhite-300 transform transition-all
                     duration-300 hover:text-arcadeNeonGreen-500 hover:translate-x-2
                     arcade-glow"
						style="transition-delay: {150 + index * 75}ms"
						on:click={closeMenu}
						transition:fly={{ x: 50, duration: 300, delay: 100 + index * 75 }}
					>
						{item.label}
					</a>
				{/each}
			</nav>

			<!-- Theme Toggle -->
			<button
				on:click={toggleTheme}
				class="mt-12 flex items-center space-x-3 text-arcadeWhite-300
                 hover:text-arcadeNeonGreen-500 transition-colors duration-300"
			>
				{#if $theme === 'dark'}
					<Sun class="w-5 h-5" />
				{:else}
					<Moon class="w-5 h-5" />
				{/if}
				<span class="text-lg">Toggle Theme</span>
			</button>

			<!-- Decorative Elements -->
			<div class="absolute bottom-8 left-6 right-6">
				<div
					class="h-px bg-gradient-to-r from-transparent via-arcadeNeonGreen-500/50 to-transparent"
				/>
				<div class="mt-4 text-sm text-arcadeWhite-300/60 text-center">Press ESC to close</div>
			</div>
		</div>
	</div>
{/if}

<style lang="postcss">
	.arcade-glow {
		text-shadow: 0 0 8px theme(colors.arcadeNeonGreen.500 / 50%);
	}

	/* Optional: Add a pulsing animation to the theme toggle */
	button :global(svg) {
		animation: pulse 3s infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.7;
		}
	}
</style>

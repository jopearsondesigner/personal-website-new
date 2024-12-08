<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';

	const dispatch = createEventDispatcher();

	let selectedIndex = 0;
	let isMenuOpen = false;
	let isMobile = false;
	let menuRef: HTMLElement;
	let currentScreen = 'main';

	const menuItems = [
		{ label: 'Main Menu', action: () => handleScreenChange('main') },
		{ label: 'Play Guardians of Lumara', action: () => handleScreenChange('game') }
	];

	function handleScreenChange(screen: string) {
		currentScreen = screen;
		dispatch('changeScreen', screen);
		// Keep menu functional after screen change
		if (menuRef) {
			setTimeout(() => {
				menuRef.focus();
			}, 50);
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		// Only handle keyboard events if menu is visible
		if (isMobile && !isMenuOpen) return;

		if (event.key === 'ArrowUp') {
			event.preventDefault();
			selectedIndex = (selectedIndex - 1 + menuItems.length) % menuItems.length;
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			selectedIndex = (selectedIndex + 1) % menuItems.length;
		} else if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			menuItems[selectedIndex].action();
		}
	}

	function toggleMenu() {
		isMenuOpen = !isMenuOpen;

		if (isMenuOpen && menuRef) {
			setTimeout(() => {
				menuRef.focus();
			}, 50);
		}
	}

	function handleMenuItemClick(index: number) {
		selectedIndex = index;
		menuItems[index].action();

		if (isMobile) {
			toggleMenu();
		}
	}

	function handleClickOutside(event: MouseEvent) {
		if (isMobile && isMenuOpen && menuRef && !menuRef.contains(event.target as Node)) {
			toggleMenu();
		}
	}

	onMount(() => {
		const mediaQuery = window.matchMedia('(max-width: 768px)');
		isMobile = mediaQuery.matches;

		const handleResize = (e: MediaQueryListEvent) => {
			isMobile = e.matches;
		};

		mediaQuery.addListener(handleResize);

		// Add event listeners to document instead of component
		document.addEventListener('click', handleClickOutside);
		document.addEventListener('keydown', handleKeydown);

		// Set initial focus
		if (menuRef) {
			menuRef.focus();
		}

		return () => {
			mediaQuery.removeListener(handleResize);
			document.removeEventListener('click', handleClickOutside);
			document.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

<nav class="arcade-navigation" class:mobile={isMobile} aria-label="Game navigation">
	{#if isMobile}
		<button
			class="menu-button pixel-art"
			on:click|stopPropagation={toggleMenu}
			aria-expanded={isMenuOpen}
			aria-controls="menu-container"
		>
			MENU
		</button>
	{/if}
	<div
		id="menu-container"
		class="menu-container pixel-art"
		class:hidden={isMobile && !isMenuOpen}
		tabindex="0"
		bind:this={menuRef}
		role="menu"
		aria-label="Game navigation"
	>
		{#if isMobile}
			<button class="close-button" on:click|stopPropagation={toggleMenu} aria-label="Close menu">
				X
			</button>
		{/if}
		{#each menuItems as item, index}
			<button
				class="menu-item"
				class:selected={selectedIndex === index}
				on:click|stopPropagation={() => handleMenuItemClick(index)}
				role="menuitem"
				aria-current={selectedIndex === index}
				data-screen={item.label.toLowerCase().replace(/\s+/g, '-')}
			>
				{#if selectedIndex === index}
					<span class="arrow" aria-hidden="true">▶</span>
				{/if}
				<span class="menu-text">{item.label}</span>
			</button>
		{/each}
	</div>
</nav>

<style lang="postcss">
	.arcade-navigation {
		position: absolute;
		top: 1rem;
		left: 1rem;
		z-index: 10;
		pointer-events: auto;
	}

	.pixel-art {
		font-family: 'Press Start 2P', cursive;
		font-size: 0.8rem;
		line-height: 1.2;
		text-transform: uppercase;
	}

	.menu-container {
		background-color: rgba(43, 43, 43, 0.7);
		border: 1px solid theme('colors.arcadeNeonGreen.500');
		padding: 0.5rem;
		border-radius: 4px;
		outline: none;
		pointer-events: auto;
	}

	.menu-container:focus {
		box-shadow: 0 0 0 2px theme('colors.arcadeNeonGreen.500');
	}

	.menu-item {
		color: theme('colors.arcadeWhite.200');
		padding: 0.5rem 0.75rem;
		cursor: pointer;
		transition: all 0.3s ease;
		text-decoration: none;
		display: flex;
		align-items: center;
		background: none;
		border: none;
		width: 100%;
		text-align: left;
		outline: none;
		pointer-events: auto;
	}

	.menu-item:focus {
		background-color: rgba(39, 255, 153, 0.1);
	}

	.menu-item:hover,
	.menu-item.selected {
		color: theme('colors.arcadeNeonGreen.500');
		background-color: rgba(39, 255, 153, 0.1);
	}

	.arrow {
		margin-right: 0.5rem;
		margin-bottom: 5px;
		animation: blink 1s infinite;
		display: inline-block;
		width: 1em;
		text-align: center;
	}

	.menu-text {
		display: inline-block;
		vertical-align: middle;
		pointer-events: auto;
	}

	@keyframes blink {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0;
		}
	}

	.mobile .menu-button {
		background-color: theme('colors.arcadeBlack.500');
		color: theme('colors.arcadeNeonGreen.500');
		border: 1px solid theme('colors.arcadeNeonGreen.500');
		padding: 0.5rem 1rem;
		border-radius: 4px;
		pointer-events: auto;
	}

	.mobile .menu-container {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		z-index: 1000;
	}

	.hidden {
		display: none;
	}

	.close-button {
		position: absolute;
		top: 1rem;
		right: 1rem;
		background-color: transparent;
		color: theme('colors.arcadeWhite.200');
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
		pointer-events: auto;
	}

	.mobile .menu-item {
		background-color: theme('colors.arcadeBlack.500');
		color: theme('colors.arcadeNeonGreen.500');
		border: 1px solid theme('colors.arcadeNeonGreen.500');
		padding: 1rem 2rem;
		margin: 0.5rem 0;
		border-radius: 4px;
		width: 80%;
		text-align: center;
		justify-content: center;
	}
</style>

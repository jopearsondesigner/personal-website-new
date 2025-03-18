<!-- ArcadeNavigation.svelte -->
<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';

	const dispatch = createEventDispatcher();

	let menuButtonRef: HTMLElement;

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

	function toggleMenu(event?: Event) {
		if (event) {
			event.stopPropagation();
		}
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
		const target = event.target as Node;

		// Check if click is on the overlay
		const overlay = document.querySelector('.overlay');
		if (overlay && overlay.contains(target)) {
			isMenuOpen = false;
			return;
		}

		if (menuButtonRef && menuButtonRef.contains(target)) {
			return;
		}

		if (menuRef && menuRef.contains(target)) {
			return;
		}

		isMenuOpen = false;
	}

	onMount(() => {
		// Move the media query logic here
		const mediaQuery = window.matchMedia('(max-width: 1024px)');
		isMobile = mediaQuery.matches;

		const handleResize = (e: MediaQueryListEvent) => {
			isMobile = e.matches;
		};

		mediaQuery.addListener(handleResize);

		// Add event listeners inside onMount
		document.addEventListener('click', handleClickOutside);
		document.addEventListener('keydown', handleKeydown);

		if (menuRef) {
			menuRef.focus();
		}

		// Clean up function
		return () => {
			mediaQuery.removeListener(handleResize);
			document.removeEventListener('click', handleClickOutside);
			document.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

<!-- Modified positioning to use root-level fixed positioning -->
<div class="arcade-navigation-container">
	<nav class="arcade-navigation" class:mobile={isMobile} aria-label="Game navigation">
		{#if isMobile}
			<button
				bind:this={menuButtonRef}
				class="menu-button pixel-art"
				on:click|preventDefault|stopPropagation={toggleMenu}
				aria-expanded={isMenuOpen}
				aria-controls="menu-container"
			>
				MENU
			</button>
		{/if}

		{#if isMobile && isMenuOpen}
			<div
				class="overlay fixed inset-0 bg-[#2b2b2b] bg-opacity-70"
				on:click|stopPropagation={() => (isMenuOpen = false)}
				aria-hidden="true"
			/>
		{/if}

		<div
			id="menu-container"
			class="menu-container pixel-art text-link"
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
						<span class="arrow" aria-hidden="true">
							<svg
								id="Layer_1"
								data-name="Layer 1"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 16.56 17.67"
							>
								<defs>
									<style>
										.cls-1 {
											fill: #c7ffdd;
											stroke: #e5e7eb;
											stroke-miterlimit: 10;
										}
									</style>
								</defs>
								<polygon class="cls-1" points=".5 .83 15.5 8.83 .5 16.83 .5 .83" />
							</svg>
						</span>
					{/if}
					<span class="menu-text">{item.label}</span>
				</button>
			{/each}
		</div>
	</nav>
</div>

<style lang="postcss">
	/* New container element to attach to root DOM */
	.arcade-navigation-container {
		/* Use fixed positioning to break out of all stacking contexts */
		position: fixed;
		/* Make sure it's attached to the body/root level */
		top: 0;
		left: 0;
		/* Ensure full viewport coverage for proper event handling */
		width: 100%;
		height: 100%;
		/* Use pointer-events: none to let clicks pass through to elements below */
		pointer-events: none;
		/* Set a very high z-index to ensure it's above everything */
		z-index: 10000;
		/* Make it impossible to interact with this container itself */
		user-select: none;
		/* Prevent any accidental rendering issues */
		background: transparent;
	}

	.overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(43, 43, 43, 0.546);
		z-index: 9998;
		/* Enable pointer events for the overlay */
		pointer-events: auto;
	}

	.hidden {
		display: none !important;
	}

	.arcade-navigation {
		position: absolute;
		top: 1.92rem;
		left: 2.12rem;
		z-index: 100;
		/* This allows the navigation itself to receive pointer events */
		pointer-events: auto;
	}

	.arcade-navigation.mobile {
		/* Positioned relative to the fixed container */
		position: absolute;
		right: auto;
		z-index: 9999;
		left: 1.47rem;
		top: 1.54rem;
	}

	.pixel-art {
		font-family: 'Press Start 2P', cursive;
		font-size: 0.6875rem;
		line-height: 1.65;
		text-transform: uppercase;
	}

	.menu-container {
		background-color: rgba(43, 43, 43, 0.55);
		border: 1px solid theme('colors.arcadeNeonGreen.200');
		padding: 0.35rem;
		border-radius: 4px;
		outline: none;
		pointer-events: auto;
		position: relative;
		z-index: 9999;
	}

	.menu-container:focus {
		box-shadow: 0 0 0 1px theme('colors.arcadeNeonGreen.100');
	}

	.mobile .menu-container {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		pointer-events: auto;
		width: 90%;
		max-width: 400px;
		z-index: 9999;
	}

	.menu-item {
		color: var(--arcade-neon-green-100);
		padding: 0.45rem 0.65rem;
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
		font-size: 0.6875rem;
	}

	@media (max-width: 1024px) {
		.menu-item {
			font-size: 0.8125rem;
		}
	}

	.menu-item:hover {
		color: theme('colors.arcadeNeonGreen.100');
		background-color: rgba(39, 255, 153, 0.05);
	}

	.menu-item.selected {
		color: theme('colors.arcadeNeonGreen.100');
		background-color: rgba(39, 255, 153, 0.1);
	}

	.mobile .menu-button {
		background-color: rgba(43, 43, 43, 0.85);
		color: var(--arcade-neon-green-100);
		border: 2px solid var(--arcade-neon-green-200);
		padding: 0.45rem 0.65rem;
		border-radius: 2px;
		pointer-events: auto;
		font-size: 0.5625rem;
		position: relative;
		/* Remove z-index from the button itself as it inherits from its container */
		overflow: hidden;
		text-shadow:
			0 0 4px var(--arcade-neon-green-100),
			0 0 8px rgba(39, 255, 153, 0.7);
		animation: arcadePulse 2s infinite;
		box-shadow:
			0 0 10px rgba(39, 255, 153, 0.3),
			inset 0 0 8px rgba(39, 255, 153, 0.2);
		/* Add increased hit target */
		touch-action: manipulation;
	}

	/* The shimmer effect overlay */
	/* Primary shimmer effect */
	.mobile .menu-button::before {
		content: '';
		position: absolute;
		top: -100%;
		left: -100%;
		width: 80%;
		height: 300%;
		background: linear-gradient(
			120deg,
			transparent,
			rgba(39, 255, 153, 0.1) 10%,
			rgba(255, 255, 255, 0.5) 20%,
			rgba(39, 255, 153, 0.1) 30%,
			transparent
		);
		animation: arcadeShimmer 4s infinite;
		transform: rotate(35deg);
	}

	/* Scanline effect */
	.mobile .menu-button::after {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: repeating-linear-gradient(
			0deg,
			rgba(0, 0, 0, 0.15) 0px,
			rgba(0, 0, 0, 0.15) 1px,
			transparent 1px,
			transparent 2px
		);
		pointer-events: none;
		animation: scanline 8s linear infinite;
	}

	@keyframes arcadeShimmer {
		0% {
			transform: translateX(-200%) rotate(35deg);
		}
		15%,
		100% {
			transform: translateX(300%) rotate(35deg);
		}
	}

	@keyframes arcadePulse {
		0%,
		100% {
			border-color: rgba(39, 255, 153, 0.6);
			box-shadow:
				0 0 10px rgba(39, 255, 153, 0.3),
				inset 0 0 8px rgba(39, 255, 153, 0.2);
		}
		50% {
			border-color: rgba(39, 255, 153, 1);
			box-shadow:
				0 0 15px rgba(39, 255, 153, 0.5),
				inset 0 0 12px rgba(39, 255, 153, 0.3);
		}
	}

	@keyframes scanline {
		0% {
			background-position: 0 0;
		}
		100% {
			background-position: 0 100%;
		}
	}

	/* Add intense hover state */
	.mobile .menu-button:hover {
		background-color: rgba(43, 43, 43, 0.95);
		text-shadow:
			0 0 8px var(--arcade-neon-green-100),
			0 0 16px rgba(39, 255, 153, 0.8);
		animation: arcadePulse 1s infinite;
	}

	/* Add authentic "press" effect */
	.mobile .menu-button:active {
		transform: scale(0.95);
		box-shadow:
			0 0 5px rgba(39, 255, 153, 0.2),
			inset 0 0 15px rgba(39, 255, 153, 0.4);
		border-color: rgba(39, 255, 153, 0.8);
		transition: transform 0.1s;
	}

	.mobile .menu-item {
		background-color: transparent;
		color: var(--arcade-neon-green-100);
		border: none;
		padding: 0 1rem;
		margin: 0.5rem 0;
		border-radius: 4px;
		width: 80%;
		text-align: center;
		justify-content: center;
	}

	.arrow {
		margin-right: 0.5rem;
		margin-bottom: 5px;
		animation: blink 1s infinite;
		display: inline-block;
		width: 0.75em;
		text-align: center;
		width: 10px;
		min-width: 10px;
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

	.close-button {
		position: absolute;
		top: 1rem;
		right: 1rem;
		background-color: transparent;
		color: var(--arcade-neon-green-100);
		border: none;
		font-size: 0.8125rem;
		cursor: pointer;
		pointer-events: auto;
	}
</style>

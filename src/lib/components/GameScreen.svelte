<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { browser } from '$app/environment';
	import { writable } from 'svelte/store';
	import Game from '$components/game/Game.svelte';
	import { onMount, onDestroy } from 'svelte';
	import Instructions from './Instructions.svelte';

	// Define the store
	const deviceState = writable({
		isTouchDevice: false,
		windowWidth: 0,
		showControls: false,
		isDesktop: false // Add this to track desktop state
	});

	let showInstructions = true; // Show initially
	let hasPlayedBefore = false; // Track first-time players

	// Modify your decorativeText array to include controls reference
	let decorativeText = [
		{ text: 'HIGH SCORE', value: '000000', side: 'left' },
		{ text: 'CONTROLS', value: '← → MOVE\n↑ JUMP\nX SHOOT', side: 'left' },
		{ text: '1UP', value: '0', side: 'right' }
	];

	// Add help toggle function
	function toggleInstructions() {
		showInstructions = !showInstructions;
		if (typeof window !== 'undefined') {
			window.isPaused = showInstructions;
		}
	}

	function initializeDeviceState() {
		if (browser) {
			const isTouchDevice =
				'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;

			// Update device state
			const deviceInfo = {
				isTouchDevice,
				windowWidth: window.innerWidth,
				showControls: isTouchDevice || window.innerWidth < 1024,
				isDesktop: window.innerWidth >= 1024 // Add desktop check
			};

			deviceState.set(deviceInfo);
		}
	}

	// Lifecycle hooks
	onMount(() => {
		if (browser) {
			initializeDeviceState();
			window.addEventListener('resize', initializeDeviceState);
		}
	});

	onDestroy(() => {
		if (browser) {
			window.removeEventListener('resize', initializeDeviceState);
		}
	});
</script>

<!-- Only show instructions and help button on desktop -->
<!-- {#if $deviceState.isDesktop}
	{#if showInstructions}
		<Instructions
			on:close={() => {
				showInstructions = false;
				if (typeof window !== 'undefined') {
					window.isPaused = false;
				}
			}}
		/>
	{/if}

	<button
		class="help-button"
		on:click={() => {
			showInstructions = true;
			if (typeof window !== 'undefined') {
				window.isPaused = true;
			}
		}}
	>
		HELP
	</button>
{/if} -->

<div id="game-screen" class="flex items-center justify-center w-full h-full p-[1vmin]">
	<div class="game-background">
		<!-- Left side panel - only show on desktop -->
		<div class="hidden lg:block">
			<div class="side-panel left" in:fly={{ x: -50, duration: 1000 }}>
				{#each decorativeText.filter((item) => item.side === 'left') as item}
					<div class="arcade-text">
						<span class="label">{item.text}</span>
						<span class="value">{item.value}</span>
					</div>
				{/each}
				<div class="neon-line"></div>
				<div class="pixel-decoration"></div>
			</div>
		</div>

		<!-- Game container -->
		<div class="game-view-container w-full lg:max-w-[calc(100%-300px)]">
			<Game />
		</div>

		<!-- Right side panel - only show on desktop -->
		<div class="hidden lg:block">
			<div class="side-panel right" in:fly={{ x: 50, duration: 1000 }}>
				{#each decorativeText.filter((item) => item.side === 'right') as item}
					<div class="arcade-text">
						<span class="label">{item.text}</span>
						<span class="value">{item.value}</span>
					</div>
				{/each}
				<div class="neon-line"></div>
				<div class="pixel-decoration"></div>
			</div>
		</div>
	</div>
</div>

<style>
	#game-screen {
		position: relative;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		/* padding-bottom: env(safe-area-inset-bottom); */
	}

	.game-background {
		position: relative;
		width: 100%;
		height: 100%;
		background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
		border-radius: 3vmin;
		display: flex;
		justify-content: center;
		align-items: center;
		overflow: hidden;
	}

	:global(html.light .game-background) {
		position: relative;
		width: 100%;
		height: 100%;
		/* Light mode gradient using arcadeWhite shades */
		background: linear-gradient(
			135deg,
			var(--arcade-white-100) 0%,
			var(--arcade-white-200) 50%,
			var(--arcade-white-300) 100%
		);
		border-radius: 2.9vmin;
		/* Subtle shadow for depth in light mode */
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
		display: flex;
		justify-content: center;
		align-items: center;
		overflow: hidden;
	}

	.game-view-container {
		height: 100%;
		position: relative;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.side-panel {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 150px;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 2rem 1rem;
		z-index: 2;
		pointer-events: none;
		/* Add display none by default */
		display: none;
	}

	/* Show only on lg screens */
	@media (min-width: 1024px) {
		.side-panel {
			display: flex;
		}
	}

	.side-panel.left {
		left: 0;
		border-right: 1px solid rgba(39, 255, 153, 0.1);
	}

	.side-panel.right {
		right: 0;
		border-left: 1px solid rgba(39, 255, 153, 0.1);
	}

	.arcade-text {
		font-family: 'Press Start 2P', monospace;
		color: var(--arcade-neon-green-100);
		text-align: center;
		margin: 1rem 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.arcade-text .label {
		font-size: 0.8rem;
		opacity: 0.8;
	}

	/* .arcade-text .value {
		font-size: 1rem;
		text-shadow: 0 0 5px var(--arcade-neon-green-100);
	} */

	.arcade-text .value {
		font-size: 0.8rem;
		text-shadow: 0 0 5px var(--arcade-neon-green-100);
		white-space: pre-line;
		line-height: 1.5;
	}

	.help-button {
		position: absolute;
		top: 1rem;
		right: 1rem;
		font-family: 'Press Start 2P', monospace;
		background: transparent;
		border: 2px solid var(--arcade-neon-green-100);
		color: var(--arcade-neon-green-100);
		padding: 0.5rem 1rem;
		cursor: pointer;
		z-index: 40;
		transition: all 0.2s ease;
	}

	.help-button:hover {
		background: var(--arcade-neon-green-100);
		color: black;
		text-shadow: none;
	}

	.neon-line {
		width: 80%;
		height: 2px;
		background: var(--arcade-neon-green-100);
		margin: 2rem 0;
		box-shadow: 0 0 10px var(--arcade-neon-green-100);
		opacity: 0.333;
	}

	.pixel-decoration {
		width: 100%;
		height: 40px;
		background-image: linear-gradient(45deg, var(--arcade-neon-green-100) 25%, transparent 25%),
			linear-gradient(-45deg, var(--arcade-neon-green-100) 25%, transparent 25%);
		background-size: 10px 10px;
		opacity: 0.1;
	}
</style>

<!-- src/lib/components/GameScreen.svelte -->
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
	/* ==========================================================================
   Layout & Container Styles
   ========================================================================== */
	#game-screen {
		position: relative;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		/* padding-bottom: env(safe-area-inset-bottom); */
	}

	.game-view-container {
		height: 100%;
		position: relative;
		display: flex;
		justify-content: center;
		align-items: center;
		border-radius: 3vmin;
		overflow: hidden;
	}

	/* ==========================================================================
   Game Background Base Styles
   ========================================================================== */

	.game-background {
		position: relative;
		width: 100%;
		height: 100%;
		border-radius: 3vmin;
		display: flex;
		justify-content: center;
		align-items: center;
		overflow: hidden;
		background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
		border: 1px solid rgba(255, 255, 255, 0.1);
		/* Add light tube container padding */
		padding: 2px;
	}

	.game-background::before {
		content: '';
		position: absolute;
		inset: -3px;
		border-radius: 4vmin;
		/* Simulate fluorescent tube behind diffuser */
		background: linear-gradient(
			90deg,
			rgba(220, 230, 255, 0) 0%,
			rgba(255, 255, 255, 0.4) 15%,
			rgba(220, 230, 255, 0.4) 50%,
			rgba(255, 255, 255, 0.1) 85%,
			rgba(220, 230, 255, 0) 100%
		);
		box-shadow:
        /* Inner tube glow */
			inset 0 0 2px rgba(255, 255, 255, 0.5),
			/* Tube housing shadow */ inset 0 0 4px rgba(0, 0, 0, 0.3),
			/* Outer diffused glow */ 0 0 8px rgba(200, 220, 255, 0.2);
		opacity: 0.2;
		z-index: 1;
		animation:
			tubeFlicker 0.1s steps(2, end) infinite,
			tubeBallast 15s linear infinite;
	}

	.game-background::after {
		display: none;
	}

	/* ==========================================================================
   Side Panel Styles
   ========================================================================== */
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
		display: none;
		border-radius: 3vmin 0 0 3vmin;
	}

	.side-panel.left {
		left: 0;
		border-right: 1px solid rgba(39, 255, 153, 0.1);
	}

	.side-panel.right {
		right: 0;
		border-left: 1px solid rgba(39, 255, 153, 0.1);
		border-radius: 0 3vmin 3vmin 0;
	}

	/* ==========================================================================
   Text & Typography
   ========================================================================== */
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

	.arcade-text .value {
		font-size: 0.8rem;
		text-shadow: 0 0 5px var(--arcade-neon-green-100);
		white-space: pre-line;
		line-height: 1.5;
	}

	/* ==========================================================================
   Decorative Elements
   ========================================================================== */
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
		border-radius: 3vmin;
	}

	.help-button:hover {
		background: var(--arcade-neon-green-100);
		color: black;
		text-shadow: none;
	}

	/* ==========================================================================
   Light Theme Overrides
   ========================================================================== */
	:global(html.light) .game-background {
		background: linear-gradient(135deg, rgba(245, 245, 245, 1) 0%, rgba(240, 240, 240, 1) 100%);
		border: 1px solid rgba(0, 0, 0, 0.08);
		box-shadow:
			0 8px 16px rgba(0, 0, 0, 0.03),
			0 4px 8px rgba(0, 0, 0, 0.02),
			inset 0 1px 2px rgba(255, 255, 255, 0.95),
			0 0 20px rgba(255, 0, 255, 0.15);
	}

	:global(html.light) .game-background::after {
		opacity: 0.4;
		filter: blur(2px);
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 1px;
		background: linear-gradient(
			90deg,
			transparent,
			rgba(255, 255, 255, 0.5) 20%,
			rgba(255, 255, 255, 0.5) 80%,
			transparent
		);
		pointer-events: none;
		border-radius: 3vmin 3vmin 0 0;
	}

	@keyframes tubeFlicker {
		0%,
		100% {
			opacity: 0.7;
		}
		50% {
			opacity: 0.65;
		}
	}

	@keyframes tubeBallast {
		0%,
		100% {
			filter: brightness(1);
		}
		15% {
			filter: brightness(0.97);
		}
		35% {
			filter: brightness(1.02);
		}
		55% {
			filter: brightness(0.98);
		}
		75% {
			filter: brightness(1.01);
		}
		95% {
			filter: brightness(0.99);
		}
	}

	:global(html.light) .game-view-container {
		border-radius: 3vmin;
		box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.02);
		overflow: hidden;
		background: transparent;
	}

	:global(html.light) .side-panel {
		background: linear-gradient(
			to bottom,
			rgba(250, 250, 250, 0.7) 0%,
			rgba(245, 245, 245, 0.7) 100%
		);
		backdrop-filter: blur(8px);
		border: none;
		box-shadow:
			inset 0 1px 1px rgba(255, 255, 255, 0.95),
			0 4px 6px rgba(0, 0, 0, 0.03);
		border-radius: 3vmin 0 0 3vmin;
	}

	:global(html.light) .side-panel.left {
		border-right: 1px solid rgba(0, 0, 0, 0.04);
	}

	:global(html.light) .side-panel.right {
		border-left: 1px solid rgba(0, 0, 0, 0.04);
		border-radius: 0 3vmin 3vmin 0;
	}

	:global(html.light) .arcade-text {
		color: var(--arcade-black-500);
	}

	:global(html.light) .arcade-text .label {
		opacity: 0.7;
		font-weight: 500;
		letter-spacing: 0.5px;
	}

	:global(html.light) .arcade-text .value {
		color: var(--arcade-black-700);
		text-shadow: none;
	}

	:global(html.light) .neon-line {
		height: 1px;
		background: linear-gradient(
			90deg,
			transparent,
			rgba(0, 0, 0, 0.08) 20%,
			rgba(0, 0, 0, 0.08) 80%,
			transparent
		);
		box-shadow: none;
		opacity: 1;
	}

	:global(html.light) .pixel-decoration {
		background-image: linear-gradient(45deg, rgba(0, 0, 0, 0.03) 25%, transparent 25%),
			linear-gradient(-45deg, rgba(0, 0, 0, 0.03) 25%, transparent 25%);
		opacity: 0.5;
	}

	:global(html.light) Game {
		border-radius: 3vmin;
		overflow: hidden;
	}

	/* ==========================================================================
   Animations
   ========================================================================== */
	@keyframes cornerGlow {
		0%,
		100% {
			opacity: 0.8;
		}
		50% {
			opacity: 0.6;
		}
	}

	@keyframes borderGlow {
		0% {
			filter: blur(2px) hue-rotate(0deg);
		}
		50% {
			filter: blur(2.5px) hue-rotate(180deg);
		}
		100% {
			filter: blur(2px) hue-rotate(360deg);
		}
	}

	@keyframes shine {
		0%,
		100% {
			opacity: 0;
			transform: translateX(-100%);
		}
		10%,
		90% {
			opacity: 0;
		}
		50% {
			opacity: 0.5;
			transform: translateX(100%);
		}
	}

	/* ==========================================================================
   Media Queries
   ========================================================================== */
	@media (min-width: 1024px) {
		.side-panel {
			display: flex;
		}
	}

	@media (max-width: 1023px) {
		:global(html.light) .game-background {
			background: linear-gradient(135deg, rgba(248, 248, 248, 1) 0%, rgba(242, 242, 242, 1) 100%);
		}
	}

	/* ==========================================================================
   Transitions
   ========================================================================== */
	.game-background,
	.side-panel,
	.arcade-text,
	.neon-line,
	.pixel-decoration,
	.game-background::before,
	.game-background::after,
	.game-view-container {
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}
</style>

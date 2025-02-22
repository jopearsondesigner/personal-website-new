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

<div
	id="game-screen"
	class="flex items-center justify-center w-full h-full p-[.75vmin] overflow-hidden"
>
	<!-- Add overflow-hidden to game-background -->
	<div class="game-background overflow-hidden">
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
		<div class="game-view-container w-full lg:max-w-[calc(100%-300px)] overflow-hidden">
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
		background: linear-gradient(
			90deg,
			rgb(0, 183, 255) 0%,
			rgb(123, 97, 255) 33%,
			rgb(183, 61, 255) 66%,
			rgb(255, 56, 100) 100%
		);
		position: relative;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 3.5vmin;
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
		border-radius: 3.5vmin;
		display: flex;
		justify-content: center;
		align-items: center;
		overflow: hidden;
		background: #000000;
		padding: 2px;
	}

	/* Tube effect around border */
	.game-background::before {
		content: '';
		position: absolute;
		inset: -3px;
		border-radius: 4vmin;
		background: linear-gradient(
			90deg,
			rgba(220, 230, 255, 0) 0%,
			rgba(255, 255, 255, 0.4) 15%,
			rgba(220, 230, 255, 0.4) 50%,
			rgba(255, 255, 255, 0.1) 85%,
			rgba(220, 230, 255, 0) 100%
		);
		box-shadow:
			inset 0 0 2px rgba(255, 255, 255, 0.5),
			inset 0 0 4px rgba(0, 0, 0, 0.3),
			0 0 8px rgba(200, 220, 255, 0.2);
		opacity: 0.2;
		z-index: 1;
		pointer-events: none;
		animation:
			tubeFlicker 0.1s steps(2, end) infinite,
			tubeBallast 15s linear infinite;
	}

	/* Screen glare effect */
	.game-background::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(
			135deg,
			transparent 0%,
			rgba(255, 255, 255, 0.03) 15%,
			rgba(255, 255, 255, 0.05) 30%,
			transparent 60%
		);
		border-radius: 3vmin;
		pointer-events: none;
		z-index: 10;
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
	:global(html.light) #game-screen {
		background: linear-gradient(
			90deg,
			rgba(0, 183, 255, 0.85) 0%,
			rgba(123, 97, 255, 0.85) 33%,
			rgba(183, 61, 255, 0.85) 66%,
			rgba(255, 56, 100, 0.85) 100%
		);
	}

	:global(html.light) .game-background {
		background: linear-gradient(135deg, rgba(245, 245, 245, 1) 0%, rgba(240, 240, 240, 1) 100%);
		border: 1px solid rgba(0, 0, 0, 0.08);
		box-shadow:
			0 8px 16px rgba(0, 0, 0, 0.03),
			0 4px 8px rgba(0, 0, 0, 0.02),
			inset 0 1px 2px rgba(255, 255, 255, 0.95),
			0 0 20px rgba(255, 0, 255, 0.15);
	}

	:global(html.light) .game-background {
		background: #c3d2e5; /* Slightly blue-tinted base for phosphor glow */
		border: 1px solid rgba(140, 150, 170, 0.3);
		box-shadow:
			inset 0 0 20px rgba(0, 40, 80, 0.1),
			/* Inner screen glow */ inset 0 0 10px rgba(120, 160, 220, 0.2),
			/* Phosphor effect */ 0 0 15px rgba(100, 130, 200, 0.15); /* Outer glow */
		position: relative;
		overflow: hidden;
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
			rgba(185, 200, 220, 0.8) 0%,
			rgba(175, 190, 210, 0.8) 100%
		);
		backdrop-filter: blur(8px);
		border: 1px solid rgba(140, 160, 190, 0.2);
		box-shadow:
			inset 0 1px 2px rgba(255, 255, 255, 0.3),
			0 2px 4px rgba(0, 20, 40, 0.05);
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
		color: rgba(20, 30, 50, 0.9);
		text-shadow:
			0 0 1px rgba(100, 130, 180, 0.3),
			0 0 2px rgba(120, 150, 200, 0.2);
	}

	:global(html.light) .arcade-text .label {
		opacity: 0.7;
		font-weight: 500;
		letter-spacing: 0.5px;
	}

	:global(html.light) .arcade-text .value {
		color: rgba(60, 76, 108, 0.95);
		text-shadow:
			0 0 1px rgba(80, 110, 160, 0.4),
			0 0 2px rgba(100, 130, 180, 0.3);
	}

	:global(html.light) .neon-line {
		background: linear-gradient(
			90deg,
			transparent,
			rgba(100, 130, 180, 0.2) 20%,
			rgba(100, 130, 180, 0.2) 80%,
			transparent
		);
		box-shadow: 0 0 4px rgba(100, 130, 180, 0.15);
	}

	:global(html.light) .pixel-decoration {
		background-image: linear-gradient(45deg, rgba(100, 130, 180, 0.1) 25%, transparent 25%),
			linear-gradient(-45deg, rgba(100, 130, 180, 0.1) 25%, transparent 25%);
		opacity: 0.6;
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

	/* ==========================================================================
   Media Queries
   ========================================================================== */
	@media (min-width: 1024px) {
		.side-panel {
			display: flex;
		}
	}

	/* @media (max-width: 1023px) {
		:global(html.light) .game-background {
			background: linear-gradient(135deg, rgba(248, 248, 248, 1) 0%, rgba(242, 242, 242, 1) 100%);
		}
	} */

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

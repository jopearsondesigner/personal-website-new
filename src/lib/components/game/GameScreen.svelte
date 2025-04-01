<!-- Performance-optimized GameScreen.svelte -->
<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { browser } from '$app/environment';
	import { writable } from 'svelte/store';
	import Game from '$components/game/Game.svelte';
	import { onMount, onDestroy } from 'svelte';
	import Instructions from '../ui/Instructions.svelte';
	import LeftArrowIcon from '$lib/icons/LeftArrowIcon.svelte';
	import RightArrowIcon from '$lib/icons/RightArrowIcon.svelte';
	import XKeyIcon from '$lib/icons/XKeyIcon.svelte';
	import SpaceKeyIcon from '$lib/icons/SpaceKeyIcon.svelte';
	import { ICON_SIZE } from '$lib/constants/ui-constants';
	// Import game store
	import { gameStore } from '$lib/stores/game-store';
	import { deviceCapabilities } from '$lib/utils/device-performance';
	import { batchDOMUpdate } from '$lib/utils/dom-utils';

	// Define the device state store - optimized default values
	const deviceState = writable({
		isTouchDevice: false,
		windowWidth: 0,
		showControls: false,
		isDesktop: false
	});

	let showInstructions = false;
	let hasPlayedBefore = false;

	// Create local variables to avoid re-renders
	let score = 0;
	let highScore = 0;
	let lives = 3;
	let heatseekerCount = 3;

	// Cache for panel elements
	let leftPanelItems, rightPanelItems;

	// Current device capabilities
	let capabilities;
	const unsubscribeCapabilities = deviceCapabilities.subscribe((value) => {
		capabilities = value;
	});

	// Subscribe to game store values - optimized with single update function
	const unsubscribe = gameStore.subscribe((state) => {
		// Only update if values changed to avoid unnecessary renders
		if (
			score !== state.score ||
			highScore !== state.highScore ||
			lives !== state.lives ||
			heatseekerCount !== state.heatseekerCount
		) {
			score = state.score;
			highScore = state.highScore;
			lives = state.lives;
			heatseekerCount = state.heatseekerCount;
		}
	});

	// Create panel items once instead of in reactive statement
	$: {
		if (browser) {
			// Only recreate the panel items when these values change
			leftPanelItems = [
				{
					text: 'CONTROLS',
					value: 'MOVE',
					icons: [
						{ component: LeftArrowIcon, size: ICON_SIZE, color: 'rgba(245, 245, 220, 0.9)' },
						{ component: RightArrowIcon, size: ICON_SIZE, color: 'rgba(245, 245, 220, 0.9)' }
					],
					additionalText: '\nSHOOT',
					additionalIcons: [
						{ component: XKeyIcon, size: ICON_SIZE, color: 'rgba(245, 245, 220, 0.9)' }
					],
					moreText: '\nHEATSEEKER',
					moreIcons: [
						{ component: SpaceKeyIcon, size: ICON_SIZE, color: 'rgba(245, 245, 220, 0.9)' }
					]
				}
			];

			rightPanelItems = [
				{ text: 'HIGH SCORE', value: highScore.toString().padStart(6, '0') },
				{ text: 'SCORE', value: score.toString().padStart(6, '0') },
				{ text: 'LIVES', value: lives.toString() }
			];
		}
	}

	function toggleInstructions() {
		showInstructions = !showInstructions;
		if (typeof window !== 'undefined') {
			window.isPaused = showInstructions;
		}
	}

	// Optimized device detection with fewer properties checked
	function initializeDeviceState() {
		if (!browser) return;

		// Use batch DOM update to avoid layout thrashing
		batchDOMUpdate(() => {
			const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

			const windowWidth = window.innerWidth;

			deviceState.set({
				isTouchDevice,
				windowWidth,
				showControls: isTouchDevice || windowWidth < 1024,
				isDesktop: windowWidth >= 1024
			});

			// Set data attributes once for CSS optimizations
			document.documentElement.setAttribute(
				'data-device-type',
				windowWidth < 768 ? 'mobile' : 'desktop'
			);

			// Detect Safari for custom optimizations
			const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
			if (isSafari) {
				document.documentElement.setAttribute('data-browser', 'safari');
			}
		});
	}

	// Lifecycle hooks with improved cleanup
	onMount(() => {
		if (browser) {
			initializeDeviceState();

			// Optimize with passive listener
			window.addEventListener('resize', initializeDeviceState, { passive: true });

			// Apply initial hardware acceleration class
			if ($deviceState.isDesktop) {
				document.getElementById('game-screen')?.classList.add('hardware-accelerated');
			}
		}
	});

	onDestroy(() => {
		if (browser) {
			window.removeEventListener('resize', initializeDeviceState);
			unsubscribe(); // Clean up subscription
			unsubscribeCapabilities(); // Clean up device capabilities subscription
		}
	});
</script>

<div
	id="game-screen"
	class="flex items-center justify-center w-full h-full p-[.75vmin] overflow-hidden"
	class:reduced-effects={capabilities?.tier === 'low'}
>
	<div class="game-background overflow-hidden">
		<!-- Left side panel - only show on desktop -->
		{#if browser && $deviceState.isDesktop}
			<div class="side-panel left" in:fly={{ x: -50, duration: 1000 }}>
				<div class="panel-content">
					{#each leftPanelItems as item}
						<div class="arcade-text">
							<span class="label">{item.text}</span>
							{#if item.icons}
								<span class="value with-icons">
									<span class="control-label">{item.value}</span>
									<span class="icon-row">
										{#each item.icons as icon}
											<svelte:component this={icon.component} size={icon.size} color={icon.color} />
										{/each}
									</span>
									{#if item.additionalText}
										<span class="control-label">{item.additionalText}</span>
										<span class="icon-row">
											{#each item.additionalIcons as icon}
												<svelte:component
													this={icon.component}
													size={icon.size}
													color={icon.color}
												/>
											{/each}
										</span>
									{/if}
									{#if item.moreText}
										<span class="control-label">{item.moreText}</span>
										<span class="icon-row">
											{#each item.moreIcons as icon}
												<svelte:component
													this={icon.component}
													size={icon.size}
													color={icon.color}
												/>
											{/each}
										</span>
									{/if}
								</span>
							{:else}
								<span class="value">{item.value}</span>
							{/if}
						</div>
					{/each}
					<div class="neon-line"></div>
					<div class="pixel-decoration"></div>
				</div>
			</div>
		{/if}

		<!-- Game container -->
		<div class="game-view-container w-full lg:w-[calc(100%-260px)] overflow-hidden">
			<Game />
		</div>

		<!-- Right side panel - only show on desktop -->
		{#if browser && $deviceState.isDesktop}
			<div class="side-panel right" in:fly={{ x: 50, duration: 1000 }}>
				<div class="panel-content">
					{#each rightPanelItems as item}
						<div class="arcade-text">
							<span class="label">{item.text}</span>
							<span class="value">{item.value}</span>
						</div>
					{/each}
					<div class="neon-line"></div>
					<div class="pixel-decoration"></div>
				</div>
			</div>
		{/if}
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
		contain: layout style;
		will-change: transform;
	}

	/* Apply reduced effects for low-end devices */
	.reduced-effects {
		background: linear-gradient(90deg, rgb(0, 183, 255) 0%, rgb(255, 56, 100) 100%);
	}

	.game-view-container {
		height: 100%;
		position: relative;
		display: flex;
		justify-content: center;
		align-items: center;
		border-radius: 3vmin;
		overflow: hidden;
		contain: layout style;
	}

	/* ==========================================================================
   Game Background Base Styles - Optimized
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
		background-color: var(--dark-mode-bg);
		padding: 2px;
		contain: layout style;
		will-change: transform;
	}

	/* Simplified tube effect */
	.game-background::before {
		content: '';
		position: absolute;
		inset: -3px;
		border-radius: 4vmin;
		background: linear-gradient(
			90deg,
			rgba(220, 230, 255, 0) 0%,
			rgba(255, 255, 255, 0.4) 50%,
			rgba(220, 230, 255, 0) 100%
		);
		box-shadow: inset 0 0 4px rgba(0, 0, 0, 0.3);
		opacity: 0.2;
		z-index: 1;
		pointer-events: none;
	}

	/* Simplified screen glare with minimal properties */
	.game-background::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(
			135deg,
			transparent 0%,
			rgba(255, 255, 255, 0.05) 30%,
			transparent 60%
		);
		border-radius: 3vmin;
		pointer-events: none;
		z-index: 10;
	}

	/* ==========================================================================
   Side Panel Styles - Optimized for desktop only
   ========================================================================== */
	.side-panel {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 150px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem 1rem;
		z-index: 2;
		pointer-events: none;
		border-radius: 3vmin 0 0 3vmin;
		contain: content;
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

	.panel-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 100%;
		contain: content;
	}

	/* ==========================================================================
   Text & Typography - Simplified
   ========================================================================== */
	.arcade-text {
		font-family: 'Press Start 2P', monospace;
		color: var(--arcade-neon-green-100);
		text-align: center;
		margin: 0.75rem 0;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.arcade-text .label {
		font-size: 0.7rem;
		opacity: 0.8;
		letter-spacing: 0.05rem;
		margin-bottom: 0.15rem;
	}

	.arcade-text .value {
		font-size: 0.65rem;
		text-shadow: 0 0 5px var(--arcade-neon-green-100);
		white-space: pre-line;
		line-height: 1.4;
	}

	.control-label {
		font-size: 0.6rem;
		margin-top: 0.4rem;
		margin-bottom: 0.15rem;
		letter-spacing: 0.05rem;
		opacity: 0.9;
	}

	.arcade-text .value.with-icons {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
	}

	.icon-row {
		display: flex;
		gap: 0.4rem;
		justify-content: center;
		align-items: center;
		margin-top: 0.1rem;
		margin-bottom: 0.3rem;
	}

	/* ==========================================================================
   Decorative Elements - Simplified
   ========================================================================== */
	.neon-line {
		width: 80%;
		height: 2px;
		background: var(--arcade-neon-green-100);
		margin: 1rem 0;
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

	/* ==========================================================================
   Light Theme Overrides - Simplified
   ========================================================================== */
	:global(html.light) #game-screen {
		background: linear-gradient(90deg, rgba(0, 183, 255, 0.85) 0%, rgba(183, 61, 255, 0.85) 100%);
	}

	:global(html.light) .game-background {
		background-color: var(--light-mode-bg);
		border: 1px solid rgba(140, 150, 170, 0.3);
		box-shadow: inset 0 0 20px rgba(0, 40, 80, 0.1);
	}

	:global(html.light) .game-view-container {
		background: transparent;
	}

	:global(html.light) .side-panel {
		background: linear-gradient(90deg, rgba(0, 183, 255, 0.75) 0%, rgba(123, 97, 255, 0.75) 100%);
		backdrop-filter: blur(8px);
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	:global(html.light) .arcade-text {
		color: rgba(255, 255, 255, 0.9);
		text-shadow: 0 0 1px rgba(0, 0, 0, 0.3);
	}

	:global(html.light) .neon-line {
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4) 50%, transparent);
		box-shadow: 0 0 4px rgba(255, 255, 255, 0.3);
	}

	/* ==========================================================================
   Device-specific optimizations - Consolidated
   ========================================================================== */
	@media (max-width: 768px) {
		.game-background {
			overflow: hidden;
			contain: layout;
			will-change: transform;
		}

		.game-view-container {
			contain: layout;
			will-change: transform;
		}

		#game-screen {
			box-shadow: none;
		}

		/* Remove animations on mobile */
		.game-background::before {
			animation: none;
			opacity: 0.15;
		}

		.game-background::after {
			background: linear-gradient(
				135deg,
				transparent 0%,
				rgba(255, 255, 255, 0.03) 30%,
				transparent 60%
			);
		}
	}

	/* Efficient hardware acceleration */
	.hardware-accelerated {
		transform: translateZ(0);
		backface-visibility: hidden;
		will-change: transform;
	}

	/* Safari-specific optimizations */
	html[data-browser='safari'] #game-screen {
		background: linear-gradient(90deg, rgb(0, 183, 255) 0%, rgb(255, 56, 100) 100%);
	}

	/* Reduced Motion Support */
	@media (prefers-reduced-motion: reduce) {
		.game-background::before,
		.game-background::after,
		.neon-line,
		.pixel-decoration {
			animation: none !important;
			transition: none !important;
		}

		#game-screen {
			background: linear-gradient(90deg, rgb(0, 183, 255) 0%, rgb(183, 61, 255) 100%);
		}
	}
</style>

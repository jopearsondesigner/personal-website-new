<!-- src/lib/components/ui/GameScreen.svelte -->
<script lang="ts">
	import type { GameStateEvent } from '$lib/types/game';
	import { fade, fly } from 'svelte/transition';
	import { browser } from '$app/environment';
	import { writable } from 'svelte/store';
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { ICON_SIZE } from '$lib/constants/ui-constants';
	// Import game store
	import { gameStore } from '$lib/stores/game-store';

	// Import icons - note: using lazy imports to improve performance
	let LeftArrowIcon: any;
	let RightArrowIcon: any;
	let XKeyIcon: any;
	let SpaceKeyIcon: any;

	// Dynamic component import
	let Game: any;

	const dispatch = createEventDispatcher();

	// Define the device state store with optimized initial values
	const deviceState = writable({
		isTouchDevice: false,
		windowWidth: 0,
		showControls: false,
		isDesktop: false,
		isInitialized: false
	});

	let showInstructions = false;
	let hasPlayedBefore = false;

	// Subscribe to game store values
	let score = 0;
	let highScore = 0;
	let lives = 3;
	let heatseekerCount = 3;
	let unsubscribe: () => void;

	let originalViewportContent = '';
	let decorativeText: any[] = [];

	// Function to initialize device detection - run once
	function initializeDeviceState() {
		if (!browser) return;

		const isTouchDevice =
			'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;

		// Update device state in a single operation
		deviceState.set({
			isTouchDevice,
			windowWidth: window.innerWidth,
			showControls: isTouchDevice || window.innerWidth < 1024,
			isDesktop: window.innerWidth >= 1024,
			isInitialized: true
		});

		// Update decorative text after device detection
		updateDecorativeText();
	}

	// Efficiently update decorative text by rebuilding the array only when needed
	function updateDecorativeText() {
		decorativeText = [
			// Controls in left panel
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
				],
				side: 'left'
			},
			// Right panel - updated with renamed elements and proper order
			{ text: 'HIGH SCORE', value: highScore.toString().padStart(6, '0'), side: 'right' },
			{ text: 'SCORE', value: score.toString().padStart(6, '0'), side: 'right' },
			{ text: 'LIVES', value: lives.toString(), side: 'right' }
		];
	}

	function handleGameStateChange(event: CustomEvent) {
		dispatch('stateChange', event.detail);
	}

	// Dynamically import components only when needed
	async function loadComponents() {
		if (!browser) return;

		// Import icons with Promise.all for parallel loading
		const [leftArrow, rightArrow, xKey, spaceKey, gameComp] = await Promise.all([
			import('$lib/icons/LeftArrowIcon.svelte').then((m) => m.default),
			import('$lib/icons/RightArrowIcon.svelte').then((m) => m.default),
			import('$lib/icons/XKeyIcon.svelte').then((m) => m.default),
			import('$lib/icons/SpaceKeyIcon.svelte').then((m) => m.default),
			import('$lib/components/game/Game.svelte').then((m) => m.default)
		]);

		LeftArrowIcon = leftArrow;
		RightArrowIcon = rightArrow;
		XKeyIcon = xKey;
		SpaceKeyIcon = spaceKey;
		Game = gameComp;

		// Re-render decorative text after components are loaded
		updateDecorativeText();
	}

	// Toggle help function - optimized to use fewer operations
	function toggleInstructions() {
		showInstructions = !showInstructions;
		if (browser) {
			window.isPaused = showInstructions;
		}
	}

	// Debounced resize handler for better performance
	function debounce(func: Function, wait: number) {
		let timeout: ReturnType<typeof setTimeout>;
		return function executedFunction(...args: any[]) {
			clearTimeout(timeout);
			timeout = setTimeout(() => func(...args), wait);
		};
	}

	const handleResize = debounce(() => {
		if (!browser) return;
		initializeDeviceState();
	}, 100);

	// Lifecycle hooks with improved cleanup
	onMount(async () => {
		if (!browser) return;

		// Load components asynchronously
		await loadComponents();

		// Initialize device state
		initializeDeviceState();

		// Subscribe to game store
		unsubscribe = gameStore.subscribe((state) => {
			score = state.score;
			highScore = state.highScore;
			lives = state.lives;
			heatseekerCount = state.heatseekerCount;

			// Update decorative text when game state changes
			updateDecorativeText();
		});

		// Handle viewport for mobile
		const viewportMeta = document.querySelector('meta[name="viewport"]');
		if (viewportMeta) {
			originalViewportContent = viewportMeta.getAttribute('content') || '';
			viewportMeta.setAttribute(
				'content',
				'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
			);
		}

		// Add resize listener with proper debounce
		window.addEventListener('resize', handleResize);
	});

	onDestroy(() => {
		if (!browser) return;

		// Clean up event listeners
		window.removeEventListener('resize', handleResize);

		// Unsubscribe from game store
		if (unsubscribe) unsubscribe();

		// Restore original viewport settings
		const viewportMeta = document.querySelector('meta[name="viewport"]');
		if (viewportMeta && originalViewportContent) {
			viewportMeta.setAttribute('content', originalViewportContent);
		}
	});
</script>

<div
	id="game-screen"
	class="flex items-center justify-center w-full h-full p-[.75vmin] overflow-hidden"
>
	<div class="game-background overflow-hidden">
		<!-- Left side panel - only show on desktop -->
		<div class="hidden lg:block">
			{#if $deviceState.isDesktop && $deviceState.isInitialized}
				<div class="side-panel left" in:fly={{ x: -50, duration: 1000 }}>
					<div class="panel-content">
						{#each decorativeText.filter((item) => item.side === 'left') as item}
							<div class="arcade-text">
								<span class="label">{item.text}</span>
								{#if item.icons}
									<span class="value with-icons">
										<span class="control-label">{item.value}</span>
										<span class="icon-row">
											{#each item.icons as icon}
												<svelte:component
													this={icon.component}
													size={icon.size}
													color={icon.color}
												/>
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
		</div>

		<!-- Game container -->
		<div class="game-view-container w-full lg:w-[calc(100%-260px)] overflow-hidden">
			{#if Game}
				<svelte:component this={Game} on:stateChange={handleGameStateChange} />
			{/if}
		</div>

		<!-- Right side panel - only show on desktop -->
		<div class="hidden lg:block">
			{#if $deviceState.isDesktop && $deviceState.isInitialized}
				<div class="side-panel right" in:fly={{ x: 50, duration: 1000 }}>
					<div class="panel-content">
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
			{/if}
		</div>
	</div>
</div>

<style>
	/* ==========================================================================
   Layout & Container Styles - Optimized
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
		contain: layout style paint; /* Modern performance optimization */
	}

	.game-view-container {
		height: 100%;
		position: relative;
		display: flex;
		justify-content: center;
		align-items: center;
		border-radius: 3vmin;
		overflow: hidden;
		contain: content; /* Modern performance optimization */
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
		will-change: transform; /* Hint to browser for optimized rendering */
	}

	/* Optimized tube effect around border - simplified gradient */
	.game-background::before {
		content: '';
		position: absolute;
		inset: -3px;
		border-radius: 4vmin;
		background: linear-gradient(
			90deg,
			rgba(220, 230, 255, 0) 0%,
			rgba(255, 255, 255, 0.4) 25%,
			rgba(255, 255, 255, 0.1) 75%,
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

	/* Simplified screen glare effect */
	.game-background::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(
			135deg,
			transparent 0%,
			rgba(255, 255, 255, 0.03) 25%,
			transparent 80%
		);
		border-radius: 3vmin;
		pointer-events: none;
		z-index: 10;
	}

	/* ==========================================================================
   Side Panel Styles - Optimized
   ========================================================================== */
	.side-panel {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 130px; /* Reduced from 150px */
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 1.5rem 0.75rem; /* Reduced padding */
		z-index: 2;
		pointer-events: none;
		display: none;
		border-radius: 3vmin 0 0 3vmin;
		contain: content; /* Modern performance optimization */
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

	/* Panel content wrapper for better performance */
	.panel-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 100%;
		contain: content; /* Performance optimization */
	}

	/* ==========================================================================
   Text & Typography - Optimized for rendering performance
   ========================================================================== */
	.arcade-text {
		font-family: 'Press Start 2P', monospace;
		color: var(--arcade-neon-green-100);
		text-align: center;
		margin: 0.75rem 0;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		will-change: transform; /* Performance hint */
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

	/* Style for icons */
	:global(.instruction-icon) {
		display: inline-block;
		vertical-align: middle;
		filter: drop-shadow(0 0 3px var(--arcade-neon-green-100));
	}

	/* ==========================================================================
   Decorative Elements - Simplified for better performance
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
   Light Theme Overrides - Optimized
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
		background-color: var(--light-mode-bg);
		border: 1px solid rgba(140, 150, 170, 0.3);
		box-shadow:
			inset 0 0 20px rgba(0, 40, 80, 0.1),
			inset 0 0 10px rgba(120, 160, 220, 0.2),
			0 0 15px rgba(100, 130, 200, 0.15);
	}

	:global(html.light) .side-panel {
		background: linear-gradient(90deg, rgba(0, 183, 255, 0.75) 0%, rgba(123, 97, 255, 0.75) 100%);
		backdrop-filter: blur(8px);
		border: 1px solid rgba(255, 255, 255, 0.2);
		box-shadow:
			inset 0 1px 2px rgba(255, 255, 255, 0.3),
			0 2px 4px rgba(0, 20, 40, 0.05);
	}

	:global(html.light) .side-panel.left {
		background: linear-gradient(90deg, rgba(0, 183, 255, 0.75) 0%, rgba(123, 97, 255, 0.75) 100%);
		border-right: 1px solid rgba(255, 255, 255, 0.15);
	}

	:global(html.light) .side-panel.right {
		background: linear-gradient(90deg, rgba(123, 97, 255, 0.75) 0%, rgba(183, 61, 255, 0.75) 100%);
		border-left: 1px solid rgba(255, 255, 255, 0.15);
	}

	:global(html.light) .arcade-text {
		color: rgba(255, 255, 255, 0.9);
		text-shadow:
			0 0 1px rgba(0, 0, 0, 0.3),
			0 0 2px rgba(0, 0, 0, 0.2);
	}

	:global(html.light) .arcade-text .label {
		opacity: 0.9;
		font-weight: 500;
		letter-spacing: 0.5px;
	}

	:global(html.light) .arcade-text .value {
		color: rgba(255, 255, 255, 0.95);
		text-shadow:
			0 0 1px rgba(0, 0, 0, 0.4),
			0 0 2px rgba(0, 0, 0, 0.3);
	}

	:global(html.light) .neon-line {
		background: linear-gradient(
			90deg,
			transparent,
			rgba(255, 255, 255, 0.4) 20%,
			rgba(255, 255, 255, 0.4) 80%,
			transparent
		);
		box-shadow: 0 0 4px rgba(255, 255, 255, 0.3);
	}

	:global(html.light) .pixel-decoration {
		background-image: linear-gradient(45deg, rgba(255, 255, 255, 0.2) 25%, transparent 25%),
			linear-gradient(-45deg, rgba(255, 255, 255, 0.2) 25%, transparent 25%);
		opacity: 0.3;
	}

	/* ==========================================================================
   Animations - Optimized for performance
   ========================================================================== */
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
		50% {
			filter: brightness(0.97);
		}
	}

	/* ==========================================================================
   Media Queries - Optimized
   ========================================================================== */
	@media (min-width: 1024px) {
		.side-panel {
			display: flex;
		}
	}

	/* ==========================================================================
   Performance Optimizations for Mobile
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

		/* Simplify or disable animations on mobile */
		.game-background::before {
			animation: none;
			opacity: 0.15;
		}

		#game-screen {
			box-shadow: none;
		}

		.game-background::after {
			background: linear-gradient(
				135deg,
				transparent 0%,
				rgba(255, 255, 255, 0.02) 15%,
				transparent 80%
			);
		}
        
		/* Light mode mobile border-radius overrides */
		:global(html.light) #game-screen {
			border-radius: var(--light-cabinet-border-radius);
		}
		
		:global(html.light) .game-view-container {
			border-radius: calc(var(--light-cabinet-border-radius) - 1px);
		}
		
		:global(html.light) .game-background {
			border-radius: var(--light-cabinet-border-radius);
            border-color: rgba(220, 220, 220, 0.4);
            box-shadow:
                inset 0 0 15px rgba(0, 40, 80, 0.05),
                inset 0 0 5px rgba(120, 160, 220, 0.1),
                0 0 10px rgba(100, 130, 200, 0.08);
		}
		
		:global(html.light) .game-background::before {
			border-radius: calc(var(--light-cabinet-border-radius) + 2px);
            opacity: 0.1;
		}
		
		:global(html.light) .game-background::after {
			border-radius: calc(var(--light-cabinet-border-radius) - 1px);
            opacity: 0.4;
		}
		
		:global(html.light) .side-panel.left {
			border-radius: var(--light-cabinet-border-radius) 0 0 var(--light-cabinet-border-radius);
		}
		
		:global(html.light) .side-panel.right {
			border-radius: 0 var(--light-cabinet-border-radius) var(--light-cabinet-border-radius) 0;
		}
	}

	/* ==========================================================================
   Reduced Motion Preference Support
   ========================================================================== */
	@media (prefers-reduced-motion: reduce) {
		.screen-reflection,
		.screen-glare,
		.screen-glass,
		.game-background::before,
		.game-background::after,
		.neon-line,
		.pixel-decoration {
			animation: none !important;
			transition: none !important;
		}

		#game-screen {
			/* Simpler background */
			background: linear-gradient(90deg, rgb(0, 183, 255) 0%, rgb(183, 61, 255) 100%);
		}
	}

	/* ==========================================================================
   Performance optimizations for transitions
   ========================================================================== */
	.game-background,
	.side-panel,
	.arcade-text,
	.neon-line,
	.pixel-decoration,
	.game-background::before,
	.game-background::after,
	.game-view-container {
		transition-property: transform, opacity;
		transition-duration: 0.3s;
		transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
	}
</style>
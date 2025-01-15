<!-- src/lib/components/game/Game.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { fade } from 'svelte/transition';
	import { Cog } from 'lucide-svelte';
	import { setupGame } from '$lib/game.js';
	import { get } from 'svelte/store';
	import { writable } from 'svelte/store';

	const deviceState = writable({
		isTouchDevice: false,
		windowWidth: 0,
		showControls: false
	});

	let canvas: HTMLCanvasElement;
	let gameContainer: HTMLDivElement;
	let scale = 1;
	let showSizeControl = false;
	let scaleFactor = 0.9;
	let controlsPosition = { x: 0, y: 0 };
	let mounted = false;

	const GAME_WIDTH = 800;
	const GAME_HEIGHT = 600;

	// Debounced resize handler
	function debounce(func: Function, wait: number) {
		let timeout: NodeJS.Timeout;
		return function executedFunction(...args: any[]) {
			const later = () => {
				clearTimeout(timeout);
				func(...args);
			};
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
		};
	}

	// Improved device capability checking
	// In Game.svelte

	function calculateScale() {
		if (!gameContainer || !browser || !mounted) return;

		const containerWidth = gameContainer.clientWidth;
		const containerHeight = gameContainer.clientHeight;

		// Mobile-specific scale adjustment
		const isMobile = window.innerWidth < 768; // Adjust breakpoint as needed
		const mobileScaleFactor = isMobile ? 0.95 : 0.8; // Larger scale for mobile
		const currentScaleFactor = isMobile ? mobileScaleFactor : scaleFactor;

		const availableWidth = containerWidth * currentScaleFactor;
		const availableHeight = containerHeight * currentScaleFactor;

		const widthScale = availableWidth / GAME_WIDTH;
		const heightScale = availableHeight / GAME_HEIGHT;

		// Use the smaller scale to maintain aspect ratio
		scale = Math.min(widthScale, heightScale);

		// Enforce minimum scale for readability
		scale = Math.max(scale, 0.5);

		const wrapper = gameContainer.querySelector('.game-scale-wrapper');
		if (wrapper) {
			wrapper.style.transform = `scale(${scale})`;
			wrapper.style.transformOrigin = 'center center';
			wrapper.style.width = `${GAME_WIDTH}px`;
			wrapper.style.height = `${GAME_HEIGHT}px`;
		}
	}

	// Debounced resize handler
	const handleResize = debounce(() => {
		if (!browser || !mounted) return;
		calculateScale();
	}, 100);

	onMount(() => {
		if (!browser) return;

		mounted = true;
		console.log('[Game] Component mounted');

		if (canvas) {
			try {
				setupGame(canvas);
				calculateScale();
			} catch (error) {
				console.error('[Game] Game initialization error:', error);
			}

			// Handle orientation changes
			window.addEventListener('orientationchange', () => {
				setTimeout(handleResize, 100);
			});

			// Handle resize events
			window.addEventListener('resize', handleResize);
		}
	});

	onDestroy(() => {
		if (!browser) return;
		window.removeEventListener('resize', handleResize);
		mounted = false;
	});
</script>

<div
	class="game-wrapper relative w-full h-full flex items-center justify-center"
	bind:this={gameContainer}
>
	<!-- Size Control Button -->
	<button
		class="size-control-toggle hidden lg:block"
		on:click={() => (showSizeControl = !showSizeControl)}
		in:fade={{ duration: 300 }}
	>
		<span class="arcade-text flex items-center justify-center">
			<Cog class="mr-2" size={12} />
			<p class="mt-1">SIZE</p>
		</span>
	</button>

	<!-- Size Control Panel -->
	{#if showSizeControl}
		<div
			class="size-control-panel hidden lg:block"
			in:fade={{ duration: 300 }}
			out:fade={{ duration: 200 }}
		>
			<div class="size-options">
				{#each [0.5, 0.6, 0.7, 0.8, 0.9] as size}
					<button
						class="size-option"
						class:active={scaleFactor === size}
						on:click={() => adjustSize(size)}
					>
						{size * 100}%
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<div class="game-scale-wrapper flex justify-center items-center">
		<div class="game-container" in:fade={{ duration: 800 }}>
			<div id="reflection" class="absolute inset-0 pointer-events-none z-[3]" />
			<canvas
				bind:this={canvas}
				id="gameCanvas"
				width={GAME_WIDTH}
				height={GAME_HEIGHT}
				class="canvas-pixel-art"
			/>
			<div id="scanline-overlay" class="absolute inset-0 pointer-events-none z-10" />
			<div class="neon-glow" />
		</div>
	</div>
</div>

<style>
	.size-control-toggle {
		position: absolute;
		top: 1rem;
		right: 1rem;
		background: rgba(43, 43, 43, 0.7);
		border: 1px solid var(--arcade-neon-green-200);
		border-radius: 4px;
		padding: 0.45rem 0.65rem;
		color: var(--arcade-neon-green-100);
		font-family: 'Press Start 2P', monospace;
		font-size: 0.5625rem;
		cursor: pointer;
		z-index: 100;
		transition: all 0.3s ease;
	}

	.size-control-toggle:hover {
		background: rgba(39, 255, 153, 0.1);
		box-shadow: 0 0 10px rgba(39, 255, 153, 0.3);
	}

	.size-control-panel {
		position: absolute;
		top: 4rem;
		right: 1rem;
		background: rgba(43, 43, 43, 0.7);
		border: 1px solid var(--arcade-neon-green-200);
		border-radius: 4px;
		padding: 0.65rem;
		z-index: 100;
		box-shadow: 0 0 20px rgba(39, 255, 153, 0.2);
	}

	.size-options {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.size-option {
		font-family: 'Press Start 2P', monospace;
		font-size: 0.625rem;
		padding: 0.45rem 0.65rem;
		background: transparent;
		border: 1px solid var(--arcade-neon-green-100);
		color: var(--arcade-neon-green-100);
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.size-option:hover {
		background: rgba(39, 255, 153, 0.1);
	}

	.size-option.active {
		background: var(--arcade-neon-green-200);
		color: rgb(26, 26, 26);
	}

	.game-wrapper {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		position: relative;
		padding: 0;
	}

	.game-scale-wrapper {
		transform-origin: center center;
		will-change: transform;
		position: relative;
		width: 100%;
		height: 100%;
	}

	.game-container {
		position: relative;
		width: 800px;
		height: 600px;
		background: black;
		border-radius: 20px;
		outline: 6px solid rgba(34, 34, 34, 0.9);
		box-shadow:
			inset 0 0 50px rgba(0, 0, 0, 0.5),
			0 0 30px rgba(0, 0, 0, 0.3);
		overflow: hidden;
		transform-origin: center;
	}

	.canvas-pixel-art {
		image-rendering: pixelated;
		image-rendering: crisp-edges;
		background: black;
		position: relative;
		z-index: 1;
		width: 100%;
		height: 100%;
	}

	#scanline-overlay {
		background: linear-gradient(0deg, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0.1) 51%);
		background-size: 100% 4px;
		animation: scanline 0.2s linear infinite;
	}

	#reflection {
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 20%);
		border-radius: 20px;
	}

	.neon-glow {
		position: absolute;
		inset: -2px;
		border-radius: 24px;
		background: transparent;
		border: 2px solid rgba(39, 255, 153, 0.2);
		box-shadow:
			0 0 10px rgba(39, 255, 153, 0.3),
			inset 0 0 10px rgba(39, 255, 153, 0.3);
		pointer-events: none;
		z-index: 2;
	}

	@media (max-width: 1023px) {
		.game-container {
			border-radius: 12px;
			outline: 4px solid rgba(34, 34, 34, 0.9);
			/* Add specific mobile adjustments */
			margin: 1rem;
		}

		.game-wrapper {
			padding: 1rem;
		}
		.game-scale-wrapper {
			display: flex;
			align-items: center;
			justify-content: center;
		}

		.neon-glow {
			border-radius: 14px;
		}
	}

	@keyframes scanline {
		0% {
			background-position: 0 0;
		}
		100% {
			background-position: 0 4px;
		}
	}

	/* ADD orientation-specific adjustments */
	@media (orientation: portrait) and (max-width: 1023px) {
		.game-wrapper {
			height: calc(100% - 120px); /* Account for controls */
		}
	}

	@media (orientation: landscape) and (max-width: 1023px) {
		.game-wrapper {
			height: calc(100vh - var(--controls-height-landscape));
			padding-right: 0; /* Remove the 250px padding */
		}
	}
</style>

<!-- Game.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { fade, fly } from 'svelte/transition';
	import { Gear } from 'svelte-bootstrap-icons';
	import GameControls from './GameControls.svelte';
	import { setupGame } from '$lib/game.js';

	let canvas: HTMLCanvasElement;
	let container: HTMLDivElement;
	let scale = 1;
	let showSizeControl = false;
	let scaleFactor = 0.9; // Default size

	const GAME_WIDTH = 800;
	const GAME_HEIGHT = 600;
	const ASPECT_RATIO = GAME_WIDTH / GAME_HEIGHT;

	let isTouchDevice = false;

	// Add this function to handle control events from GameControls
	function handleControlInput(event) {
		const { detail } = event;
		const { type, button, value } = detail;

		if (type === 'joystick') {
			// Handle joystick input
			if (value.x < -0.5) {
				// Simulate left arrow key down
				const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
				window.dispatchEvent(event);
			} else if (value.x > 0.5) {
				// Simulate right arrow key down
				const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
				window.dispatchEvent(event);
			} else {
				// Release arrow keys
				const leftEvent = new KeyboardEvent('keyup', { key: 'ArrowLeft' });
				const rightEvent = new KeyboardEvent('keyup', { key: 'ArrowRight' });
				window.dispatchEvent(leftEvent);
				window.dispatchEvent(rightEvent);
			}

			// Handle vertical movement (jump)
			if (value.y < -0.5) {
				const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
				window.dispatchEvent(event);
			}
		} else if (type === 'button') {
			// Handle button presses
			const keyMap = {
				ammo: ' ', // Space bar for normal shot
				heatseeker: 'x', // X for heat seeker
				pause: 'p',
				enter: 'Enter'
			};

			const key = keyMap[button];
			if (key) {
				const eventType = value ? 'keydown' : 'keyup';
				const event = new KeyboardEvent(eventType, { key });
				window.dispatchEvent(event);
			}
		}
	}

	function calculateScale() {
		if (!container) return;

		const containerWidth = container.clientWidth;
		const containerHeight = container.clientHeight;
		const isLandscape = window.innerWidth > window.innerHeight;

		// Adjust scale factor based on device orientation and screen size
		const currentScaleFactor =
			window.innerWidth < 1024
				? isLandscape
					? 0.85
					: 0.95 // Mobile/tablet scales
				: scaleFactor; // Desktop scale

		// Add padding adjustment for controls in landscape mode
		const landscapePadding = isLandscape ? 80 : 0; // Account for control height in landscape

		// Calculate available space while maintaining aspect ratio
		const availableWidth = containerWidth * currentScaleFactor;
		const availableHeight = (containerHeight - landscapePadding) * currentScaleFactor;

		// Determine which dimension is limiting
		const widthScale = availableWidth / GAME_WIDTH;
		const heightScale = availableHeight / GAME_HEIGHT;

		// Use the smaller scale to ensure the game fits
		scale = Math.min(widthScale, heightScale);

		// For landscape mode on mobile, ensure minimum scale
		if (isLandscape && window.innerWidth < 1024) {
			const minScale = 0.6; // Minimum scale factor for landscape
			scale = Math.max(scale, minScale);
		}

		// Apply the scale
		const wrapper = container.querySelector('.game-scale-wrapper');
		if (wrapper) {
			wrapper.style.transform = `scale(${scale})`;
			wrapper.style.transformOrigin = 'center center';

			// Set wrapper dimensions to maintain aspect ratio
			wrapper.style.width = `${GAME_WIDTH}px`;
			wrapper.style.height = `${GAME_HEIGHT}px`;
		}
	}

	function adjustSize(newSize) {
		scaleFactor = newSize;
		calculateScale();
	}

	let resizeObserver;

	onMount(() => {
		if (browser && canvas) {
			setupGame(canvas);
			calculateScale();

			// Check for touch device
			isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

			// Add orientation change handler
			window.addEventListener('orientationchange', () => {
				setTimeout(calculateScale, 100); // Small delay to ensure new dimensions are available
			});

			// Create resize observer
			resizeObserver = new ResizeObserver(calculateScale);
			resizeObserver.observe(container);
		}
	});

	onDestroy(() => {
		if (resizeObserver) {
			resizeObserver.disconnect();
		}
	});
</script>

<div
	class="game-wrapper relative w-full h-full flex items-center justify-center overflow-hidden"
	bind:this={container}
>
	<!-- Size Control Button -->
	<button
		class="size-control-toggle hidden lg:block"
		on:click={() => (showSizeControl = !showSizeControl)}
		in:fade={{ duration: 300 }}
	>
		<span class="arcade-text flex items-center justify-center">
			<Gear width={12} class="mr-2" />
			<p class="mt-1">SIZE</p>
		</span>
	</button>

	<!-- Size Control Panel -->
	{#if showSizeControl}
		<div
			class="size-control-panel hidden lg:block"
			in:fly={{ y: 20, duration: 300 }}
			out:fly={{ y: 20, duration: 200 }}
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
		<div
			class="game-container"
			in:fade={{ duration: 800 }}
			style="width: {GAME_WIDTH}px; height: {GAME_HEIGHT}px;"
		>
			<div id="reflection" class="absolute inset-0 pointer-events-none z-[3]"></div>
			<canvas
				bind:this={canvas}
				id="gameCanvas"
				width={GAME_WIDTH}
				height={GAME_HEIGHT}
				class="canvas-pixel-art"
			></canvas>
			<div id="scanline-overlay" class="absolute inset-0 pointer-events-none z-10"></div>
			<div class="neon-glow"></div>
		</div>
	</div>

	<!-- Mobile Controls -->
	{#if isTouchDevice && window.innerWidth < 1024}
		<GameControls on:control={handleControlInput} />
	{/if}
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
		border: 1px solid var(--arcade-neon-green-1XXAA00);
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
		/* Remove padding to prevent offset */
		padding: 0;
	}

	.game-scale-wrapper {
		transform-origin: center center;
		will-change: transform;
		/* Ensure proper centering */
		position: relative;
		width: 100%;
		height: 100%;
	}

	.game-container {
		position: relative;
		width: 800px;
		height: 600px;
		background: black;
		/* Slightly curved corners like old CRT screens */
		border-radius: 20px;
		/* Inset border effect */
		outline: 6px solid rgba(34, 34, 34, 0.9);
		/* Subtle inner shadow for depth */
		box-shadow:
			inset 0 0 50px rgba(0, 0, 0, 0.5),
			0 0 30px rgba(0, 0, 0, 0.3);
		/* Ensure content stays within bounds */
		overflow: hidden;
	}

	.canvas-pixel-art {
		image-rendering: pixelated;
		image-rendering: crisp-edges;
		background: black;
		position: relative;
		z-index: 1;
	}

	#scanline-overlay {
		background: linear-gradient(0deg, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0.1) 51%);
		background-size: 100% 4px;
		animation: scanline 0.2s linear infinite;
	}

	@keyframes scanline {
		0% {
			background-position: 0 0;
		}
		100% {
			background-position: 0 4px;
		}
	}

	#reflection {
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 20%);
		border-radius: 20px;
		/* z-index: 3; */
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
	/* Add padding at the bottom on touch devices to make room for controls */
	@media (max-width: 1023px) {
		.game-container {
			border-radius: 12px;
			outline: 4px solid rgba(34, 34, 34, 0.9);
		}

		.neon-glow {
			border-radius: 14px;
		}
	}

	@media (max-width: 1023px) and (pointer: coarse) {
		.game-wrapper {
			padding-bottom: 120px;
		}
	}

	@media (max-width: 1023px) and (orientation: landscape) {
		.game-wrapper {
			padding-bottom: 80px; /* Less padding in landscape */
		}
	}

	/* Add new mobile optimizations */
	@media (max-width: 1023px) {
		.game-wrapper {
			--controls-height: 180px;
			height: calc(100% - var(--controls-height));
		}
	}
</style>

<!-- src/lib/components/Game.svelte -->
<script>
	import { onMount, onDestroy } from 'svelte';
	import { setupGame } from '$lib/game.js';
	import { fade, fly } from 'svelte/transition';
	import { Gear } from 'svelte-bootstrap-icons';

	let canvas;
	let container;
	let scale = 1;
	let showSizeControl = false;
	let scaleFactor = 0.9; // Default size

	const GAME_WIDTH = 800;
	const GAME_HEIGHT = 600;
	const ASPECT_RATIO = GAME_WIDTH / GAME_HEIGHT;

	function calculateScale() {
		if (!container) return;

		const containerWidth = container.clientWidth;
		const containerHeight = container.clientHeight;

		const widthScale = (containerWidth * scaleFactor) / GAME_WIDTH;
		const heightScale = (containerHeight * scaleFactor) / GAME_HEIGHT;

		scale = Math.min(widthScale, heightScale, 1);

		const wrapper = container.querySelector('.game-scale-wrapper');
		if (wrapper) {
			wrapper.style.transform = `scale(${scale})`;
		}
	}

	function adjustSize(newSize) {
		scaleFactor = newSize;
		calculateScale();
	}

	let resizeObserver;

	onMount(() => {
		if (canvas) {
			setupGame(canvas);
			calculateScale();

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
		class="size-control-toggle"
		on:click={() => (showSizeControl = !showSizeControl)}
		in:fade={{ duration: 300 }}
	>
		<span class="arcade-text flex items-center justify-center"
			><Gear size={8} class="mr-2" />
			<p class="mt-1">SIZE</p></span
		>
	</button>

	<!-- Size Control Panel -->
	{#if showSizeControl}
		<div
			class="size-control-panel"
			in:fly={{ y: 20, duration: 300 }}
			out:fly={{ y: 20, duration: 200 }}
		>
			<div class="size-options">
				<button
					class="size-option"
					class:active={scaleFactor === 0.5}
					on:click={() => adjustSize(0.5)}
				>
					50%
				</button>
				<button
					class="size-option"
					class:active={scaleFactor === 0.6}
					on:click={() => adjustSize(0.6)}
				>
					60%
				</button>
				<button
					class="size-option"
					class:active={scaleFactor === 0.7}
					on:click={() => adjustSize(0.7)}
				>
					70%
				</button>
				<button
					class="size-option"
					class:active={scaleFactor === 0.8}
					on:click={() => adjustSize(0.8)}
				>
					80%
				</button>
				<button
					class="size-option"
					class:active={scaleFactor === 0.9}
					on:click={() => adjustSize(0.9)}
				>
					90%
				</button>
			</div>
		</div>
	{/if}

	<div class="game-scale-wrapper">
		<div
			class="game-container"
			in:fade={{ duration: 800 }}
			style="width: {GAME_WIDTH}px; height: {GAME_HEIGHT}px;"
		>
			<div id="reflection" class="absolute inset-0 pointer-events-none z-[11]"></div>
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
</div>

<style>
	.size-control-toggle {
		position: absolute;
		top: 1rem;
		right: 1rem;
		background: rgba(43, 43, 43, 0.7);
		border: 1px solid var(--arcade-neon-green-500);
		border-radius: 4px;
		padding: 0.5rem 1rem;
		color: var(--arcade-neon-green-500);
		font-family: 'Press Start 2P', monospace;
		font-size: 0.7rem;
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
		border: 1px solid var(--arcade-neon-green-500);
		border-radius: 4px;
		padding: 1rem;
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
		font-size: 0.7rem;
		padding: 0.5rem 1rem;
		background: transparent;
		border: 1px solid var(--arcade-neon-green-500);
		color: var(--arcade-neon-green-500);
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.size-option:hover {
		background: rgba(39, 255, 153, 0.1);
	}

	.size-option.active {
		background: var(--arcade-neon-green-500);
		color: black;
	}

	.game-wrapper {
		padding: 2rem;
		box-sizing: border-box;
	}

	.game-scale-wrapper {
		transform-origin: center center;
		will-change: transform;
		display: flex;
		align-items: center;
		justify-content: center;
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
		border-radius: 4vmin;
		z-index: 1;
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
</style>

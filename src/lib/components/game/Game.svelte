<!-- src/lib/components/Game.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { fade } from 'svelte/transition';
	import { Cog } from 'lucide-svelte';
	import { setupGame } from './game.js';
	import { get } from 'svelte/store';
	import { writable } from 'svelte/store';

	const deviceState = writable({
		isTouchDevice: false,
		windowWidth: 0,
		showControls: false
	});

	const gameState = writable({
		animationFrame: null
	});

	function detectDevice() {
		if (!browser) return;
		const isMobile =
			/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
			(navigator.maxTouchPoints && navigator.maxTouchPoints > 2);

		deviceState.update((state) => ({
			...state,
			isTouchDevice: isMobile,
			windowWidth: window.innerWidth
		}));
	}

	let canvas: HTMLCanvasElement;
	let gameContainer: HTMLDivElement;
	let scale = 1;
	let scaleFactor = 0.9;
	let controlsPosition = { x: 0, y: 0 };
	let mounted = false;

	const GAME_WIDTH = 800;
	const GAME_HEIGHT = 600;

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

	function calculateScale() {
		if (!gameContainer || !browser || !mounted) return;

		const containerWidth = gameContainer.clientWidth;
		const containerHeight = gameContainer.clientHeight;

		const isMobile = get(deviceState).isTouchDevice;
		const mobileScaleFactor = isMobile ? 0.98 : 0.8; // Increased from 0.95 to 0.98 for mobile
		const currentScaleFactor = isMobile ? mobileScaleFactor : scaleFactor;

		// Account for padding in available space calculation
		const padding = isMobile ? 32 : 0; // 2rem (32px) padding on mobile
		const availableWidth = (containerWidth - padding) * currentScaleFactor;
		const availableHeight = (containerHeight - padding) * currentScaleFactor;

		const widthScale = availableWidth / GAME_WIDTH;
		const heightScale = availableHeight / GAME_HEIGHT;

		// Use the smaller scale to maintain aspect ratio
		scale = Math.min(widthScale, heightScale);

		// Ensure minimum scale for visibility
		scale = Math.max(scale, isMobile ? 0.3 : 0.5);

		const wrapper = gameContainer.querySelector('.game-scale-wrapper');
		if (wrapper) {
			wrapper.style.transform = `scale(${scale})`;
			wrapper.style.transformOrigin = 'center center';
			wrapper.style.width = `${GAME_WIDTH}px`;
			wrapper.style.height = `${GAME_HEIGHT}px`;
		}
	}

	function handleOrientation() {
		if (!browser || !mounted) return;
		setTimeout(handleResize, 100);
	}

	const handleResize = debounce(() => {
		if (!browser || !mounted) return;
		detectDevice();
		calculateScale();
	}, 100);

	function handleControlInput(event) {
		const { detail } = event;

		if (detail.type === 'joystick') {
			const { x, y } = detail.value;
			if (Math.abs(x) > 0.5) {
				window.dispatchEvent(
					new KeyboardEvent('keydown', { key: x > 0 ? 'ArrowRight' : 'ArrowLeft' })
				);
			}
			if (y < -0.5) {
				window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
			}
		} else if (detail.type === 'button') {
			const keyMap = {
				ammo: ' ',
				heatseeker: 'x',
				pause: 'p',
				enter: 'Enter'
			};

			if (keyMap[detail.button]) {
				window.dispatchEvent(
					new KeyboardEvent(detail.value ? 'keydown' : 'keyup', { key: keyMap[detail.button] })
				);
			}
		}
	}

	onMount(() => {
		if (!browser) return;

		mounted = true;
		console.log('[Game] Component mounted');

		detectDevice();

		if (canvas) {
			try {
				setupGame(canvas);
				calculateScale();
			} catch (error) {
				console.error('[Game] Game initialization error:', error);
			}

			window.addEventListener('orientationchange', handleOrientation);
			window.addEventListener('resize', handleResize);
		}
	});

	onDestroy(() => {
		if (!browser) return;

		if (canvas) {
			canvas.removeEventListener('touchstart', (e) => e.preventDefault());
			canvas.removeEventListener('touchmove', (e) => e.preventDefault());
			canvas.removeEventListener('touchend', (e) => e.preventDefault());
		}

		const currentDeviceState = get(deviceState);
		const currentGameState = get(gameState);

		if (currentDeviceState.isTouchDevice) {
			document.body.style.removeProperty('overflow');
			document.body.style.removeProperty('position');
			document.body.style.removeProperty('width');
			document.documentElement.style.removeProperty('position');
			document.documentElement.style.removeProperty('width');
		}

		if (currentGameState.animationFrame) {
			cancelAnimationFrame(currentGameState.animationFrame);
		}

		window.removeEventListener('resize', handleResize);
		window.removeEventListener('orientationchange', handleOrientation);

		mounted = false;
	});
</script>

<div
	class="game-wrapper relative w-full h-full flex items-center justify-center p-4 md:p-0"
	bind:this={gameContainer}
>
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
	/* Base Layout Styles */
	.game-wrapper {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		position: relative;
		overflow: hidden;
	}

	.game-scale-wrapper {
		transform-origin: center center;
		will-change: transform;
		position: relative;
		width: 100%;
		height: 100%;
		overflow: visible;
	}

	.game-container {
		position: relative;
		width: 800px;
		height: 600px;
		background: black;
		border-radius: 20px;
		outline: 6px solid var(--dark-mode-bg);
		box-shadow:
			inset 0 0 50px rgba(0, 0, 0, 0.5),
			0 0 30px rgba(0, 0, 0, 0.3);
		overflow: hidden;
		transform-origin: center;
	}

	/* Add light mode styles */
	:global(.light) .game-container {
		outline: 6px solid var(--light-mode-bg);
	}

	/* Canvas Styles */
	canvas {
		display: block;
		margin: 0 auto;
		position: relative;
	}

	.canvas-pixel-art {
		image-rendering: pixelated;
		image-rendering: crisp-edges;
		background: black;
		position: relative;
		z-index: 1;
	}

	/* Visual Effects */
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

	/* Animations */
	@keyframes scanline {
		0% {
			background-position: 0 0;
		}
		100% {
			background-position: 0 4px;
		}
	}

	/* Media Queries */
	@media (max-width: 1023px) {
		.game-container {
			border-radius: 12px;
			outline: 6px solid var(--dark-mode-bg);
			margin: 0;
			height: auto;
			width: 100%;
		}

		:global(.light) .game-container {
			outline: 6px solid var(--light-mode-bg);
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

	@media (orientation: portrait) and (max-width: 1023px) {
		.game-wrapper {
			height: calc(100% - 120px);
		}
	}

	@media (orientation: landscape) and (max-width: 1023px) {
		.game-wrapper {
			height: calc(100vh - var(--controls-height-landscape));
			padding-right: 0;
		}
	}
</style>

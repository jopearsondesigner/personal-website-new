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

	// Create a dedicated error state store
	const errorState = writable({
		hasError: false,
		message: '',
		details: '',
		timestamp: 0,
		isVisible: false,
		dismissible: false,
		level: 'error' // 'error', 'warning', 'info'
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
	let errorContainer: HTMLDivElement;
	let scale = 1;
	let scaleFactor = 0.9;
	let controlsPosition = { x: 0, y: 0 };
	let mounted = false;
	let errorTimeout: NodeJS.Timeout;
	let gameInstance: any;

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

	// New function to handle game errors
	function handleGameError(
		error: Error | string,
		level: 'error' | 'warning' | 'info' = 'error',
		dismissible = true,
		timeout = 5000
	) {
		console.error('[Game] Error occurred:', error);

		// Format error message
		const errorMessage = typeof error === 'string' ? error : error.message;
		const errorDetails = typeof error === 'string' ? '' : error.stack;

		// Update error state
		errorState.update((state) => ({
			hasError: true,
			message: errorMessage,
			details: errorDetails,
			timestamp: Date.now(),
			isVisible: true,
			dismissible,
			level
		}));

		// Clear any existing timeout
		if (errorTimeout) {
			clearTimeout(errorTimeout);
		}

		// Auto-dismiss non-critical errors after timeout
		if (timeout > 0) {
			errorTimeout = setTimeout(() => {
				dismissError();
			}, timeout);
		}

		return error;
	}

	function dismissError() {
		errorState.update((state) => ({
			...state,
			isVisible: false
		}));
	}

	// Try to initialize the game, with proper error handling
	async function initializeGame() {
		if (!canvas || !browser) return;

		try {
			// Setup the game with custom error handler
			gameInstance = await setupGame(canvas);
			calculateScale();
		} catch (error) {
			handleGameError(`Game initialization failed: ${error.message}`, 'error', true, 0);
		}
	}

	onMount(() => {
		if (!browser) return;

		mounted = true;
		console.log('[Game] Component mounted');

		detectDevice();

		// Setup global error handler for runtime errors
		window.addEventListener('error', (e) => {
			// Only handle game-related errors
			if (e.message.includes('game') || e.filename.includes('game')) {
				handleGameError(e.error || e.message);
				e.preventDefault(); // Prevent default error handling
			}
		});

		// Initialize the game
		initializeGame().catch((err) => {
			handleGameError(`Failed to start game: ${err.message}`);
		});

		window.addEventListener('orientationchange', handleOrientation);
		window.addEventListener('resize', handleResize);
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

		if (errorTimeout) {
			clearTimeout(errorTimeout);
		}

		mounted = false;
	});

	// Reactive statement to handle error state changes
	$: if ($errorState.isVisible && errorContainer) {
		// Ensure error container is visible and positioned correctly
		errorContainer.style.opacity = '1';
		errorContainer.style.transform = 'translateY(0)';
	} else if (errorContainer) {
		errorContainer.style.opacity = '0';
		errorContainer.style.transform = 'translateY(-20px)';
	}
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

			<!-- Error message overlay -->
			{#if $errorState.isVisible}
				<div
					class="error-container {$errorState.level}"
					bind:this={errorContainer}
					transition:fade={{ duration: 300 }}
				>
					<div class="error-content">
						<div class="error-header">
							<span class="error-icon">
								{#if $errorState.level === 'error'}⚠️{:else if $errorState.level === 'warning'}⚠{:else}ℹ️{/if}
							</span>
							<span class="error-title">
								{#if $errorState.level === 'error'}Game Error{:else if $errorState.level === 'warning'}Warning{:else}Information{/if}
							</span>
							{#if $errorState.dismissible}
								<button class="error-close" on:click={dismissError}>×</button>
							{/if}
						</div>
						<div class="error-message">
							{$errorState.message}
						</div>
						{#if $errorState.details}
							<div class="error-details">
								<details>
									<summary>Details</summary>
									<pre>{$errorState.details}</pre>
								</details>
							</div>
						{/if}
					</div>
				</div>
			{/if}
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

	/* Error Styling */
	.error-container {
		position: absolute;
		top: 20px;
		left: 50%;
		transform: translateX(-50%) translateY(-20px);
		min-width: 320px;
		max-width: 640px;
		background-color: rgba(0, 0, 0, 0.85);
		border-radius: 8px;
		backdrop-filter: blur(4px);
		z-index: 100;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
		transition: all 0.3s ease;
		opacity: 0;
	}

	.error-container.error {
		border-left: 4px solid #e74c3c;
	}

	.error-container.warning {
		border-left: 4px solid #f39c12;
	}

	.error-container.info {
		border-left: 4px solid #3498db;
	}

	.error-content {
		padding: 12px 16px;
	}

	.error-header {
		display: flex;
		align-items: center;
		margin-bottom: 8px;
	}

	.error-icon {
		margin-right: 8px;
	}

	.error-title {
		font-weight: bold;
		font-size: 16px;
		flex-grow: 1;
		color: #fff;
	}

	.error-close {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.6);
		font-size: 20px;
		cursor: pointer;
		padding: 0 4px;
		line-height: 1;
	}

	.error-close:hover {
		color: #fff;
	}

	.error-message {
		color: rgba(255, 255, 255, 0.9);
		margin-bottom: 8px;
		font-size: 14px;
		line-height: 1.4;
	}

	.error-details {
		font-size: 12px;
		color: rgba(255, 255, 255, 0.7);
		background: rgba(0, 0, 0, 0.3);
		border-radius: 4px;
		padding: 4px;
	}

	.error-details summary {
		cursor: pointer;
		padding: 4px;
	}

	.error-details pre {
		white-space: pre-wrap;
		word-break: break-all;
		max-height: 120px;
		overflow-y: auto;
		padding: 8px;
		margin: 4px 0;
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

		.error-container {
			min-width: 80%;
			max-width: 90%;
			top: 10px;
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

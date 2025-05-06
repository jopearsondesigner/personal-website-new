<!-- src/lib/components/game/Game.svelte -->
<script lang="ts">
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { browser } from '$app/environment';
	import { fade } from 'svelte/transition';
	import { writable, get } from 'svelte/store';
	import { gameStore } from '$lib/stores/game-store';
	import type { GameState, GameData } from '$lib/types/game';

	const dispatch = createEventDispatcher();

	// Declare the global window property for TypeScript
	declare global {
		interface Window {
			gameStoreUpdater: (gameData: any) => void;
			isPaused?: boolean;
		}
	}

	// Consolidated state management
	const deviceState = writable({
		isTouchDevice: false,
		windowWidth: 0,
		showControls: false
	});

	const errorState = writable({
		hasError: false,
		message: '',
		details: '',
		timestamp: 0,
		isVisible: false,
		dismissible: false,
		level: 'error' // 'error', 'warning', 'info'
	});

	let canvas: HTMLCanvasElement;
	let gameContainer: HTMLDivElement;
	let errorContainer: HTMLDivElement;
	let scale = 1;
	let mounted = false;
	let errorTimeout: ReturnType<typeof setTimeout>;
	let gameInstance: any;
	let isInitializing = true;
	let gameModule: any = null;

	const GAME_WIDTH = 800;
	const GAME_HEIGHT = 600;

	// Optimized device detection using a single function that runs once
	function detectDevice() {
		if (!browser) return;

		const isMobile =
			/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
			(navigator.maxTouchPoints && navigator.maxTouchPoints > 2);

		deviceState.set({
			isTouchDevice: isMobile,
			windowWidth: window.innerWidth,
			showControls: isMobile || window.innerWidth < 1024
		});
	}

	// Optimized debounce function
	function debounce(func: Function, wait: number) {
		let timeout: ReturnType<typeof setTimeout>;
		return function executedFunction(...args: any[]) {
			clearTimeout(timeout);
			timeout = setTimeout(() => func(...args), wait);
		};
	}

	// Optimized scale calculation with improved performance characteristics
	function calculateScale() {
		if (!gameContainer || !browser || !mounted) return;

		const containerWidth = gameContainer.clientWidth;
		const containerHeight = gameContainer.clientHeight;
		const isMobile = get(deviceState).isTouchDevice;

		// Use a single scale factor
		const currentScaleFactor = isMobile ? 0.98 : 0.98;
		const padding = isMobile ? 16 : 0;

		const availableWidth = (containerWidth - padding) * currentScaleFactor;
		const availableHeight = (containerHeight - padding) * currentScaleFactor;

		// Calculate scale once
		scale = Math.min(availableWidth / GAME_WIDTH, availableHeight / GAME_HEIGHT);

		// Ensure minimum scale for visibility
		scale = Math.max(scale, isMobile ? 0.4 : 0.5);

		// Single DOM update
		const wrapper = gameContainer?.querySelector('.game-scale-wrapper');
		if (wrapper) {
			(wrapper as HTMLElement).style.cssText = `
				transform: scale(${scale});
				transform-origin: center center;
				width: ${GAME_WIDTH}px;
				height: ${GAME_HEIGHT}px;
			`;
		}
	}

	// Efficient event handlers
	const handleResize = debounce(() => {
		if (!browser || !mounted) return;
		calculateScale();
	}, 100);

	function handleOrientation() {
		if (!browser || !mounted) return;
		setTimeout(handleResize, 100);
	}

	function handleControlInput(event: CustomEvent) {
		const { detail } = event;
		const keyEvent = detail.value ? 'keydown' : 'keyup';

		if (detail.type === 'joystick') {
			const { x, y } = detail.value;
			if (Math.abs(x) > 0.5) {
				window.dispatchEvent(
					new KeyboardEvent(keyEvent, { key: x > 0 ? 'ArrowRight' : 'ArrowLeft' })
				);
			}
			if (y < -0.5) {
				window.dispatchEvent(new KeyboardEvent(keyEvent, { key: 'ArrowUp' }));
			}
		} else if (detail.type === 'button') {
			const keyMap = {
				ammo: ' ',
				heatseeker: 'x',
				pause: 'p',
				enter: 'Enter'
			};

			if (keyMap[detail.button]) {
				window.dispatchEvent(new KeyboardEvent(keyEvent, { key: keyMap[detail.button] }));
			}
		}
	}

	// Game state management
	function dispatchGameState() {
		if (!browser) return;

		// Get the current game state from the gameStore
		const gameData = get(gameStore);
		let currentState = 'idle';

		// Determine the current state based on game conditions
		if (gameData.isGameOver) {
			currentState = 'gameover';
		} else if (gameData.isPaused) {
			currentState = 'paused';
		} else if (gameData.gameActive) {
			currentState = 'playing';
		}

		// Dispatch the state change event
		dispatch('stateChange', { state: currentState });
	}

	// Error handling with improved management
	function handleGameError(
		error: Error | string,
		level: 'error' | 'warning' | 'info' = 'error',
		dismissible = true,
		timeout = 5000
	) {
		console.error('[Game] Error occurred:', error);

		// Clear any existing timeout
		if (errorTimeout) {
			clearTimeout(errorTimeout);
		}

		// Format error message
		const errorMessage = typeof error === 'string' ? error : error.message;
		const errorDetails = typeof error === 'string' ? '' : error.stack;

		// Update error state in a single operation
		errorState.set({
			hasError: true,
			message: errorMessage,
			details: errorDetails,
			timestamp: Date.now(),
			isVisible: true,
			dismissible,
			level
		});

		// Also update game store to pause the game
		gameStore.setPaused(true);

		// Auto-dismiss non-critical errors after timeout
		if (timeout > 0) {
			errorTimeout = setTimeout(dismissError, timeout);
		}

		return error;
	}

	function dismissError() {
		errorState.update((state) => ({
			...state,
			isVisible: false
		}));
	}

	// Dynamic import of game module
	async function loadGameModule() {
		try {
			// Dynamic import only when needed
			const module = await import('./game.js');
			gameModule = module;
			return module;
		} catch (error) {
			handleGameError(`Failed to load game module: ${error.message}`, 'error', true, 0);
			throw error;
		}
	}

	// Optimized game initialization
	async function initializeGame() {
		if (!canvas || !browser) return;

		try {
			if (!gameModule) {
				// Only load the module if not already loaded
				gameModule = await loadGameModule();
			}

			// Setup the game with custom error handler
			gameInstance = await gameModule.setupGame(canvas);

			// Connect to the game's internal state
			window.gameStoreUpdater = (gameData) => {
				if (gameData) {
					gameStore.updateState(gameData);
					// Use requestAnimationFrame for smoother updates
					requestAnimationFrame(dispatchGameState);
				}
			};

			calculateScale();

			// Add a small delay to ensure all calculations are complete
			setTimeout(() => {
				isInitializing = false;
			}, 50);
		} catch (error) {
			isInitializing = false;
			handleGameError(`Game initialization failed: ${error.message}`, 'error', true, 0);
		}
	}

	// Efficient lifecycle methods
	onMount(() => {
		if (!browser) return;

		mounted = true;
		console.log('[Game] Component mounted');

		// Run once at mount
		detectDevice();

		// Setup global error handler for runtime errors
		const errorHandler = (e: ErrorEvent) => {
			// Only handle game-related errors
			if (e.message?.includes('game') || e.filename?.includes('game')) {
				handleGameError(e.error || e.message);
				e.preventDefault(); // Prevent default error handling
			}
		};

		window.addEventListener('error', errorHandler);
		window.addEventListener('orientationchange', handleOrientation);
		window.addEventListener('resize', handleResize);

		// Initialize the game
		initializeGame().catch((err) => {
			handleGameError(`Failed to start game: ${err.message}`);
		});

		// Return cleanup function for onDestroy
		return () => {
			window.removeEventListener('error', errorHandler);
			window.removeEventListener('orientationchange', handleOrientation);
			window.removeEventListener('resize', handleResize);
		};
	});

	onDestroy(() => {
		if (!browser) return;

		if (canvas) {
			canvas.removeEventListener('touchstart', (e) => e.preventDefault());
			canvas.removeEventListener('touchmove', (e) => e.preventDefault());
			canvas.removeEventListener('touchend', (e) => e.preventDefault());
		}

		if (errorTimeout) {
			clearTimeout(errorTimeout);
		}

		// Clean up global references
		if (window.gameStoreUpdater) {
			window.gameStoreUpdater = null;
		}

		mounted = false;
	});

	// Reactive statement to watch for game state changes
	$: if (browser && $gameStore) {
		dispatchGameState();
	}

	// Reactive statement to handle error state changes
	$: if ($errorState.isVisible && errorContainer) {
		// Use CSS variables for more efficient updates
		errorContainer.style.opacity = '1';
		errorContainer.style.transform = 'translateY(0)';
	} else if (errorContainer) {
		errorContainer.style.opacity = '0';
		errorContainer.style.transform = 'translateY(-20px)';
	}
</script>

<div
	class="game-wrapper relative w-full h-full flex items-center justify-center p-2 md:p-0 {isInitializing
		? 'opacity-0'
		: 'opacity-100 transition-opacity duration-300'}"
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
		border-radius: 16px;
		outline: 4px solid var(--dark-mode-bg);
		box-shadow:
			inset 0 0 50px rgba(0, 0, 0, 0.5),
			0 0 30px rgba(0, 0, 0, 0.3);
		overflow: hidden;
		transform-origin: center;
		will-change: transform;
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
		image-rendering: pixelated;
		image-rendering: crisp-edges;
		-webkit-backface-visibility: hidden;
		backface-visibility: hidden;
		background: black;
		position: relative;
		z-index: 1;
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

	/* Media Queries - simplified and optimized */
	@media (max-width: 1023px) {
		.game-container {
			border-radius: 12px;
			outline: 4px solid var(--dark-mode-bg);
			margin: 0;
		}

		:global(.light) .game-container {
			outline: 4px solid var(--light-mode-bg);
		}

		.game-wrapper {
			padding: 0.5rem;
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
			height: calc(100% - 80px);
		}
	}

	@media (orientation: landscape) and (max-width: 1023px) {
		.game-wrapper {
			height: calc(100vh - var(--controls-height-landscape));
			padding: 0.25rem;
		}
	}
</style>

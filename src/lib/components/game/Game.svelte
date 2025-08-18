<!-- src/lib/components/game/Game.svelte -->

<script lang="ts">
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { browser } from '$app/environment';
	import { fade } from 'svelte/transition';
	import { writable, get, type Writable } from 'svelte/store';
	import { gameStore } from '$lib/stores/game-store';
	import type { GameState, GameData } from '$lib/types/game';

	const dispatch = createEventDispatcher();

	// ------------------------------
	// Typed device state
	// ------------------------------
	type DeviceState = {
		isTouchDevice: boolean;
		windowWidth: number;
		showControls: boolean;
	};

	const deviceState: Writable<DeviceState> = writable({
		isTouchDevice: false,
		windowWidth: 0,
		showControls: false
	});

	// ------------------------------
	// Typed error state
	// ------------------------------
	type ErrorLevel = 'error' | 'warning' | 'info';

	type ErrorState = {
		hasError: boolean;
		message: string;
		details: string;
		timestamp: number;
		isVisible: boolean;
		dismissible: boolean;
		level: ErrorLevel;
	};

	const errorState = writable<ErrorState>({
		hasError: false,
		message: '',
		details: '',
		timestamp: 0,
		isVisible: false,
		dismissible: false,
		level: 'error'
	});

	// ------------------------------
	// Refs & runtime vars
	// ------------------------------
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

	// ------------------------------
	// Device detection
	// ------------------------------
	function detectDevice() {
		if (!browser) return;

		const touchPoints = navigator.maxTouchPoints ?? 0;
		const hasManyTouchPoints = touchPoints > 2;
		const uaIsMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

		const isMobile: boolean = uaIsMobile || hasManyTouchPoints;

		deviceState.set({
			isTouchDevice: isMobile,
			windowWidth: window.innerWidth,
			showControls: isMobile || window.innerWidth < 1024
		});
	}

	// ------------------------------
	// Utilities
	// ------------------------------
	function debounce<T extends (...args: any[]) => void>(func: T, wait: number) {
		let timeout: ReturnType<typeof setTimeout>;
		return function executedFunction(this: unknown, ...args: Parameters<T>) {
			clearTimeout(timeout);
			timeout = setTimeout(() => func.apply(this, args), wait);
		};
	}

	function calculateScale() {
		if (!gameContainer || !browser || !mounted) return;

		const containerWidth = gameContainer.clientWidth;
		const containerHeight = gameContainer.clientHeight;
		const isMobile = get(deviceState).isTouchDevice;

		// Single scale factor (tweak if needed)
		const currentScaleFactor = 0.98;
		const padding = isMobile ? 16 : 0;

		const availableWidth = (containerWidth - padding) * currentScaleFactor;
		const availableHeight = (containerHeight - padding) * currentScaleFactor;

		// Calculate scale once
		scale = Math.min(availableWidth / GAME_WIDTH, availableHeight / GAME_HEIGHT);

		// Ensure minimum scale for visibility
		scale = Math.max(scale, isMobile ? 0.4 : 0.5);

		// Single DOM update
		const wrapper = gameContainer?.querySelector('.game-scale-wrapper') as HTMLElement | null;
		if (wrapper) {
			wrapper.style.cssText = `
				transform: scale(${scale});
				transform-origin: center center;
				width: ${GAME_WIDTH}px;
				height: ${GAME_HEIGHT}px;
			`;
		}
	}

	// ------------------------------
	// Controls typing & handler
	// ------------------------------
	const keyMap = {
		ammo: ' ',
		heatseeker: 'x',
		pause: 'p',
		enter: 'Enter'
	} as const;

	type KeyButton = keyof typeof keyMap;

	type ControlDetail =
		| { type: 'joystick'; value: { x: number; y: number } }
		| { type: 'button'; button: KeyButton; value: boolean };

	const handleResize = debounce(() => {
		if (!browser || !mounted) return;
		calculateScale();
	}, 100);

	function handleOrientation() {
		if (!browser || !mounted) return;
		setTimeout(handleResize, 100);
	}

	function handleControlInput(event: CustomEvent<ControlDetail>) {
		const detail = event.detail;

		// Both joystick/button payloads include a 'value' we use to decide keydown/up
		const keyEvent = (detail as any).value ? 'keydown' : 'keyup';

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
			const btn: KeyButton = detail.button;
			const mapped = keyMap[btn];
			if (mapped) {
				window.dispatchEvent(new KeyboardEvent(keyEvent, { key: mapped }));
			}
		}
	}

	// ------------------------------
	// Game state dispatch
	// ------------------------------
	function dispatchGameState() {
		if (!browser) return;

		const gameData = get(gameStore as unknown as Writable<GameState>);
		let currentState: 'idle' | 'playing' | 'paused' | 'gameover' = 'idle';

		if ((gameData as any).isGameOver) {
			currentState = 'gameover';
		} else if ((gameData as any).isPaused) {
			currentState = 'paused';
		} else if ((gameData as any).gameActive) {
			currentState = 'playing';
		}

		dispatch('stateChange', { state: currentState });
	}

	// ------------------------------
	// Error handling
	// ------------------------------
	function handleGameError(
		error: Error | string,
		level: ErrorLevel = 'error',
		dismissible = true,
		timeout = 5000
	) {
		console.error('[Game] Error occurred:', error);

		if (errorTimeout) {
			clearTimeout(errorTimeout);
		}

		const errorMessage = typeof error === 'string' ? error : error.message;
		const errorDetails = typeof error === 'string' ? '' : (error.stack ?? '');

		errorState.set({
			hasError: true,
			message: errorMessage,
			details: errorDetails,
			timestamp: Date.now(),
			isVisible: true,
			dismissible,
			level
		});

		// Pause game on error if your store exposes setPaused
		// (If not, remove or adapt this call.)
		(gameStore as any).setPaused?.(true);

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

	// ------------------------------
	// Dynamic import & init
	// ------------------------------
	async function loadGameModule() {
		try {
			const module = await import('./game.js');
			gameModule = module;
			return module;
		} catch (error: any) {
			handleGameError(`Failed to load game module: ${error.message}`, 'error', true, 0);
			throw error;
		}
	}

	async function initializeGame() {
		if (!canvas || !browser) return;

		try {
			if (!gameModule) {
				gameModule = await loadGameModule();
			}

			// Setup the game with custom error handler if supported by your module
			gameInstance = await gameModule.setupGame(canvas);

			// Expose an updater the game can call to push state
			window.gameStoreUpdater = (gameData: any) => {
				if (gameData) {
					(gameStore as any).updateState?.(gameData);
					requestAnimationFrame(dispatchGameState);
				}
			};

			calculateScale();

			setTimeout(() => {
				isInitializing = false;
			}, 50);
		} catch (error: any) {
			isInitializing = false;
			handleGameError(`Game initialization failed: ${error.message}`, 'error', true, 0);
		}
	}

	// ------------------------------
	// Lifecycle
	// ------------------------------
	onMount(() => {
		if (!browser) return;

		mounted = true;
		console.log('[Game] Component mounted');

		detectDevice();

		const errorHandler = (e: ErrorEvent) => {
			if (e.message?.includes('game') || e.filename?.includes('game')) {
				handleGameError(e.error || e.message);
				e.preventDefault();
			}
		};

		window.addEventListener('error', errorHandler);
		window.addEventListener('orientationchange', handleOrientation);
		window.addEventListener('resize', handleResize);

		initializeGame().catch((err) => {
			handleGameError(`Failed to start game: ${err.message}`);
		});

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

		// Clean up global references (property is optional, so delete is valid)
		if ('gameStoreUpdater' in window) {
			delete window.gameStoreUpdater;
		}

		mounted = false;
	});

	// ------------------------------
	// Reactive statements
	// ------------------------------
	$: if (browser && (gameStore as any)) {
		// Trigger downstream listeners when the store changes
		dispatchGameState();
	}

	$: if ($errorState.isVisible && errorContainer) {
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

<!-- src/lib/components/game/GameControls.svelte -->
<script lang="ts">
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import { spring } from 'svelte/motion';
	import { fade } from 'svelte/transition';
	import { browser } from '$app/environment';
	import { writable } from 'svelte/store';
	import { RotateCcw, Pause, Play, Crosshair, Rocket } from 'lucide-svelte';

	export const menuOpen = writable(false);

	const dispatch = createEventDispatcher();

	let touchControlState = {
		movement: {
			active: false,
			direction: { x: 0, y: 0 }
		},
		buttons: {
			shoot: false,
			missile: false,
			pause: false,
			enter: false,
			reset: false
		}
	};

	// Constants for joystick configuration
	const JOYSTICK_DEADZONE = 0.08;
	const JOYSTICK_MAX_DISTANCE = 40;
	const JOYSTICK_UPDATE_RATE = 16;
	const JOYSTICK_SENSITIVITY = 1.35;
	const ACCELERATION_CURVE = 0.7;
	const BUTTON_HAPTIC_DURATION = 50;

	let keys = {
		ArrowLeft: false,
		ArrowRight: false,
		' ': false, // Space
		x: false,
		p: false,
		Enter: false
	};

	const TOUCH_CONFIG = {
		SAMPLING_RATE: 16, // ms
		INITIAL_DELAY: 50, // ms
		MAX_DELTA: 1.5 // Maximum change per update
	};

	function calculateNormalizedPosition(touch, rect) {
		const centerX = rect.width / 2;
		const centerY = rect.height / 2;

		// Calculate raw position
		const rawX = touch.clientX - rect.left - centerX;
		const rawY = touch.clientY - rect.top - centerY;

		// Calculate distance from center
		const distance = Math.sqrt(rawX * rawX + rawY * rawY);

		// For horizontal movement only, ignore Y axis
		return {
			x: rawX / Math.max(rect.width / 2, distance),
			y: 0, // Set Y to 0 to disable vertical movement
			distance: distance
		};
	}

	function applyProgressiveAcceleration(value) {
		// Apply increased sensitivity
		value *= JOYSTICK_SENSITIVITY;

		// Apply custom acceleration curve
		const absValue = Math.abs(value);
		const sign = Math.sign(value);

		// Use a custom curve that's more responsive at lower inputs
		return sign * Math.pow(absValue, ACCELERATION_CURVE);
	}

	// Spring animation for smooth joystick movement (horizontal only)
	let joystickPos = spring(
		{ x: 0, y: 0 },
		{
			stiffness: 0.55,
			damping: 0.45
		}
	);

	// State management
	let lastJoystickUpdate = 0;
	let joystickBase: HTMLElement;
	let controlsContainer: HTMLElement;
	let isJoystickActive = false;
	let startPos = { x: 0, y: 0 };
	let mounted = false;
	let isLandscape = false;

	// Button states
	const buttons: {
		ammo: boolean;
		heatseeker: boolean;
		pause: boolean;
		enter: boolean;
		reset: boolean;
	} = {
		ammo: false,
		heatseeker: false,
		pause: false,
		enter: false,
		reset: false
	};

	$: controlsHeight = isLandscape ? 'var(--controls-height-landscape)' : 'var(--controls-height)';

	function triggerHaptic() {
		if (browser && 'vibrate' in navigator) {
			navigator.vibrate(BUTTON_HAPTIC_DURATION);
		}
	}

	const JOYSTICK_CONFIG = {
		// Increased from 0.15 for better subtle control
		DEADZONE: 0.12,
		// Expanded range for more precise movement
		MAX_DISTANCE: 60,
		// Added for smoother acceleration
		MIN_MOVEMENT_THRESHOLD: 0.05,
		// Multiple zones for progressive response
		MOVEMENT_ZONES: {
			PRECISE: 0.3,
			NORMAL: 0.6,
			RAPID: 1.0
		},
		// Dynamic acceleration curve
		ACCELERATION: {
			PRECISE: 1.2,
			NORMAL: 1.5,
			RAPID: 1.8
		},
		// Enhanced smoothing
		SPRING: {
			STIFFNESS: 0.25, // Reduced from 0.3
			DAMPING: 0.85 // Increased from 0.8
		},
		// Haptic feedback configuration
		HAPTIC: {
			DURATION: {
				TAP: 50,
				ZONE_CHANGE: 20
			},
			INTENSITY: {
				LIGHT: 0.3,
				MEDIUM: 0.5,
				STRONG: 0.8
			}
		}
	};

	// State management for movement zones
	let currentMovementZone = 'PRECISE'; // Initialize with the most precise zone
	let previousMovementZone = 'PRECISE';

	function handleJoystickMove(event) {
		if (!browser || !mounted || !isJoystickActive) return;

		event.preventDefault();
		const touch = event.type.startsWith('touch') ? event.touches[0] : event;
		if (!touch) return;

		const rect = joystickBase.getBoundingClientRect();
		const { x: normalizedX, distance } = calculateNormalizedPosition(touch, rect);

		// Apply enhanced sensitivity for mobile (horizontal only)
		const sensitivity = distance < JOYSTICK_MAX_DISTANCE * 0.5 ? 1.2 : 1.5;
		let adjustedX = normalizedX * JOYSTICK_MAX_DISTANCE * sensitivity;

		// Apply smoother deadzone
		const deadzoneValue = Math.min(JOYSTICK_DEADZONE, (distance / JOYSTICK_MAX_DISTANCE) * 0.1);

		// Only handle movement keys, don't interfere with other controls
		if (Math.abs(adjustedX) < deadzoneValue) {
			adjustedX = 0;
			// Only reset movement-related state
			touchControlState.movement.direction.x = 0;

			// Only release movement keys
			if (keys.ArrowLeft) {
				window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft' }));
				keys.ArrowLeft = false;
			}
			if (keys.ArrowRight) {
				window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight' }));
				keys.ArrowRight = false;
			}
		} else {
			// Update only movement state and simulate keyboard events
			const direction = Math.sign(adjustedX);
			touchControlState.movement.direction.x = direction;

			// Handle left movement
			if (direction < 0 && !keys.ArrowLeft) {
				window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
				keys.ArrowLeft = true;
				if (keys.ArrowRight) {
					window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight' }));
					keys.ArrowRight = false;
				}
			}
			// Handle right movement
			else if (direction > 0 && !keys.ArrowRight) {
				window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
				keys.ArrowRight = true;
				if (keys.ArrowLeft) {
					window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft' }));
					keys.ArrowLeft = false;
				}
			}
		}

		// Update visual position with dynamic constraint (horizontal only)
		const maxDistance = Math.min(JOYSTICK_MAX_DISTANCE, rect.width * 0.4);
		if (Math.abs(adjustedX) > maxDistance) {
			adjustedX = Math.sign(adjustedX) * maxDistance;
		}

		joystickPos.set({
			x: adjustedX,
			y: 0 // Keep Y at 0
		});

		// Only dispatch movement data
		dispatch('control', {
			type: 'joystick',
			value: {
				x: Math.max(-1, Math.min(1, adjustedX / maxDistance)),
				y: 0
			}
		});
	}

	function handleJoystickStart(event) {
		if (!browser || !mounted) return;

		event.preventDefault();
		isJoystickActive = true;

		const touch = event.type === 'touchstart' ? event.touches[0] : event;
		const rect = joystickBase.getBoundingClientRect();

		startPos = {
			x: touch.clientX - rect.left,
			y: touch.clientY - rect.top
		};

		handleJoystickMove(event);
	}

	function handleJoystickEnd() {
		if (!browser || !mounted) return;

		isJoystickActive = false;
		joystickPos.set({ x: 0, y: 0 });

		// Reset movement zone
		currentMovementZone = 'PRECISE';
		previousMovementZone = 'PRECISE';

		// Only release movement keys
		if (keys.ArrowLeft) {
			window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft' }));
			keys.ArrowLeft = false;
		}
		if (keys.ArrowRight) {
			window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight' }));
			keys.ArrowRight = false;
		}

		// Reset only movement state
		touchControlState.movement.direction.x = 0;
		dispatch('control', {
			type: 'joystick',
			value: { x: 0, y: 0 }
		});
	}

	function handleButtonPress(button: keyof typeof buttons, event: TouchEvent | MouseEvent) {
		if (!browser || !mounted) return;

		event.preventDefault();
		event.stopPropagation(); // Prevent event from bubbling to joystick handlers

		buttons[button] = true;
		touchControlState.buttons[button] = true;
		triggerHaptic();

		// Map button to key without affecting movement keys
		let key: string;
		switch (button) {
			case 'missile':
				key = ' '; // Space
				keys[' '] = true;
				break;
			case 'shoot':
				key = 'x';
				keys.x = true;
				break;
			case 'pause':
				key = 'p';
				keys.p = true;
				break;
			case 'enter':
				key = 'Enter';
				keys.Enter = true;
				break;
		}

		if (key) {
			window.dispatchEvent(new KeyboardEvent('keydown', { key }));
			dispatch('control', {
				type: 'button',
				button,
				value: true
			});
		}
	}

	function handleButtonRelease(button: keyof typeof buttons) {
		if (!browser || !mounted) return;

		buttons[button] = false;
		touchControlState.buttons[button] = false;

		// Map button to key
		let key: string;
		switch (button) {
			case 'missile':
				key = ' '; // Space
				keys[' '] = false;
				break;
			case 'shoot':
				key = 'x';
				keys.x = false;
				break;
			case 'pause':
				key = 'p';
				keys.p = false;
				break;
			case 'enter':
				key = 'Enter';
				keys.Enter = false;
				break;
			case 'reset':
				window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', ctrlKey: true }));
				return;
		}

		// Dispatch release events
		if (key) {
			window.dispatchEvent(new KeyboardEvent('keyup', { key }));
			dispatch('control', {
				type: 'button',
				button,
				value: false
			});
		}
	}
	function updateLayoutOrientation() {
		if (!browser || !mounted) return;
		isLandscape = window.innerWidth > window.innerHeight;
	}

	onMount(() => {
		if (!browser) return;
		mounted = true;

		updateLayoutOrientation();

		window.addEventListener('resize', updateLayoutOrientation);
		window.addEventListener('orientationchange', updateLayoutOrientation);
		window.addEventListener('mousemove', handleJoystickMove);
		window.addEventListener('mouseup', handleJoystickEnd);
		window.addEventListener('touchmove', handleJoystickMove, { passive: false });
		window.addEventListener('touchend', handleJoystickEnd);

		if (controlsContainer) {
			controlsContainer.addEventListener('touchmove', (e) => e.preventDefault(), {
				passive: false
			});
		}
	});

	onDestroy(() => {
		if (!browser) return;

		// Clean up all event listeners
		if (controlsContainer) {
			controlsContainer.removeEventListener('touchmove', (e) => e.preventDefault());
		}

		if (joystickBase) {
			joystickBase.removeEventListener('mousedown', handleJoystickStart);
			joystickBase.removeEventListener('touchstart', handleJoystickStart);
		}

		window.removeEventListener('mousemove', handleJoystickMove);
		window.removeEventListener('mouseup', handleJoystickEnd);
		window.removeEventListener('touchmove', handleJoystickMove);
		window.removeEventListener('touchend', handleJoystickEnd);
		window.removeEventListener('resize', updateLayoutOrientation);
		window.removeEventListener('orientationchange', updateLayoutOrientation);

		// Release any held keys
		const heldKeys = ['ArrowLeft', 'ArrowRight', ' ', 'x', 'p', 'Enter'];
		heldKeys.forEach((key) => {
			if (keys[key]) {
				window.dispatchEvent(new KeyboardEvent('keyup', { key }));
				keys[key] = false;
			}
		});

		// Reset state
		joystickPos.set({ x: 0, y: 0 });
		mounted = false;
	});
</script>

<div
	class="controls-container"
	class:landscape={isLandscape}
	bind:this={controlsContainer}
	style="height: {controlsHeight};"
	in:fade={{ duration: 300 }}
>
	<!-- Header with utility buttons -->
	<div class="controls-header">
		<div class="utility-buttons">
			<button
				class="utility-button"
				class:active={buttons.reset}
				on:mousedown|preventDefault={(e) => handleButtonPress('reset', e)}
				on:mouseup={() => handleButtonRelease('reset')}
				on:touchstart|preventDefault={(e) => handleButtonPress('reset', e)}
				on:touchend={() => handleButtonRelease('reset')}
				aria-label="Reset"
			>
				<RotateCcw class="w-4 h-4" />
			</button>

			<button
				class="utility-button"
				class:active={buttons.pause}
				on:mousedown|preventDefault={(e) => handleButtonPress('pause', e)}
				on:mouseup={() => handleButtonRelease('pause')}
				on:touchstart|preventDefault={(e) => handleButtonPress('pause', e)}
				on:touchend={() => handleButtonRelease('pause')}
				aria-label="Pause"
			>
				<Pause class="w-4 h-4" />
			</button>

			<button
				class="utility-button"
				class:active={buttons.enter}
				on:mousedown|preventDefault={(e) => handleButtonPress('enter', e)}
				on:mouseup={() => handleButtonRelease('enter')}
				on:touchstart|preventDefault={(e) => handleButtonPress('enter', e)}
				on:touchend={() => handleButtonRelease('enter')}
				aria-label="Start"
			>
				<Play class="w-4 h-4" />
			</button>
		</div>
	</div>

	<!-- Main controls section -->
	<div class="controls-main">
		<div class="joystick-container">
			<div
				class="joystick-base"
				bind:this={joystickBase}
				on:mousedown|preventDefault={handleJoystickStart}
				on:touchstart|preventDefault={handleJoystickStart}
			>
				<div
					class="joystick-handle"
					style="transform: translate3d({$joystickPos.x}px, {$joystickPos.y}px, 0)"
				>
					<div class="joystick-indicator" />
				</div>
			</div>
		</div>

		<div class="action-buttons">
			<div class="button-group">
				<span class="button-label">HEATSEEKER</span>
				<button
					class="arcade-button secondary-action"
					class:active={buttons.missile}
					on:mousedown|preventDefault={(e) => handleButtonPress('missile', e)}
					on:mouseup={() => handleButtonRelease('missile')}
					on:touchstart|preventDefault={(e) => handleButtonPress('missile', e)}
					on:touchend={() => handleButtonRelease('missile')}
					aria-label="Heat Seeker"
				>
					<span class="button-face" />
					<Crosshair class="button-icon" aria-hidden="true" />
				</button>
			</div>

			<div class="button-group">
				<span class="button-label">SHOOT</span>
				<button
					class="arcade-button primary-action"
					class:active={buttons.shoot}
					on:mousedown|preventDefault={(e) => handleButtonPress('shoot', e)}
					on:mouseup={() => handleButtonRelease('shoot')}
					on:touchstart|preventDefault={(e) => handleButtonPress('shoot', e)}
					on:touchend={() => handleButtonRelease('shoot')}
					aria-label="Shoot"
				>
					<span class="button-face" />
					<Rocket class="button-icon" aria-hidden="true" />
				</button>
			</div>
		</div>
	</div>

	<!-- Footer spacing -->
	<div class="controls-footer" />
</div>

<style>
	/* Root variables */
	:root {
		--controls-height: 200px;
		--controls-height-landscape: 160px;
		--joystick-size: 100px;
		--button-size: 80px;
		--utility-button-size: 32px;
		--controls-padding: 16px;
		--neon-color: rgba(39, 255, 153, 1);
		--neon-color-dim: rgba(39, 255, 153, 0.3);
		--controls-background: rgba(245, 245, 220, 0.05);
	}

	/* Base container styles */
	.controls-container {
		position: fixed;
		bottom: 0;
		left: 0;
		width: 100%;
		background: var(--controls-background);
		border-top: 1px solid var(--neon-color-dim);
		display: flex;
		flex-direction: column;
		padding-bottom: env(safe-area-inset-bottom, 0);
		backdrop-filter: blur(2.5px); /* Modern browsers */
		-webkit-backdrop-filter: blur(2.5px); /* Safari */
		z-index: 1000;
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
	}

	/* Header styles */
	.controls-header {
		height: 44px;
		padding: 4px var(--controls-padding);
		display: flex;
		justify-content: end;
		align-items: center;
		border-bottom: 0 solid var(--neon-color-dim);
	}

	/* Main controls area */
	.controls-main {
		flex: 1;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--controls-padding);
	}

	/* Footer spacing */
	.controls-footer {
		height: 12px;
	}

	.controls-layout {
		width: 100%;
		height: 100%;
		display: flex;
		padding: 0.5rem 1rem; /* Reduced padding */
		max-width: 1200px;
		position: relative;
	}

	.main-controls {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex: 1;
		padding: 0;
		gap: 0;
		position: relative;
	}

	/* Joystick styles */
	.joystick-container {
		flex: 0 0 var(--joystick-size);
		display: flex;
		justify-content: center;
		align-items: center;
		height: 100%;
		touch-action: none;
		margin-left: 2rem;
	}

	.joystick-base {
		width: var(--joystick-size);
		height: var(--joystick-size);
		background: var(--controls-background);
		border: 2px solid var(--neon-color-dim);
		border-radius: 50%;
		position: relative;
		display: flex;
		justify-content: center;
		align-items: center;
		touch-action: none;
		-webkit-touch-callout: none;
		-webkit-tap-highlight-color: transparent;
		transform: translateZ(0);
	}

	.joystick-handle {
		width: 60%; /* Increased from 50% */
		height: 60%; /* Increased from 50% */
		background: rgba(39, 255, 153, 0.2);
		border: 2px solid rgba(39, 255, 153, 0.5);
		border-radius: 50%;
		position: absolute;
		will-change: transform;
		touch-action: none;
		transform-style: preserve-3d;
		backface-visibility: hidden;
		transition: transform 0.05s cubic-bezier(0.25, 0.46, 0.45, 0.94);
		box-shadow: 0 0 15px rgba(39, 255, 153, 0.3);
	}

	.joystick-handle:active {
		box-shadow: 0 0 25px rgba(39, 255, 153, 0.5);
	}

	.joystick-indicator {
		width: 100%;
		height: 100%;
		background: radial-gradient(circle at center, rgba(39, 255, 153, 0.3) 0%, transparent 70%);
		border-radius: 50%;
	}

	/* Button styles */
	.buttons-container {
		margin-right: 2rem;
		display: flex;
		align-items: center; /* Changed from flex-direction: column */
	}

	.action-buttons {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
		align-items: flex-end; /* Changed to align-items: flex-end to align the buttons */
	}

	.arcade-button {
		width: var(--button-size);
		height: var(--button-size);
		position: relative;
		touch-action: none;
	}

	.button-face {
		width: 100%;
		height: 100%;
		background: var(--controls-background);
		border: 2px solid var(--neon-color-dim);
		border-radius: 50%;
		position: absolute;
		top: 0;
		left: 0;
		transition: all 0.1s ease;
		will-change: transform;
		backface-visibility: hidden;
		transform-style: preserve-3d;
	}

	.button-group {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.button-label {
		font-size: 0.6rem;
		color: rgba(245, 245, 220, 0.9);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin-bottom: 6px;
		text-align: center;
		font-weight: 500;
		user-select: none;
		text-shadow: 0 0 4px rgba(39, 255, 153, 0.4);
	}

	@media (max-width: 480px) {
		.button-label {
			font-size: 0.55rem;
			margin-bottom: 6px;
		}
	}

	.arcade-button.active + .button-label,
	.arcade-button:hover + .button-label {
		color: var(--neon-color);
	}

	.arcade-button.active .button-face {
		transform: scale(0.95);
		background: rgba(39, 255, 153, 0.2);
		box-shadow: 0 0 15px rgba(39, 255, 153, 0.4);
	}

	.arcade-button :global(.button-icon) {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 32px;
		height: 32px;
		color: rgba(245, 245, 220, 0.9);
		transition: all 0.2s ease;
	}

	.arcade-button.active .button-face {
		transform: scale(0.95);
		background: rgba(39, 255, 153, 0.2);
		box-shadow: 0 0 15px rgba(39, 255, 153, 0.4);
	}

	.arcade-button:hover :global(.button-icon),
	.arcade-button.active :global(.button-icon) {
		color: var(--neon-color);
		filter: drop-shadow(0 0 8px rgba(39, 255, 153, 0.6));
	}

	/* Utility buttons */
	.utility-buttons {
		display: flex;
		gap: 12px;
	}

	.utility-button {
		min-width: var(--utility-button-size);
		height: var(--utility-button-size);
		padding: 0 8px;
		background: var(--controls-background);
		border: 1px solid var(--neon-color-dim);
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.1s ease;
	}

	.utility-button.active {
		transform: scale(0.95);
		background: rgba(39, 255, 153, 0.2);
		box-shadow: 0 0 10px rgba(39, 255, 153, 0.3);
	}

	.utility-button :global(svg) {
		color: rgba(245, 245, 220, 0.9);
		transition: color 0.2s ease;
	}

	.utility-button:hover :global(svg),
	.utility-button.active :global(svg) {
		color: var(--neon-color);
		filter: drop-shadow(0 0 4px rgba(39, 255, 153, 0.6));
	}

	/* Responsive styles */
	@media (max-width: 1023px) {
		.controls-container {
			display: flex !important;
			flex-direction: column;
			padding-bottom: env(safe-area-inset-bottom);
		}

		.joystick-container {
			margin: 0;
			padding: 1rem;
			touch-action: none;
		}

		.action-buttons {
			padding: 1rem;
			gap: 1.5rem;
		}
	}

	/* Portrait mode */
	@media (orientation: portrait) {
		.controls-container {
			height: var(--controls-height);
		}

		.joystick-container {
			margin-left: 1rem;
		}

		.buttons-container {
			margin-right: 1rem;
		}
	}

	/* Landscape mode */
	@media (orientation: landscape) {
		.controls-container {
			height: var(--controls-height-landscape);
		}

		.controls-layout {
			padding: 0.25rem 1rem;
		}

		.main-controls {
			padding-top: 0; /* Removed padding-top */
		}

		.joystick-container {
			margin-left: 3rem;
		}

		.buttons-container {
			margin-right: 3rem;
		}
	}

	/* Mobile optimizations */
	@media (max-width: 480px) {
		:root {
			--controls-height: 180px;
			--controls-height-landscape: 140px;
			--joystick-size: 90px;
			--button-size: 72px;
			--utility-button-size: 32px;
			--controls-padding: 8px;
		}

		.joystick-container {
			transform-origin: center;
			transition: transform 0.3s ease;
		}

		.landscape .joystick-container {
			transform: scale(0.9);
		}
	}

	/* Touch optimizations */
	@media (hover: none) and (pointer: coarse) {
		.joystick-base {
			transform: scale(1.1); /* Slightly larger on mobile */
		}

		.joystick-handle {
			width: 65%; /* Larger touch target */
			height: 65%;
		}
	}

	/* Safe area insets */
	@supports (padding: env(safe-area-inset-bottom)) {
		.controls-container {
			padding-bottom: env(safe-area-inset-bottom);
		}
	}

	/* Theme adjustments */
	:global(html.light) .controls-container {
		--controls-background: rgba(43, 43, 43, 0.45);
	}

	:global(html.light) .joystick-base,
	:global(html.light) .arcade-button .button-face,
	:global(html.light) .utility-button {
		background: rgba(200, 200, 200, 0.2);
		border-color: rgba(39, 255, 153, 0.25);
	}

	:global(html.light) .button-label {
		color: rgba(245, 245, 220, 0.9);
		text-shadow: 0 0 4px rgba(39, 255, 153, 0.4);
	}
</style>

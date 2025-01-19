<!-- src/lib/components/game/GameControls.svelte -->
<script lang="ts">
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import { spring } from 'svelte/motion';
	import { fade } from 'svelte/transition';
	import { browser } from '$app/environment';
	import { writable } from 'svelte/store';

	export const menuOpen = writable(false);

	const dispatch = createEventDispatcher();

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
		ArrowUp: false,
		ArrowDown: false,
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

		// Normalize values
		return {
			x: rawX / Math.max(rect.width / 2, distance),
			y: rawY / Math.max(rect.height / 2, distance),
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

	// Spring animation for smooth joystick movement
	let joystickPos = spring(
		{ x: 0, y: 0 },
		{
			stiffness: 0.55, // Increased for faster response
			damping: 0.45 // Reduced for less lag
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
	const buttons = {
		ammo: false,
		heatseeker: false,
		pause: false,
		enter: false
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

	// Enhanced movement calculation with progressive zones
	function calculateMovement(normalizedValue, distance) {
		const absValue = Math.abs(normalizedValue);
		const sign = Math.sign(normalizedValue);

		// Apply progressive acceleration based on movement zones
		let acceleration;
		let multiplier;

		if (distance < JOYSTICK_CONFIG.MOVEMENT_ZONES.PRECISE) {
			acceleration = JOYSTICK_CONFIG.ACCELERATION.PRECISE;
			multiplier = 0.7;
		} else if (distance < JOYSTICK_CONFIG.MOVEMENT_ZONES.NORMAL) {
			acceleration = JOYSTICK_CONFIG.ACCELERATION.NORMAL;
			multiplier = 0.85;
		} else {
			acceleration = JOYSTICK_CONFIG.ACCELERATION.RAPID;
			multiplier = 1.0;
		}

		// Enhanced smoothing for low-speed precision
		if (absValue < JOYSTICK_CONFIG.MIN_MOVEMENT_THRESHOLD) {
			return 0;
		}

		// Apply smoothed acceleration curve
		const acceleratedValue = sign * Math.pow(absValue, acceleration) * multiplier;

		// Add subtle easing for more natural feel
		return acceleratedValue * (0.95 + Math.sin(absValue * Math.PI) * 0.05);
	}

	// State management for movement zones
	let currentMovementZone = 'PRECISE'; // Initialize with the most precise zone
	let previousMovementZone = 'PRECISE';

	// Enhanced joystick position handling with improved precision
	function handleJoystickMove(event) {
		if (!browser || !mounted || !isJoystickActive) return;

		event.preventDefault();
		const touch = event.type.startsWith('touch') ? event.touches[0] : event;
		if (!touch) return;

		const rect = joystickBase.getBoundingClientRect();
		const { x: normalizedX, y: normalizedY, distance } = calculateNormalizedPosition(touch, rect);

		// Apply enhanced sensitivity for mobile
		const sensitivity = distance < JOYSTICK_MAX_DISTANCE * 0.5 ? 1.2 : 1.5;
		let adjustedX = normalizedX * JOYSTICK_MAX_DISTANCE * sensitivity;
		let adjustedY = normalizedY * JOYSTICK_MAX_DISTANCE * sensitivity;

		// Apply smoother deadzone
		const deadzoneValue = Math.min(JOYSTICK_DEADZONE, (distance / JOYSTICK_MAX_DISTANCE) * 0.1);
		if (Math.abs(adjustedX) < deadzoneValue) adjustedX = 0;
		if (Math.abs(adjustedY) < deadzoneValue) adjustedY = 0;

		// Update visual position with dynamic constraint
		const maxDistance = Math.min(JOYSTICK_MAX_DISTANCE, rect.width * 0.4);
		if (distance > maxDistance) {
			const angle = Math.atan2(adjustedY, adjustedX);
			adjustedX = Math.cos(angle) * maxDistance;
			adjustedY = Math.sin(angle) * maxDistance;
		}

		joystickPos.set({
			x: adjustedX,
			y: adjustedY
		});

		dispatch('control', {
			type: 'joystick',
			value: {
				x: Math.max(-1, Math.min(1, adjustedX / maxDistance)),
				y: Math.max(-1, Math.min(1, adjustedY / maxDistance))
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

		// Release all held keys
		if (keys.ArrowLeft) {
			window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft' }));
			keys.ArrowLeft = false;
		}

		if (keys.ArrowRight) {
			window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight' }));
			keys.ArrowRight = false;
		}
		if (keys.ArrowUp) {
			window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowUp' }));
			keys.ArrowUp = false;
		}

		dispatch('control', {
			type: 'joystick',
			value: { x: 0, y: 0 }
		});
	}

	function handleButtonPress(button: keyof typeof buttons, event: TouchEvent | MouseEvent) {
		if (!browser || !mounted) return;

		event.preventDefault();
		buttons[button] = true;
		triggerHaptic();

		// Map buttons to keyboard events
		let keyEvent;
		switch (button) {
			case 'heatseeker': // Changed from 'ammo'
				keyEvent = new KeyboardEvent('keydown', { key: ' ' });
				break;
			case 'ammo': // Changed from 'heatseeker'
				keyEvent = new KeyboardEvent('keydown', { key: 'x' });
				break;
			case 'pause':
				keyEvent = new KeyboardEvent('keydown', { key: 'p' });
				break;
			case 'enter':
				keyEvent = new KeyboardEvent('keydown', { key: 'Enter' });
				break;
		}
		if (keyEvent) window.dispatchEvent(keyEvent);

		dispatch('control', {
			type: 'button',
			button,
			value: true
		});
	}

	function handleButtonRelease(button: keyof typeof buttons) {
		if (!browser || !mounted) return;

		buttons[button] = false;

		let keyEvent;
		switch (button) {
			case 'heatseeker': // Changed from 'ammo'
				keyEvent = new KeyboardEvent('keyup', { key: ' ' });
				break;
			case 'ammo': // Changed from 'heatseeker'
				keyEvent = new KeyboardEvent('keyup', { key: 'x' });
				break;
			case 'pause':
				keyEvent = new KeyboardEvent('keyup', { key: 'p' });
				break;
			case 'enter':
				keyEvent = new KeyboardEvent('keyup', { key: 'Enter' });
				break;
		}
		if (keyEvent) window.dispatchEvent(keyEvent);

		dispatch('control', {
			type: 'button',
			button,
			value: false
		});
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
		const heldKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', ' ', 'x', 'p', 'Enter'];
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
				class:active={buttons.pause}
				on:mousedown|preventDefault={(e) => handleButtonPress('pause', e)}
				on:mouseup={() => handleButtonRelease('pause')}
				on:touchstart|preventDefault={(e) => handleButtonPress('pause', e)}
				on:touchend={() => handleButtonRelease('pause')}
			>
				Pause
			</button>

			<button
				class="utility-button"
				class:active={buttons.enter}
				on:mousedown|preventDefault={(e) => handleButtonPress('enter', e)}
				on:mouseup={() => handleButtonRelease('enter')}
				on:touchstart|preventDefault={(e) => handleButtonPress('enter', e)}
				on:touchend={() => handleButtonRelease('enter')}
			>
				Start
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
			<button
				class="arcade-button secondary-action"
				class:active={buttons.heatseeker}
				on:mousedown|preventDefault={(e) => handleButtonPress('heatseeker', e)}
				on:mouseup={() => handleButtonRelease('heatseeker')}
				on:touchstart|preventDefault={(e) => handleButtonPress('heatseeker', e)}
				on:touchend={() => handleButtonRelease('heatseeker')}
			>
				<span class="button-face" />
				<span class="button-label">MISSILE</span>
			</button>

			<button
				class="arcade-button primary-action"
				class:active={buttons.ammo}
				on:mousedown|preventDefault={(e) => handleButtonPress('ammo', e)}
				on:mouseup={() => handleButtonRelease('ammo')}
				on:touchstart|preventDefault={(e) => handleButtonPress('ammo', e)}
				on:touchend={() => handleButtonRelease('ammo')}
			>
				<span class="button-face" />
				<span class="button-label">SHOOT</span>
			</button>
		</div>

		<!-- Footer spacing -->
		<div class="controls-footer" />
	</div>
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

	.button-label {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		font-family: 'Roboto', 'Press Start 2P', monospace;
		font-size: 0.4375rem;
		color: rgba(245, 245, 220, 1);
		text-shadow:
			0 0 4px rgba(39, 255, 153, 0.6),
			0 0 16px rgba(39, 255, 153, 0.4);
		pointer-events: none;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		white-space: nowrap;
		text-align: center;
		width: 100%;
		padding: 0 4px;
	}

	/* Mobile optimization */
	@media (max-width: 480px) {
		.button-label {
			font-size: 0.65rem;
		}
	}

	/* Active state animation */
	.arcade-button.active .button-label {
		transform: translate(-50%, -50%) scale(0.95);
		text-shadow:
			0 0 12px rgba(39, 255, 153, 0.8),
			0 0 24px rgba(39, 255, 153, 0.6);
	}

	/* High contrast for light theme */
	:global(html.light) .button-label {
		color: rgba(0, 0, 0, 0.9);
		text-shadow:
			0 0 8px rgba(39, 255, 153, 0.8),
			0 0 16px rgba(39, 255, 153, 0.6);
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
		gap: 1rem; /* Reduced from 1.5rem */
		justify-content: flex-end;
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
		transition: transform 0.1s ease;
		will-change: transform;
		backface-visibility: hidden;
		transform-style: preserve-3d;
	}

	.arcade-button.active .button-face {
		transform: scale(0.95);
		background: rgba(39, 255, 153, 0.2);
		box-shadow: 0 0 15px rgba(39, 255, 153, 0.4);
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
		/* color: rgba(39, 255, 153, 0.8); */
		color: rgba(245, 245, 220, 1);
		font-family: 'Roboto', 'Press Start 2P', monospace;
		font-weight: 600;
		text-transform: uppercase;
		font-size: 0.75rem;
		transition: all 0.1s ease;
	}

	.utility-button.active {
		transform: scale(0.95);
		background: rgba(39, 255, 153, 0.2);
		box-shadow: 0 0 10px rgba(39, 255, 153, 0.3);
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

	:global(html.light) .button-label {
		color: rgba(30, 30, 30, 0.9);
	}

	:global(html.light) .joystick-base,
	:global(html.light) .arcade-button .button-face,
	:global(html.light) .utility-button {
		background: rgba(200, 200, 200, 0.2);
		border-color: rgba(39, 255, 153, 0.25);
	}
</style>

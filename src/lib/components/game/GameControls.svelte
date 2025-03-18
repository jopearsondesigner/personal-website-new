<!-- src/lib/components/game/GameControls.svelte -->
<script lang="ts">
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import { spring } from 'svelte/motion';
	import { fade } from 'svelte/transition';
	import { browser } from '$app/environment';
	import { writable } from 'svelte/store';
	// Updated icon imports
	import { RefreshCw, Pause, Play, Target, Zap } from 'lucide-svelte';
	import ShootIcon from '$lib/icons/ShootIcon.svelte';
	import HeatsekerIcon from '$lib/icons/HeatseekerIcon.svelte';

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

	// Enhanced dual-mode joystick configuration
	const JOYSTICK_CONFIG = {
		// Different movement zones with their thresholds
		ZONES: {
			DEADZONE: 0.12, // No movement zone (eliminates jitter)
			PRECISION: 0.38, // Fine-grained, pixel-by-pixel movement
			STANDARD: 0.75, // Normal movement speed
			RAPID: 1.0 // Maximum speed
		},

		// Acceleration multipliers for each zone
		ACCELERATION: {
			PRECISION: 0.4, // Low acceleration for precision control
			STANDARD: 1.0, // Base acceleration value
			RAPID: 1.8 // High acceleration for quick traversal
		},

		// Fine-tuning parameters
		SENSITIVITY: 1.35, // Base sensitivity multiplier
		ACCELERATION_CURVE: 0.7, // Power curve for acceleration (values < 1 provide more precision at low inputs)
		MAX_DISTANCE: 60, // Maximum physical joystick travel distance (pixels)

		// Haptic feedback configuration
		HAPTIC: {
			DURATION: {
				TAP: 50, // Basic feedback duration (ms)
				ZONE_CHANGE: 20 // Subtle zone transition feedback (ms)
			}
		}
	};

	let keys = {
		ArrowLeft: false,
		ArrowRight: false,
		' ': false, // Space
		x: false,
		p: false,
		Enter: false
	};

	// Spring animation for smooth joystick movement (horizontal only)
	let joystickPos = spring(
		{ x: 0, y: 0 },
		{
			stiffness: 0.25, // Lower for smoother movement
			damping: 0.7 // Higher for less oscillation
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

	// Track current movement zone for transitions and visual feedback
	let currentMovementZone = 'DEADZONE';
	let previousMovementZone = 'DEADZONE';

	// Button states
	const buttons: {
		shoot: boolean;
		missile: boolean;
		pause: boolean;
		enter: boolean;
		reset: boolean;
	} = {
		shoot: false,
		missile: false,
		pause: false,
		enter: false,
		reset: false
	};

	// Debug variables
	let debugMode = false; // Set to true to enable visual zone indicators

	$: controlsHeight = isLandscape ? 'var(--controls-height-landscape)' : 'var(--controls-height)';

	/**
	 * Trigger haptic feedback for user interactions
	 * @param {number} duration - Duration of vibration in ms
	 */
	function triggerHaptic(duration = JOYSTICK_CONFIG.HAPTIC.DURATION.TAP) {
		if (browser && 'vibrate' in navigator) {
			navigator.vibrate(duration);
		}
	}

	/**
	 * Calculates normalized joystick position with zone awareness
	 * @param {TouchEvent|MouseEvent} touch - The touch/mouse input event
	 * @param {DOMRect} rect - The joystick element's bounding rectangle
	 * @returns {Object} Normalized position and additional metadata
	 */
	function calculateNormalizedPosition(touch, rect) {
		const centerX = rect.width / 2;

		// Calculate raw position (horizontal only for this implementation)
		const rawX = touch.clientX - rect.left - centerX;

		// Calculate distance from center
		const distance = Math.abs(rawX);
		const maxDistance = Math.min(JOYSTICK_CONFIG.MAX_DISTANCE, rect.width * 0.4);

		// Normalize the position to -1 to 1 range
		const normalizedX = Math.max(-1, Math.min(1, rawX / maxDistance));

		// Determine which zone the input falls into
		const absNormalizedX = Math.abs(normalizedX);
		let zone = 'DEADZONE';

		if (absNormalizedX > JOYSTICK_CONFIG.ZONES.DEADZONE) {
			zone = 'PRECISION';

			if (absNormalizedX > JOYSTICK_CONFIG.ZONES.PRECISION) {
				zone = 'STANDARD';

				if (absNormalizedX > JOYSTICK_CONFIG.ZONES.STANDARD) {
					zone = 'RAPID';
				}
			}
		}

		return {
			x: normalizedX,
			rawDistance: distance,
			normalizedDistance: absNormalizedX,
			zone: zone,
			maxDistance: maxDistance
		};
	}

	/**
	 * Applies a progressive acceleration curve based on the input zone
	 * @param {Object} positionData - The normalized position data with zone information
	 * @returns {number} The accelerated input value for horizontal movement
	 */
	function applyProgressiveAcceleration(positionData) {
		const { x, zone, normalizedDistance } = positionData;

		// If in deadzone, no movement
		if (zone === 'DEADZONE') {
			return 0;
		}

		// Get the acceleration multiplier for the current zone
		const accelerationMultiplier = JOYSTICK_CONFIG.ACCELERATION[zone];

		// Apply the base sensitivity
		let adjustedValue = x * JOYSTICK_CONFIG.SENSITIVITY;

		// Calculate zone-specific progress (how far into the current zone)
		let zoneProgress = 0;

		if (zone === 'PRECISION') {
			zoneProgress =
				(normalizedDistance - JOYSTICK_CONFIG.ZONES.DEADZONE) /
				(JOYSTICK_CONFIG.ZONES.PRECISION - JOYSTICK_CONFIG.ZONES.DEADZONE);
		} else if (zone === 'STANDARD') {
			zoneProgress =
				(normalizedDistance - JOYSTICK_CONFIG.ZONES.PRECISION) /
				(JOYSTICK_CONFIG.ZONES.STANDARD - JOYSTICK_CONFIG.ZONES.PRECISION);
		} else if (zone === 'RAPID') {
			zoneProgress =
				(normalizedDistance - JOYSTICK_CONFIG.ZONES.STANDARD) /
				(JOYSTICK_CONFIG.ZONES.RAPID - JOYSTICK_CONFIG.ZONES.STANDARD);
		}

		// Apply non-linear acceleration curve for smoother transitions
		// Use different power curves for different zones
		let curveExponent = JOYSTICK_CONFIG.ACCELERATION_CURVE;

		if (zone === 'PRECISION') {
			// More extreme curve for precision mode (more precision at low inputs)
			curveExponent = 0.5;
		}

		// Apply the curve to zone progress
		zoneProgress = Math.pow(Math.max(0.1, Math.min(1, zoneProgress)), curveExponent);

		// Apply accelerated value with zone-specific scaling
		const acceleratedValue =
			Math.sign(adjustedValue) * Math.abs(adjustedValue) * accelerationMultiplier * zoneProgress;

		return acceleratedValue;
	}

	/**
	 * Handles joystick movement with improved zone-based control
	 * @param {TouchEvent|MouseEvent} event - The touch/mouse input event
	 */
	function handleJoystickMove(event) {
		if (!browser || !mounted || !isJoystickActive) return;

		event.preventDefault();
		const touch = event.type.startsWith('touch') ? event.touches[0] : event;
		if (!touch) return;

		const rect = joystickBase.getBoundingClientRect();

		// Get enhanced normalized position data with zone information
		const positionData = calculateNormalizedPosition(touch, rect);

		// Track previous zone for haptic feedback on zone transitions
		previousMovementZone = currentMovementZone;
		currentMovementZone = positionData.zone;

		// Apply progressive acceleration based on zones
		const acceleratedX = applyProgressiveAcceleration(positionData);

		// Handle movement based on the accelerated value
		if (positionData.zone === 'DEADZONE') {
			// In deadzone, stop movement
			touchControlState.movement.direction.x = 0;

			// Release movement keys
			if (keys.ArrowLeft) {
				window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft' }));
				keys.ArrowLeft = false;
			}
			if (keys.ArrowRight) {
				window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight' }));
				keys.ArrowRight = false;
			}
		} else {
			// Outside deadzone, update movement
			const direction = Math.sign(acceleratedX);
			touchControlState.movement.direction.x = direction;

			// Handle left movement
			if (direction < 0 && !keys.ArrowLeft) {
				// Simulate keyboard event
				window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
				keys.ArrowLeft = true;
				if (keys.ArrowRight) {
					window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight' }));
					keys.ArrowRight = false;
				}
			}
			// Handle right movement
			else if (direction > 0 && !keys.ArrowRight) {
				// Simulate keyboard event
				window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
				keys.ArrowRight = true;
				if (keys.ArrowLeft) {
					window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft' }));
					keys.ArrowLeft = false;
				}
			}
		}

		// Provide haptic feedback on zone transitions
		if (previousMovementZone !== currentMovementZone) {
			// Different feedback intensity based on which zone we're entering
			let vibrationIntensity = JOYSTICK_CONFIG.HAPTIC.DURATION.ZONE_CHANGE;

			if (currentMovementZone === 'RAPID') {
				// Stronger feedback when entering rapid mode
				vibrationIntensity = JOYSTICK_CONFIG.HAPTIC.DURATION.ZONE_CHANGE * 2;
			}

			triggerHaptic(vibrationIntensity);
		}

		// Update visual position with dynamic constraint
		const visualX = positionData.x * positionData.maxDistance;

		// Update spring animation for smooth movement
		joystickPos.set({
			x: visualX,
			y: 0 // Keep Y at 0 for horizontal-only movement
		});

		// Dispatch control event with enhanced data
		dispatch('control', {
			type: 'joystick',
			value: {
				x: acceleratedX,
				y: 0,
				zone: currentMovementZone
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

		// Update joystick position immediately
		handleJoystickMove(event);
	}

	function handleJoystickEnd() {
		if (!browser || !mounted) return;

		isJoystickActive = false;
		joystickPos.set({ x: 0, y: 0 });

		// Reset movement zone
		previousMovementZone = currentMovementZone;
		currentMovementZone = 'DEADZONE';

		// Release movement keys
		if (keys.ArrowLeft) {
			window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft' }));
			keys.ArrowLeft = false;
		}
		if (keys.ArrowRight) {
			window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight' }));
			keys.ArrowRight = false;
		}

		// Reset movement state
		touchControlState.movement.direction.x = 0;
		dispatch('control', {
			type: 'joystick',
			value: { x: 0, y: 0, zone: 'DEADZONE' }
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
		<!-- Utility Buttons Section from GameControls.svelte -->
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
				<RefreshCw class="w-4 h-4" />
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
				class:debug-mode={debugMode}
				bind:this={joystickBase}
				on:mousedown|preventDefault={handleJoystickStart}
				on:touchstart|preventDefault={handleJoystickStart}
			>
				<!-- Debug zone indicators (only visible in debug mode) -->
				{#if debugMode}
					<div
						class="zone-indicator precision"
						style="transform: scale({JOYSTICK_CONFIG.ZONES.PRECISION})"
					></div>
					<div
						class="zone-indicator standard"
						style="transform: scale({JOYSTICK_CONFIG.ZONES.STANDARD})"
					></div>
					<div
						class="zone-indicator rapid"
						style="transform: scale({JOYSTICK_CONFIG.ZONES.RAPID})"
					></div>
				{/if}

				<div
					class="joystick-handle"
					class:precision-mode={currentMovementZone === 'PRECISION'}
					class:standard-mode={currentMovementZone === 'STANDARD'}
					class:rapid-mode={currentMovementZone === 'RAPID'}
					style="transform: translate3d({$joystickPos.x}px, {$joystickPos.y}px, 0)"
				>
					<div class="joystick-indicator" />
				</div>
			</div>

			<!-- Zone indicator label (only visible in debug mode) -->
			{#if debugMode}
				<div class="zone-label">{currentMovementZone}</div>
			{/if}
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
					<HeatsekerIcon color="rgba(245, 245, 220, 0.9)" size={24} />
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
					<ShootIcon color="rgba(245, 245, 220, 0.9)" size={24} />
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

		/* Zone-specific colors */
		--precision-color: rgba(39, 155, 255, 1);
		--precision-color-dim: rgba(39, 155, 255, 0.4);
		--standard-color: rgba(39, 255, 153, 1);
		--standard-color-dim: rgba(39, 255, 153, 0.4);
		--rapid-color: rgba(255, 100, 100, 1);
		--rapid-color-dim: rgba(255, 100, 100, 0.4);
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

	/* Joystick styles with enhanced zone-based visuals */
	.joystick-container {
		flex: 0 0 var(--joystick-size);
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		height: 100%;
		touch-action: none;
		margin-left: 2rem;
		position: relative;
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
		transition: border-color 0.2s ease;
	}

	/* Zone indicator circles for debug mode */
	.zone-indicator {
		position: absolute;
		width: 100%;
		height: 100%;
		border-radius: 50%;
		border: 1px dashed rgba(255, 255, 255, 0.3);
		pointer-events: none;
	}

	.zone-indicator.precision {
		border-color: var(--precision-color-dim);
	}

	.zone-indicator.standard {
		border-color: var(--standard-color-dim);
	}

	.zone-indicator.rapid {
		border-color: var(--rapid-color-dim);
	}

	.zone-label {
		position: absolute;
		bottom: -20px;
		font-size: 10px;
		color: rgba(255, 255, 255, 0.7);
		background: rgba(0, 0, 0, 0.5);
		padding: 2px 6px;
		border-radius: 4px;
		white-space: nowrap;
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
		transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
		box-shadow: 0 0 15px rgba(39, 255, 153, 0.3);
	}

	/* Zone-specific visual styles */
	.joystick-handle.precision-mode {
		border-color: var(--precision-color);
		box-shadow: 0 0 15px var(--precision-color-dim);
		background: rgba(39, 155, 255, 0.2);
	}

	.joystick-handle.standard-mode {
		border-color: var(--standard-color);
		box-shadow: 0 0 15px var(--standard-color-dim);
		background: rgba(39, 255, 153, 0.2);
	}

	.joystick-handle.rapid-mode {
		border-color: var(--rapid-color);
		box-shadow: 0 0 20px var(--rapid-color-dim);
		background: rgba(255, 100, 100, 0.2);
	}

	.joystick-handle:active {
		transform: scale(0.95); /* Subtle press effect */
	}

	.joystick-indicator {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		transition: background 0.2s ease;
	}

	/* Zone-specific indicator styles */
	.precision-mode .joystick-indicator {
		background: radial-gradient(circle at center, rgba(39, 155, 255, 0.4) 0%, transparent 70%);
	}

	.standard-mode .joystick-indicator {
		background: radial-gradient(circle at center, rgba(39, 255, 153, 0.4) 0%, transparent 70%);
	}

	.rapid-mode .joystick-indicator {
		background: radial-gradient(circle at center, rgba(255, 100, 100, 0.4) 0%, transparent 70%);
	}

	/* Debug mode enhancements */
	.joystick-base.debug-mode {
		background: rgba(0, 0, 0, 0.2);
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
		font-size: 0.65rem;
		color: rgba(245, 245, 220, 0.9);
		text-transform: uppercase;
		font-weight: 600;
		letter-spacing: 0.6px;
		margin-bottom: 6px;
		text-align: center;
		font-weight: 500;
		user-select: none;
		text-shadow: 0 0 5px rgba(39, 255, 153, 0.5);
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

	.arcade-button :global(svg.button-icon) {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 24px;
		height: 24px;
	}

	.arcade-button.active :global(svg.button-icon) {
		filter: drop-shadow(0 0 8px rgba(39, 255, 153, 0.6));
	}

	/* Adjust primary and secondary action icons differently */
	.arcade-button.primary-action :global(svg.button-icon) {
		color: var(--neon-color);
	}

	.arcade-button.secondary-action :global(svg.button-icon) {
		color: var(--precision-color);
	}

	/* Make sure icon components fill their container properly */
	:global(svg.button-icon path) {
		/* This ensures the paths within your SVG respect the icon boundaries */
		vector-effect: non-scaling-stroke;
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
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
	}

	.utility-button.active {
		transform: scale(0.95);
		background: rgba(39, 255, 153, 0.2);
		box-shadow: 0 0 10px rgba(39, 255, 153, 0.3);
	}

	.utility-button:hover {
		border-color: var(--neon-color);
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

		.arcade-button :global(.button-icon) {
			width: 22px;
			height: 22px;
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

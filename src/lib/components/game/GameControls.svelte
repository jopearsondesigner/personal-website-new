<!-- src/lib/components/game/GameControls.svelte -->
<script lang="ts">
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import { spring } from 'svelte/motion';
	import { fade } from 'svelte/transition';
	import { browser } from '$app/environment';
	import { writable } from 'svelte/store';

	const dispatch = createEventDispatcher();

	// Spring animation for smooth joystick movement
	let joystickPos = spring(
		{ x: 0, y: 0 },
		{
			stiffness: 0.3,
			damping: 0.8
		}
	);

	// DOM references
	let joystickBase: HTMLElement;
	let controlsContainer: HTMLElement;

	// State
	let isJoystickActive = false;
	let startPos = { x: 0, y: 0 };
	let mounted = false;

	// Responsive layout state
	let isLandscape = false;
	$: controlsHeight = isLandscape ? '100%' : '120px';

	// Button states
	const buttons = {
		ammo: false,
		heatseeker: false,
		pause: false,
		enter: false
	};

	function triggerHaptic() {
		if (browser && 'vibrate' in navigator) {
			navigator.vibrate(50);
		}
	}

	function handleJoystickStart(event: TouchEvent | MouseEvent) {
		if (!browser || !mounted) return;

		event.preventDefault();
		isJoystickActive = true;
		const touch = 'touches' in event ? event.touches[0] : event;
		const rect = joystickBase.getBoundingClientRect();

		startPos = {
			x: touch.clientX - rect.left - rect.width / 2,
			y: touch.clientY - rect.top - rect.height / 2
		};

		handleJoystickMove(event);
	}

	function handleJoystickMove(event: TouchEvent | MouseEvent) {
		if (!browser || !mounted || !isJoystickActive) return;

		event.preventDefault();
		const touch = 'touches' in event ? event.touches[0] : event;
		if (!touch) return;

		const rect = joystickBase.getBoundingClientRect();
		let x = touch.clientX - rect.left - rect.width / 2;
		let y = touch.clientY - rect.top - rect.height / 2;

		const maxDistance = rect.width * 0.3;
		const distance = Math.sqrt(x * x + y * y);

		if (distance > maxDistance) {
			const angle = Math.atan2(y, x);
			x = Math.cos(angle) * maxDistance;
			y = Math.sin(angle) * maxDistance;
		}

		joystickPos.set({ x, y });

		dispatch('control', {
			type: 'joystick',
			value: {
				x: x / maxDistance,
				y: y / maxDistance
			}
		});
	}

	function handleJoystickEnd() {
		if (!browser || !mounted) return;

		isJoystickActive = false;
		joystickPos.set({ x: 0, y: 0 });
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
		dispatch('control', {
			type: 'button',
			button,
			value: true
		});
	}

	function handleButtonRelease(button: keyof typeof buttons) {
		if (!browser || !mounted) return;

		buttons[button] = false;
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

		// Initialize layout
		updateLayoutOrientation();

		// Event listeners for orientation changes
		window.addEventListener('resize', updateLayoutOrientation);
		window.addEventListener('orientationchange', updateLayoutOrientation);

		// Event listeners for joystick
		window.addEventListener('mousemove', handleJoystickMove);
		window.addEventListener('mouseup', handleJoystickEnd);
		window.addEventListener('touchmove', handleJoystickMove, { passive: false });
		window.addEventListener('touchend', handleJoystickEnd);

		// Prevent default touch behaviors
		if (controlsContainer) {
			controlsContainer.addEventListener('touchmove', (e) => e.preventDefault(), {
				passive: false
			});
		}
	});

	onDestroy(() => {
		if (!browser) return;

		window.removeEventListener('resize', updateLayoutOrientation);
		window.removeEventListener('orientationchange', updateLayoutOrientation);
		window.removeEventListener('mousemove', handleJoystickMove);
		window.removeEventListener('mouseup', handleJoystickEnd);
		window.removeEventListener('touchmove', handleJoystickMove);
		window.removeEventListener('touchend', handleJoystickEnd);

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
	<div class="controls-layout">
		<!-- Joystick -->
		<div class="joystick-zone">
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

		<!-- Action Buttons -->
		<div class="action-zone">
			<div class="action-buttons">
				<button
					class="arcade-button ammo"
					class:active={buttons.ammo}
					on:mousedown|preventDefault={(e) => handleButtonPress('ammo', e)}
					on:mouseup={() => handleButtonRelease('ammo')}
					on:touchstart|preventDefault={(e) => handleButtonPress('ammo', e)}
					on:touchend={() => handleButtonRelease('ammo')}
				>
					<span class="button-face" />
					<span class="button-label">Ammo</span>
				</button>

				<button
					class="arcade-button heatseeker"
					class:active={buttons.heatseeker}
					on:mousedown|preventDefault={(e) => handleButtonPress('heatseeker', e)}
					on:mouseup={() => handleButtonRelease('heatseeker')}
					on:touchstart|preventDefault={(e) => handleButtonPress('heatseeker', e)}
					on:touchend={() => handleButtonRelease('heatseeker')}
				>
					<span class="button-face" />
					<span class="button-label">Heat<br />seeker</span>
				</button>
			</div>

			<!-- Utility Buttons -->
			<div class="utility-buttons">
				<button
					class="utility-button"
					class:active={buttons.pause}
					on:mousedown|preventDefault={(e) => handleButtonPress('pause', e)}
					on:mouseup={() => handleButtonRelease('pause')}
					on:touchstart|preventDefault={(e) => handleButtonPress('pause', e)}
					on:touchend={() => handleButtonRelease('pause')}
				>
					<span class="button-label">P</span>
				</button>

				<button
					class="utility-button"
					class:active={buttons.enter}
					on:mousedown|preventDefault={(e) => handleButtonPress('enter', e)}
					on:mouseup={() => handleButtonRelease('enter')}
					on:touchstart|preventDefault={(e) => handleButtonPress('enter', e)}
					on:touchend={() => handleButtonRelease('enter')}
				>
					<span class="button-label">Start</span>
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	:root {
		--controls-height-landscape: 120px;
		--joystick-size: 100px;
		--button-size: 64px;
		--button-spacing: 16px;
		--utility-button-height: 32px;
	}

	.controls-container {
		width: 100%;
		/* Add fallback background color with higher opacity */
		background: rgba(43, 43, 43, 0.15); /* Fallback */
		/* Use @supports to check for backdrop-filter support */
		@supports (backdrop-filter: blur(2px)) {
			background: rgba(43, 43, 43, 0.15);
			backdrop-filter: blur(2px);
			-webkit-backdrop-filter: blur(2px); /* For Safari */
		}
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		border-top: 1px solid rgba(39, 255, 153, 0.2);
		transform: translateZ(0);
		will-change: transform;
	}

	/* Also update the light theme version */
	:global(html.light) .controls-container {
		background: rgba(240, 240, 240, 0.15); /* Fallback */
		@supports (backdrop-filter: blur(2px)) {
			background: rgba(240, 240, 240, 0.15);
			backdrop-filter: blur(2px);
			-webkit-backdrop-filter: blur(2px);
		}
	}

	@media (orientation: landscape) and (max-width: 1023px) {
		.controls-container.landscape {
			width: 100%;
			height: 100%; /* Match container height */
			border-top: 1px solid rgba(39, 255, 153, 0.2);
			border-left: none;
		}

		.controls-layout {
			flex-direction: row;
			padding: 0 24px;
			height: 100%;
		}
	}

	.controls-layout {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
	}

	.controls-container.landscape .controls-layout {
		flex-direction: column;
		justify-content: center;
	}

	.joystick-zone {
		flex: 1;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.joystick-base {
		width: var(--joystick-size);
		height: var(--joystick-size);
		background: rgba(43, 43, 43, 0.15);
		border: 2px solid rgba(39, 255, 153, 0.3);
		border-radius: 50%;
		position: relative;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	/* Mobile optimizations */
	@media (max-width: 480px) {
		.joystick-base {
			width: 80px;
			height: 80px;
		}

		.arcade-button {
			width: 56px;
			height: 56px;
		}
	}

	.joystick-handle {
		width: 50px;
		height: 50px;
		background: rgba(39, 255, 153, 0.2);
		border: 2px solid rgba(39, 255, 153, 0.5);
		border-radius: 50%;
		position: absolute;
		will-change: transform;
	}

	.joystick-indicator {
		width: 100%;
		height: 100%;
		background: radial-gradient(circle at center, rgba(39, 255, 153, 0.3) 0%, transparent 70%);
		border-radius: 50%;
	}

	.action-zone {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		justify-content: center;
	}

	.action-buttons {
		display: flex;
		gap: 1rem;
		justify-content: center;
	}

	.arcade-button {
		width: var(--button-size);
		height: var(--button-size);
		background: transparent;
		border: none;
		position: relative;
		cursor: pointer;
	}

	.button-face::before {
		content: '';
		position: absolute;
		top: -8px;
		left: -8px;
		right: -8px;
		bottom: -8px;
	}

	.button-face {
		width: 100%;
		height: 100%;
		background: rgba(43, 43, 43 0.3);
		border: 2px solid rgba(39, 255, 153, 0.3);
		border-radius: 50%;
		position: absolute;
		top: 0;
		left: 0;
		transition: transform 0.1s ease;
	}

	.arcade-button.active .button-face {
		transform: scale(0.95);
		background: rgba(39, 255, 153, 0.2);
		box-shadow: 0 0 15px rgba(39, 255, 153, 0.4);
	}

	.button-label {
		position: absolute;
		bottom: -25px;
		left: 50%;
		transform: translateX(-50%);
		font-family: 'Press Start 2P', monospace;
		font-size: 0.7rem;
		color: rgba(39, 255, 153, 0.8);
		white-space: nowrap;
		text-align: center;
	}

	.utility-buttons {
		display: flex;
		justify-content: center;
		gap: 2rem;
		margin-top: 0.5rem;
	}

	.utility-button {
		width: 50px;
		height: 30px;
		background: rgba(43, 43, 43 0.3);
		border: 2px solid rgba(39, 255, 153, 0.3);
		border-radius: 4px;
		color: rgba(39, 255, 153, 0.8);
		font-family: 'Press Start 2P', monospace;
		font-size: 0.7rem;
		cursor: pointer;
		transition: all 0.1s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.utility-button.active {
		transform: scale(0.95);
		background: rgba(39, 255, 153, 0.2);
		box-shadow: 0 0 10px rgba(39, 255, 153, 0.3);
	}

	/* Theme-specific styles */
	:global(html.light) .controls-container {
		background: rgba(240, 240, 240, 0.95);
	}

	:global(html.light) .button-label {
		color: rgba(30, 30, 30, 0.9);
	}

	/* Mobile optimizations */
	@media (max-width: 480px) {
		.arcade-button {
			width: 60px;
			height: 60px;
		}

		.button-label {
			font-size: 0.6rem;
			bottom: -20px;
		}

		.utility-button {
			width: 45px;
			height: 25px;
			font-size: 0.6rem;
		}
	}

	/* Landscape optimizations */
	@media (orientation: landscape) and (max-height: 500px) {
		.joystick-base {
			width: 80px;
			height: 80px;
		}

		.joystick-handle {
			width: 40px;
			height: 40px;
		}

		.arcade-button {
			width: 50px;
			height: 50px;
		}

		.utility-button {
			width: 40px;
			height: 24px;
			font-size: 0.6rem;
		}

		.button-label {
			font-size: 0.55rem;
			bottom: -18px;
		}
	}

	/* Safe area insets for modern devices */
	@supports (padding: max(0px)) {
		.controls-container {
			padding-bottom: max(1rem, env(safe-area-inset-bottom));
			padding-left: max(1rem, env(safe-area-inset-left));
			padding-right: max(1rem, env(safe-area-inset-right));
		}
	}

	/* Performance optimizations */
	.joystick-handle,
	.button-face {
		will-change: transform;
		backface-visibility: hidden;
		transform-style: preserve-3d;
	}

	/* Custom arcade glow effects */
	.arcade-button::after {
		content: '';
		position: absolute;
		inset: -2px;
		border-radius: 50%;
		background: transparent;
		border: 2px solid rgba(39, 255, 153, 0);
		transition: all 0.3s ease;
	}

	.arcade-button:hover::after {
		border-color: rgba(39, 255, 153, 0.2);
		box-shadow: 0 0 10px rgba(39, 255, 153, 0.3);
	}

	.arcade-button.active::after {
		border-color: rgba(39, 255, 153, 0.4);
		box-shadow: 0 0 15px rgba(39, 255, 153, 0.5);
	}
</style>

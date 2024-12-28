<!-- GameControls.svelte -->
<script lang="ts">
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import { spring } from 'svelte/motion';
	import { fade } from 'svelte/transition';

	const dispatch = createEventDispatcher();

	// Joystick state
	let joystickPos = spring(
		{ x: 0, y: 0 },
		{
			stiffness: 0.3,
			damping: 0.8
		}
	);
	let isJoystickActive = false;
	let startPos = { x: 0, y: 0 };
	let joystickBase: HTMLElement;

	// Button states with haptic feedback support
	const buttons = {
		ammo: false,
		heatseeker: false,
		pause: false,
		enter: false
	};

	function triggerHaptic() {
		if ('vibrate' in navigator) {
			navigator.vibrate(50);
		}
	}

	function handleJoystickStart(event: TouchEvent | MouseEvent) {
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
		if (!isJoystickActive) return;
		event.preventDefault();

		const touch = 'touches' in event ? event.touches[0] : event;
		const rect = joystickBase.getBoundingClientRect();

		let x = touch.clientX - rect.left - rect.width / 2;
		let y = touch.clientY - rect.top - rect.height / 2;

		// Limit to circle
		const distance = Math.sqrt(x * x + y * y);
		const maxDistance = rect.width * 0.3;

		if (distance > maxDistance) {
			const angle = Math.atan2(y, x);
			x = Math.cos(angle) * maxDistance;
			y = Math.sin(angle) * maxDistance;
		}

		joystickPos.set({ x, y });

		// Normalize and dispatch
		dispatch('control', {
			type: 'joystick',
			value: {
				x: x / maxDistance,
				y: y / maxDistance
			}
		});
	}

	function handleJoystickEnd() {
		isJoystickActive = false;
		joystickPos.set({ x: 0, y: 0 });
		dispatch('control', {
			type: 'joystick',
			value: { x: 0, y: 0 }
		});
	}

	function handleButtonPress(button: string, event: TouchEvent | MouseEvent) {
		event.preventDefault();
		buttons[button] = true;
		triggerHaptic();
		dispatch('control', {
			type: 'button',
			button,
			value: true
		});
	}

	function handleButtonRelease(button: string) {
		buttons[button] = false;
		dispatch('control', {
			type: 'button',
			button,
			value: false
		});
	}

	onMount(() => {
		const controls = document.querySelector('.controls-container');
		controls?.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

		window.addEventListener('mousemove', handleJoystickMove);
		window.addEventListener('mouseup', handleJoystickEnd);
		window.addEventListener('touchmove', handleJoystickMove, { passive: false });
		window.addEventListener('touchend', handleJoystickEnd);
	});

	onDestroy(() => {
		window.removeEventListener('mousemove', handleJoystickMove);
		window.removeEventListener('mouseup', handleJoystickEnd);
		window.removeEventListener('touchmove', handleJoystickMove);
		window.removeEventListener('touchend', handleJoystickEnd);
	});
</script>

<div class="controls-container" in:fade={{ duration: 300 }}>
	<div class="controls-layout">
		<!-- Joystick -->
		<div class="joystick-zone">
			<div
				class="joystick-base"
				bind:this={joystickBase}
				on:touchstart={handleJoystickStart}
				on:touchmove={handleJoystickMove}
				on:touchend={handleJoystickEnd}
			>
				<div
					class="joystick-handle"
					style="transform: translate3d({$joystickPos.x}px, {$joystickPos.y}px, 0)"
				>
					<div class="joystick-indicator"></div>
				</div>
			</div>
		</div>

		<!-- Action Buttons -->
		<div class="action-zone">
			<!-- Primary Buttons -->
			<div class="action-buttons">
				<button
					class="arcade-button ammo"
					class:active={buttons.ammo}
					on:mousedown={(e) => handleButtonPress('ammo', e)}
					on:mouseup={() => handleButtonRelease('ammo')}
					on:touchstart={(e) => handleButtonPress('ammo', e)}
					on:touchend={() => handleButtonRelease('ammo')}
				>
					<span class="button-face"></span>
					<span class="button-label">Ammo</span>
				</button>

				<button
					class="arcade-button heatseeker"
					class:active={buttons.heatseeker}
					on:mousedown={(e) => handleButtonPress('heatseeker', e)}
					on:mouseup={() => handleButtonRelease('heatseeker')}
					on:touchstart={(e) => handleButtonPress('heatseeker', e)}
					on:touchend={() => handleButtonRelease('heatseeker')}
				>
					<span class="button-face"></span>
					<span class="button-label">Heat<br />seeker</span>
				</button>
			</div>

			<!-- Utility Buttons -->
			<div class="utility-buttons">
				<button
					class="utility-button"
					class:active={buttons.pause}
					on:mousedown={(e) => handleButtonPress('pause', e)}
					on:mouseup={() => handleButtonRelease('pause')}
					on:touchstart={(e) => handleButtonPress('pause', e)}
					on:touchend={() => handleButtonRelease('pause')}
				>
					<span class="button-label">P</span>
				</button>

				<button
					class="utility-button"
					class:active={buttons.enter}
					on:mousedown={(e) => handleButtonPress('enter', e)}
					on:mouseup={() => handleButtonRelease('enter')}
					on:touchstart={(e) => handleButtonPress('enter', e)}
					on:touchend={() => handleButtonRelease('enter')}
				>
					<span class="button-label">Start</span>
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	.controls-container {
		position: fixed;
		width: 100%;
		bottom: 0;
		left: 0;
		right: 0;
		height: var(--controls-height, 180px);
		background: rgba(43, 43, 43, 0.22);
		backdrop-filter: blur(10px);
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0 20px;
		z-index: 1000;
	}

	.controls-layout {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 1rem;
	}

	/* Adjust layout for landscape */
	@media (orientation: landscape) {
		.controls-container {
			height: var(--controls-height-landscape, 120px);
		}

		.controls-layout {
			padding: 0.25rem 0.5rem;
		}
	}

	/* Joystick Styles */
	.joystick-zone {
		flex: 1;
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 20px;
	}

	.joystick-base {
		width: 120px;
		height: 120px;
		background: radial-gradient(circle at center, rgba(60, 60, 60, 0.5), rgba(40, 40, 40, 0.8));
		border-radius: 50%;
		position: relative;
		border: 2px solid rgba(39, 255, 153, 0.2);
		box-shadow:
			inset 0 0 20px rgba(0, 0, 0, 0.5),
			0 0 10px rgba(39, 255, 153, 0.2);
	}

	.joystick-handle {
		width: 60px;
		height: 60px;
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		will-change: transform;
	}

	.joystick-indicator {
		width: 100%;
		height: 100%;
		background: linear-gradient(145deg, rgba(80, 80, 80, 1), rgba(40, 40, 40, 1));
		border-radius: 50%;
		box-shadow:
			0 4px 8px rgba(0, 0, 0, 0.5),
			inset 0 2px 4px rgba(255, 255, 255, 0.2);
	}

	/* Button Styles */
	.action-zone {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 20px;
	}

	.action-buttons {
		display: flex;
		gap: 16px;
		margin-right: 20px;
	}

	.arcade-button {
		width: 56px;
		height: 56px;
		padding: 0;
		border: none;
		background: none;
		position: relative;
	}

	.button-face {
		display: block;
		width: 100%;
		height: 100%;
		border-radius: 50%;
		background: linear-gradient(
			145deg,
			var(--button-color-light, #ff0000),
			var(--button-color-dark, #cc0000)
		);
		box-shadow:
			0 4px 8px rgba(0, 0, 0, 0.5),
			inset 0 2px 4px rgba(255, 255, 255, 0.2);
		transition: transform 0.1s;
	}

	.arcade-button.ammo {
		--button-color-light: #ff0000;
		--button-color-dark: #cc0000;
	}

	.arcade-button.heatseeker {
		--button-color-light: #0000ff;
		--button-color-dark: #0000cc;
	}

	.arcade-button.active .button-face {
		transform: translateY(2px);
	}

	.button-label {
		position: absolute;
		bottom: -24px;
		left: 50%;
		transform: translateX(-50%);
		font-family: 'Press Start 2P', monospace;
		font-size: 10px;
		color: rgba(255, 255, 255, 0.9);
		white-space: nowrap;
		text-align: center;
	}

	/* Utility Buttons */
	.utility-buttons {
		position: absolute;
		top: 20px;
		right: 20px;
		display: flex;
		gap: 12px;
	}

	.utility-button {
		width: 36px;
		height: 36px;
		border: none;
		background: linear-gradient(145deg, rgba(60, 60, 60, 0.9), rgba(40, 40, 40, 0.9));
		border-radius: 4px;
		position: relative;
		border: 1px solid rgba(39, 255, 153, 0.2);
		box-shadow:
			0 2px 4px rgba(0, 0, 0, 0.5),
			inset 0 1px 2px rgba(255, 255, 255, 0.1);
		transition: transform 0.1s;
	}

	.utility-button.active {
		transform: translateY(1px);
		box-shadow:
			0 1px 2px rgba(0, 0, 0, 0.5),
			inset 0 1px 2px rgba(255, 255, 255, 0.1);
	}

	.utility-button .button-label {
		bottom: -20px;
		font-size: 8px;
	}

	/* Responsive Adjustments */
	@media (orientation: landscape) {
		.controls-container {
			height: var(--controls-height, 120px);
			padding: 10px;
		}

		.joystick-base {
			width: 100px;
			height: 100px;
		}

		.joystick-handle {
			width: 50px;
			height: 50px;
		}

		.arcade-button {
			width: 48px;
			height: 48px;
		}

		.utility-button {
			width: 32px;
			height: 32px;
		}

		.button-label {
			bottom: -20px;
			font-size: 8px;
		}

		.action-zone {
			gap: 15px;
		}

		.action-buttons {
			gap: 14px;
			margin-right: 15px;
		}
	}

	/* Arcade CRT Effect */
	.arcade-button .button-face::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 50%;
		background: linear-gradient(
			135deg,
			rgba(255, 255, 255, 0.1) 0%,
			transparent 50%,
			rgba(0, 0, 0, 0.1) 100%
		);
		pointer-events: none;
	}

	/* Active State Glow Effects */
	.arcade-button.active::before {
		content: '';
		position: absolute;
		inset: -2px;
		border-radius: 50%;
		background: radial-gradient(circle at center, var(--button-color-light) 0%, transparent 70%);
		opacity: 0.5;
		filter: blur(4px);
	}

	/* Prevent text selection on buttons */
	.button-label {
		user-select: none;
		-webkit-user-select: none;
	}

	/* Touch action optimization */
	.joystick-base,
	.arcade-button,
	.utility-button {
		touch-action: none;
		-webkit-touch-callout: none;
	}
</style>

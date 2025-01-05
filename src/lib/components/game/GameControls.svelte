<!-- src/lib/components/game/GameControls.svelte -->
<script lang="ts">
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import { spring } from 'svelte/motion';
	import { fade } from 'svelte/transition';
	import { browser } from '$app/environment';

	const dispatch = createEventDispatcher();

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
	let controlsContainer: HTMLElement;
	let isDragging = false;
	let dragStart = { x: 0, y: 0 };
	let position = { x: 0, y: 0 };
	let mounted = false;

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
		console.log('[GameControls] Joystick activated');
	}

	function handleJoystickMove(event: TouchEvent | MouseEvent) {
		if (!browser || !mounted || !isJoystickActive) return;
		event.preventDefault();

		const touch = 'touches' in event ? event.touches[0] : event;
		const rect = joystickBase.getBoundingClientRect();

		let x = touch.clientX - rect.left - rect.width / 2;
		let y = touch.clientY - rect.top - rect.height / 2;

		const distance = Math.sqrt(x * x + y * y);
		const maxDistance = rect.width * 0.3;

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

	function handleButtonPress(button: string, event: TouchEvent | MouseEvent) {
		if (!browser || !mounted) return;

		event.preventDefault();
		buttons[button] = true;
		triggerHaptic();
		dispatch('control', {
			type: 'button',
			button,
			value: true
		});
		console.log('[GameControls] Button pressed:', button);
	}

	function handleButtonRelease(button: string) {
		if (!browser || !mounted) return;

		buttons[button] = false;
		dispatch('control', {
			type: 'button',
			button,
			value: false
		});
	}

	function handleControlsDragStart(event: TouchEvent | MouseEvent) {
		if (!browser || !mounted) return;

		event.preventDefault();
		const touch = 'touches' in event ? event.touches[0] : event;
		isDragging = true;
		dragStart = {
			x: touch.clientX - position.x,
			y: touch.clientY - position.y
		};
	}

	function handleControlsDragMove(event: TouchEvent | MouseEvent) {
		if (!browser || !mounted || !isDragging) return;

		event.preventDefault();
		const touch = 'touches' in event ? event.touches[0] : event;
		position = {
			x: touch.clientX - dragStart.x,
			y: touch.clientY - dragStart.y
		};
	}

	function handleControlsDragEnd() {
		if (!browser || !mounted) return;
		isDragging = false;
	}

	function updateControlsHeight() {
		if (!browser || !mounted || !controlsContainer) return;

		const isLandscape = window.innerWidth > window.innerHeight;
		const height = isLandscape ? '120px' : '180px';
		controlsContainer.style.setProperty('--controls-height', height);
		console.log('[GameControls] Updated height:', height);
	}

	onMount(() => {
		if (!browser) return;

		mounted = true;
		console.log('[GameControls] Component mounted');

		// Add position debugging
		const debugPosition = () => {
			if (controlsContainer) {
				const rect = controlsContainer.getBoundingClientRect();
				console.log('[GameControls] Position:', {
					top: rect.top,
					bottom: rect.bottom,
					left: rect.left,
					right: rect.right,
					height: rect.height,
					width: rect.width,
					windowHeight: window.innerHeight
				});
			}
		};

		// Check position after a short delay to ensure rendering
		setTimeout(debugPosition, 100);

		if (controlsContainer) {
			updateControlsHeight();
			controlsContainer.addEventListener('touchmove', (e) => e.preventDefault(), {
				passive: false
			});
		}

		// Add event listeners
		const addEvents = () => {
			window.addEventListener('mousemove', handleJoystickMove);
			window.addEventListener('mouseup', handleJoystickEnd);
			window.addEventListener('touchmove', handleJoystickMove, { passive: false });
			window.addEventListener('touchend', handleJoystickEnd);
			window.addEventListener('mousemove', handleControlsDragMove);
			window.addEventListener('mouseup', handleControlsDragEnd);
			window.addEventListener('touchmove', handleControlsDragMove, { passive: false });
			window.addEventListener('touchend', handleControlsDragEnd);
			window.addEventListener('resize', updateControlsHeight);
		};

		addEvents();
		console.log('[GameControls] Event listeners added');
	});

	onDestroy(() => {
		if (!browser) return;

		window.removeEventListener('mousemove', handleJoystickMove);
		window.removeEventListener('mouseup', handleJoystickEnd);
		window.removeEventListener('touchmove', handleJoystickMove);
		window.removeEventListener('touchend', handleJoystickEnd);
		window.removeEventListener('mousemove', handleControlsDragMove);
		window.removeEventListener('mouseup', handleControlsDragEnd);
		window.removeEventListener('touchmove', handleControlsDragMove);
		window.removeEventListener('touchend', handleControlsDragEnd);
		window.removeEventListener('resize', updateControlsHeight);

		mounted = false;
		console.log('[GameControls] Component destroyed');
	});
</script>

<div
	class="controls-container"
	bind:this={controlsContainer}
	on:mousedown|preventDefault={handleControlsDragStart}
	on:touchstart|preventDefault={handleControlsDragStart}
	in:fade={{ duration: 300 }}
	style="transform: translate({position.x}px, {position.y}px)"
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
			<!-- Primary Buttons -->
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

	<!-- Drag Handle -->
	<div class="drag-handle" />
</div>

<style>
	/* ==========================================================================
   Controls Container
   ========================================================================== */
	.controls-container {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		width: 100%;
		height: var(--controls-height, 180px);
		background: rgba(43, 43, 43, 0.85);
		backdrop-filter: blur(10px);
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0 20px;
		z-index: 9999;
		cursor: move;
		touch-action: none;
		user-select: none;
		border-top: 1px solid rgba(39, 255, 153, 0.2);
		will-change: transform;
		transform: translate3d(0, 0, 0); /* Force GPU acceleration */
	}

	.controls-container::before {
		content: 'Controls';
		position: absolute;
		top: -20px;
		left: 50%;
		transform: translateX(-50%);
		background: rgba(255, 255, 255, 0.8);
		padding: 2px 6px;
		border-radius: 4px;
		font-size: 12px;
		pointer-events: none;
	}

	.controls-layout {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 1rem;
		gap: 1rem;
	}

	.drag-handle {
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 40px;
		height: 4px;
		background: rgba(255, 255, 255, 0.2);
		border-radius: 2px;
		margin-top: 8px;
	}

	/* Joystick Styles */
	.joystick-zone {
		flex: 1;
		display: flex;
		justify-content: center;
		align-items: center;
		height: 100%;
	}

	.joystick-base {
		width: 120px;
		height: 120px;
		background: rgba(0, 0, 0, 0.3);
		border: 2px solid rgba(39, 255, 153, 0.3);
		border-radius: 50%;
		position: relative;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.joystick-handle {
		width: 60px;
		height: 60px;
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

	/* Action Zone Styles */
	.action-zone {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		height: 100%;
		justify-content: center;
	}

	.action-buttons {
		display: flex;
		gap: 1rem;
		justify-content: center;
	}

	.arcade-button {
		width: 80px;
		height: 80px;
		background: transparent;
		border: none;
		position: relative;
		cursor: pointer;
	}

	.button-face {
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.3);
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
	}

	.utility-button {
		width: 50px;
		height: 30px;
		background: rgba(0, 0, 0, 0.3);
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
		position: relative;
	}

	.utility-button.active {
		transform: scale(0.95);
		background: rgba(39, 255, 153, 0.2);
	}

	/* Performance Optimizations */
	.joystick-handle,
	.button-face {
		will-change: transform;
		backface-visibility: hidden;
		transform-style: preserve-3d;
	}

	/* Safe Area Insets for Modern Devices */
	@supports (padding: max(0px)) {
		.controls-container {
			padding-bottom: max(20px, env(safe-area-inset-bottom));
			padding-left: max(20px, env(safe-area-inset-left));
			padding-right: max(20px, env(safe-area-inset-right));
		}
	}

	/* Media Queries for Different Screen Sizes */
	@media (max-width: 768px) {
		.joystick-base {
			width: 100px;
			height: 100px;
		}

		.joystick-handle {
			width: 50px;
			height: 50px;
		}

		.arcade-button {
			width: 70px;
			height: 70px;
		}

		.button-label {
			font-size: 0.6rem;
			bottom: -20px;
		}
	}

	@media (max-height: 600px) {
		.controls-container {
			--controls-height: 120px;
		}

		.joystick-base {
			width: 80px;
			height: 80px;
		}

		.joystick-handle {
			width: 40px;
			height: 40px;
		}

		.arcade-button {
			width: 60px;
			height: 60px;
		}

		.utility-button {
			width: 40px;
			height: 25px;
			font-size: 0.6rem;
		}
	}
</style>

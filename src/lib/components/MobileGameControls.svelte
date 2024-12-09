<!-- src/lib/components/MobileGameControls.svelte -->
<script lang="ts">
	import { fade } from 'svelte/transition';
	import { Gear } from 'svelte-bootstrap-icons';

	export let onMove: (x: number, y: number) => void;
	export let onAction: (button: string) => void;

	let joystickPos = { x: 0, y: 0 };
	let touching = false;
	let joystickElement: HTMLDivElement;

	function handleTouchStart(e: TouchEvent) {
		touching = true;
		const touch = e.touches[0];
		const rect = joystickElement.getBoundingClientRect();
		updateJoystickPosition(touch, rect);
	}

	function handleTouchMove(e: TouchEvent) {
		if (!touching) return;
		const touch = e.touches[0];
		const rect = joystickElement.getBoundingClientRect();
		updateJoystickPosition(touch, rect);
	}

	function updateJoystickPosition(touch: Touch, rect: DOMRect) {
		const x = touch.clientX - rect.left - rect.width / 2;
		const y = touch.clientY - rect.top - rect.height / 2;

		// Limit joystick movement radius
		const radius = 40;
		const distance = Math.sqrt(x * x + y * y);
		const angle = Math.atan2(y, x);

		const limitedX = Math.min(radius, distance) * Math.cos(angle);
		const limitedY = Math.min(radius, distance) * Math.sin(angle);

		joystickPos = { x: limitedX, y: limitedY };
		onMove(limitedX / radius, limitedY / radius);
	}

	function handleTouchEnd() {
		touching = false;
		joystickPos = { x: 0, y: 0 };
		onMove(0, 0);
	}
</script>

<div class="mobile-controls" in:fade={{ duration: 300 }}>
	<!-- Virtual Joystick -->
	<div class="controls-left">
		<div
			bind:this={joystickElement}
			class="joystick-base"
			on:touchstart={handleTouchStart}
			on:touchmove={handleTouchMove}
			on:touchend={handleTouchEnd}
			on:touchcancel={handleTouchEnd}
		>
			<div
				class="joystick-handle"
				style="transform: translate({joystickPos.x}px, {joystickPos.y}px)"
			/>
		</div>
	</div>

	<!-- Action Buttons -->
	<div class="controls-right">
		<button class="action-button button-a" on:touchstart={() => onAction('A')}> A </button>
		<button class="action-button button-b" on:touchstart={() => onAction('B')}> B </button>
	</div>
</div>

<style>
	.mobile-controls {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		height: 180px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
		pointer-events: none;
		z-index: 1000;
	}

	.controls-left,
	.controls-right {
		pointer-events: auto;
	}

	.joystick-base {
		width: 120px;
		height: 120px;
		background: rgba(43, 43, 43, 0.7);
		border: 2px solid var(--arcade-neon-green-500);
		border-radius: 50%;
		position: relative;
		touch-action: none;
	}

	.joystick-handle {
		position: absolute;
		width: 60px;
		height: 60px;
		background: var(--arcade-neon-green-500);
		border-radius: 50%;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		box-shadow: 0 0 10px rgba(39, 255, 153, 0.5);
		transition: transform 0.1s ease-out;
	}

	.controls-right {
		display: flex;
		gap: 1rem;
	}

	.action-button {
		width: 70px;
		height: 70px;
		border-radius: 50%;
		font-family: 'Press Start 2P', monospace;
		font-size: 1.5rem;
		color: white;
		border: none;
		transition: transform 0.1s ease-out;
	}

	.button-a {
		background: var(--arcade-red-500);
		box-shadow: 0 0 10px rgba(255, 84, 38, 0.5);
	}

	.button-b {
		background: var(--arcade-electric-blue-500);
		box-shadow: 0 0 10px rgba(30, 144, 255, 0.5);
	}

	.action-button:active {
		transform: scale(0.95);
	}

	@media (min-width: 768px) {
		.mobile-controls {
			display: none;
		}
	}
</style>

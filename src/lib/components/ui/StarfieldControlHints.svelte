<!-- $lib/components/ui/StarfieldControls.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let showHints = true;
	let hintsVisible = false;

	// Auto-hide hints after user interaction
	let interactionTimer: number;

	onMount(() => {
		if (!browser) return;

		// Show hints after a brief delay
		setTimeout(() => {
			hintsVisible = true;
		}, 2000);

		// Hide hints after first interaction
		const hideHints = () => {
			showHints = false;
			hintsVisible = false;
		};

		// Listen for any user interaction
		const events = ['mousemove', 'keydown', 'scroll', 'click'];

		const startHideTimer = () => {
			clearTimeout(interactionTimer);
			interactionTimer = window.setTimeout(hideHints, 5000);
		};

		events.forEach((event) => {
			document.addEventListener(event, startHideTimer, { once: true, passive: true });
		});

		return () => {
			clearTimeout(interactionTimer);
		};
	});
</script>

{#if showHints && hintsVisible}
	<div class="starfield-hints" class:visible={hintsVisible}>
		<!-- Speed Control Hint -->
		<div class="control-hint speed-hint">
			<div class="hint-arrow speed-arrow"></div>
			<div class="hint-text">
				<span class="hint-title">Speed Control</span>
				<span class="hint-description">Hover & move mouse vertically</span>
				<span class="hint-keys">Or use ↑↓ arrow keys</span>
			</div>
		</div>

		<!-- Effects Control Hint -->
		<div class="control-hint effects-hint">
			<div class="hint-arrow effects-arrow"></div>
			<div class="hint-text">
				<span class="hint-title">Star Effects</span>
				<span class="hint-description">Hover & click to cycle</span>
				<span class="hint-keys">Or press 1, 2, 3 keys</span>
			</div>
		</div>

		<!-- Boost Control Hint -->
		<div class="control-hint boost-hint">
			<div class="hint-arrow boost-arrow"></div>
			<div class="hint-text">
				<span class="hint-title">Turbo Boost</span>
				<span class="hint-description">Hover for speed boost</span>
				<span class="hint-keys">Or hold Spacebar</span>
			</div>
		</div>
	</div>
{/if}

<style>
	.starfield-hints {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 15;
		opacity: 0;
		transition: opacity 0.5s ease-in-out;
	}

	.starfield-hints.visible {
		opacity: 1;
	}

	.control-hint {
		position: absolute;
		display: flex;
		align-items: center;
		gap: 12px;
		pointer-events: none;
		animation: hintPulse 3s ease-in-out infinite;
	}

	.speed-hint {
		left: 100px;
		top: 40%;
		flex-direction: row;
	}

	.effects-hint {
		right: 100px;
		top: 40%;
		flex-direction: row-reverse;
	}

	.boost-hint {
		bottom: 20%;
		left: 50%;
		transform: translateX(-50%);
		flex-direction: column;
		align-items: center;
	}

	.hint-arrow {
		width: 24px;
		height: 24px;
		border: 2px solid rgba(39, 255, 153, 0.8);
		position: relative;
	}

	.speed-arrow {
		border-left: none;
		border-top: none;
		transform: rotate(-45deg);
		border-radius: 0 4px 0 0;
	}

	.effects-arrow {
		border-right: none;
		border-top: none;
		transform: rotate(45deg);
		border-radius: 0 0 0 4px;
	}

	.boost-arrow {
		border-top: none;
		border-left: none;
		border-right: none;
		border-bottom: 2px solid rgba(255, 255, 39, 0.8);
		transform: rotate(45deg);
		border-radius: 0 0 4px 0;
	}

	.hint-text {
		display: flex;
		flex-direction: column;
		gap: 4px;
		background: rgba(0, 0, 0, 0.8);
		padding: 12px 16px;
		border-radius: 8px;
		border: 1px solid rgba(39, 255, 153, 0.3);
		backdrop-filter: blur(8px);
		max-width: 200px;
	}

	.boost-hint .hint-text {
		border-color: rgba(255, 255, 39, 0.3);
		text-align: center;
	}

	.effects-hint .hint-text {
		border-color: rgba(255, 39, 153, 0.3);
		text-align: right;
	}

	.hint-title {
		font-family: 'Press Start 2P', monospace;
		font-size: 11px;
		color: rgba(39, 255, 153, 1);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.effects-hint .hint-title {
		color: rgba(255, 39, 153, 1);
	}

	.boost-hint .hint-title {
		color: rgba(255, 255, 39, 1);
	}

	.hint-description {
		font-family: 'Pixelify Sans', sans-serif;
		font-size: 13px;
		color: rgba(255, 255, 255, 0.9);
		font-weight: 400;
	}

	.hint-keys {
		font-family: 'Press Start 2P', monospace;
		font-size: 9px;
		color: rgba(255, 255, 255, 0.6);
		margin-top: 4px;
	}

	@keyframes hintPulse {
		0%,
		100% {
			opacity: 0.7;
			transform: scale(1);
		}
		50% {
			opacity: 1;
			transform: scale(1.02);
		}
	}

	/* Mobile - Hide hints since hover doesn't work */
	@media (max-width: 768px) {
		.starfield-hints {
			display: none;
		}
	}

	/* Reduced motion preferences */
	@media (prefers-reduced-motion: reduce) {
		.control-hint {
			animation: none;
		}

		.starfield-hints {
			transition: none;
		}
	}
</style>

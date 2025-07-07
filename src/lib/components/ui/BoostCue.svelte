<!-- src/lib/components/ui/BoostCue.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { isTouchSupported, isMobileDevice } from '$lib/utils/touch-manager';

	let show = false;
	let isTouch = false;
	let isMobile = false;

	onMount(() => {
		if (!browser) return;

		// Detect device capabilities
		isTouch = isTouchSupported();
		isMobile = isMobileDevice();

		// Show cue based on device type
		// Desktop: Show after 3 seconds
		// Mobile: Show after 2 seconds (faster for touch users)
		const delay = isMobile ? 2000 : 3000;

		const timer = setTimeout(() => {
			show = true;
		}, delay);

		return () => clearTimeout(timer);
	});

	// Determine what instruction to show
	$: instruction = getInstructionText(isTouch, isMobile);
	$: keyText = getKeyText(isTouch, isMobile);

	function getInstructionText(touch: boolean, mobile: boolean): string {
		if (mobile && touch) {
			return 'Tap screen to Boost';
		} else if (touch && !mobile) {
			return 'Press SPACE or tap to Boost';
		} else {
			return 'Press SPACE to Boost';
		}
	}

	function getKeyText(touch: boolean, mobile: boolean): string {
		if (mobile && touch) {
			return 'TAP';
		} else if (touch && !mobile) {
			return 'SPACE / TAP';
		} else {
			return 'SPACE';
		}
	}
</script>

{#if show}
	<div class="boost-cue" class:mobile={isMobile} class:touch={isTouch}>
		{#if isMobile && isTouch}
			<!-- Mobile touch instruction -->
			<span class="instruction">Tap screen to</span>
			<span class="action">BOOST</span>
		{:else if isTouch && !isMobile}
			<!-- Desktop with touch capability -->
			Press <span class="key">SPACE</span> or <span class="key touch-key">TAP</span> to Boost
		{:else}
			<!-- Desktop keyboard only -->
			Press <span class="key">SPACE</span> to Boost
		{/if}
	</div>
{/if}

<style>
	.boost-cue {
		position: absolute;
		bottom: 2vh;
		right: 2vw;
		font-family: 'Press Start 2P', monospace;
		font-size: 0.625rem;
		color: rgba(255, 255, 255, 0.75);
		opacity: 0.9;
		animation: blink 1.6s step-end infinite;
		pointer-events: none;
		user-select: none;
		text-align: right;
		line-height: 1.4;
	}

	.boost-cue.mobile {
		/* Adjust positioning for mobile */
		bottom: 3vh;
		right: 3vw;
		font-size: 0.5rem;
		text-align: center;
		left: 50%;
		transform: translateX(-50%);
		right: auto;
	}

	.boost-cue .key {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.3);
		padding: 0.1em 0.3em;
		margin: 0 0.1em;
		border-radius: 2px;
		white-space: nowrap;
	}

	.boost-cue .key.touch-key {
		background: rgba(0, 255, 255, 0.1);
		border-color: rgba(0, 255, 255, 0.3);
		color: rgba(0, 255, 255, 0.9);
	}

	.boost-cue .instruction {
		display: block;
		font-size: 0.5rem;
		margin-bottom: 0.2em;
		opacity: 0.8;
	}

	.boost-cue .action {
		display: block;
		font-size: 0.75rem;
		color: rgba(255, 255, 0, 0.9);
		text-shadow: 0 0 4px rgba(255, 255, 0, 0.3);
	}

	/* Mobile-specific animations */
	.boost-cue.mobile {
		animation: mobileBoostBlink 2s ease-in-out infinite;
	}

	@keyframes blink {
		0%,
		100% {
			opacity: 0.9;
		}
		50% {
			opacity: 0.4;
		}
	}

	@keyframes mobileBoostBlink {
		0%,
		100% {
			opacity: 0.9;
			transform: translateX(-50%) scale(1);
		}
		50% {
			opacity: 0.6;
			transform: translateX(-50%) scale(1.05);
		}
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.boost-cue {
			font-size: 0.5rem;
		}

		.boost-cue .instruction {
			font-size: 0.4rem;
		}

		.boost-cue .action {
			font-size: 0.6rem;
		}
	}
</style>

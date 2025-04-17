<!-- src/lib/components/ui/BoostCue.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	let show = false;

	onMount(() => {
		if (!browser) return;
		// Only show on desktop
		if (window.innerWidth < 768) return;

		// Delay before showing cue
		const timer = setTimeout(() => {
			show = true;
		}, 3000);

		return () => clearTimeout(timer);
	});
</script>

{#if show}
	<div class="boost-cue">
		Press <span class="key">SPACE</span> to Boost
	</div>
{/if}

<style>
	.boost-cue {
		position: absolute;
		bottom: 2vh;
		right: 2vw;
		font-family: 'Press Start 2P', monospace;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.75);
		opacity: 0.9;
		animation: blink 1.2s step-end infinite;
		pointer-events: none;
		user-select: none;
	}
	.boost-cue .key {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.3);
		padding: 0.1em 0.3em;
		margin: 0 0.1em;
		border-radius: 2px;
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
</style>

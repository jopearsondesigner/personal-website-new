<!-- src/lib/components/ui/PerformanceMonitor.svelte -->
<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	export let enabled = true;

	let fpsElement;
	let lastTime = 0;
	let frames = 0;
	let fps = 0;
	let frameId;

	function update(time) {
		if (!browser || !enabled) return;

		frames++;

		if (time - lastTime >= 1000) {
			fps = Math.round((frames * 1000) / (time - lastTime));
			lastTime = time;
			frames = 0;

			if (fpsElement) {
				fpsElement.textContent = `FPS: ${fps}`;
				fpsElement.style.color = fps < 30 ? 'red' : fps < 50 ? 'yellow' : 'lime';
			}
		}

		frameId = requestAnimationFrame(update);
	}

	onMount(() => {
		if (browser && enabled) {
			frameId = requestAnimationFrame(update);
		}
	});

	onDestroy(() => {
		if (browser && frameId) {
			cancelAnimationFrame(frameId);
		}
	});
</script>

{#if enabled && browser}
	<div class="performance-monitor">
		<div bind:this={fpsElement}>FPS: --</div>
	</div>
{/if}

<style>
	.performance-monitor {
		position: fixed;
		top: 10px;
		right: 10px;
		background: rgba(0, 0, 0, 0.8);
		color: lime;
		font-family: monospace;
		padding: 8px;
		border-radius: 4px;
		z-index: 10000;
		font-size: 14px;
		box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
		pointer-events: none;
	}
</style>

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	// Add props
	export let visible = true;
	export let expanded = false;
	export let showSettings = false;

	let active = false;
	let monitor: HTMLDivElement;
	let frameCount = 0;
	let lastTime = 0;
	let fps = 0;
	let rafId: number;

	function updateStats() {
		frameCount++;
		const now = performance.now();

		if (now - lastTime >= 1000) {
			fps = Math.round((frameCount * 1000) / (now - lastTime));
			frameCount = 0;
			lastTime = now;

			if (monitor) {
				monitor.innerHTML = `FPS: ${fps}`;
			}
		}

		rafId = requestAnimationFrame(updateStats);
	}

	onMount(() => {
		if (!browser || active) return;
		active = true;
		lastTime = performance.now();
		rafId = requestAnimationFrame(updateStats);
	});

	onDestroy(() => {
		if (rafId) {
			cancelAnimationFrame(rafId);
		}
	});
</script>

{#if visible}
	<div
		bind:this={monitor}
		class="fixed top-4 left-4 bg-black/80 text-lime-500 font-mono p-2 rounded z-[999999] text-sm pointer-events-none
           {expanded ? 'w-64' : 'w-auto'}
           {showSettings ? 'h-auto' : 'h-8'}"
	>
		FPS: --
		{#if expanded}
			<div class="mt-2">
				<!-- Add expanded stats here if needed -->
			</div>
		{/if}
		{#if showSettings}
			<div class="mt-2">
				<!-- Add settings here if needed -->
			</div>
		{/if}
	</div>
{/if}

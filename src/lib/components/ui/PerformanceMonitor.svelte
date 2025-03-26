<!-- src/lib/components/ui/PerformanceMonitor.svelte -->
<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { writable } from 'svelte/store';

	// Accept enabled prop and create a store to track it
	export let enabled = false;
	const isEnabled = writable(enabled);

	// Update the store when the prop changes
	$: {
		isEnabled.set(enabled);
	}

	let fpsElement;
	let memoryElement;
	let lastTime = 0;
	let frames = 0;
	let fps = 0;
	let frameId;
	let touchStartX = 0;
	let touchStartY = 0;
	let monitorElement;
	let isVisible = true;

	// Track memory usage (when available)
	let memory = null;

	function update(time) {
		if (!browser || !$isEnabled) return;

		frames++;

		if (time - lastTime >= 1000) {
			fps = Math.round((frames * 1000) / (time - lastTime));
			lastTime = time;
			frames = 0;

			if (fpsElement) {
				fpsElement.textContent = `FPS: ${fps}`;
				fpsElement.style.color = fps < 30 ? 'red' : fps < 50 ? 'yellow' : 'lime';
			}

			// Update memory info if available
			if (memoryElement && window.performance && window.performance.memory) {
				memory = window.performance.memory;
				const usedHeapSize = (memory.usedJSHeapSize / 1048576).toFixed(2);
				const totalHeapSize = (memory.totalJSHeapSize / 1048576).toFixed(2);
				memoryElement.textContent = `MEM: ${usedHeapSize}MB / ${totalHeapSize}MB`;

				// Color code based on memory usage percentage
				const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
				memoryElement.style.color =
					usagePercent > 80 ? 'red' : usagePercent > 60 ? 'yellow' : 'lime';
			}
		}

		frameId = requestAnimationFrame(update);
	}

	// Handle touch events for mobile devices
	function handleTouchStart(event) {
		if (!$isEnabled) return;
		touchStartX = event.touches[0].clientX;
		touchStartY = event.touches[0].clientY;
	}

	function handleTouchEnd(event) {
		if (!$isEnabled || !monitorElement) return;

		// If it was a simple tap without much movement, toggle visibility
		const touchEndX = event.changedTouches[0].clientX;
		const touchEndY = event.changedTouches[0].clientY;
		const deltaX = Math.abs(touchEndX - touchStartX);
		const deltaY = Math.abs(touchEndY - touchStartY);

		if (deltaX < 10 && deltaY < 10) {
			isVisible = !isVisible;
			monitorElement.style.display = isVisible ? 'block' : 'none';
		}
	}

	onMount(() => {
		if (browser) {
			// Start monitoring if enabled
			if ($isEnabled) {
				frameId = requestAnimationFrame(update);
			}

			// Set up global touch handler for mobile devices
			// This ensures we can detect the 3-finger tap even when the monitor isn't visible
			document.addEventListener(
				'touchstart',
				(e) => {
					if (e.touches.length === 3) {
						isEnabled.update((value) => !value);
						if ($isEnabled && !frameId) {
							frameId = requestAnimationFrame(update);
						}
					}
				},
				{ passive: true }
			);

			// Add a device detection message on initial mount
			if (monitorElement) {
				const deviceInfo = document.createElement('div');
				deviceInfo.textContent = `Device: ${navigator.userAgent.includes('iPhone') ? 'iPhone' : navigator.userAgent.includes('iPad') ? 'iPad' : 'Other'}`;
				deviceInfo.style.fontSize = '10px';
				deviceInfo.style.opacity = '0.8';
				monitorElement.appendChild(deviceInfo);
			}
		}
	});

	onDestroy(() => {
		if (browser && frameId) {
			cancelAnimationFrame(frameId);
		}
	});
</script>

{#if browser}
	<div
		bind:this={monitorElement}
		class="performance-monitor"
		class:enabled={$isEnabled}
		style="display: {$isEnabled ? 'block' : 'none'}"
		on:touchstart={handleTouchStart}
		on:touchend={handleTouchEnd}
	>
		<div bind:this={fpsElement}>FPS: --</div>
		{#if window?.performance?.memory}
			<div bind:this={memoryElement}>MEM: --</div>
		{/if}
		<div class="monitor-help">Tap to hide, 3-finger tap anywhere to toggle</div>
	</div>
{/if}

<style>
	.performance-monitor {
		position: fixed;
		top: env(safe-area-inset-top, 10px);
		right: env(safe-area-inset-right, 10px);
		background: rgba(0, 0, 0, 0.8);
		color: lime;
		font-family: monospace;
		padding: 8px;
		border-radius: 4px;
		z-index: 10000;
		font-size: 14px;
		box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
		pointer-events: auto; /* Allow interaction */
		touch-action: manipulation; /* Optimize for touch */
		user-select: none; /* Prevent text selection */
	}

	.monitor-help {
		font-size: 10px;
		opacity: 0.7;
		margin-top: 4px;
	}

	/* Media query for mobile devices */
	@media (max-width: 767px) {
		.performance-monitor {
			font-size: 12px;
			padding: 6px;
			/* Ensure it's above everything else */
			z-index: 2147483647;
		}
	}

	/* Ensure visibility on iOS */
	@supports (-webkit-touch-callout: none) {
		.performance-monitor {
			/* iOS-specific adjustments */
			-webkit-transform: translateZ(0);
			transform: translateZ(0);
		}
	}
</style>

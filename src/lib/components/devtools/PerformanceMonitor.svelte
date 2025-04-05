<!-- src/lib/components/devtools/PerformanceMonitor.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { fpsStore } from '$lib/utils/frame-rate-controller';
	import { deviceCapabilities, memoryUsageStore } from '$lib/utils/device-performance';
	import { perfMonitorVisible } from '$lib/stores/performance-monitor';
	import { browser } from '$app/environment';

	// Monitor element for touch event handling
	let monitorElement: HTMLDivElement;

	// Touch handling variables
	let touchStartX = 0;
	let touchStartY = 0;
	let touchTimeout: number | null = null;

	// Handle double tap on mobile
	function handleTouchStart(event: TouchEvent) {
		const touch = event.touches[0];
		touchStartX = touch.clientX;
		touchStartY = touch.clientY;

		if (touchTimeout === null) {
			touchTimeout = window.setTimeout(() => {
				touchTimeout = null;
			}, 300);
		} else {
			// Double tap detected
			window.clearTimeout(touchTimeout);
			touchTimeout = null;

			// Toggle visibility on double tap
			perfMonitorVisible.update((value) => !value);
			event.preventDefault();
		}
	}

	// Always monitor in development, but only show when visible is true
	const shouldMonitor = import.meta.env.DEV;

	onMount(() => {
		if (browser && monitorElement) {
			// Add swipe gesture to hide the monitor
			monitorElement.addEventListener('touchstart', handleTouchStart, { passive: false });

			return () => {
				if (monitorElement) {
					monitorElement.removeEventListener('touchstart', handleTouchStart);
				}
				if (touchTimeout !== null) {
					window.clearTimeout(touchTimeout);
				}
			};
		}
	});
</script>

{#if shouldMonitor}
	<div
		bind:this={monitorElement}
		class="performance-monitor {$perfMonitorVisible ? 'visible' : 'hidden'}"
	>
		<div>FPS: {$fpsStore.toFixed(1)}</div>
		<div>Quality: {$deviceCapabilities?.tier || 'high'}</div>
		<div>Memory: {($memoryUsageStore * 100).toFixed(0)}%</div>
		<div class="shortcut-hint">Alt+Shift+P to toggle</div>
	</div>
{/if}

<style>
	.performance-monitor {
		position: fixed;
		bottom: 10px;
		right: 10px;
		background: rgba(0, 0, 0, 0.7);
		color: white;
		padding: 5px 10px;
		border-radius: 4px;
		font-size: 12px;
		z-index: 9999;
		transition:
			opacity 0.3s ease,
			transform 0.3s ease;
	}

	.performance-monitor.hidden {
		opacity: 0;
		transform: translateY(20px);
		pointer-events: none;
	}

	.performance-monitor.visible {
		opacity: 1;
		transform: translateY(0);
		pointer-events: auto;
	}

	.shortcut-hint {
		font-size: 10px;
		opacity: 0.7;
		margin-top: 2px;
	}

	/* Hide shortcut hint on smaller screens */
	@media (max-width: 767px) {
		.shortcut-hint {
			display: none;
		}

		.performance-monitor {
			font-size: 10px;
			padding: 3px 6px;
		}
	}
</style>

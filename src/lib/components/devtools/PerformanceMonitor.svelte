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

	// Dragging functionality
	let isDragging = false;
	let offsetX = 0;
	let offsetY = 0;

	// Toggle for detailed metrics display
	let showDetailedMetrics = false;

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

	// Dragging handlers
	function handleMouseDown(event: MouseEvent) {
		isDragging = true;
		offsetX = event.clientX - monitorElement.getBoundingClientRect().left;
		offsetY = event.clientY - monitorElement.getBoundingClientRect().top;
		event.preventDefault();
	}

	function handleMouseMove(event: MouseEvent) {
		if (!isDragging) return;

		const x = event.clientX - offsetX;
		const y = event.clientY - offsetY;

		// Constrain to viewport
		const maxX = window.innerWidth - monitorElement.offsetWidth;
		const maxY = window.innerHeight - monitorElement.offsetHeight;

		const constrainedX = Math.max(0, Math.min(x, maxX));
		const constrainedY = Math.max(0, Math.min(y, maxY));

		monitorElement.style.right = 'auto';
		monitorElement.style.bottom = 'auto';
		monitorElement.style.left = `${constrainedX}px`;
		monitorElement.style.top = `${constrainedY}px`;
	}

	function handleMouseUp() {
		isDragging = false;

		// Save position
		if (browser && monitorElement) {
			const rect = monitorElement.getBoundingClientRect();
			localStorage.setItem('perfMonitorX', String(rect.left));
			localStorage.setItem('perfMonitorY', String(rect.top));
		}
	}

	// Click outside to dismiss
	function handleClickOutside(event: MouseEvent) {
		if (monitorElement && !monitorElement.contains(event.target as Node) && $perfMonitorVisible) {
			// Only dismiss if we didn't just finish dragging
			if (!isDragging) {
				perfMonitorVisible.set(false);
			}
		}
	}

	// Always monitor, visibility controlled by store
	const shouldMonitor = true;

	onMount(() => {
		if (browser && monitorElement) {
			// Add swipe gesture to hide the monitor
			monitorElement.addEventListener('touchstart', handleTouchStart, { passive: false });

			// Add drag handlers
			monitorElement.addEventListener('mousedown', handleMouseDown);
			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);

			// Add click outside handler
			document.addEventListener('mousedown', handleClickOutside);

			// Load saved position
			const savedX = localStorage.getItem('perfMonitorX');
			const savedY = localStorage.getItem('perfMonitorY');

			if (savedX && savedY) {
				// Convert to numbers and validate
				const x = parseFloat(savedX);
				const y = parseFloat(savedY);

				// Make sure position is within viewport
				const maxX = window.innerWidth - monitorElement.offsetWidth;
				const maxY = window.innerHeight - monitorElement.offsetHeight;

				if (!isNaN(x) && !isNaN(y) && x >= 0 && y >= 0 && x <= maxX && y <= maxY) {
					monitorElement.style.right = 'auto';
					monitorElement.style.bottom = 'auto';
					monitorElement.style.left = `${x}px`;
					monitorElement.style.top = `${y}px`;
				}
			}

			return () => {
				if (monitorElement) {
					monitorElement.removeEventListener('touchstart', handleTouchStart);
					monitorElement.removeEventListener('mousedown', handleMouseDown);
				}
				document.removeEventListener('mousemove', handleMouseMove);
				document.removeEventListener('mouseup', handleMouseUp);
				document.removeEventListener('mousedown', handleClickOutside);

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
		class="performance-monitor debug-panel {$perfMonitorVisible ? 'visible' : 'hidden'}"
		data-perf-monitor="true"
		role="status"
		aria-live="polite"
	>
		<div class="monitor-header" on:mousedown={handleMouseDown}>
			<span class="title">Performance Monitor</span>
			<span class="close-btn" on:click={() => perfMonitorVisible.set(false)}>×</span>
		</div>

		<div class="basic-metrics">
			<div>FPS: {$fpsStore.toFixed(1)}</div>
			<div>Quality: {$deviceCapabilities?.tier || 'high'}</div>
			<div>Memory: {($memoryUsageStore * 100).toFixed(0)}%</div>
		</div>

		<button class="metrics-toggle" on:click={() => (showDetailedMetrics = !showDetailedMetrics)}>
			{showDetailedMetrics ? 'Hide Details' : 'Show Details'}
		</button>

		{#if showDetailedMetrics}
			<div class="detailed-metrics">
				<div>Device Tier: {$deviceCapabilities?.tier || 'unknown'}</div>
				<div>Max Stars: {$deviceCapabilities?.maxStars || 'unknown'}</div>
				<div>Effects Level: {$deviceCapabilities?.effectsLevel || 'unknown'}</div>
				<div>
					Device Type: {$deviceCapabilities?.isMobile
						? 'Mobile'
						: $deviceCapabilities?.isTablet
							? 'Tablet'
							: 'Desktop'}
				</div>
				<div>
					Hardware Acceleration: {$deviceCapabilities?.hasGPUAcceleration ? 'Enabled' : 'Disabled'}
				</div>
				<div>Frame Skip: {$deviceCapabilities?.frameSkip || 0}</div>
				<div>Update Interval: {$deviceCapabilities?.updateInterval || 0}ms</div>
			</div>
		{/if}

		<div class="shortcut-hint">Ctrl+M to toggle | Drag to move</div>
	</div>
{/if}

<style>
	.performance-monitor {
		position: fixed;
		bottom: 10px;
		right: 10px;
		background: rgba(0, 0, 0, 0.85);
		color: white;
		padding: 0;
		border-radius: 6px;
		font-size: 12px;
		z-index: 9999;
		transition:
			opacity 0.3s ease,
			transform 0.3s ease;
		min-width: 200px;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
		overflow: hidden;
		font-family: monospace;
		user-select: none;
	}

	.performance-monitor.hidden {
		opacity: 0;
		transform: translateY(20px);
		pointer-events: none;
		/* Use visibility instead of display:none to keep transitions working */
		visibility: hidden;
	}

	.performance-monitor.visible {
		opacity: 1;
		transform: translateY(0);
		pointer-events: auto;
		visibility: visible;
	}

	.monitor-header {
		background: rgba(40, 40, 40, 0.9);
		padding: 5px 10px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		cursor: move;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.title {
		font-weight: bold;
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 1px;
	}

	.close-btn {
		cursor: pointer;
		font-size: 16px;
		height: 20px;
		width: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
	}

	.close-btn:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	.basic-metrics {
		padding: 8px 10px;
		display: grid;
		gap: 4px;
	}

	.metrics-toggle {
		background: rgba(60, 60, 60, 0.6);
		border: none;
		color: rgba(255, 255, 255, 0.8);
		padding: 4px;
		width: 100%;
		font-size: 10px;
		cursor: pointer;
		text-align: center;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.metrics-toggle:hover {
		background: rgba(80, 80, 80, 0.6);
	}

	.detailed-metrics {
		padding: 8px 10px;
		display: grid;
		gap: 4px;
		font-size: 11px;
		background: rgba(30, 30, 30, 0.6);
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.shortcut-hint {
		font-size: 10px;
		opacity: 0.6;
		padding: 5px;
		text-align: center;
		background: rgba(20, 20, 20, 0.8);
	}

	/* Hide shortcut hint on smaller screens */
	@media (max-width: 767px) {
		.performance-monitor {
			font-size: 10px;
			min-width: 160px;
		}

		.detailed-metrics {
			font-size: 9px;
		}
	}

	/* Arcade/gaming theme styles */
	.performance-monitor {
		border: 1px solid rgba(0, 255, 255, 0.3);
	}

	.title {
		color: rgb(0, 255, 255);
		text-shadow: 0 0 5px rgba(0, 255, 255, 0.5);
	}

	.basic-metrics div,
	.detailed-metrics div {
		position: relative;
		padding-left: 2px;
	}

	.basic-metrics div::before {
		content: '>';
		color: rgb(0, 255, 255);
		margin-right: 4px;
		opacity: 0.7;
	}
</style>

<!-- src/lib/components/devtools/PerformanceMonitor.svelte -->
<script lang="ts">
	import { fpsStore } from '$lib/utils/frame-rate-controller';
	import { deviceCapabilities, memoryUsageStore } from '$lib/utils/device-performance';

	// Show only in development
	const showMonitor = import.meta.env.DEV;
</script>

{#if showMonitor}
	<div class="performance-monitor">
		<div>FPS: {$fpsStore.toFixed(1)}</div>
		<div>Quality: {$deviceCapabilities?.tier || 'high'}</div>
		<div>Memory: {($memoryUsageStore * 100).toFixed(0)}%</div>
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
	}
</style>

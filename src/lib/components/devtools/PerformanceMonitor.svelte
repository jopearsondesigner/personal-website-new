<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		performanceMetrics,
		frameRateController,
		debugFrameRateController
	} from '$lib/utils/frame-rate-controller';
	import {
		deviceCapabilities,
		runtimeCapabilities,
		debugDeviceCapabilities,
		overrideCapabilities
	} from '$lib/utils/device-performance';

	// Props
	export let expanded = false;
	export let showSettings = false;

	// Local state
	let showAdvanced = false;
	let userTier: 'auto' | 'low' | 'medium' | 'high' | 'ultra' = 'auto';
	let batteryOptimization = false;
	let fpsHistory: number[] = [];
	let fpsHistoryMax = 100;
	let chartWidth = 200;
	let chartHeight = 50;

	// FPS history tracking
	let fpsTimer: ReturnType<typeof setInterval>;

	function toggleExpanded() {
		expanded = !expanded;
	}

	function toggleSettings() {
		showSettings = !showSettings;
	}

	function toggleAdvanced() {
		showAdvanced = !showAdvanced;

		if (showAdvanced) {
			// Enable debug mode when showing advanced view
			debugFrameRateController(true);
			debugDeviceCapabilities();
		} else {
			// Disable debug when hiding
			debugFrameRateController(false);
		}
	}

	function applyQualitySettings() {
		// Update device capabilities with user selections
		overrideCapabilities({
			userQualityPreference: userTier,
			batteryOptimization
		});
	}

	function resetQualitySettings() {
		// Reset to automatic detection
		userTier = 'auto';
		overrideCapabilities({
			userQualityPreference: 'auto',
			batteryOptimization: false
		});
		batteryOptimization = false;
	}

	// Format quality level for display
	function formatQuality(quality: number): string {
		return Math.round(quality * 100) + '%';
	}

	// Draw FPS chart
	function drawFpsChart() {
		const canvas = document.getElementById('fpsChart') as HTMLCanvasElement;
		if (!canvas) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		// Clear canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		if (fpsHistory.length < 2) return;

		// Find min/max for scaling
		const maxFps = Math.max(...fpsHistory, 60);
		const minFps = Math.min(...fpsHistory, 0);
		const range = maxFps - minFps;

		// Draw background
		ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Draw target FPS line
		const targetFps =
			$deviceCapabilities.tier === 'low' ? 30 : $deviceCapabilities.tier === 'medium' ? 45 : 60;
		const targetY = canvas.height - ((targetFps - minFps) / range) * canvas.height;

		ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
		ctx.beginPath();
		ctx.moveTo(0, targetY);
		ctx.lineTo(canvas.width, targetY);
		ctx.stroke();

		// Draw FPS line
		ctx.strokeStyle = 'rgb(0, 255, 0)';
		ctx.lineWidth = 1;
		ctx.beginPath();

		// Draw each point
		const stepX = canvas.width / (fpsHistory.length - 1);

		for (let i = 0; i < fpsHistory.length; i++) {
			const x = i * stepX;
			const normalizedY = (fpsHistory[i] - minFps) / range;
			const y = canvas.height - normalizedY * canvas.height;

			if (i === 0) {
				ctx.moveTo(x, y);
			} else {
				ctx.lineTo(x, y);
			}
		}

		ctx.stroke();

		// Color regions based on performance
		let previousX = 0;
		let previousY = 0;

		ctx.beginPath();

		for (let i = 0; i < fpsHistory.length; i++) {
			const x = i * stepX;
			const normalizedY = (fpsHistory[i] - minFps) / range;
			const y = canvas.height - normalizedY * canvas.height;

			if (i === 0) {
				ctx.moveTo(x, y);
				previousX = x;
				previousY = y;
			} else {
				// Draw gradient fill under line
				const gradient = ctx.createLinearGradient(previousX, previousY, x, y);

				if (fpsHistory[i] < targetFps * 0.5) {
					// Poor performance - red
					gradient.addColorStop(0, 'rgba(255, 0, 0, 0.3)');
					gradient.addColorStop(1, 'rgba(255, 0, 0, 0.3)');
				} else if (fpsHistory[i] < targetFps * 0.8) {
					// Below target - yellow
					gradient.addColorStop(0, 'rgba(255, 255, 0, 0.3)');
					gradient.addColorStop(1, 'rgba(255, 255, 0, 0.3)');
				} else {
					// Good performance - green
					gradient.addColorStop(0, 'rgba(0, 255, 0, 0.3)');
					gradient.addColorStop(1, 'rgba(0, 255, 0, 0.3)');
				}

				ctx.lineTo(x, y);

				// Fill the area under the current segment
				ctx.lineTo(x, canvas.height);
				ctx.lineTo(previousX, canvas.height);
				ctx.lineTo(previousX, previousY);
				ctx.closePath();
				ctx.fillStyle = gradient;
				ctx.fill();

				// Start a new path for the next segment
				ctx.beginPath();
				ctx.moveTo(x, y);

				previousX = x;
				previousY = y;
			}
		}
	}

	onMount(() => {
		// Initialize user settings from device capabilities
		userTier = $deviceCapabilities.userQualityPreference;
		batteryOptimization = $deviceCapabilities.batteryOptimization;

		// Start collecting FPS data for chart
		fpsTimer = setInterval(() => {
			// Add current FPS to history
			fpsHistory.push($performanceMetrics.fps);

			// Limit history size
			if (fpsHistory.length > fpsHistoryMax) {
				fpsHistory = fpsHistory.slice(-fpsHistoryMax);
			}

			// Update chart
			drawFpsChart();
		}, 500);
	});

	onDestroy(() => {
		if (fpsTimer) {
			clearInterval(fpsTimer);
		}
	});

	// Auto-update chart when expanded
	$: if (expanded) {
		drawFpsChart();
	}
</script>

// src/lib/components/PerformanceMonitor.svelte
<div
	class="performance-monitor {expanded ? 'expanded' : ''} {showSettings
		? 'settings'
		: ''} fixed right-2 bottom-2 bg-black/80 text-white p-2 rounded-lg shadow-lg z-50 font-mono text-sm"
>
	<div class="flex items-center justify-between">
		<button class="px-2 text-white/80 hover:text-white" on:click={toggleExpanded}>
			{expanded ? '▼' : '▲'}
			FPS: {Math.round($performanceMetrics.fps)}
		</button>

		<div class="flex gap-2">
			<span
				class="px-2 py-1 rounded text-xs {$performanceMetrics.qualityLevel === 'ultra'
					? 'bg-purple-500'
					: $performanceMetrics.qualityLevel === 'high'
						? 'bg-green-500'
						: $performanceMetrics.qualityLevel === 'medium'
							? 'bg-yellow-500'
							: 'bg-red-500'}"
			>
				{$performanceMetrics.qualityLevel.toUpperCase()} ({formatQuality(
					$performanceMetrics.quality
				)})
			</span>

			<button class="px-2 text-white/80 hover:text-white" on:click={toggleSettings}> ⚙️ </button>
		</div>
	</div>

	{#if expanded && !showSettings}
		<div class="mt-2">
			<canvas
				id="fpsChart"
				width={chartWidth}
				height={chartHeight}
				class="w-full bg-black/30 rounded"
			>
			</canvas>

			<div class="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs">
				<div class="text-gray-400">Device Tier:</div>
				<div>{$deviceCapabilities.tier} ({$deviceCapabilities.subTier}/9)</div>

				<div class="text-gray-400">Perf Trend:</div>
				<div>
					{#if $performanceMetrics.fps < ($deviceCapabilities.tier === 'low' ? 25 : $deviceCapabilities.tier === 'medium' ? 35 : 50)}
						<span class="text-red-400">Struggling</span>
					{:else}
						<span class="text-green-400">Stable</span>
					{/if}
				</div>

				<div class="text-gray-400">Frame Skip:</div>
				<div>{$performanceMetrics.frameSkip}</div>

				<div class="text-gray-400">Stars:</div>
				<div>{$deviceCapabilities.maxStars}</div>
			</div>

			{#if showAdvanced}
				<div class="mt-2 text-xs">
					<div class="grid grid-cols-2 gap-x-4 gap-y-1">
						<div class="text-gray-400">Resolution:</div>
						<div>{Math.round($deviceCapabilities.renderScale * 100)}%</div>

						<div class="text-gray-400">Update Interval:</div>
						<div>{$deviceCapabilities.updateInterval}ms</div>

						<div class="text-gray-400">WebGL:</div>
						<div>{$deviceCapabilities.useWebGL ? 'Enabled' : 'Disabled'}</div>

						<div class="text-gray-400">Battery Info:</div>
						<div>
							{#if $runtimeCapabilities.batteryLevel !== null}
								{Math.round($runtimeCapabilities.batteryLevel * 100)}%
								{$runtimeCapabilities.batteryCharging ? '⚡' : ''}
							{:else}
								Unknown
							{/if}
						</div>

						<div class="text-gray-400">Connection:</div>
						<div>{$runtimeCapabilities.connectionType}</div>

						<div class="text-gray-400">Runtime WebGL Score:</div>
						<div>{Math.round($runtimeCapabilities.webGLScore)}</div>

						<div class="text-gray-400">Runtime Canvas Score:</div>
						<div>{Math.round($runtimeCapabilities.canvasScore)}</div>
					</div>
				</div>
			{/if}

			<button
				on:click={toggleAdvanced}
				class="w-full mt-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
			>
				{showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
			</button>
		</div>
	{/if}

	{#if showSettings}
		<div class="mt-2">
			<h3 class="text-sm font-bold mb-2">Performance Settings</h3>

			<div class="mb-3">
				<label class="block text-gray-400 text-xs mb-1">Quality Preference</label>
				<select
					bind:value={userTier}
					class="w-full bg-gray-800 rounded px-2 py-1 border border-gray-700"
				>
					<option value="auto">Auto-detect (Recommended)</option>
					<option value="ultra">Ultra - Maximum Quality</option>
					<option value="high">High Quality</option>
					<option value="medium">Medium Quality</option>
					<option value="low">Low Quality - Best Performance</option>
				</select>
			</div>

			<div class="mb-3">
				<label class="flex items-center text-xs">
					<input type="checkbox" bind:checked={batteryOptimization} class="mr-2" />
					Battery Optimization Mode
				</label>
			</div>

			<div class="flex gap-2">
				<button
					on:click={applyQualitySettings}
					class="flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs"
				>
					Apply
				</button>

				<button
					on:click={resetQualitySettings}
					class="flex-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
				>
					Reset
				</button>

				<button
					on:click={toggleSettings}
					class="flex-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
				>
					Cancel
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.performance-monitor {
		width: 240px;
		transition: height 0.2s ease;
	}

	.performance-monitor.expanded {
		min-height: 200px;
	}
</style>

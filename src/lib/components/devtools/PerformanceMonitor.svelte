<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		performanceMetrics,
		frameRateController,
		debugFrameRateController,
		getQualityPreset
	} from '$lib/utils/frame-rate-controller';
	import {
		deviceCapabilities,
		runtimeCapabilities,
		debugDeviceCapabilities,
		overrideCapabilities,
		getDeviceTierDescription
	} from '$lib/utils/device-performance';
	import { browser } from '$app/environment';

	// Props
	export let expanded = false;
	export let showSettings = false;
	export let visible = true;

	// Local state
	let showAdvanced = false;
	let userTier: 'auto' | 'low' | 'medium' | 'high' | 'ultra' = 'auto';
	let batteryOptimization = false;
	let fpsHistory: number[] = [];
	let fpsHistoryMax = 60; // Store one minute of history at 1 sample per second
	let chartWidth = 200;
	let chartHeight = 50;
	let performanceWarnThreshold = 45; // FPS threshold for warning
	let performanceCriticalThreshold = 30; // FPS threshold for critical warning
	let sampleInterval = 1000; // Sample FPS every second
	let fpsTimer: ReturnType<typeof setInterval>;
	let monitorElement: HTMLDivElement;
	let isDragging = false;
	let dragStartX = 0;
	let dragStartY = 0;
	let positionX = 10;
	let positionY = 10;

	// Toggle expanded state
	function toggleExpanded() {
		expanded = !expanded;
		if (expanded) {
			// Re-draw chart when expanding
			setTimeout(drawFpsChart, 10);
		}
	}

	// Toggle settings panel
	function toggleSettings() {
		showSettings = !showSettings;
		expanded = showSettings || expanded;
	}

	// Toggle advanced view
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

	// Apply user-selected quality settings
	function applyQualitySettings() {
		// Update device capabilities with user selections
		overrideCapabilities({
			userQualityPreference: userTier,
			batteryOptimization
		});

		// Log the change
		console.info(
			`Quality settings updated: ${userTier}, battery optimization: ${batteryOptimization}`
		);
	}

	// Reset quality settings to automatic detection
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

	// Get color for FPS display based on current performance
	function getFpsColor(fps: number): string {
		if (fps < performanceCriticalThreshold) return 'text-red-500';
		if (fps < performanceWarnThreshold) return 'text-yellow-500';
		return 'text-green-500';
	}

	// Draw FPS chart with performance zones
	function drawFpsChart() {
		if (!browser) return;

		const canvas = document.getElementById('fpsChart') as HTMLCanvasElement;
		if (!canvas) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		// Clear canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		if (fpsHistory.length < 2) return;

		// Find min/max for scaling
		const targetFps =
			$deviceCapabilities.tier === 'low' ? 30 : $deviceCapabilities.tier === 'medium' ? 45 : 60;
		const maxFps = Math.max(...fpsHistory, targetFps * 1.2);
		const minFps = Math.min(...fpsHistory, Math.max(0, targetFps * 0.5));
		const range = maxFps - minFps;

		// Draw background
		ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Draw performance zones
		const criticalY =
			canvas.height - ((performanceCriticalThreshold - minFps) / range) * canvas.height;
		const warningY = canvas.height - ((performanceWarnThreshold - minFps) / range) * canvas.height;

		// Critical zone (red)
		ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
		ctx.fillRect(0, criticalY, canvas.width, canvas.height - criticalY);

		// Warning zone (yellow)
		ctx.fillStyle = 'rgba(234, 179, 8, 0.2)';
		ctx.fillRect(0, warningY, canvas.width, criticalY);

		// Good zone (green)
		ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
		ctx.fillRect(0, 0, canvas.width, warningY);

		// Draw target FPS line
		const targetY = canvas.height - ((targetFps - minFps) / range) * canvas.height;
		ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
		ctx.lineWidth = 1;
		ctx.setLineDash([4, 2]);
		ctx.beginPath();
		ctx.moveTo(0, targetY);
		ctx.lineTo(canvas.width, targetY);
		ctx.stroke();
		ctx.setLineDash([]);

		// Draw FPS line
		ctx.strokeStyle = 'rgb(255, 255, 255)';
		ctx.lineWidth = 2;
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
	}

	// Setup dragging functionality
	function handleMouseDown(event: MouseEvent) {
		if (event.target instanceof HTMLElement && event.target.closest('.monitor-header')) {
			isDragging = true;
			dragStartX = event.clientX - positionX;
			dragStartY = event.clientY - positionY;
			event.preventDefault();
		}
	}

	function handleMouseMove(event: MouseEvent) {
		if (!isDragging) return;

		positionX = event.clientX - dragStartX;
		positionY = event.clientY - dragStartY;

		// Keep monitor within viewport bounds
		if (monitorElement) {
			const rect = monitorElement.getBoundingClientRect();

			if (positionX < 0) positionX = 0;
			if (positionY < 0) positionY = 0;
			if (positionX > window.innerWidth - rect.width) {
				positionX = window.innerWidth - rect.width;
			}
			if (positionY > window.innerHeight - rect.height) {
				positionY = window.innerHeight - rect.height;
			}
		}

		event.preventDefault();
	}

	function handleMouseUp() {
		isDragging = false;

		// Save position to localStorage
		if (browser) {
			try {
				localStorage.setItem('perfMonitorPosition', JSON.stringify({ x: positionX, y: positionY }));
			} catch (e) {
				console.warn('Could not save performance monitor position');
			}
		}
	}

	// Keyboard shortcut handler
	function handleKeyDown(event: KeyboardEvent) {
		// Only handle keyboard shortcuts when Alt key is pressed
		if (event.altKey) {
			if (event.key === 'p') {
				// Alt+P: Toggle visibility
				visible = !visible;
				event.preventDefault();
			} else if (visible && event.key === 'e') {
				// Alt+E: Toggle expanded
				toggleExpanded();
				event.preventDefault();
			} else if (visible && event.key === 's') {
				// Alt+S: Toggle settings
				toggleSettings();
				event.preventDefault();
			} else if (visible && event.key === 'a') {
				// Alt+A: Toggle advanced
				toggleAdvanced();
				event.preventDefault();
			}
		}
	}

	onMount(() => {
		if (!browser) return;

		// Initialize user settings from device capabilities
		userTier = $deviceCapabilities.userQualityPreference;
		batteryOptimization = $deviceCapabilities.batteryOptimization;

		// Restore position from localStorage
		try {
			const savedPosition = localStorage.getItem('perfMonitorPosition');
			if (savedPosition) {
				const position = JSON.parse(savedPosition);
				positionX = position.x;
				positionY = position.y;
			}
		} catch (e) {
			console.warn('Could not restore performance monitor position');
		}

		// Start collecting FPS data for chart
		fpsTimer = setInterval(() => {
			// Add current FPS to history with minimal impact
			fpsHistory = [...fpsHistory, $performanceMetrics.fps];

			// Limit history size
			if (fpsHistory.length > fpsHistoryMax) {
				fpsHistory = fpsHistory.slice(-fpsHistoryMax);
			}

			// Only update chart if expanded
			if (expanded) {
				// Use requestAnimationFrame to optimize chart drawing
				requestAnimationFrame(drawFpsChart);
			}
		}, sampleInterval);

		// Add keyboard shortcut listener
		window.addEventListener('keydown', handleKeyDown);

		// Add drag event listeners
		window.addEventListener('mousemove', handleMouseMove);
		window.addEventListener('mouseup', handleMouseUp);
	});

	onDestroy(() => {
		if (fpsTimer) {
			clearInterval(fpsTimer);
		}

		// Remove event listeners
		if (browser) {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('mousemove', handleMouseMove);
			window.removeEventListener('mouseup', handleMouseUp);
		}
	});

	// Auto-update chart when expanded
	$: if (expanded && browser) {
		// Use requestAnimationFrame to optimize layout updates
		requestAnimationFrame(drawFpsChart);
	}

	// Current quality settings
	$: qualitySettings = getQualityPreset($performanceMetrics.qualityLevel);

	// Format device tier for display
	$: deviceTierDisplay = getDeviceTierDescription();

	// Check if current device is mobile
	$: isMobile = $deviceCapabilities.isMobile;
</script>

{#if visible && browser}
	<div
		bind:this={monitorElement}
		class="performance-monitor fixed z-[9999] {expanded ? 'expanded' : ''} {showSettings
			? 'settings'
			: ''}
	       bg-black/90 text-white rounded-lg shadow-lg font-mono text-sm"
		style="top: {positionY}px; right: {positionX}px;
	       {isDragging ? 'user-select: none;' : ''}"
		on:mousedown={handleMouseDown}
	>
		<div
			class="monitor-header p-2 flex items-center justify-between cursor-move border-b border-gray-700"
		>
			<button
				class="px-2 text-white/80 hover:text-white flex items-center"
				on:click={toggleExpanded}
			>
				<span class="mr-1">{expanded ? '▼' : '▲'}</span>
				<span class={getFpsColor($performanceMetrics.fps)}>
					{Math.round($performanceMetrics.fps)} FPS
				</span>
			</button>

			<div class="flex gap-2 items-center">
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

				<button
					class="px-2 text-white/80 hover:text-white"
					title="Settings"
					on:click={toggleSettings}
				>
					⚙️
				</button>
			</div>
		</div>

		{#if expanded && !showSettings}
			<div class="p-2 border-b border-gray-700">
				<canvas
					id="fpsChart"
					width={chartWidth}
					height={chartHeight}
					class="w-full bg-black/30 rounded"
				>
				</canvas>

				<div class="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs">
					<div class="text-gray-400">Device:</div>
					<div>{deviceTierDisplay} {isMobile ? '(Mobile)' : ''}</div>

					<div class="text-gray-400">CPU Load:</div>
					<div class="flex items-center">
						<div class="w-16 h-2 bg-gray-700 rounded-full mr-2">
							<div
								class="h-2 rounded-full {$performanceMetrics.cpuLoad > 0.8
									? 'bg-red-500'
									: $performanceMetrics.cpuLoad > 0.5
										? 'bg-yellow-500'
										: 'bg-green-500'}"
								style="width: {$performanceMetrics.cpuLoad * 100}%"
							></div>
						</div>
						{Math.round($performanceMetrics.cpuLoad * 100)}%
					</div>

					<div class="text-gray-400">Frame Skip:</div>
					<div>{$performanceMetrics.frameSkip}</div>

					<div class="text-gray-400">Update Rate:</div>
					<div>{Math.round(1000 / $deviceCapabilities.updateInterval)} Hz</div>
				</div>

				{#if showAdvanced}
					<div class="mt-2 text-xs border-t border-gray-700 pt-2">
						<div class="grid grid-cols-2 gap-x-4 gap-y-1">
							<div class="text-gray-400">Effects:</div>
							<div>
								{qualitySettings.effectsEnabled.glow ? 'Glow ' : ''}
								{qualitySettings.effectsEnabled.blur ? 'Blur ' : ''}
								{qualitySettings.effectsEnabled.shadows ? 'Shadows ' : ''}
							</div>

							<div class="text-gray-400">Resolution:</div>
							<div>{Math.round(qualitySettings.renderSettings.resolution * 100)}%</div>

							<div class="text-gray-400">Anti-aliasing:</div>
							<div>{qualitySettings.renderSettings.antialiasing ? 'On' : 'Off'}</div>

							<div class="text-gray-400">Memory:</div>
							<div>
								{$performanceMetrics.memoryUsage > 0
									? Math.round($performanceMetrics.memoryUsage * 100) + '%'
									: 'N/A'}
							</div>

							<div class="text-gray-400">WebGL:</div>
							<div>{$deviceCapabilities.useWebGL ? 'Enabled' : 'Disabled'}</div>

							<div class="text-gray-400">Battery:</div>
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

							{#if $performanceMetrics.debugMode}
								<div class="text-gray-400">Last events:</div>
								<div class="max-h-20 overflow-y-auto">
									{#each $performanceMetrics.eventLog.slice(-3) as event}
										<div class="truncate text-xs">{event.event}</div>
									{/each}
								</div>
							{/if}
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
			<div class="p-2">
				<h3 class="text-sm font-bold mb-2 border-b border-gray-700 pb-1">Performance Settings</h3>

				<div class="mb-3">
					<label class="block text-gray-400 text-xs mb-1">Quality Preference</label>
					<select
						bind:value={userTier}
						class="w-full bg-gray-800 rounded px-2 py-1 border border-gray-700 text-sm"
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
					<p class="text-gray-400 text-xs mt-1">
						Reduces animations when not charging or on low battery
					</p>
				</div>

				<div class="grid grid-cols-2 gap-2">
					<button
						on:click={applyQualitySettings}
						class="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs"
					>
						Apply
					</button>

					<button
						on:click={resetQualitySettings}
						class="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
					>
						Reset
					</button>
				</div>

				<div class="mt-4 text-xs text-gray-400 border-t border-gray-700 pt-2">
					<div>Keyboard Shortcuts:</div>
					<div class="grid grid-cols-2 gap-1 mt-1">
						<div>Alt+P:</div>
						<div>Toggle Visibility</div>
						<div>Alt+E:</div>
						<div>Toggle Expanded</div>
						<div>Alt+S:</div>
						<div>Toggle Settings</div>
						<div>Alt+A:</div>
						<div>Toggle Advanced</div>
					</div>
				</div>

				<button
					on:click={toggleSettings}
					class="w-full mt-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
				>
					Close
				</button>
			</div>
		{/if}
	</div>
{/if}

<style>
	.performance-monitor {
		width: 240px;
		transition: all 0.2s ease;
		box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
		opacity: 0.9;
	}

	.performance-monitor:hover {
		opacity: 1;
	}

	.performance-monitor.expanded {
		min-height: 200px;
	}

	.performance-monitor:not(.expanded):not(.settings) {
		width: auto;
		min-width: 140px;
	}

	@media (max-width: 768px) {
		.performance-monitor {
			width: 200px;
			font-size: 0.75rem;
		}
	}
</style>

<!-- src/lib/components/ui/PerformanceMonitor.svelte -->
<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { writable } from 'svelte/store';
	import { frameRateController } from '$lib/utils/frame-rate-controller';
	import { animationMode } from '$lib/utils/animation-mode';

	// Accept enabled prop and create a store to track it
	export let enabled = false;
	export let showAdvanced = false;
	export let autoOptimize = true;

	const isEnabled = writable(enabled);
	const isAdvanced = writable(showAdvanced);
	const isAutoOptimize = writable(autoOptimize);

	// Update the stores when props change
	$: {
		isEnabled.set(enabled);
		isAdvanced.set(showAdvanced);
		isAutoOptimize.set(autoOptimize);
	}

	// Performance data
	let fpsElement;
	let memoryElement;
	let cpuElement;
	let qualityElement;
	let frameSkipElement;
	let frameTimeElement;
	let graphElement;
	let optimizeTipsElement;

	let lastTime = 0;
	let frames = 0;
	let fps = 0;
	let frameId;
	let touchStartX = 0;
	let touchStartY = 0;
	let monitorElement;
	let isVisible = true;
	let frameTimes = Array(30).fill(0);
	let frameTimesIndex = 0;
	let avgFrameTime = 0;
	let memoryUsage = 0;
	let cpuUsage = 0;
	let batteryLevel = null;
	let deviceType = 'Unknown';
	let qualityLevel = 1;
	let frameSkip = 0;
	let frameTimeHistory = [];

	// For device profiling
	let deviceProfiled = false;
	let profiledScore = 0;
	let optimizationTips = [];

	// Start FRC with the component
	let frcUnsubscribeFps;
	let frcUnsubscribeQuality;

	function update(time) {
		if (!browser || !$isEnabled) return;

		frames++;

		// Calculate frame time for this frame
		const lastFrameTime = time - lastTime;
		frameTimes[frameTimesIndex] = lastFrameTime;
		frameTimesIndex = (frameTimesIndex + 1) % frameTimes.length;

		// Calculate average frame time
		const validFrameTimes = frameTimes.filter((t) => t > 0);
		avgFrameTime =
			validFrameTimes.length > 0
				? validFrameTimes.reduce((sum, t) => sum + t, 0) / validFrameTimes.length
				: 0;

		// Track frame time history for graph
		if (frameTimeHistory.length > 50) frameTimeHistory.shift();
		frameTimeHistory.push(avgFrameTime);

		if (time - lastTime >= 1000) {
			fps = Math.round((frames * 1000) / (time - lastTime));
			lastTime = time;
			frames = 0;

			if (fpsElement) {
				fpsElement.textContent = `FPS: ${fps}`;
				fpsElement.style.color = fps < 30 ? 'red' : fps < 50 ? 'yellow' : 'lime';
			}

			if (frameTimeElement) {
				frameTimeElement.textContent = `Frame: ${avgFrameTime.toFixed(1)}ms`;
				frameTimeElement.style.color =
					avgFrameTime > 33 ? 'red' : avgFrameTime > 20 ? 'yellow' : 'lime';
			}

			// Update memory info if available
			if (memoryElement && window.performance && window.performance.memory) {
				const memory = window.performance.memory;
				const usedHeapSize = (memory.usedJSHeapSize / 1048576).toFixed(1);
				const totalHeapSize = (memory.totalJSHeapSize / 1048576).toFixed(1);
				memoryUsage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

				memoryElement.textContent = `MEM: ${usedHeapSize}MB`;
				memoryElement.style.color = memoryUsage > 80 ? 'red' : memoryUsage > 60 ? 'yellow' : 'lime';
			}

			// Update quality info
			if (qualityElement) {
				qualityElement.textContent = `QUAL: ${(qualityLevel * 100).toFixed(0)}%`;
				qualityElement.style.color =
					qualityLevel < 0.5 ? 'red' : qualityLevel < 0.8 ? 'yellow' : 'lime';
			}

			// Update frame skip info
			if (frameSkipElement) {
				frameSkipElement.textContent = `SKIP: ${frameSkip}`;
				frameSkipElement.style.color = frameSkip > 1 ? 'red' : frameSkip > 0 ? 'yellow' : 'lime';
			}

			// Draw performance graph if in advanced mode
			if ($isAdvanced && graphElement) {
				drawPerformanceGraph();
			}

			// Run device profiling if not done yet
			if (!deviceProfiled && $isEnabled) {
				runDeviceProfiler();
			}

			// Auto-optimize if enabled and performance is poor
			if ($isAutoOptimize && fps < 30 && !deviceProfiled) {
				suggestOptimizations();
			}
		}

		frameId = requestAnimationFrame(update);
	}

	function drawPerformanceGraph() {
		const ctx = graphElement.getContext('2d');
		const width = graphElement.width;
		const height = graphElement.height;

		// Clear background
		ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
		ctx.fillRect(0, 0, width, height);

		// Draw frame time graph
		ctx.beginPath();
		ctx.strokeStyle = avgFrameTime > 33 ? 'red' : avgFrameTime > 20 ? 'yellow' : 'lime';
		ctx.lineWidth = 1;

		const maxFrameTime = 60; // Cap at 60ms for visibility

		frameTimeHistory.forEach((frameTime, index) => {
			const x = (index / 50) * width;
			const y = height - (Math.min(frameTime, maxFrameTime) / maxFrameTime) * height;
			if (index === 0) {
				ctx.moveTo(x, y);
			} else {
				ctx.lineTo(x, y);
			}
		});

		ctx.stroke();

		// Draw target frame time line (16.7ms for 60fps)
		ctx.beginPath();
		ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
		ctx.setLineDash([2, 2]);
		ctx.moveTo(0, height - (16.7 / maxFrameTime) * height);
		ctx.lineTo(width, height - (16.7 / maxFrameTime) * height);
		ctx.stroke();
		ctx.setLineDash([]);
	}

	function runDeviceProfiler() {
		deviceProfiled = true;

		// Create performance score based on FPS, memory usage, and frame time
		const fpsScore = fps / 60; // 0-1 where 1 is 60fps
		const memoryScore = memoryUsage > 0 ? 1 - memoryUsage / 100 : 0.5; // 0-1 where 1 is low memory usage
		const frameTimeScore = avgFrameTime > 0 ? Math.min(1, 16.7 / avgFrameTime) : 0.5; // 0-1 where 1 is 16.7ms frame time

		// Weight scores (FPS is most important)
		profiledScore = fpsScore * 0.6 + frameTimeScore * 0.3 + memoryScore * 0.1;

		// Generate optimization tips based on performance profile
		suggestOptimizations();
	}

	function suggestOptimizations() {
		optimizationTips = [];

		if (fps < 30) {
			// FPS is low, suggest reducing effects complexity
			optimizationTips.push('Reduce particle count by 50%');
			optimizationTips.push('Disable complex CSS effects (shadows, blurs)');
			optimizationTips.push('Enable frame skipping for animations');
		}

		if (avgFrameTime > 33) {
			// Frame time is high, suggest JS optimizations
			optimizationTips.push('Switch to minimal animation mode');
			optimizationTips.push('Reduce DOM element count');
			optimizationTips.push('Implement spatial rendering');
		}

		if (memoryUsage > 70) {
			// Memory usage is high, suggest memory optimizations
			optimizationTips.push('Clean up unused resources');
			optimizationTips.push('Reduce texture resolution');
			optimizationTips.push('Defer non-critical assets');
		}

		// Show tips in the UI
		if (optimizeTipsElement && optimizationTips.length > 0) {
			optimizeTipsElement.innerHTML = '';
			optimizationTips.forEach((tip) => {
				const tipElement = document.createElement('div');
				tipElement.textContent = tip;
				tipElement.style.fontSize = '10px';
				tipElement.style.marginTop = '2px';
				optimizeTipsElement.appendChild(tipElement);
			});
		}
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

	function handleDoubleClick() {
		if (!$isEnabled) return;
		isAdvanced.update((val) => !val);
	}

	function toggleAutoOptimize() {
		isAutoOptimize.update((val) => !val);
	}

	// Apply suggested optimizations
	function applyOptimizations() {
		if (!browser) return;

		// Apply optimizations by changing animation mode and quality
		if (fps < 30) {
			animationMode.set('minimal');
			frameRateController.qualityLevel.set(0.5);
		} else if (fps < 45) {
			animationMode.set('reduced');
			frameRateController.qualityLevel.set(0.7);
		}

		// Save optimization settings to localStorage for persistence
		try {
			localStorage.setItem('autoOptimize', 'true');
			localStorage.setItem('animationMode', 'minimal');
			localStorage.setItem('qualityLevel', '0.5');
		} catch (e) {
			// Ignore storage errors
		}

		// Refresh the page to apply settings
		if (confirm('Optimizations applied. Refresh page for best results?')) {
			window.location.reload();
		}
	}

	onMount(() => {
		if (browser) {
			// Initialize the frame rate controller
			frameRateController.start();

			// Subscribe to FRC updates
			frcUnsubscribeFps = frameRateController.subscribeFps((newFps) => {
				fps = newFps;
			});

			frcUnsubscribeQuality = frameRateController.subscribeQuality((newQuality) => {
				qualityLevel = newQuality;
			});

			// Start monitoring if enabled
			if ($isEnabled) {
				frameId = requestAnimationFrame(update);
			}

			// Detect device type
			deviceType = detectDeviceType();

			// Set up global touch handler for mobile devices
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

			// Try to access battery API
			if ('getBattery' in navigator) {
				navigator.getBattery().then((battery) => {
					batteryLevel = battery.level * 100;

					// Update when battery changes
					battery.addEventListener('levelchange', () => {
						batteryLevel = battery.level * 100;
					});
				});
			}

			// Create canvas for performance graph
			if ($isAdvanced && graphElement) {
				graphElement.width = 100;
				graphElement.height = 40;
			}
		}
	});

	onDestroy(() => {
		if (browser) {
			if (frameId) {
				cancelAnimationFrame(frameId);
			}

			if (frcUnsubscribeFps) frcUnsubscribeFps();
			if (frcUnsubscribeQuality) frcUnsubscribeQuality();

			// Stop the frame rate controller if we were the ones who started it
			if ($isEnabled) {
				frameRateController.stop();
			}
		}
	});

	// Detect device type and capabilities
	function detectDeviceType() {
		if (!browser) return 'Unknown';

		const ua = navigator.userAgent;
		let deviceInfo = '';

		// Check for mobile devices
		if (/iPhone/.test(ua)) {
			deviceInfo = 'iPhone';
			// Try to determine model based on screen size
			const { width, height } = window.screen;
			const maxDim = Math.max(width, height);
			if (maxDim >= 926) deviceInfo += ' 13/14 Pro Max';
			else if (maxDim >= 844) deviceInfo += ' 12/13/14 Pro';
			else if (maxDim >= 812) deviceInfo += ' X/11 Pro';
			else deviceInfo += ' 8 or older';
		} else if (/iPad/.test(ua)) {
			deviceInfo = 'iPad';
		} else if (/Android/.test(ua)) {
			deviceInfo = 'Android';

			// Check for high-end vs low-end
			if (navigator.deviceMemory && navigator.deviceMemory < 4) {
				deviceInfo += ' (Low-end)';
			} else if (navigator.deviceMemory && navigator.deviceMemory >= 6) {
				deviceInfo += ' (High-end)';
			}
		} else {
			deviceInfo = 'Desktop';

			// Check for GPU acceleration
			const canvas = document.createElement('canvas');
			let gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
			if (gl) {
				const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
				if (debugInfo) {
					const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
					if (renderer) {
						if (/(nvidia|geforce|rtx|gtx)/i.test(renderer)) {
							deviceInfo += ' (NVIDIA GPU)';
						} else if (/(amd|radeon|rx)/i.test(renderer)) {
							deviceInfo += ' (AMD GPU)';
						} else if (/(intel|iris)/i.test(renderer)) {
							deviceInfo += ' (Intel GPU)';
						}
					}
				}
			}
		}

		return deviceInfo;
	}
</script>

{#if browser}
	<div
		bind:this={monitorElement}
		class="performance-monitor"
		class:enabled={$isEnabled}
		class:advanced={$isAdvanced}
		style="display: {$isEnabled ? 'block' : 'none'}"
		on:touchstart={handleTouchStart}
		on:touchend={handleTouchEnd}
		on:dblclick={handleDoubleClick}
	>
		<div class="header">
			<span>PERF</span>
			<button class="mini-button" on:click={toggleAutoOptimize}>
				{$isAutoOptimize ? '🔄' : '⏸'}
			</button>
		</div>

		<div bind:this={fpsElement} class="metric">FPS: --</div>
		<div bind:this={frameTimeElement} class="metric">Frame: --ms</div>

		{#if $isAdvanced}
			{#if window?.performance?.memory}
				<div bind:this={memoryElement} class="metric">MEM: --</div>
			{/if}

			<div bind:this={qualityElement} class="metric">QUAL: 100%</div>
			<div bind:this={frameSkipElement} class="metric">SKIP: 0</div>

			<div class="device-info">
				<div>Device: {deviceType}</div>
				{#if batteryLevel !== null}
					<div>Battery: {batteryLevel.toFixed(0)}%</div>
				{/if}
			</div>

			<canvas bind:this={graphElement} class="performance-graph"></canvas>

			{#if optimizationTips.length > 0}
				<div class="optimization-section">
					<div class="section-header">Suggested Optimizations:</div>
					<div bind:this={optimizeTipsElement} class="optimization-tips"></div>
					<button class="apply-button" on:click={applyOptimizations}>Apply</button>
				</div>
			{/if}
		{/if}

		<div class="monitor-help">Tap to hide, 3-finger tap to toggle, double-click for details</div>
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
		pointer-events: auto;
		touch-action: manipulation;
		user-select: none;
		max-width: 200px;
		transition: height 0.3s ease;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 4px;
	}

	.mini-button {
		background: none;
		border: none;
		color: white;
		cursor: pointer;
		padding: 0;
		font-size: 12px;
	}

	.metric {
		margin-bottom: 2px;
	}

	.device-info {
		margin-top: 8px;
		font-size: 10px;
		opacity: 0.8;
	}

	.performance-graph {
		width: 100%;
		height: 40px;
		margin-top: 8px;
		border-radius: 2px;
	}

	.optimization-section {
		margin-top: 8px;
		font-size: 10px;
	}

	.section-header {
		font-weight: bold;
		margin-bottom: 4px;
	}

	.optimization-tips {
		margin-bottom: 4px;
	}

	.apply-button {
		background: rgba(0, 255, 0, 0.2);
		border: 1px solid lime;
		color: lime;
		padding: 2px 8px;
		border-radius: 2px;
		cursor: pointer;
		font-size: 10px;
		width: 100%;
		margin-top: 4px;
	}

	.apply-button:hover {
		background: rgba(0, 255, 0, 0.3);
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
			z-index: 2147483647;
		}

		.advanced {
			max-height: 80vh;
			overflow-y: auto;
		}
	}

	/* Ensure visibility on iOS */
	@supports (-webkit-touch-callout: none) {
		.performance-monitor {
			-webkit-transform: translateZ(0);
			transform: translateZ(0);
		}
	}
</style>

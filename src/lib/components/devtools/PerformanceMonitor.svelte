<!-- src/lib/components/devtools/PerformanceMonitor.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fpsStore } from '$lib/utils/frame-rate-controller';
	import { deviceCapabilities, updateObjectPoolStats } from '$lib/utils/device-performance';
	import {
		perfMonitorVisible,
		setPerformanceMonitorVisibility
	} from '$lib/stores/performance-monitor';
	import { browser } from '$app/environment';
	import { get } from 'svelte/store';
	import {
		BenchmarkType as ImportedBenchmarkType,
		PerformanceBenchmark,
		benchmarkResultsStore
	} from '$lib/utils/performance-benchmarking';

	// UNIFIED MEMORY MANAGER IMPORTS - Replacing fragmented system
	import {
		memoryManager,
		currentMemoryInfo,
		memoryEvents,
		memoryPressure,
		memoryUsageStore,
		objectPoolStatsStore,
		type MemoryInfo,
		type MemoryEvent
	} from '$lib/utils/memory-manager';

	const BT =
		ImportedBenchmarkType ??
		({
			FPS: 0,
			MEMORY: 1,
			RENDERING: 2
		} as const); // SSR-safe fallback

	// Safe label map for UI (prevents `.FPS` on undefined)
	const LABELS: { FPS: string } = { FPS: 'FPS' };

	// **SSR SAFETY**: Safe store access with defaults
	$: safeObjectPoolStats = $objectPoolStatsStore || {
		utilizationRate: 0,
		activeObjects: 0,
		totalCapacity: 0,
		objectsCreated: 0,
		objectsReused: 0,
		reuseRatio: 0,
		estimatedMemorySaved: 0,
		// Generic fallbacks
		poolName: 'visual-effects',
		poolType: 'object'
	};

	$: safeMemoryUsage = $memoryUsageStore || 0;
	$: safeFPS = $fpsStore || 60;
	$: safeDeviceCapabilities = $deviceCapabilities || {
		tier: 'medium',
		maxEffectUnits: 200, // generic budget hint
		effectsLevel: 'normal',
		performance: { targetFPS: 60 } // keep for UI default
	};

	// Safe access to unified memory stores
	$: safeMemoryInfo = $currentMemoryInfo || {
		usedJSHeapSize: 0,
		totalJSHeapSize: 0,
		jsHeapSizeLimit: 0,
		usagePercentage: 0,
		availableMB: 0,
		usedMB: 0,
		limitMB: 0,
		timestamp: 0
	};

	$: safeMemoryEvents = $memoryEvents || [];
	$: safeMemoryPressure = $memoryPressure || 'low';

	// Monitor element for touch event handling
	let monitorElement: HTMLDivElement;
	let benchmarkResultsElement: HTMLDivElement;

	// Touch handling variables
	let touchStartX = 0;
	let touchStartY = 0;
	let touchDragStartX = 0;
	let touchDragStartY = 0;
	let touchTimeout: number | null = null;
	let initialTouchLeft = 0;
	let initialTouchTop = 0;
	let isTouchDragging = false;

	// Dragging functionality
	let isDragging = false;
	let offsetX = 0;
	let offsetY = 0;

	// Toggle for detailed metrics display
	let showDetailedMetrics = false;

	// Toggle for pool statistics display
	let showPoolMetrics = true; // Set to true by default for better visibility

	// Toggle for benchmark panel
	let showBenchmarkPanel = false;

	// Toggle for memory panel
	let showMemoryPanel = false;

	// Toggle for comparing results
	let showResultsComparison = false;

	// Benchmark running state
	let isBenchmarkRunning = false;
	let benchmarkProgress = 0;
	let benchmarkType: number = BT.FPS; // use the guarded enum
	let benchmarkDuration = 5000;
	let currentBenchmark: PerformanceBenchmark | null = null;

	// Test runner state
	let isTestRunning = false;
	let testProgress = 0;
	let currentTestId = '';
	let currentTestStep = '';

	// Memory monitor state - now using unified system
	let showMemoryReport = false;
	let memoryReport = '';

	// Chart related state
	let activeChart = 'fps'; // 'fps', 'memory', 'pool'
	let chartData: any[] = [];
	let fpsChartData: number[] = [];
	let memoryChartData: number[] = [];
	let poolUtilizationData: number[] = [];
	let timeLabels: string[] = [];

	// Performance trend data
	let performanceTrend = {
		fps: { rising: false, falling: false, stable: true, value: 0 },
		memory: { rising: false, falling: false, stable: true, value: 0 },
		poolUtilization: { rising: false, falling: false, stable: true, value: 0 }
	};

	// Previous values for trend detection
	let prevFPS = 0;
	let prevMemory = 0;
	let prevPoolUtilization = 0;

	// Performance warnings
	let warnings: string[] = [];

	// Benchmark results
	$: benchmarkResults = $benchmarkResultsStore || [];
	let selectedBenchmarkResults: any[] = [];
	let benchmarkComparisonResult: any = null;

	// Stats refresh interval handle
	let statsRefreshInterval: number | null = null;
	let chartUpdateInterval: number | null = null;
	let memoryUpdateInterval: number | null = null;

	/**
	 * Optimization: Throttle DOM updates to reduce rendering cost
	 * Benefit: Minimizes performance impact of the monitor itself
	 */
	let lastUpdateTime = 0;
	let pendingUpdate = false;
	let updateInterval = 500; // ms between updates

	// Subscribe to stores with throttling and SSR safety
	$: {
		if (browser && $perfMonitorVisible) {
			const now = performance.now();
			// Only trigger update at most once per interval
			if (now - lastUpdateTime > updateInterval && !pendingUpdate) {
				lastUpdateTime = now;
				pendingUpdate = true;

				// Schedule update on next animation frame
				requestAnimationFrame(() => {
					pendingUpdate = false;
					updatePerformanceData();
				});
			}
		}
	}

	/**
	 * **SSR SAFETY**: Memoize expensive calculations with safe defaults
	 */
	let memoizedStats = {
		utilizationPercentage: '0',
		reuseRatioPercentage: '0',
		memoryPercentage: '0',
		lastUpdateTime: 0
	};

	function updateMemoizedStats() {
		if (!browser) return; // ADD THIS LINE

		const now = performance.now();
		if (now - memoizedStats.lastUpdateTime < 250) return; // Throttle updates

		memoizedStats = {
			utilizationPercentage: ((safeObjectPoolStats.utilizationRate || 0) * 100).toFixed(0),
			reuseRatioPercentage: ((safeObjectPoolStats.reuseRatio || 0) * 100).toFixed(0),
			memoryPercentage: ((safeMemoryUsage || 0) * 100).toFixed(0),
			lastUpdateTime: now
		};
	}

	// Call updateMemoizedStats when stores change (browser only)
	$: if (browser && $perfMonitorVisible) {
		updateMemoizedStats();
	}

	// Update chart data from current performance metrics
	function updatePerformanceData() {
		if (!browser) return;

		fpsChartData.push(safeFPS);
		if (fpsChartData.length > 100) fpsChartData.shift();

		memoryChartData.push((safeMemoryUsage || 0) * 100); // Convert to percentage
		if (memoryChartData.length > 100) memoryChartData.shift();

		poolUtilizationData.push((safeObjectPoolStats.utilizationRate || 0) * 100); // Convert to percentage
		if (poolUtilizationData.length > 100) poolUtilizationData.shift();

		// Update time labels
		const now = new Date();
		const timeLabel = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
		timeLabels.push(timeLabel);
		if (timeLabels.length > 100) timeLabels.shift();

		// Update trend data
		updatePerformanceTrends();

		// Check for performance warnings
		checkPerformanceWarnings();
	}

	// Update performance trends by comparing current values with previous ones
	function updatePerformanceTrends() {
		if (!browser) return;

		const TREND_THRESHOLD = 0.1; // 10% change threshold for trend detection
		const FPS_THRESHOLD = 5; // FPS change threshold

		// Update FPS trend
		const currentFPS = safeFPS;
		if (prevFPS > 0) {
			const fpsDiff = currentFPS - prevFPS;
			performanceTrend.fps = {
				rising: fpsDiff > FPS_THRESHOLD,
				falling: fpsDiff < -FPS_THRESHOLD,
				stable: Math.abs(fpsDiff) <= FPS_THRESHOLD,
				value: currentFPS
			};
		}
		prevFPS = currentFPS;

		// Update memory trend
		const currentMemory = safeMemoryUsage;
		if (prevMemory > 0) {
			const memoryDiff = currentMemory - prevMemory;
			performanceTrend.memory = {
				rising: memoryDiff > TREND_THRESHOLD / 10, // Lower threshold for memory
				falling: memoryDiff < -TREND_THRESHOLD / 10,
				stable: Math.abs(memoryDiff) <= TREND_THRESHOLD / 10,
				value: currentMemory
			};
		}
		prevMemory = currentMemory;

		// Update pool utilization trend
		const currentPoolUtilization = safeObjectPoolStats.utilizationRate || 0;
		if (prevPoolUtilization > 0) {
			const poolDiff = currentPoolUtilization - prevPoolUtilization;
			performanceTrend.poolUtilization = {
				rising: poolDiff > TREND_THRESHOLD,
				falling: poolDiff < -TREND_THRESHOLD,
				stable: Math.abs(poolDiff) <= TREND_THRESHOLD,
				value: currentPoolUtilization
			};
		}
		prevPoolUtilization = currentPoolUtilization;
	}

	// Check for performance warnings based on current metrics
	function checkPerformanceWarnings() {
		if (!browser) return;

		// Clear existing warnings
		warnings = [];

		// Check FPS
		const currentFPS = safeFPS;
		const targetFPS = safeDeviceCapabilities?.performance?.targetFPS || 60;
		if (currentFPS < targetFPS * 0.7) {
			warnings.push(
				`Low FPS: ${currentFPS.toFixed(1)}/${targetFPS} (${((currentFPS / targetFPS) * 100).toFixed(0)}%)`
			);
		}

		// Check memory usage
		const memoryUsage = safeMemoryUsage;
		if (memoryUsage > 0.8) {
			warnings.push(`High memory usage: ${(memoryUsage * 100).toFixed(0)}%`);
		}

		// Check pool utilization
		const poolUtilization = safeObjectPoolStats.utilizationRate || 0;
		if (poolUtilization > 0.9) {
			warnings.push(`Object pool near capacity: ${(poolUtilization * 100).toFixed(0)}%`);
		}

		// Check pool churn
		const reuseRatio = safeObjectPoolStats.reuseRatio || 0;
		const objectsCreated = safeObjectPoolStats.objectsCreated || 0;
		if (reuseRatio < 0.5 && objectsCreated > 100) {
			warnings.push(`Low object reuse ratio: ${(reuseRatio * 100).toFixed(0)}%`);
		}
	}

	// Benchmark functions
	function startBenchmark() {
		if (isBenchmarkRunning) return;

		isBenchmarkRunning = true;
		benchmarkProgress = 0;

		currentBenchmark = new PerformanceBenchmark(benchmarkType, benchmarkDuration);

		currentBenchmark.onProgress = (progress) => {
			benchmarkProgress = progress;
		};

		currentBenchmark.onComplete = (result) => {
			isBenchmarkRunning = false;
			benchmarkProgress = 0;
			currentBenchmark = null;
		};

		currentBenchmark.start();
	}

	function startBenchmarkSuite() {
		if (isBenchmarkRunning) return;

		isBenchmarkRunning = true;
		benchmarkProgress = 0;

		// Run all benchmark types sequentially
		const benchmarkTypes = [BT.FPS, BT.MEMORY, BT.RENDERING];
		let currentIndex = 0;

		function runNextBenchmark() {
			if (currentIndex >= benchmarkTypes.length) {
				isBenchmarkRunning = false;
				benchmarkProgress = 0;
				return;
			}

			const benchmark = new PerformanceBenchmark(benchmarkTypes[currentIndex], benchmarkDuration);

			benchmark.onProgress = (progress) => {
				const totalProgress = (currentIndex + progress) / benchmarkTypes.length;
				benchmarkProgress = totalProgress * 100;
			};

			benchmark.onComplete = (result) => {
				currentIndex++;
				setTimeout(runNextBenchmark, 1000); // Brief pause between benchmarks
			};

			benchmark.start();
		}

		runNextBenchmark();
	}

	function getMaxUnits(dc: unknown): number {
		const cap = dc as Record<string, unknown>;
		const fromEffect =
			typeof cap?.maxEffectUnits === 'number' ? (cap as any).maxEffectUnits : undefined;
		const fromLegacy = typeof cap?.maxStars === 'number' ? (cap as any).maxStars : undefined;
		const fromLegacyObj =
			typeof (cap as any)?.starfield?.maxUnits === 'number'
				? (cap as any).starfield.maxUnits
				: undefined;

		const val = fromEffect ?? fromLegacy ?? fromLegacyObj;
		return typeof val === 'number' ? val : 0;
	}

	function startPerformanceTests() {
		if (isTestRunning) return;

		isTestRunning = true;
		testProgress = 0;
		currentTestId = '';
		currentTestStep = '';

		performanceTestRunner.runAllTests().then(() => {
			isTestRunning = false;
			testProgress = 0;
		});

		// Listen for test progress updates
		performanceTestRunner.onProgress = (progress, testId, step) => {
			testProgress = progress;
			currentTestId = testId;
			currentTestStep = step;
		};
	}

	function cancelBenchmark() {
		if (currentBenchmark) {
			currentBenchmark.cancel();
			currentBenchmark = null;
		}
		isBenchmarkRunning = false;
		isTestRunning = false;
		benchmarkProgress = 0;
		testProgress = 0;
	}

	// Force refresh of stats using unified memory manager
	function forceStatsRefresh() {
		if (!browser) return;

		try {
			// Use unified memory manager to force a memory check
			memoryManager.forceMemoryCheck();
		} catch (error) {
			console.warn('Error refreshing unified memory stats:', error);
		}
	}

	// Memory report generation using unified system
	function generateMemoryReport() {
		if (!browser) return;

		try {
			memoryReport = memoryManager.getMemoryReport();
			showMemoryReport = true;
		} catch (error) {
			console.error('Error generating memory report:', error);
			memoryReport = 'Error generating memory report: ' + error.message;
			showMemoryReport = true;
		}
	}

	function closeMemoryReport() {
		showMemoryReport = false;
		memoryReport = '';
	}

	function copyMemoryReport() {
		if (!browser || !memoryReport) return; // ADD BROWSER CHECK

		navigator.clipboard.writeText(memoryReport).then(() => {
			console.log('Memory report copied to clipboard');
		});
	}

	// Cleanup function using unified system
	function performCleanup() {
		if (!browser) return;

		try {
			memoryManager.performCleanup();
			console.log('Unified memory cleanup completed');
		} catch (error) {
			console.error('Error performing cleanup:', error);
		}
	}

	// Benchmark result selection
	function selectBenchmarkResult(result: any) {
		if (selectedBenchmarkResults.includes(result)) {
			selectedBenchmarkResults = selectedBenchmarkResults.filter((r) => r !== result);
		} else {
			selectedBenchmarkResults = [...selectedBenchmarkResults, result];
		}

		// Update comparison result
		if (selectedBenchmarkResults.length === 2) {
			benchmarkComparisonResult = compareBenchmarkResults(
				selectedBenchmarkResults[0],
				selectedBenchmarkResults[1]
			);
		} else {
			benchmarkComparisonResult = null;
		}
	}

	function removeBenchmarkResult(result: any) {
		selectedBenchmarkResults = selectedBenchmarkResults.filter((r) => r !== result);
		benchmarkComparisonResult = null;
	}

	function clearBenchmarkSelection() {
		selectedBenchmarkResults = [];
		benchmarkComparisonResult = null;
	}

	function compareBenchmarkResults(result1: any, result2: any) {
		// Simple comparison logic
		const fpsChange = ((result2.avgFPS - result1.avgFPS) / result1.avgFPS) * 100;
		const memoryChange =
			((result2.avgMemoryUsage - result1.avgMemoryUsage) / result1.avgMemoryUsage) * 100;

		return {
			fpsChange: fpsChange.toFixed(1),
			memoryChange: memoryChange.toFixed(1),
			fpsImproved: fpsChange > 0,
			memoryImproved: memoryChange < 0
		};
	}

	function handleTouchStart(event: TouchEvent) {
		if (!browser) return; // ADD THIS LINE

		if (event.touches.length === 1) {
			const touch = event.touches[0];
			touchStartX = touch.clientX;
			touchStartY = touch.clientY;
			touchDragStartX = touch.clientX;
			touchDragStartY = touch.clientY;

			const rect = monitorElement.getBoundingClientRect();
			initialTouchLeft = rect.left;
			initialTouchTop = rect.top;

			// Long press detection
			touchTimeout = window.setTimeout(() => {
				isTouchDragging = true;
			}, 500);
		}
	}

	function handleTouchMove(event: TouchEvent) {
		if (!browser) return; // ADD THIS LINE

		if (event.touches.length === 1 && isTouchDragging) {
			event.preventDefault();
			const touch = event.touches[0];

			const deltaX = touch.clientX - touchDragStartX;
			const deltaY = touch.clientY - touchDragStartY;

			const newLeft = initialTouchLeft + deltaX;
			const newTop = initialTouchTop + deltaY;

			monitorElement.style.left = `${Math.max(0, Math.min(window.innerWidth - monitorElement.offsetWidth, newLeft))}px`;
			monitorElement.style.top = `${Math.max(0, Math.min(window.innerHeight - monitorElement.offsetHeight, newTop))}px`;
			monitorElement.style.right = 'auto';
			monitorElement.style.bottom = 'auto';
		}
	}

	function handleTouchEnd(event: TouchEvent) {
		if (!browser) return; // ADD THIS LINE

		if (touchTimeout) {
			clearTimeout(touchTimeout);
			touchTimeout = null;
		}

		if (!isTouchDragging && event.changedTouches.length === 1) {
			const touch = event.changedTouches[0];
			const deltaX = Math.abs(touch.clientX - touchStartX);
			const deltaY = Math.abs(touch.clientY - touchStartY);

			// Consider it a tap if movement is minimal
			if (deltaX < 10 && deltaY < 10) {
				// Handle tap - could toggle detailed view
				showDetailedMetrics = !showDetailedMetrics;
			}
		}

		isTouchDragging = false;
	}

	// Mouse event handlers
	function handleMouseDown(event: MouseEvent) {
		if (!browser) return; // THIS LINE FIXES THE SSR ERROR

		if (event.button === 0) {
			// Left mouse button
			isDragging = true;
			offsetX = event.clientX - monitorElement.getBoundingClientRect().left;
			offsetY = event.clientY - monitorElement.getBoundingClientRect().top;

			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);
		}
	}

	function handleMouseMove(event: MouseEvent) {
		if (!browser) return; // ADD THIS LINE

		if (isDragging) {
			const newLeft = event.clientX - offsetX;
			const newTop = event.clientY - offsetY;

			monitorElement.style.left = `${Math.max(0, Math.min(window.innerWidth - monitorElement.offsetWidth, newLeft))}px`;
			monitorElement.style.top = `${Math.max(0, Math.min(window.innerHeight - monitorElement.offsetHeight, newTop))}px`;
			monitorElement.style.right = 'auto';
			monitorElement.style.bottom = 'auto';
		}
	}

	function handleMouseUp() {
		if (!browser) return; // ADD THIS LINE

		isDragging = false;
		document.removeEventListener('mousemove', handleMouseMove);
		document.removeEventListener('mouseup', handleMouseUp);
	}

	function handleCloseClick() {
		setPerformanceMonitorVisibility(false);
	}

	// Lifecycle management
	onMount(() => {
		if (browser) {
			// Setup periodic updates
			statsRefreshInterval = setInterval(() => {
				if ($perfMonitorVisible) {
					updatePerformanceData();
				}
			}, 1000) as any;

			// Setup chart updates
			chartUpdateInterval = setInterval(() => {
				if ($perfMonitorVisible && activeChart) {
					updatePerformanceData();
				}
			}, 2000) as any;

			// Initial data update
			updatePerformanceData();
		}
	});

	onDestroy(() => {
		// Cleanup intervals
		if (statsRefreshInterval) {
			clearInterval(statsRefreshInterval);
		}
		if (chartUpdateInterval) {
			clearInterval(chartUpdateInterval);
		}
		if (memoryUpdateInterval) {
			clearInterval(memoryUpdateInterval);
		}

		// Cancel any running benchmarks
		cancelBenchmark();

		// Cleanup touch timeout
		if (touchTimeout) {
			clearTimeout(touchTimeout);
		}

		// Remove event listeners - ONLY IN BROWSER
		if (browser) {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		}
	});
</script>

{#if browser}
	<!-- Only render in browser to avoid SSR issues -->
	<div
		bind:this={monitorElement}
		class="performance-monitor debug-panel {$perfMonitorVisible ? 'visible' : 'hidden'}"
		data-perf-monitor="true"
		role="status"
		aria-live="polite"
		on:touchstart={handleTouchStart}
		on:touchmove={handleTouchMove}
		on:touchend={handleTouchEnd}
	>
		<div class="monitor-header" on:mousedown={handleMouseDown}>
			<span class="title">Performance Monitor</span>
			<span class="close-btn" on:click={handleCloseClick}>×</span>
		</div>

		<!-- Tabs for different panels -->
		<div class="monitor-tabs">
			<button
				class="tab-btn"
				class:active={!showBenchmarkPanel && !showMemoryPanel}
				on:click={() => {
					showBenchmarkPanel = false;
					showMemoryPanel = false;
				}}
			>
				Live
			</button>
			<button
				class="tab-btn"
				class:active={showBenchmarkPanel}
				on:click={() => {
					showBenchmarkPanel = true;
					showMemoryPanel = false;
				}}
			>
				Bench
			</button>
			<button
				class="tab-btn"
				class:active={showMemoryPanel}
				on:click={() => {
					showBenchmarkPanel = false;
					showMemoryPanel = true;
				}}
			>
				Memory
			</button>
		</div>

		<!-- Live Metrics Panel -->
		{#if !showBenchmarkPanel && !showMemoryPanel}
			<div class="metrics-panel">
				<!-- Performance Warnings -->
				{#if warnings.length > 0}
					<div class="warnings-panel">
						{#each warnings as warning}
							<div class="warning-item">{warning}</div>
						{/each}
					</div>
				{/if}

				<!-- Basic Metrics Display with safe values -->
				<div class="basic-metrics">
					<div
						class:good={safeFPS > 50}
						class:warning={safeFPS <= 50 && safeFPS > 30}
						class:bad={safeFPS <= 30}
					>
						FPS: {safeFPS.toFixed(1)}
						{#if performanceTrend.fps.rising}
							<span class="trend up">↑</span>
						{:else if performanceTrend.fps.falling}
							<span class="trend down">↓</span>
						{/if}
					</div>
					<div
						class:good={safeMemoryUsage < 0.5}
						class:warning={safeMemoryUsage >= 0.5 && safeMemoryUsage < 0.8}
						class:bad={safeMemoryUsage >= 0.8}
					>
						Memory: {memoizedStats.memoryPercentage}%
						{#if performanceTrend.memory.rising}
							<span class="trend down">↑</span>
						{:else if performanceTrend.memory.falling}
							<span class="trend up">↓</span>
						{/if}
					</div>
					<div
						class:good={(safeObjectPoolStats.utilizationRate || 0) < 0.7}
						class:warning={(safeObjectPoolStats.utilizationRate || 0) >= 0.7 &&
							(safeObjectPoolStats.utilizationRate || 0) < 0.9}
						class:bad={(safeObjectPoolStats.utilizationRate || 0) >= 0.9}
					>
						Pool: {memoizedStats.utilizationPercentage}%
						{#if performanceTrend.poolUtilization.rising}
							<span class="trend down">↑</span>
						{:else if performanceTrend.poolUtilization.falling}
							<span class="trend up">↓</span>
						{/if}
					</div>
					<div>Quality: {safeDeviceCapabilities?.tier || 'medium'}</div>
					<div>Pressure: {safeMemoryPressure}</div>
				</div>

				<!-- Metrics Toggle Buttons -->
				<div class="metrics-toggles">
					<button
						class="metrics-toggle"
						class:active={showDetailedMetrics}
						on:click={() => (showDetailedMetrics = !showDetailedMetrics)}
					>
						Details
					</button>
					<button
						class="metrics-toggle"
						class:active={showPoolMetrics}
						on:click={() => (showPoolMetrics = !showPoolMetrics)}
					>
						Pools
					</button>
				</div>

				<!-- Detailed Metrics -->
				{#if showDetailedMetrics}
					<div class="detailed-metrics">
						<div>
							Device: {safeDeviceCapabilities.isMobile ? 'Mobile' : 'Desktop'} ({safeDeviceCapabilities.tier})
						</div>
						<div>Max Instances: {safeDeviceCapabilities.maxEffectUnits ?? 0}</div>
						<div>Effects: {safeDeviceCapabilities.effectsLevel}</div>
						<div>
							Hardware Acceleration: {safeDeviceCapabilities.useHardwareAcceleration ? 'Yes' : 'No'}
						</div>
						<div>Memory Used: {safeMemoryInfo.usedMB.toFixed(1)} MB</div>
						<div>Memory Available: {safeMemoryInfo.availableMB.toFixed(1)} MB</div>
						<div>Memory Limit: {safeMemoryInfo.limitMB.toFixed(1)} MB</div>
					</div>
				{/if}

				<!-- Pool Metrics with safe access -->
				{#if showPoolMetrics}
					<div class="pool-metrics">
						<div class="pool-header">
							<span
								>{safeObjectPoolStats.poolName || 'visual-effects'} Pool ({safeObjectPoolStats.poolType ||
									'object'})</span
							>

							<button class="refresh-btn" on:click={forceStatsRefresh} title="Refresh Stats"
								>⟳</button
							>
						</div>
						<div class="pool-utilization">
							<div class="utilization-bar">
								<div
									class="utilization-fill"
									class:good={(safeObjectPoolStats.utilizationRate || 0) < 0.7}
									class:warning={(safeObjectPoolStats.utilizationRate || 0) >= 0.7 &&
										(safeObjectPoolStats.utilizationRate || 0) < 0.9}
									class:bad={(safeObjectPoolStats.utilizationRate || 0) >= 0.9}
									style="width: {memoizedStats.utilizationPercentage}%"
								></div>
							</div>
							<div class="utilization-text">
								{safeObjectPoolStats.activeObjects || 0} / {safeObjectPoolStats.totalCapacity || 0} objects
								({memoizedStats.utilizationPercentage}%)
							</div>
						</div>
						<div class="pool-stats">
							<div>Created: {safeObjectPoolStats.objectsCreated || 0}</div>
							<div>Reused: {safeObjectPoolStats.objectsReused || 0}</div>
							<div>Reuse Ratio: {memoizedStats.reuseRatioPercentage}%</div>
							<div>
								Memory Saved: {(safeObjectPoolStats.estimatedMemorySaved || 0).toFixed(0)} KB
							</div>
						</div>
					</div>
				{/if}

				<!-- Chart Selector -->
				<div class="chart-selector">
					<button
						class="chart-tab"
						class:active={activeChart === 'fps'}
						on:click={() => (activeChart = 'fps')}
					>
						FPS
					</button>
					<button
						class="chart-tab"
						class:active={activeChart === 'memory'}
						on:click={() => (activeChart = 'memory')}
					>
						Memory
					</button>
					<button
						class="chart-tab"
						class:active={activeChart === 'pool'}
						on:click={() => (activeChart = 'pool')}
					>
						Pool
					</button>
				</div>

				<!-- Chart Area -->
				<div class="chart-area">
					<div class="chart">
						{#if activeChart === 'fps'}
							{#each fpsChartData as fps, i}
								<div
									class="chart-bar"
									class:good={fps > 50}
									class:warning={fps <= 50 && fps > 30}
									class:bad={fps <= 30}
									style="height: {Math.max(2, (fps / 60) * 100)}%; left: {(i /
										Math.max(1, fpsChartData.length - 1)) *
										100}%"
								></div>
							{/each}
							<div class="chart-target-line" style="top: {100 - (60 / 60) * 100}%"></div>
							<div class="chart-warning-line" style="top: {100 - (30 / 60) * 100}%"></div>
						{:else if activeChart === 'memory'}
							{#each memoryChartData as memory, i}
								<div
									class="chart-bar"
									class:good={memory < 50}
									class:warning={memory >= 50 && memory < 80}
									class:bad={memory >= 80}
									style="height: {Math.max(2, memory)}%; left: {(i /
										Math.max(1, memoryChartData.length - 1)) *
										100}%"
								></div>
							{/each}
							<div class="chart-warning-line" style="top: 20%"></div>
							<div class="chart-danger-line" style="top: 50%"></div>
						{:else if activeChart === 'pool'}
							{#each poolUtilizationData as utilization, i}
								<div
									class="chart-bar"
									class:good={utilization < 70}
									class:warning={utilization >= 70 && utilization < 90}
									class:bad={utilization >= 90}
									style="height: {Math.max(2, utilization)}%; left: {(i /
										Math.max(1, poolUtilizationData.length - 1)) *
										100}%"
								></div>
							{/each}
							<div class="chart-warning-line" style="top: 30%"></div>
							<div class="chart-danger-line" style="top: 10%"></div>
						{/if}
					</div>
					<div class="chart-label">
						{activeChart === 'fps'
							? 'FPS Over Time'
							: activeChart === 'memory'
								? 'Memory Usage %'
								: 'Pool Utilization %'}
					</div>
				</div>
			</div>
		{/if}

		<!-- Benchmark Panel -->
		{#if showBenchmarkPanel}
			<div class="benchmark-panel">
				<div class="benchmark-controls">
					<div class="benchmark-type-selector">
						<label>Type:</label>
						<select bind:value={benchmarkType} disabled={isBenchmarkRunning}>
							<option value={BT.FPS}>FPS</option>
							<option value={BT.MEMORY}>Memory</option>
							<option value={BT.RENDERING}>Rendering</option>
						</select>
					</div>

					<div class="benchmark-duration-selector">
						<label>Duration:</label>
						<select bind:value={benchmarkDuration} disabled={isBenchmarkRunning}>
							<option value={3000}>3 seconds</option>
							<option value={5000}>5 seconds</option>
							<option value={10000}>10 seconds</option>
							<option value={30000}>30 seconds</option>
						</select>
					</div>

					<div class="benchmark-buttons">
						{#if !isBenchmarkRunning && !isTestRunning}
							<button class="benchmark-btn start" on:click={startBenchmark}>Start</button>
							<button class="benchmark-btn suite" on:click={startBenchmarkSuite}>Suite</button>
							<button class="benchmark-btn tests" on:click={startPerformanceTests}>Tests</button>
						{:else}
							<button class="benchmark-btn cancel" on:click={cancelBenchmark}>Cancel</button>
						{/if}
					</div>
				</div>

				<!-- Benchmark Progress -->
				{#if isBenchmarkRunning}
					<div class="benchmark-progress">
						<div class="progress-bar">
							<div class="progress-fill" style="width: {benchmarkProgress}%"></div>
						</div>
						<div class="progress-text">
							{benchmarkProgress.toFixed(0)}% Complete
						</div>
					</div>
				{/if}

				<!-- Test Progress -->
				{#if isTestRunning}
					<div class="benchmark-progress">
						<div class="progress-bar">
							<div class="progress-fill" style="width: {testProgress}%"></div>
						</div>
						<div class="progress-text">
							Running: {currentTestId} - {currentTestStep}
						</div>
					</div>
				{/if}

				<!-- Results Toggle -->
				<div class="results-toggle">
					<button
						class="toggle-btn"
						class:active={!showResultsComparison}
						on:click={() => (showResultsComparison = false)}
					>
						History
					</button>
					<button
						class="toggle-btn"
						class:active={showResultsComparison}
						on:click={() => (showResultsComparison = true)}
					>
						Compare
					</button>
				</div>

				<!-- Benchmark Results -->
				{#if !showResultsComparison}
					<div class="benchmark-history" bind:this={benchmarkResultsElement}>
						{#if benchmarkResults.length === 0}
							<div class="no-results">No results yet. Run a benchmark to see results.</div>
						{:else}
							{#each benchmarkResults.slice(-10).reverse() as result}
								<div class="result-item" on:click={() => selectBenchmarkResult(result)}>
									<div class="result-header">
										<span class="result-type">{result.type}</span>
										<span class="result-timestamp"
											>{new Date(result.timestamp).toLocaleTimeString()}</span
										>
									</div>
									<div class="result-metrics">
										<span class="metric">FPS: {result.avgFPS?.toFixed(1) || 'N/A'}</span>
										<span class="metric">Mem: {result.avgMemoryUsage?.toFixed(1) || 'N/A'}MB</span>
										<span class="metric">Score: {result.overallScore?.toFixed(0) || 'N/A'}</span>
									</div>
								</div>
							{/each}
						{/if}
					</div>
				{:else}
					<!-- Results Comparison -->
					<div class="results-comparison">
						{#if selectedBenchmarkResults.length === 0}
							<div class="no-selection">Select 2 results from history to compare.</div>
						{:else if selectedBenchmarkResults.length === 1}
							<div class="single-result">Select one more result to compare.</div>
						{:else if selectedBenchmarkResults.length === 2 && benchmarkComparisonResult}
							<div class="comparison-results">
								<!-- First Result -->
								<div class="result-card">
									<div class="result-card-header">
										<span>Result 1</span>
										<button
											class="remove-btn"
											on:click={() => removeBenchmarkResult(selectedBenchmarkResults[0])}>×</button
										>
									</div>
									<div class="result-card-content">
										<div class="metric-row">
											FPS: {selectedBenchmarkResults[0].avgFPS?.toFixed(1) || 'N/A'}
										</div>
										<div class="metric-row">
											Memory: {selectedBenchmarkResults[0].avgMemoryUsage?.toFixed(1) || 'N/A'}MB
										</div>
										<div class="metric-row">
											Score: {selectedBenchmarkResults[0].overallScore?.toFixed(0) || 'N/A'}
										</div>
									</div>
									<div class="result-card-footer">
										{new Date(selectedBenchmarkResults[0].timestamp).toLocaleString()}
									</div>
								</div>

								<!-- Comparison Indicator -->
								<div class="comparison-indicator">
									<div
										class="change-arrow"
										class:improved={benchmarkComparisonResult.fpsImproved}
										class:degraded={!benchmarkComparisonResult.fpsImproved}
									>
										{benchmarkComparisonResult.fpsImproved ? '↗' : '↙'}
									</div>
									<div
										class="change-percentage"
										class:improved={benchmarkComparisonResult.fpsImproved}
										class:degraded={!benchmarkComparisonResult.fpsImproved}
									>
										{benchmarkComparisonResult.fpsChange}%
									</div>
									<div
										class="significance-label"
										class:none={Math.abs(parseFloat(benchmarkComparisonResult.fpsChange)) < 5}
										class:minor={Math.abs(parseFloat(benchmarkComparisonResult.fpsChange)) >= 5 &&
											Math.abs(parseFloat(benchmarkComparisonResult.fpsChange)) < 15}
										class:significant={Math.abs(parseFloat(benchmarkComparisonResult.fpsChange)) >=
											15}
									>
										{Math.abs(parseFloat(benchmarkComparisonResult.fpsChange)) < 5
											? 'No Change'
											: Math.abs(parseFloat(benchmarkComparisonResult.fpsChange)) < 15
												? 'Minor'
												: 'Significant'}
									</div>
								</div>

								<!-- Second Result -->
								<div class="result-card">
									<div class="result-card-header">
										<span>Result 2</span>
										<button
											class="remove-btn"
											on:click={() => removeBenchmarkResult(selectedBenchmarkResults[1])}>×</button
										>
									</div>
									<div class="result-card-content">
										<div class="metric-row">
											FPS: {selectedBenchmarkResults[1].avgFPS?.toFixed(1) || 'N/A'}
										</div>
										<div class="metric-row">
											Memory: {selectedBenchmarkResults[1].avgMemoryUsage?.toFixed(1) || 'N/A'}MB
										</div>
										<div class="metric-row">
											Score: {selectedBenchmarkResults[1].overallScore?.toFixed(0) || 'N/A'}
										</div>
									</div>
									<div class="result-card-footer">
										{new Date(selectedBenchmarkResults[1].timestamp).toLocaleString()}
									</div>
								</div>
							</div>
						{/if}

						{#if selectedBenchmarkResults.length > 0}
							<button class="clear-btn" on:click={clearBenchmarkSelection}>Clear Selection</button>
						{/if}
					</div>
				{/if}
			</div>
		{/if}

		<!-- Memory Panel -->
		{#if showMemoryPanel}
			<div class="memory-panel">
				<div class="memory-controls">
					<button class="memory-btn" on:click={generateMemoryReport}>Generate Report</button>
					<button class="memory-btn" on:click={performCleanup}>Force Cleanup</button>
					<button class="memory-btn" on:click={forceStatsRefresh}>Refresh Stats</button>
				</div>

				<!-- Memory Events using unified system -->
				<div class="memory-events">
					<div class="events-header">Recent Memory Events</div>
					{#if safeMemoryEvents.length === 0}
						<div class="no-events">No memory events recorded yet.</div>
					{:else}
						{#each safeMemoryEvents.slice(-10).reverse() as event}
							<div
								class="event-item"
								class:event-info={event.severity === 'info'}
								class:event-warning={event.severity === 'warning'}
								class:event-critical={event.severity === 'critical'}
							>
								<div class="event-header">
									<span class="event-type">{event.type}</span>
									<span class="event-timestamp"
										>{new Date(event.timestamp).toLocaleTimeString()}</span
									>
								</div>
								<div class="event-details">{event.details}</div>
							</div>
						{/each}
					{/if}
				</div>

				<!-- Memory Metrics using unified system -->
				<div class="memory-metrics">
					<div class="metrics-header">Current Memory Status</div>
					<div class="memory-metric-item">
						<span>Usage:</span>
						<span>{(safeMemoryInfo.usagePercentage * 100).toFixed(1)}%</span>
					</div>
					<div class="memory-metric-item">
						<span>Used:</span>
						<span>{safeMemoryInfo.usedMB.toFixed(1)} MB</span>
					</div>
					<div class="memory-metric-item">
						<span>Available:</span>
						<span>{safeMemoryInfo.availableMB.toFixed(1)} MB</span>
					</div>
					<div class="memory-metric-item">
						<span>Limit:</span>
						<span>{safeMemoryInfo.limitMB.toFixed(1)} MB</span>
					</div>
					<div class="memory-metric-item">
						<span>Pressure Level:</span>
						<span>{safeMemoryPressure}</span>
					</div>
					<div class="memory-metric-item">
						<span>Memory Saved by Pool:</span>
						<span>{(safeObjectPoolStats.estimatedMemorySaved || 0).toFixed(0)} KB</span>
					</div>
				</div>

				<!-- Memory Report Display -->
				{#if showMemoryReport}
					<div class="memory-report">
						<div class="report-header">
							<span>Memory Report</span>
							<button class="close-report-btn" on:click={closeMemoryReport}>×</button>
						</div>
						<div class="report-content">
							<pre>{memoryReport}</pre>
						</div>
						<div class="report-footer">
							<button class="copy-btn" on:click={copyMemoryReport}>Copy</button>
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<div class="shortcut-hint">Ctrl+Shift+P to toggle | Drag to move</div>
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
		z-index: 9000;
		transition:
			opacity 0.3s ease,
			transform 0.3s ease;
		min-width: 300px;
		max-width: 500px;
		max-height: 80vh;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
		overflow: hidden;
		font-family: monospace;
		user-select: none;
	}

	.performance-monitor.hidden {
		opacity: 0;
		transform: translateY(20px);
		pointer-events: none;
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
		border-bottom: 1px solid rgba(0, 179, 90, 0.1);
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

	/* Tabs Styles */
	.monitor-tabs {
		display: flex;
		background: rgba(30, 30, 30, 0.8);
		border-bottom: 1px solid rgba(0, 179, 90, 0.1);
	}

	.tab-btn {
		flex: 1;
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.7);
		padding: 5px;
		font-size: 10px;
		cursor: pointer;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.tab-btn:hover {
		background: rgba(60, 60, 60, 0.6);
	}

	.tab-btn.active {
		background: rgba(0, 100, 50, 0.6);
		color: white;
	}

	/* Live Metrics Panel */
	.metrics-panel {
		overflow-y: auto;
		max-height: 70vh;
	}

	/* Warnings Panel */
	.warnings-panel {
		background: rgba(150, 30, 30, 0.3);
		padding: 5px;
		margin: 5px;
		border-radius: 3px;
	}

	.warning-item {
		font-size: 10px;
		padding: 2px 5px;
		color: rgba(255, 200, 200, 0.9);
	}

	/* Chart Selector */
	.chart-selector {
		display: flex;
		background: rgba(20, 20, 20, 0.5);
		border-top: 1px solid rgba(50, 50, 50, 0.5);
	}

	.chart-tab {
		flex: 1;
		background: none;
		border: none;
		color: rgba(200, 200, 200, 0.7);
		padding: 3px;
		font-size: 9px;
		cursor: pointer;
		text-transform: uppercase;
	}

	.chart-tab:hover {
		background: rgba(40, 40, 40, 0.6);
	}

	.chart-tab.active {
		background: rgba(40, 60, 60, 0.6);
		color: rgba(100, 255, 255, 0.9);
	}

	/* Chart Area */
	.chart-area {
		height: 100px;
		margin: 5px;
		position: relative;
		border: 1px solid rgba(50, 50, 50, 0.5);
		background: rgba(20, 20, 20, 0.3);
	}

	.chart {
		height: 100%;
		position: relative;
	}

	.chart-bar {
		position: absolute;
		bottom: 0;
		width: 2px;
		transition: height 0.3s ease;
	}

	.chart-bar.good {
		background: rgba(0, 255, 100, 0.7);
	}

	.chart-bar.warning {
		background: rgba(255, 200, 0, 0.7);
	}

	.chart-bar.bad {
		background: rgba(255, 50, 50, 0.7);
	}

	.chart-target-line {
		position: absolute;
		width: 100%;
		border-top: 1px dashed rgba(0, 255, 100, 0.5);
		left: 0;
	}

	.chart-warning-line {
		position: absolute;
		width: 100%;
		border-top: 1px dashed rgba(255, 200, 0, 0.5);
		left: 0;
	}

	.chart-danger-line {
		position: absolute;
		width: 100%;
		border-top: 1px dashed rgba(255, 50, 50, 0.5);
		left: 0;
	}

	.chart-label {
		font-size: 9px;
		text-align: center;
		color: rgba(200, 200, 200, 0.7);
		padding: 5px 0;
	}

	.basic-metrics {
		padding: 8px 10px;
		display: grid;
		gap: 4px;
	}

	.basic-metrics div {
		display: flex;
		justify-content: space-between;
	}

	.trend {
		margin-left: 5px;
		font-weight: bold;
	}

	.trend.up {
		color: rgba(0, 255, 100, 0.9);
	}

	.trend.down {
		color: rgba(255, 50, 50, 0.9);
	}

	/* Generic status styling */
	.good {
		color: rgba(0, 255, 100, 0.9);
	}

	.warning {
		color: rgba(255, 200, 0, 0.9);
	}

	.bad {
		color: rgba(255, 50, 50, 0.9);
	}

	.metrics-toggles {
		display: flex;
		gap: 1px;
	}

	.metrics-toggle {
		background: rgba(60, 60, 60, 0.6);
		border: none;
		color: var(--arcade-neon-green-100);
		padding: 4px;
		flex: 1;
		font-size: 10px;
		cursor: pointer;
		text-align: center;
		border-top: 1px solid rgba(0, 179, 90, 0.1);
		border-bottom: 1px solid rgba(0, 179, 90, 0.1);
	}

	.metrics-toggle.active {
		background: rgba(0, 100, 50, 0.6);
	}

	.metrics-toggle:hover {
		background: rgba(80, 80, 80, 0.6);
	}

	.metrics-toggle.active:hover {
		background: rgba(0, 120, 60, 0.6);
	}

	.detailed-metrics {
		padding: 8px 10px;
		display: grid;
		gap: 4px;
		font-size: 11px;
		background: rgba(30, 30, 30, 0.6);
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.pool-metrics {
		padding: 8px 10px;
		display: grid;
		gap: 6px;
		font-size: 11px;
		background: rgba(25, 35, 35, 0.6);
		border-bottom: 1px solid rgba(0, 255, 255, 0.2);
	}

	.pool-header {
		display: flex;
		justify-content: space-between;
		font-weight: bold;
		color: var(--arcade-neon-blue-100, #00eeff);
		margin-bottom: 2px;
	}

	.refresh-btn,
	.reset-btn {
		background: none;
		border: none;
		color: var(--arcade-neon-blue-100, #00eeff);
		cursor: pointer;
		font-size: 12px;
		padding: 0;
		width: 18px;
		height: 18px;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0.7;
		transition: opacity 0.2s;
	}

	.refresh-btn:hover,
	.reset-btn:hover {
		opacity: 1;
		background: rgba(0, 100, 150, 0.3);
		border-radius: 3px;
	}

	.utilization-bar {
		height: 8px;
		background: rgba(40, 40, 40, 0.8);
		border-radius: 4px;
		overflow: hidden;
		margin-bottom: 4px;
	}

	.utilization-fill {
		height: 100%;
		border-radius: 4px;
		transition: width 0.5s ease;
	}

	.utilization-fill.good {
		background: linear-gradient(to right, #00aa00, #00ff00);
	}

	.utilization-fill.warning {
		background: linear-gradient(to right, #aaaa00, #ffff00);
	}

	.utilization-fill.bad {
		background: linear-gradient(to right, #aa0000, #ff0000);
	}

	.utilization-text {
		font-size: 10px;
		text-align: center;
		margin-bottom: 4px;
	}

	.pool-stats {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 4px;
	}

	/* Benchmark Panel */
	.benchmark-panel {
		padding: 5px;
		max-height: 70vh;
		overflow-y: auto;
	}

	.benchmark-controls {
		display: grid;
		gap: 10px;
		padding: 5px;
		grid-template-columns: repeat(2, 1fr);
	}

	.benchmark-type-selector,
	.benchmark-duration-selector {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.benchmark-buttons {
		grid-column: span 2;
		display: flex;
		gap: 5px;
	}

	.benchmark-btn {
		flex: 1;
		border: none;
		padding: 5px;
		border-radius: 3px;
		font-size: 11px;
		cursor: pointer;
		text-transform: uppercase;
	}

	.benchmark-btn.start {
		background: rgba(0, 100, 50, 0.8);
		color: white;
	}

	.benchmark-btn.suite {
		background: rgba(0, 70, 100, 0.8);
		color: white;
	}

	.benchmark-btn.tests {
		background: rgba(70, 0, 100, 0.8);
		color: white;
	}

	.benchmark-btn.cancel {
		background: rgba(150, 30, 30, 0.8);
		color: white;
	}

	.benchmark-progress {
		margin: 10px 0;
	}

	.progress-bar {
		height: 10px;
		background: rgba(40, 40, 40, 0.8);
		border-radius: 5px;
		overflow: hidden;
		margin-bottom: 5px;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(to right, #00aa77, #00ffaa);
		transition: width 0.3s ease;
	}

	.progress-text {
		font-size: 10px;
		text-align: center;
	}

	/* Results Toggle */
	.results-toggle {
		display: flex;
		margin: 10px 0;
		border-bottom: 1px solid rgba(50, 50, 50, 0.5);
	}

	.toggle-btn {
		flex: 1;
		background: none;
		border: none;
		color: rgba(200, 200, 200, 0.7);
		padding: 5px;
		font-size: 10px;
		cursor: pointer;
	}

	.toggle-btn.active {
		background: rgba(40, 60, 60, 0.6);
		color: rgba(100, 255, 255, 0.9);
		border-bottom: 2px solid rgba(0, 255, 255, 0.5);
	}

	/* Benchmark History */
	.benchmark-history {
		max-height: 200px;
		overflow-y: auto;
		padding: 5px;
	}

	.no-results {
		font-size: 11px;
		color: rgba(200, 200, 200, 0.7);
		text-align: center;
		padding: 10px;
	}

	.result-item {
		background: rgba(40, 40, 40, 0.6);
		border-radius: 3px;
		margin-bottom: 5px;
		padding: 5px;
		cursor: pointer;
		transition: background 0.2s;
	}

	.result-item:hover {
		background: rgba(50, 50, 60, 0.8);
	}

	.result-header {
		display: flex;
		justify-content: space-between;
		font-size: 10px;
		margin-bottom: 3px;
	}

	.result-type {
		font-weight: bold;
		color: rgba(100, 255, 255, 0.9);
	}

	.result-timestamp {
		color: rgba(200, 200, 200, 0.7);
	}

	.result-metrics {
		display: flex;
		gap: 8px;
		font-size: 9px;
	}

	.metric {
		color: rgba(255, 255, 255, 0.9);
	}

	/* Results Comparison */
	.results-comparison {
		padding: 5px;
	}

	.no-selection,
	.single-result {
		text-align: center;
		padding: 10px;
		font-size: 11px;
		color: rgba(200, 200, 200, 0.7);
	}

	.comparison-results {
		display: flex;
		align-items: center;
		gap: 5px;
	}

	.result-card {
		flex: 1;
		background: rgba(30, 30, 30, 0.8);
		border-radius: 3px;
		overflow: hidden;
	}

	.result-card-header {
		background: rgba(40, 60, 60, 0.8);
		padding: 5px;
		font-size: 10px;
		font-weight: bold;
		color: rgba(100, 255, 255, 0.9);
		display: flex;
		justify-content: space-between;
	}

	.remove-btn {
		background: none;
		border: none;
		color: rgba(255, 100, 100, 0.9);
		cursor: pointer;
		font-size: 14px;
		padding: 0;
		width: 16px;
		height: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.result-card-content {
		padding: 5px;
		font-size: 10px;
	}

	.metric-row {
		margin-bottom: 3px;
	}

	.result-card-footer {
		font-size: 9px;
		padding: 5px;
		background: rgba(20, 20, 20, 0.6);
		color: rgba(200, 200, 200, 0.7);
	}

	.comparison-indicator {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0 5px;
	}

	.change-arrow {
		font-size: 20px;
		font-weight: bold;
	}

	.change-arrow.improved {
		color: rgba(0, 255, 100, 0.9);
	}

	.change-arrow.degraded {
		color: rgba(255, 50, 50, 0.9);
	}

	.change-percentage {
		font-size: 12px;
		font-weight: bold;
	}

	.change-percentage.improved {
		color: rgba(0, 255, 100, 0.9);
	}

	.change-percentage.degraded {
		color: rgba(255, 50, 50, 0.9);
	}

	.significance-label {
		font-size: 9px;
		text-align: center;
		margin-top: 3px;
	}

	.significance-label.none {
		color: rgba(200, 200, 200, 0.7);
	}

	.significance-label.minor {
		color: rgba(200, 255, 100, 0.9);
	}

	.significance-label.significant {
		color: rgba(100, 255, 100, 0.9);
	}

	.significance-label.major {
		color: rgba(0, 255, 50, 0.9);
	}

	.clear-btn {
		display: block;
		margin: 10px auto;
		background: rgba(80, 40, 40, 0.6);
		border: none;
		color: white;
		padding: 5px 10px;
		border-radius: 3px;
		cursor: pointer;
		font-size: 10px;
	}

	.clear-btn:hover {
		background: rgba(100, 50, 50, 0.8);
	}

	/* Memory Panel */
	.memory-panel {
		padding: 5px;
		max-height: 70vh;
		overflow-y: auto;
	}

	.memory-controls {
		display: flex;
		gap: 5px;
		margin-bottom: 10px;
	}

	.memory-btn {
		flex: 1;
		border: none;
		padding: 5px;
		border-radius: 3px;
		font-size: 11px;
		cursor: pointer;
		background: rgba(40, 60, 80, 0.8);
		color: white;
	}

	.memory-btn:hover {
		background: rgba(50, 80, 100, 0.8);
	}

	.memory-events {
		margin-bottom: 10px;
	}

	.events-header {
		font-size: 11px;
		font-weight: bold;
		padding: 5px;
		background: rgba(30, 40, 50, 0.8);
		color: rgba(100, 200, 255, 0.9);
		border-radius: 3px 3px 0 0;
	}

	.no-events {
		font-size: 11px;
		color: rgba(200, 200, 200, 0.7);
		text-align: center;
		padding: 10px;
	}

	.event-item {
		background: rgba(40, 40, 40, 0.6);
		margin-bottom: 5px;
		padding: 5px;
		border-radius: 0 0 3px 3px;
	}

	.event-info {
		border-left: 3px solid rgba(100, 200, 255, 0.9);
	}

	.event-warning {
		border-left: 3px solid rgba(255, 200, 0, 0.9);
	}

	.event-critical {
		border-left: 3px solid rgba(255, 50, 50, 0.9);
	}

	.event-header {
		display: flex;
		justify-content: space-between;
		font-size: 10px;
		margin-bottom: 3px;
	}

	.event-type {
		font-weight: bold;
	}

	.event-info .event-type {
		color: rgba(100, 200, 255, 0.9);
	}

	.event-warning .event-type {
		color: rgba(255, 200, 0, 0.9);
	}

	.event-critical .event-type {
		color: rgba(255, 50, 50, 0.9);
	}

	.event-timestamp {
		color: rgba(200, 200, 200, 0.7);
	}

	.event-details {
		font-size: 9px;
		color: rgba(255, 255, 255, 0.9);
	}

	.memory-metrics {
		margin-top: 10px;
	}

	.metrics-header {
		font-size: 11px;
		font-weight: bold;
		padding: 5px;
		background: rgba(30, 40, 50, 0.8);
		color: rgba(100, 200, 255, 0.9);
		border-radius: 3px 3px 0 0;
	}

	.memory-metric-item {
		display: flex;
		justify-content: space-between;
		padding: 5px;
		font-size: 10px;
		background: rgba(40, 40, 40, 0.6);
		border-bottom: 1px solid rgba(50, 50, 50, 0.5);
	}

	.memory-metric-item:last-child {
		border-radius: 0 0 3px 3px;
		border-bottom: none;
	}

	.memory-report {
		background: rgba(30, 30, 30, 0.8);
		border-radius: 3px;
		overflow: hidden;
		margin-top: 10px;
	}

	.report-header {
		background: rgba(40, 60, 80, 0.8);
		padding: 5px;
		font-size: 11px;
		font-weight: bold;
		color: rgba(100, 200, 255, 0.9);
		display: flex;
		justify-content: space-between;
	}

	.close-report-btn {
		background: none;
		border: none;
		color: rgba(255, 100, 100, 0.9);
		cursor: pointer;
		font-size: 14px;
		padding: 0;
		width: 16px;
		height: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.report-content {
		padding: 5px;
		max-height: 400px;
		overflow-y: auto;
	}

	.report-content pre {
		font-size: 10px;
		white-space: pre-wrap;
		margin: 0;
		color: rgba(255, 255, 255, 0.9);
	}

	.report-footer {
		padding: 5px;
		background: rgba(20, 20, 20, 0.6);
		display: flex;
		justify-content: flex-end;
	}

	.copy-btn {
		background: rgba(40, 60, 80, 0.8);
		border: none;
		color: white;
		padding: 3px 8px;
		border-radius: 3px;
		cursor: pointer;
		font-size: 10px;
	}

	.copy-btn:hover {
		background: rgba(50, 80, 100, 0.8);
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
			min-width: 250px;
			max-width: 90vw;
		}

		.detailed-metrics,
		.pool-metrics {
			font-size: 9px;
		}

		.benchmark-controls {
			grid-template-columns: 1fr;
		}

		.benchmark-buttons {
			grid-column: span 1;
			flex-direction: column;
		}

		.memory-controls {
			flex-direction: column;
		}
	}
</style>

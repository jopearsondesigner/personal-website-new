<!-- src/lib/components/devtools/PerformanceMonitor.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fpsStore } from '$lib/utils/frame-rate-controller';
	import {
		deviceCapabilities,
		memoryUsageStore,
		objectPoolStatsStore,
		updateObjectPoolStats
	} from '$lib/utils/device-performance';
	import {
		perfMonitorVisible,
		setPerformanceMonitorVisibility
	} from '$lib/stores/performance-monitor';
	import { browser } from '$app/environment';
	import { get } from 'svelte/store';
	import {
		BenchmarkType,
		PerformanceBenchmark,
		benchmarkResultsStore
	} from '$lib/utils/performance-benchmarking';
	import { memoryMonitor, type MemoryEvent, MemoryEventType } from '$lib/utils/memory-monitor';
	import { performanceTestRunner } from '$lib/utils/performance-test-runner';

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
	let benchmarkType = BenchmarkType.FPS;
	let benchmarkDuration = 5000;
	let currentBenchmark: PerformanceBenchmark | null = null;

	// Test runner state
	let isTestRunning = false;
	let testProgress = 0;
	let currentTestId = '';
	let currentTestStep = '';

	// Memory monitor state
	let memoryEvents: MemoryEvent[] = [];
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
	let prevFps = 0;
	let prevMemory = 0;
	let prevPoolUtilization = 0;

	// Performance warnings
	let warnings: string[] = [];

	// Benchmark results
	$: benchmarkResults = $benchmarkResultsStore;
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

	// Subscribe to stores with throttling
	$: {
		const now = browser ? performance.now() : 0;
		// Only trigger update at most once per interval
		if (now - lastUpdateTime > updateInterval && !pendingUpdate) {
			lastUpdateTime = now;
			pendingUpdate = true;

			// Schedule update on next animation frame
			if (browser) {
				requestAnimationFrame(() => {
					pendingUpdate = false;
					updatePerformanceData();
					// FPS and other values are automatically updated by reactive statements
				});
			}
		}
	}

	/**
	 * Optimization: Memoize expensive calculations
	 * Benefit: Reduces redundant calculations
	 */
	let memoizedStats = {
		utilizationPercentage: '0',
		reuseRatioPercentage: '0',
		memoryPercentage: '0',
		lastUpdateTime: 0
	};

	function updateMemoizedStats() {
		const now = performance.now();
		if (now - memoizedStats.lastUpdateTime < 250) return; // Throttle updates

		memoizedStats = {
			utilizationPercentage: ($objectPoolStatsStore.utilizationRate * 100).toFixed(0),
			reuseRatioPercentage: ($objectPoolStatsStore.reuseRatio * 100).toFixed(0),
			memoryPercentage: ($memoryUsageStore * 100).toFixed(0),
			lastUpdateTime: now
		};
	}

	// Call updateMemoizedStats when stores change
	$: if (browser && $perfMonitorVisible) {
		updateMemoizedStats();
	}

	// Update chart data from current performance metrics
	function updatePerformanceData() {
		if (!browser) return;

		// Update the FPS chart data
		fpsChartData.push($fpsStore);
		if (fpsChartData.length > 100) fpsChartData.shift();

		// Update memory chart data
		memoryChartData.push($memoryUsageStore * 100); // Convert to percentage
		if (memoryChartData.length > 100) memoryChartData.shift();

		// Update pool utilization data
		poolUtilizationData.push($objectPoolStatsStore.utilizationRate * 100); // Convert to percentage
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
		const currentFps = $fpsStore;
		if (prevFps > 0) {
			const fpsDiff = currentFps - prevFps;
			performanceTrend.fps = {
				rising: fpsDiff > FPS_THRESHOLD,
				falling: fpsDiff < -FPS_THRESHOLD,
				stable: Math.abs(fpsDiff) <= FPS_THRESHOLD,
				value: currentFps
			};
		}
		prevFps = currentFps;

		// Update memory trend
		const currentMemory = $memoryUsageStore;
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
		const currentPoolUtilization = $objectPoolStatsStore.utilizationRate;
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
		const currentFps = $fpsStore;
		const targetFps = get(deviceCapabilities)?.performance?.targetFPS || 60;
		if (currentFps < targetFps * 0.7) {
			warnings.push(
				`Low FPS: ${currentFps.toFixed(1)}/${targetFps} (${((currentFps / targetFps) * 100).toFixed(0)}%)`
			);
		}

		// Check memory usage
		const memoryUsage = $memoryUsageStore;
		if (memoryUsage > 0.8) {
			warnings.push(`High memory usage: ${(memoryUsage * 100).toFixed(0)}%`);
		}

		// Check pool utilization
		const poolUtilization = $objectPoolStatsStore.utilizationRate;
		if (poolUtilization > 0.9) {
			warnings.push(`Object pool near capacity: ${(poolUtilization * 100).toFixed(0)}%`);
		}

		// Check pool churn
		const reuseRatio = $objectPoolStatsStore.reuseRatio;
		if (reuseRatio < 0.5 && $objectPoolStatsStore.objectsCreated > 100) {
			warnings.push(`Low object reuse ratio: ${(reuseRatio * 100).toFixed(0)}%`);
		}
	}

	// Start benchmarking
	function startBenchmark() {
		if (isBenchmarkRunning || !browser) return;

		isBenchmarkRunning = true;
		benchmarkProgress = 0;

		// Create and configure the benchmark
		const benchmarkId = `benchmark-${Date.now()}`;
		currentBenchmark = new PerformanceBenchmark(benchmarkId, benchmarkType, benchmarkDuration);

		// Setup progress tracking
		currentBenchmark.onProgress((progress) => {
			benchmarkProgress = progress;
		});

		// Setup completion handling
		currentBenchmark.onComplete((result) => {
			isBenchmarkRunning = false;
			benchmarkProgress = 100;
			currentBenchmark = null;

			// Add result to the selected results for easy comparison
			if (selectedBenchmarkResults.length < 2) {
				selectedBenchmarkResults = [...selectedBenchmarkResults, result];
			}

			// Update comparison if we have two results
			if (selectedBenchmarkResults.length === 2) {
				benchmarkComparisonResult = PerformanceBenchmark.compareResults(
					selectedBenchmarkResults[0],
					selectedBenchmarkResults[1]
				);
			}
		});

		// Start the benchmark
		currentBenchmark.start();
	}

	// Cancel running benchmark
	function cancelBenchmark() {
		if (!isBenchmarkRunning || !currentBenchmark) return;

		currentBenchmark.stop();
		isBenchmarkRunning = false;
		benchmarkProgress = 0;
		currentBenchmark = null;
	}

	// Run standard benchmark suite
	function runBenchmarkSuite() {
		if (isBenchmarkRunning || !browser) return;

		isBenchmarkRunning = true;
		benchmarkProgress = 0;

		PerformanceBenchmark.runStandardSuite(benchmarkDuration, (benchmarkName, progress) => {
			// Update progress based on which benchmark is running
			benchmarkProgress = progress;
		}).then((results) => {
			isBenchmarkRunning = false;
			benchmarkProgress = 100;

			// Clear selected results and add the most important ones
			selectedBenchmarkResults = results.slice(0, 2);

			// Update comparison if we have at least two results
			if (selectedBenchmarkResults.length >= 2) {
				benchmarkComparisonResult = PerformanceBenchmark.compareResults(
					selectedBenchmarkResults[0],
					selectedBenchmarkResults[1]
				);
			}
		});
	}

	// Run performance test suite
	function runPerformanceTests() {
		if (isTestRunning || !browser) return;

		isTestRunning = true;
		testProgress = 0;

		// Setup callbacks
		performanceTestRunner.onProgress((scenarioId, benchmarkType, progress) => {
			currentTestId = scenarioId;
			currentTestStep = benchmarkType;
			testProgress = progress;
		});

		performanceTestRunner.onTestComplete((result) => {
			console.log(`Test completed: ${result.scenarioId}`, result);
		});

		// Run all tests
		performanceTestRunner
			.runAllTests()
			.then((results) => {
				isTestRunning = false;
				testProgress = 100;

				console.log('All tests completed:', results);

				// Show a success message
				alert(`Completed ${results.length} performance tests.`);
			})
			.catch((error) => {
				isTestRunning = false;
				console.error('Error running tests:', error);
			});
	}

	// Generate memory diagnostic report
	function generateMemoryReport() {
		if (!browser) return;

		memoryReport = memoryMonitor.getMemoryLeakReport();
		showMemoryReport = true;
	}

	// Suggest garbage collection
	function suggestGarbageCollection() {
		if (!browser) return;

		memoryMonitor.suggestGarbageCollection();
	}

	// Update memory events from monitor
	function updateMemoryEvents() {
		if (!browser) return;

		memoryEvents = memoryMonitor.getEvents();
	}

	// Select a benchmark result for comparison
	function selectBenchmarkResult(result, index) {
		// Replace the result at the given index, or add it if not enough results
		if (index < selectedBenchmarkResults.length) {
			selectedBenchmarkResults[index] = result;
			selectedBenchmarkResults = [...selectedBenchmarkResults]; // Trigger reactivity
		} else if (selectedBenchmarkResults.length < 2) {
			selectedBenchmarkResults = [...selectedBenchmarkResults, result];
		}

		// Update comparison if we have two results
		if (selectedBenchmarkResults.length === 2) {
			benchmarkComparisonResult = PerformanceBenchmark.compareResults(
				selectedBenchmarkResults[0],
				selectedBenchmarkResults[1]
			);
		}
	}

	// Clear selected benchmark results
	function clearSelectedResults() {
		selectedBenchmarkResults = [];
		benchmarkComparisonResult = null;
	}

	// Handle double tap on mobile
	function handleTouchStart(event: TouchEvent) {
		const touch = event.touches[0];
		touchStartX = touch.clientX;
		touchStartY = touch.clientY;

		// Double-tap detection
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

		// Initialize touch drag if touching the header
		const header = monitorElement?.querySelector('.monitor-header');
		if (header && event.target && header.contains(event.target as Node)) {
			isTouchDragging = true;
			touchDragStartX = touch.clientX;
			touchDragStartY = touch.clientY;

			const rect = monitorElement.getBoundingClientRect();
			initialTouchLeft = rect.left;
			initialTouchTop = rect.top;

			event.preventDefault(); // Prevent scrolling while dragging the header
		}
	}

	// Handle touch move for dragging
	function handleTouchMove(event: TouchEvent) {
		if (!isTouchDragging) return;

		const touch = event.touches[0];
		const deltaX = touch.clientX - touchDragStartX;
		const deltaY = touch.clientY - touchDragStartY;

		const newLeft = initialTouchLeft + deltaX;
		const newTop = initialTouchTop + deltaY;

		// Constrain to viewport
		const maxX = window.innerWidth - monitorElement.offsetWidth;
		const maxY = window.innerHeight - monitorElement.offsetHeight;

		const constrainedX = Math.max(0, Math.min(newLeft, maxX));
		const constrainedY = Math.max(0, Math.min(newTop, maxY));

		monitorElement.style.right = 'auto';
		monitorElement.style.bottom = 'auto';
		monitorElement.style.left = `${constrainedX}px`;
		monitorElement.style.top = `${constrainedY}px`;

		// Only call preventDefault when we're actually dragging
		if (isTouchDragging) {
			event.preventDefault(); // Prevent page scrolling during drag
		}
	}

	// Handle touch end
	function handleTouchEnd(event: TouchEvent) {
		if (isTouchDragging) {
			isTouchDragging = false;

			// Save position
			if (browser && monitorElement) {
				const rect = monitorElement.getBoundingClientRect();
				localStorage.setItem('perfMonitorX', String(rect.left));
				localStorage.setItem('perfMonitorY', String(rect.top));
			}

			event.preventDefault();
		}
	}

	// Dragging handlers
	function handleMouseDown(event: MouseEvent) {
		// Only start dragging on header element to avoid interference
		const header = monitorElement?.querySelector('.monitor-header');
		if (header && event.target && header.contains(event.target as Node)) {
			isDragging = true;
			offsetX = event.clientX - monitorElement.getBoundingClientRect().left;
			offsetY = event.clientY - monitorElement.getBoundingClientRect().top;
			event.preventDefault();
		}
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
		if (isDragging) {
			isDragging = false;

			// Save position
			if (browser && monitorElement) {
				const rect = monitorElement.getBoundingClientRect();
				localStorage.setItem('perfMonitorX', String(rect.left));
				localStorage.setItem('perfMonitorY', String(rect.top));
			}
		}
	}

	// Click outside to dismiss - fixed to prevent mobile menu conflicts
	function handleClickOutside(event: MouseEvent) {
		// Skip processing if the click was part of the mobile menu interaction
		const mobileMenuButton = document.querySelector('button[aria-controls="mobile-menu"]');
		const mobileMenuOverlay = document.querySelector('.mobile-menu-container button.fixed');
		const settingsButton = document.querySelector('button[aria-controls="settings-submenu"]');
		const settingsSubmenu = document.querySelector('#settings-submenu');

		// Check if the click was on the mobile menu toggle, settings button, or within the settings submenu
		if (
			(mobileMenuButton && mobileMenuButton.contains(event.target as Node)) ||
			(mobileMenuOverlay && mobileMenuOverlay.contains(event.target as Node)) ||
			(settingsButton && settingsButton.contains(event.target as Node)) ||
			(settingsSubmenu && settingsSubmenu.contains(event.target as Node))
		) {
			return; // Skip processing for mobile menu and settings interactions
		}

		// Regular behavior for other clicks
		if (monitorElement && !monitorElement.contains(event.target as Node) && $perfMonitorVisible) {
			// Only dismiss if we didn't just finish dragging and not clicking UI elements
			if (!isDragging) {
				setPerformanceMonitorVisibility(false);
			}
		}
	}

	// Handle close button click - ensure we properly stop propagation
	function handleCloseClick(event: MouseEvent) {
		event.stopPropagation(); // Prevent event bubbling
		setPerformanceMonitorVisibility(false);
	}

	// Force refresh of stats
	function forceStatsRefresh() {
		if (!browser) return;

		try {
			// Import both modules and force refresh
			Promise.all([import('$lib/utils/pool-stats-tracker'), import('$lib/utils/star-pool-bridge')])
				.then(([trackerModule, bridgeModule]) => {
					// Force immediate refresh
					if (trackerModule.starPoolTracker) {
						trackerModule.starPoolTracker.reportNow();
					}

					if (bridgeModule.starPoolBridge) {
						bridgeModule.starPoolBridge.forceSyncStats();
					}
				})
				.catch((error) => {
					console.error('Failed to refresh pool stats:', error);
				});
		} catch (error) {
			console.error('Error refreshing pool stats:', error);
		}
	}

	// Setup periodic refresh
	function setupStatsRefresh() {
		if (!browser || statsRefreshInterval !== null) return;

		// Refresh stats every 250ms when visible
		statsRefreshInterval = window.setInterval(() => {
			if ($perfMonitorVisible) {
				forceStatsRefresh();
				updatePerformanceData();
			}
		}, 250);
	}

	// Setup chart updates
	function setupChartUpdates() {
		if (!browser || chartUpdateInterval !== null) return;

		// Update chart data every second
		chartUpdateInterval = window.setInterval(() => {
			if ($perfMonitorVisible) {
				updatePerformanceData();
			}
		}, 1000);
	}

	// Setup memory updates
	function setupMemoryUpdates() {
		if (!browser || memoryUpdateInterval !== null) return;

		// Update memory events every 2 seconds
		memoryUpdateInterval = window.setInterval(() => {
			if ($perfMonitorVisible && showMemoryPanel) {
				updateMemoryEvents();
			}
		}, 2000);
	}

	// Cleanup interval on destroy
	function cleanupIntervals() {
		if (statsRefreshInterval !== null) {
			window.clearInterval(statsRefreshInterval);
			statsRefreshInterval = null;
		}

		if (chartUpdateInterval !== null) {
			window.clearInterval(chartUpdateInterval);
			chartUpdateInterval = null;
		}

		if (memoryUpdateInterval !== null) {
			window.clearInterval(memoryUpdateInterval);
			memoryUpdateInterval = null;
		}
	}

	onMount(() => {
		if (browser && monitorElement) {
			/**
			 * Optimization: Passive touch event handling
			 * Benefit: Improves scrolling performance
			 */
			// Add touch events with correct passive settings
			monitorElement.addEventListener('touchstart', handleTouchStart, {
				passive: false // Changed to false since we call preventDefault()
			});

			// Only add non-passive for events that need preventDefault
			document.addEventListener('touchmove', handleTouchMove, {
				passive: false // Keep non-passive only when needed
			});
			document.addEventListener('touchend', handleTouchEnd, {
				passive: false // Changed to false since we call preventDefault()
			});

			// Use capture phase for outside clicks to handle early
			document.addEventListener('mousedown', handleClickOutside, {
				capture: true,
				passive: true
			});

			// Add drag handlers
			monitorElement.addEventListener('mousedown', handleMouseDown);
			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);

			// Initialize stats
			forceStatsRefresh();

			// Setup periodic refresh and chart updates
			setupStatsRefresh();
			setupChartUpdates();
			setupMemoryUpdates();

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

			// Initialize memory events
			updateMemoryEvents();
		}
	});

	onDestroy(() => {
		if (browser && monitorElement) {
			// Remove event listeners
			monitorElement.removeEventListener('touchstart', handleTouchStart);
			monitorElement.removeEventListener('mousedown', handleMouseDown);
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
			document.removeEventListener('mousedown', handleClickOutside);
			document.removeEventListener('touchmove', handleTouchMove);
			document.removeEventListener('touchend', handleTouchEnd);

			if (touchTimeout !== null) {
				window.clearTimeout(touchTimeout);
			}
		}

		// Cleanup intervals
		cleanupIntervals();

		// Cancel any running benchmark
		if (currentBenchmark) {
			currentBenchmark.stop();
		}
	});
</script>

{#if true}
	<!-- Always render but control visibility with CSS -->
	<div
		bind:this={monitorElement}
		class="performance-monitor debug-panel {$perfMonitorVisible ? 'visible' : 'hidden'}"
		data-perf-monitor="true"
		role="status"
		aria-live="polite"
	>
		<div class="monitor-header" on:mousedown={handleMouseDown}>
			<span class="title">Performance Monitor</span>
			<span class="close-btn" on:click={handleCloseClick}>×</span>
		</div>

		<!-- Tabs for different monitor sections -->
		<div class="monitor-tabs">
			<button
				class="tab-btn {!showBenchmarkPanel && !showMemoryPanel ? 'active' : ''}"
				on:click={() => {
					showBenchmarkPanel = false;
					showMemoryPanel = false;
				}}
			>
				Live Metrics
			</button>
			<button
				class="tab-btn {showBenchmarkPanel ? 'active' : ''}"
				on:click={() => {
					showBenchmarkPanel = true;
					showMemoryPanel = false;
				}}
			>
				Benchmarks
			</button>
			<button
				class="tab-btn {showMemoryPanel ? 'active' : ''}"
				on:click={() => {
					showBenchmarkPanel = false;
					showMemoryPanel = true;
				}}
			>
				Memory
			</button>
		</div>

		{#if !showBenchmarkPanel && !showMemoryPanel}
			<!-- Live Metrics Panel -->
			<div class="metrics-panel">
				<!-- Performance Warnings -->
				{#if warnings.length > 0}
					<div class="warnings-panel">
						{#each warnings as warning}
							<div class="warning-item">{warning}</div>
						{/each}
					</div>
				{/if}

				<!-- Basic Metrics Display -->
				<div class="basic-metrics">
					<div
						class:good={$fpsStore > 50}
						class:warning={$fpsStore <= 50 && $fpsStore > 30}
						class:bad={$fpsStore <= 30}
					>
						FPS: {$fpsStore.toFixed(1)}
						{#if performanceTrend.fps.rising}
							<span class="trend up">↑</span>
						{:else if performanceTrend.fps.falling}
							<span class="trend down">↓</span>
						{/if}
					</div>
					<div
						class:good={$memoryUsageStore < 0.5}
						class:warning={$memoryUsageStore >= 0.5 && $memoryUsageStore < 0.8}
						class:bad={$memoryUsageStore >= 0.8}
					>
						Memory: {memoizedStats.memoryPercentage}%
						{#if performanceTrend.memory.rising}
							<span class="trend down">↑</span>
						{:else if performanceTrend.memory.falling}
							<span class="trend up">↓</span>
						{/if}
					</div>
					<div
						class:good={$objectPoolStatsStore.utilizationRate < 0.7}
						class:warning={$objectPoolStatsStore.utilizationRate >= 0.7 &&
							$objectPoolStatsStore.utilizationRate < 0.9}
						class:bad={$objectPoolStatsStore.utilizationRate >= 0.9}
					>
						Pool: {memoizedStats.utilizationPercentage}%
						{#if performanceTrend.poolUtilization.rising}
							<span class="trend down">↑</span>
						{:else if performanceTrend.poolUtilization.falling}
							<span class="trend up">↓</span>
						{/if}
					</div>
					<div>Quality: {$deviceCapabilities?.tier || 'high'}</div>
				</div>
				<!-- Performance Chart Selector -->
				<div class="chart-selector">
					<button
						class="chart-tab {activeChart === 'fps' ? 'active' : ''}"
						on:click={() => (activeChart = 'fps')}
					>
						FPS Chart
					</button>
					<button
						class="chart-tab {activeChart === 'memory' ? 'active' : ''}"
						on:click={() => (activeChart = 'memory')}
					>
						Memory
					</button>
					<button
						class="chart-tab {activeChart === 'pool' ? 'active' : ''}"
						on:click={() => (activeChart = 'pool')}
					>
						Pool Usage
					</button>
				</div>

				<!-- Performance Chart Area -->
				<div class="chart-area">
					{#if activeChart === 'fps'}
						<div class="chart fps-chart">
							<div class="chart-target-line" style="top: 10%;"></div>
							{#each fpsChartData as fps, i}
								{#if i < fpsChartData.length - 1}
									<div
										class="chart-bar"
										style="height: {Math.min(100, (fps / 60) * 100)}%; left: {(i /
											fpsChartData.length) *
											100}%;"
										class:good={fps > 50}
										class:warning={fps <= 50 && fps > 30}
										class:bad={fps <= 30}
									></div>
								{/if}
							{/each}
						</div>
						<div class="chart-label">FPS over time (Target: 60)</div>
					{:else if activeChart === 'memory'}
						<div class="chart memory-chart">
							<div class="chart-warning-line" style="top: 20%;"></div>
							<div class="chart-danger-line" style="top: 50%;"></div>
							{#each memoryChartData as memory, i}
								{#if i < memoryChartData.length - 1}
									<div
										class="chart-bar"
										style="height: {memory}%; left: {(i / memoryChartData.length) * 100}%;"
										class:good={memory < 50}
										class:warning={memory >= 50 && memory < 80}
										class:bad={memory >= 80}
									></div>
								{/if}
							{/each}
						</div>
						<div class="chart-label">Memory Usage % (Lower is better)</div>
					{:else if activeChart === 'pool'}
						<div class="chart pool-chart">
							<div class="chart-warning-line" style="top: 30%;"></div>
							<div class="chart-danger-line" style="top: 10%;"></div>
							{#each poolUtilizationData as poolUsage, i}
								{#if i < poolUtilizationData.length - 1}
									<div
										class="chart-bar"
										style="height: {poolUsage}%; left: {(i / poolUtilizationData.length) * 100}%;"
										class:good={poolUsage < 70}
										class:warning={poolUsage >= 70 && poolUsage < 90}
										class:bad={poolUsage >= 90}
									></div>
								{/if}
							{/each}
						</div>
						<div class="chart-label">Object Pool Utilization % (Maintain below 90%)</div>
					{/if}
				</div>

				<!-- Metrics Toggles -->
				<div class="metrics-toggles">
					<button
						class="metrics-toggle {showDetailedMetrics ? 'active' : ''}"
						on:click={() => (showDetailedMetrics = !showDetailedMetrics)}
					>
						{showDetailedMetrics ? 'Hide Details' : 'Show Details'}
					</button>

					<button
						class="metrics-toggle {showPoolMetrics ? 'active' : ''}"
						on:click={() => (showPoolMetrics = !showPoolMetrics)}
					>
						{showPoolMetrics ? 'Hide Object Pool' : 'Show Object Pool'}
					</button>
				</div>

				<!-- Detailed Device Metrics -->
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
							Hardware Acceleration: {$deviceCapabilities?.hasGPUAcceleration
								? 'Enabled'
								: 'Disabled'}
						</div>
						<div>Frame Skip: {$deviceCapabilities?.frameSkip || 0}</div>
						<div>Update Interval: {$deviceCapabilities?.updateInterval || 0}ms</div>
					</div>
				{/if}

				<!-- Object Pool Metrics -->
				{#if showPoolMetrics}
					<div class="pool-metrics">
						<div class="pool-header">
							<span>{$objectPoolStatsStore.poolName} Pool ({$objectPoolStatsStore.poolType})</span>
							<button class="refresh-btn" on:click={forceStatsRefresh} title="Refresh Stats"
								>⟳</button
							>
						</div>
						<div class="pool-utilization">
							<div class="utilization-bar">
								<div
									class="utilization-fill"
									class:good={$objectPoolStatsStore.utilizationRate < 0.7}
									class:warning={$objectPoolStatsStore.utilizationRate >= 0.7 &&
										$objectPoolStatsStore.utilizationRate < 0.9}
									class:bad={$objectPoolStatsStore.utilizationRate >= 0.9}
									style="width: {memoizedStats.utilizationPercentage}%"
								></div>
							</div>
							<div class="utilization-text">
								{$objectPoolStatsStore.activeObjects} / {$objectPoolStatsStore.totalCapacity} objects
								({memoizedStats.utilizationPercentage}%)
							</div>
						</div>
						<div class="pool-stats">
							<div>Created: {$objectPoolStatsStore.objectsCreated}</div>
							<div>Reused: {$objectPoolStatsStore.objectsReused}</div>
							<div>Reuse Ratio: {memoizedStats.reuseRatioPercentage}%</div>
							<div>Memory Saved: {$objectPoolStatsStore.estimatedMemorySaved.toFixed(0)} KB</div>
						</div>
					</div>
				{/if}
			</div>
		{:else if showBenchmarkPanel}
			<!-- Benchmarking Panel -->
			<div class="benchmark-panel">
				<div class="benchmark-controls">
					<div class="benchmark-type-selector">
						<label for="benchmark-type">Benchmark Type:</label>
						<select id="benchmark-type" bind:value={benchmarkType} disabled={isBenchmarkRunning}>
							<option value={BenchmarkType.FPS}>FPS Performance</option>
							<option value={BenchmarkType.MemoryUsage}>Memory Usage</option>
							<option value={BenchmarkType.RenderTime}>Render Time</option>
							<option value={BenchmarkType.InteractiveResponsiveness}
								>Interactive Responsiveness</option
							>
							<option value={BenchmarkType.GarbageCollection}>Garbage Collection</option>
						</select>
					</div>

					<div class="benchmark-duration-selector">
						<label for="benchmark-duration">Duration (sec):</label>
						<select
							id="benchmark-duration"
							bind:value={benchmarkDuration}
							disabled={isBenchmarkRunning}
						>
							<option value={3000}>3</option>
							<option value={5000}>5</option>
							<option value={10000}>10</option>
							<option value={30000}>30</option>
						</select>
					</div>

					<div class="benchmark-buttons">
						{#if !isBenchmarkRunning && !isTestRunning}
							<button class="benchmark-btn start" on:click={startBenchmark}> Run Benchmark </button>
							<button class="benchmark-btn suite" on:click={runBenchmarkSuite}>
								Run Test Suite
							</button>
							<button class="benchmark-btn tests" on:click={runPerformanceTests}>
								Run All Tests
							</button>
						{:else}
							<button
								class="benchmark-btn cancel"
								on:click={isBenchmarkRunning ? cancelBenchmark : null}
							>
								Cancel
							</button>
						{/if}
					</div>
				</div>

				{#if isBenchmarkRunning}
					<div class="benchmark-progress">
						<div class="progress-bar">
							<div class="progress-fill" style="width: {benchmarkProgress}%;"></div>
						</div>
						<div class="progress-text">Running benchmark... {benchmarkProgress.toFixed(0)}%</div>
					</div>
				{:else if isTestRunning}
					<div class="benchmark-progress">
						<div class="progress-bar">
							<div class="progress-fill" style="width: {testProgress}%;"></div>
						</div>
						<div class="progress-text">
							Running test: {currentTestId} - {currentTestStep} - {testProgress.toFixed(0)}%
						</div>
					</div>
				{/if}

				<!-- Benchmark Results Toggle -->
				<div class="results-toggle">
					<button
						class="toggle-btn {!showResultsComparison ? 'active' : ''}"
						on:click={() => (showResultsComparison = false)}
					>
						Benchmark History
					</button>
					<button
						class="toggle-btn {showResultsComparison ? 'active' : ''}"
						on:click={() => (showResultsComparison = true)}
					>
						Compare Results
					</button>
				</div>

				{#if !showResultsComparison}
					<!-- Benchmark History -->
					<div class="benchmark-history" bind:this={benchmarkResultsElement}>
						{#if benchmarkResults.length === 0}
							<div class="no-results">
								No benchmark results yet. Run a benchmark to see results here.
							</div>
						{:else}
							{#each benchmarkResults as result, index}
								<div
									class="result-item"
									on:click={() => selectBenchmarkResult(result, selectedBenchmarkResults.length)}
								>
									<div class="result-header">
										<span class="result-type">{result.type}</span>
										<span class="result-timestamp"
											>{new Date(result.timestamp).toLocaleTimeString()}</span
										>
									</div>
									<div class="result-metrics">
										<span class="metric">Avg: {result.metrics.avg.toFixed(2)}</span>
										<span class="metric">Min: {result.metrics.min.toFixed(2)}</span>
										<span class="metric">Max: {result.metrics.max.toFixed(2)}</span>
									</div>
								</div>
							{/each}
						{/if}
					</div>
				{:else}
					<!-- Results Comparison -->
					<div class="results-comparison">
						<div class="selected-results">
							{#if selectedBenchmarkResults.length === 0}
								<div class="no-selection">Select results from the Benchmark History to compare</div>
							{:else if selectedBenchmarkResults.length === 1}
								<div class="single-result">
									<div class="result-card">
										<div class="result-card-header">
											{selectedBenchmarkResults[0].type}
											<button class="remove-btn" on:click={() => clearSelectedResults()}>×</button>
										</div>
										<div class="result-card-content">
											<div class="metric-row">
												Avg: {selectedBenchmarkResults[0].metrics.avg.toFixed(2)}
											</div>
											<div class="metric-row">
												Min: {selectedBenchmarkResults[0].metrics.min.toFixed(2)}
											</div>
											<div class="metric-row">
												Max: {selectedBenchmarkResults[0].metrics.max.toFixed(2)}
											</div>
											<div class="metric-row">
												Median: {selectedBenchmarkResults[0].metrics.median.toFixed(2)}
											</div>
										</div>
										<div class="result-card-footer">Select another result to compare</div>
									</div>
								</div>
							{:else}
								<div class="comparison-results">
									<div class="result-card">
										<div class="result-card-header">
											{selectedBenchmarkResults[0].type}
											<button
												class="remove-btn"
												on:click={() => (selectedBenchmarkResults = [selectedBenchmarkResults[1]])}
												>×</button
											>
										</div>
										<div class="result-card-content">
											<div class="metric-row">
												Avg: {selectedBenchmarkResults[0].metrics.avg.toFixed(2)}
											</div>
											<div class="metric-row">
												Min: {selectedBenchmarkResults[0].metrics.min.toFixed(2)}
											</div>
											<div class="metric-row">
												Max: {selectedBenchmarkResults[0].metrics.max.toFixed(2)}
											</div>
										</div>
										<div class="result-card-footer">
											{new Date(selectedBenchmarkResults[0].timestamp).toLocaleString()}
										</div>
									</div>

									<div class="comparison-indicator">
										{#if benchmarkComparisonResult}
											<div
												class="change-arrow {benchmarkComparisonResult.improved
													? 'improved'
													: 'degraded'}"
											>
												{benchmarkComparisonResult.improved ? '↑' : '↓'}
											</div>
											<div
												class="change-percentage {benchmarkComparisonResult.improved
													? 'improved'
													: 'degraded'}"
											>
												{benchmarkComparisonResult.percentageChange > 0
													? '+'
													: ''}{benchmarkComparisonResult.percentageChange.toFixed(1)}%
											</div>
											<div class="significance-label {benchmarkComparisonResult.significance}">
												{benchmarkComparisonResult.significance}
												{benchmarkComparisonResult.improved ? 'improvement' : 'degradation'}
											</div>
										{:else}
											<div class="comparison-loading">Calculating comparison...</div>
										{/if}
									</div>

									<div class="result-card">
										<div class="result-card-header">
											{selectedBenchmarkResults[1].type}
											<button
												class="remove-btn"
												on:click={() => (selectedBenchmarkResults = [selectedBenchmarkResults[0]])}
												>×</button
											>
										</div>
										<div class="result-card-content">
											<div class="metric-row">
												Avg: {selectedBenchmarkResults[1].metrics.avg.toFixed(2)}
											</div>
											<div class="metric-row">
												Min: {selectedBenchmarkResults[1].metrics.min.toFixed(2)}
											</div>
											<div class="metric-row">
												Max: {selectedBenchmarkResults[1].metrics.max.toFixed(2)}
											</div>
										</div>
										<div class="result-card-footer">
											{new Date(selectedBenchmarkResults[1].timestamp).toLocaleString()}
										</div>
									</div>
								</div>

								<button class="clear-btn" on:click={() => clearSelectedResults()}>
									Clear Selection
								</button>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		{:else if showMemoryPanel}
			<!-- Memory Monitoring Panel -->
			<div class="memory-panel">
				<div class="memory-controls">
					<button class="memory-btn" on:click={generateMemoryReport}> Generate Report </button>
					<button class="memory-btn" on:click={suggestGarbageCollection}> Suggest GC </button>
					<button class="memory-btn" on:click={() => memoryMonitor.takeSnapshot()}>
						Take Snapshot
					</button>
				</div>

				{#if showMemoryReport}
					<div class="memory-report">
						<div class="report-header">
							<span>Memory Diagnostic Report</span>
							<button class="close-report-btn" on:click={() => (showMemoryReport = false)}>×</button
							>
						</div>
						<div class="report-content">
							<pre>{memoryReport}</pre>
						</div>
						<div class="report-footer">
							<button
								class="copy-btn"
								on:click={() => {
									if (browser) {
										navigator.clipboard.writeText(memoryReport);
										alert('Report copied to clipboard');
									}
								}}
							>
								Copy to Clipboard
							</button>
						</div>
					</div>
				{:else}
					<!-- Memory Events -->
					<div class="memory-events">
						<div class="events-header">Recent Memory Events</div>
						{#if memoryEvents.length === 0}
							<div class="no-events">No memory events recorded yet</div>
						{:else}
							{#each memoryEvents.slice().reverse().slice(0, 10) as event}
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
									<div class="event-details">
										{event.details}
									</div>
								</div>
							{/each}
						{/if}
					</div>
					<!-- Memory Metrics -->
					<div class="memory-metrics">
						<div class="metrics-header">Current Memory Metrics</div>
						<div class="memory-metric-item">
							<span>Heap Usage:</span>
							<span
								class:good={$memoryUsageStore < 0.5}
								class:warning={$memoryUsageStore >= 0.5 && $memoryUsageStore < 0.8}
								class:bad={$memoryUsageStore >= 0.8}
							>
								{($memoryUsageStore * 100).toFixed(1)}%
							</span>
						</div>
						{#if browser && 'performance' in window && 'memory' in (performance as any)}
							<div class="memory-metric-item">
								<span>Used Heap:</span>
								<span>
									{((performance as any).memory.usedJSHeapSize / (1024 * 1024)).toFixed(1)} MB
								</span>
							</div>
							<div class="memory-metric-item">
								<span>Total Heap:</span>
								<span>
									{((performance as any).memory.totalJSHeapSize / (1024 * 1024)).toFixed(1)} MB
								</span>
							</div>
							<div class="memory-metric-item">
								<span>Heap Limit:</span>
								<span>
									{((performance as any).memory.jsHeapSizeLimit / (1024 * 1024)).toFixed(1)} MB
								</span>
							</div>
						{:else}
							<div class="memory-metric-item">
								<span>Detailed Memory API:</span>
								<span class="warning">Not available in this browser</span>
							</div>
						{/if}
						<div class="memory-metric-item">
							<span>Memory Saved by Pool:</span>
							<span>
								{$objectPoolStatsStore.estimatedMemorySaved.toFixed(0)} KB
							</span>
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

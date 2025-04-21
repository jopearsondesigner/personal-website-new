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

	// Monitor element for touch event handling
	let monitorElement: HTMLDivElement;

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

	// Stats refresh interval handle
	let statsRefreshInterval: number | null = null;

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

	// Handle double tap on mobile
	function handleTouchStart(event: TouchEvent) {
		const touch = event.touches[0];
		touchStartX = touch.clientX;
		touchStartY = touch.clientY;

		// Double-tap detection remains the same
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

	// New function to handle touch move for dragging
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

		event.preventDefault(); // Prevent page scrolling during drag
	}

	// New function to handle touch end
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

	// Manual reset of pool stats
	function resetPoolStats() {
		if (!browser) return;

		try {
			// Import tracker module and reset stats
			import('$lib/utils/pool-stats-tracker')
				.then((module) => {
					if (module.starPoolTracker) {
						module.starPoolTracker.reset();
					}
				})
				.catch((error) => {
					console.error('Error resetting pool stats:', error);
				});
		} catch (error) {
			console.error('Error resetting pool stats:', error);
		}
	}

	// Setup periodic refresh
	function setupStatsRefresh() {
		if (!browser || statsRefreshInterval !== null) return;

		// Refresh stats every 250ms when visible
		statsRefreshInterval = window.setInterval(() => {
			if ($perfMonitorVisible) {
				forceStatsRefresh();
			}
		}, 250);
	}

	// Cleanup interval on destroy
	function cleanupStatsRefresh() {
		if (statsRefreshInterval !== null) {
			window.clearInterval(statsRefreshInterval);
			statsRefreshInterval = null;
		}
	}

	// Initialize stats if needed
	function initializeStats() {
		if (!browser) return;

		// Initialize with placeholder values to ensure store is populated
		updateObjectPoolStats({
			poolName: 'Stars',
			poolType: 'Star',
			objectsCreated: 0,
			objectsReused: 0,
			reuseRatio: 0,
			estimatedMemorySaved: 0,
			activeObjects: 0,
			totalCapacity: 300, // Default capacity
			utilizationRate: 0
		});
	}

	onMount(() => {
		if (browser && monitorElement) {
			/**
			 * Optimization: Passive touch event handling
			 * Benefit: Improves scrolling performance
			 */
			// Add touch events with correct passive settings
			monitorElement.addEventListener('touchstart', handleTouchStart, {
				passive: true // Change to passive when possible
			});

			// Only add non-passive for events that need preventDefault
			document.addEventListener('touchmove', handleTouchMove, {
				passive: false // Keep non-passive only when needed
			});
			document.addEventListener('touchend', handleTouchEnd, {
				passive: true // Change to passive when possible
			});

			// Use capture phase for outside clicks to handle early
			document.addEventListener('mousedown', handleClickOutside, {
				capture: true,
				passive: true
			});

			// Initialize handlers with properly bound this context
			handleTouchStart = handleTouchStart.bind(this);
			handleTouchMove = handleTouchMove.bind(this);
			handleTouchEnd = handleTouchEnd.bind(this);

			// Add drag handlers
			monitorElement.addEventListener('mousedown', handleMouseDown);
			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);

			// Initialize stats
			initializeStats();

			// Force immediate stats refresh
			forceStatsRefresh();

			// Setup periodic refresh
			setupStatsRefresh();

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
		cleanupStatsRefresh();
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

		<div class="basic-metrics">
			<div>FPS: {$fpsStore.toFixed(1)}</div>
			<div>Quality: {$deviceCapabilities?.tier || 'high'}</div>
			<div>Memory: {memoizedStats.memoryPercentage}%</div>
		</div>

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

		{#if showPoolMetrics}
			<div class="pool-metrics">
				<div class="pool-header">
					<span>{$objectPoolStatsStore.poolName} Pool ({$objectPoolStatsStore.poolType})</span>
					<button class="refresh-btn" on:click={forceStatsRefresh} title="Refresh Stats">⟳</button>
					<button class="reset-btn" on:click={resetPoolStats} title="Reset Stats">↺</button>
				</div>
				<div class="pool-utilization">
					<div class="utilization-bar">
						<div
							class="utilization-fill"
							style="width: {memoizedStats.utilizationPercentage}%"
						></div>
					</div>
					<div class="utilization-text">
						{$objectPoolStatsStore.activeObjects} / {$objectPoolStatsStore.totalCapacity} objects ({memoizedStats.utilizationPercentage}%)
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
		{#if showPoolMetrics}
			<div class="debug-controls">
				<button
					class="debug-btn"
					on:click={() => {
					import('$lib/utils/debug-pool-stats').then(module => {
						module.PoolStatsDebugger.injectTestData(20, 50);
					});
					}}
				>
					Test Data
				</button>
				<button
					class="debug-btn"
					on:click={() => {
					import('$lib/utils/star-pool-bridge').then(module => {
						// Toggle debug mode
						const isDebugMode = localStorage.getItem('starPoolDebugMode') === 'true';
						module.starPoolBridge.setDebugMode(!isDebugMode);
						alert(`Debug mode ${!isDebugMode ? 'enabled' : 'disabled'}`);
					});
					}}
				>
					Toggle Debug
				</button>
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
		z-index: 9000; /* Lower than mobile menu's z-index of 9999/10000 */
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

	.basic-metrics {
		padding: 8px 10px;
		display: grid;
		gap: 4px;
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
		background: linear-gradient(to right, #00aaff, #00eeff);
		border-radius: 4px;
		transition: width 0.5s ease;
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

	.shortcut-hint {
		font-size: 10px;
		opacity: 0.6;
		padding: 5px;
		text-align: center;
		background: rgba(20, 20, 20, 0.8);
	}

	.debug-controls {
		display: flex;
		gap: 4px;
		padding: 5px;
		background: rgba(20, 30, 40, 0.8);
		border-top: 1px solid rgba(0, 255, 255, 0.2);
	}

	.debug-btn {
		flex: 1;
		background: rgba(40, 50, 60, 0.6);
		border: none;
		color: var(--arcade-neon-blue-100, #00eeff);
		padding: 3px 0;
		font-size: 9px;
		cursor: pointer;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.debug-btn:hover {
		background: rgba(60, 80, 100, 0.6);
	}

	/* Hide shortcut hint on smaller screens */
	@media (max-width: 767px) {
		.performance-monitor {
			font-size: 10px;
			min-width: 160px;
		}

		.detailed-metrics,
		.pool-metrics {
			font-size: 9px;
		}
	}

	/* Arcade/gaming theme styles */
	.performance-monitor {
		border: 1px solid rgba(0, 255, 255, 0.3);
	}

	.title {
		color: var(--arcade-neon-green-100);
		text-shadow: 0 0 5px rgba(39, 255, 153, 0.5);
	}

	.basic-metrics div,
	.detailed-metrics div,
	.pool-stats div {
		position: relative;
		padding-left: 2px;
	}

	.basic-metrics div::before {
		content: '>';
		color: var(--arcade-neon-green-100);
		margin-right: 4px;
		opacity: 0.7;
	}

	.pool-stats div::before {
		content: '•';
		color: var(--arcade-neon-blue-100, #00eeff);
		margin-right: 4px;
		opacity: 0.7;
	}
</style>

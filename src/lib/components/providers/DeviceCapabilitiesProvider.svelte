<!-- src/lib/components/providers/DeviceCapabilitiesProvider.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { deviceCapabilities } from '$lib/utils/device-performance';
	import { createThrottledRAF } from '$lib/utils/animation-helpers';

	// Device detection state
	let isMobileDevice = false;
	let isLowPerformanceDevice = false;
	let eventHandlers = {};
	let orientationTimeout = null;
	let isInitialized = false;

	// Detect device capabilities
	function detectDeviceCapabilities() {
		if (!browser) return;

		// Check if mobile
		isMobileDevice = window.innerWidth < 768;

		// Try to detect lower-performance devices
		isLowPerformanceDevice =
			isMobileDevice &&
			// Check for older/lower-powered devices
			(navigator.hardwareConcurrency <= 4 ||
				// iOS Safari can struggle with these effects
				(navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')));

		// Set a data attribute that CSS can use for selective effects
		document.documentElement.setAttribute(
			'data-device-type',
			isLowPerformanceDevice ? 'low-performance' : isMobileDevice ? 'mobile' : 'desktop'
		);

		// Update the capabilities store
		deviceCapabilities.set({
			isMobile: isMobileDevice,
			isLowPerformance: isLowPerformanceDevice,
			maxStars: isLowPerformanceDevice ? 20 : isMobileDevice ? 40 : 60,
			frameSkip: isLowPerformanceDevice ? 2 : isMobileDevice ? 1 : 0,
			useWorker: !isLowPerformanceDevice,
			useParallax: !isLowPerformanceDevice && !isMobileDevice,
			enableGlow: !isLowPerformanceDevice
		});

		// Mark as initialized
		isInitialized = true;
	}

	// Orientation handling with throttling
	function handleOrientation() {
		if (!browser) return;

		const isLandscape = window.innerWidth > window.innerHeight;
		document.body.classList.toggle('landscape', isLandscape);

		// Re-detect capabilities on significant orientation change
		detectDeviceCapabilities();
	}

	function debouncedOrientationCheck() {
		if (orientationTimeout) {
			clearTimeout(orientationTimeout);
		}
		orientationTimeout = window.setTimeout(handleOrientation, 150);
	}

	// Set up event listeners
	function setupEventListeners() {
		// Define optimized event handlers
		const optimizedResizeCheck = createThrottledRAF(() => {
			// Update device capabilities on resize
			detectDeviceCapabilities();
			debouncedOrientationCheck();
		}, 100);

		const orientationChangeHandler = () => {
			// Detect new device capabilities after orientation change
			setTimeout(detectDeviceCapabilities, 300);
		};

		// Use passive option for all event listeners
		const passiveOptions = { passive: true };

		// Add event listeners
		if (typeof window !== 'undefined') {
			window.addEventListener('resize', optimizedResizeCheck, passiveOptions);
			window.addEventListener('orientationchange', orientationChangeHandler, passiveOptions);
		}

		// Add passive touch events for better scrolling performance on mobile
		if (isMobileDevice && typeof document !== 'undefined') {
			document.addEventListener('touchstart', () => {}, { passive: true });
			document.addEventListener('touchmove', () => {}, { passive: true });
		}

		// Store handlers for cleanup
		eventHandlers = {
			resize: optimizedResizeCheck,
			orientationChange: orientationChangeHandler
		};
	}

	// Lifecycle
	onMount(() => {
		if (!browser) return;

		// Initial detection
		detectDeviceCapabilities();

		// Setup event listeners
		setupEventListeners();

		// Check orientation initially
		handleOrientation();
	});

	onDestroy(() => {
		if (!browser) return;

		// Get handlers
		const { resize, orientationChange } = eventHandlers || {};

		// Remove event listeners
		if (resize) window.removeEventListener('resize', resize);
		if (orientationChange) window.removeEventListener('orientationchange', orientationChange);

		// Clear any remaining timeouts
		if (orientationTimeout) {
			clearTimeout(orientationTimeout);
			orientationTimeout = null;
		}
	});
</script>

<!-- Just render the child content -->
<slot></slot>

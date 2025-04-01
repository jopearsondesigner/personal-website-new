// $lib/utils/performance.ts
import { browser } from '$app/environment';
import { frameRateController } from './frame-rate-controller';
import { deviceCapabilities, setupPerformanceMonitoring } from './device-performance';
import { dev } from '$app/environment';

// Track initialization to prevent multiple setups
let isInitialized = false;

// Measure FPS over a duration
type FPSMeasurement = { fps: number };
export const measureFrameRate = (duration = 5000): Promise<FPSMeasurement> => {
	return new Promise((resolve) => {
		let frames = 0;
		const startTime = performance.now();

		const countFrames = () => {
			frames++;
			if (performance.now() - startTime < duration) {
				requestAnimationFrame(countFrames);
			} else {
				resolve({ fps: Math.round((frames * 1000) / duration) });
			}
		};

		requestAnimationFrame(countFrames);
	});
};

// Monitor memory usage if available
export const monitorMemoryUsage = () => {
	if ('memory' in performance) {
		console.log('Memory usage monitoring enabled');
		setInterval(() => {
			// @ts-ignore
			console.log(`Used JS heap: ${(performance.memory.usedJSHeapSize / 1048576).toFixed(2)} MB`);
		}, 5000);
	} else {
		console.warn('Memory monitoring not supported in this environment');
	}
};

// Initialize performance monitoring
export function initPerformanceFramework(): (() => void) | undefined {
	if (!browser || isInitialized) return;

	isInitialized = true;
	console.log('Initializing performance framework...');

	// Setup performance monitoring
	const cleanup = setupPerformanceMonitoring();

	// Apply specific optimizations for problematic devices
	const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

	if (isIOS && /iPhone 1[45]/.test(navigator.userAgent)) {
		// Force low quality for iPhone 14/15 which has known issues
		deviceCapabilities.update((caps) => ({
			...caps,
			tier: 'low',
			subTier: 5,
			frameSkip: 2,
			updateInterval: 32,
			renderScale: 0.6,
			animateInBackground: false,
			enableGlow: false,
			enableBlur: false,
			enableShadows: false,
			enableReflections: false
		}));

		console.info('Applied specific optimizations for iPhone 14/15');
	}

	// Handle low memory situations
	window.addEventListener(
		'devicemotion',
		() => {
			frameRateController.shouldRenderFrame();
		},
		{ passive: true }
	);

	return cleanup;
}

// Detect if the application is running in a low-powered environment
export function isLowPowerEnvironment(): boolean {
	if (!browser) return false;

	const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
	const isOlderAndroid = /Android [456]/.test(navigator.userAgent);
	const hasBatteryAPI = 'getBattery' in navigator;

	// Consider low power if on older mobile OS or has limited hardware capabilities
	return isIOS || isOlderAndroid || window.navigator.hardwareConcurrency <= 4;
}

// You could add this to +layout.js to ensure it runs early in your app's lifecycle
export function injectPerformanceMonitoring() {
	if (browser) {
		// Delay initialization slightly to not block initial rendering
		setTimeout(() => {
			initPerformanceFramework();
		}, 500);
	}
}

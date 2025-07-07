// src/lib/utils/device-performance.ts - OPTIMIZED FOR FAST STARTUP
import { browser } from '$app/environment';
import { writable, get } from 'svelte/store';

declare global {
	interface Navigator {
		deviceMemory?: number;
	}
}

export interface DeviceCapabilities {
	// Core performance tier
	tier: 'high' | 'medium' | 'low';

	// General settings
	maxStars: number;
	effectsLevel: 'minimal' | 'reduced' | 'normal';
	useHardwareAcceleration: boolean;

	// Animation settings
	frameSkip: number;
	updateInterval: number;
	animateInBackground: boolean;

	// Rendering settings
	useCanvas: boolean;
	useShadersIfAvailable: boolean;

	// Visual effects
	enableBlur: boolean;
	enableShadows: boolean;
	enableReflections: boolean;
	enableParallax: boolean;
	enablePulse: boolean;

	// CRT effects
	enableScanlines: boolean;
	enablePhosphorDecay: boolean;
	enableInterlace: boolean;
	enableChromaticAberration: boolean;

	// Device info
	devicePixelRatio: number;
	isMobile: boolean;
	isIOS: boolean;
	isAndroid: boolean;
	isTablet: boolean;
	isDesktop: boolean;

	// Memory and resources
	estimatedRAM: 'low' | 'medium' | 'high';
	gpuTier: 'low' | 'medium' | 'high';

	// Priority flags
	prioritizeMainContent: boolean;
	prioritizeInteractivity: boolean;
	useDeferredLoading: boolean;

	// Advanced detection
	preferReducedMotion: boolean;
	hasBatteryIssues: boolean;
	hasGPUAcceleration: boolean;

	// iOS specific
	optimizeForIOSSafari: boolean;
	preventIOSOverscrollFreezing: boolean;
	useIOSCompatibleEffects: boolean;

	// Object pooling
	useObjectPooling: boolean;
	objectPoolSize: number;
	objectPoolMargin: number;
}

// FAST DEFAULTS - Available immediately without detection
const INSTANT_DEFAULTS: DeviceCapabilities = {
	tier: 'medium', // Safe default
	maxStars: 40,
	effectsLevel: 'reduced',
	useHardwareAcceleration: true,
	frameSkip: 1,
	updateInterval: 32,
	animateInBackground: true,
	useCanvas: true,
	useShadersIfAvailable: false, // Conservative default
	enableBlur: false, // Conservative for startup
	enableShadows: false,
	enableReflections: true,
	enableParallax: false, // Conservative for startup
	enablePulse: true,
	enableScanlines: true,
	enablePhosphorDecay: false, // Performance-intensive
	enableInterlace: false,
	enableChromaticAberration: false,
	devicePixelRatio: 1,
	isMobile: false,
	isIOS: false,
	isAndroid: false,
	isTablet: false,
	isDesktop: true,
	estimatedRAM: 'medium',
	gpuTier: 'medium',
	prioritizeMainContent: false,
	prioritizeInteractivity: false,
	useDeferredLoading: false,
	preferReducedMotion: false,
	hasBatteryIssues: false,
	hasGPUAcceleration: true,
	optimizeForIOSSafari: false,
	preventIOSOverscrollFreezing: false,
	useIOSCompatibleEffects: false,
	useObjectPooling: true,
	objectPoolSize: 200,
	objectPoolMargin: 0.3
};

/**
 * INSTANT device detection - synchronous, no blocking
 * Uses basic browser APIs that are immediately available
 */
function getInstantCapabilities(): DeviceCapabilities {
	if (!browser) return INSTANT_DEFAULTS;

	const ua = navigator.userAgent;
	const screenWidth = window.innerWidth;
	const pixelRatio = window.devicePixelRatio || 1;

	// Quick platform detection
	const isIOS =
		/iPad|iPhone|iPod/i.test(ua) ||
		(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
	const isAndroid = /Android/i.test(ua);
	const isMobile = isIOS || isAndroid || screenWidth < 768;
	const isTablet = (isIOS || isAndroid) && Math.min(screenWidth, window.innerHeight) >= 768;
	const isDesktop = !isMobile && !isTablet;

	// Quick performance estimation
	const hasReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const concurrency = navigator.hardwareConcurrency || 4;

	// Fast tier determination
	let tier: 'low' | 'medium' | 'high' = 'medium';

	if (hasReducedMotion || (isMobile && concurrency <= 4)) {
		tier = 'low';
	} else if (!isMobile && concurrency >= 8 && pixelRatio >= 2) {
		tier = 'high';
	}

	// Build instant capabilities
	const capabilities: DeviceCapabilities = {
		...INSTANT_DEFAULTS,
		tier,
		devicePixelRatio: pixelRatio,
		isMobile,
		isIOS,
		isAndroid,
		isTablet,
		isDesktop,
		preferReducedMotion: hasReducedMotion,

		// Adjust based on platform
		maxStars: tier === 'low' ? 25 : tier === 'high' ? 60 : 40,
		frameSkip: tier === 'low' ? 2 : tier === 'high' ? 0 : 1,
		updateInterval: tier === 'low' ? 50 : tier === 'high' ? 16 : 32,

		// iOS-specific instant optimizations
		optimizeForIOSSafari: isIOS,
		preventIOSOverscrollFreezing: isIOS,
		useIOSCompatibleEffects: isIOS,
		enableBlur: !isIOS, // iOS Safari has blur issues
		enableShadows: !isMobile, // Mobile devices struggle with shadows
		enableParallax: !isMobile && !hasReducedMotion,

		// Object pooling based on tier
		objectPoolSize: tier === 'low' ? 100 : tier === 'high' ? 300 : 200,
		objectPoolMargin: tier === 'low' ? 0.5 : 0.3
	};

	return capabilities;
}

/**
 * ENHANCED detection - runs asynchronously after initial render
 * Provides more accurate detection and progressive enhancement
 */
async function getEnhancedCapabilities(
	baseCapabilities: DeviceCapabilities
): Promise<DeviceCapabilities> {
	if (!browser) return baseCapabilities;

	let enhanced = { ...baseCapabilities };

	try {
		// GPU detection
		const hasWebGL = await checkWebGLSupport();
		enhanced.hasGPUAcceleration = hasWebGL;
		enhanced.useShadersIfAvailable = hasWebGL;
		enhanced.gpuTier = hasWebGL ? 'medium' : 'low';

		// Memory detection
		const memory = (navigator as any).deviceMemory;
		if (memory) {
			enhanced.estimatedRAM = memory <= 2 ? 'low' : memory >= 8 ? 'high' : 'medium';

			// Adjust settings based on memory
			if (memory <= 2) {
				enhanced.tier = 'low';
				enhanced.maxStars = Math.min(enhanced.maxStars, 20);
				enhanced.enableBlur = false;
				enhanced.enableShadows = false;
			} else if (memory >= 8) {
				enhanced.tier = enhanced.tier === 'low' ? 'medium' : 'high';
				enhanced.enableBlur = !enhanced.isIOS;
				enhanced.enableShadows = !enhanced.isMobile;
			}
		}

		// Performance benchmark (lightweight)
		const benchmarkScore = await runQuickBenchmark();
		if (benchmarkScore < 0.4) {
			enhanced.tier = 'low';
			enhanced.frameSkip = Math.max(enhanced.frameSkip, 2);
			enhanced.enableScanlines = false;
		} else if (benchmarkScore > 0.8 && enhanced.tier !== 'low') {
			enhanced.tier = 'high';
			enhanced.frameSkip = Math.max(0, enhanced.frameSkip - 1);
			enhanced.enablePhosphorDecay = true;
			enhanced.enableInterlace = true;
		}

		// Battery status
		if ('getBattery' in navigator) {
			try {
				const battery = await (navigator as any).getBattery();
				enhanced.hasBatteryIssues = !battery.charging && battery.level < 0.3;

				if (enhanced.hasBatteryIssues) {
					enhanced.tier = 'low';
					enhanced.frameSkip = Math.max(enhanced.frameSkip, 1);
					enhanced.animateInBackground = false;
				}
			} catch (e) {
				// Battery API not available
			}
		}
	} catch (error) {
		console.warn('Enhanced capability detection failed:', error);
	}

	return enhanced;
}

/**
 * Quick WebGL support check
 */
function checkWebGLSupport(): Promise<boolean> {
	return new Promise((resolve) => {
		try {
			const canvas = document.createElement('canvas');
			const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
			resolve(!!gl);
		} catch (e) {
			resolve(false);
		}
	});
}

/**
 * Lightweight performance benchmark
 */
function runQuickBenchmark(): Promise<number> {
	return new Promise((resolve) => {
		const startTime = performance.now();

		// Simple computation test
		let result = 0;
		for (let i = 0; i < 10000; i++) {
			result += Math.sin(i * 0.01) * Math.cos(i * 0.01);
		}

		const endTime = performance.now();
		const duration = endTime - startTime;

		// Normalize to 0-1 (lower duration = higher score)
		const score = Math.max(0, Math.min(1, 1 - duration / 50));
		resolve(score);
	});
}

// STORES
export const deviceCapabilities = writable<DeviceCapabilities>(INSTANT_DEFAULTS);
export const memoryUsageStore = writable<number>(0);
export const deviceTier = writable<'low' | 'medium' | 'high'>('medium');
export const maxStars = writable<number>(40);
export const targetFPS = writable<number>(60);
export const performanceMode = writable<'low' | 'medium' | 'high'>('medium');
export const starFieldMode = writable<'canvas' | 'dom'>('canvas');
export const isAnimating = writable<boolean>(false);
export const isLowPowerDevice = writable<boolean>(false);

// Object pool statistics store
export interface ObjectPoolStats {
	totalCapacity: number;
	activeObjects: number;
	utilizationRate: number;
	objectsCreated: number;
	objectsReused: number;
	reuseRatio: number;
	estimatedMemorySaved: number;
	poolName: string;
	poolType: string;
}

export const objectPoolStatsStore = writable<ObjectPoolStats>({
	totalCapacity: 0,
	activeObjects: 0,
	utilizationRate: 0,
	objectsCreated: 0,
	objectsReused: 0,
	reuseRatio: 0,
	estimatedMemorySaved: 0,
	poolName: 'Stars',
	poolType: 'Star'
});

/**
 * FAST INITIALIZATION - runs immediately, non-blocking
 */
export function initializeCapabilitiesSync(): DeviceCapabilities {
	const capabilities = getInstantCapabilities();

	// Set stores immediately
	deviceCapabilities.set(capabilities);
	deviceTier.set(capabilities.tier);
	maxStars.set(capabilities.maxStars);
	targetFPS.set(capabilities.tier === 'low' ? 30 : 60);
	performanceMode.set(capabilities.tier);
	isLowPowerDevice.set(capabilities.tier === 'low');

	// Schedule enhanced detection for later
	if (browser) {
		setTimeout(() => {
			enhanceCapabilitiesAsync(capabilities);
		}, 1000); // Run after initial render
	}

	return capabilities;
}

/**
 * ENHANCED DETECTION - runs asynchronously for progressive enhancement
 */
async function enhanceCapabilitiesAsync(baseCapabilities: DeviceCapabilities): Promise<void> {
	try {
		const enhanced = await getEnhancedCapabilities(baseCapabilities);

		// Update stores with enhanced capabilities
		deviceCapabilities.set(enhanced);
		deviceTier.set(enhanced.tier);
		maxStars.set(enhanced.maxStars);
		performanceMode.set(enhanced.tier);
		isLowPowerDevice.set(enhanced.tier === 'low');

		console.log('🚀 Enhanced device capabilities applied:', enhanced.tier);
	} catch (error) {
		console.warn('Enhanced capability detection failed:', error);
	}
}

/**
 * Utility functions
 */
export function shouldEnableEffect(effectName: string): boolean {
	const capabilities = get(deviceCapabilities);

	switch (effectName) {
		case 'glow':
			return capabilities.enableBlur && capabilities.tier !== 'low';
		case 'trails':
			return capabilities.enableBlur && capabilities.tier === 'high';
		case 'blur':
			return capabilities.enableBlur;
		case 'shadows':
			return capabilities.enableShadows;
		case 'parallax':
			return capabilities.enableParallax;
		default:
			return true;
	}
}

export function getOptimalSettings(): {
	maxStars: number;
	enableGlow: boolean;
	enableTrails: boolean;
	enableBlur: boolean;
	enableShadows: boolean;
	enableParallax: boolean;
} {
	const capabilities = get(deviceCapabilities);

	return {
		maxStars: capabilities.maxStars,
		enableGlow: capabilities.enableBlur && capabilities.tier !== 'low',
		enableTrails: capabilities.enableBlur && capabilities.tier === 'high',
		enableBlur: capabilities.enableBlur,
		enableShadows: capabilities.enableShadows,
		enableParallax: capabilities.enableParallax
	};
}

export function getOptimalStarCount(requestedCount: number): number {
	const capabilities = get(deviceCapabilities);
	return Math.min(requestedCount, capabilities.maxStars);
}

export function updateObjectPoolStats(stats: Partial<ObjectPoolStats>): void {
	if (!browser) return;

	objectPoolStatsStore.update((currentStats) => {
		const newStats = { ...currentStats, ...stats };

		// Calculate derived statistics
		if (newStats.totalCapacity > 0) {
			newStats.utilizationRate = newStats.activeObjects / newStats.totalCapacity;
		}

		const total = newStats.objectsCreated + newStats.objectsReused;
		newStats.reuseRatio = total > 0 ? newStats.objectsReused / total : 0;

		if (stats.objectsReused !== undefined && stats.estimatedMemorySaved === undefined) {
			const objectSize = 240; // bytes estimate
			newStats.estimatedMemorySaved = (newStats.objectsReused * objectSize) / 1024; // KB
		}

		return newStats;
	});
}

/**
 * Setup event listeners for performance optimization
 */
export function setupEventListeners(): () => void {
	if (!browser) return () => {};

	// Visibility change handler for performance
	const visibilityChangeHandler = () => {
		if (document.hidden) {
			// Pause animations when tab not visible
			deviceCapabilities.update((caps) => ({
				...caps,
				animateInBackground: false
			}));
		} else {
			// Resume normal operations when tab is visible again
			setTimeout(() => {
				enhanceCapabilitiesAsync(get(deviceCapabilities));
			}, 300);
		}
	};

	// Add event listener
	document.addEventListener('visibilitychange', visibilityChangeHandler);

	// Return cleanup function
	return () => {
		document.removeEventListener('visibilitychange', visibilityChangeHandler);
	};
}

/**
 * Setup performance monitoring (maintained for compatibility)
 */
export function setupPerformanceMonitoring(): () => void {
	if (!browser) return () => {};

	let active = false;
	let monitoringInterval: number | null = null;

	const startMonitoring = () => {
		if (active) return;
		active = true;

		// Use lower frequency monitoring interval for memory
		monitoringInterval = window.setInterval(() => {
			// Check memory usage periodically
			if ('memory' in performance) {
				try {
					const memory = (performance as any).memory;
					if (memory) {
						const memUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
						memoryUsageStore.set(Math.max(0, Math.min(1, memUsage)));
					}
				} catch (e) {
					// Ignore memory API errors
				}
			}
		}, 3000);
	};

	// Start monitoring in browser
	if (browser) {
		startMonitoring();
	}

	// Return cleanup function
	return () => {
		active = false;
		if (monitoringInterval !== null) {
			clearInterval(monitoringInterval);
			monitoringInterval = null;
		}
	};
}

// AUTO-INITIALIZE on module load for immediate availability
if (browser) {
	// Initialize immediately with fast detection
	initializeCapabilitiesSync();
}

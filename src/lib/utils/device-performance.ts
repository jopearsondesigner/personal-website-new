// src/lib/utils/device-performance.ts
import { browser } from '$app/environment';
import { writable, get } from 'svelte/store';
import { fpsStore } from './frame-rate-controller';

export interface DeviceCapabilities {
	tier: 'low' | 'medium' | 'high';

	// General settings
	maxStars: number;
	effectsLevel: 'minimal' | 'reduced' | 'normal';
	useHardwareAcceleration: boolean;

	// Animation settings
	frameSkip: number; // Only render every Nth frame
	updateInterval: number; // Ms between updates
	animateInBackground: boolean; // Continue animations when tab not focused

	// Rendering settings
	useCanvas: boolean; // Use canvas instead of DOM for stars
	useWebGL: boolean; // Use WebGL for advanced effects
	useShadersIfAvailable: boolean;

	// Visual effects
	enableGlow: boolean;
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

	// Detected device info
	devicePixelRatio: number;
	isMobile: boolean;
	isIOS: boolean;
	isAndroid: boolean;
	isTablet: boolean;
	isDesktop: boolean;

	// Memory and resources
	estimatedRAM: 'low' | 'medium' | 'high';
	gpuTier: 'low' | 'medium' | 'high';

	// Priority flags for components
	prioritizeMainContent: boolean; // Prioritize main content over effects
	prioritizeInteractivity: boolean; // Prioritize interactive elements
	useDeferredLoading: boolean; // Load non-essential content after main content

	// Advanced detection
	preferReducedMotion: boolean; // User prefers reduced motion
	hasBatteryIssues: boolean; // Device has battery issues
	hasGPUAcceleration: boolean; // Device has GPU acceleration

	// iOS specific optimizations
	optimizeForIOSSafari: boolean; // Special optimizations for iOS Safari
	preventIOSOverscrollFreezing: boolean; // Prevent iOS overscroll freezing issue
	useIOSCompatibleEffects: boolean; // Use iOS compatible effects only

	// Object pooling settings and optimizations
	useObjectPooling: boolean; // Whether to use object pooling
	objectPoolSize: number; // Maximum size of the object pool
	objectPoolMargin: number; // Extra capacity percentage (e.g., 0.2 = 20% extra)
}

// Object pool statistics interface for monitoring
export interface ObjectPoolStats {
	// Pool capacity
	totalCapacity: number;

	// Usage statistics
	activeObjects: number;
	utilizationRate: number; // 0-1 percentage of pool in use

	// Performance metrics
	objectsCreated: number;
	objectsReused: number;
	reuseRatio: number; // reused / (created + reused)

	// Memory impact
	estimatedMemorySaved: number; // in KB

	// Pool identification
	poolName: string;
	poolType: string;
}

// Default high-end capability settings
const highCapabilities: DeviceCapabilities = {
	tier: 'high',
	maxStars: 60,
	effectsLevel: 'normal',
	useHardwareAcceleration: true,
	frameSkip: 0,
	updateInterval: 16, // ~60fps
	animateInBackground: true,
	useCanvas: true,
	useWebGL: true,
	useShadersIfAvailable: true,
	enableGlow: true,
	enableBlur: true,
	enableShadows: true,
	enableReflections: true,
	enableParallax: true,
	enablePulse: true,
	enableScanlines: true,
	enablePhosphorDecay: true,
	enableInterlace: true,
	enableChromaticAberration: true,
	devicePixelRatio: 1,
	isMobile: false,
	isIOS: false,
	isAndroid: false,
	isTablet: false,
	isDesktop: true,
	estimatedRAM: 'high',
	gpuTier: 'high',
	prioritizeMainContent: false, // No need to prioritize on high-end
	prioritizeInteractivity: false, // No need to prioritize on high-end
	useDeferredLoading: false, // No need to defer on high-end
	preferReducedMotion: false,
	hasBatteryIssues: false,
	hasGPUAcceleration: true,
	optimizeForIOSSafari: false,
	preventIOSOverscrollFreezing: false,
	useIOSCompatibleEffects: false,
	useObjectPooling: true,
	objectPoolSize: 400, // 300 stars with room for more
	objectPoolMargin: 0.2 // 20% extra capacity
};

// Default medium capability settings
const mediumCapabilities: DeviceCapabilities = {
	...highCapabilities,
	tier: 'medium',
	maxStars: 40,
	effectsLevel: 'reduced',
	useWebGL: false,
	useShadersIfAvailable: false,
	frameSkip: 1, // Render every other frame
	updateInterval: 32, // ~30fps
	enableChromaticAberration: false,
	enableInterlace: false,
	enablePhosphorDecay: false,
	estimatedRAM: 'medium',
	gpuTier: 'medium',
	prioritizeMainContent: true, // Prioritize main content on medium devices
	prioritizeInteractivity: true, // Prioritize interactive elements on medium devices
	useDeferredLoading: true, // Use deferred loading on medium devices
	useCanvas: true, // Still use canvas but with simpler rendering
	enableScanlines: false, // Disable complex effects
	animateInBackground: false, // Don't animate in background to save resources
	useObjectPooling: true,
	objectPoolSize: 200, // Smaller pool for medium devices
	objectPoolMargin: 0.3 // 30% extra capacity for more flexibility
};

// Default low capability settings
const lowCapabilities: DeviceCapabilities = {
	...mediumCapabilities,
	tier: 'low',
	maxStars: 20,
	effectsLevel: 'minimal',
	useWebGL: false,
	frameSkip: 2, // Render every third frame
	updateInterval: 50, // ~20fps
	animateInBackground: false,
	enableGlow: false,
	enableBlur: false,
	enableShadows: false,
	enableReflections: false,
	enableParallax: false,
	enablePulse: false,
	enableScanlines: false,
	estimatedRAM: 'low',
	gpuTier: 'low',
	prioritizeMainContent: true, // Definitely prioritize main content on low-end devices
	prioritizeInteractivity: true, // Definitely prioritize interactive elements on low-end devices
	useDeferredLoading: true, // Definitely use deferred loading on low-end devices
	hasGPUAcceleration: false, // Assume no GPU acceleration on low-end devices
	useObjectPooling: true,
	objectPoolSize: 100, // Even smaller pool for low-end devices
	objectPoolMargin: 0.5 // 50% extra capacity to avoid creating new objects
};

// Special iOS optimized settings for iPhone 14 and similar devices
const iosOptimizedCapabilities: DeviceCapabilities = {
	...mediumCapabilities,
	tier: 'medium',
	maxStars: 30,
	frameSkip: 1,
	useCanvas: true,
	useWebGL: false,
	enableBlur: false,
	enableChromaticAberration: false,
	enableInterlace: false,
	enableShadows: false,
	optimizeForIOSSafari: true,
	preventIOSOverscrollFreezing: true,
	useIOSCompatibleEffects: true,
	useShadersIfAvailable: false,
	enableGlow: false,
	enableParallax: false,
	useObjectPooling: true,
	objectPoolSize: 150, // iOS-specific pool size
	objectPoolMargin: 0.3 // 30% extra capacity
};

/**
 * Feature detection to check GPU acceleration availability
 */
function detectGPUAcceleration(): boolean {
	if (!browser) return true;

	// Create a canvas element
	const canvas = document.createElement('canvas');
	const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

	// Check if WebGL is available
	if (!gl) {
		return false;
	}

	// Check for WebGL extensions and capabilities
	const extensions = gl.getSupportedExtensions();
	const hasFloatTextures = extensions?.includes('OES_texture_float');
	const hasInstancing = extensions?.includes('ANGLE_instanced_arrays');

	// Get info about the GPU
	const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
	const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';

	// Check for low-power GPUs
	const isLowPowerGPU = renderer?.includes('Intel') || renderer?.includes('Microsoft Basic Render');

	// Clean up
	gl.getExtension('WEBGL_lose_context')?.loseContext();

	return hasFloatTextures && hasInstancing && !isLowPowerGPU;
}

/**
 * Detect if user prefers reduced motion
 */
function detectReducedMotion(): boolean {
	if (!browser) return false;
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Detect if the device is on battery and low on power
 */
async function detectBatteryIssues(): Promise<boolean> {
	if (!browser || !('getBattery' in navigator)) return false;

	try {
		// @ts-ignore: Battery API might not be available in all browsers
		const battery = await navigator.getBattery();

		// Check if battery is discharging and below 20%
		return !battery.charging && battery.level < 0.2;
	} catch (e) {
		return false;
	}
}

/**
 * Detect iOS Safari specific issues
 */
function detectIOSSafariIssues(): boolean {
	if (!browser) return false;

	const ua = navigator.userAgent;
	const isIOS = /iPad|iPhone|iPod/.test(ua);
	const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);

	return isIOS && isSafari;
}

/**
 * Check for specific iPhone 14 optimizations
 */
function isIPhone14(): boolean {
	if (!browser) return false;

	const ua = navigator.userAgent;
	return /iPhone14/.test(ua) || /iPhone 14/.test(ua);
}

/**
 * Perform device capability benchmark
 */
async function performBenchmark(): Promise<number> {
	if (!browser) return 1.0;

	let score = 1.0;
	const startTime = performance.now();

	// Simple calculation benchmark
	let result = 0;
	for (let i = 0; i < 10000; i++) {
		result += Math.sin(i) * Math.cos(i);
	}

	// DOM manipulation benchmark
	const div = document.createElement('div');
	document.body.appendChild(div);
	for (let i = 0; i < 100; i++) {
		div.style.width = `${i}px`;
		div.style.height = `${i}px`;
		div.style.opacity = `${i / 100}`;
		// Force layout reflow
		div.offsetHeight;
	}
	document.body.removeChild(div);

	const endTime = performance.now();
	const benchmarkTime = endTime - startTime;

	// Normalize score (lower is better)
	if (benchmarkTime < 50) {
		score = 1.0; // High-end device
	} else if (benchmarkTime < 200) {
		score = 0.7; // Medium device
	} else {
		score = 0.4; // Low-end device
	}

	return score;
}

/**
 * More advanced device capability detection
 */
async function determineDeviceCapabilities(): Promise<DeviceCapabilities> {
	if (!browser) {
		return highCapabilities; // Default to high for SSR
	}

	// Detect device characteristics without relying solely on UA
	const pixelRatio = window.devicePixelRatio || 1;
	const ua = navigator.userAgent;
	const screenWidth = window.innerWidth;
	const screenHeight = window.innerHeight;

	// Detect iOS without UA sniffing when possible
	const isIOS =
		/iPad|iPhone|iPod/.test(ua) ||
		(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
	const isAndroid = /Android/.test(ua);
	const isMobile = isIOS || isAndroid || screenWidth < 768;
	const isTablet = (isIOS || isAndroid) && screenWidth >= 768;
	const isDesktop = !isMobile && !isTablet;

	// Use hardware concurrency as hint of processing power
	const hardwareConcurrency = navigator.hardwareConcurrency || 1;

	// Feature detection
	const hasGPUAcceleration = detectGPUAcceleration();
	const preferReducedMotion = detectReducedMotion();
	const hasBatteryIssues = await detectBatteryIssues();
	const isIOSSafari = detectIOSSafariIssues();
	const isIPad = isIOS && screenWidth >= 768;

	// Run performance benchmark
	const benchmarkScore = await performBenchmark();

	// Enhanced detection for low-end devices
	const isLowEndDevice =
		benchmarkScore < 0.4 ||
		hardwareConcurrency <= 2 ||
		(isAndroid && /Android [1-4]\./.test(ua)) ||
		navigator.deviceMemory < 2 || // Check device memory if available
		(isIOS && /iPhone [5-8]|iPad [1-4]|iPod/.test(ua)); // Older iOS devices

	if (isLowEndDevice) {
		// Ultra-low settings for very weak devices
		return {
			...lowCapabilities,
			maxStars: 50, // Even fewer stars
			frameSkip: 3, // Render every 4th frame
			updateInterval: 100, // ~10fps target
			useCanvas: true,
			useWebGL: false,
			enableGlow: false,
			enableBlur: false,
			enableShadows: false,
			enableReflections: false,
			enableParallax: false,
			enablePulse: false,
			enableScanlines: false,
			enablePhosphorDecay: false,
			enableInterlace: false,
			enableChromaticAberration: false,
			useObjectPooling: true,
			objectPoolSize: 60, // Small pool for ultra-low end
			objectPoolMargin: 0.2 // 20% margin
		};
	}

	// Choose appropriate device profile based on multiple factors
	let capabilities: DeviceCapabilities;

	// Special case for known problematic device - iPhone 14
	if (isIPhone14()) {
		capabilities = { ...iosOptimizedCapabilities };
	}
	// Low-end device detection
	else if (
		benchmarkScore < 0.5 ||
		hardwareConcurrency <= 4 ||
		(isAndroid && /Android [1-5]\./.test(ua)) ||
		hasBatteryIssues ||
		preferReducedMotion
	) {
		capabilities = { ...lowCapabilities };
	}
	// High-end device detection
	else if (
		benchmarkScore > 0.8 &&
		hasGPUAcceleration &&
		hardwareConcurrency >= 6 &&
		isDesktop &&
		!preferReducedMotion
	) {
		capabilities = { ...highCapabilities };
	}
	// Default to medium for most devices
	else {
		capabilities = { ...mediumCapabilities };
	}

	// Apply device-specific refinements
	capabilities.devicePixelRatio = pixelRatio;
	capabilities.isMobile = isMobile;
	capabilities.isIOS = isIOS;
	capabilities.isAndroid = isAndroid;
	capabilities.isTablet = isTablet;
	capabilities.isDesktop = isDesktop;
	capabilities.hasGPUAcceleration = hasGPUAcceleration;
	capabilities.preferReducedMotion = preferReducedMotion;
	capabilities.hasBatteryIssues = hasBatteryIssues;

	// Additional iOS-specific optimizations
	if (isIOS) {
		capabilities.optimizeForIOSSafari = isIOSSafari;
		capabilities.preventIOSOverscrollFreezing = true;
		capabilities.useIOSCompatibleEffects = true;

		// WebGL frequently causes issues on iOS Safari
		capabilities.useWebGL = false;
		capabilities.enableChromaticAberration = false;
		capabilities.enableInterlace = false;

		// Further reduce effects on older iOS devices
		if (/(iPhone 8|iPhone 9|iPhone X|iPhone 11)/.test(ua)) {
			capabilities.tier = 'low';
			capabilities.maxStars = 20;
			capabilities.enableScanlines = false;
			capabilities.enableBlur = false;
		}

		// iPad optimizations
		if (isIPad) {
			// iPads can handle more effects than iPhones
			capabilities.maxStars = Math.min(40, capabilities.maxStars);
			capabilities.useWebGL = capabilities.tier === 'high'; // Only use WebGL on high-end iPads
		}
	}

	// Reduce features when hardware acceleration is not available
	if (!hasGPUAcceleration) {
		capabilities.tier = 'low';
		capabilities.enableBlur = false;
		capabilities.enableGlow = false;
		capabilities.enableShadows = false;
		capabilities.enableReflections = false;
	}

	// For devices with reduced memory/CPU, prioritize responsiveness
	if (capabilities.tier !== 'high') {
		capabilities.prioritizeMainContent = true;
		capabilities.prioritizeInteractivity = true;
	}

	// Apply reduced motion preference if detected
	if (preferReducedMotion) {
		capabilities.enableParallax = false;
		capabilities.enablePulse = false;
		capabilities.effectsLevel = 'minimal';
	}

	return capabilities;
}

// Create the deviceCapabilities store
export const deviceCapabilities = writable<DeviceCapabilities>(highCapabilities);
export const memoryUsageStore = writable<number>(0);

// Create object pool statistics store
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

// Initialize capabilities
async function initializeCapabilities() {
	if (browser) {
		const detectedCapabilities = await determineDeviceCapabilities();
		deviceCapabilities.set(detectedCapabilities);
	}
}

// Add the setupPerformanceMonitoring function
export function setupPerformanceMonitoring() {
	if (!browser) return () => {};

	let active = false;
	let rafId: number | null = null;

	const startMonitoring = () => {
		if (active) return;
		active = true;

		// Initialize capabilities if not already done
		initializeCapabilities();

		// Simple FPS counter
		let frameCount = 0;
		let lastTime = performance.now();

		const monitorLoop = () => {
			const now = performance.now();
			frameCount++;

			if (now - lastTime >= 1000) {
				const fps = Math.round((frameCount * 1000) / (now - lastTime));
				frameCount = 0;
				lastTime = now;

				// Monitor memory if available
				if (browser && 'memory' in performance) {
					const memory = (performance as any).memory;
					if (memory) {
						const memUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
						memoryUsageStore.set(memUsage);
					}
				}
			}

			rafId = requestAnimationFrame(monitorLoop);
		};

		rafId = requestAnimationFrame(monitorLoop);
	};

	// Start monitoring if in browser
	if (browser) {
		startMonitoring();
	}

	// Return cleanup function
	return () => {
		active = false;
		if (rafId !== null) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}
	};
}

// Update object pool statistics
// Update object pool statistics
export function updateObjectPoolStats(stats: Partial<ObjectPoolStats>) {
	if (!browser) return;

	// Create a copy to avoid mutation issues
	const updatedStats = { ...stats };

	objectPoolStatsStore.update((currentStats) => {
		// Start with current stats as base
		const newStats = { ...currentStats };

		// Update with new values
		Object.keys(updatedStats).forEach((key) => {
			if (updatedStats[key] !== undefined) {
				newStats[key] = updatedStats[key];
			}
		});

		// Calculate derived statistics if relevant fields were updated
		if (
			(updatedStats.activeObjects !== undefined || updatedStats.totalCapacity !== undefined) &&
			newStats.totalCapacity > 0
		) {
			newStats.utilizationRate = newStats.activeObjects / newStats.totalCapacity;
		}

		// Update reuse ratio when object counts change
		if (updatedStats.objectsCreated !== undefined || updatedStats.objectsReused !== undefined) {
			const total = newStats.objectsCreated + newStats.objectsReused;
			newStats.reuseRatio = total > 0 ? newStats.objectsReused / total : 0;
		}

		// Calculate memory savings if object reuse was updated or we're initializing
		// Even if memory savings is provided, recalculate to ensure consistency
		if (
			updatedStats.objectsReused !== undefined ||
			updatedStats.estimatedMemorySaved === undefined
		) {
			// Use star object size estimate (240 bytes) if not provided
			const objectSize = 240;
			newStats.estimatedMemorySaved = (newStats.objectsReused * objectSize) / 1024; // in KB
		}

		return newStats;
	});
}

// Add the setupEventListeners function
export function setupEventListeners() {
	if (!browser) return () => {};

	// Setup event listeners for performance events
	const visibilityChangeHandler = () => {
		// Update capability settings based on visibility
		if (document.hidden) {
			// Pause or reduce animations when tab not visible
			deviceCapabilities.update((caps) => ({
				...caps,
				animateInBackground: false
			}));
		} else {
			// Restore animations when tab visible again
			initializeCapabilities();
		}
	};

	// Setup event listeners
	document.addEventListener('visibilitychange', visibilityChangeHandler);

	// Return cleanup function
	return () => {
		document.removeEventListener('visibilitychange', visibilityChangeHandler);
	};
}

// Initialize capabilities when imported
if (browser) {
	initializeCapabilities();
}

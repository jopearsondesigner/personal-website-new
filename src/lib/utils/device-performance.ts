// src/lib/utils/device-performance.ts
import { browser } from '$app/environment';
import { writable, get } from 'svelte/store';
import { fpsStore } from './frame-rate-controller';

declare global {
	interface Navigator {
		deviceMemory?: number;
	}
}

interface WebGLDebugInfo {
	UNMASKED_RENDERER_WEBGL: number;
}

interface WebGLRenderingContextWithExtensions extends WebGLRenderingContext {
	getExtension(name: string): any;
	getParameter(pname: number): any;
	getSupportedExtensions(): string[] | null;
}

interface CanvasRenderingContext2DWithExtensions extends CanvasRenderingContext2D {
	getExtension(name: string): any;
	getParameter(pname: number): any;
	getSupportedExtensions(): string[] | null;
}

type RenderingContextWithExtensions =
	| WebGLRenderingContextWithExtensions
	| CanvasRenderingContext2DWithExtensions;

interface NavigatorWithDeviceMemory extends Navigator {
	deviceMemory?: number;
}

export interface DeviceCapabilities {
	// Core performance tier
	tier: 'high' | 'medium' | 'low';

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

export interface RenderingCapabilities {
	quality: number;
	useWebGL: boolean;
	useOffscreenCanvas: boolean;
	useWorker: boolean;
	enableGlow: boolean;
	enableTrails: boolean;
	enableHighDPI: boolean;
	enableDoubleBuffering: boolean;
}

export interface MemoryCapabilities {
	maxStars: number;
	maxTrailLength: number;
	maxSectors: number;
	useTypedArrays: boolean;
	enableGarbageCollection: boolean;
	enableMemoryMonitoring: boolean;
}

export interface PerformanceCapabilities {
	targetFPS: number;
	enableAdaptiveQuality: boolean;
	enableFrameSkipping: boolean;
	enablePerformanceMonitoring: boolean;
	enableBrowserOptimizations: boolean;
}

// Object pool statistics interface for monitoring
export interface ObjectPoolStats {
	// Pool capacity
	totalCapacity: number;
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
	useShadersIfAvailable: true,
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
	frameSkip: 2, // Render every third frame
	updateInterval: 50, // ~20fps
	animateInBackground: false,
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

// Special iOS optimized settings for iPhone and similar devices
const iosOptimizedCapabilities: DeviceCapabilities = {
	...mediumCapabilities,
	tier: 'medium',
	maxStars: 30,
	frameSkip: 1,
	useCanvas: true,
	useShadersIfAvailable: false,
	enableBlur: false,
	enableChromaticAberration: false,
	enableInterlace: false,
	enableShadows: false,
	optimizeForIOSSafari: true,
	preventIOSOverscrollFreezing: true,
	useIOSCompatibleEffects: true,
	enableParallax: false,
	useObjectPooling: true,
	objectPoolSize: 150, // iOS-specific pool size
	objectPoolMargin: 0.3 // 30% extra capacity
};

/**
 * Fast GPU acceleration check - avoids overhead of WebGL extension queries
 */
function quickDetectGPUAcceleration(): boolean {
	if (!browser) return true;

	try {
		const canvas = document.createElement('canvas');
		return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
	} catch (e) {
		return false;
	}
}

/**
 * Detect if user prefers reduced motion - simplified
 */
function detectReducedMotion(): boolean {
	if (!browser) return false;
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Simple device detection with fewer API calls and UA checks
 */
function getQuickCapabilitiesEstimate(): DeviceCapabilities {
	if (!browser) {
		return highCapabilities; // Default to high for SSR
	}

	// Core device characteristics that actually matter for performance
	const pixelRatio = window.devicePixelRatio || 1;
	const screenWidth = window.innerWidth;
	const screenHeight = window.innerHeight;
	const ua = navigator.userAgent;

	// Quick platform detection focusing on performance-impacting factors
	const isIOS =
		/iPad|iPhone|iPod/i.test(ua) ||
		(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
	const isAndroid = /Android/i.test(ua);
	const isMobile = isIOS || isAndroid || screenWidth < 768;
	const isTablet = (isIOS || isAndroid) && Math.min(screenWidth, screenHeight) >= 768;
	const isDesktop = !isMobile && !isTablet;

	// Hardware detection
	const concurrency = navigator.hardwareConcurrency || 2;
	const memory = (navigator as NavigatorWithDeviceMemory).deviceMemory || 4;
	const hasReducedMotion = detectReducedMotion();
	const hasGPU = quickDetectGPUAcceleration();

	// Quick tier determination based on available hardware and form factor
	let tier: 'low' | 'medium' | 'high';

	if (
		hasReducedMotion ||
		(isMobile && concurrency <= 4) ||
		memory <= 2 ||
		!hasGPU ||
		(isIOS && /iPhone [5-8]|iPad [1-4]|iPod/.test(ua)) ||
		(isAndroid && /Android [1-7]\./.test(ua))
	) {
		tier = 'low';
	} else if (isMobile || isTablet || concurrency <= 6 || memory <= 4 || pixelRatio < 2) {
		tier = 'medium';
	} else {
		tier = 'high';
	}

	// Start with appropriate base capabilities
	let capabilities: DeviceCapabilities;
	if (tier === 'low') {
		capabilities = { ...lowCapabilities };
	} else if (tier === 'medium') {
		capabilities = { ...mediumCapabilities };
	} else {
		capabilities = { ...highCapabilities };
	}

	// Apply iOS-specific optimizations if needed
	if (isIOS) {
		// Special handling for iOS devices
		capabilities = {
			...capabilities,
			...iosOptimizedCapabilities,
			isIOS: true,
			isMobile,
			isTablet: isTablet,
			isDesktop: isDesktop,
			devicePixelRatio: pixelRatio,
			// iOS Safari has known performance issues with certain effects
			enableBlur: false,
			enableShadows: false,
			preventIOSOverscrollFreezing: true,
			optimizeForIOSSafari: true,
			useIOSCompatibleEffects: true
		};

		// Additional optimizations for older iOS devices
		if (/(iPhone [5-8]|iPad [1-4]|iPod)/.test(ua)) {
			capabilities.tier = 'low';
			capabilities.maxStars = 15;
			capabilities.frameSkip = 2;
		}
	}

	// Apply Android-specific optimizations
	if (isAndroid) {
		capabilities.isAndroid = true;
		capabilities.isMobile = isMobile;
		capabilities.isTablet = isTablet;
		capabilities.isDesktop = false;
		capabilities.devicePixelRatio = pixelRatio;

		// Less effects on Android by default
		capabilities.enableInterlace = false;
		capabilities.enableChromaticAberration = false;
		capabilities.enablePhosphorDecay = false;

		// Reduce effects on older Android versions
		if (/Android [1-7]\./.test(ua)) {
			capabilities.tier = 'low';
			capabilities.maxStars = 15;
			capabilities.frameSkip = 2;
			capabilities.enableScanlines = false;
			capabilities.enableBlur = false;
			capabilities.enableShadows = false;
		}
	}

	// Apply reduced motion preference
	if (hasReducedMotion) {
		capabilities.preferReducedMotion = true;
		capabilities.enableParallax = false;
		capabilities.enablePulse = false;
		capabilities.effectsLevel = 'minimal';
		capabilities.frameSkip = Math.max(1, capabilities.frameSkip);
	}

	// Return the optimized capabilities
	return capabilities;
}

/**
 * Simple lightweight benchmark for checking device processing power
 */
function runLightweightBenchmark(): number {
	if (!browser) return 1.0;

	const startTime = performance.now();

	// Simple computation benchmark that doesn't block UI
	let result = 0;
	const iterations = 20000;
	for (let i = 0; i < iterations; i++) {
		result += Math.sin(i * 0.01);
	}

	const endTime = performance.now();
	const duration = endTime - startTime;

	// Normalize score between 0-1 (higher is better)
	const score = Math.max(0, Math.min(1, 1 - duration / 100));

	return score;
}

/**
 * Optimized device capability detection with reduced overhead
 */
async function determineDeviceCapabilities(): Promise<DeviceCapabilities> {
	if (!browser) {
		return highCapabilities; // Default to high for SSR
	}

	// Quick initial detection based on simple heuristics
	const quickCapabilities = getQuickCapabilitiesEstimate();

	// Return quick results immediately for low-end devices or when reduced motion is preferred
	if (quickCapabilities.tier === 'low' || quickCapabilities.preferReducedMotion) {
		return quickCapabilities;
	}

	// For potentially higher capability devices, schedule benchmark for later
	setTimeout(() => {
		// Only run benchmark if page is visible
		if (!document.hidden) {
			const benchmarkScore = runLightweightBenchmark();

			// Update capabilities based on benchmark score
			if (benchmarkScore < 0.5) {
				// Lower performance than initially detected
				deviceCapabilities.update((caps) => ({
					...caps,
					tier: 'low',
					frameSkip: Math.max(1, caps.frameSkip),
					enableBlur: false,
					enableShadows: false,
					maxStars: Math.min(caps.maxStars, 25)
				}));
			} else if (benchmarkScore >= 0.8 && quickCapabilities.tier !== 'high') {
				// Better performance than initially detected
				deviceCapabilities.update((caps) => ({
					...caps,
					tier: 'medium', // Only upgrade to medium, not high
					frameSkip: Math.min(caps.frameSkip, 1)
				}));
			}
		}
	}, 1000); // Delay benchmark to not impact initial load

	return quickCapabilities;
}

// Create stores
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
function initializeCapabilities() {
	if (browser) {
		// Start with fast detection immediately for better startup performance
		determineDeviceCapabilities().then((detectedCapabilities) => {
			deviceCapabilities.set(detectedCapabilities);
		});
	}
}

// Optimized performance monitoring setup
export function setupPerformanceMonitoring() {
	if (!browser) return () => {};

	let active = false;
	let rafId: number | null = null;
	let lastTime = 0;
	let frameCount = 0;
	let monitoringInterval: number | null = null;

	const startMonitoring = () => {
		if (active) return;
		active = true;

		// Initialize capabilities if not already done
		initializeCapabilities();

		// Use lower frequency monitoring interval for memory
		monitoringInterval = window.setInterval(() => {
			// Check memory usage periodically instead of every frame
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

			// Reset frame counter periodically in case requestAnimationFrame stops
			if (Date.now() - lastTime > 5000) {
				frameCount = 0;
				lastTime = Date.now();
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
		if (rafId !== null) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}
		if (monitoringInterval !== null) {
			clearInterval(monitoringInterval);
			monitoringInterval = null;
		}
	};
}

// Efficient update for object pool statistics
export function updateObjectPoolStats(stats: Partial<ObjectPoolStats>) {
	if (!browser) return;

	objectPoolStatsStore.update((currentStats) => {
		// Create new stats object with updated values
		const newStats = { ...currentStats, ...stats };

		// Calculate derived statistics if needed
		if (
			(stats.activeObjects !== undefined || stats.totalCapacity !== undefined) &&
			newStats.totalCapacity > 0
		) {
			newStats.utilizationRate = newStats.activeObjects / newStats.totalCapacity;
		}

		// Update reuse ratio when relevant fields change
		if (stats.objectsCreated !== undefined || stats.objectsReused !== undefined) {
			const total = newStats.objectsCreated + newStats.objectsReused;
			newStats.reuseRatio = total > 0 ? newStats.objectsReused / total : 0;
		}

		// Estimate memory savings if not provided but we have reuse data
		if (stats.objectsReused !== undefined && stats.estimatedMemorySaved === undefined) {
			// Use a simple fixed object size estimate when specific size unknown
			const objectSize = 240; // bytes
			newStats.estimatedMemorySaved = (newStats.objectsReused * objectSize) / 1024; // in KB
		}

		return newStats;
	});
}

// Setup visibility event listeners for performance optimization
export function setupEventListeners() {
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
				initializeCapabilities();
			}, 300); // Short delay to let the browser stabilize
		}
	};

	// Add event listener
	document.addEventListener('visibilitychange', visibilityChangeHandler);

	// Return cleanup function
	return () => {
		document.removeEventListener('visibilitychange', visibilityChangeHandler);
	};
}

// Initialize capabilities on module load
if (browser) {
	initializeCapabilities();
}

/**
 * Quick GPU detection - simplified to reduce unnecessary calls
 */
const checkGPUCapabilities = (): 'high' | 'medium' | 'low' => {
	if (!browser) return 'medium';

	try {
		const canvas = document.createElement('canvas');
		const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

		if (!gl) return 'low';

		// Basic check for WebGL capabilities
		const extensions = gl.getSupportedExtensions() || [];

		// Check for some key extensions
		if (
			extensions.includes('WEBGL_compressed_texture_s3tc') &&
			extensions.includes('OES_texture_float') &&
			extensions.includes('ANGLE_instanced_arrays')
		) {
			return 'high';
		} else if (gl.getParameter(gl.MAX_TEXTURE_SIZE) >= 4096) {
			return 'medium';
		}

		return 'low';
	} catch (e) {
		return 'low';
	}
};

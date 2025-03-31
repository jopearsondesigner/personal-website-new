// src/lib/utils/device-detection.ts

/**
 * Comprehensive device detection utilities for optimizing canvas-based games
 * and other performance-sensitive components.
 */

// Device performance tier type
export type PerformanceTier = 'low' | 'medium' | 'high';

// Device capability information
export interface DeviceCapabilities {
	isTouchDevice: boolean;
	devicePixelRatio: number;
	windowWidth: number;
	windowHeight: number;
	orientation: 'portrait' | 'landscape';
	performanceTier: PerformanceTier;
	supportsWebGL: boolean;
	supportsWebGL2: boolean;
	maxTextureSize: number;
	browserInfo: {
		name: string;
		version: string;
		isIOS: boolean;
		isAndroid: boolean;
	};
	cpuCores: number;
}

/**
 * Detects device capabilities for optimizing game performance
 */
export function detectDeviceCapabilities(): DeviceCapabilities {
	// Default values for SSR
	if (typeof window === 'undefined') {
		return getDefaultCapabilities();
	}

	// Basic device detection
	const isMobile =
		/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
		(navigator.maxTouchPoints && navigator.maxTouchPoints > 2);

	const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
	const isAndroid = /Android/i.test(navigator.userAgent);

	// Get device pixel ratio for high-DPI rendering
	const pixelRatio = window.devicePixelRatio || 1;

	// Determine orientation
	const orientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';

	// Detect WebGL support
	const webGLSupport = checkWebGLSupport();

	// CPU cores (with fallback for browsers that don't support it)
	const cpuCores = navigator.hardwareConcurrency || 2;

	// Determine browser
	const browserInfo = detectBrowser();

	// Determine performance tier
	const performanceTier = determinePerformanceTier({
		isMobile,
		isIOS,
		isAndroid,
		pixelRatio,
		cpuCores,
		webGLSupport,
		browserInfo
	});

	return {
		isTouchDevice: isMobile,
		devicePixelRatio: pixelRatio,
		windowWidth: window.innerWidth,
		windowHeight: window.innerHeight,
		orientation: orientation as 'portrait' | 'landscape',
		performanceTier,
		supportsWebGL: webGLSupport.webgl,
		supportsWebGL2: webGLSupport.webgl2,
		maxTextureSize: webGLSupport.maxTextureSize,
		browserInfo,
		cpuCores
	};
}

/**
 * Determines the performance tier of the device
 * Enhanced with more precise detection and consideration for memory limitations
 */
function determinePerformanceTier(info: {
	isMobile: boolean;
	isIOS: boolean;
	isAndroid: boolean;
	pixelRatio: number;
	cpuCores: number;
	webGLSupport: {
		webgl: boolean;
		webgl2: boolean;
		maxTextureSize: number;
	};
	browserInfo: {
		name: string;
		version: string;
		isIOS: boolean;
		isAndroid: boolean;
	};
}): PerformanceTier {
	// Check for very low-end devices first
	if (
		(info.isAndroid && /Android [1-5]\./.test(navigator.userAgent)) || // Very old Android
		(info.isIOS && /OS [4-9]_/.test(navigator.userAgent)) || // Old iOS
		info.cpuCores <= 2 || // Very few CPU cores
		info.pixelRatio < 2 || // Low pixel density
		!info.webGLSupport.webgl || // No WebGL support
		info.webGLSupport.maxTextureSize < 2048 || // Small max texture
		(info.browserInfo.name === 'safari' && parseFloat(info.browserInfo.version) < 11) || // Old Safari
		/iPhone [5-8]/i.test(navigator.userAgent) || // Older iPhones
		/iPad [1-4]/i.test(navigator.userAgent) // Older iPads
	) {
		return 'low';
	}

	// Check for mid-range devices
	else if (
		(info.isAndroid && /Android [6-9]\./.test(navigator.userAgent)) || // Mid Android
		(info.isIOS && /OS 1[0-3]_/.test(navigator.userAgent)) || // Mid iOS
		info.cpuCores <= 4 || // Few CPU cores
		!info.webGLSupport.webgl2 || // No WebGL2
		/iPhone [X9]/i.test(navigator.userAgent) || // Mid-range iPhones
		/iPad [5-6]/i.test(navigator.userAgent) || // Mid-range iPads
		(info.browserInfo.name === 'safari' && parseFloat(info.browserInfo.version) < 14) // Mid Safari
	) {
		return 'medium';
	}

	// Check for specific mobile hardware limitations
	// Even newer iPhones/iPads might need medium tier when processing complex canvas content
	if (info.isMobile) {
		// For mobile devices, check if low memory conditions are likely
		// We can estimate this based on certain browser behaviors or device specifications

		// For iOS devices with notch (iPhone X and newer), consider their actual performance
		if (
			info.isIOS &&
			// Screen aspect ratio check for notched iPhones
			(window.screen.height / window.screen.width >= 2 ||
				window.screen.width / window.screen.height >= 2 ||
				// Check for iPhone 11 or 12 which might struggle with complex graphics
				/iPhone 1[12]/i.test(navigator.userAgent))
		) {
			return 'medium';
		}

		// For Android devices, the fragmentation is high, so we need more heuristics
		if (info.isAndroid) {
			// Check for memory limitations on Android
			if (
				// Certain Samsung mid-range models
				/SM-A[5-7]/i.test(navigator.userAgent) ||
				// Google Pixel older models
				/Pixel [1-3]/i.test(navigator.userAgent) ||
				// Generic Android with limited GPU capability
				info.webGLSupport.maxTextureSize < 4096
			) {
				return 'medium';
			}
		}
	}

	// Also consider the current battery status and performance mode if available
	// This could be expanded with Battery API when available
	try {
		if ('getBattery' in navigator) {
			// @ts-ignore - The Battery API may not be typed correctly
			navigator.getBattery().then((battery) => {
				if (battery.level < 0.2 && !battery.charging) {
					// Low battery might trigger power saving mode on many devices
					return 'medium';
				}
			});
		}
	} catch (e) {
		// Battery API not available, ignore
	}

	// Check for reduced motion preference
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
		// User prefers reduced motion, which might indicate accessibility needs or battery saving
		return 'medium';
	}

	// Otherwise, it's likely a high-end device
	return 'high';
}

/**
 * Checks WebGL support and capabilities
 */
function checkWebGLSupport() {
	const canvas = document.createElement('canvas');
	let gl = null;
	let gl2 = null;
	let maxTextureSize = 0;

	// Check WebGL 1 support
	try {
		gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
		if (gl) {
			maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
		}
	} catch (e) {
		// WebGL not supported
	}

	// Check WebGL 2 support
	try {
		gl2 = canvas.getContext('webgl2');
	} catch (e) {
		// WebGL2 not supported
	}

	return {
		webgl: gl !== null,
		webgl2: gl2 !== null,
		maxTextureSize: maxTextureSize || 0
	};
}

/**
 * Detects browser name and version
 */
function detectBrowser() {
	const userAgent = navigator.userAgent;
	let name = 'unknown';
	let version = 'unknown';
	const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
	const isAndroid = /Android/i.test(userAgent);

	// Detect Chrome
	if (/Chrome\/([0-9.]+)/.test(userAgent)) {
		name = 'chrome';
		version = userAgent.match(/Chrome\/([0-9.]+)/)[1];
	}
	// Detect Safari
	else if (/Safari\/([0-9.]+)/.test(userAgent) && /Version\/([0-9.]+)/.test(userAgent)) {
		name = 'safari';
		version = userAgent.match(/Version\/([0-9.]+)/)[1];
	}
	// Detect Firefox
	else if (/Firefox\/([0-9.]+)/.test(userAgent)) {
		name = 'firefox';
		version = userAgent.match(/Firefox\/([0-9.]+)/)[1];
	}
	// Detect Edge
	else if (/Edg\/([0-9.]+)/.test(userAgent)) {
		name = 'edge';
		version = userAgent.match(/Edg\/([0-9.]+)/)[1];
	}

	return { name, version, isIOS, isAndroid };
}

/**
 * Returns default capabilities for SSR
 */
function getDefaultCapabilities(): DeviceCapabilities {
	return {
		isTouchDevice: false,
		devicePixelRatio: 1,
		windowWidth: 1024,
		windowHeight: 768,
		orientation: 'landscape',
		performanceTier: 'medium',
		supportsWebGL: true,
		supportsWebGL2: true,
		maxTextureSize: 4096,
		browserInfo: {
			name: 'unknown',
			version: 'unknown',
			isIOS: false,
			isAndroid: false
		},
		cpuCores: 4
	};
}

/**
 * Calculates optimal canvas dimensions based on device capabilities and available space
 * This is an enhanced version that takes into account the arcade cabinet constraints
 */
export function calculateOptimalCanvasDimensions(
	baseWidth: number,
	baseHeight: number,
	availableWidth: number,
	availableHeight: number,
	deviceCapabilities: DeviceCapabilities
): { width: number; height: number } {
	const { performanceTier, isTouchDevice } = deviceCapabilities;

	// Start with base dimensions
	let optimalWidth = baseWidth;
	let optimalHeight = baseHeight;

	// Scale down for lower-end devices to maintain performance
	if (performanceTier === 'low') {
		// Use 70% of the base resolution for low-end devices
		optimalWidth = Math.floor(baseWidth * 0.7);
		optimalHeight = Math.floor(baseHeight * 0.7);
	} else if (performanceTier === 'medium') {
		// Use 85% of the base resolution for medium-tier devices
		optimalWidth = Math.floor(baseWidth * 0.85);
		optimalHeight = Math.floor(baseHeight * 0.85);
	}

	// Calculate aspect ratio of the base dimensions
	const aspectRatio = baseWidth / baseHeight;

	// Now adjust to fit the available space while maintaining aspect ratio
	if (availableWidth > 0 && availableHeight > 0) {
		if (availableWidth / aspectRatio <= availableHeight) {
			// Width is the limiting factor
			optimalWidth = availableWidth;
			optimalHeight = Math.floor(availableWidth / aspectRatio);
		} else {
			// Height is the limiting factor
			optimalHeight = availableHeight;
			optimalWidth = Math.floor(availableHeight * aspectRatio);
		}
	}

	// For mobile devices, ensure we're not rendering unnecessarily large canvases
	if (isTouchDevice) {
		const maxMobileWidth =
			performanceTier === 'high' ? 960 : performanceTier === 'medium' ? 800 : 640;
		if (optimalWidth > maxMobileWidth) {
			const ratio = optimalHeight / optimalWidth;
			optimalWidth = maxMobileWidth;
			optimalHeight = Math.floor(maxMobileWidth * ratio);
		}
	}

	// Ensure dimensions are always integers to avoid sub-pixel rendering issues
	return {
		width: Math.floor(optimalWidth),
		height: Math.floor(optimalHeight)
	};
}

/**
 * Optimizes canvas context based on device capabilities
 */
export function optimizeCanvasContext(
	ctx: CanvasRenderingContext2D,
	deviceCapabilities: DeviceCapabilities
): void {
	const { performanceTier } = deviceCapabilities;

	// Apply context optimizations based on device tier
	if (performanceTier === 'low') {
		// For low-end devices, disable image smoothing for better performance
		ctx.imageSmoothingEnabled = false;
	} else {
		// For higher-end devices, enable image smoothing for better visuals
		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = performanceTier === 'high' ? 'high' : 'medium';
	}

	// Additional canvas optimizations could be applied here
}

/**
 * Checks if the device is likely in a power saving mode
 * This can be used to further optimize rendering when battery is low
 */
export function isPowerSavingMode(): boolean {
	// We can't directly detect power saving mode in all browsers,
	// but we can use some heuristics

	// Check if the device is on battery and low on energy
	let isPowerSaving = false;

	// Use Battery API if available
	try {
		if ('getBattery' in navigator) {
			// @ts-ignore - The Battery API may not be typed correctly
			navigator.getBattery().then((battery) => {
				isPowerSaving = !battery.charging && battery.level < 0.2;
			});
		}
	} catch (e) {
		// Battery API not available, use fallback detection
	}

	// Check for reduced motion preference as a proxy for power saving
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
		isPowerSaving = true;
	}

	// On iOS, we can check for Low Power Mode indirectly by
	// measuring animation frame rates or checking if certain animations run
	if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
		// iOS might throttle JavaScript timers in Low Power Mode
		// We could implement a test here if needed
	}

	return isPowerSaving;
}

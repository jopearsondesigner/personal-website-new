// src/lib/utils/device-performance.ts
import { browser } from '$app/environment';
import { writable, get } from 'svelte/store';

// Advanced device capabilities model with more granular control
export interface DeviceCapabilities {
	// Core tier classification
	tier: 'low' | 'medium' | 'high' | 'ultra';
	subTier: number; // 0-9 for more granular classification within tiers

	// Content scaling
	maxStars: number;
	maxParticles: number;
	effectsLevel: 'minimal' | 'reduced' | 'normal' | 'high';
	useHardwareAcceleration: boolean;

	// Animation settings
	frameSkip: number; // Only render every Nth frame
	updateInterval: number; // Ms between updates
	animateInBackground: boolean; // Continue animations when tab not focused
	motionReduction: boolean; // Honor prefers-reduced-motion

	// Rendering settings
	useCanvas: boolean; // Use canvas instead of DOM for stars
	useWebGL: boolean; // Use WebGL for advanced effects
	useShadersIfAvailable: boolean;
	renderScale: number; // 0.5 = half resolution, 1.0 = full resolution, etc.

	// Visual effects toggles
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
	deviceYear: number; // Estimated device release year
	browserEngine: 'webkit' | 'blink' | 'gecko' | 'unknown';
	isSafari: boolean;

	// Memory and resources
	estimatedRAM: 'low' | 'medium' | 'high';
	gpuTier: 'low' | 'medium' | 'high';
	cpuCores: number;

	// Battery and power
	hasBatteryInfo: boolean;
	batteryOptimization: boolean;

	// Connection
	connectionType: 'unknown' | 'wifi' | 'cellular' | 'ethernet';

	// User preferences
	userQualityPreference: 'auto' | 'low' | 'medium' | 'high' | 'ultra';
}

// Default ultra-high capability settings
const ultraCapabilities: DeviceCapabilities = {
	tier: 'ultra',
	subTier: 9,
	maxStars: 80,
	maxParticles: 1000,
	effectsLevel: 'high',
	useHardwareAcceleration: true,
	frameSkip: 0,
	updateInterval: 16, // ~60fps
	animateInBackground: true,
	motionReduction: false,
	useCanvas: true,
	useWebGL: true,
	useShadersIfAvailable: true,
	renderScale: 1.0,
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
	deviceYear: 2023,
	browserEngine: 'unknown',
	isSafari: false,
	estimatedRAM: 'high',
	gpuTier: 'high',
	cpuCores: 8,
	hasBatteryInfo: false,
	batteryOptimization: false,
	connectionType: 'unknown',
	userQualityPreference: 'auto'
};

// Default high-end capability settings
const highCapabilities: DeviceCapabilities = {
	...ultraCapabilities,
	tier: 'high',
	subTier: 7,
	maxStars: 60,
	maxParticles: 500,
	effectsLevel: 'normal',
	renderScale: 1.0,
	enablePhosphorDecay: false,
	deviceYear: 2021,
	cpuCores: 6
};

// Default medium capability settings
const mediumCapabilities: DeviceCapabilities = {
	...highCapabilities,
	tier: 'medium',
	subTier: 5,
	maxStars: 40,
	maxParticles: 200,
	effectsLevel: 'reduced',
	useWebGL: false,
	useShadersIfAvailable: false,
	frameSkip: 1, // Render every other frame
	updateInterval: 32, // ~30fps
	renderScale: 0.8,
	enableChromaticAberration: false,
	enableInterlace: false,
	enablePhosphorDecay: false,
	enableReflections: false,
	enableShadows: false,
	deviceYear: 2019,
	estimatedRAM: 'medium',
	gpuTier: 'medium',
	cpuCores: 4,
	batteryOptimization: true
};

// Default low capability settings
const lowCapabilities: DeviceCapabilities = {
	...mediumCapabilities,
	tier: 'low',
	subTier: 3,
	maxStars: 20,
	maxParticles: 50,
	effectsLevel: 'minimal',
	useWebGL: false,
	frameSkip: 2, // Render every third frame
	updateInterval: 50, // ~20fps
	animateInBackground: false,
	renderScale: 0.6,
	enableGlow: false,
	enableBlur: false,
	enableShadows: false,
	enableReflections: false,
	enableParallax: false,
	enablePulse: false,
	enableScanlines: false,
	deviceYear: 2017,
	estimatedRAM: 'low',
	gpuTier: 'low',
	cpuCores: 2,
	batteryOptimization: true
};

// Create device capability store
export const deviceCapabilities = writable<DeviceCapabilities>(
	browser ? determineDeviceCapabilities() : highCapabilities
);

// Create a writable store for runtime detection results
export const runtimeCapabilities = writable({
	webGLScore: 0,
	canvasScore: 0,
	fpsBaseline: 0,
	ramEstimate: 0,
	batteryLevel: null as number | null,
	batteryCharging: null as boolean | null,
	connectionType: 'unknown' as 'unknown' | 'wifi' | 'cellular' | 'ethernet',
	processingScore: 0,
	lastUpdated: 0
});

// Performance feature tests state
let performanceTestsRun = false;

// Function to determine device capabilities using multiple detection methods
function determineDeviceCapabilities(): DeviceCapabilities {
	if (!browser) {
		return highCapabilities; // Default to high for SSR
	}

	try {
		// Start with feature detection (more reliable than UA sniffing)
		const capabilities = detectBasicCapabilities();

		// Enhance with advanced runtime detection
		enhanceWithUserAgentData(capabilities);

		// Apply user preferences (from localStorage if available)
		applyUserPreferences(capabilities);

		// Schedule runtime performance tests for after initial load
		scheduleRuntimeTests();

		return capabilities;
	} catch (error) {
		console.error('Error determining device capabilities:', error);
		return mediumCapabilities; // Fallback to medium on error
	}
}

// Basic capability detection using feature detection
function detectBasicCapabilities(): DeviceCapabilities {
	// Start with high-end defaults and degrade based on detection
	let capabilities: DeviceCapabilities = { ...highCapabilities };

	// Detect device characteristics
	const pixelRatio = window.devicePixelRatio || 1;
	capabilities.devicePixelRatio = pixelRatio;

	// Detect form factor
	capabilities.isMobile = detectMobile();
	capabilities.isTablet = detectTablet();
	capabilities.isDesktop = !capabilities.isMobile && !capabilities.isTablet;

	// Detect browser engine
	capabilities.browserEngine = detectBrowserEngine();
	capabilities.isSafari = detectSafari();

	// Detect operating system
	capabilities.isIOS = detectIOS();
	capabilities.isAndroid = detectAndroid();

	// Hardware capabilities
	capabilities.cpuCores = navigator.hardwareConcurrency || 2;

	// Detect WebGL support
	capabilities.useWebGL = detectWebGLSupport();

	// Detect reduced motion preference
	capabilities.motionReduction = detectReducedMotion();

	// Determine tier based on basic capabilities
	adjustTierBasedOnBasicCapabilities(capabilities);

	return capabilities;
}

// Detect if device is mobile
function detectMobile(): boolean {
	// Feature detection approach rather than UA sniffing
	const hasTouchPoints = navigator.maxTouchPoints > 0;

	// Use matchMedia to check for mobile device (more reliable)
	const isMobileWidth = window.matchMedia('(max-width: 767px)').matches;

	// Use orientation as a hint
	const hasOrientationAPI = 'orientation' in window;

	return (hasTouchPoints && isMobileWidth) || (hasTouchPoints && hasOrientationAPI);
}

// Detect if device is a tablet
function detectTablet(): boolean {
	const hasTouchPoints = navigator.maxTouchPoints > 0;

	// Tablets typically have touch and wider screens
	const isTabletWidth = window.matchMedia('(min-width: 768px) and (max-width: 1024px)').matches;

	return hasTouchPoints && isTabletWidth;
}

// Detect browser engine
function detectBrowserEngine(): 'webkit' | 'blink' | 'gecko' | 'unknown' {
	const ua = navigator.userAgent;

	if (/AppleWebKit\//.test(ua)) {
		if (/Chrome\//.test(ua)) {
			return 'blink';
		}
		return 'webkit';
	}

	if (/Gecko\//.test(ua)) {
		return 'gecko';
	}

	return 'unknown';
}

// Detect if browser is Safari
function detectSafari(): boolean {
	const ua = navigator.userAgent;
	return /^((?!chrome|android).)*safari/i.test(ua);
}

// Detect iOS
function detectIOS(): boolean {
	// Feature detection for iOS
	const platform = navigator.platform || '';

	const isIOSByPlatform = /iPad|iPhone|iPod/.test(platform);

	// iOS 13+ on iPad might not be detected by platform
	const isIOSByUserAgent = /iPad|iPhone|iPod/.test(navigator.userAgent);

	// iOS-specific feature
	const isIOSByVendor = navigator.vendor && navigator.vendor.indexOf('Apple') > -1;

	// Standalone mode for PWA on iOS
	const isIOSByStandalone = 'standalone' in navigator && (navigator as any).standalone;

	return (
		isIOSByPlatform || isIOSByUserAgent || (isIOSByVendor && !window.MSStream) || isIOSByStandalone
	);
}

// Detect Android
function detectAndroid(): boolean {
	return /Android/.test(navigator.userAgent);
}

// Detect WebGL support
function detectWebGLSupport(): boolean {
	try {
		const canvas = document.createElement('canvas');
		const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

		return !!gl;
	} catch (e) {
		return false;
	}
}

// Detect reduced motion preference
function detectReducedMotion(): boolean {
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Adjust tier based on basic capabilities
function adjustTierBasedOnBasicCapabilities(capabilities: DeviceCapabilities): void {
	// Start with balanced assumptions
	let tierScore = 6; // Medium-high

	// Reduce score for mobile/tablet
	if (capabilities.isMobile) tierScore -= 2;
	if (capabilities.isTablet) tierScore -= 1;

	// Reduce for older iOS devices (apply lower bounds)
	if (capabilities.isIOS) {
		tierScore = Math.min(tierScore, 6); // Cap at medium-high

		// iOS Safari has specific limitations
		if (capabilities.isSafari) {
			capabilities.useWebGL = false;
			capabilities.enableChromaticAberration = false;
			capabilities.enableInterlace = false;
		}
	}

	// Reduce for Safari (known performance issues with certain effects)
	if (capabilities.isSafari) {
		tierScore -= 1;
	}

	// Reduce for lower CPU cores
	if (capabilities.cpuCores <= 2) tierScore -= 2;
	else if (capabilities.cpuCores <= 4) tierScore -= 1;

	// Adjust for pixel ratio (higher density screens need more power)
	if (capabilities.devicePixelRatio > 2.5) tierScore -= 1;

	// Reduce if WebGL not supported
	if (!capabilities.useWebGL) tierScore -= 2;

	// Apply reduced motion preferences
	if (capabilities.motionReduction) {
		tierScore -= 1;
		capabilities.enablePulse = false;
		capabilities.enableParallax = false;
		capabilities.updateInterval = Math.max(capabilities.updateInterval, 32);
	}

	// Apply tier based on score
	if (tierScore >= 8) {
		Object.assign(capabilities, ultraCapabilities);
		capabilities.tier = 'ultra';
		capabilities.subTier = tierScore - 8; // 0-2
	} else if (tierScore >= 5) {
		Object.assign(capabilities, highCapabilities);
		capabilities.tier = 'high';
		capabilities.subTier = tierScore - 5; // 0-2
	} else if (tierScore >= 2) {
		Object.assign(capabilities, mediumCapabilities);
		capabilities.tier = 'medium';
		capabilities.subTier = tierScore - 2; // 0-2
	} else {
		Object.assign(capabilities, lowCapabilities);
		capabilities.tier = 'low';
		capabilities.subTier = tierScore; // 0-1
	}

	// Preserve detected capabilities
	capabilities.devicePixelRatio = window.devicePixelRatio || 1;
	capabilities.isMobile = detectMobile();
	capabilities.isTablet = detectTablet();
	capabilities.isDesktop = !capabilities.isMobile && !capabilities.isTablet;
	capabilities.isIOS = detectIOS();
	capabilities.isAndroid = detectAndroid();
	capabilities.browserEngine = detectBrowserEngine();
	capabilities.isSafari = detectSafari();
	capabilities.cpuCores = navigator.hardwareConcurrency || 2;
	capabilities.useWebGL = detectWebGLSupport();
	capabilities.motionReduction = detectReducedMotion();
}

// Enhance detection with User-Agent Client Hints (if available)
function enhanceWithUserAgentData(capabilities: DeviceCapabilities): void {
	try {
		// Modern User-Agent Client Hints API (more privacy-friendly)
		if ('userAgentData' in navigator) {
			const uaData = (navigator as any).userAgentData;

			// Get mobile status
			if (uaData.mobile !== undefined) {
				capabilities.isMobile = uaData.mobile;
				capabilities.isTablet = false; // Can't directly detect tablets with this API
				capabilities.isDesktop = !capabilities.isMobile;
			}

			// Get browser info
			if (uaData.brands) {
				const brands = uaData.brands;
				const hasSafari = brands.some((brand: any) => /Safari/i.test(brand.brand));
				const hasChrome = brands.some((brand: any) => /Chrome/i.test(brand.brand));

				if (hasSafari && !hasChrome) {
					capabilities.isSafari = true;
					capabilities.browserEngine = 'webkit';
				}
			}

			// Get high-entropy values (requires permission)
			if (uaData.getHighEntropyValues) {
				uaData
					.getHighEntropyValues(['platform', 'platformVersion', 'model'])
					.then((highEntropyValues: any) => {
						// Detect iOS
						if (/iOS|iPadOS/i.test(highEntropyValues.platform)) {
							capabilities.isIOS = true;

							// Adjust for iOS version
							const versionMatch = highEntropyValues.platformVersion?.match(/^(\d+)/);
							if (versionMatch) {
								const majorVersion = parseInt(versionMatch[1], 10);
								capabilities.deviceYear = 2010 + majorVersion; // Rough estimate

								// Older iOS has more limitations
								if (majorVersion < 14) {
									downgradeCapabilitiesForOlderIOS(capabilities, majorVersion);
								}
							}
						}

						// Detect Android
						if (/Android/i.test(highEntropyValues.platform)) {
							capabilities.isAndroid = true;

							// Adjust for Android version
							const versionMatch = highEntropyValues.platformVersion?.match(/^(\d+)/);
							if (versionMatch) {
								const majorVersion = parseInt(versionMatch[1], 10);
								capabilities.deviceYear = 2011 + majorVersion; // Rough estimate

								// Older Android has more limitations
								if (majorVersion < 10) {
									downgradeCapabilitiesForOlderAndroid(capabilities, majorVersion);
								}
							}
						}

						// Update device model
						if (highEntropyValues.model) {
							enhanceWithDeviceModel(capabilities, highEntropyValues.model);
						}

						// Update the store with new information
						deviceCapabilities.set(capabilities);
					})
					.catch(() => {
						// Permission denied or API failed, fall back to UA string (less reliable)
						fallbackToUserAgentString(capabilities);
					});
			} else {
				// High entropy values not available, fall back
				fallbackToUserAgentString(capabilities);
			}
		} else {
			// User-Agent Client Hints not available, fall back
			fallbackToUserAgentString(capabilities);
		}
	} catch (error) {
		console.error('Error in userAgentData detection:', error);
		fallbackToUserAgentString(capabilities);
	}
}

// Fallback to traditional user agent string analysis
function fallbackToUserAgentString(capabilities: DeviceCapabilities): void {
	const ua = navigator.userAgent;

	// Detect iOS version
	if (capabilities.isIOS) {
		const matches = ua.match(/OS (\d+)_/);
		if (matches) {
			const version = parseInt(matches[1], 10);
			capabilities.deviceYear = 2010 + version; // Rough estimate

			if (version < 14) {
				downgradeCapabilitiesForOlderIOS(capabilities, version);
			}
		}

		// Detect iPhone model hints
		if (/iPhone/.test(ua)) {
			if (/iPhone 1[4-5]/.test(ua)) {
				enhanceWithDeviceModel(capabilities, 'iPhone 14/15');
			} else if (/iPhone 13/.test(ua)) {
				enhanceWithDeviceModel(capabilities, 'iPhone 13');
			} else if (/iPhone 12/.test(ua)) {
				enhanceWithDeviceModel(capabilities, 'iPhone 12');
			} else if (/iPhone 1[0-1]/.test(ua) || /iPhone X/.test(ua)) {
				enhanceWithDeviceModel(capabilities, 'iPhone X/11');
			} else {
				enhanceWithDeviceModel(capabilities, 'iPhone 8 or earlier');
			}
		}
	}

	// Detect Android version
	if (capabilities.isAndroid) {
		const matches = ua.match(/Android (\d+)/);
		if (matches) {
			const version = parseInt(matches[1], 10);
			capabilities.deviceYear = 2011 + version; // Rough estimate

			if (version < 10) {
				downgradeCapabilitiesForOlderAndroid(capabilities, version);
			}
		}

		// Detect Samsung model hints
		if (/SM-G9/.test(ua)) {
			enhanceWithDeviceModel(capabilities, 'Samsung Galaxy S series');
		} else if (/SM-N9/.test(ua)) {
			enhanceWithDeviceModel(capabilities, 'Samsung Galaxy Note series');
		} else if (/Pixel [4-7]/.test(ua)) {
			enhanceWithDeviceModel(capabilities, 'Google Pixel 4-7');
		}
	}

	// Update the store with new information
	deviceCapabilities.set(capabilities);
}

// Enhance capabilities with device model information
function enhanceWithDeviceModel(capabilities: DeviceCapabilities, model: string): void {
	// Known high-end devices
	if (model === 'iPhone 14/15' || model === 'iPhone 14' || model === 'iPhone 15') {
		// Special optimization for iPhone 14/15
		if (capabilities.tier === 'high') {
			capabilities.subTier = 5; // Lower within high tier
		} else {
			capabilities.tier = 'medium';
			capabilities.subTier = 7; // High within medium tier
		}

		// iPhone 14 specific optimizations
		capabilities.useCanvas = true;
		capabilities.frameSkip = 2; // Skip more frames
		capabilities.updateInterval = 32; // ~30fps
		capabilities.enableChromaticAberration = false;
		capabilities.enableInterlace = false;
		capabilities.enablePhosphorDecay = false;
		capabilities.enableBlur = false;
		capabilities.enableShadows = false;
		capabilities.enableReflections = false;
		capabilities.deviceYear = 2022;
	} else if (model === 'iPhone 13' || model === 'iPhone 12') {
		capabilities.tier = 'medium';
		capabilities.subTier = 6;
		capabilities.deviceYear = 2021;
	} else if (model === 'iPhone X/11' || model === 'iPhone X' || model === 'iPhone 11') {
		capabilities.tier = 'medium';
		capabilities.subTier = 4;
		capabilities.deviceYear = 2019;
	} else if (model === 'iPhone 8 or earlier') {
		capabilities.tier = 'low';
		capabilities.subTier = 5;
		capabilities.deviceYear = 2017;
	} else if (model === 'Samsung Galaxy S series' || model === 'Google Pixel 4-7') {
		if (capabilities.isAndroid) {
			capabilities.tier = 'high';
			capabilities.subTier = 5;
			capabilities.deviceYear = 2022;
		}
	} else if (model === 'Samsung Galaxy Note series') {
		if (capabilities.isAndroid) {
			capabilities.tier = 'high';
			capabilities.subTier = 4;
			capabilities.deviceYear = 2021;
		}
	}
}

// Apply capability downgrades for older iOS versions
function downgradeCapabilitiesForOlderIOS(capabilities: DeviceCapabilities, version: number): void {
	// iOS 13 and below have significant performance limitations
	if (version <= 13) {
		capabilities.tier = 'low';
		capabilities.subTier = Math.min(5, version - 8); // Adjust subtier by version
		capabilities.useWebGL = false;
		capabilities.enableInterlace = false;
		capabilities.enableChromaticAberration = false;
		capabilities.enableBlur = false;
		capabilities.enableShadows = false;
		capabilities.enableReflections = false;
		capabilities.frameSkip = Math.max(2, capabilities.frameSkip);
		capabilities.renderScale = 0.6;
		capabilities.maxStars = 20;
		capabilities.maxParticles = 50;
	}
	// iOS 14-15 have some limitations
	else if (version <= 15) {
		capabilities.tier = 'medium';
		capabilities.subTier = version - 13; // 1-2
		capabilities.enableChromaticAberration = false;
		capabilities.enableInterlace = false;
		capabilities.frameSkip = Math.max(1, capabilities.frameSkip);
	}
}

// Apply capability downgrades for older Android versions
function downgradeCapabilitiesForOlderAndroid(
	capabilities: DeviceCapabilities,
	version: number
): void {
	// Android 9 and below have significant performance limitations
	if (version <= 9) {
		capabilities.tier = 'low';
		capabilities.subTier = Math.min(5, version - 4); // Adjust subtier by version
		capabilities.useWebGL = false;
		capabilities.enableInterlace = false;
		capabilities.enableChromaticAberration = false;
		capabilities.enableBlur = false;
		capabilities.enableShadows = false;
		capabilities.frameSkip = Math.max(2, capabilities.frameSkip);
		capabilities.renderScale = 0.6;
		capabilities.maxStars = 20;
		capabilities.maxParticles = 50;
	}
	// Android 10-11 have some limitations
	else if (version <= 11) {
		capabilities.tier = 'medium';
		capabilities.subTier = version - 9; // 1-2
		capabilities.enableChromaticAberration = false;
		capabilities.frameSkip = Math.max(1, capabilities.frameSkip);
	}
}

// Apply user preferences from localStorage
function applyUserPreferences(capabilities: DeviceCapabilities): void {
	if (!browser) return;

	try {
		// Get user quality preference from localStorage
		const userPreference = localStorage.getItem('userQualityPreference');
		if (userPreference && ['auto', 'low', 'medium', 'high', 'ultra'].includes(userPreference)) {
			capabilities.userQualityPreference = userPreference as any;

			// Apply user preference if not auto
			if (userPreference !== 'auto') {
				capabilities.tier = userPreference as any;

				// Reset subtier to middle value for user-selected tiers
				capabilities.subTier = 5;

				// Apply appropriate settings for the selected tier
				switch (userPreference) {
					case 'ultra':
						Object.assign(capabilities, ultraCapabilities);
						break;
					case 'high':
						Object.assign(capabilities, highCapabilities);
						break;
					case 'medium':
						Object.assign(capabilities, mediumCapabilities);
						break;
					case 'low':
						Object.assign(capabilities, lowCapabilities);
						break;
				}

				// Preserve detected device info
				preserveDeviceInfo(capabilities);
			}
		}

		// Check for battery optimization preference
		const batteryOptPref = localStorage.getItem('batteryOptimization');
		if (batteryOptPref === 'true') {
			capabilities.batteryOptimization = true;

			// Apply battery optimizations
			capabilities.animateInBackground = false;
			capabilities.updateInterval = Math.max(32, capabilities.updateInterval);
			capabilities.frameSkip = Math.max(1, capabilities.frameSkip);
		} else if (batteryOptPref === 'false') {
			capabilities.batteryOptimization = false;
		}
	} catch (error) {
		console.error('Error applying user preferences:', error);
	}
}

// Preserve device information that shouldn't be overridden by presets
function preserveDeviceInfo(capabilities: DeviceCapabilities): void {
	const currentCaps = get(deviceCapabilities);

	// Keep device-specific info
	capabilities.devicePixelRatio = window.devicePixelRatio || 1;
	capabilities.isMobile = currentCaps.isMobile;
	capabilities.isTablet = currentCaps.isTablet;
	capabilities.isDesktop = currentCaps.isDesktop;
	capabilities.isIOS = currentCaps.isIOS;
	capabilities.isAndroid = currentCaps.isAndroid;
	capabilities.browserEngine = currentCaps.browserEngine;
	capabilities.isSafari = currentCaps.isSafari;
	capabilities.cpuCores = currentCaps.cpuCores;
	capabilities.deviceYear = currentCaps.deviceYear;

	// For browsers that don't support WebGL regardless of quality setting
	if (!detectWebGLSupport()) {
		capabilities.useWebGL = false;
	}
}

// Function to manually override capabilities
export function overrideCapabilities(overrides: Partial<DeviceCapabilities>): void {
	deviceCapabilities.update((current) => {
		const updated = {
			...current,
			...overrides
		};

		// If tier is changed, update related capabilities
		if (overrides.tier && overrides.tier !== current.tier) {
			// Apply preset for the new tier
			let basePreset: DeviceCapabilities;

			switch (overrides.tier) {
				case 'ultra':
					basePreset = ultraCapabilities;
					break;
				case 'high':
					basePreset = highCapabilities;
					break;
				case 'medium':
					basePreset = mediumCapabilities;
					break;
				case 'low':
					basePreset = lowCapabilities;
					break;
				default:
					basePreset = mediumCapabilities;
			}

			// Apply preset but keep overrides and device info
			const result = {
				...basePreset,
				...overrides
			};

			// Preserve device detection
			preserveDeviceInfo(result);

			return result;
		}

		return updated;
	});

	// Save user preference if it's being set
	if (overrides.userQualityPreference) {
		try {
			localStorage.setItem('userQualityPreference', overrides.userQualityPreference);
		} catch (e) {
			console.warn('Could not save user quality preference to localStorage');
		}
	}

	// Save battery optimization preference if it's being set
	if (overrides.batteryOptimization !== undefined) {
		try {
			localStorage.setItem('batteryOptimization', overrides.batteryOptimization.toString());
		} catch (e) {
			console.warn('Could not save battery optimization preference to localStorage');
		}
	}
}

// Schedule runtime tests after initial page load
function scheduleRuntimeTests(): void {
	if (performanceTestsRun || !browser) return;

	// Wait for page to be fully loaded and idle
	if (window.requestIdleCallback) {
		window.requestIdleCallback(
			() => {
				setTimeout(runRuntimeTests, 2000);
			},
			{ timeout: 4000 }
		);
	} else {
		// Fallback for browsers without requestIdleCallback
		setTimeout(runRuntimeTests, 3000);
	}
}

// Run runtime performance tests to better calibrate device capabilities
function runRuntimeTests(): void {
	if (performanceTestsRun || !browser) return;
	performanceTestsRun = true;

	Promise.all([
		testWebGLPerformance(),
		testCanvasPerformance(),
		testCPUPerformance(),
		detectBatteryStatus(),
		detectNetworkConnection()
	])
		.then(([webGLScore, canvasScore, cpuScore, batteryInfo, connectionInfo]) => {
			// Update runtime capabilities store
			runtimeCapabilities.update((current) => ({
				...current,
				webGLScore,
				canvasScore,
				processingScore: cpuScore,
				batteryLevel: batteryInfo?.level !== undefined ? batteryInfo.level : null,
				batteryCharging: batteryInfo?.charging !== undefined ? batteryInfo.charging : null,
				connectionType: connectionInfo,
				lastUpdated: Date.now()
			}));

			// Apply runtime test results to improve detection
			applyRuntimeTestResults(webGLScore, canvasScore, cpuScore, batteryInfo, connectionInfo);
		})
		.catch((error) => {
			console.error('Error running runtime tests:', error);
		});
}

// Test WebGL performance
async function testWebGLPerformance(): Promise<number> {
	return new Promise((resolve) => {
		try {
			const canvas = document.createElement('canvas');
			canvas.width = 512;
			canvas.height = 512;
			const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

			if (!gl) {
				resolve(0);
				return;
			}

			// Create a simple test program
			const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
			gl.shaderSource(
				vertexShader,
				`
        attribute vec2 position;
        void main() {
          gl_Position = vec4(position, 0.0, 1.0);
        }
      `
			);
			gl.compileShader(vertexShader);

			const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
			gl.shaderSource(
				fragmentShader,
				`
        precision mediump float;
        void main() {
          gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        }
      `
			);
			gl.compileShader(fragmentShader);

			const program = gl.createProgram()!;
			gl.attachShader(program, vertexShader);
			gl.attachShader(program, fragmentShader);
			gl.linkProgram(program);
			gl.useProgram(program);

			const vertices = new Float32Array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0]);

			const buffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
			gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

			const positionLocation = gl.getAttribLocation(program, 'position');
			gl.enableVertexAttribArray(positionLocation);
			gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

			// Run performance test
			const iterations = 100;
			const startTime = performance.now();

			for (let i = 0; i < iterations; i++) {
				gl.clearColor(0.0, 0.0, 0.0, 1.0);
				gl.clear(gl.COLOR_BUFFER_BIT);
				gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			}

			gl.finish();
			const endTime = performance.now();

			// Calculate score (higher is better)
			const duration = endTime - startTime;
			const fps = iterations / (duration / 1000);

			// Normalize to a 0-100 score (60fps = 100, 10fps = 0)
			const normalizedScore = Math.max(0, Math.min(100, (fps - 10) * (100 / 50)));

			// Clean up
			gl.deleteProgram(program);
			gl.deleteShader(vertexShader);
			gl.deleteShader(fragmentShader);
			gl.deleteBuffer(buffer);

			resolve(normalizedScore);
		} catch (error) {
			console.error('WebGL performance test error:', error);
			resolve(0);
		}
	});
}

// Test Canvas rendering performance
async function testCanvasPerformance(): Promise<number> {
	return new Promise((resolve) => {
		try {
			const canvas = document.createElement('canvas');
			canvas.width = 500;
			canvas.height = 500;
			const ctx = canvas.getContext('2d');

			if (!ctx) {
				resolve(0);
				return;
			}

			// Run performance test
			const iterations = 100;
			const startTime = performance.now();

			for (let i = 0; i < iterations; i++) {
				ctx.clearRect(0, 0, canvas.width, canvas.height);

				// Draw 50 circles with gradients
				for (let j = 0; j < 50; j++) {
					const x = Math.random() * canvas.width;
					const y = Math.random() * canvas.height;
					const radius = 10 + Math.random() * 20;

					const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
					gradient.addColorStop(0, 'rgba(255,255,255,0.8)');
					gradient.addColorStop(1, 'rgba(0,0,255,0.1)');

					ctx.beginPath();
					ctx.arc(x, y, radius, 0, Math.PI * 2);
					ctx.fillStyle = gradient;
					ctx.fill();
				}
			}

			const endTime = performance.now();

			// Calculate score (higher is better)
			const duration = endTime - startTime;
			const fps = iterations / (duration / 1000);

			// Normalize to a 0-100 score (60fps = 100, 5fps = 0)
			const normalizedScore = Math.max(0, Math.min(100, (fps - 5) * (100 / 55)));

			resolve(normalizedScore);
		} catch (error) {
			console.error('Canvas performance test error:', error);
			resolve(0);
		}
	});
}

// Test CPU performance
async function testCPUPerformance(): Promise<number> {
	return new Promise((resolve) => {
		try {
			const startTime = performance.now();

			// CPU-intensive task: calculating prime numbers
			let primeCount = 0;
			const testMax = 10000;

			outer: for (let num = 2; num <= testMax; num++) {
				for (let factor = 2; factor <= Math.sqrt(num); factor++) {
					if (num % factor === 0) {
						continue outer;
					}
				}
				primeCount++;
			}

			const endTime = performance.now();
			const duration = endTime - startTime;

			// Normalize to a 0-100 score (faster is better)
			// Benchmark: 100ms = 100, 1000ms = 0
			const normalizedScore = Math.max(0, Math.min(100, 100 - (duration - 100) / 9));

			resolve(normalizedScore);
		} catch (error) {
			console.error('CPU performance test error:', error);
			resolve(50); // Default to middle score on error
		}
	});
}

// Detect battery status
async function detectBatteryStatus(): Promise<{ level: number; charging: boolean } | null> {
	if (!('getBattery' in navigator)) return null;

	try {
		// @ts-ignore - Non-standard API
		const battery = await navigator.getBattery();

		return {
			level: battery.level,
			charging: battery.charging
		};
	} catch (error) {
		console.error('Battery API error:', error);
		return null;
	}
}

// Detect network connection type
async function detectNetworkConnection(): Promise<'unknown' | 'wifi' | 'cellular' | 'ethernet'> {
	if (!('connection' in navigator)) return 'unknown';

	try {
		// @ts-ignore - Non-standard API
		const connection = navigator.connection;

		if (!connection) return 'unknown';

		if (connection.type) {
			switch (connection.type) {
				case 'wifi':
					return 'wifi';
				case 'cellular':
					return 'cellular';
				case 'ethernet':
					return 'ethernet';
				default:
					return 'unknown';
			}
		}

		// Fallback to effectiveType
		if (connection.effectiveType) {
			if (connection.effectiveType === '4g') {
				return 'wifi'; // Assume good connection is WiFi
			} else {
				return 'cellular'; // Assume slower connections are cellular
			}
		}
	} catch (error) {
		console.error('Network Connection API error:', error);
	}

	return 'unknown';
}

// Apply runtime test results to improve detection accuracy
function applyRuntimeTestResults(
	webGLScore: number,
	canvasScore: number,
	cpuScore: number,
	batteryInfo: { level: number; charging: boolean } | null,
	connectionType: 'unknown' | 'wifi' | 'cellular' | 'ethernet'
): void {
	deviceCapabilities.update((current) => {
		const updated = { ...current };

		// Only apply if auto detection is enabled
		if (updated.userQualityPreference !== 'auto') {
			return updated;
		}

		// Adjust tier based on runtime scores
		let performanceImpact = 0;

		// WebGL performance has high impact
		if (webGLScore < 30) {
			performanceImpact -= 2;
			updated.useWebGL = false;
		} else if (webGLScore < 60) {
			performanceImpact -= 1;
		}

		// Canvas performance has medium impact
		if (canvasScore < 30) {
			performanceImpact -= 1;
			updated.renderScale = Math.min(updated.renderScale, 0.7);
		} else if (canvasScore > 80) {
			performanceImpact += 1;
		}

		// CPU performance has high impact
		if (cpuScore < 30) {
			performanceImpact -= 2;
			updated.frameSkip = Math.max(2, updated.frameSkip);
		} else if (cpuScore < 60) {
			performanceImpact -= 1;
		} else if (cpuScore > 80) {
			performanceImpact += 1;
		}

		// Battery status affects power management
		if (batteryInfo) {
			if (batteryInfo.level < 0.2 && !batteryInfo.charging) {
				// Critical battery level
				performanceImpact -= 1;
				updated.batteryOptimization = true;
				updated.animateInBackground = false;
			} else if (batteryInfo.level < 0.5 && !batteryInfo.charging) {
				// Low battery
				updated.batteryOptimization = true;
			} else if (batteryInfo.charging) {
				// Charging - can use more power
				updated.batteryOptimization = false;
			}
		}

		// Network connection affects resources
		if (connectionType === 'cellular') {
			// Reduce particle count on cellular to save data
			updated.maxParticles = Math.floor(updated.maxParticles * 0.7);
		}

		// Apply performance impact to tier and subtier
		if (performanceImpact !== 0) {
			let newSubTier = updated.subTier + performanceImpact;

			// Handle tier transitions
			if (newSubTier > 9) {
				// Promote tier
				if (updated.tier === 'low') {
					updated.tier = 'medium';
					updated.subTier = 0;
				} else if (updated.tier === 'medium') {
					updated.tier = 'high';
					updated.subTier = 0;
				} else if (updated.tier === 'high') {
					updated.tier = 'ultra';
					updated.subTier = 0;
				} else {
					updated.subTier = 9; // Cap at maximum
				}
			} else if (newSubTier < 0) {
				// Demote tier
				if (updated.tier === 'ultra') {
					updated.tier = 'high';
					updated.subTier = 9;
				} else if (updated.tier === 'high') {
					updated.tier = 'medium';
					updated.subTier = 9;
				} else if (updated.tier === 'medium') {
					updated.tier = 'low';
					updated.subTier = 9;
				} else {
					updated.subTier = 0; // Cap at minimum
				}
			} else {
				// Stay in same tier with new subtier
				updated.subTier = newSubTier;
			}

			// Adjust quality settings based on final tier
			adjustQualityForTier(updated);
		}

		return updated;
	});
}

// Adjust quality settings based on tier
function adjustQualityForTier(capabilities: DeviceCapabilities): void {
	// Apply base preset
	let basePreset: DeviceCapabilities;

	switch (capabilities.tier) {
		case 'ultra':
			basePreset = ultraCapabilities;
			break;
		case 'high':
			basePreset = highCapabilities;
			break;
		case 'medium':
			basePreset = mediumCapabilities;
			break;
		case 'low':
			basePreset = lowCapabilities;
			break;
		default:
			basePreset = mediumCapabilities;
	}

	// Apply fine-tuning based on subtier
	const subtierFactor = capabilities.subTier / 9; // 0-1 range

	// Adjust star count based on subtier
	capabilities.maxStars = Math.floor(basePreset.maxStars * (0.8 + subtierFactor * 0.4));

	// Adjust particle count
	capabilities.maxParticles = Math.floor(basePreset.maxParticles * (0.8 + subtierFactor * 0.4));

	// Adjust frame skip
	if (capabilities.tier === 'low') {
		capabilities.frameSkip = Math.max(1, Math.floor(3 - subtierFactor * 2));
	} else if (capabilities.tier === 'medium') {
		capabilities.frameSkip = Math.max(0, Math.floor(2 - subtierFactor * 2));
	} else {
		capabilities.frameSkip = 0;
	}

	// Adjust update interval
	if (capabilities.tier === 'low') {
		capabilities.updateInterval = Math.max(32, Math.floor(50 - subtierFactor * 18));
	} else if (capabilities.tier === 'medium') {
		capabilities.updateInterval = Math.max(16, Math.floor(32 - subtierFactor * 16));
	} else {
		capabilities.updateInterval = 16;
	}

	// Adjust render scale
	if (capabilities.tier === 'low') {
		capabilities.renderScale = 0.6 + subtierFactor * 0.2;
	} else if (capabilities.tier === 'medium') {
		capabilities.renderScale = 0.8 + subtierFactor * 0.2;
	} else {
		capabilities.renderScale = 1.0;
	}

	// Preserve device detection info
	preserveDeviceInfo(capabilities);
}

// Create a debug function to test the device detection
export function debugDeviceCapabilities(): void {
	if (!browser) return;

	const currentCapabilities = get(deviceCapabilities);
	const runtimeResults = get(runtimeCapabilities);

	console.group('Device Capability Debug Info');
	console.log(
		'Current capability tier:',
		currentCapabilities.tier,
		`(${currentCapabilities.subTier}/9)`
	);
	console.log('Basic device info:', {
		mobile: currentCapabilities.isMobile,
		tablet: currentCapabilities.isTablet,
		desktop: currentCapabilities.isDesktop,
		ios: currentCapabilities.isIOS,
		android: currentCapabilities.isAndroid,
		safari: currentCapabilities.isSafari,
		browserEngine: currentCapabilities.browserEngine,
		pixelRatio: currentCapabilities.devicePixelRatio,
		cpuCores: currentCapabilities.cpuCores
	});
	console.log('Runtime test results:', runtimeResults);
	console.log('Full capabilities:', currentCapabilities);

	if (!performanceTestsRun) {
		console.log('Performance tests not yet run. Running now...');
		runRuntimeTests();
	}

	console.groupEnd();

	// Expose to window for debug console access
	// @ts-ignore
	window.__deviceCapabilities = {
		current: currentCapabilities,
		runtime: runtimeResults,
		overrideCapabilities,
		runTests: runRuntimeTests
	};
}

// Setup performance monitoring
export function setupPerformanceMonitoring(): () => void {
	if (!browser) return () => {};

	// Initialize runtime tests if not already run
	if (!performanceTestsRun) {
		scheduleRuntimeTests();
	}

	let frameTimes: number[] = [];
	let lastFrameTime = performance.now();
	let monitoringActive = true;
	let monitoringFrameId: number;
	let consecutiveLowFpsCount = 0;
	let consecutiveHighFpsCount = 0;
	const maxConsecutiveLowFps = 3;
	const maxConsecutiveHighFps = 5;
	let lastCapabilityAdjustment = 0;
	const MIN_ADJUSTMENT_INTERVAL = 10000; // 10 seconds between adjustments minimum

	const calculateFPS = () => {
		const now = performance.now();
		const elapsed = now - lastFrameTime;
		lastFrameTime = now;

		// Skip extreme values that might occur during tab switching
		if (elapsed > 0 && elapsed < 1000) {
			frameTimes.push(elapsed);

			// Keep only the last 30 frames for average
			if (frameTimes.length > 30) {
				frameTimes.shift();
			}

			// Calculate average FPS
			const avgFrameTime = frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length;
			const fps = 1000 / avgFrameTime;

			// Update runtime capability store with current FPS
			runtimeCapabilities.update((current) => ({
				...current,
				fpsBaseline: fps,
				lastUpdated: now
			}));

			// If FPS is consistently below or above target, adjust quality
			const capabilities = get(deviceCapabilities);

			// Don't adjust if user has manually set quality
			if (capabilities.userQualityPreference !== 'auto') {
				monitoringFrameId = requestAnimationFrame(calculateFPS);
				return;
			}

			// Don't adjust too frequently
			if (now - lastCapabilityAdjustment < MIN_ADJUSTMENT_INTERVAL) {
				monitoringFrameId = requestAnimationFrame(calculateFPS);
				return;
			}

			// Calculate target FPS based on tier
			const targetFPS = capabilities.tier === 'low' ? 30 : capabilities.tier === 'medium' ? 45 : 60;

			if (frameTimes.length >= 20) {
				// Low FPS scenario - need to reduce quality
				if (fps < targetFPS * 0.6) {
					consecutiveLowFpsCount++;
					consecutiveHighFpsCount = 0;

					if (consecutiveLowFpsCount >= maxConsecutiveLowFps) {
						deviceCapabilities.update((current) => {
							// Already at lowest settings
							if (current.tier === 'low' && current.subTier === 0) {
								// Emergency reductions for very poor performance
								const emergencySettings = {
									...current,
									maxStars: Math.max(5, current.maxStars - 5),
									maxParticles: Math.max(10, current.maxParticles - 10),
									frameSkip: Math.min(4, current.frameSkip + 1),
									updateInterval: Math.min(60, current.updateInterval + 10), // ~16fps
									renderScale: Math.max(0.4, current.renderScale - 0.1),
									enableGlow: false,
									enableBlur: false,
									enableShadows: false,
									enableReflections: false,
									enableParallax: false,
									enablePulse: false,
									enableScanlines: false
								};
								return emergencySettings;
							}

							// Reduce quality
							if (current.subTier > 0) {
								// First try reducing within the same tier
								return {
									...current,
									subTier: current.subTier - 2
								};
							} else {
								// Move to lower tier if at bottom of current tier
								let newTier: 'low' | 'medium' | 'high' | 'ultra';

								if (current.tier === 'ultra') newTier = 'high';
								else if (current.tier === 'high') newTier = 'medium';
								else newTier = 'low';

								console.log(
									`Performance optimization: Reducing tier to ${newTier} (FPS: ${fps.toFixed(1)})`
								);

								const basePreset =
									newTier === 'high'
										? highCapabilities
										: newTier === 'medium'
											? mediumCapabilities
											: lowCapabilities;

								const newCapabilities = {
									...current,
									...basePreset,
									tier: newTier,
									subTier: 7 // Start at higher subtier when downgrading
								};

								// Preserve device info
								preserveDeviceInfo(newCapabilities);

								return newCapabilities;
							}
						});

						// Reset counters and tracking
						lastCapabilityAdjustment = now;
						frameTimes = [];
						consecutiveLowFpsCount = 0;
					}
				}
				// High FPS scenario - can potentially increase quality
				else if (fps > targetFPS * 1.2 && capabilities.tier !== 'ultra') {
					consecutiveHighFpsCount++;
					consecutiveLowFpsCount = 0;

					if (consecutiveHighFpsCount >= maxConsecutiveHighFps) {
						deviceCapabilities.update((current) => {
							// Already at highest setting
							if (current.tier === 'ultra' && current.subTier === 9) {
								return current;
							}

							// Increase quality (be more conservative with increases)
							if (current.subTier < 9) {
								// First try increasing within the same tier
								return {
									...current,
									subTier: current.subTier + 1
								};
							} else {
								// Move to higher tier if at top of current tier
								let newTier: 'low' | 'medium' | 'high' | 'ultra';

								if (current.tier === 'low') newTier = 'medium';
								else if (current.tier === 'medium') newTier = 'high';
								else newTier = 'ultra';

								console.log(
									`Performance optimization: Increasing tier to ${newTier} (FPS: ${fps.toFixed(1)})`
								);

								const basePreset =
									newTier === 'ultra'
										? ultraCapabilities
										: newTier === 'high'
											? highCapabilities
											: mediumCapabilities;

								const newCapabilities = {
									...current,
									...basePreset,
									tier: newTier,
									subTier: 2 // Start at lower subtier when upgrading
								};

								// Preserve device info
								preserveDeviceInfo(newCapabilities);

								return newCapabilities;
							}
						});

						// Reset counters and tracking
						lastCapabilityAdjustment = now;
						frameTimes = [];
						consecutiveHighFpsCount = 0;
					}
				} else {
					// FPS is in acceptable range, reset counters
					consecutiveLowFpsCount = Math.max(0, consecutiveLowFpsCount - 1);
					consecutiveHighFpsCount = Math.max(0, consecutiveHighFpsCount - 1);
				}
			}
		}

		if (monitoringActive) {
			monitoringFrameId = requestAnimationFrame(calculateFPS);
		}
	};

	// Start monitoring
	monitoringFrameId = requestAnimationFrame(calculateFPS);

	// Setup battery monitoring if available
	if (browser && 'getBattery' in navigator) {
		try {
			// @ts-ignore
			navigator.getBattery().then((battery) => {
				const updateBatteryInfo = () => {
					runtimeCapabilities.update((current) => ({
						...current,
						batteryLevel: battery.level,
						batteryCharging: battery.charging,
						lastUpdated: performance.now()
					}));

					// Apply battery optimizations when critically low
					if (battery.level < 0.15 && !battery.charging) {
						deviceCapabilities.update((current) => ({
							...current,
							batteryOptimization: true,
							animateInBackground: false,
							updateInterval: Math.max(32, current.updateInterval)
						}));
					}
				};

				// Listen for battery changes
				battery.addEventListener('levelchange', updateBatteryInfo);
				battery.addEventListener('chargingchange', updateBatteryInfo);

				// Initial update
				updateBatteryInfo();
			});
		} catch (e) {
			console.error('Battery API error:', e);
		}
	}

	// Setup network monitoring if available
	if (browser && 'connection' in navigator) {
		try {
			// @ts-ignore
			const connection = navigator.connection;

			if (connection) {
				const updateConnectionInfo = () => {
					let connectionType: 'unknown' | 'wifi' | 'cellular' | 'ethernet' = 'unknown';

					if (connection.type) {
						switch (connection.type) {
							case 'wifi':
								connectionType = 'wifi';
								break;
							case 'cellular':
								connectionType = 'cellular';
								break;
							case 'ethernet':
								connectionType = 'ethernet';
								break;
						}
					} else if (connection.effectiveType) {
						if (connection.effectiveType === '4g') {
							connectionType = 'wifi'; // Assume good connection is WiFi
						} else {
							connectionType = 'cellular'; // Assume slower is cellular
						}
					}

					runtimeCapabilities.update((current) => ({
						...current,
						connectionType,
						lastUpdated: performance.now()
					}));
				};

				// Listen for connection changes
				connection.addEventListener('change', updateConnectionInfo);

				// Initial update
				updateConnectionInfo();
			}
		} catch (e) {
			console.error('Network Connection API error:', e);
		}
	}

	// Return cleanup function
	return () => {
		monitoringActive = false;
		cancelAnimationFrame(monitoringFrameId);
	};
}

// Reset to default capabilities
export function resetCapabilities(): void {
	// Clear local storage settings
	if (browser) {
		try {
			localStorage.removeItem('userQualityPreference');
			localStorage.removeItem('batteryOptimization');
		} catch (e) {
			console.warn('Could not clear localStorage settings');
		}
	}

	// Redetermine capabilities
	const newCapabilities = determineDeviceCapabilities();
	deviceCapabilities.set(newCapabilities);

	// Run runtime tests again
	performanceTestsRun = false;
	scheduleRuntimeTests();
}

// Get current device tier as string with more granular description
export function getDeviceTierDescription(): string {
	const capabilities = get(deviceCapabilities);

	const tierNames = {
		ultra: 'Ultra High',
		high: 'High',
		medium: 'Medium',
		low: 'Low'
	};

	const subtierDescriptions = {
		high: ['', '', 'Lower ', 'Mid ', 'Upper ', 'High ', '', '', '', ''],
		medium: ['Minimal ', 'Lower ', 'Low ', 'Mid ', 'Balanced ', 'Upper ', 'Higher ', '', '', ''],
		low: [
			'Minimal ',
			'Very Low ',
			'Low ',
			'Basic ',
			'Standard ',
			'Better ',
			'Improved ',
			'',
			'',
			''
		]
	};

	const tierName = tierNames[capabilities.tier];
	let subtierDesc = '';

	if (capabilities.tier !== 'ultra') {
		// @ts-ignore - TS doesn't like the index type
		subtierDesc = subtierDescriptions[capabilities.tier][capabilities.subTier];
	}

	return `${subtierDesc}${tierName}`;
}

// Helper function to check if a specific feature is enabled
export function isFeatureEnabled(feature: keyof DeviceCapabilities['effectsEnabled']): boolean {
	const capabilities = get(deviceCapabilities);
	return capabilities.effectsEnabled?.[feature] ?? false;
}

// Public API for other modules to check capabilities
export function getMaxParticles(): number {
	return get(deviceCapabilities).maxParticles;
}

export function getMaxStars(): number {
	return get(deviceCapabilities).maxStars;
}

export function getRenderScale(): number {
	return get(deviceCapabilities).renderScale;
}

export function shouldUseWebGL(): boolean {
	return get(deviceCapabilities).useWebGL;
}

// Initialize performance monitoring on app start
if (browser) {
	setupPerformanceMonitoring();
}

import { browser } from '$app/environment';
import { writable } from 'svelte/store';

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
	gpuTier: 'high'
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
	gpuTier: 'medium'
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
	gpuTier: 'low'
};

// Function to determine device capabilities
function determineDeviceCapabilities(): DeviceCapabilities {
	if (!browser) {
		return highCapabilities; // Default to high for SSR
	}

	// Detect device characteristics
	const ua = navigator.userAgent;
	const pixelRatio = window.devicePixelRatio || 1;
	const isIOS = /iPad|iPhone|iPod/.test(ua);
	const isAndroid = /Android/.test(ua);
	const isMobile = isIOS || isAndroid || window.innerWidth < 768;
	const isTablet = (isIOS || isAndroid) && window.innerWidth >= 768;
	const isDesktop = !isMobile && !isTablet;

	// Check for known low-end devices
	const isLowEndDevice =
		isAndroid &&
		(/Android [1-5]\./.test(ua) || /SM-J[0-9]+[A-Z]?/.test(ua) || /GT-[A-Z][0-9]+/.test(ua));

	// Check for known high-end devices
	const isHighEndPhone =
		(isIOS && (/iPhone 1[3-9]/.test(ua) || /iPad Pro/.test(ua))) ||
		(isAndroid && (/SM-S[0-9]+/.test(ua) || /SM-N[0-9]+/.test(ua) || /Pixel [4-9]/.test(ua)));

	// Get hardware concurrency as a hint of processing power
	const hardwareConcurrency = navigator.hardwareConcurrency || 1;

	// Choose a base device profile
	let capabilities: DeviceCapabilities;

	if (isLowEndDevice || pixelRatio < 2 || hardwareConcurrency < 4 || !isDesktop) {
		capabilities = lowCapabilities;
	} else if (isHighEndPhone || (isDesktop && hardwareConcurrency >= 8)) {
		capabilities = highCapabilities;
	} else {
		capabilities = mediumCapabilities;
	}

	// Apply device-specific overrides
	capabilities.devicePixelRatio = pixelRatio;
	capabilities.isMobile = isMobile;
	capabilities.isIOS = isIOS;
	capabilities.isAndroid = isAndroid;
	capabilities.isTablet = isTablet;
	capabilities.isDesktop = isDesktop;

	// iOS-specific adjustments (even high-end iOS devices can struggle with certain effects)
	if (isIOS) {
		capabilities.enableInterlace = false;
		capabilities.useWebGL = false;
		capabilities.enableChromaticAberration = false;
		capabilities.frameSkip = Math.max(1, capabilities.frameSkip);

		// Further reduce for older iOS devices
		if (/(iPhone 8|iPhone 9|iPhone X|iPhone 11)/.test(ua)) {
			capabilities.tier = 'low';
			capabilities.maxStars = 20;
			capabilities.enableScanlines = false;
			capabilities.enableBlur = false;
		}
	}

	// If it's an iPhone that you specifically mentioned with performance issues
	if (isIOS && /iPhone 14/.test(ua)) {
		// Special optimization for iPhone 14
		capabilities.tier = 'medium';
		capabilities.maxStars = 30;
		capabilities.useCanvas = true;
		capabilities.updateInterval = 32; // ~30fps initially
		capabilities.enableChromaticAberration = false;
		capabilities.enableInterlace = false;
	}

	return capabilities;
}

// Create device capability store
export const deviceCapabilities = writable<DeviceCapabilities>(
	browser ? determineDeviceCapabilities() : highCapabilities
);

// Function to manually override capabilities
export function overrideCapabilities(overrides: Partial<DeviceCapabilities>): void {
	deviceCapabilities.update((current) => ({
		...current,
		...overrides
	}));
}

// Monitor FPS and dynamically adjust capabilities if needed
export function setupPerformanceMonitoring(): () => void {
	if (!browser) return () => {};

	let frameTimes: number[] = [];
	let lastFrameTime = performance.now();
	let monitoringActive = true;
	let monitoringFrameId: number;

	const calculateFPS = () => {
		const now = performance.now();
		const elapsed = now - lastFrameTime;
		lastFrameTime = now;

		if (elapsed > 0) {
			frameTimes.push(elapsed);
			// Keep only the last 30 frames for average
			if (frameTimes.length > 30) {
				frameTimes.shift();
			}

			// Calculate average FPS
			const avgFrameTime = frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length;
			const fps = 1000 / avgFrameTime;

			// If FPS is consistently below target, reduce quality
			if (frameTimes.length >= 10 && fps < 30) {
				deviceCapabilities.update((current) => {
					// Already at low settings
					if (current.tier === 'low') return current;

					console.log(`Performance optimization: Reducing effects (FPS: ${fps.toFixed(1)})`);

					// Reduce to next lower tier
					const newTier = current.tier === 'high' ? 'medium' : 'low';
					const baseCapabilities = newTier === 'medium' ? mediumCapabilities : lowCapabilities;

					return {
						...current,
						...baseCapabilities,
						tier: newTier,
						devicePixelRatio: current.devicePixelRatio,
						isMobile: current.isMobile,
						isIOS: current.isIOS,
						isAndroid: current.isAndroid,
						isTablet: current.isTablet,
						isDesktop: current.isDesktop
					};
				});

				// Clear measurements after adjustment
				frameTimes = [];
			}
		}

		if (monitoringActive) {
			monitoringFrameId = requestAnimationFrame(calculateFPS);
		}
	};

	// Start monitoring
	monitoringFrameId = requestAnimationFrame(calculateFPS);

	// Return cleanup function
	return () => {
		monitoringActive = false;
		cancelAnimationFrame(monitoringFrameId);
	};
}

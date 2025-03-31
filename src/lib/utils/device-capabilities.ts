import { browser } from '$app/environment';
import { writable, derived } from 'svelte/store';

// Device capability interfaces
interface DeviceCapabilities {
	isMobile: boolean;
	isTablet: boolean;
	isDesktop: boolean;
	isLowPowerDevice: boolean;
	supportsWebGL: boolean;
	hasTouchScreen: boolean;
	prefersReducedMotion: boolean;
	browserInfo: {
		name: string;
		isSafari: boolean;
		isChrome: boolean;
		isFirefox: boolean;
		isWebView: boolean;
	};
	cpuCores: number;
	screenSize: {
		width: number;
		height: number;
		dpr: number;
	};
	lastUpdated: number;
}

// Create a writable store for device capabilities
const createDeviceCapabilitiesStore = () => {
	// Initialize with default values
	const initialCapabilities: DeviceCapabilities = {
		isMobile: false,
		isTablet: false,
		isDesktop: true,
		isLowPowerDevice: false,
		supportsWebGL: true,
		hasTouchScreen: false,
		prefersReducedMotion: false,
		browserInfo: {
			name: 'unknown',
			isSafari: false,
			isChrome: false,
			isFirefox: false,
			isWebView: false
		},
		cpuCores: 4,
		screenSize: {
			width: 1920,
			height: 1080,
			dpr: 1
		},
		lastUpdated: Date.now()
	};

	const { subscribe, set, update } = writable<DeviceCapabilities>(initialCapabilities);

	// Detect capabilities when in browser
	function detectCapabilities() {
		if (!browser) return;

		try {
			// Check if mobile based on screen size and user agent
			const width = window.innerWidth;
			const height = window.innerHeight;
			const userAgent = navigator.userAgent;

			const isMobile =
				width < 768 ||
				/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

			const isTablet =
				(width >= 768 && width < 1024) || /iPad|Android(?!.*Mobile)/i.test(userAgent);

			const isDesktop =
				width >= 1024 &&
				!/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

			// Detect browser
			const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);
			const isChrome = /chrome/i.test(userAgent) && !/edge/i.test(userAgent);
			const isFirefox = /firefox/i.test(userAgent);
			const isWebView =
				/(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(userAgent) ||
				/Android.*Version\/[0-9].[0-9].*Chrome\/[0-9]*.0.0.0/i.test(userAgent);

			// CPU Cores
			const cpuCores = navigator.hardwareConcurrency || 2;

			// WebGL support
			let supportsWebGL = false;
			try {
				const canvas = document.createElement('canvas');
				supportsWebGL = !!(
					window.WebGLRenderingContext &&
					(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
				);
			} catch (e) {
				supportsWebGL = false;
			}

			// Touch support
			const hasTouchScreen =
				'ontouchstart' in window ||
				navigator.maxTouchPoints > 0 ||
				(navigator as any).msMaxTouchPoints > 0;

			// Reduced motion preference
			const prefersReducedMotion =
				window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

			// Detect low power device
			// Heuristics: Older mobile, low CPU cores, or iOS
			const isLowPowerDevice =
				(isMobile && cpuCores <= 4) ||
				(isSafari && isMobile) ||
				width * height * (window.devicePixelRatio || 1) > 2500000; // High res screens on mobile

			update((current) => ({
				...current,
				isMobile,
				isTablet,
				isDesktop,
				isLowPowerDevice,
				supportsWebGL,
				hasTouchScreen,
				prefersReducedMotion,
				browserInfo: {
					name: isSafari ? 'safari' : isChrome ? 'chrome' : isFirefox ? 'firefox' : 'unknown',
					isSafari,
					isChrome,
					isFirefox,
					isWebView
				},
				cpuCores,
				screenSize: {
					width,
					height,
					dpr: window.devicePixelRatio || 1
				},
				lastUpdated: Date.now()
			}));

			// Update document for CSS access
			document.documentElement.setAttribute(
				'data-device-type',
				isLowPowerDevice ? 'low-power' : isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'
			);

			if (prefersReducedMotion) {
				document.documentElement.setAttribute('data-prefers-reduced-motion', 'true');
			}

			if (isSafari) {
				document.documentElement.setAttribute('data-browser', 'safari');
			} else if (isChrome) {
				document.documentElement.setAttribute('data-browser', 'chrome');
			} else if (isFirefox) {
				document.documentElement.setAttribute('data-browser', 'firefox');
			}
		} catch (error) {
			console.error('Error detecting device capabilities:', error);
		}
	}

	function setupListeners() {
		if (!browser) return () => {};

		// Update on resize and orientation change
		const handleChange = () => {
			setTimeout(detectCapabilities, 300); // Wait for resize/rotation to complete
		};

		window.addEventListener('resize', handleChange, { passive: true });
		window.addEventListener('orientationchange', handleChange, { passive: true });

		// Update on reduced motion preference change
		if (window.matchMedia) {
			window
				.matchMedia('(prefers-reduced-motion: reduce)')
				.addEventListener('change', detectCapabilities);
		}

		// Initial detection
		detectCapabilities();

		// Return cleanup function
		return () => {
			window.removeEventListener('resize', handleChange);
			window.removeEventListener('orientationchange', handleChange);
			if (window.matchMedia) {
				window
					.matchMedia('(prefers-reduced-motion: reduce)')
					.removeEventListener('change', detectCapabilities);
			}
		};
	}

	// Setup on browser
	if (browser) {
		setupListeners();
	}

	return {
		subscribe,
		detectCapabilities,
		setupListeners,
		// Helper methods
		getAnimationQuality: (isMobile?: boolean, isLowPower?: boolean) => {
			if (!browser) return 1.0;

			let { isMobile: detected, isLowPowerDevice, prefersReducedMotion } = get();

			if (isMobile !== undefined) {
				detected = isMobile;
			}

			if (isLowPower !== undefined) {
				isLowPowerDevice = isLowPower;
			}

			if (prefersReducedMotion) {
				return 0.3; // Minimal animations for accessibility
			} else if (isLowPowerDevice) {
				return 0.5; // Reduced animations for low power devices
			} else if (detected) {
				return 0.7; // Standard mobile optimization
			} else {
				return 1.0; // Full animations for desktop
			}
		}
	};
};

// Create a singleton instance
export const deviceCapabilities = createDeviceCapabilitiesStore();

// Derived stores for common checks
export const isMobile = derived(deviceCapabilities, ($capabilities) => $capabilities.isMobile);

export const isLowPowerDevice = derived(
	deviceCapabilities,
	($capabilities) => $capabilities.isLowPowerDevice
);

export const prefersReducedMotion = derived(
	deviceCapabilities,
	($capabilities) => $capabilities.prefersReducedMotion
);

export const animationQuality = derived(deviceCapabilities, ($capabilities) => {
	if ($capabilities.prefersReducedMotion) {
		return 0.3;
	} else if ($capabilities.isLowPowerDevice) {
		return 0.5;
	} else if ($capabilities.isMobile) {
		return 0.7;
	} else {
		return 1.0;
	}
});

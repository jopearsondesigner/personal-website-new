// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';

// Define device detection types
export interface ServerDeviceInfo {
	tier: 'ultra' | 'high' | 'medium' | 'low';
	isMobile: boolean;
	isTablet: boolean;
	isDesktop: boolean;
	isIOS: boolean;
	isAndroid: boolean;
	isSafari: boolean;
	model: string;
	browserEngine: 'webkit' | 'blink' | 'gecko' | 'unknown';
	deviceYear: number;
}

export const handle: Handle = async ({ event, resolve }) => {
	// Extract the User-Agent header
	const userAgent = event.request.headers.get('user-agent') || '';

	// Detect device information from user agent
	const deviceInfo = detectDeviceFromUserAgent(userAgent);

	// Attach device info to event.locals so it's available in load functions
	event.locals.deviceInfo = deviceInfo;

	// Continue with the request
	const response = await resolve(event);

	// Add a custom header to inform client about detected device tier
	response.headers.append('X-Device-Tier', deviceInfo.tier);

	return response;
};

/**
 * Detects device capabilities from User-Agent string
 */
function detectDeviceFromUserAgent(userAgent: string): ServerDeviceInfo {
	// Initialize with default values (desktop high tier)
	const deviceInfo: ServerDeviceInfo = {
		tier: 'high',
		isMobile: false,
		isTablet: false,
		isDesktop: true,
		isIOS: false,
		isAndroid: false,
		isSafari: false,
		model: 'unknown',
		browserEngine: 'unknown',
		deviceYear: 2023
	};

	// Detect iOS devices
	if (/iPhone|iPad|iPod/.test(userAgent)) {
		deviceInfo.isIOS = true;
		deviceInfo.browserEngine = 'webkit';

		// Identify iOS version
		const iosVersionMatch = userAgent.match(/OS (\d+)_(\d+)/);
		const iosVersion = iosVersionMatch ? parseInt(iosVersionMatch[1], 10) : 0;

		// Determine device age based on iOS version
		deviceInfo.deviceYear = iosVersion ? 2010 + iosVersion : 2020;

		// Detect iPhone models
		if (/iPhone/.test(userAgent)) {
			deviceInfo.isMobile = true;

			// iPhone model detection (estimates based on UA patterns)
			if (/iPhone14,\d/.test(userAgent) || /iPhone15,\d/.test(userAgent)) {
				deviceInfo.model = 'iPhone 14/15';
				deviceInfo.tier = 'high';
			} else if (/iPhone13,\d/.test(userAgent)) {
				deviceInfo.model = 'iPhone 13';
				deviceInfo.tier = 'high';
			} else if (/iPhone12,\d/.test(userAgent)) {
				deviceInfo.model = 'iPhone 12';
				deviceInfo.tier = 'medium';
			} else if (/iPhone1[0-1],\d/.test(userAgent) || /iPhone X/.test(userAgent)) {
				deviceInfo.model = 'iPhone X/11';
				deviceInfo.tier = 'medium';
			} else {
				deviceInfo.model = 'iPhone 8 or earlier';
				deviceInfo.tier = 'low';
			}

			// iPhones need more performance optimizations across the board
			if (deviceInfo.tier === 'high') {
				deviceInfo.tier = 'medium';
			} else if (deviceInfo.tier === 'medium') {
				deviceInfo.tier = 'low';
			}
		} else {
			// iPad detection
			deviceInfo.isTablet = true;
			deviceInfo.model = 'iPad';
			// Newer iPads perform better than iPhones, but still need some optimization
			if (iosVersion >= 15) {
				deviceInfo.tier = 'high';
			} else if (iosVersion >= 13) {
				deviceInfo.tier = 'medium';
			} else {
				deviceInfo.tier = 'low';
			}
		}
	}

	// Detect Android devices
	else if (/Android/.test(userAgent)) {
		deviceInfo.isAndroid = true;

		// Detect Android version
		const versionMatch = userAgent.match(/Android (\d+)/);
		const androidVersion = versionMatch ? parseInt(versionMatch[1], 10) : 0;

		// Set device year based on Android version
		deviceInfo.deviceYear = androidVersion ? 2010 + androidVersion : 2018;

		// Detect if mobile or tablet
		if (/Mobile/.test(userAgent)) {
			deviceInfo.isMobile = true;

			// Detect high-end devices
			if (/SM-G9|SM-N9|Pixel [4-7]/.test(userAgent)) {
				deviceInfo.model = 'High-end Android';
				deviceInfo.tier = 'high';
			} else {
				deviceInfo.model = 'Mid/Low-end Android';
				deviceInfo.tier = 'medium';
			}

			// Adjust tier based on age
			if (androidVersion < 10) {
				deviceInfo.tier = 'low';
			} else if (androidVersion < 12 && deviceInfo.tier === 'high') {
				deviceInfo.tier = 'medium';
			}
		} else {
			deviceInfo.isTablet = true;
			deviceInfo.model = 'Android Tablet';

			// Android tablets generally have better performance than phones
			if (androidVersion >= 12) {
				deviceInfo.tier = 'high';
			} else if (androidVersion >= 10) {
				deviceInfo.tier = 'medium';
			} else {
				deviceInfo.tier = 'low';
			}
		}

		// Detect browser engine
		if (/Chrome/.test(userAgent)) {
			deviceInfo.browserEngine = 'blink';
		} else if (/Firefox/.test(userAgent)) {
			deviceInfo.browserEngine = 'gecko';
		} else {
			deviceInfo.browserEngine = 'webkit'; // Default for Android WebView
		}
	}

	// Desktop browsers
	else {
		deviceInfo.isDesktop = true;

		// Detect browser engine
		if (/Firefox/.test(userAgent)) {
			deviceInfo.browserEngine = 'gecko';
		} else if (/Chrome/.test(userAgent)) {
			deviceInfo.browserEngine = 'blink';
		} else if (/Safari/.test(userAgent)) {
			deviceInfo.browserEngine = 'webkit';
			deviceInfo.isSafari = true;
		}

		// macOS Safari special handling (often has issues with animations)
		if (deviceInfo.isSafari && /Macintosh/.test(userAgent)) {
			// Slightly lower tier for Safari due to WebGL limitations
			deviceInfo.tier = 'medium';
		}

		// Older browsers detection
		if (/Trident|MSIE/.test(userAgent)) {
			deviceInfo.tier = 'low'; // IE or old Edge
			deviceInfo.browserEngine = 'unknown';
		}
	}

	// Safari detection across platforms
	if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) {
		deviceInfo.isSafari = true;
	}

	return deviceInfo;
}

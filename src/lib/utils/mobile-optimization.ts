// /src/lib/utils/mobile-optimization.ts
// Complete mobile optimization utilities for iOS and Android

// DO NOT REMOVE THIS COMMENT
// /src/lib/utils/mobile-optimization.ts
// DO NOT REMOVE THIS COMMENT
export interface MobileCapabilities {
	isIOS: boolean;
	isAndroid: boolean;
	isMobile: boolean;
	isLowPerformance: boolean;
	hasTouch: boolean;
	supportsVibration: boolean;
	supportsAccelerometer: boolean;
	deviceMemory: number | null;
	hardwareConcurrency: number;
	effectiveConnectionType: string | null;
	touchPoints: number;
}

export interface TouchPriority {
	level: 1 | 2 | 3 | 4 | 5;
	name: 'BOOST' | 'UI' | 'CONTENT' | 'GLASS' | 'BACKGROUND';
	shouldPrevent: boolean;
	allowMultiTouch: boolean;
}

export interface TouchOptimizationConfig {
	preventZoom: boolean;
	enableHaptics: boolean;
	touchTargetMinSize: number;
	boostPriority: number;
	uiPriority: number;
	contentPriority: number;
	glassPriority: number;
	backgroundPriority: number;
}

/**
 * Comprehensive mobile device detection with iOS/Android specifics
 */
export function detectMobileCapabilities(): MobileCapabilities {
	const userAgent = navigator.userAgent;

	// iOS detection (including iPadOS)
	const isIOS =
		/iPad|iPhone|iPod/.test(userAgent) ||
		(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

	// Android detection
	const isAndroid = /Android/.test(userAgent);

	// General mobile detection
	const isMobile =
		isIOS ||
		isAndroid ||
		/webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) ||
		window.innerWidth < 768;

	// Performance indicators
	const deviceMemory = (navigator as any).deviceMemory || null;
	const hardwareConcurrency = navigator.hardwareConcurrency || 4;

	// Low performance heuristics
	const isLowPerformance =
		isMobile &&
		(hardwareConcurrency <= 4 ||
			(deviceMemory && deviceMemory <= 2) ||
			window.innerWidth < 480 ||
			(isIOS && userAgent.includes('Safari') && !userAgent.includes('Chrome')));

	// Touch capabilities
	const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
	const touchPoints = navigator.maxTouchPoints || 0;

	// Feature detection
	const supportsVibration = 'vibrate' in navigator;
	const supportsAccelerometer = 'DeviceMotionEvent' in window;

	// Network detection
	const connection =
		(navigator as any).connection ||
		(navigator as any).mozConnection ||
		(navigator as any).webkitConnection;
	const effectiveConnectionType = connection?.effectiveType || null;

	return {
		isIOS,
		isAndroid,
		isMobile,
		isLowPerformance,
		hasTouch,
		supportsVibration,
		supportsAccelerometer,
		deviceMemory,
		hardwareConcurrency,
		effectiveConnectionType,
		touchPoints
	};
}

/**
 * iOS-specific optimizations
 */
export function applyIOSOptimizations(element: HTMLElement): void {
	// Prevent iOS bounce scrolling
	element.style.setProperty('-webkit-overflow-scrolling', 'touch');
	element.style.setProperty('overscroll-behavior', 'contain');

	// iOS-specific hardware acceleration
	element.style.setProperty('-webkit-transform', 'translateZ(0)');
	element.style.setProperty('-webkit-backface-visibility', 'hidden');
	element.style.setProperty('-webkit-perspective', '1000px');

	// Prevent iOS text size adjustment
	element.style.setProperty('-webkit-text-size-adjust', '100%');

	// Prevent iOS blue highlight
	element.style.setProperty('-webkit-tap-highlight-color', 'transparent');
	element.style.setProperty('-webkit-touch-callout', 'none');

	// iOS-specific touch optimizations
	element.style.setProperty('touch-action', 'manipulation');

	console.log('✅ iOS optimizations applied');
}

/**
 * Android-specific optimizations
 */
export function applyAndroidOptimizations(element: HTMLElement): void {
	// Android-specific hardware acceleration
	element.style.setProperty('transform', 'translateZ(0)');
	element.style.setProperty('will-change', 'transform, opacity');

	// Android scroll optimizations
	element.style.setProperty('overscroll-behavior', 'contain');
	element.style.setProperty('scroll-behavior', 'smooth');

	// Prevent Android text inflation
	element.style.setProperty('text-size-adjust', '100%');

	// Android-specific touch optimizations
	element.style.setProperty('touch-action', 'manipulation');
	element.style.setProperty('-webkit-tap-highlight-color', 'transparent');

	console.log('✅ Android optimizations applied');
}

/**
 * Get touch priority for element
 */
export function getTouchPriority(target: HTMLElement): TouchPriority {
	// Level 1: StarField boost interactions (highest priority)
	if (
		target.closest('.boost-interaction-area') ||
		target.closest('.boost-cue') ||
		target.closest('.boost-cue-container') ||
		target.closest('[data-boost-trigger]') ||
		target.closest('.boost-area') ||
		target.closest('[data-boost]') ||
		target.closest('.starfield-boost') ||
		target.closest('.starfield-container') ||
		target.closest('.canvas-star-container')
	) {
		return { level: 1, name: 'BOOST', shouldPrevent: false, allowMultiTouch: false };
	}

	// Level 2: Interactive UI elements
	if (
		target.closest('button') ||
		target.closest('a') ||
		target.closest('input') ||
		target.closest('select') ||
		target.closest('textarea') ||
		target.closest('.cta-button') ||
		target.closest('.arcade-cta-button') ||
		target.closest('.hamburger-menu') ||
		target.closest('[role="button"]') ||
		target.closest('[tabindex]') ||
		target.closest('.clickable') ||
		target.closest('.interactive') ||
		target.closest('.menu-item') ||
		target.closest('.game-control') ||
		target.closest('.interactive-button-container')
	) {
		return { level: 2, name: 'UI', shouldPrevent: false, allowMultiTouch: false };
	}

	// Level 3: Content areas
	if (
		target.closest('.screen-content-layer') ||
		target.closest('#text-wrapper') ||
		target.closest('.main-screen-content') ||
		target.closest('.game-screen-content')
	) {
		return { level: 3, name: 'CONTENT', shouldPrevent: false, allowMultiTouch: false };
	}

	// Level 4: Glass effects (should be blocked)
	if (
		target.closest('.screen-glass-container') ||
		target.closest('.screen-effects') ||
		target.closest('#scanline-overlay') ||
		target.closest('.crt-effect') ||
		target.closest('.reflection-layer')
	) {
		return { level: 4, name: 'GLASS', shouldPrevent: true, allowMultiTouch: false };
	}

	// Level 5: Background areas (should be blocked)
	return { level: 5, name: 'BACKGROUND', shouldPrevent: true, allowMultiTouch: false };
}

/**
 * Setup viewport meta tag for mobile optimization
 */
export function setupViewportMeta(): void {
	let viewportMeta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;

	if (!viewportMeta) {
		viewportMeta = document.createElement('meta');
		viewportMeta.setAttribute('name', 'viewport');
		document.head.appendChild(viewportMeta);
	}

	// Optimized viewport settings
	viewportMeta.setAttribute(
		'content',
		'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no, viewport-fit=cover'
	);
}

/**
 * Create touch-optimized element
 */
export function createTouchOptimizedElement(
	element: HTMLElement,
	priority: TouchPriority,
	config: Partial<TouchOptimizationConfig> = {}
): void {
	const defaultConfig: TouchOptimizationConfig = {
		preventZoom: true,
		enableHaptics: true,
		touchTargetMinSize: 44,
		boostPriority: 35,
		uiPriority: 30,
		contentPriority: 10,
		glassPriority: 15,
		backgroundPriority: 1
	};

	const finalConfig = { ...defaultConfig, ...config };

	// Set z-index based on priority
	const zIndexMap = {
		1: finalConfig.boostPriority,
		2: finalConfig.uiPriority,
		3: finalConfig.contentPriority,
		4: finalConfig.glassPriority,
		5: finalConfig.backgroundPriority
	};

	element.style.zIndex = zIndexMap[priority.level].toString();

	// Set touch action based on priority
	if (priority.level === 1) {
		// Boost areas: no touch action restrictions
		element.style.touchAction = 'none';
	} else if (priority.level <= 3) {
		// UI and content: allow manipulation
		element.style.touchAction = 'manipulation';
	} else {
		// Glass and background: no touch
		element.style.touchAction = 'none';
		element.style.pointerEvents = 'none';
	}

	// Ensure minimum touch target size for interactive elements
	if (priority.level <= 2) {
		const rect = element.getBoundingClientRect();
		if (
			rect.width < finalConfig.touchTargetMinSize ||
			rect.height < finalConfig.touchTargetMinSize
		) {
			element.style.minWidth = `${finalConfig.touchTargetMinSize}px`;
			element.style.minHeight = `${finalConfig.touchTargetMinSize}px`;
		}
	}

	// Set position relative for z-index to work
	if (getComputedStyle(element).position === 'static') {
		element.style.position = 'relative';
	}

	// Add priority class
	element.classList.add(`touch-priority-${priority.level}`);
	element.setAttribute('data-touch-priority', priority.name.toLowerCase());
}

/**
 * Haptic feedback utility
 */
export function triggerHapticFeedback(type: 'light' | 'medium' | 'heavy' = 'light'): void {
	if (!navigator.vibrate) return;

	const patterns = {
		light: 30,
		medium: 50,
		heavy: 100
	};

	navigator.vibrate(patterns[type]);
}

/**
 * Performance-aware touch handler factory
 */
export function createPerformanceAwareTouchHandler(
	callback: (event: TouchEvent) => void,
	throttleMs: number = 16
): (event: TouchEvent) => void {
	let lastExecution = 0;
	let timeoutId: number | null = null;

	return function (event: TouchEvent) {
		const now = performance.now();
		const timeSinceLastExecution = now - lastExecution;

		if (timeSinceLastExecution >= throttleMs) {
			lastExecution = now;
			callback(event);
		} else {
			if (timeoutId !== null) {
				clearTimeout(timeoutId);
			}

			timeoutId = window.setTimeout(() => {
				lastExecution = performance.now();
				callback(event);
				timeoutId = null;
			}, throttleMs - timeSinceLastExecution);
		}
	};
}

/**
 * Mobile-specific CSS optimizations
 */
export function appleMobileCSS(): void {
	const style = document.createElement('style');
	style.id = 'mobile-optimizations';
	style.textContent = `
		/* Global mobile optimizations */
		html {
			-webkit-text-size-adjust: 100%;
			-webkit-tap-highlight-color: transparent;
			-webkit-touch-callout: none;
		}

		body {
			overscroll-behavior: contain;
			-webkit-overflow-scrolling: touch;
		}

		/* Touch priority system */
		.touch-priority-1 {
			z-index: 35 !important;
			touch-action: none !important;
			pointer-events: auto !important;
		}

		.touch-priority-2 {
			z-index: 30 !important;
			touch-action: manipulation !important;
			pointer-events: auto !important;
		}

		.touch-priority-3 {
			z-index: 10 !important;
			touch-action: manipulation !important;
			pointer-events: auto !important;
		}

		.touch-priority-4,
		.touch-priority-5 {
			touch-action: none !important;
			pointer-events: none !important;
		}

		/* iOS specific */
		@supports (-webkit-touch-callout: none) {
			.touch-priority-1,
			.touch-priority-2 {
				-webkit-touch-callout: none;
				-webkit-user-select: none;
			}
		}

		/* Android specific */
		@media screen and (-webkit-min-device-pixel-ratio: 0) and (min-resolution: .001dpcm) {
			.touch-priority-1,
			.touch-priority-2 {
				transform: translateZ(0);
			}
		}
	`;

	document.head.appendChild(style);
}

/**
 * Initialize complete mobile optimization system
 */
export function initializeMobileOptimizations(): MobileCapabilities {
	const capabilities = detectMobileCapabilities();

	if (!capabilities.isMobile) {
		console.log('Desktop detected, skipping mobile optimizations');
		return capabilities;
	}

	console.log('🚀 Initializing mobile optimizations', capabilities);

	// Setup viewport
	setupViewportMeta();

	// Apply mobile CSS
	appleMobileCSS();

	// Apply platform-specific optimizations to document body
	if (capabilities.isIOS) {
		applyIOSOptimizations(document.body);
	} else if (capabilities.isAndroid) {
		applyAndroidOptimizations(document.body);
	}

	// Set data attributes for CSS targeting
	document.documentElement.setAttribute('data-mobile-device', capabilities.isMobile.toString());
	document.documentElement.setAttribute('data-ios-device', capabilities.isIOS.toString());
	document.documentElement.setAttribute('data-android-device', capabilities.isAndroid.toString());
	document.documentElement.setAttribute(
		'data-low-performance',
		capabilities.isLowPerformance.toString()
	);

	console.log('✅ Mobile optimizations initialized');

	return capabilities;
}

/**
 * Debug utilities for touch system
 */
export interface TouchDebugInfo {
	element: HTMLElement;
	priority: TouchPriority;
	rect: DOMRect;
	styles: Record<string, string>;
	hasTouch: boolean;
}

export function analyzeTouchElements(): TouchDebugInfo[] {
	const allElements = document.querySelectorAll('*') as NodeListOf<HTMLElement>;
	const touchElements: TouchDebugInfo[] = [];

	allElements.forEach((element) => {
		const priority = getTouchPriority(element);
		const rect = element.getBoundingClientRect();
		const styles = getComputedStyle(element);

		// Only include elements that are visible and have touch relevance
		if (
			rect.width > 0 &&
			rect.height > 0 &&
			(priority.level <= 3 ||
				element.matches('.screen-glass-container, .space-background-persistent'))
		) {
			touchElements.push({
				element,
				priority,
				rect,
				styles: {
					zIndex: styles.zIndex,
					touchAction: styles.touchAction,
					pointerEvents: styles.pointerEvents,
					position: styles.position
				},
				hasTouch: element.hasAttribute('data-touch-enabled')
			});
		}
	});

	return touchElements.sort((a, b) => a.priority.level - b.priority.level);
}

export function debugTouchSystem(): void {
	const capabilities = detectMobileCapabilities();
	const touchElements = analyzeTouchElements();

	console.group('🎯 Touch System Debug Report');
	console.log('Device Capabilities:', capabilities);
	console.log('Touch Elements by Priority:', touchElements);

	// Check for potential conflicts
	const conflicts: string[] = [];
	touchElements.forEach((info, index) => {
		if (info.priority.level <= 2 && info.styles.pointerEvents === 'none') {
			conflicts.push(`Element ${index}: Priority ${info.priority.level} but pointer-events: none`);
		}
		if (info.priority.level >= 4 && info.styles.pointerEvents !== 'none') {
			conflicts.push(
				`Element ${index}: Priority ${info.priority.level} but pointer-events: ${info.styles.pointerEvents}`
			);
		}
	});

	if (conflicts.length > 0) {
		console.warn('Touch Priority Conflicts:', conflicts);
	} else {
		console.log('✅ No touch priority conflicts detected');
	}

	console.groupEnd();
}

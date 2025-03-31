// src/lib/utils/animation-mode.ts
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Available animation modes
export type AnimationMode = 'minimal' | 'reduced' | 'normal';

// Animation mode store
export const animationMode = writable<AnimationMode>('normal');

// Check for low-powered devices
function isLowPoweredDevice(): boolean {
	if (!browser) return false;

	// Check for battery API and low battery
	const hasBattery = 'getBattery' in navigator;
	if (hasBattery) {
		try {
			// Cast navigator to any to access the battery API
			const nav = navigator as any;
			if (nav.deviceMemory && nav.deviceMemory < 4) {
				return true;
			}
		} catch (e) {
			// Ignore errors
		}
	}

	// Check for low-end devices using heuristics
	const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
		navigator.userAgent
	);

	return isMobile;
}

// Detect animation mode safely
export function detectAnimationMode(): AnimationMode {
	if (!browser) return 'normal';

	try {
		// Check for reduced motion preference
		const prefersReducedMotion =
			window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		if (prefersReducedMotion) {
			return 'minimal';
		}

		// Check device capability indicators
		if (isLowPoweredDevice()) {
			return 'reduced';
		}

		// Detect mobile devices for reduced animations
		const width = window.innerWidth;
		const isMobile = width < 768;

		if (isMobile) {
			return 'reduced';
		}

		return 'normal';
	} catch (error) {
		console.error('Error detecting animation mode:', error);
		return 'normal';
	}
}

// Initialize animation mode
export function initAnimationMode() {
	if (!browser) return;

	try {
		// Set initial mode
		const mode = detectAnimationMode();
		animationMode.set(mode);

		// Add class to document.documentElement for CSS targeting
		document.documentElement.classList.add(`animation-mode-${mode}`);

		// Add event listener with passive flag
		const handleResize = () => {
			const newMode = detectAnimationMode();
			animationMode.set(newMode);

			// Update CSS class
			document.documentElement.classList.remove(
				'animation-mode-minimal',
				'animation-mode-reduced',
				'animation-mode-normal'
			);
			document.documentElement.classList.add(`animation-mode-${newMode}`);
		};

		window.addEventListener('resize', handleResize, { passive: true });

		// Return cleanup function
		return () => {
			window.removeEventListener('resize', handleResize);
		};
	} catch (error) {
		console.error('Error initializing animation mode:', error);
	}
}

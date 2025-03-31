// Device detection utilities
import { browser } from '$app/environment';

// Device type detection
export const isMobile = () =>
	browser &&
	(window.innerWidth < 768 ||
		('ontouchstart' in window && window.matchMedia('(pointer: coarse)').matches));

export const isLowEndDevice = () =>
	browser &&
	((navigator.deviceMemory && navigator.deviceMemory < 4) ||
		(navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) ||
		window.matchMedia('(prefers-reduced-motion: reduce)').matches);

// File: /src/lib/utils/animation-helpers.ts

import { browser } from '$app/environment';

/**
 * Throttles requestAnimationFrame for iOS devices
 * iOS Safari can suffer from rendering issues during animations
 */
export function createThrottledRAF(throttleMs = 16) {
	if (!browser) return (callback: FrameRequestCallback) => 0;

	let rafId: number | null = null;
	let lastTime = 0;

	return (callback: FrameRequestCallback) => {
		const throttle = () => {
			const now = performance.now();
			if (now - lastTime >= throttleMs) {
				lastTime = now;
				callback(now);
			}
			rafId = requestAnimationFrame(throttle);
		};

		rafId = requestAnimationFrame(throttle);

		// Return a function to cancel the animation
		return () => {
			if (rafId !== null) {
				cancelAnimationFrame(rafId);
				rafId = null;
			}
		};
	};
}

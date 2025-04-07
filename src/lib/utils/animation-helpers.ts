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

/**
 * Creates a smooth requestAnimationFrame implementation with fixed timestep
 * Ensures consistent animation timing regardless of frame rate fluctuations
 */
export function createSmoothRAF() {
	if (!browser) return (callback: FrameRequestCallback) => 0;

	let rafId: number | null = null;
	let previousTimeStamp = 0;
	let accumulatedTime = 0;
	const timestep = 16.667; // 60fps in milliseconds

	return (callback: FrameRequestCallback) => {
		const animate = (timestamp: number) => {
			if (previousTimeStamp === 0) {
				previousTimeStamp = timestamp;
			}

			// Calculate elapsed time
			const elapsed = timestamp - previousTimeStamp;
			previousTimeStamp = timestamp;

			// Accumulate time and run updates at fixed intervals
			accumulatedTime += elapsed;

			while (accumulatedTime >= timestep) {
				callback(timestamp);
				accumulatedTime -= timestep;
			}

			rafId = requestAnimationFrame(animate);
		};

		rafId = requestAnimationFrame(animate);

		// Return a function to cancel the animation
		return () => {
			if (rafId !== null) {
				cancelAnimationFrame(rafId);
				rafId = null;
			}
		};
	};
}

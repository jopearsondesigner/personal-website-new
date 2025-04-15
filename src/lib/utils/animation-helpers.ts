// File: /src/lib/utils/animation-helpers.ts

import { browser } from '$app/environment';

/**
 * Creates a throttled requestAnimationFrame callback
 * Used to limit how often expensive operations run
 */
export function createThrottledRAF<T extends (...args: any[]) => void>(
	callback: T,
	delay: number = 0
): T {
	let ticking = false;
	let lastArgs: any[] = [];
	let timeoutId: number | null = null;

	const throttled = ((...args: any[]) => {
		lastArgs = args;

		if (!ticking) {
			ticking = true;

			requestAnimationFrame(() => {
				if (delay > 0) {
					if (timeoutId) {
						clearTimeout(timeoutId);
					}

					timeoutId = window.setTimeout(() => {
						callback(...lastArgs);
						ticking = false;
						timeoutId = null;
					}, delay);
				} else {
					callback(...lastArgs);
					ticking = false;
				}
			});
		}
	}) as T;

	return throttled;
}

/**
 * Creates a smooth animation loop with fixed timestep
 * Ensures animations run at consistent speed regardless of frame rate
 */
export function createFixedTimestepLoop(callback: (deltaTime: number) => void, fps: number = 60) {
	if (!browser) return () => {};

	const targetFrameTime = 1000 / fps;
	let lastTimestamp = 0;
	let frameId: number | null = null;
	let isRunning = false;

	// Accumulated time for fixed timestep
	let accumulatedTime = 0;

	function loop(timestamp: number) {
		if (!isRunning) return;

		frameId = requestAnimationFrame(loop);

		// First frame special case
		if (lastTimestamp === 0) {
			lastTimestamp = timestamp;
			return;
		}

		// Calculate actual elapsed time
		const deltaTime = timestamp - lastTimestamp;
		lastTimestamp = timestamp;

		// Add to accumulated time
		accumulatedTime += deltaTime;

		// Process all accumulated frames
		while (accumulatedTime >= targetFrameTime) {
			callback(targetFrameTime);
			accumulatedTime -= targetFrameTime;
		}
	}

	return {
		start: () => {
			if (isRunning) return;
			isRunning = true;
			lastTimestamp = 0;
			frameId = requestAnimationFrame(loop);
		},
		stop: () => {
			isRunning = false;
			if (frameId !== null) {
				cancelAnimationFrame(frameId);
				frameId = null;
			}
		}
	};
}

/**
 * Optimizes canvas operations by preventing unnecessary redrawing
 */
export function optimizeCanvasRendering(ctx: CanvasRenderingContext2D, drawCallback: () => void) {
	// Cache images to prevent unnecessary redrawing
	const cachedImages = new Map<string, ImageData>();

	return {
		redraw: () => {
			drawCallback();
		},
		cacheAndDraw: (
			cacheKey: string,
			width: number,
			height: number,
			x: number = 0,
			y: number = 0
		) => {
			if (!cachedImages.has(cacheKey)) {
				// Draw and cache
				drawCallback();
				cachedImages.set(cacheKey, ctx.getImageData(x, y, width, height));
			} else {
				// Use cached version
				ctx.putImageData(cachedImages.get(cacheKey)!, x, y);
			}
		},
		clearCache: () => {
			cachedImages.clear();
		}
	};
}

/**
 * Detects device performance capabilities
 */
export function detectDevicePerformance() {
	if (!browser) return { tier: 'medium', frameSkip: 0 };

	// Check for low-end devices
	const isLowEnd =
		(navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) ||
		(navigator.userAgent.includes('Mobile') &&
			(navigator as any).deviceMemory &&
			(navigator as any).deviceMemory <= 2);

	// Check for high-end devices
	const isHighEnd =
		navigator.hardwareConcurrency &&
		navigator.hardwareConcurrency >= 6 &&
		!navigator.userAgent.includes('Mobile') &&
		(!(navigator as any).deviceMemory || (navigator as any).deviceMemory >= 8);

	if (isLowEnd) {
		return { tier: 'low', frameSkip: 2 }; // Skip every 2nd frame on low-end devices
	} else if (isHighEnd) {
		return { tier: 'high', frameSkip: 0 };
	} else {
		return { tier: 'medium', frameSkip: 0 };
	}
}

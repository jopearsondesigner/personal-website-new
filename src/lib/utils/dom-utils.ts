// src/lib/utils/dom-utils.ts
import { browser } from '$app/environment';

// Keep track of pending RAF for DOM updates
let pendingRafForBatch: number | null = null;
let pendingUpdates: Array<() => void> = [];

/**
 * Efficiently batch DOM updates using requestAnimationFrame
 * Combines multiple update requests into a single RAF callback
 * @param updateFn Function that performs DOM updates
 */
export function batchDOMUpdate(updateFn: () => void): void {
	if (!browser) return;

	// Add this update to the pending queue
	pendingUpdates.push(updateFn);

	// If we already have a RAF scheduled, we're done
	if (pendingRafForBatch !== null) return;

	// Schedule a new RAF to process all pending updates
	pendingRafForBatch = requestAnimationFrame(() => {
		const updates = [...pendingUpdates]; // Copy the current updates
		pendingUpdates = []; // Clear the queue
		pendingRafForBatch = null; // Clear the pending RAF

		// Execute all updates in the correct order
		try {
			updates.forEach((fn) => fn());
		} catch (error) {
			console.error('Error in batched DOM update:', error);
		}
	});
}

/**
 * Microtask-based batching for even more immediate updates within the same task
 * @param updateFn Function that performs DOM updates
 */
export function microBatch(updateFn: () => void): void {
	if (!browser) return;

	// Use Promise microtask queue for immediate batching
	Promise.resolve().then(updateFn);
}

/**
 * Improved debounce with cancelation support
 * @param func Function to debounce
 * @param wait Wait time in ms
 * @param immediate Whether to run immediately
 * @returns Debounced function with cancel method
 */
export function debounce<T extends (...args: any[]) => any>(
	func: T,
	wait: number,
	immediate = false
): { (...args: Parameters<T>): void; cancel: () => void } {
	let timeout: ReturnType<typeof setTimeout> | null = null;

	function debounced(this: any, ...args: Parameters<T>): void {
		const context = this;

		const later = function () {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};

		const callNow = immediate && !timeout;

		if (timeout) {
			clearTimeout(timeout);
		}

		timeout = setTimeout(later, wait);

		if (callNow) {
			func.apply(context, args);
		}
	}

	debounced.cancel = function () {
		if (timeout) {
			clearTimeout(timeout);
			timeout = null;
		}
	};

	return debounced;
}

/**
 * Improved throttle with proper timing and cancelation
 * @param func Function to throttle
 * @param limit Limit in ms
 * @returns Throttled function with cancel method
 */
export function throttle<T extends (...args: any[]) => any>(
	func: T,
	limit: number
): { (...args: Parameters<T>): void; cancel: () => void } {
	let lastFunc: ReturnType<typeof setTimeout> | null = null;
	let lastRan: number = 0;

	function throttled(this: any, ...args: Parameters<T>): void {
		const context = this;
		const now = Date.now();

		if (now - lastRan >= limit) {
			// Execute immediately if we're past the limit
			func.apply(context, args);
			lastRan = now;
		} else if (!lastFunc) {
			// Schedule execution at the next limit boundary
			const remaining = limit - (now - lastRan);
			lastFunc = setTimeout(() => {
				lastFunc = null;
				lastRan = Date.now();
				func.apply(context, args);
			}, remaining);
		}
	}

	throttled.cancel = function () {
		if (lastFunc) {
			clearTimeout(lastFunc);
			lastFunc = null;
		}
	};

	return throttled;
}

/**
 * Cache for element measurements to avoid redundant layout reads
 */
const measureCache = new WeakMap<Element, { width: number; height: number; timestamp: number }>();
const MEASUREMENT_TTL = 100; // Measurements valid for 100ms

/**
 * Get element dimensions with caching to avoid layout thrashing
 * @param element HTML element to measure
 * @param force Force a fresh measurement
 */
export function measureOnce(
	element: HTMLElement,
	force: boolean = false
): { width: number; height: number } {
	if (!browser || !element) {
		return { width: 0, height: 0 };
	}

	const now = Date.now();
	const cached = measureCache.get(element);

	if (!force && cached && now - cached.timestamp < MEASUREMENT_TTL) {
		return { width: cached.width, height: cached.height };
	}

	// Force a layout calculation once and store the result
	const rect = element.getBoundingClientRect();
	const dimensions = {
		width: rect.width,
		height: rect.height,
		timestamp: now
	};

	measureCache.set(element, dimensions);

	return dimensions;
}

/**
 * Set multiple style properties in a single batch with minimal style recalcs
 * @param element Element to style
 * @param styles Object of style properties
 */
export function batchSetStyles(
	element: HTMLElement,
	styles: Record<string, string | number>
): void {
	if (!browser || !element) return;

	batchDOMUpdate(() => {
		// Get a reference to the style object once
		const elementStyle = element.style;

		// Apply all styles in one go
		Object.entries(styles).forEach(([property, value]) => {
			elementStyle[property as any] = value.toString();
		});
	});
}

/**
 * Add multiple classes in a single operation
 * @param element Element to modify
 * @param classes Classes to add
 */
export function batchAddClasses(element: HTMLElement, classes: string[]): void {
	if (!browser || !element || !classes.length) return;

	batchDOMUpdate(() => {
		element.classList.add(...classes);
	});
}

/**
 * Remove multiple classes in a single operation
 * @param element Element to modify
 * @param classes Classes to remove
 */
export function batchRemoveClasses(element: HTMLElement, classes: string[]): void {
	if (!browser || !element || !classes.length) return;

	batchDOMUpdate(() => {
		element.classList.remove(...classes);
	});
}

/**
 * Set multiple CSS custom properties in one batch
 * @param element Element to set variables on
 * @param variables Object of variable names to values
 */
export function batchSetCssVariables(
	element: HTMLElement,
	variables: Record<string, string | number>
): void {
	if (!browser || !element) return;

	batchDOMUpdate(() => {
		Object.entries(variables).forEach(([name, value]) => {
			element.style.setProperty(name, value.toString());
		});
	});
}

/**
 * Schedule a sequence of read and write operations to avoid layout thrashing
 * @param readFn Function that reads from the DOM
 * @param writeFn Function that writes to the DOM, receives read results
 */
export function readThenWrite<T>(readFn: () => T, writeFn: (readResult: T) => void): void {
	if (!browser) return;

	// Read first outside of RAF to get measurements immediately
	const readResult = readFn();

	// Then schedule writes in next frame
	batchDOMUpdate(() => {
		writeFn(readResult);
	});
}

/**
 * Detect if browser is idle and run lower priority tasks
 * @param callback Function to run when browser is idle
 */
export function runWhenIdle(callback: () => void): void {
	if (!browser) return;

	if ('requestIdleCallback' in window) {
		(window as any).requestIdleCallback(() => {
			callback();
		});
	} else {
		// Fallback to setTimeout with a reasonable delay
		setTimeout(callback, 200);
	}
}

/**
 * Get the device pixel ratio with caching
 */
let cachedDPR: number | null = null;
export function getDevicePixelRatio(): number {
	if (!browser) return 1;

	if (cachedDPR === null) {
		cachedDPR = window.devicePixelRatio || 1;
	}

	return cachedDPR;
}

/**
 * Reset the DPR cache on window resize
 */
if (browser) {
	window.addEventListener(
		'resize',
		() => {
			cachedDPR = null;
		},
		{ passive: true }
	);
}

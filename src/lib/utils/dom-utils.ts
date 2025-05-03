// src/lib/utils/dom-utils.ts
import { browser } from '$app/environment';

/**
 * Efficiently batch DOM updates using requestAnimationFrame
 * @param updateFn Function that performs DOM updates
 */
export function batchDOMUpdate(updateFn: () => void): void {
	if (!browser) return;

	// Use rAF for batching DOM updates to next frame
	requestAnimationFrame(() => {
		try {
			updateFn();
		} catch (error) {
			console.error('Error in batched DOM update:', error);
		}
	});
}

/**
 * Debounce a function with added type safety
 * @param func Function to debounce
 * @param wait Wait time in ms
 * @param immediate Whether to run immediately
 */
export function debounce<T extends (...args: any[]) => any>(
	func: T,
	wait: number,
	immediate = false
): (...args: Parameters<T>) => void {
	let timeout: ReturnType<typeof setTimeout> | null = null;

	return function (this: any, ...args: Parameters<T>): void {
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
	};
}

/**
 * Throttle a function with added type safety
 * @param func Function to throttle
 * @param limit Limit in ms
 */
export function throttle<T extends (...args: any[]) => any>(
	func: T,
	limit: number
): (...args: Parameters<T>) => void {
	let inThrottle = false;
	let lastFunc: ReturnType<typeof setTimeout>;
	let lastRan: number;

	return function (this: any, ...args: Parameters<T>): void {
		const context = this;

		if (!inThrottle) {
			func.apply(context, args);
			lastRan = Date.now();
			inThrottle = true;

			setTimeout(() => {
				inThrottle = false;
			}, limit);
		} else {
			clearTimeout(lastFunc);
			lastFunc = setTimeout(
				() => {
					if (Date.now() - lastRan >= limit) {
						func.apply(context, args);
						lastRan = Date.now();
					}
				},
				limit - (Date.now() - lastRan)
			);
		}
	};
}

/**
 * Get element dimension once, avoiding layout thrashing
 * @param element HTML element to measure
 */
export function measureOnce(element: HTMLElement): { width: number; height: number } {
	if (!browser || !element) {
		return { width: 0, height: 0 };
	}

	// Force a layout calculation once and store the result
	const rect = element.getBoundingClientRect();
	return {
		width: rect.width,
		height: rect.height
	};
}

/**
 * Set multiple style properties in a single batch
 * @param element Element to style
 * @param styles Object of style properties
 */
export function batchSetStyles(
	element: HTMLElement,
	styles: Record<string, string | number>
): void {
	if (!browser || !element) return;

	batchDOMUpdate(() => {
		Object.entries(styles).forEach(([property, value]) => {
			element.style[property as any] = value.toString();
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

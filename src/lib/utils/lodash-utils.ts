// src/lib/utils/lodash-utils.ts
import { browser } from '$app/environment';

// Function implementations that will be replaced
let _throttle = (func: Function, wait: number = 0) => func;
let _debounce = (func: Function, wait: number = 0) => func;

// Initialize lodash conditionally
if (browser) {
	// Use a dynamic import with then-catch for browser only
	import('lodash-es')
		.then((lodash) => {
			_throttle = lodash.throttle;
			_debounce = lodash.debounce;
		})
		.catch((error) => {
			console.error('Failed to load lodash:', error);
		});
}

// Export wrapped functions that use the implementations
export function throttle(func: Function, wait: number = 0, options?: any) {
	return _throttle(func, wait, options);
}

export function debounce(func: Function, wait: number = 0, options?: any) {
	return _debounce(func, wait, options);
}

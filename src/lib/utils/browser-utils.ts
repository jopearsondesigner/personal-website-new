// src/lib/utils/browser-utils.ts

import { browser } from '$app/environment';

// Safe window accessor
export function getWindow() {
	return browser ? window : undefined;
}

// Safe navigator accessor
export function getNavigator() {
	return browser ? navigator : undefined;
}

// Safe document accessor
export function getDocument() {
	return browser ? document : undefined;
}

// Check if a specific browser API is available
export function hasApi(apiPath: string): boolean {
	if (!browser) return false;

	const parts = apiPath.split('.');
	let current: any = window;

	for (const part of parts) {
		if (current[part] === undefined) return false;
		current = current[part];
	}

	return true;
}

// File: src/lib/stores/performance-monitor.ts

import { browser } from '$app/environment';
import { writable, get } from 'svelte/store';

// Create a visibility store for the performance monitor
export const perfMonitorVisible = writable<boolean>(false);

// Initialize store from localStorage on browser load
if (browser) {
	// Try to get saved value from localStorage
	const savedValue = localStorage.getItem('perfMonitorVisible');

	// Initialize with saved value or default to false (invisible)
	if (savedValue !== null) {
		perfMonitorVisible.set(savedValue === 'true');
	} else {
		// Always default to invisible
		perfMonitorVisible.set(false);
		localStorage.setItem('perfMonitorVisible', 'false');
	}
}

// Helper function to toggle the monitor
export function togglePerformanceMonitor(): void {
	if (browser) {
		const currentValue = get(perfMonitorVisible);
		const newValue = !currentValue;

		// Update store and localStorage
		perfMonitorVisible.set(newValue);
		localStorage.setItem('perfMonitorVisible', String(newValue));
	}
}

// Helper function to explicitly set visibility
export function setPerformanceMonitorVisibility(visible: boolean): void {
	if (browser) {
		perfMonitorVisible.set(visible);
		localStorage.setItem('perfMonitorVisible', String(visible));
	}
}

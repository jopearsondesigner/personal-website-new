// src/lib/stores/performance-monitor.ts
import { browser } from '$app/environment';
import { writable, get } from 'svelte/store';

// Create a visibility store for the performance monitor - explicitly start with false
export const perfMonitorVisible = writable<boolean>(false);

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

// Initialize store from localStorage only once when this module is imported
if (browser) {
	// First ensure it starts hidden by default
	perfMonitorVisible.set(false);

	// Immediately try to load from localStorage (no delay)
	try {
		const savedValue = localStorage.getItem('perfMonitorVisible');
		// Only set to true if explicitly saved as true before
		if (savedValue === 'true') {
			perfMonitorVisible.set(true);
		} else {
			// Ensure it's false and save to localStorage
			localStorage.setItem('perfMonitorVisible', 'false');
		}
	} catch (err) {
		// In case of any localStorage errors, default to hidden
		perfMonitorVisible.set(false);
		localStorage.setItem('perfMonitorVisible', 'false');
	}
}

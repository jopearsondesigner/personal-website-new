// File: src/lib/stores/performance-monitor.ts

import { browser } from '$app/environment';
import { writable } from 'svelte/store';

// Create a visibility store for the performance monitor
export const perfMonitorVisible = writable<boolean>(false);

// Initialize store from localStorage on browser load
if (browser) {
	// Try to get saved value from localStorage
	const savedValue = localStorage.getItem('perfMonitorVisible');

	// Initialize with saved value or default to visible in DEV mode
	if (savedValue !== null) {
		perfMonitorVisible.set(savedValue === 'true');
	} else if (import.meta.env.DEV) {
		perfMonitorVisible.set(true);
		localStorage.setItem('perfMonitorVisible', 'true');
	}
}

// Helper function to toggle the monitor
export function togglePerformanceMonitor(): void {
	if (browser) {
		perfMonitorVisible.update((value) => {
			const newValue = !value;
			localStorage.setItem('perfMonitorVisible', String(newValue));
			return newValue;
		});
	}
}

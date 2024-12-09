// src/lib/stores/theme.ts
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export const theme = writable('dark');

// Initializes the theme based on localStorage or default value ('dark')
export function initializeTheme() {
	if (!browser) return;

	const savedTheme = localStorage.getItem('theme') || 'dark';
	theme.set(savedTheme);

	// Apply theme to document immediately
	document.documentElement.classList.add(savedTheme);
}

// Toggle between light and dark themes
export function toggleTheme() {
	if (!browser) return;

	theme.update((currentTheme) => {
		const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
		const oldTheme = currentTheme === 'dark' ? 'dark' : 'light';

		// Remove the old theme and add the new theme class
		document.documentElement.classList.remove(oldTheme);
		document.documentElement.classList.add(newTheme);

		// Store the new theme in localStorage
		localStorage.setItem('theme', newTheme);

		return newTheme;
	});
}

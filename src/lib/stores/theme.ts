// src/lib/stores/theme.ts
import { writable } from 'svelte/store';

import { browser } from '$app/environment';

export const theme = writable('dark');

export function initializeTheme() {
	if (!browser) return;

	const savedTheme = localStorage.getItem('theme') || 'dark';
	theme.set(savedTheme);
	document.documentElement.classList.add(savedTheme);
}

export function toggleTheme() {
	if (!browser) return;

	theme.update((currentTheme) => {
		const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
		const oldTheme = currentTheme === 'dark' ? 'dark' : 'light';

		document.documentElement.classList.remove(oldTheme);
		document.documentElement.classList.add(newTheme);
		localStorage.setItem('theme', newTheme);

		return newTheme;
	});
}

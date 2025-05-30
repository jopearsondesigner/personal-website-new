// DO NOT REMOVE THIS COMMENT
// /src/lib/stores/theme.ts
// DO NOT REMOVE THIS COMMENT
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Set up the theme store
function createThemeStore() {
	// Default to dark theme
	const defaultTheme = 'dark';

	// Create the writable store with the default theme
	const { subscribe, set, update } = writable<'dark' | 'light'>(defaultTheme);

	// Function to update theme metadata
	const updateThemeMeta = (newTheme: 'dark' | 'light') => {
		if (browser) {
			// Update theme-color meta tag
			const themeColorMeta = document.getElementById('theme-color-meta');
			if (themeColorMeta) {
				themeColorMeta.setAttribute('content', newTheme === 'dark' ? '#1a1a1a' : '#d0d0d0');
			}

			// Remove the favicon switching code since it's not needed
			// and was causing the URI malformed error
		}
	};

	return {
		subscribe,
		set,
		update,

		// Initialize the theme based on localStorage or system preference
		initialize: () => {
			if (browser) {
				// Check localStorage first
				const savedTheme = localStorage.getItem('theme');

				if (savedTheme === 'dark' || savedTheme === 'light') {
					set(savedTheme);
					document.documentElement.classList.add(savedTheme);
					document.documentElement.classList.remove(savedTheme === 'dark' ? 'light' : 'dark');
					updateThemeMeta(savedTheme);
				} else {
					// Check system preference if no localStorage value
					const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
					const systemTheme = prefersDark ? 'dark' : 'light';

					set(systemTheme);
					document.documentElement.classList.add(systemTheme);
					localStorage.setItem('theme', systemTheme);
					updateThemeMeta(systemTheme);
				}
			}
		},

		// Toggle between light and dark themes
		toggle: () => {
			update((currentTheme) => {
				const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

				if (browser) {
					// Update DOM
					document.documentElement.classList.add(newTheme);
					document.documentElement.classList.remove(currentTheme);
					localStorage.setItem('theme', newTheme);
					updateThemeMeta(newTheme);
				}

				return newTheme;
			});
		},

		// Listen for system theme changes
		watchSystemTheme: () => {
			if (browser) {
				// Only set up the listener if there's no user preference
				if (!localStorage.getItem('theme')) {
					const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

					const handleChange = (e: MediaQueryListEvent) => {
						const newTheme = e.matches ? 'dark' : 'light';
						set(newTheme);
						document.documentElement.classList.add(newTheme);
						document.documentElement.classList.remove(newTheme === 'dark' ? 'light' : 'dark');
						updateThemeMeta(newTheme);
					};

					// Modern browsers
					if (mediaQuery.addEventListener) {
						mediaQuery.addEventListener('change', handleChange);
					}
					// Safari < 14
					else if (mediaQuery.addListener) {
						// @ts-ignore - For older browsers
						mediaQuery.addListener(handleChange);
					}
				}
			}
		}
	};
}

// Create and export the theme store
export const theme = createThemeStore();

// Apply the theme immediately in client-side code
if (browser) {
	theme.initialize();
	theme.watchSystemTheme();
}

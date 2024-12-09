// src/lib/stores/a11y-store.ts
import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

interface A11yPreferences {
	reducedMotion: boolean;
	highContrast: boolean;
	largeText: boolean;
	screenReader: boolean;
	keyboardOnly: boolean;
}

interface A11yState extends A11yPreferences {
	initialized: boolean;
}

// Initial state
const defaultState: A11yState = {
	initialized: false,
	reducedMotion: false,
	highContrast: false,
	largeText: false,
	screenReader: false,
	keyboardOnly: false
};

// Create the main store
const createA11yStore = () => {
	const { subscribe, set, update } = writable<A11yState>(defaultState);

	return {
		subscribe,
		set,
		update,
		init: () => {
			if (!browser) return;

			// Check system preferences
			const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
			const highContrast = window.matchMedia('(forced-colors: active)').matches;
			const largeText = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

			// Check for screen reader (approximate)
			const screenReader = document.querySelector('[role="alert"]') !== null;

			// Update store with initial values
			update((state) => ({
				...state,
				initialized: true,
				reducedMotion,
				highContrast,
				largeText,
				screenReader,
				keyboardOnly: false
			}));

			// Set up media query listeners
			const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
			const highContrastQuery = window.matchMedia('(forced-colors: active)');
			const largeTextQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

			// Event listeners for system preference changes
			reducedMotionQuery.addEventListener('change', (e) => {
				update((state) => ({ ...state, reducedMotion: e.matches }));
			});

			highContrastQuery.addEventListener('change', (e) => {
				update((state) => ({ ...state, highContrast: e.matches }));
			});

			largeTextQuery.addEventListener('change', (e) => {
				update((state) => ({ ...state, largeText: e.matches }));
			});

			// Keyboard navigation detection
			const handleFirstTab = (e: KeyboardEvent) => {
				if (e.key === 'Tab') {
					document.body.classList.add('user-is-tabbing');
					update((state) => ({ ...state, keyboardOnly: true }));
					window.removeEventListener('keydown', handleFirstTab);
				}
			};
			window.addEventListener('keydown', handleFirstTab);
		},

		// Methods to manually toggle preferences
		toggleReducedMotion: () => {
			update((state) => ({ ...state, reducedMotion: !state.reducedMotion }));
		},

		toggleHighContrast: () => {
			update((state) => ({ ...state, highContrast: !state.highContrast }));
		},

		toggleLargeText: () => {
			update((state) => ({ ...state, largeText: !state.largeText }));
		}
	};
};

// Create the main accessibility store
export const a11yStore = createA11yStore();

// Derived stores for specific features
export const motionOK = derived(a11yStore, ($store) => !$store.reducedMotion);

export const highContrast = derived(a11yStore, ($store) => $store.highContrast);

export const largeText = derived(a11yStore, ($store) => $store.largeText);

// CSS Custom Properties Manager
// src/lib/utils/a11y-utils.ts
export const updateA11yCustomProperties = (preferences: A11yPreferences) => {
	if (!browser) return;

	const root = document.documentElement;

	// Font size scaling
	root.style.setProperty('--base-font-size', preferences.largeText ? '18px' : '16px');

	// Motion preferences
	root.style.setProperty('--animation-speed', preferences.reducedMotion ? '0' : '1');

	// Contrast adjustments
	if (preferences.highContrast) {
		root.style.setProperty('--text-primary', 'CanvasText');
		root.style.setProperty('--bg-primary', 'Canvas');
		root.style.setProperty('--border-primary', 'CanvasText');
	} else {
		root.style.setProperty('--text-primary', '#E3FFEE');
		root.style.setProperty('--bg-primary', '#111111');
		root.style.setProperty('--border-primary', '#E2E2BD');
	}
};

// Focus Management
// src/lib/utils/focus-utils.ts
export const focusManager = {
	trapFocus(element: HTMLElement) {
		const focusableElements = element.querySelectorAll(
			'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
		);

		const firstFocusable = focusableElements[0] as HTMLElement;
		const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

		function handleTabKey(e: KeyboardEvent) {
			if (e.key !== 'Tab') return;

			if (e.shiftKey) {
				if (document.activeElement === firstFocusable) {
					lastFocusable.focus();
					e.preventDefault();
				}
			} else {
				if (document.activeElement === lastFocusable) {
					firstFocusable.focus();
					e.preventDefault();
				}
			}
		}

		element.addEventListener('keydown', handleTabKey);

		return () => {
			element.removeEventListener('keydown', handleTabKey);
		};
	},

	restoreFocus() {
		const previouslyFocused = document.querySelector('[data-previously-focused="true"]');
		if (previouslyFocused instanceof HTMLElement) {
			previouslyFocused.focus();
			previouslyFocused.removeAttribute('data-previously-focused');
		}
	}
};

// Accessible Components
// src/lib/components/A11yButton.svelte

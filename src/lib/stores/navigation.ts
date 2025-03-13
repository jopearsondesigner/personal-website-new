// src/lib/stores/navigation.ts
import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { sections, getAllSections, getNavSections } from '$lib/config/sections';

interface NavigationStore {
	activeSection: string;
	sections: string[];
	isScrolling: boolean;
}

function createNavigationStore() {
	// Get section IDs from configuration
	const sectionIds = getAllSections().map((section) => section.id);

	// Default navigation state
	const defaultState: NavigationStore = {
		activeSection: sectionIds[0] || 'hero',
		sections: sectionIds,
		isScrolling: false
	};

	const { subscribe, set, update } = writable<NavigationStore>(defaultState);

	return {
		subscribe,

		// Set active section
		setActiveSection: (sectionId: string) => {
			update((state) => ({
				...state,
				activeSection: sectionId
			}));
		},

		// Initialize section observation
		initSectionObserver: () => {
			if (!browser) return;

			// Wait for DOM to be fully loaded
			setTimeout(() => {
				// Create intersection observer
				const observer = new IntersectionObserver(
					(entries) => {
						// Only process if not manually scrolling
						update((state) => {
							if (state.isScrolling) return state;

							// Find the first section that is intersecting
							const visibleEntry = entries.find((entry) => entry.isIntersecting);

							if (visibleEntry && visibleEntry.target.id) {
								return {
									...state,
									activeSection: visibleEntry.target.id
								};
							}

							return state;
						});
					},
					{
						threshold: 0.3, // Section is considered visible when 30% is visible
						rootMargin: `-${browser ? parseInt(document.documentElement.style.getPropertyValue('--navbar-height') || '64', 10) : 64}px 0px 0px 0px`
					}
				);

				// Observe all sections
				sectionIds.forEach((sectionId) => {
					const section = document.getElementById(sectionId);
					if (section) observer.observe(section);
				});

				// Return cleanup function
				return () => {
					sectionIds.forEach((sectionId) => {
						const section = document.getElementById(sectionId);
						if (section) observer.unobserve(section);
					});
				};
			}, 300); // Small delay to ensure DOM is ready
		},

		// Smooth scroll to section
		scrollToSection: (sectionId: string) => {
			if (!browser) return;

			const section = document.getElementById(sectionId);
			if (!section) return;

			// Mark as manually scrolling to prevent observer interference
			update((state) => ({ ...state, isScrolling: true }));

			// Get navbar height for offset
			const navbarHeight = parseInt(
				document.documentElement.style.getPropertyValue('--navbar-height') || '64',
				10
			);

			// Calculate position with offset
			const top = section.getBoundingClientRect().top + window.scrollY - navbarHeight;

			// Smooth scroll
			window.scrollTo({
				top,
				behavior: 'smooth'
			});

			// Update active section immediately for UI feedback
			update((state) => ({ ...state, activeSection: sectionId }));

			// Update URL hash without causing additional scroll
			const updateUrlHash = () => {
				if (history.pushState) {
					history.pushState(null, null, `#${sectionId}`);
				} else {
					const scrollPosition = window.scrollY;
					window.location.hash = sectionId;
					window.scrollTo(0, scrollPosition);
				}
			};

			setTimeout(updateUrlHash, 50);

			// Reset scrolling flag after animation completes
			setTimeout(() => {
				update((state) => ({ ...state, isScrolling: false }));
			}, 1000); // Typical scroll animation duration
		},

		// Handle initial hash navigation on page load
		handleInitialHash: () => {
			if (!browser) return;

			setTimeout(() => {
				// If URL has a hash, scroll to that section
				const hash = window.location.hash.substring(1);
				if (hash && sectionIds.includes(hash)) {
					// Use setTimeout to ensure DOM is ready
					setTimeout(() => {
						const section = document.getElementById(hash);
						if (section) {
							// Get navbar height for offset
							const navbarHeight = parseInt(
								document.documentElement.style.getPropertyValue('--navbar-height') || '64',
								10
							);

							// Calculate position
							const top = section.getBoundingClientRect().top + window.scrollY - navbarHeight;

							// Scroll without animation for initial load
							window.scrollTo({
								top,
								behavior: 'auto'
							});

							// Update active section
							update((state) => ({ ...state, activeSection: hash }));
						}
					}, 100);
				}
			}, 200);
		},

		// Reset to default state
		reset: () => set(defaultState)
	};
}

// Create and export the navigation store
export const navigationStore = createNavigationStore();

// Create a derived store that includes section configurations
export const navSections = derived(navigationStore, ($navigationStore) => {
	// Get nav sections from config
	const navSectionConfigs = getNavSections();

	// Enhance with active state
	return navSectionConfigs.map((section) => ({
		...section,
		isActive: section.id === $navigationStore.activeSection
	}));
});

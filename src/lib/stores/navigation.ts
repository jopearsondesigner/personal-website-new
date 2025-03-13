// src/lib/stores/navigation.ts
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

interface NavigationStore {
	activeSection: string;
	sections: string[];
	isScrolling: boolean;
}

function createNavigationStore() {
	// Default navigation state
	const defaultState: NavigationStore = {
		activeSection: 'hero',
		sections: ['hero', 'about', 'work', 'contact'],
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
				const sections = defaultState.sections;

				// Create intersection observer
				const observer = new IntersectionObserver(
					(entries) => {
						// Only process if not manually scrolling
						update((state) => {
							if (state.isScrolling) return state;

							// Find the first section that is visible
							const visibleSection = entries.find((entry) => entry.isIntersecting);

							if (visibleSection && visibleSection.target.id) {
								return {
									...state,
									activeSection: visibleSection.target.id
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
				sections.forEach((sectionId) => {
					const section = document.getElementById(sectionId);
					if (section) observer.observe(section);
				});

				// Cleanup function (to be called when app is destroyed)
				return () => {
					sections.forEach((sectionId) => {
						const section = document.getElementById(sectionId);
						if (section) observer.unobserve(section);
					});
				};
			}, 500); // Small delay to ensure DOM is ready
		},

		// Smooth scroll to section
		scrollToSection: (sectionId: string) => {
			if (!browser) return;

			const section = document.getElementById(sectionId);
			if (!section) return;

			// Mark as manually scrolling
			update((state) => ({ ...state, isScrolling: true }));

			// Get navbar height for offset
			const navbarHeight = parseInt(
				document.documentElement.style.getPropertyValue('--navbar-height') || '64',
				10
			);

			// Calculate position
			const top = section.getBoundingClientRect().top + window.scrollY - navbarHeight;

			// Smooth scroll
			window.scrollTo({
				top,
				behavior: 'smooth'
			});

			// Update active section
			update((state) => ({ ...state, activeSection: sectionId }));

			// Update URL hash
			if (history.pushState) {
				history.pushState(null, null, `#${sectionId}`);
			} else {
				window.location.hash = sectionId;
			}

			// Reset scrolling flag after animation completes
			setTimeout(() => {
				update((state) => ({ ...state, isScrolling: false }));
			}, 1000); // Typical scroll animation duration
		},

		// Reset to default state
		reset: () => set(defaultState)
	};
}

// Create and export the navigation store
export const navigationStore = createNavigationStore();

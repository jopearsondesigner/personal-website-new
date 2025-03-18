// File: src/lib/stores/navigation.ts

import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { base } from '$app/paths'; // Import the base path

// Define the section type
export interface Section {
	id: string;
	title: string;
	isActive: boolean;
}

// Create the store for navigation sections
export const navSections = writable<Section[]>([
	{ id: 'hero', title: 'Home', isActive: false },
	{ id: 'about', title: 'About', isActive: false },
	{ id: 'projects', title: 'Work', isActive: false },
	{ id: 'contact', title: 'Contact', isActive: false }
]);

// Navigation store with methods for managing navigation
function createNavigationStore() {
	let observer: IntersectionObserver | null = null;

	return {
		// Set the active section in the store
		setActiveSection(sectionId: string) {
			navSections.update((sections) => {
				return sections.map((section) => ({
					...section,
					isActive: section.id === sectionId
				}));
			});
		},

		// Initialize the IntersectionObserver for tracking sections
		initSectionObserver() {
			if (!browser) return null;

			// Clean up any existing observer
			if (observer) {
				observer.disconnect();
			}

			// Create a new IntersectionObserver
			observer = new IntersectionObserver(
				(entries) => {
					// Find the most visible section
					const visibleSection = entries
						.filter((entry) => entry.isIntersecting)
						.reduce(
							(prev, current) => {
								return !prev || current.intersectionRatio > prev.intersectionRatio ? current : prev;
							},
							null as IntersectionObserverEntry | null
						);

					if (visibleSection && visibleSection.target.id) {
						this.setActiveSection(visibleSection.target.id);

						// Update URL hash using History API to avoid page jump
						if (history.pushState) {
							// Use base path consistently
							const basePath = base || '';
							const newUrl = `${basePath}/${window.location.search}#${visibleSection.target.id}`;
							history.replaceState(null, '', newUrl);
						}
					}
				},
				{
					rootMargin: '-100px 0px -50% 0px',
					threshold: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]
				}
			);

			// Observe all sections
			const sections = document.querySelectorAll('section[id]');
			sections.forEach((section) => {
				observer.observe(section);
			});

			// Return cleanup function
			return () => {
				if (observer) {
					observer.disconnect();
					observer = null;
				}
			};
		},

		// Handle initial hash navigation
		handleInitialHash() {
			if (!browser) return;

			// Get the hash from the URL
			const hash = window.location.hash.substring(1);

			if (hash) {
				// Small delay to ensure DOM is ready
				setTimeout(() => {
					this.scrollToSection(hash);
				}, 100);
			}
		},

		// Scroll to a specific section
		scrollToSection(sectionId: string) {
			if (!browser) return;

			const section = document.getElementById(sectionId);

			if (section) {
				// Get navbar height for offset
				const navbarHeight = parseInt(
					document.documentElement.style.getPropertyValue('--navbar-height') || '64',
					10
				);

				// Calculate position with offset
				const top = section.getBoundingClientRect().top + window.scrollY - navbarHeight;

				// Update active section in store
				this.setActiveSection(sectionId);

				// Update URL hash without jumping (using history API)
				if (history.pushState) {
					// Make sure to use base path consistently and avoid duplicates
					const basePath = base || '';
					const currentPath = window.location.pathname;

					// Only include base path if not already in the current path
					let newPath;
					if (currentPath.startsWith(basePath)) {
						newPath = `${currentPath}#${sectionId}`;
					} else {
						newPath = `${basePath}/#${sectionId}`;
					}

					history.pushState(null, null, newPath);
				}

				// Smooth scroll
				window.scrollTo({
					top,
					behavior: 'smooth'
				});
			} else {
				console.warn(`Section with ID '${sectionId}' not found`);
			}
		}
	};
}

export const navigationStore = createNavigationStore();

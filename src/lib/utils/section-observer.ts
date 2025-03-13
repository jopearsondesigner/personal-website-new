// src/lib/utils/section-observer.ts
import { onMount } from 'svelte';
import { writable, type Writable } from 'svelte/store';

interface SectionObserverOptions {
	threshold?: number;
	rootMargin?: string;
	once?: boolean;
	delay?: number;
}

/**
 * Creates a section visibility observer with a store that tracks visibility
 *
 * @param options Configuration options for the observer
 * @returns An object with the visibility store and actions
 */
export function createSectionObserver(options: SectionObserverOptions = {}) {
	const { threshold = 0.2, rootMargin = '0px', once = true, delay = 0 } = options;

	// Create a writable store for the visibility state
	const visible: Writable<boolean> = writable(false);

	// Function to initialize the observer when the component mounts
	function observe(node: HTMLElement) {
		let observer: IntersectionObserver;

		onMount(() => {
			// Use setTimeout to allow for custom delay
			setTimeout(() => {
				observer = new IntersectionObserver(
					(entries) => {
						if (entries[0].isIntersecting) {
							visible.set(true);

							// If once is true, disconnect after first intersection
							if (once) {
								observer.disconnect();
							}
						} else if (!once) {
							// If not "once" mode, toggle off when not visible
							visible.set(false);
						}
					},
					{ threshold, rootMargin }
				);

				observer.observe(node);
			}, delay);

			return () => {
				if (observer) {
					observer.disconnect();
				}
			};
		});

		return {
			destroy() {
				if (observer) {
					observer.disconnect();
				}
			}
		};
	}

	// Function to manually set the visibility
	function setVisible(value: boolean) {
		visible.set(value);
	}

	return {
		visible,
		observe,
		setVisible
	};
}

/**
 * Svelte action to observe section visibility
 *
 * @param node The HTML element to observe
 * @param options Configuration options
 * @returns The observer cleanup functions
 */
export function observeSection(
	node: HTMLElement,
	options: SectionObserverOptions & { store: Writable<boolean> }
) {
	const { store, threshold = 0.2, rootMargin = '0px', once = true } = options;

	let observer: IntersectionObserver;

	// Create the observer
	observer = new IntersectionObserver(
		(entries) => {
			if (entries[0].isIntersecting) {
				store.set(true);

				if (once) {
					observer.disconnect();
				}
			} else if (!once) {
				store.set(false);
			}
		},
		{ threshold, rootMargin }
	);

	// Start observing
	observer.observe(node);

	return {
		update(newOptions: SectionObserverOptions & { store: Writable<boolean> }) {
			// Clean up existing observer
			observer.disconnect();

			// Update options
			const { store, threshold = 0.2, rootMargin = '0px', once = true } = newOptions;

			// Create new observer with updated options
			observer = new IntersectionObserver(
				(entries) => {
					if (entries[0].isIntersecting) {
						store.set(true);

						if (once) {
							observer.disconnect();
						}
					} else if (!once) {
						store.set(false);
					}
				},
				{ threshold, rootMargin }
			);

			// Start observing again
			observer.observe(node);
		},
		destroy() {
			if (observer) {
				observer.disconnect();
			}
		}
	};
}

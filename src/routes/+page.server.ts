// src/routes/+page.server.ts
import type { PageServerLoad } from './$types';
import { getAllSections } from '$lib/config/sections';

export const load: PageServerLoad = async ({ locals }) => {
	// Get device info from event.locals
	const { deviceInfo } = locals;

	// Get all sections by name rather than component references
	const orderedSections = [
		{ id: 'hero', name: 'Hero' },
		{ id: 'about', name: 'About' },
		{ id: 'work', name: 'Work' },
		{ id: 'contact', name: 'Contact' }
	];

	// Filter or modify sections based on device capabilities if needed
	const optimizedSections = optimizeSectionsForDevice(orderedSections, deviceInfo);

	return {
		sections: optimizedSections,
		projects: [
			{ title: 'Project 1', description: 'Description of Project 1', link: '/projects/project-1' },
			{ title: 'Project 2', description: 'Description of Project 2', link: '/projects/project-2' }
		]
	};
};

// Optimize sections based on device capabilities
function optimizeSectionsForDevice(sections, deviceInfo) {
	// Clone the sections to avoid mutating the original
	const optimized = structuredClone(sections);

	// Lower-end devices: Consider removing or simplifying complex animations
	if (deviceInfo.tier === 'low') {
		// Example: For each section, set a flag to use simplified animations
		return optimized.map((section) => ({
			...section,
			useSimplifiedAnimations: true,
			reducedParticles: true,
			// Reduce initial animation complexity
			initialAnimationComplexity: 'minimal'
		}));
	}

	// Medium tier devices: Moderate optimizations
	if (deviceInfo.tier === 'medium') {
		return optimized.map((section) => ({
			...section,
			useSimplifiedAnimations: false,
			reducedParticles: true,
			// Moderate initial animation complexity
			initialAnimationComplexity: 'reduced'
		}));
	}

	// High tier devices: Full experience
	return optimized.map((section) => ({
		...section,
		useSimplifiedAnimations: false,
		reducedParticles: false,
		initialAnimationComplexity: 'full'
	}));
}

// Enable prerendering for production
export const prerender = true;

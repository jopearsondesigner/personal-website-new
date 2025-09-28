// src/routes/projects/[slug]/+page.ts
import type { PageLoad } from './$types';
import projects from '$lib/data/projects.json';

/**
 * Provide the list of all concrete project paths so SvelteKit
 * knows which /projects/[slug] pages to prerender at build time.
 */
export const entries = () => projects.map((p) => `/projects/${p.slug}`);

/**
 * load() finds the specific project by slug and passes it to the page.
 */
export const load: PageLoad = ({ params }) => {
	const project = projects.find((p) => p.slug === params.slug);

	if (!project) {
		throw new Error(`Project not found: ${params.slug}`);
	}

	return { project };
};
// src/routes/projects/[slug]/+page.ts
import type { PageLoad } from './$types';
import projects from '$lib/data/projects.json';

export const load: PageLoad = ({ params }) => {
	const project = projects.find((p) => p.slug === params.slug);

	if (!project) {
		throw new Error(`Project not found: ${params.slug}`);
	}

	return { project };
};

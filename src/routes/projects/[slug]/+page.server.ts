import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { projects } from '$lib/data/projects';

export const load: PageServerLoad = async ({ params }) => {
	const project = projects[params.slug];

	if (!project) {
		throw error(404, 'Project not found');
	}

	return {
		project
	};
};

export const prerender = false;

import { error } from '@sveltejs/kit';

export const prerender = true; // Enable prerendering for this route

export async function load({ params }: { params: { slug: string } }) {
	const projects: { [key: string]: { title: string; description: string } } = {
		'project-1': { title: 'Project 1', description: 'Detailed description of Project 1' },
		'project-2': { title: 'Project 2', description: 'Detailed description of Project 2' }
	};

	if (params.slug in projects) {
		return { project: projects[params.slug] };
	}

	throw error(404, {
		message: 'Project not found'
	});
}

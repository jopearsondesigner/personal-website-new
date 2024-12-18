// src/routes/blog/[slug]/+page.server.ts
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

interface BlogPost {
	id: string;
	title: string;
	content: string;
	date: string;
}

export const load: PageServerLoad = async ({ params }) => {
	// This will be replaced with your actual blog data source
	const posts: Record<string, BlogPost> = {
		'first-post': {
			id: 'first-post',
			title: 'My First Blog Post',
			content: 'This is the full content of my first blog post.',
			date: '2024-03-18'
		}
	};

	const post = posts[params.slug];

	if (!post) {
		throw error(404, 'Blog post not found');
	}

	return {
		post
	};
};

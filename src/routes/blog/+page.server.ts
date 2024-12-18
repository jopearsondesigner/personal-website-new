// src/routes/blog/+page.server.ts
import type { PageServerLoad } from './$types';

interface BlogPost {
	id: string;
	title: string;
	description: string;
	date: string;
	// Add other blog post properties as needed
}

export const load: PageServerLoad = async () => {
	// This will be replaced with your actual blog data source
	const posts: BlogPost[] = [
		{
			id: 'first-post',
			title: 'My First Blog Post',
			description: 'This is my first blog post description',
			date: '2024-03-18'
		}
		// Add more posts
	];

	return {
		posts
	};
};

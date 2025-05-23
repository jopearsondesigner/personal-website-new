// DO NOT REMOVE THIS COMMENT
// /src/lib/data/blog.ts
// DO NOT REMOVE THIS COMMENT
export interface BlogPost {
	id: string;
	title: string;
	description: string;
	content: string;
	date: string;
}

export const blogPosts: Record<string, BlogPost> = {
	'first-post': {
		id: 'first-post',
		title: 'My First Blog Post',
		description: 'This is my first blog post description',
		content: 'This is the full content of my first blog post.',
		date: '2024-03-18'
	}
	// Add more posts
};

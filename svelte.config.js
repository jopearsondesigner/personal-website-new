import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: '404.html',
			precompress: false,
			strict: true
		}),
		alias: {
			$lib: 'src/lib',
			$components: 'src/lib/components'
		},
		paths: {
			base: process.env.NODE_ENV === 'production' ? '/personal-website-new' : ''
		},
		prerender: {
			entries: ['/', '/projects', '/projects/project-1', '/projects/project-2'],
			handleHttpError: ({ path, referrer, message }) => {
				if (message.includes('404')) {
					return;
				}
				throw new Error(message);
			}
		}
	},
	preprocess: vitePreprocess()
};

export default config;

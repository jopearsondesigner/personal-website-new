import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// Adapter configuration
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: '404.html',
			precompress: false,
			strict: true
		}),

		// Path aliases should be here at the kit level
		alias: {
			$lib: 'src/lib',
			$components: 'src/lib/components'
		},

		// Base path for GitHub Pages
		paths: {
			base: process.env.NODE_ENV === 'production' ? '/personal-website-new' : ''
		},

		// Prerender configuration
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
	preprocess: vitePreprocess() // You were missing this
};

export default config;

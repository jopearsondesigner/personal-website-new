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
			// Remove the assets configuration since we're handling static assets differently
			// assets: process.env.NODE_ENV === 'production' ? '/personal-website-new' : ''
		},
		prerender: {
			handleHttpError: 'warn'
		}
	},
	preprocess: vitePreprocess()
};

export default config;

import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte'],

	// Consult https://github.com/sveltejs/svelte-preprocess
	// for more information about preprocessors
	preprocess: [vitePreprocess()],
	vitePlugin: {
		inspector: {
			holdMode: true
		}
	},
	kit: {
		adapter: adapter(),

		alias: {
			$src: 'src/',
			$lib: 'src/lib',
			$components: 'src/lib/components'
		}
	}
};

export default config;

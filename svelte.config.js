import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const dev = process.argv.includes('dev');

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
                        base: dev ? '' : '/personal-website-new',
                        assets: dev ? '' : 'https://jopearsondesigner.github.io/personal-website-new'
                },
                prerender: {
                        handleHttpError: 'warn',
                        handleMissingId: 'ignore'
                }
        },
        preprocess: vitePreprocess()
};

export default config;

import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		fs: {
			strict: false
		},
		// Optimize file watching for better performance
		watch: {
			usePolling: false,
			interval: 100,
			// Ignore large directories that don't need watching
			ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/.svelte-kit/**']
		},
		// Reduce memory usage during development
		hmr: {
			overlay: false // Disable error overlay if it causes issues
		}
	},
	build: {
		// Improve build performance
		rollupOptions: {
			output: {
				manualChunks: undefined // Let Vite handle chunking automatically
			}
		}
	},
	// Optimize dependency pre-bundling
	optimizeDeps: {
		include: ['@sveltejs/kit', 'svelte']
	}
});

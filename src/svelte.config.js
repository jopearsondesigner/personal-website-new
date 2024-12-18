import { vitePreprocess } from "@sveltejs/kit/vite";
import adapter from "@sveltejs/adapter-vercel"; // Or replace with your preferred adapter

export default {
  kit: {
    adapter: adapter(),
    alias: {
      $components: "./src/components",
      $lib: "./src/lib",
    },
  },
  preprocess: vitePreprocess(),
};

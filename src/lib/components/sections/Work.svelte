<!-- src/lib/components/sections/Work.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import ProjectCard from '$lib/components/ui/ProjectCard.svelte';

	// For intersection observer animation
	let sectionVisible = false;
	let sectionElement: HTMLElement;

	// Sample projects data
	const projects = [
		{
			title: 'Arcade Portfolio',
			description: 'A retro arcade-themed portfolio website built with SvelteKit.',
			image: '/images/projects/arcade-portfolio.webp',
			tags: ['SvelteKit', 'GSAP', 'Responsive'],
			link: '/projects/arcade-portfolio'
		},
		{
			title: 'E-Commerce Platform',
			description: 'Modern e-commerce site with cart functionality and payment processing.',
			image: '/images/projects/ecommerce.webp',
			tags: ['SvelteKit', 'Stripe', 'TailwindCSS'],
			link: '/projects/ecommerce'
		},
		{
			title: 'Game Dashboard',
			description: 'Interactive dashboard for tracking player statistics and achievements.',
			image: '/images/projects/game-dashboard.webp',
			tags: ['SvelteKit', 'D3.js', 'WebSockets'],
			link: '/projects/game-dashboard'
		}
	];

	onMount(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					sectionVisible = true;
					observer.disconnect(); // Only animate once
				}
			},
			{ threshold: 0.2 }
		);

		if (sectionElement) {
			observer.observe(sectionElement);
		}

		return () => {
			observer.disconnect();
		};
	});
</script>

<section id="work" class="section work-section">
	<div class="container mx-auto px-4">
		{#if sectionVisible}
			<div in:fly={{ y: 50, duration: 800, delay: 200, easing: backOut }}>
				<h2
					class="text-3xl md:text-4xl font-press-start text-arcadeBlack-500 dark:text-arcadeWhite-200 mb-8"
				>
					Work
				</h2>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each projects as project, i}
					<div in:fly={{ y: 50, duration: 600, delay: 400 + i * 150, easing: backOut }}>
						<ProjectCard {...project} />
					</div>
				{/each}
			</div>

			<div class="text-center mt-12" in:fade={{ delay: 1200, duration: 500 }}>
				<a
					href="/projects"
					class="inline-flex items-center px-6 py-3 bg-arcadeBlack-500 dark:bg-arcadeBlack-700
					text-arcadeWhite-200 rounded-lg shadow-md hover:shadow-lg
					transform transition-all duration-300 hover:scale-105
					border border-arcadeNeonGreen-500/30 hover:border-arcadeNeonGreen-500
					hover:bg-arcadeBlack-600"
				>
					<span class="mr-2">View All Projects</span>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fill-rule="evenodd"
							d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
							clip-rule="evenodd"
						/>
					</svg>
				</a>
			</div>
		{/if}
	</div>
</section>

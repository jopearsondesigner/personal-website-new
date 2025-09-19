<!-- src/lib/components/sections/Work.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { gsap } from 'gsap';
	import ProjectCard from '$lib/components/ui/ProjectCard.svelte';

	// Categories
	const categories = ['Digital Products', 'Branding & Visual Design', 'UX Strategy'];
	let activeCategory = categories[0];

	// Project data
	import projectsData from '$lib/data/projects.json';
	let filteredProjects = [];

	// Filter projects by category
	const filterProjects = () => {
		filteredProjects = projectsData.filter((p) => p.category === activeCategory);
	};

	onMount(() => {
		filterProjects();
	});

	// Handle category switch
	function selectCategory(category: string) {
		activeCategory = category;
		filterProjects();

		// GSAP arcade-style transition
		gsap.fromTo(
			'.project-card',
			{ opacity: 0, y: 30 },
			{ opacity: 1, y: 0, stagger: 0.1, duration: 0.6, ease: 'back.out(1.7)' }
		);
	}
</script>

<section id="work" class="py-16 bg-arcadeBlack-900 text-arcadeWhite-100">
	<div class="container mx-auto px-4 text-center">
		<h2 class="text-4xl font-press-start mb-8">Choose Your Mission</h2>

		<!-- Category Selector -->
		<div class="flex justify-center gap-4 mb-10">
			{#each categories as category}
				<button
					on:click={() => selectCategory(category)}
					class={`px-6 py-3 rounded-lg text-lg font-bold transition-all duration-300
						${
							activeCategory === category
								? 'bg-arcadeNeonGreen-600 shadow-lg scale-105'
								: 'bg-arcadeBlack-700 hover:bg-arcadeBlack-600'
						}`}
				>
					{category}
				</button>
			{/each}
		</div>

		<!-- Project Grid -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
			{#each filteredProjects as project (project.title)}
				<ProjectCard {...project} class="project-card" />
			{/each}
		</div>
	</div>
</section>

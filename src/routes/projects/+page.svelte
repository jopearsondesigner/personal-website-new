<script lang="ts">
	import projects from '$lib/data/projects.json';
	import ProjectCard from '$lib/components/ui/ProjectCard.svelte';
</script>

<section class="container mx-auto px-4 py-16">
	<h1 class="text-4xl font-press-start text-center mb-12">All Projects</h1>
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
		{#each projects as project}
			<ProjectCard {...project} />
		{/each}
	</div>
</section>

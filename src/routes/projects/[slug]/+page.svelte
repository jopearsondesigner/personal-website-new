<script lang="ts">
	import type { PageData } from './$types';
	export let data: PageData;

	const { project } = data;
</script>

<section class="container mx-auto px-4 py-16">
	<!-- Back Button -->
	<a
		href="/projects"
		class="inline-flex items-center text-arcadeNeonGreen-400 hover:text-arcadeNeonGreen-300 mb-6"
	>
		← Back to Projects
	</a>

	<!-- Project Header -->
	<div class="text-center mb-12">
		<h1 class="text-4xl font-press-start text-arcadeWhite-200 mb-4">
			{project.title}
		</h1>
		<p class="text-arcadeWhite-400 max-w-2xl mx-auto">
			{project.description}
		</p>
	</div>

	<!-- Project Hero Image -->
	<div class="relative rounded-xl overflow-hidden shadow-lg max-w-4xl mx-auto">
		<img src={project.image} alt={project.title} class="w-full object-cover" loading="lazy" />
		<div
			class="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/40 to-transparent"
		></div>
	</div>

	<!-- Project Tags -->
	{#if project.tags}
		<div class="flex flex-wrap justify-center gap-2 mt-6">
			{#each project.tags as tag}
				<span class="px-3 py-1 rounded-md text-sm bg-arcadeBlack-800 text-arcadeWhite-300">
					{tag}
				</span>
			{/each}
		</div>
	{/if}

	<!-- Metrics -->
	{#if project.metricLabel && project.metricValue}
		<div class="mt-6 text-center">
			<span class="text-arcadeWhite-400 text-sm uppercase tracking-wider">
				{project.metricLabel}:
			</span>
			<span class="ml-2 text-arcadeNeonGreen-300 font-bold">
				{project.metricValue}
			</span>
		</div>
	{/if}

	<!-- Project Body -->
	<div class="mt-12 max-w-3xl mx-auto text-arcadeWhite-300 leading-relaxed space-y-6">
		<p>
			This section is where you provide an in-depth case study: problem → process → solution →
			results.
		</p>
		<p>
			Include images, diagrams, wireframes, or even code snippets to show your role and impact on
			the project.
		</p>
	</div>
</section>

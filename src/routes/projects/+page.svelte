<script lang="ts">
	const projects = [
		{ slug: 'project-1', title: 'Project 1', description: 'Description of Project 1' },
		{ slug: 'project-2', title: 'Project 2', description: 'Description of Project 2' }
	];
</script>

<div class="bg-darkModeBg text-arcadeWhite min-h-screen p-4 md:p-8">
	<div class="container mx-auto">
		<h1 class="text-4xl font-arcade text-arcadeRed mb-8">Projects</h1>
		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each projects as project}
				<a
					href="/projects/{project.slug}"
					class="block p-6 bg-arcadeBlack-800 rounded-lg hover:bg-arcadeBlack-700 transition-colors"
				>
					<h2 class="text-2xl font-arcade mb-2">{project.title}</h2>
					<p class="text-arcadeWhite-300">{project.description}</p>
				</a>
			{/each}
		</div>
	</div>
</div>

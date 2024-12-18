<!-- src/routes/blog/+page.svelte -->
<script lang="ts">
	export let data;
</script>

<div class="bg-darkModeBg text-arcadeWhite min-h-screen p-4 md:p-8">
	<div class="container mx-auto">
		<h1 class="text-4xl font-arcade text-arcadeRed">Blog</h1>
		<div class="mt-8 grid gap-6">
			{#each data.posts as post}
				<article class="p-6 bg-gray-800 rounded-lg">
					<h2 class="text-2xl font-arcade">{post.title}</h2>
					<p class="text-gray-400 mt-2">{post.date}</p>
					<p class="mt-4">{post.description}</p>
					<a
						href={`/blog/${post.id}`}
						class="mt-4 inline-block p-2 bg-arcadeRed text-arcadeWhite rounded hover:bg-red-700"
					>
						Read more
					</a>
				</article>
			{/each}
		</div>
	</div>
</div>

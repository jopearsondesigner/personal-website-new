<!-- src/routes/blog/[slug]/+page.svelte -->
<script lang="ts">
	export let data;
</script>

<div class="bg-darkModeBg text-arcadeWhite min-h-screen p-4 md:p-8">
	<div class="container mx-auto">
		<h1 class="text-4xl font-arcade text-arcadeRed">{data.post.title}</h1>
		<p class="text-gray-400 mt-2">{data.post.date}</p>
		<div class="mt-8 prose prose-invert max-w-none">
			{data.post.content}
		</div>
		<div class="mt-8">
			<a href="/blog" class="p-2 bg-arcadeRed text-arcadeWhite rounded hover:bg-red-700">
				Back to Blog
			</a>
		</div>
	</div>
</div>

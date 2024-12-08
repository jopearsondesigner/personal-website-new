<script>
	export let data;
</script>

<div class="bg-darkModeBg text-arcadeWhite min-h-screen p-4 md:p-8">
	<div class="container mx-auto">
		<h1 class="text-4xl font-arcade text-arcadeRed">{data.project.title}</h1>
		<p class="mt-4 text-lg">{data.project.description}</p>
		<div class="mt-8">
			<a href="/" class="p-2 bg-arcadeRed text-arcadeWhite rounded hover:bg-red-700">Back to Home</a
			>
		</div>
	</div>
</div>

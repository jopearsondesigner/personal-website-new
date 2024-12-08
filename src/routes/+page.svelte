<script lang="ts">
	import { onMount } from 'svelte';
	import Hero from '$lib/components/Hero.svelte';

	onMount(() => {
		window.addEventListener('resize', () => {
			// Handle window resize event
		});
	});
</script>

<svelte:head>
	<link
		href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400;500;600;700&family=VT323&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div
	class="min-h-screen bg-background dark:bg-background-dark text-[color:var(--arcade-black-500)] dark:text-[color:var(--arcade-white-200)]"
>
	<div class="container-fluid">
		<!-- Hero Component -->
		<Hero />

		<!-- About Section -->
		<section id="about" class="mt-12">
			<h2 class="text-3xl md:text-4xl font-press-start">About Me</h2>
			<p class="mt-4 text-lg md:text-2xl">
				I'm Jo Pearson, a designer and developer passionate about merging creativity and technology.
			</p>
		</section>

		<!-- Work Section -->
		<section id="work" class="mt-12">
			<h2 class="text-3xl md:text-4xl font-press-start">Work</h2>
			<p class="mt-4 text-lg md:text-2xl">Here are some of my projects.</p>
		</section>

		<!-- Contact Section -->
		<section id="contact" class="mt-12">
			<h2 class="text-3xl md:text-4xl font-press-start">Contact</h2>
			<p class="mt-4 text-lg md:text-2xl">Let's get in touch.</p>
		</section>
	</div>
</div>

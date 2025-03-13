<!-- src/lib/components/ui/ProjectCard.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';

	export let title: string;
	export let description: string;
	export let image: string = '/images/placeholder.webp'; // Default placeholder
	export let tags: string[] = [];
	export let link: string = '#';

	let isHovered = false;
	let cardElement: HTMLElement;

	// Function to handle custom hover effects
	function handleMouseMove(event: MouseEvent) {
		if (!cardElement) return;

		const rect = cardElement.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;

		// Calculate the percentage of the mouse position relative to the card dimensions
		const xPercent = Math.floor((x / rect.width) * 100);
		const yPercent = Math.floor((y / rect.height) * 100);

		// Apply a subtle tilt effect
		const xDeg = (xPercent - 50) * 0.04; // -2 to 2 degrees
		const yDeg = (yPercent - 50) * -0.04; // -2 to 2 degrees

		cardElement.style.transform = `perspective(1000px) rotateY(${xDeg}deg) rotateX(${yDeg}deg) scale3d(1.02, 1.02, 1.02)`;
		cardElement.style.background = `radial-gradient(circle at ${xPercent}% ${yPercent}%, rgba(39, 255, 153, 0.1), transparent 50%)`;
	}

	function handleMouseLeave() {
		if (!cardElement) return;

		cardElement.style.transform =
			'perspective(1000px) rotateY(0deg) rotateX(0deg) scale3d(1, 1, 1)';
		cardElement.style.background = '';
		isHovered = false;
	}

	function handleMouseEnter() {
		isHovered = true;
	}
</script>

<div
	class="project-card relative overflow-hidden rounded-lg border border-arcadeBlack-200/20 dark:border-arcadeBlack-600/40
	shadow-lg transition-all duration-300"
	bind:this={cardElement}
	on:mouseenter={handleMouseEnter}
	on:mouseleave={handleMouseLeave}
	on:mousemove={handleMouseMove}
>
	<a {href} class="block h-full">
		<!-- Image Container with Overlay -->
		<div class="relative aspect-video overflow-hidden">
			<!-- Placeholder if no image is provided -->
			<div class="absolute inset-0 bg-arcadeBlack-600/30"></div>

			<!-- Background Image -->
			<div
				class="absolute inset-0 bg-cover bg-center transition-transform duration-700"
				style="background-image: url({image}); transform: scale({isHovered ? 1.05 : 1});"
			></div>

			<!-- Scanline Effect -->
			<div
				class="absolute inset-0 bg-repeat-y pointer-events-none opacity-20"
				style="background-image: linear-gradient(to bottom, transparent, transparent 50%, rgba(0, 0, 0, 0.5) 50%, rgba(0, 0, 0, 0.5)); background-size: 100% 4px;"
			></div>

			<!-- Noise Texture for CRT Effect -->
			<div
				class="absolute inset-0 opacity-5 mix-blend-overlay"
				style="
				background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIwLjA1Ii8+PC9zdmc+');
			"
			></div>

			<!-- Title Overlay -->
			<div
				class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-arcadeBlack-900/80 to-transparent pt-10 pb-4 px-4"
			>
				<h3 class="text-xl text-arcadeWhite-100 font-bold">{title}</h3>
			</div>
		</div>

		<!-- Card Content -->
		<div class="p-4 bg-arcadeBlack-200/10 dark:bg-arcadeBlack-700/30">
			<p class="text-sm text-arcadeBlack-500 dark:text-arcadeWhite-200 mb-4">
				{description}
			</p>

			<!-- Tags -->
			<div class="flex flex-wrap gap-2">
				{#each tags as tag}
					<span
						class="inline-block px-2 py-1 text-xs rounded-full bg-arcadeBlack-500/10 dark:bg-arcadeBlack-500/30 text-arcadeBlack-500 dark:text-arcadeWhite-300"
					>
						{tag}
					</span>
				{/each}
			</div>
		</div>

		<!-- CRT Glow Effect on Hover -->
		{#if isHovered}
			<div
				class="absolute inset-0 pointer-events-none"
				style="
					box-shadow: 0 0 15px 2px rgba(39, 255, 153, 0.2), inset 0 0 15px 2px rgba(39, 255, 153, 0.2);
					opacity: 0.7;
					z-index: 1;
					border-radius: 0.5rem;
				"
			></div>
		{/if}
	</a>
</div>

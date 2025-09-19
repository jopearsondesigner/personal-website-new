<!-- src/lib/components/ui/ProjectCard.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';

	/*** Public props ***/
	export let slug: string; // <-- Required for dynamic URLs
	export let title: string;
	export let description: string;
	export let image: string;
	export let tags: string[] = [];
	export let link: string = '#';
	export let category: string | undefined;
	export let metricLabel: string | undefined;
	export let metricValue: string | undefined;

	// Perf flags
	export let eager: boolean = false;
	export let preload: boolean = false;

	// Local state
	let loaded = false;
	let prefersReducedMotion = false;

	onMount(() => {
		prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
	});

	function onKeyActivate(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			(e.currentTarget as HTMLAnchorElement)?.click();
			e.preventDefault();
		}
	}
</script>

<a
	href={`/projects/${slug}`}
	aria-label={`View project: ${title}`}
	on:keydown={onKeyActivate}
	class="
	  group relative block focus:outline-none
	  rounded-2xl overflow-hidden
	  ring-1 ring-arcadeNeonGreen-500/15 focus-visible:ring-arcadeNeonGreen-400
	  transition-[transform,filter,box-shadow] duration-300
	  hover:brightness-110 hover:-translate-y-1
	  bg-gradient-to-b from-arcadeBlack-700/50 to-arcadeBlack-900/60
	  shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_8px_30px_rgba(0,0,0,0.35)]
	"
>
	<!-- Border glow / CRT bezel -->
	<div
		class="
		pointer-events-none absolute inset-0
		rounded-[1.2rem]
		ring-1 ring-arcadeNeonGreen-500/10
		shadow-[0_0_0.5rem_0_rgba(0,255,180,0.15),inset_0_0_2rem_rgba(0,255,180,0.06)]
		group-hover:shadow-[0_0_1.25rem_0_rgba(0,255,200,0.35),inset_0_0_3rem_rgba(0,255,200,0.12)]
		transition-shadow duration-300
	  "
	/>

	<!-- Media -->
	<div class="relative aspect-[16/10] overflow-hidden">
		<!-- Subtle CRT mask & scanlines -->
		<div
			class="pointer-events-none absolute inset-0 mix-blend-screen opacity-[0.10] group-hover:opacity-[0.18] transition-opacity duration-300"
			style="
		  background-image:
			radial-gradient(ellipse at center, rgba(255,255,255,0.10) 0%, transparent 60%),
			repeating-linear-gradient(0deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 1px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 4px);
		"
		/>
		<!-- Curvature vignette -->
		<div
			class="pointer-events-none absolute inset-0 rounded-[1.1rem] shadow-[inset_0_0_60px_rgba(0,0,0,0.55)]"
		/>

		<!-- Skeleton while loading -->
		{#if !loaded}
			<div
				class="absolute inset-0 animate-pulse bg-gradient-to-br from-arcadeBlack-700 to-arcadeBlack-800"
			/>
		{/if}

		<!-- Picture: AVIF/WEBP with fallback -->
		<picture>
			<!-- If you export AVIF too, keep both sources; else remove avif line -->
			<source srcset={image.replace(/\.[^.]+$/, '.avif')} type="image/avif" />
			<source srcset={image} type="image/webp" />
			<img
				src={image.replace('.webp', '.jpg')}
				alt={title}
				class="
			h-full w-full object-cover
			transition-transform duration-500
			will-change-transform
			group-hover:scale-[1.03]
		  "
				loading={eager ? 'eager' : 'lazy'}
				decoding="async"
				fetchpriority={preload ? 'high' : 'auto'}
				on:load={() => (loaded = true)}
			/>
		</picture>

		<!-- Top-left category pill -->
		{#if category}
			<div
				class="
			absolute left-3 top-3 select-none
			rounded-full px-2.5 py-1 text-[11px] tracking-wide uppercase
			bg-arcadeBlack-900/70 backdrop-blur-sm
			text-arcadeNeonGreen-300 ring-1 ring-arcadeNeonGreen-500/30
		  "
			>
				{category}
			</div>
		{/if}
	</div>

	<!-- Content -->
	<div class="p-4 md:p-5">
		<h3
			class="
		  font-press-start text-[15px] leading-snug
		  text-arcadeWhite-200 drop-shadow-[0_1px_0_rgba(0,0,0,0.35)]
		"
		>
			{title}
		</h3>

		<p class="mt-2 text-sm leading-relaxed text-arcadeWhite-400/90">
			{description}
		</p>

		<!-- Metric (optional) -->
		{#if metricLabel && metricValue}
			<div class="mt-3 text-[11px] uppercase tracking-wide text-arcadeWhite-300/80">
				<span class="text-arcadeWhite-400/90">{metricLabel}:</span>
				<span class="ml-1 text-arcadeNeonGreen-300">{metricValue}</span>
			</div>
		{/if}

		<!-- Tags -->
		{#if tags?.length}
			<ul class="mt-4 flex flex-wrap gap-2">
				{#each tags.slice(0, 5) as tag}
					<li
						class="
				rounded-md px-2.5 py-1 text-[11px]
				bg-arcadeBlack-700/60 text-arcadeWhite-300 ring-1 ring-arcadeNeonGreen-500/15
				group-hover:ring-arcadeNeonGreen-400/30 transition-colors
			  "
					>
						{tag}
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<!-- Bottom “power bar” accent -->
	<div
		class="
		pointer-events-none mx-4 mb-4 h-1 rounded-full
		bg-gradient-to-r from-arcadeNeonGreen-500/40 via-arcadeNeonGreen-400/70 to-arcadeNeonGreen-500/40
		opacity-60 group-hover:opacity-100 transition-opacity duration-300
	  "
		style="box-shadow: 0 0 12px rgba(0,255,200,0.35);"
	/>
</a>

<style>
	/* Optional: tiny wobble on hover for non-reduced-motion users */
	:global(.group:hover) :global(img) {
		animation: wobble 1.6s ease-in-out both;
	}
	@keyframes wobble {
		0% {
			transform: scale(1.03) translateZ(0);
		}
		50% {
			transform: scale(1.035) translateY(-0.5px);
		}
		100% {
			transform: scale(1.03) translateZ(0);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		:global(.group:hover) :global(img) {
			animation: none !important;
		}
	}
</style>

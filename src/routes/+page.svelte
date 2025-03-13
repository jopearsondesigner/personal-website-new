<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { getAllSections } from '$lib/config/sections';
	import SectionWrapper from '$lib/components/layout/SectionWrapper.svelte';
	import { navigationStore } from '$lib/stores/navigation';
	import { layoutStore } from '$lib/stores/store';

	// Get all sections in their proper order
	const orderedSections = getAllSections();

	onMount(() => {
		// Initialize section observer for scroll tracking
		const cleanup = navigationStore.initSectionObserver();

		// Handle hash navigation on initial page load
		navigationStore.handleInitialHash();

		return () => {
			// Clean up any observers when component is destroyed
			if (typeof cleanup === 'function') cleanup();
		};
	});
</script>

<svelte:head>
	<title>Jo Pearson - Creative Developer</title>
	<meta
		name="description"
		content="Arcade-themed portfolio of Jo Pearson, a creative developer specializing in interactive web experiences and UI/UX design."
	/>
</svelte:head>

<div
	class="homepage bg-background dark:bg-background-dark text-[color:var(--arcade-black-500)] dark:text-[color:var(--arcade-white-200)]"
	style="margin-top: calc(-{$layoutStore.navbarHeight}px)"
>
	<div class="container-fluid sections-container">
		{#each orderedSections as section (section.id)}
			<SectionWrapper {section} />
		{/each}
	</div>
</div>

<style>
	.homepage {
		position: relative;
		z-index: 0;
	}

	/* Optional: Add subtle section dividers if desired */
	.sections-container :global(.section-wrapper:not(:first-child)) {
		position: relative;
	}

	.sections-container :global(.section-wrapper:not(:first-child))::before {
		content: '';
		position: absolute;
		top: 0;
		left: 10%;
		right: 10%;
		height: 1px;
		background: linear-gradient(
			90deg,
			transparent 0%,
			var(--arcade-black-300, rgba(150, 150, 150, 0.2)) 50%,
			transparent 100%
		);
		opacity: 0.3;
	}

	/* Ensure dark mode support for dividers */
	:global(html.dark) .sections-container :global(.section-wrapper:not(:first-child))::before {
		background: linear-gradient(
			90deg,
			transparent 0%,
			var(--arcade-white-200, rgba(220, 220, 220, 0.2)) 50%,
			transparent 100%
		);
		opacity: 0.1;
	}
</style>

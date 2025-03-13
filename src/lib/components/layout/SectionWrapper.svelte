<!-- src/lib/components/layout/SectionWrapper.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import type { SectionConfig } from '$lib/config/sections';
	import { navigationStore } from '$lib/stores/navigation';
	import { layoutStore } from '$lib/stores/store';
	import { fade } from 'svelte/transition';

	// Props for the wrapper
	export let section: SectionConfig;
	export let animate: boolean = true;

	// Track visibility for animations
	let isVisible = !animate; // Start visible if animations disabled
	let sectionElement: HTMLElement;

	// Prepare any props to pass to the section component
	const componentProps = section.props || {};

	onMount(() => {
		if (animate) {
			// Set up intersection observer for animation
			const observer = new IntersectionObserver(
				(entries) => {
					if (entries[0].isIntersecting) {
						isVisible = true;
						observer.disconnect(); // Only animate once
					}
				},
				{ threshold: 0.2 }
			);

			if (sectionElement) {
				observer.observe(sectionElement);
			}

			return () => {
				observer.disconnect();
			};
		}
	});
</script>

<section
	id={section.id}
	class="section-wrapper relative {section.fullHeight
		? 'min-h-screen'
		: ''} py-12 md:py-16 flex flex-col justify-center"
	class:full-height={section.fullHeight}
	bind:this={sectionElement}
>
	{#if isVisible}
		<div in:fade={{ duration: 500, delay: 200 }}>
			<svelte:component this={section.component} {...componentProps} />
		</div>
	{/if}
</section>

<style>
	.section-wrapper {
		position: relative;
		overflow: hidden;
		scroll-margin-top: var(--navbar-height, 64px); /* For smooth scroll */
	}

	.full-height {
		min-height: calc(100vh - var(--navbar-height, 64px));
	}
</style>

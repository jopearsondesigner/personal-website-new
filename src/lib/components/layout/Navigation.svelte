<!-- src/lib/components/layout/Navigation.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { navSections, navigationStore } from '$lib/stores/navigation';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	// Initialize navigation observer on component mount
	onMount(() => {
		// Initialize section observer for homepage
		if ($page.url.pathname === '/') {
			navigationStore.initSectionObserver();
		}

		// Handle initial hash navigation if coming from another page
		if (browser && window.location.hash) {
			const hash = window.location.hash.substring(1);
			// Small delay to ensure DOM is ready
			setTimeout(() => {
				navigationStore.scrollToSection(hash);
			}, 100);
		}
	});

	// Handle navigation click for section scrolling
	async function handleNavClick(sectionId: string, e: MouseEvent) {
		e.preventDefault();

		// Check if we're on the homepage
		const isHomepage = $page.url.pathname === '/';

		if (isHomepage) {
			// If on homepage, just scroll to section
			navigationStore.scrollToSection(sectionId);
		} else {
			// If on another page, use SvelteKit's goto function with replaceState
			// to prevent adding to browser history
			await goto(`/#${sectionId}`, { replaceState: false });

			// After navigation completes, need to scroll to section
			// Small timeout to ensure DOM is ready after route change
			setTimeout(() => {
				navigationStore.scrollToSection(sectionId);
			}, 100);
		}
	}

	// Determine if blog is active
	$: isBlogActive = $page.url.pathname.startsWith('/blog');
</script>

<nav class="desktop-nav hidden lg:flex lg:flex-wrap lg:order-1">
	<!-- Home, About, Work, Contact sections from configuration -->
	{#each $navSections as section}
		<a
			href="/#${section.id}"
			class="nav-button"
			class:active={section.isActive && $page.url.pathname === '/'}
			on:click={(e) => handleNavClick(section.id, e)}
			aria-label="Navigate to {section.title} section"
		>
			{section.title}
		</a>
	{/each}

	<!-- Blog link as the last item -->
	<a href="/blog" class="nav-button" class:active={isBlogActive} aria-label="Navigate to Blog">
		Blog
	</a>
</nav>

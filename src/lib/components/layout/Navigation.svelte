<!-- File: src/lib/components/layout/Navigation.svelte -->

<script lang="ts">
	import { page } from '$app/stores';
	import { navSections, navigationStore } from '$lib/stores/navigation';
	import { base } from '$app/paths';
	import { tick } from 'svelte';
	import { browser } from '$app/environment';

	// Determine if we're on the homepage
	$: isHomePage = $page.url.pathname === '/' || $page.url.pathname === base + '/';

	// Function to handle navigation click
	async function handleNavClick(sectionId: string, e: MouseEvent) {
		e.preventDefault();

		if (browser) {
			if (isHomePage) {
				// We're on the homepage - scroll to section
				const navbarHeight = parseInt(
					document.documentElement.style.getPropertyValue('--navbar-height') || '64',
					10
				);

				const section = document.getElementById(sectionId);
				if (!section) return;

				const top = section.getBoundingClientRect().top + window.scrollY - navbarHeight;

				navigationStore.setActiveSection(sectionId);

				if (history.pushState) {
					history.pushState(null, '', `#${sectionId}`);
				}

				window.scrollTo({
					top,
					behavior: 'smooth'
				});
			} else {
				// We're on another page - navigate to homepage with hash
				window.location.href = `${base}/#${sectionId}`;
			}
		}
	}
</script>

<div class="hidden lg:flex items-center space-x-px">
	{#each $navSections as section (section.id)}
		<!-- Use conditional href based on current page -->
		<a
			href={isHomePage ? `#${section.id}` : `${base}/#${section.id}`}
			class="nav-button {section.isActive ? 'active' : ''}"
			on:click|preventDefault={(e) => handleNavClick(section.id, e)}
		>
			{section.title}
		</a>
	{/each}

	<a
		href="{base}/blog"
		class="nav-button {$page.url.pathname === '/blog' || $page.url.pathname === base + '/blog'
			? 'active'
			: ''}"
	>
		Blog
	</a>
</div>

<!-- File: src/lib/components/layout/NavBrand.svelte -->
<!-- Location: Update the component to include base path in links -->

<script lang="ts">
	import { base } from '$app/paths'; // Import the base path

	/**
	 * Custom NavBrand component - A simplified replacement for Flowbite's NavBrand
	 *
	 * This component creates a navigation brand link that can contain images, text, or other elements.
	 * It's designed to be a drop-in replacement for Flowbite's NavBrand component while avoiding
	 * problematic stacking contexts.
	 */

	/**
	 * The URL that the brand link should navigate to
	 * @type {string}
	 */
	export let href = '/';

	/**
	 * Optional target attribute for the anchor element
	 * @type {string}
	 */
	export let target = '';

	/**
	 * Optional rel attribute for the anchor element
	 * @type {string}
	 */
	export let rel = '';

	/**
	 * Additional custom classes
	 * @type {string}
	 */
	let className = '';
	export { className as class };

	/**
	 * Optional title attribute for the anchor element
	 * @type {string}
	 */
	export let title = '';

	/**
	 * Optional additional data attributes or props
	 * @type {Record<string, any>}
	 */
	export let data = {};

	/**
	 * Optional aria-label for accessibility
	 * @type {string}
	 */
	export let ariaLabel = '';

	// Add base path to href if it's a relative path
	$: actualHref = href.startsWith('/') ? `${base}${href}` : href;
</script>

<a
	href={actualHref}
	class="flex items-center {className}"
	{target}
	{rel}
	{title}
	{...$$restProps}
	{...data}
	aria-label={ariaLabel || 'Brand'}
>
	<slot />
</a>

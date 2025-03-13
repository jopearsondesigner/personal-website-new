<!-- src/components/NavBrand.svelte -->
<script lang="ts">
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
</script>

<a
	{href}
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

<style>
	/* Add any custom styles for the brand component here */
	a {
		display: flex;
		align-items: center;
		text-decoration: none;
		outline-offset: 2px;
	}

	/* Ensure focus styles for accessibility */
	a:focus-visible {
		outline: 2px solid currentColor;
		outline-offset: 2px;
	}
</style>

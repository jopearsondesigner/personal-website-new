<!-- File: src/lib/icons/PauseIcon.svelte -->

<script lang="ts">
	export let size = 24;
	export let color = 'currentColor';
	let className = '';
	export { className as class };
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	class={`${className}`}
>
	<rect
		x="6"
		y="4"
		width="4"
		height="16"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		fill="none"
	/>
	<rect
		x="14"
		y="4"
		width="4"
		height="16"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		fill="none"
	/>
</svg>

<style>
	/* iOS WebKit fill override */
	svg {
		fill: transparent !important;
	}

	/* Ensure paths and shapes use stroke not fill */
	svg path,
	svg rect,
	svg polygon {
		fill: none !important;
		stroke: currentColor;
	}
</style>

<!-- File: src/lib/icons/RefreshCwIcon.svelte -->
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
	stroke={color}
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	class={`icon-svg ${className}`}
>
	<path
		d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8 M21 3v5h-5 M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16 M3 21v-5h5"
		fill="none"
	/>
</svg>

<style>
	/* Global SVG fixes for iOS WebKit */
	:global(.icon-svg) {
		fill: transparent !important;
		-webkit-fill: transparent !important;
	}

	:global(.icon-svg *) {
		fill: transparent !important;
		-webkit-fill: transparent !important;
		vector-effect: non-scaling-stroke;
	}

	/* Force hardware acceleration for better rendering */
	svg {
		transform: translateZ(0);
		backface-visibility: hidden;
	}
</style>

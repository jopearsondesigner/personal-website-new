<!-- src/lib/icons/PKeyIcon.svelte -->
<script lang="ts">
	export let size = 24;
	export let color = 'currentColor';
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	class="instruction-icon"
>
	<!-- Improved Keyboard Key Background with better contrast -->
	<rect
		x="2"
		y="4"
		width="20"
		height="16"
		rx="3"
		fill="rgba(0, 0, 0, 0.6)"
		stroke={color}
		stroke-width="1.5"
	/>

	<!-- Highlight effect for 3D button appearance -->
	<path
		d="M2 7C2 5.34315 3.34315 4 5 4H19C20.6569 4 22 5.34315 22 7V7.5H2V7Z"
		fill="rgba(255, 255, 255, 0.15)"
	/>

	<!-- Shadow effect for 3D button appearance -->
	<path
		d="M2 17.5V17C2 18.6569 3.34315 20 5 20H19C20.6569 20 22 18.6569 22 17V17.5H2Z"
		fill="rgba(0, 0, 0, 0.3)"
	/>

	<!-- P Letter - improved visibility -->
	<path
		d="M9 8H14C14.5523 8 15 8.44772 15 9V12C15 12.5523 14.5523 13 14 13H9V8Z M9 13V16"
		stroke={color}
		stroke-width="2.5"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
</svg>

<!-- src/lib/icons/UpArrowIcon.svelte -->
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

	<!-- Up Arrow - improved design -->
	<path
		d="M12 7.5L7 14H17L12 7.5Z"
		fill={color}
		stroke={color}
		stroke-width="1.5"
		stroke-linejoin="round"
	/>
</svg>

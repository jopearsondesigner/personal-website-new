<!-- src/lib/icons/XKeyIcon.svelte -->
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
	stroke={color}
	class="instruction-icon"
>
	<!-- Outer key shape -->
	<rect class="st0" x="2" y="4" width="20" height="16" rx="3" ry="3" />

	<!-- X path -->
	<polygon
		class="st0"
		points="14.3 16.9 12 14.1 9.7 16.9 7.6 15.2 10.2 12 7.6 8.8 9.7 7.1 12 9.9 14.3 7.1 16.4 8.8 13.8 12 16.4 15.2 14.3 16.9"
	/>
</svg>

<!-- src/lib/icons/LeftArrowIcon.svelte -->
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
	<!-- Left arrow polygon -->
	<polygon
		class="st0"
		points="16.1 9.1 11.8 9.1 11.8 7 5.9 12 11.8 17 11.8 14.9 16.1 14.9 16.1 9.1"
	/>

	<!-- Outer rounded rectangle -->
	<rect class="st0" x="2" y="4" width="20" height="16" rx="3" ry="3" />
</svg>

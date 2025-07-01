<!-- src/lib/icons/RightArrowIcon.svelte -->
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
	<!-- Outer rectangle -->
	<rect class="st1" x="2" y="4" width="20" height="16" rx="3" ry="3" />

	<!-- Right arrow polygon -->
	<polygon
		class="st1"
		points="7.9 9.1 12.2 9.1 12.2 7 18.1 12 12.2 17 12.2 14.9 7.9 14.9 7.9 9.1"
	/>
</svg>

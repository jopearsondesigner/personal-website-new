<!-- src/lib/icons/SpaceKeyIcon.svelte -->
<script lang="ts">
	export let size = 24;
	export let color = 'currentColor';
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	width={size}
	height={size}
	viewBox="0 0 25 24"
	fill="none"
	stroke={color}
	class="instruction-icon"
>
	<!-- Outer rounded rectangle -->
	<rect class="st1" x="1" y="5" width="23" height="14" rx="3" ry="3" />

	<!-- Inner spacebar line -->
	<rect class="st0" x="3.5" y="9.5" width="18" height="5" rx="1.2" ry="1.2" />
</svg>

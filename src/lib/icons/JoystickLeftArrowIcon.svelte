<!-- src/lib/icons/JoystickInnerLeftArrowIcon.svelte -->
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
	class={className}
>
	<path
		d="M15 19L8 12L15 5"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
</svg>

<!-- src/lib/icons/JoystickInnerRightArrowIcon.svelte -->
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
		d="M9 5L16 12L9 19"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
</svg>

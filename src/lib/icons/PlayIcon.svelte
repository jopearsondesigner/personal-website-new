<!-- src/lib/icons/PlayIcon.svelte -->
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
	<!-- Play triangle with fill -->
	<polygon points="5 3 19 12 5 21 5 3" fill={color} />
</svg>

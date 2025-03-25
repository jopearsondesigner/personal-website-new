<!-- src/lib/icons/RefreshCwIcon.Icon.svelte -->
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
	<!-- Path for the top arc and arrow -->
	<path
		d="M21 8.0c-0.3-0.6-3.4-7.2-10.0-5.0c-3.2 1.0-5.5 3.3-6.5 6.5c-0.3 1.0-0.5 2.0-0.5 3.0"
		fill="none"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<!-- Top arrow filled polygon -->
	<polygon points="21,3 21,8 16,8" fill={color} />

	<!-- Path for the bottom arc and arrow -->
	<path
		d="M3 16.0c0.3 0.6 3.4 7.2 10.0 5.0c3.2-1.0 5.5-3.3 6.5-6.5c0.3-1.0 0.5-2.0 0.5-3.0"
		fill="none"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<!-- Bottom arrow filled polygon -->
	<polygon points="3,21 3,16 8,16" fill={color} />
</svg>

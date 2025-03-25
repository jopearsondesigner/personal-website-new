<!-- src/lib/icons/HeatseekerIcon.svelte -->
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
	viewBox="0 0 32 32"
	fill="none"
	class="button-icon"
>
	<path
		d="M24.8,16.2v3.5h-3.7V0h-9.8v19.7h-4v-3.5H2.3v15.8h4.9v-8.4h4v6h9.8v-6h3.7v8.4h4.9v-15.8h-4.9ZM20.1,23.6v4.9h-3.9v-6h0V1h3.9v22.5h0Z"
		fill={color}
	/>
</svg>

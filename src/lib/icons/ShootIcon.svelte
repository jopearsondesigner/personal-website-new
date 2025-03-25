<!-- src/lib/icons/ShootIcon.svelte -->
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
	class={className}
>
	<path fill={color} d="M20.6,11.4v9.1h-9.1v-9.1h9.1" />
	<path fill={color} d="M11.2,20.8v5.9h-5.9v-5.9h5.9" />
	<path fill={color} d="M26.7,5.3v5.9h-5.9v-5.9h5.9" />
	<path fill={color} d="M32,0v3.7h-3.7V0h3.7" />
	<path fill={color} d="M3.7,28.3v3.7H0v-3.7h3.7" />
	<path fill={color} d="M11.2,5.3v5.9h-5.9v-5.9h5.9" />
	<path fill={color} d="M3.7,0v3.7H0V0h3.7" />
	<path fill={color} d="M26.7,20.8v5.9h-5.9v-5.9h5.9" />
	<path fill={color} d="M32,28.3v3.7h-3.7v-3.7h3.7" />
</svg>

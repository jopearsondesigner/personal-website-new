<!-- src/lib/icons/ShootIcon.svelte -->
<script lang="ts">
	export let size = 24;
	export let color = 'currentColor';
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	width={size}
	height={size}
	viewBox="0 0 32 32"
	fill="none"
	class="button-icon"
>
	<path d="M11,20h9v-9h-9v9Z" fill={color} />
	<path d="M11,21v6h-6v-6h6" fill={color} />
	<path d="M27,5v6h-6v-6h6" fill={color} />
	<path d="M32,0v4h-4V0h4" fill={color} />
	<path d="M4,28v4H0v-4h4" fill={color} />
	<path d="M11,5v6h-6v-6h6" fill={color} />
	<path d="M4,0v4H0V0h4" fill={color} />
	<path d="M27,21v6h-6v-6h6" fill={color} />
	<path d="M32,28v4h-4v-4h4" fill={color} />
</svg>

<!-- src/components/layout/Navbar.svelte -->
<script lang="ts">
	import { setContext } from 'svelte';
	import { writable } from 'svelte/store';

	// Props with defaults
	export let fluid = false;

	// Create a store for the mobile menu visibility state
	const hidden = writable(true);

	// Make the hidden state available to child components
	setContext('navHidden', hidden);

	// Toggle function for mobile menu
	const toggle = () => hidden.update((hidden) => !hidden);

	// Allow external classes to be merged
	let className = '';
	export { className as class };
</script>

<nav class="px-2 sm:px-4 py-2.5 w-full {className}" {...$$restProps}>
	<!-- Container with optional fluid width -->
	<div class={fluid ? 'w-full' : 'container mx-auto flex flex-wrap items-center justify-between'}>
		<slot {hidden} {toggle} />
	</div>
</nav>

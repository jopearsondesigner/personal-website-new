<!-- CustomDrawer.svelte -->
<script lang="ts">
	import { slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { createEventDispatcher } from 'svelte';

	export let open = false;

	const dispatch = createEventDispatcher();

	function closeDrawer() {
		dispatch('close');
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeDrawer();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
	<div
		class="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex justify-end"
		on:click|self={closeDrawer}
	>
		<div
			class="w-80 max-w-[80%] bg-[color:var(--arcade-black-500)] text-[color:var(--arcade-white-300)] h-full overflow-y-auto"
			transition:slide={{ axis: 'x', duration: 300, easing: cubicOut }}
		>
			<div class="p-6">
				<slot />
			</div>
		</div>
	</div>
{/if}

<style>
	/* You can add any additional styles here */
</style>

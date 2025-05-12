<!-- src/lib/components/providers/ArcadeWrapper.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import ArcadeCabinet from '$lib/components/ui/ArcadeCabinet.svelte';

	// Props
	export let currentScreen = 'main';

	// Event forwarding
	function handleScreenChange(event) {
		// Forward the event to parent component
		dispatch('changeScreen', event.detail);
	}

	function handleGameStateChange(event) {
		// Forward the event to parent component
		dispatch('stateChange', event.detail);
	}

	// Event dispatcher (re-export events from ArcadeCabinet)
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	// Debug visibility toggle
	let showDebugMarkers = false;

	onMount(() => {
		if (browser) {
			// Add debug keyboard shortcut (Shift+D)
			const handleKeyDown = (e) => {
				if (e.key === 'D' && e.shiftKey) {
					showDebugMarkers = !showDebugMarkers;
				}
			};

			window.addEventListener('keydown', handleKeyDown);

			return () => {
				window.removeEventListener('keydown', handleKeyDown);
			};
		}
	});
</script>

<!-- Wrapper container with explicit dimensions -->
<div class="arcade-wrapper" style="position: relative; width: 100%; height: 100%; z-index: 1;">
	<!-- Direct ArcadeCabinet rendering with explicit dimensions -->
	<div
		class="arcade-cabinet-container"
		style="position: relative; width: 100%; height: 100%; z-index: 5;"
	>
		<ArcadeCabinet
			{currentScreen}
			on:changeScreen={handleScreenChange}
			on:stateChange={handleGameStateChange}
		/>

		<!-- Debug markers (press Shift+D to toggle) -->
		{#if showDebugMarkers}
			<div
				style="position: absolute; top: 0; left: 0; background: red; color: white; padding: 5px; z-index: 9999; pointer-events: none;"
			>
				Arcade Cabinet Debug
			</div>
		{/if}
	</div>
</div>

<style>
	.arcade-wrapper {
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		width: 100%;
		height: 100%;
	}

	.arcade-cabinet-container {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
	}

	/* Add these CSS variables to ensure proper dimensions */
	:global(:root) {
		--arcade-cabinet-width: min(100%, 1000px);
		--arcade-cabinet-height: min(90vh, 700px);
	}
</style>

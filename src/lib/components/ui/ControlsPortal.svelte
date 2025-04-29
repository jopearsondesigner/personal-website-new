<!-- src/lib/components/ui/ControlsPortal.svelte -->
<!-- ControlsPortal.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment'; // Import browser check for SvelteKit

	let controlsElement: HTMLDivElement;
	let portalContainer: HTMLDivElement | null = null;

	onMount(() => {
		// Skip this in SSR - only execute in browser
		if (!browser) return;

		// Create portal container if it doesn't exist
		portalContainer = document.getElementById('controls-portal') as HTMLDivElement;
		if (!portalContainer) {
			portalContainer = document.createElement('div');
			portalContainer.id = 'controls-portal';
			document.body.appendChild(portalContainer);
		}

		// Move the controls element to the portal
		if (controlsElement) {
			portalContainer.appendChild(controlsElement);
		}

		return () => {
			// Clean up when component unmounts
			if (controlsElement && portalContainer && portalContainer.contains(controlsElement)) {
				portalContainer.removeChild(controlsElement);
			}

			// Remove portal container if empty
			if (
				portalContainer &&
				portalContainer.childNodes.length === 0 &&
				document.body.contains(portalContainer)
			) {
				document.body.removeChild(portalContainer);
			}
		};
	});
</script>

<!-- This div will be teleported to the portal container -->
<div bind:this={controlsElement}>
	<slot />
</div>

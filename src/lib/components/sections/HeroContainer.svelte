<!-- src/lib/components/section/HeroContainer.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { get } from 'svelte/store';
	import ArcadeWrapper from '$lib/components/providers/ArcadeWrapper.svelte';
	import ControlsPortal from '$lib/components/ui/ControlsPortal.svelte';
	import GameControls from '$lib/components/game/GameControls.svelte';
	import { screenStore } from '$lib/stores/animation-store';
	import { layoutStore } from '$lib/stores/store';
	import DeviceCapabilitiesProvider from '$lib/components/providers/DeviceCapabilitiesProvider.svelte';
	import PerformanceMonitor from '$lib/components/devtools/PerformanceMonitor.svelte';
	import type { GameState } from '$lib/types/game';

	// Screen state
	let currentScreen = 'main';
	let currentGameState: GameState = 'idle';

	// Event handlers
	function handleScreenChange(event: CustomEvent) {
		const newScreen = event.detail;
		if (newScreen === currentScreen) return;

		// Update the screen state
		screenStore.set(newScreen);
		currentScreen = newScreen;
	}

	function handleControlInput(event: CustomEvent) {
		if (!browser) return;

		// Forward control input to appropriate component
		// This acts as a control bridge between game controls and screen content
		const inputEvent = new CustomEvent('control', { detail: event.detail });
		window.dispatchEvent(inputEvent);
	}

	function handleGameStateChange(event: { detail: { state: GameState } }) {
		currentGameState = event.detail.state;
	}

	// CSS variable updates based on layout
	$: if (browser && $layoutStore?.navbarHeight !== undefined) {
		document.documentElement.style.setProperty('--navbar-height', `${$layoutStore.navbarHeight}px`);
	}

	// Reactive values for style
	$: navbarHeight = $layoutStore?.navbarHeight || 0;

	// Cleanup function
	onDestroy(() => {
		// Clean up any global event listeners
		if (browser) {
			// Any specific cleanup needed at the container level
		}
	});
</script>

<section
	id="hero"
	class="w-full relative overflow-hidden flex items-center justify-center hardware-accelerated"
	style="margin-top: calc(-.5 * {$layoutStore?.navbarHeight ||
		0}px); height: calc(100vh + {$layoutStore?.navbarHeight || 0}px);"
>
	<!-- Provide device capabilities to all child components -->
	<DeviceCapabilitiesProvider>
		<!-- Use the ArcadeWrapper component directly -->
		<ArcadeWrapper
			{currentScreen}
			on:changeScreen={handleScreenChange}
			on:stateChange={handleGameStateChange}
		/>
	</DeviceCapabilitiesProvider>

	{#if currentScreen === 'game'}
		<ControlsPortal>
			<div class="controls-container">
				<GameControls
					on:control={handleControlInput}
					gameState={currentGameState}
					allowReset={currentGameState === 'gameover'}
				/>
			</div>
		</ControlsPortal>
	{/if}
</section>

<style lang="css">
	/* Base styles for the hero container */
	section {
		height: calc(100vh - var(--navbar-height, 64px));
	}

	/* Hardware acceleration utility class */
	.hardware-accelerated {
		transform: translateZ(0);
		backface-visibility: hidden;
		perspective: 1000px;
		will-change: transform, opacity;
		contain: layout style paint;
		content-visibility: auto;
	}

	/* Performance monitor container styling */
	.performance-monitor-container {
		position: absolute;
		top: 0;
		right: 0;
		z-index: 9000;
		pointer-events: auto;
	}

	/* iOS overscroll fixes */
	@supports (-webkit-overflow-scrolling: touch) {
		body,
		html {
			position: fixed;
			width: 100%;
			height: 100%;
			overflow: hidden;
		}

		#hero {
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			-webkit-overflow-scrolling: touch;
			overflow-y: scroll;
		}
	}
</style>

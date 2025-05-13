<!-- src/lib/components/ui/ArcadeCabinet.svelte -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import ArcadeScreen from '$lib/components/ui/ArcadeScreen.svelte';
	import ArcadeNavigation from '$lib/components/ui/ArcadeNavigation.svelte';

	// Props
	export let currentScreen = 'main';

	// Event dispatcher
	const dispatch = createEventDispatcher();

	// Event handlers
	function handleScreenChange(event) {
		dispatch('changeScreen', event.detail);
	}

	function handleGameStateChange(event) {
		dispatch('stateChange', event.detail);
	}
</script>

<div
	id="arcade-cabinet"
	class="cabinet-metal w-full h-full relative flex items-center justify-center overflow-hidden hardware-accelerated"
>
	<div class="cabinet-plastic overflow-hidden hardware-accelerated">
		<div class="cabinet-background absolute inset-0"></div>
		<div class="cabinet-wear absolute inset-0"></div>

		<div
			class="arcade-screen-wrapper relative overflow-hidden hardware-accelerated"
			style="margin-top: calc(-1 * var(--navbar-height, 64px));"
		>
			<div class="navigation-wrapper relative z-50">
				<ArcadeNavigation on:changeScreen={handleScreenChange} />
			</div>

			<!-- Bezel and screen components -->
			<div class="screen-bezel rounded-[3vmin] overflow-hidden"></div>

			<!-- Main arcade screen component -->
			<ArcadeScreen {currentScreen} on:stateChange={handleGameStateChange} />
		</div>
	</div>
</div>

<style lang="css">
	/* Root variables are moved to a global CSS file */

	/* Cabinet styling */
	#arcade-cabinet {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		position: relative;
		isolation: isolate;
		transform-style: preserve-3d;
		background: linear-gradient(180deg, rgba(40, 40, 40, 1) 0%, rgba(20, 20, 20, 1) 100%);
		box-shadow: var(--cabinet-shadow);
	}

	.cabinet-plastic {
		position: relative;
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		border-radius: 0;
		overflow: hidden;
		background: linear-gradient(180deg, rgba(40, 40, 40, 1) 0%, rgba(20, 20, 20, 1) 100%);
		box-shadow:
			inset 0 10px 30px rgba(0, 0, 0, 0.4),
			inset -5px 0 15px rgba(0, 0, 0, 0.3),
			inset 5px 0 15px rgba(0, 0, 0, 0.3),
			inset 0 -5px 15px rgba(0, 0, 0, 0.4);
		padding: 2vmin;
	}

	.cabinet-plastic::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 0;
		background: radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.1), transparent 70%);
		pointer-events: none;
	}

	.cabinet-background {
		background: linear-gradient(
			45deg,
			rgba(20, 20, 20, 0.4) 0%,
			rgba(40, 40, 40, 0.4) 50%,
			rgba(20, 20, 20, 0.4) 100%
		);
		border-radius: 0;
	}

	.cabinet-wear {
		border-radius: 0;
		background: repeating-linear-gradient(
			45deg,
			transparent 0px,
			transparent 5px,
			rgba(0, 0, 0, 0.02) 5px,
			rgba(0, 0, 0, 0.02) 6px
		);
		opacity: 0.3;
		mix-blend-mode: multiply;
		backdrop-filter: contrast(1.02);
	}

	.arcade-screen-wrapper {
		position: absolute;
		padding: var(--screen-recess);
		transform: perspective(1000px) rotateX(2deg);
		transform-style: preserve-3d;
		width: fit-content;
		height: fit-content;
		margin: 0 auto;
		border-radius: calc(var(--border-radius) + 8px);
		overflow: hidden;
	}

	.screen-bezel {
		position: absolute;
		inset: 0;
		border-radius: calc(var(--border-radius) + var(--bezel-thickness));
		background: repeating-linear-gradient(
				45deg,
				rgba(255, 255, 255, 0.03) 0px,
				rgba(255, 255, 255, 0.03) 1px,
				transparent 1px,
				transparent 2px
			),
			linear-gradient(to bottom, rgba(40, 40, 40, 1), rgba(60, 60, 60, 1));
		transform: translateZ(-1px);
		box-shadow: var(--bezel-shadow);
		overflow: hidden;
	}

	/* Light theme specific styles */
	:global(html.light) #arcade-cabinet {
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, transparent 15%),
			linear-gradient(
				90deg,
				rgba(160, 160, 160, 1) 0%,
				rgba(200, 200, 200, 0) 15%,
				rgba(200, 200, 200, 0) 85%,
				rgba(160, 160, 160, 1) 100%
			),
			linear-gradient(170deg, #e0e0e0 0%, #b0b0b0 40%, #909090 70%, #808080 100%);
		box-shadow:
			0 20px 40px rgba(0, 0, 0, 0.3),
			0 10px 30px rgba(0, 0, 0, 0.2),
			inset 0 2px 3px rgba(255, 255, 255, 0.9),
			inset -3px 0 8px rgba(0, 0, 0, 0.15),
			inset 3px 0 8px rgba(0, 0, 0, 0.15),
			inset 0 -3px 6px rgba(0, 0, 0, 0.2);
	}

	:global(html.light) .cabinet-plastic {
		background: linear-gradient(
			180deg,
			rgba(240, 240, 240, 1) 0%,
			rgba(230, 230, 230, 1) 50%,
			rgba(225, 225, 225, 1) 100%
		);
		box-shadow:
			inset 0 1px 2px rgba(255, 255, 255, 0.95),
			inset 0 10px 20px rgba(0, 0, 0, 0.02),
			inset -4px 0 15px rgba(0, 0, 0, 0.01),
			inset 4px 0 15px rgba(0, 0, 0, 0.01),
			inset 0 -4px 15px rgba(0, 0, 0, 0.02);
	}

	:global(html.light) .cabinet-background {
		background: linear-gradient(
			45deg,
			rgba(140, 140, 140, 0.5) 0%,
			rgba(180, 180, 180, 0.5) 50%,
			rgba(140, 140, 140, 0.5) 100%
		);
		mix-blend-mode: multiply;
	}

	:global(html.light) .cabinet-wear {
		background: repeating-linear-gradient(
			45deg,
			transparent 0px,
			transparent 5px,
			rgba(0, 0, 0, 0.03) 5px,
			rgba(0, 0, 0, 0.03) 6px
		);
		opacity: 0.4;
	}

	:global(html.light) .screen-bezel {
		background: linear-gradient(to bottom, rgba(210, 210, 210, 1) 0%, rgba(190, 190, 190, 1) 100%);
		box-shadow:
			inset 0 2px 4px rgba(0, 0, 0, 0.15),
			0 0 1px rgba(255, 255, 255, 0.8),
			0 4px 6px rgba(0, 0, 0, 0.06);
		border-radius: calc(var(--border-radius) + 0.5vmin);
	}

	/* Mobile optimizations */
	@media (max-width: 768px) {
		#arcade-cabinet {
			border-radius: var(--border-radius, 12px);
			overflow: hidden;
		}

		.cabinet-plastic {
			border-radius: var(--border-radius, 12px);
			overflow: hidden;
		}

		.cabinet-background,
		.cabinet-wear {
			border-radius: var(--border-radius, 12px);
		}

		.arcade-screen-wrapper,
		.screen-bezel {
			overflow: hidden;
			border-radius: var(--border-radius, 12px);
		}

		/* Mobile light mode specific */
		:global(html.light) #arcade-cabinet {
			background: linear-gradient(
				180deg,
				var(--light-cabinet-primary) 0%,
				var(--light-cabinet-secondary) 100%
			);
			box-shadow:
				0 10px 20px rgba(0, 0, 0, 0.08),
				0 5px 15px rgba(0, 0, 0, 0.04),
				inset 0 1px 2px var(--light-highlight);
			border-radius: var(--light-cabinet-border-radius);
		}

		:global(html.light) .cabinet-plastic {
			background: linear-gradient(
				180deg,
				var(--light-cabinet-secondary) 0%,
				var(--light-cabinet-tertiary) 100%
			);
			box-shadow:
				inset 0 5px 15px rgba(0, 0, 0, 0.02),
				inset -3px 0 8px rgba(0, 0, 0, 0.01),
				inset 3px 0 8px rgba(0, 0, 0, 0.01),
				inset 0 -3px 8px rgba(0, 0, 0, 0.02);
			border-radius: var(--light-cabinet-border-radius);
			border: 1px solid var(--light-cabinet-border-color);
		}

		:global(html.light) .cabinet-background {
			background: linear-gradient(
				45deg,
				rgba(240, 240, 240, 0.2) 0%,
				rgba(250, 250, 250, 0.2) 50%,
				rgba(240, 240, 240, 0.2) 100%
			);
			opacity: 0.6;
			mix-blend-mode: overlay;
		}

		:global(html.light) .cabinet-wear {
			background: repeating-linear-gradient(
				45deg,
				transparent 0px,
				transparent 5px,
				rgba(0, 0, 0, var(--light-cabinet-texture-opacity)) 5px,
				rgba(0, 0, 0, var(--light-cabinet-texture-opacity)) 6px
			);
			opacity: 0.2;
			mix-blend-mode: soft-light; /* Gentler blending */
		}

		/* Fine-tuned bezel for better integration with white cabinet */
		:global(html.light) .screen-bezel {
			background: linear-gradient(
				to bottom,
				rgba(254, 254, 254, 1) 0%,
				/* Almost pure white */ rgba(240, 240, 240, 1) 100% /* Very light gray */
			);
			box-shadow:
				inset 0 1px 2px rgba(255, 255, 255, 0.8),
				inset 0 -1px 1px rgba(0, 0, 0, 0.02),
				0 1px 2px rgba(0, 0, 0, 0.03);
			border-radius: calc(var(--border-radius) + 4px);
			border: 1px solid rgba(220, 220, 220, 0.5);
		}

		/* Enhanced mobile t-molding with subtler effect */
		:global(html.light) .t-molding::before {
			opacity: 0.15;
			background: linear-gradient(
				90deg,
				var(--light-cabinet-accent) 0%,
				rgba(0, 150, 255, 0.15) 50%,
				var(--light-cabinet-accent) 100%
			);
			filter: blur(4px);
		}

		:global(html.light) .t-molding::after {
			opacity: 0.12;
			box-shadow:
				inset 0 0 6px rgba(255, 255, 255, 0.4),
				0 0 6px var(--light-cabinet-accent);
		}

		/* Refined corner accents for mobile light mode */
		:global(html.light) .corner-accent {
			opacity: 0.25;
			background: radial-gradient(
				circle at center,
				rgba(255, 255, 255, 0.8),
				rgba(255, 255, 255, 0.05) 70%,
				transparent 100%
			);
			filter: blur(1.5px);
		}

		/* Softer light spill for mobile light mode */
		:global(html.light) .light-spill {
			background: radial-gradient(circle at 50% 50%, var(--light-cabinet-accent), transparent 70%);
			opacity: 0.04;
			filter: blur(15px);
		}

		/* Subtler control panel light in mobile light mode */
		:global(html.light) .control-panel-light {
			opacity: 0.12;
			background: linear-gradient(to bottom, var(--light-cabinet-accent), transparent);
		}

		:global(html.light) .arcade-screen-wrapper {
			margin-top: calc(-0.8 * var(--navbar-height, 64px));
		}

		/* Ensure proper border-radius on light mode elements */
		:global(html.light) .cabinet-plastic,
		:global(html.light) .arcade-screen-wrapper,
		:global(html.light) .screen-bezel {
			overflow: hidden;
			border-radius: var(--light-cabinet-border-radius);
		}
	}
</style>

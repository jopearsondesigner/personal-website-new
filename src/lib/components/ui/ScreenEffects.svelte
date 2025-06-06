<!-- DO NOT REMOVE THIS COMMENT
/src/lib/components/ui/ScreenEffects.svelte
DO NOT REMOVE THIS COMMENT -->
<!-- Restored ScreenEffects.svelte - Direct Migration from Hero.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { deviceCapabilities } from '$lib/utils/device-performance';
	import { get } from 'svelte/store';

	// Check for low performance devices to possibly disable effects
	let isLowPerformanceDevice = false;

	onMount(() => {
		if (!browser) return;

		// Check device capabilities
		const capabilities = get(deviceCapabilities);
		isLowPerformanceDevice = capabilities.isLowPerformance || false;
	});
</script>

<!-- CRT screen effects layers - NO WRAPPER, EXACT from Hero.svelte -->
<div class="phosphor-decay rounded-[3vmin]"></div>
<div class="shadow-mask rounded-[3vmin]"></div>
<div class="interlace rounded-[3vmin]"></div>
<div class="screen-reflection rounded-[3vmin]"></div>
<div class="screen-glare rounded-[3vmin]"></div>
<div class="glow-effect rounded-[3vmin]"></div>

<style>
	/* CRT effect styles - EXACT from Hero.svelte */
	.screen-reflection,
	.screen-glare,
	.screen-glass,
	.glow-effect,
	.phosphor-decay,
	.shadow-mask,
	.interlace {
		border-radius: var(--border-radius);
	}

	.screen-reflection {
		position: absolute;
		inset: 0;
		background: var(--screen-curve),
			linear-gradient(
				35deg,
				transparent 0%,
				rgba(255, 255, 255, 0.02) 25%,
				rgba(255, 255, 255, 0.05) 47%,
				rgba(255, 255, 255, 0.02) 50%,
				transparent 100%
			);
		mix-blend-mode: overlay;
		opacity: 0.7;
	}

	.screen-glare {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			35deg,
			transparent 0%,
			rgba(255, 255, 255, 0.05) 25%,
			rgba(255, 255, 255, 0.1) 47%,
			rgba(255, 255, 255, 0.05) 50%,
			transparent 100%
		);
		pointer-events: none;
		z-index: 2;
	}

	.glow-effect {
		will-change: opacity;
	}

	.phosphor-decay {
		position: absolute;
		inset: 0;
		mix-blend-mode: screen;
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 20%);
		animation: phosphorPersistence var(--phosphor-decay) linear infinite;
	}

	.shadow-mask {
		position: absolute;
		inset: 0;
		background-image: repeating-linear-gradient(
			90deg,
			rgba(255, 0, 0, 0.1),
			rgba(0, 255, 0, 0.1),
			rgba(0, 0, 255, 0.1)
		);
		background-size: var(--shadow-mask-size) var(--shadow-mask-size);
		pointer-events: none;
		opacity: 0.3;
	}

	.interlace {
		position: absolute;
		inset: 0;
		background: repeating-linear-gradient(
			0deg,
			rgba(0, 0, 0, 0.2) 0px,
			transparent 1px,
			transparent 2px
		);
		animation: interlaceFlicker calc(1000ms / var(--refresh-rate)) steps(2) infinite;
	}

	/* Animations - EXACT from Hero.svelte */
	@keyframes phosphorPersistence {
		0% {
			opacity: 1;
		}
		50% {
			opacity: 0.7;
		}
		100% {
			opacity: 0;
		}
	}

	@keyframes interlaceFlicker {
		0% {
			opacity: 1;
		}
		50% {
			opacity: 0.7;
		}
		100% {
			opacity: 1;
		}
	}

	/* Light theme adjustments - EXACT from Hero.svelte */
	:global(html.light) .screen-reflection {
		opacity: 0.4;
		background: linear-gradient(
			35deg,
			transparent 0%,
			rgba(255, 255, 255, 0.03) 25%,
			rgba(255, 255, 255, 0.06) 47%,
			rgba(255, 255, 255, 0.03) 50%,
			transparent 100%
		);
	}

	:global(html.light) .shadow-mask {
		opacity: 0.2;
	}

	/* Mobile optimizations - EXACT from Hero.svelte */
	@media (max-width: 768px) {
		/* Optimize CRT effects for mobile */
		.shadow-mask {
			opacity: 0.2; /* Reduce opacity for better performance */
			background-size: 2px 2px; /* Simpler pattern */
		}

		.interlace {
			background: repeating-linear-gradient(
				0deg,
				rgba(0, 0, 0, 0.15) 0px,
				transparent 1px,
				transparent 3px
			);
		}

		/* Optimize phosphor decay animation */
		.phosphor-decay {
			animation: phosphorPersistence 24ms linear infinite; /* Slower updates */
		}
	}

	/* Low performance device optimizations - EXACT from Hero.svelte */
	html[data-device-type='low-performance'] .shadow-mask,
	html[data-device-type='low-performance'] .interlace,
	html[data-device-type='low-performance'] .phosphor-decay {
		display: none; /* Disable expensive effects on low-performance devices */
	}

	/* iOS-specific optimizations - EXACT from Hero.svelte */
	.ios-optimized .shadow-mask,
	.ios-optimized .phosphor-decay {
		display: none;
	}

	.ios-optimized .interlace {
		opacity: 0.3;
		background-size: 100% 6px;
	}
</style>

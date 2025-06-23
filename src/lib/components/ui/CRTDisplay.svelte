<!-- DO NOT REMOVE THIS COMMENT
/src/lib/components/ui/CRTDisplay.svelte
DO NOT REMOVE THIS COMMENT -->
<script lang="ts">
	import { onMount } from 'svelte';

	// Component API
	export let variant: 'primary' | 'secondary' = 'primary';
	export let scanlineIntensity: 'low' | 'medium' | 'high' = 'medium';
	export let glassEffect: boolean = true;
	export let headerLabel: string = '';
	export let minHeight: string = 'auto';
	export let enableHover: boolean = true;
	export let className: string = '';

	// Animation state
	let mounted = false;

	onMount(() => {
		mounted = true;
	});

	// Dynamic classes based on props
	$: containerClasses = [
		'crt-display',
		`crt-display--${variant}`,
		`crt-display--scanlines-${scanlineIntensity}`,
		glassEffect ? 'crt-display--glass' : '',
		enableHover ? 'crt-display--hoverable' : '',
		mounted ? 'crt-display--mounted' : '',
		className
	]
		.filter(Boolean)
		.join(' ');
</script>

<div
	class={containerClasses}
	style="min-height: {minHeight}"
	role="region"
	aria-label={headerLabel || 'Display panel'}
>
	<!-- Header Label -->
	{#if headerLabel}
		<div class="crt-display__header">
			<span class="crt-display__label">{headerLabel}</span>
		</div>
	{/if}

	<!-- Content Area -->
	<div class="crt-display__content">
		<slot />
	</div>

	<!-- Avatar Slot (positioned absolutely) -->
	<div class="crt-display__avatar">
		<slot name="avatar" />
	</div>

	<!-- Enhanced Scanline System -->
	<div class="crt-display__scanlines" aria-hidden="true">
		<!-- Static scanlines base layer -->
		<div class="scanlines-static"></div>

		<!-- Moving scanlines layers -->
		<div class="scanlines-moving scanlines-moving--slow"></div>
		<div class="scanlines-moving scanlines-moving--medium"></div>
		<div class="scanlines-moving scanlines-moving--fast"></div>

		<!-- Screen flicker effect -->
		<div class="screen-flicker"></div>

		<!-- Glass reflection overlay -->
		{#if glassEffect}
			<div class="glass-reflection"></div>
		{/if}
	</div>
</div>

<style>
	/* =============================================================================
	   CRT Display Component Styles
	   ============================================================================= */

	.crt-display {
		position: relative;
		width: 100%;
		border-radius: 20px;
		padding: 4rem;
		overflow: hidden;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

		/* Enhanced glass morphism foundation */
		background: var(--crt-bg-primary);
		border: 1px solid var(--crt-border);
		box-shadow: var(--crt-shadow);

		/* Glass effect base */
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);

		/* Performance optimizations */
		transform: translateZ(0);
		will-change: transform;
		contain: layout style paint;
	}

	/* Variant Styles */
	.crt-display--secondary {
		background: var(--crt-bg-secondary);
		border-color: var(--crt-border-secondary);
	}

	/* Enhanced Glass Effect */
	.crt-display--glass {
		background: var(--crt-bg-glass);
		backdrop-filter: blur(16px) saturate(180%);
		-webkit-backdrop-filter: blur(16px) saturate(180%);

		/* Multiple layered shadows for depth */
		box-shadow:
			var(--crt-shadow),
			inset 0 1px 0 var(--crt-highlight),
			inset 0 -1px 0 var(--crt-shadow-inset),
			0 0 0 1px var(--crt-border-glass);
	}

	/* Hover Enhancement */
	.crt-display--hoverable:hover {
		transform: translateY(-2px) scale(1.005);
		box-shadow:
			var(--crt-shadow-hover),
			inset 0 1px 0 var(--crt-highlight),
			0 0 20px var(--crt-glow);
	}

	/* Mount Animation */
	.crt-display--mounted {
		animation: displayPowerOn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	@keyframes displayPowerOn {
		0% {
			opacity: 0;
			transform: scale(0.95) translateY(20px);
		}
		60% {
			opacity: 0.7;
			transform: scale(1.02) translateY(-5px);
		}
		100% {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	/* Header */
	.crt-display__header {
		position: absolute;
		top: 1rem;
		right: 1.5rem;
		z-index: 30;
	}

	.crt-display__label {
		display: inline-block;
		background: var(--crt-label-bg);
		color: var(--crt-label-text);
		padding: 0rem 0.75rem;
		border-radius: 6px;
		font-family: var(--font-pixelify), monospace;
		font-variation-settings: 'wght' var(--pixelify-weight-bold);
		font-size: 1.875rem;
		letter-spacing: 0.75px;
		border: 1px solid var(--crt-label-border);
		box-shadow:
			0 2px 4px rgba(43, 43, 43, 0.1),
			0 0 8px var(--crt-label-glow);

		/* Subtle pulse animation */
		animation: labelPulse 3s ease-in-out infinite;
	}

	@keyframes labelPulse {
		0%,
		100% {
			box-shadow:
				0 2px 4px rgba(43, 43, 43, 0.1),
				0 0 8px var(--crt-label-glow);
		}
		50% {
			box-shadow:
				0 2px 4px rgba(43, 43, 43, 0.1),
				0 0 12px var(--crt-label-glow-intense);
		}
	}

	/* Content Area */
	.crt-display__content {
		position: relative;
		z-index: 20;
		min-height: inherit;
	}

	/* Avatar Container - Fixed Z-Index */
	.crt-display__avatar {
		position: absolute;
		bottom: 0;
		right: -97px;
		width: 550px;
		height: 576px;
		z-index: 15; /* Below scanlines but above background */
		overflow: hidden;
		pointer-events: none;
	}

	/* Scanline System - Enhanced Z-Index Management */
	.crt-display__scanlines {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		border-radius: inherit;
		overflow: hidden;
		pointer-events: none;
		z-index: 25; /* Above avatar, below interactive content */
	}

	/* Static Scanlines Base Layer */
	.scanlines-static {
		position: absolute;
		inset: 0;
		background-image: repeating-linear-gradient(
			0deg,
			transparent,
			transparent 14px,
			var(--crt-scanline-static) 14px,
			var(--crt-scanline-static) 16px
		);
		opacity: var(--crt-scanline-opacity);
		border-radius: inherit;
	}

	/* Moving Scanlines with Intensity Variants */
	.scanlines-moving {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		opacity: var(--crt-scanline-moving-opacity);
	}

	.scanlines-moving--slow {
		background-image: repeating-linear-gradient(
			0deg,
			transparent,
			transparent 28px,
			var(--crt-scanline-moving) 28px,
			var(--crt-scanline-moving) 30px
		);
		animation: scanlineMove 5s linear infinite;
	}

	.scanlines-moving--medium {
		background-image: repeating-linear-gradient(
			0deg,
			transparent,
			transparent 42px,
			var(--crt-scanline-moving) 42px,
			var(--crt-scanline-moving) 44px
		);
		animation: scanlineMove 3.5s linear infinite;
	}

	.scanlines-moving--fast {
		background-image: repeating-linear-gradient(
			0deg,
			transparent,
			transparent 56px,
			var(--crt-scanline-moving) 56px,
			var(--crt-scanline-moving) 58px
		);
		animation: scanlineMove 2s linear infinite;
	}

	/* Screen Flicker */
	.screen-flicker {
		position: absolute;
		inset: 0;
		background: var(--crt-flicker-color);
		opacity: 0;
		animation: screenFlicker 7s ease-in-out infinite;
		border-radius: inherit;
	}

	/* Glass Reflection Effect */
	.glass-reflection {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			135deg,
			rgba(255, 255, 255, 0.1) 0%,
			transparent 25%,
			transparent 75%,
			rgba(255, 255, 255, 0.05) 100%
		);
		border-radius: inherit;
		pointer-events: none;
	}

	/* Scanline Intensity Variants */
	.crt-display--scanlines-low .scanlines-static {
		opacity: calc(var(--crt-scanline-opacity) * 0.5);
	}

	.crt-display--scanlines-low .scanlines-moving {
		opacity: calc(var(--crt-scanline-moving-opacity) * 0.5);
	}

	.crt-display--scanlines-high .scanlines-static {
		opacity: calc(var(--crt-scanline-opacity) * 1.5);
	}

	.crt-display--scanlines-high .scanlines-moving {
		opacity: calc(var(--crt-scanline-moving-opacity) * 1.3);
	}

	/* Animations */
	@keyframes scanlineMove {
		0% {
			transform: translateY(-100%);
		}
		100% {
			transform: translateY(100vh);
		}
	}

	@keyframes screenFlicker {
		0%,
		94%,
		100% {
			opacity: 0;
		}
		95%,
		97% {
			opacity: var(--crt-flicker-intensity);
		}
		96% {
			opacity: 0;
		}
	}

	/* =============================================================================
	   CSS Custom Properties for CRT Display
	   ============================================================================= */

	:root {
		/* Primary Display Colors */
		--crt-bg-primary: rgba(26, 26, 26, 0.88);
		--crt-bg-secondary: rgba(36, 36, 36, 0.85);
		--crt-bg-glass: rgba(26, 26, 26, 0.75);

		--crt-border: rgba(255, 255, 255, 0.12);
		--crt-border-secondary: rgba(255, 255, 255, 0.08);
		--crt-border-glass: rgba(255, 255, 255, 0.15);

		--crt-shadow: 0 8px 32px rgba(43, 43, 43, 0.4), 0 2px 8px rgba(43, 43, 43, 0.2);
		--crt-shadow-hover: 0 12px 40px rgba(43, 43, 43, 0.5), 0 4px 12px rgba(43, 43, 43, 0.3);
		--crt-shadow-inset: rgba(43, 43, 43, 0.1);

		--crt-highlight: rgba(43, 43, 43, 0.08);
		--crt-glow: rgba(30, 144, 255, 0.2);

		/* Label Colors */
		--crt-label-bg: rgba(43, 43, 43, 0.12);
		--crt-label-text: #cce7ff;
		--crt-label-border: rgba(204, 231, 255, 0.6);
		--crt-label-glow: rgba(30, 144, 255, 0.3);
		--crt-label-glow-intense: rgba(30, 144, 255, 0.5);

		/* Scanline Effects */
		--crt-scanline-static: rgba(255, 255, 255, 0.03);
		--crt-scanline-moving: rgba(199, 255, 221, 0.1);
		--crt-scanline-opacity: 0.8;
		--crt-scanline-moving-opacity: 0.6;

		/* Screen Effects */
		--crt-flicker-color: rgba(255, 255, 255, 0.02);
		--crt-flicker-intensity: 0.15;
	}

	/* Light Theme Overrides */
	:global(html.light) {
		--crt-bg-primary: rgba(213, 213, 213, 0.92); /* --arcade-black-100 */
		--crt-bg-secondary: rgba(213, 213, 213, 0.88); /* --arcade-black-100 */
		--crt-bg-glass: rgba(213, 213, 213, 0.85); /* --arcade-black-100 */

		--crt-border: rgba(43, 43, 43, 0.08);
		--crt-border-secondary: rgba(43, 43, 43, 0.05);
		--crt-border-glass: rgba(43, 43, 43, 0.12);

		--crt-shadow: 0 8px 32px rgba(43, 43, 43, 0.12), 0 2px 8px rgba(43, 43, 43, 0.06);
		--crt-shadow-hover: 0 12px 40px rgba(43, 43, 43, 0.18), 0 4px 12px rgba(43, 43, 43, 0.1);
		--crt-shadow-inset: rgba(255, 255, 255, 0.8);

		--crt-highlight: rgba(245, 245, 220, 0.9);
		--crt-glow: rgba(30, 144, 255, 0.2);

		--crt-label-bg: rgba(43, 43, 43, 0.66);
		--crt-label-text: rgba(204, 231, 255, 1);
		--crt-label-border: rgba(204, 231, 255, 1);
		--crt-label-glow: rgba(30, 144, 255, 0.53);
		--crt-label-glow-intense: rgba(30, 144, 255, 0.7);

		--crt-scanline-static: rgba(43, 43, 43, 0.025);
		--crt-scanline-moving: rgba(119, 255, 161, 0.08);
		--crt-scanline-opacity: 0.6;
		--crt-scanline-moving-opacity: 0.5;

		--crt-flicker-color: rgba(43, 43, 43, 0.015);
		--crt-flicker-intensity: 0.1;
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		.crt-display {
			padding: 2rem;
			border-radius: 16px;
		}

		.crt-display__avatar {
			position: absolute;
			bottom: 0;
			right: 50%;
			transform: translateX(50%);
			width: 280px;
			height: 320px;
		}

		.crt-display__header {
			top: 1rem;
			right: 1.5rem;
		}

		.crt-display__label {
			font-size: 0.75rem;
			padding: 0.375rem 0.75rem;
		}
	}

	@media (max-width: 480px) {
		.crt-display {
			padding: 1.5rem;
		}

		.crt-display__avatar {
			width: 240px;
			height: 280px;
		}
	}

	/* Accessibility */
	@media (prefers-reduced-motion: reduce) {
		.scanlines-moving,
		.screen-flicker,
		.crt-display--mounted {
			animation: none;
		}

		.crt-display__label {
			animation: none;
		}

		.scanlines-static {
			opacity: 0.3;
		}

		.crt-display {
			transform: none;
		}
	}

	@media (prefers-contrast: high) {
		.crt-display {
			border-width: 2px;
		}

		.crt-display__label {
			border-width: 2px;
		}
	}
</style>

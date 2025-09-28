<!-- DO NOT REMOVE THIS COMMENT
/src/lib/components/ui/LiquidGlassButton.svelte
DO NOT REMOVE THIS COMMENT -->

<script lang="ts">
	import { onMount } from 'svelte';
	import { deviceCapabilities } from '$lib/utils/device-performance';

	export let type: 'button' | 'submit' | 'reset' = 'submit';
	export let disabled = false;
	export let loading = false;
	export let onClick: (() => void) | undefined = undefined;
	export let className = '';

	// Performance detection state
	let performanceLevel: 'full' | 'simplified' | 'static' = 'full';
	let isMobile = false;
	let prefersReducedMotion = false;

	// Handle click
	const handleClick = () => {
		if (!disabled && !loading && onClick) {
			onClick();
		}
	};

	onMount(() => {
		// Check for reduced motion preference
		if (typeof window !== 'undefined' && window.matchMedia) {
			const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
			prefersReducedMotion = mediaQuery.matches;
		}

		// Subscribe to device capabilities for performance optimization
		const unsubscribe = deviceCapabilities.subscribe((caps) => {
			isMobile = caps.isMobile;

			// Determine performance level based on device capabilities
			if (prefersReducedMotion || caps.tier === 'low' || caps.hasBatteryIssues) {
				performanceLevel = 'static';
			} else if (caps.tier === 'medium' || isMobile) {
				performanceLevel = 'simplified';
			} else {
				performanceLevel = 'full';
			}
		});

		return unsubscribe;
	});
</script>

<button
	{type}
	{disabled}
	class="liquid-glass-button {className}"
	class:liquid-glass-button--loading={loading}
	class:liquid-glass-button--disabled={disabled}
	class:liquid-glass-button--full={performanceLevel === 'full'}
	class:liquid-glass-button--simplified={performanceLevel === 'simplified'}
	class:liquid-glass-button--static={performanceLevel === 'static'}
	on:click={handleClick}
>
	<!-- Full Performance Version: Complex SVG Filters (Desktop Only) -->
	{#if performanceLevel === 'full'}
		<svg class="liquid-glass-filter" width="0" height="0">
			<defs>
				<!-- Optimized Glass Distortion Filter -->
				<filter id="liquid-glass-filter-full" x="-25%" y="-25%" width="150%" height="150%">
					<!-- Reduced complexity turbulence -->
					<feTurbulence baseFrequency="0.015 0.08" numOctaves="2" result="noise" seed="1" />
					<feDisplacementMap in="SourceGraphic" in2="noise" scale="4" result="displacement" />
					<feGaussianBlur in="displacement" stdDeviation="1" result="blur" />
					<!-- Simplified specular lighting -->
					<feSpecularLighting
						in="blur"
						result="specular"
						lighting-color="#ffffff"
						specularConstant="1.2"
						specularExponent="15"
					>
						<fePointLight x="40" y="25" z="150" />
					</feSpecularLighting>
					<feComposite in="specular" in2="blur" operator="over" />
				</filter>
			</defs>
		</svg>
	{/if}

	<!-- Background Glass Layers -->
	<div class="glass-background" class:glass-background--full={performanceLevel === 'full'}>
		<!-- Main glass surface -->
		<div class="glass-surface"></div>

		<!-- Conditional complex layers only for full performance -->
		{#if performanceLevel === 'full'}
			<!-- Highlight layer -->
			<div class="glass-highlight"></div>
			<!-- Specular reflection -->
			<div class="glass-specular"></div>
		{/if}

		<!-- Edge glow (simplified for medium performance) -->
		{#if performanceLevel !== 'static'}
			<div class="glass-edge-glow"></div>
		{/if}
	</div>

	<!-- Button Content -->
	<div class="button-content">
		{#if loading}
			<div class="loading-spinner">
				<!-- Simplified spinner for better performance -->
				<svg viewBox="0 0 24 24" class="spinner-icon">
					<circle
						cx="12"
						cy="12"
						r="10"
						stroke="currentColor"
						stroke-width="2"
						fill="none"
						stroke-linecap="round"
						stroke-dasharray="16"
						stroke-dashoffset="16"
					>
						<!-- Conditional animation based on performance level -->
						{#if performanceLevel !== 'static'}
							<animate
								attributeName="stroke-dasharray"
								values="0 16;8 8;0 16"
								dur="1.2s"
								repeatCount="indefinite"
							/>
							<animate
								attributeName="stroke-dashoffset"
								values="0;-8;-16"
								dur="1.2s"
								repeatCount="indefinite"
							/>
						{/if}
					</circle>
				</svg>
			</div>
		{/if}

		<span class="button-text" class:button-text--hidden={loading}>
			<slot>Send Message</slot>
		</span>

		<!-- Send icon -->
		<div class="send-icon" class:send-icon--hidden={loading}>
			<svg viewBox="0 0 24 24" class="icon">
				<path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
			</svg>
		</div>
	</div>

	<!-- Ripple effect overlay (only for non-static performance) -->
	{#if performanceLevel !== 'static'}
		<div class="ripple-overlay"></div>
	{/if}
</button>

<style>
	/* =============================================================================
	   Base Liquid Glass Button Styles (All Performance Levels)
	   ============================================================================= */

	.liquid-glass-button {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;

		/* Sizing */
		min-width: 160px;
		height: 56px;
		padding: 0 2rem;

		/* Typography */
		font-family:
			var(--font-ibm),
			-apple-system,
			BlinkMacSystemFont,
			sans-serif;
		font-size: 1rem;
		font-weight: 600;
		letter-spacing: 0.025em;

		/* Shape */
		border-radius: 28px;
		border: none;
		outline: none;

		/* Base colors - neutral white for good contrast */
		color: rgba(255, 255, 255, 0.95);
		background: transparent;

		/* Minimal transforms */
		transform: translateZ(0);
		cursor: pointer;

		/* Performance optimizations */
		will-change: transform;
		backface-visibility: hidden;
		contain: layout style paint;

		/* Prevent text selection */
		user-select: none;
		-webkit-user-select: none;
		-webkit-touch-callout: none;
	}

	/* =============================================================================
	   Performance Level: Static (Lowest Resource Usage)
	   ============================================================================= */

	.liquid-glass-button--static {
		/* No transitions for maximum performance */
		transition: none;
	}

	.liquid-glass-button--static .glass-surface {
		/* Simple gradient background with teal brand colors */
		background: linear-gradient(135deg, rgba(0, 168, 168, 0.2) 0%, rgba(0, 168, 168, 0.1) 100%);
		border: 1px solid rgba(0, 168, 168, 0.3);
		border-radius: inherit;
		/* No backdrop-filter for maximum compatibility */
	}

	.liquid-glass-button--static:hover:not(:disabled) {
		/* Minimal hover effect */
		background: linear-gradient(135deg, rgba(0, 168, 168, 0.25) 0%, rgba(0, 168, 168, 0.15) 100%);
	}

	/* =============================================================================
	   Performance Level: Simplified (Medium Resource Usage)
	   ============================================================================= */

	.liquid-glass-button--simplified {
		transition:
			transform 0.2s ease,
			box-shadow 0.2s ease;
	}

	.liquid-glass-button--simplified .glass-surface {
		background: linear-gradient(
			135deg,
			rgba(0, 168, 168, 0.18) 0%,
			rgba(0, 168, 168, 0.1) 50%,
			rgba(0, 168, 168, 0.15) 100%
		);

		/* Reduced backdrop blur for better performance */
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);

		border: 1px solid rgba(0, 168, 168, 0.3);
		border-radius: inherit;
	}

	.liquid-glass-button--simplified:hover:not(:disabled) {
		transform: translateY(-1px) scale(1.01);
		box-shadow: 0 4px 16px rgba(0, 168, 168, 0.2);
	}

	.liquid-glass-button--simplified .glass-edge-glow {
		background: #00a8a8;
		opacity: 0;
		filter: blur(4px);
		transition: opacity 0.2s ease;
	}

	.liquid-glass-button--simplified:hover:not(:disabled) .glass-edge-glow {
		opacity: 0.4;
	}

	/* =============================================================================
	   Performance Level: Full (High Resource Usage - Desktop Only)
	   ============================================================================= */

	.liquid-glass-button--full {
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.liquid-glass-button--full .glass-background--full {
		filter: url(#liquid-glass-filter-full);
	}

	.liquid-glass-button--full .glass-surface {
		background: linear-gradient(
			135deg,
			rgba(0, 168, 168, 0.18) 0%,
			rgba(0, 168, 168, 0.1) 50%,
			rgba(0, 168, 168, 0.15) 100%
		);

		/* Full backdrop blur effect */
		backdrop-filter: blur(16px) saturate(180%);
		-webkit-backdrop-filter: blur(16px) saturate(180%);

		border: 1px solid rgba(0, 168, 168, 0.3);
		border-radius: inherit;
	}

	.liquid-glass-button--full .glass-highlight {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			180deg,
			rgba(255, 255, 255, 0.25) 0%,
			rgba(255, 255, 255, 0.05) 30%,
			transparent 70%
		);
		border-radius: inherit;
		mix-blend-mode: overlay;
	}

	.liquid-glass-button--full .glass-specular {
		position: absolute;
		top: 2px;
		left: 25%;
		right: 25%;
		height: 40%;
		background: linear-gradient(
			135deg,
			rgba(255, 255, 255, 0.4) 0%,
			rgba(255, 255, 255, 0.1) 50%,
			transparent 100%
		);
		border-radius: inherit;
		transform: perspective(100px) rotateX(-15deg);
		filter: blur(2px);
		mix-blend-mode: screen;
		transition: all 0.3s ease;
	}

	.liquid-glass-button--full .glass-edge-glow {
		background: linear-gradient(135deg, #00a8a8, #1ad1d1);
		opacity: 0;
		filter: blur(8px);
		transition: opacity 0.3s ease;
	}

	.liquid-glass-button--full:hover:not(:disabled) {
		transform: translateY(-2px) scale(1.02);
		box-shadow:
			0 8px 32px rgba(0, 168, 168, 0.25),
			0 4px 16px rgba(0, 0, 0, 0.1);
	}

	.liquid-glass-button--full:hover:not(:disabled) .glass-edge-glow {
		opacity: 0.6;
	}

	.liquid-glass-button--full:hover:not(:disabled) .glass-specular {
		opacity: 1.2;
		transform: perspective(100px) rotateX(-10deg) translateY(-2px);
	}

	.liquid-glass-button--full:hover:not(:disabled) .send-icon .icon {
		transform: translateX(2px);
	}

	/* =============================================================================
	   Shared Glass Background System
	   ============================================================================= */

	.glass-background {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		overflow: hidden;
		contain: layout style paint;
	}

	.glass-surface {
		position: absolute;
		inset: 0;
		border-radius: inherit;
	}

	.glass-edge-glow {
		position: absolute;
		inset: -2px;
		border-radius: inherit;
		z-index: -1;
	}

	/* =============================================================================
	   Button Content (All Performance Levels)
	   ============================================================================= */

	.button-content {
		position: relative;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
	}

	.button-text {
		font-weight: 600;
	}

	.liquid-glass-button--full .button-text,
	.liquid-glass-button--simplified .button-text {
		transition: all 0.3s ease;
	}

	.button-text--hidden {
		opacity: 0;
		transform: translateX(-10px);
	}

	.send-icon {
		width: 20px;
		height: 20px;
	}

	.liquid-glass-button--full .send-icon,
	.liquid-glass-button--simplified .send-icon {
		transition: all 0.3s ease;
	}

	.send-icon--hidden {
		opacity: 0;
		transform: translateX(10px);
	}

	.icon {
		width: 100%;
		height: 100%;
	}

	.liquid-glass-button--full .icon {
		transition: transform 0.2s ease;
	}

	/* Loading Spinner */
	.loading-spinner {
		position: absolute;
		width: 20px;
		height: 20px;
	}

	.spinner-icon {
		width: 100%;
		height: 100%;
	}

	/* Ripple Effect (Simplified and Full only) */
	.ripple-overlay {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: radial-gradient(circle at center, rgba(0, 168, 168, 0.3) 0%, transparent 70%);
		opacity: 0;
		transform: scale(0.8);
		pointer-events: none;
	}

	.liquid-glass-button--simplified .ripple-overlay,
	.liquid-glass-button--full .ripple-overlay {
		transition: all 0.2s ease;
	}

	/* SVG Filter Container */
	.liquid-glass-filter {
		position: absolute;
		top: 0;
		left: 0;
		pointer-events: none;
	}

	/* =============================================================================
	   Interactive States (Performance-Aware)
	   ============================================================================= */

	/* Active State */
	.liquid-glass-button--simplified:active:not(:disabled),
	.liquid-glass-button--full:active:not(:disabled) {
		transform: translateY(0) scale(0.98);
		transition-duration: 0.1s;
	}

	.liquid-glass-button--simplified:active:not(:disabled) .ripple-overlay,
	.liquid-glass-button--full:active:not(:disabled) .ripple-overlay {
		opacity: 1;
		transform: scale(1.1);
		transition-duration: 0.1s;
	}

	/* Focus State */
	.liquid-glass-button:focus-visible {
		outline: 2px solid #00a8a8;
		outline-offset: 2px;
	}

	/* Loading State */
	.liquid-glass-button--loading {
		cursor: wait;
	}

	.liquid-glass-button--loading .glass-surface {
		/* Reduced opacity during loading */
		opacity: 0.8;
	}

	.liquid-glass-button--full.liquid-glass-button--loading .glass-surface {
		animation: loadingPulse 2s ease-in-out infinite;
	}

	@keyframes loadingPulse {
		0%,
		100% {
			opacity: 0.8;
		}
		50% {
			opacity: 0.6;
		}
	}

	/* Disabled State */
	.liquid-glass-button--disabled {
		cursor: not-allowed;
		opacity: 0.5;
		transform: none !important;
	}

	.liquid-glass-button--disabled .glass-surface {
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.1);
	}

	.liquid-glass-button--disabled .glass-edge-glow {
		display: none;
	}

	/* =============================================================================
	   Theme Variants
	   ============================================================================= */

	/* Light theme adjustments - neutral dark text */
	:global(html.light) .liquid-glass-button {
		color: rgba(0, 0, 0, 0.9);
	}

	:global(html.light) .glass-surface {
		background: linear-gradient(
			135deg,
			rgba(255, 255, 255, 0.85) 0%,
			rgba(255, 255, 255, 0.7) 50%,
			rgba(255, 255, 255, 0.8) 100%
		) !important;
		border-color: rgba(0, 168, 168, 0.4) !important;
	}

	:global(html.light) .button-content {
		text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
	}

	/* =============================================================================
	   Responsive Design
	   ============================================================================= */

	@media (max-width: 768px) {
		.liquid-glass-button {
			min-width: 140px;
			height: 48px;
			padding: 0 1.5rem;
			font-size: 0.9rem;
		}

		.send-icon {
			width: 18px;
			height: 18px;
		}

		.loading-spinner {
			width: 18px;
			height: 18px;
		}

		/* Force simplified performance on mobile */
		.liquid-glass-button--full {
			transition:
				transform 0.2s ease,
				box-shadow 0.2s ease;
		}

		.liquid-glass-button--full .glass-background--full {
			filter: none;
		}

		.liquid-glass-button--full .glass-surface {
			backdrop-filter: blur(8px);
			-webkit-backdrop-filter: blur(8px);
		}
	}

	/* =============================================================================
	   Accessibility & Reduced Motion
	   ============================================================================= */

	@media (prefers-reduced-motion: reduce) {
		.liquid-glass-button,
		.glass-surface,
		.glass-specular,
		.ripple-overlay,
		.button-text,
		.send-icon,
		.icon {
			transition: none !important;
			animation: none !important;
		}

		.liquid-glass-button:hover:not(:disabled) {
			transform: none !important;
		}

		.liquid-glass-button:active:not(:disabled) {
			transform: none !important;
		}

		.glass-background {
			filter: none !important;
		}
	}

	@media (prefers-contrast: high) {
		.liquid-glass-button {
			border: 2px solid currentColor;
		}

		.glass-surface {
			background: rgba(0, 168, 168, 0.9) !important;
			backdrop-filter: none !important;
		}

		.glass-highlight,
		.glass-specular {
			display: none;
		}
	}

	/* =============================================================================
	   Performance Optimizations
	   ============================================================================= */

	.glass-background {
		isolation: isolate;
	}

	/* Reduce paint complexity on lower-end devices */
	@media (max-resolution: 1dppx) {
		.glass-highlight,
		.glass-specular {
			display: none;
		}

		.glass-surface {
			backdrop-filter: blur(4px);
			-webkit-backdrop-filter: blur(4px);
		}
	}
</style>

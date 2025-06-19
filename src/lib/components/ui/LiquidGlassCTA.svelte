<!-- DO NOT REMOVE THIS COMMENT
/src/lib/components/ui/LiquidGlassCTA.svelte
DO NOT REMOVE THIS COMMENT -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { theme } from '$lib/stores/theme';

	// Component Props
	export let href: string = '#contact';
	export let text: string = 'GET STARTED';
	export let variant: 'primary' | 'secondary' = 'primary';
	export let size: 'small' | 'medium' | 'large' = 'medium';
	export let disabled: boolean = false;
	export let ariaLabel: string = text;
	export let className: string = '';

	// Internal state
	let mounted = false;
	let isPressed = false;
	let isHovered = false;
	let buttonElement: HTMLElement;
	let mouseX = 0;
	let mouseY = 0;

	// Reactive theme state
	$: currentTheme = $theme;

	onMount(() => {
		mounted = true;
	});

	// Handle mouse movement for dynamic effects
	const handleMouseMove = (e: MouseEvent) => {
		if (buttonElement) {
			const rect = buttonElement.getBoundingClientRect();
			mouseX = ((e.clientX - rect.left) / rect.width) * 100;
			mouseY = ((e.clientY - rect.top) / rect.height) * 100;
		}
	};

	// Handle navigation
	const handleClick = (e: MouseEvent) => {
		if (disabled) {
			e.preventDefault();
			return;
		}

		// Smooth scroll to target
		if (href.startsWith('#')) {
			e.preventDefault();
			const target = document.querySelector(href);
			if (target) {
				target.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}
		}
	};

	// Dynamic classes
	$: containerClasses = [
		'liquid-glass-cta',
		`liquid-glass-cta--${variant}`,
		`liquid-glass-cta--${size}`,
		mounted ? 'liquid-glass-cta--mounted' : '',
		isHovered ? 'liquid-glass-cta--hovered' : '',
		isPressed ? 'liquid-glass-cta--pressed' : '',
		disabled ? 'liquid-glass-cta--disabled' : '',
		className
	]
		.filter(Boolean)
		.join(' ');
</script>

<a
	{href}
	bind:this={buttonElement}
	class={containerClasses}
	role="button"
	tabindex={disabled ? -1 : 0}
	aria-label={ariaLabel}
	aria-disabled={disabled}
	on:click={handleClick}
	on:mouseenter={() => (isHovered = true)}
	on:mouseleave={() => {
		isHovered = false;
		isPressed = false;
	}}
	on:mousedown={() => (isPressed = true)}
	on:mouseup={() => (isPressed = false)}
	on:mousemove={handleMouseMove}
	on:keydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			isPressed = true;
		}
	}}
	on:keyup={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			isPressed = false;
			handleClick(e);
		}
	}}
	style="--mouse-x: {mouseX}%; --mouse-y: {mouseY}%;"
>
	<!-- Base Glass Layer -->
	<div class="liquid-glass-cta__base" aria-hidden="true"></div>

	<!-- Distortion Layer with SVG Filter -->
	<div class="liquid-glass-cta__distortion" aria-hidden="true"></div>

	<!-- Content Layer -->
	<div class="liquid-glass-cta__content">
		<span class="liquid-glass-cta__text">{text}</span>

		<!-- Gaming-themed accent -->
		<div class="liquid-glass-cta__accent" aria-hidden="true"></div>
	</div>

	<!-- Specular Highlight Layer -->
	<div class="liquid-glass-cta__highlight" aria-hidden="true"></div>

	<!-- Interactive Ripple Layer -->
	<div class="liquid-glass-cta__ripple" aria-hidden="true"></div>

	<!-- Border Glow -->
	<div class="liquid-glass-cta__border-glow" aria-hidden="true"></div>
</a>

<!-- SVG Filters for Distortion Effects -->
<svg class="liquid-glass-cta__filters" aria-hidden="true">
	<defs>
		<!-- Liquid Glass Distortion Filter -->
		<filter id="liquid-glass-distortion" x="-20%" y="-20%" width="140%" height="140%">
			<feTurbulence
				baseFrequency="0.3 0.1"
				numOctaves="3"
				result="turbulence"
				type="fractalNoise"
			/>
			<feDisplacementMap
				in="SourceGraphic"
				in2="turbulence"
				scale="2"
				xChannelSelector="R"
				yChannelSelector="G"
				result="displacement"
			/>
			<feGaussianBlur in="displacement" stdDeviation="1" result="blur" />
		</filter>

		<!-- Enhanced Glow Filter -->
		<filter id="liquid-glass-glow" x="-50%" y="-50%" width="200%" height="200%">
			<feGaussianBlur stdDeviation="6" result="coloredBlur" />
			<feMerge>
				<feMergeNode in="coloredBlur" />
				<feMergeNode in="SourceGraphic" />
			</feMerge>
		</filter>
	</defs>
</svg>

<style>
	/* =============================================================================
	   Liquid Glass CTA Component
	   ============================================================================= */

	.liquid-glass-cta {
		/* Base Structure */
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		text-decoration: none;
		border-radius: 20px;
		overflow: hidden;
		cursor: pointer;
		user-select: none;

		/* Sizing Variables */
		--cta-padding-x: 2rem;
		--cta-padding-y: 1rem;
		--cta-font-size: 1rem;
		--cta-min-width: 180px;

		/* Glass Effect Variables */
		--glass-blur: 20px;
		--glass-opacity: 0.15;
		--highlight-intensity: 0.3;
		--border-opacity: 0.2;
		--glow-intensity: 0.4;

		/* Animation Variables */
		--transition-duration: 0.3s;
		--hover-scale: 1.05;
		--press-scale: 0.98;

		/* Apply Sizing */
		padding: var(--cta-padding-y) var(--cta-padding-x);
		min-width: var(--cta-min-width);
		font-size: var(--cta-font-size);

		/* Performance Optimizations */
		transform: translateZ(0);
		will-change: transform, filter;
		contain: layout style paint;

		/* Accessibility */
		transition: all var(--transition-duration) cubic-bezier(0.4, 0, 0.2, 1);

		/* Base interaction state */
		transform: scale(1);
		filter: drop-shadow(0 4px 20px rgba(0, 0, 0, 0.1));
	}

	/* Size Variants */
	.liquid-glass-cta--small {
		--cta-padding-x: 1.5rem;
		--cta-padding-y: 0.75rem;
		--cta-font-size: 0.875rem;
		--cta-min-width: 140px;
		border-radius: 16px;
	}

	.liquid-glass-cta--large {
		--cta-padding-x: 2.5rem;
		--cta-padding-y: 1.25rem;
		--cta-font-size: 1.125rem;
		--cta-min-width: 220px;
		border-radius: 24px;
	}

	/* Base Glass Layer */
	.liquid-glass-cta__base {
		position: absolute;
		inset: 0;
		border-radius: inherit;

		/* Liquid Glass Foundation */
		background: var(--liquid-glass-base);
		backdrop-filter: blur(var(--glass-blur)) saturate(180%);
		-webkit-backdrop-filter: blur(var(--glass-blur)) saturate(180%);

		/* Multi-layer depth */
		box-shadow:
			inset 0 1px 0 var(--liquid-glass-highlight),
			inset 0 -1px 0 var(--liquid-glass-shadow),
			0 8px 32px var(--liquid-glass-drop-shadow);
	}

	/* Distortion Layer */
	.liquid-glass-cta__distortion {
		position: absolute;
		inset: 2px;
		border-radius: inherit;
		background: var(--liquid-glass-distortion-bg);
		filter: url(#liquid-glass-distortion);
		opacity: 0.6;
		mix-blend-mode: overlay;
	}

	/* Content Layer */
	.liquid-glass-cta__content {
		position: relative;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		height: 100%;
	}

	/* Text Styling */
	.liquid-glass-cta__text {
		font-family: var(--font-press-start), monospace;
		font-weight: 400;
		font-size: inherit;
		color: var(--liquid-glass-text);
		text-shadow: 0 0 10px var(--liquid-glass-text-glow);
		letter-spacing: 1px;
		line-height: 1.2;

		/* Dynamic text effects */
		transition: all var(--transition-duration) ease;
	}

	/* Gaming Accent */
	.liquid-glass-cta__accent {
		position: absolute;
		top: 50%;
		right: -2px;
		width: 3px;
		height: 60%;
		background: var(--liquid-glass-accent);
		border-radius: 2px;
		transform: translateY(-50%);
		opacity: 0.8;

		/* Pulse animation */
		animation: accentPulse 2s ease-in-out infinite;
	}

	@keyframes accentPulse {
		0%,
		100% {
			opacity: 0.8;
			box-shadow: 0 0 5px var(--liquid-glass-accent);
		}
		50% {
			opacity: 1;
			box-shadow: 0 0 15px var(--liquid-glass-accent);
		}
	}

	/* Specular Highlight Layer */
	.liquid-glass-cta__highlight {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: radial-gradient(
			circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
			rgba(255, 255, 255, var(--highlight-intensity)) 0%,
			rgba(255, 255, 255, 0.1) 30%,
			transparent 60%
		);
		opacity: 0;
		transition: opacity var(--transition-duration) ease;
		pointer-events: none;
	}

	/* Interactive Ripple */
	.liquid-glass-cta__ripple {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: radial-gradient(
			circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
			var(--liquid-glass-ripple) 0%,
			transparent 70%
		);
		opacity: 0;
		transform: scale(0.8);
		transition: all var(--transition-duration) ease;
		pointer-events: none;
	}

	/* Border Glow */
	.liquid-glass-cta__border-glow {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		padding: 1px;
		background: linear-gradient(
			135deg,
			var(--liquid-glass-border-start),
			var(--liquid-glass-border-mid),
			var(--liquid-glass-border-end)
		);
		mask:
			linear-gradient(#fff 0 0) content-box,
			linear-gradient(#fff 0 0);
		mask-composite: xor;
		-webkit-mask:
			linear-gradient(#fff 0 0) content-box,
			linear-gradient(#fff 0 0);
		-webkit-mask-composite: xor;
		opacity: var(--border-opacity);
		transition: opacity var(--transition-duration) ease;
	}

	/* Mount Animation */
	.liquid-glass-cta--mounted {
		animation: liquidGlassMount 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	@keyframes liquidGlassMount {
		0% {
			opacity: 0;
			transform: scale(0.9) translateY(20px);
			filter: blur(10px);
		}
		60% {
			opacity: 0.8;
			transform: scale(1.05) translateY(-5px);
			filter: blur(2px);
		}
		100% {
			opacity: 1;
			transform: scale(1) translateY(0);
			filter: blur(0);
		}
	}

	/* Hover State */
	.liquid-glass-cta--hovered {
		transform: scale(var(--hover-scale));
		filter: drop-shadow(0 8px 40px rgba(0, 0, 0, 0.2)) url(#liquid-glass-glow);
	}

	.liquid-glass-cta--hovered .liquid-glass-cta__base {
		--glass-opacity: 0.25;
		box-shadow:
			inset 0 1px 0 var(--liquid-glass-highlight),
			inset 0 -1px 0 var(--liquid-glass-shadow),
			0 12px 48px var(--liquid-glass-drop-shadow-intense);
	}

	.liquid-glass-cta--hovered .liquid-glass-cta__highlight {
		opacity: 1;
	}

	.liquid-glass-cta--hovered .liquid-glass-cta__ripple {
		opacity: 0.6;
		transform: scale(1);
	}

	.liquid-glass-cta--hovered .liquid-glass-cta__border-glow {
		opacity: calc(var(--border-opacity) * 2);
	}

	.liquid-glass-cta--hovered .liquid-glass-cta__text {
		text-shadow: 0 0 20px var(--liquid-glass-text-glow);
	}

	/* Pressed State */
	.liquid-glass-cta--pressed {
		transform: scale(var(--press-scale));
		filter: drop-shadow(0 2px 10px rgba(0, 0, 0, 0.3));
	}

	.liquid-glass-cta--pressed .liquid-glass-cta__base {
		--glass-opacity: 0.4;
	}

	.liquid-glass-cta--pressed .liquid-glass-cta__ripple {
		opacity: 1;
		transform: scale(1.2);
	}

	/* Disabled State */
	.liquid-glass-cta--disabled {
		opacity: 0.5;
		cursor: not-allowed;
		pointer-events: none;
	}

	/* SVG Filters Container */
	.liquid-glass-cta__filters {
		position: absolute;
		width: 0;
		height: 0;
		pointer-events: none;
		visibility: hidden;
	}

	/* =============================================================================
	   CSS Custom Properties for Liquid Glass CTA
	   ============================================================================= */

	:root {
		/* Primary Variant Colors - Dark Theme */
		--liquid-glass-base: rgba(39, 255, 153, 0.12);
		--liquid-glass-highlight: rgba(255, 255, 255, 0.15);
		--liquid-glass-shadow: rgba(0, 0, 0, 0.1);
		--liquid-glass-drop-shadow: rgba(39, 255, 153, 0.25);
		--liquid-glass-drop-shadow-intense: rgba(39, 255, 153, 0.4);
		--liquid-glass-text: #77ffa1;
		--liquid-glass-text-glow: rgba(119, 255, 161, 0.5);
		--liquid-glass-accent: #00ff80;
		--liquid-glass-ripple: rgba(39, 255, 153, 0.2);
		--liquid-glass-distortion-bg: linear-gradient(
			135deg,
			rgba(39, 255, 153, 0.1),
			rgba(0, 255, 128, 0.05)
		);

		/* Border Gradient */
		--liquid-glass-border-start: rgba(39, 255, 153, 0.4);
		--liquid-glass-border-mid: rgba(119, 255, 161, 0.6);
		--liquid-glass-border-end: rgba(0, 255, 128, 0.3);
	}

	/* Light Theme Overrides */
	:global(html.light) {
		--liquid-glass-base: rgba(0, 179, 90, 0.18);
		--liquid-glass-highlight: rgba(255, 255, 255, 0.9);
		--liquid-glass-shadow: rgba(0, 0, 0, 0.05);
		--liquid-glass-drop-shadow: rgba(0, 179, 90, 0.2);
		--liquid-glass-drop-shadow-intense: rgba(0, 179, 90, 0.35);
		--liquid-glass-text: #00b35a;
		--liquid-glass-text-glow: rgba(0, 179, 90, 0.4);
		--liquid-glass-accent: #00e670;
		--liquid-glass-ripple: rgba(0, 179, 90, 0.15);
		--liquid-glass-distortion-bg: linear-gradient(
			135deg,
			rgba(0, 179, 90, 0.1),
			rgba(0, 230, 112, 0.05)
		);

		/* Light Border Gradient */
		--liquid-glass-border-start: rgba(0, 179, 90, 0.3);
		--liquid-glass-border-mid: rgba(0, 230, 112, 0.5);
		--liquid-glass-border-end: rgba(39, 255, 153, 0.2);
	}

	/* Secondary Variant */
	.liquid-glass-cta--secondary {
		--liquid-glass-base: rgba(30, 144, 255, 0.12);
		--liquid-glass-drop-shadow: rgba(30, 144, 255, 0.25);
		--liquid-glass-drop-shadow-intense: rgba(30, 144, 255, 0.4);
		--liquid-glass-text: #66b8ff;
		--liquid-glass-text-glow: rgba(102, 184, 255, 0.5);
		--liquid-glass-accent: #1e90ff;
		--liquid-glass-ripple: rgba(30, 144, 255, 0.2);
		--liquid-glass-border-start: rgba(30, 144, 255, 0.4);
		--liquid-glass-border-mid: rgba(102, 184, 255, 0.6);
		--liquid-glass-border-end: rgba(51, 159, 255, 0.3);
	}

	:global(html.light) .liquid-glass-cta--secondary {
		--liquid-glass-base: rgba(16, 109, 191, 0.18);
		--liquid-glass-drop-shadow: rgba(16, 109, 191, 0.2);
		--liquid-glass-drop-shadow-intense: rgba(16, 109, 191, 0.35);
		--liquid-glass-text: #156bbf;
		--liquid-glass-text-glow: rgba(21, 107, 191, 0.4);
		--liquid-glass-accent: #1a82e6;
		--liquid-glass-ripple: rgba(16, 109, 191, 0.15);
		--liquid-glass-border-start: rgba(16, 109, 191, 0.3);
		--liquid-glass-border-mid: rgba(26, 130, 230, 0.5);
		--liquid-glass-border-end: rgba(30, 144, 255, 0.2);
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		.liquid-glass-cta {
			/* Adjust for mobile touch targets */
			min-height: 44px;
			--glass-blur: 16px;
		}

		.liquid-glass-cta--small {
			--cta-padding-x: 1.25rem;
			--cta-padding-y: 0.875rem;
		}

		.liquid-glass-cta--large {
			--cta-padding-x: 2rem;
			--cta-padding-y: 1rem;
		}
	}

	@media (max-width: 480px) {
		.liquid-glass-cta {
			/* Further mobile optimizations */
			width: 100%;
			max-width: 280px;
			--glass-blur: 12px;
		}

		.liquid-glass-cta__text {
			font-size: 0.875rem;
		}
	}

	/* Accessibility & Reduced Motion */
	@media (prefers-reduced-motion: reduce) {
		.liquid-glass-cta,
		.liquid-glass-cta__highlight,
		.liquid-glass-cta__ripple,
		.liquid-glass-cta__border-glow,
		.liquid-glass-cta__text,
		.liquid-glass-cta__accent {
			animation: none;
			transition: none;
		}

		.liquid-glass-cta__distortion {
			filter: none;
		}
	}

	@media (prefers-contrast: high) {
		.liquid-glass-cta {
			--border-opacity: 0.8;
			--glass-opacity: 0.3;
		}

		.liquid-glass-cta__text {
			text-shadow: none;
			font-weight: 600;
		}
	}

	/* Focus States for Accessibility */
	.liquid-glass-cta:focus-visible {
		outline: 2px solid var(--liquid-glass-text);
		outline-offset: 4px;
		transform: scale(var(--hover-scale));
	}

	.liquid-glass-cta:focus-visible .liquid-glass-cta__border-glow {
		opacity: 1;
		animation: focusGlow 1s ease-in-out infinite alternate;
	}

	@keyframes focusGlow {
		0% {
			opacity: 0.5;
		}
		100% {
			opacity: 1;
		}
	}
</style>

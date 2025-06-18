<!-- DO NOT REMOVE THIS COMMENT
/src/lib/components/ui/SkillBar.svelte
DO NOT REMOVE THIS COMMENT -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { tweened } from 'svelte/motion';
	import { cubicOut, backOut } from 'svelte/easing';

	// Props
	export let name: string;
	export let level: number; // 0-100
	export let delay: number = 0; // Animation delay in ms
	export let showPercentage: boolean = true;
	export let variant: 'primary' | 'secondary' = 'primary';
	export let glowEffect: boolean = true;

	// Animation stores
	const progress = tweened(0, {
		duration: 1200,
		easing: backOut
	});

	const percentage = tweened(0, {
		duration: 1000,
		easing: cubicOut
	});

	// Component state
	let skillBarElement: HTMLElement;
	let isVisible = false;
	let hasAnimated = false;

	// Intersection Observer for scroll-triggered animation
	onMount(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				const entry = entries[0];
				if (entry.isIntersecting && !hasAnimated) {
					isVisible = true;
					startAnimation();
					hasAnimated = true;
					observer.disconnect();
				}
			},
			{
				threshold: 0.3,
				rootMargin: '50px'
			}
		);

		if (skillBarElement) {
			observer.observe(skillBarElement);
		}

		return () => {
			observer.disconnect();
		};
	});

	function startAnimation() {
		setTimeout(() => {
			// Animate progress bar
			progress.set(level);

			// Animate percentage counter with slight delay
			setTimeout(() => {
				percentage.set(level);
			}, 200);
		}, delay);
	}

	// Reactive values for display
	$: displayPercentage = Math.round($percentage);
	$: progressWidth = $progress;

	// Dynamic classes
	$: skillBarClasses = [
		'skill-bar',
		`skill-bar--${variant}`,
		isVisible ? 'skill-bar--visible' : '',
		glowEffect ? 'skill-bar--glow' : ''
	]
		.filter(Boolean)
		.join(' ');
</script>

<div
	bind:this={skillBarElement}
	class={skillBarClasses}
	role="progressbar"
	aria-valuenow={displayPercentage}
	aria-valuemin="0"
	aria-valuemax="100"
	aria-label={`${name} skill level: ${displayPercentage}%`}
>
	<!-- Skill Name and Percentage -->
	<div class="skill-bar__header">
		<span class="skill-bar__name">{name}</span>
		{#if showPercentage}
			<span class="skill-bar__percentage" aria-live="polite">
				{displayPercentage}%
			</span>
		{/if}
	</div>

	<!-- Progress Container -->
	<div class="skill-bar__container">
		<!-- Background Track -->
		<div class="skill-bar__track" aria-hidden="true"></div>

		<!-- Progress Fill -->
		<div class="skill-bar__fill" style="width: {progressWidth}%" aria-hidden="true">
			<!-- Animated Shine Effect -->
			<div class="skill-bar__shine"></div>

			<!-- Glow Effect -->
			{#if glowEffect}
				<div class="skill-bar__glow"></div>
			{/if}

			<!-- Progress Indicator Dot -->
			<div class="skill-bar__indicator"></div>
		</div>

		<!-- Percentage Marker Lines -->
		<div class="skill-bar__markers" aria-hidden="true">
			{#each [25, 50, 75] as marker}
				<div class="skill-bar__marker" style="left: {marker}%" data-value="{marker}%"></div>
			{/each}
		</div>
	</div>
</div>

<style>
	/* =============================================================================
	   Enhanced Skill Bar Component
	   ============================================================================= */

	.skill-bar {
		width: 100%;
		opacity: 0;
		transform: translateY(20px);
		transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.skill-bar--visible {
		opacity: 1;
		transform: translateY(0);
	}

	/* Header Section */
	.skill-bar__header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
		gap: 1rem;
	}

	.skill-bar__name {
		color: var(--skill-name-color);
		font-size: 1.1rem;
		font-weight: 500;
		line-height: 1.4;
		flex: 1;
		min-width: 0; /* Allows text truncation if needed */
	}

	.skill-bar__percentage {
		color: var(--skill-percentage-color);
		font-family: var(--font-press-start), monospace;
		font-size: 0.9rem;
		font-weight: 400;
		letter-spacing: 0.5px;
		flex-shrink: 0;
		text-shadow: 0 0 8px var(--skill-percentage-glow);
		transition: all 0.3s ease;
	}

	/* Progress Container */
	.skill-bar__container {
		position: relative;
		height: 16px;
		border-radius: 12px;
		overflow: hidden;
		background: var(--skill-track-bg);
		border: 1px solid var(--skill-track-border);
		box-shadow:
			inset 0 2px 4px var(--skill-track-shadow),
			0 1px 2px rgba(0, 0, 0, 0.1);
	}

	/* Background Track */
	.skill-bar__track {
		position: absolute;
		inset: 0;
		background: var(--skill-track-pattern);
		background-size: 20px 20px;
		opacity: 0.3;
		border-radius: inherit;
	}

	/* Progress Fill */
	.skill-bar__fill {
		position: relative;
		height: 100%;
		background: var(--skill-fill-gradient);
		border-radius: inherit;
		transition: width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1);
		overflow: hidden;
		box-shadow:
			0 0 8px var(--skill-fill-glow),
			inset 0 1px 0 var(--skill-fill-highlight);
	}

	.skill-bar--glow .skill-bar__fill {
		box-shadow:
			0 0 12px var(--skill-fill-glow),
			0 0 24px var(--skill-fill-glow-outer),
			inset 0 1px 0 var(--skill-fill-highlight);
	}

	/* Animated Shine Effect */
	.skill-bar__shine {
		position: absolute;
		top: 0;
		left: -100%;
		width: 100%;
		height: 100%;
		background: linear-gradient(
			90deg,
			transparent 0%,
			rgba(255, 255, 255, 0.4) 50%,
			transparent 100%
		);
		animation: shineMove 2.5s ease-in-out infinite;
		animation-delay: 0.5s;
	}

	/* Glow Effect */
	.skill-bar__glow {
		position: absolute;
		inset: -2px;
		background: var(--skill-fill-gradient);
		border-radius: inherit;
		filter: blur(8px);
		opacity: 0.6;
		z-index: -1;
		animation: glowPulse 2s ease-in-out infinite alternate;
	}

	/* Progress Indicator Dot */
	.skill-bar__indicator {
		position: absolute;
		top: 50%;
		right: 2px;
		width: 8px;
		height: 8px;
		background: rgba(255, 255, 255, 0.9);
		border-radius: 50%;
		transform: translateY(-50%);
		box-shadow:
			0 0 4px rgba(255, 255, 255, 0.8),
			0 0 8px var(--skill-indicator-glow);
		animation: indicatorPulse 1.5s ease-in-out infinite;
	}

	/* Percentage Marker Lines */
	.skill-bar__markers {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.skill-bar__marker {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 1px;
		background: var(--skill-marker-color);
		opacity: 0.4;
		transition: opacity 0.3s ease;
	}

	.skill-bar__marker::after {
		content: attr(data-value);
		position: absolute;
		top: -1.5rem;
		left: 50%;
		transform: translateX(-50%);
		font-size: 0.7rem;
		color: var(--skill-marker-text);
		font-family: var(--font-press-start), monospace;
		opacity: 0;
		transition: opacity 0.3s ease;
		pointer-events: none;
	}

	.skill-bar:hover .skill-bar__marker::after {
		opacity: 0.7;
	}

	/* Variant Styles */
	.skill-bar--secondary .skill-bar__fill {
		background: var(--skill-fill-gradient-secondary);
	}

	.skill-bar--secondary .skill-bar__glow {
		background: var(--skill-fill-gradient-secondary);
	}

	/* Animations */
	@keyframes shineMove {
		0% {
			left: -100%;
		}
		50% {
			left: 100%;
		}
		100% {
			left: 100%;
		}
	}

	@keyframes glowPulse {
		0% {
			opacity: 0.4;
			transform: scale(1);
		}
		100% {
			opacity: 0.8;
			transform: scale(1.05);
		}
	}

	@keyframes indicatorPulse {
		0%,
		100% {
			opacity: 0.8;
			transform: translateY(-50%) scale(1);
		}
		50% {
			opacity: 1;
			transform: translateY(-50%) scale(1.2);
		}
	}

	/* =============================================================================
	   CSS Custom Properties for Skill Bars
	   ============================================================================= */

	:root {
		/* Text Colors */
		--skill-name-color: var(--arcade-white-200);
		--skill-percentage-color: var(--arcade-neon-green-400);
		--skill-percentage-glow: rgba(119, 255, 161, 0.4);

		/* Track */
		--skill-track-bg: rgba(43, 43, 43, 0.6);
		--skill-track-border: rgba(255, 255, 255, 0.1);
		--skill-track-shadow: rgba(0, 0, 0, 0.3);
		--skill-track-pattern: repeating-linear-gradient(
			45deg,
			transparent,
			transparent 10px,
			rgba(255, 255, 255, 0.02) 10px,
			rgba(255, 255, 255, 0.02) 20px
		);

		/* Fill Gradients */
		--skill-fill-gradient: linear-gradient(
			90deg,
			var(--arcade-neon-green-600) 0%,
			var(--arcade-neon-green-500) 30%,
			var(--arcade-electric-blue-500) 70%,
			var(--arcade-electric-blue-400) 100%
		);

		--skill-fill-gradient-secondary: linear-gradient(
			90deg,
			var(--arcade-magenta-600) 0%,
			var(--arcade-magenta-500) 30%,
			var(--arcade-bright-yellow-500) 70%,
			var(--arcade-bright-yellow-400) 100%
		);

		/* Glow Effects */
		--skill-fill-glow: rgba(119, 255, 161, 0.3);
		--skill-fill-glow-outer: rgba(119, 255, 161, 0.15);
		--skill-fill-highlight: rgba(255, 255, 255, 0.3);
		--skill-indicator-glow: var(--arcade-neon-green-500);

		/* Markers */
		--skill-marker-color: rgba(255, 255, 255, 0.3);
		--skill-marker-text: var(--arcade-white-300);
	}

	/* Light Theme Overrides */
	:global(html.light) {
		--skill-name-color: var(--arcade-black-600);
		--skill-percentage-color: var(--arcade-neon-green-800);
		--skill-percentage-glow: rgba(0, 179, 90, 0.4);

		--skill-track-bg: rgba(245, 245, 220, 0.3);
		--skill-track-border: rgba(0, 0, 0, 0.1);
		--skill-track-shadow: rgba(0, 0, 0, 0.1);

		--skill-fill-glow: rgba(0, 179, 90, 0.4);
		--skill-fill-glow-outer: rgba(0, 179, 90, 0.2);
		--skill-fill-highlight: rgba(255, 255, 255, 0.8);
		--skill-indicator-glow: var(--arcade-neon-green-700);

		--skill-marker-color: rgba(0, 0, 0, 0.2);
		--skill-marker-text: var(--arcade-black-500);
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		.skill-bar__header {
			margin-bottom: 0.5rem;
		}

		.skill-bar__name {
			font-size: 1rem;
		}

		.skill-bar__percentage {
			font-size: 0.8rem;
		}

		.skill-bar__container {
			height: 14px;
		}

		.skill-bar__indicator {
			width: 6px;
			height: 6px;
		}
	}

	@media (max-width: 480px) {
		.skill-bar__name {
			font-size: 0.95rem;
		}

		.skill-bar__percentage {
			font-size: 0.75rem;
		}

		.skill-bar__container {
			height: 12px;
		}
	}

	/* Accessibility */
	@media (prefers-reduced-motion: reduce) {
		.skill-bar {
			transition: opacity 0.3s ease;
		}

		.skill-bar__fill {
			transition: width 0.5s ease;
		}

		.skill-bar__shine,
		.skill-bar__glow,
		.skill-bar__indicator {
			animation: none;
		}

		.skill-bar__shine {
			display: none;
		}
	}

	@media (prefers-contrast: high) {
		.skill-bar__container {
			border-width: 2px;
		}

		.skill-bar__percentage {
			text-shadow: none;
		}
	}
</style>

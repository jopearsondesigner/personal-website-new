<!-- DO NOT REMOVE THIS COMMENT
/src/lib/components/sections/About.svelte
DO NOT REMOVE THIS COMMENT -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import CRTDisplay from '$lib/components/ui/CRTDisplay.svelte';
	import LiquidGlassCTA from '$lib/components/ui/LiquidGlassCTA.svelte';

	import SkillBar from '$lib/components/ui/SkillBar.svelte';

	// Animation state
	let sectionVisible = false;
	let sectionElement: HTMLElement;

	// Configuration data
	const skills = [
		{ name: 'Frontend Development', level: 90 },
		{ name: 'UI/UX Design', level: 85 },
		{ name: 'SvelteKit', level: 80 },
		{ name: 'CSS/Animation', level: 85 },
		{ name: 'Responsive Design', level: 95 }
	];

	// UVP bullet points based on psychometrics test
	const uvpPoints = [
		'Design and develop in one streamlined process—no costly handoffs or miscommunication',
		'Turn vague ideas into polished products with minimal direction needed',
		'Full-spectrum capabilities: graphics, UI/UX, branding, and front-end development',
		'Startup-proven approach that scales to enterprise needs'
	];

	onMount(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					sectionVisible = true;
					observer.disconnect(); // Only animate once
				}
			},
			{ threshold: 0.2 }
		);

		if (sectionElement) {
			observer.observe(sectionElement);
		}

		return () => {
			observer.disconnect();
		};
	});
</script>

<section id="about" class="about-section" bind:this={sectionElement}>
	<div class="about-container">
		{#if sectionVisible}
			<!-- UVP Display Panel -->
			<div in:fly={{ y: 50, duration: 800, delay: 200, easing: backOut }} class="about-uvp">
				<CRTDisplay
					variant="primary"
					headerLabel="UVP"
					scanlineIntensity="medium"
					glassEffect={true}
					enableHover={true}
					minHeight="576px"
					className="uvp-display"
				>
					<!-- Main UVP Content -->
					<div class="uvp-content">
						<h2 class="uvp-heading">
							<span class="dark:text-[var(--arcade-bright-yellow-100)]">From concept to code</span
							>&mdash;eliminating design handoffs for faster, seamless digital solutions
						</h2>

						<div class="uvp-points">
							{#each uvpPoints as point, i}
								<div
									in:fly={{
										x: -20,
										duration: 400,
										delay: 600 + i * 100,
										easing: backOut
									}}
									class="uvp-point"
								>
									<div class="point-indicator"></div>
									<span class="point-text">{point}</span>
								</div>
							{/each}
						</div>
					</div>

					<!-- Avatar positioned through slot -->
					<svelte:fragment slot="avatar">
						<div
							in:fly={{ x: 50, duration: 800, delay: 800, easing: backOut }}
							class="avatar-wrapper"
						>
							<img
								src="assets/images/home/jo_avatar.png"
								alt="Jo Pearson - Pixelated Avatar"
								class="avatar-image"
							/>
						</div>
					</svelte:fragment>
				</CRTDisplay>
			</div>

			<!-- Technical Expertise Display Panel -->
			<div in:fly={{ y: 50, duration: 800, delay: 1000, easing: backOut }} class="about-skills">
				<CRTDisplay
					variant="secondary"
					headerLabel="TECH"
					scanlineIntensity="low"
					glassEffect={true}
					enableHover={true}
					className="skills-display"
				>
					<div class="skills-content">
						<h3 class="skills-heading">Technical Expertise</h3>
						<div class="skills-grid">
							{#each skills as skill, i}
								<SkillBar
									name={skill.name}
									level={skill.level}
									delay={200 + i * 150}
									variant="primary"
									glowEffect={true}
									showPercentage={true}
								/>
							{/each}
						</div>
					</div>
				</CRTDisplay>
			</div>
		{/if}
	</div>
</section>

<style>
	/* =============================================================================
	   About Section Styles
	   ============================================================================= */

	.about-section {
		padding: 4rem 0;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		justify-content: center;
		position: relative;

		/* Ensure proper background inheritance */
		background: inherit;
	}

	.about-container {
		width: 100%;
		max-width: 1280px;
		margin: 0 auto;
		padding: 0 1rem;
		display: flex;
		flex-direction: column;
		gap: 3rem;
	}

	/* UVP Section */
	.about-uvp {
		width: 100%;
	}

	:global(.uvp-display) {
		/* Custom positioning for UVP content */
		position: relative;
	}

	.uvp-content {
		max-width: 100%;
		padding-right: 160px; /* Space for avatar */
		position: relative;
		z-index: 20;
	}

	.uvp-heading {
		font-family: var(--header-text), sans-serif;
		font-size: clamp(3.1rem, 5vw, 3rem);
		font-weight: 700;
		color: var(--about-heading-color);
		margin-bottom: 2rem;
		line-height: 1.2;
		letter-spacing: -0.02em;
		text-shadow: 0 2px 4px var(--about-text-shadow);
	}

	.uvp-heading-uppercase-fix {
		letter-spacing: 0.06em;
	}

	.uvp-points {
		display: flex;
		flex-direction: column;
		align-items: start; /* <-- vertically centers bullet + text */
		gap: 1.25rem;
	}

	.uvp-point {
		display: flex;
		align-items: center;
		gap: 1rem;
		opacity: 0.95;
		transition: opacity 0.3s ease;
	}

	.uvp-point:hover {
		opacity: 1;
	}

	.point-indicator {
		width: 6px;
		height: 6px;
		background: var(--about-accent-color);
		border-radius: 50%;
		flex-shrink: 0;
		box-shadow:
			0 0 8px var(--about-accent-glow),
			0 0 16px var(--about-accent-glow-outer);
		animation: indicatorPulse 2s ease-in-out infinite;
	}

	@keyframes indicatorPulse {
		0%,
		100% {
			transform: scale(1);
			opacity: 0.8;
		}
		50% {
			transform: scale(1.1);
			opacity: 1;
		}
	}

	.point-text {
		color: var(--about-text-color);
		font-size: 1.575rem;
		line-height: 1.5;
		font-weight: 400;
		text-shadow: 0 1px 2px var(--about-text-shadow-subtle);
	}

	/* Avatar Styling */
	.avatar-wrapper {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		overflow: hidden;
	}

	.avatar-image {
		width: 100%;
		height: 576px;
		object-fit: cover;
		object-position: bottom center;

		/* Pixel art rendering */
		image-rendering: pixelated;
		image-rendering: -moz-crisp-edges;
		image-rendering: crisp-edges;

		/* Enhanced visual effects */
		filter: var(--about-avatar-filter);
		transition: filter 0.3s ease;
	}

	.avatar-image:hover {
		filter: var(--about-avatar-filter-hover);
	}

	/* Skills Section */
	.about-skills {
		width: 100%;
	}

	.skills-content {
		position: relative;
		z-index: 20;
	}

	.skills-heading {
		font-family: var(--header-text), sans-serif;
		font-size: 1.75rem;
		font-weight: 600;
		color: var(--about-heading-color);
		margin-bottom: 2rem;
		text-align: center;
		text-shadow: 0 2px 4px var(--about-text-shadow);
	}

	.skills-grid {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	/* =============================================================================
	   CSS Custom Properties for About Section
	   ============================================================================= */

	:root {
		/* Dark Theme Colors */
		--about-heading-color: var(--arcade-white-200);
		--about-text-color: rgba(245, 245, 220, 0.92);
		--about-accent-color: var(--arcade-neon-green-200);
		--about-accent-glow: rgba(119, 255, 161, 0.4);
		--about-accent-glow-outer: rgba(199, 255, 219, 0.2);

		/* Text Shadows */
		--about-text-shadow: rgba(43, 43, 43, 0.3);
		--about-text-shadow-subtle: rgba(43, 43, 43, 0.1);

		/* Avatar Effects */
		--about-avatar-filter: brightness(1.05) contrast(1.1) saturate(1.1);
		--about-avatar-filter-hover: brightness(1.1) contrast(1.15) saturate(1.2);
	}

	/* Light Theme Overrides */
	:global(html.light) {
		--about-heading-color: var(--arcade-black-700);
		--about-text-color: var(--arcade-black-600);
		--about-accent-color: var(--arcade-neon-green-700);
		--about-accent-glow: rgba(0, 179, 90, 0.5);
		--about-accent-glow-outer: rgba(0, 179, 90, 0.25);

		--about-text-shadow: rgba(245, 245, 220, 0.8);
		--about-text-shadow-subtle: rgba(245, 245, 220, 0.5);

		--about-avatar-filter: brightness(1) contrast(1.05) saturate(1);
		--about-avatar-filter-hover: brightness(1.05) contrast(1.1) saturate(1.1);
	}

	/* =============================================================================
	   Responsive Design
	   ============================================================================= */

	@media (max-width: 768px) {
		.about-section {
			padding: 2rem 0;
		}

		.about-container {
			padding: 0 0.5rem;
			gap: 2rem;
		}

		.uvp-content {
			padding-right: 0;
			margin-bottom: 320px; /* Space for mobile avatar */
		}

		.uvp-heading {
			text-align: center;
			margin-bottom: 1.5rem;
		}

		.point-text {
			font-size: 1.1rem;
		}

		.skills-heading {
			font-size: 1.5rem;
		}

		/* Ensure avatar positioning works on mobile */
		:global(.uvp-display .crt-display__avatar) {
			position: absolute;
			bottom: 0;
			right: 50%;
			transform: translateX(50%);
			width: 280px;
			height: 320px;
		}

		.avatar-image {
			height: auto;
			max-height: 320px;
			object-fit: contain;
			min-height: auto;
		}
	}

	@media (max-width: 480px) {
		.about-container {
			gap: 1.5rem;
		}

		.uvp-content {
			margin-bottom: 280px;
		}

		.uvp-points {
			gap: 1rem;
		}

		.point-text {
			font-size: 1rem;
		}

		:global(.uvp-display .crt-display__avatar) {
			width: 240px;
			height: 280px;
		}

		.avatar-image {
			max-height: 280px;
		}
	}

	/* =============================================================================
	   Accessibility Enhancements
	   ============================================================================= */

	@media (prefers-reduced-motion: reduce) {
		.point-indicator {
			animation: none;
		}

		.avatar-image {
			transition: none;
		}

		.uvp-point {
			transition: none;
		}
	}

	@media (prefers-contrast: high) {
		.point-indicator {
			border: 2px solid currentColor;
		}

		.uvp-heading,
		.skills-heading {
			text-shadow: none;
		}

		.point-text {
			text-shadow: none;
		}
	}

	/* =============================================================================
	   Performance Optimizations
	   ============================================================================= */

	.about-section {
		/* Hardware acceleration */
		transform: translateZ(0);
		will-change: auto;
		contain: layout style paint;
	}

	.uvp-content,
	.skills-content {
		/* Optimize rendering */
		contain: layout style;
	}

	.avatar-image {
		/* Optimize image rendering */
		transform: translateZ(0);
		backface-visibility: hidden;
	}
</style>

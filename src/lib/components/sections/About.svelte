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
		{
			name: 'User Experience Design — Research-driven solutions that increase engagement and conversions',
			level: 99
		},
		{
			name: 'Interactive Development — High-performance interfaces built with modern frameworks and optimized code',
			level: 99
		},
		{
			name: 'Visual Communication — Strategic design that enhances brand perception and drives user trust',
			level: 99
		},
		{
			name: 'System Integration — Seamless connection between frontend experiences and backend functionality',
			level: 99
		},
		{
			name: 'Process Optimization — Streamlined workflows that reduce costs and accelerate delivery timelines',
			level: 99
		}
	];

	// UVP bullet points based on psychometrics test
	const uvpPoints = [
		'Transform abstract business goals into profitable digital experiences with minimal direction needed',
		'Full-spectrum capabilities: graphics, UI/UX, branding, and front-end development',
		'Quality-first handcrafted solutions that deliver measurable results, not just aesthetic appeal',
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
						<h2 class="uvp-heading orbitron-bold">
							<span
								class="text-[var(--metallic-gold-500)] dark:text-[var(--arcade-bright-yellow-100)]"
								>From concept to code</span
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
									<span class="point-text ibm-bold">{point}</span>
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
								src="assets/images/home/jo_avatar.svg"
								alt="Jo Pearson - Pixelated Avatar"
								class="avatar-image"
							/>
						</div>
					</svelte:fragment>
				</CRTDisplay>
			</div>

			<!-- Dual Column Layout: Expertise + Skills -->
			<div class="about-dual-column">
				<!-- Left Column: Expertise -->
				<div
					in:fly={{ x: -50, duration: 800, delay: 1000, easing: backOut }}
					class="about-expertise"
				>
					<div class="expertise-content">
						<h3 class="expertise-heading orbitron-bold">
							<span
								class="text-[var(--metallic-gold-500)] dark:text-[var(--arcade-bright-yellow-100)]"
							>
								The Unified Development Approach
							</span>
							Eliminating Traditional Project Bottlenecks
						</h3>

						<div class="expertise-description ibm-regular">
							<p>
								Most digital projects fail due to the disconnect between design vision and
								development reality. My integrated approach eliminates these friction points by
								maintaining consistent ownership throughout the entire process—from initial concept
								through final deployment.
							</p>

							<p class="text-arcade-white-200/80 mb-4">This seamless methodology delivers:</p>
							<ul class="space-y-3">
								<li
									class="custom-bullet text-arcade-white-200/90 text-base leading-relaxed hover:text-arcade-white-200 transition-colors duration-300"
								>
									40% faster project completion through eliminated handoff delays
								</li>
								<li
									class="custom-bullet text-arcade-white-200/90 text-base leading-relaxed hover:text-arcade-white-200 transition-colors duration-300"
								>
									Consistent design execution without interpretation gaps
								</li>
								<li
									class="custom-bullet text-arcade-white-200/90 text-base leading-relaxed hover:text-arcade-white-200 transition-colors duration-300"
								>
									Proactive problem-solving that prevents expensive late-stage revisions
								</li>
								<li
									class="custom-bullet text-arcade-white-200/90 text-base leading-relaxed hover:text-arcade-white-200 transition-colors duration-300"
								>
									Direct communication that keeps projects on track and on budget
								</li>
								<li
									class="custom-bullet text-arcade-white-200/90 text-base leading-relaxed hover:text-arcade-white-200 transition-colors duration-300"
								>
									Solutions that are both visually compelling and technically sound
								</li>
							</ul>

							<p class="expertise-highlight ibm-bold">
								<span class="text-[var(--arcade-bright-green-300)]">The result:</span>
								Digital products that not only look exceptional but perform flawlessly, converting visitors
								into customers and supporting sustainable business growth.
							</p>
						</div>
					</div>
				</div>

				<!-- Right Column: Technical Skills (65% width) -->
				<div
					in:fly={{ y: 50, duration: 800, delay: 1200, easing: backOut }}
					class="about-skills about-skills--reduced"
				>
					<CRTDisplay
						variant="secondary"
						headerLabel="Ops"
						scanlineIntensity="low"
						glassEffect={true}
						enableHover={true}
						className="skills-display"
					>
						<div class="skills-content">
							<div class="skills-header">
								<h4 class="skills-title orbitron-bold">Technical Arsenal</h4>
								<p class="skills-subtitle ibm-regular">Engineered for Modern Digital Challenges</p>
								<p>
									As a T-shaped professional, I combine deep expertise in user experience design
									with comprehensive development capabilities. This rare combination allows me to
									solve complex problems that typically require entire teams, delivering both
									creative excellence and technical precision.
								</p>
							</div>

							<div class="skills-grid">
								{#each skills as skill, i}
									<SkillBar
										name={skill.name}
										level={skill.level}
										delay={400 + i * 150}
										variant="primary"
										glowEffect={true}
										showPercentage={true}
									/>
								{/each}
							</div>
						</div>
					</CRTDisplay>
				</div>
			</div>
		{/if}
	</div>
</section>

<style>
	/* =============================================================================
	   CSS Custom Properties for About Section
	   ============================================================================= */

	:root {
		/* Dark Theme Colors */
		--about-heading-color: var(--arcade-white-200);
		--about-text-color: rgba(245, 245, 220, 0.92);
		--about-accent-color: var(--arcade-electric-blue-200);
		--about-accent-glow: rgba(51, 159, 255, 0.4);
		--about-accent-glow-outer: rgba(21, 107, 191, 0.2);

		/* Text Shadows */
		--about-text-shadow: rgba(43, 43, 43, 0.3);
		--about-text-shadow-subtle: rgba(43, 43, 43, 0.1);

		/* Avatar Effects */
		--about-avatar-filter: brightness(1.05) contrast(1.1) saturate(1.1);
		--about-avatar-filter-hover: brightness(1.1) contrast(1.15) saturate(1.2);
	}

	/* Light Theme Overrides */
	:global(html.light) {
		--about-heading-color: var(--arcade-black-400);
		--about-text-color: var(--arcade-black-600);
		--about-accent-color: var(--arcade-electric-blue-600);
		--about-accent-glow: rgba(51, 159, 255, 0.4);
		--about-accent-glow-outer: rgba(21, 107, 191, 0.2);

		--about-text-shadow: rgba(245, 245, 220, 0.8);
		--about-text-shadow-subtle: rgba(245, 245, 220, 0.5);

		--about-avatar-filter: brightness(1) contrast(1.05) saturate(1);
		--about-avatar-filter-hover: brightness(1.05) contrast(1.1) saturate(1.1);
	}

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
		gap: 4rem;
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
		position: relative;
		z-index: 20;
		padding-right: 0;
	}

	.uvp-heading {
		font-family: var(--header-text), sans-serif;
		font-size: 5.7vmin;
		font-weight: 700;
		color: var(--about-heading-color);
		margin-bottom: 3rem;
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
		transition:
			opacity 0.3s ease,
			max-width 0.3s ease;
	}

	.uvp-point:nth-child(1) {
		max-width: 85%; /* Shorter line */
	}

	.uvp-point:nth-child(2) {
		max-width: 75%; /* Even shorter to curve around avatar */
	}

	.uvp-point:nth-child(3) {
		max-width: 70%; /* Shortest line - curves most around avatar */
	}

	.uvp-point:nth-child(4) {
		max-width: 80%; /* Slightly longer as avatar tapers */
	}

	.uvp-point:hover {
		opacity: 1;
	}

	.point-indicator {
		width: 8px;
		height: 8px;
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
		font-size: 1.675rem;
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
		transform: translateX(15px);
	}

	.avatar-image {
		width: 100%;
		height: 480px;
		object-fit: contain;
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

	/* =============================================================================
	   Dual Column Layout - NEW
	   ============================================================================= */

	.about-dual-column {
		display: grid;
		grid-template-columns: 0.35fr 0.65fr;
		gap: 3rem;
		align-items: start;
		width: 100%;
	}

	/* Expertise Section - NEW */
	.about-expertise {
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		height: 100%;
	}

	.expertise-content {
		padding: 2rem 0;
	}

	.expertise-heading {
		font-family: var(--header-text), sans-serif;
		font-size: clamp(1.75rem, 3vw, 2.25rem);
		line-height: 1.2;
		margin-bottom: 1.5rem;
		color: var(--about-heading-color);
		font-weight: 700;
		text-shadow: 0 2px 4px var(--about-text-shadow);
	}

	.expertise-description {
		color: var(--about-text-color);
		font-size: 1.125rem;
		line-height: 1.7;
		text-shadow: 0 1px 2px var(--about-text-shadow-subtle);
	}

	.expertise-description p {
		margin-bottom: 1.25rem;
	}

	.expertise-description p:last-child {
		margin-bottom: 0;
	}

	.expertise-highlight {
		padding: 1rem;
		background: rgba(var(--arcade-bright-green-300-rgb), 0.05);
		border-left: 3px solid var(--arcade-bright-green-300);
		border-radius: 0 8px 8px 0;
		font-size: 1rem;
		font-weight: 600;
	}

	/* Skills Section - MODIFIED */
	.about-skills {
		width: 100%;
	}

	.about-skills--reduced {
		/* Additional styling for reduced width version */
		max-width: 100%;
	}

	.skills-content {
		position: relative;
		z-index: 20;
		padding: 0;
		margin-top: 2rem;
	}

	.skills-header {
		margin-bottom: 2rem;
	}

	.skills-title {
		font-family: var(--header-text), sans-serif;
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--about-heading-color);
		margin-bottom: 0.5rem;
		text-shadow: 0 2px 4px var(--about-text-shadow);
	}

	.skills-subtitle {
		color: var(--about-text-color);
		font-size: 0.95rem;
		line-height: 1.5;
		opacity: 0.8;
		text-shadow: 0 1px 2px var(--about-text-shadow-subtle);
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
	   Responsive Design
	   ============================================================================= */

	@media (max-width: 1024px) {
		.about-dual-column {
			grid-template-columns: 40% 60%;
			gap: 2rem;
		}

		.expertise-heading {
			font-size: clamp(1.5rem, 2.5vw, 1.875rem);
		}

		.expertise-description {
			font-size: 1rem;
		}
	}

	@media (max-width: 768px) {
		.about-section {
			padding: 2rem 0;
		}

		.about-container {
			padding: 0 0.5rem;
			gap: 2rem;
		}

		.about-dual-column {
			grid-template-columns: 1fr;
			gap: 2rem;
		}

		.about-expertise {
			order: 2;
		}

		.about-skills {
			order: 1;
		}

		.expertise-content {
			padding: 1.5rem 0;
		}

		.expertise-heading {
			font-size: clamp(1.375rem, 4vw, 1.75rem);
			margin-bottom: 1.25rem;
		}

		.expertise-description {
			font-size: 0.95rem;
			line-height: 1.6;
		}

		.expertise-highlight {
			font-size: 0.9rem;
			padding: 0.875rem;
		}

		.uvp-content {
			padding-right: 0;
			margin-bottom: 320px; /* Space for mobile avatar */
		}

		.uvp-heading {
			text-align: center;
			margin-bottom: 2rem;
			font-size: clamp(2.5rem, 8vw, 4rem); /* Increased from default 5.7vmin */
		}

		.point-text {
			font-size: 1.25rem;
			line-height: 1.6;
		}

		.uvp-point:nth-child(1),
		.uvp-point:nth-child(2),
		.uvp-point:nth-child(3),
		.uvp-point:nth-child(4) {
			max-width: 100%; /* Override the curved layout constraints */
		}

		.skills-heading {
			font-size: 1.5rem;
		}

		.skills-header {
			margin-bottom: 1.5rem;
		}

		.skills-title {
			font-size: 1.25rem;
		}

		.skills-subtitle {
			font-size: 0.875rem;
		}

		:global(.uvp-display .crt-display__avatar) {
			position: absolute;
			bottom: 0;
			right: 50%;
			transform: translateX(50%);
			width: 360px;
			height: 400px;
		}

		.avatar-image {
			height: auto;
			max-height: 400px;
			object-fit: contain;
			min-height: auto;
		}
	}

	@media (max-width: 480px) {
		.about-container {
			gap: 1.5rem;
		}

		.uvp-heading {
			font-size: clamp(2.25rem, 7vw, 3.5rem);
			margin-bottom: 1.75rem;
		}

		.expertise-content {
			padding: 1rem 0;
		}

		.uvp-content {
			margin-bottom: 280px;
		}

		.uvp-points {
			gap: 1rem;
		}

		.point-text {
			font-size: 1.125rem;
		}

		:global(.uvp-display .crt-display__avatar) {
			width: 320px;
			height: 360px;
		}

		.avatar-image {
			max-height: 360px;
		}

		.uvp-content {
			margin-bottom: 360px;
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

		.expertise-content,
		.skills-content {
			transition: none;
		}
	}

	@media (prefers-contrast: high) {
		.point-indicator {
			border: 2px solid currentColor;
		}

		.uvp-heading,
		.skills-heading,
		.expertise-heading {
			text-shadow: none;
		}

		.point-text,
		.expertise-description,
		.skills-subtitle {
			text-shadow: none;
		}

		.expertise-highlight {
			border-left-width: 4px;
			background: rgba(var(--arcade-bright-green-300-rgb), 0.1);
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
	.skills-content,
	.expertise-content {
		/* Optimize rendering */
		contain: layout style;
	}

	.avatar-image {
		/* Optimize image rendering */
		transform: translateZ(0);
		backface-visibility: hidden;
	}
</style>

<!-- DO NOT REMOVE THIS COMMENT
/src/lib/components/sections/About.svelte
DO NOT REMOVE THIS COMMENT -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import SkillBar from '$lib/components/ui/SkillBar.svelte';

	// For intersection observer animation
	let sectionVisible = false;
	let sectionElement: HTMLElement;

	const skills = [
		{ name: 'Frontend Development', level: 90 },
		{ name: 'UI/UX Design', level: 85 },
		{ name: 'SvelteKit', level: 80 },
		{ name: 'CSS/Animation', level: 85 },
		{ name: 'Responsive Design', level: 95 }
	];

	// UVP bullet points based on your psychometrics test
	const uvpPoints = [
		'Versatile designer with passion for innovation and problem-solving',
		'Unique blend of creativity and technical expertise',
		'Crafts captivating graphics, intuitive UX, and responsive websites',
		'Thrives in dynamic startup environments',
		'Adapts quickly and thinks outside the box',
		'Delivers exceptional results that exceed expectations'
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

<section
	id="about"
	class="py-16 min-h-screen flex flex-col justify-center"
	bind:this={sectionElement}
>
	<div class="container mx-auto px-4 max-w-6xl">
		{#if sectionVisible}
			<!-- UVP Screen Container -->
			<div in:fly={{ y: 50, duration: 800, delay: 200, easing: backOut }} class="mb-12">
				<div class="subtle-screen">
					<!-- Screen Header -->
					<div class="screen-header">
						<span class="uvp-label">UVP</span>
					</div>

					<!-- Screen Content -->
					<div class="screen-content">
						<!-- Left Side - UVP Content -->
						<div class="uvp-content">
							<h2 class="uvp-heading">
								Empowering Brands with Creative Design Solutions for Digital Success.
							</h2>

							<div class="uvp-points">
								{#each uvpPoints as point, i}
									<div
										in:fly={{ x: -20, duration: 400, delay: 600 + i * 100, easing: backOut }}
										class="uvp-point"
									>
										<div class="point-indicator"></div>
										<span class="point-text">{point}</span>
									</div>
								{/each}
							</div>
						</div>
					</div>

					<!-- Avatar (absolutely positioned) -->
					<div
						in:fly={{ x: 50, duration: 800, delay: 800, easing: backOut }}
						class="avatar-container"
					>
						<img
							src="/assets/images/home/jo_avatar.png"
							alt="Jo Pearson - Pixelated Avatar"
							class="avatar-image"
						/>
					</div>

					<!-- Enhanced scanlines overlay -->
					<div class="scanlines-container">
						<div class="scanlines"></div>
						<div class="scanlines-moving"></div>
						<div class="scanlines-moving-fast"></div>
						<div class="screen-flicker"></div>
					</div>
				</div>
			</div>

			<!-- Skills Section -->
			<div in:fly={{ y: 50, duration: 800, delay: 1000, easing: backOut }}>
				<div class="skills-container subtle-screen">
					<h3 class="skills-heading">Technical Expertise</h3>
					<div class="skills-grid">
						{#each skills as skill, i}
							<div in:fly={{ y: 20, duration: 400, delay: 1200 + i * 100, easing: backOut }}>
								<SkillBar name={skill.name} level={skill.level} />
							</div>
						{/each}
					</div>

					<!-- Enhanced scanlines overlay for skills screen -->
					<div class="scanlines-container">
						<div class="scanlines"></div>
						<div class="scanlines-moving"></div>
						<div class="scanlines-moving-fast"></div>
						<div class="screen-flicker"></div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</section>

<style>
	/* Subtle Screen Container */
	.subtle-screen {
		position: relative;
		width: 100%;
		background: var(--screen-bg);
		border-radius: 20px;
		padding: 3rem;
		box-shadow: var(--screen-shadow);
		border: 1px solid var(--screen-border);
		overflow: hidden;
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		transform: translateZ(0);
		will-change: transform;
		contain: layout style paint;
	}

	/* Screen Header */
	.screen-header {
		position: absolute;
		top: 1rem;
		right: 1.5rem;
		z-index: 2;
	}

	.uvp-label {
		display: inline-block;
		background: var(--label-bg);
		color: var(--label-text);
		padding: 0.5rem 1rem;
		border-radius: 8px;
		font-family: var(--font-press-start), monospace;
		font-size: 0.875rem;
		letter-spacing: 0.5px;
		border: 1px solid var(--label-border);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	/* Screen Content */
	.screen-content {
		position: relative;
		z-index: 1;
		min-height: 576px;
	}

	/* UVP Content */
	.uvp-content {
		max-width: 100%;
		padding-right: 150px;
		position: relative;
		z-index: 2;
	}

	.uvp-heading {
		font-family: var(--header-text), sans-serif;
		font-size: clamp(2rem, 5vw, 3rem);
		font-weight: 700;
		color: var(--heading-color);
		margin-bottom: 2rem;
		line-height: 1.2;
		letter-spacing: -0.02em;
	}

	.uvp-points {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.uvp-point {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		opacity: 0.9;
	}

	.point-indicator {
		width: 10px;
		height: 10px;
		background: var(--accent-color);
		border-radius: 50%;
		margin-top: 0.6rem;
		flex-shrink: 0;
		box-shadow: 0 0 10px var(--accent-glow);
	}

	.point-text {
		color: var(--text-color);
		font-size: 1.2rem;
		line-height: 1.5;
		font-weight: 400;
	}

	/* Avatar Container */
	.avatar-container {
		position: absolute;
		bottom: 0;
		right: -97px;
		width: 550px;
		height: 576px;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		margin: 0;
		padding: 0;
		z-index: 1;
		overflow: hidden;
	}

	.avatar-image {
		width: 100%;
		height: 576px;
		object-fit: cover;
		object-position: bottom center;
		image-rendering: pixelated;
		image-rendering: -moz-crisp-edges;
		image-rendering: crisp-edges;
		filter: var(--avatar-filter);
		display: block;
		min-height: 576px;
	}

	/* Enhanced Scanlines */
	.scanlines-container {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		border-radius: inherit;
		overflow: hidden;
		pointer-events: none;
	}

	.scanlines {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-image: repeating-linear-gradient(
			0deg,
			transparent,
			transparent 14px,
			var(--scanline-color) 14px,
			var(--scanline-color) 16px
		);
		opacity: var(--scanline-opacity);
		pointer-events: none;
		border-radius: inherit;
	}

	.scanlines-moving {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-image: repeating-linear-gradient(
				0deg,
				transparent,
				transparent 14px,
				var(--scanline-moving-color) 14px,
				var(--scanline-moving-color) 16px
			),
			repeating-linear-gradient(
				0deg,
				transparent,
				transparent 30px,
				var(--scanline-moving-color) 30px,
				var(--scanline-moving-color) 32px
			),
			repeating-linear-gradient(
				0deg,
				transparent,
				transparent 46px,
				var(--scanline-moving-color) 46px,
				var(--scanline-moving-color) 48px
			);
		opacity: var(--scanline-moving-opacity);
		animation: scanlineMove 4s linear infinite;
		pointer-events: none;
		border-radius: inherit;
	}

	.scanlines-moving-fast {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-image: repeating-linear-gradient(
				0deg,
				transparent,
				transparent 62px,
				var(--scanline-moving-color) 62px,
				var(--scanline-moving-color) 64px
			),
			repeating-linear-gradient(
				0deg,
				transparent,
				transparent 78px,
				var(--scanline-moving-color) 78px,
				var(--scanline-moving-color) 80px
			);
		opacity: calc(var(--scanline-moving-opacity) * 0.6);
		animation: scanlineMove 2.5s linear infinite;
		pointer-events: none;
		border-radius: inherit;
	}

	.screen-flicker {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: var(--screen-flicker-color);
		opacity: 0;
		animation: screenFlicker 6s ease-in-out infinite;
		pointer-events: none;
		border-radius: inherit;
	}

	/* Scanline Animations */
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
			opacity: var(--flicker-intensity);
		}
		96% {
			opacity: 0;
		}
	}

	/* Skills Section */
	.skills-container {
		position: relative;
	}

	.skills-heading {
		font-family: var(--header-text), sans-serif;
		font-size: 1.75rem;
		font-weight: 600;
		color: var(--heading-color);
		margin-bottom: 2rem;
		text-align: center;
		position: relative;
		z-index: 2;
	}

	.skills-grid {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		position: relative;
		z-index: 2;
	}

	/* CSS Variables for Theme Support */
	:root {
		/* Dark Theme (Default) */
		--screen-bg: rgba(26, 26, 26, 0.85);
		--screen-border: rgba(255, 255, 255, 0.1);
		--screen-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05),
			0 0 0 1px rgba(255, 255, 255, 0.05);

		--label-bg: rgba(119, 255, 161, 0.1);
		--label-text: #77ffa1;
		--label-border: rgba(119, 255, 161, 0.2);

		--heading-color: #f5f5dc;
		--text-color: rgba(245, 245, 220, 0.9);
		--accent-color: #77ffa1;
		--accent-glow: rgba(119, 255, 161, 0.3);

		--avatar-filter: brightness(1.05) contrast(1.1);

		--scanline-color: rgba(255, 255, 255, 0.025);
		--scanline-opacity: 0.7;
		--scanline-moving-color: rgba(199, 255, 221, 0.08);
		--scanline-moving-opacity: 0.6;
		--screen-flicker-color: rgba(255, 255, 255, 0.02);
		--flicker-intensity: 0.15;
	}

	/* Light Theme */
	:global(html.light) {
		--screen-bg: rgba(248, 248, 248, 0.9);
		--screen-border: rgba(0, 0, 0, 0.08);
		--screen-shadow: 0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8),
			0 0 0 1px rgba(0, 0, 0, 0.05);

		--label-bg: rgba(159, 255, 191, 0.15);
		--label-text: #00b35a;
		--label-border: rgba(159, 255, 191, 0.25);

		--heading-color: #1a1a1a;
		--text-color: #262626;
		--accent-color: #00e670;
		--accent-glow: rgba(0, 230, 112, 0.3);

		--avatar-filter: brightness(1) contrast(1.05);

		--scanline-color: rgba(0, 0, 0, 0.02);
		--scanline-opacity: 0.5;
		--scanline-moving-color: rgba(119, 255, 161, 0.06);
		--scanline-moving-opacity: 0.5;
		--screen-flicker-color: rgba(0, 0, 0, 0.015);
		--flicker-intensity: 0.1;
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		.subtle-screen {
			padding: 2rem;
			border-radius: 16px;
		}

		.screen-content {
			min-height: 400px;
		}

		.uvp-content {
			padding-right: 0;
			margin-bottom: 280px;
		}

		.avatar-container {
			position: absolute;
			bottom: 0;
			right: 10px;
			left: 10px;
			width: calc(100% - 20px);
			height: 280px;
		}

		.avatar-image {
			height: 280px;
			object-fit: cover;
			min-height: 280px;
		}

		.uvp-heading {
			text-align: center;
			margin-bottom: 1.5rem;
		}

		.skills-container {
			padding: 2rem;
		}

		.screen-header {
			top: 1rem;
			right: 1.5rem;
		}

		.uvp-label {
			font-size: 0.75rem;
			padding: 0.375rem 0.75rem;
		}
	}

	@media (max-width: 480px) {
		.subtle-screen {
			padding: 1.5rem;
		}

		.uvp-points {
			gap: 1rem;
		}

		.point-text {
			font-size: 1rem;
		}

		.uvp-content {
			margin-bottom: 220px;
		}

		.avatar-container {
			height: 220px;
		}

		.avatar-image {
			height: 220px;
			object-fit: cover;
			min-height: 220px;
		}
	}

	/* Enhanced accessibility */
	@media (prefers-reduced-motion: reduce) {
		.scanlines-moving,
		.scanlines-moving-fast,
		.screen-flicker {
			animation: none;
			opacity: 0;
		}

		.scanlines {
			opacity: 0.3;
		}

		.subtle-screen {
			transform: none;
		}
	}

	/* High contrast mode support */
	@media (prefers-contrast: high) {
		.subtle-screen {
			border-width: 2px;
		}

		.point-indicator {
			border: 2px solid currentColor;
		}
	}
</style>

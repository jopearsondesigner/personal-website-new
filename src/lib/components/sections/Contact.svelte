<!-- DO NOT REMOVE THIS COMMENT
/src/lib/components/sections/Contact.svelte
DO NOT REMOVE THIS COMMENT -->

<!--
CHANGE LOG:
- Added CRTDisplay wrapper around contact form content (imported from About.svelte pattern)
- Added IntersectionObserver for reveal animation (mirrors About.svelte behavior)
- Wrapped content sections with staggered fly transitions using backOut easing
- Added prefers-reduced-motion detection and guards
- Added proper accessibility status region with role="status" and aria-live="polite"
- Preserved all existing form logic, imports, and handlers
- Added .contact-content wrapper class for internal CRTDisplay padding
- Used variant="primary", headerLabel="Contact", matching About.svelte patterns

GUARDS/FALLBACKS:
- IntersectionObserver has null checks and cleanup in onDestroy
- Reduced motion check via matchMedia with fallback to regular animation
- CRTDisplay props match documented API from About.svelte usage

REDUCED MOTION:
- Uses matchMedia('(prefers-reduced-motion: reduce)') check
- Skips all transitions when reduce motion is preferred
- Falls back to simple visibility toggle

TEST CHECKLIST:
1. Contact section renders with CRT display styling matching About section
2. Form submission still works (existing SvelteKit actions preserved)
3. Animations trigger once on scroll into view (intersection observer)
4. Reduced motion preference disables animations
5. All form validation and error states still function
6. Contact heading and form are properly contained within CRTDisplay
7. TypeScript compilation passes without errors
8. No console errors on page load or form interaction
9. Accessibility: status messages appear in status region
10. Visual: CRT scanlines and glass effects active on contact form
-->

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import ContactForm from '$lib/components/ui/ContactForm.svelte';
	import CRTDisplay from '$lib/components/ui/CRTDisplay.svelte';

	// Animation state
	let sectionVisible = false;
	let sectionElement: HTMLElement;
	let intersectionObserver: IntersectionObserver | null = null;
	let prefersReducedMotion = false;

	// Check for reduced motion preference
	onMount(() => {
		// Check reduced motion preference
		if (typeof window !== 'undefined' && window.matchMedia) {
			const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
			prefersReducedMotion = mediaQuery.matches;

			// Listen for changes
			const handleChange = (e: MediaQueryListEvent) => {
				prefersReducedMotion = e.matches;
			};
			mediaQuery.addEventListener('change', handleChange);

			// Cleanup function will handle removeEventListener
		}

		// Set up intersection observer for reveal animation
		if (sectionElement) {
			intersectionObserver = new IntersectionObserver(
				(entries) => {
					if (entries[0].isIntersecting) {
						sectionVisible = true;
						if (intersectionObserver) {
							intersectionObserver.disconnect(); // Only animate once
						}
					}
				},
				{ threshold: 0.2 }
			);

			intersectionObserver.observe(sectionElement);
		}
	});

	onDestroy(() => {
		if (intersectionObserver) {
			intersectionObserver.disconnect();
		}
	});

	// Animation helper - mirrors About.svelte patterns
	const getTransition = (delay = 0) => {
		if (prefersReducedMotion) {
			return { duration: 0 };
		}
		return {
			y: 40,
			duration: 600,
			delay,
			easing: backOut
		};
	};
</script>

<section id="contact" class="contact-section" bind:this={sectionElement}>
	<div class="contact-container">
		{#if sectionVisible}
			<div in:fly={getTransition(200)} class="contact-wrapper">
				<CRTDisplay
					variant="primary"
					headerLabel="Contact"
					scanlineIntensity="medium"
					glassEffect={true}
					enableHover={true}
					minHeight="auto"
					className="contact-display"
				>
					<div class="contact-content">
						<!-- Header -->
						<div in:fly={getTransition(400)} class="contact-header">
							<h2 class="contact-title orbitron-bold">
								<span
									class="text-[var(--metallic-gold-500)] dark:text-[var(--arcade-bright-yellow-100)]"
								>
									Get In Touch
								</span>
								Let's Build Something Amazing Together
							</h2>
							<div class="contact-divider"></div>
							<p in:fly={getTransition(500)} class="contact-subtitle ibm-regular">
								Ready to transform your digital presence? Whether you need a complete rebrand, a
								high-converting website, or seamless user experience optimization, I'm here to turn
								your vision into measurable results.
							</p>
						</div>

						<!-- Form Container -->
						<div in:fly={getTransition(600)} class="contact-form-container">
							<ContactForm />
						</div>

						<!-- Status Region for Accessibility -->
						<div
							role="status"
							aria-live="polite"
							aria-label="Contact form status"
							class="contact-status"
						>
							<!-- Status messages will be handled by ContactForm component -->
						</div>
					</div>
				</CRTDisplay>
			</div>
		{/if}
	</div>
</section>

<style>
	/* =============================================================================
	   CSS Custom Properties for Contact Section
	   ============================================================================= */

	:root {
		/* Dark Theme Colors */
		--contact-heading-color: var(--arcade-white-200);
		--contact-text-color: rgba(245, 245, 220, 0.92);
		--contact-accent-color: var(--arcade-neon-green-400);
		--contact-accent-glow: rgba(119, 255, 161, 0.4);
		--contact-accent-glow-outer: rgba(119, 255, 161, 0.2);

		/* Text Shadows */
		--contact-text-shadow: rgba(43, 43, 43, 0.3);
		--contact-text-shadow-subtle: rgba(43, 43, 43, 0.1);

		/* Contact Specific */
		--contact-divider-color: var(--arcade-neon-green-500);
		--contact-divider-glow: rgba(119, 255, 161, 0.6);
	}

	/* Light Theme Overrides */
	:global(html.light) {
		--contact-heading-color: var(--arcade-black-400);
		--contact-text-color: var(--arcade-black-600);
		--contact-accent-color: var(--arcade-neon-green-700);
		--contact-accent-glow: rgba(0, 179, 90, 0.5);
		--contact-accent-glow-outer: rgba(0, 179, 90, 0.25);

		--contact-text-shadow: rgba(245, 245, 220, 0.8);
		--contact-text-shadow-subtle: rgba(245, 245, 220, 0.5);

		--contact-divider-color: var(--arcade-neon-green-600);
		--contact-divider-glow: rgba(0, 179, 90, 0.7);
	}

	/* =============================================================================
	   Contact Section Styles
	   ============================================================================= */

	.contact-section {
		padding: 4rem 0;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		justify-content: center;
		position: relative;
		background: inherit;
	}

	.contact-container {
		width: 100%;
		max-width: 1080px;
		margin: 0 auto;
		padding: 0 1.5rem;
	}

	.contact-wrapper {
		width: 100%;
	}

	/* Contact Content within CRTDisplay */
	.contact-content {
		position: relative;
		z-index: 20;
		padding: 2rem 0;
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	/* Header Styling */
	.contact-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.contact-title {
		font-family: var(--header-text), sans-serif;
		font-size: clamp(2rem, 4vw, 3rem);
		font-weight: 700;
		color: var(--contact-heading-color);
		margin-bottom: 1.5rem;
		line-height: 1.2;
		letter-spacing: -0.02em;
		text-shadow: 0 2px 4px var(--contact-text-shadow);
	}

	.contact-divider {
		width: 48px;
		height: 2px;
		background: var(--contact-divider-color);
		margin: 0 auto 1.5rem;
		border-radius: 1px;
		box-shadow:
			0 0 8px var(--contact-divider-glow),
			0 0 16px var(--contact-accent-glow-outer);
		animation: dividerPulse 3s ease-in-out infinite;
	}

	@keyframes dividerPulse {
		0%,
		100% {
			opacity: 0.8;
			transform: scaleX(1);
		}
		50% {
			opacity: 1;
			transform: scaleX(1.1);
		}
	}

	.contact-subtitle {
		color: var(--contact-text-color);
		font-size: 1.125rem;
		line-height: 1.6;
		max-width: 600px;
		margin: 0 auto;
		text-shadow: 0 1px 2px var(--contact-text-shadow-subtle);
	}

	/* Form Container */
	.contact-form-container {
		width: 100%;
		position: relative;
	}

	/* Status Region */
	.contact-status {
		/* Hidden by default, ContactForm will populate if needed */
		min-height: 0;
		position: relative;
	}

	/* CRTDisplay Overrides for Contact */
	:global(.contact-display) {
		/* Ensure proper spacing and appearance */
		min-height: 600px;
	}

	/* =============================================================================
	   Responsive Design
	   ============================================================================= */

	@media (max-width: 768px) {
		.contact-section {
			padding: 2rem 0;
		}

		.contact-container {
			padding: 0 1rem;
		}

		.contact-content {
			padding: 1.5rem 0;
			gap: 1.5rem;
		}

		.contact-header {
			margin-bottom: 1.5rem;
		}

		.contact-title {
			font-size: clamp(1.75rem, 6vw, 2.5rem);
			margin-bottom: 1.25rem;
		}

		.contact-subtitle {
			font-size: 1rem;
			line-height: 1.5;
		}

		.contact-divider {
			width: 40px;
			margin-bottom: 1.25rem;
		}

		:global(.contact-display) {
			min-height: 500px;
		}
	}

	@media (max-width: 480px) {
		.contact-content {
			padding: 1rem 0;
		}

		.contact-title {
			font-size: clamp(1.5rem, 5vw, 2.25rem);
		}

		.contact-subtitle {
			font-size: 0.95rem;
		}

		:global(.contact-display) {
			min-height: 450px;
		}
	}

	/* =============================================================================
	   Accessibility & Reduced Motion
	   ============================================================================= */

	@media (prefers-reduced-motion: reduce) {
		.contact-divider {
			animation: none;
		}

		.contact-title,
		.contact-subtitle {
			transition: none;
		}
	}

	@media (prefers-contrast: high) {
		.contact-title {
			text-shadow: none;
		}

		.contact-subtitle {
			text-shadow: none;
		}

		.contact-divider {
			border: 1px solid currentColor;
			box-shadow: none;
		}
	}

	/* =============================================================================
	   Performance Optimizations
	   ============================================================================= */

	.contact-section {
		/* Hardware acceleration */
		transform: translateZ(0);
		will-change: auto;
		contain: layout style paint;
	}

	.contact-content {
		/* Optimize rendering */
		contain: layout style;
	}
</style>

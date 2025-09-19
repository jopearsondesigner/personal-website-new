<!-- src/lib/components/ui/ContactForm.svelte -->
<script lang="ts">
	import { fade } from 'svelte/transition';
	import { onMount, onDestroy } from 'svelte';
	import LiquidGlassButton from '$lib/components/ui/LiquidGlassButton.svelte';

	// Form state
	let name = '';
	let email = '';
	let message = '';
	let formSubmitted = false;
	let formError = false;
	let isSending = false;
	let messageTimer: ReturnType<typeof setTimeout>;

	// Form validation
	let errors = {
		name: '',
		email: '',
		message: ''
	};

	function validateEmail(email: string) {
		const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return re.test(email);
	}

	function validateForm() {
		let isValid = true;
		errors = {
			name: '',
			email: '',
			message: ''
		};

		if (!name.trim()) {
			errors.name = 'Name is required';
			isValid = false;
		}

		if (!email.trim()) {
			errors.email = 'Email is required';
			isValid = false;
		} else if (!validateEmail(email)) {
			errors.email = 'Please enter a valid email';
			isValid = false;
		}

		if (!message.trim()) {
			errors.message = 'Message is required';
			isValid = false;
		}

		return isValid;
	}

	async function handleSubmit() {
		if (!validateForm()) {
			return;
		}

		isSending = true;

		// Simulate form submission
		try {
			await new Promise((resolve) => setTimeout(resolve, 1500));
			formSubmitted = true;
			formError = false;
			// Reset form
			name = '';
			email = '';
			message = '';
		} catch (error) {
			console.error('Form submission error:', error);
			formError = true;
		} finally {
			isSending = false;
		}
	}

	// Input effect functions
	function handleFocus(event: FocusEvent) {
		const target = event.target as HTMLInputElement | HTMLTextAreaElement;
		const parent = target.parentElement;
		if (parent) {
			parent.classList.add('focused');
		}
	}

	function handleBlur(event: FocusEvent) {
		const target = event.target as HTMLInputElement | HTMLTextAreaElement;
		const parent = target.parentElement;
		if (parent) {
			if (!target.value) {
				parent.classList.remove('focused');
			}
		}
	}

	// Watch for form status changes
	$: if (formSubmitted || formError) {
		// Clear any existing timer first
		if (messageTimer) clearTimeout(messageTimer);

		// Set a new timer
		messageTimer = setTimeout(() => {
			formSubmitted = false;
			formError = false;
		}, 5000);
	}

	// Check if form is valid for button state
	$: isFormValid = name.trim() && email.trim() && validateEmail(email) && message.trim();

	// Clean up the timer when component is destroyed
	onDestroy(() => {
		if (messageTimer) clearTimeout(messageTimer);
	});
</script>

{#if formSubmitted}
	<div
		class="success-message p-4 mb-6 bg-arcadeNeonGreen-500/20 border border-arcadeNeonGreen-500 rounded-lg"
		transition:fade={{ duration: 300 }}
	>
		<h3 class="text-lg font-semibold mb-2 text-arcadeNeonGreen-500">Message Sent!</h3>
		<p>Thanks for reaching out. I'll get back to you soon.</p>
	</div>
{:else if formError}
	<div
		class="error-message p-4 mb-6 bg-arcadeRed-500/20 border border-arcadeRed-500 rounded-lg"
		transition:fade={{ duration: 300 }}
	>
		<h3 class="text-lg font-semibold mb-2 text-arcadeRed-500">Oops! Something went wrong</h3>
		<p>Please try again or contact me directly via email.</p>
	</div>
{/if}

<form on:submit|preventDefault={handleSubmit} class="space-y-4">
	<div class="form-group relative {name ? 'focused' : ''}">
		<label
			for="name"
			class="absolute left-3 top-3 transition-all duration-200 pointer-events-none text-arcadeBlack-500/60 dark:text-arcadeWhite-200/60"
		>
			Name
		</label>
		<input
			type="text"
			id="name"
			bind:value={name}
			on:focus={handleFocus}
			on:blur={handleBlur}
			class="w-full bg-transparent border-b-2 border-arcadeBlack-500/20 dark:border-arcadeWhite-200/20 focus:border-arcadeNeonGreen-500 outline-none py-2 px-3 pt-6 transition-all duration-200"
		/>
		{#if errors.name}
			<p class="text-arcadeRed-500 text-sm mt-1">{errors.name}</p>
		{/if}
	</div>

	<div class="form-group relative {email ? 'focused' : ''}">
		<label
			for="email"
			class="absolute left-3 top-3 transition-all duration-200 pointer-events-none text-arcadeBlack-500/60 dark:text-arcadeWhite-200/60"
		>
			Email
		</label>
		<input
			type="email"
			id="email"
			bind:value={email}
			on:focus={handleFocus}
			on:blur={handleBlur}
			class="w-full bg-transparent border-b-2 border-arcadeBlack-500/20 dark:border-arcadeWhite-200/20 focus:border-arcadeNeonGreen-500 outline-none py-2 px-3 pt-6 transition-all duration-200"
		/>
		{#if errors.email}
			<p class="text-arcadeRed-500 text-sm mt-1">{errors.email}</p>
		{/if}
	</div>

	<div class="form-group relative {message ? 'focused' : ''}">
		<label
			for="message"
			class="absolute left-3 top-3 transition-all duration-200 pointer-events-none text-arcadeBlack-500/60 dark:text-arcadeWhite-200/60"
		>
			Message
		</label>
		<textarea
			id="message"
			bind:value={message}
			on:focus={handleFocus}
			on:blur={handleBlur}
			rows="4"
			class="w-full bg-transparent border-b-2 border-arcadeBlack-500/20 dark:border-arcadeWhite-200/20 focus:border-arcadeNeonGreen-500 outline-none py-2 px-3 pt-6 transition-all duration-200 resize-y"
		></textarea>
		{#if errors.message}
			<p class="text-arcadeRed-500 text-sm mt-1">{errors.message}</p>
		{/if}
	</div>

	<!-- Liquid Glass Send Button -->
	<div class="button-container">
		<LiquidGlassButton type="submit" loading={isSending} disabled={!isFormValid}>
			Send Message
		</LiquidGlassButton>
	</div>
</form>

<style>
	/* Form animations */
	.form-group.focused label {
		transform: translateY(-70%) scale(0.8);
		color: var(--arcade-neon-green-500);
	}

	.form-group label {
		transform-origin: 0 0;
	}

	/* Button Container */
	.button-container {
		display: flex;
		justify-content: center;
		margin-top: 2rem;
		padding-top: 1rem;
	}

	/* =============================================================================
	   Liquid Glass Button Styles
	   ============================================================================= */

	.liquid-glass-button {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;

		/* Sizing */
		min-width: 180px;
		height: 60px;
		padding: 0 2rem;

		/* Typography */
		font-family:
			var(--font-ibm),
			-apple-system,
			BlinkMacSystemFont,
			sans-serif;
		font-size: 1.1rem;
		font-weight: 600;
		letter-spacing: 0.025em;

		/* Shape */
		border-radius: 30px;
		border: none;
		outline: none;

		/* Base colors */
		color: rgba(255, 255, 255, 0.95);
		background: transparent;

		/* Transforms & animations */
		transform: translateZ(0);
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		cursor: pointer;

		/* Performance */
		will-change: transform, box-shadow;
		backface-visibility: hidden;

		/* Prevent text selection */
		user-select: none;
		-webkit-user-select: none;
		-webkit-touch-callout: none;
	}

	/* Glass Background System */
	.glass-background {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		overflow: hidden;

		/* Apply liquid glass filter */
		filter: url(#liquid-glass-filter);
	}

	.glass-surface {
		position: absolute;
		inset: 0;

		/* Main glass material with green tint for contact form */
		background: linear-gradient(
			135deg,
			rgba(119, 255, 161, 0.18) 0%,
			rgba(119, 255, 161, 0.1) 50%,
			rgba(119, 255, 161, 0.15) 100%
		);

		/* Glass blur effect */
		backdrop-filter: blur(20px) saturate(180%);
		-webkit-backdrop-filter: blur(20px) saturate(180%);

		/* Border with green accent */
		border: 1px solid rgba(119, 255, 161, 0.3);
		border-radius: inherit;
	}

	.glass-highlight {
		position: absolute;
		inset: 0;

		/* Top highlight for 3D effect */
		background: linear-gradient(
			180deg,
			rgba(255, 255, 255, 0.25) 0%,
			rgba(255, 255, 255, 0.05) 30%,
			transparent 70%
		);

		border-radius: inherit;
		mix-blend-mode: overlay;
	}

	.glass-specular {
		position: absolute;
		top: 2px;
		left: 25%;
		right: 25%;
		height: 40%;

		/* Specular highlight */
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
	}

	.glass-edge-glow {
		position: absolute;
		inset: -2px;

		/* Green glow for contact theme */
		background: linear-gradient(
			135deg,
			var(--arcade-neon-green-400),
			var(--arcade-bright-cyan-400)
		);

		border-radius: inherit;
		opacity: 0;
		filter: blur(8px);
		transition: opacity 0.3s ease;
		z-index: -1;
	}

	/* Button Content */
	.button-content {
		position: relative;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;

		/* Text shadow for better contrast */
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
	}

	.button-text {
		transition: all 0.3s ease;
		font-weight: 600;
	}

	.button-text--hidden {
		opacity: 0;
		transform: translateX(-10px);
	}

	.send-icon {
		width: 22px;
		height: 22px;
		transition: all 0.3s ease;
	}

	.send-icon--hidden {
		opacity: 0;
		transform: translateX(10px);
	}

	.icon {
		width: 100%;
		height: 100%;
		transition: transform 0.2s ease;
	}

	/* Loading Spinner */
	.loading-spinner {
		position: absolute;
		width: 22px;
		height: 22px;
	}

	.spinner-icon {
		width: 100%;
		height: 100%;
	}

	/* Ripple Effect */
	.ripple-overlay {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: radial-gradient(circle at center, rgba(119, 255, 161, 0.3) 0%, transparent 70%);
		opacity: 0;
		transform: scale(0.8);
		transition: all 0.3s ease;
		pointer-events: none;
	}

	/* SVG Filter Container */
	.liquid-glass-filter {
		position: absolute;
		top: 0;
		left: 0;
		pointer-events: none;
	}

	/* =============================================================================
	   Interactive States
	   ============================================================================= */

	/* Hover State */
	.liquid-glass-button:hover:not(:disabled) {
		transform: translateY(-3px) scale(1.05);

		/* Enhanced shadow with green tint */
		box-shadow:
			0 12px 40px rgba(119, 255, 161, 0.3),
			0 6px 20px rgba(0, 0, 0, 0.1);
	}

	.liquid-glass-button:hover:not(:disabled) .glass-edge-glow {
		opacity: 0.8;
	}

	.liquid-glass-button:hover:not(:disabled) .glass-specular {
		opacity: 1.2;
		transform: perspective(100px) rotateX(-10deg) translateY(-2px);
	}

	.liquid-glass-button:hover:not(:disabled) .send-icon .icon {
		transform: translateX(3px);
	}

	.liquid-glass-button:hover:not(:disabled) .glass-surface {
		background: linear-gradient(
			135deg,
			rgba(119, 255, 161, 0.25) 0%,
			rgba(119, 255, 161, 0.15) 50%,
			rgba(119, 255, 161, 0.2) 100%
		);
		border-color: rgba(119, 255, 161, 0.5);
	}

	/* Active State */
	.liquid-glass-button:active:not(:disabled) {
		transform: translateY(-1px) scale(1.02);
		transition-duration: 0.1s;
	}

	.liquid-glass-button:active:not(:disabled) .ripple-overlay {
		opacity: 1;
		transform: scale(1.2);
		transition-duration: 0.1s;
	}

	.liquid-glass-button:active:not(:disabled) .glass-background {
		filter: url(#ripple-filter);
	}

	/* Focus State */
	.liquid-glass-button:focus-visible {
		outline: 2px solid var(--arcade-neon-green-400);
		outline-offset: 3px;
	}

	/* Loading State */
	.liquid-glass-button--loading {
		cursor: wait;
	}

	.liquid-glass-button--loading .glass-surface {
		background: linear-gradient(
			135deg,
			rgba(119, 255, 161, 0.15) 0%,
			rgba(119, 255, 161, 0.08) 50%,
			rgba(119, 255, 161, 0.12) 100%
		);

		/* Subtle pulse animation */
		animation: loadingPulse 2s ease-in-out infinite;
	}

	@keyframes loadingPulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.8;
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
		backdrop-filter: blur(10px);
		border-color: rgba(255, 255, 255, 0.1);
	}

	.liquid-glass-button--disabled .glass-edge-glow {
		display: none;
	}

	/* =============================================================================
	   Theme Variants
	   ============================================================================= */

	/* Light theme adjustments */
	:global(html.light) .liquid-glass-button {
		color: rgba(0, 0, 0, 0.9);
	}

	:global(html.light) .glass-surface {
		background: linear-gradient(
			135deg,
			rgba(255, 255, 255, 0.85) 0%,
			rgba(255, 255, 255, 0.7) 50%,
			rgba(255, 255, 255, 0.8) 100%
		);
		border-color: rgba(119, 255, 161, 0.4);
	}

	:global(html.light) .glass-highlight {
		background: linear-gradient(
			180deg,
			rgba(255, 255, 255, 0.9) 0%,
			rgba(255, 255, 255, 0.3) 30%,
			transparent 70%
		);
	}

	:global(html.light) .button-content {
		text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
	}

	/* =============================================================================
	   Responsive Design
	   ============================================================================= */

	@media (max-width: 768px) {
		.liquid-glass-button {
			min-width: 160px;
			height: 56px;
			padding: 0 1.75rem;
			font-size: 1rem;
		}

		.send-icon {
			width: 20px;
			height: 20px;
		}

		.loading-spinner {
			width: 20px;
			height: 20px;
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
			transition: none;
			animation: none;
		}

		.liquid-glass-button:hover:not(:disabled) {
			transform: none;
		}

		.liquid-glass-button:active:not(:disabled) {
			transform: none;
		}

		.glass-background {
			filter: none;
		}
	}

	@media (prefers-contrast: high) {
		.liquid-glass-button {
			border: 2px solid currentColor;
		}

		.glass-surface {
			background: rgba(119, 255, 161, 0.9);
			backdrop-filter: none;
		}

		.glass-highlight,
		.glass-specular {
			display: none;
		}
	}

	/* =============================================================================
	   Performance Optimizations
	   ============================================================================= */

	.liquid-glass-button {
		contain: layout style paint;
	}

	.glass-background {
		contain: layout style paint;
		isolation: isolate;
	}
</style>

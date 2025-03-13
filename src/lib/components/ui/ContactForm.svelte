<!-- src/lib/components/ui/ContactForm.svelte -->
<script lang="ts">
	import { fade } from 'svelte/transition';
	import { onMount, onDestroy } from 'svelte';

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

	<button
		type="submit"
		class="px-6 py-3 mt-6 bg-arcadeBlack-500 dark:bg-arcadeBlack-700 text-arcadeWhite-200
		rounded-lg shadow-md hover:shadow-lg transition-all duration-300
		border border-arcadeNeonGreen-500/30 hover:border-arcadeNeonGreen-500
		hover:bg-arcadeBlack-600 relative overflow-hidden disabled:opacity-70"
		disabled={isSending}
	>
		<span class="relative z-10">
			{#if isSending}
				Sending...
			{:else}
				Send Message
			{/if}
		</span>
		<div class="absolute inset-0 overflow-hidden">
			<div
				class="crt-loading-bar h-full bg-arcadeNeonGreen-500/20 transition-all"
				class:w-full={isSending}
				class:w-0={!isSending}
			></div>
		</div>
	</button>
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

	/* Loading animation */
	.crt-loading-bar {
		position: absolute;
		left: 0;
		top: 0;
		transition: width 1.5s linear;
		background: linear-gradient(
			90deg,
			rgba(39, 255, 153, 0.1),
			rgba(39, 255, 153, 0.4),
			rgba(39, 255, 153, 0.1)
		);
		animation: pulsate 1.5s infinite;
	}

	@keyframes pulsate {
		0% {
			opacity: 0.6;
		}
		50% {
			opacity: 1;
		}
		100% {
			opacity: 0.6;
		}
	}
</style>

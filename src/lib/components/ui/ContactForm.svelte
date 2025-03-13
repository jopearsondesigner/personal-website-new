<!-- src/lib/components/ui/ContactForm.svelte -->
<script lang="ts">
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';

	// Form state
	let name = '';
	let email = '';
	let message = '';
	let formSubmitted = false;
	let formError = false;
	let isSending = false;

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

	// Reset form status after some time
	$: if (formSubmitted || formError) {
		const timer = setTimeout(() => {
			formSubmitted = false;
			formError = false;
		}, 5000);
		return () => clearTimeout(timer);
	}
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
			class="w-full bg-transparent border-b-2 border-arcadeBlack-500/20 dark:border-arcadeWhite-200/20 focus:border-arcadeNeonGreen-500 outline-none py-2 px-
<!-- DO NOT REMOVE THIS COMMENT
/src/lib/components/ui/ContactForm.svelte
DO NOT REMOVE THIS COMMENT -->
<script lang="ts">
	import { fade } from 'svelte/transition';
	import { onDestroy } from 'svelte';

	let name = '';
	let email = '';
	let message = '';
	let formSubmitted = false;
	let formError = false;
	let isSending = false;
	let messageTimer: ReturnType<typeof setTimeout>;

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
		errors = { name: '', email: '', message: '' };

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
		if (!validateForm()) return;

		isSending = true;

		try {
			await new Promise((resolve) => setTimeout(resolve, 1500));
			formSubmitted = true;
			formError = false;
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

	$: if (formSubmitted || formError) {
		if (messageTimer) clearTimeout(messageTimer);
		messageTimer = setTimeout(() => {
			formSubmitted = false;
			formError = false;
		}, 5000);
	}

	onDestroy(() => {
		if (messageTimer) clearTimeout(messageTimer);
	});
</script>

<!-- Success/Error Messages -->
{#if formSubmitted}
	<div
		class="mb-8 p-4 border border-arcadeNeonGreen-500 text-arcadeNeonGreen-500"
		transition:fade={{ duration: 300 }}
	>
		✓ Message sent successfully! I'll get back to you soon.
	</div>
{:else if formError}
	<div
		class="mb-8 p-4 border border-arcadeRed-500 text-arcadeRed-500"
		transition:fade={{ duration: 300 }}
	>
		× Something went wrong. Please try again or email me directly.
	</div>
{/if}

<!-- Form - Full Width -->
<form on:submit|preventDefault={handleSubmit} class="w-full space-y-12">
	<!-- Name Field -->
	<div class="relative w-full">
		<input
			type="text"
			id="name"
			bind:value={name}
			class="w-full px-0 py-4 pb-4 bg-transparent border-0 border-b-2
				border-arcadeBlack-200 dark:border-arcadeWhite-200/20
				focus:border-arcadeNeonGreen-500 focus:outline-none
				text-arcadeBlack-600 dark:text-arcadeWhite-200 text-lg
				transition-colors duration-300"
			class:border-arcadeRed-500={errors.name}
		/>
		<label
			for="name"
			class="uppercase absolute left-0 bottom-1 text-xl font-light
				text-arcadeBlack-500 dark:text-arcadeWhite-300"
			class:text-arcadeRed-500={errors.name}
		>
			Name
		</label>
		{#if errors.name}
			<p class="mt-2 text-sm text-arcadeRed-500">{errors.name}</p>
		{/if}
	</div>

	<!-- Email Field -->
	<div class="relative w-full">
		<input
			type="email"
			id="email"
			bind:value={email}
			class="w-full px-0 py-4 pb-4 bg-transparent border-0 border-b-2
				border-arcadeBlack-200 dark:border-arcadeWhite-200/20
				focus:border-arcadeNeonGreen-500 focus:outline-none
				text-arcadeBlack-600 dark:text-arcadeWhite-200 text-lg
				transition-colors duration-300"
			class:border-arcadeRed-500={errors.email}
		/>
		<label
			for="email"
			class="uppercase absolute left-0 bottom-1 text-xl font-light
				text-arcadeBlack-500 dark:text-arcadeWhite-300"
			class:text-arcadeRed-500={errors.email}
		>
			Email
		</label>
		{#if errors.email}
			<p class="mt-2 text-sm text-arcadeRed-500">{errors.email}</p>
		{/if}
	</div>

	<!-- Message Field -->
	<div class="w-full">
		<label
			for="message"
			class="uppercase block text-xl font-light text-arcadeBlack-500 dark:text-arcadeWhite-300 mb-2"
		>
			Message
		</label>
		<textarea
			id="message"
			bind:value={message}
			rows="4"
			class="w-full px-0 py-4 pb-4 bg-transparent border-0 border-b-2
				border-arcadeBlack-200 dark:border-arcadeWhite-200/20
				focus:border-arcadeNeonGreen-500 focus:outline-none
				text-arcadeBlack-600 dark:text-arcadeWhite-200 text-lg
				placeholder-arcadeBlack-400 dark:placeholder-arcadeWhite-400
				transition-colors duration-300 resize-none"
			placeholder=""
			class:border-arcadeRed-500={errors.message}
		></textarea>
		{#if errors.message}
			<p class="mt-1 text-sm text-arcadeRed-500">{errors.message}</p>
		{/if}
	</div>

	<!-- Submit Button -->
	<div class="pt-6">
		<button
			type="submit"
			disabled={isSending}
			class="px-8 py-4 bg-transparent border border-arcadeBlack-300 dark:border-arcadeWhite-300
				text-arcadeBlack-600 dark:text-arcadeWhite-200
				hover:border-arcadeNeonGreen-500 hover:text-arcadeNeonGreen-500
				disabled:opacity-50 disabled:cursor-not-allowed
				transition-colors duration-300 font-normal"
		>
			{#if isSending}
				<span class="flex items-center space-x-2">
					<svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
						></circle>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
					<span>Sending...</span>
				</span>
			{:else}
				<span class="flex items-center space-x-2">
					<span>Send Message</span>
					<span>→</span>
				</span>
			{/if}
		</button>
	</div>
</form>

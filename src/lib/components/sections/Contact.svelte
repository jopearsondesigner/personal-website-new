<!-- DO NOT REMOVE THIS COMMENT
/src/lib/components/sections/Contact.svelte
DO NOT REMOVE THIS COMMENT -->
<script lang="ts">
	import { fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import ContactForm from '$lib/components/ui/ContactForm.svelte';

	// Minimal animation with purpose
	const fadeIn = (delay = 0) => {
		return {
			y: 20,
			duration: 600,
			delay: delay,
			easing: quintOut
		};
	};
</script>

<div class="w-full">
	<!-- Container wrapper around everything -->
	<div class="max-w-[1080px] mx-auto px-6">
		<div class="contact-wrapper">
			<!-- Header -->
			<div in:fly={fadeIn(100)} class="text-center mb-16">
				<h2
					class="text-3xl md:text-3xl font-bold font-body text-arcadeBlack-500 dark:text-arcadeWhite-200
					tracking-wider mb-4"
				>
					Yo, let's Connect...
				</h2>
				<div class="w-12 h-px bg-arcadeNeonGreen-500 mx-auto"></div>
			</div>

			<!-- Full Width Form within container -->
			<div in:fly={fadeIn(200)} class="w-full">
				<ContactForm />
			</div>
		</div>
	</div>
</div>

<style>
	:root {
		/* Dark Theme Colors */
		--contact-heading-color: var(--arcade-white-200);
		--contact-text-color: rgba(245, 245, 220, 0.92);
		--contact-accent-color: var(--arcade-neon-green-400);
		--contact-accent-glow: rgba(119, 255, 161, 0.4);
		--contact-accent-glow-outer: rgba(119, 255, 161, 0.2);

		/* Text Shadows */
		--contact-text-shadow: rgba(0, 0, 0, 0.3);
		--contact-text-shadow-subtle: rgba(0, 0, 0, 0.1);
	}
	:global(html.light) {
		--contact-heading-color: var(--arcade-black-700);
		--contact-text-color: var(--arcade-black-600);
		--contact-accent-color: var(--arcade-neon-green-700);
		--contact-accent-glow: rgba(0, 179, 90, 0.5);
		--contact-accent-glow-outer: rgba(0, 179, 90, 0.25);

		--contact-text-shadow: rgba(255, 255, 255, 0.8);
		--contact-text-shadow-subtle: rgba(255, 255, 255, 0.5);
	}
</style>

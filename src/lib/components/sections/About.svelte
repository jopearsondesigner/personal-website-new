<!-- src/lib/components/sections/About.svelte -->
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
	<div class="container mx-auto px-4">
		{#if sectionVisible}
			<div in:fly={{ y: 50, duration: 800, delay: 200, easing: backOut }}>
				<h2
					class="text-3xl md:text-4xl font-press-start text-arcadeBlack-500 dark:text-arcadeWhite-200 mb-8"
				>
					About Me
				</h2>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
				<div in:fly={{ x: -50, duration: 800, delay: 400, easing: backOut }}>
					<div
						class="bg-arcadeBlack-200/10 dark:bg-arcadeBlack-700/30 p-6 rounded-lg border border-arcadeBlack-200/20 dark:border-arcadeBlack-600/40 shadow-lg backdrop-blur-sm"
					>
						<h3 class="text-xl md:text-2xl mb-4 font-header">Who Am I?</h3>
						<p class="text-lg mb-4">
							I'm a designer and developer passionate about creating immersive digital experiences
							that merge creativity and technology.
						</p>
						<p class="text-lg mb-4">
							With a background in both design and development, I bring a unique perspective to
							every project, ensuring that aesthetics and functionality work together seamlessly.
						</p>
						<p class="text-lg">
							My arcade-inspired portfolio showcases my love for retro gaming while demonstrating my
							modern development skills.
						</p>
					</div>
				</div>

				<div in:fly={{ x: 50, duration: 800, delay: 600, easing: backOut }}>
					<div
						class="bg-arcadeBlack-200/10 dark:bg-arcadeBlack-700/30 p-6 rounded-lg border border-arcadeBlack-200/20 dark:border-arcadeBlack-600/40 shadow-lg backdrop-blur-sm"
					>
						<h3 class="text-xl md:text-2xl mb-6 font-header">Skills</h3>
						<div class="space-y-6">
							{#each skills as skill, i}
								<div in:fly={{ y: 20, duration: 400, delay: 800 + i * 100, easing: backOut }}>
									<SkillBar name={skill.name} level={skill.level} />
								</div>
							{/each}
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</section>

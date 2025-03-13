<!-- src/lib/components/ui/SkillBar.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	export let name: string;
	export let level: number; // 0-100

	// Use tweened store for smooth animation
	const progress = tweened(0, {
		duration: 1000,
		easing: cubicOut
	});

	onMount(() => {
		// Start the animation when component mounts
		setTimeout(() => {
			progress.set(level);
		}, 100);
	});
</script>

<div class="skill-bar">
	<div class="flex justify-between mb-1">
		<span class="text-arcadeBlack-500 dark:text-arcadeWhite-200">{name}</span>
		<span class="font-mono">{$progress.toFixed(0)}%</span>
	</div>
	<div class="h-3 bg-arcadeBlack-200/50 dark:bg-arcadeBlack-600/50 rounded-full overflow-hidden">
		<div
			class="h-full bg-gradient-to-r from-arcadeNeonGreen-500/80 to-arcadeElectricBlue-500/80 rounded-full"
			style="width: {$progress}%; transition: width 1s cubic-bezier(0.65, 0, 0.35, 1);"
		>
			<div
				class="h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:200%_100%] animate-shine"
			></div>
		</div>
	</div>
</div>

<style>
	@keyframes shine {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}

	:global(.animate-shine) {
		animation: shine 3s infinite linear;
	}
</style>

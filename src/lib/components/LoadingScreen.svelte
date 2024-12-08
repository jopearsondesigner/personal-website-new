<!-- src/lib/components/LoadingScreen.svelte -->
<script lang="ts">
	import { fade } from 'svelte/transition';
	import Logo from '$lib/assets/images/logo-black.svg';
	import { loadingStore } from '$lib/stores/loading';
</script>

{#if $loadingStore}
	<div
		transition:fade={{ duration: 300 }}
		class="fixed inset-0 z-[9999] flex items-center justify-center bg-[var(--dark-mode-bg)] dark:bg-[var(--dark-mode-bg)]"
	>
		<div class="flex flex-col items-center">
			<img src={Logo} alt="Logo" class="h-16 w-16 animate-pulse" />
			<div class="mt-4 h-1 w-32 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
				<div
					class="h-full w-full animate-progress bg-[var(--arcade-neon-green-500)] transition-all duration-300"
				></div>
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes progress {
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(100%);
		}
	}

	.animate-progress {
		animation: progress 1.5s ease-in-out infinite;
	}
</style>

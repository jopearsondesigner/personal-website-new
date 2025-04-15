<!-- src/lib/components/LoadingScreen.svelte -->
<script lang="ts">
	import { fade } from 'svelte/transition';
	import Logo from '$lib/assets/images/logo.svg';
	import { loadingStore } from '$lib/stores/loading';
	import { onMount } from 'svelte';

	// This ensures the loading screen is visible immediately
	let mounted = false;

	onMount(() => {
		mounted = true;
	});
</script>

<!-- The loading screen will show regardless of loadingStore until component is mounted -->
{#if !mounted || $loadingStore}
	<div
		transition:fade={{ duration: 300 }}
		class="fixed inset-0 z-[9999] flex items-center justify-center bg-[var(--dark-mode-bg)] dark:bg-[var(--dark-mode-bg)]"
	>
		<div class="flex flex-col items-center">
			<img src={Logo} alt="Logo" class="h-16 w-16 ml-4 animate-pulse mb-2" />
			<div
				class="mt-4 h-0.5 w-32 overflow-hidden rounded-full bg-[var(--arcade-white-200)] dark:bg-[var(--arcade-black-700)]"
			>
				<div
					class="h-full w-full animate-progress bg-[var(--arcade-neon-green-200)] transition-transform duration-300"
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
		will-change: transform;
		animation: progress 1.5s ease-in-out infinite;
	}
</style>

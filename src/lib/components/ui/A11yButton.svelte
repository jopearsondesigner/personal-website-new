<!-- src/lib/components/A11yButton.svelte -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { motionOK } from '$lib/stores/a11y-store';

	export let label: string;
	export let ariaLabel = label;
	export let disabled = false;
	export let variant: 'primary' | 'secondary' = 'primary';

	const dispatch = createEventDispatcher();

	function handleClick(event: MouseEvent) {
		if (!disabled) {
			dispatch('click', event);
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
			event.preventDefault();
			dispatch('click', event);
		}
	}
</script>

<button
	class="a11y-button {variant}"
	class:disabled
	{disabled}
	aria-label={ariaLabel}
	on:click={handleClick}
	on:keydown={handleKeydown}
>
	<div class="button-content" class:no-motion={!$motionOK}>
		<slot>{label}</slot>
	</div>
</button>

<style>
	.a11y-button {
		position: relative;
		padding: 0.75rem 1.5rem;
		border: 2px solid var(--border-primary);
		border-radius: 0.5rem;
		background: var(--bg-primary);
		color: var(--text-primary);
		font-family: 'Press Start 2P', monospace;
		font-size: var(--base-font-size);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.button-content {
		position: relative;
		z-index: 1;
	}

	/* High Contrast Mode Styles */
	@media (forced-colors: active) {
		.a11y-button {
			border: 2px solid CanvasText;
		}

		.a11y-button:focus-visible {
			outline: 2px solid CanvasText;
			outline-offset: 4px;
		}
	}

	/* Reduced Motion */
	.no-motion {
		transition: none;
	}

	/* Focus Styles */
	.a11y-button:focus-visible {
		outline: 2px solid var(--text-primary);
		outline-offset: 4px;
	}

	/* Disabled State */
	.disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>

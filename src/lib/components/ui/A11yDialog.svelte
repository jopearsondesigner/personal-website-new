<!-- src/lib/components/A11yDialog.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { focusManager } from '$lib/utils/focus-utils';
	import { fade } from 'svelte/transition';
	import { motionOK } from '$lib/stores/a11y-store';

	export let open = false;
	export let title: string;
	export let closeOnEscape = true;
	export let closeOnOutsideClick = true;

	let dialog: HTMLDialogElement;
	let cleanup: (() => void) | null = null;

	onMount(() => {
		if (dialog) {
			cleanup = focusManager.trapFocus(dialog);
		}
	});

	onDestroy(() => {
		if (cleanup) cleanup();
	});

	function handleKeydown(event: KeyboardEvent) {
		if (closeOnEscape && event.key === 'Escape') {
			open = false;
		}
	}

	function handleOutsideClick(event: MouseEvent) {
		if (closeOnOutsideClick && event.target instanceof Node && !dialog.contains(event.target)) {
			open = false;
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
	<div
		class="dialog-backdrop"
		on:click={handleOutsideClick}
		transition:fade={{ duration: $motionOK ? 200 : 0 }}
	>
		<dialog
			bind:this={dialog}
			class="a11y-dialog"
			open
			aria-labelledby="dialog-title"
			aria-modal="true"
			role="dialog"
		>
			<header class="dialog-header">
				<h2 id="dialog-title">{title}</h2>
				<button class="close-button" aria-label="Close dialog" on:click={() => (open = false)}>
					×
				</button>
			</header>

			<div class="dialog-content">
				<slot />
			</div>

			<div class="dialog-footer">
				<slot name="footer" />
			</div>
		</dialog>
	</div>
{/if}

<style>
	.dialog-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.a11y-dialog {
		position: relative;
		width: 90%;
		max-width: 500px;
		padding: 1.5rem;
		border: 2px solid var(--border-primary);
		border-radius: 0.5rem;
		background: var(--bg-primary);
		color: var(--text-primary);
	}

	.dialog-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.close-button {
		background: none;
		border: none;
		font-size: 1.5rem;
		color: var(--text-primary);
		cursor: pointer;
		padding: 0.5rem;
	}

	/* High Contrast Mode */
	@media (forced-colors: active) {
		.a11y-dialog {
			border: 2px solid CanvasText;
		}
	}

	/* Focus Management */
	.close-button:focus-visible {
		outline: 2px solid var(--text-primary);
		outline-offset: 2px;
	}
</style>

<!-- Instructions.svelte -->
<script>
	import { fade, fly } from 'svelte/transition';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	let currentPage = 0;

	const pages = [
		{
			title: 'CONTROLS',
			content: [
				['←/→', 'MOVE LEFT/RIGHT'],
				['↑', 'JUMP'],
				['SHIFT', 'DASH'],
				['X', 'SHOOT'],
				['SPACE', 'HEATSEEKER'],
				['P', 'PAUSE']
			]
		},
		{
			title: 'POWER-UPS',
			content: [
				['BLUE', 'HEATSEEKERS - Guided missiles'],
				['GOLD', 'POWER SURGE - Temporary invincibility'],
				['GREEN', 'EXTRA LIFE - Bonus life'],
				['RED', 'RAPID FIRE - Increased fire rate']
			]
		},
		{
			title: 'ENEMIES',
			content: [
				['VOID SWARM', 'Basic enemies - 2 hits to destroy'],
				['ZIGZAG', 'Pattern-based enemies - Unpredictable'],
				['CITY', 'Special enemies - Aggressive when damaged']
			]
		}
	];

	function handleClose() {
		dispatch('close');
	}

	function handleKeydown(event) {
		if (event.key === 'Escape') handleClose();
		if (event.key === 'ArrowLeft' && currentPage > 0) currentPage--;
		if (event.key === 'ArrowRight' && currentPage < pages.length - 1) currentPage++;
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="instruction-overlay" transition:fade>
	<div class="instruction-modal" transition:fly={{ y: 50, duration: 400 }}>
		<button class="close-button" on:click={handleClose}>×</button>

		<h2 class="title">{pages[currentPage].title}</h2>

		<div class="content">
			{#each pages[currentPage].content as [key, value]}
				<div class="instruction-row">
					<span class="key">{key}</span>
					<span class="value">{value}</span>
				</div>
			{/each}
		</div>

		<div class="navigation">
			<button class="nav-button" disabled={currentPage === 0} on:click={() => currentPage--}>
				← PREV
			</button>

			<span class="page-counter">
				{currentPage + 1}/{pages.length}
			</span>

			<button
				class="nav-button"
				disabled={currentPage === pages.length - 1}
				on:click={() => currentPage++}
			>
				NEXT →
			</button>
		</div>
	</div>
</div>

<style>
	/* Using NES color palette from your game */
	.instruction-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.9);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 50;
	}

	.instruction-modal {
		border: 4px solid #0078f8; /* NES blue */
		background: #000000;
		padding: 2rem;
		max-width: 42rem;
		width: 100%;
		margin: 0 1rem;
		position: relative;
	}

	.title {
		color: #f8b800; /* NES yellow */
		font-family: 'Press Start 2P', cursive;
		font-size: 1.5rem;
		text-align: center;
		margin-bottom: 1.5rem;
	}

	.close-button {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		color: #fcfcfc; /* NES white */
		font-size: 1.5rem;
		border: none;
		background: none;
		cursor: pointer;
		padding: 0.5rem;
	}

	.close-button:hover {
		color: #e40058; /* NES red */
	}

	.instruction-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.key {
		width: 6rem;
		color: #3cbcfc; /* NES light blue */
		font-family: 'Press Start 2P', cursive;
		font-size: 0.875rem;
	}

	.value {
		color: #fcfcfc; /* NES white */
		font-family: 'Press Start 2P', cursive;
		font-size: 0.875rem;
	}

	.navigation {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 2rem;
	}

	.nav-button {
		color: #fcfcfc;
		font-family: 'Press Start 2P', cursive;
		font-size: 0.875rem;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.5rem 1rem;
	}

	.nav-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.nav-button:not(:disabled):hover {
		color: #f8b800; /* NES yellow */
	}

	.page-counter {
		color: #fcfcfc;
		font-family: 'Press Start 2P', cursive;
		font-size: 0.875rem;
	}

	@media (max-width: 640px) {
		.instruction-modal {
			margin: 0 0.5rem;
			padding: 1rem;
		}

		.title {
			font-size: 1.25rem;
		}

		.key,
		.value {
			font-size: 0.75rem;
		}
	}
	:global(html.light) .instruction-modal {
		background-color: rgba(195, 210, 229, 0.95);
		border: 1px solid rgba(100, 130, 180, 0.2);
	}

	:global(html.light) .title {
		color: rgba(30, 40, 60, 0.95);
		text-shadow: 0 0 2px rgba(100, 130, 180, 0.3);
	}

	:global(html.light) .key,
	:global(html.light) .value {
		color: rgba(30, 40, 60, 0.9);
		text-shadow: 0 0 1px rgba(100, 130, 180, 0.3);
	}

	:global(html.light) .nav-button:not(:disabled) {
		color: rgba(30, 40, 60, 0.9);
	}

	:global(html.light) .nav-button:not(:disabled):hover {
		color: rgba(20, 30, 50, 1);
		text-shadow: 0 0 2px rgba(100, 130, 180, 0.4);
	}
</style>

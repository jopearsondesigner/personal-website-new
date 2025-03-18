<!-- Instructions.svelte -->
<script>
	import { fade, fly } from 'svelte/transition';
	import { createEventDispatcher } from 'svelte';
	import LeftArrowIcon from '$lib/icons/LeftArrowIcon.svelte';
	import RightArrowIcon from '$lib/icons/RightArrowIcon.svelte';
	import UpArrowIcon from '$lib/icons/UpArrowIcon.svelte';
	import XKeyIcon from '$lib/icons/XKeyIcon.svelte';
	import SpaceKeyIcon from '$lib/icons/SpaceKeyIcon.svelte';
	import ShiftKeyIcon from '$lib/icons/ShiftKeyIcon.svelte';
	import PKeyIcon from '$lib/icons/PKeyIcon.svelte';

	const dispatch = createEventDispatcher();

	// Icon size constant - adjust this single value to change all icons
	const ICON_SIZE = 28;

	let currentPage = 0;

	// Updated terminology to be consistent with game controls
	const pages = [
		{
			title: 'CONTROLS',
			content: [
				[{ type: 'icon', icon: 'left' }, 'MOVE LEFT'],
				[{ type: 'icon', icon: 'right' }, 'MOVE RIGHT'],
				[{ type: 'icon', icon: 'up' }, 'JUMP'],
				[{ type: 'icon', icon: 'shift' }, 'DASH'],
				[{ type: 'icon', icon: 'x' }, 'SHOOT'],
				[{ type: 'icon', icon: 'space' }, 'HEATSEEKER'], // Changed from "MISSILE" to "HEATSEEKER"
				[{ type: 'icon', icon: 'p' }, 'PAUSE']
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
					<span class="key">
						{#if typeof key === 'string'}
							{key}
						{:else if key.type === 'icon'}
							{#if key.icon === 'left'}
								<LeftArrowIcon size={ICON_SIZE} color="#3cbcfc" />
							{:else if key.icon === 'right'}
								<RightArrowIcon size={ICON_SIZE} color="#3cbcfc" />
							{:else if key.icon === 'up'}
								<UpArrowIcon size={ICON_SIZE} color="#3cbcfc" />
							{:else if key.icon === 'shift'}
								<ShiftKeyIcon size={ICON_SIZE} color="#3cbcfc" />
							{:else if key.icon === 'x'}
								<XKeyIcon size={ICON_SIZE} color="#3cbcfc" />
							{:else if key.icon === 'space'}
								<SpaceKeyIcon size={ICON_SIZE} color="#3cbcfc" />
							{:else if key.icon === 'p'}
								<PKeyIcon size={ICON_SIZE} color="#3cbcfc" />
							{/if}
						{/if}
					</span>
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
		box-shadow: 0 0 20px rgba(0, 120, 248, 0.3); /* Added subtle glow effect */
		border-radius: 0.5rem; /* Added slight rounding for modern touch */
	}

	.title {
		color: #f8b800; /* NES yellow */
		font-family: 'Press Start 2P', cursive;
		font-size: 1.3rem; /* Slightly smaller */
		text-align: center;
		margin-bottom: 1.25rem; /* Reduced spacing */
		text-shadow: 0 0 8px rgba(248, 184, 0, 0.4); /* Added glow effect */
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
		transition: color 0.2s ease; /* Smooth transition effect */
	}

	.close-button:hover {
		color: #e40058; /* NES red */
	}

	.instruction-row {
		display: flex;
		align-items: center;
		gap: 1rem; /* Reduced gap for tighter spacing */
		margin-bottom: 0.75rem; /* Reduced spacing */
		padding: 0.4rem; /* Reduced padding */
		border-radius: 0.25rem; /* Subtle rounding */
		transition: background-color 0.2s ease; /* Smooth hover effect */
	}

	.instruction-row:hover {
		background-color: rgba(255, 255, 255, 0.05); /* Subtle highlight on hover */
	}

	.key {
		width: 5.5rem; /* Slightly narrower */
		color: #3cbcfc; /* NES light blue */
		font-family: 'Press Start 2P', cursive;
		font-size: 0.75rem; /* Smaller text */
		display: flex;
		align-items: center;
		justify-content: flex-start;
	}

	.value {
		color: #fcfcfc; /* NES white */
		font-family: 'Press Start 2P', cursive;
		font-size: 0.75rem; /* Smaller text */
		line-height: 1.3; /* Tighter line height */
		flex: 1;
	}

	.navigation {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 2rem;
		padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1); /* Subtle separator */
	}

	.nav-button {
		color: #fcfcfc;
		font-family: 'Press Start 2P', cursive;
		font-size: 0.875rem;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.5rem 1rem;
		transition: all 0.2s ease; /* Smooth transition */
		border-radius: 0.25rem; /* Subtle rounding */
	}

	.nav-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.nav-button:not(:disabled):hover {
		color: #f8b800; /* NES yellow */
		background-color: rgba(255, 255, 255, 0.05); /* Subtle background on hover */
	}

	.page-counter {
		color: #fcfcfc;
		font-family: 'Press Start 2P', cursive;
		font-size: 0.875rem;
		opacity: 0.7; /* Slightly muted */
	}

	/* Added styles for icons */
	:global(.instruction-icon) {
		display: inline-block;
		vertical-align: middle;
		filter: drop-shadow(0 0 3px rgba(60, 188, 252, 0.7)); /* Added glow effect */
	}

	/* Responsive styling */
	@media (max-width: 640px) {
		.instruction-modal {
			margin: 0 0.5rem;
			padding: 1rem;
		}

		.title {
			font-size: 1.25rem;
		}

		.key,
		.value,
		.nav-button,
		.page-counter {
			font-size: 0.75rem;
		}

		.instruction-row {
			gap: 0.75rem;
		}
	}

	/* Light mode overrides */
	:global(html.light) .instruction-modal {
		background-color: rgba(195, 210, 229, 0.95);
		border: 1px solid rgba(100, 130, 180, 0.2);
		box-shadow: 0 0 20px rgba(0, 120, 248, 0.15); /* Softer glow for light mode */
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
		background-color: rgba(100, 130, 180, 0.1); /* Subtle background on hover for light mode */
	}

	:global(html.light) .instruction-row:hover {
		background-color: rgba(100, 130, 180, 0.1); /* Lighter hover effect for light mode */
	}
</style>

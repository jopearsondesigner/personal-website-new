<!-- src/lib/components/GameComponent.svelte -->
<script>
	import { onMount, onDestroy } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import Game from '$components/game/Game.svelte';

	let decorativeText = [
		{ text: 'HIGH SCORE', value: '000000', side: 'left' },
		{ text: '1UP', value: '0', side: 'right' }
	];
</script>

<div class="game-wrapper">
	<div class="game-background">
		<!-- Left side panel -->
		<div class="side-panel left" in:fly={{ x: -50, duration: 1000 }}>
			{#each decorativeText.filter((item) => item.side === 'left') as item}
				<div class="arcade-text">
					<span class="label">{item.text}</span>
					<span class="value">{item.value}</span>
				</div>
			{/each}
			<div class="neon-line"></div>
			<div class="pixel-decoration"></div>
		</div>

		<!-- Game container -->
		<div class="game-view-container">
			<Game />
		</div>

		<!-- Right side panel -->
		<div class="side-panel right" in:fly={{ x: 50, duration: 1000 }}>
			{#each decorativeText.filter((item) => item.side === 'right') as item}
				<div class="arcade-text">
					<span class="label">{item.text}</span>
					<span class="value">{item.value}</span>
				</div>
			{/each}
			<div class="neon-line"></div>
			<div class="pixel-decoration"></div>
		</div>
	</div>
</div>

<style>
	.game-wrapper {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 2vmin;
	}

	.game-background {
		position: relative;
		width: 100%;
		height: 100%;
		background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
		border-radius: 1.5vmin;
		display: flex;
		justify-content: center;
		align-items: center;
		overflow: hidden;
	}

	.game-view-container {
		flex: 1;
		height: 100%;
		margin: 0 150px; /* Creates space for side panels */
		display: flex;
		justify-content: center;
		align-items: center;
		position: relative;
	}

	.side-panel {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 150px;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 2rem 1rem;
		z-index: 2;
	}

	.side-panel.left {
		left: 0;
		border-right: 1px solid rgba(39, 255, 153, 0.1);
	}

	.side-panel.right {
		right: 0;
		border-left: 1px solid rgba(39, 255, 153, 0.1);
	}

	.arcade-text {
		font-family: 'Press Start 2P', monospace;
		color: var(--arcade-neon-green-500);
		text-align: center;
		margin: 1rem 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.arcade-text .label {
		font-size: 0.8rem;
		opacity: 0.8;
	}

	.arcade-text .value {
		font-size: 1rem;
		text-shadow: 0 0 5px var(--arcade-neon-green-500);
	}

	.neon-line {
		width: 80%;
		height: 2px;
		background: var(--arcade-neon-green-500);
		margin: 2rem 0;
		box-shadow: 0 0 10px var(--arcade-neon-green-500);
		opacity: 0.5;
	}

	.pixel-decoration {
		width: 100%;
		height: 40px;
		background-image: linear-gradient(45deg, var(--arcade-neon-green-500) 25%, transparent 25%),
			linear-gradient(-45deg, var(--arcade-neon-green-500) 25%, transparent 25%);
		background-size: 10px 10px;
		opacity: 0.1;
	}
</style>

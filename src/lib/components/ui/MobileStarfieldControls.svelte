<!-- $lib/components/ui/MobileStarfieldControls.svelte -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	let speedSliderValue = 1;
	let currentEffect = 'version1';
	let isBoosting = false;

	const effects = [
		{ id: 'version1', name: 'Streaks', icon: '✦' },
		{ id: 'version2', name: 'Zoom', icon: '◉' },
		{ id: 'version3', name: 'Warp', icon: '⟫' }
	];

	// Handle speed changes
	const handleSpeedChange = (event: Event) => {
		const target = event.target as HTMLInputElement;
		speedSliderValue = parseFloat(target.value);
		dispatch('speedChange', { speed: speedSliderValue });
	};

	// Handle effect changes
	const handleEffectChange = (effectId: string) => {
		currentEffect = effectId;
		dispatch('effectChange', { effect: effectId });
	};

	// Handle boost
	const handleBoostToggle = () => {
		isBoosting = !isBoosting;
		dispatch('boostToggle', { active: isBoosting });
	};
</script>

<div class="mobile-starfield-controls">
	<div class="controls-header">
		<span class="controls-title">✦ Starfield Controls</span>
		<button
			class="boost-button"
			class:active={isBoosting}
			on:click={handleBoostToggle}
			aria-label="Toggle turbo boost"
		>
			{isBoosting ? '🚀' : '⚡'}
		</button>
	</div>

	<div class="controls-content">
		<!-- Speed Control -->
		<div class="control-group">
			<label for="speed-slider" class="control-label">
				Speed: {speedSliderValue.toFixed(1)}x
			</label>
			<input
				id="speed-slider"
				type="range"
				min="0.1"
				max="3.0"
				step="0.1"
				bind:value={speedSliderValue}
				on:input={handleSpeedChange}
				class="speed-slider"
			/>
		</div>

		<!-- Effect Selection -->
		<div class="control-group">
			<span class="control-label">Effects:</span>
			<div class="effect-buttons">
				{#each effects as effect}
					<button
						class="effect-button"
						class:active={currentEffect === effect.id}
						on:click={() => handleEffectChange(effect.id)}
						aria-label="Switch to {effect.name} effect"
					>
						<span class="effect-icon">{effect.icon}</span>
						<span class="effect-name">{effect.name}</span>
					</button>
				{/each}
			</div>
		</div>
	</div>
</div>

<style>
	.mobile-starfield-controls {
		position: fixed;
		bottom: 20px;
		left: 50%;
		transform: translateX(-50%);
		background: rgba(0, 0, 0, 0.9);
		border: 1px solid rgba(39, 255, 153, 0.3);
		border-radius: 16px;
		padding: 16px;
		z-index: 30;
		backdrop-filter: blur(12px);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
		min-width: 280px;
		max-width: 90vw;
	}

	.controls-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12px;
		padding-bottom: 8px;
		border-bottom: 1px solid rgba(39, 255, 153, 0.2);
	}

	.controls-title {
		font-family: 'Press Start 2P', monospace;
		font-size: 10px;
		color: rgba(39, 255, 153, 1);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.boost-button {
		background: none;
		border: 2px solid rgba(255, 255, 39, 0.6);
		border-radius: 8px;
		padding: 8px 12px;
		font-size: 16px;
		cursor: pointer;
		transition: all 0.2s ease;
		color: rgba(255, 255, 39, 0.8);
	}

	.boost-button:hover,
	.boost-button.active {
		background: rgba(255, 255, 39, 0.2);
		border-color: rgba(255, 255, 39, 1);
		transform: scale(1.05);
	}

	.controls-content {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.control-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.control-label {
		font-family: 'Pixelify Sans', sans-serif;
		font-size: 12px;
		color: rgba(255, 255, 255, 0.9);
		font-weight: 500;
	}

	.speed-slider {
		appearance: none;
		width: 100%;
		height: 6px;
		border-radius: 3px;
		background: rgba(255, 255, 255, 0.2);
		outline: none;
		cursor: pointer;
	}

	.speed-slider::-webkit-slider-thumb {
		appearance: none;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: rgba(39, 255, 153, 1);
		cursor: pointer;
		box-shadow: 0 0 8px rgba(39, 255, 153, 0.5);
		transition: all 0.2s ease;
	}

	.speed-slider::-webkit-slider-thumb:hover {
		transform: scale(1.1);
		box-shadow: 0 0 12px rgba(39, 255, 153, 0.8);
	}

	.speed-slider::-moz-range-thumb {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: rgba(39, 255, 153, 1);
		cursor: pointer;
		border: none;
		box-shadow: 0 0 8px rgba(39, 255, 153, 0.5);
	}

	.effect-buttons {
		display: flex;
		gap: 8px;
		justify-content: space-between;
	}

	.effect-button {
		flex: 1;
		background: none;
		border: 2px solid rgba(255, 39, 153, 0.4);
		border-radius: 12px;
		padding: 12px 8px;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		min-height: 60px;
	}

	.effect-button:hover {
		border-color: rgba(255, 39, 153, 0.8);
		background: rgba(255, 39, 153, 0.1);
		transform: translateY(-2px);
	}

	.effect-button.active {
		border-color: rgba(255, 39, 153, 1);
		background: rgba(255, 39, 153, 0.2);
		box-shadow: 0 0 12px rgba(255, 39, 153, 0.4);
	}

	.effect-icon {
		font-size: 18px;
		color: rgba(255, 39, 153, 1);
	}

	.effect-name {
		font-family: 'Press Start 2P', monospace;
		font-size: 8px;
		color: rgba(255, 255, 255, 0.8);
		text-transform: uppercase;
		letter-spacing: 0.3px;
	}

	/* Hide on desktop where hover controls work better */
	@media (min-width: 769px) {
		.mobile-starfield-controls {
			display: none;
		}
	}

	/* Adjust for very small screens */
	@media (max-width: 320px) {
		.mobile-starfield-controls {
			min-width: 260px;
			padding: 12px;
		}

		.effect-buttons {
			flex-wrap: wrap;
		}

		.effect-button {
			min-width: 70px;
		}
	}

	/* Accessibility: Respect reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.boost-button,
		.effect-button {
			transition: none;
		}

		.boost-button:hover,
		.boost-button.active {
			transform: none;
		}

		.effect-button:hover {
			transform: none;
		}
	}
</style>

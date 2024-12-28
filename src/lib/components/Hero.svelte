<!-- Hero.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { gsap } from 'gsap';
	import { get } from 'svelte/store';
	import ArcadeCtaButton from '$lib/components/ArcadeCtaButton.svelte';
	import ArcadeNavigation from '$lib/components/ArcadeNavigation.svelte';
	import ArcadeCabinet from '$lib/components/ArcadeCabinet.svelte';
	import { animations } from '$lib/utils/animation-utils';
	import { animationState, screenStore } from '$lib/stores/animation-store';
	import { layoutStore } from '$lib/stores/store';

	let header: HTMLElement;
	let insertConcept: HTMLElement;
	let arcadeScreen: HTMLElement;
	let starContainer: HTMLElement;
	let spaceBackground: HTMLElement;
	let currentScreen = 'main';
	let stars = [];

	$: {
		stars = $animationState.stars;
	}

	$: if (currentScreen === 'main') {
		if (browser) {
			setTimeout(() => {
				const elements = {
					header: document.querySelector('#header'),
					insertConcept: document.querySelector('#insert-concept'),
					arcadeScreen: document.querySelector('#arcade-screen')
				};
				startAnimations(elements);
			}, 50);
		}
	} else {
		stopAnimations();
	}

	function startAnimations(elements: {
		header: HTMLElement;
		insertConcept: HTMLElement;
		arcadeScreen: HTMLElement;
	}) {
		const state = get(animationState);
		if (state.isAnimating) return;

		const { header, insertConcept, arcadeScreen } = elements;

		let starArray = animations.initStars(300);
		animationState.update((s) => ({ ...s, stars: starArray }));

		function updateStarField() {
			if (get(screenStore) !== 'main') return;

			starArray = animations.updateStars(starArray);
			animationState.update((s) => ({ ...s, stars: starArray }));
			state.animationFrame = requestAnimationFrame(updateStarField);
		}

		updateStarField();

		if (!header || !insertConcept || !arcadeScreen) {
			setTimeout(() => {
				const updatedElements = {
					header: document.querySelector('#header'),
					insertConcept: document.querySelector('#insert-concept'),
					arcadeScreen: document.querySelector('#arcade-screen')
				};
				if (
					updatedElements.header &&
					updatedElements.insertConcept &&
					updatedElements.arcadeScreen
				) {
					startAnimations(updatedElements);
				}
			}, 100);
			return;
		}

		const timeline = gsap.timeline();

		timeline.to([header, insertConcept], {
			duration: 0.1,
			y: '+=2',
			repeat: -1,
			yoyo: true,
			ease: 'power1.inOut'
		});

		timeline.to(
			insertConcept,
			{
				duration: 1,
				opacity: 0,
				repeat: -1,
				yoyo: true,
				ease: 'none'
			},
			0
		);

		const glitchInterval = setInterval(() => {
			if (get(screenStore) === 'main') {
				animations.createGlitchEffect(header);
				animations.createGlitchEffect(insertConcept);
			}
		}, 100);

		function animateGlow() {
			if (!arcadeScreen || get(screenStore) !== 'main') return;

			const duration = Math.random() * 2 + 1;
			arcadeScreen.classList.toggle('glow');

			state.glowAnimation = gsap.delayedCall(duration, () => {
				arcadeScreen.classList.toggle('glow');
				gsap.delayedCall(Math.random() * 1 + 0.5, animateGlow);
			});
		}

		animateGlow();

		animationState.set({
			...state,
			glitchInterval,
			isAnimating: true
		});
	}

	function stopAnimations() {
		const state = get(animationState);

		if (state.glitchInterval) clearInterval(state.glitchInterval);
		if (state.animationFrame) cancelAnimationFrame(state.animationFrame);
		if (state.glowAnimation) state.glowAnimation.kill();

		gsap.killTweensOf('*');

		animationState.set({
			...state,
			stars: [],
			isAnimating: false
		});
	}

	export function handleScreenChange(event) {
		const newScreen = event.detail;
		screenStore.set(newScreen);
		currentScreen = newScreen;
	}

	onMount(() => {
		if (!browser) return;

		currentScreen = 'main';
		const handleOrientation = () => {
			const isLandscape = window.innerWidth > window.innerHeight;
			document.body.classList.toggle('landscape', isLandscape);
		};

		arcadeScreen.classList.add('power-sequence');

		window.addEventListener('resize', handleOrientation);
		handleOrientation();

		return () => window.removeEventListener('resize', handleOrientation);
	});

	onDestroy(() => {
		if (!browser) return;
		stopAnimations();
	});
</script>

<section
	id="hero"
	class="w-full relative overflow-hidden flex items-center justify-center"
	style="
        margin-top: calc(-{$layoutStore.navbarHeight}px);
        height: calc(100vh + {$layoutStore.navbarHeight}px);
    "
>
	<div
		id="arcade-cabinet"
		class="cabinet-metal w-full h-full relative flex items-center justify-center"
	>
		<div class="cabinet-plastic">
			<div class="cabinet-background absolute inset-0"></div>
			<div class="cabinet-wear absolute inset-0"></div>

			<div class="arcade-screen-wrapper relative">
				<div class="navigation-wrapper relative z-50">
					<ArcadeNavigation on:changeScreen={handleScreenChange} />
				</div>

				<!-- Screen Bezel Layer -->
				<div class="screen-bezel"></div>

				<div
					id="arcade-screen"
					class="crt-screen hardware-accelerated relative w-[90vw] h-[70vh] md:w-[80vw] md:h-[600px] glow"
					bind:this={arcadeScreen}
				>
					<div class="phosphor-decay"></div>
					<div class="shadow-mask"></div>
					<div class="interlace"></div>
					<!-- Screen Effects -->
					<div class="screen-reflection"></div>
					<div class="screen-glare"></div>
					<div class="screen-glass"></div>
					<div class="glow-effect"></div>

					<div id="scanline-overlay" class="absolute inset-0 pointer-events-none z-10"></div>

					{#if currentScreen === 'main'}
						<div
							id="space-background"
							class="absolute inset-0 overflow-hidden pointer-events-none"
							bind:this={spaceBackground}
						>
							<div
								class="star-container absolute inset-0 pointer-events-none"
								bind:this={starContainer}
							>
								{#each stars as star (star)}
									<div class="star absolute" style={star.style}></div>
								{/each}
							</div>
						</div>
						<div
							id="text-wrapper"
							class="absolute inset-0 flex flex-col items-center justify-center z-0 p-2 box-border"
						>
							<div id="header" class="text-center mb-2" bind:this={header}>
								Power-up Your Brand!
							</div>
							<div id="insert-concept" class="text-center" bind:this={insertConcept}>
								Insert Concept
							</div>
							<div class="mt-8">
								<ArcadeCtaButton />
							</div>
						</div>
					{:else if currentScreen === 'game'}
						<ArcadeCabinet />
					{/if}
				</div>
			</div>
		</div>
	</div>
</section>

<style>
	:root {
		/* Layout */
		--arcade-screen-width: min(95vw, 800px);
		--arcade-screen-height: min(70vh, 600px);
		--border-radius: 4vmin;
		--cabinet-depth: 2.5vmin;
		--screen-recess: 1.8vmin;
		--bezel-thickness: 0.8vmin;

		/* Typography */
		--header-font-size: 14vmin;
		--insert-concept-font-size: 2.45vmin;

		/* Colors */
		--screen-border-color: rgba(226, 226, 189, 1);
		--header-text-color: rgba(227, 255, 238, 1);
		--insert-concept-color: rgba(245, 245, 220, 1);
		--cabinet-specular: rgba(255, 255, 255, 0.7);
		--glass-reflection: rgba(255, 255, 255, 0.15);
		--screen-glow-opacity: 0.6;

		/* Shadows & Effects */
		--cabinet-shadow: 0 20px 40px rgba(0, 0, 0, 0.25), 0 5px 15px rgba(0, 0, 0, 0.15),
			inset 0 3px 8px rgba(0, 0, 0, 0.2);

		--screen-shadow: 0 0 30px rgba(0, 0, 0, 0.8), inset 0 0 50px rgba(0, 0, 0, 0.9),
			inset 0 0 2px rgba(255, 255, 255, 0.3), inset 0 0 100px rgba(0, 0, 0, 0.7);

		--bezel-shadow: inset 0 0 20px rgba(0, 0, 0, 0.9), 0 0 2px var(--glass-reflection),
			0 0 15px rgba(39, 255, 153, 0.2);

		--screen-curve: radial-gradient(
			circle at 50% 50%,
			rgba(255, 255, 255, 0.1) 0%,
			rgba(255, 255, 255, 0.05) 40%,
			transparent 60%
		);
	}

	@media (min-width: 1020px) {
		:root {
			--arcade-screen-width: 80vw;
			--arcade-screen-height: 600px;
			--header-font-size: 5.6rem;
		}
	}

	section {
		height: calc(100vh - var(--navbar-height, 64px));
	}

	#arcade-cabinet {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		position: relative;
		isolation: isolate;
		transform-style: preserve-3d;
		background: linear-gradient(180deg, rgba(40, 40, 40, 1) 0%, rgba(20, 20, 20, 1) 100%);
		box-shadow: var(--cabinet-shadow);
	}

	.cabinet-wear {
		border-radius: 6vmin;
		background: repeating-linear-gradient(
			45deg,
			transparent 0px,
			transparent 5px,
			rgba(0, 0, 0, 0.02) 5px,
			rgba(0, 0, 0, 0.02) 6px
		);
		opacity: 0.3;
		mix-blend-mode: multiply;
		/* Add subtle texture */
		backdrop-filter: contrast(1.02);
	}

	:global(html.light) .cabinet-wear {
		background: repeating-linear-gradient(
			45deg,
			transparent 0px,
			transparent 5px,
			rgba(0, 0, 0, 0.03) 5px,
			rgba(0, 0, 0, 0.03) 6px
		);
		opacity: 0.4;
	}

	.arcade-screen-wrapper {
		position: relative;
		padding: var(--screen-recess);
		transform: perspective(1000px) rotateX(2deg);
		transform-style: preserve-3d;
		width: fit-content;
		height: fit-content;
		margin: 0 auto;
	}

	.screen-bezel {
		position: absolute;
		inset: 0;
		border-radius: calc(var(--border-radius) + var(--bezel-thickness));
		background: repeating-linear-gradient(
				45deg,
				rgba(255, 255, 255, 0.03) 0px,
				rgba(255, 255, 255, 0.03) 1px,
				transparent 1px,
				transparent 2px
			),
			linear-gradient(to bottom, rgba(40, 40, 40, 1), rgba(60, 60, 60, 1));
		transform: translateZ(-1px);
		box-shadow:
    /* Deeper inset shadow */
			inset 0 0 20px rgba(0, 0, 0, 0.9),
			/* Subtle edge highlight */ 0 0 2px var(--glass-reflection),
			/* Screen glow */ 0 0 15px rgba(39, 255, 153, 0.2);
	}

	:global(html.light) .screen-bezel {
		background: repeating-linear-gradient(
				45deg,
				rgba(180, 180, 180, 0.1) 0px,
				rgba(180, 180, 180, 0.1) 1px,
				transparent 1px,
				transparent 2px
			),
			linear-gradient(to bottom, rgba(160, 160, 160, 1), rgba(140, 140, 140, 1));
		box-shadow:
    /* Deeper inset shadow */
			inset 0 0 25px rgba(0, 0, 0, 0.5),
			/* Enhanced edge highlight */ 0 0 2px rgba(255, 255, 255, 0.4),
			/* Stronger screen glow */ 0 0 20px rgba(39, 255, 153, 0.15);
	}

	#arcade-screen {
		width: var(--arcade-screen-width);
		height: var(--arcade-screen-height);
		border: none;
		border-radius: var(--border-radius);
		position: relative;
		overflow: hidden;
		z-index: 0;
		aspect-ratio: 4/3;
		box-shadow: var(--screen-shadow);
		background: linear-gradient(145deg, #111 0%, #444 100%);
		transform-style: preserve-3d;
	}

	.screen-reflection {
		position: absolute;
		inset: 0;
		background: var(--screen-curve),
			linear-gradient(
				35deg,
				transparent 0%,
				rgba(255, 255, 255, 0.02) 25%,
				rgba(255, 255, 255, 0.05) 47%,
				rgba(255, 255, 255, 0.02) 50%,
				transparent 100%
			);
		mix-blend-mode: overlay;
		opacity: 0.7;
	}

	.screen-glare {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			35deg,
			transparent 0%,
			rgba(255, 255, 255, 0.05) 25%,
			rgba(255, 255, 255, 0.1) 47%,
			rgba(255, 255, 255, 0.05) 50%,
			transparent 100%
		);
		pointer-events: none;
		z-index: 2;
	}

	.screen-glass {
		position: absolute;
		inset: 0;
		border-radius: var(--border-radius);
		background: linear-gradient(
			35deg,
			transparent 0%,
			rgba(255, 255, 255, 0.02) 25%,
			rgba(255, 255, 255, 0.05) 47%,
			rgba(255, 255, 255, 0.02) 50%,
			transparent 100%
		);
		pointer-events: none;
		mix-blend-mode: overlay;
		opacity: 0.8;
		z-index: 2;
	}

	:global(html.light) #arcade-cabinet {
		background:
        /* Top highlight strip */
			linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, transparent 15%),
			/* Side gradients for depth */
				linear-gradient(
					90deg,
					rgba(160, 160, 160, 1) 0%,
					rgba(200, 200, 200, 0) 15%,
					rgba(200, 200, 200, 0) 85%,
					rgba(160, 160, 160, 1) 100%
				),
			/* Base material with much more contrast */
				linear-gradient(170deg, #e0e0e0 0%, #b0b0b0 40%, #909090 70%, #808080 100%);
		box-shadow:
        /* Dramatic outer shadow */
			0 20px 40px rgba(0, 0, 0, 0.3),
			/* Deep cavity shadow at bottom */ 0 10px 30px rgba(0, 0, 0, 0.2),
			/* Top edge highlight */ inset 0 2px 3px rgba(255, 255, 255, 0.9),
			/* Strong side shadows */ inset -3px 0 8px rgba(0, 0, 0, 0.15),
			inset 3px 0 8px rgba(0, 0, 0, 0.15),
			/* Bottom shadow */ inset 0 -3px 6px rgba(0, 0, 0, 0.2);
	}

	:global(html.light) #arcade-screen::before {
		background: linear-gradient(
			145deg,
			rgba(30, 30, 30, 1) 0%,
			rgba(50, 50, 50, 1) 50%,
			rgba(30, 30, 30, 1) 100%
		);
		box-shadow:
			inset 0 0 40px rgba(0, 0, 0, 0.95),
			0 0 25px rgba(0, 0, 0, 0.9),
			inset 0 1px 2px rgba(255, 255, 255, 0.15);
	}

	/* Dark Theme Specific Styles */
	:global(html.dark) #arcade-screen::after {
		background: linear-gradient(45deg, #00ffff, #0000ff, #ff00ff, #ff0000);
		filter: blur(4vmin);
	}

	/* Typography Styles */
	#header {
		font-family: 'Pixelify Sans', sans-serif;
		font-size: var(--header-font-size);
		letter-spacing: 0.2vmin;
		line-height: 1.27;
		font-weight: 700;
		color: var(--header-text-color);
		text-shadow:
			0 0 1vmin rgba(39, 255, 153, 0.8),
			0 0 2vmin rgba(39, 255, 153, 0.7),
			0 0 3vmin rgba(39, 255, 153, 0.6),
			0 0 4vmin rgba(245, 245, 220, 0.5),
			0 0 7vmin rgba(245, 245, 220, 0.3),
			0 0 8vmin rgba(245, 245, 220, 0.1);
	}

	#insert-concept {
		font-family: 'Press Start 2P', sans-serif;
		text-transform: uppercase;
		letter-spacing: 0.2vmin;
		font-size: var(--insert-concept-font-size);
		font-weight: 700;
		color: var(--insert-concept-color);
		text-shadow:
			0 0 0.15vmin rgba(250, 250, 240, 0.4),
			0 0 0.3vmin rgba(250, 250, 240, 0.45),
			0 0 1.2vmin rgba(250, 250, 240, 0.3),
			0 0 0.4vmin rgba(245, 245, 220, 0.25),
			0 0 1.5vmin rgba(245, 245, 220, 0.15),
			0 0 2vmin rgba(245, 245, 220, 0.05);
	}

	/* Space Background & Stars */
	#space-background {
		position: absolute;
		inset: 0;
		background: radial-gradient(circle at center, #000 20%, #001c4d 80%, #000000);
		border-radius: var(--border-radius);
		overflow: hidden;
		z-index: 0;
		perspective: 1000px;
	}

	.star-container {
		position: absolute;
		inset: 0;
		perspective: 500px;
		transform-style: preserve-3d;
		z-index: 1;
	}

	.star {
		position: absolute;
		background: #fff;
		border-radius: 50%;
		box-shadow: 0 0 2px 1px rgba(255, 255, 255, 0.5);
		pointer-events: none;
		transform: translateZ(0);
		will-change: transform;
	}

	/* Screen Effects */
	#scanline-overlay {
		background: linear-gradient(0deg, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0.1) 51%);
		background-size: 100% 4px;
		animation: scanline 0.2s linear infinite;
		border-radius: calc(var(--border-radius) - 0.5vmin);
		z-index: 1;
	}

	#arcade-screen.glow::after {
		content: '';
		position: absolute;
		inset: -2px;
		border-radius: calc(var(--border-radius) + 0.5vmin);
		background: linear-gradient(45deg, #00ffff80, #0000ff80, #ff00ff80, #ff000080);
		filter: blur(12px);
		opacity: var(--screen-glow-opacity);
		z-index: -1;
		mix-blend-mode: screen;
	}

	/* Animations */
	@keyframes scanline {
		0% {
			background-position: 0 0;
		}
		100% {
			background-position: 0 4px;
		}
	}

	/* T-Molding LED/Neon Simulation */
	.t-molding {
		position: absolute;
		inset: -4px;
		border-radius: calc(var(--border-radius) + 8px);
		background: transparent;
		overflow: hidden;
		z-index: -1;
	}

	.t-molding::before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(
			90deg,
			rgba(255, 0, 98, 0.8) 0%,
			rgba(255, 0, 98, 0.4) 50%,
			rgba(255, 0, 98, 0.8) 100%
		);
		filter: blur(3px);
		animation: tmoldingPulse 4s infinite;
	}

	.t-molding::after {
		content: '';
		position: absolute;
		inset: 0;
		background: rgba(255, 255, 255, 0.1);
		box-shadow:
    /* Inner diffusion */
			inset 0 0 15px rgba(255, 255, 255, 0.2),
			/* Outer glow */ 0 0 20px rgba(255, 0, 98, 0.4);
	}

	/* Control Panel Underlighting */
	.control-panel-light {
		position: absolute;
		bottom: -20px;
		left: 10%;
		right: 10%;
		height: 20px;
		background: linear-gradient(to bottom, rgba(0, 255, 255, 0.4), transparent);
		filter: blur(8px);
		transform: perspective(500px) rotateX(60deg);
		transform-origin: top;
		opacity: 0.6;
		animation: controlPanelGlow 2s ease-in-out infinite alternate;
	}

	/* Corner Accent Lights */
	.corner-accent {
		position: absolute;
		width: 30px;
		height: 30px;
		background: radial-gradient(
			circle at center,
			rgba(255, 255, 255, 0.9),
			rgba(255, 255, 255, 0.1) 70%,
			transparent 100%
		);
		filter: blur(2px);
		opacity: 0.7;
	}

	.corner-accent.top-left {
		top: -15px;
		left: -15px;
	}
	.corner-accent.top-right {
		top: -15px;
		right: -15px;
	}
	.corner-accent.bottom-left {
		bottom: -15px;
		left: -15px;
	}
	.corner-accent.bottom-right {
		bottom: -15px;
		right: -15px;
	}

	/* Environmental Light Spill */
	.light-spill {
		position: absolute;
		inset: -50px;
		background: radial-gradient(circle at 50% 50%, rgba(255, 0, 98, 0.15), transparent 70%);
		filter: blur(20px);
		mix-blend-mode: screen;
		pointer-events: none;
		z-index: -2;
	}

	/* Light Theme Adjustments */
	:global(html.light) .t-molding::before {
		opacity: 0.4;
		background: linear-gradient(
			90deg,
			rgba(0, 150, 255, 0.6) 0%,
			rgba(0, 150, 255, 0.3) 50%,
			rgba(0, 150, 255, 0.6) 100%
		);
	}

	:global(html.light) .control-panel-light {
		opacity: 0.3;
		background: linear-gradient(to bottom, rgba(0, 150, 255, 0.3), transparent);
	}

	/* Hardware-accurate Animations */
	@keyframes tmoldingPulse {
		0%,
		100% {
			opacity: 0.8;
		}
		50% {
			opacity: 1;
		}
	}

	@keyframes controlPanelGlow {
		from {
			opacity: 0.5;
		}
		to {
			opacity: 0.7;
		}
	}

	/* Fluorescent Flicker Effect */
	.screen-flicker {
		position: absolute;
		inset: 0;
		background: linear-gradient(transparent 0%, rgba(255, 255, 255, 0.05) 50%, transparent 100%);
		opacity: 0;
		animation: screenFlicker 0.1s steps(2) infinite;
	}

	@keyframes screenFlicker {
		0%,
		100% {
			opacity: 0;
		}
		50% {
			opacity: 1;
		}
	}

	/* Hardware Power-up Sequence */
	@keyframes powerUp {
		0% {
			filter: brightness(0);
			transform: scale(0.98);
		}
		5% {
			filter: brightness(0.3);
			transform: scale(0.99);
		}
		10% {
			filter: brightness(0.1);
			transform: scale(0.98);
		}
		15% {
			filter: brightness(0.5);
			transform: scale(1);
		}
		30% {
			filter: brightness(0.3);
			transform: scale(0.99);
		}
		100% {
			filter: brightness(1);
			transform: scale(1);
		}
	}

	/* CRT and Phosphor Effects */
	.crt-screen {
		--phosphor-decay: 16ms;
		--refresh-rate: 60Hz;
		--shadow-mask-size: 3px;
		--bloom-intensity: 0.4;
		--misconvergence-offset: 0.5px;

		position: relative;
		overflow: hidden;
		background: #000;
	}

	/* P22 Phosphor Decay Simulation */
	.phosphor-decay {
		position: absolute;
		inset: 0;
		mix-blend-mode: screen;
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 20%);
		animation: phosphorPersistence var(--phosphor-decay) linear infinite;
	}

	/* RGB Shadow Mask Pattern */
	.shadow-mask {
		position: absolute;
		inset: 0;
		background-image: repeating-linear-gradient(
			90deg,
			rgba(255, 0, 0, 0.1),
			rgba(0, 255, 0, 0.1),
			rgba(0, 0, 255, 0.1)
		);
		background-size: var(--shadow-mask-size) var(--shadow-mask-size);
		pointer-events: none;
		opacity: 0.3;
	}

	/* Authentic Interlace Flicker */
	.interlace {
		position: absolute;
		inset: 0;
		background: repeating-linear-gradient(
			0deg,
			rgba(0, 0, 0, 0.2) 0px,
			transparent 1px,
			transparent 2px
		);
		animation: interlaceFlicker calc(1000ms / var(--refresh-rate)) steps(2) infinite;
	}

	/* Color Bleed and Misconvergence */
	.color-bleed {
		position: absolute;
		inset: 0;
		filter: blur(1.5px);
		opacity: 0.4;
		mix-blend-mode: screen;
	}

	.misconvergence {
		position: absolute;
		inset: 0;
		transform: translate3d(var(--misconvergence-offset), 0, 0);
		mix-blend-mode: screen;
		opacity: 0.4;
	}

	/* Hardware Power Sequence */
	.power-sequence {
		animation: powerUpSequence 2.5s ease-out;
	}

	/* Authentic Cabinet Materials */
	.cabinet-metal {
		background: linear-gradient(180deg, rgba(40, 40, 40, 1) 0%, rgba(20, 20, 20, 1) 100%);
		box-shadow: var(--cabinet-shadow);
	}

	:global(html.light) .cabinet-metal {
		background:
    /* Intense top highlight */
			linear-gradient(
				180deg,
				rgba(255, 255, 255, 1) 0%,
				rgba(255, 255, 255, 0.3) 8%,
				transparent 15%
			),
			/* Enhanced side gradients for more depth */
				linear-gradient(
					90deg,
					rgba(120, 120, 120, 1) 0%,
					rgba(180, 180, 180, 0) 15%,
					rgba(180, 180, 180, 0) 85%,
					rgba(120, 120, 120, 1) 100%
				),
			/* More contrasted base material */
				linear-gradient(170deg, #f0f0f0 0%, #d0d0d0 30%, #a0a0a0 60%, #808080 100%);
		box-shadow:
    /* Stronger outer shadow */
			0 20px 40px rgba(0, 0, 0, 0.4),
			/* Deeper cavity shadow */ 0 10px 30px rgba(0, 0, 0, 0.3),
			/* Enhanced edge highlights */ inset 0 2px 4px rgba(255, 255, 255, 1),
			/* Deeper side shadows */ inset -3px 0 10px rgba(0, 0, 0, 0.2),
			inset 3px 0 10px rgba(0, 0, 0, 0.2),
			/* Enhanced bottom shadow */ inset 0 -5px 15px rgba(0, 0, 0, 0.3);
	}

	.cabinet-plastic {
		position: relative;
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		border-radius: 6vmin;
		background: linear-gradient(180deg, rgba(40, 40, 40, 1) 0%, rgba(20, 20, 20, 1) 100%);
		box-shadow:
    /* Deep cavity shadow */
			inset 0 10px 30px rgba(0, 0, 0, 0.4),
			/* Side shadows for depth */ inset -5px 0 15px rgba(0, 0, 0, 0.3),
			inset 5px 0 15px rgba(0, 0, 0, 0.3),
			/* Bottom shadow */ inset 0 -5px 15px rgba(0, 0, 0, 0.4);
		padding: 2vmin;
	}

	/* Light theme cabinet adjustments */
	:global(html.light) .cabinet-plastic {
		background:
    /* Enhanced top highlight */
			linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, transparent 15%),
			/* Deeper base gradient */
				linear-gradient(170deg, #d8d8d8 0%, #b8b8b8 40%, #989898 70%, #787878 100%);
		box-shadow:
    /* Stronger top highlight */
			inset 0 2px 4px rgba(255, 255, 255, 0.95),
			/* Deeper cavity shadow */ inset 0 15px 35px rgba(0, 0, 0, 0.25),
			/* Enhanced side shadows */ inset -8px 0 20px rgba(0, 0, 0, 0.2),
			inset 8px 0 20px rgba(0, 0, 0, 0.2),
			/* Deeper bottom shadow */ inset 0 -8px 20px rgba(0, 0, 0, 0.25);
	}

	.cabinet-plastic::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 6vmin;
		background: radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.1), transparent 70%);
		pointer-events: none;
	}

	.cabinet-background {
		background: linear-gradient(
			45deg,
			rgba(20, 20, 20, 0.4) 0%,
			rgba(40, 40, 40, 0.4) 50%,
			rgba(20, 20, 20, 0.4) 100%
		);
		border-radius: 6vmin;
	}

	:global(html.light) .cabinet-background {
		background: linear-gradient(
			45deg,
			rgba(140, 140, 140, 0.5) 0%,
			rgba(180, 180, 180, 0.5) 50%,
			rgba(140, 140, 140, 0.5) 100%
		);
		mix-blend-mode: multiply;
	}

	/* Authentic Power-up Animation */
	@keyframes powerUpSequence {
		0% {
			filter: brightness(0) blur(2px);
			transform: scale(0.98);
		}
		5% {
			filter: brightness(0.3) blur(1px);
			transform: scale(0.99);
		}
		10% {
			filter: brightness(0.1) blur(2px);
			transform: scale(0.98);
		}
		15% {
			filter: brightness(0.5) blur(0.5px);
			transform: scale(1);
		}
		30% {
			filter: brightness(0.3) blur(1px);
			transform: scale(0.99);
		}
		100% {
			filter: brightness(1) blur(0);
			transform: scale(1);
		}
	}

	@keyframes phosphorPersistence {
		0% {
			opacity: 1;
		}
		50% {
			opacity: 0.7;
		}
		100% {
			opacity: 0;
		}
	}

	@keyframes interlaceFlicker {
		0% {
			opacity: 1;
		}
		50% {
			opacity: 0.7;
		}
		100% {
			opacity: 1;
		}
	}

	/* Theme-specific adjustments */
	:global(html.light) .crt-screen {
		--bloom-intensity: 0.3;
		--shadow-mask-size: 2.5px;
		background: linear-gradient(180deg, #111 0%, #222 100%);
	}

	:global(html.light) .shadow-mask {
		opacity: 0.2;
	}

	/* Performance optimizations */
	.hardware-accelerated {
		transform: translateZ(0);
		backface-visibility: hidden;
		perspective: 1000px;
		will-change: transform, opacity;
	}
</style>

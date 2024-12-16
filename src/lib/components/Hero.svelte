<!-- Hero.svelte  -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { gsap } from 'gsap';
	import { get } from 'svelte/store';
	import ArcadeCtaButton from '$lib/components/ArcadeCtaButton.svelte';
	import ArcadeNavigation from '$lib/components/ArcadeNavigation.svelte';
	import GameComponent from '$lib/components/GameComponent.svelte';
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

	// Replace the current reactive statement with this:
	$: {
		stars = $animationState.stars;
	}

	// Reactive statement to handle screen changes
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

		// Initialize stars immediately
		let starArray = animations.initStars(300); // Specify count explicitly
		animationState.update((s) => ({ ...s, stars: starArray }));

		// Star animation
		function updateStarField() {
			if (get(screenStore) !== 'main') return;

			starArray = animations.updateStars(starArray);
			animationState.update((s) => ({ ...s, stars: starArray }));
			state.animationFrame = requestAnimationFrame(updateStarField);
		}

		// Start the animation immediately
		updateStarField();

		// Check if elements exist before starting animations
		if (!header || !insertConcept || !arcadeScreen) {
			console.log('Waiting for elements to be available...');
			// Retry after a short delay
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

		// Initialize animations
		const timeline = gsap.timeline();

		// Text animations
		timeline.to([header, insertConcept], {
			duration: 0.1,
			y: '+=2',
			repeat: -1,
			yoyo: true,
			ease: 'power1.inOut'
		});

		// Insert concept flash
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

		// Glitch effect
		const glitchInterval = setInterval(() => {
			if (get(screenStore) === 'main') {
				animations.createGlitchEffect(header);
				animations.createGlitchEffect(insertConcept);
			}
		}, 100);

		// Screen glow animation
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

		// Initial animation start is handled by the reactive statement
		currentScreen = 'main';
		const handleOrientation = () => {
			const isLandscape = window.innerWidth > window.innerHeight;
			document.body.classList.toggle('landscape', isLandscape);
		};

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
	<div id="arcade-cabinet" class="w-full h-full relative flex items-center justify-center">
		<div class="cabinet-background absolute inset-0"></div>
		<div class="arcade-screen-wrapper relative">
			<!-- Add a wrapper div -->
			<div class="navigation-wrapper relative z-50">
				<ArcadeNavigation on:changeScreen={handleScreenChange} />
			</div>
			<div
				id="arcade-screen"
				class="relative w-[90vw] h-[70vh] md:w-[80vw] md:h-[600px] glow"
				bind:this={arcadeScreen}
			>
				<div id="reflection" class="absolute inset-0 pointer-events-none"></div>
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
						<div id="header" class="text-center mb-2" bind:this={header}>Power-up Your Brand!</div>
						<div id="insert-concept" class="text-center" bind:this={insertConcept}>
							Insert Concept
						</div>
						<div class="mt-8">
							<ArcadeCtaButton />
						</div>
					</div>
				{:else if currentScreen === 'game'}
					<GameComponent />
				{/if}
			</div>
		</div>
	</div>
</section>

<style>
	/* CSS Custom Properties
	----------------------------------------*/
	:root {
		/* Layout */
		--arcade-screen-width: min(95vw, 800px);
		--arcade-screen-height: min(70vh, 600px);

		/* Typography */
		--header-font-size: 14vmin;
		--insert-concept-font-size: 2.45vmin;

		/* Colors */
		--screen-border-color: rgba(226, 226, 189, 1);
		--header-text-color: rgba(227, 255, 238, 1);
		--insert-concept-color: rgba(245, 245, 220, 1);

		/* Shadows & Effects */
		--cabinet-shadow: inset 0 0 70px rgba(0, 0, 0, 0.15), inset 0 0 40px rgba(0, 0, 0, 0.1),
			0 0 35px rgba(0, 0, 0, 0.08);

		--screen-shadow: 0 0 30px rgba(0, 0, 0, 0.8), inset 0 0 50px rgba(0, 0, 0, 0.9),
			inset 0 0 2px rgba(255, 255, 255, 0.3), inset 0 0 100px rgba(0, 0, 0, 0.7);
	}

	/* Desktop Breakpoint
	----------------------------------------*/
	@media (min-width: 1020px) {
		:root {
			--arcade-screen-width: 80vw;
			--arcade-screen-height: 600px;
			--header-font-size: 5.6rem;
		}
	}

	/* Layout Styles
	----------------------------------------*/
	section {
		height: calc(100vh - var(--navbar-height, 64px));
	}

	/* Arcade Cabinet
	----------------------------------------*/
	#arcade-cabinet {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 2vmin;
		box-sizing: border-box;
		position: relative;
		box-shadow: var(--cabinet-shadow);
	}

	/* Theme-specific Cabinet Styles */
	:global(html.light #arcade-cabinet) {
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0) 15%),
			linear-gradient(
				90deg,
				rgba(0, 0, 0, 0.03) 0%,
				rgba(0, 0, 0, 0) 5%,
				rgba(0, 0, 0, 0) 95%,
				rgba(0, 0, 0, 0.03) 100%
			),
			repeating-linear-gradient(
				45deg,
				rgba(255, 255, 255, 0.03) 0px,
				rgba(255, 255, 255, 0.03) 1px,
				transparent 1px,
				transparent 2px
			),
			radial-gradient(
				ellipse at 50% 40%,
				rgba(255, 255, 255, 0.95) 0%,
				rgba(235, 235, 235, 0.98) 40%,
				rgba(220, 220, 220, 0.99) 70%
			);
	}

	:global(html.dark #arcade-cabinet) {
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 15%),
			linear-gradient(
				90deg,
				rgba(0, 0, 0, 0.2) 0%,
				rgba(0, 0, 0, 0) 5%,
				rgba(0, 0, 0, 0) 95%,
				rgba(0, 0, 0, 0.2) 100%
			),
			repeating-linear-gradient(
				45deg,
				rgba(255, 255, 255, 0.02) 0px,
				rgba(255, 255, 255, 0.02) 1px,
				transparent 1px,
				transparent 2px
			),
			radial-gradient(
				ellipse at 50% 40%,
				rgba(45, 45, 45, 0.95) 0%,
				rgba(35, 35, 35, 0.98) 40%,
				rgba(25, 25, 25, 0.99) 70%
			);
	}

	/* Arcade Screen
	----------------------------------------*/
	#arcade-screen {
		width: var(--arcade-screen-width);
		height: var(--arcade-screen-height);
		/* Remove the original border */
		border: none;
		border-radius: 4vmin;
		position: relative;
		z-index: 0;
		aspect-ratio: 4/3;
		box-shadow: var(--screen-shadow);
		background: linear-gradient(145deg, #111 0%, #444 100%);
		transform: perspective(1000px) rotateX(2deg);
		transform-style: preserve-3d;
	}

	/* Screen Effects
----------------------------------------*/
	#arcade-screen::before,
	#arcade-screen::after {
		content: '';
		position: absolute;
		inset: -1vmin;
		border-radius: 4.5vmin;
		z-index: -1;
	}

	#arcade-screen::before {
		background:
        /* More transparent glass tube effect */
			linear-gradient(
				145deg,
				rgba(220, 225, 235, 0.45) 0%,
				rgba(200, 205, 215, 0.35) 50%,
				rgba(180, 185, 195, 0.4) 100%
			),
			/* Base bezel color */
				linear-gradient(145deg, rgba(40, 40, 40, 1) 0%, rgba(20, 20, 20, 1) 100%);
		box-shadow:
			inset 0 0 10px rgba(0, 0, 0, 0.8),
			0 0 5px rgba(0, 0, 0, 0.5),
			/* Enhanced glass reflection */ 0 0 3px rgba(255, 255, 255, 0.15);
	}

	#arcade-screen::after {
		background: linear-gradient(45deg, #00ffff, #0000ff, #ff00ff, #ff0000);
		filter: blur(4vmin);
		opacity: 0;
		transition: opacity 0.3s ease-in-out;
	}

	#arcade-screen.glow::before,
	#arcade-screen.glow::after {
		opacity: 1;
	}

	/* Typography
	----------------------------------------*/
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

	/* Visual Effects
	----------------------------------------*/
	#scanline-overlay {
		background: linear-gradient(0deg, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0.1) 51%);
		background-size: 100% 4px;
		animation: scanline 0.2s linear infinite;
		border-radius: 3.5vmin;
		z-index: 1;
	}

	#reflection {
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0) 20%);
		border-radius: 4vmin;
		z-index: 1;
	}

	/* Space Background
	----------------------------------------*/
	#space-background {
		position: absolute;
		inset: 0;
		background: radial-gradient(circle at center, #000 20%, #001c4d 80%, #000000);
		border-radius: 4vmin;
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

	/* Animations
	----------------------------------------*/
	@keyframes scanline {
		0% {
			background-position: 0 0;
		}
		100% {
			background-position: 0 4px;
		}
	}
</style>

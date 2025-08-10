<!-- src/lib/components/vfx/ArcadeBackground.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { get } from 'svelte/store';
	import { deviceCapabilities } from '$lib/utils/device-performance';
	import { frameRateController } from '$lib/utils/frame-rate-controller';
	import { makeStarDataURIs } from '$lib/utils/star-texture';
	import { startCanvasBackground } from '$lib/utils/arcade-canvas-bg';

	export let mode: 'auto' | 'css' | 'canvas' = 'auto';

	let rootEl: HTMLDivElement;
	let canvasEl: HTMLCanvasElement | null = null;
	let cleanupCanvas: (() => void) | null = null;
	let activeMode: 'css' | 'canvas' = 'css';

	const isLowPerf = () => {
		const caps = get(deviceCapabilities);
		return (
			(caps as any)?.tier === 'low' ||
			document.documentElement.getAttribute('data-device-type') === 'low-performance'
		);
	};

	function pickMode(): 'css' | 'canvas' {
		if (mode === 'css') return 'css';
		if (mode === 'canvas') return 'canvas';
		return isLowPerf() ? 'css' : 'canvas';
	}

	function enableCssMode() {
		activeMode = 'css';
		rootEl.classList.add('abg-css');
		rootEl.classList.remove('abg-canvas');
		if (!rootEl.style.getPropertyValue('--star-1')) {
			const { star1, star2 } = makeStarDataURIs();
			rootEl.style.setProperty('--star-1', `url("${star1}")`);
			rootEl.style.setProperty('--star-2', `url("${star2}")`);
		}
	}

	function enableCanvasMode() {
		activeMode = 'canvas';
		rootEl.classList.add('abg-canvas');
		rootEl.classList.remove('abg-css');

		if (!canvasEl) {
			canvasEl = document.createElement('canvas');
			canvasEl.setAttribute('aria-hidden', 'true');
			Object.assign(canvasEl.style, {
				position: 'absolute',
				inset: '0',
				width: '100%',
				height: '100%',
				borderRadius: 'inherit',
				pointerEvents: 'none',
				imageRendering: 'pixelated'
			} as CSSStyleDeclaration);
			rootEl.appendChild(canvasEl);
		}

		const { stop } = startCanvasBackground({
			canvas: canvasEl!,
			frameController: frameRateController,
			qualityHint: isLowPerf() ? 0.7 : 1.0 // slightly higher to favor brightness
		});
		cleanupCanvas = stop;
	}

	onMount(() => {
		if (!browser) return;

		rootEl.style.zIndex = '2';
		rootEl.style.borderRadius = 'inherit';
		rootEl.style.pointerEvents = 'none';

		const chosen = pickMode();
		if (chosen === 'css') enableCssMode();
		else enableCanvasMode();

		const onVis = () => {
			if (activeMode === 'canvas') {
				frameRateController.setAdaptiveEnabled(!document.hidden);
			}
		};
		document.addEventListener('visibilitychange', onVis, { passive: true });

		return () => {
			document.removeEventListener('visibilitychange', onVis);
		};
	});

	onDestroy(() => {
		if (cleanupCanvas) {
			cleanupCanvas();
			cleanupCanvas = null;
		}
	});
</script>

<div class="starfield-container" bind:this={rootEl} />

<style>
	.starfield-container {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		overflow: hidden;
		pointer-events: none;
		contain: layout paint style;
	}

	/* ===== Visibility tuning knobs (safe to tweak) ===== */
	.abg-css {
		/* Smaller tiles -> more stars in view; increase until it feels right */
		--abg-tile-size: 48px;
		/* Opacity boosts */
		--abg-opacity-near: 1;
		--abg-opacity-far: 0.85;
	}

	/* ===== Feather Mode (no-JS) ===== */
	.abg-css::before,
	.abg-css::after {
		content: '';
		position: absolute;
		inset: 0;
		background-repeat: repeat;
		background-size: var(--abg-tile-size) var(--abg-tile-size);
		image-rendering: pixelated; /* crisp on HiDPI */
		will-change: transform, opacity;
		pointer-events: none;
		border-radius: inherit;
	}

	/* Near layer: denser, slower scroll */
	.abg-css::before {
		background-image: var(--star-1);
		opacity: var(--abg-opacity-near);
		animation:
			sfScrollA 22s linear infinite,
			sfTwinkleA 2.2s steps(2, end) infinite;
		transform: translateZ(0);
	}

	/* Far layer: sparser, different phase/speed */
	.abg-css::after {
		background-image: var(--star-2);
		opacity: var(--abg-opacity-far);
		animation:
			sfScrollB 34s linear infinite,
			sfTwinkleB 3.6s steps(3, end) infinite;
		transform: translateZ(0);
	}

	@keyframes sfScrollA {
		0% {
			transform: translate3d(0, 0, 0);
		}
		100% {
			transform: translate3d(calc(-1 * var(--abg-tile-size)), calc(-1 * var(--abg-tile-size)), 0);
		}
	}
	@keyframes sfScrollB {
		0% {
			transform: translate3d(0, 0, 0);
		}
		100% {
			transform: translate3d(calc(-1.5 * var(--abg-tile-size)), calc(1 * var(--abg-tile-size)), 0);
		}
	}
	@keyframes sfTwinkleA {
		0%,
		100% {
			opacity: var(--abg-opacity-near);
		}
		50% {
			opacity: calc(var(--abg-opacity-near) * 0.8);
		}
	}
	@keyframes sfTwinkleB {
		0%,
		100% {
			opacity: var(--abg-opacity-far);
		}
		50% {
			opacity: calc(var(--abg-opacity-far) * 0.75);
		}
	}
</style>

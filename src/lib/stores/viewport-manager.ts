// src/lib/stores/viewport-manager.ts
import {
	batchDOMUpdate,
	debounce,
	throttle,
	measureOnce,
	batchSetStyles
} from '$lib/utils/dom-utils';

interface ViewportMetrics {
	width: number;
	height: number;
	isLandscape: boolean;
	safeAreaTop: number;
	safeAreaBottom: number;
	devicePixelRatio: number;
}

interface GameDimensions {
	width: number;
	height: number;
}

interface CachedMetrics {
	containerWidth: number;
	containerHeight: number;
	scale: number;
	controlsHeight: number;
	safeAreaBottom: number;
}

export class ViewportManager {
	private container: HTMLElement;
	private screen: HTMLElement;
	private controls: HTMLElement | null;
	private cleanup: () => void;
	private rafId: number | null = null;

	// Game dimensions
	private readonly gameWidth = 800;
	private readonly gameHeight = 600;

	// Cache values to prevent unnecessary DOM updates
	private cache: CachedMetrics = {
		containerWidth: 0,
		containerHeight: 0,
		scale: 0,
		controlsHeight: 0,
		safeAreaBottom: 0
	};

	// Threshold values for significant changes
	private readonly SCALE_THRESHOLD = 0.01;
	private readonly SIZE_THRESHOLD = 1;

	constructor(container: HTMLElement, screen: HTMLElement, controls?: HTMLElement) {
		this.container = container;
		this.screen = screen;
		this.controls = controls || null;

		// Initialize viewport with batched DOM operations
		this.updateViewport();
		this.cleanup = this.setupEventListeners();
	}

	private getDeviceMetrics(): ViewportMetrics {
		// Read all metrics at once to prevent multiple reflows
		const metrics = {
			width: window.innerWidth,
			height: window.innerHeight,
			isLandscape: window.innerWidth > window.innerHeight,
			safeAreaTop:
				parseInt(
					getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top')
				) || 0,
			safeAreaBottom:
				parseInt(
					getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom')
				) || 0,
			devicePixelRatio: window.devicePixelRatio || 1
		};

		return metrics;
	}

	private calculateControlsHeight(isLandscape: boolean): number {
		if (!this.controls) return 0;
		return isLandscape ? 120 : 180; // Base control heights
	}

	private calculateOptimalScale(
		containerRect: { width: number; height: number },
		gameSize: GameDimensions
	): number {
		const { width: targetWidth, height: targetHeight } = gameSize;
		const scaleX = containerRect.width / targetWidth;
		const scaleY = containerRect.height / targetHeight;
		return Math.min(scaleX, scaleY);
	}

	// Separate read and write operations to prevent layout thrashing
	private readViewportState(): {
		metrics: ViewportMetrics;
		controlsHeight: number;
		availableHeight: number;
		containerDimensions: { width: number; height: number };
		scale: number;
	} {
		// Read phase - gather all measurements at once
		const metrics = this.getDeviceMetrics();
		const controlsHeight = this.calculateControlsHeight(metrics.isLandscape);
		const availableHeight = metrics.height - controlsHeight - metrics.safeAreaBottom;

		// Only measure container if height changes significantly
		let containerDimensions: { width: number; height: number };
		if (Math.abs(this.cache.containerHeight - availableHeight) > this.SIZE_THRESHOLD) {
			// Force container height update before measuring
			this.container.style.height = `${availableHeight}px`;
			// Measure after style changes are applied
			containerDimensions = measureOnce(this.container);
		} else {
			// Use cached values if no significant change
			containerDimensions = {
				width: this.cache.containerWidth,
				height: this.cache.containerHeight
			};
		}

		// Calculate optimal scale
		const scale = this.calculateOptimalScale(containerDimensions, {
			width: this.gameWidth,
			height: this.gameHeight
		});

		return {
			metrics,
			controlsHeight,
			availableHeight,
			containerDimensions,
			scale
		};
	}

	private writeViewportUpdates(state: {
		metrics: ViewportMetrics;
		controlsHeight: number;
		availableHeight: number;
		containerDimensions: { width: number; height: number };
		scale: number;
	}): void {
		const { metrics, controlsHeight, availableHeight, containerDimensions, scale } = state;

		// Write phase - batch all DOM updates together
		batchDOMUpdate(() => {
			// Update container height if changed significantly
			if (Math.abs(this.cache.containerHeight - availableHeight) > this.SIZE_THRESHOLD) {
				this.container.style.height = `${availableHeight}px`;
				this.cache.containerHeight = availableHeight;
				this.cache.containerWidth = containerDimensions.width;
			}

			// Update transform if scale changed significantly
			if (Math.abs(this.cache.scale - scale) > this.SCALE_THRESHOLD) {
				// Force GPU acceleration and optimize rendering
				batchSetStyles(this.screen, {
					willChange: 'transform',
					transform: `translate3d(0,0,0) scale(${scale})`,
					transformOrigin: 'center center'
				});
				this.cache.scale = scale;
			}

			// Update controls if they exist
			if (this.controls) {
				const controlsStyleUpdates: Record<string, string | number> = {};

				if (Math.abs(this.cache.controlsHeight - controlsHeight) > this.SIZE_THRESHOLD) {
					controlsStyleUpdates.height = `${controlsHeight}px`;
					this.cache.controlsHeight = controlsHeight;
				}

				if (Math.abs(this.cache.safeAreaBottom - metrics.safeAreaBottom) > this.SIZE_THRESHOLD) {
					controlsStyleUpdates.bottom = `${metrics.safeAreaBottom}px`;
					this.cache.safeAreaBottom = metrics.safeAreaBottom;
				}

				if (Object.keys(controlsStyleUpdates).length > 0) {
					batchSetStyles(this.controls, controlsStyleUpdates);
				}
			}
		});
	}

	public updateViewport(): void {
		// Cancel any pending RAF to avoid multiple updates in same frame
		if (this.rafId !== null) {
			cancelAnimationFrame(this.rafId);
		}

		// Use RAF to ensure updates happen during next frame
		this.rafId = requestAnimationFrame(() => {
			this.rafId = null;

			// Separate read and write phases to prevent layout thrashing
			const state = this.readViewportState();
			this.writeViewportUpdates(state);
		});
	}

	private setupEventListeners(): () => void {
		// Create throttled and debounced versions of updateViewport
		const throttledUpdate = throttle(() => this.updateViewport(), 16); // ~60fps
		const debouncedUpdate = debounce(() => this.updateViewport(), 100);

		// Handle rapid resize events with throttling for smoother performance
		window.addEventListener('resize', throttledUpdate, { passive: true });

		// Handle orientation changes with a small delay to ensure values are settled
		window.addEventListener(
			'orientationchange',
			() => {
				setTimeout(() => this.updateViewport(), 100);
			},
			{ passive: true }
		);

		// Use ResizeObserver with size change threshold to reduce update frequency
		const resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				if (entry.target === this.container) {
					// Check if size changed significantly before updating
					const { width, height } = entry.contentRect;
					if (
						Math.abs(this.cache.containerWidth - width) > this.SIZE_THRESHOLD ||
						Math.abs(this.cache.containerHeight - height) > this.SIZE_THRESHOLD
					) {
						debouncedUpdate();
					}
				}
			}
		});

		// Only observe the container element to reduce overhead
		resizeObserver.observe(this.container);

		// Return comprehensive cleanup function
		return () => {
			window.removeEventListener('resize', throttledUpdate);
			window.removeEventListener('orientationchange', () => this.updateViewport());
			resizeObserver.disconnect();

			// Clean up any pending operations
			if (this.rafId !== null) {
				cancelAnimationFrame(this.rafId);
				this.rafId = null;
			}
		};
	}

	public destroy(): void {
		if (this.cleanup) {
			this.cleanup();
		}
	}
}

export function initializeViewportManager(
	container: HTMLElement,
	screen: HTMLElement,
	controls?: HTMLElement
): ViewportManager {
	const manager = new ViewportManager(container, screen, controls);
	return manager;
}

// src/lib/stores/viewport-manager.ts

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

export class ViewportManager {
	private container: HTMLElement;
	private screen: HTMLElement;
	private controls: HTMLElement | null;
	private cleanup: () => void;

	constructor(container: HTMLElement, screen: HTMLElement, controls?: HTMLElement) {
		this.container = container;
		this.screen = screen;
		this.controls = controls || null;

		// Initialize viewport
		this.updateViewport();
		this.cleanup = this.setupEventListeners();
	}

	private getDeviceMetrics(): ViewportMetrics {
		return {
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
	}

	private calculateControlsHeight(isLandscape: boolean): number {
		if (!this.controls) return 0;
		return isLandscape ? 120 : 180; // Base control heights
	}

	private calculateOptimalScale(containerRect: DOMRect, gameSize: GameDimensions): number {
		const { width: targetWidth, height: targetHeight } = gameSize;
		const scaleX = containerRect.width / targetWidth;
		const scaleY = containerRect.height / targetHeight;
		return Math.min(scaleX, scaleY);
	}

	private optimizeRendering(scale: number): void {
		// Force GPU acceleration
		this.screen.style.willChange = 'transform';
		// Use transform instead of top/left for positioning
		this.screen.style.transform = `translate3d(0,0,0) scale(${scale})`;
		this.screen.style.transformOrigin = 'center center';
	}

	// Optimized implementation
	private lastScale: number = 0;
	private lastHeight: number = 0;
	private lastControlsHeight: number = 0;
	private lastSafeAreaBottom: number = 0;
	private rafId: number | null = null;

	public updateViewport(): void {
		// Cancel any pending RAF to avoid multiple updates in same frame
		if (this.rafId !== null) {
			cancelAnimationFrame(this.rafId);
		}

		// Use RAF to ensure updates happen during next frame
		this.rafId = requestAnimationFrame(() => {
			this.rafId = null;
			this.performViewportUpdate();
		});
	}

	private performViewportUpdate(): void {
		const metrics = this.getDeviceMetrics();
		const controlsHeight = this.calculateControlsHeight(metrics.isLandscape);

		// Calculate available height
		const availableHeight = metrics.height - controlsHeight - metrics.safeAreaBottom;

		// Only update DOM if values changed significantly (avoid layout thrashing)
		if (Math.abs(this.lastHeight - availableHeight) > 1) {
			this.container.style.height = `${availableHeight}px`;
			this.lastHeight = availableHeight;
		}

		// Use cached rect when possible, or get new one
		let containerRect: DOMRect;
		// If height changed significantly, we need a fresh rect
		if (Math.abs(this.lastHeight - availableHeight) > 1) {
			containerRect = this.container.getBoundingClientRect();
		} else {
			// Create a DOMRect-like object with cached dimensions
			containerRect = {
				width: this.container.offsetWidth,
				height: this.container.offsetHeight,
				x: 0,
				y: 0,
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				toJSON: () => {}
			};
		}

		// Calculate optimal game screen scale
		const scale = this.calculateOptimalScale(containerRect, {
			width: 800, // Game canvas base width
			height: 600 // Game canvas base height
		});

		// Only update transform if scale changed significantly
		if (Math.abs(this.lastScale - scale) > 0.01) {
			this.optimizeRendering(scale);
			this.lastScale = scale;
		}

		// Position controls if they exist
		if (this.controls) {
			if (Math.abs(this.lastControlsHeight - controlsHeight) > 1) {
				this.controls.style.height = `${controlsHeight}px`;
				this.lastControlsHeight = controlsHeight;
			}

			if (Math.abs(this.lastSafeAreaBottom - metrics.safeAreaBottom) > 1) {
				this.controls.style.bottom = `${metrics.safeAreaBottom}px`;
				this.lastSafeAreaBottom = metrics.safeAreaBottom;
			}
		}
	}

	private setupEventListeners(): () => void {
		let resizeTimeout: number;

		const debouncedResize = () => {
			if (resizeTimeout) {
				clearTimeout(resizeTimeout);
			}
			resizeTimeout = setTimeout(() => this.updateViewport(), 100);
		};

		window.addEventListener('resize', debouncedResize, { passive: true });
		window.addEventListener(
			'orientationchange',
			() => {
				setTimeout(() => this.updateViewport(), 100);
			},
			{ passive: true }
		);

		// Create ResizeObserver for more accurate size tracking
		const resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				if (entry.target === this.container) {
					debouncedResize();
				}
			}
		});

		resizeObserver.observe(this.container);

		// Return cleanup function
		return () => {
			window.removeEventListener('resize', debouncedResize);
			window.removeEventListener('orientationchange', () => this.updateViewport());
			resizeObserver.disconnect();
			if (resizeTimeout) {
				clearTimeout(resizeTimeout);
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

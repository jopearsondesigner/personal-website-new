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

	public updateViewport(): void {
		const metrics = this.getDeviceMetrics();
		const controlsHeight = this.calculateControlsHeight(metrics.isLandscape);

		// Update container dimensions
		const availableHeight = metrics.height - controlsHeight - metrics.safeAreaBottom;
		this.container.style.height = `${availableHeight}px`;

		// Calculate optimal game screen scale
		const containerRect = this.container.getBoundingClientRect();
		const scale = this.calculateOptimalScale(containerRect, {
			width: 800, // Game canvas base width
			height: 600 // Game canvas base height
		});

		// Use optimizeRendering for GPU acceleration
		this.optimizeRendering(scale);

		// Position controls if they exist
		if (this.controls) {
			this.controls.style.height = `${controlsHeight}px`;
			this.controls.style.bottom = `${metrics.safeAreaBottom}px`;
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

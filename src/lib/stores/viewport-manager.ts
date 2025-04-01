// Optimized viewport-manager.ts
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

	// Cache values to prevent unnecessary DOM updates
	private lastContainerHeight: number = 0;
	private lastControlsHeight: number = 0;
	private lastSafeAreaBottom: number = 0;
	private lastScale: number = 0;

	// Use a threshold for updates to avoid minor pixel differences
	private updateThreshold: number = 1;

	// Add a RAF ID for debouncing updates
	private rafId: number | null = null;

	// Add a resize timeout for debouncing
	private resizeTimeout: ReturnType<typeof setTimeout> | null = null;

	// Track if we're throttling updates during rapid resizes
	private isThrottling: boolean = false;

	// Gaming canvas base size
	private baseGameWidth: number = 800;
	private baseGameHeight: number = 600;

	constructor(container: HTMLElement, screen: HTMLElement, controls?: HTMLElement) {
		this.container = container;
		this.screen = screen;
		this.controls = controls || null;

		// Initialize viewport
		this.updateViewport();
		this.cleanup = this.setupEventListeners();

		// Apply initial GPU acceleration
		this.applyGPUAcceleration();
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

	private applyGPUAcceleration(): void {
		// Force GPU acceleration on key elements
		this.screen.style.transform = 'translateZ(0)';
		this.screen.style.backfaceVisibility = 'hidden';
		this.screen.style.willChange = 'transform';

		if (this.controls) {
			this.controls.style.transform = 'translateZ(0)';
			this.controls.style.backfaceVisibility = 'hidden';
			this.controls.style.willChange = 'transform';
		}
	}

	private calculateControlsHeight(isLandscape: boolean): number {
		if (!this.controls) return 0;

		// Cache the control height calculation to avoid DOM reads
		return isLandscape ? 120 : 180;
	}

	private calculateOptimalScale(containerRect: DOMRect, gameSize: GameDimensions): number {
		const { width: targetWidth, height: targetHeight } = gameSize;
		const scaleX = containerRect.width / targetWidth;
		const scaleY = containerRect.height / targetHeight;
		return Math.min(scaleX, scaleY);
	}

	private optimizeRendering(scale: number): void {
		// Only update if scale has changed significantly
		if (Math.abs(this.lastScale - scale) > 0.01) {
			// Use transform instead of top/left for positioning to avoid layout recalculation
			this.screen.style.transform = `translate3d(0,0,0) scale(${scale})`;
			this.screen.style.transformOrigin = 'center center';
			this.lastScale = scale;
		}
	}

	// Optimized implementation
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

		// Only update DOM if values changed significantly to avoid layout thrashing
		if (Math.abs(this.lastContainerHeight - availableHeight) > this.updateThreshold) {
			this.container.style.height = `${availableHeight}px`;
			this.lastContainerHeight = availableHeight;
		}

		// Use a unified object for container dimensions
		const containerDimensions = {
			width: this.container.offsetWidth,
			height: this.container.offsetHeight
		};

		// Calculate optimal game screen scale
		const scale = this.calculateOptimalScale(
			// Create a DOMRect-like object without forcing layout recalculation
			{
				width: containerDimensions.width,
				height: containerDimensions.height,
				x: 0,
				y: 0,
				top: 0,
				left: 0,
				right: containerDimensions.width,
				bottom: containerDimensions.height,
				toJSON: () => {}
			} as DOMRect,
			{
				width: this.baseGameWidth,
				height: this.baseGameHeight
			}
		);

		// Only update transform if scale changed significantly
		this.optimizeRendering(scale);

		// Position controls if they exist - batch DOM updates
		if (this.controls) {
			const needsHeightUpdate =
				Math.abs(this.lastControlsHeight - controlsHeight) > this.updateThreshold;
			const needsBottomUpdate =
				Math.abs(this.lastSafeAreaBottom - metrics.safeAreaBottom) > this.updateThreshold;

			if (needsHeightUpdate || needsBottomUpdate) {
				// Batch DOM writes
				requestAnimationFrame(() => {
					if (needsHeightUpdate) {
						this.controls!.style.height = `${controlsHeight}px`;
						this.lastControlsHeight = controlsHeight;
					}

					if (needsBottomUpdate) {
						this.controls!.style.bottom = `${metrics.safeAreaBottom}px`;
						this.lastSafeAreaBottom = metrics.safeAreaBottom;
					}
				});
			}
		}
	}

	private setupEventListeners(): () => void {
		// Debounce resize handler with proper timing
		const debouncedResize = () => {
			if (this.resizeTimeout) {
				clearTimeout(this.resizeTimeout);
			}

			// If we're already throttling, wait until throttling period ends
			if (this.isThrottling) return;

			// Set throttling flag to avoid excessive updates
			this.isThrottling = true;

			// Update immediately for responsive feel
			this.updateViewport();

			// Then use timeout for full update after resizing stops
			this.resizeTimeout = setTimeout(() => {
				this.isThrottling = false;
				this.updateViewport();
			}, 150);
		};

		// Add passive option for better performance
		window.addEventListener('resize', debouncedResize, { passive: true });

		// Handle orientation changes with slight delay to ensure dimensions settled
		const orientationHandler = () => {
			// Clear any existing timeout
			if (this.resizeTimeout) {
				clearTimeout(this.resizeTimeout);
			}

			// Initial immediate update
			this.updateViewport();

			// Then after a delay to catch any animation transitions
			this.resizeTimeout = setTimeout(() => {
				this.updateViewport();
			}, 250);
		};

		window.addEventListener('orientationchange', orientationHandler, { passive: true });

		// Create ResizeObserver for more accurate size tracking
		// Use it only for the container element
		const resizeObserver = new ResizeObserver((entries) => {
			// Process resize events more efficiently
			if (!this.isThrottling) {
				this.updateViewport();

				// Set throttling to true and reset after a delay
				this.isThrottling = true;

				if (this.resizeTimeout) {
					clearTimeout(this.resizeTimeout);
				}

				this.resizeTimeout = setTimeout(() => {
					this.isThrottling = false;
				}, 150);
			}
		});

		resizeObserver.observe(this.container);

		// Return cleanup function
		return () => {
			window.removeEventListener('resize', debouncedResize);
			window.removeEventListener('orientationchange', orientationHandler);
			resizeObserver.disconnect();

			if (this.resizeTimeout) {
				clearTimeout(this.resizeTimeout);
			}

			if (this.rafId) {
				cancelAnimationFrame(this.rafId);
			}
		};
	}

	// Add a method to update base game dimensions if needed
	public updateGameDimensions(width: number, height: number): void {
		if (width !== this.baseGameWidth || height !== this.baseGameHeight) {
			this.baseGameWidth = width;
			this.baseGameHeight = height;
			this.updateViewport();
		}
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

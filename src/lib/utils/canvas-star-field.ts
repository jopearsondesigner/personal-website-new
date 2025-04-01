// src/lib/utils/canvas-star-field.ts
import { browser } from '$app/environment';
import type { Writable } from 'svelte/store';
import { frameRateController } from './frame-rate-controller';
import { deviceCapabilities } from './device-performance';
import { get } from 'svelte/store';

interface Star {
	x: number;
	y: number;
	z: number;
	size: number;
	opacity: number;
}

interface AnimationState {
	isAnimating: boolean;
	canvasId: string;
	stars?: Star[];
}

export class CanvasStarFieldManager {
	private stars: Star[] = [];
	private isRunning = false;
	private animationFrameId: number | null = null;
	private container: HTMLElement | null = null;
	private canvas: HTMLCanvasElement | null = null;
	private ctx: CanvasRenderingContext2D | null = null;
	private store: Writable<AnimationState> | null = null;
	private lastTime = 0;
	private updateInterval = 16; // ~60fps
	private worker: Worker | null = null;
	private useWorker = false;
	private useContainerParallax = true;
	private containerWidth = 0;
	private containerHeight = 0;
	private devicePixelRatio = 1;
	private initialized = false;
	private isVisible = true;
	private qualityScale = 1.0;
	private offscreenUpdateTimeout: ReturnType<typeof setTimeout> | null = null;
	private deviceCapability: any = null;
	private visibilityChangeHandler: (() => void) | null = null;
	private intersectionObserver: IntersectionObserver | null = null;

	constructor(store: any, count = 60, useWorker = false, useContainerParallax = true) {
		this.store = store;
		this.useWorker = useWorker && browser && 'Worker' in window;
		this.useContainerParallax = useContainerParallax;

		if (browser) {
			this.devicePixelRatio = window.devicePixelRatio || 1;
			this.setupVisibilityTracking();

			// Subscribe to device capabilities
			if (deviceCapabilities) {
				deviceCapabilities.subscribe((capabilities) => {
					this.deviceCapability = capabilities;

					// Update configuration based on device tier
					if (capabilities.tier === 'low') {
						this.updateInterval = 50; // ~20fps for low-end devices
						this.qualityScale = 0.5;
					} else if (capabilities.tier === 'medium') {
						this.updateInterval = 32; // ~30fps for medium devices
						this.qualityScale = 0.75;
					} else {
						this.updateInterval = 16; // ~60fps for high-end devices
						this.qualityScale = 1.0;
					}

					// Reinitialize stars with appropriate count for the device
					this.initializeStars(capabilities.maxStars || count);
				});
			} else {
				this.initializeStars(count);
			}
		}
	}

	private setupVisibilityTracking() {
		if (!browser) return;

		// Track page visibility to pause animations when tab is not active
		this.visibilityChangeHandler = () => {
			this.isVisible = document.visibilityState === 'visible';

			if (this.isVisible && this.isRunning) {
				this.lastTime = performance.now();
				if (this.animationFrameId === null) {
					this.animationFrameId = requestAnimationFrame(this.animate);
				}
			} else if (!this.isVisible && this.animationFrameId) {
				cancelAnimationFrame(this.animationFrameId);
				this.animationFrameId = null;
			}
		};

		document.addEventListener('visibilitychange', this.visibilityChangeHandler);
	}

	setContainer(element: HTMLElement) {
		if (!browser || this.initialized) return;

		this.container = element;
		this.setupCanvas();
		this.setupIntersectionObserver();
		this.initialized = true;
	}

	private setupIntersectionObserver() {
		if (!browser || !this.container) return;

		// Use Intersection Observer to track visibility
		this.intersectionObserver = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					this.isVisible = entry.isIntersecting;

					if (this.isVisible && this.isRunning) {
						this.lastTime = performance.now();
						if (this.animationFrameId === null) {
							this.animationFrameId = requestAnimationFrame(this.animate);
						}
					} else if (!this.isVisible && this.animationFrameId) {
						cancelAnimationFrame(this.animationFrameId);
						this.animationFrameId = null;

						// Periodically update even when off-screen but only every 2 seconds
						if (this.offscreenUpdateTimeout) {
							clearTimeout(this.offscreenUpdateTimeout);
						}

						this.offscreenUpdateTimeout = setTimeout(() => {
							// Update star positions even when off-screen for when it becomes visible again
							this.updateStarsOffscreen();
						}, 2000);
					}
				});
			},
			{ threshold: 0.1 }
		);

		this.intersectionObserver.observe(this.container);
	}

	private updateStarsOffscreen() {
		if (!this.isRunning || this.isVisible) return;

		// Update star positions without rendering
		this.stars.forEach((star) => {
			// Update z-position (depth)
			star.z -= 0.004;

			// Reset star if it goes too far
			if (star.z <= 0) {
				star.z = 0.8;
				star.x = Math.random() * 100;
				star.y = Math.random() * 100;
			}
		});

		// Schedule next offscreen update
		this.offscreenUpdateTimeout = setTimeout(() => {
			this.updateStarsOffscreen();
		}, 2000);
	}

	private setupCanvas() {
		if (!this.container) return;

		// Create canvas element
		this.canvas = document.createElement('canvas');
		this.canvas.className = 'star-field-canvas';
		this.canvas.style.position = 'absolute';
		this.canvas.style.top = '0';
		this.canvas.style.left = '0';
		this.canvas.style.width = '100%';
		this.canvas.style.height = '100%';
		this.canvas.style.pointerEvents = 'none';
		this.container.appendChild(this.canvas);

		// Set up canvas context with optimized settings
		this.ctx = this.canvas.getContext('2d', {
			alpha: true,
			desynchronized: true, // Potentially improve performance by reducing main thread blocking
			willReadFrequently: false
		});

		// Apply GPU acceleration
		if (this.ctx && this.canvas) {
			// Force GPU acceleration
			this.canvas.style.transform = 'translateZ(0)';
			this.canvas.style.backfaceVisibility = 'hidden';
			this.canvas.style.willChange = 'transform';
		}

		// Set initial size and listen for container size changes
		this.resizeCanvas();

		// Setup minimal ResizeObserver with debounce
		let resizeTimeout: number;
		const debouncedResize = () => {
			if (resizeTimeout) {
				clearTimeout(resizeTimeout);
			}
			resizeTimeout = setTimeout(() => this.resizeCanvas(), 250) as unknown as number;
		};

		const resizeObserver = new ResizeObserver(debouncedResize);
		resizeObserver.observe(this.container);
	}

	private resizeCanvas() {
		if (!this.canvas || !this.container || !this.ctx) return;

		// Cache previous dimensions to avoid unnecessary updates
		const prevWidth = this.containerWidth;
		const prevHeight = this.containerHeight;

		// Get container dimensions
		const rect = this.container.getBoundingClientRect();
		this.containerWidth = rect.width;
		this.containerHeight = rect.height;

		// Only update canvas if dimensions actually changed
		if (prevWidth !== this.containerWidth || prevHeight !== this.containerHeight) {
			// Set canvas size with pixel ratio for sharper rendering
			this.canvas.width = this.containerWidth * this.devicePixelRatio;
			this.canvas.height = this.containerHeight * this.devicePixelRatio;

			// Scale context to match device pixel ratio
			this.ctx.scale(this.devicePixelRatio, this.devicePixelRatio);

			// Clear and immediately draw to avoid flickering
			this.ctx.clearRect(0, 0, this.containerWidth, this.containerHeight);
			this.drawStars();
		}
	}

	private initializeStars(count: number) {
		const isDesktop = browser && window.innerWidth >= 1024;

		// Scale size multiplier based on device capability
		const sizeMultiplier = isDesktop ? 2.0 * this.qualityScale : 1.5 * this.qualityScale;

		// Create stars with object pool approach
		if (this.stars.length > count) {
			// Reuse existing stars if we have too many
			this.stars = this.stars.slice(0, count);
		} else if (this.stars.length < count) {
			// Add more stars if needed
			const additional = count - this.stars.length;

			for (let i = 0; i < additional; i++) {
				const x = Math.random() * 100;
				const y = Math.random() * 100;
				const z = Math.random() * 0.7 + 0.1;
				const size = Math.max(z * sizeMultiplier, isDesktop ? 2 : 1);
				const opacity = Math.min(1, (Math.random() * 0.5 + 0.5) * (z * 3));

				this.stars.push({ x, y, z, size, opacity });
			}
		}

		// Adjust existing stars for new quality settings
		this.stars.forEach((star) => {
			star.size = Math.max(star.z * sizeMultiplier, isDesktop ? 2 : 1);
		});
	}

	// Using arrow function syntax for method definition to avoid TypeScript issues
	setStarCount = (count) => {
		// Scale based on device capability
		const capabilities = get(deviceCapabilities);
		let adjustedCount = count;

		if (capabilities.tier === 'low') {
			adjustedCount = Math.min(count, 20); // Max 20 stars for low-end
		} else if (capabilities.tier === 'medium') {
			adjustedCount = Math.min(count, 40); // Max 40 stars for medium
		}

		this.initializeStars(adjustedCount);
	};

	setUseWorker(useWorker: boolean) {
		if (this.useWorker === useWorker) return;

		this.useWorker = useWorker && browser && 'Worker' in window;

		// Clean up existing worker if needed
		if (this.worker) {
			this.worker.terminate();
			this.worker = null;
		}

		// Initialize worker if needed
		if (this.useWorker && this.isRunning) {
			this.initializeWorker();
		}
	}

	private initializeWorker() {
		if (!browser || !this.useWorker || this.worker) return;

		try {
			// Create a worker for star calculations
			this.worker = new Worker('/workers/star-field-worker.js');

			// Send initial configuration to worker
			this.worker.postMessage({
				type: 'init',
				stars: this.stars,
				containerWidth: this.containerWidth,
				containerHeight: this.containerHeight
			});

			// Handle worker messages
			this.worker.onmessage = (event) => {
				if (event.data.type === 'updateStars') {
					this.stars = event.data.stars;

					// Only redraw if visible
					if (this.isVisible && this.isRunning) {
						this.drawStars();
					}
				}
			};
		} catch (error) {
			console.error('Failed to initialize worker:', error);
			this.useWorker = false;
		}
	}

	setUseContainerParallax = (useParallax) => {
		this.useContainerParallax = useParallax;
	};

	start() {
		if (!browser || this.isRunning) return;

		this.isRunning = true;
		this.lastTime = performance.now();

		// Update store state
		if (this.store) {
			this.store.update((state) => ({
				...state,
				isAnimating: true,
				canvasId: this.canvas?.id || 'star-canvas'
			}));
		}

		// Initialize worker if needed
		if (this.useWorker) {
			this.initializeWorker();
		}

		// Only start animation if visible
		if (this.isVisible) {
			this.animationFrameId = requestAnimationFrame(this.animate);
		}
	}

	stop() {
		if (!browser || !this.isRunning) return;

		this.isRunning = false;

		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}

		// Clear any offscreen update timeout
		if (this.offscreenUpdateTimeout) {
			clearTimeout(this.offscreenUpdateTimeout);
			this.offscreenUpdateTimeout = null;
		}

		// Update store state
		if (this.store) {
			this.store.update((state) => ({
				...state,
				isAnimating: false
			}));
		}
	}

	animate = (timestamp) => {
		if (!this.isRunning || !this.ctx || !this.canvas || !this.isVisible) return;

		const elapsed = timestamp - this.lastTime;

		// Limit updates for consistent performance
		if (elapsed > this.updateInterval) {
			this.lastTime = timestamp;

			// Only render when frameRateController allows
			if (frameRateController.shouldRenderFrame()) {
				// Process stars and render
				if (this.useWorker && this.worker) {
					// With worker, we only render since calculation happens in the worker
					this.drawStars();

					// Send animation timestamp to worker
					this.worker.postMessage({
						type: 'animate',
						timestamp: timestamp
					});
				} else {
					// Without worker, we update and render here
					this.updateStars();
					this.drawStars();
				}

				// Add container movement for parallax effect only if enabled
				this.updateParallax(timestamp);
			}
		}

		this.animationFrameId = requestAnimationFrame(this.animate);
	};

	private updateStars() {
		this.stars.forEach((star) => {
			// Update z-position (depth)
			star.z -= 0.004;

			// Reset star if it goes too far
			if (star.z <= 0) {
				star.z = 0.8;
				star.x = Math.random() * 100;
				star.y = Math.random() * 100;
			}
		});
	}

	private drawStars() {
		if (!this.ctx || !this.canvas) return;

		// Clear canvas with full opacity black
		this.ctx.clearRect(0, 0, this.containerWidth, this.containerHeight);

		// Draw stars with performance optimizations
		this.stars.forEach((star) => {
			// Update calculations
			const scale = 0.2 / star.z;
			const x = (star.x - 50) * scale + 50;
			const y = (star.y - 50) * scale + 50;
			const pixelX = (x / 100) * this.containerWidth;
			const pixelY = (y / 100) * this.containerHeight;

			// Get device-appropriate star size
			const isDesktop = browser && window.innerWidth >= 1024;
			const sizeMultiplier = isDesktop ? 2.0 : 1.5;
			const size = Math.max(scale * sizeMultiplier * this.qualityScale, isDesktop ? 1.5 : 0.75);
			const opacity = Math.min(1, star.opacity * (scale * 3));

			// Draw only if visible
			if (size > 0 && opacity > 0) {
				this.ctx.beginPath();
				this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;

				// Use rectangles for small stars (more efficient than arcs)
				if (size < 1.5) {
					this.ctx.fillRect(pixelX - size / 2, pixelY - size / 2, size, size);
				} else {
					this.ctx.arc(pixelX, pixelY, size / 2, 0, Math.PI * 2);
					this.ctx.fill();

					// Optional glow for larger stars on high-end devices only
					if (size > 2 && this.qualityScale > 0.8) {
						this.ctx.beginPath();
						this.ctx.arc(pixelX, pixelY, size, 0, Math.PI * 2);
						this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.3})`;
						this.ctx.fill();
					}
				}
			}
		});
	}

	private updateParallax = (timestamp) => {
		if (!this.container || !this.useContainerParallax) return;

		const isMobile = window.innerWidth < 768;

		// Scale parallax effect based on quality
		const qualityFactor = this.qualityScale * 0.8 + 0.2; // 0.2-1.0 range

		// Adjust amplitude based on device and quality
		const xAmplitude = isMobile ? 10 * qualityFactor : 5 * qualityFactor;
		const yAmplitude = isMobile ? 5 * qualityFactor : 2 * qualityFactor;

		// Calculate offsets
		const xOffset = Math.sin(timestamp / 4000) * xAmplitude;
		const yOffset = Math.cos(timestamp / 5000) * yAmplitude;

		// Only update when significant enough to be visible
		if (Math.abs(xOffset) > 0.1 || Math.abs(yOffset) > 0.1) {
			requestAnimationFrame(() => {
				if (this.container) {
					this.container.style.transform = `translate3d(${xOffset}px, ${yOffset}px, 0)`;
				}
			});
		}
	};

	getStars = () => {
		return this.stars.map((star) => {
			const scale = 0.2 / star.z;
			const x = (star.x - 50) * scale + 50;
			const y = (star.y - 50) * scale + 50;
			const pixelX = (x / 100) * this.containerWidth;
			const pixelY = (y / 100) * this.containerHeight;
			const size = Math.max(star.size * scale, 1);
			const opacity = Math.min(1, star.opacity * scale);

			const style = `left: ${pixelX}px; top: ${pixelY}px; width: ${size}px; height: ${size}px; opacity: ${opacity};`;

			return {
				id: `star-${star.x}-${star.y}-${star.z}`,
				style
			};
		});
	};

	cleanup = () => {
		if (!browser) return;

		this.stop();

		// Clean up worker
		if (this.worker) {
			this.worker.terminate();
			this.worker = null;
		}

		// Clean up intersection observer
		if (this.intersectionObserver) {
			this.intersectionObserver.disconnect();
			this.intersectionObserver = null;
		}

		// Remove visibility change listener
		if (this.visibilityChangeHandler) {
			document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
			this.visibilityChangeHandler = null;
		}

		// Remove canvas element
		if (this.canvas && this.canvas.parentNode) {
			this.canvas.parentNode.removeChild(this.canvas);
		}

		this.canvas = null;
		this.ctx = null;
		this.container = null;
		this.stars = [];
	};
}

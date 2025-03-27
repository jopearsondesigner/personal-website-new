// src/lib/utils/css-effects-manager.ts
import { browser } from '$app/environment';
import { get } from 'svelte/store';
import { animationMode, type AnimationMode } from './animation-mode';
import { frameRateController } from './frame-rate-controller';

interface CssEffectsConfig {
	// Shadow effects
	enableShadows: boolean;
	shadowDepth: 'light' | 'medium' | 'heavy';

	// Blur effects
	enableBlur: boolean;
	blurAmount: number; // in pixels

	// Glow effects
	enableGlow: boolean;
	glowOpacity: number;
	glowBlur: number;

	// Gradient effects
	simplifyGradients: boolean;

	// Background effects
	enablePatterns: boolean;
	enableReflections: boolean;

	// Text effects
	enableTextShadows: boolean;

	// Animation effects
	enableScanlines: boolean;
	enablePhosphorDecay: boolean;
	enableInterlace: boolean;

	// General settings
	useHardwareAcceleration: boolean;
	enableBackfaceVisibility: boolean;
	useContainment: boolean;
	useContentVisibility: boolean;

	// Batching and rendering
	batchDomUpdates: boolean;
	enableViewTransitions: boolean;
}

type EffectType = keyof CssEffectsConfig;

// CSS Effects Manager class
export class CssEffectsManager {
	private config: CssEffectsConfig;
	private appliedClasses: Set<string> = new Set();
	private root: HTMLElement | null = null;

	constructor() {
		// Initialize with sensible defaults
		this.config = {
			enableShadows: true,
			shadowDepth: 'medium',
			enableBlur: true,
			blurAmount: 4,
			enableGlow: true,
			glowOpacity: 0.6,
			glowBlur: 8,
			simplifyGradients: false,
			enablePatterns: true,
			enableReflections: true,
			enableTextShadows: true,
			enableScanlines: true,
			enablePhosphorDecay: true,
			enableInterlace: true,
			useHardwareAcceleration: true,
			enableBackfaceVisibility: false,
			useContainment: true,
			useContentVisibility: true,
			batchDomUpdates: true,
			enableViewTransitions: false
		};
	}

	// Initialize manager with document root
	init(root: HTMLElement = document.documentElement) {
		if (!browser) return;

		this.root = root;

		// Initial configuration based on animation mode
		this.configureForAnimationMode(get(animationMode));

		// Subscribe to animation mode changes
		animationMode.subscribe((mode) => {
			this.configureForAnimationMode(mode);
			this.applyConfiguration();
		});

		// Subscribe to quality changes from frame rate controller
		frameRateController.subscribeQuality((quality) => {
			this.adjustEffectsForQuality(quality);
			this.applyConfiguration();
		});

		// Apply initial configuration
		this.applyConfiguration();

		return this;
	}

	// Configure effects based on animation mode
	private configureForAnimationMode(mode: AnimationMode) {
		switch (mode) {
			case 'minimal':
				// Minimal configuration for low-end devices
				this.config.enableShadows = false;
				this.config.enableBlur = false;
				this.config.enableGlow = false;
				this.config.simplifyGradients = true;
				this.config.enablePatterns = false;
				this.config.enableReflections = false;
				this.config.enableTextShadows = false;
				this.config.enableScanlines = false;
				this.config.enablePhosphorDecay = false;
				this.config.enableInterlace = false;
				this.config.useHardwareAcceleration = true;
				this.config.enableBackfaceVisibility = false;
				this.config.useContainment = true;
				this.config.useContentVisibility = true;
				this.config.batchDomUpdates = true;
				this.config.enableViewTransitions = false;
				break;

			case 'reduced':
				// Reduced configuration for mid-range devices
				this.config.enableShadows = true;
				this.config.shadowDepth = 'light';
				this.config.enableBlur = true;
				this.config.blurAmount = 2;
				this.config.enableGlow = true;
				this.config.glowOpacity = 0.4;
				this.config.glowBlur = 4;
				this.config.simplifyGradients = true;
				this.config.enablePatterns = true;
				this.config.enableReflections = false;
				this.config.enableTextShadows = true;
				this.config.enableScanlines = true;
				this.config.enablePhosphorDecay = false;
				this.config.enableInterlace = true;
				this.config.useHardwareAcceleration = true;
				this.config.enableBackfaceVisibility = false;
				this.config.useContainment = true;
				this.config.useContentVisibility = true;
				this.config.batchDomUpdates = true;
				this.config.enableViewTransitions = false;
				break;

			case 'normal':
			default:
				// Full configuration for high-end devices
				this.config.enableShadows = true;
				this.config.shadowDepth = 'medium';
				this.config.enableBlur = true;
				this.config.blurAmount = 4;
				this.config.enableGlow = true;
				this.config.glowOpacity = 0.6;
				this.config.glowBlur = 8;
				this.config.simplifyGradients = false;
				this.config.enablePatterns = true;
				this.config.enableReflections = true;
				this.config.enableTextShadows = true;
				this.config.enableScanlines = true;
				this.config.enablePhosphorDecay = true;
				this.config.enableInterlace = true;
				this.config.useHardwareAcceleration = true;
				this.config.enableBackfaceVisibility = true;
				this.config.useContainment = true;
				this.config.useContentVisibility = true;
				this.config.batchDomUpdates = true;
				this.config.enableViewTransitions = true;
				break;
		}
	}

	// Adjust effects based on quality level (0.0 - 1.0)
	private adjustEffectsForQuality(quality: number) {
		// Gradually reduce effects as quality decreases
		this.config.enableShadows = quality > 0.4;

		if (quality > 0.7) {
			this.config.shadowDepth = 'medium';
		} else if (quality > 0.4) {
			this.config.shadowDepth = 'light';
		}

		this.config.enableBlur = quality > 0.5;
		this.config.blurAmount = Math.round(quality * 6); // 0-6px

		this.config.enableGlow = quality > 0.3;
		this.config.glowOpacity = quality * 0.7; // 0-0.7
		this.config.glowBlur = Math.round(quality * 10); // 0-10px

		this.config.simplifyGradients = quality < 0.7;
		this.config.enablePatterns = quality > 0.4;
		this.config.enableReflections = quality > 0.6;
		this.config.enableTextShadows = quality > 0.3;

		this.config.enableScanlines = quality > 0.2;
		this.config.enablePhosphorDecay = quality > 0.6;
		this.config.enableInterlace = quality > 0.5;
	}

	// Apply configuration to document root
	private applyConfiguration() {
		if (!browser || !this.root) return;

		// Remove all previously applied classes
		this.appliedClasses.forEach((className) => {
			this.root?.classList.remove(className);
		});
		this.appliedClasses.clear();

		// Batch DOM updates using requestAnimationFrame
		requestAnimationFrame(() => {
			// Apply effect classes based on configuration
			this.applyEffectClass('shadows', this.config.enableShadows, this.config.shadowDepth);
			this.applyEffectClass('blur', this.config.enableBlur, this.config.blurAmount);
			this.applyEffectClass(
				'glow',
				this.config.enableGlow,
				`opacity-${Math.round(this.config.glowOpacity * 10)}`
			);
			this.applyEffectClass('gradients', !this.config.simplifyGradients, 'complex');
			this.applyEffectClass('patterns', this.config.enablePatterns);
			this.applyEffectClass('reflections', this.config.enableReflections);
			this.applyEffectClass('text-shadows', this.config.enableTextShadows);
			this.applyEffectClass('scanlines', this.config.enableScanlines);
			this.applyEffectClass('phosphor', this.config.enablePhosphorDecay);
			this.applyEffectClass('interlace', this.config.enableInterlace);

			// Apply optimization classes
			if (this.config.useHardwareAcceleration) {
				this.addClassName('hardware-accelerated');
			}

			if (!this.config.enableBackfaceVisibility) {
				this.addClassName('hide-backface');
			}

			if (this.config.useContainment) {
				this.addClassName('use-contain');
			}

			if (this.config.useContentVisibility) {
				this.addClassName('use-content-visibility');
			}

			if (this.config.batchDomUpdates) {
				this.addClassName('batch-updates');
			}

			if (this.config.enableViewTransitions && 'startViewTransition' in document) {
				this.addClassName('use-view-transitions');
			}

			// Set CSS variables for fine-grained control
			this.setRootVariable('--blur-amount', `${this.config.blurAmount}px`);
			this.setRootVariable('--glow-opacity', this.config.glowOpacity.toString());
			this.setRootVariable('--glow-blur', `${this.config.glowBlur}px`);
		});
	}

	// Apply a specific effect class
	private applyEffectClass(effect: string, enabled: boolean, variant: string | number = '') {
		if (!this.root) return;

		const className = `effect-${effect}${variant ? `-${variant}` : ''}`;
		const disabledClassName = `effect-${effect}-disabled`;

		if (enabled) {
			this.addClassName(className);
			this.root.classList.remove(disabledClassName);
		} else {
			this.root.classList.remove(className);
			this.addClassName(disabledClassName);
		}
	}

	// Add class name and track it
	private addClassName(className: string) {
		if (!this.root) return;

		this.root.classList.add(className);
		this.appliedClasses.add(className);
	}

	// Set a CSS variable on the root element
	private setRootVariable(name: string, value: string) {
		if (!this.root) return;

		this.root.style.setProperty(name, value);
	}

	// Enable or disable a specific effect
	setEffect(effect: EffectType, enabled: boolean) {
		if (effect in this.config) {
			// @ts-ignore - We've verified the key exists
			this.config[effect] = enabled;
			this.applyConfiguration();
		}
	}

	// Get current configuration
	getConfig(): CssEffectsConfig {
		return { ...this.config };
	}

	// Reset to defaults
	reset() {
		this.configureForAnimationMode(get(animationMode));
		this.applyConfiguration();
	}
}

// Singleton instance
export const cssEffectsManager = new CssEffectsManager();

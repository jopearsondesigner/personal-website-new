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
	private previousConfig: Partial<CssEffectsConfig> = {};
	private pendingRaf: number | null = null;

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

		// Cancel any pending animation frame
		if (this.pendingRaf !== null) {
			cancelAnimationFrame(this.pendingRaf);
		}

		// Use a single RAF for batching
		this.pendingRaf = requestAnimationFrame(() => {
			this.pendingRaf = null;
			this.applyConfigurationImmediate();
		});
	}

	private applyConfigurationImmediate() {
		// Detect if we're on mobile
		const isMobile = window.innerWidth < 768;

		// Store classes to add and remove for batch processing
		const classesToAdd: string[] = [];
		const classesToRemove: string[] = [];
		const cssVarsToUpdate: { name: string; value: string }[] = [];

		// Helper to check if config item changed
		const hasChanged = <T>(key: keyof CssEffectsConfig, value: T): boolean => {
			if (this.previousConfig[key] !== value) {
				this.previousConfig[key] = value;
				return true;
			}
			return false;
		};

		// Determine which effects to apply based on device
		if (isMobile) {
			// Apply more restrictive effects on mobile
			this.processEffectClass(
				'shadows',
				this.config.enableShadows && this.config.shadowDepth !== 'heavy',
				this.config.shadowDepth === 'heavy' ? 'light' : this.config.shadowDepth,
				classesToAdd,
				classesToRemove
			);

			// Reduce blur on mobile
			this.processEffectClass(
				'blur',
				this.config.enableBlur,
				Math.min(this.config.blurAmount, 2), // Cap blur at 2px on mobile
				classesToAdd,
				classesToRemove
			);

			// Reduce glow on mobile
			const mobileGlowOpacity = Math.min(this.config.glowOpacity, 0.4);
			this.processEffectClass(
				'glow',
				this.config.enableGlow,
				`opacity-${Math.round(mobileGlowOpacity * 10)}`,
				classesToAdd,
				classesToRemove
			);

			// Force simplified gradients on mobile
			this.processEffectClass('gradients', false, 'complex', classesToAdd, classesToRemove);

			// Handle remaining effects with mobile-friendly settings
			this.processEffectClass(
				'patterns',
				this.config.enablePatterns,
				'',
				classesToAdd,
				classesToRemove
			);
			this.processEffectClass('reflections', false, '', classesToAdd, classesToRemove); // Disable reflections on mobile
			this.processEffectClass(
				'text-shadows',
				this.config.enableTextShadows,
				'',
				classesToAdd,
				classesToRemove
			);

			// Reduce scanline density on mobile
			this.processEffectClass(
				'scanlines',
				this.config.enableScanlines,
				'mobile',
				classesToAdd,
				classesToRemove
			);
			this.processEffectClass('phosphor', false, '', classesToAdd, classesToRemove); // Disable on mobile
			this.processEffectClass(
				'interlace',
				this.config.enableInterlace,
				'light',
				classesToAdd,
				classesToRemove
			);

			// Add mobile optimizations
			if (hasChanged('useHardwareAcceleration', true)) {
				classesToAdd.push('hardware-accelerated');
				classesToAdd.push('mobile-optimized');
			}

			if (hasChanged('enableBackfaceVisibility', false)) {
				classesToAdd.push('hide-backface');
			}

			if (hasChanged('useContainment', true)) {
				classesToAdd.push('use-contain');
			}

			if (hasChanged('useContentVisibility', true)) {
				classesToAdd.push('use-content-visibility');
			}

			// Update CSS variables for mobile
			if (hasChanged('blurAmount', Math.min(this.config.blurAmount, 2))) {
				cssVarsToUpdate.push({
					name: '--blur-amount',
					value: `${Math.min(this.config.blurAmount, 2)}px`
				});
			}

			if (hasChanged('glowOpacity', mobileGlowOpacity)) {
				cssVarsToUpdate.push({ name: '--glow-opacity', value: mobileGlowOpacity.toString() });
			}

			if (hasChanged('glowBlur', Math.min(this.config.glowBlur, 5))) {
				cssVarsToUpdate.push({
					name: '--glow-blur',
					value: `${Math.min(this.config.glowBlur, 5)}px`
				});
			}
		} else {
			// Desktop - apply full effects
			this.processEffectClass(
				'shadows',
				this.config.enableShadows,
				this.config.shadowDepth,
				classesToAdd,
				classesToRemove
			);
			this.processEffectClass(
				'blur',
				this.config.enableBlur,
				this.config.blurAmount,
				classesToAdd,
				classesToRemove
			);
			this.processEffectClass(
				'glow',
				this.config.enableGlow,
				`opacity-${Math.round(this.config.glowOpacity * 10)}`,
				classesToAdd,
				classesToRemove
			);
			this.processEffectClass(
				'gradients',
				!this.config.simplifyGradients,
				'complex',
				classesToAdd,
				classesToRemove
			);
			this.processEffectClass(
				'patterns',
				this.config.enablePatterns,
				'',
				classesToAdd,
				classesToRemove
			);
			this.processEffectClass(
				'reflections',
				this.config.enableReflections,
				'',
				classesToAdd,
				classesToRemove
			);
			this.processEffectClass(
				'text-shadows',
				this.config.enableTextShadows,
				'',
				classesToAdd,
				classesToRemove
			);
			this.processEffectClass(
				'scanlines',
				this.config.enableScanlines,
				'',
				classesToAdd,
				classesToRemove
			);
			this.processEffectClass(
				'phosphor',
				this.config.enablePhosphorDecay,
				'',
				classesToAdd,
				classesToRemove
			);
			this.processEffectClass(
				'interlace',
				this.config.enableInterlace,
				'',
				classesToAdd,
				classesToRemove
			);

			// Add desktop optimizations
			if (hasChanged('useHardwareAcceleration', this.config.useHardwareAcceleration)) {
				if (this.config.useHardwareAcceleration) {
					classesToAdd.push('hardware-accelerated');
				} else {
					classesToRemove.push('hardware-accelerated');
				}
			}

			if (hasChanged('enableBackfaceVisibility', !this.config.enableBackfaceVisibility)) {
				if (!this.config.enableBackfaceVisibility) {
					classesToAdd.push('hide-backface');
				} else {
					classesToRemove.push('hide-backface');
				}
			}

			// Other desktop optimizations
			this.processOptimizationClass(
				'useContainment',
				this.config.useContainment,
				'use-contain',
				classesToAdd,
				classesToRemove
			);
			this.processOptimizationClass(
				'useContentVisibility',
				this.config.useContentVisibility,
				'use-content-visibility',
				classesToAdd,
				classesToRemove
			);
			this.processOptimizationClass(
				'batchDomUpdates',
				this.config.batchDomUpdates,
				'batch-updates',
				classesToAdd,
				classesToRemove
			);

			// Handle view transitions if supported
			const supportsViewTransitions = 'startViewTransition' in document;
			this.processOptimizationClass(
				'enableViewTransitions',
				this.config.enableViewTransitions && supportsViewTransitions,
				'use-view-transitions',
				classesToAdd,
				classesToRemove
			);

			// Update CSS variables for desktop
			if (hasChanged('blurAmount', this.config.blurAmount)) {
				cssVarsToUpdate.push({ name: '--blur-amount', value: `${this.config.blurAmount}px` });
			}

			if (hasChanged('glowOpacity', this.config.glowOpacity)) {
				cssVarsToUpdate.push({ name: '--glow-opacity', value: this.config.glowOpacity.toString() });
			}

			if (hasChanged('glowBlur', this.config.glowBlur)) {
				cssVarsToUpdate.push({ name: '--glow-blur', value: `${this.config.glowBlur}px` });
			}
		}

		// Apply all class changes in one batch
		if (classesToRemove.length > 0) {
			this.root.classList.remove(...classesToRemove);
			// Remove from tracked classes
			classesToRemove.forEach((cls) => this.appliedClasses.delete(cls));
		}

		if (classesToAdd.length > 0) {
			this.root.classList.add(...classesToAdd);
			// Add to tracked classes
			classesToAdd.forEach((cls) => this.appliedClasses.add(cls));
		}

		// Apply CSS variable updates
		cssVarsToUpdate.forEach(({ name, value }) => {
			this.root!.style.setProperty(name, value);
		});
	}

	// Helper method to process effect classes
	private processEffectClass(
		effect: string,
		enabled: boolean,
		variant: string | number = '',
		classesToAdd: string[],
		classesToRemove: string[]
	) {
		const className = `effect-${effect}${variant ? `-${variant}` : ''}`;
		const disabledClassName = `effect-${effect}-disabled`;

		const key = `${effect}-${variant}-${enabled}` as keyof CssEffectsConfig;
		if (this.previousConfig[key] !== enabled) {
			this.previousConfig[key] = enabled;

			if (enabled) {
				classesToAdd.push(className);
				classesToRemove.push(disabledClassName);
			} else {
				classesToRemove.push(className);
				classesToAdd.push(disabledClassName);
			}
		}
	}

	// Helper method for optimization classes
	private processOptimizationClass(
		configKey: keyof CssEffectsConfig,
		enabled: boolean,
		className: string,
		classesToAdd: string[],
		classesToRemove: string[]
	) {
		if (this.previousConfig[configKey] !== enabled) {
			this.previousConfig[configKey] = enabled;

			if (enabled) {
				classesToAdd.push(className);
			} else {
				classesToRemove.push(className);
			}
		}
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

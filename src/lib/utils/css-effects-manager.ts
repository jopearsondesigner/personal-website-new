// src/lib/utils/css-effects-manager.ts
import { browser } from '$app/environment';
import { get } from 'svelte/store';
import { animationMode, type AnimationMode } from './animation-mode';
import { frameRateController } from './frame-rate-controller';
import { batchDOMUpdate, batchSetStyles, batchAddClasses, batchRemoveClasses } from './dom-utils';

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
	private pendingConfigUpdates: boolean = false;

	// Cache for mobile detection
	private isMobile: boolean = false;
	private lastCheckTime: number = 0;
	private mobileCheckInterval: number = 250; // Check every 250ms at most

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
		if (!browser) return this;

		this.root = root;

		// Check if mobile initially
		this.checkIfMobile();

		// Initial configuration based on animation mode
		this.configureForAnimationMode(get(animationMode));

		// Subscribe to animation mode changes
		animationMode.subscribe((mode) => {
			this.configureForAnimationMode(mode);
			this.scheduleConfigUpdate();
		});

		// Subscribe to quality changes from frame rate controller
		frameRateController.subscribeQuality((quality) => {
			this.adjustEffectsForQuality(quality);
			this.scheduleConfigUpdate();
		});

		// Schedule initial configuration
		this.scheduleConfigUpdate();

		return this;
	}

	// Configure effects based on animation mode
	private configureForAnimationMode(mode: AnimationMode) {
		// Create a new config object instead of mutating existing one
		const newConfig: Partial<CssEffectsConfig> = {};

		switch (mode) {
			case 'minimal':
				// Minimal configuration for low-end devices
				newConfig.enableShadows = false;
				newConfig.enableBlur = false;
				newConfig.enableGlow = false;
				newConfig.simplifyGradients = true;
				newConfig.enablePatterns = false;
				newConfig.enableReflections = false;
				newConfig.enableTextShadows = false;
				newConfig.enableScanlines = false;
				newConfig.enablePhosphorDecay = false;
				newConfig.enableInterlace = false;
				newConfig.useHardwareAcceleration = true;
				newConfig.enableBackfaceVisibility = false;
				newConfig.useContainment = true;
				newConfig.useContentVisibility = true;
				newConfig.batchDomUpdates = true;
				newConfig.enableViewTransitions = false;
				break;

			case 'reduced':
				// Reduced configuration for mid-range devices
				newConfig.enableShadows = true;
				newConfig.shadowDepth = 'light';
				newConfig.enableBlur = true;
				newConfig.blurAmount = 2;
				newConfig.enableGlow = true;
				newConfig.glowOpacity = 0.4;
				newConfig.glowBlur = 4;
				newConfig.simplifyGradients = true;
				newConfig.enablePatterns = true;
				newConfig.enableReflections = false;
				newConfig.enableTextShadows = true;
				newConfig.enableScanlines = true;
				newConfig.enablePhosphorDecay = false;
				newConfig.enableInterlace = true;
				newConfig.useHardwareAcceleration = true;
				newConfig.enableBackfaceVisibility = false;
				newConfig.useContainment = true;
				newConfig.useContentVisibility = true;
				newConfig.batchDomUpdates = true;
				newConfig.enableViewTransitions = false;
				break;

			case 'normal':
			default:
				// Full configuration for high-end devices
				newConfig.enableShadows = true;
				newConfig.shadowDepth = 'medium';
				newConfig.enableBlur = true;
				newConfig.blurAmount = 4;
				newConfig.enableGlow = true;
				newConfig.glowOpacity = 0.6;
				newConfig.glowBlur = 8;
				newConfig.simplifyGradients = false;
				newConfig.enablePatterns = true;
				newConfig.enableReflections = true;
				newConfig.enableTextShadows = true;
				newConfig.enableScanlines = true;
				newConfig.enablePhosphorDecay = true;
				newConfig.enableInterlace = true;
				newConfig.useHardwareAcceleration = true;
				newConfig.enableBackfaceVisibility = true;
				newConfig.useContainment = true;
				newConfig.useContentVisibility = true;
				newConfig.batchDomUpdates = true;
				newConfig.enableViewTransitions = true;
				break;
		}

		// Apply changes to the config
		Object.assign(this.config, newConfig);
	}

	// Adjust effects based on quality level (0.0 - 1.0)
	private adjustEffectsForQuality(quality: number) {
		// Create a new partial config object for the changes
		const newConfig: Partial<CssEffectsConfig> = {};

		// Gradually reduce effects as quality decreases
		newConfig.enableShadows = quality > 0.4;

		if (quality > 0.7) {
			newConfig.shadowDepth = 'medium';
		} else if (quality > 0.4) {
			newConfig.shadowDepth = 'light';
		}

		newConfig.enableBlur = quality > 0.5;
		newConfig.blurAmount = Math.round(quality * 6); // 0-6px

		newConfig.enableGlow = quality > 0.3;
		newConfig.glowOpacity = quality * 0.7; // 0-0.7
		newConfig.glowBlur = Math.round(quality * 10); // 0-10px

		newConfig.simplifyGradients = quality < 0.7;
		newConfig.enablePatterns = quality > 0.4;
		newConfig.enableReflections = quality > 0.6;
		newConfig.enableTextShadows = quality > 0.3;

		newConfig.enableScanlines = quality > 0.2;
		newConfig.enablePhosphorDecay = quality > 0.6;
		newConfig.enableInterlace = quality > 0.5;

		// Apply changes to the config
		Object.assign(this.config, newConfig);
	}

	// Schedule a config update in the next animation frame
	private scheduleConfigUpdate() {
		if (this.pendingConfigUpdates) return;

		this.pendingConfigUpdates = true;

		// Cancel any pending animation frame
		if (this.pendingRaf !== null) {
			cancelAnimationFrame(this.pendingRaf);
		}

		// Use a single RAF for batching
		this.pendingRaf = requestAnimationFrame(() => {
			this.pendingRaf = null;
			this.pendingConfigUpdates = false;
			this.applyConfiguration();
		});
	}

	// Check if we're on mobile and cache the result
	private checkIfMobile(): boolean {
		const now = Date.now();
		// Only check at most every 250ms to avoid unnecessary lookups
		if (now - this.lastCheckTime > this.mobileCheckInterval) {
			this.lastCheckTime = now;
			this.isMobile = window.innerWidth < 768;
		}
		return this.isMobile;
	}

	// Apply configuration to document root with optimized batching
	private applyConfiguration() {
		if (!browser || !this.root) return;

		// Check if we're on mobile
		const isMobile = this.checkIfMobile();

		// READ PHASE - Collect all state before making any DOM updates

		// Store classes to add and remove for batch processing
		const classesToAdd: string[] = [];
		const classesToRemove: string[] = [];

		// Collect all CSS variables to update in one batch
		const cssVarsToUpdate: Record<string, string> = {};

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
			// --- Mobile configuration ---

			// Process effect classes for mobile
			this.collectEffectClassChanges(
				'shadows',
				this.config.enableShadows && this.config.shadowDepth !== 'heavy',
				this.config.shadowDepth === 'heavy' ? 'light' : this.config.shadowDepth,
				classesToAdd,
				classesToRemove
			);

			// Reduce blur on mobile
			const mobileBlurAmount = Math.min(this.config.blurAmount, 2);
			this.collectEffectClassChanges(
				'blur',
				this.config.enableBlur,
				mobileBlurAmount,
				classesToAdd,
				classesToRemove
			);

			// Reduce glow on mobile
			const mobileGlowOpacity = Math.min(this.config.glowOpacity, 0.4);
			this.collectEffectClassChanges(
				'glow',
				this.config.enableGlow,
				`opacity-${Math.round(mobileGlowOpacity * 10)}`,
				classesToAdd,
				classesToRemove
			);

			// Force simplified gradients on mobile
			this.collectEffectClassChanges('gradients', false, 'complex', classesToAdd, classesToRemove);

			// Handle remaining effects with mobile-friendly settings
			this.collectEffectClassChanges(
				'patterns',
				this.config.enablePatterns,
				'',
				classesToAdd,
				classesToRemove
			);

			this.collectEffectClassChanges('reflections', false, '', classesToAdd, classesToRemove);

			this.collectEffectClassChanges(
				'text-shadows',
				this.config.enableTextShadows,
				'',
				classesToAdd,
				classesToRemove
			);

			// Reduce scanline density on mobile
			this.collectEffectClassChanges(
				'scanlines',
				this.config.enableScanlines,
				'mobile',
				classesToAdd,
				classesToRemove
			);

			this.collectEffectClassChanges('phosphor', false, '', classesToAdd, classesToRemove);

			this.collectEffectClassChanges(
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

			this.collectOptimizationClassChanges(
				'useContainment',
				true,
				'use-contain',
				classesToAdd,
				classesToRemove
			);

			this.collectOptimizationClassChanges(
				'useContentVisibility',
				true,
				'use-content-visibility',
				classesToAdd,
				classesToRemove
			);

			// Update CSS variables for mobile
			if (hasChanged('blurAmount', mobileBlurAmount)) {
				cssVarsToUpdate['--blur-amount'] = `${mobileBlurAmount}px`;
			}

			if (hasChanged('glowOpacity', mobileGlowOpacity)) {
				cssVarsToUpdate['--glow-opacity'] = mobileGlowOpacity.toString();
			}

			if (hasChanged('glowBlur', Math.min(this.config.glowBlur, 5))) {
				cssVarsToUpdate['--glow-blur'] = `${Math.min(this.config.glowBlur, 5)}px`;
			}
		} else {
			// --- Desktop configuration ---

			// Process effect classes for desktop
			this.collectEffectClassChanges(
				'shadows',
				this.config.enableShadows,
				this.config.shadowDepth,
				classesToAdd,
				classesToRemove
			);

			this.collectEffectClassChanges(
				'blur',
				this.config.enableBlur,
				this.config.blurAmount,
				classesToAdd,
				classesToRemove
			);

			this.collectEffectClassChanges(
				'glow',
				this.config.enableGlow,
				`opacity-${Math.round(this.config.glowOpacity * 10)}`,
				classesToAdd,
				classesToRemove
			);

			this.collectEffectClassChanges(
				'gradients',
				!this.config.simplifyGradients,
				'complex',
				classesToAdd,
				classesToRemove
			);

			this.collectEffectClassChanges(
				'patterns',
				this.config.enablePatterns,
				'',
				classesToAdd,
				classesToRemove
			);

			this.collectEffectClassChanges(
				'reflections',
				this.config.enableReflections,
				'',
				classesToAdd,
				classesToRemove
			);

			this.collectEffectClassChanges(
				'text-shadows',
				this.config.enableTextShadows,
				'',
				classesToAdd,
				classesToRemove
			);

			this.collectEffectClassChanges(
				'scanlines',
				this.config.enableScanlines,
				'',
				classesToAdd,
				classesToRemove
			);

			this.collectEffectClassChanges(
				'phosphor',
				this.config.enablePhosphorDecay,
				'',
				classesToAdd,
				classesToRemove
			);

			this.collectEffectClassChanges(
				'interlace',
				this.config.enableInterlace,
				'',
				classesToAdd,
				classesToRemove
			);

			// Add desktop optimizations
			this.collectOptimizationClassChanges(
				'useHardwareAcceleration',
				this.config.useHardwareAcceleration,
				'hardware-accelerated',
				classesToAdd,
				classesToRemove
			);

			this.collectOptimizationClassChanges(
				'enableBackfaceVisibility',
				!this.config.enableBackfaceVisibility,
				'hide-backface',
				classesToAdd,
				classesToRemove
			);

			// Other desktop optimizations
			this.collectOptimizationClassChanges(
				'useContainment',
				this.config.useContainment,
				'use-contain',
				classesToAdd,
				classesToRemove
			);

			this.collectOptimizationClassChanges(
				'useContentVisibility',
				this.config.useContentVisibility,
				'use-content-visibility',
				classesToAdd,
				classesToRemove
			);

			this.collectOptimizationClassChanges(
				'batchDomUpdates',
				this.config.batchDomUpdates,
				'batch-updates',
				classesToAdd,
				classesToRemove
			);

			// Handle view transitions if supported
			const supportsViewTransitions =
				typeof document !== 'undefined' && 'startViewTransition' in document;
			this.collectOptimizationClassChanges(
				'enableViewTransitions',
				this.config.enableViewTransitions && supportsViewTransitions,
				'use-view-transitions',
				classesToAdd,
				classesToRemove
			);

			// Update CSS variables for desktop
			if (hasChanged('blurAmount', this.config.blurAmount)) {
				cssVarsToUpdate['--blur-amount'] = `${this.config.blurAmount}px`;
			}

			if (hasChanged('glowOpacity', this.config.glowOpacity)) {
				cssVarsToUpdate['--glow-opacity'] = this.config.glowOpacity.toString();
			}

			if (hasChanged('glowBlur', this.config.glowBlur)) {
				cssVarsToUpdate['--glow-blur'] = `${this.config.glowBlur}px`;
			}
		}

		// WRITE PHASE - Perform all DOM updates in batches

		// Only update if there are actual changes
		if (
			classesToRemove.length > 0 ||
			classesToAdd.length > 0 ||
			Object.keys(cssVarsToUpdate).length > 0
		) {
			batchDOMUpdate(() => {
				// Apply all class changes in one batch
				if (classesToRemove.length > 0) {
					this.root!.classList.remove(...classesToRemove);
					// Remove from tracked classes
					classesToRemove.forEach((cls) => this.appliedClasses.delete(cls));
				}

				if (classesToAdd.length > 0) {
					this.root!.classList.add(...classesToAdd);
					// Add to tracked classes
					classesToAdd.forEach((cls) => this.appliedClasses.add(cls));
				}

				// Apply all CSS variable updates in one batch
				Object.entries(cssVarsToUpdate).forEach(([name, value]) => {
					this.root!.style.setProperty(name, value);
				});
			});
		}
	}

	// Helper method to collect effect class changes without modifying DOM
	private collectEffectClassChanges(
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
	private collectOptimizationClassChanges(
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

	// Enable or disable a specific effect
	setEffect(effect: EffectType, enabled: boolean) {
		if (effect in this.config) {
			// @ts-ignore - We've verified the key exists
			this.config[effect] = enabled;
			this.scheduleConfigUpdate();
		}
	}

	// Get current configuration
	getConfig(): CssEffectsConfig {
		return { ...this.config };
	}

	// Reset to defaults
	reset() {
		this.configureForAnimationMode(get(animationMode));
		this.scheduleConfigUpdate();
	}
}

// Singleton instance
export const cssEffectsManager = new CssEffectsManager();

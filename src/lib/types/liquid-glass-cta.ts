/* DO NOT REMOVE THIS COMMENT
/src/lib/types/liquid-glass-cta.ts
DO NOT REMOVE THIS COMMENT */

/**
 * Liquid Glass CTA Button Component Types
 * Inspired by Apple's Liquid Glass design language with arcade theme integration
 */

// Size variants for the CTA button
export type LiquidGlassSize = 'sm' | 'md' | 'lg';

// Visual variants
export type LiquidGlassVariant = 'primary' | 'secondary';

// Animation state for performance tracking
export interface LiquidGlassAnimationState {
	isHovered: boolean;
	isPressed: boolean;
	isFocused: boolean;
	isLoading: boolean;
	isMounted: boolean;
}

// Dynamic properties for glass effects
export interface LiquidGlassProperties {
	glassOpacity: number;
	blurIntensity: number;
	refractionAngle: number;
	specularIntensity: number;
	cursorPosition: {
		x: number;
		y: number;
	};
}

// Performance optimization settings
export interface LiquidGlassPerformanceConfig {
	mouseThrottle: number;
	enableHardwareAcceleration: boolean;
	enableAdvancedEffects: boolean;
	reducedMotion: boolean;
}

// Main component props interface
export interface LiquidGlassCTAProps {
	// Content
	text: string;
	href: string;
	icon?: string;
	ariaLabel?: string;

	// Appearance
	size?: LiquidGlassSize;
	variant?: LiquidGlassVariant;
	className?: string;

	// State
	disabled?: boolean;
	loading?: boolean;

	// Callbacks
	onClick?: (event: MouseEvent) => void;
	onHover?: (isHovered: boolean) => void;
	onFocus?: (isFocused: boolean) => void;
}

// CSS Custom Properties for dynamic styling
export interface LiquidGlassCSSProperties {
	'--glass-opacity': number;
	'--cursor-x': string;
	'--cursor-y': string;
	'--refraction-angle': string;
	'--specular-intensity': string;
	'--blur-intensity': string;
}

// Theme-specific color configuration
export interface LiquidGlassThemeColors {
	// Glass base colors
	glassBase: string;
	glassBorder: string;
	glassGradientStart: string;
	glassGradientMiddle: string;
	glassGradientEnd: string;

	// Text and content colors
	textColor: string;
	textGradient: string;
	textShadow: string;
	iconColor: string;
	accentColor: string;

	// Effect colors
	refractionColor: string;
	dynamicLight: string;
	arcadeGlow: string;
	rippleColor: string;
	focusColor: string;

	// Shadow system
	shadowSystem: string;
	shadowHover: string;
	shadowPressed: string;
}

// Accessibility configuration
export interface LiquidGlassA11yConfig {
	respectReducedMotion: boolean;
	respectHighContrast: boolean;
	keyboardNavigable: boolean;
	screenReaderOptimized: boolean;
	touchOptimized: boolean;
	minContrastRatio: number;
}

// Integration configuration for CRT Display
export interface LiquidGlassCRTIntegration {
	inheritScanlines: boolean;
	blendWithCRTEffects: boolean;
	respectCRTTheme: boolean;
	syncWithCRTAnimations: boolean;
}

// Performance metrics for monitoring
export interface LiquidGlassPerformanceMetrics {
	renderTime: number;
	frameRate: number;
	memoryUsage: number;
	gpuUtilization: number;
	interactionLatency: number;
}

// Event handlers interface
export interface LiquidGlassEventHandlers {
	onMount?: () => void;
	onDestroy?: () => void;
	onInteractionStart?: (type: 'hover' | 'press' | 'focus') => void;
	onInteractionEnd?: (type: 'hover' | 'press' | 'focus') => void;
	onAnimationComplete?: (animationType: string) => void;
	onPerformanceWarning?: (metrics: LiquidGlassPerformanceMetrics) => void;
}

// Complete configuration interface
export interface LiquidGlassConfig {
	props: LiquidGlassCTAProps;
	theme: LiquidGlassThemeColors;
	performance: LiquidGlassPerformanceConfig;
	accessibility: LiquidGlassA11yConfig;
	crtIntegration?: LiquidGlassCRTIntegration;
	eventHandlers?: LiquidGlassEventHandlers;
}

// Utility type for CSS custom property names
export type LiquidGlassCSSVar = keyof LiquidGlassCSSProperties;

// Utility type for theme validation
export type LiquidGlassThemeKey = keyof LiquidGlassThemeColors;

/**
 * Default configurations for different use cases
 */
export const LIQUID_GLASS_DEFAULTS = {
	// Standard CTA button configuration
	CTA_PRIMARY: {
		size: 'md' as LiquidGlassSize,
		variant: 'primary' as LiquidGlassVariant,
		text: 'Get Started',
		icon: '→',
		href: '#contact'
	},

	// Performance-optimized configuration
	PERFORMANCE_OPTIMIZED: {
		mouseThrottle: 16, // 60fps
		enableHardwareAcceleration: true,
		enableAdvancedEffects: true,
		reducedMotion: false
	} as LiquidGlassPerformanceConfig,

	// Accessibility-first configuration
	ACCESSIBILITY_FOCUSED: {
		respectReducedMotion: true,
		respectHighContrast: true,
		keyboardNavigable: true,
		screenReaderOptimized: true,
		touchOptimized: true,
		minContrastRatio: 4.5
	} as LiquidGlassA11yConfig,

	// CRT Display integration
	CRT_INTEGRATION: {
		inheritScanlines: true,
		blendWithCRTEffects: true,
		respectCRTTheme: true,
		syncWithCRTAnimations: false
	} as LiquidGlassCRTIntegration
} as const;

/**
 * Utility functions for type validation and configuration
 */
export class LiquidGlassUtils {
	static validateSize(size: string): size is LiquidGlassSize {
		return ['sm', 'md', 'lg'].includes(size);
	}

	static validateVariant(variant: string): variant is LiquidGlassVariant {
		return ['primary', 'secondary'].includes(variant);
	}

	static createCSSProperties(props: Partial<LiquidGlassProperties>): LiquidGlassCSSProperties {
		return {
			'--glass-opacity': props.glassOpacity ?? 0.15,
			'--cursor-x': `${props.cursorPosition?.x ?? 50}%`,
			'--cursor-y': `${props.cursorPosition?.y ?? 50}%`,
			'--refraction-angle': `${props.refractionAngle ?? 0}deg`,
			'--specular-intensity': `${props.specularIntensity ?? 0.3}`,
			'--blur-intensity': `${props.blurIntensity ?? 16}px`
		};
	}

	static shouldReduceMotion(): boolean {
		if (typeof window === 'undefined') return false;
		return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	static shouldUseHighContrast(): boolean {
		if (typeof window === 'undefined') return false;
		return window.matchMedia('(prefers-contrast: high)').matches;
	}

	static detectTouch(): boolean {
		if (typeof window === 'undefined') return false;
		return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
	}
}

/**
 * Performance monitoring utilities
 */
export class LiquidGlassPerformanceMonitor {
	private static instance: LiquidGlassPerformanceMonitor;
	private metrics: Map<string, LiquidGlassPerformanceMetrics> = new Map();

	static getInstance(): LiquidGlassPerformanceMonitor {
		if (!this.instance) {
			this.instance = new LiquidGlassPerformanceMonitor();
		}
		return this.instance;
	}

	startTracking(componentId: string): void {
		const startTime = performance.now();
		// Implementation would track actual metrics
		this.metrics.set(componentId, {
			renderTime: 0,
			frameRate: 60,
			memoryUsage: 0,
			gpuUtilization: 0,
			interactionLatency: 0
		});
	}

	endTracking(componentId: string): LiquidGlassPerformanceMetrics | null {
		return this.metrics.get(componentId) ?? null;
	}

	getAverageMetrics(): LiquidGlassPerformanceMetrics {
		const allMetrics = Array.from(this.metrics.values());
		if (allMetrics.length === 0) {
			return {
				renderTime: 0,
				frameRate: 60,
				memoryUsage: 0,
				gpuUtilization: 0,
				interactionLatency: 0
			};
		}

		return allMetrics.reduce(
			(acc, metrics) => ({
				renderTime: acc.renderTime + metrics.renderTime,
				frameRate: acc.frameRate + metrics.frameRate,
				memoryUsage: acc.memoryUsage + metrics.memoryUsage,
				gpuUtilization: acc.gpuUtilization + metrics.gpuUtilization,
				interactionLatency: acc.interactionLatency + metrics.interactionLatency
			}),
			{
				renderTime: 0,
				frameRate: 0,
				memoryUsage: 0,
				gpuUtilization: 0,
				interactionLatency: 0
			}
		);
	}
}

// Export all types and utilities
export default {
	Utils: LiquidGlassUtils,
	PerformanceMonitor: LiquidGlassPerformanceMonitor,
	DEFAULTS: LIQUID_GLASS_DEFAULTS
};

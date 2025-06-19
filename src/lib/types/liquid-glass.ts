// DO NOT REMOVE THIS COMMENT
// /src/lib/types/liquid-glass.ts
// DO NOT REMOVE THIS COMMENT

/**
 * Liquid Glass CTA Button Component Types
 * Inspired by Apple's iOS 26 Liquid Glass design language
 */

export interface LiquidGlassCTAProps {
	/** Navigation target URL or anchor */
	href?: string;

	/** Button text content */
	text?: string;

	/** Visual variant of the button */
	variant?: 'primary' | 'secondary';

	/** Size variant */
	size?: 'small' | 'medium' | 'large';

	/** Disabled state */
	disabled?: boolean;

	/** Accessibility label */
	ariaLabel?: string;

	/** Additional CSS classes */
	className?: string;
}

export interface LiquidGlassEffectConfig {
	/** Glass blur intensity in pixels */
	blurIntensity?: number;

	/** Base opacity of glass effect (0-1) */
	baseOpacity?: number;

	/** Specular highlight intensity (0-1) */
	highlightIntensity?: number;

	/** Border glow opacity (0-1) */
	borderOpacity?: number;

	/** Animation duration in seconds */
	transitionDuration?: number;

	/** Hover scale factor */
	hoverScale?: number;

	/** Press scale factor */
	pressScale?: number;
}

export interface LiquidGlassThemeVariables {
	/** Base glass background color */
	base: string;

	/** Highlight color for glass edge */
	highlight: string;

	/** Shadow color for depth */
	shadow: string;

	/** Drop shadow color */
	dropShadow: string;

	/** Text color */
	text: string;

	/** Text glow color */
	textGlow: string;

	/** Accent color for gaming elements */
	accent: string;

	/** Ripple effect color */
	ripple: string;

	/** Border gradient colors */
	borderGradient: {
		start: string;
		mid: string;
		end: string;
	};
}

export interface LiquidGlassAnimationState {
	/** Whether component is mounted */
	mounted: boolean;

	/** Hover state */
	isHovered: boolean;

	/** Pressed/active state */
	isPressed: boolean;

	/** Mouse position for dynamic effects */
	mousePosition: {
		x: number;
		y: number;
	};
}

export interface LiquidGlassAccessibilityConfig {
	/** Respect reduced motion preferences */
	respectReducedMotion?: boolean;

	/** High contrast mode adjustments */
	highContrastMode?: boolean;

	/** Focus indicator visibility */
	focusIndicator?: boolean;

	/** Keyboard navigation support */
	keyboardNavigation?: boolean;
}

export interface LiquidGlassPerformanceConfig {
	/** Enable hardware acceleration */
	hardwareAcceleration?: boolean;

	/** Use transform optimizations */
	useTransforms?: boolean;

	/** Enable will-change optimization */
	willChange?: boolean;

	/** Enable containment for performance */
	useContainment?: boolean;
}

export type LiquidGlassVariant = 'primary' | 'secondary';
export type LiquidGlassSize = 'small' | 'medium' | 'large';
export type LiquidGlassTheme = 'light' | 'dark';

/**
 * Complete configuration interface for Liquid Glass components
 */
export interface LiquidGlassConfig {
	effects: LiquidGlassEffectConfig;
	theme: LiquidGlassThemeVariables;
	accessibility: LiquidGlassAccessibilityConfig;
	performance: LiquidGlassPerformanceConfig;
}

/**
 * Event interfaces for component interactions
 */
export interface LiquidGlassInteractionEvent {
	type: 'hover' | 'press' | 'focus' | 'blur' | 'click';
	target: HTMLElement;
	position?: { x: number; y: number };
	timestamp: number;
}

export interface LiquidGlassMouseEvent extends LiquidGlassInteractionEvent {
	mousePosition: { x: number; y: number };
	elementBounds: DOMRect;
	relativePosition: { x: number; y: number; percentX: number; percentY: number };
}

/**
 * Configuration constants
 */
export const LIQUID_GLASS_DEFAULTS: Required<LiquidGlassEffectConfig> = {
	blurIntensity: 20,
	baseOpacity: 0.15,
	highlightIntensity: 0.3,
	borderOpacity: 0.2,
	transitionDuration: 0.3,
	hoverScale: 1.05,
	pressScale: 0.98
};

export const LIQUID_GLASS_BREAKPOINTS = {
	mobile: 480,
	tablet: 768,
	desktop: 1024
} as const;

export const LIQUID_GLASS_Z_INDEX = {
	base: 1,
	distortion: 2,
	content: 10,
	highlight: 15,
	filters: -1
} as const;

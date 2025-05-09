// src/lib/utils/setup-crt-variables.ts

/**
 * Sets up all CRT effect CSS variables based on device capabilities
 * This centralizes all the variables used across components
 */
export function setupCRTVariables(
	isLowPerformance: boolean = false,
	isMobile: boolean = false,
	isIOS: boolean = false
): void {
	if (typeof document === 'undefined') return;

	// Screen base properties
	document.documentElement.style.setProperty(
		'--phosphor-decay',
		isLowPerformance ? '32ms' : isMobile ? '24ms' : '16ms'
	);
	document.documentElement.style.setProperty(
		'--refresh-rate',
		isLowPerformance ? '30' : isMobile ? '45' : '60'
	);
	document.documentElement.style.setProperty(
		'--shadow-mask-size',
		isLowPerformance ? '4px' : isMobile ? '3px' : '2px'
	);
	document.documentElement.style.setProperty(
		'--bloom-intensity',
		isLowPerformance ? '0.2' : isMobile ? '0.3' : '0.4'
	);
	document.documentElement.style.setProperty(
		'--misconvergence-offset',
		isLowPerformance ? '0px' : isMobile ? '0.3px' : '0.5px'
	);

	// Glass effect properties
	document.documentElement.style.setProperty(
		'--glass-reflectivity',
		isLowPerformance ? '0.08' : isMobile ? '0.1' : '0.12'
	);
	document.documentElement.style.setProperty(
		'--glass-dust-opacity',
		isLowPerformance ? '0.01' : isMobile ? '0.02' : '0.03'
	);
	document.documentElement.style.setProperty(
		'--glass-smudge-opacity',
		isLowPerformance ? '0.01' : isMobile ? '0.02' : '0.03'
	);
	document.documentElement.style.setProperty(
		'--internal-reflection-opacity',
		isLowPerformance ? '0.01' : isMobile ? '0.025' : '0.035'
	);
	document.documentElement.style.setProperty(
		'--glass-thickness',
		isLowPerformance ? '0px' : isMobile ? '0.5px' : '1px'
	);
	document.documentElement.style.setProperty(
		'--glass-edge-highlight',
		isLowPerformance ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.1)'
	);

	// Glow effects
	document.documentElement.style.setProperty(
		'--screen-glow-opacity',
		isLowPerformance ? '0.05' : isMobile ? '0.1' : '0.15'
	);

	// Text properties
	document.documentElement.style.setProperty('--header-text-color', '#27ff99');
	document.documentElement.style.setProperty('--header-font-size', isMobile ? '2.5rem' : '3rem');
	document.documentElement.style.setProperty(
		'--insert-concept-font-size',
		isMobile ? '0.8rem' : '1rem'
	);
	document.documentElement.style.setProperty('--insert-concept-color', '#ffffff');

	// Border radius
	document.documentElement.style.setProperty('--border-radius', isMobile ? '2vmin' : '3vmin');

	// Screen dimensions
	document.documentElement.style.setProperty(
		'--arcade-screen-width',
		isMobile ? '90vw' : 'min(95vw, 800px)'
	);
	document.documentElement.style.setProperty(
		'--arcade-screen-height',
		isMobile ? '60vh' : 'min(70vh, 600px)'
	);

	// Device-specific optimizations
	if (isIOS) {
		document.documentElement.classList.add('ios-optimized');

		// iOS-specific tweaks
		document.documentElement.style.setProperty('--phosphor-decay', '32ms');
		document.documentElement.style.setProperty('--shadow-mask-size', '4px');
		document.documentElement.style.setProperty('--bloom-intensity', '0.2');
	}
}

/**
 * Applies dark/light theme specific adjustments to CRT variables
 */
export function updateCRTThemeVariables(isDarkMode: boolean): void {
	if (typeof document === 'undefined') return;

	// Adjust variables based on theme
	if (isDarkMode) {
		document.documentElement.style.setProperty('--glass-reflectivity', '0.12');
		document.documentElement.style.setProperty('--screen-glow-opacity', '0.15');
		document.documentElement.style.setProperty('--header-text-color', '#27ff99');
	} else {
		document.documentElement.style.setProperty('--glass-reflectivity', '0.08');
		document.documentElement.style.setProperty('--screen-glow-opacity', '0.1');
		document.documentElement.style.setProperty('--header-text-color', '#1ad682');
	}
}

export default setupCRTVariables;

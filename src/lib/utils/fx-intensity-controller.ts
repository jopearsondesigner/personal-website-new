// src/lib/utils/fx-intensity-controller.ts
import { browser } from '$app/environment';
import { frameRateController } from '$lib/utils/frame-rate-controller';

type Options = {
	// Map 0..1 quality → 0..1 intensity curve
	// Default: slightly non-linear (gentler near low quality, crisp near high)
	qualityToIntensity?: (q: number) => number;

	// Post-processing tweak for low-power/battery/memory pressure, if you want it
	deviceModifier?: (intensity: number) => number;

	// Where to set the CSS variables (default: <html>)
	target?: HTMLElement | Document;
};

function clamp(n: number, a: number, b: number) {
	return Math.max(a, Math.min(b, n));
}

/**
 * Binds frameRateController quality to CSS variables that drive your screen effects.
 * Returns an unsubscribe function.
 */
export function bindFxIntensity(opts: Options = {}) {
	if (!browser) return () => {};

	const targetEl = (opts.target as HTMLElement) || (document.documentElement as HTMLElement);

	const qualityToIntensity =
		opts.qualityToIntensity ||
		((q: number) => {
			// q is ~0.4..1.0 in your controller. Normalize and apply a soft curve.
			const t = clamp((q - 0.4) / (1.0 - 0.4), 0, 1);
			// Ease: smoother at low end, punchier at high end
			const eased = t * t * (3 - 2 * t); // smoothstep
			// Map to visual range: subtle 0.55 → bold 1.25
			return 0.55 + eased * (1.25 - 0.55);
		});

	const deviceModifier =
		opts.deviceModifier ||
		((intensity: number) => {
			// Optional: reduce a bit in obvious low-power situations
			try {
				const m = frameRateController.getPerformanceMetrics?.();
				const isLowPower = m?.onBatteryPower || m?.lowBatteryMode;
				if (isLowPower) return intensity * 0.9;
			} catch {
				/* noop */
			}
			return intensity;
		});

	const setVars = (intensity: number) => {
		const i = clamp(intensity, 0.3, 1.35);
		const animSpeed = clamp(0.6 + (i - 0.6) * 1.0, 0.5, 1.2); // keep motion calmer on low q
		const blurMult = clamp(0.75 + (i - 0.75) * 0.8, 0.6, 1.3);

		// These are the master knobs you wired earlier
		targetEl.style.setProperty('--fx-intensity', String(i));
		targetEl.style.setProperty('--fx-anim-speed', String(animSpeed));
		targetEl.style.setProperty('--fx-blur-mult', String(blurMult));

		// If you want to also attenuate your existing glass vars directly:
		// targetEl.style.setProperty('--fx-glass-smudge-opacity', `calc(var(--glass-smudge-opacity) * ${i})`);
		// targetEl.style.setProperty('--fx-internal-reflection-opacity', `calc(var(--internal-reflection-opacity) * ${i})`);
	};

	// Initial set (use current quality)
	try {
		const q0 = frameRateController.getCurrentQuality?.() ?? 1;
		setVars(deviceModifier(qualityToIntensity(q0)));
	} catch {
		setVars(1);
	}

	// Subscribe to future changes
	const unsubQuality = frameRateController.subscribeQuality((q) => {
		setVars(deviceModifier(qualityToIntensity(q)));
	});

	return () => {
		try {
			unsubQuality?.();
		} catch {
			/* noop */
		}
	};
}

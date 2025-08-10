// src/lib/actions/fx-tuner.ts
import { browser } from '$app/environment';
import { frameRateController } from '$lib/utils/frame-rate-controller';

type FxTunerOptions = {
	// If true, listen to frameRateController quality and map → intensity
	followQuality?: boolean;

	// Map quality (0..1) → fx intensity (0.3..1.35 typical). If omitted, uses a smoothstep curve.
	qualityToIntensity?: (q: number) => number;

	// Manual overrides (win over quality when provided)
	intensity?: number; // global glass intensity (0..1.35)
	animSpeed?: number; // motion multiplier for subtlety (0.5..1.2)
	blurMult?: number; // blur multiplier (0.6..1.3)

	// Star visibility (applied as CSS filter to the starfield canvas)
	starContrast?: number; // 1 = neutral, 1.15..1.4 = punchier stars
	starBrightness?: number; // 1 = neutral, 0.9..1.2 typical
	starAlphaBoost?: number; // multiplies canvas global visual opacity via CSS (0.6..1.4)

	// Optional: temporarily boost stars on hover/focus for accessibility
	hoverBoost?: { contrast?: number; brightness?: number; alpha?: number };

	// Where to write CSS vars (default: <html>)
	target?: HTMLElement | Document;
};

function clamp(n: number, a: number, b: number) {
	return Math.max(a, Math.min(b, n));
}

function setVar(el: HTMLElement, name: string, value: number | string | null | undefined) {
	if (value == null) return;
	el.style.setProperty(name, String(value));
}

export function fxTuner(node: HTMLElement, options: FxTunerOptions = {}) {
	if (!browser) return { update: () => {}, destroy: () => {} };

	const targetEl = (options.target as HTMLElement) || (document.documentElement as HTMLElement);

	const hover = { active: false };
	let unsubQuality: null | (() => void) = null;

	const qualityToIntensity =
		options.qualityToIntensity ||
		((q: number) => {
			// Normalize q (your controller typically yields 0.4..1.0)
			const t = clamp((q - 0.4) / (1.0 - 0.4), 0, 1);
			// Smoothstep for gentler low-end
			const eased = t * t * (3 - 2 * t);
			// Map to visual window (subtle 0.55 → bold 1.2)
			return 0.55 + eased * (1.2 - 0.55);
		});

	function apply(
		vars: Required<Omit<FxTunerOptions, 'qualityToIntensity' | 'followQuality' | 'target'>>
	) {
		const i = clamp(vars.intensity, 0.3, 1.35);
		const spd = clamp(vars.animSpeed, 0.5, 1.2);
		const blur = clamp(vars.blurMult, 0.6, 1.3);

		// Glass master knobs (match what we wired earlier)
		setVar(targetEl, '--fx-intensity', i);
		setVar(targetEl, '--fx-anim-speed', spd);
		setVar(targetEl, '--fx-blur-mult', blur);

		// Star visibility knobs (used by CSS below)
		const c = clamp(vars.starContrast, 0.6, 2);
		const b = clamp(vars.starBrightness, 0.6, 1.6);
		const a = clamp(vars.starAlphaBoost, 0.2, 2);
		setVar(targetEl, '--star-contrast', c);
		setVar(targetEl, '--star-brightness', b);
		setVar(targetEl, '--star-alpha', a);
	}

	function currentDefaults(): Required<
		Omit<FxTunerOptions, 'qualityToIntensity' | 'followQuality' | 'target'>
	> {
		// Source intensity either from manual override or quality
		let intensity =
			options.intensity ?? qualityToIntensity(frameRateController.getCurrentQuality?.() ?? 1);

		// If following quality is disabled and no manual intensity provided, fall back to 1
		if (options.followQuality === false && options.intensity == null) {
			intensity = 1;
		}

		return {
			intensity,
			animSpeed: options.animSpeed ?? 1,
			blurMult: options.blurMult ?? 1,
			starContrast: options.starContrast ?? 1.2,
			starBrightness: options.starBrightness ?? 1.05,
			starAlphaBoost: options.starAlphaBoost ?? 1.0,
			hoverBoost: options.hoverBoost ?? { contrast: 1.1, brightness: 1.05, alpha: 1.0 }
		};
	}

	function applyWithHoverState() {
		const base = currentDefaults();
		if (hover.active && base.hoverBoost) {
			base.starContrast *= base.hoverBoost.contrast ?? 1;
			base.starBrightness *= base.hoverBoost.brightness ?? 1;
			base.starAlphaBoost *= base.hoverBoost.alpha ?? 1;
		}
		apply(base);
	}

	// Initial paint
	applyWithHoverState();

	// Optional quality follower
	if (options.followQuality !== false) {
		unsubQuality = frameRateController.subscribeQuality(() => applyWithHoverState());
	}

	// Accessibility/UX: hover/focus boost (optional)
	const onEnter = () => {
		hover.active = true;
		applyWithHoverState();
	};
	const onLeave = () => {
		hover.active = false;
		applyWithHoverState();
	};
	if (options.hoverBoost) {
		node.addEventListener('pointerenter', onEnter, { passive: true });
		node.addEventListener('pointerleave', onLeave, { passive: true });
		node.addEventListener('focusin', onEnter);
		node.addEventListener('focusout', onLeave);
	}

	return {
		update(newOpts: FxTunerOptions) {
			options = newOpts || {};
			applyWithHoverState();
		},
		destroy() {
			unsubQuality?.();
			if (options.hoverBoost) {
				node.removeEventListener('pointerenter', onEnter);
				node.removeEventListener('pointerleave', onLeave);
				node.removeEventListener('focusin', onEnter);
				node.removeEventListener('focusout', onLeave);
			}
		}
	};
}

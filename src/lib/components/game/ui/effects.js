/**
 * @fileoverview UIEffects - UI effect rendering and management
 * @module src/lib/components/game/ui/effects.js
 * @requires src/lib/components/game/managers/gameManager.js
 */

import { GameManager } from '../managers/gameManager.js';

/**
 * @class UIEffects
 * @description Manages and renders UI effects like screen shake, flashes, fade transitions, and scan lines
 * @implements {CleanupInterface}
 */
export default class UIEffects {
	/**
	 * @constructor
	 * @param {CanvasRenderingContext2D} ctx - The canvas context
	 */
	constructor(ctx) {
		this.ctx = ctx;
		this.activeEffects = [];
		this.scanLineOpacity = 0.1;
		this.scanLineSpacing = 4;
		this.scanLineColor = 'rgba(0, 0, 0, 0.1)';
	}

	/**
	 * @method update
	 * @description Updates all active effects
	 * @param {number} dt - Delta time since last update
	 */
	update(dt) {
		for (let i = this.activeEffects.length - 1; i >= 0; i--) {
			const effect = this.activeEffects[i];
			effect.update(dt);
			if (effect.isComplete()) {
				effect.cleanup();
				this.activeEffects.splice(i, 1);
			}
		}
	}

	/**
	 * @method render
	 * @description Renders all active effects
	 */
	render() {
		for (const effect of this.activeEffects) {
			effect.render(this.ctx);
		}
		this.renderScanLines();
	}

	/**
	 * @method shake
	 * @description Initiates a screen shake effect
	 * @param {number} duration - Duration of the shake effect in milliseconds
	 * @param {number} intensity - Intensity of the shake effect
	 */
	shake(duration, intensity) {
		try {
			this.activeEffects.push(new ShakeEffect(this.ctx, duration, intensity));
		} catch (error) {
			console.error('[UIEffects] Failed to initiate shake effect:', error);
		}
	}

	/**
	 * @method flash
	 * @description Initiates a screen flash effect
	 * @param {string} color - Color of the flash effect
	 * @param {number} duration - Duration of the flash effect in milliseconds
	 */
	flash(color, duration) {
		try {
			this.activeEffects.push(new FlashEffect(this.ctx, color, duration));
		} catch (error) {
			console.error('[UIEffects] Failed to initiate flash effect:', error);
		}
	}

	/**
	 * @method fade
	 * @description Initiates a fade transition effect
	 * @param {string} type - Type of the fade effect ('in' or 'out')
	 * @param {string} color - Color of the fade effect
	 * @param {number} duration - Duration of the fade effect in milliseconds
	 */
	fade(type, color, duration) {
		try {
			this.activeEffects.push(new FadeEffect(this.ctx, type, color, duration));
		} catch (error) {
			console.error('[UIEffects] Failed to initiate fade effect:', error);
		}
	}

	/**
	 * @method renderScanLines
	 * @description Renders scan line effect over the screen
	 */
	renderScanLines() {
		const { width, height } = this.ctx.canvas;
		this.ctx.fillStyle = this.scanLineColor;
		for (let y = 0; y < height; y += this.scanLineSpacing) {
			this.ctx.fillRect(0, y, width, 1);
		}
	}

	/**
	 * @method setScanLineOpacity
	 * @description Sets the opacity of the scan line effect
	 * @param {number} opacity - Opacity of the scan lines (0-1)
	 */
	setScanLineOpacity(opacity) {
		this.scanLineOpacity = Math.min(Math.max(opacity, 0), 1);
		this.scanLineColor = `rgba(0, 0, 0, ${this.scanLineOpacity})`;
	}

	/**
	 * @method setScanLineSpacing
	 * @description Sets the spacing between scan lines
	 * @param {number} spacing - Spacing between scan lines in pixels
	 */
	setScanLineSpacing(spacing) {
		this.scanLineSpacing = Math.max(spacing, 1);
	}

	/**
	 * @method cleanup
	 * @description Cleans up all active effects and resets the module state
	 */
	cleanup() {
		for (const effect of this.activeEffects) {
			effect.cleanup();
		}
		this.activeEffects = [];
	}
}

/**
 * @class ShakeEffect
 * @description Represents a screen shake effect
 */
class ShakeEffect {
	/**
	 * @constructor
	 * @param {CanvasRenderingContext2D} ctx - The canvas context
	 * @param {number} duration - Duration of the shake effect in milliseconds
	 * @param {number} intensity - Intensity of the shake effect
	 */
	constructor(ctx, duration, intensity) {
		this.ctx = ctx;
		this.duration = duration;
		this.intensity = intensity;
		this.startTime = Date.now();
		this.originalTransform = ctx.getTransform();
	}

	/**
	 * @method update
	 * @description Updates the shake effect
	 * @param {number} dt - Delta time since last update
	 */
	update(dt) {
		const elapsed = Date.now() - this.startTime;
		const progress = elapsed / this.duration;
		if (progress < 1) {
			const x = (Math.random() - 0.5) * this.intensity * (1 - progress);
			const y = (Math.random() - 0.5) * this.intensity * (1 - progress);
			this.ctx.translate(x, y);
		}
	}

	/**
	 * @method render
	 * @description No-op, the shake effect is applied directly to the canvas context
	 */
	render() {}

	/**
	 * @method isComplete
	 * @description Checks if the shake effect has completed
	 * @returns {boolean} True if the effect has completed, false otherwise
	 */
	isComplete() {
		return Date.now() - this.startTime >= this.duration;
	}

	/**
	 * @method cleanup
	 * @description Restores the canvas context to its original state
	 */
	cleanup() {
		this.ctx.setTransform(this.originalTransform);
	}
}

/**
 * @class FlashEffect
 * @description Represents a screen flash effect
 */
class FlashEffect {
	/**
	 * @constructor
	 * @param {CanvasRenderingContext2D} ctx - The canvas context
	 * @param {string} color - Color of the flash effect
	 * @param {number} duration - Duration of the flash effect in milliseconds
	 */
	constructor(ctx, color, duration) {
		this.ctx = ctx;
		this.color = color;
		this.duration = duration;
		this.startTime = Date.now();
	}

	/**
	 * @method update
	 * @description Updates the flash effect
	 * @param {number} dt - Delta time since last update
	 */
	update(dt) {}

	/**
	 * @method render
	 * @description Renders the flash effect
	 */
	render() {
		const elapsed = Date.now() - this.startTime;
		const progress = elapsed / this.duration;
		if (progress < 1) {
			this.ctx.save();
			this.ctx.fillStyle = this.color;
			this.ctx.globalAlpha = 1 - progress;
			this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
			this.ctx.restore();
		}
	}

	/**
	 * @method isComplete
	 * @description Checks if the flash effect has completed
	 * @returns {boolean} True if the effect has completed, false otherwise
	 */
	isComplete() {
		return Date.now() - this.startTime >= this.duration;
	}

	/**
	 * @method cleanup
	 * @description No-op, the flash effect doesn't require cleanup
	 */
	cleanup() {}
}

/**
 * @class FadeEffect
 * @description Represents a fade transition effect
 */
class FadeEffect {
	/**
	 * @constructor
	 * @param {CanvasRenderingContext2D} ctx - The canvas context
	 * @param {string} type - Type of the fade effect ('in' or 'out')
	 * @param {string} color - Color of the fade effect
	 * @param {number} duration - Duration of the fade effect in milliseconds
	 */
	constructor(ctx, type, color, duration) {
		this.ctx = ctx;
		this.type = type;
		this.color = color;
		this.duration = duration;
		this.startTime = Date.now();
	}

	/**
	 * @method update
	 * @description Updates the fade effect
	 * @param {number} dt - Delta time since last update
	 */
	update(dt) {}

	/**
	 * @method render
	 * @description Renders the fade effect
	 */
	render() {
		const elapsed = Date.now() - this.startTime;
		const progress = elapsed / this.duration;
		this.ctx.save();
		this.ctx.fillStyle = this.color;
		this.ctx.globalAlpha = this.type === 'in' ? 1 - progress : progress;
		this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
		this.ctx.restore();
	}

	/**
	 * @method isComplete
	 * @description Checks if the fade effect has completed
	 * @returns {boolean} True if the effect has completed, false otherwise
	 */
	isComplete() {
		return Date.now() - this.startTime >= this.duration;
	}

	/**
	 * @method cleanup
	 * @description No-op, the fade effect doesn't require cleanup
	 */
	cleanup() {}
}

// Debug mode flag
const DEBUG = process.env.NODE_ENV === 'development';

/**
 * @function debugLog
 * @description Logs a message to the console if DEBUG mode is active
 * @param {...*} args - Arguments to log
 */
function debugLog(...args) {
	if (DEBUG) {
		console.log('[UIEffects]', ...args);
	}
}

/**
 * @fileoverview Animation Utilities Module - Handles sprite animations, tweens, and transitions
 * @module src/lib/components/game/effects/animations
 * @requires ../managers/assetManager
 */

const DEBUG = process.env.NODE_ENV === 'development';

/**
 * Debug logging utility
 * @param {...any} args - Arguments to log
 */
function debugLog(...args) {
	if (DEBUG) {
		console.log('[Animations]', ...args);
	}
}

/**
 * Animation timing modes
 * @enum {string}
 */
export const TimingMode = {
	FRAME_BASED: 'frame',
	TIME_BASED: 'time'
};

/**
 * Standard easing functions
 * @type {Object.<string, function>}
 */
export const Easing = {
	linear: (t) => t,
	easeInQuad: (t) => t * t,
	easeOutQuad: (t) => t * (2 - t),
	easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
	easeInCubic: (t) => t * t * t,
	easeOutCubic: (t) => --t * t * t + 1,
	easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1)
};

/**
 * @class AnimationFrame
 * @description Represents a single frame in an animation sequence
 */
class AnimationFrame {
	/**
	 * @constructor
	 * @param {number} x - X position in spritesheet
	 * @param {number} y - Y position in spritesheet
	 * @param {number} width - Frame width
	 * @param {number} height - Frame height
	 * @param {number} duration - Frame duration
	 */
	constructor(x, y, width, height, duration) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.duration = duration;
	}
}

/**
 * @class SpriteAnimation
 * @description Manages sprite-based animations
 */
class SpriteAnimation {
	/**
	 * @constructor
	 * @param {Object} config - Animation configuration
	 * @param {HTMLImageElement} config.spriteSheet - Sprite sheet image
	 * @param {AnimationFrame[]} config.frames - Animation frames
	 * @param {boolean} [config.loop=true] - Whether animation should loop
	 * @param {TimingMode} [config.timingMode=TimingMode.FRAME_BASED] - Timing mode
	 */
	constructor({ spriteSheet, frames, loop = true, timingMode = TimingMode.FRAME_BASED }) {
		this.spriteSheet = spriteSheet;
		this.frames = frames;
		this.loop = loop;
		this.timingMode = timingMode;
		this.currentFrame = 0;
		this.frameTime = 0;
		this.isPlaying = false;
		this.onComplete = null;
		this.lastFrameTime = 0;
	}

	/**
	 * Start the animation
	 * @param {function} [onComplete] - Callback when animation completes
	 */
	play(onComplete) {
		this.isPlaying = true;
		this.onComplete = onComplete;
		this.lastFrameTime = performance.now();
		debugLog('Animation started');
	}

	/**
	 * Pause the animation
	 */
	pause() {
		this.isPlaying = false;
		debugLog('Animation paused');
	}

	/**
	 * Reset the animation
	 */
	reset() {
		this.currentFrame = 0;
		this.frameTime = 0;
		debugLog('Animation reset');
	}

	/**
	 * Update the animation
	 * @param {number} deltaTime - Time since last update
	 */
	update(deltaTime) {
		if (!this.isPlaying) return;

		try {
			const currentTime = performance.now();
			const frame = this.frames[this.currentFrame];

			if (this.timingMode === TimingMode.TIME_BASED) {
				this.frameTime += currentTime - this.lastFrameTime;
			} else {
				this.frameTime += deltaTime;
			}

			if (this.frameTime >= frame.duration) {
				this.frameTime = 0;
				this.currentFrame++;

				if (this.currentFrame >= this.frames.length) {
					if (this.loop) {
						this.currentFrame = 0;
					} else {
						this.currentFrame = this.frames.length - 1;
						this.isPlaying = false;
						if (this.onComplete) this.onComplete();
					}
				}
			}

			this.lastFrameTime = currentTime;
		} catch (error) {
			console.error('[Animation] Update failed:', error);
			this.isPlaying = false;
		}
	}

	/**
	 * Draw the current frame
	 * @param {CanvasRenderingContext2D} ctx - Canvas context
	 * @param {number} x - X position to draw
	 * @param {number} y - Y position to draw
	 * @param {number} [width] - Width to draw
	 * @param {number} [height] - Height to draw
	 */
	draw(ctx, x, y, width, height) {
		try {
			const frame = this.frames[this.currentFrame];
			ctx.drawImage(
				this.spriteSheet,
				frame.x,
				frame.y,
				frame.width,
				frame.height,
				x,
				y,
				width || frame.width,
				height || frame.height
			);
		} catch (error) {
			console.error('[Animation] Draw failed:', error);
		}
	}

	/**
	 * Clean up animation resources
	 */
	cleanup() {
		this.isPlaying = false;
		this.onComplete = null;
		debugLog('Animation cleaned up');
	}
}

/**
 * @class Tween
 * @description Handles value interpolation over time
 */
class Tween {
	/**
	 * @constructor
	 * @param {Object} config - Tween configuration
	 * @param {number} config.startValue - Starting value
	 * @param {number} config.endValue - Ending value
	 * @param {number} config.duration - Duration in milliseconds
	 * @param {function} [config.easing=Easing.linear] - Easing function
	 */
	constructor({ startValue, endValue, duration, easing = Easing.linear }) {
		this.startValue = startValue;
		this.endValue = endValue;
		this.duration = duration;
		this.easing = easing;
		this.currentTime = 0;
		this.isPlaying = false;
		this.onUpdate = null;
		this.onComplete = null;
	}

	/**
	 * Start the tween
	 * @param {function} [onUpdate] - Value update callback
	 * @param {function} [onComplete] - Completion callback
	 */
	start(onUpdate, onComplete) {
		this.isPlaying = true;
		this.currentTime = 0;
		this.onUpdate = onUpdate;
		this.onComplete = onComplete;
	}

	/**
	 * Update the tween
	 * @param {number} deltaTime - Time since last update
	 */
	update(deltaTime) {
		if (!this.isPlaying) return;

		try {
			this.currentTime += deltaTime;
			let progress = Math.min(this.currentTime / this.duration, 1);
			progress = this.easing(progress);

			const currentValue = this.startValue + (this.endValue - this.startValue) * progress;

			if (this.onUpdate) {
				this.onUpdate(currentValue);
			}

			if (this.currentTime >= this.duration) {
				this.isPlaying = false;
				if (this.onComplete) this.onComplete();
			}
		} catch (error) {
			console.error('[Tween] Update failed:', error);
			this.isPlaying = false;
		}
	}

	/**
	 * Stop the tween
	 */
	stop() {
		this.isPlaying = false;
	}

	/**
	 * Clean up tween resources
	 */
	cleanup() {
		this.isPlaying = false;
		this.onUpdate = null;
		this.onComplete = null;
	}
}

/**
 * @class TransitionEffect
 * @description Handles transition effects between states
 */
class TransitionEffect {
	/**
	 * @constructor
	 * @param {Object} config - Transition configuration
	 * @param {string} config.type - Transition type
	 * @param {number} config.duration - Duration in milliseconds
	 * @param {function} [config.easing=Easing.linear] - Easing function
	 */
	constructor({ type, duration, easing = Easing.linear }) {
		this.type = type;
		this.duration = duration;
		this.easing = easing;
		this.progress = 0;
		this.isPlaying = false;
		this.onComplete = null;
		this.startTime = 0;
	}

	/**
	 * Start the transition
	 * @param {function} [onComplete] - Completion callback
	 */
	start(onComplete) {
		this.isPlaying = true;
		this.progress = 0;
		this.startTime = performance.now();
		this.onComplete = onComplete;
	}

	/**
	 * Update the transition
	 */
	update() {
		if (!this.isPlaying) return;

		try {
			const currentTime = performance.now();
			const elapsed = currentTime - this.startTime;
			this.progress = Math.min(elapsed / this.duration, 1);

			if (this.progress >= 1) {
				this.isPlaying = false;
				if (this.onComplete) this.onComplete();
			}
		} catch (error) {
			console.error('[Transition] Update failed:', error);
			this.isPlaying = false;
		}
	}

	/**
	 * Draw the transition effect
	 * @param {CanvasRenderingContext2D} ctx - Canvas context
	 */
	draw(ctx) {
		if (!this.isPlaying) return;

		try {
			const easedProgress = this.easing(this.progress);

			switch (this.type) {
				case 'fade':
					ctx.fillStyle = `rgba(0, 0, 0, ${easedProgress})`;
					ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
					break;
				case 'wipe':
					ctx.fillStyle = 'black';
					ctx.fillRect(0, 0, ctx.canvas.width * easedProgress, ctx.canvas.height);
					break;
				// Add more transition types as needed
			}
		} catch (error) {
			console.error('[Transition] Draw failed:', error);
		}
	}

	/**
	 * Clean up transition resources
	 */
	cleanup() {
		this.isPlaying = false;
		this.onComplete = null;
	}
}

/**
 * Animation helper functions
 */
export const AnimationHelpers = {
	/**
	 * Create a sprite sheet animation
	 * @param {Object} config - Animation configuration
	 * @returns {SpriteAnimation}
	 */
	createSpriteAnimation: (config) => new SpriteAnimation(config),

	/**
	 * Create a tween
	 * @param {Object} config - Tween configuration
	 * @returns {Tween}
	 */
	createTween: (config) => new Tween(config),

	/**
	 * Create a transition effect
	 * @param {Object} config - Transition configuration
	 * @returns {TransitionEffect}
	 */
	createTransition: (config) => new TransitionEffect(config),

	/**
	 * Create an animation frame
	 * @param {Object} config - Frame configuration
	 * @returns {AnimationFrame}
	 */
	createFrame: (config) =>
		new AnimationFrame(config.x, config.y, config.width, config.height, config.duration)
};

// Export classes and utilities
export { SpriteAnimation, Tween, TransitionEffect, AnimationFrame };

export default {
	SpriteAnimation,
	Tween,
	TransitionEffect,
	AnimationFrame,
	Easing,
	TimingMode,
	AnimationHelpers
};

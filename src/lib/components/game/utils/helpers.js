/**
 * @fileoverview Helpers - Utility functions and common helpers for the game.
 * @module src/lib/components/game/utils/helpers.js
 * @requires module:src/lib/components/game/constants.js
 */

import { DEBUG_MODE as DEBUG } from '../constants.js';

/**
 * Checks if a value is of a specific type.
 * @param {*} value - The value to check.
 * @param {string} type - The expected type.
 * @returns {boolean} True if the value is of the specified type, false otherwise.
 */
export function isType(value, type) {
	try {
		return typeof value === type;
	} catch (error) {
		console.error('[Helpers] isType failed:', error);
		return false;
	}
}

/**
 * Checks if a value is an object.
 * @param {*} value - The value to check.
 * @returns {boolean} True if the value is an object, false otherwise.
 */
export function isObject(value) {
	try {
		return typeof value === 'object' && value !== null;
	} catch (error) {
		console.error('[Helpers] isObject failed:', error);
		return false;
	}
}

/**
 * Checks if a value is an array.
 * @param {*} value - The value to check.
 * @returns {boolean} True if the value is an array, false otherwise.
 */
export function isArray(value) {
	try {
		return Array.isArray(value);
	} catch (error) {
		console.error('[Helpers] isArray failed:', error);
		return false;
	}
}

/**
 * Clones an object deeply.
 * @param {Object} obj - The object to clone.
 * @returns {Object} A deep clone of the object.
 */
export function deepClone(obj) {
	try {
		return JSON.parse(JSON.stringify(obj));
	} catch (error) {
		console.error('[Helpers] deepClone failed:', error);
		return {};
	}
}

/**
 * Merges multiple objects into a target object.
 * @param {Object} target - The target object to merge into.
 * @param {...Object} sources - The source objects to merge from.
 * @returns {Object} The merged object.
 */
export function merge(target, ...sources) {
	try {
		return sources.reduce((acc, source) => {
			Object.keys(source).forEach((key) => {
				if (isObject(acc[key]) && isObject(source[key])) {
					acc[key] = merge(acc[key], source[key]);
				} else {
					acc[key] = source[key];
				}
			});
			return acc;
		}, deepClone(target));
	} catch (error) {
		console.error('[Helpers] merge failed:', error);
		return target;
	}
}

/**
 * Shuffles an array in place using the Fisher-Yates algorithm.
 * @param {Array} array - The array to shuffle.
 * @returns {Array} The shuffled array.
 */
export function shuffle(array) {
	try {
		for (let i = array.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[array[i], array[j]] = [array[j], array[i]];
		}
		return array;
	} catch (error) {
		console.error('[Helpers] shuffle failed:', error);
		return array;
	}
}

/**
 * Removes an item from an array.
 * @param {Array} array - The array to remove from.
 * @param {*} item - The item to remove.
 * @returns {Array} The updated array.
 */
export function removeFromArray(array, item) {
	try {
		const index = array.indexOf(item);
		if (index > -1) {
			array.splice(index, 1);
		}
		return array;
	} catch (error) {
		console.error('[Helpers] removeFromArray failed:', error);
		return array;
	}
}

/**
 * Clamps a number between a minimum and maximum value.
 * @param {number} value - The value to clamp.
 * @param {number} min - The minimum value.
 * @param {number} max - The maximum value.
 * @returns {number} The clamped value.
 */
export function clamp(value, min, max) {
	try {
		return Math.min(Math.max(value, min), max);
	} catch (error) {
		console.error('[Helpers] clamp failed:', error);
		return value;
	}
}

/**
 * Maps a value from one range to another.
 * @param {number} value - The value to map.
 * @param {number} inMin - The minimum of the input range.
 * @param {number} inMax - The maximum of the input range.
 * @param {number} outMin - The minimum of the output range.
 * @param {number} outMax - The maximum of the output range.
 * @returns {number} The mapped value.
 */
export function mapRange(value, inMin, inMax, outMin, outMax) {
	try {
		return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
	} catch (error) {
		console.error('[Helpers] mapRange failed:', error);
		return value;
	}
}

/**
 * Wraps an error with a custom message while preserving the stack trace.
 * @param {Error} error - The original error.
 * @param {string} message - The custom error message.
 * @returns {Error} The wrapped error.
 */
export function wrapError(error, message) {
	try {
		const wrappedError = new Error(message);
		wrappedError.stack = error.stack;
		return wrappedError;
	} catch (wrapError) {
		console.error('[Helpers] wrapError failed:', wrapError);
		return error;
	}
}

/**
 * Logs a debug message if the DEBUG flag is set.
 * @param {...*} args - The values to log.
 */
export function debugLog(...args) {
	if (DEBUG) {
		console.log('[Helpers]', ...args);
	}
}

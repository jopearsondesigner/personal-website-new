/**
 * @fileoverview Math Utilities - Provides mathematical functions and utilities for the game
 * @module src/lib/components/game/utils/math.js
 * @requires constants
 */

import { DEBUG, EPSILON } from '../constants';

/**
 * @function lerp
 * @description Linearly interpolates between two values
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} Interpolated value
 */
export function lerp(a, b, t) {
	return a + (b - a) * t;
}

/**
 * @function clamp
 * @description Clamps a value between a minimum and maximum
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
	return Math.min(Math.max(value, min), max);
}

/**
 * @function randomRange
 * @description Generates a random number between min and max (inclusive)
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random value
 */
export function randomRange(min, max) {
	return Math.random() * (max - min) + min;
}

/**
 * @function randomInt
 * @description Generates a random integer between min and max (inclusive)
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random integer
 */
export function randomInt(min, max) {
	return Math.floor(randomRange(min, max + 1));
}

/**
 * @function degToRad
 * @description Converts degrees to radians
 * @param {number} degrees - Angle in degrees
 * @returns {number} Angle in radians
 */
export function degToRad(degrees) {
	return degrees * (Math.PI / 180);
}

/**
 * @function radToDeg
 * @description Converts radians to degrees
 * @param {number} radians - Angle in radians
 * @returns {number} Angle in degrees
 */
export function radToDeg(radians) {
	return radians * (180 / Math.PI);
}

/**
 * @function angleToVector
 * @description Converts an angle to a unit vector
 * @param {number} angle - Angle in radians
 * @returns {{x: number, y: number}} Unit vector
 */
export function angleToVector(angle) {
	return {
		x: Math.cos(angle),
		y: Math.sin(angle)
	};
}

/**
 * @function vectorToAngle
 * @description Converts a vector to an angle
 * @param {{x: number, y: number}} vector - Input vector
 * @returns {number} Angle in radians
 */
export function vectorToAngle(vector) {
	return Math.atan2(vector.y, vector.x);
}

/**
 * @function magnitude
 * @description Calculates the magnitude of a vector
 * @param {{x: number, y: number}} vector - Input vector
 * @returns {number} Magnitude
 */
export function magnitude(vector) {
	return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
}

/**
 * @function normalize
 * @description Normalizes a vector
 * @param {{x: number, y: number}} vector - Input vector
 * @returns {{x: number, y: number}} Normalized vector
 */
export function normalize(vector) {
	const mag = magnitude(vector);
	if (mag === 0) {
		return { x: 0, y: 0 };
	}
	return {
		x: vector.x / mag,
		y: vector.y / mag
	};
}

/**
 * @function distance
 * @description Calculates the distance between two points
 * @param {{x: number, y: number}} pointA - First point
 * @param {{x: number, y: number}} pointB - Second point
 * @returns {number} Distance
 */
export function distance(pointA, pointB) {
	const dx = pointB.x - pointA.x;
	const dy = pointB.y - pointA.y;
	return Math.sqrt(dx * dx + dy * dy);
}

/**
 * @function circleCollision
 * @description Checks if two circles are colliding
 * @param {{x: number, y: number, radius: number}} circleA - First circle
 * @param {{x: number, y: number, radius: number}} circleB - Second circle
 * @returns {boolean} True if colliding, false otherwise
 */
export function circleCollision(circleA, circleB) {
	const distSq = distance(circleA, circleB);
	const radiiSum = circleA.radius + circleB.radius;
	return distSq <= radiiSum * radiiSum;
}

/**
 * @function rectCollision
 * @description Checks if two rectangles are colliding
 * @param {{x: number, y: number, width: number, height: number}} rectA - First rectangle
 * @param {{x: number, y: number, width: number, height: number}} rectB - Second rectangle
 * @returns {boolean} True if colliding, false otherwise
 */
export function rectCollision(rectA, rectB) {
	return (
		rectA.x < rectB.x + rectB.width &&
		rectA.x + rectA.width > rectB.x &&
		rectA.y < rectB.y + rectB.height &&
		rectA.y + rectA.height > rectB.y
	);
}

/**
 * @function rotatePoint
 * @description Rotates a point around an origin by an angle
 * @param {{x: number, y: number}} point - Point to rotate
 * @param {{x: number, y: number}} origin - Origin point
 * @param {number} angle - Angle in radians
 * @returns {{x: number, y: number}} Rotated point
 */
export function rotatePoint(point, origin, angle) {
	const s = Math.sin(angle);
	const c = Math.cos(angle);
	const dx = point.x - origin.x;
	const dy = point.y - origin.y;
	return {
		x: dx * c - dy * s + origin.x,
		y: dx * s + dy * c + origin.y
	};
}

/**
 * @function debugDrawPoint
 * @description Draws a debug point on the canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {{x: number, y: number}} point - Point to draw
 * @param {string} [color='red'] - Color of the point
 * @param {number} [size=2] - Size of the point
 */
export function debugDrawPoint(ctx, point, color = 'red', size = 2) {
	if (DEBUG) {
		ctx.save();
		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}
}

/**
 * @function debugDrawLine
 * @description Draws a debug line on the canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {{x: number, y: number}} startPoint - Start point of the line
 * @param {{x: number, y: number}} endPoint - End point of the line
 * @param {string} [color='green'] - Color of the line
 * @param {number} [width=1] - Width of the line
 */
export function debugDrawLine(ctx, startPoint, endPoint, color = 'green', width = 1) {
	if (DEBUG) {
		ctx.save();
		ctx.strokeStyle = color;
		ctx.lineWidth = width;
		ctx.beginPath();
		ctx.moveTo(startPoint.x, startPoint.y);
		ctx.lineTo(endPoint.x, endPoint.y);
		ctx.stroke();
		ctx.restore();
	}
}

/**
 * @function debugDrawRect
 * @description Draws a debug rectangle on the canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {{x: number, y: number, width: number, height: number}} rect - Rectangle to draw
 * @param {string} [color='blue'] - Color of the rectangle
 * @param {number} [lineWidth=1] - Width of the rectangle lines
 */
export function debugDrawRect(ctx, rect, color = 'blue', lineWidth = 1) {
	if (DEBUG) {
		ctx.save();
		ctx.strokeStyle = color;
		ctx.lineWidth = lineWidth;
		ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
		ctx.restore();
	}
}

/**
 * @function debugDrawCircle
 * @description Draws a debug circle on the canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {{x: number, y: number, radius: number}} circle - Circle to draw
 * @param {string} [color='magenta'] - Color of the circle
 * @param {number} [lineWidth=1] - Width of the circle line
 */
export function debugDrawCircle(ctx, circle, color = 'magenta', lineWidth = 1) {
	if (DEBUG) {
		ctx.save();
		ctx.strokeStyle = color;
		ctx.lineWidth = lineWidth;
		ctx.beginPath();
		ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
		ctx.stroke();
		ctx.restore();
	}
}

/**
 * @function approxEquals
 * @description Checks if two values are approximately equal within a tolerance
 * @param {number} a - First value
 * @param {number} b - Second value
 * @param {number} [epsilon=EPSILON] - Tolerance value
 * @returns {boolean} True if approximately equal, false otherwise
 */
export function approxEquals(a, b, epsilon = EPSILON) {
	return Math.abs(a - b) <= epsilon;
}

// src/lib/components/game/constants.js

/**
 * Game states
 * @type {Object}
 */
export const a	GAME_STATES = Object.freeze({
	TITLE: 'title',
	PLAY: 'play',
	GAME_OVER: 'gameOver'
	// Add more game states as needed
});

/**
 * Initial game state
 * @type {string}
 */
export const INITIAL_STATE = GAME_STATES.TITLE;

/**
 * @typedef {Object} GameConfig
 * @property {number} CANVAS_WIDTH - Game canvas width
 * @property {number} CANVAS_HEIGHT - Game canvas height
 * @property {number} FPS - Target frames per second
 * @property {number} FRAME_DURATION - Frame duration in milliseconds
 */

/**
 * Game configuration constants
 * @type {GameConfig}
 */
export const GAME_CONFIG = Object.freeze({
	CANVAS_WIDTH: 800,
	CANVAS_HEIGHT: 600,
	FPS: 60,
	FRAME_DURATION: 1000 / 60
});

/**
 * NES color palette constants
 * @type {Object}
 */
export const NES_PALETTE = Object.freeze({
	BLACK: '#000000',
	WHITE: '#FFFFFF',
	RED: '#FF0000',
	BLUE: '#0000FF',
	GREEN: '#00FF00',
	YELLOW: '#FFFF00',
	MAGENTA: '#FF00FF',
	CYAN: '#00FFFF',
	ORANGE: '#FFA500',
	PURPLE: '#800080',
	LIME: '#00FF00',
	PINK: '#FFC0CB',
	TEAL: '#008080',
	LAVENDER: '#E6E6FA',
	BROWN: '#A52A2A',
	BEIGE: '#F5F5DC',
	MAROON: '#800000',
	MINT: '#98FB98',
	OLIVE: '#808000',
	CORAL: '#FF7F50',
	NAVY: '#000080',
	GREY: '#808080',
	TURQUOISE: '#40E0D0',
	INDIGO: '#4B0082'
});

/**
 * Physics constants
 * @type {Object}
 */
export const PHYSICS = Object.freeze({
	GRAVITY: 0.5,
	PLAYER_SPEED: 4,
	PLAYER_JUMP_SPEED: 10,
	PLAYER_JUMP_DURATION: 300,
	PLAYER_INVINCIBLE_DURATION: 1000,
	ENEMY_SPEED: 2,
	ENEMY_SEEK_SPEED: 3,
	ENEMY_ATTACK_SPEED: 4,
	PROJECTILE_SPEED: 8,
	PROJECTILE_LIFETIME: 2000,
	PARTICLE_SPEED: 1,
	PARTICLE_LIFETIME: 1000
});

/**
 * Asset manifest
 * @type {Object}
 */
export const ASSET_MANIFEST = Object.freeze({
	PLAYER_SPRITE: 'assets/images/game/vela_main_sprite.png',
	ENEMY_SPRITE: 'assets/images/game/void_swarm_sprite.png',
	PROJECTILE_SPRITE: 'assets/images/game/projectile_main_sprite.png',
	PARTICLE_SPRITE: 'assets/images/game/particle_sprite.png',
	BACKGROUND_IMAGE: 'assets/images/game/background.png',
	FONT_FAMILY: '"Press Start 2P", cursive'
});

/**
 * Cooldown timers and intervals
 * @type {Object}
 */
export const COOLDOWNS = Object.freeze({
	PLAYER_SHOOT_COOLDOWN: 200,
	ENEMY_SHOOT_COOLDOWN: 1000,
	POWER_UP_DURATION: 5000,
	ENEMY_SPAWN_INTERVAL: 2000,
	ENEMY_ATTACK_INTERVAL: 3000,
	PARTICLE_EMIT_INTERVAL: 100
});

/**
 * Power-up configurations
 * @type {Object}
 */
export const POWER_UPS = Object.freeze({
	HEALTH_RESTORE: 50,
	SPEED_BOOST: 1.5,
	ATTACK_BOOST: 2,
	SHIELD_DURATION: 10000,
	EXTRA_LIFE: 1
});

/**
 * Collision parameters
 * @type {Object}
 */
export const COLLISIONS = Object.freeze({
	PLAYER_HITBOX_PADDING: 10,
	ENEMY_HITBOX_PADDING: 5,
	PROJECTILE_HITBOX_PADDING: 3,
	PARTICLE_HITBOX_PADDING: 2
});

/**
 * Spawn rates and timers
 * @type {Object}
 */
export const SPAWNS = Object.freeze({
	ENEMY_SPAWN_INTERVAL: 2000,
	POWER_UP_SPAWN_CHANCE: 0.1,
	POWER_UP_SPAWN_INTERVAL: 10000,
	ENEMY_SPAWN_INCREASE_INTERVAL: 30000,
	ENEMY_SPAWN_INCREASE_AMOUNT: 0.1
});

/**
 * Score and progression constants
 * @type {Object}
 */
export const SCORING = Object.freeze({
	ENEMY_KILL_SCORE: 100,
	POWER_UP_COLLECT_SCORE: 500,
	LEVEL_COMPLETE_SCORE: 1000,
	LEVEL_COMPLETE_THRESHOLD: 1000,
	DIFFICULTY_INCREASE_INTERVAL: 60000,
	DIFFICULTY_INCREASE_AMOUNT: 0.1
});

/**
 * Debug mode flag
 * @type {boolean}
 */
export const DEBUG_MODE = process.env.NODE_ENV === 'development';

/**
 * Canvas dimensions
 * @type {Object}
 */
export const CANVAS = Object.freeze({
	CANVAS_WIDTH: 800,
	CANVAS_HEIGHT: 600
});

/**
 * Target frames per second
 * @type {number}
 */
export const TARGET_FPS = 60;

/**
 * Debug logging function
 * @param {...*} args - Arguments to log
 */
export function debugLog(...args) {
	if (DEBUG_MODE) {
		console.log('[Constants]', ...args);
	}
}

/**
 * Error handling function
 * @param {string} operation - Operation name
 * @param {Error} error - Error object
 */
export function handleError(operation, error) {
	console.error(`[Constants] ${operation} failed:`, error);
}

/**
 * Key bindings
 * @type {Object}
 */
export const KEY_BINDINGS = Object.freeze({
	pause: ['p', 'P'],
	shoot: [' '],
	left: ['ArrowLeft'],
	right: ['ArrowRight'],
	jump: ['ArrowUp'],
	dash: ['Shift'],
	specialShoot: ['x', 'X'],
	keyCombination: ['U', 'P'] // Example key combination for activating power-ups
});

/**
 * Gamepad bindings
 * @type {Object}
 */
export const GAMEPAD_BINDINGS = Object.freeze({
	// Add gamepad binding entries here if applicable
	// For example:
	// pause: 9, // Assuming button index 9 is used for pausing the game
	// shoot: 0, // Assuming button index 0 is used for shooting
	// ...
});

/**
 * HUD margin
 * @type {number}
 */
export const HUD_MARGIN = 10;

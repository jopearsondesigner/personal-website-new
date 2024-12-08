/**
 * @fileoverview InputManager - Handles all input events and states for the game
 * @module managers/inputManager
 * @requires constants, utils/helpers
 */

import { KEY_BINDINGS, GAMEPAD_BINDINGS } from '../constants.js';
import { debugLog } from '../utils/helpers.js';

/**
 * @class InputManager
 * @description Manages all input events and states for the game
 */
export default class InputManager {
	constructor() {
		this.keyStates = new Map();
		this.mouseStates = { x: 0, y: 0, clicked: false };
		this.touchStates = { active: false, x: 0, y: 0 };
		this.gamepadStates = new Map();
		this.inputBuffer = [];

		this.setupEventListeners();
	}

	setupEventListeners() {
		// Keyboard events
		window.addEventListener('keydown', this.handleKeyDown.bind(this));
		window.addEventListener('keyup', this.handleKeyUp.bind(this));

		// Mouse events
		window.addEventListener('mousemove', this.handleMouseMove.bind(this));
		window.addEventListener('mousedown', this.handleMouseDown.bind(this));
		window.addEventListener('mouseup', this.handleMouseUp.bind(this));

		// Touch events
		window.addEventListener('touchstart', this.handleTouchStart.bind(this));
		window.addEventListener('touchmove', this.handleTouchMove.bind(this));
		window.addEventListener('touchend', this.handleTouchEnd.bind(this));

		// Gamepad events
		window.addEventListener('gamepadconnected', this.handleGamepadConnected.bind(this));
		window.addEventListener('gamepaddisconnected', this.handleGamepadDisconnected.bind(this));
	}

	/**
	 * @method handleKeyDown
	 * @param {KeyboardEvent} event - The keydown event
	 */
	handleKeyDown(event) {
		const key = event.key.toLowerCase();
		this.keyStates.set(key, true);
		this.inputBuffer.push({ type: 'keydown', key });

		if (KEY_BINDINGS.pause.includes(key)) {
			event.preventDefault();
		}
	}

	/**
	 * @method handleKeyUp
	 * @param {KeyboardEvent} event - The keyup event
	 */
	handleKeyUp(event) {
		const key = event.key.toLowerCase();
		this.keyStates.set(key, false);
		this.inputBuffer.push({ type: 'keyup', key });
	}

	/**
	 * @method handleMouseMove
	 * @param {MouseEvent} event - The mousemove event
	 */
	handleMouseMove(event) {
		this.mouseStates.x = event.clientX;
		this.mouseStates.y = event.clientY;
	}

	/**
	 * @method handleMouseDown
	 * @param {MouseEvent} event - The mousedown event
	 */
	handleMouseDown(event) {
		this.mouseStates.clicked = true;
		this.inputBuffer.push({ type: 'mousedown', button: event.button });
	}

	/**
	 * @method handleMouseUp
	 * @param {MouseEvent} event - The mouseup event
	 */
	handleMouseUp(event) {
		this.mouseStates.clicked = false;
		this.inputBuffer.push({ type: 'mouseup', button: event.button });
	}

	/**
	 * @method handleTouchStart
	 * @param {TouchEvent} event - The touchstart event
	 */
	handleTouchStart(event) {
		event.preventDefault();
		const touch = event.changedTouches[0];
		this.touchStates.active = true;
		this.touchStates.x = touch.clientX;
		this.touchStates.y = touch.clientY;
		this.inputBuffer.push({ type: 'touchstart', x: touch.clientX, y: touch.clientY });
	}

	/**
	 * @method handleTouchMove
	 * @param {TouchEvent} event - The touchmove event
	 */
	handleTouchMove(event) {
		event.preventDefault();
		const touch = event.changedTouches[0];
		this.touchStates.x = touch.clientX;
		this.touchStates.y = touch.clientY;
	}

	/**
	 * @method handleTouchEnd
	 * @param {TouchEvent} event - The touchend event
	 */
	handleTouchEnd(event) {
		event.preventDefault();
		this.touchStates.active = false;
		this.inputBuffer.push({ type: 'touchend' });
	}

	/**
	 * @method handleGamepadConnected
	 * @param {GamepadEvent} event - The gamepadconnected event
	 */
	handleGamepadConnected(event) {
		const gamepad = event.gamepad;
		this.gamepadStates.set(gamepad.index, gamepad);
		debugLog(`Gamepad ${gamepad.id} connected`);
	}

	/**
	 * @method handleGamepadDisconnected
	 * @param {GamepadEvent} event - The gamepaddisconnected event
	 */
	handleGamepadDisconnected(event) {
		const gamepad = event.gamepad;
		this.gamepadStates.delete(gamepad.index);
		debugLog(`Gamepad ${gamepad.id} disconnected`);
	}

	/**
	 * @method getKeyState
	 * @param {string} key - The key to check
	 * @returns {boolean} The state of the key
	 */
	getKeyState(key) {
		return this.keyStates.get(key) || false;
	}

	/**
	 * @method getMouseState
	 * @returns {object} The mouse state object
	 */
	getMouseState() {
		return this.mouseStates;
	}

	/**
	 * @method getTouchState
	 * @returns {object} The touch state object
	 */
	getTouchState() {
		return this.touchStates;
	}

	/**
	 * @method getGamepadState
	 * @param {number} index - The index of the gamepad
	 * @returns {Gamepad|null} The gamepad state object or null if not connected
	 */
	getGamepadState(index) {
		return this.gamepadStates.get(index) || null;
	}

	/**
	 * @method processInputBuffer
	 * @description Processes the input buffer and emits input events
	 */
	processInputBuffer() {
		while (this.inputBuffer.length > 0) {
			const inputEvent = this.inputBuffer.shift();
			this.emit('input', inputEvent);
		}
	}

	/**
	 * @method update
	 * @description Updates the input manager state
	 */
	update() {
		this.processInputBuffer();
		this.pollGamepads();
	}

	/**
	 * @method pollGamepads
	 * @description Polls connected gamepads for input
	 */
	pollGamepads() {
		const gamepads = navigator.getGamepads();
		for (let i = 0; i < gamepads.length; i++) {
			const gamepad = gamepads[i];
			if (gamepad) {
				this.processGamepadInput(gamepad);
			}
		}
	}

	/**
	 * @method processGamepadInput
	 * @param {Gamepad} gamepad - The gamepad to process
	 */
	processGamepadInput(gamepad) {
		gamepad.buttons.forEach((button, index) => {
			if (button.pressed) {
				const bindingName = GAMEPAD_BINDINGS[index];
				if (bindingName) {
					this.inputBuffer.push({ type: 'gamepad', button: bindingName });
				}
			}
		});

		for (let i = 0; i < gamepad.axes.length; i += 2) {
			const axisX = gamepad.axes[i];
			const axisY = gamepad.axes[i + 1];

			if (Math.abs(axisX) > 0.5 || Math.abs(axisY) > 0.5) {
				const direction = this.getDirectionFromAxes(axisX, axisY);
				if (direction) {
					this.inputBuffer.push({ type: 'gamepad', direction });
				}
			}
		}
	}

	/**
	 * @method getDirectionFromAxes
	 * @param {number} axisX - The x-axis value (-1 to 1)
	 * @param {number} axisY - The y-axis value (-1 to 1)
	 * @returns {string|null} The direction (up, down, left, right) or null if below threshold
	 */
	getDirectionFromAxes(axisX, axisY) {
		if (axisY < -0.5) {
			return 'up';
		} else if (axisY > 0.5) {
			return 'down';
		} else if (axisX < -0.5) {
			return 'left';
		} else if (axisX > 0.5) {
			return 'right';
		}
		return null;
	}

	/**
	 * @method isKeyPressed
	 * @param {string} key - The key to check
	 * @returns {boolean} True if the key is currently pressed
	 */
	isKeyPressed(key) {
		return this.getKeyState(key);
	}

	/**
	 * @method isMouseClicked
	 * @returns {boolean} True if the mouse is currently clicked
	 */
	isMouseClicked() {
		return this.mouseStates.clicked;
	}

	/**
	 * @method isTouchActive
	 * @returns {boolean} True if a touch is currently active
	 */
	isTouchActive() {
		return this.touchStates.active;
	}

	/**
	 * @method isGamepadButtonPressed
	 * @param {number} index - The index of the gamepad
	 * @param {string} buttonName - The name of the button
	 * @returns {boolean} True if the gamepad button is currently pressed
	 */
	isGamepadButtonPressed(index, buttonName) {
		const gamepad = this.getGamepadState(index);
		if (!gamepad) {
			return false;
		}
		const buttonIndex = Object.keys(GAMEPAD_BINDINGS).find(
			(key) => GAMEPAD_BINDINGS[key] === buttonName
		);
		return gamepad.buttons[buttonIndex]?.pressed || false;
	}

	/**
	 * @method cleanup
	 * @description Removes event listeners and resets states
	 */
	cleanup() {
		// Remove event listeners
		window.removeEventListener('keydown', this.handleKeyDown);
		window.removeEventListener('keyup', this.handleKeyUp);
		window.removeEventListener('mousemove', this.handleMouseMove);
		window.removeEventListener('mousedown', this.handleMouseDown);
		window.removeEventListener('mouseup', this.handleMouseUp);
		window.removeEventListener('touchstart', this.handleTouchStart);
		window.removeEventListener('touchmove', this.handleTouchMove);
		window.removeEventListener('touchend', this.handleTouchEnd);
		window.removeEventListener('gamepadconnected', this.handleGamepadConnected);
		window.removeEventListener('gamepaddisconnected', this.handleGamepadDisconnected);

		// Reset states
		this.keyStates.clear();
		this.mouseStates = { x: 0, y: 0, clicked: false };
		this.touchStates = { active: false, x: 0, y: 0 };
		this.gamepadStates.clear();
		this.inputBuffer = [];
	}
}

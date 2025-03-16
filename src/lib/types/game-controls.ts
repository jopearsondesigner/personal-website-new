// src/lib/types/game-controls.ts

import type { Writable } from 'svelte/store';

export interface JoystickPosition {
	x: number;
	y: number;
	zone?: MovementZone;
}

export interface TouchPosition extends JoystickPosition {
	distance: number;
}

export interface ButtonStates {
	shoot: boolean;
	missile: boolean;
	pause: boolean;
	enter: boolean;
	reset: boolean;
}

export interface KeyStates {
	ArrowLeft: boolean;
	ArrowRight: boolean;
	' ': boolean; // Space
	x: boolean;
	p: boolean;
	Enter: boolean;
}

export interface JoystickConfig {
	ZONES: {
		DEADZONE: number;
		PRECISION: number;
		STANDARD: number;
		RAPID: number;
	};
	ACCELERATION: {
		PRECISION: number;
		STANDARD: number;
		RAPID: number;
	};
	SENSITIVITY: number;
	ACCELERATION_CURVE: number;
	MAX_DISTANCE: number;
	SPRING: {
		STIFFNESS: number;
		DAMPING: number;
	};
	HAPTIC: {
		DURATION: {
			TAP: number;
			ZONE_CHANGE: number;
		};
	};
}

export interface TouchConfig {
	SAMPLING_RATE: number;
	INITIAL_DELAY: number;
	MAX_DELTA: number;
}

export type MovementZone = 'DEADZONE' | 'PRECISION' | 'STANDARD' | 'RAPID';

export type ButtonType = keyof ButtonStates;

export interface ControlEvent {
	type: 'joystick' | 'button';
	value: JoystickPosition | boolean;
	button?: ButtonType;
	zone?: MovementZone;
}

// Component Props
export interface GameControlsProps {
	menuOpen?: Writable<boolean>;
}

// Utility Types
export type HapticFeedback = (duration?: number) => void;

// Event Handler Types
export type JoystickEventHandler = (event: TouchEvent | MouseEvent) => void;
export type ButtonEventHandler = (button: ButtonType, event: TouchEvent | MouseEvent) => void;

// Component Class Types
export interface ControlsClassList {
	'controls-container': boolean;
	landscape: boolean;
}

// Component Store Types
export interface SpringStore {
	set: (value: JoystickPosition) => void;
	subscribe: (callback: (value: JoystickPosition) => void) => () => void;
	update: (fn: (value: JoystickPosition) => JoystickPosition) => void;
}

export interface PositionData {
	x: number;
	rawDistance: number;
	normalizedDistance: number;
	zone: MovementZone;
	maxDistance: number;
}

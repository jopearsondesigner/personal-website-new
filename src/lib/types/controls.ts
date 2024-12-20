// src/lib/types/controls.ts

export interface Vector2D {
	x: number;
	y: number;
}

export interface ControlPosition {
	x: number;
	y: number;
	orientation: 'portrait' | 'landscape';
}

export interface JoystickState {
	position: Vector2D;
	isActive: boolean;
	basePosition?: ControlPosition;
}

export interface ButtonState {
	isPressed: boolean;
	lastPressed?: number;
}

export interface ControlsState {
	joystick: JoystickState;
	buttons: Record<string, ButtonState>;
	isDragging: boolean;
	safeArea: {
		top: number;
		right: number;
		bottom: number;
		left: number;
	};
}

export interface ControlEvent {
	type: 'joystick' | 'button';
	button?: string;
	value: boolean | Vector2D;
}

export interface ControlsConfig {
	draggable: boolean;
	persistent: boolean;
	hapticFeedback: boolean;
	safeAreaHandling: boolean;
	buttons: Array<{
		id: string;
		label: string;
		color?: string;
		size?: 'small' | 'medium' | 'large';
	}>;
}

export interface SafeAreaInsets {
	top: number;
	right: number;
	bottom: number;
	left: number;
}

export interface TouchPoint extends Vector2D {
	id: number;
	timestamp: number;
}

export type ControlEventHandler = (event: ControlEvent) => void;

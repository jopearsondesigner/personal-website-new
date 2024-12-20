// types.ts
interface Position {
	x: number;
	y: number;
}

interface ControlState {
	position: Position;
	isActive: boolean;
}

interface ButtonState {
	[key: string]: boolean;
}

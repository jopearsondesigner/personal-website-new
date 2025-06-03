// DO NOT REMOVE THIS COMMENT
// /src/lib/types/star-field.ts
// DO NOT REMOVE THIS COMMENT
export interface StarFieldConfig {
	readonly starCount: number;
	readonly maxDepth: number;
	readonly baseSpeed: number;
	readonly boostSpeed: number;
	readonly containerWidth: number;
	readonly containerHeight: number;
	readonly enableGlow: boolean;
	readonly enableTrails: boolean;
	readonly debugMode: boolean;
}

export interface StarData {
	readonly x: number;
	readonly y: number;
	readonly z: number;
	readonly prevX: number;
	readonly prevY: number;
	readonly inUse: number; // 1.0 or 0.0 for TypedArray compatibility
	readonly id?: number;
	readonly size?: number;
	readonly color?: string;
}

export interface StarPoolMetrics {
	readonly totalStars: number;
	readonly activeStars: number;
	readonly poolUtilization: number;
	readonly memoryUsage: number;
	readonly reuseRatio: number;
}

export interface StarRenderOptions {
	readonly enableBatching: boolean;
	readonly maxBatchSize: number;
	readonly renderMode: 'STANDARD' | 'MOBILE' | 'HIGH_DPI' | 'SIMPLE';
	readonly useWebGL: boolean;
	readonly devicePixelRatio: number;
}

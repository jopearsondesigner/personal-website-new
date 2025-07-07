// src/lib/utils/touch-manager.ts
// Centralized touch event management with priority-based delegation

import { browser } from '$app/environment';

// Touch handler priority levels (higher = more priority)
export const TOUCH_PRIORITIES = {
	BOOST: 100, // StarField boost - highest priority
	UI_INTERACTION: 75, // Button taps, navigation
	GAME_CONTROLS: 50, // Game input handling
	ZOOM_PREVENTION: 25, // Prevent pinch-to-zoom
	DEFAULT: 0 // Default/fallback handling
} as const;

export type TouchPriority = (typeof TOUCH_PRIORITIES)[keyof typeof TOUCH_PRIORITIES];

// Touch event types we handle
export type TouchEventType = 'start' | 'end' | 'move' | 'cancel';

// Touch handler interface
export interface TouchHandler {
	id: string;
	priority: TouchPriority;
	element?: HTMLElement; // Optional element binding
	onTouchStart?: (event: TouchEvent, manager: TouchManager) => boolean | void;
	onTouchEnd?: (event: TouchEvent, manager: TouchManager) => boolean | void;
	onTouchMove?: (event: TouchEvent, manager: TouchManager) => boolean | void;
	onTouchCancel?: (event: TouchEvent, manager: TouchManager) => boolean | void;
	shouldPreventDefault?: (event: TouchEvent, eventType: TouchEventType) => boolean;
	isActive?: (event: TouchEvent, eventType: TouchEventType) => boolean;
}

// Touch state tracking
interface TouchState {
	activeHandlers: Set<string>;
	currentTouch: Touch | null;
	startTime: number;
	isMultiTouch: boolean;
	preventZoom: boolean;
}

// TouchManager singleton class
class TouchManagerClass {
	private handlers = new Map<string, TouchHandler>();
	private state: TouchState = {
		activeHandlers: new Set(),
		currentTouch: null,
		startTime: 0,
		isMultiTouch: false,
		preventZoom: true
	};
	private isInitialized = false;
	private boundHandlers = {
		touchStart: this.handleTouchStart.bind(this),
		touchEnd: this.handleTouchEnd.bind(this),
		touchMove: this.handleTouchMove.bind(this),
		touchCancel: this.handleTouchCancel.bind(this)
	};

	// ======================================================================
	// INITIALIZATION & CLEANUP
	// ======================================================================

	/**
	 * Initialize the TouchManager with global event listeners
	 */
	public initialize(): void {
		if (!browser || this.isInitialized) return;

		// Add global touch event listeners
		document.addEventListener('touchstart', this.boundHandlers.touchStart, {
			passive: false,
			capture: true
		});
		document.addEventListener('touchend', this.boundHandlers.touchEnd, {
			passive: false,
			capture: true
		});
		document.addEventListener('touchmove', this.boundHandlers.touchMove, {
			passive: false,
			capture: true
		});
		document.addEventListener('touchcancel', this.boundHandlers.touchCancel, {
			passive: false,
			capture: true
		});

		this.isInitialized = true;
		console.log('👆 TouchManager initialized');
	}

	/**
	 * Cleanup all event listeners and handlers
	 */
	public cleanup(): void {
		if (!browser || !this.isInitialized) return;

		// Remove global event listeners
		document.removeEventListener('touchstart', this.boundHandlers.touchStart, true);
		document.removeEventListener('touchend', this.boundHandlers.touchEnd, true);
		document.removeEventListener('touchmove', this.boundHandlers.touchMove, true);
		document.removeEventListener('touchcancel', this.boundHandlers.touchCancel, true);

		// Clear all handlers
		this.handlers.clear();
		this.state.activeHandlers.clear();
		this.isInitialized = false;

		console.log('👆 TouchManager cleaned up');
	}

	// ======================================================================
	// HANDLER REGISTRATION
	// ======================================================================

	/**
	 * Register a touch handler with priority
	 */
	public registerHandler(handler: TouchHandler): void {
		if (this.handlers.has(handler.id)) {
			console.warn(`TouchManager: Handler "${handler.id}" already registered, replacing...`);
		}

		this.handlers.set(handler.id, handler);
		console.log(`👆 Registered touch handler: ${handler.id} (priority: ${handler.priority})`);

		// Auto-initialize if not already done
		if (!this.isInitialized) {
			this.initialize();
		}
	}

	/**
	 * Unregister a touch handler
	 */
	public unregisterHandler(handlerId: string): void {
		if (this.handlers.delete(handlerId)) {
			this.state.activeHandlers.delete(handlerId);
			console.log(`👆 Unregistered touch handler: ${handlerId}`);
		}
	}

	/**
	 * Get sorted handlers by priority (highest first)
	 */
	private getSortedHandlers(): TouchHandler[] {
		return Array.from(this.handlers.values()).sort((a, b) => b.priority - a.priority);
	}

	// ======================================================================
	// EVENT HANDLING
	// ======================================================================

	/**
	 * Handle touchstart events with priority delegation
	 */
	private handleTouchStart(event: TouchEvent): void {
		// Update touch state
		this.state.currentTouch = event.touches[0] || null;
		this.state.startTime = Date.now();
		this.state.isMultiTouch = event.touches.length > 1;

		// Prevent zoom on multi-touch if enabled
		if (this.state.preventZoom && this.state.isMultiTouch) {
			event.preventDefault();
			return;
		}

		// Process handlers by priority
		const sortedHandlers = this.getSortedHandlers();

		for (const handler of sortedHandlers) {
			// Check if handler should process this event
			if (!this.shouldHandlerProcess(handler, event, 'start')) {
				continue;
			}

			// Call handler
			try {
				const result = handler.onTouchStart?.(event, this);

				// If handler returns true or prevents default, stop propagation
				if (result === true || handler.shouldPreventDefault?.(event, 'start')) {
					event.preventDefault();
					this.state.activeHandlers.add(handler.id);
					break; // Stop processing other handlers
				}

				// If handler returns false, continue to next handler
				if (result === false) {
					continue;
				}

				// If handler returns void/undefined, mark as active but continue
				this.state.activeHandlers.add(handler.id);
			} catch (error) {
				console.error(`TouchManager: Error in handler "${handler.id}":`, error);
			}
		}
	}

	/**
	 * Handle touchend events
	 */
	private handleTouchEnd(event: TouchEvent): void {
		// Process active handlers by priority
		const activeHandlers = Array.from(this.state.activeHandlers)
			.map((id) => this.handlers.get(id))
			.filter(Boolean)
			.sort((a, b) => b!.priority - a!.priority);

		for (const handler of activeHandlers) {
			try {
				const result = handler!.onTouchEnd?.(event, this);

				if (result === true || handler!.shouldPreventDefault?.(event, 'end')) {
					event.preventDefault();
				}
			} catch (error) {
				console.error(`TouchManager: Error in handler "${handler!.id}":`, error);
			}
		}

		// Clear active handlers and state
		this.state.activeHandlers.clear();
		this.state.currentTouch = null;
		this.state.isMultiTouch = false;
	}

	/**
	 * Handle touchmove events
	 */
	private handleTouchMove(event: TouchEvent): void {
		// Prevent zoom if enabled and multi-touch
		if (this.state.preventZoom && event.touches.length > 1) {
			event.preventDefault();
			return;
		}

		// Process active handlers
		const activeHandlers = Array.from(this.state.activeHandlers)
			.map((id) => this.handlers.get(id))
			.filter(Boolean);

		for (const handler of activeHandlers) {
			try {
				const result = handler!.onTouchMove?.(event, this);

				if (result === true || handler!.shouldPreventDefault?.(event, 'move')) {
					event.preventDefault();
				}
			} catch (error) {
				console.error(`TouchManager: Error in handler "${handler!.id}":`, error);
			}
		}
	}

	/**
	 * Handle touchcancel events
	 */
	private handleTouchCancel(event: TouchEvent): void {
		// Process active handlers
		const activeHandlers = Array.from(this.state.activeHandlers)
			.map((id) => this.handlers.get(id))
			.filter(Boolean);

		for (const handler of activeHandlers) {
			try {
				handler!.onTouchCancel?.(event, this);
			} catch (error) {
				console.error(`TouchManager: Error in handler "${handler!.id}":`, error);
			}
		}

		// Clear state
		this.state.activeHandlers.clear();
		this.state.currentTouch = null;
		this.state.isMultiTouch = false;
	}

	/**
	 * Check if a handler should process the current event
	 */
	private shouldHandlerProcess(
		handler: TouchHandler,
		event: TouchEvent,
		eventType: TouchEventType
	): boolean {
		// Check if handler has custom activation logic
		if (handler.isActive && !handler.isActive(event, eventType)) {
			return false;
		}

		// Check element binding
		if (handler.element) {
			const target = event.target as Node;
			if (!handler.element.contains(target)) {
				return false;
			}
		}

		return true;
	}

	// ======================================================================
	// PUBLIC API
	// ======================================================================

	/**
	 * Get current touch state
	 */
	public getTouchState(): Readonly<TouchState> {
		return { ...this.state };
	}

	/**
	 * Set zoom prevention
	 */
	public setZoomPrevention(prevent: boolean): void {
		this.state.preventZoom = prevent;
	}

	/**
	 * Check if a specific handler is currently active
	 */
	public isHandlerActive(handlerId: string): boolean {
		return this.state.activeHandlers.has(handlerId);
	}

	/**
	 * Force clear all active handlers (emergency cleanup)
	 */
	public clearActiveHandlers(): void {
		this.state.activeHandlers.clear();
		this.state.currentTouch = null;
	}

	/**
	 * Get registered handler count
	 */
	public getHandlerCount(): number {
		return this.handlers.size;
	}
}

// ======================================================================
// SINGLETON INSTANCE & EXPORTS
// ======================================================================

// Create singleton instance
export const TouchManager = new TouchManagerClass();

// Auto-initialize in browser
if (browser) {
	TouchManager.initialize();
}

// ======================================================================
// UTILITY FUNCTIONS
// ======================================================================

/**
 * Create a simple boost touch handler for StarField integration
 */
export function createBoostTouchHandler(
	onBoostStart: () => void,
	onBoostEnd: () => void,
	options?: {
		element?: HTMLElement;
		requireLongPress?: boolean;
		longPressDelay?: number;
	}
): TouchHandler {
	let longPressTimer: number | null = null;
	const longPressDelay = options?.longPressDelay || 0;

	return {
		id: 'starfield-boost',
		priority: TOUCH_PRIORITIES.BOOST,
		element: options?.element,

		onTouchStart: (event: TouchEvent) => {
			// Clear any existing timer
			if (longPressTimer) {
				clearTimeout(longPressTimer);
			}

			if (options?.requireLongPress && longPressDelay > 0) {
				// Setup long press timer
				longPressTimer = window.setTimeout(() => {
					onBoostStart();
					longPressTimer = null;
				}, longPressDelay);
			} else {
				// Immediate boost
				onBoostStart();
			}

			return true; // Prevent default and stop propagation
		},

		onTouchEnd: (event: TouchEvent) => {
			// Clear long press timer if still pending
			if (longPressTimer) {
				clearTimeout(longPressTimer);
				longPressTimer = null;
			} else {
				// Only call end if boost actually started
				onBoostEnd();
			}

			return true; // Prevent default
		},

		onTouchCancel: (event: TouchEvent) => {
			// Clean up on cancel
			if (longPressTimer) {
				clearTimeout(longPressTimer);
				longPressTimer = null;
			}
			onBoostEnd();
		},

		shouldPreventDefault: () => true // Always prevent default for boost
	};
}

/**
 * Create a zoom prevention handler
 */
export function createZoomPreventionHandler(element?: HTMLElement): TouchHandler {
	return {
		id: 'zoom-prevention',
		priority: TOUCH_PRIORITIES.ZOOM_PREVENTION,
		element,

		shouldPreventDefault: (event: TouchEvent, eventType: TouchEventType) => {
			// Prevent default on multi-touch to stop pinch-to-zoom
			return event.touches.length > 1;
		},

		isActive: (event: TouchEvent) => {
			return event.touches.length > 1; // Only active on multi-touch
		}
	};
}

/**
 * Create a simple UI interaction handler
 */
export function createUITouchHandler(
	element: HTMLElement,
	onTap: (event: TouchEvent) => void,
	options?: {
		preventDefault?: boolean;
		stopPropagation?: boolean;
	}
): TouchHandler {
	const preventDefault = options?.preventDefault ?? false;
	const stopPropagation = options?.stopPropagation ?? false;

	return {
		id: `ui-touch-${element.id || Math.random().toString(36).substr(2, 9)}`,
		priority: TOUCH_PRIORITIES.UI_INTERACTION,
		element,

		onTouchEnd: (event: TouchEvent) => {
			onTap(event);
			return preventDefault || stopPropagation;
		},

		shouldPreventDefault: () => preventDefault
	};
}

// ======================================================================
// BROWSER COMPATIBILITY
// ======================================================================

/**
 * Check if touch events are supported
 */
export function isTouchSupported(): boolean {
	if (!browser) return false;
	return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Check if device is likely mobile based on touch and screen size
 */
export function isMobileDevice(): boolean {
	if (!browser) return false;
	return isTouchSupported() && window.innerWidth <= 768;
}

export default TouchManager;

import { browser } from '$app/environment';
import { onMount, onDestroy } from 'svelte';

type EventCallback = (...args: any[]) => void;

export class EventManager {
	private listeners: Map<string, Map<EventCallback, EventCallback>> = new Map();

	constructor() {
		if (!browser) return;
	}

	// Add event listener with automatic tracking
	public add(
		target: EventTarget,
		type: string,
		callback: EventCallback,
		options?: boolean | AddEventListenerOptions
	) {
		if (!browser || !target) return this;

		// Store the listener for later removal
		if (!this.listeners.has(type)) {
			this.listeners.set(type, new Map());
		}

		this.listeners.get(type)?.set(callback, callback);
		target.addEventListener(type, callback, options);

		return this;
	}

	// Remove specific event listener
	public remove(target: EventTarget, type: string, callback: EventCallback) {
		if (!browser || !target) return this;

		const typeListeners = this.listeners.get(type);
		if (typeListeners && typeListeners.has(callback)) {
			target.removeEventListener(type, callback);
			typeListeners.delete(callback);
		}

		return this;
	}

	// Remove all listeners of a specific type
	public removeAll(target: EventTarget, type?: string) {
		if (!browser || !target) return this;

		if (type) {
			// Remove all listeners of specific type
			const typeListeners = this.listeners.get(type);
			if (typeListeners) {
				typeListeners.forEach((callback) => {
					target.removeEventListener(type, callback);
				});
				this.listeners.delete(type);
			}
		} else {
			// Remove all listeners of all types
			this.listeners.forEach((typeListeners, listenerType) => {
				typeListeners.forEach((callback) => {
					target.removeEventListener(listenerType, callback);
				});
			});
			this.listeners.clear();
		}

		return this;
	}

	// Clear all tracked listeners
	public clearAll() {
		this.listeners.clear();
	}
}

// Usage in StarField.svelte:
let eventManager: EventManager;

onMount(() => {
	if (!browser) return;

	eventManager = new EventManager();

	// Add event listeners with tracking
	if (enableBoost) {
		eventManager
			.add(window, 'keydown', handleKeyDown, { passive: true })
			.add(window, 'keyup', handleKeyUp, { passive: true })
			.add(window, 'touchstart', handleTouchStart, { passive: true })
			.add(window, 'touchend', handleTouchEnd, { passive: true });
	}

	eventManager.add(document, 'visibilitychange', handleVisibilityChange);
});

onDestroy(() => {
	if (eventManager) {
		// This removes all tracked events
		eventManager.clearAll();
	}
});

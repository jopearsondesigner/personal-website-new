// src/lib/stores/is-animating.ts
import { writable } from 'svelte/store';

export const isAnimating = writable<boolean>(false);

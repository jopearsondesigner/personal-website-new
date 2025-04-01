// src/app.d.ts
/// <reference types="@sveltejs/kit" />

// Import the ServerDeviceInfo type from hooks
import type { ServerDeviceInfo } from './hooks.server';

// See https://kit.svelte.dev/docs/types#app
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			deviceInfo: ServerDeviceInfo;
		}
		// interface PageData {}
		// interface Platform {}
	}
}

export {};

// src/lib/utils/debug-logger.ts
import { browser } from '$app/environment';
import { writable, get } from 'svelte/store';

// Debug log levels
export enum LogLevel {
	ERROR = 0,
	WARN = 1,
	INFO = 2,
	DEBUG = 3
}

// Current log level store
export const debugLogLevel = writable<LogLevel>(
	browser && localStorage.getItem('debugLogLevel')
		? parseInt(localStorage.getItem('debugLogLevel') || '0')
		: LogLevel.ERROR
);

// Log target - console by default
let logTarget: 'console' | 'store' = 'console';

// Store for logging if desired
export const logStore = writable<{ level: LogLevel; message: string; timestamp: number }[]>([]);

// Set the log level
export function setLogLevel(level: LogLevel): void {
	if (browser) {
		debugLogLevel.set(level);
		localStorage.setItem('debugLogLevel', level.toString());
	}
}

// Set the log target
export function setLogTarget(target: 'console' | 'store'): void {
	logTarget = target;
}

// Main logging function
export function log(level: LogLevel, message: string, ...args: any[]): void {
	if (!browser) return;

	const currentLevel = get(debugLogLevel);

	// Only log if the current level is greater than or equal to the message level
	if (currentLevel >= level) {
		const timestamp = performance.now();
		const formattedMessage =
			args.length > 0 ? `${message} ${args.map((a) => JSON.stringify(a)).join(' ')}` : message;

		if (logTarget === 'console') {
			switch (level) {
				case LogLevel.ERROR:
					console.error(`[ERROR] ${formattedMessage}`);
					break;
				case LogLevel.WARN:
					console.warn(`[WARN] ${formattedMessage}`);
					break;
				case LogLevel.INFO:
					console.info(`[INFO] ${formattedMessage}`);
					break;
				case LogLevel.DEBUG:
					console.debug(`[DEBUG] ${formattedMessage}`);
					break;
			}
		} else {
			// Add to log store
			logStore.update((logs) => {
				const newLogs = [...logs, { level, message: formattedMessage, timestamp }];
				// Keep only the last 100 logs
				if (newLogs.length > 100) {
					return newLogs.slice(newLogs.length - 100);
				}
				return newLogs;
			});
		}
	}
}

// Convenience methods
export const logError = (message: string, ...args: any[]) => log(LogLevel.ERROR, message, ...args);
export const logWarn = (message: string, ...args: any[]) => log(LogLevel.WARN, message, ...args);
export const logInfo = (message: string, ...args: any[]) => log(LogLevel.INFO, message, ...args);
export const logDebug = (message: string, ...args: any[]) => log(LogLevel.DEBUG, message, ...args);

// Clear log store
export function clearLogs(): void {
	logStore.set([]);
}

// Integrate with existing debug pools
export function setupDebugPoolIntegration(): void {
	if (!browser) return;

	// Set higher log level when star pool debug mode is on
	try {
		const starPoolDebugMode = localStorage.getItem('starPoolDebugMode') === 'true';
		if (starPoolDebugMode) {
			setLogLevel(LogLevel.DEBUG);
		}
	} catch (e) {
		// Ignore localStorage errors
	}

	// Expose the logger to the window for console access
	(window as any).__debugLogger = {
		setLogLevel,
		setLogTarget,
		clearLogs,
		LogLevel
	};
}

// Call this on app initialization
if (browser) {
	setupDebugPoolIntegration();
}

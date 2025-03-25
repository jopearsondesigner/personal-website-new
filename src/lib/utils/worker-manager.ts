// src/lib/utils/worker-manager.ts
import { browser } from '$app/environment';

export class WorkerManager {
	private worker: Worker | null = null;
	private callbacks: Map<string, Function> = new Map();
	private isSupported: boolean;

	constructor(workerUrl: string) {
		this.isSupported = browser && typeof Worker !== 'undefined';

		if (this.isSupported) {
			try {
				this.worker = new Worker(new URL(workerUrl, import.meta.url));
				this.setupMessageHandler();
			} catch (error) {
				console.error('Failed to create worker:', error);
				this.isSupported = false;
			}
		}
	}

	private setupMessageHandler() {
		if (!this.worker) return;

		this.worker.onmessage = (e) => {
			const { type, data } = e.data;
			const callback = this.callbacks.get(type);

			if (callback) {
				callback(data);
			}
		};

		this.worker.onerror = (error) => {
			console.error('Worker error:', error);
		};
	}

	postMessage(type: string, data: any) {
		if (!this.isSupported || !this.worker) return false;

		try {
			this.worker.postMessage({ type, data });
			return true;
		} catch (error) {
			console.error('Failed to post message to worker:', error);
			return false;
		}
	}

	registerCallback(type: string, callback: Function) {
		this.callbacks.set(type, callback);
	}

	terminate() {
		if (this.worker) {
			this.worker.terminate();
			this.worker = null;
		}

		this.callbacks.clear();
	}

	isWorkerSupported() {
		return this.isSupported;
	}
}

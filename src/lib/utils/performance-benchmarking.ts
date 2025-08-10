// src/lib/utils/performance-benchmarking.ts
// CHANGELOG (2025-08-10)
// - New generic benchmarking module (no star-field specifics).
// - Exports `BenchmarkType`, `PerformanceBenchmark`, and `benchmarkResultsStore`.
// - SSR safe: no browser APIs are touched during SSR.
// - Lightweight RAF loop when in browser; falls back to timeouts if RAF missing.

import { browser } from '$app/environment';
import { writable, type Writable } from 'svelte/store';

export enum BenchmarkType {
	FPS = 0,
	MEMORY = 1,
	RENDERING = 2
}

export type BenchmarkResult = {
	type: BenchmarkType;
	timestamp: number;
	durationMs: number;
	avgFPS?: number;
	avgMemoryUsage?: number; // MB (approx)
	overallScore?: number; // 0..100 arbitrary composite
};

export const benchmarkResultsStore: Writable<BenchmarkResult[]> = writable([]);

/**
 * Lightweight, generic benchmark runner.
 * - FPS: samples frame times and computes avg FPS.
 * - MEMORY: samples JS heap if available (approx); otherwise simulates.
 * - RENDERING: runs a CPU loop chunk per frame to estimate throughput.
 */
export class PerformanceBenchmark {
	private type: BenchmarkType;
	private duration: number; // ms
	private startTime = 0;
	private rafId: number | null = null;
	private timeoutId: ReturnType<typeof setTimeout> | null = null;

	// sampling
	private frames = 0;
	private lastTs = 0;
	private frameTimes: number[] = [];
	private memSamples: number[] = [];
	private workUnits = 0;

	// callbacks
	public onProgress?: (progress01: number) => void;
	public onComplete?: (result: BenchmarkResult) => void;

	constructor(type: BenchmarkType, durationMs = 5000) {
		this.type = type;
		this.duration = Math.max(500, durationMs | 0);
	}

	start() {
		this.cancel(); // ensure clean state
		this.startTime = nowMs();
		this.lastTs = this.startTime;

		if (!browser) {
			// SSR: simulate a quick completion
			const result = this.finalize(nowMs());
			this.onComplete?.(result);
			benchmarkResultsStore.update((arr) => [...arr, result]);
			return;
		}

		const tick = (t: number) => {
			const elapsed = t - this.startTime;
			const dt = t - this.lastTs;
			this.lastTs = t;

			// sample frame time
			this.frames++;
			if (dt > 0 && isFinite(dt)) this.frameTimes.push(dt);

			// optional memory sample (best-effort)
			const mem = readApproxHeapMB();
			if (mem != null) this.memSamples.push(mem);

			// synthetic work for RENDERING type
			if (this.type === BenchmarkType.RENDERING) {
				this.workUnits += doTinyWork(500); // small, consistent chunk
			}

			// progress callback
			this.onProgress?.(Math.min(1, elapsed / this.duration) * 100);

			if (elapsed >= this.duration) {
				const result = this.finalize(t);
				this.onComplete?.(result);
				benchmarkResultsStore.update((arr) => [...arr, result]);
				this.cancel();
				return;
			}

			// schedule next iteration
			if (typeof requestAnimationFrame === 'function') {
				this.rafId = requestAnimationFrame(tick);
			} else {
				this.timeoutId = setTimeout(() => tick(nowMs()), 16);
			}
		};

		// kick off
		if (typeof requestAnimationFrame === 'function') {
			this.rafId = requestAnimationFrame(tick);
		} else {
			this.timeoutId = setTimeout(() => tick(nowMs()), 16);
		}
	}

	cancel() {
		if (this.rafId != null && typeof cancelAnimationFrame === 'function') {
			cancelAnimationFrame(this.rafId);
		}
		if (this.timeoutId != null) {
			clearTimeout(this.timeoutId);
		}
		this.rafId = null;
		this.timeoutId = null;
	}

	private finalize(endTs: number): BenchmarkResult {
		const durationMs = Math.max(1, endTs - this.startTime);

		// avg fps
		let avgFPS: number | undefined = undefined;
		if (this.frameTimes.length > 0) {
			const meanDt = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
			avgFPS = 1000 / meanDt;
		}

		// avg memory (MB)
		let avgMemoryUsage: number | undefined = undefined;
		if (this.memSamples.length > 0) {
			avgMemoryUsage = this.memSamples.reduce((a, b) => a + b, 0) / this.memSamples.length;
		}

		// composite score: normalize into 0..100 (rough)
		const fpsScore = Math.max(0, Math.min(100, ((avgFPS ?? 0) / 60) * 100));
		const memScore =
			avgMemoryUsage != null ? Math.max(0, 100 - Math.min(100, (avgMemoryUsage / 1024) * 100)) : 50;
		const renderScore = Math.max(0, Math.min(100, (this.workUnits / (this.duration / 16)) * 5));

		let overallScore: number | undefined;
		switch (this.type) {
			case BenchmarkType.FPS:
				overallScore = Math.round(fpsScore);
				break;
			case BenchmarkType.MEMORY:
				overallScore = Math.round(fpsScore * 0.3 + memScore * 0.7);
				break;
			case BenchmarkType.RENDERING:
				overallScore = Math.round(fpsScore * 0.4 + renderScore * 0.6);
				break;
		}

		return {
			type: this.type,
			timestamp: Date.now(),
			durationMs,
			avgFPS,
			avgMemoryUsage,
			overallScore
		};
	}
}

// ---------- helpers ----------

function nowMs(): number {
	if (browser && typeof performance !== 'undefined' && performance.now) {
		return performance.now();
	}
	return Date.now();
}

function readApproxHeapMB(): number | null {
	if (!browser) return null;
	const p: any = performance as any;
	if (p && p.memory && typeof p.memory.usedJSHeapSize === 'number') {
		return p.memory.usedJSHeapSize / (1024 * 1024);
	}
	return null;
}

// small deterministic bit of work; returns “units” done
function doTinyWork(iterations: number): number {
	let acc = 0;
	for (let i = 0; i < iterations; i++) {
		// trivial math to keep JIT honest without being too heavy
		acc += Math.sin(i * 0.001) * Math.cos(i * 0.002);
	}
	return iterations;
}

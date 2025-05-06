// src/lib/utils/performance-benchmarking.ts
import { browser } from '$app/environment';
import { get, writable, type Writable } from 'svelte/store';
import { deviceCapabilities } from './device-performance';
import { fpsStore } from './frame-rate-controller';

// Benchmark types
export enum BenchmarkType {
	FPS = 'fps',
	MemoryUsage = 'memory',
	ObjectPooling = 'objectPooling',
	RenderTime = 'renderTime',
	InitializationTime = 'initTime',
	InteractiveResponsiveness = 'interactiveResponsiveness',
	GarbageCollection = 'garbageCollection'
}

// Define the benchmark result interface
export interface BenchmarkResult {
	benchmarkId: string;
	timestamp: number;
	type: BenchmarkType;
	duration: number;
	sampleCount: number;
	metrics: {
		min: number;
		max: number;
		avg: number;
		median: number;
		p95: number; // 95th percentile
		p99: number; // 99th percentile
		values: number[]; // Raw values for detailed analysis
	};
	cpuLoad?: number;
	memoryUsage?: number;
	deviceInfo: {
		tier: string;
		isMobile: boolean;
		browserInfo: string;
		screenDimensions: string;
	};
}

// Define the store for benchmark results
export const benchmarkResultsStore: Writable<BenchmarkResult[]> = writable([]);

// Implementation of performance benchmark class
export class PerformanceBenchmark {
	private benchmarkId: string;
	private type: BenchmarkType;
	private duration: number;
	private samplingRate: number;
	private metrics: number[] = [];
	private startTime: number = 0;
	private endTime: number = 0;
	private rafId: number | null = null;
	private intervalId: number | null = null;
	private onProgressCallback: ((progress: number) => void) | null = null;
	private onCompleteCallback: ((result: BenchmarkResult) => void) | null = null;
	private targetFps: number;
	private isRunning: boolean = false;
	private gcTimestamps: number[] = [];
	private memoryReadings: number[] = [];
	private previousMemory: number = 0;
	private memoryIncreases: number = 0;
	private memoryDecreases: number = 0;

	constructor(
		benchmarkId: string,
		type: BenchmarkType = BenchmarkType.FPS,
		duration: number = 5000, // 5 seconds by default
		samplingRate: number = 60 // 60 samples per second
	) {
		this.benchmarkId = benchmarkId;
		this.type = type;
		this.duration = duration;
		this.samplingRate = samplingRate;
		this.targetFps = 60; // Default target

		// Update target FPS from device capabilities
		if (browser) {
			const capabilities = get(deviceCapabilities);
			if (capabilities?.performance?.targetFPS) {
				this.targetFps = capabilities.performance.targetFPS;
			}
		}
	}

	// Set callback for progress updates
	public onProgress(callback: (progress: number) => void): PerformanceBenchmark {
		this.onProgressCallback = callback;
		return this;
	}

	// Set callback for completion
	public onComplete(callback: (result: BenchmarkResult) => void): PerformanceBenchmark {
		this.onCompleteCallback = callback;
		return this;
	}

	// Start the benchmark
	public start(): void {
		if (!browser || this.isRunning) return;

		this.isRunning = true;
		this.metrics = [];
		this.gcTimestamps = [];
		this.memoryReadings = [];
		this.memoryIncreases = 0;
		this.memoryDecreases = 0;
		this.startTime = performance.now();
		this.endTime = this.startTime + this.duration;

		switch (this.type) {
			case BenchmarkType.FPS:
				this.startFpsBenchmark();
				break;
			case BenchmarkType.MemoryUsage:
				this.startMemoryBenchmark();
				break;
			case BenchmarkType.GarbageCollection:
				this.startGCDetectionBenchmark();
				break;
			case BenchmarkType.RenderTime:
				this.startRenderTimeBenchmark();
				break;
			case BenchmarkType.InteractiveResponsiveness:
				this.startInteractiveResponseBenchmark();
				break;
			default:
				this.startFpsBenchmark(); // Default to FPS
		}
	}

	// Stop the benchmark early if needed
	public stop(): void {
		if (!this.isRunning) return;

		this.isRunning = false;

		if (this.rafId !== null) {
			cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}

		if (this.intervalId !== null) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}

		// Calculate and store result if we have data
		if (this.metrics.length > 0) {
			const result = this.calculateResult();
			this.storeResult(result);

			if (this.onCompleteCallback) {
				this.onCompleteCallback(result);
			}
		}
	}

	// FPS benchmark implementation
	private startFpsBenchmark(): void {
		let lastFrameTime = performance.now();
		let frames = 0;
		let lastSampleTime = this.startTime;
		const sampleInterval = 1000 / this.samplingRate;

		const measureFps = () => {
			const now = performance.now();
			frames++;

			// Take sample at our sampling rate
			if (now - lastSampleTime >= sampleInterval) {
				const elapsed = now - lastSampleTime;
				const instantFps = (frames * 1000) / elapsed;

				this.metrics.push(instantFps);
				frames = 0;
				lastSampleTime = now;

				// Report progress
				const progress = Math.min(100, ((now - this.startTime) / this.duration) * 100);
				if (this.onProgressCallback) {
					this.onProgressCallback(progress);
				}

				// Also record memory if available
				this.recordMemoryIfAvailable();
			}

			if (now < this.endTime && this.isRunning) {
				this.rafId = requestAnimationFrame(measureFps);
			} else {
				this.stop();
			}
		};

		this.rafId = requestAnimationFrame(measureFps);
	}

	// Memory usage benchmark implementation
	private startMemoryBenchmark(): void {
		if (!browser || !('performance' in window) || !(('memory' in performance) as any)) {
			console.warn('Memory API not available in this browser');
			this.stop();
			return;
		}

		const sampleInterval = 1000 / this.samplingRate;

		const measureMemory = () => {
			const now = performance.now();

			// Record memory stats
			const memory = (performance as any).memory;
			const usedHeapSize = memory.usedJSHeapSize;
			const totalHeapSize = memory.totalJSHeapSize;
			const memoryUsage = usedHeapSize / memory.jsHeapSizeLimit;

			this.metrics.push(memoryUsage);
			this.memoryReadings.push(usedHeapSize);

			// Detect potential GC events
			if (this.memoryReadings.length > 1) {
				const prevReading = this.memoryReadings[this.memoryReadings.length - 2];
				const currentReading = this.memoryReadings[this.memoryReadings.length - 1];

				// If memory decreased significantly, might be GC
				if (currentReading < prevReading && (prevReading - currentReading) / prevReading > 0.1) {
					this.gcTimestamps.push(now);
					this.memoryDecreases++;
				} else if (currentReading > prevReading) {
					this.memoryIncreases++;
				}
			}

			// Report progress
			const progress = Math.min(100, ((now - this.startTime) / this.duration) * 100);
			if (this.onProgressCallback) {
				this.onProgressCallback(progress);
			}

			if (now < this.endTime && this.isRunning) {
				this.intervalId = window.setTimeout(measureMemory, sampleInterval);
			} else {
				this.stop();
			}
		};

		this.intervalId = window.setTimeout(measureMemory, sampleInterval);
	}

	// GC detection benchmark
	private startGCDetectionBenchmark(): void {
		if (!browser || !('performance' in window) || !(('memory' in performance) as any)) {
			console.warn('Memory API not available for GC detection benchmark');
			this.stop();
			return;
		}

		// Create some objects to force GC pressure
		const objects: any[] = [];
		let gcCycles = 0;
		const sampleInterval = 1000 / this.samplingRate;

		const applyGCPressure = () => {
			const now = performance.now();

			// Record the current memory snapshot
			const memory = (performance as any).memory;
			const currentMemory = memory.usedJSHeapSize;

			// Detect significant drops in memory that might indicate GC
			if (
				this.previousMemory > 0 &&
				currentMemory < this.previousMemory &&
				(this.previousMemory - currentMemory) / this.previousMemory > 0.1
			) {
				this.metrics.push(this.previousMemory - currentMemory); // Size of GC
				this.gcTimestamps.push(now);
				gcCycles++;
			}

			// Create some objects to trigger GC
			for (let i = 0; i < 1000; i++) {
				objects.push(new Array(1000).fill(Math.random()));
			}

			// Periodically clear them to allow GC to run
			if (objects.length > 10000) {
				objects.length = 0;
			}

			this.previousMemory = currentMemory;

			// Report progress
			const progress = Math.min(100, ((now - this.startTime) / this.duration) * 100);
			if (this.onProgressCallback) {
				this.onProgressCallback(progress);
			}

			if (now < this.endTime && this.isRunning) {
				this.intervalId = window.setTimeout(applyGCPressure, sampleInterval);
			} else {
				// Clean up
				objects.length = 0;

				// If we didn't detect any GC, record 0 for statistics
				if (this.metrics.length === 0) {
					this.metrics.push(0);
				}

				this.stop();
			}
		};

		this.intervalId = window.setTimeout(applyGCPressure, sampleInterval);
	}

	// Render time benchmark
	private startRenderTimeBenchmark(): void {
		let lastRenderStart = 0;
		let renderTimes: number[] = [];

		const measureRenderTime = () => {
			const renderStart = performance.now();

			// If this isn't the first frame, calculate the time it took to render
			if (lastRenderStart > 0) {
				const renderTime = renderStart - lastRenderStart;
				renderTimes.push(renderTime);
				this.metrics.push(renderTime);
			}

			lastRenderStart = renderStart;

			// Report progress
			const now = performance.now();
			const progress = Math.min(100, ((now - this.startTime) / this.duration) * 100);
			if (this.onProgressCallback) {
				this.onProgressCallback(progress);
			}

			// Record memory if available
			this.recordMemoryIfAvailable();

			if (now < this.endTime && this.isRunning) {
				this.rafId = requestAnimationFrame(measureRenderTime);
			} else {
				this.stop();
			}
		};

		this.rafId = requestAnimationFrame(measureRenderTime);
	}

	// Interactive responsiveness benchmark
	private startInteractiveResponseBenchmark(): void {
		// This simulates user interactions and measures response time
		// For a real-world test, you might want to trigger actual DOM events

		const interactions = [
			() => {
				// Simulate a click event
				const event = new MouseEvent('click', {
					bubbles: true,
					cancelable: true,
					view: window
				});
				document.body.dispatchEvent(event);
			},
			() => {
				// Simulate a scroll event
				const event = new Event('scroll', {
					bubbles: true
				});
				window.dispatchEvent(event);
			},
			() => {
				// Simulate a mousemove event
				const event = new MouseEvent('mousemove', {
					bubbles: true,
					cancelable: true,
					view: window,
					clientX: Math.random() * window.innerWidth,
					clientY: Math.random() * window.innerHeight
				});
				document.body.dispatchEvent(event);
			}
		];

		let interactionIndex = 0;
		let lastInteractionTime = 0;
		let interactionStart = 0;

		const measureInteractiveResponse = () => {
			const now = performance.now();

			// Trigger a new interaction every 200ms
			if (now - lastInteractionTime > 200) {
				interactionStart = now;
				interactions[interactionIndex % interactions.length]();
				interactionIndex++;
				lastInteractionTime = now;

				// Measure time until next frame after interaction
				this.rafId = requestAnimationFrame(() => {
					const responseTime = performance.now() - interactionStart;
					this.metrics.push(responseTime);

					// Continue the loop
					this.rafId = requestAnimationFrame(measureInteractiveResponse);
				});
			} else {
				this.rafId = requestAnimationFrame(measureInteractiveResponse);
			}

			// Report progress
			const progress = Math.min(100, ((now - this.startTime) / this.duration) * 100);
			if (this.onProgressCallback) {
				this.onProgressCallback(progress);
			}

			// Also record memory if available
			this.recordMemoryIfAvailable();

			if (now >= this.endTime || !this.isRunning) {
				this.stop();
			}
		};

		this.rafId = requestAnimationFrame(measureInteractiveResponse);
	}

	// Helper to record memory if the API is available
	private recordMemoryIfAvailable(): void {
		if (browser && 'performance' in window && (('memory' in performance) as any)) {
			const memory = (performance as any).memory;
			const memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
			this.memoryReadings.push(memory.usedJSHeapSize);

			// Detect potential GC
			if (this.memoryReadings.length > 1) {
				const prevReading = this.memoryReadings[this.memoryReadings.length - 2];
				const currentReading = this.memoryReadings[this.memoryReadings.length - 1];

				// If memory decreased significantly, might be GC
				if (currentReading < prevReading && (prevReading - currentReading) / prevReading > 0.05) {
					this.gcTimestamps.push(performance.now());
				}
			}
		}
	}

	// Calculate statistical results from the metrics
	private calculateResult(): BenchmarkResult {
		// Sort values for percentile calculations
		const sortedValues = [...this.metrics].sort((a, b) => a - b);

		// Calculate statistics
		const min = sortedValues[0] || 0;
		const max = sortedValues[sortedValues.length - 1] || 0;
		const avg = sortedValues.reduce((sum, val) => sum + val, 0) / sortedValues.length;

		// Median (50th percentile)
		const medianIndex = Math.floor(sortedValues.length / 2);
		const median =
			sortedValues.length % 2 === 0
				? (sortedValues[medianIndex - 1] + sortedValues[medianIndex]) / 2
				: sortedValues[medianIndex];

		// 95th percentile
		const p95Index = Math.floor(sortedValues.length * 0.95);
		const p95 = sortedValues[p95Index];

		// 99th percentile
		const p99Index = Math.floor(sortedValues.length * 0.99);
		const p99 = sortedValues[p99Index];

		// Get device info
		const capabilities = get(deviceCapabilities);
		let memoryUsage = undefined;

		// Try to get memory usage if available
		if (browser && 'performance' in window && (('memory' in performance) as any)) {
			const memory = (performance as any).memory;
			memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
		}

		// Browser detection
		const getBrowserInfo = (): string => {
			if (!browser) return 'Unknown';

			const ua = navigator.userAgent;
			if (ua.includes('Firefox')) return 'Firefox';
			if (ua.includes('Chrome')) return 'Chrome';
			if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
			if (ua.includes('Edge')) return 'Edge';
			if (ua.includes('MSIE') || ua.includes('Trident/')) return 'IE';
			return 'Unknown';
		};

		// Create the result object
		return {
			benchmarkId: this.benchmarkId,
			timestamp: Date.now(),
			type: this.type,
			duration: performance.now() - this.startTime,
			sampleCount: this.metrics.length,
			metrics: {
				min,
				max,
				avg,
				median,
				p95,
				p99,
				values: this.metrics
			},
			memoryUsage,
			cpuLoad: undefined, // CPU load can't be directly measured in browser
			deviceInfo: {
				tier: capabilities?.tier || 'unknown',
				isMobile: capabilities?.isMobile || false,
				browserInfo: getBrowserInfo(),
				screenDimensions: browser ? `${window.innerWidth}x${window.innerHeight}` : 'Unknown'
			}
		};
	}

	// Store the result in the benchmark store
	private storeResult(result: BenchmarkResult): void {
		benchmarkResultsStore.update((results) => {
			// Keep only the last 100 results to prevent memory issues
			const updatedResults = [...results, result];
			if (updatedResults.length > 100) {
				return updatedResults.slice(-100);
			}
			return updatedResults;
		});

		// Also store in localStorage if available
		if (browser) {
			try {
				// Get existing results from localStorage
				let savedResults: BenchmarkResult[] = [];
				const savedResultsStr = localStorage.getItem('benchmarkResults');
				if (savedResultsStr) {
					savedResults = JSON.parse(savedResultsStr);
				}

				// Add new result
				savedResults.push(result);

				// Keep only the last 100 results to prevent storage issues
				if (savedResults.length > 100) {
					savedResults = savedResults.slice(-100);
				}

				// Save back to localStorage
				localStorage.setItem('benchmarkResults', JSON.stringify(savedResults));
			} catch (e) {
				console.warn('Failed to save benchmark result to localStorage:', e);
			}
		}
	}

	// Load past benchmark results from localStorage
	public static loadSavedResults(): void {
		if (!browser) return;

		try {
			const savedResultsStr = localStorage.getItem('benchmarkResults');
			if (savedResultsStr) {
				const savedResults = JSON.parse(savedResultsStr);
				benchmarkResultsStore.set(savedResults);
			}
		} catch (e) {
			console.warn('Failed to load benchmark results from localStorage:', e);
		}
	}

	// Compare results between two benchmarks
	public static compareResults(
		resultA: BenchmarkResult,
		resultB: BenchmarkResult
	): {
		percentageChange: number;
		absoluteChange: number;
		improved: boolean;
		significance: 'none' | 'minor' | 'significant' | 'major';
	} {
		const avgA = resultA.metrics.avg;
		const avgB = resultB.metrics.avg;

		const absoluteChange = avgB - avgA;
		const percentageChange = (absoluteChange / avgA) * 100;

		// Determine if the change is an improvement based on the benchmark type
		let improved: boolean;
		switch (resultA.type) {
			case BenchmarkType.FPS:
				improved = percentageChange > 0; // Higher FPS is better
				break;
			case BenchmarkType.MemoryUsage:
			case BenchmarkType.RenderTime:
			case BenchmarkType.GarbageCollection:
			case BenchmarkType.InteractiveResponsiveness:
				improved = percentageChange < 0; // Lower values are better for these
				break;
			default:
				improved = percentageChange > 0; // Default to higher = better
		}

		// Determine significance of the change
		const absPercentageChange = Math.abs(percentageChange);
		let significance: 'none' | 'minor' | 'significant' | 'major';

		if (absPercentageChange < 5) {
			significance = 'none';
		} else if (absPercentageChange < 15) {
			significance = 'minor';
		} else if (absPercentageChange < 30) {
			significance = 'significant';
		} else {
			significance = 'major';
		}

		return {
			percentageChange,
			absoluteChange,
			improved,
			significance
		};
	}

	// Run a standard suite of benchmarks
	public static async runStandardSuite(
		duration: number = 5000,
		onProgress?: (benchmark: string, progress: number) => void
	): Promise<BenchmarkResult[]> {
		const results: BenchmarkResult[] = [];

		// Helper to run a benchmark and await its completion
		const runBenchmark = (id: string, type: BenchmarkType): Promise<BenchmarkResult> => {
			return new Promise((resolve) => {
				const benchmark = new PerformanceBenchmark(id, type, duration);

				benchmark.onProgress((progress) => {
					if (onProgress) {
						onProgress(id, progress);
					}
				});

				benchmark.onComplete((result) => {
					results.push(result);
					resolve(result);
				});

				benchmark.start();
			});
		};

		// Run FPS benchmark
		await runBenchmark('standard-fps', BenchmarkType.FPS);

		// Run memory benchmark if available
		if (browser && 'performance' in window && (('memory' in performance) as any)) {
			await runBenchmark('standard-memory', BenchmarkType.MemoryUsage);
		}

		// Run render time benchmark
		await runBenchmark('standard-render', BenchmarkType.RenderTime);

		// Run interactive responsiveness benchmark
		await runBenchmark('standard-interactive', BenchmarkType.InteractiveResponsiveness);

		return results;
	}
}

// Initialize by loading saved results when module is imported
if (browser) {
	PerformanceBenchmark.loadSavedResults();
}

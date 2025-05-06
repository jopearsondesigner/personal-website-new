// src/lib/utils/performance-test-runner.ts
import { browser } from '$app/environment';
import {
	BenchmarkType,
	PerformanceBenchmark,
	type BenchmarkResult
} from './performance-benchmarking';
import { get } from 'svelte/store';
import { deviceCapabilities } from './device-performance';
import { fpsStore } from './frame-rate-controller';
import { objectPoolStatsStore } from './device-performance';

/**
 * Test scenario definition
 */
export interface TestScenario {
	id: string;
	name: string;
	description: string;
	setup: () => Promise<void>;
	teardown: () => Promise<void>;
	duration: number;
	benchmarkTypes: BenchmarkType[];
}

/**
 * Test result
 */
export interface TestResult {
	scenarioId: string;
	timestamp: number;
	results: BenchmarkResult[];
	pass: boolean;
	baseline?: BenchmarkResult[];
	comparison?: {
		percentageChanges: { [key: string]: number };
		improvements: { [key: string]: boolean };
		significance: { [key: string]: 'none' | 'minor' | 'significant' | 'major' };
	};
}

/**
 * Performance thresholds for various test types
 */
interface PerformanceThresholds {
	fps: number;
	renderTime: number;
	memoryUsage: number;
	objectPooling: number;
	interactiveResponsiveness: number;
}

/**
 * Performance Test Runner
 * Manages test scenarios, executes benchmarks, and reports results
 */
export class PerformanceTestRunner {
	private scenarios: Map<string, TestScenario> = new Map();
	private testResults: Map<string, TestResult[]> = new Map();
	private baselineResults: Map<string, BenchmarkResult[]> = new Map();
	private onTestCompleteCallback: ((result: TestResult) => void) | null = null;
	private onProgressCallback:
		| ((scenarioId: string, benchmarkType: string, progress: number) => void)
		| null = null;
	private defaultThresholds: PerformanceThresholds = {
		fps: 45, // Minimum acceptable FPS
		renderTime: 16, // Maximum render time (ms)
		memoryUsage: 0.8, // Maximum memory usage (0-1)
		objectPooling: 0.7, // Minimum object reuse ratio
		interactiveResponsiveness: 50 // Maximum response time (ms)
	};

	/**
	 * Register a test scenario
	 */
	registerScenario(scenario: TestScenario): void {
		this.scenarios.set(scenario.id, scenario);
	}

	/**
	 * Register multiple test scenarios
	 */
	registerScenarios(scenarios: TestScenario[]): void {
		scenarios.forEach((scenario) => this.registerScenario(scenario));
	}

	/**
	 * Set callback for test completion
	 */
	onTestComplete(callback: (result: TestResult) => void): PerformanceTestRunner {
		this.onTestCompleteCallback = callback;
		return this;
	}

	/**
	 * Set callback for progress updates
	 */
	onProgress(
		callback: (scenarioId: string, benchmarkType: string, progress: number) => void
	): PerformanceTestRunner {
		this.onProgressCallback = callback;
		return this;
	}

	/**
	 * Run a specific test scenario
	 */
	async runTest(scenarioId: string): Promise<TestResult | null> {
		if (!browser) return null;

		const scenario = this.scenarios.get(scenarioId);
		if (!scenario) {
			console.error(`Test scenario ${scenarioId} not found`);
			return null;
		}

		// Run scenario setup
		await scenario.setup();

		// Run all benchmarks for this scenario
		const benchmarkResults: BenchmarkResult[] = [];

		for (const benchmarkType of scenario.benchmarkTypes) {
			if (this.onProgressCallback) {
				this.onProgressCallback(scenarioId, benchmarkType, 0);
			}

			const benchmarkId = `${scenarioId}-${benchmarkType}`;
			const benchmark = new PerformanceBenchmark(benchmarkId, benchmarkType, scenario.duration);

			// Handle progress updates
			benchmark.onProgress((progress) => {
				if (this.onProgressCallback) {
					this.onProgressCallback(scenarioId, benchmarkType, progress);
				}
			});

			// Run the benchmark and await result
			const result = await this.runBenchmark(benchmark);
			if (result) {
				benchmarkResults.push(result);
			}
		}

		// Run scenario teardown
		await scenario.teardown();

		// Create test result
		const testResult: TestResult = {
			scenarioId,
			timestamp: Date.now(),
			results: benchmarkResults,
			pass: this.evaluateTestResults(benchmarkResults)
		};

		// Compare against baseline if available
		const baseline = this.baselineResults.get(scenarioId);
		if (baseline && baseline.length > 0) {
			testResult.baseline = baseline;
			testResult.comparison = this.compareResults(baseline, benchmarkResults);
		}

		// Store the test result
		if (!this.testResults.has(scenarioId)) {
			this.testResults.set(scenarioId, []);
		}
		this.testResults.get(scenarioId)?.push(testResult);

		// Notify callback
		if (this.onTestCompleteCallback) {
			this.onTestCompleteCallback(testResult);
		}

		return testResult;
	}

	/**
	 * Run a benchmark and return a promise for the result
	 */
	private runBenchmark(benchmark: PerformanceBenchmark): Promise<BenchmarkResult> {
		return new Promise((resolve) => {
			benchmark.onComplete((result) => {
				resolve(result);
			});

			benchmark.start();
		});
	}

	/**
	 * Run multiple test scenarios
	 */
	async runTests(scenarioIds: string[]): Promise<TestResult[]> {
		const results: TestResult[] = [];

		for (const scenarioId of scenarioIds) {
			const result = await this.runTest(scenarioId);
			if (result) {
				results.push(result);
			}
		}

		return results;
	}

	/**
	 * Run all registered test scenarios
	 */
	async runAllTests(): Promise<TestResult[]> {
		return this.runTests(Array.from(this.scenarios.keys()));
	}

	/**
	 * Set a test result as the baseline for future comparisons
	 */
	setBaseline(scenarioId: string, results: BenchmarkResult[]): void {
		this.baselineResults.set(scenarioId, results);
	}

	/**
	 * Set test results from a previous run as the baseline
	 */
	setResultAsBaseline(testResult: TestResult): void {
		this.baselineResults.set(testResult.scenarioId, testResult.results);
	}

	/**
	 * Get all stored test results for a scenario
	 */
	getTestResults(scenarioId: string): TestResult[] {
		return this.testResults.get(scenarioId) || [];
	}

	/**
	 * Get the latest test result for a scenario
	 */
	getLatestTestResult(scenarioId: string): TestResult | null {
		const results = this.testResults.get(scenarioId);
		if (!results || results.length === 0) return null;

		return results[results.length - 1];
	}

	/**
	 * Get the baseline for a scenario
	 */
	getBaseline(scenarioId: string): BenchmarkResult[] | null {
		return this.baselineResults.get(scenarioId) || null;
	}

	/**
	 * Compare benchmark results with baseline
	 */
	private compareResults(
		baseline: BenchmarkResult[],
		current: BenchmarkResult[]
	): {
		percentageChanges: { [key: string]: number };
		improvements: { [key: string]: boolean };
		significance: { [key: string]: 'none' | 'minor' | 'significant' | 'major' };
	} {
		const percentageChanges: { [key: string]: number } = {};
		const improvements: { [key: string]: boolean } = {};
		const significance: { [key: string]: 'none' | 'minor' | 'significant' | 'major' } = {};

		// Map baseline results by type for easy lookup
		const baselineMap = new Map<string, BenchmarkResult>();
		baseline.forEach((result) => {
			baselineMap.set(result.type, result);
		});

		// Compare each current result with corresponding baseline
		current.forEach((result) => {
			const baselineResult = baselineMap.get(result.type);
			if (!baselineResult) return;

			const comparison = PerformanceBenchmark.compareResults(baselineResult, result);

			// Store comparison results
			percentageChanges[result.type] = comparison.percentageChange;
			improvements[result.type] = comparison.improved;
			significance[result.type] = comparison.significance;
		});

		return {
			percentageChanges,
			improvements,
			significance
		};
	}

	/**
	 * Evaluate if test results meet performance thresholds
	 */
	private evaluateTestResults(results: BenchmarkResult[]): boolean {
		// Apply thresholds based on device capabilities
		const thresholds = this.getAdjustedThresholds();

		// Check each result against its threshold
		for (const result of results) {
			const avg = result.metrics.avg;

			switch (result.type) {
				case BenchmarkType.FPS:
					if (avg < thresholds.fps) return false;
					break;
				case BenchmarkType.RenderTime:
					if (avg > thresholds.renderTime) return false;
					break;
				case BenchmarkType.MemoryUsage:
					if (avg > thresholds.memoryUsage) return false;
					break;
				case BenchmarkType.ObjectPooling:
					if (avg < thresholds.objectPooling) return false;
					break;
				case BenchmarkType.InteractiveResponsiveness:
					if (avg > thresholds.interactiveResponsiveness) return false;
					break;
			}
		}

		return true;
	}

	/**
	 * Adjust thresholds based on device capabilities
	 */
	private getAdjustedThresholds(): PerformanceThresholds {
		if (!browser) return this.defaultThresholds;

		const capabilities = get(deviceCapabilities);
		const adjustedThresholds = { ...this.defaultThresholds };

		// Adjust thresholds based on device tier
		if (capabilities.tier === 'low') {
			adjustedThresholds.fps = 30;
			adjustedThresholds.renderTime = 33; // 30fps = ~33ms
			adjustedThresholds.memoryUsage = 0.9;
			adjustedThresholds.interactiveResponsiveness = 100;
		} else if (capabilities.tier === 'medium') {
			adjustedThresholds.fps = 40;
			adjustedThresholds.renderTime = 25;
			adjustedThresholds.memoryUsage = 0.85;
			adjustedThresholds.interactiveResponsiveness = 67;
		}

		return adjustedThresholds;
	}

	/**
	 * Create and register standard test scenarios
	 */
	createStandardTestScenarios(): void {
		// Idle Test - just measuring baseline performance
		this.registerScenario({
			id: 'idle',
			name: 'Idle Performance',
			description: 'Measures performance with no active animations or interactions',
			setup: async () => {
				// Nothing to do, just measure baseline
			},
			teardown: async () => {
				// Nothing to clean up
			},
			duration: 5000,
			benchmarkTypes: [BenchmarkType.FPS, BenchmarkType.MemoryUsage]
		});

		// Animation Stress Test
		this.registerScenario({
			id: 'animation-stress',
			name: 'Animation Stress Test',
			description: 'Measures performance with maximum number of animated stars',
			setup: async () => {
				// Temporarily increase star count to maximum
				const maxStars = get(deviceCapabilities).maxStars;

				// This would be implemented by the application to increase star count
				if (window.setStarCount) {
					window.setStarCount(maxStars);
				}
			},
			teardown: async () => {
				// Return to normal star count
				if (window.setStarCount) {
					window.setStarCount(get(deviceCapabilities).maxStars / 2);
				}
			},
			duration: 10000,
			benchmarkTypes: [BenchmarkType.FPS, BenchmarkType.MemoryUsage, BenchmarkType.RenderTime]
		});

		// Object Pool Test
		this.registerScenario({
			id: 'object-pool',
			name: 'Object Pool Test',
			description: 'Tests efficiency of object pooling implementation',
			setup: async () => {
				// Reset pool stats
				if (window.resetPoolStats) {
					window.resetPoolStats();
				}

				// Create rapidly changing stars to stress object pool
				if (window.createTemporaryStars) {
					window.createTemporaryStars(50, 100);
				}
			},
			teardown: async () => {
				// Cleanup temporary stars
				if (window.cleanupTemporaryStars) {
					window.cleanupTemporaryStars();
				}
			},
			duration: 5000,
			benchmarkTypes: [BenchmarkType.ObjectPooling, BenchmarkType.MemoryUsage]
		});

		// Interaction Test
		this.registerScenario({
			id: 'interaction',
			name: 'Interaction Test',
			description: 'Tests responsiveness during user interactions',
			setup: async () => {
				// Setup event listeners or triggers for interaction testing
			},
			teardown: async () => {
				// Cleanup interaction test
			},
			duration: 5000,
			benchmarkTypes: [BenchmarkType.InteractiveResponsiveness, BenchmarkType.FPS]
		});
	}

	/**
	 * Generate a performance report based on test results
	 */
	generateReport(): string {
		if (!browser) return 'Report generation requires browser environment';

		let report = '# Performance Test Report\n\n';
		report += `Generated: ${new Date().toLocaleString()}\n\n`;

		// Device information
		const capabilities = get(deviceCapabilities);
		report += '## Device Information\n\n';
		report += `- Device Tier: ${capabilities.tier}\n`;
		report += `- Device Type: ${capabilities.isMobile ? 'Mobile' : capabilities.isTablet ? 'Tablet' : 'Desktop'}\n`;
		report += `- Browser: ${navigator.userAgent}\n`;
		report += `- Hardware Acceleration: ${capabilities.hasGPUAcceleration ? 'Enabled' : 'Disabled'}\n`;
		report += `- Screen Size: ${window.innerWidth}x${window.innerHeight}\n\n`;

		// Test results
		report += '## Test Results\n\n';

		let hasResults = false;

		// Iterate through all scenarios
		this.scenarios.forEach((scenario, scenarioId) => {
			const results = this.testResults.get(scenarioId);
			if (!results || results.length === 0) return;

			hasResults = true;

			// Get latest result
			const latestResult = results[results.length - 1];

			report += `### ${scenario.name}\n\n`;
			report += `${scenario.description}\n\n`;
			report += `- Result: ${latestResult.pass ? '✅ PASS' : '❌ FAIL'}\n`;
			report += `- Timestamp: ${new Date(latestResult.timestamp).toLocaleString()}\n\n`;

			// Benchmark details
			report += '#### Benchmark Results\n\n';
			report += '| Benchmark | Average | Min | Max | P95 | Status |\n';
			report += '|-----------|---------|-----|-----|-----|--------|\n';

			latestResult.results.forEach((benchmark) => {
				const { avg, min, max, p95 } = benchmark.metrics;

				// Determine status based on benchmark type and thresholds
				let status = '✅';
				const thresholds = this.getAdjustedThresholds();

				switch (benchmark.type) {
					case BenchmarkType.FPS:
						if (avg < thresholds.fps) status = '❌';
						break;
					case BenchmarkType.RenderTime:
						if (avg > thresholds.renderTime) status = '❌';
						break;
					case BenchmarkType.MemoryUsage:
						if (avg > thresholds.memoryUsage) status = '❌';
						break;
					case BenchmarkType.ObjectPooling:
						if (avg < thresholds.objectPooling) status = '❌';
						break;
					case BenchmarkType.InteractiveResponsiveness:
						if (avg > thresholds.interactiveResponsiveness) status = '❌';
						break;
				}

				report += `| ${benchmark.type} | ${avg.toFixed(2)} | ${min.toFixed(2)} | ${max.toFixed(2)} | ${p95.toFixed(2)} | ${status} |\n`;
			});

			report += '\n';

			// Comparison with baseline if available
			if (latestResult.comparison) {
				report += '#### Comparison with Baseline\n\n';
				report += '| Benchmark | Change | Significance |\n';
				report += '|-----------|--------|-------------|\n';

				Object.keys(latestResult.comparison.percentageChanges).forEach((benchmarkType) => {
					const change = latestResult.comparison!.percentageChanges[benchmarkType];
					const improved = latestResult.comparison!.improvements[benchmarkType];
					const significance = latestResult.comparison!.significance[benchmarkType];

					// Format change with arrow indicator
					const changeStr = `${improved ? '▲' : '▼'} ${change.toFixed(2)}%`;

					report += `| ${benchmarkType} | ${changeStr} | ${significance} |\n`;
				});

				report += '\n';
			}
		});

		if (!hasResults) {
			report += 'No test results available.\n\n';
		}

		// Current Performance Metrics
		report += '## Current Performance Metrics\n\n';
		report += `- FPS: ${get(fpsStore).toFixed(1)}\n`;

		// Memory usage if available
		if ('performance' in window && (('memory' in performance) as any)) {
			const memory = (performance as any).memory;
			const memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
			report += `- Memory Usage: ${(memoryUsage * 100).toFixed(1)}%\n`;
			report += `- JS Heap Size: ${(memory.usedJSHeapSize / (1024 * 1024)).toFixed(1)} MB / ${(memory.jsHeapSizeLimit / (1024 * 1024)).toFixed(1)} MB\n`;
		}

		// Object pool stats
		const poolStats = get(objectPoolStatsStore);
		report += `- Object Pool Utilization: ${(poolStats.utilizationRate * 100).toFixed(1)}%\n`;
		report += `- Object Reuse Ratio: ${(poolStats.reuseRatio * 100).toFixed(1)}%\n`;
		report += `- Memory Saved: ${poolStats.estimatedMemorySaved.toFixed(0)} KB\n\n`;

		// Recommendations
		report += '## Recommendations\n\n';

		// Generate recommendations based on performance metrics
		const fps = get(fpsStore);
		const poolUtilization = poolStats.utilizationRate;

		if (fps < 30) {
			report +=
				'- **Critical**: Frame rate is too low. Consider reducing graphical effects or the number of animated elements.\n';
		} else if (fps < 45) {
			report +=
				'- **Warning**: Frame rate is below optimal levels. Review recent changes that may have impacted performance.\n';
		}

		if (poolUtilization > 0.9) {
			report +=
				'- **Warning**: Object pool is near capacity. Consider increasing pool size or optimizing object reuse.\n';
		}

		if (poolStats.reuseRatio < 0.5) {
			report +=
				'- **Suggestion**: Object reuse ratio is low. Review object creation patterns to improve reuse.\n';
		}

		return report;
	}
}

// Export singleton instance
export const performanceTestRunner = new PerformanceTestRunner();

// Initialize standard test scenarios when in browser
if (browser) {
	performanceTestRunner.createStandardTestScenarios();

	// Expose test runner to window for debugging and console access
	(window as any).performanceTestRunner = performanceTestRunner;
}

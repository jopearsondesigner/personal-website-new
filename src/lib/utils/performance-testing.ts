// src/lib/utils/performance-testing.ts
import { browser } from '$app/environment';
import { writable, get } from 'svelte/store';

// Test scenario store
export const testScenarios = writable<TestScenario[]>([]);

// Test results store
export const testResults = writable<TestResult[]>([]);

// Type definitions
export interface TestScenario {
	id: string;
	name: string;
	description: string;
	setup: () => Promise<void>;
	teardown: () => Promise<void>;
	duration: number; // in milliseconds
}

export interface TestResult {
	scenarioId: string;
	timestamp: number;
	fps: {
		avg: number;
		min: number;
		max: number;
		stability: number; // 0-100%, higher is better
	};
	memory: number; // 0-1 ratio of used memory
	timing: {
		render: number; // ms
		update: number; // ms
		total: number; // ms
	};
	objectPool: {
		utilization: number; // 0-1 ratio
		reuseRatio: number; // 0-1 ratio
		memorySaved: number; // KB
	};
	score: number; // 0-100 performance score
	baseline: boolean; // whether this is a baseline result
	optimizationEnabled: boolean; // whether optimizations were enabled
}

// Performance testing framework
export class PerformanceTester {
	private currentTest: TestScenario | null = null;
	private testInProgress = false;
	private frameData: number[] = [];
	private memoryData: number[] = [];
	private renderTimeData: number[] = [];
	private updateTimeData: number[] = [];
	private objectPoolData: { utilization: number; reuseRatio: number; memorySaved: number }[] = [];
	private benchmarkData: { [key: string]: TestResult } = {};

	// Event callbacks
	private onTestStartCallback: ((scenario: TestScenario) => void) | null = null;
	private onTestProgressCallback: ((progress: number) => void) | null = null;
	private onTestCompleteCallback: ((result: TestResult) => void) | null = null;

	constructor() {
		// Register default test scenarios
		this.registerDefaultScenarios();
	}

	/**
	 * Register event callbacks
	 */
	public onTestStart(callback: (scenario: TestScenario) => void): void {
		this.onTestStartCallback = callback;
	}

	public onTestProgress(callback: (progress: number) => void): void {
		this.onTestProgressCallback = callback;
	}

	public onTestComplete(callback: (result: TestResult) => void): void {
		this.onTestCompleteCallback = callback;
	}

	/**
	 * Add a test scenario
	 */
	public registerScenario(scenario: TestScenario): void {
		testScenarios.update((scenarios) => [...scenarios, scenario]);
	}

	/**
	 * Register default test scenarios
	 */
	private registerDefaultScenarios(): void {
		const baselineScenario: TestScenario = {
			id: 'baseline',
			name: 'Baseline Performance',
			description: 'Measures baseline performance with standard settings.',
			setup: async () => {
				// Reset any settings to their defaults
				await this.setAllOptimizations(true);
			},
			teardown: async () => {
				// Restore original settings
				await this.setAllOptimizations(true);
			},
			duration: 5000 // 5 seconds
		};

		const noOptimizationsScenario: TestScenario = {
			id: 'no-optimizations',
			name: 'No Optimizations',
			description: 'Measures performance with all optimizations disabled.',
			setup: async () => {
				// Disable all optimizations
				await this.setAllOptimizations(false);
			},
			teardown: async () => {
				// Restore optimizations
				await this.setAllOptimizations(true);
			},
			duration: 5000 // 5 seconds
		};

		const highLoadScenario: TestScenario = {
			id: 'high-load',
			name: 'High Load Test',
			description: 'Tests performance under high memory and rendering pressure.',
			setup: async () => {
				// Enable all optimizations
				await this.setAllOptimizations(true);

				// Create temporary stress on the system
				await this.createStressLoad();
			},
			teardown: async () => {
				// Clean up any resources
				await this.clearStressLoad();
			},
			duration: 8000 // 8 seconds
		};

		const objectPoolStressScenario: TestScenario = {
			id: 'object-pool-stress',
			name: 'Object Pool Stress Test',
			description: 'Tests object pool performance under high allocation pressure.',
			setup: async () => {
				// Enable pool but create high pressure
				await this.stressObjectPool();
			},
			teardown: async () => {
				// Restore normal pool operation
				await this.resetObjectPool();
			},
			duration: 5000 // 5 seconds
		};

		// Register all scenarios
		this.registerScenario(baselineScenario);
		this.registerScenario(noOptimizationsScenario);
		this.registerScenario(highLoadScenario);
		this.registerScenario(objectPoolStressScenario);
	}

	/**
	 * Run a performance test for a specific scenario
	 */
	public async runTest(scenarioId: string, setAsBaseline = false): Promise<TestResult | null> {
		if (!browser || this.testInProgress) return null;

		// Find the requested scenario
		const scenarios = get(testScenarios);
		const scenario = scenarios.find((s) => s.id === scenarioId);

		if (!scenario) {
			console.error(`Test scenario '${scenarioId}' not found`);
			return null;
		}

		try {
			this.testInProgress = true;
			this.currentTest = scenario;

			// Reset data collection arrays
			this.frameData = [];
			this.memoryData = [];
			this.renderTimeData = [];
			this.updateTimeData = [];
			this.objectPoolData = [];

			// Notify test start
			if (this.onTestStartCallback) {
				this.onTestStartCallback(scenario);
			}

			// Run test setup
			await scenario.setup();

			// Start data collection
			const startTime = performance.now();
			const endTime = startTime + scenario.duration;

			// Begin measurement loop
			return await new Promise<TestResult>((resolve) => {
				const measureInterval = setInterval(() => {
					const now = performance.now();
					const elapsed = now - startTime;
					const progress = Math.min(100, (elapsed / scenario.duration) * 100);

					// Collect current metrics
					this.collectCurrentMetrics();

					// Report progress
					if (this.onTestProgressCallback) {
						this.onTestProgressCallback(progress);
					}

					// Check if test is complete
					if (now >= endTime) {
						clearInterval(measureInterval);
						this.completeTest(scenarioId, setAsBaseline).then(resolve);
					}
				}, 100); // Collect metrics every 100ms
			});
		} catch (err) {
			console.error('Error running performance test:', err);
			this.testInProgress = false;
			return null;
		}
	}

	/**
	 * Collect current performance metrics
	 */
	private collectCurrentMetrics(): void {
		if (!browser) return;

		try {
			// Import required modules for data collection
			Promise.all([
				import('$lib/utils/performance-metrics'),
				import('$lib/utils/device-performance')
			]).then(([metrics, devicePerf]) => {
				// Collect FPS data
				const currentFps = get(metrics.fpsStore);
				if (currentFps > 0) {
					this.frameData.push(currentFps);
				}

				// Collect memory data
				const currentMemory = get(metrics.memoryUsageStore);
				this.memoryData.push(currentMemory);

				// Collect timing data
				const renderTime = get(metrics.renderTimeStore);
				const updateTime = get(metrics.updateTimeStore);
				this.renderTimeData.push(renderTime);
				this.updateTimeData.push(updateTime);

				// Collect object pool data
				const poolStats = get(devicePerf.objectPoolStatsStore);
				this.objectPoolData.push({
					utilization: poolStats.utilizationRate,
					reuseRatio: poolStats.reuseRatio,
					memorySaved: poolStats.estimatedMemorySaved
				});
			});
		} catch (err) {
			console.error('Error collecting metrics:', err);
		}
	}

	/**
	 * Complete the test and calculate results
	 */
	private async completeTest(scenarioId: string, setAsBaseline: boolean): Promise<TestResult> {
		if (!browser || !this.currentTest) {
			throw new Error('No active test');
		}

		try {
			// Run test teardown
			await this.currentTest.teardown();

			// Calculate test results
			const result = this.calculateTestResults(scenarioId, setAsBaseline);

			// Store test results
			testResults.update((results) => [...results, result]);

			// Set as benchmark if requested
			if (setAsBaseline) {
				this.benchmarkData[scenarioId] = result;
			}

			// Notify test completion
			if (this.onTestCompleteCallback) {
				this.onTestCompleteCallback(result);
			}

			// Reset test state
			this.testInProgress = false;
			this.currentTest = null;

			return result;
		} catch (err) {
			console.error('Error completing test:', err);
			this.testInProgress = false;
			this.currentTest = null;
			throw err;
		}
	}

	/**
	 * Calculate test results from collected data
	 */
	private calculateTestResults(scenarioId: string, isBaseline: boolean): TestResult {
		// Calculate FPS statistics
		const fpsSamples = this.frameData.filter((fps) => fps > 0);
		const avgFps =
			fpsSamples.length > 0 ? fpsSamples.reduce((sum, fps) => sum + fps, 0) / fpsSamples.length : 0;
		const minFps = fpsSamples.length > 0 ? Math.min(...fpsSamples) : 0;
		const maxFps = fpsSamples.length > 0 ? Math.max(...fpsSamples) : 0;

		// Calculate FPS stability (100% = perfectly stable, 0% = highly variable)
		let fpsStability = 100;
		if (fpsSamples.length > 1 && avgFps > 0) {
			const fpsVariance =
				fpsSamples.reduce((sum, fps) => sum + Math.pow(fps - avgFps, 2), 0) / fpsSamples.length;
			const fpsStdDev = Math.sqrt(fpsVariance);
			fpsStability = Math.max(0, 100 - (fpsStdDev / avgFps) * 100);
		}

		// Calculate memory usage
		const avgMemory =
			this.memoryData.length > 0
				? this.memoryData.reduce((sum, mem) => sum + mem, 0) / this.memoryData.length
				: 0;

		// Calculate timing statistics
		const avgRenderTime =
			this.renderTimeData.length > 0
				? this.renderTimeData.reduce((sum, time) => sum + time, 0) / this.renderTimeData.length
				: 0;
		const avgUpdateTime =
			this.updateTimeData.length > 0
				? this.updateTimeData.reduce((sum, time) => sum + time, 0) / this.updateTimeData.length
				: 0;

		// Calculate object pool statistics
		const avgUtilization =
			this.objectPoolData.length > 0
				? this.objectPoolData.reduce((sum, data) => sum + data.utilization, 0) /
					this.objectPoolData.length
				: 0;
		const avgReuseRatio =
			this.objectPoolData.length > 0
				? this.objectPoolData.reduce((sum, data) => sum + data.reuseRatio, 0) /
					this.objectPoolData.length
				: 0;
		const avgMemorySaved =
			this.objectPoolData.length > 0
				? this.objectPoolData.reduce((sum, data) => sum + data.memorySaved, 0) /
					this.objectPoolData.length
				: 0;

		// Calculate overall performance score (0-100)
		// Weight factors: FPS (40%), stability (20%), memory efficiency (20%), rendering time (20%)
		const fpsScore = Math.min(100, (avgFps / 60) * 100);
		const stabilityScore = fpsStability;
		const memoryScore = Math.max(0, 100 - avgMemory * 100);
		const renderScore = Math.max(0, 100 - (avgRenderTime / 16) * 100);

		const overallScore =
			fpsScore * 0.4 + stabilityScore * 0.2 + memoryScore * 0.2 + renderScore * 0.2;

		return {
			scenarioId,
			timestamp: Date.now(),
			fps: {
				avg: avgFps,
				min: minFps,
				max: maxFps,
				stability: fpsStability
			},
			memory: avgMemory,
			timing: {
				render: avgRenderTime,
				update: avgUpdateTime,
				total: avgRenderTime + avgUpdateTime
			},
			objectPool: {
				utilization: avgUtilization,
				reuseRatio: avgReuseRatio,
				memorySaved: avgMemorySaved
			},
			score: overallScore,
			baseline: isBaseline,
			optimizationEnabled: this.areOptimizationsEnabled()
		};
	}

	/**
	 * Compare test results with baseline
	 */
	public compareWithBaseline(result: TestResult): {
		fpsChange: number;
		memoryChange: number;
		renderTimeChange: number;
		scoreChange: number;
		improvement: boolean;
	} {
		const baseline = this.benchmarkData[result.scenarioId];

		if (!baseline) {
			return {
				fpsChange: 0,
				memoryChange: 0,
				renderTimeChange: 0,
				scoreChange: 0,
				improvement: false
			};
		}

		const fpsChange = ((result.fps.avg - baseline.fps.avg) / baseline.fps.avg) * 100;
		const memoryChange = ((result.memory - baseline.memory) / baseline.memory) * 100;
		const renderTimeChange =
			((result.timing.render - baseline.timing.render) / baseline.timing.render) * 100;
		const scoreChange = ((result.score - baseline.score) / baseline.score) * 100;

		return {
			fpsChange,
			memoryChange,
			renderTimeChange,
			scoreChange,
			improvement: scoreChange > 0
		};
	}

	/**
	 * Export test results as JSON
	 */
	public exportResults(): string {
		const results = get(testResults);
		return JSON.stringify(results, null, 2);
	}

	/**
	 * Utility methods for test scenarios
	 */

	// Check if optimizations are enabled
	private areOptimizationsEnabled(): boolean {
		// Check localStorage for optimization settings
		if (!browser) return true;

		try {
			const poolEnabled = localStorage.getItem('objectPoolEnabled') !== 'false';
			const framerateOptimized = localStorage.getItem('framerateOptimized') !== 'false';
			const renderOptimized = localStorage.getItem('renderOptimized') !== 'false';

			return poolEnabled && framerateOptimized && renderOptimized;
		} catch (err) {
			return true; // Default to true
		}
	}

	// Enable or disable all optimizations
	private async setAllOptimizations(enabled: boolean): Promise<void> {
		if (!browser) return;

		try {
			// Set localStorage values
			localStorage.setItem('objectPoolEnabled', enabled ? 'true' : 'false');
			localStorage.setItem('framerateOptimized', enabled ? 'true' : 'false');
			localStorage.setItem('renderOptimized', enabled ? 'true' : 'false');

			// Apply settings by importing and calling relevant modules
			const modules = await Promise.all([
				import('$lib/utils/star-pool-bridge'),
				import('$lib/utils/frame-rate-controller')
			]);

			// Apply to star pool
			if (modules[0]?.starPoolBridge) {
				modules[0].starPoolBridge.setEnabled(enabled);
			}

			// Apply to framerate controller
			if (modules[1]?.setOptimizedMode) {
				modules[1].setOptimizedMode(enabled);
			}

			// Wait a moment for settings to apply
			await new Promise((resolve) => setTimeout(resolve, 200));
		} catch (err) {
			console.error('Error setting optimizations:', err);
		}
	}

	// Create artificial load for stress testing
	private async createStressLoad(): Promise<void> {
		if (!browser) return;

		try {
			// Create a high number of DOM elements temporarily
			const container = document.createElement('div');
			container.id = 'perf-test-stress-container';
			container.style.position = 'absolute';
			container.style.left = '-9999px';
			container.style.top = '-9999px';
			document.body.appendChild(container);

			// Create a large number of elements
			for (let i = 0; i < 1000; i++) {
				const div = document.createElement('div');
				div.textContent = `Stress test element ${i}`;
				div.style.width = '100px';
				div.style.height = '20px';
				container.appendChild(div);
			}

			// Force layout calculation
			container.getBoundingClientRect();
		} catch (err) {
			console.error('Error creating stress load:', err);
		}
	}

	// Clear stress load
	private async clearStressLoad(): Promise<void> {
		if (!browser) return;

		try {
			const container = document.getElementById('perf-test-stress-container');
			if (container) {
				document.body.removeChild(container);
			}
		} catch (err) {
			console.error('Error clearing stress load:', err);
		}
	}

	// Stress the object pool system
	private async stressObjectPool(): Promise<void> {
		if (!browser) return;

		try {
			const poolModule = await import('$lib/utils/star-pool-bridge');

			if (poolModule?.starPoolBridge) {
				// Enable pool but request many objects in rapid succession
				poolModule.starPoolBridge.setEnabled(true);

				// Request a large number of objects in sequence
				const requestInterval = setInterval(() => {
					poolModule.starPoolBridge.requestObject();
				}, 10);

				// Store interval ID for cleanup
				(window as any).__stressTestInterval = requestInterval;
			}
		} catch (err) {
			console.error('Error stressing object pool:', err);
		}
	}

	// Reset object pool after stress test
	private async resetObjectPool(): Promise<void> {
		if (!browser) return;

		try {
			// Clear stress test interval
			const interval = (window as any).__stressTestInterval;
			if (interval) {
				clearInterval(interval);
				delete (window as any).__stressTestInterval;
			}

			// Reset pool
			const poolModule = await import('$lib/utils/star-pool-bridge');
			if (poolModule?.starPoolBridge) {
				poolModule.starPoolBridge.reset();
			}
		} catch (err) {
			console.error('Error resetting object pool:', err);
		}
	}
}

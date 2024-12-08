/**
 * @fileoverview Environment Effects Module - Manages all environmental visual effects
 * @module src/lib/components/game/effects/environment
 * @requires ../utils/math
 * @requires ../managers/assetManager
 */

const DEBUG = process.env.NODE_ENV === 'development';

/**
 * Debug logging utility
 * @param {...any} args - Arguments to log
 */
function debugLog(...args) {
	if (DEBUG) {
		console.log(`[Environment]`, ...args);
	}
}

/**
 * NES color palette for environment effects
 * @constant {Object}
 */
const NESPalette = {
	nightSky: '#0000fc',
	sunrise: '#f8d878',
	daySky: '#a4e4fc',
	sunset: '#f87858',
	duskDawn: '#6888fc',
	moon: '#fcfcfc'
};

/**
 * @class EnvironmentManager
 * @description Manages all environmental effects including sky, celestial objects, and city
 * @implements {CleanupInterface}
 */
class EnvironmentManager {
	/**
	 * @constructor
	 * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
	 * @param {Object} config - Configuration options
	 */
	constructor(ctx, config = {}) {
		this.ctx = ctx;
		this.canvas = ctx.canvas;
		this.config = {
			dayNightCycleSpeed: 0.01,
			numberOfStars: 100,
			skyFlashDuration: 30,
			...config
		};

		// Environment state
		this.dayNightCycle = 180;
		this.skyFlashActive = false;
		this.skyFlashTimer = 0;

		// Initialize components
		this.stars = [];
		this.shootingStars = [];
		this.clouds = [];
		this.cityFires = [];
		this.smokeParticles = new ParticlePool(100);

		this.initializeEnvironment();
		this.bindEventListeners();
	}

	/**
	 * Initialize all environment components
	 * @private
	 */
	initializeEnvironment() {
		try {
			this.initializeStars();
			this.initializeClouds();
			this.initializeCityFires();
			debugLog('Environment initialized');
		} catch (error) {
			console.error('[Environment] Initialization failed:', error);
			this.handleInitializationError();
		}
	}

	/**
	 * Initialize star system
	 * @private
	 */
	initializeStars() {
		for (let i = 0; i < this.config.numberOfStars; i++) {
			this.stars.push(new Star(this.canvas.width, this.canvas.height));
		}
	}

	/**
	 * Initialize cloud system
	 * @private
	 */
	initializeClouds() {
		for (let i = 0; i < 5; i++) {
			this.clouds.push(new Cloud(this.canvas.width));
		}
	}

	/**
	 * Initialize city fire effects
	 * @private
	 */
	initializeCityFires() {
		for (let i = 0; i < 10; i++) {
			const x = Math.random() * this.canvas.width;
			const y = this.canvas.height - Math.random() * 100;
			this.cityFires.push(new CityFire(x, y));
		}
	}

	/**
	 * Handle window resize events
	 * @private
	 */
	handleResize = () => {
		const { width, height } = this.canvas;
		this.stars.forEach((star) => star.adjustPosition(width, height));
		this.clouds.forEach((cloud) => cloud.adjustPosition(width));
	};

	/**
	 * Bind event listeners
	 * @private
	 */
	bindEventListeners() {
		window.addEventListener('resize', this.handleResize);
	}

	/**
	 * Update all environment components
	 * @param {number} deltaTime - Time since last update
	 */
	update(deltaTime) {
		this.updateDayNightCycle(deltaTime);
		this.updateCelestialObjects(deltaTime);
		this.updateAtmosphericEffects(deltaTime);
		this.updateCityEffects(deltaTime);
	}

	/**
	 * Update day/night cycle
	 * @private
	 * @param {number} deltaTime - Time since last update
	 */
	updateDayNightCycle(deltaTime) {
		this.dayNightCycle = (this.dayNightCycle + this.config.dayNightCycleSpeed * deltaTime) % 360;

		// Random sky flash effects
		if (!this.skyFlashActive && Math.random() < 0.005) {
			this.skyFlashActive = true;
			this.skyFlashTimer = this.config.skyFlashDuration;
		}

		if (this.skyFlashActive) {
			this.skyFlashTimer--;
			if (this.skyFlashTimer <= 0) {
				this.skyFlashActive = false;
			}
		}
	}

	/**
	 * Update celestial objects
	 * @private
	 * @param {number} deltaTime - Time since last update
	 */
	updateCelestialObjects(deltaTime) {
		// Update stars
		this.stars.forEach((star) => star.update(deltaTime));

		// Manage shooting stars
		if (Math.random() < 0.005) {
			this.shootingStars.push(new ShootingStar(this.canvas.width));
		}

		this.shootingStars = this.shootingStars.filter((star) => {
			star.update(deltaTime);
			return !star.isOffScreen(this.canvas.width, this.canvas.height);
		});
	}

	/**
	 * Update atmospheric effects
	 * @private
	 * @param {number} deltaTime - Time since last update
	 */
	updateAtmosphericEffects(deltaTime) {
		this.clouds.forEach((cloud) => cloud.update(deltaTime));
		this.smokeParticles.update(deltaTime);
	}

	/**
	 * Update city effects
	 * @private
	 * @param {number} deltaTime - Time since last update
	 */
	updateCityEffects(deltaTime) {
		this.cityFires.forEach((fire) => {
			fire.update(deltaTime);
			if (Math.random() < 0.2) {
				this.smokeParticles.activate(fire.x + Math.random() * 60 - 30, fire.y - 20);
			}
		});
	}

	/**
	 * Render all environment components
	 */
	render() {
		this.renderSky();
		this.renderCelestialObjects();
		this.renderAtmosphericEffects();
		this.renderCitySilhouette();
	}

	/**
	 * Render sky with day/night cycle
	 * @private
	 */
	renderSky() {
		const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);

		if (this.skyFlashActive) {
			gradient.addColorStop(0, '#ffffff');
			gradient.addColorStop(1, '#f8d878');
		} else {
			const skyColors = this.calculateSkyColors();
			gradient.addColorStop(0, skyColors.top);
			gradient.addColorStop(1, skyColors.bottom);
		}

		this.ctx.fillStyle = gradient;
		this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
	}

	/**
	 * Calculate sky colors based on day/night cycle
	 * @private
	 * @returns {Object} Top and bottom sky colors
	 */
	calculateSkyColors() {
		const cycle = this.dayNightCycle;
		if (cycle < 90) {
			return {
				top: this.interpolateColor(NESPalette.nightSky, NESPalette.sunrise, cycle / 90),
				bottom: NESPalette.duskDawn
			};
		} else if (cycle < 180) {
			return {
				top: this.interpolateColor(NESPalette.sunrise, NESPalette.daySky, (cycle - 90) / 90),
				bottom: NESPalette.daySky
			};
		} else if (cycle < 270) {
			return {
				top: this.interpolateColor(NESPalette.daySky, NESPalette.sunset, (cycle - 180) / 90),
				bottom: NESPalette.sunset
			};
		} else {
			return {
				top: this.interpolateColor(NESPalette.sunset, NESPalette.nightSky, (cycle - 270) / 90),
				bottom: NESPalette.duskDawn
			};
		}
	}

	/**
	 * Interpolate between two colors
	 * @private
	 * @param {string} color1 - Starting color
	 * @param {string} color2 - Ending color
	 * @param {number} factor - Interpolation factor (0-1)
	 * @returns {string} Interpolated color
	 */
	interpolateColor(color1, color2, factor) {
		let result = '#';
		for (let i = 1; i <= 5; i += 2) {
			const hex1 = parseInt(color1.substr(i, 2), 16);
			const hex2 = parseInt(color2.substr(i, 2), 16);
			const hex = Math.round(hex1 + (hex2 - hex1) * factor).toString(16);
			result += ('00' + hex).slice(-2);
		}
		return result;
	}

	/**
	 * Render celestial objects
	 * @private
	 */
	renderCelestialObjects() {
		// Render stars
		this.stars.forEach((star) => star.render(this.ctx));

		// Render shooting stars
		this.shootingStars.forEach((star) => star.render(this.ctx));

		// Render moon
		const moonPos = this.calculateMoonPosition();
		this.renderMoon(moonPos.x, moonPos.y);
	}

	/**
	 * Calculate moon position based on day/night cycle
	 * @private
	 * @returns {Object} Moon coordinates
	 */
	calculateMoonPosition() {
		const centerX = this.canvas.width / 2;
		const centerY = this.canvas.height / 2;
		const radiusX = Math.min(this.canvas.width, this.canvas.height) / 2;
		const radiusY = Math.min(this.canvas.width, this.canvas.height) / 4;
		const angle = Math.PI * 2 * (this.dayNightCycle / 360);

		return {
			x: centerX + radiusX * Math.cos(angle),
			y: centerY + radiusY * Math.sin(angle)
		};
	}

	/**
	 * Render moon with craters and glow
	 * @private
	 * @param {number} x - X coordinate
	 * @param {number} y - Y coordinate
	 */
	renderMoon(x, y) {
		// Moon glow
		const gradient = this.ctx.createRadialGradient(x, y, 30, x, y, 45);
		gradient.addColorStop(0, 'rgba(104, 136, 252, 0.5)');
		gradient.addColorStop(1, 'rgba(104, 136, 252, 0)');
		this.ctx.fillStyle = gradient;
		this.ctx.beginPath();
		this.ctx.arc(x, y, 45, 0, Math.PI * 2);
		this.ctx.fill();

		// Moon surface
		this.ctx.fillStyle = NESPalette.moon;
		this.ctx.beginPath();
		this.ctx.arc(x, y, 30, 0, Math.PI * 2);
		this.ctx.fill();

		// Craters
		const craters = [
			{ dx: -10, dy: -10, size: 8 },
			{ dx: 15, dy: 0, size: 5 },
			{ dx: 5, dy: 15, size: 3 },
			{ dx: -20, dy: 10, size: 4 }
		];

		craters.forEach((crater) => {
			this.ctx.fillStyle = '#7c7c7c';
			this.ctx.beginPath();
			this.ctx.arc(x + crater.dx, y + crater.dy, crater.size, 0, Math.PI * 2);
			this.ctx.fill();
		});
	}

	/**
	 * Render atmospheric effects
	 * @private
	 */
	renderAtmosphericEffects() {
		this.clouds.forEach((cloud) => cloud.render(this.ctx));
		this.smokeParticles.render(this.ctx);
	}

	/**
	 * Render city silhouette
	 * @private
	 */
	renderCitySilhouette() {
		const cityBaseLine = this.canvas.height;
		const buildings = this.generateBuildingData();

		buildings.forEach((building) => {
			this.renderBuilding(building, cityBaseLine);
		});

		// Render fires and smoke
		this.cityFires.forEach((fire) => fire.render(this.ctx));
	}

	/**
	 * Generate building data for city silhouette
	 * @private
	 * @returns {Array} Building data
	 */
	generateBuildingData() {
		// Implementation remains the same as in the original code
		return [
			{ height: 190, width: 15, roof: 'flat' },
			{ height: 132, width: 12, roof: 'flat' }
			// ... rest of the building data
		];
	}

	/**
	 * Render a single building
	 * @private
	 * @param {Object} building - Building data
	 * @param {number} baseLine - Base line for building
	 */
	renderBuilding(building, baseLine) {
		// Implementation remains the same as in the original code
	}

	/**
	 * Clean up resources
	 */
	cleanup() {
		window.removeEventListener('resize', this.handleResize);
		this.stars = [];
		this.shootingStars = [];
		this.clouds = [];
		this.cityFires = [];
		this.smokeParticles.cleanup();
	}

	/**
	 * Handle initialization errors
	 * @private
	 */
	handleInitializationError() {
		this.stars = [];
		this.clouds = [];
		this.cityFires = [];
		debugLog('Falling back to minimal environment');
	}
}

// Export classes and utilities
export { Star, Cloud, ShootingStar, CityFire, ParticlePool };
export default EnvironmentManager;

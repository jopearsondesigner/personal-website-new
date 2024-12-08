/**
 * @fileoverview AssetManager - Manages game assets including loading, caching, and disposal
 * @module src/lib/components/game/managers/assetManager.js
 * @requires module:src/lib/components/game/constants
 */

import { ASSET_MANIFEST } from '../constants.js';

const DEBUG = process.env.NODE_ENV === 'development';

function debugLog(...args) {
	if (DEBUG) {
		console.log(`[AssetManager]`, ...args);
	}
}

/**
 * @class AssetManager
 * @description Handles loading, caching, and disposing of game assets
 * @implements {CleanupInterface}
 */
export default class AssetManager {
	constructor() {
		this.assets = new Map();
		this.loadingProgress = 0;
		this.totalAssets = 0;
		this.loadedAssets = 0;
	}

	/**
	 * @method preload
	 * @description Preloads all assets defined in the asset manifest
	 * @returns {Promise<void>} Resolves when all assets are loaded
	 * @throws {Error} If an asset fails to load
	 */
	async preload() {
		debugLog('Preloading assets...');
		this.totalAssets = ASSET_MANIFEST.length;

		const loadPromises = ASSET_MANIFEST.map(async (asset) => {
			try {
				await this.loadAsset(asset.name, asset.path);
				this.loadedAssets++;
				this.updateProgress();
			} catch (error) {
				console.error(`[AssetManager] Failed to load asset ${asset.name}:`, error);
				throw error;
			}
		});

		await Promise.all(loadPromises);
		debugLog('All assets loaded.');
	}

	/**
	 * @method loadAsset
	 * @description Loads a single asset and caches it
	 * @param {string} name - The name of the asset
	 * @param {string} path - The path to the asset
	 * @returns {Promise<void>} Resolves when the asset is loaded
	 * @throws {Error} If the asset fails to load
	 */
	loadAsset(name, path) {
		return new Promise((resolve, reject) => {
			debugLog(`Loading asset ${name}...`);

			let asset;
			if (path.endsWith('.png') || path.endsWith('.jpg')) {
				asset = new Image();
			} else if (path.endsWith('.mp3') || path.endsWith('.wav')) {
				asset = new Audio();
			} else {
				reject(new Error(`Unsupported asset type: ${path}`));
				return;
			}

			asset.onload = () => {
				this.assets.set(name, asset);
				debugLog(`Asset ${name} loaded.`);
				resolve();
			};

			asset.onerror = () => {
				reject(new Error(`Failed to load asset: ${path}`));
			};

			asset.src = path;
		});
	}

	/**
	 * @method getAsset
	 * @description Retrieves an asset from the cache
	 * @param {string} name - The name of the asset
	 * @returns {Image|Audio} The requested asset
	 * @throws {Error} If the asset is not found
	 */
	getAsset(name) {
		const asset = this.assets.get(name);
		if (!asset) {
			throw new Error(`Asset not found: ${name}`);
		}
		return asset;
	}

	/**
	 * @method disposeAsset
	 * @description Removes an asset from the cache and frees its memory
	 * @param {string} name - The name of the asset to dispose
	 */
	disposeAsset(name) {
		const asset = this.assets.get(name);
		if (asset) {
			asset.onload = null;
			asset.onerror = null;
			asset.src = '';
			this.assets.delete(name);
			debugLog(`Asset ${name} disposed.`);
		}
	}

	/**
	 * @method cleanup
	 * @description Cleans up the asset manager, disposing all assets
	 */
	cleanup() {
		debugLog('Cleaning up AssetManager...');
		for (const name of this.assets.keys()) {
			this.disposeAsset(name);
		}
		this.loadingProgress = 0;
		this.totalAssets = 0;
		this.loadedAssets = 0;
		debugLog('AssetManager cleaned up.');
	}

	/**
	 * @method updateProgress
	 * @description Updates the loading progress and dispatches a progress event
	 * @fires AssetManager#progress
	 */
	updateProgress() {
		this.loadingProgress = this.loadedAssets / this.totalAssets;
		debugLog(`Loading progress: ${this.loadingProgress * 100}%`);
		// Dispatch a custom event with the progress
		const progressEvent = new CustomEvent('progress', { detail: this.loadingProgress });
		document.dispatchEvent(progressEvent);
	}
}

/**
 * Progress event.
 * @event AssetManager#progress
 * @type {CustomEvent}
 * @property {number} detail - The loading progress, between 0 and 1.
 */

/**
 * @fileoverview Scoring System - Handles score tracking, difficulty scaling, and game progression
 * @module src/lib/components/game/mechanics/scoring.js
 * @requires src/lib/components/game/managers/gameManager.js
 * @requires src/lib/components/game/constants.js
 */

import { getGameState, setGameState } from '../managers/gameManager.js';
import { SCORE_EVENTS, DIFFICULTY_THRESHOLDS } from '../constants.js';

/**
 * @class ScoringSystem
 * @description Manages score tracking, difficulty scaling, and game progression
 * @implements {CleanupInterface}
 */
export default class ScoringSystem {
	constructor() {
		this.score = 0;
		this.highScore = 0;
		this.combo = 0;
		this.multiplier = 1;
		this.difficultyLevel = 1;
		this.achievementsUnlocked = [];

		this.loadPersistentData();
	}

	/**
	 * @method addPoints
	 * @param {number} points - The number of points to add
	 * @param {string} [event=null] - The event that triggered the score (e.g., 'ENEMY_KILLED')
	 */
	addPoints(points, event = null) {
		try {
			const gameState = getGameState();
			const basePoints = points * this.multiplier;
			const comboBonus = this.calculateComboBonus(basePoints);
			const totalPoints = basePoints + comboBonus;

			this.score += totalPoints;
			this.combo++;
			this.checkHighScore();
			this.checkAchievements(event, totalPoints);
			this.savePersistentData();

			setGameState({ score: this.score });

			debugLog(`Added ${totalPoints} points (base: ${basePoints}, combo: ${comboBonus})`);
		} catch (error) {
			console.error('[ScoringSystem] Error adding points:', error);
		}
	}

	calculateComboBonus(basePoints) {
		return Math.floor(basePoints * (this.combo * 0.1));
	}

	checkHighScore() {
		if (this.score > this.highScore) {
			this.highScore = this.score;
			debugLog(`New high score: ${this.highScore}`);
		}
	}

	checkAchievements(event, points) {
		// TODO: Implement achievement unlocking logic based on event and points
	}

	resetCombo() {
		this.combo = 0;
	}

	/**
	 * @method updateDifficulty
	 * @description Updates the game difficulty based on the current score
	 */
	updateDifficulty() {
		const newDifficultyLevel = DIFFICULTY_THRESHOLDS.findIndex(
			(threshold) => this.score >= threshold
		);

		if (newDifficultyLevel !== -1 && newDifficultyLevel !== this.difficultyLevel) {
			this.difficultyLevel = newDifficultyLevel + 1;
			debugLog(`Difficulty level increased to ${this.difficultyLevel}`);
			setGameState({ difficulty: this.difficultyLevel });
		}
	}

	/**
	 * @method reset
	 * @description Resets the scoring system to its initial state
	 */
	reset() {
		this.score = 0;
		this.combo = 0;
		this.multiplier = 1;
		this.difficultyLevel = 1;
		setGameState({ score: this.score, difficulty: this.difficultyLevel });
	}

	loadPersistentData() {
		try {
			const storedData = localStorage.getItem('ScoringSystem');
			if (storedData) {
				const { highScore, achievementsUnlocked } = JSON.parse(storedData);
				this.highScore = highScore;
				this.achievementsUnlocked = achievementsUnlocked;
			}
		} catch (error) {
			console.error('[ScoringSystem] Error loading persistent data:', error);
		}
	}

	savePersistentData() {
		try {
			const dataToStore = {
				highScore: this.highScore,
				achievementsUnlocked: this.achievementsUnlocked
			};
			localStorage.setItem('ScoringSystem', JSON.stringify(dataToStore));
		} catch (error) {
			console.error('[ScoringSystem] Error saving persistent data:', error);
		}
	}

	cleanup() {
		this.reset();
		debugLog('Scoring system cleaned up');
	}
}

// Named exports for utility functions
export { SCORE_EVENTS, DIFFICULTY_THRESHOLDS };

const DEBUG = process.env.NODE_ENV === 'development';

function debugLog(...args) {
	if (DEBUG) {
		console.log('[ScoringSystem]', ...args);
	}
}

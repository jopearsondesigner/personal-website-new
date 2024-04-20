// gameState.js

// Centralizing your game state management using a JavaScript module. This example will encapsulate all game state logic and provide functions to interact with this state, ensuring that direct modifications are controlled and predictable.

// Initial state
const initialState = {
  score: 0,
  lives: 3,
  enemies: [],
  enemyProjectiles: [],
  projectiles: [],
  explosions: [],
  comets: [],
  gameFrame: 0,
  gameSpeed: 1,
  difficultyIncreaseScore: 500,
  titleScreen: true,
  gameActive: false,
  isPaused: false,
  stars: [],
  numberOfStars: 100,
  cityFires: [],
  NESPalette: {
    nightSky: "#0000fc",
    duskDawn: "#6888fc",
    daySky: "#a4e4fc",
    moon: "#fcfcfc",
  },
  enemyInterval: 100,
  cometInterval: 2000,
  dayNightCycleSpeed: 0.009,
};

let state = { ...initialState };

// Function to get state
function getState() {
  return { ...state };
}

// Function to set (update) state
function setState(updates) {
  state = { ...state, ...updates };
}

// Function to reset state to initial
function resetState() {
  state = { ...initialState };
}

export { getState, setState, resetState };

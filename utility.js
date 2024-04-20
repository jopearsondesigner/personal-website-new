// utility.js

// Include utility functions and helper functions here.

// Function to check if two rectangles are colliding
function checkCollision(rect1, rect2) {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.height + rect1.y > rect2.y
  );
}

// Function to preload all game assets such as images
function preloadAssets(urls) {
  return new Promise((resolve) => {
    let loadedAssets = 0;
    urls.forEach((url) => {
      const img = new Image();
      img.onload = () => {
        loadedAssets++;
        if (loadedAssets === urls.length) {
          resolve();
        }
      };
      img.src = url;
    });
  });
}

// Function to initialize fires in the city background
function initializeCityFires(cityFires, canvas) {
  for (let i = 0; i < 10; i++) {
    let fireX = Math.random() * canvas.width;
    let fireY = canvas.height - Math.random() * 100;
    cityFires.push({ x: fireX, y: fireY });
  }
}

// Function to handle pausing the game
function togglePause(isPaused) {
  return !isPaused;
}

// Function to reset the game state variables to their initial values
function resetGameVariables({
  score,
  lives,
  enemies,
  enemyProjectiles,
  projectiles,
  explosions,
  comets,
  gameFrame,
  gameSpeed,
  difficultyIncreaseScore,
  titleScreen,
  gameActive,
  isPaused,
}) {
  score = 0;
  lives = 3; // Adjust according to your game's default
  enemies = [];
  enemyProjectiles = [];
  projectiles = [];
  explosions = [];
  comets = [];
  gameFrame = 0;
  gameSpeed = 1;
  difficultyIncreaseScore = 500;
  titleScreen = true;
  gameActive = false;
  isPaused = false;

  return {
    score,
    lives,
    enemies,
    enemyProjectiles,
    projectiles,
    explosions,
    comets,
    gameFrame,
    gameSpeed,
    difficultyIncreaseScore,
    titleScreen,
    gameActive,
    isPaused,
  };
}

// Export utility functions for use in other modules
export {
  checkCollision,
  preloadAssets,
  initializeCityFires,
  togglePause,
  resetGameVariables,
};

// End of utility.js

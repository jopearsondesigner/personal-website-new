// setup.js

// setup.js continued...

// Export variables, arrays, and functions that will be used in other modules
export {
  canvas,
  ctx,
  score,
  lives,
  enemies,
  enemyProjectiles,
  projectiles,
  explosions,
  comets,
  gameFrame,
  gameSpeed,
  titleScreen,
  gameActive,
  isPaused,
  NESPalette,
  cityFires,
  stars,
  numberOfStars,
  enemyInterval,
  cometInterval,
  dayNightCycleSpeed,
};

// Global Variables
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 800;
canvas.height = 600;

let score = 0;
let lives = 2000; // You might want to adjust this to the intended initial lives count
let enemies = [];
let enemyProjectiles = [];
let projectiles = [];
let explosions = [];
let comets = [];
let gameFrame = 0;
let gameSpeed = 1;
let titleScreen = true;
let gameActive = false;
let isPaused = false;
let difficultyIncreaseScore = 500;
const NESPalette = {
  nightSky: "#0000fc", // Deep blue for the night sky
  duskDawn: "#6888fc", // Lighter blue for dusk and dawn transitions
  daySky: "#a4e4fc", // Light blue for the daytime sky
  moon: "#fcfcfc", // White for the moon
};
let cityFires = [];
let stars = [];
const numberOfStars = 100;
const enemyInterval = 100;
const cometInterval = 2000;
const dayNightCycleSpeed = 0.009; // Adjust the speed as necessary

// Asset URLs Array
const assetURLs = [
  "assets/images/game/void_swarm_sprite.png",
  "assets/images/game/vela_main_sprite.png",
  "assets/images/game/projectile_main.png",
];

// Preload Assets Function
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

// Initialize City Fires
function initializeCityFires() {
  for (let i = 0; i < 10; i++) {
    let fireX = Math.random() * canvas.width;
    let fireY = canvas.height - Math.random() * 100;
    cityFires.push({ x: fireX, y: fireY });
  }
}

// Setup Input Listeners
function setupInputListeners() {
  window.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") player.movingLeft = true;
    if (e.key === "ArrowRight") player.movingRight = true;
    if (e.key.toLowerCase() === "p") {
      isPaused = !isPaused;
      if (!isPaused && gameActive) animate();
    }
  });

  window.addEventListener("keyup", function (e) {
    if (e.key === "ArrowLeft") player.movingLeft = false;
    if (e.key === "ArrowRight") player.movingRight = false;
  });

  window.addEventListener("click", function () {
    if (gameActive && !isPaused) {
      projectiles.push(
        new AnimatedProjectile(
          player.x + player.width / 2 - 6.5,
          player.y,
          false
        ) // Center the shot for the player
      );
    }
  });
}

// Setup Game Function
function setupGame() {
  preloadAssets(assetURLs)
    .then(() => {
      player.spriteImage.src = "assets/images/game/vela_main_sprite.png"; // Load player sprite
      // Initialize city fires
      initializeCityFires();
      // Setup input listeners
      setupInputListeners();
      if (titleScreen) {
        drawTitleScreen(); // Draw the title screen if the game starts with one
      } else {
        gameActive = true;
        animate(); // If no title screen, start the game loop directly
      }
    })
    .catch((error) => {
      console.error("Error preloading assets:", error);
    });
}

// Add the game initialization event listener
document.addEventListener("DOMContentLoaded", setupGame);

export {
  canvas,
  ctx,
  score,
  lives,
  enemies,
  enemyProjectiles,
  projectiles,
  explosions,
  comets,
  gameFrame,
  gameSpeed,
  titleScreen,
  gameActive,
  isPaused,
  NESPalette,
  cityFires,
  stars,
  numberOfStars,
  enemyInterval,
  cometInterval,
  dayNightCycleSpeed,
  preloadAssets,
  initializeCityFires,
  setupInputListeners,
  setupGame,
};

// End of setup.js

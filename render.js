// render.js
// Responsible for drawing all visual elements in the game.

// Import necessary entities and utilities
// import {
//   player,
//   enemies,
//   projectiles,
//   explosions,
//   comets,
//   stars,
//   shootingStars,
//   drawCelestialBody,
//   drawCitySilhouette,
//   drawDynamicGradientSky,
// } from "./entities.js";
// import { canvas, ctx, gameStates } from "./setup.js";

// import {
//   player,
//   enemies,
//   projectiles,
//   explosions,
//   comets,
//   stars,
//   shootingStars,
//   NESPalette,
//   canvas,
//   ctx,
// } from "./entities.js";

import {
  canvas,
  ctx,
  gameActive,
  isPaused,
  NESPalette,
  stars,
  cityFires,
  player,
  enemies,
  projectiles,
  explosions,
  comets,
  shootingStars,
} from "./setup.js"; // Adjust based on actual exported names
import {
  drawCelestialBody,
  drawCitySilhouette,
  drawDynamicGradientSky,
} from "./utility.js"; // Assume these functions exist

// Note: The functions drawCelestialBody, drawCitySilhouette, drawDynamicGradientSky seem to be mentioned but not defined anywhere. You might have intended to place them in render.js or elsewhere. Ensure they are correctly defined and exported if they reside outside render.js.

/**
 * Main rendering function to draw all game elements.
 */
function drawEverything() {
  clearCanvas();
  drawDynamicGradientSky(); // Draws the sky with day/night cycle
  drawStars(); // Draw static stars in the background
  drawShootingStars(); // Draw shooting stars if any
  drawCelestialBody(); // Draws moon or sun based on time
  drawCitySilhouette(); // Draw the city silhouette
  drawPlayer();
  drawEnemies();
  drawProjectiles();
  drawExplosions();
  drawComets();
  drawHUD(); // HUD for score, lives, etc.
}

/**
 * Clears the canvas for the next frame.
 */
function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/**
 * Draws the starry background.
 */
function drawStars() {
  stars.forEach((star) => {
    star.draw();
  });
}

/**
 * Draws shooting stars.
 */
function drawShootingStars() {
  shootingStars.forEach((shootingStar) => {
    shootingStar.draw();
  });
}

/**
 * Draws the player.
 */
function drawPlayer() {
  player.draw();
}

/**
 * Draws all enemies.
 */
function drawEnemies() {
  enemies.forEach((enemy) => {
    enemy.draw();
  });
}

/**
 * Draws all projectiles.
 */
function drawProjectiles() {
  projectiles.forEach((projectile) => {
    projectile.draw();
  });
}

/**
 * Draws all explosions.
 */
function drawExplosions() {
  explosions.forEach((explosion) => {
    explosion.draw(ctx); // Assuming explosion has its own draw method accepting context
  });
}

/**
 * Draws comets if any.
 */
function drawComets() {
  comets.forEach((comet) => {
    comet.draw();
  });
}

/**
 * Draws the HUD, including score and lives.
 */
function drawHUD() {
  ctx.fillStyle = "white";
  ctx.font = "16px 'Press Start 2P', cursive"; // Use the same retro font for HUD
  ctx.fillText(`Score: ${gameStates.score}`, 10, 20);
  ctx.fillText(`Lives: ${gameStates.lives}`, canvas.width - 100, 20);
}

export { drawEverything };

// End of render.js

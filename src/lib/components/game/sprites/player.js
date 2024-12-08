/**

@fileoverview Player (Vela) module - Handles player character logic and rendering
@module src/lib/components/game/sprites/player.js
@requires src/lib/components/game/constants.js
@requires src/lib/components/game/managers/assetManager.js
@requires src/lib/components/game/managers/inputManager.js
@requires src/lib/components/game/mechanics/collisions.js
@requires src/lib/components/game/mechanics/powerups.js
*/

import { PLAYER_HITBOX_PADDING, PLAYER_SPEED, PLAYER_JUMP_FORCE, PLAYER_DASH_SPEED, PLAYER_DASH_DURATION, PLAYER_DASH_COOLDOWN, PLAYER_INVINCIBILITY_DURATION, PLAYER_MAX_LIVES, PLAYER_SPRITE_WIDTH, PLAYER_SPRITE_HEIGHT, PLAYER_FRAME_COUNT, PLAYER_FRAME_INTERVAL, DEBUG } from '../constants.js';
import { getAsset } from '../managers/assetManager.js';
import { isKeyPressed } from '../managers/inputManager.js';
import { checkCollision } from '../mechanics/collisions.js';
import { applyPowerUp } from '../mechanics/powerups.js';
/**

@class Player
@description Represents the player character (Vela) in the game
@implements {CleanupInterface}
/
export default class Player {
/*

@constructor
@param {CanvasRenderingContext2D} ctx - Canvas rendering context
@param {object} gameState - Current game state
*/
constructor(ctx, gameState) {
this.ctx = ctx;
this.gameState = gameState;

this.x = 0;
this.y = 0;
this.width = PLAYER_SPRITE_WIDTH;
this.height = PLAYER_SPRITE_HEIGHT;
this.speed = PLAYER_SPEED;
this.jumpForce = PLAYER_JUMP_FORCE;
this.dashSpeed = PLAYER_DASH_SPEED;
this.dashDuration = PLAYER_DASH_DURATION;
this.dashCooldown = PLAYER_DASH_COOLDOWN;
this.velocityX = 0;
this.velocityY = 0;
this.gravity = 0.5;
this.isGrounded = false;
this.movingLeft = false;
this.movingRight = false;
this.isJumping = false;
this.canDoubleJump = false;
this.isDashing = false;
this.dashTimer = 0;
this.dashCooldownTimer = 0;
this.frameX = 0;
this.frameY = 0;
this.currentFrame = 0;
this.frameCount = PLAYER_FRAME_COUNT;
this.frameTimer = 0;
this.frameInterval = PLAYER_FRAME_INTERVAL;
this.direction = 'right';
this.isExploding = false;
this.explosionFrame = 0;
this.isInvincible = false;
this.invincibilityTimer = 0;
this.lives = PLAYER_MAX_LIVES;
this.powerUpState = null;
this.spriteImage = getAsset('vela_main_sprite.png');
this.debugColor = 'rgba(0, 255, 0, 0.5)';
}

/**

@method update
@description Updates the player character state and logic
*/
update() {
// Handle invincibility
if (this.isInvincible) {
this.invincibilityTimer--;
if (this.invincibilityTimer <= 0) {
this.isInvincible = false;
}
}
// Handle dashing
if (this.isDashing) {
    this.dashTimer--;
    if (this.dashTimer <= 0) {
      this.isDashing = false;
      this.dashCooldownTimer = this.dashCooldown;
    }
  } else if (this.dashCooldownTimer > 0) {
    this.dashCooldownTimer--;
  }

  // Handle horizontal movement
  if (this.movingLeft) {
    this.velocityX = Math.max(this.velocityX - this.speed, -this.speed);
    this.direction = 'left';
  } else if (this.movingRight) {
    this.velocityX = Math.min(this.velocityX + this.speed, this.speed);
    this.direction = 'right';
  } else {
    this.velocityX *= 0.9; // Apply friction
  }
  this.x += this.velocityX;

  // Handle vertical movement and jumping
  if (this.isJumping) {
    this.velocityY = -this.jumpForce;
    if (this.isGrounded) {
      this.isGrounded = false;
    } else if (this.canDoubleJump) {
      this.canDoubleJump = false;
    }
    this.isJumping = false;
  }
  if (!this.isGrounded) {
    this.velocityY += this.gravity;
    this.y += this.velocityY;
    if (this.y + this.height > this.gameState.groundY) {
      this.y = this.gameState.groundY - this.height;
      this.velocityY = 0;
      this.isGrounded = true;
      this.canDoubleJump = true;
    }
  }

  // Handle animations
  this.frameTimer++;
  if (this.frameTimer >= this.frameInterval) {
    this.frameTimer = 0;
    this.currentFrame = (this.currentFrame + 1) % this.frameCount;
    this.frameX = this.currentFrame * this.width;
  }

  // Check for collisions
  this.checkEnemyCollisions();
  this.checkPowerUpCollisions();

}
/**

@method draw
@description Renders the player character on the canvas
*/
draw() {
this.ctx.save();
if (this.direction === 'left') {
    this.ctx.scale(-1, 1);
  this.ctx.translate(-this.gameState.canvas.width, 0);
}

if (this.isExploding) {
  const frameX = (this.explosionFrame + 5) * this.width;
  this.ctx.drawImage(
    this.spriteImage,
    frameX,
    0,
    this.width,
    this.height,
    this.direction === 'left' ? this.gameState.canvas.width - this.x - this.width : this.x,
    this.y,
    this.width,
    this.height
  );
} else {
  this.ctx.drawImage(
    this.spriteImage,
    this.frameX,
    this.frameY,
    this.width,
    this.height,
    this.direction === 'left' ? this.gameState.canvas.width - this.x - this.width : this.x,
    this.y,
    this.width,
    this.height
  );
}

this.ctx.restore();

if (DEBUG) {
  this.drawDebug();
}
}
/**

@method drawDebug
@description Renders debug information for the player character
*/
drawDebug() {
this.ctx.save();
this.ctx.strokeStyle = this.debugColor;
this.ctx.strokeRect(this.x + PLAYER_HITBOX_PADDING, this.y + PLAYER_HITBOX_PADDING, this.width - PLAYER_HITBOX_PADDING * 2, this.height - PLAYER_HITBOX_PADDING * 2);
this.ctx.restore();
}

/**

@method moveLeft
@description Starts moving the player character to the left
*/
moveLeft() {
this.movingLeft = true;
}

/**

@method moveRight
@description Starts moving the player character to the right
*/
moveRight() {
this.movingRight = true;
}

/**

@method stopMovingLeft
@description Stops moving the player character to the left
*/
stopMovingLeft() {
this.movingLeft = false;
}

/**

@method stopMovingRight
@description Stops moving the player character to the right
*/
stopMovingRight() {
this.movingRight = false;
}

/**

@method jump
@description Makes the player character jump
*/
jump() {
if (this.isGrounded || this.canDoubleJump) {
this.isJumping = true;
}
}

/**

@method dash
@description Makes the player character perform a dash
*/
dash() {
if (!this.isDashing && this.dashCooldownTimer <= 0) {
this.isDashing = true;
this.dashTimer = this.dashDuration;
this.velocityX = this.direction === 'left' ? -this.dashSpeed : this.dashSpeed;
}
}

/**

@method checkEnemyCollisions
@description Checks for collisions between the player character and enemies
*/
checkEnemyCollisions() {
this.gameState.enemies.forEach((enemy) => {
if (checkCollision(this, enemy, PLAYER_HITBOX_PADDING)) {
this.hit();
}
});
}

/**

@method checkPowerUpCollisions
@description Checks for collisions between the player character and power-ups
*/
checkPowerUpCollisions() {
this.gameState.powerUps.forEach((powerUp) => {
if (checkCollision(this, powerUp, PLAYER_HITBOX_PADDING)) {
applyPowerUp(this, powerUp.type);
}
});
}

/**

@method hit
@description Handles the player character being hit by an enemy
*/
hit() {
if (!this.isInvincible) {
this.lives--;
if (this.lives <= 0) {
this.explode();
} else {
this.isInvincible = true;
this.invincibilityTimer = PLAYER_INVINCIBILITY_DURATION;
}
}
}

/**

@method explode
@description Handles the player character explosion sequence
*/
explode() {
this.isExploding = true;
this.explosionFrame = 0;
const explosionInterval = setInterval(() => {
this.explosionFrame++;
if (this.explosionFrame >= 3) {
clearInterval(explosionInterval);
this.gameState.gameOver();
}
}, 100);
}

/**

@method reset
@description Resets the player character to its initial state
*/
reset() {
this.x = this.gameState.canvas.width / 2 - this.width / 2;
this.y = this.gameState.groundY - this.height;
this.velocityX = 0;
this.velocityY = 0;
this.movingLeft = false;
this.movingRight = false;
this.isJumping = false;
this.canDoubleJump = false;
this.isDashing = false;
this.dashTimer = 0;
this.dashCooldownTimer = 0;
this.frameX = 0;
this.frameY = 0;
this.currentFrame = 0;
this.direction = 'right';
this.isExploding = false;
this.explosionFrame = 0;
this.isInvincible = false;
this.invincibilityTimer = 0;
this.lives = PLAYER_MAX_LIVES;
this.powerUpState = null;
}

/**

@method cleanup
@description Performs any necessary cleanup
*/
cleanup() {
this.reset();
}
}

// Export utility functions
export function initializePlayer(ctx, gameState) {
try {
return new Player(ctx, gameState);
} catch (error) {
console.error('Failed to initialize player:', error);
return null;
}
}
export function updatePlayer(player) {
try {
player.update();
} catch (error) {
console.error('Failed to update player:', error);
}
}
export function drawPlayer(player) {
try {
player.draw();
} catch (error) {
console.error('Failed to draw player:', error);
}
}

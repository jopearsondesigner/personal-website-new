// entities.js

// Import necessary utilities and state variables
import {
  canvas,
  ctx,
  gameStates,
  projectiles,
  enemyProjectiles,
  explosions,
} from "./setup.js";
import { checkCollision } from "./utility.js";

class Star {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 1.5 + 0.5;
    this.twinkleFactor = Math.random() * 1.5 + 0.5;
  }

  update() {
    this.twinkleFactor += (Math.random() - 0.5) * 0.2;
    this.twinkleFactor = Math.max(0.5, Math.min(2, this.twinkleFactor));
  }

  draw() {
    ctx.fillStyle = "rgba(252, 252, 252, " + this.twinkleFactor * 0.5 + ")";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * this.twinkleFactor, 0, Math.PI * 2);
    ctx.fill();
  }
}

class Comet {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = 0;
    this.size = Math.random() * 5 + 5;
    this.speed = Math.random() * 3 + 2;
    this.color = "rgba(248, 56, 0, 0.8)";
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }

  update() {
    this.y += this.speed;
    if (this.y > canvas.height) {
      comets.splice(comets.indexOf(this), 1);
    }
    this.draw();
  }
}

// Player, Enemy, Projectile, ShootingStar, Particle, FireParticle classes go here, similar to Star and Comet.
// entities.js continued...
class Player {
  constructor() {
    this.x = canvas.width / 2 - 27.5;
    this.y = canvas.height - 87.5 - 5; // Adjust as needed
    this.width = 55;
    this.height = 87.5;
    this.speed = 4;
    this.movingLeft = false;
    this.movingRight = false;
    this.spriteImage = new Image();
    this.spriteImage.src = "assets/images/game/vela_main_sprite.png"; // Adjust path as needed
  }

  update() {
    if (this.movingLeft && this.x > 0) this.x -= this.speed;
    if (this.movingRight && this.x < canvas.width - this.width)
      this.x += this.speed;
    // Additional update logic here
  }

  draw() {
    ctx.drawImage(this.spriteImage, this.x, this.y, this.width, this.height);
  }
}

class Enemy {
  constructor() {
    this.x = Math.random() * (canvas.width - 65);
    this.y = -65;
    this.width = 65;
    this.height = 65;
    this.speed = Math.random() * 0.2 + 0.15;
    this.spriteImage = new Image();
    this.spriteImage.src = "assets/images/game/void_swarm_sprite.png"; // Adjust path as needed
  }

  update() {
    this.y += this.speed;
    // Additional update logic here
  }

  draw() {
    ctx.drawImage(this.spriteImage, this.x, this.y, this.width, this.height);
  }
}

class Projectile {
  constructor(x, y, enemyShot = false) {
    this.x = x;
    this.y = y;
    this.width = 13;
    this.height = 28;
    this.speed = enemyShot ? 3 : -5;
    this.spriteSheet = new Image();
    this.spriteSheet.src = "assets/images/game/projectile_main.png"; // Adjust path as needed
  }

  update() {
    this.y += this.speed;
    // Additional update logic here
  }

  draw() {
    ctx.drawImage(this.spriteSheet, this.x, this.y, this.width, this.height);
  }
}

class ShootingStar {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = 0;
    this.length = Math.random() * 80 + 10;
    this.speed = Math.random() * 10 + 6;
  }

  update() {
    this.x -= this.speed * 0.5;
    this.y += this.speed;
  }

  draw() {
    ctx.strokeStyle = "white";
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x + this.length, this.y - this.length);
    ctx.stroke();
  }
}

class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 5 + 1;
    this.speedX = Math.random() * 3 - 1.5;
    this.speedY = Math.random() * 3 - 1.5;
    this.color = "rgba(228, 0, 77, 0.7)"; // Example color
    this.lifespan = 100;
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.lifespan -= 1.5;
  }

  draw(ctx) {
    ctx.globalAlpha = this.lifespan / 100;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

class FireParticle extends Particle {
  constructor(x, y) {
    super(x, y);
    this.speedY = Math.random() * -5 - 1; // Adjust for fire particle to move upwards
    this.color = "rgba(255, 165, 0, 0.8)"; // Fire-like color
  }
}

// Remember to export your classes so they can be used in other modules
export { Player, Enemy, Projectile, ShootingStar, Particle, FireParticle };

// Export the entities for use in other modules
export {
  Star,
  Comet,
  Player,
  Enemy,
  Projectile,
  ShootingStar,
  Particle,
  FireParticle,
};

// End of entities.js

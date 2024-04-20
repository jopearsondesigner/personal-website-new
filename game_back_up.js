// Guardians of Lumara: Vela's Voyage Game Script

const gameAssets = {
  images: {
    playerSprite: "assets/images/game/vela_main_sprite.png",
    enemySprite: "assets/images/game/void_swarm_sprite.png",
    projectileSprite: "assets/images/game/projectile_main.png",
    // Add more assets as needed
  },
  loaded: {}, // Object to store loaded assets
  toLoad: 0, // Counter for assets to load
  loadedCount: 0, // Counter for loaded assets
};

//1. Global Variable Declarations
let canvas = document.getElementById("gameCanvas");
let ctx = canvas.getContext("2d");
canvas.width = 800;
canvas.height = 600;
let score = 0;
let lives = 3;
let gameFrame = 0;
let gameSpeed = 1;
let titleScreen = true;
let gameActive = false;
let isPaused = false;
let numberOfStars = 100; // Define the number of stars here, adjust as needed for your game's aesthetic

let enemies = [],
  enemyProjectiles = [],
  projectiles = [],
  explosions = [],
  stars = [],
  comets = [],
  shootingStars = [];

let lastTime = Date.now();

// Global Variables for City on Fire
let cityFires = [];
let particlePool; // Declare particlePool at the top level
let smokeParticles = [];
let smokeParticlePool;
//Global Variables for spaceships
let spaceship; // Declare a global variable to hold the spaceship instance
let spaceships = []; // Array to hold all active spaceships
const maxSpaceships = 3; // Maximum number of spaceships attacking simultaneously
// Flag to track if the game is currently active

const NESPalette = {
  nightSky: "#0000fc",
  sunrise: "#f8d878",
  daySky: "#a4e4fc",
  sunset: "#f87858",
  duskDawn: "#6888fc",
  moon: "#fcfcfc",
};
const enemyInterval = 100;
const cometInterval = 2000;
let dayNightCycle = 180;
const dayNightCycleSpeed = 0.01;
let difficultyIncreaseScore = 500;
let numberOfExplosionFrames = 3;
const skyFlashDuration = 30; // The length of time the sky flash effect should last

//*************************************************

// Global Variables for Sky Flash
let skyFlashActive = false; // Controls whether the sky flash effect is active
let skyFlashTimer = 0; // Tracks the duration of the sky flash effect

const moonSpeed = 0.05; // Slow speed for the moon's movement
// 2. Utility Functions
// Called once all assets are loaded
function allAssetsLoaded() {
  console.log("All assets loaded. Initializing game setup...");
  setupGame(); // Call the setup function to start or reset the game state
}

// Asset Preloading
function preloadAssets() {
  return new Promise((resolve, reject) => {
    const assets = [
      "assets/images/game/vela_main_sprite.png",
      "assets/images/game/void_swarm_sprite.png",
      "assets/images/game/projectile_main.png",
    ];
    let loadedCount = 0;

    assets.forEach((asset) => {
      const img = new Image();
      img.onload = () => {
        console.log(`${asset} loaded`);
        loadedCount++;
        if (loadedCount === assets.length) resolve();
      };
      img.onerror = () => {
        console.error(`Failed to load ${asset}`);
        reject(`Failed to load ${asset}`);
      };
      img.src = asset;
    });
  });
}

// Setup Game Function
function setupGame() {
  // Preload all required assets first
  preloadAssets()
    .then(() => {
      // Set the player's sprite image once assets are loaded
      player.spriteImage.src = "assets/images/game/vela_main_sprite.png";
      player.spriteImage.onload = () =>
        console.log("Player sprite loaded successfully.");
      player.spriteImage.onerror = () =>
        console.error("Error loading player sprite.");

      // Initialize a pool of smoke particles for visual effects
      smokeParticlePool = new ParticlePool(100);

      // Initialize city fires as part of the game's environmental challenges
      initializeCityFires();

      // Setup the background stars
      stars = []; // Clear existing stars if any
      for (let i = 0; i < numberOfStars; i++) {
        stars.push(new Star());
      }

      // Optionally initialize shooting stars
      shootingStars = []; // Clear existing shooting stars if any
      // Uncomment the following if shooting stars are needed from the start
      // for (let i = 0; i < initialNumberOfShootingStars; i++) {
      //   shootingStars.push(new ShootingStar());
      // }

      // Initialize spaceships, if part of your game's mechanics
      spaceships = []; // Clear existing spaceships if any
      for (let i = 0; i < maxSpaceships; i++) {
        spaceships.push(new Spaceship());
      }

      // Setup input listeners for game control
      setupEventListeners();

      // Handle game state initialization
      if (titleScreen) {
        drawTitleScreen(); // Display title screen if the game starts with one
      } else {
        gameActive = true; // Mark the game as active
        animate(); // Begin the game animation loop
      }
    })
    .catch((error) => {
      console.error("Error preloading assets:", error);
      // Proper error handling for issues during the asset loading process
    });
}

// interpolateColor
function interpolateColor(color1, color2, factor) {
  if (arguments.length < 3) {
    factor = 0.5;
  }
  var result = color1.slice(0);
  for (var i = 1; i < 7; i += 2) {
    var color1Val = parseInt(color1.substr(i, 2), 16);
    var color2Val = parseInt(color2.substr(i, 2), 16);
    var resultVal = Math.round(color1Val + (color2Val - color1Val) * factor);
    var val = resultVal.toString(16);
    result =
      result.substr(0, i) +
      (val.length === 1 ? "0" + val : val) +
      result.substr(i + 2);
  }
  return result;
}
// randomFromArray
function randomFromArray(array) {
  return array[Math.floor(Math.random() * array.length)];
}
// clamp
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
// distanceBetween
function distanceBetween(x1, y1, x2, y2) {
  let a = x1 - x2;
  let b = y1 - y2;
  return Math.sqrt(a * a + b * b);
}
// getRandomColor
function getRandomColor() {
  var letters = "0123456789ABCDEF";
  var color = "#";
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}
const playerSpeed = 200; // pixels per second

// Function to update player position based on current movement flags
function updatePlayerPosition() {
  if (player.movingLeft) player.x -= player.speed;
  if (player.movingRight) player.x += player.speed;
  if (player.movingUp) player.y -= player.speed;
  if (player.movingDown) player.y += player.speed;
}

// Utility drawing function
function drawParticle(particle) {
  if (
    particle.x < 0 ||
    particle.x > canvas.width ||
    particle.y < 0 ||
    particle.y > canvas.height
  ) {
    return; // Skip drawing if particle is outside canvas bounds
  }
  ctx.globalAlpha = particle.lifespan / 100; // Adjust based on particle type if needed
  ctx.fillStyle = particle.color;
  ctx.beginPath();
  ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1; // Reset alpha so it doesn't affect other canvas elements
}

function drawSmoke(x, y) {
  ctx.fillStyle = "rgba(124, 124, 124, 0.5)";
  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.fill();
}

// updateDayNightCycle
function updateDayNightCycle() {
  const cycleLength = 2400; // Example: total length of day-night cycle in game frames
  const currentCyclePoint = gameFrame % cycleLength;
  const cycleRatio = currentCyclePoint / cycleLength;

  // Transition from night to day and back
  if (cycleRatio < 0.5) {
    // Daytime
    canvas.style.backgroundColor = interpolateColor(
      "#1E90FF",
      "#87CEEB",
      cycleRatio * 2
    );
  } else {
    // Nighttime
    canvas.style.backgroundColor = interpolateColor(
      "#87CEEB",
      "#1E90FF",
      (cycleRatio - 0.5) * 2
    );
  }
}
// rectToRectCollision
function rectToRectCollision(rect1, rect2) {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.height + rect1.y > rect2.y
  );
}
// circleToRectCollision
/**
 * Determines if a circle and a rectangle intersect.
 * @param {object} circle - The circle with properties x, y, and radius.
 * @param {object} rect - The rectangle with properties x, y, width, and height.
 * @returns {boolean} - True if the circle and rectangle intersect, false otherwise.
 */
function circleToRectCollision(circle, rect) {
  const distX = Math.abs(circle.x - rect.x - rect.width / 2);
  const distY = Math.abs(circle.y - rect.y - rect.height / 2);

  if (distX > rect.width / 2 + circle.radius) {
    return false;
  }
  if (distY > rect.height / 2 + circle.radius) {
    return false;
  }

  if (distX <= rect.width / 2) {
    return true;
  }
  if (distY <= rect.height / 2) {
    return true;
  }

  const dx = distX - rect.width / 2;
  const dy = distY - rect.height / 2;
  return dx * dx + dy * dy <= circle.radius * circle.radius;
}

/**
 * Determines the type of collision to check based on the object types.
 * @param {object} object1 - The first collision object, can be a circle or rectangle.
 * @param {object} object2 - The second collision object, can be a circle or rectangle.
 * @returns {boolean} - True if a collision occurs, false otherwise.
 */
function checkCollision(object1, object2) {
  console.log(rectToRectCollision); // Check if the function is defined
  const type1 = object1.radius ? "circle" : "rect";
  const type2 = object2.radius ? "circle" : "rect";
  const collisionType = `${type1}To${type2}`;

  switch (collisionType) {
    case "rectTorect":
      return rectToRectCollision(object1, object2);
    case "circleTorect":
      return circleToRectCollision(object1, object2);
    case "rectTocircle":
      return circleToRectCollision(object2, object1);
    default:
      console.warn(`Collision type '${collisionType}' not handled.`);
      return false;
  }
}

// 3. Core Game Functions and Class Definitions
// Player Object
const player = {
  x: canvas.width / 2 - 27.5,
  y: canvas.height - 87.5 - 5, // Adjusted to position Vela 5px above the bottom
  width: 55,
  height: 87.5,
  speed: 4,
  movingLeft: false,
  movingRight: false,
  frameX: 0,
  frameY: 0,
  spriteWidth: 55,
  spriteHeight: 87.5,
  currentFrame: 0,
  frameCount: 4, // Assuming the first 4 frames are for movement or idle animation
  frameTimer: 0,
  frameInterval: 8,
  isExploding: false,
  explosionFrame: 0, // Starts from the first explosion frame
  spriteImage: new Image(),
  direction: "right", // Controls the direction of the player sprite
  frameSequence: [2, 3, 2, 4], // Custom sequence for running animation
  sequenceIndex: 0, // Index to track the current position in the frameSequence

  update: function () {
    // Update movement based on direction
    if (this.movingLeft && this.x > 0) {
      this.x -= this.speed;
      this.direction = "left";
    } else if (this.movingRight && this.x < canvas.width - this.width) {
      this.x += this.speed;
      this.direction = "right";
    }

    // Update animation frame for running sequence
    if (this.movingLeft || this.movingRight) {
      this.frameTimer++;
      if (this.frameTimer >= this.frameInterval) {
        // Advance through the custom sequence for running animation
        this.sequenceIndex =
          (this.sequenceIndex + 1) % this.frameSequence.length;
        this.currentFrame = this.frameSequence[this.sequenceIndex] - 1; // Adjust for zero-indexed frames
        this.frameX = this.currentFrame * this.spriteWidth;
        this.frameTimer = 0;
      }
    } else {
      // Reset to idle frame when not moving
      this.currentFrame = 0; // Assuming the first frame is the idle frame
      this.frameX = this.currentFrame * this.spriteWidth;
      this.sequenceIndex = 0; // Reset sequence index when not running
    }

    // Explosion logic separated from movement and animation frame updates
    if (this.isExploding) {
      // Assuming explosion sequence is 3 frames long, update the explosion frame without reusing frameTimer
      this.explosionFrame++;
      if (this.explosionFrame > 2) {
        this.isExploding = false; // Reset explosion state
        this.explosionFrame = 0; // Reset explosion frame
        if (lives <= 0) {
          gameActive = false; // Disable game loop
          setTimeout(drawGameOverScreen, 1000); // Delay to show last explosion frame
        }
      }
    }
  },

  draw: function () {
    ctx.save();
    // Flip the sprite based on the direction for movement animation
    if (this.direction === "left") {
      ctx.scale(-1, 1);
      ctx.translate(-canvas.width, 0);
    }

    if (this.isExploding) {
      // Draw explosion frames, assuming frames 5-7 are for explosion
      if (this.explosionFrame < 3) {
        // There are 3 explosion frames (5-7)
        let frameToDraw = 5 + this.explosionFrame; // Calculate correct frame to draw, adjusting for zero-index
        ctx.drawImage(
          this.spriteImage,
          frameToDraw * this.spriteWidth,
          0,
          this.spriteWidth,
          this.spriteHeight,
          this.direction === "left"
            ? canvas.width - this.x - this.width
            : this.x,
          this.y,
          this.width,
          this.height
        );
        this.explosionFrame++;
      } else {
        // Handle what happens after the explosion finishes
        this.isExploding = false; // Reset explosion flag
        this.explosionFrame = 0; // Reset explosion frame
        // Optional: Trigger any additional actions after explosion, such as resetting the player or ending the game
      }
    } else {
      // Draw normal movement frames
      ctx.drawImage(
        this.spriteImage,
        this.frameX,
        this.frameY,
        this.spriteWidth,
        this.spriteHeight,
        this.direction === "left" ? canvas.width - this.x - this.width : this.x,
        this.y,
        this.width,
        this.height
      );
    }

    ctx.restore();
  },
};

// Enemy
class Enemy {
  constructor() {
    this.x = Math.random() * (canvas.width - 65);
    this.y = -65;
    this.width = 65;
    this.height = 65;
    this.speed = Math.random() * 0.2 + 0.15;
    this.descentSpeed = 1.0;
    this.curveAmplitude = Math.random() * 3 + 1;
    this.curveFrequency = Math.random() * 0.02 + 0.01;
    this.verticalBobFrequency = Math.random() * 0.02 + 0.005;
    this.verticalBobHeight = Math.random() * 5 + 2;
    this.frameX = 0;
    this.maxFrames = 2; // Assume 2 frames per state (normal, aggressive)
    this.spriteWidth = 65;
    this.spriteHeight = 65;
    this.flapSpeed = Math.floor(Math.random() * 10 + 1);
    this.patternIndex = Math.floor(Math.random() * 4);
    this.spriteImage = new Image();
    this.spriteImage.src = "assets/images/game/void_swarm_sprite.png";
    this.targetX = player.x; // Assume there's a player object with an x property
    this.diveSpeed = Math.random() * 1.5 + 1.5;
    this.isAggressive = false; // New: Tracks whether the enemy has become aggressive
    this.hitsTaken = 0; // New: Tracks the number of hits taken
    this.isExploding = false;
    this.explosionFrame = 0;
    this.fireParticles = []; // New: Array to hold fire particles
    this.toBeRemoved = false; // New property to mark the enemy for removal
    this.numberOfExplosionFrames = 3; // Assuming you have 3 frames for the explosion animation
  }

  update() {
    // Movement patterns (sine wave, cosine wave, vertical bobbing, diving)
    switch (this.patternIndex) {
      case 0: // Sine wave
        this.y += this.speed;
        this.x +=
          Math.sin(gameFrame * this.curveFrequency) * this.curveAmplitude;
        break;
      case 1: // Cosine wave
        this.y += this.speed;
        this.x +=
          Math.cos(gameFrame * this.curveFrequency) * this.curveAmplitude;
        break;
      case 2: // Vertical bobbing
        this.y += this.speed;
        this.y +=
          Math.sin(gameFrame * this.verticalBobFrequency) *
          this.verticalBobHeight;
        break;
      case 3: // Diving towards the player
        if (this.y < canvas.height / 2) {
          this.y += this.speed; // Move down until reaching halfway
        } else {
          this.y += this.diveSpeed; // Dive down faster towards the player
          this.x += (this.targetX - this.x) * 0.03; // Adjust X to move towards target
        }
        break;
    }

    // New explosion handling logic
    if (this.isExploding) {
      this.explosionFrame++;
      if (this.explosionFrame > this.numberOfExplosionFrames) {
        this.toBeRemoved = true; // Mark the enemy for removal after the explosion animation completes
      }
    }

    // Check if the enemy is in aggressive mode and then generate fire particles
    if (this.isAggressive) {
      if (Math.random() < 0.9) {
        // Adjust this value if you want more/less fire
        // Ensure fire particles are created and positioned correctly
        let offsetX = Math.random() * this.width - this.width / 2;
        let offsetY = Math.random() * this.height - this.height / 2;
        this.fireParticles.push(
          new FireParticle(this.x + offsetX, this.y + offsetY)
        );
      }
    }

    // Update fire particles
    this.fireParticles.forEach((particle, index) => {
      particle.update();
      if (particle.lifespan <= 0) {
        this.fireParticles.splice(index, 1);
      }
    });

    // Make the enemy more aggressive if it has been hit
    if (this.isAggressive) {
      this.speed += 0.1; // Increase speed
      this.diveSpeed += 0.2; // Increase dive speed
      this.curveAmplitude += 0.5; // Increase curve amplitude
      this.curveFrequency += 0.005; // Increase curve frequency
    }

    // Animate enemy flapping
    if (this.flapSpeed === 0) {
      this.flapSpeed = Math.floor(Math.random() * 10 + 5);
      this.frameX = (this.frameX + 1) % this.maxFrames;
    } else {
      this.flapSpeed--;
    }

    // Shooting logic: enemies shoot more frequently if they are aggressive
    if (Math.random() < (this.isAggressive ? 0.02 : 0.01)) {
      enemyProjectiles.push(
        new AnimatedProjectile(this.x + this.width / 2 - 6.5, this.y, true) // Center the shot for the enemy
      );
    }
  }

  draw() {
    if (this.isExploding) {
      // Handle explosion animation
      // Assuming frames 5-7 are for the explosion, with 0-based indexing they are at indices 4-6
      let explosionFrameIndex = 4 + (this.explosionFrame - 1); // Adjust this based on how you increment `explosionFrame`
      ctx.drawImage(
        this.spriteImage,
        explosionFrameIndex * this.spriteWidth, // Calculate X position of the frame
        0, // Y position is always 0 as all frames are in the same row
        this.spriteWidth,
        this.spriteHeight,
        this.x,
        this.y,
        this.width,
        this.height
      );
    } else if (this.isAggressive) {
      // Handle aggressive flight animation (frames 3-4)
      // Let's cycle between frames 3-4 for aggression mode animation
      let aggressiveFrameIndex = 2 + (this.frameX % 2); // Use frameX to toggle between 2 and 3
      ctx.drawImage(
        this.spriteImage,
        aggressiveFrameIndex * this.spriteWidth,
        0, // Y position for aggressive frames
        this.spriteWidth,
        this.spriteHeight,
        this.x,
        this.y,
        this.width,
        this.height
      );
    } else {
      // Handle normal flight animation (frames 1-2)
      // Cycle between frames 1-2 for normal flight animation
      let normalFrameIndex = this.frameX % 2; // Use frameX to toggle between 0 and 1
      ctx.drawImage(
        this.spriteImage,
        normalFrameIndex * this.spriteWidth,
        0, // Y position for normal frames
        this.spriteWidth,
        this.spriteHeight,
        this.x,
        this.y,
        this.width,
        this.height
      );
    }

    // Draw fire particles if the enemy is aggressive
    if (this.isAggressive) {
      this.fireParticles.forEach((particle) => {
        particle.draw(ctx);
      });
    }
  }
}

// Projectile
class Projectile {
  constructor(x, y, speedY) {
    this.x = x;
    this.y = y;
    this.radius = 3; // Size of the projectile
    this.speedY = speedY; // Speed at which the projectile moves
    this.color = "white"; // Default color, change as needed
  }

  update() {
    this.y += this.speedY;
  }

  draw() {
    const ctx = canvas.getContext("2d");
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
// animatedProjectile
class AnimatedProjectile {
  constructor(x, y, enemyShot = false) {
    this.x = x;
    this.y = y;
    this.width = 13;
    this.height = 28;
    this.speed = enemyShot ? 3 : -5;
    this.enemyShot = enemyShot;
    this.spriteSheet = new Image();
    this.spriteSheet.src = "assets/images/game/projectile_main.png";
    this.frameX = 0;
    this.maxFrames = 3;
    this.tick = 0;
    this.ticksPerFrame = 4;
    this.framesOrder = enemyShot ? [3, 4, 5, 4] : [0, 1, 2, 1];
  }

  update() {
    this.y += this.speed;
    this.tick++;
    if (this.tick > this.ticksPerFrame) {
      this.tick = 0;
      this.frameX = (this.frameX + 1) % this.maxFrames;
    }
  }

  draw() {
    const ctx = canvas.getContext("2d");
    ctx.drawImage(
      this.spriteSheet,
      this.framesOrder[this.frameX] * this.width,
      0,
      this.width,
      this.height,
      this.x,
      this.y,
      this.width,
      this.height
    );
  }
}
// fireProjectile
function fireProjectile() {
  if (!gameActive || isPaused) return; // Only allow shooting if the game is active and not paused
  let projectile = new AnimatedProjectile(
    player.x + player.width / 2,
    player.y,
    false
  ); // Assume the player's width is centered
  projectiles.push(projectile); // Add the projectile to the game's projectile array
}
// Star
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
// Comet
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
// Explosion
class Explosion {
  constructor(x, y, color, size) {
    this.particles = [];
    for (let i = 0; i < 20; i++) {
      // Number of particles generated
      this.particles.push(new Particle(x, y));
    }
  }

  update() {
    this.particles = this.particles.filter((particle) => particle.lifespan > 0);
    this.particles.forEach((particle) => particle.update());
  }

  draw(ctx) {
    this.particles.forEach((particle) => drawParticle(particle));
  }
}
// Spaceship
class Spaceship {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = Math.random() * (canvas.width - 60) + 30; // Ensure spaceships are well-distributed horizontally
    this.y = Math.random() * 100 + canvas.height * 0.63; // Position them lower, closer to the city
    this.width = 30; // Smaller width for distance effect
    this.height = 15; // Smaller height for distance effect
    this.speedX = (Math.random() - 0.5) * 2; // Random horizontal speed for slight drifting
    this.attackTimer = 0;
    this.attackInterval = Math.random() * 300 + 100; // Randomize attack intervals
  }

  update() {
    this.x += this.speedX;
    this.attackTimer++;
    if (this.x > canvas.width + this.width || this.x < -this.width) {
      this.reset();
    }
    if (this.attackTimer > this.attackInterval) {
      this.attack();
      this.attackTimer = 0; // Reset attack timer
    }
  }

  draw() {
    drawSpaceshipWithDetails(this.x, this.y); // Call your drawing function here
    // Implementation details here
    // Extending the Spaceship prototype with a new draw method
    Spaceship.prototype.draw = function () {
      drawSpaceshipWithDetails(this.x, this.y, this.width, this.height);
    };
  }

  attack() {
    // Instantiate new projectile aimed at the city here
    Spaceship.prototype.attack = function () {
      // Launch a projectile from the center-bottom of the spaceship
      projectiles.push(
        new Projectile(this.x + this.width / 2, this.y + this.height, 3)
      );
    };
  }
}
// Shooting Star
class ShootingStar {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = 0;
    this.speed = Math.random() * 3 + 2;
    this.active = true; // Make sure to initialize the active status.
  }

  update() {
    // Update position of shooting star here
    this.x -= this.speed; // Assuming leftward movement
    this.y += this.speed; // Assuming downward movement

    // Deactivate the star if it goes off screen
    if (this.x < 0 || this.y > canvas.height) {
      this.active = false;
    }
  }

  isActive() {
    return this.active;
  }

  draw(ctx) {
    // Drawing logic for the shooting star
    ctx.beginPath();
    ctx.arc(this.x, this.y, 5, 0, Math.PI * 2, true);
    ctx.fill();
  }
}

// FireParticle
class FireParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 3 + 1;
    this.speedX = Math.random() * 1 - 0.5;
    this.speedY = Math.random() * -2 - 1;
    const fireColors = ["#fca044", "#f83800", "#e45c10"];
    this.color = fireColors[Math.floor(Math.random() * fireColors.length)];
    this.lifespan = 80;
    this.active = true;
  }

  reset(x = 0, y = 0) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 3 + 1;
    this.speedX = Math.random() * 1 - 0.5;
    this.speedY = Math.random() * -2 - 1;
    const fireColors = ["#f87858", "#f83800", "#e45c10"]; // These are already NES palette colors, ensure they're used correctly.
    this.color = fireColors[Math.floor(Math.random() * fireColors.length)];
    this.lifespan = 80;
    this.active = true;
  }

  update() {
    if (!this.active) return;

    this.x += this.speedX;
    this.y += this.speedY;
    this.lifespan -= 2;
    if (this.lifespan <= 0 || this.size <= 0.1) {
      this.active = false; // Particle is no longer active and can be reused
    }
  }

  draw(ctx) {
    if (!this.active) return;

    ctx.globalAlpha = this.lifespan / 80;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1; // Reset globalAlpha to affect only this drawing
  }
}
// updateGameElements
function updateGameElements(deltaTime) {
  // Convert deltaTime from milliseconds to seconds for easier calculations
  const delta = deltaTime / 1000;

  // Update player movement and animation
  if (player.movingLeft && player.x > 0) {
    player.x -= player.speed * delta;
    player.direction = "left";
    // Update player animation frames
    player.frameTimer += delta;
    if (player.frameTimer >= player.frameInterval) {
      player.sequenceIndex =
        (player.sequenceIndex + 1) % player.frameSequence.length;
      player.currentFrame = player.frameSequence[player.sequenceIndex] - 1;
      player.frameX = player.currentFrame * player.spriteWidth;
      player.frameTimer = 0;
    }
  } else if (player.movingRight && player.x < canvas.width - player.width) {
    player.x += player.speed * delta;
    player.direction = "right";
    // Update player animation frames
    player.frameTimer += delta;
    if (player.frameTimer >= player.frameInterval) {
      player.sequenceIndex =
        (player.sequenceIndex + 1) % player.frameSequence.length;
      player.currentFrame = player.frameSequence[player.sequenceIndex] - 1;
      player.frameX = player.currentFrame * player.spriteWidth;
      player.frameTimer = 0;
    }
  }

  // Update enemies
  enemies.forEach((enemy, index) => {
    if (enemy.patternIndex === 3 && enemy.y >= canvas.height / 2) {
      // Diving towards the player with adjusted behavior for deltaTime
      enemy.x += (player.x - enemy.x) * 0.03 * delta;
      enemy.y += enemy.diveSpeed * delta;
    } else {
      enemy.y += enemy.speed * delta;
      enemy.x +=
        Math.sin(gameFrame * enemy.curveFrequency) * enemy.curveAmplitude;
    }

    // Check if enemy goes off screen
    if (enemy.y > canvas.height) {
      enemies.splice(index, 1);
    }

    // Update enemy animation frames
    enemy.frameX = (enemy.frameX + 1) % enemy.maxFrames;
  });

  // Update projectiles
  projectiles.forEach((projectile, index) => {
    projectile.y += projectile.speedY * delta;
    // Remove projectiles that go off-screen
    if (projectile.y < 0 || projectile.y > canvas.height) {
      projectiles.splice(index, 1);
    }
  });

  // Update explosions
  explosions.forEach((explosion, index) => {
    explosion.update(delta);
    if (explosion.particles.length === 0) {
      explosions.splice(index, 1);
    }
  });

  // Update game environment effects like stars and comets
  stars.forEach((star) => {
    star.update(delta);
  });

  comets.forEach((comet, index) => {
    comet.y += comet.speed * delta;
    if (comet.y > canvas.height) {
      comets.splice(index, 1);
    }
  });

  // Update shooting stars
  shootingStars.forEach((shootingStar, index) => {
    shootingStar.x -= shootingStar.speed * 0.5 * delta;
    shootingStar.y += shootingStar.speed * delta;
    if (
      shootingStar.x < 0 - shootingStar.length ||
      shootingStar.y > canvas.height
    ) {
      shootingStars.splice(index, 1);
    }
  });

  // Update sky flash effect
  if (skyFlashActive) {
    skyFlashTimer -= delta;
    if (skyFlashTimer <= 0) {
      skyFlashActive = false;
    }
  }

  function updateDifficulty(delta) {
    if (score >= difficultyIncreaseScore) {
      gameSpeed += 0.1; // Increase speed or difficulty factor
      difficultyIncreaseScore += 500; // Next threshold for difficulty increase
    }
  }

  function updateParticles(delta) {
    particles.forEach((particle, index) => {
      particle.x += particle.speedX * delta;
      particle.y += particle.speedY * delta;
      particle.lifespan -= delta * 100; // Reduce lifespan based on time
      if (particle.lifespan <= 0) {
        particles.splice(index, 1); // Remove dead particles
      }
    });
  }

  function updatePowerUps(delta) {
    powerUps.forEach((powerUp, index) => {
      if (powerUp.active) {
        powerUp.duration -= delta;
        if (powerUp.duration <= 0) {
          deactivatePowerUp(powerUp.type);
          powerUps.splice(index, 1); // Remove expired power-ups
        }
      }
    });
  }

  function updateEnemyAI(delta) {
    enemies.forEach((enemy) => {
      // Example: Adjust aggression based on player proximity
      if (distanceBetween(player.x, player.y, enemy.x, enemy.y) < 100) {
        enemy.aggressionLevel += delta * 0.1; // Increase aggression
      } else {
        enemy.aggressionLevel -= delta * 0.1; // Decrease aggression
      }
      enemy.aggressionLevel = Math.max(0, enemy.aggressionLevel); // Ensure it doesn't go negative
    });
  }

  function updateGameElements(deltaTime) {
    updatePlayer(deltaTime);
    updateEnemies(deltaTime);
    updateProjectiles(deltaTime);
    updateExplosions(deltaTime);
    updateDayNightCycle(deltaTime);
    updateDifficulty(deltaTime);
    updateParticles(deltaTime);
    updatePowerUps(deltaTime);
    updateEnemyAI(deltaTime);
  }
}
// Animate
function animate(timestamp = 0) {
  console.log("Animating game...");

  // Calculate delta time in seconds
  let deltaTime = (timestamp - lastTime) / 1000; // Ensure 'timestamp' is defined in the function parameters
  lastTime = timestamp;

  // 1. Prevent Animation When Game is Not Active or Paused
  if (!gameActive || isPaused) {
    requestAnimationFrame(animate);
    return;
  }

  // Use deltaTime to adjust how much you update your game elements
  updateGameElements(deltaTime);

  console.log("Game loop is running...");
  // 2. Clear the Canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 3. Increment Game Frame Counter
  gameFrame++;

  // 4. Background elements
  drawDynamicGradientSky();
  drawStars(); // Ensure stars are drawn in every frame
  handleShootingStars(); // Handling shooting stars

  // Activate and manage particles for visual effects
  if (Math.random() < 0.1) {
    // Randomly activate particles for smoke, fire, etc.
    particlePool.activate(
      Math.random() * canvas.width,
      Math.random() * canvas.height
    );
  }
  particlePool.updateAndDraw(ctx, deltaTime); // Pass delta time to update method

  // 5. Day-Night Cycle
  updateDayNightCycle(deltaTime); // Update the day-night cycle with delta time

  //*************************************************

  let moonPos = calculateMoonPosition();
  drawCelestialBody(moonPos.x, moonPos.y);
  // Update the dayNightCycle using the slower speed
  dayNightCycle = (dayNightCycle + dayNightCycleSpeed) % 360;

  //*************************************************

  // Explicitly increment the day-night cycle for troubleshooting
  dayNightCycle += dayNightCycleSpeed;
  if (dayNightCycle >= 360) dayNightCycle = 0;

  // 6. Update and Draw City Elements
  drawCitySilhouette();
  drawFiresAndSmoke(); // This should be modified to handle delta time as well
  smokeParticlePool.updateAndDraw(ctx, deltaTime); // Update smoke particles with delta time

  // Trigger sky flash at random intervals
  if (!skyFlashActive && Math.random() < 0.005) {
    // Adjust probability as needed
    skyFlashActive = true;
    skyFlashTimer = skyFlashDuration;
  }

  if (skyFlashActive) {
    skyFlashTimer--;
    if (skyFlashTimer <= 0) {
      skyFlashActive = false;
    }
  }

  //*************************************************

  // 8. Update and draw fires
  cityFires.forEach((fire) => {
    fire.update(deltaTime);
    fire.draw(ctx);
  });

  // Update Game Entities
  // Update and draw projectiles
  // Update and draw projectiles including their creation, movement, and removal when off-screen
  // Update and draw projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    projectiles[i].update();
    projectiles[i].draw();
    // Remove projectiles that go off the screen
    if (projectiles[i].y < 0 || projectiles[i].y > canvas.height) {
      projectiles.splice(i, 1);
    }
  }

  //*************************************************

  projectiles.forEach((projectile, projectileIndex) => {
    projectile.update();
    projectile.draw();
    enemies.forEach((enemy, enemyIndex) => {
      if (checkCollision(projectile, enemy)) {
        projectiles.splice(projectileIndex, 1); // Remove the projectile immediately upon collision

        enemy.hitsTaken++; // Increment hit counter for the enemy

        if (enemy.hitsTaken === 1) {
          // The enemy has been hit for the first time and becomes aggressive
          enemy.isAggressive = true;
          // Here, you might also want to adjust the enemy's appearance or behavior to reflect its aggressive state
        } else if (enemy.hitsTaken > 1) {
          // The enemy has been hit for the second time; initiate explosion and mark for removal
          if (!enemy.isExploding) {
            enemy.isExploding = true;
            enemy.explosionFrame = 0; // Initiate explosion animation frame counter
          }
        }
      }

      // Check if the enemy is in the exploding state and handle animation
      if (
        enemy.isExploding &&
        enemy.explosionFrame >= enemy.numberOfExplosionFrames
      ) {
        score += 100; // Increase score for defeating enemy
        enemies.splice(enemyIndex, 1); // Remove enemy after explosion animation completes
      }
    });
  });
  // Update and draw comets

  // Update and draw comets and handle their lifespan

  // Spaceships
  //  Update, draw, and manage spaceships including their creation, movement, attacks, and cleanup.
  // Check if spaceship is defined before accessing its properties
  if (spaceship && spaceship.firePositions) {
    spaceship.firePositions.forEach((pos) => {
      if (pos.y >= canvas.height - 40) {
        // Fire has reached the city
        // Trigger explosion or other effects here
        explosions.push(new Explosion(pos.x, canvas.height - 40, "orange", 30));
      }
    });
  }

  //*************************************************

  function manageSpaceships() {
    // Iterate through the spaceships array and update each spaceship's position
    spaceships.forEach((spaceship, index) => {
      spaceship.update();
      spaceship.draw();
      // Check for attacks and possibly handle them here
      // For example, you might check if it's time for the spaceship to attack and then execute its attack method
      if (spaceship.attackTimer > spaceship.attackInterval) {
        spaceship.attack();
        spaceship.attackTimer = 0; // Reset the attack timer
      }
    });

    // Example of adding new spaceships to the game if below maximum count
    if (spaceships.length < maxSpaceships && Math.random() < 0.01) {
      // Adjust spawn rate as needed
      spaceships.push(new Spaceship());
    }

    // Example cleanup logic, removing spaceships that have moved off-screen or have been destroyed
    spaceships = spaceships.filter((spaceship) => {
      return (
        spaceship.x + spaceship.width > 0 &&
        spaceship.x < canvas.width &&
        !spaceship.toBeRemoved
      );
    });
  }
  // handleExplosions
  function handleExplosions() {
    for (let i = explosions.length - 1; i >= 0; i--) {
      explosions[i].update();
      explosions[i].draw(ctx);
      if (explosions[i].particles.length === 0) {
        explosions.splice(i, 1);
      }
    }
  }

  //*************************************************

  player.update();
  player.draw();
  handleExplosions();

  player.movingLeft && player.x > 0 ? (player.x -= player.speed) : null;
  player.movingRight && player.x < canvas.width - player.width
    ? (player.x += player.speed)
    : null;

  // Enemy generation and rendering
  if (gameFrame % enemyInterval === 0) {
    enemies.push(new Enemy());
  }

  // 9. Enemy Handling
  // Generate new enemies based on an interval
  enemies.forEach((enemy, index) => {
    enemy.update();
    enemy.draw();

    if (checkCollision(player, enemy)) {
      lives--;
      // Remove the enemy immediately on collision, regardless of the hit's fatality
      enemies.splice(index, 1);

      if (lives <= 0) {
        // Trigger sprite explosion only on fatal hit
        player.isExploding = true;
        setTimeout(function () {
          gameActive = false;
          drawGameOverScreen();
        }, 1000);
      } else {
        // For non-fatal hit, trigger a smaller explosion
        explosions.push(
          new Explosion(
            player.x + player.width / 2,
            player.y + player.height / 2,
            "rgba(228, 0, 77, 0.7)",
            20
          )
        );
      }
    }
  });
  // Update and draw enemies, handling their movement patterns, attacks, and health states including explosions
  enemyProjectiles.forEach((projectile, index) => {
    projectile.update();
    projectile.draw();
    // Check collision once
    if (checkCollision(player, projectile)) {
      lives--;
      enemyProjectiles.splice(index, 1); // Remove the projectile

      if (lives <= 0) {
        player.isExploding = true; // Trigger sprite explosion only on fatal hit
        setTimeout(function () {
          gameActive = false;
          drawGameOverScreen();
        }, 1000);
      } else {
        // Trigger a smaller explosion effect on non-fatal hit
        explosions.push(
          new Explosion(
            player.x + player.width / 2,
            player.y + player.height / 2,
            "rgba(228, 0, 77, 0.7)",
            20
          )
        );
      }
    }
  });

  // 10. Check for Game Over Condition
  if (lives <= 0) {
    // Ensure game doesn't transition to Game Over while player is still exploding
    if (!player.isExploding) {
      setTimeout(function () {
        gameActive = false;
        drawGameOverScreen();
      }, 1000);
    }
    return;
  }

  // 11. Draw UI Elements
  if (score >= difficultyIncreaseScore) {
    gameSpeed += 0.1;
    difficultyIncreaseScore += 500;
  }

  // When drawing the score
  ctx.fillStyle = "rgba(252, 252, 252, 1)";
  ctx.font = "16px 'Press Start 2P', cursive"; // Match the title font
  ctx.fillText("Score: " + score, 10, 25);

  // When drawing the lives
  ctx.fillStyle = "rgba(252, 252, 252, 1)";
  ctx.font = "16px 'Press Start 2P', cursive"; // Match the title font
  ctx.fillText("Lives: " + lives, canvas.width - 145, 25);

  requestAnimationFrame(animate); // This line is crucial
}
// End of animate

// drawStars
function drawStars() {
  console.log("Drawing stars...");
  if (!stars.length) {
    for (let i = 0; i < numberOfStars; i++) {
      stars.push(new Star());
    }
  }
  stars.forEach((star) => {
    star.update();
    star.draw();
  });
}
// drawGameOverScreen
function drawGameOverScreen() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawStars();

  ctx.fillStyle = "rgba(252, 252, 252, 1)";
  ctx.font = "28px 'Press Start 2P', cursive";
  ctx.fillText("GAME OVER", canvas.width / 2 - 140, canvas.height / 2);
  ctx.font = "20px 'Press Start 2P', cursive";
  ctx.fillText(
    "Score: " + score,
    canvas.width / 2 - 70,
    canvas.height / 2 + 40
  );

  ctx.font = "16px 'Press Start 2P', cursive";
  ctx.fillText(
    "Press Enter to restart",
    canvas.width / 2 - 155,
    canvas.height / 2 + 80
  );
}
function resetGame() {
  score = 0;
  lives = 3;
  enemies = [];
  enemyProjectiles = [];
  projectiles = [];
  explosions = [];
  comets = [];
  gameFrame = 0;
  gameSpeed = 4;
  difficultyIncreaseScore = 500;
  titleScreen = false; // Ensure the game doesn't start on the title screen
  gameActive = true; // Reactivate the game
  animate(); // Start the game loop again
}
// drawComets
function drawComets() {
  if (gameFrame % cometInterval === 0) {
    comets.push(new Comet());
  }
  comets.forEach((comet) => comet.update());
}
// drawCelestialBody
function drawCelestialBody(x, y) {
  // Glow effect around the moon
  ctx.fillStyle = "rgba(104, 136, 252, 0.5)"; // Light blue with some transparency for the glow
  ctx.beginPath();
  ctx.arc(x, y, 40, 0, 2 * Math.PI); // Adjust the radius to get the desired glow size
  ctx.fill();

  // Main moon circle
  ctx.fillStyle = NESPalette.moon; // NES white for the main moon surface
  ctx.beginPath();
  ctx.arc(x, y, 30, 0, 2 * Math.PI);
  ctx.fill();

  // Adding craters with shades of gray to simulate depth
  // Large crater
  ctx.fillStyle = "#7c7c7c"; // NES gray for crater shadow
  ctx.beginPath();
  ctx.arc(x - 10, y - 10, 8, 0, 2 * Math.PI);
  ctx.fill();

  // Medium crater
  ctx.fillStyle = "#bcbcbc"; // Lighter NES gray for craters
  ctx.beginPath();
  ctx.arc(x + 15, y, 5, 0, 2 * Math.PI);
  ctx.fill();

  // Small craters
  ctx.fillStyle = "#7c7c7c"; // Reusing darker gray for smaller craters
  ctx.beginPath();
  ctx.arc(x + 5, y + 15, 3, 0, 2 * Math.PI);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x - 20, y + 10, 4, 0, 2 * Math.PI);
  ctx.fill();

  // Simulating moon surface texture with small dots
  ctx.fillStyle = "#fcfcfc"; // Using white to add texture spots
  const dots = [
    { dx: -5, dy: 5 },
    { dx: 10, dy: -15 },
    { dx: -15, dy: -5 },
    { dx: 20, dy: 10 },
    { dx: 0, dy: -20 },
  ];
  dots.forEach((dot) => {
    ctx.beginPath();
    ctx.arc(x + dot.dx, y + dot.dy, 1, 0, 2 * Math.PI);
    ctx.fill();
  });
}
// handleShootingStars
function handleShootingStars() {
  shootingStars.forEach((star, index) => {
    console.log(star); // Log the star object to see its structure
    if (!(star instanceof ShootingStar)) {
      console.error("Invalid object in shootingStars array", star);
    }

    star.update();
    star.draw(ctx);

    if (star.isActive()) {
      shootingStars.splice(index, 1);
    }
  });
}
// calculateMoonPosition
function calculateMoonPosition() {
  const centerX = canvas.width / 2;
  // Increase centerY value to move the moon lower
  const centerY = canvas.height / 2; // This was originally canvas.height / 4

  // Define separate radius values for X and Y for an elliptical orbit
  const radiusX = Math.min(canvas.width, canvas.height) / 2; // Wider orbit
  const radiusY = Math.min(canvas.width, canvas.height) / 4; // Standard height orbit

  const angle = Math.PI * 2 * (dayNightCycle / 360);
  return {
    x: centerX + radiusX * Math.cos(angle),
    y: centerY + radiusY * Math.sin(angle),
  };
}
// drawDynamicGradientSky
function drawDynamicGradientSky() {
  let gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  // Add flash effect if skyFlashActive is true
  if (skyFlashActive) {
    gradient.addColorStop(0, "#ffffff"); // Bright white for the flash effect
    gradient.addColorStop(1, "#f8d878"); // Blend to a lighter color indicative of an explosion's glow
  }
  // Determine sky color based on the time of day
  else if (dayNightCycle < 90) {
    // Night to sunrise
    // Interpolate between nightSky and sunrise colors
    let progress = dayNightCycle / 90;
    gradient.addColorStop(
      0,
      interpolateColor(NESPalette.nightSky, NESPalette.sunrise, progress)
    );
    gradient.addColorStop(1, NESPalette.duskDawn);
  } else if (dayNightCycle < 180) {
    // Sunrise to day
    // Interpolate between sunrise and daySky colors
    let progress = (dayNightCycle - 90) / 90;
    gradient.addColorStop(
      0,
      interpolateColor(NESPalette.sunrise, NESPalette.daySky, progress)
    );
    gradient.addColorStop(1, NESPalette.daySky);
  } else if (dayNightCycle < 270) {
    // Day to sunset
    // Interpolate between daySky and sunset colors
    let progress = (dayNightCycle - 180) / 90;
    gradient.addColorStop(
      0,
      interpolateColor(NESPalette.daySky, NESPalette.sunset, progress)
    );
    gradient.addColorStop(1, NESPalette.sunset);
  } else {
    // Sunset to night
    // Interpolate between sunset and nightSky colors
    let progress = (dayNightCycle - 270) / 90;
    gradient.addColorStop(
      0,
      interpolateColor(NESPalette.sunset, NESPalette.nightSky, progress)
    );
    gradient.addColorStop(1, NESPalette.duskDawn);
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}
// initializeCityFires
function initializeCityFires() {
  cityFires = [];
  for (let i = 0; i < 10; i++) {
    let fireX = Math.random() * canvas.width;
    let fireY = canvas.height - Math.random() * 100; // Position fires
    cityFires.push(new Fire(fireX, fireY));
  }
}
// drawFireAndSmoke
function drawFiresAndSmoke() {
  cityFires.forEach((fire) => {
    // Create new fire particles for each fire
    if (Math.random() < 0.003) {
      // Lower frequency for more subtle effect
      let newFireParticle = new FireParticle(
        fire.x + Math.random() * 50 - 25, // Random x position within a range around the fire
        fire.y // y position at the base of the fire
      );
      newFireParticle.size = Math.random() * 2 + 0.5; // Subtle size variations
      fire.fireParticles.push(newFireParticle);
    }

    // Update and draw fire particles
    fire.fireParticles.forEach((particle, index) => {
      particle.update();
      particle.draw(ctx);
      // Remove the particle if its lifespan is over
      if (particle.lifespan <= 0) {
        fire.fireParticles.splice(index, 1);
      }
    });

    // Generate smoke particles with improved realism
    if (Math.random() < 0.1) {
      // Adjust this value to control how often new smoke particles are added
      for (let i = 0; i < 5; i++) {
        // Control the number of smoke particles generated
        let x = fire.x + Math.random() * 60 - 30; // Generate smoke around the fire
        let y = fire.y - 20; // Start smoke slightly above the fire
        smokeParticlePool.activate(x, y); // Use the particle pool to manage smoke particles
      }
    }
  });

  // Update and draw all smoke particles from the particle pool
  smokeParticlePool.updateAndDraw(ctx);
}

// drawCitySilhouette
function drawCitySilhouette() {
  const skylineColor = "#0000bc"; // A dark color for the silhouette to stand out against the sky
  const cityBaseLine = canvas.height - 0; // Adjust based on your game's horizon line
  const gapBetweenBuildings = 0; // Space between buildings
  const windowColorOn = "#0078F8"; // Lighter NES gray for subtle windows
  const windowColorOff = "rgba(0, 0, 0, 0.5)"; // Dark color for off windows
  const blinkingWindowColor = "#f1c40f"; // Color for blinking windows, optional change

  // Detailed buildings array simulating a real city's varied skyline
  const buildings = [
    { height: 190, width: 15, roof: "flat" },
    { height: 132, width: 12, roof: "flat" },
    { height: 230, width: 25, roof: "flat" },
    { height: 155, width: 25, roof: "flat" },
    { height: 110, width: 23, roof: "point" },
    { height: 110, width: 40, roof: "antenna" },
    { height: 127, width: 34, roof: "dome" },
    { height: 127, width: 20, roof: "flat" },
    { height: 105, width: 12, roof: "flat" },
    { height: 114, width: 12, roof: "flat" },
    { height: 140, width: 22, roof: "flat" },
    { height: 140, width: 23, roof: "point" },
    { height: 140, width: 8, roof: "flat" },
    { height: 148, width: 14, roof: "flat" },
    { height: 163, width: 18, roof: "flat" },
    { height: 123, width: 14, roof: "flat" },
    { height: 105, width: 14, roof: "flat" },
    { height: 105, width: 37, roof: "point" },
    { height: 119, width: 12, roof: "flat" },
    { height: 132, width: 12, roof: "flat" },
    { height: 140, width: 15, roof: "flat" },
    { height: 117, width: 21, roof: "flat" },
    { height: 105, width: 27, roof: "flat" },
    { height: 115, width: 17, roof: "flat" },
    { height: 130, width: 25, roof: "antenna" },
    { height: 116, width: 45, roof: "flat" },
    { height: 105, width: 21, roof: "flat" },
    { height: 121, width: 19, roof: "flat" },
    { height: 144, width: 45, roof: "flat" },
    { height: 105, width: 17, roof: "flat" },
    { height: 119, width: 17, roof: "flat" },
    { height: 154, width: 30, roof: "dome" },
    { height: 160, width: 55, roof: "point" },
    { height: 160, width: 12, roof: "flat" },
    { height: 290, width: 17, roof: "flat" },
    { height: 190, width: 11, roof: "flat" },
    { height: 105, width: 32, roof: "flat" },
    // Add more buildings as needed to fill the canvas width
  ];

  let currentX = 0; // Starting x position for the first building

  buildings.forEach((building) => {
    ctx.fillStyle = skylineColor;
    ctx.fillRect(
      currentX,
      cityBaseLine - building.height,
      building.width,
      building.height
    );

    // Add roof variations
    switch (building.roof) {
      case "flat":
        // No additional drawing needed for flat roofs
        break;
      case "point":
        // Draw a triangular roof
        ctx.beginPath();
        ctx.moveTo(currentX, cityBaseLine - building.height);
        ctx.lineTo(
          currentX + building.width / 2,
          cityBaseLine - building.height - 20
        ); // Peak of the roof
        ctx.lineTo(currentX + building.width, cityBaseLine - building.height);
        ctx.fill();
        break;
      case "antenna":
        // Draw an antenna atop a flat roof
        ctx.fillRect(
          currentX + building.width / 2 - 3,
          cityBaseLine - building.height - 30,
          6,
          30
        );
        break;
      case "dome":
        // Draw a dome atop the building
        ctx.beginPath();
        ctx.arc(
          currentX + building.width / 2,
          cityBaseLine - building.height,
          building.width / 2,
          Math.PI,
          0,
          false
        );
        ctx.fill();
        break;
    }

    // Adjust windows: less frequent and smaller
    const floors = Math.floor(building.height / 40); // Increase spacing between floors for fewer windows
    for (let floor = 0; floor < floors; floor++) {
      for (
        let windowX = currentX + 10;
        windowX < currentX + building.width - 10;
        windowX += 20
      ) {
        // Increase spacing for fewer windows
        ctx.fillStyle = windowColorOn;
        ctx.fillRect(
          windowX,
          cityBaseLine - building.height + 40 * floor + 10,
          4,
          8
        ); // Smaller window size
      }
    }

    currentX += building.width + gapBetweenBuildings;
  });
  drawFiresAndSmoke();
}

//*************************************************

class Fire {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    // Assuming fireParticles is an array holding the fire particles for this fire
    this.fireParticles = [];
  }

  update() {
    // Generate fewer particles for a less intense fire
    if (Math.random() < 0.05) {
      // Adjust this rate to control intensity
      // Increase number for less intensity
      let newParticle = new FireParticle(this.x, this.y);
      this.fireParticles.push(newParticle);
    }

    // Update and optionally remove old particles
    this.fireParticles.forEach((particle, index) => {
      particle.update();
      if (!particle.active) {
        this.fireParticles.splice(index, 1);
      }
    });
  }

  draw(ctx) {
    this.fireParticles.forEach((particle) => {
      particle.draw(ctx);
    });
  }
}

class Particle {
  constructor() {
    this.active = false;
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.lifespan = 100; // Default lifespan, can be overridden
    this.active = true;
  }

  update() {
    if (!this.active) return;
    // Update particle position and behavior
    this.x += this.speedX;
    this.y += this.speedY;
    this.lifespan -= 1.5;
    if (this.lifespan <= 0) {
      this.active = false;
    }
  }

  draw(ctx) {
    if (!this.active) return;
    ctx.globalAlpha = this.lifespan / 100;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, 2 * Math.PI);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}
// SmokeParticle class with improved behavior
class SmokeParticle {
  constructor() {
    this.reset();
  }

  reset(x = 0, y = 0) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 2 + 1;
    this.speedX = Math.random() * 0.5 - 0.25;
    this.speedY = Math.random() * -1 - 0.1;
    this.color = "rgba(124, 124, 124, 0.5)"; // Change to use an NES palette color with appropriate transparency for smoke.
    this.lifespan = 100;
    this.active = true;
  }

  update() {
    if (!this.active) return;

    this.x += this.speedX;
    this.y += this.speedY;
    this.lifespan -= 1.5;
    if (this.lifespan <= 0) {
      this.active = false; // Mark as inactive for pooling
    }
  }

  draw(ctx) {
    if (!this.active) return;

    drawParticle(this);
  }
}

// SmokeParticle Pool
class ParticlePool {
  constructor(size) {
    this.pool = [];
    this.initialSize = size;
    for (let i = 0; i < size; i++) {
      this.pool.push(new SmokeParticle());
    }
  }

  activate(x, y) {
    let particle = this.pool.find((p) => !p.active);
    if (!particle) {
      if (this.pool.length < this.initialSize * 2) {
        particle = new SmokeParticle();
        this.pool.push(particle);
      } else {
        // This warning will now only show if you genuinely have too many active particles
        console.warn("Particle pool reached maximum size.");
        return;
      }
    }
    particle.reset(x, y);
  }

  // Make sure inactive particles are reused before creating new ones
  updateAndDraw(ctx) {
    this.pool.forEach((particle) => {
      if (particle.active) {
        particle.update();
        particle.draw(ctx);
      }
    });
  }
}

// 4. Game Control Functions
// startGame
function startGame() {
  console.log("Game is starting...");
  titleScreen = false;
  gameActive = true;
  resetGame();
}
// pauseGame
function pauseGame() {
  isPaused = !isPaused;
  if (isPaused) {
    console.log("Game paused.");
  } else {
    console.log("Game resumed.");
    requestAnimationFrame(animate); // Ensure animation continues if unpaused
  }
}
// resetGame
function resetGame() {
  console.log("Game is resetting...");
  // Reset game variables
  score = 0;
  lives = 3;
  enemies = [];
  enemyProjectiles = [];
  projectiles = [];
  explosions = [];
  comets = [];
  shootingStars = [];
  gameFrame = 0;
  gameSpeed = 1;
  difficultyIncreaseScore = 500;
  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Possibly set up the initial game state or reload assets
  preloadAssets().then(() => {
    setupGame();
  });
}

// 5. Event Listener Setup
// Event Listener Setup for player control and game interactions
// Define a function to set up all necessary event listeners for the game
function setupEventListeners() {
  // Add key down listener for player control
  window.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      if (gameActive) {
        isPaused = !isPaused;
        if (!isPaused) animate();
      } else {
        if (!titleScreen) {
          resetGame(); // Reset game if not on the title screen
        } else {
          titleScreen = false;
          gameActive = true;
          animate(); // Start game animation if on the title screen
        }
      }
    }

    if (e.key === "ArrowLeft") {
      player.movingLeft = true;
      player.direction = "left";
    }

    if (e.key === "ArrowRight") {
      player.movingRight = true;
      player.direction = "right";
    }

    if (e.key.toLowerCase() === "p") {
      isPaused = !isPaused;
      if (!isPaused && gameActive) animate();
    }

    // Define the keys used for gameplay including additional keys from the second listener
    const gameKeys = [
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Space",
      "Enter",
      " ",
    ]; // Consolidated list of game keys

    if (gameKeys.includes(e.key)) {
      e.preventDefault(); // Prevent default action for game control keys
    } else {
      // Optionally prevent default for all other keys when the game is active
      if (gameActive) {
        e.preventDefault(); // Prevent actions like page scrolling when the game is active
      }
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
        ) // Adjust x to center the shot
      );
    }
    window.addEventListener("beforeunload", function (e) {
      // Optional: Check if the game is in progress or if there's unsaved progress
      var confirmationMessage = "Are you sure you want to leave the game?";

      e.returnValue = confirmationMessage; // Standard for most browsers
      return confirmationMessage; // For older browsers
    });
  });
}

// Call this function to initialize all event listeners
setupEventListeners();

document.addEventListener("DOMContentLoaded", function () {
  console.log("Document is ready.");
  const canvas = document.getElementById("gameCanvas");
  if (!canvas) {
    console.error("Canvas element not found!");
    return;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.error("Unable to get canvas context!");
    return;
  }
  canvas.width = 800;
  canvas.height = 600;

  console.log("Canvas initialized successfully");
  preloadAssets;

  // Preload assets using the new system
  preloadAssets()
    .then(() => {
      console.log("All assets loaded successfully");
      particlePool = new ParticlePool(50); // Initialize with the desired size
      setupGame(); // Prepare your game setup here
      startGame(); // Start your game loop here
    })
    .catch((error) => {
      console.error("Failed to load assets:", error);
    });
});

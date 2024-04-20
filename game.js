// game.js

// Global Variables
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 800;
canvas.height = 600;

let score = 0;
let lives = 2000;
let enemies = [];
let enemyProjectiles = [];
let projectiles = [];
let explosions = [];
let comets = [];
let shootingStars = [];
let gameFrame = 0;
let gameSpeed = 1;
let titleScreen = true;
let gameActive = false;
let isPaused = false;
let difficultyIncreaseScore = 500;
let numberOfExplosionFrames = 3;
let dayNightCycle = 180;
const enemyInterval = 100;
const cometInterval = 2000;
const NESPalette = {
  nightSky: "#0000fc", // Deep blue for the night sky
  sunrise: "#f8d878", // Added: Sunrise color
  daySky: "#a4e4fc", // Light blue for the daytime sky
  sunset: "#f87858", // Added: Sunset color
  duskDawn: "#6888fc", // Lighter blue for dusk and dawn transitions (could be used for softer transitions)
  moon: "#fcfcfc", // White for the moon
};
const dayNightCycleSpeed = 0.01; // Adjust the speed as necessary
const skyFlashDuration = 30; // The length of time the sky flash effect should last
let cityFires = [];
// Global Variables for Sky Flash
let skyFlashActive = false; // Controls whether the sky flash effect is active
let skyFlashTimer = 0; // Tracks the duration of the sky flash effect
let smokeParticles = []; // Add this line to your existing global variables
let smokeParticlePool;
let spaceship; // Declare a global variable to hold the spaceship instance
let spaceships = []; // Array to hold all active spaceships
const maxSpaceships = 3; // Maximum number of spaceships attacking simultaneously
// Flag to track if the game is currently active
let gameIsActive = false;

// Utility functions
function interpolateColor(color1, color2, factor) {
  let result = "#";
  for (let i = 1; i <= 5; i += 2) {
    let hex1 = parseInt(color1.substr(i, 2), 16);
    let hex2 = parseInt(color2.substr(i, 2), 16);
    let interp = Math.round(hex1 + (hex2 - hex1) * factor).toString(16);
    result += ("00" + interp).slice(-2);
  }
  return result;
}

// Function to enable game mode
function startGame() {
  gameIsActive = true;
  // Additional logic to start the game
}

// Function to pause or stop the game, which could disable the game mode
function pauseGame() {
  gameIsActive = false;
  // Additional logic to pause the game
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

// Add stars array and numberOfStars here
let stars = [];
const numberOfStars = 100;

function drawStars() {
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
function drawComets() {
  if (gameFrame % cometInterval === 0) {
    comets.push(new Comet());
  }
  comets.forEach((comet) => comet.update());
}
function checkCollision(rect1, rect2) {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.height + rect1.y > rect2.y
  );
}

function handleShootingStars() {
  console.log("Handling shooting stars"); // Verify the function is called

  if (Math.random() < 0.005) {
    // Adjust probability as needed
    console.log("Creating a new shooting star");
    shootingStars.push(new ShootingStar());
  }

  console.log(`Current number of shooting stars: ${shootingStars.length}`);

  for (let i = shootingStars.length - 1; i >= 0; i--) {
    shootingStars[i].update();
    shootingStars[i].draw();
    if (
      shootingStars[i].x < 0 - shootingStars[i].length ||
      shootingStars[i].y > canvas.height
    ) {
      shootingStars.splice(i, 1);
      console.log(
        `Removed a shooting star. Count now: ${shootingStars.length}`
      );
    }
  }
}

// Utility function to calculate the moon's position for a circular orbit
// Modified calculateMoonPosition function
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

// Updated gradient sky drawing function to use NES colors
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

// Draw a gradient sky as the farthest background layer
function drawGradientSky() {
  let gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#1e4877"); // Top sky color
  gradient.addColorStop(1, "#4584b4"); // Bottom sky color
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawPixelatedMountains() {
  ctx.fillStyle = "#33334F"; // Dark blue-grey, change as needed
  ctx.beginPath();
  ctx.moveTo(0, canvas.height);
  // Create jagged mountain peaks with fixed positions
  for (let i = 0; i < canvas.width; i += 40) {
    // 40 is the width of each "peak"
    ctx.lineTo(i + 20, canvas.height - 100); // Fixed peak height
    ctx.lineTo(i + 40, canvas.height);
  }
  ctx.closePath();
  ctx.fill();
}

// Adjusted buildings setup with fixed colors
const buildings = [
  { x: 0, height: 120, width: 40, color: "#3cbcfc" },
  { x: 60, height: 100, width: 30, color: "#0058f8" },
  { x: 120, height: 80, width: 20, color: "#0000fc" },
  { x: 170, height: 60, width: 25, color: "#3cbcfc" },
  // Continue defining buildings as needed, assigning a color to each
];

function drawPixelatedCity() {
  const windowColor = "#f8f8f8"; // Use a constant color for windows to match Vela's gun and backpack

  const cityBaseLine = canvas.height - 40;

  buildings.forEach((building) => {
    // Use the predefined color for each building
    ctx.fillStyle = building.color;
    ctx.fillRect(
      building.x,
      cityBaseLine - building.height,
      building.width,
      building.height
    );

    // Draw windows
    for (
      let y = cityBaseLine - building.height + 10;
      y < cityBaseLine - 10;
      y += 20
    ) {
      for (
        let x = building.x + 5;
        x < building.x + building.width - 5;
        x += 10
      ) {
        ctx.fillStyle = windowColor;
        ctx.fillRect(x, y, 5, 10);
      }
    }
  });
}

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

function initializeCityFires() {
  cityFires = [];
  for (let i = 0; i < 10; i++) {
    let fireX = Math.random() * canvas.width;
    let fireY = canvas.height - Math.random() * 100; // Position fires
    cityFires.push(new Fire(fireX, fireY));
  }
}

function drawFiresAndSmoke() {
  cityFires.forEach((fire) => {
    // Create new fire particles for each fire
    if (Math.random() < 0.003) {
      // Decrease this value to reduce frequency
      let newFireParticle = new FireParticle(
        fire.x + Math.random() * 50 - 25,
        fire.y
      );
      newFireParticle.size = Math.random() * 2 + 0.5; // Decrease size for subtlety
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

    // Draw smoke particles
    for (let i = 0; i < 5; i++) {
      let x = fire.x + Math.random() * 60 - 30;
      let y = fire.y - 20;
      smokeParticlePool.activate(x, y);
    }
  });
}

const moonSpeed = 0.05; // Slow speed for the moon's movement

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

function drawSpaceshipWithDetails(x, y) {
  const auraGradient = ctx.createRadialGradient(
    x,
    y,
    spaceship.width / 2,
    x,
    y,
    spaceship.width
  );
  auraGradient.addColorStop(0, "#3cbcfc"); // Inner color of the glow
  auraGradient.addColorStop(1, "transparent"); // Outer color of the glow

  ctx.fillStyle = auraGradient;
  ctx.beginPath();
  ctx.arc(
    x + spaceship.width / 2,
    y + spaceship.height / 2,
    spaceship.width,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // Draw the spaceship body (simplified to a rectangle for this example)
  ctx.fillStyle = "#0078f8"; // Base color of the spaceship
  ctx.fillRect(x, y, spaceship.width, spaceship.height);

  // Engine Glow
  const engineGradient = ctx.createLinearGradient(
    x,
    y + spaceship.height,
    x,
    y + spaceship.height + 10
  );
  engineGradient.addColorStop(0, "#f83800");
  engineGradient.addColorStop(1, "#e45c10");
  ctx.fillStyle = engineGradient;
  ctx.fillRect(x + 10, y + spaceship.height, spaceship.width - 20, 10); // Engine glow effect below the spaceship

  // Illuminated Windows
  const windowSpacing = 10;
  for (let wx = x + 5; wx < x + spaceship.width - 5; wx += windowSpacing) {
    for (let wy = y + 5; wy < y + spaceship.height - 5; wy += windowSpacing) {
      const windowColor = Math.random() > 0.5 ? "#fcfcfc" : "#0058f8"; // Randomly lit or unlit
      ctx.fillStyle = windowColor;
      ctx.fillRect(wx, wy, 3, 3); // Small windows
    }
  }
}

// Classes
class ShootingStar {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = -50; // Start a bit off-screen to give a more natural entry
    this.length = Math.random() * 80 + 10;
    this.speed = Math.random() * 5 + 3; // Slower speed for better visibility
  }

  update() {
    this.x -= this.speed * 0.5; // Adjust for diagonal movement
    this.y += this.speed;
  }

  draw() {
    ctx.strokeStyle = "#fff"; // High contrast color
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x + this.length, this.y - this.length);
    ctx.stroke();
  }
}

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

class Projectile {
  constructor(x, y, speedY) {
    this.x = x;
    this.y = y;
    this.radius = 3; // Size of the projectile
    this.speedY = speedY; // Speed at which the projectile moves down
    this.color = "#"; // Bright color for visibility
  }

  update() {
    this.y += this.speedY;
  }

  draw() {
    const ctx = canvas.getContext("2d");
    ctx.save(); // Save the current state of the canvas
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 20; // Adjust the glow effect's size
    ctx.shadowColor = "rgba(226, 92, 16, 0.27)"; // Glowing effect color
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore(); // Restore the canvas state to remove the glow effect for other elements
  }
}

Spaceship.prototype.attack = function () {
  // Launch a projectile from the center-bottom of the spaceship
  projectiles.push(
    new Projectile(this.x + this.width / 2, this.y + this.height, 3)
  );
};

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
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 5 + 1;
    this.speedX = Math.random() * 3 - 1.5;
    this.speedY = Math.random() * 3 - 1.5;
    this.color = "rgba(228, 0, 77, 0.7)"; // You can change this color
    this.lifespan = 100; // Lifespan of the particle
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.lifespan -= 1.5; // How quickly the particle "fades"
  }

  draw(ctx) {
    ctx.globalAlpha = this.lifespan / 100; // Fade effect
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1; // Reset alpha so it doesn't affect other canvas elements
  }
}

class SmokeParticle {
  constructor() {
    this.reset();
  }

  reset(x = 0, y = 0) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 2 + 1;
    this.speedX = Math.random() * 0.5 - 0.25;
    this.speedY = Math.random() * -1 - 0.5;
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

class AnimatedProjectile {
  constructor(x, y, enemyShot = false) {
    this.x = x;
    this.y = y;
    this.width = 13; // Width of a single frame
    this.height = 28; // Height of the sprite
    this.speed = enemyShot ? 3 : -5; // Enemy shots move down, Vela's shots move up
    this.enemyShot = enemyShot;
    this.spriteSheet = new Image();
    this.spriteSheet.src = "assets/images/game/projectile_main.png";
    this.frameX = 0; // Starting frame
    this.maxFrames = 3; // Total frames for animation
    this.tick = 0; // Timer for frame switching
    this.ticksPerFrame = 4; // Speed of the animation
    this.framesOrder = enemyShot ? [3, 4, 5, 4] : [0, 1, 2, 1]; // Order of frames for animation
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
    ctx.drawImage(
      this.spriteSheet,
      this.framesOrder[this.frameX] * this.width, // Select the correct frame
      0, // Y position on the sprite sheet (always 0 in this case)
      this.width,
      this.height,
      this.x,
      this.y,
      this.width,
      this.height
    );
  }
}
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

// Player Object
const player = {
  x: canvas.width / 2 - 27.5,
  y: canvas.height - 87.5 - 5, // Adjusted to position Vela 5px above the bottom
  width: 80,
  height: 87.5,
  speed: 4,
  movingLeft: false,
  movingRight: false,
  frameX: 0,
  frameY: 0,
  spriteWidth: 80,
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
    if (this.movingLeft || this.movingRight) {
      this.frameTimer++;
      if (this.frameTimer >= this.frameInterval) {
        this.sequenceIndex =
          (this.sequenceIndex + 1) % this.frameSequence.length;
        this.currentFrame = this.frameSequence[this.sequenceIndex] - 1;
        this.frameX = this.currentFrame * this.spriteWidth;
        this.frameTimer = 0;
      }
    } else {
      // Reset to idle frame when not moving
      this.currentFrame = 0; // Assuming the first frame is idle
      this.frameX = this.currentFrame * this.spriteWidth;
      this.sequenceIndex = 0;
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

// Setup Game Function
function setupGame() {
  preloadAssets(assetURLs)
    .then(() => {
      player.spriteImage.src = "assets/images/game/vela_main_sprite.png";
      smokeParticlePool = new ParticlePool(100);
      initializeCityFires();

      // Initialize stars for the background
      for (let i = 0; i < numberOfStars; i++) {
        // Assuming you have a Star class defined somewhere
        stars.push(new Star());
      }

      // Initialize shooting stars if applicable
      // This assumes a ShootingStar class definition similar to the Star class
      // for (let i = 0; i < initialNumberOfShootingStars; i++) {
      //   shootingStars.push(new ShootingStar());
      // }

      // Initialize any other game elements here...
      // For example, setting up the initial set of enemies, power-ups, or environmental features
      // This setup could include pushing new Enemy() objects into the enemies array, similar to how stars are handled

      // Initialize the spaceship
      spaceship = new Spaceship();

      // Example: Resetting game state
      spaceships = []; // Reset the spaceships array for a new game

      // Any additional setup logic can go here

      // Example: Set up event listeners for player input
      setupInputListeners();

      // Finally, if you have a title screen or an initial game state different from the main gameplay loop,
      // ensure the appropriate flags are set or functions are called here
      if (titleScreen) {
        drawTitleScreen(); // Draw the title screen if your game starts with one
      } else {
        gameActive = true;
        animate(); // If no title screen, start the game loop directly
      }
    })
    .catch((error) => {
      console.error("Error preloading assets:", error);
      // Handle any errors that occur during asset preloading
    });
}

function setupInputListeners() {
  // Example: Setup keyboard or mouse event listeners
  window.addEventListener("keydown", function (e) {
    // Handle player input, e.g., moving the player sprite or firing projectiles
    // This might involve setting properties like player.movingLeft or player.shooting = true
  });

  window.addEventListener("keyup", function (e) {
    // Handle key release events, possibly reversing actions taken on keydown
  });

  // Add any other input listeners needed for your game
}

// Call setupGame when the DOM content is fully loaded to ensure all elements are available
document.addEventListener("DOMContentLoaded", setupGame);

// Start Game Function
// function startGame() {
//   if (titleScreen) {
//     drawTitleScreen();
//   } else {
//     gameActive = true;
//     animate();
//   }
// }

// Helper Functions
function drawTitleScreen() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawStars();

  ctx.shadowColor = "#0000fc";
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 5;
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#1461d5";
  ctx.font = "28px 'Press Start 2P', cursive";

  ctx.fillText("GUARDIANS OF LUMARA:", 100, 200);
  ctx.fillText("VELA'S VOYAGE", 150, 240);

  ctx.shadowColor = "transparent";
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  ctx.strokeStyle = "#b5c9d0";
  ctx.lineWidth = 1.5;
  ctx.strokeText("GUARDIANS OF LUMARA:", 100, 200);
  ctx.strokeText("VELA'S VOYAGE", 150, 240);

  ctx.font = "16px Arial";
  ctx.fillStyle = "rgba(252, 252, 252, 1)";
  ctx.fillText(
    "In the year 2045, Earth has become a utopia where equality and peace",
    50,
    300
  );
  ctx.fillText(
    "have flourished for decades. However, this harmony is threatened when",
    50,
    320
  );
  ctx.fillText(
    'alien monsters, known as the "Void Swarm" emerge from a rip in the fabric',
    50,
    340
  );
  ctx.fillText(
    "of space-time, intent on consuming the planet's resources and enslaving humanity.",
    50,
    360
  );
  ctx.fillText("Hit Enter to start. Press 'P' to pause.", 50, 500);
}
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
  gameSpeed = 1;
  difficultyIncreaseScore = 500;
  titleScreen = false; // Ensure the game doesn't start on the title screen
  gameActive = true; // Reactivate the game
  animate(); // Start the game loop again
}

function animate() {
  if (!gameActive || isPaused) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  gameFrame++;

  // Background elements
  drawDynamicGradientSky();
  drawStars(); // Ensure stars are drawn in every frame
  handleShootingStars(); // Handling shooting stars
  // Ensure the moon is updated and drawn in every frame for visibility
  let moonPos = calculateMoonPosition();
  drawCelestialBody(moonPos.x, moonPos.y);
  // Draws the cityscape.
  drawCitySilhouette();

  // Update and draw fires and smoke for each city fire location
  drawFiresAndSmoke();

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

  // Update and draw fires
  cityFires.forEach((fire) => {
    fire.update();
    fire.draw(ctx);
  });

  // Update and draw particles
  smokeParticlePool.updateAndDraw(ctx);

  // Update the dayNightCycle using the slower speed
  dayNightCycle = (dayNightCycle + dayNightCycleSpeed) % 360;

  // Explicitly increment the day-night cycle for troubleshooting
  dayNightCycle += dayNightCycleSpeed;
  if (dayNightCycle >= 360) dayNightCycle = 0;

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

  // Update and draw the spaceship
  if (spaceship) {
    spaceship.update();
    spaceship.draw();
  }

  // Update and draw projectiles
  projectiles.forEach((projectile, index) => {
    projectile.update();
    projectile.draw();
    // Optionally remove the projectile if it goes off screen
    if (projectile.y > canvas.height) {
      projectiles.splice(index, 1);
    }
  });

  // Manage spaceships: update positions, draw, and handle attacks
  manageSpaceships();

  // Instead of iterating through smokeParticles, use:
  smokeParticlePool.updateAndDraw(ctx);

  // Player, enemies, and other game elements

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

  // Check for game over condition
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

function handleExplosions() {
  for (let i = explosions.length - 1; i >= 0; i--) {
    explosions[i].update();
    explosions[i].draw(ctx);
    if (explosions[i].particles.length === 0) {
      explosions.splice(i, 1);
    }
  }
}

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
      new AnimatedProjectile(player.x + player.width / 2 - 6.5, player.y, false) // Adjust x to center the shot
    );
  }
  window.addEventListener("beforeunload", function (e) {
    // Optional: Check if the game is in progress or if there's unsaved progress
    var confirmationMessage = "Are you sure you want to leave the game?";

    e.returnValue = confirmationMessage; // Standard for most browsers
    return confirmationMessage; // For older browsers
  });
});

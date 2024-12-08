// game.js

// Initialize variables without accessing document
let canvas = null;
let ctx = null;
let score = 0;
let lives = 3;
let enemies = [];
let maxEnemies = 2;
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
let enemyInterval = 240;
let heatseekerAmmo = [];
let heatseekers = 0;
const maxHeatseekers = 3;
const cometInterval = 2000;
const ammoDropInterval = 3000;
const powerUpDropInterval = 5000;

// Constants
const NESPalette = {
	nightSky: '#0000fc',
	sunrise: '#f8d878',
	daySky: '#a4e4fc',
	sunset: '#f87858',
	duskDawn: '#6888fc',
	moon: '#fcfcfc'
};

const goldExplosionColors = ['#f8d878', '#fce0a8', '#fca044'];

const dayNightCycleSpeed = 0.01;
const skyFlashDuration = 30;
let cityFires = [];
let skyFlashActive = false;
let skyFlashTimer = 0;
let smokeParticles = [];
let smokeParticlePool;
let stars = [];
const numberOfStars = 100;
let spaceship;
let spaceships = [];
const maxSpaceships = 3;
let clouds = [];
let flashEffectActive = false;
let flashColor = 'rgba(255, 0, 0, 0.5)';
let particles = [];
let gameOverScreen = false;
let allowAmmoDrop = true;
let floatingTexts = [];
let obstacles = [];
let extraLives = [];
let powerUps = [];
const heatseekerAmmoMax = 10;
let heatseekerCount = 3;
let gameIsActive = false;
let dayNightCycle = 180;
let canShoot = true;
let shootingCooldown = 50;
let highScore = 0;
let comboCounter = 0;
let newGameMechanicsSprite;
let constantPowerUpMode = false;
let unlimitedHeatseekersMode = false;
let powerUpActive = false;
let powerUpType = '';
let powerUpDuration = 10000;
let powerUpStartTime = 0;
let keyCombination = ['S', 'T', 'A', 'R'];
let keyCombinationIndex = 0;
const maxPowerUps = 5;
let velaShootingCooldown = 50;
let rapidFireMode = false;
let lastVelaShotTime = 0;

const PLAYER_HITBOX_PADDING = 28;

const assetURLs = [
	'assets/images/game/void_swarm_sprite.png',
	'assets/images/game/vela_main_sprite.png',
	'assets/images/game/projectile_main_sprite.png',
	'assets/images/game/game_mechanics_sprite.png'
];

const player = {
	x: canvas.width / 2 - 27.5,
	y: canvas.height - 87.5 - 5,
	width: 80,
	height: 87.5,
	speed: 4,
	acceleration: 0.2,
	friction: 0.9,
	velocityX: 0,
	velocityY: 0,
	gravity: 0.5,
	isGrounded: false,
	movingLeft: false,
	movingRight: false,
	isJumping: false,
	canDoubleJump: true,
	dashSpeed: 10,
	isDashing: false,
	dashCooldown: 0,
	dashDuration: 10,
	dashCooldownDuration: 100,
	frameX: 0,
	frameY: 0,
	spriteWidth: 80,
	spriteHeight: 87.5,
	currentFrame: 0,
	frameCount: 4,
	frameTimer: 0,
	frameInterval: 8,
	isExploding: false,
	explosionFrame: 0,
	spriteImage: new Image(),
	direction: 'right',
	frameSequence: [2, 3, 2, 4],
	sequenceIndex: 0,

	update: function () {
		if (this.isExploding) {
			this.explosionFrame++;
			if (this.explosionFrame > 2) {
				this.isExploding = false;
				this.explosionFrame = 0;
				// Hide Vela after explosion
				this.x = -100;
				this.y = -100;
				// Transition to Game Over screen after explosion
				setTimeout(() => {
					if (lives <= 0) {
						gameActive = false;
						drawGameOverScreen();
					}
				}, 1000); // Delay to show explosion sequence before Game Over
			}
		} else {
			// Handle dashing
			if (this.isDashing) {
				this.dodgeEnemyProjectiles();
				this.x += this.dashSpeed * (this.direction === 'left' ? -1 : 1);
				this.dashDuration--;
				if (this.dashDuration <= 0) {
					this.isDashing = false;
					this.dashCooldown = this.dashCooldownDuration;
				}
			} else if (this.dashCooldown > 0) {
				this.dashCooldown--;
			}

			// Handle horizontal movement with acceleration and friction
			if (this.movingLeft) {
				this.velocityX = Math.max(this.velocityX - this.acceleration, -this.speed);
				this.direction = 'left';
			} else if (this.movingRight) {
				this.velocityX = Math.min(this.velocityX + this.acceleration, this.speed);
				this.direction = 'right';
			} else {
				this.velocityX *= this.friction;
				if (Math.abs(this.velocityX) < 0.1) {
					this.velocityX = 0;
				}
			}

			this.x += this.velocityX;

			// Wrapping logic
			if (this.x + this.width < 0) {
				this.x = canvas.width;
			} else if (this.x > canvas.width) {
				this.x = -this.width;
			}

			// Handle vertical movement and jumping
			if (this.isJumping) {
				this.velocityY = -10;
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
				if (this.y + this.height > canvas.height - 5) {
					// Ensure Vela is 5px above the bottom
					this.y = canvas.height - this.height - 5;
					this.velocityY = 0;
					this.isGrounded = true;
					this.canDoubleJump = true;
				}
			}

			// Handle frame animation
			if (this.movingLeft || this.movingRight) {
				this.frameTimer++;
				if (this.frameTimer >= this.frameInterval) {
					this.sequenceIndex = (this.sequenceIndex + 1) % this.frameSequence.length;
					this.currentFrame = this.frameSequence[this.sequenceIndex] - 1;
					this.frameX = this.currentFrame * this.spriteWidth;
					this.frameTimer = 0;
				}
			} else {
				this.currentFrame = 0;
				this.frameX = this.currentFrame * this.spriteWidth;
				this.sequenceIndex = 0;
			}
		}
	},

	jump: function () {
		if (this.isGrounded || this.canDoubleJump) {
			this.isJumping = true;
		}
	},

	dash: function () {
		if (!this.isDashing && this.dashCooldown <= 0) {
			this.isDashing = true;
			this.dashDuration = 10;
		}
	},

	dodgeEnemyProjectiles: function () {
		enemyProjectiles.forEach((projectile) => {
			if (
				projectile.x > this.x - this.width &&
				projectile.x < this.x + this.width &&
				projectile.y > this.y - this.height &&
				projectile.y < this.y + this.height
			) {
				if (this.direction === 'left') {
					this.x = projectile.x + this.width + 10;
				} else {
					this.x = projectile.x - this.width - 10;
				}
			}
		});
	},

	draw: function () {
		ctx.save();
		if (this.direction === 'left') {
			ctx.scale(-1, 1);
			ctx.translate(-canvas.width, 0);
		}

		if (this.glowColor) {
			ctx.shadowBlur = 20;
			ctx.shadowColor = this.glowColor;
		}

		if (this.isExploding) {
			let frameToDraw = 5 + this.explosionFrame;
			ctx.drawImage(
				this.spriteImage,
				frameToDraw * this.spriteWidth,
				0,
				this.spriteWidth,
				this.spriteHeight,
				this.direction === 'left' ? canvas.width - this.x - this.width : this.x,
				this.y,
				this.width,
				this.height
			);
		} else {
			ctx.drawImage(
				this.spriteImage,
				this.frameX,
				this.frameY,
				this.spriteWidth,
				this.spriteHeight,
				this.direction === 'left' ? canvas.width - this.x - this.width : this.x,
				this.y,
				this.width,
				this.height
			);
		}

		ctx.restore();
	}
};

// Class Definitions

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
		ctx.fillStyle = 'rgba(252, 252, 252, ' + this.twinkleFactor * 0.5 + ')';
		ctx.beginPath();
		ctx.arc(this.x, this.y, this.size * this.twinkleFactor, 0, Math.PI * 2);
		ctx.fill();
	}
}

function drawClouds() {
	clouds.forEach((cloud) => {
		cloud.update();
		cloud.draw(ctx);
	});
}

class Comet {
	constructor() {
		this.x = Math.random() * canvas.width;
		this.y = 0;
		this.size = Math.random() * 5 + 5;
		this.speed = Math.random() * 3 + 2;
		this.color = 'rgba(248, 56, 0, 0.8)';
	}

	draw(ctx) {
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
		this.draw(ctx);
	}
}

class Cloud {
	constructor() {
		this.x = canvas.width;
		this.y = Math.random() * 150;
		this.speed = Math.random() * 0.5 + 0.2;
		this.width = Math.random() * 50 + 30;
		this.height = this.width * 0.6;
	}

	update() {
		this.x -= this.speed;
		if (this.x < -this.width) {
			this.x = canvas.width;
			this.y = Math.random() * 150;
			this.speed = Math.random() * 0.5 + 0.2;
			this.width = Math.random() * 50 + 30;
			this.height = this.width * 0.6;
		}
	}

	draw(ctx) {
		ctx.fillStyle = '#BCBCBC';
		ctx.beginPath();
		ctx.ellipse(this.x, this.y, this.width / 2, this.height / 2, 0, 0, 2 * Math.PI);
		ctx.fill();
	}
}

class TrailParticle {
	constructor(x, y) {
		this.x = x;
		this.y = y;
		this.size = Math.random() * 3 + 1.5; // Slightly larger particles
		this.speedX = (Math.random() - 0.5) * 1.2; // Horizontal spread
		this.speedY = (Math.random() - 0.5) * 1.2; // Vertical spread
		this.colors = ['#fcfcfc', '#a4e4fc', '#3cbcfc', '#f8d878']; // Gradient colors
		this.lifespan = 50; // Shorter lifespan for quick trail fade
		this.opacity = 1; // Initial opacity
		this.isActive = true;
	}

	update() {
		this.lifespan -= 1;
		this.opacity = this.lifespan / 50; // Gradually decrease opacity
		if (this.lifespan > 0) {
			this.x += this.speedX;
			this.y += this.speedY;
			this.size *= 0.98; // Slight reduction in size
		} else {
			this.isActive = false;
		}
	}

	draw(ctx) {
		if (this.lifespan > 0) {
			let colorIndex = Math.floor((this.colors.length * this.lifespan) / 50);
			let color = this.colors[colorIndex] || this.colors[this.colors.length - 1];
			ctx.globalAlpha = this.opacity; // Apply opacity
			ctx.fillStyle = color;
			ctx.beginPath();
			ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
			ctx.fill();
			ctx.globalAlpha = 1; // Reset globalAlpha
		}
	}
}

class SmokeParticle {
	constructor() {
		this.reset();
	}

	reset(x = 0, y = 0) {
		this.x = x;
		this.y = y;
		this.size = Math.random() * 5 + 1; // Initial size variability for more natural appearance
		// Modify the speed for a more realistic, variable ascent
		this.speedX = Math.random() * 0.4 - 0.2; // Slight horizontal drift
		this.speedY = -(Math.random() * 0.5 + 0.5); // Increased upward speed with randomness
		// Using a darker gray from the NES palette for realistic smoke color
		this.color = '#7c7c7c'; // NES dark gray
		this.lifespan = 120; // Slightly longer lifespan to allow fuller visualization
		this.active = true;
	}

	update() {
		if (!this.active) return;

		// Update positions based on speed
		this.x += this.speedX;
		this.y += this.speedY;
		// Gradually increase size to simulate smoke expansion
		this.size += 0.05;
		// Reduce lifespan each frame
		this.lifespan -= 1.5;
		// Check for deactivation conditions
		if (this.lifespan <= 0 || this.size > 10) {
			this.active = false; // Deactivate if the particle becomes too large or too faint
		}
	}

	draw(ctx) {
		if (!this.active) return;

		// Apply fading effect based on lifespan
		ctx.globalAlpha = this.lifespan / 120; // Normalize alpha to the extended lifespan
		ctx.fillStyle = this.color;
		ctx.beginPath();
		ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
		ctx.fill();
		ctx.globalAlpha = 1; // Reset alpha after drawing
	}
}

class Particle {
	constructor(x, y, color) {
		this.x = x;
		this.y = y;
		this.size = Math.random() * 2.5 + 1.4; // Larger particles for a more dramatic effect
		this.speedX = (Math.random() - 0.5) * 6; // Increased spread
		this.speedY = (Math.random() - 0.5) * 6; // Increased spread
		this.color = color || this.getRandomColor(); // Use the provided color or default random color
		this.lifespan = 150; // Extended lifespan for a lasting effect
		this.isActive = true; // Particle is initially active
	}

	update() {
		this.lifespan -= 2;
		if (this.lifespan > 0) {
			this.x += this.speedX;
			this.y += this.speedY;
			this.size *= 0.99; // Slow reduction in size to linger longer
		} else {
			this.isActive = false; // Deactivate particle
		}
	}

	draw(ctx) {
		if (this.lifespan > 0) {
			ctx.fillStyle = this.color;
			ctx.beginPath();
			ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	getRandomColor() {
		const colors = [
			'#ff0000', // Bright red for blood
			'#800000', // Dark red for deeper blood
			'#ff6347', // Tomato red for variation
			'#b22222', // Firebrick red for more blood tones
			'#a52a2a' // Brown for a "guts" effect
		];
		return colors[Math.floor(Math.random() * colors.length)];
	}
}

class Explosion {
	constructor(x, y, color, size) {
		this.x = x;
		this.y = y;
		this.color = color;
		this.size = size;
		this.maxSize = size + 20; // Maximum size before the explosion disappears
		this.isActive = true; // Explosion is initially active
	}

	update() {
		this.size += 2; // Grow the explosion size
		if (this.size >= this.maxSize) {
			this.isActive = false; // Deactivate the explosion
		}
	}

	draw(ctx) {
		if (!this.isActive) return;
		ctx.fillStyle = this.color;
		ctx.beginPath();
		ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
		ctx.fill();
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
				// console.warn("Particle pool reached maximum size.");
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

class DroppingCrate {
	constructor() {
		this.x = Math.random() * canvas.width;
		this.y = -61;
		this.width = 65.33;
		this.height = 56;
		this.speed = 0.5;
		this.spriteImage = new Image();
		this.spriteImage.src = 'assets/images/game/game_mechanics_sprite.png';
		this.frameX = 0;
		this.swayAngle = Math.random() * Math.PI * 2;
		this.swaySpeed = 0.05;
		this.swayAmplitude = 10;
		this.loaded = false;

		this.spriteImage.onload = () => {
			this.loaded = true;
		};
		this.spriteImage.onerror = (error) => {
			console.error('Failed to load DroppingCrate image', error);
		};
	}

	update() {
		this.y += this.speed;
		this.swayAngle += this.swaySpeed;
		this.x += Math.sin(this.swayAngle) * this.swayAmplitude * 0.1;
		if (this.y > canvas.height) {
			const index = comets.indexOf(this);
			if (index !== -1) comets.splice(index, 1);
		}
	}

	draw(ctx) {
		if (this.loaded) {
			ctx.drawImage(
				this.spriteImage,
				this.frameX * this.width,
				0,
				this.width,
				this.height,
				this.x,
				this.y,
				this.width,
				this.height
			);
		} else {
			console.warn('DroppingCrate image not loaded, cannot draw');
		}
	}
}

class ExtraLife {
	constructor() {
		this.x = Math.random() * canvas.width;
		this.y = 0;
		this.width = 65.33;
		this.height = 56;
		this.speed = 1.5;
		this.spriteImage = new Image();
		this.spriteImage.src = 'assets/images/game/game_mechanics_sprite.png';
		this.frameX = 1;
		this.loaded = false;

		this.spriteImage.onload = () => {
			this.loaded = true;
		};
		this.spriteImage.onerror = (error) => {
			console.error('Failed to load ExtraLife image', error);
		};
	}

	update() {
		this.y += this.speed;
		if (this.y > canvas.height) {
			const index = extraLives.indexOf(this);
			extraLives.splice(index, 1);
		}
	}

	draw(ctx) {
		if (this.loaded) {
			ctx.drawImage(
				this.spriteImage,
				this.frameX * this.width,
				0,
				this.width,
				this.height,
				this.x,
				this.y,
				this.width,
				this.height
			);
		} else {
			console.warn('ExtraLife image not loaded, cannot draw');
		}
	}
}

class PowerUp {
	constructor(type, x, y) {
		this.type = type;
		this.x = x;
		this.y = y;
		this.width = 65.333; // Correct width per frame
		this.height = 56; // Correct height of the sprite
		this.speed = 1;
		this.spriteImage = new Image();
		this.spriteImage.src = 'assets/images/game/game_mechanics_sprite.png';
		this.frameX = 2; // Frame 3 (PowerUp)
		this.loaded = false;

		// Ensure image is loaded before drawing
		this.spriteImage.onload = () => {
			this.loaded = true;
		};
		this.spriteImage.onerror = (error) => {
			console.error('Failed to load PowerUp image', error);
		};

		// Add the shield effect
		this.effect = new ShieldEffect(this.x, this.y, this.width, this.height);
	}

	update() {
		this.y += this.speed;
		if (this.y > canvas.height) {
			const index = powerUps.indexOf(this);
			powerUps.splice(index, 1);
		}

		// Update the shield effect
		this.effect.update();
	}

	draw(ctx) {
		if (this.loaded) {
			// Draw shield effect
			this.effect.draw(ctx);

			ctx.drawImage(
				this.spriteImage,
				this.frameX * this.width,
				0,
				this.width,
				this.height,
				this.x,
				this.y,
				this.width,
				this.height
			);
		} else {
			console.warn('PowerUp image not loaded, cannot draw');
		}
	}
}

class ShieldEffect {
	constructor(x, y, width, height) {
		this.x = x + width / 2;
		this.y = y + height / 2;
		this.radius = Math.max(width, height) / 2;
		this.glowOpacity = 0.5;
		this.glowDirection = 0.02;
		this.sparkles = [];
		this.sparkleCount = 8;
		this.sparkleRadius = 3;
		this.sparkleSpeed = 0.05;
		for (let i = 0; i < this.sparkleCount; i++) {
			let angle = (i * (2 * Math.PI)) / this.sparkleCount;
			this.sparkles.push({ angle: angle });
		}
	}

	update() {
		this.glowOpacity += this.glowDirection;
		if (this.glowOpacity >= 1 || this.glowOpacity <= 0.5) {
			this.glowDirection = -this.glowDirection;
		}
		this.sparkles.forEach((sparkle) => {
			sparkle.angle += this.sparkleSpeed;
		});
	}

	draw(ctx) {
		ctx.save();

		// Draw pulsating glow
		ctx.globalAlpha = this.glowOpacity;
		ctx.fillStyle = '#f8d878'; // Gold color for the glow
		ctx.beginPath();
		ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
		ctx.fill();

		// Draw rotating sparkles
		ctx.globalAlpha = 1;
		ctx.fillStyle = '#fcfcfc'; // White color for sparkles
		this.sparkles.forEach((sparkle) => {
			let sparkleX = this.x + this.radius * Math.cos(sparkle.angle);
			let sparkleY = this.y + this.radius * Math.sin(sparkle.angle);
			ctx.beginPath();
			ctx.arc(sparkleX, sparkleY, this.sparkleRadius, 0, Math.PI * 2);
			ctx.fill();
		});

		ctx.restore();
	}
}

class Projectile {
	constructor(x, y, speedY, color = '#FFFFFF') {
		this.x = x;
		this.y = y;
		this.radius = 5;
		this.speedY = speedY;
		this.color = color;
		this.isActive = true;
		this.lifeSpan = 100;
	}

	update() {
		this.radius *= 0.95;
		this.lifeSpan--;
		if (this.lifeSpan <= 0) {
			this.isActive = false;
		}
		this.y += this.speedY;
	}

	draw(ctx) {
		if (!this.isActive) return;
		if (!ctx) {
			console.error('Canvas context is not available.');
			return;
		}

		ctx.save();
		ctx.fillStyle = this.color;
		ctx.shadowBlur = 20;
		ctx.shadowColor = '#e45c10';
		ctx.beginPath();
		ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}
}

class FloatingText {
	constructor(x, y, text, color = '#F63800', shadowColor = '#FCFCFC', duration = 60) {
		this.x = x;
		this.y = y;
		this.text = text;
		this.color = color;
		this.shadowColor = shadowColor;
		this.duration = duration;
		this.opacity = 1;
		this.blinkRate = 10;
	}

	update() {
		this.y -= 0.5;
		this.opacity -= 1 / this.duration;
		this.duration -= 1;
	}

	draw(ctx) {
		if (this.duration > 0) {
			ctx.save();
			ctx.font = '16px "Press Start 2P", cursive';

			ctx.fillStyle = this.shadowColor;
			ctx.globalAlpha = this.opacity;
			ctx.fillText(this.text, this.x + 2, this.y + 2);

			if (Math.floor(Date.now() / this.blinkRate) % 2 === 0) {
				ctx.fillStyle = this.color;
				ctx.fillText(this.text, this.x, this.y);
			}

			ctx.restore();
		}
	}
}

// Helper Functions

// Function to assert conditions
function assert(condition, message) {
	if (!condition) {
		console.error('Assertion failed: ', message);
	}
}

function preloadAssets(assetURLs) {
	return new Promise((resolve, reject) => {
		let loadedAssets = 0;
		const totalAssets = assetURLs.length;
		assetURLs.forEach((url) => {
			const img = new Image();
			img.src = url;
			img.onload = () => {
				loadedAssets++;
				if (loadedAssets === totalAssets) {
					resolve();
				}
			};
			img.onerror = (error) => {
				reject(error);
			};
		});
	});
}

function drawParticle(particle) {
	if (!particle.active) return;

	ctx.save();
	ctx.globalAlpha = particle.lifespan / 100; // Adjust opacity based on lifespan
	ctx.fillStyle = particle.color;
	ctx.beginPath();
	ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
}

function createExplosion(x, y, color = 'red', size = 30) {
	let explosion = {
		x: x,
		y: y,
		radius: 1,
		maxRadius: size,
		color: color,
		isActive: true,
		update: function () {
			if (this.radius < this.maxRadius) {
				this.radius += 1;
			} else {
				this.isActive = false;
			}
		},
		draw: function () {
			if (this.isActive) {
				ctx.fillStyle = this.color;
				ctx.beginPath();
				ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
				ctx.fill();
			}
		}
	};
	explosions.push(explosion);
}

function createGoldExplosion(x, y, width, height) {
	const centerX = x + width / 2;
	const centerY = y + height / 2;
	const goldExplosionColors = ['#FFD700', '#FFC700', '#FFB700'];
	for (let i = 0; i < 30; i++) {
		const color = goldExplosionColors[Math.floor(Math.random() * goldExplosionColors.length)];
		particles.push(new Particle(centerX, centerY, color));
	}
	createExplosion(centerX, centerY, goldExplosionColors[0], 30);
}

function handlePlayerHit(source = null, enemy = null) {
	if (!player.isInvincible && lives > 0) {
		// Add a console log to indicate when Vela is hit by CityEnemy fire or collision
		if (enemy instanceof CityEnemy) {
			if (source === 'fire') {
				console.log('Vela was hit by CityEnemy fire.');
			} else if (source === 'collision') {
				console.log('Vela was hit by CityEnemy collision.');
			}
		}

		lives--;
		drawHUD();
		shakeScreen(300, 5);
		triggerRedFlash(); // Trigger the red flash effect
		for (let i = 0; i < 15; i++) {
			particles.push(new Particle(player.x + player.width / 2, player.y + player.height / 2));
		}

		if (lives <= 0) {
			player.isExploding = true;
			// No need for additional setTimeout here, handled in player.update
		}
	}
}

function scheduleRandomAmmoDrop() {
	setTimeout(() => {
		console.log('Scheduled random ammo drop at:', new Date().toLocaleTimeString());
		if (heatseekerAmmo.length < 1) {
			dropAmmoFromSky();
		}
		scheduleRandomAmmoDrop();
	}, ammoDropInterval);
}

function scheduleRandomExtraLifeDrop() {
	setTimeout(() => {
		console.log('Scheduled random extra life drop at:', new Date().toLocaleTimeString());
		if (extraLives.length < 1) {
			dropExtraLife();
		}
		scheduleRandomExtraLifeDrop();
	}, powerUpDropInterval);
}

function schedulePowerUpDrops() {
	setTimeout(() => {
		console.log('Scheduled power-up drop at:', new Date().toLocaleTimeString());
		if (powerUps.length < 1) {
			dropRandomPowerUp();
		}
		schedulePowerUpDrops();
	}, powerUpDropInterval);
}

function dropAmmoFromSky() {
	console.log('dropAmmoFromSky called at:', new Date().toLocaleTimeString());
	if (heatseekerAmmo.length < 1) {
		const minX = 100;
		const maxX = canvas.width - 100;
		const ammo = new DroppingCrate();
		ammo.x = Math.random() * (maxX - minX) + minX;
		heatseekerAmmo.push(ammo);
		console.log('Dropped Heatseeker Ammo at position:', ammo.x, ammo.y);
	} else {
		console.log('Heatseeker ammo not dropped, current count:', heatseekerAmmo.length);
	}
}

function dropExtraLife() {
	console.log('dropExtraLife called at:', new Date().toLocaleTimeString());
	if (extraLives.length < 1) {
		const minX = 100;
		const maxX = canvas.width - 100;
		const extraLife = new ExtraLife();
		extraLife.x = Math.random() * (maxX - minX) + minX;
		extraLives.push(extraLife);
		console.log('Dropped Extra Life at position:', extraLife.x, extraLife.y);
	} else {
		console.log('Extra life not dropped, current count:', extraLives.length);
	}
}

function dropRandomPowerUp() {
	console.log('dropRandomPowerUp called at:', new Date().toLocaleTimeString());
	if (powerUps.length < 1) {
		const minX = 100;
		const maxX = canvas.width - 100;
		const types = ['invincibility', 'speedBoost', 'unlimitedHeatseekers', 'rapidFire'];
		const type = types[Math.floor(Math.random() * types.length)];
		const powerUp = new PowerUp(type, Math.random() * (maxX - minX) + minX, -50);
		powerUps.push(powerUp);
		console.log('Dropped PowerUp:', type, 'at position:', powerUp.x, powerUp.y);
	} else {
		console.log('Power-up not dropped, current count:', powerUps.length);
	}
}

function handleExplosions() {
	for (let i = explosions.length - 1; i >= 0; i--) {
		explosions[i].update();
		explosions[i].draw(ctx);
		if (!explosions[i].isActive) {
			explosions.splice(i, 1);
		}
	}
}

function triggerRedFlash() {
	flashEffectActive = true;
	flashColor = 'rgba(255, 0, 0, 0.5)'; // Red color with transparency
	setTimeout(() => {
		flashEffectActive = false;
	}, 200); // Flash duration in milliseconds
}

function activatePowerUp(type) {
	powerUpActive = true;
	powerUpType = type;
	powerUpStartTime = Date.now();

	switch (type) {
		case 'invincibility':
			player.isInvincible = true;
			break;
		case 'speedBoost':
			player.speed = 8; // Double the default speed
			break;
		case 'unlimitedHeatseekers':
			unlimitedHeatseekersMode = true;
			break;
		case 'rapidFire':
			rapidFireMode = true;
			break;
	}

	activateGlowEffect(); // Ensure this function is called
	floatingTexts.push(new FloatingText(player.x, player.y, `+${type.toUpperCase()}`, '#00FF00'));
}

function activateAllPowerUps() {
	activatePowerUp('invincibility');
	activatePowerUp('speedBoost');
	activatePowerUp('unlimitedHeatseekers');
	activatePowerUp('rapidFire');
	activateGlowEffect(); // Ensure glow effect is activated
}

function deactivateAllPowerUps() {
	player.isInvincible = false;
	player.speed = 4; // Reset to default speed
	unlimitedHeatseekersMode = false;
	rapidFireMode = false; // Ensure rapid fire mode is reset
	powerUpActive = false;
	player.glowColor = null; // Reset glow effect
}

function activateGlowEffect() {
	const colors = ['#ff6347', '#FFD700', '#FF4500', '#00FFFF', '#9400D3']; // Example colors
	let currentColorIndex = 0;

	function changeColor() {
		player.glowColor = colors[currentColorIndex];
		currentColorIndex = (currentColorIndex + 1) % colors.length;
	}

	changeColor();
	const colorChangeInterval = setInterval(() => {
		if (!powerUpActive && !constantPowerUpMode) {
			clearInterval(colorChangeInterval);
			player.glowColor = null;
		} else {
			changeColor();
		}
	}, 250);
}

function drawPowerUpBar() {
	if (!powerUpActive) return;
	const currentTime = Date.now();
	const elapsedTime = currentTime - powerUpStartTime;
	const remainingTime = powerUpDuration - elapsedTime;
	const barWidth = 200;
	const barHeight = 20;
	const x = (canvas.width - barWidth) / 2;
	const y = 40;

	if (remainingTime <= 0) {
		powerUpActive = false;
	}

	const fillWidth = (barWidth * remainingTime) / powerUpDuration;
	ctx.fillStyle = '#7c7c7c'; // NES gray
	ctx.fillRect(x, y, barWidth, barHeight);

	let fillColor;
	switch (powerUpType) {
		case 'invincibility':
			fillColor = '#f878f8'; // NES pink
			break;
		case 'speedBoost':
			fillColor = '#f8b800'; // NES yellow
			break;
		case 'unlimitedHeatseekers':
			fillColor = '#3cbcfc'; // NES blue
			break;
		case 'rapidFire':
			fillColor = '#f83800'; // NES red
			break;
		default:
			fillColor = '#fcfcfc'; // NES white
	}

	ctx.fillStyle = fillColor;
	ctx.fillRect(x, y, fillWidth, barHeight);
	ctx.strokeStyle = '#0000fc'; // NES blue
	ctx.lineWidth = 2;
	ctx.strokeRect(x, y, barWidth, barHeight);
	ctx.fillStyle = '#fcfcfc'; // NES white
	ctx.font = "16px 'Press Start 2P', cursive";
	ctx.fillText(powerUpType.toUpperCase(), x + 10, y + 15);
}

function checkPowerUpCollisions() {
	powerUps.forEach((powerUp, index) => {
		if (checkCollision(player, powerUp)) {
			activatePowerUp(powerUp.type);
			powerUps.splice(index, 1);
			floatingTexts.push(
				new FloatingText(powerUp.x, powerUp.y, `+${powerUp.type.toUpperCase()}`, '#00FF00')
			);
			createGoldExplosion(powerUp.x, powerUp.y, powerUp.width, powerUp.height);
			drawHUD();
		} else {
			projectiles.forEach((projectile, pIndex) => {
				if (checkCollision(projectile, powerUp)) {
					activatePowerUp(powerUp.type);
					powerUps.splice(index, 1);
					projectiles.splice(pIndex, 1);
					floatingTexts.push(
						new FloatingText(powerUp.x, powerUp.y, `+${powerUp.type.toUpperCase()}`, '#00FF00')
					);
					createGoldExplosion(powerUp.x, powerUp.y, powerUp.width, powerUp.height);
					drawHUD();
				}
			});
		}
	});
}

function checkCollisions() {
	projectiles.forEach((projectile, pIndex) => {
		heatseekerAmmo.forEach((ammo, aIndex) => {
			if (checkCollision(projectile, ammo)) {
				heatseekerCount = Math.min(heatseekerCount + 10, heatseekerAmmoMax); // Add 10 heatseekers
				heatseekerAmmo.splice(aIndex, 1);
				projectiles.splice(pIndex, 1);
				floatingTexts.push(new FloatingText(ammo.x, ammo.y, 'Heatseekers! +10'));
				createGoldExplosion(ammo.x, ammo.y, ammo.width, ammo.height);
				drawHUD();
			}
		});

		extraLives.forEach((life, lIndex) => {
			if (checkCollision(projectile, life)) {
				lives = Math.min(lives + 1, 3); // Adjusted max lives for balance
				extraLives.splice(lIndex, 1);
				projectiles.splice(pIndex, 1);
				floatingTexts.push(
					new FloatingText(life.x, life.y, '1 UP!') // Uses new default colors
				);
				createGoldExplosion(life.x, life.y, life.width, life.height);
				drawHUD();
			}
		});

		comets.forEach((comet, cIndex) => {
			if (comet instanceof DroppingCrate && checkCollision(projectile, comet)) {
				heatseekerCount = Math.min(heatseekerCount + 10, heatseekerAmmoMax); // Corrected to add 10 heatseekers
				comets.splice(cIndex, 1);
				projectiles.splice(pIndex, 1);
				floatingTexts.push(
					new FloatingText(comet.x, comet.y, 'Heatseekers! +10') // Corrected text to show +10
				);
				createGoldExplosion(comet.x, comet.y, comet.width, comet.height);
				drawHUD();
			}
		});
	});

	heatseekerAmmo.forEach((ammo, aIndex) => {
		if (checkCollision(player, ammo)) {
			// Player collision check
			heatseekerCount = Math.min(heatseekerCount + 10, heatseekerAmmoMax); // Add 10 heatseekers
			heatseekerAmmo.splice(aIndex, 1);
			floatingTexts.push(new FloatingText(ammo.x, ammo.y, 'Heatseekers! +10'));
			createGoldExplosion(ammo.x, ammo.y, ammo.width, ammo.height);
			drawHUD();
		}
	});

	extraLives.forEach((life, lIndex) => {
		if (checkCollision(player, life)) {
			lives = Math.min(lives + 1, 3); // Adjusted max lives for balance
			extraLives.splice(lIndex, 1);
			floatingTexts.push(
				new FloatingText(life.x, life.y, '1 UP!') // Uses new default colors
			);
			createGoldExplosion(life.x, life.y, life.width, life.height);
			drawHUD();
		}
	});

	comets.forEach((comet, cIndex) => {
		if (comet instanceof DroppingCrate && checkCollision(player, comet)) {
			heatseekerCount = Math.min(heatseekerCount + 10, heatseekerAmmoMax); // Corrected to add 10 heatseekers
			comets.splice(cIndex, 1);
			floatingTexts.push(
				new FloatingText(comet.x, comet.y, 'Heatseekers! +10') // Corrected text to show +10
			);
			createGoldExplosion(comet.x, comet.y, comet.width, comet.height);
			drawHUD();
		}
	});

	checkPowerUpCollisions(); // Ensure this is called to handle power-up collisions
}

function initializeClouds() {
	for (let i = 0; i < 5; i++) {
		clouds.push(new Cloud());
	}
}

function checkAssetLoading() {
	const assetsLoaded = [
		gameMechanicsSprite.complete,
		player.spriteImage.complete,
		...assetURLs.map((url) => {
			const img = new Image();
			img.src = url;
			return img.complete;
		})
	];
	assert(
		assetsLoaded.every((loaded) => loaded),
		'All assets should be loaded'
	);
}

function handleDroppingItems() {
	if (
		Math.random() < 0.01 &&
		!comets.some((comet) => comet instanceof DroppingCrate) &&
		heatseekerCount <= 1
	) {
		comets.push(new DroppingCrate());
	}

	heatseekerAmmo.forEach((ammo, index) => {
		ammo.update();
		ammo.draw(ctx);
		if (ammo.y > canvas.height) {
			heatseekerAmmo.splice(index, 1);
		}
	});

	extraLives.forEach((life, index) => {
		life.update();
		life.draw(ctx);
		if (life.y > canvas.height) {
			extraLives.splice(index, 1);
		}
	});

	powerUps.forEach((powerUp, index) => {
		powerUp.update();
		powerUp.draw(ctx);
		if (powerUp.y > canvas.height) {
			powerUps.splice(index, 1);
		}
	});

	if (heatseekerAmmo.length === 0) {
		dropAmmoFromSky();
	}

	if (extraLives.length < 1) {
		dropExtraLife();
	} else if (powerUps.length < 1) {
		dropRandomPowerUp();
	}
}

function adjustDifficulty() {
	if (score >= difficultyIncreaseScore) {
		gameSpeed += 0.05; // Smoother increase
		difficultyIncreaseScore += 500;
		maxEnemies = Math.min(maxEnemies + 1, 10); // Gradually increase max enemies up to 10
		enemyInterval = Math.max(enemyInterval - 10, 60); // Decrease spawn interval to a minimum value
		enemies.forEach((enemy) => {
			enemy.speed = Math.min(enemy.speed + 0.05, 1); // Gradually increase enemy speed
		});
	}
}

function dropPowerUps() {
	const powerUpDropRate = score < 1000 ? 0.02 : 0.01; // Higher drop rate for beginners
	if (Math.random() < powerUpDropRate && !comets.some((comet) => comet instanceof DroppingCrate)) {
		const powerUpTypes = [DroppingCrate, PowerUp];
		const PowerUpClass = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
		comets.push(new PowerUpClass());
	}
}

function handleHeatseekers() {
	projectiles.forEach((projectile) => {
		if (projectile.isHeatseeker) {
			projectile.update(enemies); // Pass the enemies array
			projectile.draw(ctx);
		}
	});
}

projectiles.forEach((projectile, index) => {
	if (projectile.update) {
		projectile.update(enemies);
		projectile.draw(ctx);
		if (!projectile.isActive || projectile.y > canvas.height) {
			console.log('Removing inactive projectile:', index);
			projectiles.splice(index, 1);
		}
	} else {
		console.error(`Projectile at index ${index} does not have an update method.`);
	}
});

function createProjectile(x, y) {
	sounds.shoot.play();
	return new AnimatedProjectile(x, y, false, false); // Example creation of a projectile
}

function shoot(isHeatseeker = false, isPowerUp = false) {
	const currentTime = Date.now();
	const currentCooldown = rapidFireMode ? velaShootingCooldown / 2 : velaShootingCooldown;

	if (currentTime - lastVelaShotTime < currentCooldown) {
		return; // Exit function if cooldown period has not passed
	}

	const projectileX = player.x + player.width / 2;
	const projectileY = player.y;

	if (isHeatseeker && (unlimitedHeatseekersMode || heatseekerCount > 0)) {
		projectiles.push(new HeatseekerProjectile(projectileX, projectileY));
		console.log('Heatseeker created:', projectileX, projectileY);
		if (!unlimitedHeatseekersMode) {
			heatseekerCount--; // Only decrement if not in unlimited heatseekers mode
		}
	} else if (isPowerUp) {
		projectiles.push(new AnimatedProjectile(projectileX, projectileY, false, false, true));
	} else {
		projectiles.push(new AnimatedProjectile(projectileX, projectileY, false, false));
	}

	drawHUD(); // Ensure HUD is updated after shooting

	lastVelaShotTime = currentTime; // Update last shot time to current time
}

function shakeScreen(duration, magnitude) {
	const originalX = parseInt(canvas.style.left, 10) || 0;
	const originalY = parseInt(canvas.style.top, 10) || 0;

	const shake = () => {
		const elapsedTime = Date.now() - startTime;
		if (elapsedTime < duration) {
			const x = (Math.random() - 0.5) * magnitude * 1.5;
			const y = (Math.random() - 0.5) * magnitude * 1.5;
			canvas.style.left = `${originalX + x}px`;
			canvas.style.top = `${originalY + y}px`;
			requestAnimationFrame(shake);
		} else {
			canvas.style.left = `${originalX}px`;
			canvas.style.top = `${originalY}px`;
		}
	};
	const startTime = Date.now();
	shake();
}

function flashScreen(color, duration) {
	flashColor = color;
	flashEffectActive = true;
	setTimeout(() => {
		flashEffectActive = false;
	}, duration);
}

function drawHUD() {
	if (!gameActive) return; // Do not draw HUD if the game is not active
	ctx.clearRect(0, 0, canvas.width, 30);
	ctx.fillStyle = '#6886FA';
	ctx.fillRect(0, 0, canvas.width, 30);
	ctx.font = "16px 'Press Start 2P', cursive";
	ctx.fillStyle = '#FADEA6';
	ctx.fillText(`Score:${score}`, 18, 20);
	ctx.fillText(`Lives:${lives}`, canvas.width - 190, 20);

	if (unlimitedHeatseekersMode) {
		ctx.fillText(`Heatseekers:Unlimited`, 220, 20);
	} else {
		ctx.fillText(`Heatseekers:${heatseekerCount}`, 260, 20);
	}

	drawPowerUpBar(); // Ensure PowerUp bar is drawn
}

function checkCollision(rect1, rect2, padding = 22) {
	if (
		(rect1 instanceof CityEnemy && !rect1.isReady) ||
		(rect2 instanceof CityEnemy && !rect2.isReady)
	) {
		return false; // Skip collision check if CityEnemy is not ready
	}
	return (
		rect1.x + padding < rect2.x + rect2.width &&
		rect1.x + rect1.width - padding > rect2.x &&
		rect1.y + padding < rect2.y + rect2.height &&
		rect1.y + rect1.height - padding > rect2.y
	);
}

function interpolateColor(color1, color2, factor) {
	let result = '#';
	for (let i = 1; i <= 5; i += 2) {
		let hex1 = parseInt(color1.substr(i, 2), 16);
		let hex2 = parseInt(color2.substr(i, 2), 16);
		let interp = Math.round(hex1 + (hex2 - hex1) * factor).toString(16);
		result += ('00' + interp).slice(-2);
	}
	return result;
}

function drawDynamicGradientSky() {
	let gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
	// Add flash effect if skyFlashActive is true
	if (skyFlashActive) {
		gradient.addColorStop(0, '#ffffff'); // Bright white for the flash effect
		gradient.addColorStop(1, '#f8d878'); // Blend to a lighter color indicative of an explosion's glow
	}
	// Determine sky color based on the time of day
	else if (dayNightCycle < 90) {
		// Night to sunrise
		// Interpolate between nightSky and sunrise colors
		let progress = dayNightCycle / 90;
		gradient.addColorStop(0, interpolateColor(NESPalette.nightSky, NESPalette.sunrise, progress));
		gradient.addColorStop(1, NESPalette.duskDawn);
	} else if (dayNightCycle < 180) {
		// Sunrise to day
		// Interpolate between sunrise and daySky colors
		let progress = (dayNightCycle - 90) / 90;
		gradient.addColorStop(0, interpolateColor(NESPalette.sunrise, NESPalette.daySky, progress));
		gradient.addColorStop(1, NESPalette.daySky);
	} else if (dayNightCycle < 270) {
		// Day to sunset
		// Interpolate between daySky and sunset colors
		let progress = (dayNightCycle - 180) / 90;
		gradient.addColorStop(0, interpolateColor(NESPalette.daySky, NESPalette.sunset, progress));
		gradient.addColorStop(1, NESPalette.sunset);
	} else {
		// Sunset to night
		// Interpolate between sunset and nightSky colors
		let progress = (dayNightCycle - 270) / 90;
		gradient.addColorStop(0, interpolateColor(NESPalette.sunset, NESPalette.nightSky, progress));
		gradient.addColorStop(1, NESPalette.duskDawn);
	}

	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function initializeStars() {
	for (let i = 0; i < numberOfStars; i++) {
		stars.push(new Star());
	}
	console.log('Stars initialized:', stars.length); // Debug log
}

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

function drawGameOverScreen() {
	gameOverScreen = true;
	ctx.fillStyle = '#000000';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = '#E20058';
	ctx.font = "28px 'Press Start 2P', cursive";
	ctx.fillText('GAME OVER', canvas.width / 2 - 140, canvas.height / 2);
	ctx.font = "20px 'Press Start 2P', cursive";
	ctx.fillText(`Score: ${score}`, canvas.width / 2 - 70, canvas.height / 2 + 40);
	highScore = Math.max(score, highScore);
	ctx.fillText(`High Score: ${highScore}`, canvas.width / 2 - 100, canvas.height / 2 + 80);
	ctx.font = "16px 'Press Start 2P', cursive";
	ctx.fillText('Press Enter to restart', canvas.width / 2 - 155, canvas.height / 2 + 120);
}

function resetGame() {
	score = 0;
	comboCounter = 0;
	lives = 3;
	enemies = [];
	enemyProjectiles = [];
	projectiles = [];
	explosions = [];
	comets = [];
	shootingStars = [];
	gameFrame = 0;
	gameSpeed = 1;
	titleScreen = false;
	gameActive = true;
	isPaused = false;
	difficultyIncreaseScore = 500;
	enemyInterval = initialEnemySpawnRate;
	ammoDropCounter = 0;
	heatseekerAmmo = [];
	heatseekerCount = 3;
	cityFires = [];
	skyFlashActive = false;
	skyFlashTimer = 0;
	smokeParticles = [];
	smokeParticlePool = new ParticlePool(100);
	stars = []; // Clear the stars array
	initializeStars(); // Re-initialize the stars
	spaceship = new Spaceship();
	spaceships = [];
	clouds = [];
	flashEffectActive = false;
	flashColor = 'rgba(255, 0, 0, 0.5)';
	particles = [];
	gameOverScreen = false;
	allowAmmoDrop = true;
	floatingTexts = [];
	obstacles = [];
	extraLives = [];
	dayNightCycle = 180;
	canShoot = true;
	powerUps = [];
	powerUpActive = false;
	powerUpType = '';
	powerUpStartTime = 0;

	player.x = canvas.width / 2 - player.width / 2;
	player.y = canvas.height - player.height - 5;
	player.movingLeft = false;
	player.movingRight = false;
	player.isExploding = false;
	player.explosionFrame = 0;
	player.frameX = 0;
	player.frameY = 0;
	player.currentFrame = 0;
	player.sequenceIndex = 0;
	player.frameTimer = 0;

	initializeCityFires();
	initializeClouds();
	drawHUD();
	requestAnimationFrame(animate);
}

function handleFloatingTexts() {
	floatingTexts.forEach((text, index) => {
		text.update();
		text.draw(ctx);
		if (text.duration <= 0) {
			floatingTexts.splice(index, 1);
		}
	});
}

// Game Classes

// Other class definitions...

class Enemy {
	constructor() {
		this.x = Math.random() * (canvas.width - 65);
		this.y = -65;
		this.width = 65;
		this.height = 65;
		this.speed = Math.random() * 0.2 + 0.15;
		this.shootingInterval = 150; // Increase interval to reduce shooting frequency
		this.lastShotFrame = 0;
		this.descentSpeed = 1.0;
		this.curveAmplitude = Math.random() * 3 + 1;
		this.curveFrequency = Math.random() * 0.02 + 0.01;
		this.verticalBobFrequency = Math.random() * 0.02 + 0.005;
		this.verticalBobHeight = Math.random() * 5 + 2;
		this.frameX = 0;
		this.maxFrames = 2;
		this.spriteWidth = 65;
		this.spriteHeight = 65;
		this.flapSpeed = Math.floor(Math.random() * 10 + 1);
		this.patternIndex = Math.floor(Math.random() * 4);
		this.spriteImage = new Image();
		this.spriteImage.src = 'assets/images/game/void_swarm_sprite.png';
		this.targetX = player.x;
		this.diveSpeed = Math.random() * 1.5 + 1.5;
		this.isAggressive = false;
		this.hitsTaken = 0;
		this.isExploding = false;
		this.explosionFrame = 0;
		this.fireParticles = [];
		this.toBeRemoved = false;
		this.numberOfExplosionFrames = 3;
	}

	update() {
		// Movement patterns (sine wave, cosine wave, vertical bobbing, diving)
		switch (this.patternIndex) {
			case 0: // Sine wave
				this.y += this.speed;
				this.x += Math.sin(gameFrame * this.curveFrequency) * this.curveAmplitude;
				break;
			case 1: // Cosine wave
				this.y += this.speed;
				this.x += Math.cos(gameFrame * this.curveFrequency) * this.curveAmplitude;
				break;
			case 2: // Vertical bobbing
				this.y += this.speed;
				this.y += Math.sin(gameFrame * this.verticalBobFrequency) * this.verticalBobHeight;
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

		projectiles.forEach((projectile, pIndex) => {
			if (checkCollision(this, projectile)) {
				if (projectile.isHeatseeker) {
					// If hit by a heatseeker, trigger explosion and screen shake
					this.isExploding = true;
					this.toBeRemoved = true; // Mark the enemy for removal
					shakeScreen(200, 5); // Trigger screen shake
					// Generate explosion particles
					for (let i = 0; i < 20; i++) {
						particles.push(
							new Particle(this.x + this.width / 2, this.y + this.height / 2, '#ff4757')
						);
					}
				} else {
					// Increment hits taken for non-heatseeker projectiles
					this.hitsTaken++;
					if (this.hitsTaken >= 1) {
						// Make enemy aggressive after 1 hit
						this.isAggressive = true;
					}
					if (this.hitsTaken >= 2) {
						// Assume enemy dies after 2 hits
						this.isExploding = true;
						this.toBeRemoved = true;
					}
				}
				projectiles.splice(pIndex, 1); // Remove the projectile that caused the hit
			}
		});

		if (this.isExploding) {
			this.explosionFrame++;
			if (this.explosionFrame > this.numberOfExplosionFrames) {
				this.toBeRemoved = true; // Mark the enemy for removal after the explosion animation completes
			}

			for (let i = 0; i < 50; i++) {
				// Increase the number of particles
				let color = `rgba(${255 - Math.random() * 128}, ${Math.random() * 100}, 0, 1)`;
				particles.push(new Particle(this.x + this.width / 2, this.y + this.height / 2, color));
			}
			this.toBeRemoved = true;
			shakeScreen(300, 10); // Longer and more intense shake
		}

		// Check if the enemy is in aggressive mode and then generate fire particles
		if (this.isAggressive) {
			for (let i = 0; i < 5; i++) {
				this.fireParticles.push(
					new FireParticle(this.x + this.width / 2, this.y + this.height / 2)
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
		if (Math.random() < (this.isAggressive ? 0.005 : 0.0025)) {
			enemyProjectiles.push(new AnimatedProjectile(this.x + this.width / 2 - 6.5, this.y, true));
		}
	}

	draw(ctx) {
		if (this.isExploding) {
			// Corrected frame indices for explosion animation (frames 7-9 are indices 6-8)
			let explosionFrameIndex = 6 + (this.explosionFrame - 1);
			if (explosionFrameIndex > 8) explosionFrameIndex = 8; // Ensure we do not go out of bounds
			ctx.drawImage(
				this.spriteImage,
				explosionFrameIndex * this.spriteWidth,
				0,
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

class CityEnemy extends Enemy {
	constructor() {
		super();
		this.x = Math.random() * canvas.width;
		this.y = canvas.height;
		this.width = 65;
		this.height = 65;
		this.speed = 0.5;
		this.scale = 0.5;
		this.targetX = Math.random() * canvas.width;
		this.targetY = Math.random() * (canvas.height / 2);
		this.isReady = false;
		this.isAggressive = false;
		this.toBeRemoved = false;
		this.spriteImage = new Image();
		this.spriteImage.src = 'assets/images/game/void_swarm_sprite.png';
		this.frameX = 0;
		this.frameTimer = 0;
		this.frameInterval = 8;
		this.frameCount = 3;
		this.fireParticles = [];
		this.init = false;
		this.hitsTaken = 0;
		this.shootingInterval = 100;
		this.lastShotFrame = 0;
		this.canShoot = false;
		console.log('New CityEnemy created:', this);
	}

	update() {
		if (!this.isReady) {
			this.y -= this.speed;
			if (this.y <= this.targetY) {
				this.isReady = true;
				this.init = true;
			}
		} else {
			if (this.init) {
				let angle = Math.atan2(player.y - this.y, player.x - this.x);
				this.x += Math.cos(angle) * this.speed;
				this.y += Math.sin(angle) * this.speed;
				this.scale = Math.min(1, this.scale + 0.01);

				if (this.scale >= 1) {
					this.canShoot = true;
				}

				if (this.y < 0 || this.x < 0 || this.x > canvas.width || this.y > canvas.height) {
					this.toBeRemoved = true;
					console.log('CityEnemy moved out of bounds and will be removed.');
				}
			}
		}

		if (this.isAggressive) {
			for (let i = 0; i < 5; i++) {
				this.fireParticles.push(new FireParticle(this.x, this.y));
			}
		}

		this.fireParticles.forEach((particle, index) => {
			particle.update();
			if (particle.opacity <= 0) {
				this.fireParticles.splice(index, 1);
			}
		});

		this.frameTimer++;
		if (this.frameTimer >= this.frameInterval) {
			if (this.isAggressive) {
				this.frameX = this.frameX === 3 ? 4 : 3;
			} else {
				this.frameX = this.frameX === 0 ? 1 : 0;
			}
			this.frameTimer = 0;
		}

		if (this.isExploding) {
			this.frameX = this.explosionFrame + 5;
			this.explosionFrame++;
			if (this.explosionFrame > 2) {
				this.toBeRemoved = true;
			}
		}

		if (this.isReady && !this.isExploding && this.canShoot) {
			if (gameFrame - this.lastShotFrame > this.shootingInterval) {
				enemyProjectiles.push(
					new AnimatedProjectile(this.x + this.width / 2, this.y, true, false, this)
				);
				this.lastShotFrame = gameFrame;
			}
		}

		projectiles.forEach((projectile, pIndex) => {
			if (checkCollision(this, projectile)) {
				if (projectile.isHeatseeker) {
					this.isExploding = true;
					this.toBeRemoved = true;
					shakeScreen(200, 5);
					for (let i = 0; i < 20; i++) {
						particles.push(
							new Particle(this.x + this.width / 2, this.y + this.height / 2, '#ff4757')
						);
					}
				} else {
					this.hitsTaken++;
					if (this.hitsTaken >= 1) {
						this.isAggressive = true;
					}
					if (this.hitsTaken >= 2) {
						this.isExploding = true;
						this.toBeRemoved = true;
					}
				}
				projectiles.splice(pIndex, 1);
			}
		});

		if (this.isAggressive) {
			this.speed += 0.1;
			this.diveSpeed += 0.2;
			this.curveAmplitude += 0.5;
			this.curveFrequency += 0.005;
		}
	}

	draw(ctx) {
		ctx.save();
		ctx.translate(this.x, this.y);
		if (!this.isReady) {
			ctx.scale(1, -1);
		}
		ctx.scale(this.scale, this.scale);
		ctx.drawImage(
			this.spriteImage,
			this.frameX * this.width,
			0,
			this.width,
			this.height,
			-this.width / 2,
			-this.height / 2,
			this.width,
			this.height
		);
		ctx.restore();

		this.fireParticles.forEach((particle) => {
			particle.draw(ctx);
		});
	}

	hit() {
		this.hitsTaken++;
		if (this.hitsTaken === 1) {
			this.isAggressive = true;
		} else if (this.hitsTaken > 1) {
			this.isExploding = true;
			this.explosionFrame = 0;
		}
	}
}

class ZigzagEnemy extends Enemy {
	constructor() {
		super();
		this.patternIndex = 4; // New pattern index for zigzag behavior
	}

	update() {
		if (this.patternIndex === 4) {
			this.y += this.speed;
			this.x += Math.sin(this.y / 10) * 2; // Zigzag pattern
		}
		super.update();
	}
}

class AnimatedProjectile {
	constructor(x, y, enemyShot = false, isHeatseeker = false, firingEnemy = null) {
		this.x = x;
		this.y = y;
		this.width = 18;
		this.height = 45.36;
		this.speed = isHeatseeker ? 5 : enemyShot ? 3 : 8;
		this.enemyShot = enemyShot;
		this.isHeatseeker = isHeatseeker;
		this.angle = enemyShot ? Math.PI / 2 : -Math.PI / 2;
		this.turnSpeed = 0.05;
		this.lockedOnTarget = null;
		this.framesOrder = this.determineFramesOrder(enemyShot, isHeatseeker);
		this.numFrames = this.framesOrder.length;
		this.frameIndex = 0;
		this.tick = 0;
		this.ticksPerFrame = 4;
		this.firingEnemy = firingEnemy; // Store a reference to the enemy that fired the projectile
		if (!this.constructor.spriteSheet) {
			this.constructor.spriteSheet = new Image();
			this.constructor.spriteSheet.src = 'assets/images/game/projectile_main_sprite.png';
		}
		this.spriteSheet = this.constructor.spriteSheet;
		this.fireballEffects = [];
	}

	determineFramesOrder(enemyShot, isHeatseeker) {
		return isHeatseeker ? [6, 7, 8] : enemyShot ? [3, 4, 5] : [0, 1, 2];
	}

	findClosestTarget(enemies) {
		if (!enemies || !Array.isArray(enemies)) {
			console.error('Invalid or undefined enemies array');
			return null; // Return null if enemies array is invalid or not passed.
		}

		let closestEnemy = null;
		let closestDistance = Infinity;
		enemies.forEach((enemy) => {
			let distance = Math.hypot(enemy.x - this.x, enemy.y - this.y);
			if (distance < closestDistance) {
				closestDistance = distance;
				closestEnemy = enemy;
			}
		});
		return closestEnemy;
	}

	update(enemies) {
		if (this.isHeatseeker) {
			if (!this.lockedOnTarget || !this.lockedOnTarget.isActive) {
				this.lockedOnTarget = this.findClosestTarget(enemies);
			}
			if (this.lockedOnTarget) {
				let desiredAngle = Math.atan2(
					this.lockedOnTarget.y - this.y,
					this.lockedOnTarget.x - this.x
				);
				this.angle +=
					Math.sign(desiredAngle - this.angle) *
					Math.min(this.turnSpeed, Math.abs(desiredAngle - this.angle));
			}
		}
		this.x += Math.cos(this.angle) * this.speed;
		this.y += Math.sin(this.angle) * this.speed;

		if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
			this.isActive = false;
		}

		this.tick++;
		if (this.tick > this.ticksPerFrame) {
			this.tick = 0;
			this.frameIndex = (this.frameIndex + 1) % this.numFrames;
		}

		// Add this inside the update method
		if (this.enemyShot) {
			this.fireballEffects.push(new FireballEffect(this.x, this.y));
		}

		this.fireballEffects.forEach((effect) => effect.update());
		this.fireballEffects = this.fireballEffects.filter((effect) => effect.opacity > 0);
	}

	draw(ctx) {
		if (!ctx) {
			console.error('Context (ctx) is not provided or undefined.');
			return;
		}
		if (!this.spriteSheet.complete) {
			console.error('Projectile sprite sheet not loaded');
			return;
		}
		if (!ctx) return;

		// Draw fireball effects
		this.fireballEffects.forEach((effect) => effect.draw(ctx));

		ctx.save();
		ctx.translate(this.x, this.y);
		if (this.enemyShot) {
			ctx.rotate(this.angle + Math.PI / 2 + Math.PI); // 270 degrees for enemy fire, making it upside down
		} else {
			ctx.rotate(this.angle + Math.PI / 2); // 90 degrees for Vela's and heatseekers' ammo
		}
		let sx = this.framesOrder[this.frameIndex] * this.width;
		ctx.drawImage(
			this.spriteSheet,
			sx,
			0,
			this.width,
			this.height,
			-this.width / 2,
			-this.height / 2,
			this.width,
			this.height
		);
		ctx.restore();
	}
}

class HeatseekerProjectile extends AnimatedProjectile {
	constructor(x, y) {
		super(x, y, false, true); // Ensure isHeatseeker is set to true
		this.trailParticles = []; // Initialize the array for trail particles
		this.maxSpeed = 12; // Maximum speed for heatseeker
		this.acceleration = 0.3; // Acceleration rate
		this.stopped = false; // Track if the heatseeker is stopped
	}

	findClosestTarget(enemies) {
		let closestEnemy = null;
		let closestDistance = Infinity;
		enemies.forEach((enemy) => {
			// Skip CityEnemy if it's not ready
			if (enemy instanceof CityEnemy && !enemy.isReady) return;

			let distance = Math.hypot(enemy.x - this.x, enemy.y - this.y);
			if (distance < closestDistance) {
				closestDistance = distance;
				closestEnemy = enemy;
			}
		});
		return closestEnemy;
	}

	update(enemies) {
		if (this.isHeatseeker) {
			if (!this.lockedOnTarget || !this.lockedOnTarget.isActive) {
				this.lockedOnTarget = this.findClosestTarget(enemies);
			}
			if (this.lockedOnTarget) {
				if (
					this.lockedOnTarget.x !== undefined &&
					this.lockedOnTarget.y !== undefined &&
					this.lockedOnTarget.x >= 0 &&
					this.lockedOnTarget.x <= canvas.width &&
					this.lockedOnTarget.y >= 0 &&
					this.lockedOnTarget.y <= canvas.height
				) {
					// If the target is on screen, continue tracking
					this.stopped = false;
					let desiredAngle = Math.atan2(
						this.lockedOnTarget.y - this.y,
						this.lockedOnTarget.x - this.x
					);
					this.angle +=
						Math.sign(desiredAngle - this.angle) *
						Math.min(this.turnSpeed, Math.abs(desiredAngle - this.angle));

					// Adjust speed to have variance
					this.speed = Math.min(this.speed + this.acceleration, this.maxSpeed);
					if (Math.random() < 0.1) {
						this.speed = this.maxSpeed * (0.5 + Math.random() * 0.5); // Speed variance
					}

					// Add subtle flight patterns
					this.x += Math.cos(this.angle) * this.speed + Math.sin(gameFrame * 0.1) * 2;
					this.y += Math.sin(this.angle) * this.speed + Math.cos(gameFrame * 0.1) * 2;
				} else {
					// If the target goes off screen, stop the missile
					this.stopped = true;
				}
			}
		}

		if (this.stopped) {
			// If stopped, wait for the target to come back on screen
			if (
				this.lockedOnTarget &&
				this.lockedOnTarget.x >= 0 &&
				this.lockedOnTarget.x <= canvas.width &&
				this.lockedOnTarget.y >= 0 &&
				this.lockedOnTarget.y <= canvas.height
			) {
				this.stopped = false; // Resume tracking if the target is back on screen
			}
		}

		if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
			this.isActive = false;
		}

		this.tick++;
		if (this.tick > this.ticksPerFrame) {
			this.tick = 0;
			this.frameIndex = (this.frameIndex + 1) % this.numFrames;
		}

		if (!this.stopped) {
			this.createTrail(); // Create vapor trail particles only if not stopped
		}
		this.updateTrailParticles(); // Update existing particles
	}

	createTrail() {
		// Add a new particle every few frames
		if (this.tick % 2 === 0) {
			this.trailParticles.push(new VaporTrailParticle(this.x, this.y));
		}
	}

	updateTrailParticles() {
		this.trailParticles.forEach((particle) => particle.update());
		this.trailParticles = this.trailParticles.filter((particle) => particle.opacity > 0);
	}

	draw(ctx) {
		// Draw vapor trails before drawing the missile
		this.trailParticles.forEach((particle) => {
			if (particle.opacity > 0) {
				particle.draw(ctx); // Draw each particle
			}
		});

		// Draw the projectile itself on top of the vapor trails
		super.draw(ctx);
	}
}

class FireballEffect {
	constructor(x, y) {
		this.x = x;
		this.y = y;
		this.size = Math.random() * 2 + 1;
		this.speedX = (Math.random() - 0.5) * 1.5;
		this.speedY = (Math.random() - 0.5) * 1.5;
		this.opacity = 1;
		this.lifespan = 60;
		this.colors = [
			'#f87858', // NES orange
			'#f83800', // NES red
			'#e45c10', // NES dark orange
			'#fca044' // NES gold
		];
		this.color = this.colors[Math.floor(Math.random() * this.colors.length)];
	}

	update() {
		this.x += this.speedX;
		this.y += this.speedY;
		this.opacity -= 1 / this.lifespan;
		this.lifespan--;
		if (this.lifespan <= 0) {
			this.opacity = 0;
		}
	}

	draw(ctx) {
		ctx.save();
		ctx.globalAlpha = this.opacity;
		ctx.fillStyle = this.color;
		ctx.beginPath();
		ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}
}

class VaporTrailParticle {
	constructor(x, y) {
		this.x = x;
		this.y = y;
		this.size = Math.random() * 2 + 1; // Smaller particles
		this.speedY = -0.5; // Slow upward movement
		this.opacity = 1; // Initial opacity
	}

	update() {
		this.y += this.speedY;
		this.opacity -= 0.02; // Gradually fade out
		if (this.opacity <= 0) {
			this.opacity = 0;
		}
	}

	draw(ctx) {
		ctx.save();
		ctx.globalAlpha = this.opacity;
		ctx.fillStyle = '#FFFFFF'; // White color for vapor trail
		ctx.beginPath();
		ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}
}

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

	draw(ctx) {
		ctx.strokeStyle = '#fff'; // High contrast color
		ctx.beginPath();
		ctx.moveTo(this.x, this.y);
		ctx.lineTo(this.x + this.length, this.y - this.length);
		ctx.stroke();
	}
}

function drawSpaceshipWithDetails(x, y) {
	const auraGradient = ctx.createRadialGradient(x, y, spaceship.width / 2, x, y, spaceship.width);
	auraGradient.addColorStop(0, '#3cbcfc'); // Inner color of the glow
	auraGradient.addColorStop(1, 'transparent'); // Outer color of the glow

	ctx.fillStyle = auraGradient;
	ctx.beginPath();
	ctx.arc(x + spaceship.width / 2, y + spaceship.height / 2, spaceship.width, 0, Math.PI * 2);
	ctx.fill();

	// Draw the spaceship body (simplified to a rectangle for this example)
	ctx.fillStyle = '#0078f8'; // Base color of the spaceship
	ctx.fillRect(x, y, spaceship.width, spaceship.height);

	// Engine Glow
	const engineGradient = ctx.createLinearGradient(
		x,
		y + spaceship.height,
		x,
		y + spaceship.height + 10
	);
	engineGradient.addColorStop(0, '#f83800');
	engineGradient.addColorStop(1, '#e45c10');
	ctx.fillStyle = engineGradient;
	ctx.fillRect(x + 10, y + spaceship.height, spaceship.width - 20, 10); // Engine glow effect below the spaceship

	// Illuminated Windows
	const windowSpacing = 10;
	for (let wx = x + 5; wx < x + spaceship.width - 5; wx += windowSpacing) {
		for (let wy = y + 5; wy < y + spaceship.height - 5; wy += windowSpacing) {
			const windowColor = Math.random() > 0.5 ? '#fcfcfc' : '#0058f8'; // Randomly lit or unlit
			ctx.fillStyle = windowColor;
			ctx.fillRect(wx, wy, 3, 3); // Small windows
		}
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

	draw(ctx) {
		drawSpaceshipWithDetails(this.x, this.y); // Call your drawing function here
	}

	attack() {
		projectiles.push(new Projectile(this.x + this.width / 2, this.y + this.height, 3));
	}
}

class FireParticle {
	constructor(x, y) {
		this.x = x;
		this.y = y;
		this.size = Math.random() * 3 + 1; // Random size
		this.speedX = (Math.random() - 0.5) * 1; // Horizontal movement
		this.speedY = -(Math.random() * 1 + 1); // Upward movement
		this.color = this.getRandomColor(); // Get color from NES palette
		this.opacity = 1;
		this.lifespan = Math.random() * 30 + 20; // Random lifespan
	}

	getRandomColor() {
		const colors = [
			'#f87858', // NES orange
			'#f83800', // NES red
			'#e45c10', // NES dark orange
			'#fca044', // NES gold
			'#fcfcfc', // NES white
			'#f8d878' // NES yellow
		];
		return colors[Math.floor(Math.random() * colors.length)];
	}

	update() {
		this.x += this.speedX;
		this.y += this.speedY;
		this.lifespan--;
		this.opacity = Math.max(0, this.lifespan / 50); // Fade out over time
		if (this.lifespan <= 0) {
			this.opacity = 0; // Ensure the particle is fully transparent at the end
		}
	}

	draw(ctx) {
		ctx.save();
		ctx.globalAlpha = this.opacity;
		ctx.fillStyle = this.color;
		ctx.beginPath();
		ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}
}

class Fire {
	constructor(x, y) {
		this.x = x;
		this.y = y;
		this.fireParticles = [];
	}

	update() {
		if (Math.random() < 0.05) {
			let newParticle = new FireParticle(this.x, this.y);
			this.fireParticles.push(newParticle);
		}

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

function initializeCityFires() {
	cityFires = [];
	for (let i = 0; i < 10; i++) {
		let fireX = Math.random() * canvas.width;
		let fireY = canvas.height - Math.random() * 100;
		cityFires.push(new Fire(fireX, fireY));
	}
}

function drawTitleScreen() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	drawStars(); // Draw stars with twinkling effect

	ctx.shadowColor = '#0000fc';
	ctx.shadowOffsetX = 0;
	ctx.shadowOffsetY = 5;
	ctx.shadowBlur = 0;

	ctx.fillStyle = '#1461d5';
	ctx.font = "28px 'Press Start 2P', cursive";

	ctx.fillText('GUARDIANS OF LUMARA:', 100, 200);
	ctx.fillText("VELA'S VOYAGE", 150, 240);

	ctx.shadowColor = 'transparent';
	ctx.shadowOffsetX = 0;
	ctx.shadowOffsetY = 0;

	ctx.strokeStyle = '#b5c9d0';
	ctx.lineWidth = 1.5;
	ctx.strokeText('GUARDIANS OF LUMARA:', 100, 200);
	ctx.strokeText("VELA'S VOYAGE", 150, 240);

	ctx.font = '16px Arial';
	ctx.fillStyle = 'rgba(252, 252, 252, 1)';
	ctx.fillText('In the year 2045, Earth has become a utopia where equality and peace', 50, 300);
	ctx.fillText('have flourished for decades. However, this harmony is threatened when', 50, 320);
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

function calculateMoonPosition() {
	const centerX = canvas.width / 2;
	const centerY = canvas.height / 2;

	const radiusX = Math.min(canvas.width, canvas.height) / 2;
	const radiusY = Math.min(canvas.width, canvas.height) / 4;

	const angle = Math.PI * 2 * (dayNightCycle / 360);

	return {
		x: centerX + radiusX * Math.cos(angle),
		y: centerY + radiusY * Math.sin(angle)
	};
}

function handleShootingStars() {
	if (Math.random() < 0.005) {
		shootingStars.push(new ShootingStar());
	}

	for (let i = shootingStars.length - 1; i >= 0; i--) {
		shootingStars[i].update();
		shootingStars[i].draw(ctx);
		if (shootingStars[i].x < 0 - shootingStars[i].length || shootingStars[i].y > canvas.height) {
			shootingStars.splice(i, 1);
		}
	}
}

function drawCelestialBody(x, y) {
	ctx.fillStyle = 'rgba(104, 136, 252, 0.5)'; // Light blue with some transparency for the glow
	ctx.beginPath();
	ctx.arc(x, y, 40, 0, 2 * Math.PI); // Adjust the radius to get the desired glow size
	ctx.fill();

	// Main moon circle
	ctx.fillStyle = NESPalette.moon; // NES white for the main moon surface
	ctx.beginPath();
	ctx.arc(x, y, 30, 0, 2 * Math.PI);
	ctx.fill();

	// Adding craters with shades of gray to simulate depth
	ctx.fillStyle = '#7c7c7c'; // NES gray for crater shadow
	ctx.beginPath();
	ctx.arc(x - 10, y - 10, 8, 0, 2 * Math.PI);
	ctx.fill();

	ctx.fillStyle = '#bcbcbc'; // Lighter NES gray for craters
	ctx.beginPath();
	ctx.arc(x + 15, y, 5, 0, 2 * Math.PI);
	ctx.fill();

	ctx.fillStyle = '#7c7c7c'; // Reusing darker gray for smaller craters
	ctx.beginPath();
	ctx.arc(x + 5, y + 15, 3, 0, 2 * Math.PI);
	ctx.fill();

	ctx.beginPath();
	ctx.arc(x - 20, y + 10, 4, 0, 2 * Math.PI);
	ctx.fill();

	ctx.fillStyle = '#fcfcfc'; // Using white to add texture spots
	const dots = [
		{ dx: -5, dy: 5 },
		{ dx: 10, dy: -15 },
		{ dx: -15, dy: -5 },
		{ dx: 20, dy: 10 },
		{ dx: 0, dy: -20 }
	];
	dots.forEach((dot) => {
		ctx.beginPath();
		ctx.arc(x + dot.dx, y + dot.dy, 1, 0, 2 * Math.PI);
		ctx.fill();
	});
}

function drawFiresAndSmoke() {
	cityFires.forEach((fire) => {
		if (Math.random() < 0.2) {
			let x = fire.x + Math.random() * 60 - 30;
			let y = fire.y - 20;
			smokeParticlePool.activate(x, y); // Activate smoke particles
		}
	});

	smokeParticlePool.updateAndDraw(ctx); // Update and draw smoke particles
}

function drawCitySilhouette(skipDrawing = false) {
	if (skipDrawing) {
		return; // Skip drawing the city silhouette
	}

	const skylineColor = '#0000bc'; // A dark color for the silhouette to stand out against the sky
	const cityBaseLine = canvas.height - 0; // Adjust based on your game's horizon line
	const gapBetweenBuildings = 0; // Space between buildings
	const windowColorOn = '#0078F8'; // Lighter NES gray for subtle windows
	const windowColorOff = 'rgba(0, 0, 0, 0.5)'; // Dark color for off windows
	const blinkingWindowColor = '#f1c40f'; // Color for blinking windows, optional change

	// Detailed buildings array simulating a real city's varied skyline
	const buildings = [
		{ height: 190, width: 15, roof: 'flat' },
		{ height: 132, width: 12, roof: 'flat' },
		{ height: 230, width: 25, roof: 'flat' },
		{ height: 155, width: 25, roof: 'flat' },
		{ height: 110, width: 23, roof: 'point' },
		{ height: 110, width: 40, roof: 'antenna' },
		{ height: 127, width: 34, roof: 'dome' },
		{ height: 127, width: 20, roof: 'flat' },
		{ height: 105, width: 12, roof: 'flat' },
		{ height: 114, width: 12, roof: 'flat' },
		{ height: 140, width: 22, roof: 'flat' },
		{ height: 140, width: 23, roof: 'point' },
		{ height: 140, width: 8, roof: 'flat' },
		{ height: 148, width: 14, roof: 'flat' },
		{ height: 163, width: 18, roof: 'flat' },
		{ height: 123, width: 14, roof: 'flat' },
		{ height: 105, width: 14, roof: 'flat' },
		{ height: 105, width: 37, roof: 'point' },
		{ height: 119, width: 12, roof: 'flat' },
		{ height: 132, width: 12, roof: 'flat' },
		{ height: 140, width: 15, roof: 'flat' },
		{ height: 117, width: 21, roof: 'flat' },
		{ height: 105, width: 27, roof: 'flat' },
		{ height: 115, width: 17, roof: 'flat' },
		{ height: 130, width: 25, roof: 'antenna' },
		{ height: 116, width: 45, roof: 'flat' },
		{ height: 105, width: 21, roof: 'flat' },
		{ height: 121, width: 19, roof: 'flat' },
		{ height: 144, width: 45, roof: 'flat' },
		{ height: 105, width: 17, roof: 'flat' },
		{ height: 119, width: 17, roof: 'flat' },
		{ height: 154, width: 30, roof: 'dome' },
		{ height: 160, width: 55, roof: 'point' },
		{ height: 160, width: 12, roof: 'flat' },
		{ height: 290, width: 17, roof: 'flat' },
		{ height: 190, width: 11, roof: 'flat' },
		{ height: 105, width: 32, roof: 'flat' }
	];

	let currentX = 0; // Starting x position for the first building

	buildings.forEach((building) => {
		ctx.fillStyle = skylineColor;
		ctx.fillRect(currentX, cityBaseLine - building.height, building.width, building.height);

		// Add roof variations
		switch (building.roof) {
			case 'flat':
				// No additional drawing needed for flat roofs
				break;
			case 'point':
				// Draw a triangular roof
				ctx.beginPath();
				ctx.moveTo(currentX, cityBaseLine - building.height);
				ctx.lineTo(currentX + building.width / 2, cityBaseLine - building.height - 20); // Peak of the roof
				ctx.lineTo(currentX + building.width, cityBaseLine - building.height);
				ctx.fill();
				break;
			case 'antenna':
				// Draw an antenna atop a flat roof
				ctx.fillRect(currentX + building.width / 2 - 3, cityBaseLine - building.height - 30, 6, 30);
				break;
			case 'dome':
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
			for (let windowX = currentX + 10; windowX < currentX + building.width - 10; windowX += 20) {
				ctx.fillStyle = windowColorOn;
				ctx.fillRect(windowX, cityBaseLine - building.height + 40 * floor + 10, 4, 8);
			}
		}

		currentX += building.width + gapBetweenBuildings;
	});
	drawFiresAndSmoke();
}

// Manage Enemies
// In the "manageEnemies" function, ensure that city enemies are being added and updated.
function manageEnemies() {
	enemies.forEach((enemy, index) => {
		enemy.update();
		enemy.draw(ctx);

		if (enemy.y > canvas.height || enemy.toBeRemoved) {
			enemies.splice(index, 1);
		}
		if (enemy.toBeRemoved) {
			floatingTexts.push(new FloatingText(enemy.x, enemy.y, '+100 pts'));
			score += 100; // Increment score
			enemies.splice(index, 1); // Remove enemy
		}

		projectiles.forEach((projectile, projectileIndex) => {
			if (checkCollision(projectile, enemy)) {
				projectiles.splice(projectileIndex, 1);
				if (projectile.isHeatseeker) {
					enemy.isExploding = true;
					enemy.explosionFrame = 0;
				} else {
					enemy.hitsTaken++;
					if (enemy.hitsTaken === 1) {
						enemy.isAggressive = true;
					} else if (enemy.hitsTaken > 1) {
						enemy.isExploding = true;
						enemy.explosionFrame = 0;
					}
				}
			}
		});
	});

	// Add new enemies including CityEnemy
	if (enemies.length < maxEnemies && gameFrame % enemyInterval === 0) {
		const spawnFromCity = Math.random() < 0.5; // 50% chance to spawn a CityEnemy
		if (spawnFromCity) {
			enemies.push(new CityEnemy());
		} else {
			enemies.push(new Enemy());
		}
	}
}

function manageSpaceships() {
	// Iterate through the spaceships array and update each spaceship's position
	spaceships.forEach((spaceship, index) => {
		spaceship.update();
		spaceship.draw(ctx);
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
			spaceship.x + spaceship.width > 0 && spaceship.x < canvas.width && !spaceship.toBeRemoved
		);
	});
}

function initializeGame() {
	player.weapon = 'standard';
	player.isInvincible = false;
	player.speed = 4; // Reset speed in case of power-up
	unlimitedHeatseekersMode = false;
	shootingCooldown = 50; // Reset shooting cooldown

	scheduleRandomAmmoDrop(); // Schedule the first random ammo drop
	scheduleRandomExtraLifeDrop(); // Schedule the first random extra life drop
	schedulePowerUpDrops(); // Schedule power-up drops

	console.log('Initializing game, adding CityEnemy');
	enemies.push(new CityEnemy()); // Add a CityEnemy at the start
	// Add initial enemies gradually
	setTimeout(() => {
		for (let i = 0; i < 3; i++) {
			setTimeout(() => enemies.push(new Enemy()), i * 1000);
		}
	}, 1000);
}

function setupGame() {
	newGameMechanicsSprite = new Image();
	newGameMechanicsSprite.src = 'assets/images/game/game_mechanics_sprite.png';

	newGameMechanicsSprite.onload = function () {
		console.log('newGameMechanicsSprite loaded successfully');
		preloadAssets(assetURLs)
			.then(() => {
				player.spriteImage.src = 'assets/images/game/vela_main_sprite.png';
				smokeParticlePool = new ParticlePool(100);
				initializeCityFires();
				initializeClouds();
				initializeStars(); // Ensure this is called here
				spaceship = new Spaceship();
				spaceships = [];
				setupInputListeners();

				checkAssetLoading();

				if (titleScreen) {
					drawTitleScreen();
				} else {
					gameActive = true;
					initializeGame();
					drawHUD();
					animate();
				}
			})
			.catch((error) => {
				console.error('Error preloading assets:', error);
			});
	};

	newGameMechanicsSprite.onerror = function (error) {
		console.error('Failed to load newGameMechanicsSprite', error);
	};
}

function animate() {
	if (!gameActive || isPaused) return;

	ctx.clearRect(0, 0, canvas.width, canvas.height);
	gameFrame++;

	drawDynamicGradientSky();
	drawClouds();
	drawStars(); // Ensure stars are drawn with twinkling effect
	handleShootingStars();
	let moonPos = calculateMoonPosition();
	drawCelestialBody(moonPos.x, moonPos.y);
	drawCitySilhouette();
	drawFiresAndSmoke();
	drawHUD();
	drawPowerUpBar();

	dayNightCycle = (dayNightCycle + dayNightCycleSpeed) % 360;

	// Trigger sky flash at random intervals
	if (!skyFlashActive && Math.random() < 0.005) {
		skyFlashActive = true;
		skyFlashTimer = skyFlashDuration;
	}

	if (skyFlashActive) {
		skyFlashTimer--;
		if (skyFlashTimer <= 0) {
			skyFlashActive = false;
		}
	}

	comets.forEach((comet, index) => {
		comet.update();
		comet.draw(ctx);
		if (comet.y > canvas.height) {
			comets.splice(index, 1);
		}
	});

	particles.forEach((particle, index) => {
		particle.update();
		if (particle.lifespan <= 0) {
			particles.splice(index, 1);
		} else {
			particle.draw(ctx);
		}
	});

	manageSpaceships();
	handleHeatseekers();
	handleExplosions();

	manageEnemies();

	projectiles.forEach((projectile, index) => {
		if (projectile.update) {
			projectile.update(enemies);
			projectile.draw(ctx);
			if (projectile.y > canvas.height) {
				projectiles.splice(index, 1);
			}
		} else {
			console.error(`Projectile at index ${index} does not have an update method.`);
		}
	});

	enemies.forEach((enemy, index) => {
		enemy.update();
		enemy.draw(ctx);
		if (checkCollision(player, enemy, 14)) {
			handlePlayerHit('collision', enemy); // Pass 'collision' and the enemy to the handlePlayerHit function
			enemies.splice(index, 1);
		}
	});

	checkCollisions();

	if (player.movingLeft && player.x > 0) player.x -= player.speed;
	if (player.movingRight && player.x < canvas.width - player.width) player.x += player.speed;

	if (enemies.length < maxEnemies && gameFrame % enemyInterval === 0) {
		enemies.push(new Enemy());
	}

	adjustDifficulty();
	checkPowerUpCollisions();

	powerUps.forEach((powerUp) => {
		powerUp.update();
		powerUp.draw(ctx);
	});

	extraLives.forEach((life) => {
		life.update();
		life.draw(ctx);
	});

	handleDroppingItems();
	handleFloatingTexts();

	floatingTexts.forEach((text, index) => {
		text.update();
		text.draw(ctx);
		if (text.duration <= 0) {
			floatingTexts.splice(index, 1);
		}
	});

	enemyProjectiles.forEach((projectile, index) => {
		projectile.update();
		projectile.draw(ctx);
		if (checkCollision(player, projectile, 14)) {
			handlePlayerHit('fire', projectile.firingEnemy); // Pass 'fire' and the firing enemy to the handlePlayerHit function
			enemyProjectiles.splice(index, 1);
		}
	});

	// Draw the player (Vela) last
	player.update();
	player.draw(ctx);

	drawHUD();

	if (flashEffectActive) {
		ctx.fillStyle = flashColor;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	}

	requestAnimationFrame(animate);
}

// End of animate

function setupInputListeners() {
	window.addEventListener('keydown', function (event) {
		const key = event.key.toUpperCase();

		if (titleScreen) {
			if (event.key === 'Enter') {
				event.preventDefault();
				titleScreen = false;
				gameActive = true;
				drawHUD();
				animate();
			}
		} else if (gameOverScreen) {
			if (event.key === 'Enter') {
				event.preventDefault();
				resetGame();
			}
		} else if (gameActive) {
			switch (event.key) {
				case ' ':
					event.preventDefault();
					if (!isPaused) {
						shoot(true);
					}
					break;
				case 'ArrowLeft':
					event.preventDefault();
					player.movingLeft = true;
					break;
				case 'ArrowRight':
					event.preventDefault();
					player.movingRight = true;
					break;
				case 'ArrowUp':
					event.preventDefault();
					player.jump();
					break;
				case 'Shift':
					event.preventDefault();
					player.dash();
					break;
				case 'x':
				case 'X':
					event.preventDefault();
					if (!isPaused) {
						shoot(false, true);
					}
					break;
				case 'p':
				case 'P':
					event.preventDefault();
					isPaused = !isPaused;
					if (!isPaused) animate();
					break;
				default:
					if (key === keyCombination[keyCombinationIndex]) {
						keyCombinationIndex++;
						if (keyCombinationIndex === keyCombination.length) {
							constantPowerUpMode = !constantPowerUpMode;
							if (constantPowerUpMode) {
								activateAllPowerUps();
							} else {
								deactivateAllPowerUps();
							}
							keyCombinationIndex = 0; // Reset index after successful combination
						}
					} else {
						keyCombinationIndex = 0; // Reset index if wrong key is pressed
					}
					break;
			}
		}
	});

	window.addEventListener('keyup', function (event) {
		if (gameActive) {
			switch (event.key) {
				case 'ArrowLeft':
					player.movingLeft = false;
					break;
				case 'ArrowRight':
					player.movingRight = false;
					break;
			}
		}
	});

	window.addEventListener('click', function () {
		if (!isPaused) {
			shoot(false); // Fire regular projectile with click
		}
	});
}

export { initializeGame, animate, setupGame, setupInputListeners };

// Run the game
document.addEventListener('DOMContentLoaded', setupGame);

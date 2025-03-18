// game.js

// Guardains of Lumara: Vela's Voyage

function getAssetPath(path) {
	// Remove leading slash if present
	path = path.startsWith('/') ? path.slice(1) : path;

	// Check if running in development or production
	const baseUrl =
		typeof window !== 'undefined' && window.location.pathname.includes('/personal-website-new')
			? '/personal-website-new'
			: '';

	return `${baseUrl}/${path}`;
}

// Initialize variables without accessing document
let canvas = null;
let ctx = null;
let player = {};
let score = 0;
let lives = 3;
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

let heatseekerAmmo = [];
let heatseekers = 0;
let ammoDropCounter = 0;
let deltaTime = 0;
let animationFrameId = null;
const FRAME_TARGET = 1000 / 60; // Target 60 FPS
let timeMultiplier = 1;
let lastFrameTime = 0;
const maxHeatseekers = 3;
const cometInterval = 2000;
const ammoDropInterval = 8000;
const powerUpDropInterval = 8000;
const extraLifeDropInterval = 20000;
let playerPerformanceMetric = 0;
const initialEnemySpawnRate = 240;
const INITIAL_DROP_DELAY = 20000;
let gameStartTime = 0;
let dropsEnabled = false;

const TIMING_CONFIG = {
	TARGET_FPS: 60,
	FRAME_TIME: 1000 / 60, // 16.67ms
	MIN_FRAME_TIME: 1000 / 120, // 8.33ms - Cap at 120fps
	MAX_FRAME_TIME: 1000 / 30, // 33.33ms - Don't go below 30fps
	TIME_STEP: 1 / 60, // Fixed time step for physics
	RESET_DELAY: 100 // Small buffer when resetting timing
};

let cappedMultiplier = 1;
const MAX_MULTIPLIER = 2;
const MIN_MULTIPLIER = 0.5;

const SPEED_CONFIG = {
	BASE_ENEMY_SPEED: 0.15,
	BASE_PROJECTILE_SPEED: 8,
	BASE_PLAYER_SPEED: 4,
	MIN_TIME_MULTIPLIER: 0.5,
	MAX_TIME_MULTIPLIER: 1.5,
	// Add mobile-specific speeds
	MOBILE: {
		BASE_ENEMY_SPEED: 0.12, // 20% slower
		BASE_PROJECTILE_SPEED: 6, // 25% slower
		BASE_PLAYER_SPEED: 3 // 25% slower
	}
};

const ENEMY_CONFIG = {
	// Starting values
	INITIAL_MAX_ENEMIES: 3, // Classic arcade starting point
	INITIAL_SPAWN_RATE: 180, // Frames between spawns (3 seconds at 60fps)

	// Scaling factors
	MAX_ENEMIES_CAP: 8, // Maximum concurrent enemies
	MIN_SPAWN_INTERVAL: 60, // Fastest spawn rate (1 second)
	DIFFICULTY_SCALE_START: 500, // Score when scaling begins
	DIFFICULTY_SCALE_INTERVAL: 1000, // Points between difficulty increases

	// Enemy type ratios (percentages)
	ENEMY_TYPE_RATIOS: {
		basic: 50, // Standard enemies
		zigzag: 25, // Pattern-based enemies
		city: 25 // Special enemies
	},

	// Pattern variations
	FORMATION_PATTERNS: [
		'line', // Classic line formation
		'v-shape', // V-shaped attack pattern
		'circle', // Circular formation
		'random' // Random positions
	]
};

const SHOW_DEBUG_VISUALS = true; // Set to true to see physics debugging

let maxEnemies = ENEMY_CONFIG.INITIAL_MAX_ENEMIES;
let enemyInterval = ENEMY_CONFIG.INITIAL_SPAWN_RATE;

// Constants
const NESPalette = {
	// Core colors
	black: '#000000',
	white: '#fcfcfc',
	lightGray: '#f8f8f8',
	mediumGray: '#bcbcbc',
	darkGray: '#7c7c7c',

	// Blues
	lightestBlue: '#a4e4fc',
	lightBlue: '#3cbcfc',
	blue: '#0078f8',
	darkBlue: '#0000fc',
	periwinkle: '#b8b8f8',
	royalBlue: '#6888fc',
	brightBlue: '#0058f8',
	navyBlue: '#0000bc',

	// Purples
	lightPurple: '#d8b8f8',
	purple: '#9878f8',
	deepPurple: '#6844fc',
	darkPurple: '#4428bc',

	// Pinks
	lightPink: '#f8b8f8',
	pink: '#f878f8',
	hotPink: '#d800cc',
	deepPink: '#940084',

	// Reds
	salmon: '#f8a4c0',
	coral: '#f85898',
	red: '#e40058',
	darkRed: '#a80020',

	// Oranges
	peach: '#f0d0b0',
	lightOrange: '#f87858',
	orange: '#f83800',
	darkOrange: '#a81000',

	// Golds
	lightGold: '#fce0a8',
	gold: '#fca044',
	darkGold: '#e45c10',
	brown: '#881400',

	// Yellows
	lightYellow: '#f8d878',
	yellow: '#f8b800',
	darkYellow: '#ac7c00',
	darkBrown: '#503000',

	// Greens
	lightestGreen: '#d8f878',
	lightGreen: '#b8f818',
	green: '#00b800',
	darkGreen: '#007800',
	mintGreen: '#b8f8b8',
	mediumGreen: '#58d854',
	emeraldGreen: '#00a800',
	forestGreen: '#006800',

	// Aquas
	lightAqua: '#b8f8d8',
	aqua: '#58f898',
	seaGreen: '#00a844',
	darkSeaGreen: '#005800',
	cyan: '#00fcfc',
	turquoise: '#00e8d8',
	oceanBlue: '#008888',
	deepOcean: '#004058',

	// Special
	lavender: '#f8d8f8',
	neutral: '#787878'
};

const goldExplosionColors = [NESPalette.lightYellow, NESPalette.lightGold, NESPalette.gold];

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
let flashColor = `rgba(${parseInt(NESPalette.red.slice(1, 3), 16)}, ${parseInt(NESPalette.red.slice(3, 5), 16)}, ${parseInt(NESPalette.red.slice(5, 7), 16)}, 0.5)`;
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
let newGameMechanicsSprite = null;
let constantPowerUpMode = false;
let unlimitedHeatseekersMode = false;
let powerUpActive = false;
let powerUpType = '';
let powerUpDuration = 15000;
let powerUpStartTime = 0;
let keyCombination = ['S', 'T', 'A', 'R'];
let keyCombinationIndex = 0;
const maxPowerUps = 5;
let velaShootingCooldown = 50;
let rapidFireMode = false;
let lastVelaShotTime = 0;

const PLAYER_HITBOX_PADDING = 28;

const assetURLs = [
	getAssetPath('assets/images/game/void_swarm_sprite.png'),
	getAssetPath('assets/images/game/vela_main_sprite.png'),
	getAssetPath('assets/images/game/projectile_main_sprite.png'),
	getAssetPath('assets/images/game/game_mechanics_sprite.png'),
	getAssetPath('assets/images/game/main_logo_title_screen-01.svg')
];

// This uses a global function that will be set by Game.svelte
function updateGameStore(stateObject) {
	if (typeof window !== 'undefined' && window.gameStoreUpdater) {
		console.log('Game sending state update:', stateObject);
		window.gameStoreUpdater(stateObject);
	} else {
		console.warn('Game store updater not available');
	}
}

function initializePlayer() {
	Object.assign(player, {
		x: canvas.width / 2 - 27.5,
		y: canvas.height - 87.5 - 5,
		width: 80,
		height: 87.5,
		// Physics parameters tuned for Mario-style movement
		speed: 4, // Maximum horizontal speed
		acceleration: 0.4, // Acceleration rate (higher than before for snappier response)
		friction: 0.85, // Friction when not pressing movement keys (lower for more slide)
		velocityX: 0,
		velocityY: 0,
		jumpForce: 10, // Initial jump velocity
		gravity: 0.5, // Gravity pulling down
		fallMultiplier: 1.5, // Makes falling faster than rising (Mario-like)
		jumpCutMultiplier: 1.8, // For variable jump height based on button hold time
		terminalVelocity: 12, // Maximum falling speed
		isGrounded: false,
		movingLeft: false,
		movingRight: false,
		isJumping: false,
		jumpPressed: false, // Track if jump button is held
		canDoubleJump: true,
		skidding: false, // New property for skid effect
		skidThreshold: 2, // Speed threshold to trigger skidding
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
		frameCount: 6, // Updated for the complete animation sequence
		frameTimer: 0,
		// Animation timing varies by movement state
		frameInterval: 8, // Base frame interval
		runningFrameInterval: 6, // Faster animation when running at full speed
		skidFrameInterval: 4, // Even faster animation during skidding
		isExploding: false,
		explosionFrame: 0,
		spriteImage: null, // Initialize as null first
		spriteLoaded: false,
		loadRetries: 0,
		maxRetries: 3,
		direction: 'right',
		// Specific Mario-style frame sequence
		frameSequence: [0, 1, 2, 1, 3, 1], // C1→C2→C3→C2→C4→C2 sequence
		sequenceIndex: 0,
		runAnimationStarted: false, // Track if running animation has started

		init: function () {
			// Create new Image instance
			this.spriteImage = new Image();

			// Set up load handlers before setting src
			this.spriteImage.onload = () => {
				console.log('Vela sprite loaded successfully');
				// Verify sprite dimensions
				if (this.spriteImage.width === 0 || this.spriteImage.height === 0) {
					console.error('Invalid sprite dimensions');
					this.retryLoad();
					return;
				}
				this.spriteLoaded = true;
				// Log success with dimensions
				console.log(`Sprite loaded: ${this.spriteImage.width}x${this.spriteImage.height}`);
			};

			this.spriteImage.onerror = (error) => {
				console.error('Failed to load Vela sprite:', error);
				this.retryLoad();
			};

			// Start loading sprite
			this.loadSprite();
		},

		loadSprite: function () {
			const spritePath = getAssetPath('assets/images/game/vela_main_sprite.png');
			console.log('Loading sprite from:', spritePath);
			this.spriteImage.src = spritePath;
		},

		retryLoad: function () {
			if (this.loadRetries < this.maxRetries) {
				this.loadRetries++;
				console.log(`Retrying sprite load, attempt ${this.loadRetries}`);
				setTimeout(() => this.loadSprite(), 1000 * this.loadRetries);
			} else {
				console.error('Max retry attempts reached for sprite loading');
			}
		},

		update: function () {
			// Handle explosion animation separately
			if (this.isExploding) {
				this.handleExplosionAnimation();
				return;
			}

			// Movement and physics update
			this.updateMovement();

			// Collision handling with ground
			this.handleGroundCollision();

			// Update animation states
			this.updateAnimation();

			// Handle dash cooldown
			if (this.dashCooldown > 0) {
				this.dashCooldown -= timeMultiplier;
			}
		},

		updateMovement: function () {
			// Horizontal movement with acceleration/deceleration
			if (this.isDashing) {
				this.handleDashing();
			} else {
				this.handleHorizontalMovement();
			}

			// Apply friction when not actively moving
			if (!this.movingLeft && !this.movingRight && !this.isDashing) {
				this.applyFriction();
			}

			// Screen wrapping
			this.handleScreenWrapping();

			// Jump physics
			this.handleJumpPhysics();
		},

		handleHorizontalMovement: function () {
			const wasMovingFast = Math.abs(this.velocityX) > this.speed * 0.8;

			// Detect direction change for skidding effect
			if (
				(this.velocityX > this.skidThreshold && this.movingLeft) ||
				(this.velocityX < -this.skidThreshold && this.movingRight)
			) {
				this.skidding = true;
			} else {
				this.skidding = false;
			}

			// Apply acceleration based on input
			if (this.movingLeft) {
				// Faster deceleration when changing direction (skidding)
				if (this.velocityX > 0 && this.skidding) {
					this.velocityX -= this.acceleration * 1.5 * timeMultiplier;
				} else {
					this.velocityX = Math.max(
						this.velocityX - this.acceleration * timeMultiplier,
						-this.speed
					);
				}
				this.direction = 'left';
			} else if (this.movingRight) {
				// Faster deceleration when changing direction (skidding)
				if (this.velocityX < 0 && this.skidding) {
					this.velocityX += this.acceleration * 1.5 * timeMultiplier;
				} else {
					this.velocityX = Math.min(
						this.velocityX + this.acceleration * timeMultiplier,
						this.speed
					);
				}
				this.direction = 'right';
			}

			// Update x position based on velocity
			this.x += this.velocityX * timeMultiplier;
		},

		applyFriction: function () {
			// Apply friction to gradually slow down
			this.velocityX *= Math.pow(this.friction, timeMultiplier);

			// Stop completely if moving very slowly
			if (Math.abs(this.velocityX) < 0.1) {
				this.velocityX = 0;
				// Reset animation when stopped
				if (this.runAnimationStarted) {
					this.runAnimationStarted = false;
					this.sequenceIndex = 0;
					this.currentFrame = this.frameSequence[0];
					this.frameX = this.currentFrame * this.spriteWidth;
				}
			}
		},

		handleScreenWrapping: function () {
			// Screen wrapping logic
			if (this.x + this.width < 0) {
				this.x = canvas.width;
			} else if (this.x > canvas.width) {
				this.x = -this.width;
			}
		},

		handleJumpPhysics: function () {
			// Handle jump initiation
			if (this.isJumping) {
				this.velocityY = -this.jumpForce;

				if (this.isGrounded) {
					this.isGrounded = false;
				} else if (this.canDoubleJump) {
					this.canDoubleJump = false;
				}

				this.isJumping = false;
				this.jumpPressed = true;
			}

			// Variable jump height based on button release
			if (!this.jumpPressed && this.velocityY < 0) {
				// Cut the jump short if button is released during upward motion
				this.velocityY *= 0.5;
			}

			// Apply gravity with Mario-style faster falling
			if (!this.isGrounded) {
				// Apply stronger gravity when falling for Mario-like feel
				if (this.velocityY > 0) {
					this.velocityY += this.gravity * this.fallMultiplier * timeMultiplier;
				} else {
					this.velocityY += this.gravity * timeMultiplier;
				}

				// Apply terminal velocity cap
				this.velocityY = Math.min(this.velocityY, this.terminalVelocity);

				// Update position based on velocity
				this.y += this.velocityY * timeMultiplier;
			}
		},

		handleGroundCollision: function () {
			// Ground collision detection
			if (this.y + this.height > canvas.height - 5) {
				this.y = canvas.height - this.height - 5;
				this.velocityY = 0;

				if (!this.isGrounded) {
					this.isGrounded = true;
					this.canDoubleJump = true;

					// Landing animation reset
					if (Math.abs(this.velocityX) < 0.5) {
						this.currentFrame = 0;
						this.frameX = 0;
						this.sequenceIndex = 0;
						this.runAnimationStarted = false;
					}
				}
			}
		},

		handleDashing: function () {
			this.dodgeEnemyProjectiles();
			this.x += this.dashSpeed * timeMultiplier * (this.direction === 'left' ? -1 : 1);
			this.dashDuration -= timeMultiplier;

			if (this.dashDuration <= 0) {
				this.isDashing = false;
				this.dashCooldown = this.dashCooldownDuration;
			}
		},

		updateAnimation: function () {
			// Determine the appropriate frame interval based on movement state
			let currentFrameInterval = this.frameInterval;

			if (this.skidding) {
				currentFrameInterval = this.skidFrameInterval;
			} else if (Math.abs(this.velocityX) > this.speed * 0.7) {
				currentFrameInterval = this.runningFrameInterval;
			}

			// Update animation frames for running
			if (this.movingLeft || this.movingRight || Math.abs(this.velocityX) > 0.5) {
				this.runAnimationStarted = true;
				this.frameTimer += timeMultiplier;

				if (this.frameTimer >= currentFrameInterval) {
					// Progress through the frame sequence
					this.sequenceIndex = (this.sequenceIndex + 1) % this.frameSequence.length;
					this.currentFrame = this.frameSequence[this.sequenceIndex];
					this.frameX = this.currentFrame * this.spriteWidth;
					this.frameTimer = 0;
				}
			} else if (!this.isGrounded) {
				// Jump/fall frame
				this.currentFrame = 2; // Use jump frame
				this.frameX = this.currentFrame * this.spriteWidth;
			} else {
				// Standing still
				this.currentFrame = 0;
				this.frameX = 0;
				this.sequenceIndex = 0;
			}
		},

		handleExplosionAnimation: function () {
			// Death/explosion animation sequence
			const explosionSequence = [4, 5, 6]; // C5→C6→C7 (frames 5, 6, 7 in sprite sheet)
			this.explosionFrame++;

			// Update the visual frame based on explosion progress
			const explosionIndex = Math.min(Math.floor(this.explosionFrame / 10), 2);
			this.currentFrame = explosionSequence[explosionIndex];
			this.frameX = this.currentFrame * this.spriteWidth;

			// End the explosion sequence
			if (this.explosionFrame > 30) {
				this.isExploding = false;
				this.explosionFrame = 0;
				this.x = -100;
				this.y = -100;

				setTimeout(() => {
					if (lives <= 0) {
						gameActive = false;
						drawGameOverScreen();
					}
				}, 1000);
			}
		},

		draw: function () {
			if (!this.spriteImage || !this.spriteLoaded || !this.spriteImage.complete) {
				// Enhanced debug visualization
				ctx.save();
				ctx.fillStyle = '#FF00FF';
				ctx.fillRect(this.x, this.y, this.width, this.height);
				// Add debug text
				ctx.fillStyle = '#FFFFFF';
				ctx.font = '12px Arial';
				ctx.fillText('Loading...', this.x, this.y - 5);
				ctx.restore();
				return;
			}

			ctx.save();

			if (this.direction === 'left') {
				ctx.scale(-1, 1);
				ctx.translate(-canvas.width, 0);
			}

			try {
				const drawX = this.direction === 'left' ? canvas.width - this.x - this.width : this.x;

				if (this.glowColor) {
					ctx.shadowBlur = 20;
					ctx.shadowColor = this.glowColor;
				}

				// Draw the appropriate sprite frame
				ctx.drawImage(
					this.spriteImage,
					this.frameX,
					this.frameY,
					this.spriteWidth,
					this.spriteHeight,
					drawX,
					this.y,
					this.width,
					this.height
				);

				// Visual debug for skidding state (optional)
				if (this.skidding && SHOW_DEBUG_VISUALS) {
					ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
					ctx.fillRect(drawX, this.y + this.height - 5, this.width, 5);
				}
			} catch (e) {
				console.error('Sprite drawing error:', e);
				ctx.fillStyle = '#FF00FF';
				ctx.fillRect(this.x, this.y, this.width, this.height);
			}

			ctx.restore();
		},

		jump: function () {
			if (this.isGrounded || this.canDoubleJump) {
				this.isJumping = true;
				this.jumpPressed = true;
			}
		},

		releaseJump: function () {
			this.jumpPressed = false;
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
		}
	});

	// Initialize the player immediately after setup
	player.init();
}

// Class Definitions

class Star {
	constructor() {
		this.x = Math.random() * canvas.width;
		this.y = Math.random() * canvas.height;
		this.size = Math.random() * 1.5 + 0.5;
		this.twinkleFactor = Math.random() * 1.5 + 0.5;
	}

	update(timeMultiplier = 1) {
		this.twinkleFactor += (Math.random() - 0.5) * 0.2 * timeMultiplier;
		this.twinkleFactor = Math.max(0.5, Math.min(2, this.twinkleFactor));
	}

	draw() {
		ctx.fillStyle = `rgba(${parseInt(NESPalette.white.slice(1, 3), 16)}, ${parseInt(NESPalette.white.slice(3, 5), 16)}, ${parseInt(NESPalette.white.slice(5, 7), 16)}, ${this.twinkleFactor * 0.5})`;
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
		this.color = `rgba(${parseInt(NESPalette.orange.slice(1, 3), 16)}, ${parseInt(NESPalette.orange.slice(3, 5), 16)}, ${parseInt(NESPalette.orange.slice(5, 7), 16)}, 0.8)`;
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

	update(timeMultiplier = 1) {
		this.x -= this.speed * timeMultiplier;
		if (this.x < -this.width) {
			this.x = canvas.width;
			this.y = Math.random() * 150;
			this.speed = Math.random() * 0.5 + 0.2;
			this.width = Math.random() * 50 + 30;
			this.height = this.width * 0.6;
		}
	}

	draw(ctx) {
		ctx.fillStyle = NESPalette.mediumGray;
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
		this.colors = [
			NESPalette.white,
			NESPalette.lightestBlue,
			NESPalette.lightBlue,
			NESPalette.lightYellow
		];
		this.lifespan = 50; // Shorter lifespan for quick trail fade
		this.opacity = 1; // Initial opacity
		this.isActive = true;
	}

	update(timeMultiplier = 1) {
		this.y += this.speedY * timeMultiplier;
		this.opacity -= 0.02 * timeMultiplier;
		if (this.opacity <= 0) {
			this.opacity = 0;
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
		this.color = NESPalette.darkGray;
		this.lifespan = 120; // Slightly longer lifespan to allow fuller visualization
		this.active = true;
	}

	update(timeMultiplier = 1) {
		if (!this.active) return;
		// Update positions based on speed
		this.x += this.speedX * timeMultiplier;
		this.y += this.speedY * timeMultiplier;
		// Gradually increase size to simulate smoke expansion
		this.size += 0.05 * timeMultiplier;
		// Reduce lifespan each frame
		this.lifespan -= 1.5 * timeMultiplier;
		// Check for deactivation conditions
		if (this.lifespan <= 0 || this.size > 10) {
			this.active = false;
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
		this.size = Math.random() * 2.5 + 1.4;
		this.speedX = (Math.random() - 0.5) * 6;
		this.speedY = (Math.random() - 0.5) * 6;
		this.color = color || this.getRandomColor();
		this.lifespan = 150;
		this.isActive = true;
	}

	update(timeMultiplier = 1) {
		this.lifespan -= 2 * timeMultiplier;
		if (this.lifespan > 0) {
			this.x += this.speedX * timeMultiplier;
			this.y += this.speedY * timeMultiplier;
			this.size *= Math.pow(0.99, timeMultiplier); // Slow reduction in size
		} else {
			this.isActive = false;
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
			NESPalette.red,
			NESPalette.darkRed,
			NESPalette.coral,
			NESPalette.darkOrange,
			NESPalette.brown
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

	update(timeMultiplier = 1) {
		this.size += 2 * timeMultiplier;
		if (this.size >= this.maxSize) {
			this.isActive = false;
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
		this.frameX = 0;
		this.swayAngle = Math.random() * Math.PI * 2;
		this.swaySpeed = 0.05;
		this.swayAmplitude = 10;
		this.loaded = false;

		// Ensure the path is correct and wait for load
		this.spriteImage.src = getAssetPath('assets/images/game/game_mechanics_sprite.png');

		// Add load event handler
		this.spriteImage.onload = () => {
			console.log('DroppingCrate sprite loaded successfully');
			this.loaded = true;
		};

		this.spriteImage.onerror = (error) => {
			console.error('Failed to load DroppingCrate image:', error, this.spriteImage.src);
		};
	}

	update() {
		this.y += this.speed;
		this.swayAngle += this.swaySpeed;
		this.x += Math.sin(this.swayAngle) * this.swayAmplitude * 0.1;

		// Check boundaries
		if (this.y > canvas.height) {
			const index = heatseekerAmmo.indexOf(this);
			if (index !== -1) heatseekerAmmo.splice(index, 1);
		}
	}

	draw(ctx) {
		if (!this.loaded) {
			// Draw a placeholder while loading
			ctx.fillStyle = NESPalette.lightGold;
			ctx.fillRect(this.x, this.y, this.width, this.height);
			return;
		}

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
		this.spriteImage.src = getAssetPath('assets/images/game/game_mechanics_sprite.png');
		this.frameX = 1;
		this.loaded = false;
		this.rotationAngle = 0; // Track current rotation
		this.rotationSpeed = 0.03; // Speed of rotation (adjust for faster/slower spin)
		this.scaleX = 1; // Used to create the scaling effect for rotation

		// Enhanced load handling
		this.spriteImage.onload = () => {
			console.log('Extra life sprite loaded successfully');
			this.loaded = true;
		};

		this.spriteImage.onerror = (error) => {
			console.error('Failed to load Extra life image:', error, this.spriteImage.src);
		};
	}

	update() {
		this.y += this.speed;
		if (this.y > canvas.height) {
			console.log('Extra life moved off screen');
			const index = extraLives.indexOf(this);
			if (index !== -1) {
				extraLives.splice(index, 1);
				console.log('Extra life removed from array');
			}
		}

		// Update rotation
		this.rotationAngle += this.rotationSpeed;
		// Calculate scale to simulate 3D rotation
		this.scaleX = Math.abs(Math.cos(this.rotationAngle));

		if (this.y > canvas.height) {
			const index = extraLives.indexOf(this);
			if (index !== -1) extraLives.splice(index, 1);
		}
	}

	draw(ctx) {
		if (!this.loaded) {
			ctx.fillStyle = NESPalette.lightGreen;
			ctx.fillRect(this.x, this.y, this.width * this.scaleX, this.height);
			return;
		}

		ctx.save();
		// Set up the rotation center point
		ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
		// Apply the scale for the "3D" effect
		ctx.scale(this.scaleX, 1);
		// Draw the sprite
		ctx.drawImage(
			this.spriteImage,
			this.frameX * this.width,
			0,
			this.width,
			this.height,
			-this.width / 2, // Offset by half width/height since we're using translate
			-this.height / 2,
			this.width,
			this.height
		);
		ctx.restore();
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

	update(timeMultiplier = 1) {
		// Classic arcade-style pulsing effect
		this.glowOpacity += this.glowDirection * timeMultiplier;
		if (this.glowOpacity >= 1 || this.glowOpacity <= 0.5) {
			this.glowDirection = -this.glowDirection;
		}

		// Rotate sparkles in classic arcade style
		this.sparkles.forEach((sparkle) => {
			sparkle.angle += this.sparkleSpeed * timeMultiplier;
		});
	}

	draw(ctx) {
		ctx.save();

		// Draw pulsating glow effect common in 80s arcade games
		ctx.globalAlpha = this.glowOpacity;
		ctx.fillStyle = NESPalette.lightYellow;
		ctx.beginPath();
		ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
		ctx.fill();

		// Draw rotating sparkles - a classic arcade power-up indicator
		ctx.globalAlpha = 1;
		ctx.fillStyle = NESPalette.white;
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

class PowerUp {
	constructor(x, y) {
		// Core properties
		this.x = x;
		this.y = y;
		this.width = 65.333;
		this.height = 56;
		this.speed = 1;
		this.spriteImage = new Image();
		this.spriteImage.src = getAssetPath('assets/images/game/game_mechanics_sprite.png');
		this.frameX = 2;
		this.loaded = false;

		// Animation properties
		this.effectType = Math.floor(Math.random() * 10);
		this.effectAngle = 0;
		this.rotationSpeed = 0.05;
		this.pulsePhase = 0;
		this.pulseSpeed = 0.05;

		// Thunder Force III properties
		this.orbitRadius = 15;
		this.orbitSpeed = 0.1;
		this.orbitAngle = 0;
		this.orbiterCount = 4;
		this.orbiterTrails = Array(this.orbiterCount)
			.fill()
			.map(() => []);
		this.maxTrailLength = 5;

		// R-Type properties
		this.tearWidth = 0;
		this.tearHeight = this.height * 1.5;
		this.tearSegments = 8;
		this.tearAmplitude = 3;
		this.dimensionalRift = {
			particles: [],
			maxParticles: 20
		};

		// Darius properties
		this.shadowOffsets = [
			{ x: -10, y: -5, alpha: 0.7 },
			{ x: -20, y: -10, alpha: 0.4 }
		];
		this.shadowColor = NESPalette.periwinkle;
		this.shadowPulse = 0;
		this.shadowScale = 1;

		// Gradius properties
		this.rippleRings = [];
		this.maxRings = 3;
		this.ringSpawnTimer = 0;
		this.ringSpawnInterval = 20;
		this.shieldRotation = 0;

		// Life Force properties
		this.coreSize = 10;
		this.coreGlow = 0;
		this.outerRingRotation = 0;
		this.energyNodes = [];
		this.nodeCount = 8;

		// Space Harrier properties
		this.starTrail = [];
		this.maxStars = 12;
		this.starSpawnTimer = 0;
		this.starSpawnInterval = 3;
		this.starColors = [NESPalette.white, NESPalette.lightestBlue, NESPalette.lightBlue];

		// After Burner properties
		this.traceLines = [];
		this.maxTraceLines = 4;
		this.traceSpawnTimer = 0;
		this.traceSpawnInterval = 5;
		this.traceAlpha = 1;

		// Galaxy Force properties
		this.energyFieldRadius = 20;
		this.energyFieldPoints = 8;
		this.fieldRotation = 0;
		this.fieldExpansion = 0;
		this.fieldParticles = [];
		this.fieldPulse = 0;

		// Contra properties
		this.spreadRipples = [];
		this.maxRipples = 3;
		this.rippleSpawnTimer = 0;
		this.rippleSpawnInterval = 15;
		this.rippleRotation = 0;

		// Mega Man properties
		this.surgePulse = 0;
		this.surgeSize = 0;
		this.surgeColor = 0;
		this.surgeSpeed = 0.1;
		this.surgeBolts = [];
		this.maxBolts = 4;

		// Shared color system
		this.colorIndex = 0;
		this.colorTimer = 0;
		this.colorInterval = 6;
		this.colorCycle = [
			NESPalette.lightYellow,
			NESPalette.lightBlue,
			NESPalette.lightGreen,
			NESPalette.coral,
			NESPalette.lightPurple
		];

		// Initialize sprite
		this.spriteImage.onload = () => {
			this.loaded = true;
			console.log('Power-up sprite loaded successfully');
		};

		this.spriteImage.onerror = () => {
			console.error('Failed to load power-up sprite');
		};

		// Initialize effect-specific elements
		this.initializeEffects();
	}

	initializeEffects() {
		// Initialize Life Force energy nodes
		for (let i = 0; i < this.nodeCount; i++) {
			const angle = (i / this.nodeCount) * Math.PI * 2;
			this.energyNodes.push({
				angle: angle,
				radius: this.width / 2,
				pulse: Math.random() * Math.PI * 2
			});
		}

		// Initialize Galaxy Force field particles
		for (let i = 0; i < this.energyFieldPoints; i++) {
			this.fieldParticles.push({
				angle: (i / this.energyFieldPoints) * Math.PI * 2,
				radius: this.energyFieldRadius,
				pulse: Math.random() * Math.PI * 2
			});
		}

		// Initialize Mega Man surge bolts
		for (let i = 0; i < this.maxBolts; i++) {
			this.surgeBolts.push({
				angle: (i / this.maxBolts) * Math.PI * 2,
				length: 15,
				phase: Math.random() * Math.PI * 2
			});
		}
	}

	// Thunder Force III Effect
	updateThunderForce(timeMultiplier) {
		this.orbitAngle += this.orbitSpeed * timeMultiplier;

		for (let i = 0; i < this.orbiterCount; i++) {
			const angle = this.orbitAngle + (Math.PI * 2 * i) / this.orbiterCount;
			const x = this.x + this.width / 2 + Math.cos(angle) * this.orbitRadius;
			const y = this.y + this.height / 2 + Math.sin(angle) * this.orbitRadius;

			this.orbiterTrails[i].unshift({ x, y, alpha: 1 });
			if (this.orbiterTrails[i].length > this.maxTrailLength) {
				this.orbiterTrails[i].pop();
			}

			this.orbiterTrails[i].forEach((point, index) => {
				point.alpha = 1 - index / this.maxTrailLength;
			});
		}
	}

	drawThunderForce(ctx) {
		// Draw trails
		this.orbiterTrails.forEach((trail) => {
			trail.forEach((point) => {
				ctx.save();
				ctx.globalAlpha = point.alpha * 0.5;
				ctx.fillStyle = this.colorCycle[this.colorIndex];
				ctx.beginPath();
				ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
				ctx.fill();
				ctx.restore();
			});
		});

		// Draw orbiters
		for (let i = 0; i < this.orbiterCount; i++) {
			const angle = this.orbitAngle + (Math.PI * 2 * i) / this.orbiterCount;
			const x = this.x + this.width / 2 + Math.cos(angle) * this.orbitRadius;
			const y = this.y + this.height / 2 + Math.sin(angle) * this.orbitRadius;

			ctx.fillStyle = this.colorCycle[this.colorIndex];
			ctx.beginPath();
			ctx.arc(x, y, 3, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	// R-Type Effect
	updateRType(timeMultiplier) {
		this.tearWidth = Math.sin(this.pulsePhase) * this.tearAmplitude;

		// Update dimensional rift particles
		if (Math.random() < 0.2) {
			if (this.dimensionalRift.particles.length < this.dimensionalRift.maxParticles) {
				this.dimensionalRift.particles.push({
					x: this.x + this.width / 2,
					y: this.y + (Math.random() - 0.5) * this.height,
					size: Math.random() * 2 + 1,
					alpha: 1,
					speed: (Math.random() - 0.5) * 2
				});
			}
		}

		this.dimensionalRift.particles.forEach((particle, index) => {
			particle.x += particle.speed * timeMultiplier;
			particle.alpha -= 0.02 * timeMultiplier;
			if (particle.alpha <= 0) {
				this.dimensionalRift.particles.splice(index, 1);
			}
		});
	}

	drawRType(ctx) {
		const centerX = this.x + this.width / 2;

		// Draw dimensional rift particles
		this.dimensionalRift.particles.forEach((particle) => {
			ctx.save();
			ctx.globalAlpha = particle.alpha;
			ctx.fillStyle = this.colorCycle[this.colorIndex];
			ctx.beginPath();
			ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
		});

		// Draw tear effect
		const segmentHeight = this.tearHeight / this.tearSegments;
		for (let i = 0; i < this.tearSegments; i++) {
			const segmentY = this.y - this.tearHeight / 2 + i * segmentHeight;
			const waveOffset = Math.sin(this.pulsePhase + i * 0.5) * this.tearWidth;

			ctx.save();
			ctx.fillStyle = this.colorCycle[this.colorIndex];
			ctx.globalAlpha = 0.5 - (i / this.tearSegments) * 0.3;

			ctx.beginPath();
			ctx.moveTo(centerX + waveOffset, segmentY);
			ctx.lineTo(centerX - waveOffset, segmentY);
			ctx.lineTo(centerX - waveOffset, segmentY + segmentHeight);
			ctx.lineTo(centerX + waveOffset, segmentY + segmentHeight);
			ctx.closePath();
			ctx.fill();

			ctx.restore();
		}
	}

	// Darius Effect
	updateDarius(timeMultiplier) {
		this.shadowPulse += 0.05 * timeMultiplier;
		this.shadowScale = 1 + Math.sin(this.shadowPulse) * 0.1;

		this.shadowOffsets.forEach((shadow) => {
			shadow.alpha = 0.4 + Math.sin(this.pulsePhase) * 0.2;
		});
	}

	drawDarius(ctx) {
		// Draw shadows
		this.shadowOffsets.forEach((shadow) => {
			ctx.save();
			ctx.globalAlpha = shadow.alpha;
			ctx.translate(this.x + shadow.x + this.width / 2, this.y + shadow.y + this.height / 2);
			ctx.scale(this.shadowScale, this.shadowScale);
			ctx.fillStyle = this.shadowColor;
			ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
			ctx.restore();
		});
	}

	// Gradius Effect
	updateGradius(timeMultiplier) {
		this.ringSpawnTimer += timeMultiplier;
		this.shieldRotation += 0.05 * timeMultiplier;

		if (this.ringSpawnTimer >= this.ringSpawnInterval) {
			this.ringSpawnTimer = 0;
			if (this.rippleRings.length < this.maxRings) {
				this.rippleRings.push({
					radius: 5,
					alpha: 1,
					rotation: Math.random() * Math.PI * 2
				});
			}
		}

		this.rippleRings.forEach((ring, index) => {
			ring.radius += 0.5 * timeMultiplier;
			ring.alpha -= 0.02 * timeMultiplier;
			ring.rotation += 0.03 * timeMultiplier;
			if (ring.alpha <= 0) {
				this.rippleRings.splice(index, 1);
			}
		});
	}

	drawGradius(ctx) {
		const centerX = this.x + this.width / 2;
		const centerY = this.y + this.height / 2;

		// Draw shield rings
		this.rippleRings.forEach((ring) => {
			ctx.save();
			ctx.translate(centerX, centerY);
			ctx.rotate(ring.rotation);
			ctx.globalAlpha = ring.alpha;
			ctx.strokeStyle = this.colorCycle[this.colorIndex];
			ctx.lineWidth = 2;

			// Draw hexagonal shield
			ctx.beginPath();
			for (let i = 0; i < 6; i++) {
				const angle = (i / 6) * Math.PI * 2;
				const x = Math.cos(angle) * ring.radius;
				const y = Math.sin(angle) * ring.radius;
				if (i === 0) ctx.moveTo(x, y);
				else ctx.lineTo(x, y);
			}
			ctx.closePath();
			ctx.stroke();

			ctx.restore();
		});
	}

	// Life Force Effect
	updateLifeForce(timeMultiplier) {
		this.coreGlow = Math.sin(this.pulsePhase) * 0.3 + 0.7;
		this.outerRingRotation += 0.05 * timeMultiplier;

		// Update energy nodes
		this.energyNodes.forEach((node) => {
			node.pulse += 0.1 * timeMultiplier;
			node.radius = this.width / 2 + Math.sin(node.pulse) * 5;
		});
	}

	drawLifeForce(ctx) {
		const centerX = this.x + this.width / 2;
		const centerY = this.y + this.height / 2;

		ctx.save();
		ctx.translate(centerX, centerY);

		// Draw energy nodes
		this.energyNodes.forEach((node) => {
			const x = Math.cos(node.angle + this.outerRingRotation) * node.radius;
			const y = Math.sin(node.angle + this.outerRingRotation) * node.radius;

			ctx.fillStyle = this.colorCycle[this.colorIndex];
			ctx.beginPath();
			ctx.arc(x, y, 3, 0, Math.PI * 2);
			ctx.fill();

			ctx.globalAlpha = 0.5;
			ctx.beginPath();
			ctx.moveTo(0, 0);
			ctx.lineTo(x, y);
			ctx.strokeStyle = this.colorCycle[this.colorIndex];
			ctx.stroke();
		});

		// Draw core
		ctx.globalAlpha = this.coreGlow;
		ctx.fillStyle = NESPalette.white;
		ctx.beginPath();
		ctx.arc(0, 0, this.coreSize, 0, Math.PI * 2);
		ctx.fill();

		// Draw core glow
		ctx.globalAlpha = this.coreGlow * 0.5;
		const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.coreSize * 2);
		gradient.addColorStop(0, this.colorCycle[this.colorIndex]);
		gradient.addColorStop(1, 'transparent');
		ctx.fillStyle = gradient;
		ctx.beginPath();
		ctx.arc(0, 0, this.coreSize * 2, 0, Math.PI * 2);
		ctx.fill();

		ctx.restore();
	}

	// Space Harrier Effect
	updateSpaceHarrier(timeMultiplier) {
		this.starSpawnTimer += timeMultiplier;

		if (this.starSpawnTimer >= this.starSpawnInterval) {
			this.starSpawnTimer = 0;
			if (this.starTrail.length < this.maxStars) {
				this.starTrail.push({
					x: this.x + this.width / 2 + (Math.random() - 0.5) * 20,
					y: this.y + this.height,
					alpha: 1,
					size: Math.random() * 2 + 1,
					color: this.starColors[Math.floor(Math.random() * this.starColors.length)],
					speedX: (Math.random() - 0.5) * 2,
					speedY: Math.random() * 2 + 1
				});
			}
		}

		this.starTrail.forEach((star, index) => {
			star.x += star.speedX * timeMultiplier;
			star.y += star.speedY * timeMultiplier;
			star.alpha -= 0.02 * timeMultiplier;
			if (star.alpha <= 0) {
				this.starTrail.splice(index, 1);
			}
		});
	}

	drawSpaceHarrier(ctx) {
		this.starTrail.forEach((star) => {
			ctx.save();
			ctx.globalAlpha = star.alpha;
			ctx.fillStyle = star.color;

			// Draw star with trail effect
			ctx.beginPath();
			ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
			ctx.fill();

			// Draw trailing effect
			ctx.globalAlpha = star.alpha * 0.5;
			ctx.beginPath();
			ctx.moveTo(star.x, star.y);
			ctx.lineTo(star.x - star.speedX * 3, star.y - star.speedY * 3);
			ctx.strokeStyle = star.color;
			ctx.lineWidth = star.size;
			ctx.stroke();

			ctx.restore();
		});
	}

	// After Burner Effect
	updateAfterBurner(timeMultiplier) {
		this.traceSpawnTimer += timeMultiplier;

		if (this.traceSpawnTimer >= this.traceSpawnInterval) {
			this.traceSpawnTimer = 0;
			if (this.traceLines.length < this.maxTraceLines) {
				this.traceLines.push({
					x: this.x + this.width / 2,
					y: this.y + this.height,
					width: this.width * 0.8,
					alpha: 1,
					speed: 2 + Math.random(),
					angle: Math.random() * Math.PI * 0.25 - Math.PI * 0.125
				});
			}
		}

		this.traceLines.forEach((line, index) => {
			line.y += line.speed * timeMultiplier;
			line.alpha -= 0.02 * timeMultiplier;
			if (line.alpha <= 0) {
				this.traceLines.splice(index, 1);
			}
		});
	}

	drawAfterBurner(ctx) {
		this.traceLines.forEach((line) => {
			ctx.save();
			ctx.globalAlpha = line.alpha;

			// Create angle-adjusted gradient
			const startX = line.x;
			const startY = line.y;
			const endX = startX + Math.sin(line.angle) * line.width;
			const endY = startY + Math.cos(line.angle) * 20;

			const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
			gradient.addColorStop(0, this.colorCycle[this.colorIndex]);
			gradient.addColorStop(0.5, NESPalette.white);
			gradient.addColorStop(1, 'transparent');

			ctx.beginPath();
			ctx.moveTo(startX, startY);
			ctx.lineTo(endX, endY);
			ctx.strokeStyle = gradient;
			ctx.lineWidth = 3;
			ctx.stroke();

			ctx.restore();
		});
	}

	// Galaxy Force II Effect
	updateGalaxyForce(timeMultiplier) {
		this.fieldRotation += 0.02 * timeMultiplier;
		this.fieldPulse += 0.05 * timeMultiplier;
		this.fieldExpansion = Math.sin(this.fieldPulse) * 5;

		this.fieldParticles.forEach((particle) => {
			particle.pulse += 0.1 * timeMultiplier;
			particle.radius = this.energyFieldRadius + Math.sin(particle.pulse) * 3 + this.fieldExpansion;
		});
	}

	drawGalaxyForce(ctx) {
		const centerX = this.x + this.width / 2;
		const centerY = this.y + this.height / 2;

		ctx.save();
		ctx.translate(centerX, centerY);
		ctx.rotate(this.fieldRotation);

		// Draw energy field connections
		this.fieldParticles.forEach((particle, i) => {
			const nextParticle = this.fieldParticles[(i + 1) % this.fieldParticles.length];

			const x1 = Math.cos(particle.angle) * particle.radius;
			const y1 = Math.sin(particle.angle) * particle.radius;
			const x2 = Math.cos(nextParticle.angle) * nextParticle.radius;
			const y2 = Math.sin(nextParticle.angle) * nextParticle.radius;

			ctx.beginPath();
			ctx.moveTo(x1, y1);
			ctx.lineTo(x2, y2);
			ctx.strokeStyle = this.colorCycle[this.colorIndex];
			ctx.lineWidth = 2;
			ctx.stroke();

			// Draw energy nodes
			ctx.beginPath();
			ctx.arc(x1, y1, 3, 0, Math.PI * 2);
			ctx.fillStyle = NESPalette.white;
			ctx.fill();
		});

		ctx.restore();
	}

	// Contra Spread Effect
	updateContra(timeMultiplier) {
		this.rippleSpawnTimer += timeMultiplier;
		this.rippleRotation += 0.03 * timeMultiplier;

		if (this.rippleSpawnTimer >= this.rippleSpawnInterval) {
			this.rippleSpawnTimer = 0;
			if (this.spreadRipples.length < this.maxRipples) {
				this.spreadRipples.push({
					size: 5,
					alpha: 1,
					angle: Math.random() * Math.PI * 2,
					rotation: Math.random() * Math.PI * 2
				});
			}
		}

		this.spreadRipples.forEach((ripple, index) => {
			ripple.size += 1 * timeMultiplier;
			ripple.alpha -= 0.02 * timeMultiplier;
			ripple.rotation += 0.05 * timeMultiplier;
			if (ripple.alpha <= 0) {
				this.spreadRipples.splice(index, 1);
			}
		});
	}

	drawContra(ctx) {
		const centerX = this.x + this.width / 2;
		const centerY = this.y + this.height / 2;

		this.spreadRipples.forEach((ripple) => {
			ctx.save();
			ctx.translate(centerX, centerY);
			ctx.rotate(ripple.rotation);
			ctx.globalAlpha = ripple.alpha;

			// Draw classic Contra-style diamond pattern
			for (let i = 0; i < 4; i++) {
				ctx.save();
				ctx.rotate((i * Math.PI) / 2);

				ctx.beginPath();
				ctx.moveTo(0, -ripple.size);
				ctx.lineTo(ripple.size * 0.7, 0);
				ctx.lineTo(0, ripple.size);
				ctx.strokeStyle = this.colorCycle[this.colorIndex];
				ctx.lineWidth = 2;
				ctx.stroke();

				ctx.restore();
			}

			ctx.restore();
		});
	}

	// Mega Man Power Surge
	updateMegaMan(timeMultiplier) {
		this.surgePulse += this.surgeSpeed * timeMultiplier;
		this.surgeSize = Math.sin(this.surgePulse) * 10;

		this.surgeBolts.forEach((bolt) => {
			bolt.phase += 0.1 * timeMultiplier;
			bolt.length = 15 + Math.sin(bolt.phase) * 5;
		});

		// Rapid color cycling like classic Mega Man
		if (Math.random() < 0.1) {
			this.colorIndex = (this.colorIndex + 1) % this.colorCycle.length;
		}
	}

	drawMegaMan(ctx) {
		const centerX = this.x + this.width / 2;
		const centerY = this.y + this.height / 2;

		ctx.save();
		ctx.translate(centerX, centerY);

		// Draw energy rings
		for (let i = 0; i < 3; i++) {
			const size = this.surgeSize + i * 10;
			ctx.globalAlpha = 1 - i * 0.2;

			ctx.beginPath();
			ctx.arc(0, 0, Math.abs(size), 0, Math.PI * 2);
			ctx.strokeStyle = this.colorCycle[this.colorIndex];
			ctx.lineWidth = 2;
			ctx.stroke();
		}

		// Draw energy bolts
		this.surgeBolts.forEach((bolt) => {
			const startX = Math.cos(bolt.angle) * (this.surgeSize + 5);
			const startY = Math.sin(bolt.angle) * (this.surgeSize + 5);
			const endX = Math.cos(bolt.angle) * (this.surgeSize + bolt.length);
			const endY = Math.sin(bolt.angle) * (this.surgeSize + bolt.length);

			ctx.beginPath();
			ctx.moveTo(startX, startY);
			ctx.lineTo(endX, endY);
			ctx.strokeStyle = NESPalette.white;
			ctx.lineWidth = 2;
			ctx.stroke();
		});

		ctx.restore();
	}

	// Main update and draw methods
	update(timeMultiplier = 1) {
		// Base updates
		this.y += this.speed * timeMultiplier;
		this.effectAngle += this.rotationSpeed * timeMultiplier;
		this.pulsePhase += this.pulseSpeed * timeMultiplier;

		// Update color cycling
		this.colorTimer++;
		if (this.colorTimer >= this.colorInterval) {
			this.colorTimer = 0;
			this.colorIndex = (this.colorIndex + 1) % this.colorCycle.length;
		}

		// Effect-specific updates
		switch (this.effectType) {
			case 0:
				this.updateThunderForce(timeMultiplier);
				break;
			case 1:
				this.updateRType(timeMultiplier);
				break;
			case 2:
				this.updateDarius(timeMultiplier);
				break;
			case 3:
				this.updateGradius(timeMultiplier);
				break;
			case 4:
				this.updateLifeForce(timeMultiplier);
				break;
			case 5:
				this.updateSpaceHarrier(timeMultiplier);
				break;
			case 6:
				this.updateAfterBurner(timeMultiplier);
				break;
			case 7:
				this.updateGalaxyForce(timeMultiplier);
				break;
			case 8:
				this.updateContra(timeMultiplier);
				break;
			case 9:
				this.updateMegaMan(timeMultiplier);
				break;
		}
	}

	draw(ctx) {
		if (!this.loaded) return;

		ctx.save();

		// Draw effect-specific elements
		switch (this.effectType) {
			case 0:
				this.drawThunderForce(ctx);
				break;
			case 1:
				this.drawRType(ctx);
				break;
			case 2:
				this.drawDarius(ctx);
				break;
			case 3:
				this.drawGradius(ctx);
				break;
			case 4:
				this.drawLifeForce(ctx);
				break;
			case 5:
				this.drawSpaceHarrier(ctx);
				break;
			case 6:
				this.drawAfterBurner(ctx);
				break;
			case 7:
				this.drawGalaxyForce(ctx);
				break;
			case 8:
				this.drawContra(ctx);
				break;
			case 9:
				this.drawMegaMan(ctx);
				break;
		}

		// Draw main sprite
		ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
		ctx.rotate(this.effectAngle);
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
	}
}

// After

class Projectile {
	constructor(x, y, speedY, color = '#FFFFFF') {
		this.x = x;
		this.y = y;
		this.radius = 5;
		this.speedY = SPEED_CONFIG.BASE_PROJECTILE_SPEED;
		this.color = color;
		this.isActive = true;
		this.lifeSpan = 100;
		// Add frame offset for staggered projectile movement
		this.moveDelay = gameFrame % 2; // 2-frame cycle for projectiles
	}

	update() {
		// Classic arcade 2-frame movement cycle for projectiles
		const shouldMove = gameFrame % 2 === this.moveDelay;

		this.radius *= 0.95;
		this.lifeSpan--;
		if (this.lifeSpan <= 0) {
			this.isActive = false;
		}

		// Move only on specific frames for that classic arcade feel
		if (shouldMove) {
			this.y += this.speedY * 2; // Multiply by 2 since we're moving every other frame
		}
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
		ctx.shadowColor = NESPalette.darkGold;
		ctx.beginPath();
		ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}
}

class FloatingText {
	constructor(
		x,
		y,
		text,
		color = NESPalette.orange,
		shadowColor = NESPalette.white,
		duration = 60
	) {
		this.x = x;
		this.y = y;
		this.text = text;
		this.color = color;
		this.shadowColor = shadowColor;
		this.duration = duration;
		this.opacity = 1;
		this.blinkRate = 10;
	}

	update(timeMultiplier = 1) {
		this.y -= 0.5 * timeMultiplier;
		this.opacity -= (1 / this.duration) * timeMultiplier;
		this.duration -= timeMultiplier;
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
		console.error('Assertion failed:', message);
	}
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
	const goldExplosionColors = [NESPalette.lightYellow, NESPalette.lightGold, NESPalette.gold];
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

		// Update the store
		updateGameStore({ lives });

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
	if (!allowAmmoDrop) return;

	// Check if we're still in initial delay
	if (!dropsEnabled && Date.now() - gameStartTime < INITIAL_DROP_DELAY) {
		setTimeout(scheduleRandomAmmoDrop, 1000);
		return;
	}
	dropsEnabled = true;

	setTimeout(
		() => {
			// Add debug logs
			console.log('Checking ammo drop conditions:', {
				heatseekerAmmo: heatseekerAmmo.length,
				enemies: enemies.length,
				heatseekerCount: heatseekerCount
			});

			if (heatseekerAmmo.length === 0 && powerUps.length === 0 && extraLives.length === 0) {
				if (enemies.length > 0 && heatseekerCount < 3) {
					console.log('Conditions met, dropping ammo');
					dropAmmoFromSky();
				}
			}
			scheduleRandomAmmoDrop();
		},
		ammoDropInterval + Math.random() * 2000
	);
}

function scheduleRandomExtraLifeDrop() {
	setTimeout(
		() => {
			// Debug current state
			console.log('Checking extra life drop conditions:', {
				currentLives: lives,
				extraLivesOnScreen: extraLives.length,
				otherItems: {
					heatseekerAmmo: heatseekerAmmo.length,
					powerUps: powerUps.length
				}
			});

			// Only attempt to drop if no other items are on screen
			if (heatseekerAmmo.length === 0 && powerUps.length === 0 && extraLives.length === 0) {
				// Modified condition: Drop if lives are less than max
				if (lives < 3) {
					console.log('Extra life drop conditions met, dropping life');
					dropExtraLife();
				}
			}
			scheduleRandomExtraLifeDrop();
		},
		extraLifeDropInterval + Math.random() * 2000
	);
}

function schedulePowerUpDrops() {
	if (!dropsEnabled && Date.now() - gameStartTime < INITIAL_DROP_DELAY) {
		setTimeout(schedulePowerUpDrops, 1000);
		return;
	}
	dropsEnabled = true;

	setTimeout(
		() => {
			if (heatseekerAmmo.length === 0 && powerUps.length === 0 && extraLives.length === 0) {
				// Increased drop chances
				if (
					(score < 1000 && Math.random() < 0.5) || // Increased from 0.3 to 0.5 for low scores
					(lives === 1 && Math.random() < 0.6) || // Increased from 0.4 to 0.6 when near death
					(heatseekerCount === 0 && Math.random() < 0.7) || // Increased from 0.5 to 0.7 when out of heatseekers
					Math.random() < 0.3 // Added base chance for random drops
				) {
					dropRandomPowerUp();
				}
			}
			schedulePowerUpDrops();
		},
		powerUpDropInterval + Math.random() * 3000
	); // Reduced randomization from 5000 to 3000
}

function dropAmmoFromSky() {
	if (heatseekerAmmo.length < 1) {
		const minX = 100;
		const maxX = canvas.width - 100;
		const ammo = new DroppingCrate();
		ammo.x = Math.random() * (maxX - minX) + minX;

		// Add debug log before pushing
		console.log('Creating new ammo drop:', {
			x: ammo.x,
			y: ammo.y,
			loaded: ammo.loaded,
			spritePath: ammo.spriteImage.src
		});

		heatseekerAmmo.push(ammo);

		// Verify ammo was added
		console.log('Ammo array after push:', {
			length: heatseekerAmmo.length,
			contents: heatseekerAmmo
		});
	}
}

function dropExtraLife() {
	// Remove restrictive conditions
	if (extraLives.length > 0) {
		console.log('Extra life not dropped - one already exists');
		return;
	}

	// Create and position the extra life
	const minX = 100;
	const maxX = canvas.width - 100;
	const extraLife = new ExtraLife();
	extraLife.x = Math.random() * (maxX - minX) + minX;

	// Add logging to track creation
	console.log('Creating new extra life:', {
		x: extraLife.x,
		y: extraLife.y,
		loaded: extraLife.loaded
	});

	extraLives.push(extraLife);

	// Verify it was added
	console.log('Extra lives array after push:', {
		length: extraLives.length,
		contents: extraLives
	});
}

function dropRandomPowerUp() {
	// Remove the powerUps length check to allow multiple power-ups
	const shouldDropPowerUp = score < 1000 || lives === 1 || Math.random() < 0.4; // Added random chance

	if (shouldDropPowerUp) {
		const powerUp = new PowerUp(Math.random() * (canvas.width - 100) + 50, -50);
		powerUps.push(powerUp);
	}
}

function getOptimalPowerUpType() {
	const types = ['invincibility', 'speedBoost', 'unlimitedHeatseekers', 'rapidFire'];

	// Prioritize helpful power-ups based on player state
	if (lives === 1) return 'invincibility';
	if (heatseekerCount === 0) return 'unlimitedHeatseekers';
	if (enemies.length > 4) return 'rapidFire';

	return types[Math.floor(Math.random() * types.length)];
}

function handleExplosions() {
	for (let i = explosions.length - 1; i >= 0; i--) {
		const explosion = explosions[i];
		if (explosion.isActive) {
			ctx.fillStyle = explosion.color || NESPalette.orange;
			ctx.beginPath();
			ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
			ctx.fill();

			// Add glow effect
			ctx.save();
			ctx.globalAlpha = 0.5;
			ctx.fillStyle = NESPalette.lightYellow;
			ctx.beginPath();
			ctx.arc(explosion.x, explosion.y, explosion.radius * 1.2, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
		}
		explosion.update();
		if (!explosion.isActive) {
			explosions.splice(i, 1);
		}
	}
}

function triggerRedFlash() {
	flashEffectActive = true;
	flashColor = `rgba(${parseInt(NESPalette.red.slice(1, 3), 16)}, ${parseInt(NESPalette.red.slice(3, 5), 16)}, ${parseInt(NESPalette.red.slice(5, 7), 16)}, 0.5)`;
	setTimeout(() => {
		flashEffectActive = false;
	}, 200);
}

function activatePowerUp() {
	powerUpActive = true;
	powerUpStartTime = Date.now();

	// Store original values
	const originalSpeed = player.speed;
	const originalHeatseekerCount = heatseekerCount;

	// Activate all power-up effects
	player.isInvincible = true;
	player.speed = 8;
	unlimitedHeatseekersMode = true;
	rapidFireMode = true;

	// Add explosion effect
	createExplosion(
		player.x + player.width / 2,
		player.y + player.height / 2,
		NESPalette.lightYellow,
		50
	);

	// Activate visual effects
	activateGlowEffect();
	floatingTexts.push(new FloatingText(player.x, player.y, 'POWER SURGE!', NESPalette.lightGreen));

	// Set up deactivation timer with longer duration
	if (!constantPowerUpMode) {
		setTimeout(() => {
			player.isInvincible = false;
			player.speed = originalSpeed;
			unlimitedHeatseekersMode = false;
			rapidFireMode = false;
			powerUpActive = false;
			player.glowColor = null;
			heatseekerCount = originalHeatseekerCount;
		}, powerUpDuration);
	}
}

function activateGlowEffect() {
	const colors = [
		NESPalette.coral,
		NESPalette.lightYellow,
		NESPalette.orange,
		NESPalette.cyan,
		NESPalette.deepPurple
	];
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
		return;
	}

	// Background bar
	ctx.fillStyle = NESPalette.darkGray;
	ctx.fillRect(x, y, barWidth, barHeight);

	// Progress bar
	const fillWidth = (barWidth * remainingTime) / powerUpDuration;
	ctx.fillStyle = NESPalette.lightGold;
	ctx.fillRect(x, y, fillWidth, barHeight);

	// Border
	ctx.strokeStyle = NESPalette.darkBlue;
	ctx.lineWidth = 2;
	ctx.strokeRect(x, y, barWidth, barHeight);

	// Text
	ctx.fillStyle = NESPalette.white;
	ctx.font = "16px 'Press Start 2P', cursive";

	// Add pulsing effect when near end
	if (remainingTime < 3000) {
		// Last 3 seconds
		const pulseIntensity = Math.sin(Date.now() / 100) * 0.3 + 0.7;
		ctx.globalAlpha = pulseIntensity;
		ctx.strokeRect(x, y, barWidth, barHeight);
		ctx.globalAlpha = 1.0;
	}
}

function checkPowerUpCollisions() {
	powerUps.forEach((powerUp, index) => {
		if (checkCollision(player, powerUp)) {
			activatePowerUp();
			powerUps.splice(index, 1);
			floatingTexts.push(
				new FloatingText(powerUp.x, powerUp.y, 'POWER SURGE!', NESPalette.lightGreen)
			);
			createGoldExplosion(powerUp.x, powerUp.y, powerUp.width, powerUp.height);
			drawHUD();
		} else {
			projectiles.forEach((projectile, pIndex) => {
				if (checkCollision(projectile, powerUp)) {
					activatePowerUp();
					powerUps.splice(index, 1);
					projectiles.splice(pIndex, 1);
					floatingTexts.push(
						new FloatingText(powerUp.x, powerUp.y, 'POWER SURGE!', NESPalette.lightGreen)
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
		newGameMechanicsSprite.complete,
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
	// Debug current state with more detail
	console.log('Handle dropping items - Current state:', {
		heatseekerAmmo: {
			length: heatseekerAmmo.length,
			items: heatseekerAmmo.map((item) => ({
				x: item?.x,
				y: item?.y,
				loaded: item?.loaded
			}))
		},
		powerUps: powerUps.length,
		extraLives: extraLives.length
	});

	heatseekerAmmo.forEach((ammo, index) => {
		// Add position logging
		console.log(`Updating ammo ${index}:`, {
			x: ammo.x,
			y: ammo.y,
			beforeUpdate: true
		});

		ammo.update();
		ammo.draw(ctx);

		console.log(`After update ammo ${index}:`, {
			x: ammo.x,
			y: ammo.y,
			afterUpdate: true
		});

		if (ammo.y > canvas.height) {
			console.log(`Removing ammo ${index} - off screen`);
			heatseekerAmmo.splice(index, 1);
		}
	});

	// Update and draw extra lives
	extraLives.forEach((life, index) => {
		life.update();
		life.draw(ctx);
		if (life.y > canvas.height) {
			extraLives.splice(index, 1);
		}
	});

	// Update and draw power-ups
	powerUps.forEach((powerUp, index) => {
		powerUp.update();
		powerUp.draw(ctx);
		if (powerUp.y > canvas.height) {
			powerUps.splice(index, 1);
		}
	});
}

function adjustDifficulty() {
	if (score >= difficultyIncreaseScore) {
		// Calculate progression stage
		const progressionStage = Math.floor(
			(score - ENEMY_CONFIG.DIFFICULTY_SCALE_START) / ENEMY_CONFIG.DIFFICULTY_SCALE_INTERVAL
		);

		// Gradually increase enemy count
		maxEnemies = Math.min(
			ENEMY_CONFIG.INITIAL_MAX_ENEMIES + progressionStage,
			ENEMY_CONFIG.MAX_ENEMIES_CAP
		);

		// Decrease spawn interval with diminishing returns
		enemyInterval = Math.max(
			ENEMY_CONFIG.INITIAL_SPAWN_RATE * Math.pow(0.85, progressionStage),
			ENEMY_CONFIG.MIN_SPAWN_INTERVAL
		);

		// Update difficulty threshold
		difficultyIncreaseScore += ENEMY_CONFIG.DIFFICULTY_SCALE_INTERVAL;

		// Scale enemy attributes
		enemies.forEach((enemy) => {
			enemy.speed = Math.min(enemy.speed * 1.1, 2); // Cap speed increase
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
			projectile.update(timeMultiplier, enemies); // Pass the enemies array
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

function shakeScreen(duration, magnitude) {
	const canvas = document.getElementById('gameCanvas');
	const container = canvas.parentElement;
	const startTime = Date.now();
	const originalTransform = container.style.transform || '';

	const shake = () => {
		const elapsedTime = Date.now() - startTime;
		if (elapsedTime < duration) {
			const x = (Math.random() - 0.5) * magnitude * 1.5;
			const y = (Math.random() - 0.5) * magnitude * 1.5;
			container.style.transform = `translate(${x}px, ${y}px)`;
			requestAnimationFrame(shake);
		} else {
			container.style.transform = originalTransform;
		}
	};

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
	if (!gameActive) return;

	// Clear the HUD area and draw background
	ctx.clearRect(0, 0, canvas.width, 30);
	ctx.fillStyle = NESPalette.royalBlue;
	ctx.fillRect(0, 0, canvas.width, 30);

	// Set up text styling
	ctx.font = "16px 'Press Start 2P', cursive";
	ctx.fillStyle = NESPalette.lightGold;
	ctx.textBaseline = 'middle'; // Center text vertically

	// Calculate positions for three evenly spaced elements
	const padding = 8; // Left/right padding
	const hudHeight = 30; // Height of HUD bar
	const textY = hudHeight / 2; // Vertical center position

	// Left element - Score
	ctx.textAlign = 'left';
	ctx.fillText(`Score:${score}`, padding, textY);

	// Center element - Heatseekers
	ctx.textAlign = 'center';
	const heatseekerText = unlimitedHeatseekersMode
		? 'Heatseekers:Unlimited'
		: `Heatseekers:${heatseekerCount}`;
	ctx.fillText(heatseekerText, canvas.width / 2, textY);

	// Right element - Lives
	ctx.textAlign = 'right';
	ctx.fillText(`Lives:${lives}`, canvas.width - padding, textY);

	// Update the store with current game state values
	updateGameStore({
		score,
		highScore,
		lives,
		heatseekerCount: unlimitedHeatseekersMode ? 'unlimited' : heatseekerCount,
		gameActive,
		isPaused
	});

	// Draw power-up bar if active
	drawPowerUpBar();

	// Reset text alignment for other drawing operations
	ctx.textAlign = 'left';
	ctx.textBaseline = 'alphabetic';
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
function hasVisibleEnemies() {
	return enemies.some(
		(enemy) => enemy.y >= 0 && enemy.y <= canvas.height && enemy.x >= 0 && enemy.x <= canvas.width
	);
}

function interpolateColor(color1, color2, factor) {
	// Ensure the colors exist in the NESPalette
	if (!color1 || !color2) {
		console.error('Invalid colors provided to interpolateColor:', color1, color2);
		return NESPalette.black; // Return a default color if input is invalid
	}

	// Convert hex to RGB components
	const r1 = parseInt(color1.slice(1, 3), 16);
	const g1 = parseInt(color1.slice(3, 5), 16);
	const b1 = parseInt(color1.slice(5, 7), 16);

	const r2 = parseInt(color2.slice(1, 3), 16);
	const g2 = parseInt(color2.slice(3, 5), 16);
	const b2 = parseInt(color2.slice(5, 7), 16);

	// Interpolate between the colors
	const r = Math.round(r1 + (r2 - r1) * factor);
	const g = Math.round(g1 + (g2 - g1) * factor);
	const b = Math.round(b1 + (b2 - b1) * factor);

	// Convert back to hex
	return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function drawDynamicGradientSky() {
	let gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);

	if (skyFlashActive) {
		gradient.addColorStop(0, NESPalette.white);
		gradient.addColorStop(1, NESPalette.lightYellow);
	} else if (dayNightCycle < 90) {
		// Night to sunrise
		let progress = dayNightCycle / 90;
		gradient.addColorStop(0, interpolateColor(NESPalette.deepOcean, NESPalette.orange, progress));
		gradient.addColorStop(1, NESPalette.navyBlue);
	} else if (dayNightCycle < 180) {
		// Sunrise to day
		let progress = (dayNightCycle - 90) / 90;
		gradient.addColorStop(
			0,
			interpolateColor(NESPalette.orange, NESPalette.lightestBlue, progress)
		);
		gradient.addColorStop(1, NESPalette.lightestBlue);
	} else if (dayNightCycle < 270) {
		// Day to sunset
		let progress = (dayNightCycle - 180) / 90;
		gradient.addColorStop(0, interpolateColor(NESPalette.lightestBlue, NESPalette.coral, progress));
		gradient.addColorStop(1, NESPalette.coral);
	} else {
		// Sunset to night
		let progress = (dayNightCycle - 270) / 90;
		gradient.addColorStop(0, interpolateColor(NESPalette.coral, NESPalette.deepOcean, progress));
		gradient.addColorStop(1, NESPalette.navyBlue);
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

function drawShootingStar() {
	ctx.strokeStyle = NESPalette.white;
	ctx.beginPath();
	ctx.moveTo(this.x, this.y);
	ctx.lineTo(this.x + this.length, this.y - this.length);
	ctx.stroke();
}

// Modify the drawGameOverScreen function to implement proper arcade-style vertical centering
function drawGameOverScreen() {
	gameOverScreen = true;

	// Update the store
	updateGameStore({
		gameActive: false,
		isGameOver: true
	});

	// Fill background
	ctx.fillStyle = NESPalette.black;
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	// Calculate vertical center point and spacing
	const centerY = canvas.height / 2;
	const lineHeight = 40; // Classic arcade spacing
	const totalLines = 4; // Total number of text lines
	const totalHeight = lineHeight * (totalLines - 1);
	const startY = centerY - totalHeight / 2;

	// Game Over Text
	ctx.fillStyle = NESPalette.red;
	ctx.font = "28px 'Press Start 2P', cursive";
	ctx.textAlign = 'center';
	ctx.fillText('GAME OVER', canvas.width / 2, startY);

	// Score
	ctx.font = "20px 'Press Start 2P', cursive";
	ctx.fillStyle = NESPalette.white;
	ctx.fillText(`Score: ${score}`, canvas.width / 2, startY + lineHeight);

	// High Score
	highScore = Math.max(score, highScore);
	ctx.fillText(`High Score: ${highScore}`, canvas.width / 2, startY + lineHeight * 2);

	// Press Enter Text (with classic arcade blink effect)
	if (Math.floor(Date.now() / 500) % 2 === 0) {
		ctx.font = "16px 'Press Start 2P', cursive";
		ctx.fillText('Press Enter to restart', canvas.width / 2, startY + lineHeight * 3);
	}
}

function initializeTimingSystem() {
	// Reset all timing-related variables
	lastFrameTime = performance.now();
	deltaTime = TIMING_CONFIG.FRAME_TIME;
	timeMultiplier = 1;
	cappedMultiplier = 1;
	gameSpeed = 1;

	// Clear any existing animation frame
	if (animationFrameId) {
		cancelAnimationFrame(animationFrameId);
		animationFrameId = null;
	}
}

function resetGame() {
	initializeTimingSystem();

	// Reset core game state
	score = 0;
	lives = 3;
	gameFrame = 0;
	enemyInterval = initialEnemySpawnRate;
	difficultyIncreaseScore = 500;
	heatseekerCount = 3;
	gameActive = true;
	titleScreen = false;
	gameOverScreen = false;
	isPaused = false;

	// Update the store
	updateGameStore({
		score,
		lives,
		heatseekerCount,
		gameActive,
		isGameOver: false,
		isPaused
	});

	if (animationFrameId) {
		cancelAnimationFrame(animationFrameId);
		animationFrameId = null;
	}

	// Single timing system reset - moved outside the if block
	lastFrameTime = performance.now();
	deltaTime = TIMING_CONFIG.FRAME_TIME;
	timeMultiplier = 1;
	cappedMultiplier = 1;
	gameSpeed = 1;

	// Clear all game arrays
	enemies = [];
	projectiles = [];
	explosions = [];
	comets = [];
	shootingStars = [];
	enemyProjectiles = [];
	heatseekerAmmo = [];
	powerUps = [];
	extraLives = [];
	particles = [];
	floatingTexts = [];

	// Reset power-up states
	powerUpActive = false;
	powerUpType = '';
	powerUpStartTime = 0;
	constantPowerUpMode = false;
	unlimitedHeatseekersMode = false;
	rapidFireMode = false;

	// Reset player state
	player.x = canvas.width / 2 - player.width / 2;
	player.y = canvas.height - player.height - 5;
	player.isInvincible = false;
	player.speed = 4;
	player.glowColor = null;

	// Reset game cycle timers
	lastVelaShotTime = Date.now();
	dayNightCycle = 180;

	// Reinitialize game components
	initializeCityFires();
	initializeClouds();
	initializeStars();
	smokeParticlePool = new ParticlePool(100);

	// Reschedule game events
	gameStartTime = Date.now();
	dropsEnabled = false;
	scheduleRandomAmmoDrop();
	scheduleRandomExtraLifeDrop();
	schedulePowerUpDrops();

	// Update HUD and start animation
	drawHUD();
	animate();

	console.log('Game reset complete');

	if (gameActive && !isPaused) {
		// Ensure we're starting fresh
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
		}
		// Request a new frame after a short delay to ensure timing system is stable
		setTimeout(() => {
			lastFrameTime = performance.now();
			animationFrameId = requestAnimationFrame(animate);
		}, 16); // One frame duration
	}
}

function handleFloatingTexts() {
	floatingTexts.forEach((text, index) => {
		text.update();
		if (text.text.includes('+')) {
			text.color = NESPalette.lightGreen; // Positive effects in green
		} else if (text.text.includes('-')) {
			text.color = NESPalette.red; // Negative effects in red
		}
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
		this.speed = SPEED_CONFIG.BASE_ENEMY_SPEED;
		this.shootingInterval = 150;
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
		this.arcadePhysics = {
			bounceHeight: Math.random() * 3 + 2,
			bounceSpeed: Math.random() * 0.05 + 0.02,
			bouncePhase: Math.random() * Math.PI * 2,
			wobbleAmount: Math.random() * 2 + 1,
			pauseInterval: Math.floor(Math.random() * 120) + 60,
			pauseTimer: 0,
			isPaused: false,
			pauseDuration: Math.floor(Math.random() * 30) + 15,
			lastDirectionChange: 0,
			directionChangeInterval: Math.floor(Math.random() * 90) + 30
		};
		this.spriteImage = new Image();
		this.spriteImage.src = getAssetPath('assets/images/game/void_swarm_sprite.png');
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

	update(timeMultiplier = 1) {
		const adjustedSpeed = this.speed * timeMultiplier;
		const adjustedDiveSpeed = this.diveSpeed * timeMultiplier;

		// Arcade-style movement pattern: occasional pauses
		if (this.arcadePhysics.pauseTimer >= this.arcadePhysics.pauseInterval) {
			this.arcadePhysics.isPaused = true;
			this.arcadePhysics.pauseTimer = 0;
		} else if (this.arcadePhysics.isPaused) {
			this.arcadePhysics.pauseDuration--;
			if (this.arcadePhysics.pauseDuration <= 0) {
				this.arcadePhysics.isPaused = false;
				this.arcadePhysics.pauseDuration = Math.floor(Math.random() * 30) + 15;
			}
			// During pause, just animate wings but don't move
			this.animateWings();
			return;
		}

		this.arcadePhysics.pauseTimer++;

		// Reference to gameFrame for sync
		const shouldMove = gameFrame % (4 + (this.moveDelay || 0)) === 0;

		if (this.y < 0) {
			// Initial entry movement is smooth and always happens
			this.y += 2 * timeMultiplier;
		} else if (shouldMove && !this.arcadePhysics.isPaused) {
			// Apply classic arcade movement patterns with more personality
			switch (this.patternIndex) {
				case 0: // Classic Galaga-style curved entry with bounce
					this.y += adjustedSpeed;
					this.x += Math.sin(gameFrame * 0.02) * 2 * timeMultiplier;
					// Add vertical bounce for personality
					this.y +=
						Math.sin(gameFrame * this.arcadePhysics.bounceSpeed) *
						this.arcadePhysics.bounceHeight *
						timeMultiplier;
					break;

				case 1: // Figure-8 pattern with hesitation
					const t = gameFrame * 0.02;
					// Add occasional direction change hesitation
					if (
						gameFrame - this.arcadePhysics.lastDirectionChange >
						this.arcadePhysics.directionChangeInterval
					) {
						this.arcadePhysics.lastDirectionChange = gameFrame;
						// Brief pause at pattern inflection points
						if (Math.random() < 0.3) {
							this.arcadePhysics.isPaused = true;
							this.arcadePhysics.pauseDuration = Math.floor(Math.random() * 10) + 5;
						}
					}
					this.x += Math.sin(t) * 2 * timeMultiplier;
					this.y += Math.sin(t * 2) * timeMultiplier;
					break;

				case 2: // Gradius-style wave pattern with wobble
					this.y += adjustedSpeed * 0.5;
					// Add a secondary wobble for more organic movement
					this.x +=
						Math.sin(this.y * 0.02) * 3 * timeMultiplier +
						Math.sin(gameFrame * 0.1) * this.arcadePhysics.wobbleAmount * 0.3 * timeMultiplier;
					break;

				case 3: // R-Type dive attack with arcade-style targeting
					if (this.y < canvas.height / 3) {
						this.y += adjustedSpeed;
					} else {
						// More arcade-like targeting with overshooting and correction
						const dx = player.x - this.x;
						const dy = player.y - this.y;
						const angle = Math.atan2(dy, dx);

						// Add intentional overshoot like classic games
						const overcompensation = Math.sin(gameFrame * 0.05) * 0.5 + 1;

						this.x += Math.cos(angle) * adjustedSpeed * 1.5 * overcompensation;
						this.y += Math.sin(angle) * adjustedSpeed * 1.5;
					}
					break;
			}
		}

		// Handle explosion animation
		if (this.isExploding) {
			this.handleExplosion(timeMultiplier);
			return;
		}

		// Handle aggressive state effects
		this.handleAggressiveEffects(timeMultiplier);

		// Handle animation and shooting
		this.animateWings();
		this.handleShooting(timeMultiplier);
	}

	// Helper methods to keep update() clean
	handleExplosion(timeMultiplier) {
		this.explosionFrame++;
		if (this.explosionFrame > this.numberOfExplosionFrames) {
			this.toBeRemoved = true;
		}

		for (let i = 0; i < 50; i++) {
			let color = `rgba(${255 - Math.random() * 128}, ${Math.random() * 100}, 0, 1)`;
			particles.push(new Particle(this.x + this.width / 2, this.y + this.height / 2, color));
		}
		this.toBeRemoved = true;
		shakeScreen(300, 10);
	}

	handleAggressiveEffects(timeMultiplier) {
		if (this.isAggressive) {
			const particleCount = Math.floor(Math.random() * 3) + 8;

			for (let i = 0; i < particleCount; i++) {
				const colors = [
					NESPalette.orange,
					NESPalette.darkOrange,
					NESPalette.lightOrange,
					NESPalette.darkGold,
					NESPalette.gold
				];

				const color = colors[Math.floor(Math.random() * colors.length)];

				const particle = new Particle(
					this.x + this.width / 2 + (Math.random() - 0.5) * 6,
					this.y + this.height / 2 + (Math.random() - 0.5) * 6,
					color
				);

				particle.size = Math.random() * 1.2 + 0.6;
				particle.speedX = (Math.random() - 0.5) * 2;
				particle.speedY = (Math.random() - 0.5) * 2;
				particle.lifespan = 80 + Math.random() * 40;

				particles.push(particle);
			}
		}

		this.fireParticles.forEach((particle, index) => {
			particle.update(timeMultiplier);
			if (particle.lifespan <= 0) {
				this.fireParticles.splice(index, 1);
			}
		});

		if (this.isAggressive) {
			this.speed += 0.1 * timeMultiplier;
			this.diveSpeed += 0.2 * timeMultiplier;
			this.curveAmplitude += 0.5 * timeMultiplier;
			this.curveFrequency += 0.005 * timeMultiplier;
		}
	}

	animateWings() {
		if (this.flapSpeed === 0) {
			this.flapSpeed = Math.floor(Math.random() * 10 + 5);
			this.frameX = (this.frameX + 1) % this.maxFrames;
		} else {
			this.flapSpeed--;
		}
	}

	handleShooting(timeMultiplier) {
		// Arcade-style shot pattern: more shots when aggressive
		const shotChance = this.isAggressive ? 0.008 : 0.003;

		if (Math.random() < shotChance * timeMultiplier) {
			// Create 1-3 bullets in a spread pattern for more arcade feel
			const bulletCount = this.isAggressive ? (Math.random() < 0.3 ? 3 : 1) : 1;

			for (let i = 0; i < bulletCount; i++) {
				const spread = (i - (bulletCount - 1) / 2) * 15; // Spread angle in degrees
				const radians = (spread * Math.PI) / 180;

				// Create projectile with angle offset for spread
				const projectile = new AnimatedProjectile(this.x + this.width / 2 - 6.5, this.y, true);

				// Apply spread angle if multiple bullets
				if (bulletCount > 1) {
					projectile.angle = Math.PI / 2 + radians;
				}

				enemyProjectiles.push(projectile);
			}
		}
	}

	draw(ctx) {
		this.enhancedDraw(ctx);
	}

	// Enhance the draw method with personality
	enhancedDraw(ctx) {
		if (this.isExploding) {
			// Explosion animation with screen shake based on frame
			let explosionFrameIndex = 6 + (this.explosionFrame - 1);
			if (explosionFrameIndex > 8) explosionFrameIndex = 8;

			// Add slight rotation during explosion for more impact
			ctx.save();
			ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
			ctx.rotate((Math.random() - 0.5) * 0.2); // Slight random rotation

			ctx.drawImage(
				this.spriteImage,
				explosionFrameIndex * this.spriteWidth,
				0,
				this.spriteWidth,
				this.spriteHeight,
				-this.width / 2,
				-this.height / 2,
				this.width,
				this.height
			);
			ctx.restore();
		} else if (this.isAggressive) {
			// Handle aggressive flight animation with extra effects
			let aggressiveFrameIndex = 2 + (this.frameX % 2);

			// Add "angry" shake and pulsing for aggressive enemies
			const angerShake = (Math.random() - 0.5) * 2;
			const pulseFactor = 1 + Math.sin(gameFrame * 0.1) * 0.05; // Subtle size pulse

			ctx.save();
			ctx.translate(this.x + this.width / 2 + angerShake, this.y + this.height / 2);
			ctx.scale(pulseFactor, pulseFactor);

			ctx.drawImage(
				this.spriteImage,
				aggressiveFrameIndex * this.spriteWidth,
				0,
				this.spriteWidth,
				this.spriteHeight,
				-this.width / 2,
				-this.height / 2,
				this.width,
				this.height
			);
			ctx.restore();
		} else {
			// Normal flight animation with subtle bobbing
			let normalFrameIndex = this.frameX % 2;

			// Add subtle vertical bobbing common in arcade games
			const bob = Math.sin(gameFrame * 0.08) * 1.5;

			ctx.save();
			ctx.translate(this.x + this.width / 2, this.y + this.height / 2 + bob);

			ctx.drawImage(
				this.spriteImage,
				normalFrameIndex * this.spriteWidth,
				0,
				this.spriteWidth,
				this.spriteHeight,
				-this.width / 2,
				-this.height / 2,
				this.width,
				this.height
			);
			ctx.restore();
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
		this.y = canvas.height + 65; // Start below the canvas
		this.width = 65;
		this.height = 65;
		this.speed = 0.5;
		this.scale = 0.2; // Start smaller for better background effect
		this.targetX = Math.random() * canvas.width;
		this.targetY = Math.random() * (canvas.height / 2);
		this.isReady = false;
		this.isAggressive = false;
		this.toBeRemoved = false;
		this.spriteImage = new Image();
		this.spriteImage.src = getAssetPath('assets/images/game/void_swarm_sprite.png');
		this.spriteImage.onload = () => {
			console.log('CityEnemy sprite loaded successfully');
		};

		this.spriteImage.onerror = (error) => {
			console.error('CityEnemy sprite failed to load:', error);
		};
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

		console.log('=== CityEnemy Created ===', {
			position: { x: this.x, y: this.y },
			target: { x: this.targetX, y: this.targetY },
			dimensions: { width: this.width, height: this.height },
			speed: this.speed,
			scale: this.scale
		});
	}

	update(timeMultiplier = 1) {
		const adjustedSpeed = this.speed * timeMultiplier;

		if (!this.isReady) {
			// Add a slight horizontal sway during initial approach
			this.y -= adjustedSpeed;
			this.x += Math.sin(gameFrame * 0.05) * 0.5 * timeMultiplier;

			if (this.y <= this.targetY) {
				this.isReady = true;
				this.init = true;

				// Arcade classic: pause briefly when reaching position
				setTimeout(() => {
					// Play a brief "lock-on" animation here if needed
					this.canShoot = true;
				}, 500);
			}
		} else {
			if (this.init) {
				// Apply classic arcade targeting with overshooting and correction
				let angle = Math.atan2(player.y - this.y, player.x - this.x);

				// Add intentional "Mario Bros enemy" style movement:
				// 1. Move in pulses rather than continuously
				if (gameFrame % 3 === 0) {
					// Calculate desired movement
					const desiredX = this.x + Math.cos(angle) * adjustedSpeed * 1.5;
					const desiredY = this.y + Math.sin(angle) * adjustedSpeed * 1.5;

					// Apply "overshoot and return" behavior
					if (Math.random() < 0.05) {
						// Occasionally overshoot (mimic classic enemy AI mistakes)
						this.x = desiredX + (Math.random() - 0.5) * 10;
						this.y = desiredY + (Math.random() - 0.5) * 10;
					} else {
						// Normal movement
						this.x = desiredX;
						this.y = desiredY;
					}
				}

				// 2. Add "hesitation" by occasionally pausing
				if (Math.random() < 0.01) {
					// Create a brief pause, typical in arcade games
					this.init = false;
					setTimeout(
						() => {
							this.init = true;
						},
						300 + Math.random() * 300
					);
				}

				// Scale up gradually with slight bouncing effect
				const targetScale = 1;
				const scaleStep = 0.01 * timeMultiplier;
				const bounce = Math.sin(gameFrame * 0.1) * 0.03; // Small bounce

				this.scale =
					Math.min(targetScale, this.scale + scaleStep) + (this.scale > 0.5 ? bounce : 0);

				if (this.scale >= 0.95) {
					this.canShoot = true;
				}

				if (this.y < 0 || this.x < 0 || this.x > canvas.width || this.y > canvas.height) {
					this.toBeRemoved = true;
				}
			}
		}

		// Handle aggressive effects
		if (this.isAggressive) {
			for (let i = 0; i < 5; i++) {
				this.fireParticles.push(new FireParticle(this.x, this.y));
			}
		}

		// Update fire particles
		this.fireParticles.forEach((particle, index) => {
			particle.update(timeMultiplier);
			if (particle.opacity <= 0) {
				this.fireParticles.splice(index, 1);
			}
		});

		// Animate sprite frames
		this.frameTimer++;
		if (this.frameTimer >= this.frameInterval) {
			// Add random slight pauses in animation for personality
			if (Math.random() < 0.1) {
				// Hold current frame slightly longer
				this.frameTimer = this.frameInterval - 2;
			} else {
				if (this.isAggressive) {
					this.frameX = this.frameX === 3 ? 4 : 3;
				} else {
					this.frameX = this.frameX === 0 ? 1 : 0;
				}
				this.frameTimer = 0;
			}
		}

		// Handle explosion animation
		if (this.isExploding) {
			this.frameX = this.explosionFrame + 5;
			this.explosionFrame++;
			if (this.explosionFrame > 2) {
				this.toBeRemoved = true;
			}
		}

		// Handle shooting
		if (this.isReady && !this.isExploding && this.canShoot) {
			if (gameFrame - this.lastShotFrame > this.shootingInterval) {
				// Classic arcade "telegraph" shooting
				if (!this.isTelegraphing) {
					// Show "about to shoot" state
					this.isTelegraphing = true;

					// Flash briefly before shooting (classic arcade telegraph)
					const originalFrameX = this.frameX;
					this.frameX = this.isAggressive ? 4 : 1; // Use fully open state

					setTimeout(() => {
						// Fire after telegraph
						enemyProjectiles.push(
							new AnimatedProjectile(this.x + this.width / 2, this.y, true, false, this)
						);
						this.lastShotFrame = gameFrame;
						this.isTelegraphing = false;
						this.frameX = originalFrameX;
					}, 200);
				}
			}
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

	update(timeMultiplier = 1) {
		// Apply unique zigzag pattern with classic arcade timing
		if (this.patternIndex === 4) {
			// Move only every few frames to create classic arcade staggered movement
			if (gameFrame % 3 === 0) {
				this.y += this.speed * 1.4 * timeMultiplier;

				// Classic zigzag with variable amplitude
				const baseAmplitude = 2;
				const variableAmplitude = Math.sin(gameFrame * 0.02) * baseAmplitude;
				const zigzagFactor = Math.sin(this.y / 10);

				this.x += zigzagFactor * (baseAmplitude + Math.abs(variableAmplitude)) * timeMultiplier;

				// Occasionally make sharp turns like classic arcade enemies
				if (Math.random() < 0.01) {
					this.x += (Math.random() < 0.5 ? -1 : 1) * 5 * timeMultiplier;
				}

				// Quick direction reversal for personality
				if (Math.random() < 0.005) {
					this.speed *= -0.8; // Reverse with slight slowdown
					setTimeout(() => {
						this.speed *= -1.25; // Return to normal with slight boost
					}, 300);
				}
			}
		}

		// Call the parent class update for standard behaviors
		super.update(timeMultiplier);
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
			this.constructor.spriteSheet.src = `./assets/images/game/projectile_main_sprite.png`;
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

	update(timeMultiplier = 1, enemies) {
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
					Math.min(this.turnSpeed * timeMultiplier, Math.abs(desiredAngle - this.angle));
			}
		}
		const adjustedSpeed = this.speed * timeMultiplier;
		this.x += Math.cos(this.angle) * adjustedSpeed;
		this.y += Math.sin(this.angle) * adjustedSpeed;

		if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
			this.isActive = false;
		}

		this.tick += timeMultiplier;
		if (this.tick > this.ticksPerFrame) {
			this.tick = 0;
			this.frameIndex = (this.frameIndex + 1) % this.numFrames;
		}

		// Add this inside the update method
		if (this.enemyShot) {
			this.fireballEffects.push(new FireballEffect(this.x, this.y));
		}

		this.fireballEffects.forEach((effect) => effect.update(timeMultiplier));
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

function shoot(isHeatseeker = false, isPowerUp = false) {
	const currentTime = Date.now();
	const currentCooldown = rapidFireMode ? velaShootingCooldown / 2 : velaShootingCooldown;

	if (currentTime - lastVelaShotTime < currentCooldown) {
		return;
	}

	const projectileX = player.x + player.width / 2;
	const projectileY = player.y;

	let newProjectile;

	if (isHeatseeker) {
		// Only create heatseeker if we have ammo or unlimited mode
		if (unlimitedHeatseekersMode || heatseekerCount > 0) {
			newProjectile = new HeatseekerProjectile(projectileX, projectileY);
			// Only deduct ammo if not in unlimited mode
			if (!unlimitedHeatseekersMode) {
				heatseekerCount = Math.max(0, heatseekerCount - 1); // Prevent negative count

				// Update the store with new heatseeker count
				updateGameStore({ heatseekerCount });

				// Add floating text for remaining heatseekers
				if (heatseekerCount === 0) {
					floatingTexts.push(
						new FloatingText(
							player.x + player.width / 2,
							player.y - 20,
							'Out of Heat Seekers!',
							NESPalette.red,
							NESPalette.white,
							90
						)
					);
				} else {
					floatingTexts.push(
						new FloatingText(
							player.x + player.width / 2,
							player.y - 20,
							`Heat Seekers: ${heatseekerCount}`,
							NESPalette.lightOrange,
							NESPalette.white,
							90
						)
					);
				}

				drawHUD(); // Update HUD when ammo changes
			} else {
				// Show "Unlimited" text when in unlimited mode
				floatingTexts.push(
					new FloatingText(
						player.x + player.width / 2,
						player.y - 20,
						'Heat Seeker',
						NESPalette.lightGold,
						NESPalette.white,
						60
					)
				);
			}
		} else {
			// Add floating text when out of heat seekers
			floatingTexts.push(
				new FloatingText(
					player.x + player.width / 2,
					player.y - 20,
					'No Heat Seekers!',
					NESPalette.red,
					NESPalette.white,
					60
				)
			);
			return; // Exit if no heatseekers available
		}
	} else {
		newProjectile = new AnimatedProjectile(projectileX, projectileY, false, false, isPowerUp);
	}

	// Add trail effect for regular shots
	if (!isHeatseeker) {
		for (let i = 0; i < 3; i++) {
			particles.push(new TrailParticle(projectileX, projectileY));
		}
	}

	projectiles.push(newProjectile);
	lastVelaShotTime = currentTime;
}

class HeatseekerProjectile extends AnimatedProjectile {
	constructor(x, y) {
		super(x, y, false, true);
		this.trailParticles = [];
		this.maxSpeed = 12;
		this.baseSpeed = 5;
		this.acceleration = 0.3;
		this.targetLockSpeed = 0.08;
		this.searchTurnSpeed = 0.03;
		this.distanceThreshold = 150;
		this.maxTurnRate = Math.PI / 32;
		this.stopped = false;
		this.lockOnDelay = 10;
		this.lockOnTimer = 0;
		this.heatseekerCounted = false; // Flag to ensure ammo is only counted once
	}

	findClosestTarget(enemies = []) {
		if (!Array.isArray(enemies)) {
			console.warn('Invalid enemies array provided to findClosestTarget');
			return null;
		}

		let closestEnemy = null;
		let closestDistance = Infinity;

		enemies.forEach((enemy) => {
			// Skip invalid enemies or background CityEnemy instances
			if (
				!enemy ||
				typeof enemy.x === 'undefined' ||
				typeof enemy.y === 'undefined' ||
				(enemy instanceof CityEnemy && enemy.scale < 1)
			) {
				return;
			}

			let distance = Math.hypot(enemy.x - this.x, enemy.y - this.y);
			if (distance < closestDistance) {
				closestDistance = distance;
				closestEnemy = enemy;
			}
		});

		return closestEnemy;
	}

	update(timeMultiplier = 1, enemies = []) {
		if (this.lockOnTimer < this.lockOnDelay) {
			this.lockOnTimer++;
			this.y -= 2;
			this.createTrail();
			this.updateTrailParticles(timeMultiplier);
			return;
		}

		if (this.isHeatseeker) {
			// Refresh target if current one is invalid or in background
			if (
				!this.lockedOnTarget ||
				!this.lockedOnTarget.isActive ||
				(this.lockedOnTarget instanceof CityEnemy && this.lockedOnTarget.scale < 1)
			) {
				this.lockedOnTarget = this.findClosestTarget(enemies);
				this.turnSpeed = this.searchTurnSpeed;
			}

			if (this.lockedOnTarget) {
				if (
					typeof this.lockedOnTarget.x !== 'undefined' &&
					typeof this.lockedOnTarget.y !== 'undefined' &&
					this.lockedOnTarget.x >= 0 &&
					this.lockedOnTarget.x <= canvas.width &&
					this.lockedOnTarget.y >= 0 &&
					this.lockedOnTarget.y <= canvas.height
				) {
					// If the target is on screen, continue tracking
					this.stopped = false;
					this.turnSpeed = this.targetLockSpeed;

					// Calculate distance to target
					const dx = this.lockedOnTarget.x - this.x;
					const dy = this.lockedOnTarget.y - this.y;
					const distance = Math.sqrt(dx * dx + dy * dy);

					// Dynamic speed based on distance
					if (distance < this.distanceThreshold) {
						this.speed = Math.min(
							this.speed + this.acceleration * 2 * timeMultiplier,
							this.maxSpeed
						);
					} else {
						this.speed = Math.min(this.speed + this.acceleration * timeMultiplier, this.baseSpeed);
					}

					let desiredAngle = Math.atan2(
						this.lockedOnTarget.y - this.y,
						this.lockedOnTarget.x - this.x
					);

					// Smoother turning with max turn rate
					let angleDiff = desiredAngle - this.angle;
					angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
					const turnAmount =
						Math.min(Math.abs(angleDiff), this.maxTurnRate * timeMultiplier) * Math.sign(angleDiff);

					this.angle += turnAmount;

					if (Math.random() < 0.1) {
						this.speed = this.maxSpeed * (0.5 + Math.random() * 0.5);
					}

					// Add subtle flight patterns
					const adjustedSpeed = this.speed * timeMultiplier;
					this.x +=
						Math.cos(this.angle) * adjustedSpeed + Math.sin(gameFrame * 0.1) * 2 * timeMultiplier;
					this.y +=
						Math.sin(this.angle) * adjustedSpeed + Math.cos(gameFrame * 0.1) * 2 * timeMultiplier;
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

		this.tick += timeMultiplier;
		if (this.tick > this.ticksPerFrame) {
			this.tick = 0;
			this.frameIndex = (this.frameIndex + 1) % this.numFrames;
		}

		if (!this.stopped) {
			this.createTrail(); // Create vapor trail particles only if not stopped
		}
		this.updateTrailParticles(timeMultiplier);
	}

	createTrail() {
		if (this.tick % 2 === 0) {
			const trailColors = [
				NESPalette.lightestBlue,
				NESPalette.lightBlue,
				NESPalette.blue,
				NESPalette.yellow
			];
			const color = trailColors[Math.floor(Math.random() * trailColors.length)];
			this.trailParticles.push(new VaporTrailParticle(this.x, this.y, color));

			// Add extra particles when at high speed
			if (this.speed > this.baseSpeed) {
				this.trailParticles.push(new VaporTrailParticle(this.x, this.y, color));
			}
		}
	}

	updateTrailParticles(timeMultiplier = 1) {
		this.trailParticles.forEach((particle) => particle.update(timeMultiplier));
		this.trailParticles = this.trailParticles.filter((particle) => particle.opacity > 0);
	}

	draw(ctx) {
		// Draw vapor trails before drawing the missile
		this.trailParticles.forEach((particle) => {
			if (particle.opacity > 0) {
				particle.draw(ctx);
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
		this.colors = [NESPalette.lightOrange, NESPalette.orange, NESPalette.darkGold, NESPalette.gold];
		this.color = this.colors[Math.floor(Math.random() * this.colors.length)];
	}

	update(timeMultiplier = 1) {
		this.x += this.speedX * timeMultiplier;
		this.y += this.speedY * timeMultiplier;
		this.opacity -= (1 / this.lifespan) * timeMultiplier;
		this.lifespan -= timeMultiplier;
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

	update(timeMultiplier = 1) {
		this.y += this.speedY * timeMultiplier;
		this.opacity -= 0.02 * timeMultiplier;
		if (this.opacity <= 0) {
			this.opacity = 0;
		}
	}

	draw(ctx) {
		ctx.save();
		ctx.globalAlpha = this.opacity;
		ctx.fillStyle = NESPalette.white;
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

	update(timeMultiplier = 1) {
		this.x -= this.speed * 0.5 * timeMultiplier;
		this.y += this.speed * timeMultiplier;
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
	auraGradient.addColorStop(0, NESPalette.lightBlue);
	auraGradient.addColorStop(1, 'transparent');

	ctx.fillStyle = auraGradient;
	ctx.beginPath();
	ctx.arc(x + spaceship.width / 2, y + spaceship.height / 2, spaceship.width, 0, Math.PI * 2);
	ctx.fill();

	ctx.fillStyle = NESPalette.blue;
	ctx.fillRect(x, y, spaceship.width, spaceship.height);

	const engineGradient = ctx.createLinearGradient(
		x,
		y + spaceship.height,
		x,
		y + spaceship.height + 10
	);
	engineGradient.addColorStop(0, NESPalette.orange);
	engineGradient.addColorStop(1, NESPalette.darkGold);
	ctx.fillStyle = engineGradient;
	ctx.fillRect(x + 10, y + spaceship.height, spaceship.width - 20, 10);

	const windowSpacing = 10;
	for (let wx = x + 5; wx < x + spaceship.width - 5; wx += windowSpacing) {
		for (let wy = y + 5; wy < y + spaceship.height - 5; wy += windowSpacing) {
			const windowColor = Math.random() > 0.5 ? NESPalette.white : NESPalette.brightBlue;
			ctx.fillStyle = windowColor;
			ctx.fillRect(wx, wy, 3, 3);
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
			NESPalette.lightOrange,
			NESPalette.orange,
			NESPalette.darkGold,
			NESPalette.gold,
			NESPalette.white,
			NESPalette.lightYellow
		];
		return colors[Math.floor(Math.random() * colors.length)];
	}

	update(timeMultiplier = 1) {
		this.x += this.speedX * timeMultiplier;
		this.y += this.speedY * timeMultiplier;
		this.lifespan -= timeMultiplier;
		this.opacity = Math.max(0, this.lifespan / 50);
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

// Title screen layout and timing constants
const LOGO_DIMENSIONS = {
	width: 600, // Increased from 400
	height: 300, // Increased from 200
	initialScale: 0.2, // Keep initial scale small
	finalScale: 1.0, // Increased from 0.6 for larger final size
	finalY: 80, // Adjusted for better vertical positioning
	scaleSpeed: 0.005 // Keep smooth motion
};

const STORY_TEXT = {
	lines: [
		'In the year 2045, Earth has become a utopia where equality',
		'and peace have flourished for decades. However, this harmony',
		'is threatened when alien monsters, known as the "Void Swarm"',
		'emerge from a rip in the fabric of space-time, intent on',
		"consuming the planet's resources and enslaving humanity."
	],
	startY: 300,
	lineHeight: 25,
	fadeInDelay: 2000,
	fadeInDuration: 3000,
	maxWidth: 700,
	marginX: 35
};

// Add developer credit text configuration
const DEVELOPER_CREDIT = {
	text: 'Developed by Jo Pearson with JavaScript',
	y: LOGO_DIMENSIONS.finalY + LOGO_DIMENSIONS.height - 30, // Position it below the logo
	font: "16px 'Press Start 2P', cursive",
	color: NESPalette.lightestBlue,
	fadeWithLogo: true // This will make it fade with the logo
};

const PRESS_ENTER_TEXT = {
	y: 500,
	blinkInterval: 500, // ms between blinks
	text: 'PRESS ENTER TO START'
};

// Animation sequence constants
const ANIMATION_STATES = {
	LOGO_DESCENDING: 'logo-descending',
	LOGO_RESTING: 'logo-resting',
	LOGO_FADING: 'logo-fading',
	STORY_SHOWING: 'story-showing',
	RESETTING: 'resetting'
};

const TIMING = {
	LOGO_FADE_DURATION: 3000,
	LOGO_REST_DURATION: 4000, // Increased to give more time to read
	STORY_FADE_DURATION: 2000,
	STORY_DISPLAY_TIME: 5000,
	RESET_DELAY: 2000,
	ANIMATION_LOOP_DELAY: 1000
};

// Title screen state management
const titleScreenState = {
	logoY: LOGO_DIMENSIONS.finalY,
	logoScale: LOGO_DIMENSIONS.initialScale,
	logoOpacity: 0,
	logoImage: null,
	logoLoaded: false,
	storyOpacity: 0,
	developerCreditOpacity: 0,
	currentState: ANIMATION_STATES.LOGO_DESCENDING,
	stateStartTime: Date.now(),
	enterTextVisible: true,
	lastBlinkTime: 0,
	enhancedStars: []
};

// Enhanced star animation class
class EnhancedStar {
	constructor() {
		// Random position
		this.x = Math.random() * canvas.width;
		this.y = Math.random() * canvas.height;

		// Star properties
		this.baseSize = Math.random() * 1.5 + 0.5;
		this.size = this.baseSize;

		// Twinkling properties
		this.twinkleSpeed = Math.random() * 0.05 + 0.02;
		this.twinklePhase = Math.random() * Math.PI * 2;
		this.twinkleFactor = Math.random() * 1.5 + 0.5;

		// Color properties
		this.baseColor = NESPalette.white;
		this.colorVariation = [NESPalette.white, NESPalette.lightestBlue, NESPalette.lightBlue];
	}

	update() {
		// Update twinkle phase
		this.twinklePhase += this.twinkleSpeed;

		// Create smooth sinusoidal twinkling effect
		this.twinkleFactor = 0.5 + 0.5 * Math.sin(this.twinklePhase);

		// Vary star size slightly based on twinkle
		this.size = this.baseSize * (1 + 0.3 * Math.sin(this.twinklePhase));
	}

	draw(ctx) {
		// Set star color with opacity based on twinkle factor
		ctx.fillStyle = `rgba(${parseInt(this.baseColor.slice(1, 3), 16)},
								${parseInt(this.baseColor.slice(3, 5), 16)},
								${parseInt(this.baseColor.slice(5, 7), 16)},
								${this.twinkleFactor})`;

		// Draw the star
		ctx.beginPath();
		ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
		ctx.fill();

		// Add a subtle glow effect
		if (this.twinkleFactor > 0.8) {
			ctx.save();
			ctx.globalAlpha = (this.twinkleFactor - 0.8) * 0.5;
			ctx.shadowBlur = 5;
			ctx.shadowColor = this.baseColor;
			ctx.fill();
			ctx.restore();
		}
	}

	// Reset star position (useful for screen resize or repositioning)
	reset() {
		this.x = Math.random() * canvas.width;
		this.y = Math.random() * canvas.height;
	}
}

// Function to create initial star field
function createStarField(count) {
	return Array(count)
		.fill(null)
		.map(() => new EnhancedStar());
}

// Initialize title screen assets
function initializeTitleScreen() {
	// Load logo image
	titleScreenState.logoImage = new Image();
	titleScreenState.logoImage.src = getAssetPath('assets/images/game/main_logo_title_screen-01.svg');
	titleScreenState.logoImage.onload = () => {
		titleScreenState.logoLoaded = true;
	};

	// Initialize enhanced stars using the helper function
	titleScreenState.enhancedStars = createStarField(numberOfStars);
}

function updateAnimationState() {
	const currentTime = Date.now();
	const timeInState = currentTime - titleScreenState.stateStartTime;

	switch (titleScreenState.currentState) {
		case ANIMATION_STATES.LOGO_DESCENDING:
			const scalingProgress = Math.min(timeInState / TIMING.LOGO_FADE_DURATION, 1);
			// Improved easing function for smoother zoom
			const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);
			const easedProgress = easeOutQuart(scalingProgress);

			titleScreenState.logoScale =
				LOGO_DIMENSIONS.initialScale +
				(LOGO_DIMENSIONS.finalScale - LOGO_DIMENSIONS.initialScale) * easedProgress;
			titleScreenState.logoOpacity = Math.min(1, scalingProgress * 1.2);

			if (scalingProgress >= 1) {
				titleScreenState.currentState = ANIMATION_STATES.LOGO_RESTING;
				titleScreenState.stateStartTime = currentTime;
			}
			break;

		case ANIMATION_STATES.LOGO_RESTING:
			// Start fading in developer credit immediately during logo rest
			titleScreenState.developerCreditOpacity = Math.min(1, timeInState / 500);

			if (timeInState >= TIMING.LOGO_REST_DURATION) {
				titleScreenState.currentState = ANIMATION_STATES.LOGO_FADING;
				titleScreenState.stateStartTime = currentTime;
			}
			break;

		case ANIMATION_STATES.DEVELOPER_CREDIT_SHOWING:
			titleScreenState.developerCreditOpacity = Math.min(1, timeInState / 500);

			if (timeInState >= TIMING.DEVELOPER_CREDIT_DURATION) {
				titleScreenState.currentState = ANIMATION_STATES.LOGO_FADING;
				titleScreenState.stateStartTime = currentTime;
			}
			break;

		case ANIMATION_STATES.LOGO_FADING:
			const fadingProgress = timeInState / TIMING.LOGO_FADE_DURATION;
			titleScreenState.logoOpacity = Math.max(0, 1 - fadingProgress);
			titleScreenState.developerCreditOpacity = Math.max(0, 1 - fadingProgress); // Fade out with logo
			titleScreenState.storyOpacity = Math.min(1, fadingProgress);

			if (fadingProgress >= 1) {
				titleScreenState.currentState = ANIMATION_STATES.STORY_SHOWING;
				titleScreenState.stateStartTime = currentTime;
			}
			break;

		case ANIMATION_STATES.STORY_SHOWING:
			if (timeInState >= TIMING.STORY_DISPLAY_TIME) {
				titleScreenState.currentState = ANIMATION_STATES.RESETTING;
				titleScreenState.stateStartTime = currentTime;
			}
			break;

		case ANIMATION_STATES.RESETTING:
			const resetProgress = timeInState / TIMING.RESET_DELAY;
			titleScreenState.storyOpacity = Math.max(0, 1 - resetProgress);

			if (timeInState >= TIMING.RESET_DELAY) {
				titleScreenState.logoScale = LOGO_DIMENSIONS.initialScale;
				titleScreenState.logoOpacity = 0;
				titleScreenState.storyOpacity = 0;
				titleScreenState.developerCreditOpacity = 0; // Added this
				titleScreenState.currentState = ANIMATION_STATES.LOGO_DESCENDING;
				titleScreenState.stateStartTime = currentTime + TIMING.ANIMATION_LOOP_DELAY;
			}
			break;
	}
}
function drawTitleScreen() {
	if (!canvas || !ctx) return; // Safety check

	// Clear canvas and draw background
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	// Draw enhanced twinkling stars
	titleScreenState.enhancedStars.forEach((star) => {
		star.update();
		star.draw(ctx);
	});

	// Update animation state
	updateAnimationState();

	// Draw logo with current opacity and scale
	if (titleScreenState.logoLoaded && titleScreenState.logoOpacity > 0) {
		ctx.save();
		ctx.globalAlpha = titleScreenState.logoOpacity;

		const scaledWidth = LOGO_DIMENSIONS.width * titleScreenState.logoScale;
		const scaledHeight = LOGO_DIMENSIONS.height * titleScreenState.logoScale;
		const centerX = (canvas.width - scaledWidth) / 2;
		const centerY = (canvas.height - scaledHeight) / 3; // Positioned in upper third

		ctx.drawImage(titleScreenState.logoImage, centerX, centerY, scaledWidth, scaledHeight);
		ctx.restore();
	}

	// Draw developer credit when appropriate
	if (titleScreenState.developerCreditOpacity > 0) {
		ctx.save();
		ctx.globalAlpha = titleScreenState.developerCreditOpacity;
		ctx.fillStyle = NESPalette.lightestBlue;
		ctx.font = "16px 'Press Start 2P', cursive";
		ctx.textAlign = 'center';
		ctx.fillText(
			'Developed by Jo Pearson with JavaScript',
			canvas.width / 2,
			canvas.height / 3 + LOGO_DIMENSIONS.height + 40
		);
		ctx.restore();
	}

	// Draw story text when appropriate
	if (titleScreenState.storyOpacity > 0) {
		ctx.save();
		ctx.globalAlpha = titleScreenState.storyOpacity;
		ctx.fillStyle = NESPalette.lightestBlue;
		ctx.font = "16px 'Press Start 2P', cursive";
		ctx.textAlign = 'left';

		const marginX = 35;
		const startY = 200;
		const lineSpacing = 40;

		const lines = [
			'In the year 2045, Earth has become a utopia',
			'where equality and peace have flourished for',
			'decades. However, this harmony is threatened',
			'when alien monsters, known as the "Void Swarm"',
			'emerge from a rip in the fabric of space-time,',
			"intent on consuming the planet's resources",
			'and enslaving humanity.'
		];

		lines.forEach((line, index) => {
			const y = startY + index * lineSpacing;
			ctx.fillText(line, marginX, y);
		});

		ctx.restore();
	}

	// Handle "Press Enter" text blinking
	const currentTime = Date.now();
	if (currentTime - titleScreenState.lastBlinkTime > PRESS_ENTER_TEXT.blinkInterval) {
		titleScreenState.enterTextVisible = !titleScreenState.enterTextVisible;
		titleScreenState.lastBlinkTime = currentTime;
	}

	if (titleScreenState.enterTextVisible) {
		ctx.fillStyle = NESPalette.lightYellow;
		ctx.font = "20px 'Press Start 2P', cursive";
		ctx.textAlign = 'center';
		ctx.fillText(PRESS_ENTER_TEXT.text, canvas.width / 2, PRESS_ENTER_TEXT.y);
	}

	// Add subtle scanline effect
	drawScanlines();

	// Ensure animation continues if still on title screen
	if (titleScreen) {
		requestAnimationFrame(drawTitleScreen);
	}
}

// Helper function to draw scanlines for retro effect
function drawScanlines() {
	ctx.save();
	ctx.globalAlpha = 0.1;
	ctx.fillStyle = '#000000';
	for (let i = 0; i < canvas.height; i += 4) {
		ctx.fillRect(0, i, canvas.width, 2);
	}
	ctx.restore();
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
	ctx.fillStyle = `rgba(${parseInt(NESPalette.royalBlue.slice(1, 3), 16)}, ${parseInt(NESPalette.royalBlue.slice(3, 5), 16)}, ${parseInt(NESPalette.royalBlue.slice(5, 7), 16)}, 0.5)`;
	ctx.beginPath();
	ctx.arc(x, y, 40, 0, 2 * Math.PI);
	ctx.fill();

	ctx.fillStyle = NESPalette.white;
	ctx.beginPath();
	ctx.arc(x, y, 30, 0, 2 * Math.PI);
	ctx.fill();

	ctx.fillStyle = NESPalette.darkGray;
	ctx.beginPath();
	ctx.arc(x - 10, y - 10, 8, 0, 2 * Math.PI);
	ctx.fill();

	ctx.fillStyle = NESPalette.mediumGray;
	ctx.beginPath();
	ctx.arc(x + 15, y, 5, 0, 2 * Math.PI);
	ctx.fill();

	ctx.fillStyle = NESPalette.darkGray;
	ctx.beginPath();
	ctx.arc(x + 5, y + 15, 3, 0, 2 * Math.PI);
	ctx.fill();

	ctx.beginPath();
	ctx.arc(x - 20, y + 10, 4, 0, 2 * Math.PI);
	ctx.fill();

	ctx.fillStyle = NESPalette.white;
	const dots = [
		{ dx: -5, dy: 5 },
		{ dx: 10, dy: -15 },
		{ dx: -15, dy: -5 },
		{ dx: 20, dy: 10 },
		{ dx: 0, dy: -20 }
	];
	dots.forEach((dot) => {
		ctx.beginPath();
		ctx.arc(x + dot.dx, y + dot.dy, 1, 0, Math.PI * 2);
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
	if (skipDrawing) return;

	const skylineColor = NESPalette.navyBlue;
	const cityBaseLine = canvas.height - 0;
	const gapBetweenBuildings = 0;
	const windowColorOn = NESPalette.blue;
	const windowColorOff = 'rgba(0, 0, 0, 0.5)';
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

function spawnEnemy() {
	// Roll to determine enemy type based on configured ratios
	const roll = Math.random() * 100;
	let newEnemy;

	if (roll < ENEMY_CONFIG.ENEMY_TYPE_RATIOS.basic) {
		newEnemy = new Enemy();
	} else if (roll < ENEMY_CONFIG.ENEMY_TYPE_RATIOS.basic + ENEMY_CONFIG.ENEMY_TYPE_RATIOS.zigzag) {
		newEnemy = new ZigzagEnemy();
	} else {
		newEnemy = new CityEnemy();
	}

	// Apply formation pattern if configured
	const pattern =
		ENEMY_CONFIG.FORMATION_PATTERNS[
			Math.floor(Math.random() * ENEMY_CONFIG.FORMATION_PATTERNS.length)
		];

	// Log spawn for debugging
	console.log(`Spawning ${newEnemy.constructor.name} with pattern: ${pattern}`);

	enemies.push(newEnemy);
}

function manageEnemies() {
	// Update and manage existing enemies
	enemies.forEach((enemy, index) => {
		enemy.update(timeMultiplier);
		enemy.draw(ctx);

		// Remove off-screen or destroyed enemies
		if (enemy.y > canvas.height || enemy.toBeRemoved) {
			if (enemy.toBeRemoved) {
				handleEnemyDestruction(enemy);
			}
			enemies.splice(index, 1);
		}

		// Handle collisions with player
		if (checkCollision(player, enemy, PLAYER_HITBOX_PADDING)) {
			handlePlayerHit('collision', enemy);
			enemies.splice(index, 1);
		}

		// Handle projectile collisions
		handleEnemyCollisions(enemy, index);
	});

	// Handle enemy spawning
	manageEnemySpawning();
}

function manageEnemySpawning() {
	// Check for formation pattern opportunity
	const shouldSpawnFormation = Math.random() < 0.1 && enemies.length < maxEnemies / 2;

	if (shouldSpawnFormation) {
		spawnFormation();
		return;
	}

	// First check if we have any visible enemies
	if (!hasVisibleEnemies() && enemies.length < maxEnemies) {
		console.log('No visible enemies - spawning new enemy');
		// Spawn just one enemy above the screen
		const enemy = new Enemy();
		enemy.x = Math.random() * (canvas.width - enemy.width);
		enemy.y = -50; // Start above screen
		enemies.push(enemy);
		return;
	}

	if (enemies.length < maxEnemies && gameFrame % enemyInterval === 0) {
		const roll = Math.random() * 100;

		// Adjust spawn probabilities to ensure CityEnemy appears
		if (roll < 40) {
			// 40% chance for basic enemy
			enemies.push(new Enemy());
		} else if (roll < 70) {
			// 30% chance for zigzag
			enemies.push(new ZigzagEnemy());
		} else {
			// 30% chance for city enemy
			const cityEnemy = new CityEnemy();
			// Ensure CityEnemy starts from bottom of screen
			cityEnemy.y = canvas.height;
			cityEnemy.targetY = Math.random() * (canvas.height / 2);
			enemies.push(cityEnemy);
		}

		console.log('Enemy distribution after spawn:', {
			basic: enemies.filter(
				(e) => e instanceof Enemy && !(e instanceof CityEnemy || e instanceof ZigzagEnemy)
			).length,
			zigzag: enemies.filter((e) => e instanceof ZigzagEnemy).length,
			city: enemies.filter((e) => e instanceof CityEnemy).length
		});
	}
}

// Add this new formation spawning function
function spawnFormation() {
	// Choose a formation pattern
	const formations = ['v-formation', 'line-formation', 'circle-formation', 'wave-formation'];

	const formation = formations[Math.floor(Math.random() * formations.length)];
	const enemyCount = Math.floor(Math.random() * 3) + 3; // 3-5 enemies

	console.log(`Spawning formation: ${formation} with ${enemyCount} enemies`);

	switch (formation) {
		case 'v-formation':
			// Create V formation with leader and wingmen
			for (let i = 0; i < enemyCount; i++) {
				const enemy = Math.random() < 0.3 ? new ZigzagEnemy() : new Enemy();

				// Position in V shape
				const centerX = canvas.width / 2;
				const spacing = 50;
				const offset = i - (enemyCount - 1) / 2;

				enemy.x = centerX + offset * spacing;
				enemy.y = -50 - Math.abs(offset) * 30; // Make V shape

				// Sync movement patterns
				enemy.patternIndex = 0;
				enemy.moveDelay = i;

				enemies.push(enemy);
			}
			break;

		case 'line-formation':
			// Create horizontal line formation
			for (let i = 0; i < enemyCount; i++) {
				const enemy = Math.random() < 0.3 ? new ZigzagEnemy() : new Enemy();

				// Position in horizontal line
				const spacing = canvas.width / (enemyCount + 1);
				enemy.x = spacing * (i + 1);
				enemy.y = -50;

				// Sync movement but with slight offset
				enemy.patternIndex = 2;
				enemy.moveDelay = i * 2;

				enemies.push(enemy);
			}
			break;

		case 'circle-formation':
			// Create circular formation that spirals in
			for (let i = 0; i < enemyCount; i++) {
				const enemy = Math.random() < 0.2 ? new ZigzagEnemy() : new Enemy();

				// Position in circle
				const angle = (i / enemyCount) * Math.PI * 2;
				const radius = 80;
				const centerX = canvas.width / 2;

				enemy.x = centerX + Math.cos(angle) * radius;
				enemy.y = -50 + Math.sin(angle) * radius;

				// Set spiral pattern
				enemy.patternIndex = 1;
				enemy.moveDelay = i;

				enemies.push(enemy);
			}
			break;

		case 'wave-formation':
			// Create wave pattern
			for (let i = 0; i < enemyCount; i++) {
				const enemy = new Enemy();

				// Staggered positioning
				const spacing = canvas.width / enemyCount;
				enemy.x = spacing * i;
				enemy.y = -50 - (i % 2) * 30; // Alternating heights

				// Synchronized wave patterns
				enemy.patternIndex = 2;
				// Different phases of the same wave pattern
				enemy.curvePhase = (i / enemyCount) * Math.PI * 2;
				enemy.moveDelay = 0;

				enemies.push(enemy);
			}
			break;
	}
}

function handleEnemyDestruction(enemy) {
	// Add score
	score += 100;

	// Update the store with new score
	updateGameStore({ score });

	// Create floating score text
	floatingTexts.push(new FloatingText(enemy.x, enemy.y, '+100 pts', NESPalette.lightYellow));

	// Generate explosion particles
	for (let i = 0; i < 20; i++) {
		particles.push(
			new Particle(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, NESPalette.orange)
		);
	}

	// Screen shake for feedback (matching original behavior)
	shakeScreen(200, 5); // Changed back to magnitude of 5
}

// Helper function for enemy collisions
function handleEnemyCollisions(enemy, enemyIndex) {
	projectiles.forEach((projectile, projectileIndex) => {
		if (checkCollision(projectile, enemy)) {
			console.log('Projectile hit enemy:', {
				enemyType: enemy.constructor.name,
				projectileType: projectile.isHeatseeker ? 'heatseeker' : 'normal',
				position: { x: enemy.x, y: enemy.y }
			});

			// Remove projectile
			projectiles.splice(projectileIndex, 1);

			// Handle heatseeker hits
			if (projectile.isHeatseeker) {
				enemy.isExploding = true;
				enemy.toBeRemoved = true;
			} else {
				// Handle normal projectile hits
				enemy.hitsTaken++;
				if (enemy.hitsTaken === 1) {
					enemy.isAggressive = true;
				} else if (enemy.hitsTaken >= 2) {
					enemy.isExploding = true;
					enemy.toBeRemoved = true;
				}
			}

			// If enemy is to be removed, handle destruction effects
			if (enemy.toBeRemoved) {
				handleEnemyDestruction(enemy);
			}
		}
	});
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

function initializeGame(canvasElement) {
	canvas = canvasElement;
	ctx = canvas.getContext('2d');
	initializePlayer();
	player.weapon = 'standard';
	player.isInvincible = false;
	player.speed = 4; // Reset speed in case of power-up
	unlimitedHeatseekersMode = false;
	shootingCooldown = 50; // Reset shooting cooldown
	gameStartTime = Date.now();
	dropsEnabled = false;

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

async function loadGameAssets() {
	const loadingScreen = {
		draw: () => {
			ctx.fillStyle = NESPalette.black;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.fillStyle = NESPalette.white;
			ctx.font = "20px 'Press Start 2P'";
			ctx.textAlign = 'center';
			ctx.fillText('LOADING...', canvas.width / 2, canvas.height / 2);
		}
	};

	const loadingInterval = setInterval(() => loadingScreen.draw(), 16);

	try {
		const assetUrls = [
			'assets/images/game/void_swarm_sprite.png',
			'assets/images/game/vela_main_sprite.png',
			'assets/images/game/projectile_main_sprite.png',
			'assets/images/game/game_mechanics_sprite.png',
			'assets/images/game/main_logo_title_screen-01.svg'
		];

		const assetPromises = assetUrls.map((url) => {
			return new Promise((resolve, reject) => {
				const img = new Image();
				img.onload = () => {
					console.log(`Loaded: ${url}`);
					resolve(img);
				};
				img.onerror = () => {
					console.error(`Failed to load: ${url}`);
					reject(new Error(`Failed to load: ${url}`));
				};
				img.src = getAssetPath(url);
			});
		});

		const loadedAssets = await Promise.all(assetPromises);
		clearInterval(loadingInterval);
		return loadedAssets;
	} catch (error) {
		clearInterval(loadingInterval);
		console.error('Asset loading failed:', error);
		ctx.fillStyle = NESPalette.red;
		ctx.fillText('PRESS START TO RETRY', canvas.width / 2, canvas.height / 2 + 40);
		throw error;
	}
}

// Complete setupGame function with error handling and all initializations
// Complete setupGame function
export function setupGame(canvasElement) {
	// Canvas setup and validation
	if (!canvasElement || !canvasElement.getContext) {
		console.error('Invalid canvas element');
		return;
	}

	const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

	// If mobile, adjust base speeds
	if (isMobile) {
		SPEED_CONFIG.BASE_ENEMY_SPEED = SPEED_CONFIG.MOBILE.BASE_ENEMY_SPEED;
		SPEED_CONFIG.BASE_PROJECTILE_SPEED = SPEED_CONFIG.MOBILE.BASE_PROJECTILE_SPEED;
		SPEED_CONFIG.BASE_PLAYER_SPEED = SPEED_CONFIG.MOBILE.BASE_PLAYER_SPEED;
	}

	canvas = canvasElement;
	ctx = canvas.getContext('2d');
	if (!ctx) {
		console.error('Unable to get 2D context');
		return;
	}

	// Cancel any existing animation frame
	if (animationFrameId) {
		cancelAnimationFrame(animationFrameId);
		animationFrameId = null;
	}

	// Reset game state
	score = 0;
	lives = 3;
	enemies = [];
	projectiles = [];
	explosions = [];
	comets = [];
	shootingStars = [];
	gameFrame = 0;
	gameSpeed = 1;
	enemyProjectiles = [];
	gameActive = false;
	titleScreen = true;
	isPaused = false;
	difficultyIncreaseScore = 500;
	enemyInterval = initialEnemySpawnRate;
	ammoDropCounter = 0;
	heatseekerAmmo = [];
	heatseekerCount = 3;
	powerUps = [];
	extraLives = [];
	particles = [];
	floatingTexts = [];

	// Initialize loading screen
	function drawLoadingScreen() {
		if (!ctx) return;
		ctx.fillStyle = NESPalette.black;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.fillStyle = NESPalette.white;
		ctx.font = "20px 'Press Start 2P'";
		ctx.textAlign = 'center';
		ctx.fillText('LOADING...', canvas.width / 2, canvas.height / 2);

		// Arcade-style "Insert Coin" blink
		if (Math.floor(Date.now() / 500) % 2 === 0) {
			ctx.fillText('INSERT COIN', canvas.width / 2, canvas.height / 2 + 40);
		}
	}

	const loadingInterval = setInterval(() => drawLoadingScreen(), 16);

	return loadGameAssets()
		.then((loadedImages) => {
			console.log('All assets loaded, initializing game components...');
			clearInterval(loadingInterval);

			// Add the asset verification here, after initialization
			const assetVerification = setInterval(() => {
				if (player.spriteImage.complete) {
					console.log(
						'Vela sprite dimensions:',
						player.spriteImage.width,
						player.spriteImage.height
					);
					clearInterval(assetVerification);
				}
			}, 100);

			// Initialize all game components with loaded assets
			initializeGameWithAssets(loadedImages);

			// Initialize base game components
			initializePlayer();
			initializeTitleScreen();
			smokeParticlePool = new ParticlePool(100);
			initializeCityFires();
			initializeClouds();
			initializeStars();
			spaceship = new Spaceship();
			spaceships = [];

			// Initialize timers and intervals
			lastFrameTime = performance.now();
			deltaTime = TIMING_CONFIG.FRAME_TIME;
			timeMultiplier = 1;
			lastVelaShotTime = Date.now();
			dayNightCycle = 180;

			// Set up power-up state
			powerUpActive = false;
			powerUpType = '';
			powerUpStartTime = 0;
			constantPowerUpMode = false;
			unlimitedHeatseekersMode = false;
			rapidFireMode = false;

			// Initialize title screen state
			titleScreen = true;
			gameActive = false;
			gameOverScreen = false;

			// Set up title screen logo
			titleScreenState.logoLoaded = false;
			titleScreenState.logoImage = new Image();
			titleScreenState.logoImage.src = getAssetPath(
				'assets/images/game/main_logo_title_screen-01.svg'
			);
			titleScreenState.logoImage.onload = () => {
				titleScreenState.logoLoaded = true;
				console.log('Logo loaded successfully');
			};

			// Initialize enhanced stars for title screen
			titleScreenState.enhancedStars = createStarField(numberOfStars);

			// Set up input handlers
			setupInputListeners();

			// Schedule game events
			gameStartTime = Date.now();
			dropsEnabled = false;
			scheduleRandomAmmoDrop();
			scheduleRandomExtraLifeDrop();
			schedulePowerUpDrops();

			// Verify all assets are loaded
			checkAssetLoading();

			console.log('Game initialization complete');
			console.log('Starting title screen');

			// Start with title screen animation
			requestAnimationFrame(drawTitleScreen);

			// Error handling listeners
			window.addEventListener('error', function (e) {
				console.error('Game initialization error:', e.error);
				if (ctx) {
					ctx.fillStyle = NESPalette.red;
					ctx.font = "16px 'Press Start 2P'";
					ctx.fillText(
						'Game initialization error. Please refresh.',
						canvas.width / 2 - 200,
						canvas.height / 2
					);
				}
			});

			// Handle window resize
			window.addEventListener('resize', function () {
				// Resize handling preserved for future implementation
			});

			// Set up title screen to game transition
			window.addEventListener('keydown', function (event) {
				if (event.key === 'Enter') {
					if (titleScreen) {
						console.log('Transitioning from title to gameplay');
						titleScreen = false;
						gameActive = true;
						animate();
					} else if (gameOverScreen) {
						resetGame();
					}
				}
			});

			updateGameStore({
				score,
				lives,
				heatseekerCount,
				highScore,
				gameActive,
				isGameOver: gameOverScreen,
				isPaused
			});

			// Return game control interface
			return {
				start: () => {
					if (!titleScreen) {
						gameActive = true;
						animate();
					}
				},
				pause: () => {
					isPaused = true;
				},
				resume: () => {
					isPaused = false;
					animate();
				},
				reset: () => {
					resetGame();
				}
			};
		})
		.catch((error) => {
			clearInterval(loadingInterval);
			console.error('Error loading game assets:', error);
			if (ctx) {
				ctx.fillStyle = NESPalette.red;
				ctx.font = "16px 'Press Start 2P'";
				ctx.fillText(
					'Error loading game assets. Please refresh.',
					canvas.width / 2 - 200,
					canvas.height / 2
				);
			}
			throw error;
		});
}

// Place initializeGameWithAssets function right after setupGame
function initializeGameWithAssets(loadedImages) {
	// Initialize player sprite with loaded image
	player.spriteImage = loadedImages[1]; // Index matches asset loading order in loadGameAssets

	// Initialize enemy sprites
	newGameMechanicsSprite = loadedImages[3];

	// Log successful asset initialization
	console.log('Game assets initialized successfully');
}

function updateTimingSystem() {
	const currentTime = performance.now();
	const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

	// Add frame time validation
	if (!lastFrameTime) {
		lastFrameTime = currentTime;
		return;
	}

	// Handle case where game has been inactive (tab switched, etc)
	if (currentTime - lastFrameTime > TIMING_CONFIG.RESET_DELAY) {
		lastFrameTime = currentTime - TIMING_CONFIG.FRAME_TIME;
		return; // Skip this frame to stabilize
	}

	deltaTime = currentTime - lastFrameTime;
	lastFrameTime = currentTime;

	// Mobile-specific frame time capping
	if (isMobile) {
		if (deltaTime < TIMING_CONFIG.MIN_FRAME_TIME * 1.5) {
			// More aggressive capping for mobile
			deltaTime = TIMING_CONFIG.FRAME_TIME * 1.5;
		}
		if (deltaTime > TIMING_CONFIG.MAX_FRAME_TIME * 0.75) {
			// Prevent too much slowdown
			deltaTime = TIMING_CONFIG.MAX_FRAME_TIME * 0.75;
		}
	} else {
		// Original desktop timing logic
		if (deltaTime < TIMING_CONFIG.MIN_FRAME_TIME) {
			deltaTime = TIMING_CONFIG.FRAME_TIME;
		}
		if (deltaTime > TIMING_CONFIG.MAX_FRAME_TIME) {
			deltaTime = TIMING_CONFIG.MAX_FRAME_TIME;
		}
	}

	// Calculate time multiplier with additional validation
	timeMultiplier = deltaTime / TIMING_CONFIG.FRAME_TIME;
	if (isNaN(timeMultiplier) || !isFinite(timeMultiplier)) {
		timeMultiplier = 1;
	}

	cappedMultiplier = Math.min(Math.max(timeMultiplier, MIN_MULTIPLIER), MAX_MULTIPLIER);

	if (isMobile) {
		cappedMultiplier *= 0.85; // Additional 15% slowdown for mobile
	}

	gameSpeed = Math.min(Math.max(1.0, cappedMultiplier), 1.5);
}

function animate() {
	if (!gameActive) {
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
		return;
	}

	if (isPaused) {
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}

		// Draw the paused game state in the background
		ctx.save();
		// Add a semi-transparent overlay
		ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Draw PAUSED text
		ctx.fillStyle = NESPalette.white;
		ctx.font = "20px 'Press Start 2P'";
		ctx.textAlign = 'center';
		ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);

		// Add instruction text
		ctx.font = "16px 'Press Start 2P'";
		ctx.fillText('Press P to Resume', canvas.width / 2, canvas.height / 2 + 40);

		ctx.restore();

		// Keep rendering the pause screen
		requestAnimationFrame(animate);
		return;
	}

	// Validate timing state before proceeding
	if (!lastFrameTime) {
		lastFrameTime = performance.now();
	}

	ctx.clearRect(0, 0, canvas.width, canvas.height);
	gameFrame++;
	const arcadeFrameMod = {
		enemies: gameFrame % 2 === 0,
		projectiles: gameFrame % 2 === 1,
		particles: true, // Always update for smooth effects
		player: true // Always update for responsive controls
	};
	updateTimingSystem();

	drawDynamicGradientSky();
	drawClouds();
	drawStars(); // Ensure stars are drawn with twinkling effect
	handleShootingStars();
	let moonPos = calculateMoonPosition();
	drawCelestialBody(moonPos.x, moonPos.y);

	// First draw background enemies
	// Draw background enemies first
	const backgroundEnemies = enemies.filter(
		(enemy) => enemy instanceof CityEnemy && enemy.scale < 1
	);
	backgroundEnemies.forEach((enemy) => {
		enemy.update(cappedMultiplier);
		enemy.draw(ctx);
	});

	// Draw cityscape after background enemies but before foreground elements
	drawCitySilhouette();
	drawFiresAndSmoke();
	drawHUD();
	drawPowerUpBar();

	dayNightCycle = (dayNightCycle + dayNightCycleSpeed * cappedMultiplier) % 360;

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
		comet.update(cappedMultiplier);
		if (comet.y > canvas.height) {
			comets.splice(index, 1);
		}
	});

	particles.forEach((particle, index) => {
		particle.update(cappedMultiplier);
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

	console.log('Current enemies:', {
		total: enemies.length,
		types: {
			basic: enemies.filter(
				(e) => e instanceof Enemy && !(e instanceof CityEnemy || e instanceof ZigzagEnemy)
			).length,
			zigzag: enemies.filter((e) => e instanceof ZigzagEnemy).length,
			city: enemies.filter((e) => e instanceof CityEnemy).length
		}
	});

	console.log('Current enemies:', {
		total: enemies.length,
		types: {
			basic: enemies.filter(
				(e) => e instanceof Enemy && !(e instanceof CityEnemy || e instanceof ZigzagEnemy)
			).length,
			zigzag: enemies.filter((e) => e instanceof ZigzagEnemy).length,
			city: enemies.filter((e) => e instanceof CityEnemy).length
		}
	});

	projectiles.forEach((projectile, index) => {
		if (projectile.update) {
			projectile.update(cappedMultiplier, enemies);
			projectile.draw(ctx);
			if (projectile.y > canvas.height) {
				projectiles.splice(index, 1);
			}
		} else {
			console.error(`Projectile at index ${index} does not have an update method.`);
		}
	});

	// Draw foreground enemies last
	const foregroundEnemies = enemies.filter(
		(enemy) => !(enemy instanceof CityEnemy && enemy.scale < 1)
	);
	foregroundEnemies.forEach((enemy) => {
		enemy.update(cappedMultiplier);
		enemy.draw(ctx);
	});

	// enemies.forEach((enemy, index) => {
	// 	enemy.update(cappedMultiplier);
	// 	enemy.draw(ctx);
	// 	if (checkCollision(player, enemy, 14)) {
	// 		handlePlayerHit('collision', enemy);
	// 		enemies.splice(index, 1);
	// 	}
	// });

	checkCollisions();

	if (player.movingLeft && player.x > 0) player.x -= player.speed * cappedMultiplier;
	if (player.movingRight && player.x < canvas.width - player.width)
		player.x += player.speed * cappedMultiplier;

	if (enemies.length < maxEnemies && gameFrame % enemyInterval === 0) {
		enemies.push(new Enemy());
	}

	adjustDifficulty();
	checkPowerUpCollisions();

	powerUps.forEach((powerUp) => {
		powerUp.update(cappedMultiplier);
		powerUp.draw(ctx);
	});

	extraLives.forEach((life) => {
		life.update(cappedMultiplier);
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
		projectile.update(cappedMultiplier);
		projectile.draw(ctx);
		if (checkCollision(player, projectile, 14)) {
			handlePlayerHit('fire', projectile.firingEnemy); // Pass 'fire' and the firing enemy
			enemyProjectiles.splice(index, 1);
		}
	});

	// Draw the player (Vela) last
	player.update(cappedMultiplier);
	player.draw(ctx);

	drawHUD();

	if (flashEffectActive) {
		ctx.fillStyle = flashColor;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	}

	if (gameActive && !isPaused) {
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
		}
		animationFrameId = requestAnimationFrame(animate);
	}
}

// 5. Add Debug Verification (optional but recommended)
function verifyTimingSystem() {
	console.log('Timing System State:', {
		lastFrameTime,
		deltaTime,
		timeMultiplier,
		cappedMultiplier,
		gameSpeed,
		animationFrameId
	});
}

// Event Listeners
function setupInputListeners() {
	// Track input state
	const keyState = {
		ArrowLeft: false,
		ArrowRight: false,
		' ': false, // Space
		x: false,
		p: false,
		Enter: false
	};

	// Touch control state
	let touchControlState = {
		movement: {
			active: false,
			direction: { x: 0, y: 0 }
		},
		buttons: {
			shoot: false,
			missile: false,
			pause: false,
			enter: false,
			reset: false
		}
	};

	// Input buffer for combo moves (8 frame buffer)
	const inputBuffer = [];
	const BUFFER_SIZE = 8;

	// Track last input time for rate limiting
	let lastShootTime = 0;
	const SHOOT_COOLDOWN = 250; // ms between shots

	// Joystick and movement configuration
	const JOYSTICK_CONFIG = {
		DEADZONE: 0.12,
		MAX_DISTANCE: 60,
		MIN_MOVEMENT_THRESHOLD: 0.05,
		MOVEMENT_ZONES: {
			PRECISE: 0.3,
			NORMAL: 0.6,
			RAPID: 1.0
		},
		ACCELERATION: {
			PRECISE: 1.2,
			NORMAL: 1.5,
			RAPID: 1.8
		},
		SPRING: {
			STIFFNESS: 0.25,
			DAMPING: 0.85
		},
		HAPTIC: {
			DURATION: {
				TAP: 50,
				ZONE_CHANGE: 20
			},
			INTENSITY: {
				LIGHT: 0.3,
				MEDIUM: 0.5,
				STRONG: 0.8
			}
		}
	};

	const TOUCH_CONFIG = {
		SAMPLING_RATE: 16,
		INITIAL_DELAY: 50,
		MAX_DELTA: 1.5
	};

	// Handle keyboard events
	window.addEventListener('keydown', function (event) {
		const key = event.key.toUpperCase(); // Define key variable here

		// Prevent default browser actions for game controls
		if (['ArrowLeft', 'ArrowRight', 'ArrowUp', ' ', 'x', 'X', 'p', 'P'].includes(event.key)) {
			event.preventDefault();
		}

		// Title screen handling
		if (titleScreen) {
			if (event.key === 'Enter') {
				titleScreen = false;
				gameActive = true;
				drawHUD();
				animate();
			}
			return;
		}

		// Game over screen handling
		if (gameOverScreen) {
			if (event.key === 'Enter') {
				resetGame();
			}
			return;
		}

		if (event.key === 'ArrowUp') {
			player.jump();
			// Other jump-related code
		}

		// Active gameplay input handling
		if (gameActive) {
			switch (event.key) {
				case ' ': // Heatseeker missile
					if (!keyState[' ']) {
						// Only trigger if key wasn't already pressed
						keyState[' '] = true;
						const currentTime = Date.now();
						if (currentTime - lastShootTime >= SHOOT_COOLDOWN) {
							shoot(true);
							lastShootTime = currentTime;
						}
					}
					break;

				case 'ArrowLeft':
					keyState.ArrowLeft = true;
					player.movingLeft = true;
					player.direction = 'left';
					inputBuffer.push({ input: 'left', time: Date.now() });
					if (inputBuffer.length > BUFFER_SIZE) inputBuffer.shift();
					break;

				case 'ArrowRight':
					keyState.ArrowRight = true;
					player.movingRight = true;
					player.direction = 'right';
					inputBuffer.push({ input: 'right', time: Date.now() });
					if (inputBuffer.length > BUFFER_SIZE) inputBuffer.shift();
					break;

				case 'ArrowUp':
					player.jump();
					inputBuffer.push({ input: 'up', time: Date.now() });
					if (inputBuffer.length > BUFFER_SIZE) inputBuffer.shift();
					break;

				case 'Shift':
					player.dash();
					break;

				case 'x':
				case 'X':
					keyState.x = true;
					const shootTime = Date.now();
					if (shootTime - lastShootTime >= (rapidFireMode ? SHOOT_COOLDOWN / 2 : SHOOT_COOLDOWN)) {
						shoot(false, true);
						lastShootTime = shootTime;
					}
					break;

				case 'p':
				case 'P':
					keyState.p = true;
					isPaused = !isPaused;
					if (!isPaused && gameActive) {
						lastFrameTime = performance.now();
						animationFrameId = requestAnimationFrame(animate);
					} else if (isPaused && animationFrameId) {
						cancelAnimationFrame(animationFrameId);
						animationFrameId = null;
					}
					break;

				case 'Enter':
					keyState.Enter = true;
					break;

				default:
					// Handle cheat code sequence
					if (key.length === 1) {
						if (key === keyCombination[keyCombinationIndex]) {
							keyCombinationIndex++;
							if (keyCombinationIndex === keyCombination.length) {
								handleCheatCode();
								keyCombinationIndex = 0;
							}
						} else if (key === 'S') {
							keyCombinationIndex = 1;
						} else {
							keyCombinationIndex = 0;
						}
					}
					break;
			}

			// Check for special move combinations
			checkSpecialMoves(inputBuffer);
		}

		// Handle reload command
		if (key === 'R' && (event.ctrlKey || event.metaKey)) {
			event.preventDefault();
			resetGame();
			return;
		}
	});

	window.addEventListener('keyup', function (event) {
		const key = event.key.toUpperCase(); // Define key variable here

		if (gameActive) {
			switch (event.key) {
				case 'ArrowLeft':
					keyState.ArrowLeft = false;
					player.movingLeft = false;
					break;

				case 'ArrowRight':
					keyState.ArrowRight = false;
					player.movingRight = false;
					break;

				case ' ':
					keyState[' '] = false;
					break;

				case 'x':
				case 'X':
					keyState.x = false;
					break;

				case 'p':
				case 'P':
					keyState.p = false;
					break;

				case 'Enter':
					keyState.Enter = false;
					break;

				default:
					// Handle cheat code sequence
					if (key.length === 1) {
						if (key === keyCombination[keyCombinationIndex]) {
							keyCombinationIndex++;
							if (keyCombinationIndex === keyCombination.length) {
								handleCheatCode();
								keyCombinationIndex = 0;
							}
						} else if (key === 'S') {
							keyCombinationIndex = 1;
						} else {
							keyCombinationIndex = 0;
						}
					}
					break;
			}

			// Check for special move combinations
			checkSpecialMoves(inputBuffer);
		}

		// Handle reload command
		if (key === 'R' && (event.ctrlKey || event.metaKey)) {
			event.preventDefault();
			resetGame();
			return;
		}
	});

	window.addEventListener('keyup', function (event) {
		const key = event.key.toUpperCase(); // Define key variable here

		if (gameActive) {
			switch (event.key) {
				case 'ArrowLeft':
					keyState.ArrowLeft = false;
					player.movingLeft = false;
					break;

				case 'ArrowRight':
					keyState.ArrowRight = false;
					player.movingRight = false;
					break;

				case ' ':
					keyState[' '] = false;
					break;

				case 'x':
				case 'X':
					keyState.x = false;
					break;

				case 'p':
				case 'P':
					keyState.p = false;
					break;

				case 'Enter':
					keyState.Enter = false;
					break;
			}
		}
	});

	// Touch input handling
	let touchStartX = 0;
	let touchStartY = 0;
	const TOUCH_THRESHOLD = 30;
	let isTouchMove = false;
	let lastTouchTime = 0;
	let activeTouches = new Map();

	// Only initialize touch controls on touch-capable devices
	if ('ontouchstart' in window) {
		const handleButtonInteraction = (button, isPress) => {
			if (!gameActive || isPaused) return;

			touchControlState.buttons[button] = isPress;
			if (isPress) {
				if (button === 'shoot') {
					const currentTime = Date.now();
					if (
						currentTime - lastShootTime >=
						(rapidFireMode ? SHOOT_COOLDOWN / 2 : SHOOT_COOLDOWN)
					) {
						shoot(false, false);
						lastShootTime = currentTime;
					}
				} else if (button === 'missile' && (unlimitedHeatseekersMode || heatseekerCount > 0)) {
					const currentTime = Date.now();
					if (currentTime - lastShootTime >= SHOOT_COOLDOWN) {
						shoot(true);
						lastShootTime = currentTime;
						if (!unlimitedHeatseekersMode) {
							heatseekerCount--;
						}
						drawHUD();
					}
				}
			}

			// Trigger haptic feedback if available
			if ('vibrate' in navigator) {
				navigator.vibrate(JOYSTICK_CONFIG.HAPTIC.DURATION.TAP);
			}
		};

		const processTouch = (touch, touchStartData) => {
			if (!touchStartData) return;

			const deltaX = touch.clientX - touchStartData.x;
			const deltaY = touch.clientY - touchStartData.y;
			const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

			// Update touch control state
			touchControlState.movement.active = distance > TOUCH_THRESHOLD;
			if (touchControlState.movement.active) {
				touchControlState.movement.direction = {
					x: deltaX / distance,
					y: deltaY / distance
				};
			}

			return {
				deltaX,
				deltaY,
				distance
			};
		};

		window.addEventListener(
			'touchstart',
			function (event) {
				if (!gameActive || isPaused) return;

				const touch = event.touches[0];
				touchStartX = touch.clientX;
				touchStartY = touch.clientY;
				isTouchMove = false;
				lastTouchTime = Date.now();

				// Store initial touch data
				activeTouches.set(touch.identifier, {
					x: touchStartX,
					y: touchStartY,
					timestamp: lastTouchTime
				});

				// Prevent default behavior only for game controls
				if (event.target.closest('.game-controls')) {
					event.preventDefault();
				}
			},
			{ passive: false }
		);

		window.addEventListener(
			'touchmove',
			function (event) {
				if (!gameActive || isPaused) return;

				const touch = event.touches[0];
				const touchStartData = activeTouches.get(touch.identifier);
				if (!touchStartData) return;

				isTouchMove = true;
				const touchData = processTouch(touch, touchStartData);

				if (touchData && touchData.distance > TOUCH_THRESHOLD) {
					// Handle joystick movement
					if (touchControlState.movement.active) {
						const normalizedX = touchData.deltaX / JOYSTICK_CONFIG.MAX_DISTANCE;
						if (Math.abs(normalizedX) > JOYSTICK_CONFIG.DEADZONE) {
							player.movingLeft = normalizedX < 0;
							player.movingRight = normalizedX > 0;
						} else {
							player.movingLeft = player.movingRight = false;
						}
					}
				}

				// Prevent default behavior only for game controls
				if (event.target.closest('.game-controls')) {
					event.preventDefault();
				}
			},
			{ passive: false }
		);

		window.addEventListener('touchend', function (event) {
			if (!gameActive) return;

			const touch = event.changedTouches[0];
			const touchStartData = activeTouches.get(touch.identifier);
			if (!touchStartData) return;

			// Clean up touch data
			activeTouches.delete(touch.identifier);

			// Reset movement state
			touchControlState.movement.active = false;
			touchControlState.movement.direction = { x: 0, y: 0 };
			player.movingLeft = player.movingRight = false;

			// Handle quick tap for shooting only if it wasn't a move
			if (!isTouchMove) {
				const touchEndTime = Date.now();
				const touchDuration = touchEndTime - touchStartData.timestamp;

				// Only trigger shoot if it was a quick tap on a shoot button
				if (touchDuration < 300 && event.target.closest('.shoot-button')) {
					handleButtonInteraction('shoot', true);
					setTimeout(() => handleButtonInteraction('shoot', false), 50);
				}
			}
		});

		// Prevent default touch behavior for game controls
		window.addEventListener('touchcancel', function (event) {
			const touch = event.changedTouches[0];
			activeTouches.delete(touch.identifier);

			// Reset all movement states
			touchControlState.movement.active = false;
			touchControlState.movement.direction = { x: 0, y: 0 };
			player.movingLeft = player.movingRight = false;
		});
	}

	// Handle window blur/focus
	window.addEventListener('blur', function () {
		if (gameActive) {
			isPaused = true;
			// Reset all input states
			Object.keys(keyState).forEach((key) => (keyState[key] = false));
			player.movingLeft = player.movingRight = false;
			touchControlState.movement.active = false;
			touchControlState.movement.direction = { x: 0, y: 0 };
			Object.keys(touchControlState.buttons).forEach(
				(button) => (touchControlState.buttons[button] = false)
			);
		}
	});

	function checkSpecialMoves(buffer) {
		const now = Date.now();
		const COMBO_WINDOW = 500; // ms window for combo inputs

		// Check for double-tap dash
		const recentInputs = buffer.filter((input) => now - input.time < COMBO_WINDOW);
		if (recentInputs.length >= 2) {
			const lastTwo = recentInputs.slice(-2);
			if (
				lastTwo[0].input === lastTwo[1].input &&
				(lastTwo[0].input === 'left' || lastTwo[0].input === 'right')
			) {
				player.dash();
			}
		}
	}
}

function handleCheatCode() {
	constantPowerUpMode = !constantPowerUpMode;

	if (constantPowerUpMode) {
		// Activate power-up mode with visual effects
		activatePowerUp();
		shakeScreen(200, 5);
		floatingTexts.push(
			new FloatingText(
				canvas.width / 2,
				canvas.height / 2 - 40,
				'★ POWER MODE ON ★',
				NESPalette.lightYellow
			)
		);
	} else {
		// Deactivate all power-up effects
		player.isInvincible = false;
		player.speed = 4;
		unlimitedHeatseekersMode = false;
		rapidFireMode = false;
		powerUpActive = false;
		player.glowColor = null;
		heatseekerCount = 3;

		// Show deactivation message
		floatingTexts.push(
			new FloatingText(
				canvas.width / 2,
				canvas.height / 2 - 40,
				'POWER MODE OFF',
				NESPalette.lightGray
			)
		);
	}
}

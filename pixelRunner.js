const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const player = {
  x: 50,
  y: canvas.height - 30,
  width: 20,
  height: 20,
  speed: 5,
  dx: 0,
};

let obstacles = [];
let gameSpeed = 2;
const obstacleFrequency = 90; // How often to generate obstacles, smaller number means more frequent

function drawPlayer() {
  ctx.fillStyle = "#ff0000"; // Red player
  ctx.fillRect(player.x, player.y, player.width, player.height);
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function newPos() {
  player.x += player.dx;
  detectWalls();
}

function detectWalls() {
  if (player.x < 0) {
    player.x = 0;
  }
  if (player.x + player.width > canvas.width) {
    player.x = canvas.width - player.width;
  }
}

function drawObstacles() {
  obstacles.forEach((obstacle) => {
    ctx.fillStyle = "#0000ff"; // Blue obstacles
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    obstacle.x -= gameSpeed; // Move obstacle
  });

  // Remove off-screen obstacles
  obstacles = obstacles.filter((obstacle) => obstacle.x + obstacle.width > 0);
}

function addObstacle() {
  if (frames % obstacleFrequency === 0) {
    const obstacle = {
      x: canvas.width,
      y: canvas.height - 25,
      width: 20,
      height: 20,
    };
    obstacles.push(obstacle);
  }
}

function updateGame() {
  clearCanvas();
  drawPlayer();
  newPos();
  drawObstacles();
  addObstacle();
  frames++;
  requestAnimationFrame(updateGame);
}

function moveRight() {
  player.dx = player.speed;
}

function moveLeft() {
  player.dx = -player.speed;
}

function keyDown(e) {
  if (e.key === "ArrowRight" || e.key === "Right") {
    moveRight();
  } else if (e.key === "ArrowLeft" || e.key === "Left") {
    moveLeft();
  }
}

function keyUp(e) {
  if (
    e.key === "Right" ||
    e.key === "ArrowRight" ||
    e.key === "Left" ||
    e.key === "ArrowLeft"
  ) {
    player.dx = 0;
  }
}

let frames = 0;
document.addEventListener("keydown", keyDown);
document.addEventListener("keyup", keyUp);

updateGame();

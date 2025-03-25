const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 1200 },
      debug: false,
    },
  },
  scene: {
    preload: preload,
    create: create,
    update: update,
  },
};

const game = new Phaser.Game(config);

let bird;
let pipes;
let score = 0;
let highScore = parseInt(localStorage.getItem("flappyHighScore")) || 0;
let scoreSprites = []; // Array to hold score number sprites
let highScoreSprites = []; // Array to hold high score number sprites
let gameOver = false;
let spaceKey;
const pipeGap = 150;
const pipeSpawnTime = 1500;
let background;
let ground;
let gameOverImage;
let restartButton;

// Sound effects
let flapSound;
let scoreSound;
let hitSound;
let dieSound;
let swooshSound;

function preload() {
  // Load background and base
  this.load.image("background", "./sprites/background-day.png");
  this.load.image("ground", "./sprites/base.png");

  // Load bird animations
  this.load.image("bird-up", "./sprites/yellowbird-upflap.png");
  this.load.image("bird-mid", "./sprites/yellowbird-midflap.png");
  this.load.image("bird-down", "./sprites/yellowbird-downflap.png");

  // Load pipes
  this.load.image("pipe", "./sprites/pipe-green.png");

  // Load UI elements
  this.load.image("gameover", "./sprites/gameover.png");
  this.load.image("message", "./sprites/message.png"); // Get Ready message

  // Load numbers for score
  for (let i = 0; i <= 9; i++) {
    this.load.image(`number${i}`, `./sprites/${i}.png`);
  }

  // Load sound effects
  this.load.audio("flap", ["./audio/wing.ogg", "./audio/wing.wav"]);
  this.load.audio("score", ["./audio/point.ogg", "./audio/point.wav"]);
  this.load.audio("hit", ["./audio/hit.ogg", "./audio/hit.wav"]);
  this.load.audio("die", ["./audio/die.ogg", "./audio/die.wav"]);
  this.load.audio("swoosh", ["./audio/swoosh.ogg", "./audio/swoosh.wav"]);
}

function createNumberDisplay(scene, number, x, y, scale = 1) {
  const numStr = number.toString();
  const digitWidth = 24; // Approximate width of each number sprite
  const totalWidth = numStr.length * digitWidth;
  const startX = x - totalWidth / 2;
  const sprites = [];

  for (let i = 0; i < numStr.length; i++) {
    const digit = parseInt(numStr[i]);
    const sprite = scene.add
      .image(startX + i * digitWidth + digitWidth / 2, y, `number${digit}`)
      .setScale(scale);
    sprites.push(sprite);
  }
  return sprites;
}

function updateScoreDisplay() {
  // Remove existing score sprites
  scoreSprites.forEach((sprite) => sprite.destroy());
  scoreSprites = createNumberDisplay(this, score, config.width / 2, 50, 1.5);

  // Update high score if needed
  if (score > highScore) {
    highScore = score;
    localStorage.setItem("flappyHighScore", highScore);
    // Update high score display
    highScoreSprites.forEach((sprite) => sprite.destroy());
    highScoreSprites = createNumberDisplay(this, highScore, 100, 50, 1);
  }
}

function create() {
  // Add background
  background = this.add.tileSprite(
    0,
    0,
    config.width,
    config.height,
    "background"
  );
  background.setOrigin(0, 0);
  background.setScale(2);

  // Create ground
  ground = this.add.tileSprite(
    0,
    config.height - 112,
    config.width,
    112,
    "ground"
  );
  ground.setOrigin(0, 0);

  // Create bird with animation
  bird = this.physics.add.sprite(100, 300, "bird-mid");
  bird.setScale(1.5);
  bird.setCollideWorldBounds(true);
  bird.body.setSize(20, 20);

  // Create bird animation
  this.anims.create({
    key: "fly",
    frames: [
      { key: "bird-up" },
      { key: "bird-mid" },
      { key: "bird-down" },
      { key: "bird-mid" },
    ],
    frameRate: 12,
    repeat: -1,
  });
  bird.play("fly");

  // Create pipe group
  pipes = this.physics.add.group();

  // Initialize score display
  updateScoreDisplay.call(this);

  // Add high score text label
  this.add.text(20, 20, "MINH CODER", {
    fontSize: "20px",
    fill: "#543847",
    fontFamily: "Arial",
  });

  // Initialize high score display
  highScoreSprites = createNumberDisplay(this, highScore, 100, 50, 1);

  // Setup sound effects
  flapSound = this.sound.add("flap");
  scoreSound = this.sound.add("score");
  hitSound = this.sound.add("hit");
  dieSound = this.sound.add("die");
  swooshSound = this.sound.add("swoosh");

  // Input handling
  spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  this.input.on("pointerdown", flap);

  // Start spawning pipes
  this.time.addEvent({
    delay: pipeSpawnTime,
    callback: spawnPipes,
    callbackScope: this,
    loop: true,
  });

  // Collision detection
  this.physics.add.collider(bird, pipes, gameOverHandler, null, this);
}

function update() {
  if (gameOver) {
    return;
  }

  // Scroll ground
  ground.tilePositionX += 2;

  // Flap with spacebar
  if (Phaser.Input.Keyboard.JustDown(spaceKey)) {
    flap();
  }

  // Rotate bird based on velocity
  if (bird.body.velocity.y > 0) {
    bird.angle += 2;
  } else {
    bird.angle -= 2;
  }
  bird.angle = Phaser.Math.Clamp(bird.angle, -20, 20);

  // Check if bird hits the ground
  if (bird.y >= config.height - 112 - bird.height / 2) {
    gameOverHandler.call(this);
  }

  // Clean up pipes that are off screen
  pipes.getChildren().forEach((pipe) => {
    if (pipe.x < -pipe.width) {
      pipe.destroy();
    }
  });
}

function flap() {
  if (gameOver) {
    resetGame.call(this);
    return;
  }
  bird.setVelocityY(-400);
  flapSound.play(); // Play flap sound
}

function spawnPipes() {
  if (gameOver) return;

  // Calculate random gap position
  const minHeight = 150; // Minimum height for pipes
  const maxHeight = config.height - 150 - pipeGap; // Maximum height considering gap and ground
  const gapStart = Phaser.Math.Between(minHeight, maxHeight);

  // Create top pipe
  const topPipe = pipes.create(config.width, gapStart - pipeGap / 2, "pipe");
  topPipe.body.allowGravity = false;
  topPipe.setVelocityX(-200);
  topPipe.setFlipY(true);
  topPipe.setOrigin(0.5, 1); // Set origin to bottom center for top pipe

  // Create bottom pipe
  const bottomPipe = pipes.create(config.width, gapStart + pipeGap / 2, "pipe");
  bottomPipe.body.allowGravity = false;
  bottomPipe.setVelocityX(-200);
  bottomPipe.setOrigin(0.5, 0); // Set origin to top center for bottom pipe

  // Score zone
  const scoreZone = this.add.zone(config.width + 5, 0, 10, config.height);
  this.physics.world.enable(scoreZone);
  scoreZone.body.allowGravity = false;
  scoreZone.body.setVelocityX(-200);

  this.physics.add.overlap(bird, scoreZone, () => {
    score += 1;
    updateScoreDisplay.call(this);
    scoreSound.play(); // Play score sound
    scoreZone.destroy();
  });
}

function gameOverHandler() {
  if (gameOver) return;

  gameOver = true;
  this.physics.pause();
  bird.anims.pause();

  hitSound.play();
  this.time.delayedCall(300, () => {
    dieSound.play();
  });

  // Show game over image
  gameOverImage = this.add.image(
    config.width / 2,
    config.height / 2 - 50,
    "gameover"
  );
  gameOverImage.setOrigin(0.5);

  // Show final score using number sprites
  const finalScoreSprites = createNumberDisplay(
    this,
    score,
    config.width / 2,
    config.height / 2 + 50,
    1.5
  );

  // Create restart button
  const buttonWidth = 200;
  const buttonHeight = 50;
  const buttonX = config.width / 2 - buttonWidth / 2;
  const buttonY = config.height / 2 + 100;

  restartButton = this.add.rectangle(
    buttonX + buttonWidth / 2,
    buttonY,
    buttonWidth,
    buttonHeight,
    0x00ff00
  );
  restartButton.setInteractive();
  restartButton.on("pointerdown", () => resetGame.call(this));

  // Add text to button
  const buttonText = this.add.text(
    buttonX + buttonWidth / 2,
    buttonY,
    "RESTART",
    {
      fontSize: "32px",
      fill: "#fff",
      fontFamily: "Arial",
    }
  );
  buttonText.setOrigin(0.5);

  // Update high score if needed
  if (score > highScore) {
    highScore = score;
    localStorage.setItem("flappyHighScore", highScore);

    // Show "New High Score!" text
    const newHighScoreText = this.add.text(
      config.width / 2,
      config.height / 2 + 20,
      "New High Score!",
      {
        fontSize: "24px",
        fill: "#ffff00",
        fontFamily: "Arial",
        stroke: "#000000",
        strokeThickness: 4,
      }
    );
    newHighScoreText.setOrigin(0.5);
  }
}

function resetGame() {
  swooshSound.play();
  if (restartButton) restartButton.destroy();
  scoreSprites.forEach((sprite) => sprite.destroy());
  highScoreSprites.forEach((sprite) => sprite.destroy());
  this.scene.restart();
  score = 0;
  gameOver = false;
}

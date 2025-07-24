class SnakeGamePro {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.scoreElement = document.getElementById("scoreDisplay");
    this.highScoreElement = document.getElementById("highScoreDisplay");
    this.lengthElement = document.getElementById("lengthDisplay");
    this.gameOverOverlay = document.getElementById("gameOverOverlay");
    this.pauseOverlay = document.getElementById("pauseOverlay");
    this.startOverlay = document.getElementById("startOverlay");
    this.finalScoreElement = document.getElementById("finalScore");

    // Game settings
    this.gridSize = 24;
    this.tileCount = this.canvas.width / this.gridSize;
    this.gameSpeed = 150;

    // Game state
    this.snake = [{ x: 10, y: 10 }];
    this.food = {};
    this.powerUp = null;
    this.dx = 0;
    this.dy = 0;
    this.score = 0;
    this.highScore = localStorage.getItem("snakeHighScore") || 0;
    this.gameRunning = false;
    this.gamePaused = false;
    this.gameStarted = false;
    this.animationId = null;
    this.lastTime = 0;

    this.init();
  }

  init() {
    this.updateHighScore();
    this.generateFood();
    this.setupEventListeners();
    this.setupDifficultySelector();
    this.gameLoop(0);
  }

  setupEventListeners() {
    document.addEventListener("keydown", (e) => {
      this.handleKeyPress(e);
    });

    // Touch controls for mobile
    this.setupTouchControls();
  }

  setupTouchControls() {
    let touchStartX = 0;
    let touchStartY = 0;

    this.canvas.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      },
      { passive: false }
    );

    this.canvas.addEventListener(
      "touchend",
      (e) => {
        e.preventDefault();
        if (!touchStartX || !touchStartY) return;

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;

        const diffX = touchStartX - touchEndX;
        const diffY = touchStartY - touchEndY;

        if (Math.abs(diffX) > Math.abs(diffY)) {
          if (diffX > 0) {
            this.changeDirection({ keyCode: 37 });
          } else {
            this.changeDirection({ keyCode: 39 });
          }
        } else {
          if (diffY > 0) {
            this.changeDirection({ keyCode: 38 });
          } else {
            this.changeDirection({ keyCode: 40 });
          }
        }

        if (!this.gameRunning && this.gameStarted) {
          this.startGame();
        }

        touchStartX = 0;
        touchStartY = 0;
      },
      { passive: false }
    );
  }

  setupDifficultySelector() {
    const difficultyBtns = document.querySelectorAll(".difficulty-btn");
    difficultyBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        difficultyBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.gameSpeed = parseInt(btn.dataset.speed);
      });
    });
  }

  handleKeyPress(event) {
    const keyPressed = event.keyCode;

    // Start game if not started
    if (!this.gameStarted && this.startOverlay.classList.contains("show")) {
      if ([37, 38, 39, 40, 32].includes(keyPressed)) {
        this.startNewGame();
        return;
      }
    }

    // Pause/unpause
    if (keyPressed === 32) {
      // Spacebar
      event.preventDefault();
      if (this.gameStarted) {
        this.togglePause();
      }
      return;
    }

    // Restart
    if (keyPressed === 82) {
      // R key
      event.preventDefault();
      this.restartGame();
      return;
    }

    // Movement
    if (this.gameRunning && !this.gamePaused) {
      this.changeDirection(event);
    }
  }

  changeDirection(event) {
    const keyPressed = event.keyCode;
    const goingUp = this.dy === -1;
    const goingDown = this.dy === 1;
    const goingRight = this.dx === 1;
    const goingLeft = this.dx === -1;

    if (keyPressed === 37 && !goingRight) {
      // Left
      this.dx = -1;
      this.dy = 0;
    }
    if (keyPressed === 38 && !goingDown) {
      // Up
      this.dx = 0;
      this.dy = -1;
    }
    if (keyPressed === 39 && !goingLeft) {
      // Right
      this.dx = 1;
      this.dy = 0;
    }
    if (keyPressed === 40 && !goingUp) {
      // Down
      this.dx = 0;
      this.dy = 1;
    }
  }

  startNewGame() {
    this.hideStartScreen();
    this.gameStarted = true;
    this.startGame();
  }

  startGame() {
    if (this.dx === 0 && this.dy === 0) {
      this.dx = 1;
    }
    this.gameRunning = true;
    this.gamePaused = false;
    this.hideAllOverlays();
  }

  togglePause() {
    if (!this.gameStarted || !this.gameRunning) return;

    this.gamePaused = !this.gamePaused;
    if (this.gamePaused) {
      this.showPauseOverlay();
    } else {
      this.hidePauseOverlay();
    }
  }

  gameLoop(currentTime) {
    this.animationId = requestAnimationFrame((time) => this.gameLoop(time));

    if (currentTime - this.lastTime < this.gameSpeed) {
      return;
    }

    this.lastTime = currentTime;

    this.clearCanvas();
    this.drawFood();
    if (this.powerUp) this.drawPowerUp();

    if (this.gameRunning && !this.gamePaused) {
      this.advanceSnake();
    }

    this.drawSnake();
  }

  clearCanvas() {
    // Create gradient background
    const gradient = this.ctx.createLinearGradient(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );
    gradient.addColorStop(0, "#000000");
    gradient.addColorStop(1, "#0a0a0a");
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw grid
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    this.ctx.lineWidth = 1;
    for (let i = 0; i <= this.tileCount; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(i * this.gridSize, 0);
      this.ctx.lineTo(i * this.gridSize, this.canvas.height);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(0, i * this.gridSize);
      this.ctx.lineTo(this.canvas.width, i * this.gridSize);
      this.ctx.stroke();
    }
  }

  drawSnake() {
    this.snake.forEach((segment, index) => {
      const x = segment.x * this.gridSize;
      const y = segment.y * this.gridSize;

      if (index === 0) {
        // Draw head with gradient
        const gradient = this.ctx.createRadialGradient(
          x + this.gridSize / 2,
          y + this.gridSize / 2,
          0,
          x + this.gridSize / 2,
          y + this.gridSize / 2,
          this.gridSize / 2
        );
        gradient.addColorStop(0, "#00ff88");
        gradient.addColorStop(1, "#00d4aa");
        this.ctx.fillStyle = gradient;

        this.ctx.fillRect(x + 2, y + 2, this.gridSize - 4, this.gridSize - 4);

        // Draw eyes
        this.ctx.fillStyle = "#000";
        const eyeSize = 3;
        const eyeOffset = 6;
        this.ctx.fillRect(x + eyeOffset, y + eyeOffset, eyeSize, eyeSize);
        this.ctx.fillRect(
          x + this.gridSize - eyeOffset - eyeSize,
          y + eyeOffset,
          eyeSize,
          eyeSize
        );
      } else {
        // Draw body with slight transparency gradient
        const alpha = Math.max(0.3, 1 - index * 0.05);
        this.ctx.fillStyle = `rgba(0, 255, 136, ${alpha})`;
        this.ctx.fillRect(x + 3, y + 3, this.gridSize - 6, this.gridSize - 6);

        // Add inner highlight
        this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.2})`;
        this.ctx.fillRect(x + 4, y + 4, this.gridSize - 8, 2);
      }
    });
  }

  drawFood() {
    const x = this.food.x * this.gridSize;
    const y = this.food.y * this.gridSize;

    // Draw food with pulsing effect
    const time = Date.now() * 0.005;
    const pulse = Math.sin(time) * 0.1 + 0.9;
    const size = (this.gridSize - 6) * pulse;
    const offset = (this.gridSize - size) / 2;

    const gradient = this.ctx.createRadialGradient(
      x + this.gridSize / 2,
      y + this.gridSize / 2,
      0,
      x + this.gridSize / 2,
      y + this.gridSize / 2,
      size / 2
    );
    gradient.addColorStop(0, "#ff4757");
    gradient.addColorStop(0.7, "#ff3742");
    gradient.addColorStop(1, "#c44569");

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(
      x + this.gridSize / 2,
      y + this.gridSize / 2,
      size / 2,
      0,
      2 * Math.PI
    );
    this.ctx.fill();

    // Add sparkle effect
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    this.ctx.beginPath();
    this.ctx.arc(
      x + this.gridSize / 2 - 3,
      y + this.gridSize / 2 - 3,
      2,
      0,
      2 * Math.PI
    );
    this.ctx.fill();
  }

  advanceSnake() {
    const head = {
      x: this.snake[0].x + this.dx,
      y: this.snake[0].y + this.dy,
    };

    // Check wall collision
    if (
      head.x < 0 ||
      head.x >= this.tileCount ||
      head.y < 0 ||
      head.y >= this.tileCount
    ) {
      this.gameOver();
      return;
    }

    // Check self collision
    for (let segment of this.snake) {
      if (head.x === segment.x && head.y === segment.y) {
        this.gameOver();
        return;
      }
    }

    this.snake.unshift(head);

    // Check if food is eaten
    if (head.x === this.food.x && head.y === this.food.y) {
      this.score += 10;
      this.updateScore();
      this.updateLength();
      this.generateFood();
      this.createFoodParticles(head.x * this.gridSize, head.y * this.gridSize);

      // Increase speed slightly
      if (this.gameSpeed > 50) {
        this.gameSpeed = Math.max(50, this.gameSpeed - 2);
      }
    } else {
      this.snake.pop();
    }
  }

  createFoodParticles(x, y) {
    for (let i = 0; i < 8; i++) {
      const particle = document.createElement("div");
      particle.className = "particle";
      particle.style.left = x + Math.random() * this.gridSize + "px";
      particle.style.top = y + Math.random() * this.gridSize + "px";
      document.querySelector(".game-board").appendChild(particle);

      setTimeout(() => {
        particle.remove();
      }, 2000);
    }
  }

  generateFood() {
    let newFood;
    do {
      newFood = {
        x: Math.floor(Math.random() * this.tileCount),
        y: Math.floor(Math.random() * this.tileCount),
      };
    } while (
      this.snake.some(
        (segment) => segment.x === newFood.x && segment.y === newFood.y
      )
    );

    this.food = newFood;
  }

  updateScore() {
    this.scoreElement.textContent = this.score;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.updateHighScore();
      localStorage.setItem("snakeHighScore", this.highScore);
    }
  }

  updateHighScore() {
    this.highScoreElement.textContent = this.highScore;
  }

  updateLength() {
    this.lengthElement.textContent = this.snake.length;
  }

  gameOver() {
    this.gameRunning = false;
    this.finalScoreElement.textContent = this.score;
    this.showGameOverOverlay();
  }

  showStartScreen() {
    this.startOverlay.classList.add("show");
  }

  hideStartScreen() {
    this.startOverlay.classList.remove("show");
  }

  showGameOverOverlay() {
    this.gameOverOverlay.classList.add("show");
  }

  hideGameOverOverlay() {
    this.gameOverOverlay.classList.remove("show");
  }

  showPauseOverlay() {
    this.pauseOverlay.classList.add("show");
  }

  hidePauseOverlay() {
    this.pauseOverlay.classList.remove("show");
  }

  hideAllOverlays() {
    this.hideGameOverOverlay();
    this.hidePauseOverlay();
    this.hideStartScreen();
  }

  restart() {
    this.snake = [{ x: 10, y: 10 }];
    this.dx = 0;
    this.dy = 0;
    this.score = 0;
    this.gameRunning = false;
    this.gamePaused = false;
    this.gameStarted = false;
    this.gameSpeed = 150;
    this.updateScore();
    this.updateLength();
    this.generateFood();
    this.hideAllOverlays();
    this.showStartScreen();
  }
}

// Initialize the game
const game = new SnakeGamePro();

// Global functions
function startNewGame() {
  game.startNewGame();
}

function restartGame() {
  game.restart();
}

function togglePause() {
  game.togglePause();
}

function showStartScreen() {
  game.restart();
}

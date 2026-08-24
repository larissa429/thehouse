/* ============================================================
   boardwalk.js — "Boardwalk Dash", a Chrome-dino-style endless runner.
   Indigo sprints the length of the Boardwalk, jumping benches and
   lampposts that scroll in from the right at an ever-increasing speed.

   Same fixed-internal-resolution canvas approach as merge.js — CSS
   scales the element visually, all game math stays in STAGE_W x STAGE_H
   coordinate space regardless of the on-screen size.
   ============================================================ */
(function () {
  var root = document.getElementById('boardwalkGame');
  if (!root) return;

  var canvas = document.getElementById('boardwalkCanvas');
  var ctx = canvas.getContext('2d');
  var scoreEl = document.getElementById('boardwalkScore');
  var bestEl = document.getElementById('boardwalkBest');
  var startEl = document.getElementById('boardwalkStart');
  var gameOverEl = document.getElementById('boardwalkGameOver');
  var finalScoreEl = document.getElementById('boardwalkFinalScore');
  var restartBtn = document.getElementById('boardwalkRestart');
  var restartBtn2 = document.getElementById('boardwalkRestart2');

  var STAGE_W = 800;
  var STAGE_H = 300;
  canvas.width = STAGE_W;
  canvas.height = STAGE_H;

  var GROUND_Y = STAGE_H - 46;
  var INDIGO_X = 90;
  var INDIGO_SIZE = 56;
  var GRAVITY = 2600; // px/s^2
  var JUMP_VELOCITY = -900; // px/s
  var START_SPEED = 320; // px/s
  var MAX_SPEED = 720;
  var SPEED_RAMP = 6; // px/s gained per second survived

  var BEST_KEY = 'boardwalk-best';

  var indigoImg = new Image();
  indigoImg.src = '../images/icons/indigo.png';

  var state = 'idle'; // 'idle' | 'playing' | 'gameover'
  var indigoY, velocityY, obstacles, speed, elapsed, score, best, spawnTimer, lastTime;

  function loadBest() {
    var raw = localStorage.getItem(BEST_KEY);
    return raw ? parseInt(raw, 10) || 0 : 0;
  }

  function renderBest() {
    bestEl.textContent = best > 0 ? best : '—';
  }

  function resetGame() {
    indigoY = GROUND_Y - INDIGO_SIZE;
    velocityY = 0;
    obstacles = [];
    speed = START_SPEED;
    elapsed = 0;
    score = 0;
    spawnTimer = 900; // ms until first obstacle
    scoreEl.textContent = '0';
  }

  function startGame() {
    resetGame();
    state = 'playing';
    startEl.hidden = true;
    gameOverEl.hidden = true;
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  function jump() {
    if (state === 'idle') { startGame(); return; }
    if (state === 'gameover') { startGame(); return; }
    if (indigoY >= GROUND_Y - INDIGO_SIZE - 0.5) {
      velocityY = JUMP_VELOCITY;
    }
  }

  // Obstacles alternate between a low bench (jump-over) and a taller
  // lamppost, so it's not just the same silhouette repeating.
  function spawnObstacle() {
    var isLamp = Math.random() < 0.4;
    var h = isLamp ? 70 : 34;
    var w = isLamp ? 14 : 46;
    obstacles.push({ x: STAGE_W + w, w: w, h: h, type: isLamp ? 'lamp' : 'bench' });
  }

  function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function update(dt) {
    elapsed += dt;
    speed = Math.min(MAX_SPEED, START_SPEED + elapsed * SPEED_RAMP);

    velocityY += GRAVITY * dt;
    indigoY += velocityY * dt;
    if (indigoY > GROUND_Y - INDIGO_SIZE) {
      indigoY = GROUND_Y - INDIGO_SIZE;
      velocityY = 0;
    }

    spawnTimer -= dt * 1000;
    if (spawnTimer <= 0) {
      spawnObstacle();
      // interval shrinks as speed rises, floored so it never becomes unfair-instant
      var base = Math.max(650, 1500 - elapsed * 18);
      spawnTimer = base + Math.random() * 500;
    }

    var indigoBox = { x: INDIGO_X + 8, y: indigoY + 6, w: INDIGO_SIZE - 16, h: INDIGO_SIZE - 10 };
    for (var i = obstacles.length - 1; i >= 0; i--) {
      var o = obstacles[i];
      o.x -= speed * dt;
      if (o.x + o.w < -20) { obstacles.splice(i, 1); continue; }
      var oy = GROUND_Y - o.h;
      if (rectsOverlap(indigoBox.x, indigoBox.y, indigoBox.w, indigoBox.h, o.x, oy, o.w, o.h)) {
        endGame(o.type);
        return;
      }
    }

    score = Math.floor(elapsed * 10);
    scoreEl.textContent = String(score);
  }

  var GAME_OVER_TITLES = { lamp: 'Caught a lamppost.', bench: 'Ran into a bench.' };

  function endGame(obstacleType) {
    state = 'gameover';
    if (score > best) {
      best = score;
      localStorage.setItem(BEST_KEY, String(best));
      renderBest();
    }
    gameOverEl.querySelector('.merge-gameover-title').textContent = GAME_OVER_TITLES[obstacleType] || 'Ouch.';
    finalScoreEl.textContent = String(score);
    gameOverEl.hidden = false;
  }

  function drawBackground() {
    var sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    sky.addColorStop(0, '#1a1310');
    sky.addColorStop(1, '#3a2a1c');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, STAGE_W, GROUND_Y);

    // string lights along the top, warm and steady
    ctx.fillStyle = '#e3a94e';
    for (var lx = 20; lx < STAGE_W; lx += 60) {
      var sway = Math.sin((lx + elapsed * 40) * 0.02) * 4;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(lx, 22 + sway, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.15;
      ctx.beginPath();
      ctx.arc(lx, 22 + sway, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ground: boardwalk planks
    ctx.fillStyle = '#251b15';
    ctx.fillRect(0, GROUND_Y, STAGE_W, STAGE_H - GROUND_Y);
    ctx.strokeStyle = 'rgba(157, 133, 112, 0.35)';
    ctx.lineWidth = 2;
    var plankOffset = (elapsed * speed * 0.35) % 40;
    for (var px = -plankOffset; px < STAGE_W + 40; px += 40) {
      ctx.beginPath();
      ctx.moveTo(px, GROUND_Y);
      ctx.lineTo(px - 10, STAGE_H);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(STAGE_W, GROUND_Y);
    ctx.strokeStyle = '#9d8570';
    ctx.stroke();
  }

  function drawObstacle(o) {
    var oy = GROUND_Y - o.h;
    if (o.type === 'lamp') {
      ctx.fillStyle = '#403022';
      ctx.fillRect(o.x + o.w / 2 - 2, oy + 10, 4, o.h - 10);
      ctx.fillStyle = '#e3a94e';
      ctx.beginPath();
      ctx.arc(o.x + o.w / 2, oy + 8, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      ctx.arc(o.x + o.w / 2, oy + 8, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = '#403022';
      ctx.fillRect(o.x, oy, o.w, o.h - 10);
      ctx.fillStyle = '#251b15';
      ctx.fillRect(o.x + 4, oy + o.h - 10, 4, 10);
      ctx.fillRect(o.x + o.w - 8, oy + o.h - 10, 4, 10);
    }
  }

  function drawIndigo() {
    var squash = velocityY < -100 ? 1.08 : (velocityY > 400 ? 0.92 : 1);
    ctx.save();
    ctx.translate(INDIGO_X + INDIGO_SIZE / 2, indigoY + INDIGO_SIZE);
    ctx.scale(1, squash);
    if (indigoImg.complete && indigoImg.naturalWidth) {
      ctx.drawImage(indigoImg, -INDIGO_SIZE / 2, -INDIGO_SIZE, INDIGO_SIZE, INDIGO_SIZE);
    } else {
      ctx.fillStyle = '#3b6ea5';
      ctx.fillRect(-INDIGO_SIZE / 2, -INDIGO_SIZE, INDIGO_SIZE, INDIGO_SIZE);
    }
    ctx.restore();
  }

  function draw() {
    drawBackground();
    obstacles.forEach(drawObstacle);
    drawIndigo();
  }

  function loop(now) {
    if (state !== 'playing') return;
    var dt = Math.min(0.05, (now - lastTime) / 1000); // clamp so a tab-switch stall doesn't teleport things
    lastTime = now;
    update(dt);
    if (state !== 'playing') { draw(); return; } // draw the frame the collision happened on
    draw();
    requestAnimationFrame(loop);
  }

  function drawIdleFrame() {
    elapsed = 0;
    speed = START_SPEED;
    obstacles = [];
    indigoY = GROUND_Y - INDIGO_SIZE;
    velocityY = 0;
    draw();
  }

  best = loadBest();
  renderBest();
  drawIdleFrame();

  document.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault();
      jump();
    }
  });
  canvas.addEventListener('pointerdown', jump);
  // The start overlay sits visually on top of the canvas (same
  // .merge-gameover positioning as the game-over screen), so a tap/click
  // there never reaches canvas's own listener — it needs its own.
  startEl.addEventListener('pointerdown', jump);
  restartBtn.addEventListener('click', startGame);
  restartBtn2.addEventListener('click', startGame);
})();

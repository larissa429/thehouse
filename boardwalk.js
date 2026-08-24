/* ============================================================
   boardwalk.js — "Boardwalk Dash", a Chrome-dino-style endless runner.
   Indigo sprints the length of the Boardwalk, jumping obstacles that
   scroll in from the right at an ever-increasing speed.

   Same fixed-internal-resolution canvas approach as merge.js — CSS
   scales the element visually, all game math stays in STAGE_W x STAGE_H
   coordinate space regardless of the on-screen size.

   Everything content-related (Indigo's run frames, obstacle types,
   background cameos) is data-driven from the config blocks below, so
   dropping in new art is just adding a file + one line, not a rewrite.
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

  function loadImage(src) {
    var img = new Image();
    img.src = src;
    return img;
  }

  // --- Indigo's sprite -------------------------------------------------
  // Add a second (or third+) running frame here once it exists — the
  // animation cycles through however many are in this list, no other
  // code changes needed. One entry = the current static look.
  var INDIGO_RUN_FRAME_SRCS = ['../images/icons/indigo.png'];
  var INDIGO_JUMP_FRAME_SRC = '../images/icons/indigo.png'; // swap for a dedicated jump pose later
  var RUN_FRAME_RATE = 8; // frames per second while grounded, only matters once there's >1 frame

  var indigoRunFrames = INDIGO_RUN_FRAME_SRCS.map(loadImage);
  var indigoJumpFrame = loadImage(INDIGO_JUMP_FRAME_SRC);

  // --- Obstacle types ----------------------------------------------------
  // Add a new obstacle by adding an entry here. `image` draws a sprite;
  // omit it to fall back to a hand-drawn shape in drawObstacle() (only
  // 'bench' and 'lamp' have one — anything else without an image falls
  // back further to a plain box). `weight` controls how often it's
  // picked relative to the others (higher = more common).
  var OBSTACLE_TYPES = [
    { type: 'bench', w: 46, h: 34, weight: 3, title: 'Ran into a bench.' },
    { type: 'lamp', w: 14, h: 70, weight: 2, title: 'Caught a lamppost.' }
    // Example once a resident obstacle exists:
    // { type: 'charlie', w: 50, h: 50, weight: 1, image: '../images/boardwalk/charlie-obstacle.png', title: 'Tripped over Charlie.' }
  ];
  var obstacleImages = {}; // type -> Image, only populated for types with an `image`
  OBSTACLE_TYPES.forEach(function (def) {
    if (def.image) obstacleImages[def.type] = loadImage(def.image);
  });
  var OBSTACLE_WEIGHT_TOTAL = OBSTACLE_TYPES.reduce(function (sum, d) { return sum + d.weight; }, 0);

  function obstacleDef(type) {
    for (var i = 0; i < OBSTACLE_TYPES.length; i++) if (OBSTACLE_TYPES[i].type === type) return OBSTACLE_TYPES[i];
    return null;
  }

  function pickObstacleType() {
    var roll = Math.random() * OBSTACLE_WEIGHT_TOTAL;
    for (var i = 0; i < OBSTACLE_TYPES.length; i++) {
      roll -= OBSTACLE_TYPES[i].weight;
      if (roll <= 0) return OBSTACLE_TYPES[i];
    }
    return OBSTACLE_TYPES[OBSTACLE_TYPES.length - 1];
  }

  // --- Background cameos ---------------------------------------------
  // Purely decorative — no collision. Add a resident image here and
  // they'll start wandering through the background automatically.
  var BACKGROUND_CAMEO_SRCS = [
    '../images/icons/mirror.png',
    '../images/icons/journal.png'
  ];
  var cameoImages = BACKGROUND_CAMEO_SRCS.map(loadImage);
  var CAMEO_SIZE = 40;
  var CAMEO_Y_OFFSET = 6; // sits just above the ground line
  var CAMEO_MIN_GAP = 1800; // ms between cameo spawns
  var CAMEO_MAX_GAP = 3600;
  var CAMEO_PARALLAX = 0.4; // fraction of foreground speed — makes them read as "behind" the action

  var state = 'idle'; // 'idle' | 'playing' | 'gameover'
  var indigoY, velocityY, obstacles, cameos, speed, elapsed, score, best, spawnTimer, cameoSpawnTimer, lastTime;

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
    cameos = [];
    speed = START_SPEED;
    elapsed = 0;
    score = 0;
    spawnTimer = 900; // ms until first obstacle
    cameoSpawnTimer = 1500;
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

  function spawnObstacle() {
    var def = pickObstacleType();
    obstacles.push({ x: STAGE_W + def.w, w: def.w, h: def.h, type: def.type });
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

    cameoSpawnTimer -= dt * 1000;
    if (cameoSpawnTimer <= 0 && cameoImages.length) {
      var img = cameoImages[Math.floor(Math.random() * cameoImages.length)];
      cameos.push({ x: STAGE_W + CAMEO_SIZE, img: img });
      cameoSpawnTimer = CAMEO_MIN_GAP + Math.random() * (CAMEO_MAX_GAP - CAMEO_MIN_GAP);
    }
    for (var ci = cameos.length - 1; ci >= 0; ci--) {
      cameos[ci].x -= speed * CAMEO_PARALLAX * dt;
      if (cameos[ci].x + CAMEO_SIZE < -20) cameos.splice(ci, 1);
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

  function endGame(obstacleType) {
    state = 'gameover';
    if (score > best) {
      best = score;
      localStorage.setItem(BEST_KEY, String(best));
      renderBest();
    }
    var def = obstacleDef(obstacleType);
    gameOverEl.querySelector('.merge-gameover-title').textContent = (def && def.title) || 'Ouch.';
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

  // Purely atmospheric — drawn behind obstacles/Indigo, dimmed and
  // scrolling slower so they read as background rather than something
  // to dodge.
  function drawCameos() {
    cameos.forEach(function (c) {
      if (c.img.complete && c.img.naturalWidth) {
        ctx.globalAlpha = 0.55;
        ctx.drawImage(c.img, c.x, GROUND_Y - CAMEO_SIZE - CAMEO_Y_OFFSET, CAMEO_SIZE, CAMEO_SIZE);
        ctx.globalAlpha = 1;
      }
    });
  }

  function drawObstacle(o) {
    var oy = GROUND_Y - o.h;
    var img = obstacleImages[o.type];
    if (img && img.complete && img.naturalWidth) {
      ctx.drawImage(img, o.x, oy, o.w, o.h);
      return;
    }
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
    } else if (o.type === 'bench') {
      ctx.fillStyle = '#403022';
      ctx.fillRect(o.x, oy, o.w, o.h - 10);
      ctx.fillStyle = '#251b15';
      ctx.fillRect(o.x + 4, oy + o.h - 10, 4, 10);
      ctx.fillRect(o.x + o.w - 8, oy + o.h - 10, 4, 10);
    } else {
      // generic fallback for a new type that doesn't have art or a
      // hand-drawn shape yet — visible enough to notice, not a crash
      ctx.fillStyle = '#403022';
      ctx.fillRect(o.x, oy, o.w, o.h);
    }
  }

  function drawIndigo() {
    var grounded = indigoY >= GROUND_Y - INDIGO_SIZE - 0.5;
    var squash = velocityY < -100 ? 1.08 : (velocityY > 400 ? 0.92 : 1);
    var frame = grounded
      ? indigoRunFrames[Math.floor(elapsed * RUN_FRAME_RATE) % indigoRunFrames.length]
      : indigoJumpFrame;

    ctx.save();
    ctx.translate(INDIGO_X + INDIGO_SIZE / 2, indigoY + INDIGO_SIZE);
    ctx.scale(1, squash);
    if (frame && frame.complete && frame.naturalWidth) {
      ctx.drawImage(frame, -INDIGO_SIZE / 2, -INDIGO_SIZE, INDIGO_SIZE, INDIGO_SIZE);
    } else {
      ctx.fillStyle = '#3b6ea5';
      ctx.fillRect(-INDIGO_SIZE / 2, -INDIGO_SIZE, INDIGO_SIZE, INDIGO_SIZE);
    }
    ctx.restore();
  }

  function draw() {
    drawBackground();
    drawCameos();
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
    resetGame();
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

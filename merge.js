(function () {
  var root = document.getElementById('mergeGame');
  if (!root || typeof Matter === 'undefined') return;

  var canvas = document.getElementById('mergeCanvas');
  var ctx = canvas.getContext('2d');
  var scoreEl = document.getElementById('mergeScore');
  var bestEl = document.getElementById('mergeBest');
  var gameOverEl = document.getElementById('mergeGameOver');
  var finalScoreEl = document.getElementById('mergeFinalScore');
  var restartBtn = document.getElementById('mergeRestart');
  var restartBtn2 = document.getElementById('mergeRestart2');

  var STAGE_W = 400;
  var STAGE_H = 560;
  var WALL = 12;
  var SPAWN_Y = 40;
  var DANGER_Y = 128;
  var GAME_OVER_GRACE = 1.3;
  var DROP_COOLDOWN = 380;
  var SPAWNABLE_TIERS = 5;
  var DEFAULT_ICON_ZOOM = 1.28;

  var TIERS = [
    { name: 'Dream', icon: 'dream.png', radius: 17 },
    { name: '-⁵⁄₂₈', icon: 'n528.png', radius: 22 },
    { name: 'LP', icon: 'lp.png', radius: 27, zoom: 1.32, offsetX: -0.03 },
    { name: 'Cassette', icon: 'cassette.png', radius: 32 },
    { name: 'Blue Marble', icon: 'bluemarble.png', radius: 38 },
    { name: 'Abstract Painting', icon: 'ap.png', radius: 45 },
    { name: 'Indigo', icon: 'indigo.png', radius: 52 },
    { name: 'Green D.A.I.S.Y.', icon: 'greendaisy.png', radius: 59 },
    { name: 'Charlie', icon: 'charlie.png', radius: 66, zoom: 1.4, offsetX: 0.06, offsetY: 0.04 },
    { name: 'Mirror', icon: 'mirror.png', radius: 73, zoom: 1.45, offsetY: -0.07 },
    { name: 'Journal', icon: 'journal.png', radius: 80, zoom: 1.5, offsetX: 0.06, offsetY: -0.02 },
    { name: 'The House', icon: 'the house.png', radius: 90 }
  ];

  var tierImages = TIERS.map(function (t) {
    var img = new Image();
    img.src = '../images/icons/' + encodeURIComponent(t.icon);
    return img;
  });

  var Engine = Matter.Engine, World = Matter.World, Bodies = Matter.Bodies,
      Body = Matter.Body, Composite = Matter.Composite, Events = Matter.Events;

  var engine, world;

  function buildWalls() {
    var thickness = WALL * 2;
    return [
      Bodies.rectangle(STAGE_W / 2, STAGE_H + thickness / 2 - WALL, STAGE_W, thickness, { isStatic: true }),
      Bodies.rectangle(-thickness / 2 + WALL, STAGE_H / 2, thickness, STAGE_H * 2, { isStatic: true }),
      Bodies.rectangle(STAGE_W + thickness / 2 - WALL, STAGE_H / 2, thickness, STAGE_H * 2, { isStatic: true })
    ];
  }

  function createPieceBody(tierIndex, x, y) {
    var tier = TIERS[tierIndex];
    var body = Bodies.circle(x, y, tier.radius, {
      restitution: 0.12,
      friction: 0.5,
      frictionAir: 0.0015,
      density: 0.0016
    });
    body.gameData = { tier: tierIndex };
    return body;
  }

  var score = 0;
  var bestTierSeen = -1;
  var pendingTier = null;
  var pendingX = STAGE_W / 2;
  var aiming = false;
  var dropLocked = false;
  var isOver = false;
  var overTime = 0;
  var pendingMerges = [];
  var mergingIds = {};

  function randomSpawnTier() {
    return Math.floor(Math.random() * SPAWNABLE_TIERS);
  }

  function clampX(x, radius) {
    return Math.max(WALL + radius, Math.min(STAGE_W - WALL - radius, x));
  }

  function updateHud() {
    scoreEl.textContent = String(score);
    bestEl.textContent = bestTierSeen >= 0 ? TIERS[bestTierSeen].name : '—';
  }

  function resetGame() {
    if (world) {
      World.clear(world, false);
    }
    engine = Engine.create();
    world = engine.world;
    world.gravity.y = 1;
    Composite.add(world, buildWalls());

    Events.on(engine, 'collisionStart', handleCollisions);

    score = 0;
    bestTierSeen = -1;
    isOver = false;
    overTime = 0;
    pendingMerges = [];
    mergingIds = {};
    dropLocked = false;
    gameOverEl.hidden = true;
    updateHud();
    spawnNextPending();
  }

  function spawnNextPending() {
    pendingTier = randomSpawnTier();
    pendingX = clampX(STAGE_W / 2, TIERS[pendingTier].radius);
  }

  function handleCollisions(event) {
    for (var i = 0; i < event.pairs.length; i++) {
      var pair = event.pairs[i];
      var a = pair.bodyA, b = pair.bodyB;
      if (!a.gameData || !b.gameData) continue;
      if (mergingIds[a.id] || mergingIds[b.id]) continue;
      if (a.gameData.tier !== b.gameData.tier) continue;
      if (a.gameData.tier >= TIERS.length - 1) continue;

      mergingIds[a.id] = true;
      mergingIds[b.id] = true;
      pendingMerges.push({ a: a, b: b, tier: a.gameData.tier });
    }
  }

  function processMerges() {
    if (!pendingMerges.length) return;
    var merges = pendingMerges;
    pendingMerges = [];

    merges.forEach(function (m) {
      if (!Composite.get(world, m.a.id, 'body') || !Composite.get(world, m.b.id, 'body')) return;

      var midX = (m.a.position.x + m.b.position.x) / 2;
      var midY = (m.a.position.y + m.b.position.y) / 2;
      World.remove(world, m.a);
      World.remove(world, m.b);
      delete mergingIds[m.a.id];
      delete mergingIds[m.b.id];

      var nextTier = m.tier + 1;
      var newBody = createPieceBody(nextTier, midX, midY);
      Composite.add(world, newBody);

      score += (nextTier + 1) * 10;
      if (nextTier > bestTierSeen) bestTierSeen = nextTier;
    });

    updateHud();
  }

  function dropPending() {
    if (dropLocked || isOver || pendingTier === null) return;
    var body = createPieceBody(pendingTier, pendingX, SPAWN_Y);
    Composite.add(world, body);
    pendingTier = null;
    dropLocked = true;
    setTimeout(function () {
      dropLocked = false;
      spawnNextPending();
    }, DROP_COOLDOWN);
  }

  function checkGameOver(dt) {
    var bodies = Composite.allBodies(world);
    var danger = false;
    for (var i = 0; i < bodies.length; i++) {
      var body = bodies[i];
      if (body.isStatic || !body.gameData) continue;
      var speed = Math.hypot(body.velocity.x, body.velocity.y);
      var top = body.position.y - body.circleRadius;
      if (top < DANGER_Y && speed < 0.6) {
        danger = true;
        break;
      }
    }
    overTime = danger ? overTime + dt : 0;
    if (overTime > GAME_OVER_GRACE) {
      isOver = true;
      finalScoreEl.textContent = String(score);
      gameOverEl.hidden = false;
    }
  }

  function drawTile(x, y, angle, tierIndex, ghost) {
    var tier = TIERS[tierIndex];
    var img = tierImages[tierIndex];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle || 0);
    ctx.globalAlpha = ghost ? 0.55 : 1;
    ctx.beginPath();
    ctx.arc(0, 0, tier.radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.save();
    ctx.clip();
    if (img.complete && img.naturalWidth) {
      var zoom = tier.zoom || DEFAULT_ICON_ZOOM;
      var iw = img.naturalWidth, ih = img.naturalHeight;
      var sw = iw / zoom, sh = ih / zoom;
      var sx = (iw - sw) / 2 + (tier.offsetX || 0) * iw;
      var sy = (ih - sh) / 2 + (tier.offsetY || 0) * ih;
      sx = Math.max(0, Math.min(iw - sw, sx));
      sy = Math.max(0, Math.min(ih - sh, sy));
      var d = tier.radius * 2;
      ctx.drawImage(img, sx, sy, sw, sh, -tier.radius, -tier.radius, d, d);
    } else {
      ctx.fillStyle = '#8a7248';
      ctx.fill();
    }
    ctx.restore();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(20, 14, 8, 0.45)';
    ctx.stroke();
    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, STAGE_W, STAGE_H);

    ctx.fillStyle = '#241a12';
    ctx.fillRect(WALL, 0, STAGE_W - WALL * 2, STAGE_H - WALL);

    ctx.save();
    ctx.setLineDash([5, 6]);
    ctx.strokeStyle = 'rgba(227, 169, 78, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(WALL, DANGER_Y);
    ctx.lineTo(STAGE_W - WALL, DANGER_Y);
    ctx.stroke();
    ctx.restore();

    var bodies = Composite.allBodies(world);
    for (var i = 0; i < bodies.length; i++) {
      var body = bodies[i];
      if (body.isStatic || !body.gameData) continue;
      drawTile(body.position.x, body.position.y, body.angle, body.gameData.tier, false);
    }

    if (pendingTier !== null && !isOver) {
      drawTile(pendingX, SPAWN_Y, 0, pendingTier, true);
      ctx.save();
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = 'rgba(240, 224, 190, 0.25)';
      ctx.beginPath();
      ctx.moveTo(pendingX, SPAWN_Y + TIERS[pendingTier].radius);
      ctx.lineTo(pendingX, STAGE_H - WALL);
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = '#3a2a1c';
    ctx.fillRect(0, 0, WALL, STAGE_H);
    ctx.fillRect(STAGE_W - WALL, 0, WALL, STAGE_H);
    ctx.fillRect(0, STAGE_H - WALL, STAGE_W, WALL);
  }

  var lastTime = null;
  function loop(now) {
    if (lastTime === null) lastTime = now;
    var dt = Math.min((now - lastTime) / 1000, 1 / 30);
    lastTime = now;

    if (!isOver) {
      Engine.update(engine, dt * 1000);
      processMerges();
      checkGameOver(dt);
    }
    render();
    requestAnimationFrame(loop);
  }

  function getStageX(e) {
    var rect = canvas.getBoundingClientRect();
    var clientX = e.touches && e.touches.length ? e.touches[0].clientX : e.clientX;
    var scaleX = STAGE_W / rect.width;
    return (clientX - rect.left) * scaleX;
  }

  canvas.addEventListener('pointerdown', function (e) {
    if (isOver || pendingTier === null) return;
    aiming = true;
    pendingX = clampX(getStageX(e), TIERS[pendingTier].radius);
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', function (e) {
    if (!aiming || pendingTier === null) return;
    pendingX = clampX(getStageX(e), TIERS[pendingTier].radius);
  });

  function endAim(e) {
    if (!aiming) return;
    aiming = false;
    dropPending();
  }
  canvas.addEventListener('pointerup', endAim);
  canvas.addEventListener('pointercancel', function () { aiming = false; });

  restartBtn.addEventListener('click', resetGame);
  restartBtn2.addEventListener('click', resetGame);

  canvas.width = STAGE_W;
  canvas.height = STAGE_H;

  resetGame();
  requestAnimationFrame(loop);
})();

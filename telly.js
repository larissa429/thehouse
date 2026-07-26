document.addEventListener('DOMContentLoaded', function () {
  const stage = document.querySelector('.telly-errors');
  if (!stage) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const WINDOW_COUNT = 70;
  const BATCH_SIZE = 10;
  const STEP = 11;
  const JITTER = 16;
  const START_GAP = 450;
  const MIN_GAP = 6;
  const CURVE = 1.2;
  const GRID_COLS = 4;
  const GRID_ROWS = 3;

  function makeWindow(isFinal) {
    const el = document.createElement('div');
    el.className = 'telly-window' + (isFinal ? ' final' : '');
    el.innerHTML =
      '<div class="telly-window-bar">CRITICAL ERROR!! <span class="x">\u00d7</span></div>' +
      '<div class="telly-window-body">' +
        '<img src="../images/shredder.gif" alt="" width="40" height="40" />' +
        '<p>DIRECTORY "Telly" NOT FOUND</p>' +
      '</div>' +
      '<div class="telly-window-buttons">' +
        '<button disabled>Okay</button>' +
        '<button disabled>Try again</button>' +
        '<a href="../index.html">Leave immediately</a>' +
      '</div>';
    return el;
  }

  const stageW = stage.offsetWidth || window.innerWidth;
  const stageH = stage.offsetHeight || window.innerHeight;

  const cellW = stageW / GRID_COLS;
  const cellH = stageH / GRID_ROWS;

  const regions = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) regions.push({ c: c, r: r });
  }
  for (let i = regions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = regions[i]; regions[i] = regions[j]; regions[j] = tmp;
  }

  const windows = [];
  let batchX = 0, batchY = 0;

  for (let i = 0; i < WINDOW_COUNT; i++) {
    const posInBatch = i % BATCH_SIZE;

    if (posInBatch === 0) {
      const batchIndex = Math.floor(i / BATCH_SIZE);
      const region = regions[batchIndex % regions.length];
      batchX = region.c * cellW + Math.random() * Math.max(cellW - 380, 20);
      batchY = region.r * cellH + Math.random() * Math.max(cellH - 200, 20);
    }

    const x = Math.max(0, Math.min(stageW - 360, batchX + posInBatch * STEP + (Math.random() * JITTER - JITTER / 2)));
    const y = Math.max(0, Math.min(stageH - 180, batchY + posInBatch * STEP * 0.7 + (Math.random() * JITTER - JITTER / 2)));

    const w = makeWindow(false);
    w.style.left = x + 'px';
    w.style.top = y + 'px';
    w.style.zIndex = i + 1;
    stage.appendChild(w);
    windows.push(w);
  }

  const finalWindow = makeWindow(true);
  finalWindow.style.left = '50%';
  finalWindow.style.top = '50%';
  finalWindow.style.zIndex = WINDOW_COUNT + 5;
  stage.appendChild(finalWindow);
  windows.push(finalWindow);

  if (reduceMotion) {
    windows.forEach(function (w) { w.classList.add('show'); });
  } else {
    let elapsed = 0;
    windows.forEach(function (w, i) {
      const isLast = i === windows.length - 1;
      const progress = i / (windows.length - 1);
      const gap = isLast
        ? 300
        : MIN_GAP + (START_GAP - MIN_GAP) * Math.pow(1 - progress, CURVE);
      elapsed += gap;
      setTimeout(function () { w.classList.add('show'); }, elapsed);
    });

    const eas = document.getElementById('telly-eas');
    if (eas) setTimeout(function () { eas.classList.add('show'); }, elapsed + 400);
  }

  const nameEl = document.querySelector('.telly-name-glitch');
  if (nameEl && !reduceMotion) {
    const REAL = nameEl.textContent;
    const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789!@#$%&*<>?/\\|=+~';
    const REAL_WEIGHT = 8;

    setInterval(function () {
      let out = '';
      for (let i = 0; i < REAL.length; i++) {
        const pool = CHARS + REAL[i].repeat(REAL_WEIGHT);
        out += pool[Math.floor(Math.random() * pool.length)];
      }
      nameEl.textContent = out;
    }, 90);
  }
});

/* ---- TELLY'S PLAYLIST: draggable, always wobbles back sideways
   ------------------------------------------------------------
   The drag HANDLE is a plain div overlaying the top edge (not the
   iframe itself) — the iframe is cross-origin content and silently
   swallows pointer events before our JS ever sees them, which is
   why dragging felt broken/unresponsive before this. ------------- */
(function () {
  const wrap = document.querySelector('.telly-playlist-wrap');
  const handle = document.querySelector('.telly-drag-handle');
  if (!wrap || !handle) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const REST_DEG = -70;
  const STIFFNESS = 0.02;
  const DAMPING = 0.9;
  const SWING_SENSITIVITY = 0.02;

  let posX = 0, posY = 0;
  let angle = REST_DEG;
  let angleVel = 0;
  let dragging = false;
  let startClientX = 0, startClientY = 0, startPosX = 0, startPosY = 0;
  let lastClientX = 0;
  let rafRunning = false;

  function applyPos() {
    wrap.style.setProperty('--dragX', posX + 'px');
    wrap.style.setProperty('--dragY', posY + 'px');
  }
  function applyAngle() {
    wrap.style.setProperty('--swing-deg', angle.toFixed(2) + 'deg');
  }

  function tick() {
    angleVel += (REST_DEG - angle) * STIFFNESS;
    angleVel *= DAMPING;
    angle += angleVel;
    applyAngle();

    if (!dragging && Math.abs(angleVel) < 0.02 && Math.abs(angle - REST_DEG) < 0.05) {
      angle = REST_DEG;
      angleVel = 0;
      applyAngle();
      rafRunning = false;
      return;
    }
    requestAnimationFrame(tick);
  }
  function ensureTicking() {
    if (!rafRunning) { rafRunning = true; requestAnimationFrame(tick); }
  }

  if (reduceMotion) {
    applyAngle();
    return;
  }

  handle.addEventListener('pointerdown', function (e) {
    dragging = true;
    handle.setPointerCapture(e.pointerId);
    startClientX = e.clientX;
    startClientY = e.clientY;
    lastClientX = e.clientX;
    startPosX = posX;
    startPosY = posY;
    e.preventDefault();
  });

  handle.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    posX = startPosX + (e.clientX - startClientX);
    posY = startPosY + (e.clientY - startClientY);
    applyPos();

    const dx = e.clientX - lastClientX;
    angleVel += dx * SWING_SENSITIVITY;
    lastClientX = e.clientX;

    ensureTicking();
  });

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    ensureTicking();
  }
  handle.addEventListener('pointerup', endDrag);
  handle.addEventListener('pointercancel', endDrag);

  applyPos();
  applyAngle();
})();
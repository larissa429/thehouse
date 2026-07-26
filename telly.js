document.addEventListener('DOMContentLoaded', function () {
  const stage = document.querySelector('.telly-errors');
  if (!stage) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- tuning knobs ----------------------------------------------
     WINDOW_COUNT: total cascading windows before the real one.
     BATCH_SIZE:   how many windows form one diagonal cluster before
                   a new cluster starts somewhere else on the page.
     STEP/JITTER:  spacing and randomness within a single cluster.
     START_GAP:    pause (ms) before the very first window appears.
     MIN_GAP:      the fastest gap reached near the end of the run.
     CURVE:        higher = stays slow longer, then drops off harder.
     GRID_COLS/ROWS: the screen is divided into this many regions,
                   shuffled, so every batch claims a genuinely
                   different area — guarantees real edge-to-edge
                   spread instead of relying on pure random luck.
     ------------------------------------------------------------------ */
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

  /* ---- weighted glitch on "Telly" in the page title -------------- */
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
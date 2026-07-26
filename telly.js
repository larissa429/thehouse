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
     ------------------------------------------------------------------ */
  const WINDOW_COUNT = 70;
  const BATCH_SIZE = 10;
  const STEP = 11;
  const JITTER = 16;
  const START_GAP = 1000;
const MIN_GAP = 14;
const CURVE = 1.6;

  function makeWindow(isFinal) {
    const el = document.createElement('div');
    el.className = 'telly-window' + (isFinal ? ' final' : '');
    el.innerHTML =
      '<div class="telly-window-bar">CRITICAL ERROR!! <span class="x">\u00d7</span></div>' +
      '<div class="telly-window-body">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" stroke-width="1.5">' +
          '<rect x="2" y="4" width="20" height="14" rx="1"/><path d="M8 20h8M12 18v2"/>' +
        '</svg>' +
        '<p>DIRECTORY "Telly" NOT FOUND</p>' +
      '</div>' +
      '<div class="telly-window-buttons">' +
        '<button disabled>Okay</button>' +
        '<button disabled>Try again</button>' +
        '<a href="../index.html">Leave immediately</a>' +
      '</div>';
    return el;
  }

const stageW = Math.max(stage.clientWidth - 400, 200);
const stageH = Math.max(stage.clientHeight - 260, 300);
  const windows = [];
  let batchX = 0, batchY = 0;

  for (let i = 0; i < WINDOW_COUNT; i++) {
    const posInBatch = i % BATCH_SIZE;

    // start of a new batch: jump to a fresh random spot on the stage
    if (posInBatch === 0) {
      batchX = Math.random() * stageW;
      batchY = Math.random() * stageH;
    }

    const x = (batchX + posInBatch * STEP + (Math.random() * JITTER - JITTER / 2) + stageW) % stageW;
    const y = (batchY + posInBatch * STEP * 0.7 + (Math.random() * JITTER - JITTER / 2) + stageH) % stageH;

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
        ? 300 // one deliberate beat before the real window lands
        : MIN_GAP + (START_GAP - MIN_GAP) * Math.pow(1 - progress, CURVE);
      elapsed += gap;
      setTimeout(function () { w.classList.add('show'); }, elapsed);
    });

    // reveal the scrolling alert only after everything else has landed
    const eas = document.getElementById('telly-eas');
    if (eas) setTimeout(function () { eas.classList.add('show'); }, elapsed + 400);
  }
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
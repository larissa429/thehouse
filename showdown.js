/* ============================================================
   showdown.js — "Track Record", an FNF-style rhythm battle.
   LP & Cassette (player side) vs a rotating cast of opponents.

   MVP scope: one song ("At The End Of The Line..."), 4 lanes, a real
   audio track driving the clock, and a procedurally-generated chart
   (no hand-authored chart yet — the note pattern is a seeded random
   walk over the track's BPM grid, not actually written to match its
   real melody/hits, just its tempo).
   ============================================================ */
(function () {
  var root = document.getElementById('showdownGame');
  if (!root) return;

  var canvas = document.getElementById('showdownCanvas');
  var ctx = canvas.getContext('2d');
  var scoreEl = document.getElementById('showdownScore');
  var comboEl = document.getElementById('showdownCombo');
  var restartBtn = document.getElementById('showdownRestart');
  var restartBtn2 = document.getElementById('showdownRestart2');
  var startOverlay = document.getElementById('showdownStart');
  var startBtn = document.getElementById('showdownStartBtn');
  var endOverlay = document.getElementById('showdownEnd');
  var endTitleEl = document.getElementById('showdownEndTitle');
  var endStatsEl = document.getElementById('showdownEndStats');
  var playerFighterEl = document.getElementById('showdownPlayerFighter');
  var opponentFighterEl = document.getElementById('showdownOpponentFighter');
  var laneBtns = Array.prototype.slice.call(document.querySelectorAll('.showdown-lane-btn'));

  var STAGE_W = 400;
  var STAGE_H = 533;
  canvas.width = STAGE_W;
  canvas.height = STAGE_H;

  var LANE_COUNT = 4;
  var LANE_LABELS = ['←', '↓', '↑', '→']; // left, down, up, right
  var LANE_COLORS = ['#ff6fae', '#5fd3ff', '#7fe89a', '#ff8a5c'];
  var LANE_W = STAGE_W / LANE_COUNT;
  var RECEPTOR_Y = STAGE_H * 0.8;
  var NOTE_R = LANE_W * 0.32;
  var PIXELS_PER_SEC = 340; // scroll speed
  var HIT_WINDOW = 0.18; // seconds — outside this, a press does nothing and a note auto-misses
  var SICK_WINDOW = 0.07;

  var BPM = 106;
  var BEAT_SEC = 60 / BPM;
  var SONG_LENGTH_SEC = 55; // the beat drop makes for a clean cutoff — not the full 4:13 track
  var LEAD_IN_SEC = 1.6; // silence before the first note so the player isn't caught off guard

  var SONG_SRC = 'at-the-end-of-the-line.mp3';
  var songAudio = new Audio(SONG_SRC);
  songAudio.preload = 'auto';

  // Deterministic pseudo-random (mulberry32) so the same "chart" plays
  // every run — replayable, and swappable later for a hand-authored one.
  function makeRng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function generateChart() {
    var rng = makeRng(20240718);
    var notes = [];
    var slot = BEAT_SEC / 2; // eighth notes
    var slotCount = Math.floor((SONG_LENGTH_SEC - LEAD_IN_SEC) / slot);
    var lastLane = -1;
    for (var i = 0; i < slotCount; i++) {
      if (rng() > 0.58) continue; // skip this slot — leaves rests instead of a solid wall of notes
      var lane = Math.floor(rng() * LANE_COUNT);
      if (lane === lastLane && rng() < 0.7) lane = (lane + 1 + Math.floor(rng() * 3)) % LANE_COUNT;
      lastLane = lane;
      notes.push({ time: LEAD_IN_SEC + i * slot, lane: lane, judged: false });
    }
    return notes;
  }

  var chart = [];
  var running = false;
  var score = 0;
  var combo = 0;
  var maxCombo = 0;
  var hits = 0;
  var judgments = []; // {text, lane, time} — brief on-screen feedback

  // The <audio> element's own playback position IS the song clock — chart
  // times, note-scroll, and judging all read off this, so they can never
  // drift out of sync with what's actually playing.
  function now() {
    return songAudio.currentTime;
  }

  // Tiny separate context just for the on-hit "ding" — not used for
  // timing anything, purely a feedback sound layered on top of the song.
  var sfxCtx = null;
  function playHitBlip() {
    if (!sfxCtx) sfxCtx = new (window.AudioContext || window.webkitAudioContext)();
    var osc = sfxCtx.createOscillator();
    var gain = sfxCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 660;
    var t = sfxCtx.currentTime;
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(gain);
    gain.connect(sfxCtx.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  // --- input --------------------------------------------------------
  var KEY_TO_LANE = { ArrowLeft: 0, ArrowDown: 1, ArrowUp: 2, ArrowRight: 3 };

  function pressLane(lane) {
    if (!running) return;
    var t = now();
    var best = null;
    var bestDelta = Infinity;
    for (var i = 0; i < chart.length; i++) {
      var note = chart[i];
      if (note.judged || note.lane !== lane) continue;
      var delta = Math.abs(note.time - t);
      if (delta <= HIT_WINDOW && delta < bestDelta) { best = note; bestDelta = delta; }
    }
    if (!best) return; // empty press — no penalty, just does nothing
    best.judged = true;
    hits++;
    combo++;
    if (combo > maxCombo) maxCombo = combo;
    var sick = bestDelta <= SICK_WINDOW;
    score += sick ? 100 + combo * 2 : 50 + combo;
    judgments.push({ text: sick ? 'Sick!' : 'Good', lane: lane, time: t });
    playHitBlip();
    flashFighters();
    updateHud();
  }

  function flashFighters() {
    playerFighterEl.classList.add('is-bobbing');
    setTimeout(function () { playerFighterEl.classList.remove('is-bobbing'); }, 90);
  }

  document.addEventListener('keydown', function (e) {
    if (KEY_TO_LANE.hasOwnProperty(e.key)) {
      e.preventDefault();
      pressLane(KEY_TO_LANE[e.key]);
    }
  });

  laneBtns.forEach(function (btn) {
    var lane = parseInt(btn.dataset.lane, 10);
    btn.addEventListener('pointerdown', function () {
      btn.classList.add('is-pressed');
      pressLane(lane);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (evt) {
      btn.addEventListener(evt, function () { btn.classList.remove('is-pressed'); });
    });
  });

  // --- render/update loop -------------------------------------------
  function updateHud() {
    scoreEl.textContent = score.toLocaleString();
    comboEl.textContent = combo;
  }

  function draw() {
    var t = now();
    ctx.clearRect(0, 0, STAGE_W, STAGE_H);

    // lane backgrounds
    for (var l = 0; l < LANE_COUNT; l++) {
      ctx.fillStyle = l % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.045)';
      ctx.fillRect(l * LANE_W, 0, LANE_W, STAGE_H);
    }

    // receptors
    for (l = 0; l < LANE_COUNT; l++) {
      var cx = l * LANE_W + LANE_W / 2;
      ctx.beginPath();
      ctx.arc(cx, RECEPTOR_Y, NOTE_R * 1.15, 0, Math.PI * 2);
      ctx.strokeStyle = LANE_COLORS[l];
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = LANE_COLORS[l];
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(LANE_LABELS[l], cx, RECEPTOR_Y);
    }

    // notes
    for (var i = 0; i < chart.length; i++) {
      var note = chart[i];
      if (note.judged) continue;
      var dt = note.time - t;
      if (dt < -HIT_WINDOW) { note.judged = true; note.missed = true; combo = 0; judgments.push({ text: 'Miss', lane: note.lane, time: t }); updateHud(); continue; }
      var y = RECEPTOR_Y - dt * PIXELS_PER_SEC;
      if (y < -NOTE_R || y > STAGE_H + NOTE_R) continue;
      var ncx = note.lane * LANE_W + LANE_W / 2;
      ctx.beginPath();
      ctx.arc(ncx, y, NOTE_R, 0, Math.PI * 2);
      ctx.fillStyle = LANE_COLORS[note.lane];
      ctx.fill();
    }

    // judgment popups — recent ones only, fading with age
    for (i = judgments.length - 1; i >= 0; i--) {
      var j = judgments[i];
      var age = t - j.time;
      if (age > 0.5) { judgments.splice(0, i + 1); break; }
    }
    judgments.forEach(function (j) {
      var age = t - j.time;
      var alpha = Math.max(0, 1 - age / 0.5);
      var jcx = j.lane * LANE_W + LANE_W / 2;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = j.text === 'Miss' ? '#ff6b6b' : '#ffe066';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(j.text, jcx, RECEPTOR_Y - 60 - age * 30);
      ctx.globalAlpha = 1;
    });

    // beat-synced bob on the opponent portrait
    var beatPhase = (t / BEAT_SEC) % 1;
    opponentFighterEl.classList.toggle('is-bobbing', t > 0 && beatPhase < 0.12);
  }

  function tick() {
    if (!running) return;
    draw();
    if (now() > SONG_LENGTH_SEC + 0.6) {
      endRound();
      return;
    }
    requestAnimationFrame(tick);
  }

  function endRound() {
    running = false;
    songAudio.pause();
    var total = chart.length;
    var accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
    endTitleEl.textContent = accuracy >= 80 ? 'Showstopper!' : accuracy >= 50 ? 'Round Complete' : 'Tough Crowd';
    endStatsEl.textContent = 'Score ' + score.toLocaleString() + ' — ' + hits + '/' + total + ' hit (' + accuracy + '%) — best combo ' + maxCombo;
    endOverlay.hidden = false;
  }

  function startRound() {
    startOverlay.hidden = true;
    endOverlay.hidden = true;
    score = 0; combo = 0; maxCombo = 0; hits = 0; judgments = [];
    updateHud();
    chart = generateChart();
    songAudio.pause();
    songAudio.currentTime = 0;
    songAudio.play();
    running = true;
    requestAnimationFrame(tick);
  }

  startBtn.addEventListener('click', startRound);
  restartBtn.addEventListener('click', startRound);
  restartBtn2.addEventListener('click', startRound);

  draw(); // render an empty stage before the first Start
})();

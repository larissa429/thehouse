// Odd Jobs — WarioWare-style microgame engine.
//
// Each "job" is a tiny self-contained round: a one-word prompt flashes,
// then the player gets a few seconds (shrinking as the shift goes on) to
// do exactly one thing. Get it right -> next job. Get it wrong, or run
// out the clock -> lose a life. Three misses ends the shift.
//
// Adding a new job later should mean adding one entry to the JOBS array
// below and nothing else — the engine doesn't know or care what's
// actually happening inside a job's playfield.

(function () {
  var stageEl = document.getElementById('oddjobsStage');
  if (!stageEl) return; // not on the Odd Jobs page

  var scoreEl = document.getElementById('oddjobsScore');
  var livesEl = document.getElementById('oddjobsLives');
  var timerFillEl = document.getElementById('oddjobsTimerFill');
  var promptEl = document.getElementById('oddjobsPrompt');
  var fieldEl = document.getElementById('oddjobsPlayfield');
  var resultEl = document.getElementById('oddjobsResult');
  var startOverlay = document.getElementById('oddjobsStart');
  var startBtn = document.getElementById('oddjobsStartBtn');
  var gameOverOverlay = document.getElementById('oddjobsGameOver');
  var finalScoreEl = document.getElementById('oddjobsFinalScore');
  var restartBtn = document.getElementById('oddjobsRestart');
  var restartBtn2 = document.getElementById('oddjobsRestart2');

  var MAX_LIVES = 3;
  var START_DURATION = 4000;
  var MIN_DURATION = 1400;
  var DURATION_STEP = 120; // shaved off per round, floors at MIN_DURATION

  var score = 0;
  var lives = MAX_LIVES;
  var round = 0;
  var lastJobId = null;
  var resolved = false;
  var timeoutId = null;
  var running = false;
  // Bumped every time a round starts. Anything scheduled by an older
  // round (the prompt-delay timeout, the round's own auto-fail timeout,
  // a job's own event listeners) captures the token it was born with and
  // checks it before acting — so a Restart mid-round can't let a stale
  // callback reach into the fresh round it left behind.
  var activeToken = 0;

  // --- Jobs ---------------------------------------------------------

  var JOBS = [
    {
      id: 'waterPlant',
      prompt: 'Water it!',
      // Five plants in a row, one visibly wilting — tap that one.
      // Tapping any other plant fails the round immediately.
      init: function (field, resolve) {
        var plants = document.createElement('div');
        plants.className = 'oddjobs-plants';
        var count = 5;
        var target = Math.floor(Math.random() * count);
        for (var i = 0; i < count; i++) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'oddjobs-plant';
          btn.textContent = '🌱'; // 🌱
          if (i === target) btn.classList.add('is-wilting');
          (function (isTarget) {
            btn.addEventListener('click', function () {
              resolve(isTarget);
            });
          })(i === target);
          plants.appendChild(btn);
        }
        field.appendChild(plants);
      }
    },
    {
      id: 'catchPetal',
      prompt: 'Catch it!',
      // A single petal drifts down from the top — tap it before it
      // reaches the ground. Missing (it lands) fails the round.
      init: function (field, resolve, duration) {
        var ground = document.createElement('div');
        ground.className = 'oddjobs-ground';
        field.appendChild(ground);

        var petal = document.createElement('button');
        petal.type = 'button';
        petal.className = 'oddjobs-petal';
        petal.textContent = '🌸'; // 🌸
        var startPct = 15 + Math.random() * 70;
        petal.style.left = startPct + '%';
        petal.style.top = '-10%';
        field.appendChild(petal);

        var landed = false;
        petal.addEventListener('click', function (e) {
          e.stopPropagation();
          if (landed) return;
          resolve(true);
        });
        petal.addEventListener('transitionend', function (e) {
          if (e.propertyName !== 'top') return;
          landed = true;
          resolve(false);
        });

        // Kick the fall off on the next frame so the transition applies.
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            petal.style.transition = 'top ' + duration + 'ms linear';
            petal.style.top = '104%';
          });
        });
      }
    }
  ];

  // --- Engine ---------------------------------------------------------

  function currentDuration() {
    return Math.max(MIN_DURATION, START_DURATION - round * DURATION_STEP);
  }

  function renderHud() {
    scoreEl.textContent = String(score);
    var hearts = '';
    for (var i = 0; i < MAX_LIVES; i++) hearts += i < lives ? '♥' : '♡';
    livesEl.textContent = hearts;
  }

  function pickJob() {
    if (JOBS.length === 1) return JOBS[0];
    var job;
    do {
      job = JOBS[Math.floor(Math.random() * JOBS.length)];
    } while (job.id === lastJobId);
    lastJobId = job.id;
    return job;
  }

  function clearField() {
    fieldEl.innerHTML = '';
  }

  function startTimerBar(duration) {
    timerFillEl.style.transition = 'none';
    timerFillEl.style.width = '100%';
    // Force reflow so the transition below actually animates from 100%.
    void timerFillEl.offsetWidth;
    timerFillEl.style.transition = 'width ' + duration + 'ms linear';
    timerFillEl.style.width = '0%';
  }

  function showResult(win) {
    resultEl.textContent = win ? 'Nice!' : 'Oops.';
    resultEl.className = 'oddjobs-result ' + (win ? 'is-win' : 'is-lose');
  }

  function hideResult() {
    resultEl.className = 'oddjobs-result';
  }

  function nextRound() {
    if (!running) return;
    var token = ++activeToken;
    resolved = false;
    hideResult();
    clearField();
    round++;

    var job = pickJob();
    var duration = currentDuration();

    promptEl.textContent = job.prompt;
    promptEl.classList.remove('is-shown');
    // Reflow so re-adding the class always re-triggers the transition.
    void promptEl.offsetWidth;
    promptEl.classList.add('is-shown');

    setTimeout(function () {
      if (!running || token !== activeToken) return;
      promptEl.classList.remove('is-shown');
      job.init(fieldEl, function (win) { resolve(win, token); }, duration);
      startTimerBar(duration);
      timeoutId = setTimeout(function () { resolve(false, token); }, duration);
    }, 550);
  }

  function resolve(win, token) {
    if (resolved || !running || token !== activeToken) return;
    resolved = true;
    if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
    timerFillEl.style.transition = 'none';
    showResult(win);

    if (win) {
      score++;
    } else {
      lives--;
    }
    renderHud();

    setTimeout(function () {
      if (!running || token !== activeToken) return;
      if (lives <= 0) {
        endShift();
      } else {
        nextRound();
      }
    }, win ? 450 : 700);
  }

  function endShift() {
    running = false;
    clearField();
    hideResult();
    finalScoreEl.textContent = String(score);
    gameOverOverlay.hidden = false;
  }

  function startShift() {
    // Restart can be hit mid-round. nextRound() bumps activeToken, which
    // makes every callback the previous round scheduled (prompt-delay,
    // auto-fail timeout, a job's own listeners) a no-op the moment it
    // runs — but drop the pending timer too, just to not leave it ticking.
    if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }

    score = 0;
    lives = MAX_LIVES;
    round = 0;
    lastJobId = null;
    running = true;
    renderHud();
    startOverlay.hidden = true;
    gameOverOverlay.hidden = true;
    nextRound();
  }

  function returnToStart() {
    // Same mid-round-safe teardown as startShift, but lands on the start
    // screen instead of launching straight into a fresh shift.
    running = false;
    activeToken++;
    if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }

    score = 0;
    lives = MAX_LIVES;
    round = 0;
    lastJobId = null;
    renderHud();
    clearField();
    hideResult();
    gameOverOverlay.hidden = true;
    startOverlay.hidden = false;
  }

  startBtn.addEventListener('click', startShift);
  restartBtn.addEventListener('click', returnToStart);
  restartBtn2.addEventListener('click', returnToStart);

  renderHud();
})();

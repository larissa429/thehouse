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

  // --- Shared job helpers ---------------------------------------------

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  // Builds an init() for the "wanted icon + tap the matching option out of
  // a row of decoys" job shape (Match the request, Pour the order). Same
  // single-tap rules as every other simple job, just parameterized by the
  // label text and the emoji set.
  function wantedRowInit(label, choices) {
    return function (field, resolve) {
      var options = shuffle(choices.slice());
      var target = options[Math.floor(Math.random() * options.length)];

      var col = document.createElement('div');
      col.className = 'oddjobs-job-column';

      var request = document.createElement('div');
      request.className = 'oddjobs-request';
      var labelEl = document.createElement('span');
      labelEl.className = 'oddjobs-request-label';
      labelEl.textContent = label;
      var icon = document.createElement('span');
      icon.className = 'oddjobs-request-icon';
      icon.textContent = target;
      request.appendChild(labelEl);
      request.appendChild(icon);

      var row = document.createElement('div');
      row.className = 'oddjobs-options';
      options.forEach(function (choice) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'oddjobs-option';
        btn.textContent = choice;
        btn.addEventListener('click', function () {
          resolve(choice === target);
        });
        row.appendChild(btn);
      });

      col.appendChild(request);
      col.appendChild(row);
      field.appendChild(col);
    };
  }

  // Pointer-based drag (mouse + touch in one). Moves `chip` by percentage
  // of `field`'s box as the pointer moves, then hands off to `onRelease`
  // to do its own hit-testing (against whatever drop targets that job
  // defines) once the pointer lifts.
  function enableDrag(chip, field, onRelease) {
    var dragging = false;
    chip.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      dragging = true;
      chip.classList.add('is-dragging');
      chip.setPointerCapture(e.pointerId);
    });
    chip.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var rect = field.getBoundingClientRect();
      var x = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
      var y = Math.min(Math.max(e.clientY - rect.top, 0), rect.height);
      chip.style.left = (x / rect.width * 100) + '%';
      chip.style.top = (y / rect.height * 100) + '%';
    });
    function release() {
      if (!dragging) return;
      dragging = false;
      chip.classList.remove('is-dragging');
      onRelease(chip);
    }
    chip.addEventListener('pointerup', release);
    chip.addEventListener('pointercancel', release);
  }

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
    },
    {
      id: 'matchRequest',
      prompt: 'Match it!',
      // A patron holds up the book they want — tap the matching book out
      // of a small row of decoys. Shape-distinct emoji on purpose (not
      // just closed books in different colors) — same colorblind-
      // unfriendly trap as the wilting-plant pulse, avoided from the start.
      init: wantedRowInit('Wanted', ['📕', '📖', '📔', '📚'])
    },
    {
      id: 'shelveIt',
      prompt: 'Shelve it!',
      // Three faded "ghost" slots are scattered up top, each a different
      // book; three full-color chips sit along the bottom in shuffled
      // order. Drag each chip onto its matching ghost slot. A chip
      // dropped anywhere else just snaps back — only the clock can fail
      // this one. Winning means placing all three before time runs out.
      init: function (field, resolve) {
        var BOOKS = ['📕', '📖', '📔'];
        var slotSpots = [
          { left: 22, top: 30 },
          { left: 50, top: 22 },
          { left: 78, top: 30 }
        ];
        var chipSpots = [
          { left: 25, top: 80 },
          { left: 50, top: 84 },
          { left: 75, top: 80 }
        ];

        var slots = shuffle(BOOKS.slice()).map(function (book, i) {
          var slot = document.createElement('div');
          slot.className = 'oddjobs-shelf-slot';
          slot.textContent = book;
          slot.dataset.book = book;
          slot.style.left = slotSpots[i].left + '%';
          slot.style.top = slotSpots[i].top + '%';
          field.appendChild(slot);
          return slot;
        });

        var placed = 0;
        shuffle(BOOKS.slice()).forEach(function (book, i) {
          var chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'oddjobs-shelf-chip';
          chip.textContent = book;
          chip.dataset.book = book;
          var home = chipSpots[i];
          chip.style.left = home.left + '%';
          chip.style.top = home.top + '%';
          field.appendChild(chip);

          enableDrag(chip, field, function () {
            var chipRect = chip.getBoundingClientRect();
            var cx = chipRect.left + chipRect.width / 2;
            var cy = chipRect.top + chipRect.height / 2;
            var hit = null;
            slots.forEach(function (slot) {
              if (slot.classList.contains('is-filled')) return;
              var r = slot.getBoundingClientRect();
              var pad = 12;
              if (cx >= r.left - pad && cx <= r.right + pad && cy >= r.top - pad && cy <= r.bottom + pad) {
                hit = slot;
              }
            });
            if (hit && hit.dataset.book === chip.dataset.book) {
              hit.classList.add('is-filled');
              chip.classList.add('is-placed');
              placed++;
              if (placed === BOOKS.length) resolve(true);
            } else {
              chip.style.left = home.left + '%';
              chip.style.top = home.top + '%';
            }
          });
        });
      }
    },
    {
      id: 'pourOrder',
      prompt: 'Pour it!',
      // Same shape as Match the request — an order icon shows what's
      // wanted, tap the matching drink out of a row of decoys.
      init: wantedRowInit('Ordered', ['🍺', '🍷', '🍹', '🍸'])
    },
    {
      id: 'busTable',
      prompt: 'Bus it!',
      // A handful of dirty dishes are scattered across the table — tap
      // every one before time's up. No wrong target here; the clock
      // alone is the pressure, same as Catch the memory petal.
      init: function (field, resolve) {
        var DISHES = ['🍽️', '🥤', '🍷', '🥣'];
        var spots = [
          { left: 25, top: 32 },
          { left: 75, top: 32 },
          { left: 25, top: 70 },
          { left: 75, top: 70 }
        ];
        var cleared = 0;
        var order = shuffle(DISHES.slice());
        order.forEach(function (dish, i) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'oddjobs-dish';
          btn.textContent = dish;
          btn.style.left = spots[i].left + '%';
          btn.style.top = spots[i].top + '%';
          btn.addEventListener('click', function () {
            if (btn.classList.contains('is-bused')) return;
            btn.classList.add('is-bused');
            cleared++;
            if (cleared === order.length) resolve(true);
          });
          field.appendChild(btn);
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

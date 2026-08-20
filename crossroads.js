/* ============================================================
   crossroads.js — Crossroads, a small perfect-information duel
   against a resident of your choosing.

   Rules: 5x5 grid, one shared token starting in the (unscored,
   pre-consumed) center tile. Player and AI alternate turns; the
   player may move to any unconsumed tile in their CURRENT COLUMN,
   the AI may move to any unconsumed tile in its CURRENT ROW.
   Landing on a tile banks its value (-4..+4) to whoever moved
   there, then that tile is consumed. The game ends the instant
   whoever's turn it is has no legal move left — whoever has the
   higher score at that point wins.

   Because at most 24 tiles ever get consumed and each turn has at
   most 4 candidate moves, a full alpha-beta search (with a
   transposition table keyed on consumed-set + position + turn) is
   entirely tractable in-browser — so every opponent shares the same
   underlying search. Difficulty is layered on top as a per-resident
   "mistake chance": that fraction of the time, the AI ignores the
   search's true best move and plays a genuinely random legal move
   instead. (An earlier version had "mistakes" pick greedily — best
   immediate tile value, no lookahead — but on a board this small
   greedy usually agrees with the real optimal move anyway, so it
   didn't read as meaningfully weaker. True randomness does.)
   ============================================================ */
(function () {
  var boardEl = document.getElementById('crBoard');
  if (!boardEl) return;

  var playerScoreEl = document.getElementById('crPlayerScore');
  var aiScoreEl = document.getElementById('crAiScore');
  var aiLabelEl = document.getElementById('crAiLabel');
  var statusEl = document.getElementById('crStatus');
  var restartBtn = document.getElementById('crRestart');
  var opponentSelectEl = document.getElementById('crOpponentSelect');
  var bubbleEl = document.getElementById('crBubble');
  var bubbleTextEl = document.getElementById('crBubbleText');
  var gameOverEl = document.getElementById('crGameOver');
  var gameOverTitleEl = document.getElementById('crGameOverTitle');
  var gameOverScoreEl = document.getElementById('crGameOverScore');
  var restartBtn2 = document.getElementById('crRestart2');

  var SIZE = 5;
  var CENTER = 12; // row 2, col 2

  // Each opponent shares the exact same search — only mistakeChance and
  // presentation differ.
  var OPPONENTS = {
    house: {
      name: 'The House',
      mistakeChance: 0,
      tokenHTML: '<svg class="crossroads-token-sprite" viewBox="0 0 24 24" aria-hidden="true">' +
        '<path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3L2 12h3v8z"/></svg>',
      bubbleFont: 'var(--body)', // the site's own reading font, not a handwriting style
      // The House doesn't talk mid-game — no filler chatter, no reacting
      // to your moves. "…" isn't really speech, so it's the one exception,
      // and even that's rare rather than a given every turn.
      thinkingLines: [],
      rareLine: "…",
      rareLineChance: 0.15,
      reactionGood: [],
      reactionBad: [],
      outcome: {
        aiWin: "Of course.",
        playerWin: "How curious.",
        draw: "How fitting."
      }
    },
    journal: {
      name: 'Journal',
      // aloof rather than sharp — plays well below full strength
      mistakeChance: 0.55,
      tokenHTML: '<svg class="crossroads-token-sprite" viewBox="0 0 24 24" aria-hidden="true">' +
        '<path fill="currentColor" d="M7.5 22q-1.45 0-2.475-1.025T4 18.5v-13q0-1.45 1.025-2.475T7.5 2H20v15q-.625 0-1.062.438T18.5 18.5t.438 1.063T20 20v2zm.5-7h2V4H8zm-.5 5h9.325q-.15-.35-.237-.712T16.5 18.5q0-.4.075-.775t.25-.725H7.5q-.65 0-1.075.438T6 18.5q0 .65.425 1.075T7.5 20"/></svg>',
      bubbleFont: 'var(--hand)', // Caveat — his own handwriting, same as elsewhere on the site
      thinkingLines: ["Hmm…", "Oh, is it my turn?", "One moment.", "…"],
      reactionGood: ["Oh, nice one.", "Huh, good pick.", "Not bad."],
      reactionBad: ["Oops.", "Oh no.", "That happens."],
      outcome: {
        aiWin: "Oh! I actually won?",
        playerWin: "Ah, well played.",
        draw: "A tie, then."
      }
    }
  };
  var OPPONENT_ORDER = ['house', 'journal'];
  var opponentKey = 'house';

  function opponent() { return OPPONENTS[opponentKey]; }
  function randomLine(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // most thinking lines are drawn evenly from thinkingLines, but an
  // opponent can define a rareLine (e.g. The House's "…") that only
  // shows up occasionally instead of being just one option among equals
  function pickThinkingLine(op) {
    if (op.rareLine && Math.random() < op.rareLineChance) return op.rareLine;
    return randomLine(op.thinkingLines);
  }

  var bubbleHideTimer = null;
  function showBubble(text) {
    if (!bubbleEl || !text) return;
    clearTimeout(bubbleHideTimer);
    bubbleTextEl.textContent = text;
    bubbleEl.classList.add('is-visible');
    bubbleHideTimer = setTimeout(function () {
      bubbleEl.classList.remove('is-visible');
    }, 2200);
  }
  function hideBubble() {
    if (!bubbleEl) return;
    clearTimeout(bubbleHideTimer);
    bubbleEl.classList.remove('is-visible');
  }

  function rowOf(i) { return Math.floor(i / SIZE); }
  function colOf(i) { return i % SIZE; }

  // -4..-1 or 1..4, skipping 0 — every tile should be a gain or a loss
  function randomNonZero() {
    var v = Math.floor(Math.random() * 8) - 4; // -4..3
    return v >= 0 ? v + 1 : v; // 0..3 -> 1..4
  }

  var state; // { values, consumed, pos, turn, scores }

  function newGame() {
    var values = [];
    var consumed = [];
    for (var i = 0; i < SIZE * SIZE; i++) {
      values.push(i === CENTER ? 0 : randomNonZero()); // -4..-1 or 1..4, never 0
      consumed.push(i === CENTER);
    }
    state = {
      values: values,
      consumed: consumed,
      pos: CENTER,
      turn: 'player',
      scores: { player: 0, ai: 0 }
    };
    aiLabelEl.textContent = opponent().name;
    bubbleEl.style.fontFamily = opponent().bubbleFont;
    hideBubble();
    hideGameOver();
    renderOpponentSelect();
    render();
    statusEl.textContent = "Your move — pick a tile in your column.";
  }

  function legalMoves(s) {
    var moves = [];
    if (s.turn === 'player') {
      var col = colOf(s.pos);
      for (var r = 0; r < SIZE; r++) {
        var idx = r * SIZE + col;
        if (idx !== s.pos && !s.consumed[idx]) moves.push(idx);
      }
    } else {
      var row = rowOf(s.pos);
      for (var c = 0; c < SIZE; c++) {
        var idx2 = row * SIZE + c;
        if (idx2 !== s.pos && !s.consumed[idx2]) moves.push(idx2);
      }
    }
    return moves;
  }

  function applyMove(s, idx) {
    var next = {
      values: s.values,
      consumed: s.consumed.slice(),
      pos: idx,
      turn: s.turn === 'player' ? 'ai' : 'player',
      scores: { player: s.scores.player, ai: s.scores.ai }
    };
    next.consumed[idx] = true;
    next.scores[s.turn] += s.values[idx];
    return next;
  }

  // ---- AI: alpha-beta with a transposition table ----
  var memo;

  function consumedMask(consumed) {
    var mask = 0;
    for (var i = 0; i < consumed.length; i++) {
      if (consumed[i]) mask |= (1 << i);
    }
    return mask;
  }

  function stateKey(s) {
    // mask fits in 25 bits, pos in 5 bits, turn in 1 bit — well under
    // Number.MAX_SAFE_INTEGER when combined
    var mask = consumedMask(s.consumed);
    var turnBit = s.turn === 'ai' ? 1 : 0;
    return mask * 64 + s.pos * 2 + turnBit;
  }

  // returns the best achievable (aiScore - playerScore) from this state
  // onward, assuming both sides play to their own advantage
  function search(s, alpha, beta) {
    var moves = legalMoves(s);
    if (moves.length === 0) {
      return s.scores.ai - s.scores.player;
    }

    var key = stateKey(s);
    var cached = memo.get(key);
    if (cached !== undefined) return cached;

    // cheap move-ordering: try higher-value tiles first, improves pruning
    moves.sort(function (a, b) { return s.values[b] - s.values[a]; });

    var value;
    if (s.turn === 'ai') {
      value = -Infinity;
      for (var i = 0; i < moves.length; i++) {
        value = Math.max(value, search(applyMove(s, moves[i]), alpha, beta));
        alpha = Math.max(alpha, value);
        if (alpha >= beta) break;
      }
    } else {
      value = Infinity;
      for (var j = 0; j < moves.length; j++) {
        value = Math.min(value, search(applyMove(s, moves[j]), alpha, beta));
        beta = Math.min(beta, value);
        if (alpha >= beta) break;
      }
    }

    memo.set(key, value);
    return value;
  }

  function bestSearchMove(s) {
    memo = new Map();
    var moves = legalMoves(s);
    moves.sort(function (a, b) { return s.values[b] - s.values[a]; });
    var best = null, bestVal = -Infinity;
    for (var i = 0; i < moves.length; i++) {
      var val = search(applyMove(s, moves[i]), -Infinity, Infinity);
      if (val > bestVal) { bestVal = val; best = moves[i]; }
    }
    return best;
  }

  function randomMove(s) {
    var moves = legalMoves(s);
    return moves[Math.floor(Math.random() * moves.length)];
  }

  function pickAiMove(s) {
    if (Math.random() < opponent().mistakeChance) return randomMove(s);
    return bestSearchMove(s);
  }

  // ---- opponent select ----
  function renderOpponentSelect() {
    opponentSelectEl.innerHTML = '';
    OPPONENT_ORDER.forEach(function (key) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'crossroads-opponent-btn';
      if (key === opponentKey) btn.classList.add('is-active');
      btn.setAttribute('aria-pressed', key === opponentKey ? 'true' : 'false');
      btn.textContent = OPPONENTS[key].name;
      btn.addEventListener('click', function () {
        if (key === opponentKey) return;
        opponentKey = key;
        newGame();
      });
      opponentSelectEl.appendChild(btn);
    });
  }

  // ---- rendering ----
  function render() {
    boardEl.innerHTML = '';
    var moves = legalMoves(state);
    var moveSet = {};
    moves.forEach(function (m) { moveSet[m] = true; });
    var canClickNow = state.turn === 'player';

    for (var i = 0; i < SIZE * SIZE; i++) {
      var cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'crossroads-tile';
      if (state.consumed[i] && i !== state.pos) cell.classList.add('is-consumed');
      if (i === state.pos) cell.classList.add('is-token');
      if (canClickNow && moveSet[i]) cell.classList.add('is-legal');

      if (i === state.pos) {
        cell.setAttribute('aria-label', opponent().name + ' (current position)');
        cell.insertAdjacentHTML('beforeend', opponent().tokenHTML);
      } else if (!state.consumed[i]) {
        var v = state.values[i];
        cell.textContent = (v > 0 ? '+' : '') + v;
        if (v > 0) cell.classList.add('is-positive');
        else if (v < 0) cell.classList.add('is-negative');
      }

      cell.disabled = !(canClickNow && moveSet[i]);
      (function (idx) {
        cell.addEventListener('click', function () { onPlayerMove(idx); });
      })(i);

      boardEl.appendChild(cell);
    }

    playerScoreEl.textContent = String(state.scores.player);
    aiScoreEl.textContent = String(state.scores.ai);
  }

  function hideGameOver() {
    gameOverEl.hidden = true;
  }

  function endGame() {
    hideBubble();
    var p = state.scores.player, a = state.scores.ai;

    var line, title;
    if (p > a) {
      line = "You win, " + p + " to " + a + ".";
      title = opponent().outcome.playerWin;
    } else if (a > p) {
      line = opponent().name + " wins, " + a + " to " + p + ".";
      title = opponent().outcome.aiWin;
    } else {
      line = "A draw, " + p + " to " + a + ".";
      title = opponent().outcome.draw;
    }
    statusEl.textContent = line;

    gameOverTitleEl.textContent = title;
    gameOverScoreEl.textContent = "You: " + p + "  ·  " + opponent().name + ": " + a;
    gameOverEl.hidden = false;
  }

  function onPlayerMove(idx) {
    if (state.turn !== 'player') return;
    var moves = legalMoves(state);
    if (moves.indexOf(idx) === -1) return;

    var movedValue = state.values[idx];
    state = applyMove(state, idx);
    render();

    if (legalMoves(state).length === 0) { endGame(); return; }

    // a notably good or bad pick gets a reaction bubble right away; the
    // "thinking" bubble follows a little after so the two don't collide
    if (movedValue >= 3) showBubble(randomLine(opponent().reactionGood));
    else if (movedValue <= -3) showBubble(randomLine(opponent().reactionBad));

    statusEl.textContent = opponent().name + " is thinking…";
    setTimeout(function () { showBubble(pickThinkingLine(opponent())); }, 900);
    setTimeout(takeAiTurn, 1800);
  }

  function takeAiTurn() {
    var move = pickAiMove(state);
    state = applyMove(state, move);
    render();

    if (legalMoves(state).length === 0) { endGame(); return; }

    statusEl.textContent = "Your move — pick a tile in your column.";
  }

  restartBtn.addEventListener('click', newGame);
  restartBtn2.addEventListener('click', newGame);

  newGame();
})();

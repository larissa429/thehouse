/* ============================================================
   crossroads.js — Crossroads, a small perfect-information duel
   against The House.

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
   entirely tractable in-browser — "standard strength" here means
   the AI is playing provably optimally, not faking difficulty.
   ============================================================ */
(function () {
  var boardEl = document.getElementById('crBoard');
  if (!boardEl) return;

  var playerScoreEl = document.getElementById('crPlayerScore');
  var aiScoreEl = document.getElementById('crAiScore');
  var statusEl = document.getElementById('crStatus');
  var restartBtn = document.getElementById('crRestart');

  var SIZE = 5;
  var CENTER = 12; // row 2, col 2

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

  function bestAiMove(s) {
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
        cell.setAttribute('aria-label', 'The House (current position)');
        cell.insertAdjacentHTML('beforeend',
          '<svg class="crossroads-token-sprite" viewBox="0 0 24 24" aria-hidden="true">' +
          '<path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3L2 12h3v8z"/></svg>'
        );
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

  function endGame() {
    var p = state.scores.player, a = state.scores.ai;
    if (p > a) statusEl.textContent = "You win, " + p + " to " + a + ".";
    else if (a > p) statusEl.textContent = "The House wins, " + a + " to " + p + ".";
    else statusEl.textContent = "A draw, " + p + " to " + a + ".";
  }

  function onPlayerMove(idx) {
    if (state.turn !== 'player') return;
    var moves = legalMoves(state);
    if (moves.indexOf(idx) === -1) return;

    state = applyMove(state, idx);
    render();

    if (legalMoves(state).length === 0) { endGame(); return; }

    statusEl.textContent = "The House is thinking…";
    setTimeout(takeAiTurn, 1800);
  }

  function takeAiTurn() {
    var move = bestAiMove(state);
    state = applyMove(state, move);
    render();

    if (legalMoves(state).length === 0) { endGame(); return; }

    statusEl.textContent = "Your move — pick a tile in your column.";
  }

  restartBtn.addEventListener('click', newGame);

  newGame();
})();

/* ============================================================
   uno.js — Uno against The House, 2-4 players (you + 1-3 House seats).
   Turn order runs through a seat array + a direction flag so Reverse
   actually does something once there's more than one House seat.
   House Rules mode adds: slap-on-5, +2/+4 stacking, 7-0 (swap/rotate
   hands), and jump-in — all generalized to work with any seat count.

   Deck: standard 108 cards — 4 colors x (one 0, two each of 1-9, two
   Skip, two Reverse, two Draw Two) + 4 Wild + 4 Wild Draw Four.
   ============================================================ */
(function () {
  var root = document.getElementById('unoGame');
  if (!root) return;

  var statusEl = document.getElementById('unoStatus');
  var restartBtn = document.getElementById('unoRestart');
  var houseRowEl = document.getElementById('unoHouseRow');
  var gameEl = document.getElementById('unoGame');
  var bubbleEl = document.getElementById('unoBubble');
  var bubbleTextEl = document.getElementById('unoBubbleText');
  var drawPileEl = document.getElementById('unoDrawPile');
  var discardTopEl = document.getElementById('unoDiscardTop');
  var discardWrapEl = discardTopEl.closest('.uno-discard-wrap');
  var slapLabelEl = document.getElementById('unoSlapLabel');
  var stackIndicatorEl = document.getElementById('unoStackIndicator');
  var stackTextEl = document.getElementById('unoStackText');
  var stackBarEl = document.getElementById('unoStackBar');
  var colorLabelEl = document.getElementById('unoColorLabel');
  var colorSwatchEl = document.getElementById('unoColorSwatch');
  var colorPickerEl = document.getElementById('unoColorPicker');
  var swapPickerEl = document.getElementById('unoSwapPicker');
  var handEl = document.getElementById('unoHand');
  var callBtn = document.getElementById('unoCallBtn');
  var resultEl = document.getElementById('unoResult');
  var logEl = document.getElementById('unoLog');
  var unoStartEl = document.getElementById('unoStart');
  var startBtn = document.getElementById('unoStartBtn');
  var unoHudEl = document.getElementById('unoHud');
  var tableEl = document.getElementById('unoTable');
  var introEl = document.getElementById('unoIntro');
  var modeStandardBtn = document.getElementById('unoModeStandard');
  var modeHouseRulesBtn = document.getElementById('unoModeHouseRules');
  var countBtns = document.querySelectorAll('.uno-count-btn');

  // 'standard' | 'houseRules'
  var mode = 'standard';

  // 2, 3, or 4 total players — chosen on the start screen, takes effect
  // on the next deal.
  var playerCount = 2;
  countBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      playerCount = parseInt(btn.getAttribute('data-count'), 10);
      countBtns.forEach(function (b) { b.classList.toggle('is-active', b === btn); });
    });
  });

  // Drops the Uno button at a random spot in the viewport — makes
  // catching it a reflex thing instead of a predictable click target.
  // Bails out to the normal in-flow position on very small viewports
  // where a fixed overlay could otherwise land off-screen or on top of
  // unreachable content.
  function repositionCallBtnRandomly() {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    if (vw < 360 || vh < 500) {
      callBtn.classList.remove('is-floating');
      callBtn.style.left = '';
      callBtn.style.top = '';
      return;
    }
    callBtn.classList.add('is-floating');
    var margin = 24;
    var btnW = 120, btnH = 56; // rough estimate — margin covers font/padding variance
    var left = margin + Math.random() * Math.max(0, vw - btnW - margin * 2);
    var top = margin + Math.random() * Math.max(0, vh - btnH - margin * 2);
    callBtn.style.left = left + 'px';
    callBtn.style.top = top + 'px';
  }

  var COLORS = ['red', 'yellow', 'green', 'blue'];

  var CARD_LABELS = {
    skip: '⊘', reverse: '⇄', draw2: '+2', wild: '★', wild4: '+4'
  };

  function buildDeck() {
    var deck = [];
    COLORS.forEach(function (color) {
      deck.push({ color: color, value: '0' });
      for (var n = 1; n <= 9; n++) {
        deck.push({ color: color, value: String(n) });
        deck.push({ color: color, value: String(n) });
      }
      ['skip', 'reverse', 'draw2'].forEach(function (v) {
        deck.push({ color: color, value: v });
        deck.push({ color: color, value: v });
      });
    });
    for (var i = 0; i < 4; i++) {
      deck.push({ color: 'wild', value: 'wild' });
      deck.push({ color: 'wild', value: 'wild4' });
    }
    return deck;
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  // --- seats -------------------------------------------------------
  // seatOrder is the fixed rotation order for the round: always starts
  // with 'player', then 1-3 House seats. `direction` (+1/-1) combined
  // with nextSeatId() is how Reverse actually changes anything once
  // there's more than one House seat to reverse past.
  var SEAT_NAMES = { house1: 'The House', house2: 'Journal', house3: 'Mirror' };

  // Each House seat plays a little differently:
  // - The House: sharp — always takes the best available card, saves
  //   wilds, calls colors and stacks with full confidence.
  // - Journal: sloppy — friendly but not paying close attention, picks
  //   pretty much at random among whatever's legal.
  // - Mirror: soft — mostly sharp, but would rather not put you on the
  //   spot. Sometimes plays a plain number card out of pity when she
  //   could've hit you harder, and is reluctant to pass a stack your way.
  var PERSONALITY = { house1: 'sharp', house2: 'sloppy', house3: 'soft' };
  var seatOrder, direction, hands, unoCalled, houseUnoTimers;

  function seatLabel(seatId) {
    return seatId === 'player' ? 'You' : SEAT_NAMES[seatId];
  }

  function isHouseSeat(seatId) {
    return seatId !== 'player';
  }

  function allHouseSeats() {
    return seatOrder.filter(isHouseSeat);
  }

  function nextSeatId(fromId, steps) {
    var idx = seatOrder.indexOf(fromId);
    var n = seatOrder.length;
    var newIdx = ((idx + steps * direction) % n + n) % n;
    return seatOrder[newIdx];
  }

  // --- game state --------------------------------------------------
  var drawPile, discardPile;
  var currentColor, turn, over, pendingWildCard, pendingSevenCard;
  var HOUSE_UNO_MAX_DELAY_MS = 3000;

  // --- House Rules: slap-on-5 -----------------------------------------
  // Whenever a 5 lands on the discard pile, everyone at the table races
  // to tap it — every House seat gets its own random reaction time, and
  // the player has to click. Once everyone but one seat has slapped,
  // that last holdout is the loser and draws 2. With only one House
  // seat this collapses back to the original 2-player race.
  var slapActive = false;
  var slapSeatTimers = {};
  var slapDeadlineId = null;
  var slapOrder = [];
  var HOUSE_SLAP_MIN_MS = 500;
  var HOUSE_SLAP_RANDOM_RANGE_MS = 1500;

  function startSlap() {
    if (over) return;
    slapActive = true;
    slapOrder = [];
    discardWrapEl.classList.add('is-slappable');
    slapLabelEl.hidden = false;
    allHouseSeats().forEach(function (s) {
      var delay = HOUSE_SLAP_MIN_MS + Math.random() * HOUSE_SLAP_RANDOM_RANGE_MS;
      slapSeatTimers[s] = setTimeout(function () { registerSlap(s); }, delay);
    });
    // Hard deadline in case the player never clicks at all — covers the
    // worst-case House reaction time plus a beat.
    clearTimeout(slapDeadlineId);
    slapDeadlineId = setTimeout(finishSlapRace, HOUSE_SLAP_MIN_MS + HOUSE_SLAP_RANDOM_RANGE_MS + 200);
  }

  function registerSlap(seatId) {
    if (!slapActive || over || slapOrder.indexOf(seatId) !== -1) return;
    slapOrder.push(seatId);
    // Once every seat but one has slapped, that holdout is already the
    // loser — no reason to keep waiting out the rest of the window.
    if (slapOrder.length >= seatOrder.length - 1) finishSlapRace();
  }

  function finishSlapRace() {
    if (!slapActive || over) return;
    slapActive = false;
    Object.keys(slapSeatTimers).forEach(function (s) { clearTimeout(slapSeatTimers[s]); });
    slapSeatTimers = {};
    clearTimeout(slapDeadlineId);
    slapDeadlineId = null;
    discardWrapEl.classList.remove('is-slappable');
    slapLabelEl.hidden = true;
    var loser = seatOrder.filter(function (s) { return slapOrder.indexOf(s) === -1; })[0];
    if (!loser) loser = slapOrder[slapOrder.length - 1]; // everyone somehow slapped — last one in is the loser
    drawCards(hands[loser], 2);
    log((loser === 'player' ? 'You were' : seatLabel(loser) + ' was') + ' last to slap the pile! ' +
      (loser === 'player' ? 'You draw' : seatLabel(loser) + ' draws') + ' 2.');
    render();
  }

  function cancelSlap() {
    slapActive = false;
    Object.keys(slapSeatTimers).forEach(function (s) { clearTimeout(slapSeatTimers[s]); });
    slapSeatTimers = {};
    clearTimeout(slapDeadlineId);
    slapDeadlineId = null;
    slapOrder = [];
    discardWrapEl.classList.remove('is-slappable');
    slapLabelEl.hidden = true;
  }

  discardWrapEl.addEventListener('click', function () {
    if (!slapActive || slapOrder.indexOf('player') !== -1) return;
    registerSlap('player');
    // Stop the pulsing prompt for the player the instant their own
    // slap lands, even if the race is still waiting on other House
    // seats to react — otherwise it keeps flashing until everyone's
    // done and it looks like the click didn't register.
    discardWrapEl.classList.remove('is-slappable');
    slapLabelEl.hidden = true;
  });

  // --- House Rules: +2/+4 stacking ------------------------------------
  // Getting hit with a Draw Two/Four doesn't have to mean drawing —
  // if you're holding a Draw Two or Wild Draw Four of your own, you can
  // play it back on top instead, piling the count onto whoever's stuck
  // holding it next. Any Draw Two/Four stacks onto any other, color
  // doesn't have to match. You get a short window to click one before
  // it's assumed you don't have one (or don't want to use it) and the
  // whole pile lands on you.
  var pendingStack = null; // { count, owedBy: <seatId> } while a stack is live
  var stackWindowActive = false;
  var stackTimerId = null;
  var STACK_WINDOW_MS = 1800;
  var HOUSE_STACK_THINK_MS = 1200;

  function isStackable(card) {
    return card.value === 'draw2' || card.value === 'wild4';
  }

  function findStackableIdx(hand) {
    for (var i = 0; i < hand.length; i++) if (isStackable(hand[i])) return i;
    return -1;
  }

  function hideStackIndicator() {
    stackIndicatorEl.hidden = true;
    stackBarEl.style.transition = 'none';
    stackBarEl.style.width = '100%';
  }

  // Whether a House seat bothers stacking a Draw Two/Four it's holding,
  // rather than just taking the pile. Sharp always does. Sloppy mostly
  // does, no real strategy behind it either way. Soft (Mirror) hesitates
  // more, and especially doesn't want to pass the pile on to you.
  function houseWantsToStack(seatId) {
    var personality = PERSONALITY[seatId] || 'sharp';
    if (personality === 'sharp') return true;
    if (personality === 'sloppy') return Math.random() < 0.7;
    var passesTo = nextSeatId(seatId, 1);
    return Math.random() < (passesTo === 'player' ? 0.4 : 0.8);
  }

  function handleStackResponse() {
    if (!pendingStack) return;
    var owed = pendingStack.owedBy;
    if (owed !== 'player') {
      setTimeout(function () {
        if (!pendingStack || over) return;
        var idx = findStackableIdx(hands[owed]);
        if (idx !== -1 && houseWantsToStack(owed)) {
          log(seatLabel(owed) + ' stacks another one on.');
          playCard(owed, idx);
        } else {
          resolveStackDraw(owed);
        }
      }, HOUSE_STACK_THINK_MS);
      return;
    }
    if (findStackableIdx(hands.player) === -1) {
      wait(700).then(function () { resolveStackDraw('player'); });
      return;
    }
    startStackWindow();
  }

  function startStackWindow() {
    stackWindowActive = true;
    stackTextEl.textContent = 'Stack: ' + pendingStack.count + ' — play a Draw Two/Four or take it';
    stackIndicatorEl.hidden = false;
    stackBarEl.style.transition = 'none';
    stackBarEl.style.width = '100%';
    // force a reflow so the width reset above is committed before the
    // transition below starts, otherwise the browser can coalesce them
    // and the bar just appears already empty instead of draining down
    void stackBarEl.offsetWidth;
    stackBarEl.style.transition = 'width ' + STACK_WINDOW_MS + 'ms linear';
    stackBarEl.style.width = '0%';
    render();
    clearTimeout(stackTimerId);
    stackTimerId = setTimeout(function () {
      if (!pendingStack || !stackWindowActive) return;
      log('You forfeit the stack.');
      resolveStackDraw('player');
    }, STACK_WINDOW_MS);
  }

  function cancelStackWindow() {
    stackWindowActive = false;
    clearTimeout(stackTimerId);
    stackTimerId = null;
    hideStackIndicator();
  }

  // Voluntarily take the pile now instead of waiting out the window —
  // clicking the draw pile during your own stack window does this.
  function takeStackNow() {
    if (!pendingStack || pendingStack.owedBy !== 'player' || !stackWindowActive) return;
    cancelStackWindow();
    resolveStackDraw('player');
  }

  function resolveStackDraw(who) {
    if (!pendingStack) return;
    var count = pendingStack.count;
    drawCards(hands[who], count);
    log((who === 'player' ? 'You draw ' : seatLabel(who) + ' draws ') + count + ' from the stack.');
    pendingStack = null;
    cancelStackWindow();
    clearTimeout(houseTurnTimerId);
    houseTurnTimerId = null;
    clearTimeout(houseJumpTimerId);
    houseJumpTimerId = null;
    turn = nextSeatId(who, 1);
    render();
    if (!over) {
      if (turn === 'player') statusEl.textContent = 'Your turn again.';
      else houseTurn(turn);
    }
  }

  // --- House Rules: jump-in --------------------------------------------
  // If you're holding the *exact* same card (color and value) as the
  // current top of the discard pile, you can play it the instant you
  // spot it — even out of turn — cutting the line. Any House seat gets
  // the same chance while it isn't their turn: a short random delay,
  // then a coin-flip on whether it takes the opening.
  var houseJumpTimerId = null;

  function isExactMatch(card) {
    var top = topCard();
    return card.color === top.color && card.value === top.value;
  }

  function findExactIdx(hand) {
    for (var i = 0; i < hand.length; i++) if (isExactMatch(hand[i])) return i;
    return -1;
  }

  function canJumpIn(who) {
    if (mode !== 'houseRules' || over || turn === 'dealing') return false;
    if (pendingStack || stackWindowActive || slapActive || pendingWildCard || pendingSevenCard) return false;
    return turn !== who; // only makes sense out of turn
  }

  function jumpIn(who, idx) {
    clearTimeout(houseTurnTimerId);
    houseTurnTimerId = null;
    clearTimeout(houseJumpTimerId);
    houseJumpTimerId = null;
    turn = who;
    log(who === 'player' ? 'You jump in!' : seatLabel(who) + ' jumps in!');
    playCard(who, idx);
  }

  // How eager a seat is to jump in when it spots the chance — sharp
  // pounces most of the time, sloppy is a coin flip, soft mostly lets
  // it go by (especially since jumping in ahead of you cuts your turn
  // short, which isn't very Mirror of her).
  var JUMP_IN_CHANCE = { sharp: 0.7, sloppy: 0.5, soft: 0.25 };

  function maybeHouseJumpIn() {
    if (mode !== 'houseRules' || over || turn === 'dealing' || houseJumpTimerId) return;
    if (pendingStack || stackWindowActive || slapActive || pendingWildCard || pendingSevenCard) return;
    var candidates = [];
    allHouseSeats().forEach(function (s) {
      if (s === turn) return;
      if (findExactIdx(hands[s]) !== -1) candidates.push(s);
    });
    if (!candidates.length) return;
    var seat = candidates[Math.floor(Math.random() * candidates.length)];
    var chance = JUMP_IN_CHANCE[PERSONALITY[seat]] || 0.5;
    if (Math.random() > chance) return; // doesn't always take the opening
    houseJumpTimerId = setTimeout(function () {
      houseJumpTimerId = null;
      if (mode !== 'houseRules' || over || seat === turn) return;
      var idx = findExactIdx(hands[seat]);
      if (idx === -1) return;
      jumpIn(seat, idx);
    }, 900 + Math.random() * 700);
  }

  // --- House Rules: 7-0 (swap / rotate hands) ---------------------------
  function swapHands(a, b) {
    var tmp = hands[a];
    hands[a] = hands[b];
    hands[b] = tmp;
  }

  function rotateAllHands() {
    var n = seatOrder.length;
    var newHands = {};
    seatOrder.forEach(function (s, i) {
      var srcIdx = ((i - direction) % n + n) % n;
      newHands[s] = hands[seatOrder[srcIdx]];
    });
    hands = newHands;
  }

  function pickHouseSwapTarget(who) {
    var others = seatOrder.filter(function (s) { return s !== who; });
    var personality = PERSONALITY[who] || 'sharp';
    if (personality === 'sloppy') {
      return others[Math.floor(Math.random() * others.length)];
    }
    var leader = others.reduce(function (best, s) {
      return hands[s].length < hands[best].length ? s : best;
    }, others[0]);
    if (personality === 'soft' && leader === 'player' && others.length > 1 && Math.random() < 0.6) {
      // would rather not undercut you specifically — pick among the others instead
      var rest = others.filter(function (s) { return s !== 'player'; });
      return rest[Math.floor(Math.random() * rest.length)];
    }
    return leader;
  }

  function showSwapPicker(card) {
    pendingSevenCard = card;
    swapPickerEl.innerHTML = '<p>Play your 7 against&hellip;</p>';
    allHouseSeats().forEach(function (t) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'uno-swap-btn';
      btn.textContent = seatLabel(t) + ' (' + hands[t].length + ')';
      btn.addEventListener('click', function () {
        swapPickerEl.hidden = true;
        swapHands('player', t);
        log('You swap hands with ' + seatLabel(t) + '!');
        pendingSevenCard = null;
        continueCardEffect('player', card);
      });
      swapPickerEl.appendChild(btn);
    });
    swapPickerEl.hidden = false;
    render();
  }

  function log(text) {
    var p = document.createElement('p');
    p.textContent = text;
    logEl.appendChild(p);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function reshuffleIfNeeded() {
    if (drawPile.length > 0) return;
    if (discardPile.length <= 1) return; // nothing but the top card exists — truly nothing left to draw
    // keep the top discard in place, shuffle the rest back into the draw pile
    var top = discardPile.pop();
    drawPile = shuffle(discardPile);
    discardPile = [top];
    log('The draw pile ran out — reshuffling the discards.');
  }

  function drawCards(hand, count) {
    var drawn = [];
    for (var i = 0; i < count; i++) {
      reshuffleIfNeeded();
      if (drawPile.length === 0) break; // truly out of cards, both piles empty
      var card = drawPile.pop();
      hand.push(card);
      drawn.push(card);
    }
    return drawn;
  }

  function topCard() {
    return discardPile[discardPile.length - 1];
  }

  function cardMatches(card) {
    if (card.color === 'wild') return true;
    if (card.color === currentColor) return true;
    var top = topCard();
    if (card.value === top.value) return true;
    return false;
  }

  function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  // One pacing constant for every House pause — the opening move and
  // every move after it — so the deliberate, unhurried feel is
  // consistent through the whole round instead of just the first turn.
  var HOUSE_THINK_MS = 1800;

  // Builds a fresh shuffled round, deals with a staggered visual animation,
  // then pauses before the round opens. Bails back to the Start screen
  // without finishing the round — used when the ruleset is switched
  // mid-game, since silently changing rules partway through a hand
  // doesn't make sense.
  function returnToStartScreen() {
    over = true;
    clearAllTimers();
    unoStartEl.hidden = false;
    unoHudEl.hidden = true;
    houseRowEl.hidden = true;
    tableEl.hidden = true;
    logEl.hidden = true;
    colorPickerEl.hidden = true;
    swapPickerEl.hidden = true;
    callBtn.hidden = true;
    resultEl.hidden = true;
  }

  function clearAllTimers() {
    Object.keys(houseUnoTimers || {}).forEach(function (k) { clearTimeout(houseUnoTimers[k]); });
    houseUnoTimers = {};
    cancelSlap();
    pendingStack = null;
    cancelStackWindow();
    clearTimeout(houseTurnTimerId);
    houseTurnTimerId = null;
    clearTimeout(houseJumpTimerId);
    houseJumpTimerId = null;
    banterTimerIds.forEach(function (id) { clearTimeout(id); });
    banterTimerIds = [];
    hideBubble();
  }

  // --- flavor dialogue ---------------------------------------------------
  // The House barely talks — on rare turns it just gets an "..." logged,
  // no comment attached. Journal and Mirror are chattier: the odd one-off
  // remark on their own turn, or (when they're both at the table) a short
  // back-and-forth logged as two lines a beat apart, like they're talking
  // past you rather than to you.
  var banterTimerIds = [];
  var bubbleHideTimer = null;

  // Positions the shared bubble directly above whichever seat is
  // "speaking" — computed once at show time (like the Uno-call button's
  // random placement), not tracked continuously, so it doesn't need to
  // survive houseRowEl's per-render rebuild.
  function positionBubbleAt(seatId) {
    var seatWrap = houseRowEl.querySelector('[data-seat="' + seatId + '"]');
    if (!seatWrap) return false;
    var gameRect = gameEl.getBoundingClientRect();
    var seatRect = seatWrap.getBoundingClientRect();
    bubbleEl.style.left = (seatRect.left - gameRect.left + seatRect.width / 2) + 'px';
    bubbleEl.style.top = (seatRect.top - gameRect.top) + 'px';
    return true;
  }

  function showBubble(seatId, text) {
    if (!text || !positionBubbleAt(seatId)) return;
    clearTimeout(bubbleHideTimer);
    bubbleTextEl.textContent = text;
    bubbleEl.classList.toggle('is-mirror', seatId === 'house3');
    bubbleEl.classList.add('is-visible');
    bubbleHideTimer = setTimeout(function () {
      bubbleEl.classList.remove('is-visible');
    }, 2200);
  }

  function hideBubble() {
    clearTimeout(bubbleHideTimer);
    bubbleEl.classList.remove('is-visible');
  }

  var JOURNAL_LINES = [
    'Good one!',
    "Didn't see that coming.",
    "This deck's got a mind of its own.",
    'My turn already? Alright, alright.',
    "Careful with that draw pile.",
    "Been a while since I held cards this bad.",
    "You've got a good hand, I can tell.",
    "I used to play this with someone else, a long time ago.",
    "Hah, that's the spirit.",
    "Oh, I meant to play that one.",
    "No rush. I've got nowhere to be.",
    "You're better at this than you let on."
  ];

  var MIRROR_LINES = [
    'Take your time.',
    'Mm. Interesting choice.',
    "I don't mind losing, you know.",
    "You're doing well.",
    'Just here to keep you company.',
    "I like watching more than playing, really.",
    "That was a kind move.",
    "Everyone deserves a turn.",
    "You remind me of someone who used to visit.",
    "No need to go easy on me.",
    "This is nice. Quiet company.",
    "Win or lose, I'm glad you're here."
  ];

  // [speaker, line, replier, reply] — always logged in this order.
  var EXCHANGES = [
    ['house2', "Careful, she's got that look again.", 'house3', "I do not have a look."],
    ['house3', 'You could ease up on them a little.', 'house2', "Where's the fun in that?"],
    ['house2', 'Think you can beat them, Mirror?', 'house3', "I'm not trying to beat anyone."],
    ['house3', "You're being loud again, Journal.", 'house2', "I'm always loud."],
    ['house2', 'Bet you five it rains tomorrow.', 'house3', "It doesn't rain here."],
    ['house2', "Mirror, you're staring again.", 'house3', "I'm just watching the cards."],
    ['house3', "You never did teach me this game properly.", 'house2', "You've beaten me plenty of times!"],
    ['house2', "I'll go easy on you today.", 'house3', "You say that every time."],
    ['house3', "Do you ever get tired of losing on purpose?", 'house2', "Who says it's on purpose?"],
    ['house2', "Remember the first time we played this?", 'house3', "I remember you cheated."]
  ];

  function maybeSeatBanter(seatId) {
    if (seatId === 'house1') {
      if (Math.random() < 0.12) {
        log('The House: "..."');
        showBubble(seatId, '...');
      }
      return;
    }
    if (seatId !== 'house2' && seatId !== 'house3') return;
    var otherSeat = seatId === 'house2' ? 'house3' : 'house2';
    if (seatOrder.indexOf(otherSeat) !== -1 && Math.random() < 0.3) {
      var ex = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
      log(seatLabel(ex[0]) + ': "' + ex[1] + '"');
      showBubble(ex[0], ex[1]);
      var id = setTimeout(function () {
        if (over) return;
        log(seatLabel(ex[2]) + ': "' + ex[3] + '"');
        showBubble(ex[2], ex[3]);
      }, 2000 + Math.random() * 400);
      banterTimerIds.push(id);
      return;
    }
    if (Math.random() < 0.25) {
      var lines = seatId === 'house2' ? JOURNAL_LINES : MIRROR_LINES;
      var line = lines[Math.floor(Math.random() * lines.length)];
      log(seatLabel(seatId) + ': "' + line + '"');
      showBubble(seatId, line);
    }
  }

  function dealGame() {
    seatOrder = ['player', 'house1', 'house2', 'house3'].slice(0, playerCount);
    direction = 1;
    hands = {};
    unoCalled = {};
    seatOrder.forEach(function (s) { hands[s] = []; unoCalled[s] = true; });

    drawPile = shuffle(buildDeck());
    discardPile = [];
    over = false;
    pendingWildCard = null;
    pendingSevenCard = null;
    clearAllTimers();
    logEl.innerHTML = '';
    resultEl.hidden = true;
    colorPickerEl.hidden = true;
    swapPickerEl.hidden = true;
    callBtn.hidden = true;
    restartBtn.disabled = true; // no restarting mid-deal
    unoHudEl.hidden = false;
    houseRowEl.hidden = false;
    tableEl.hidden = false;
    logEl.hidden = false;
    turn = 'dealing'; // blocks hand clicks / draw pile / pass — see render() and handlers
    statusEl.textContent = 'Dealing…';

    seatOrder.forEach(function (s) { drawCards(hands[s], 7); });

    // first discard can't be a wild — keep drawing until it's a color card
    var first;
    do {
      if (discardPile.length) drawPile.unshift(discardPile.pop());
      reshuffleIfNeeded();
      first = drawPile.pop();
      discardPile.push(first);
    } while (first.color === 'wild');
    currentColor = first.color;

    log('New round. The House deals 7 cards each.');
    var opener = seatOrder.length > 1 ? nextSeatId('player', 1) : 'player';
    var startTurn = applyCardEffectIfStarting(first, opener);

    justDealt = true;
    render();

    wait(HOUSE_THINK_MS).then(function () {
      restartBtn.disabled = false;
      turn = startTurn;
      if (turn === 'player') render();
      else houseTurn(turn);
    });
  }

  // The opening actor is always the first House seat — a Skip/Reverse/
  // Draw Two flipped as the starting card can change who actually goes
  // first, or (with 3-4 players) flip turn direction before anyone's
  // moved at all.
  function applyCardEffectIfStarting(card, opener) {
    if (card.value === 'skip') {
      var t = nextSeatId(opener, 1);
      log('The House starts with ' + describeCard(card) + ' — ' + (t === 'player' ? 'you go' : seatLabel(t) + ' goes') + ' first instead.');
      return t;
    }
    if (card.value === 'reverse') {
      if (seatOrder.length > 2) {
        direction *= -1;
        var t2 = nextSeatId(opener, 1);
        log('The House starts with ' + describeCard(card) + ' — turn order reverses, ' + (t2 === 'player' ? 'you go' : seatLabel(t2) + ' goes') + ' first.');
        return t2;
      }
      var t3 = nextSeatId(opener, 1);
      log('The House starts with ' + describeCard(card) + ' — ' + (t3 === 'player' ? 'you go' : seatLabel(t3) + ' goes') + ' first instead.');
      return t3;
    }
    if (card.value === 'draw2') {
      drawCards(hands[opener], 2);
      log((opener === 'player' ? 'You open' : seatLabel(opener) + ' opens') + ' on a Draw Two and draws 2 first.');
      return opener;
    }
    return opener;
  }

  function describeCard(card) {
    if (card.color === 'wild') return card.value === 'wild4' ? 'Wild Draw Four' : 'Wild';
    var name = card.value;
    if (name === 'skip') name = 'Skip';
    else if (name === 'reverse') name = 'Reverse';
    else if (name === 'draw2') name = 'Draw Two';
    return card.color + ' ' + name;
  }

  // --- rendering -----------------------------------------------------
  // Same house-silhouette SVG the Crossroads token uses, so the card
  // back reads as "The House" instead of a plain letter. A small copy
  // repeats in opposite corners, same as a real Uno card back's corner
  // pips — the center one stays at full size, the corner ones are
  // sized down via the .uno-mini-house CSS class.
  var HOUSE_PATH = 'M10 20v-6h4v6h5v-8h3L12 3L2 12h3v8z';
  function houseIconSvg(extraClass) {
    return '<svg class="' + (extraClass || '') + '" viewBox="0 0 24 24" aria-hidden="true">' +
      '<path fill="currentColor" d="' + HOUSE_PATH + '"/></svg>';
  }
  var HOUSE_ICON_SVG = houseIconSvg('corner-tl uno-mini-house') +
    houseIconSvg('') +
    houseIconSvg('corner-br uno-mini-house');
  // Face-up cards get the same corner pips, but as a plain white outline
  // rather than a solid fill — reads more like a card's rank/suit corner
  // marker than a repeat of the big house logo.
  var CORNER_HOUSES_FRONT =
    '<svg class="corner-tl uno-mini-house uno-mini-house-front" viewBox="0 0 24 24" aria-hidden="true"><path d="' + HOUSE_PATH + '"/></svg>' +
    '<svg class="corner-br uno-mini-house uno-mini-house-front" viewBox="0 0 24 24" aria-hidden="true"><path d="' + HOUSE_PATH + '"/></svg>';

  function makeCardEl(card, faceUp) {
    var el = document.createElement('div');
    if (!faceUp) {
      el.className = 'uno-card uno-card-back';
      el.innerHTML = HOUSE_ICON_SVG;
      return el;
    }
    el.className = 'uno-card color-' + card.color;
    el.innerHTML = CORNER_HOUSES_FRONT;
    var label = document.createElement('span');
    label.textContent = CARD_LABELS[card.value] || card.value;
    el.appendChild(label);
    return el;
  }

  // Set true only for the render() call right after the initial deal —
  // gives every freshly-placed card a staggered "dealt in" animation
  // instead of just appearing. Cleared right after so normal plays/draws
  // during the round render instantly, same as before.
  var justDealt = false;

  function applyDealAnimation(el, index) {
    if (!justDealt) return;
    el.classList.add('uno-deal-in');
    el.style.animationDelay = (index * 70) + 'ms';
  }

  function render() {
    // house seats (backs only, count shown), rebuilt fresh each render
    houseRowEl.innerHTML = '';
    allHouseSeats().forEach(function (seatId) {
      var seatWrap = document.createElement('div');
      seatWrap.className = 'uno-house-seat' + (turn === seatId ? ' is-active-seat' : '');
      seatWrap.setAttribute('data-seat', seatId);
      var pileWrap = document.createElement('div');
      pileWrap.className = 'uno-pile-wrap';
      var cardsEl = document.createElement('div');
      cardsEl.className = 'uno-house-cards';
      hands[seatId].forEach(function (c, i) {
        var backEl = makeCardEl(null, false);
        applyDealAnimation(backEl, i);
        cardsEl.appendChild(backEl);
      });
      var labelEl = document.createElement('span');
      labelEl.className = 'uno-house-label';
      labelEl.textContent = seatLabel(seatId) + ' — ' + hands[seatId].length + ' card' + (hands[seatId].length === 1 ? '' : 's');
      pileWrap.appendChild(cardsEl);
      pileWrap.appendChild(labelEl);
      seatWrap.appendChild(pileWrap);
      houseRowEl.appendChild(seatWrap);
    });

    // discard top
    discardTopEl.innerHTML = '';
    var topEl = makeCardEl(topCard(), true);
    applyDealAnimation(topEl, 20);
    discardTopEl.appendChild(topEl);
    colorLabelEl.textContent = currentColor;
    colorSwatchEl.className = 'uno-current-color color-' + currentColor;
    colorSwatchEl.style.background = colorHex(currentColor);

    // player hand
    var inStackWindow = stackWindowActive && pendingStack && pendingStack.owedBy === 'player';
    handEl.innerHTML = '';
    hands.player.forEach(function (card, idx) {
      var el = makeCardEl(card, true);
      // During your own stack window, only Draw Two/Four are clickable —
      // normal color/value matching doesn't apply, any stack card works.
      var jumpable = !inStackWindow && canJumpIn('player') && isExactMatch(card);
      var legal = inStackWindow
        ? isStackable(card)
        : (turn === 'player' && !over && cardMatches(card)) || jumpable;
      if (!legal) el.classList.add('is-illegal');
      el.addEventListener('click', function () {
        if (inStackWindow) {
          if (!isStackable(card)) return;
          cancelStackWindow();
          playCard('player', idx);
          return;
        }
        if (turn === 'player' && !over) {
          if (!cardMatches(card)) return;
          playCard('player', idx);
          return;
        }
        if (canJumpIn('player') && isExactMatch(card)) {
          jumpIn('player', idx);
        }
      });
      applyDealAnimation(el, idx);
      handEl.appendChild(el);
    });
    justDealt = false;
    maybeHouseJumpIn();

    // Locked (visually and via the click handler) once you're holding a
    // playable card — you have to play it before you're allowed to draw
    // again.
    var drawLocked = turn === 'player' && !over && hasLegalCard();
    drawPileEl.classList.toggle('is-disabled', drawLocked);

    // Visible any time you're sitting on one card and haven't called it
    // yet — not gated to your turn, since the risk window is "before
    // someone else's next move," which can land mid-opponent-turn. It
    // jumps to a fresh random spot only on the hidden->visible
    // transition, not on every render, so it's a "spot it and click it"
    // reflex moment rather than a target that keeps sliding around.
    var shouldShowCall = hands.player.length === 1 && !unoCalled.player && !over;
    if (shouldShowCall && callBtn.hidden) repositionCallBtnRandomly();
    callBtn.hidden = !shouldShowCall;

    if (!over) {
      if (inStackWindow) {
        statusEl.textContent = 'Stack it or take it!';
      } else if (turn === 'player') {
        statusEl.textContent = 'Your turn.';
      } else if (isHouseSeat(turn)) {
        statusEl.textContent = seatLabel(turn) + "'s turn.";
      }
      // turn === 'dealing': leave whatever status dealGame() already set
    }
  }

  function colorHex(color) {
    return { red: '#c0463c', yellow: '#d9a441', green: '#4c8c5c', blue: '#3b6ea5' }[color] || '#888';
  }

  // --- turn resolution -------------------------------------------------
  function catchForgottenUnoCalls(exceptWho) {
    seatOrder.forEach(function (s) {
      if (s === exceptWho) return;
      if (hands[s].length === 1 && !unoCalled[s]) {
        unoCalled[s] = true;
        clearTimeout(houseUnoTimers[s]);
        drawCards(hands[s], 2);
        log((s === 'player' ? 'You forgot' : seatLabel(s) + ' forgot') + ' to say Uno! ' + (s === 'player' ? 'You draw' : seatLabel(s) + ' draws') + ' 2.');
      }
    });
  }

  // Drawing itself is evidence you didn't call it in time — the card
  // count is about to change either way, so there's no window left to
  // call into. Catches the seat on itself, right before it draws.
  function catchSelfIfDrawingUncalled(seatId) {
    if (hands[seatId].length !== 1 || unoCalled[seatId]) return false;
    unoCalled[seatId] = true;
    clearTimeout(houseUnoTimers[seatId]);
    drawCards(hands[seatId], 2);
    log((seatId === 'player' ? 'You forgot' : seatLabel(seatId) + ' forgot') + ' to say Uno before drawing! ' + (seatId === 'player' ? 'You draw' : seatLabel(seatId) + ' draws') + ' 2.');
    return true;
  }

  function playCard(who, idx) {
    catchForgottenUnoCalls(who);

    var hand = hands[who];
    var card = hand[idx];
    hand.splice(idx, 1);
    discardPile.push(card);

    if (card.color === 'wild') {
      if (who === 'player') {
        pendingWildCard = card;
        colorPickerEl.hidden = false;
        render();
        return; // wait for color choice before resolving the rest of the turn
      } else {
        var chosen = houseChooseColor(who);
        currentColor = chosen;
        log(seatLabel(who) + ' plays ' + describeCard(card) + ' and calls ' + chosen + '.');
      }
    } else {
      currentColor = card.color;
      log((who === 'player' ? 'You play ' : seatLabel(who) + ' plays ') + describeCard(card) + '.');
    }

    if (mode === 'houseRules' && card.value === '5') startSlap();

    resolveCardEffect(who, card);
  }

  // Chance a seat just picks a random color instead of the one that
  // actually suits its hand — how "sloppy" its color sense is.
  var RANDOM_COLOR_CHANCE = { sharp: 0, sloppy: 0.6, soft: 0.25 };

  function houseChooseColor(seatId) {
    var personality = PERSONALITY[seatId] || 'sharp';
    if (Math.random() < (RANDOM_COLOR_CHANCE[personality] || 0)) {
      return COLORS[Math.floor(Math.random() * COLORS.length)];
    }
    // heuristic: whichever color that seat holds the most of
    var counts = { red: 0, yellow: 0, green: 0, blue: 0 };
    hands[seatId].forEach(function (c) { if (counts[c.color] !== undefined) counts[c.color]++; });
    var best = 'red', bestCount = -1;
    COLORS.forEach(function (c) { if (counts[c] > bestCount) { bestCount = counts[c]; best = c; } });
    return best;
  }

  // Card choice among whatever's legal, colored by personality:
  // - sharp: always the best pick — a non-wild match first, wild only
  //   as a last resort.
  // - sloppy: picks at random among every legal card, wilds included,
  //   no attempt to save them for later.
  // - soft: usually plays sharp, but sometimes pity-picks a harmless
  //   plain number card over a stronger option — more likely to hold
  //   back when it would otherwise hit you specifically.
  function pickCardIdxForSeat(seatId) {
    var hand = hands[seatId];
    var legal = [];
    for (var i = 0; i < hand.length; i++) if (cardMatches(hand[i])) legal.push(i);
    if (!legal.length) return -1;

    var personality = PERSONALITY[seatId] || 'sharp';

    if (personality === 'sloppy') {
      return legal[Math.floor(Math.random() * legal.length)];
    }

    if (personality === 'soft') {
      var target = nextSeatId(seatId, 1);
      var pityChance = target === 'player' ? 0.35 : 0.15;
      if (Math.random() < pityChance) {
        var gentle = legal.filter(function (i) { return /^[0-9]$/.test(hand[i].value); });
        if (gentle.length) return gentle[Math.floor(Math.random() * gentle.length)];
      }
      // falls through to the sharp pick below when there's no gentle option
    }

    for (var j = 0; j < legal.length; j++) if (hand[legal[j]].color !== 'wild') return legal[j];
    return legal[0];
  }

  function resolveCardEffect(who, card) {
    if (checkWin(who)) return;

    if (mode === 'houseRules' && card.value === '0') {
      rotateAllHands();
      log((who === 'player' ? 'You play' : seatLabel(who) + ' plays') + ' 0 — hands rotate around the table!');
    }

    if (mode === 'houseRules' && card.value === '7') {
      if (who === 'player') {
        var targets = allHouseSeats();
        if (targets.length > 1) {
          showSwapPicker(card);
          return; // resumes in the swap-picker button handler
        }
        if (targets.length === 1) {
          swapHands('player', targets[0]);
          log('You swap hands with ' + seatLabel(targets[0]) + '!');
        }
      } else {
        var target2 = pickHouseSwapTarget(who);
        swapHands(who, target2);
        log(seatLabel(who) + ' swaps hands with ' + (target2 === 'player' ? 'you' : seatLabel(target2)) + '!');
      }
    }

    continueCardEffect(who, card);
  }

  function continueCardEffect(who, card) {
    if (checkWin(who)) return; // a swap/rotate could have just emptied someone's hand

    // Landed on exactly one card — start (or restart) that seat's Uno
    // clock. Growing back past 1 later (a draw penalty, etc.) just makes
    // these checks irrelevant again on their own; nothing to clean up.
    if (hands[who].length === 1) {
      unoCalled[who] = false;
      if (who !== 'player') {
        clearTimeout(houseUnoTimers[who]);
        var delay = Math.random() * HOUSE_UNO_MAX_DELAY_MS;
        houseUnoTimers[who] = setTimeout(function () {
          if (over || hands[who].length !== 1 || unoCalled[who]) return;
          unoCalled[who] = true;
          log(seatLabel(who) + ' calls "Uno!"');
        }, delay);
      }
    }

    if (card.value === 'draw2' || card.value === 'wild4') {
      var amt = card.value === 'draw2' ? 2 : 4;
      var target = nextSeatId(who, 1);
      if (mode === 'houseRules') {
        // Stack instead of resolving immediately — see handleStackResponse.
        pendingStack = { count: (pendingStack ? pendingStack.count : 0) + amt, owedBy: target };
        render();
        handleStackResponse();
        return;
      }
      drawCards(hands[target], amt);
      log((target === 'player' ? 'You draw ' : seatLabel(target) + ' draws ') + amt + ' and loses the turn.');
      turn = nextSeatId(who, 2); // skip the drawer, continue after them
    } else if (card.value === 'skip') {
      turn = nextSeatId(who, 2);
    } else if (card.value === 'reverse') {
      if (seatOrder.length === 2) {
        turn = who; // acts like Skip with only 2 players
      } else {
        direction *= -1;
        turn = nextSeatId(who, 1);
      }
    } else {
      turn = nextSeatId(who, 1);
    }

    render();
    if (!over) {
      if (turn === 'player') statusEl.textContent = 'Your turn again.';
      else houseTurn(turn);
    }
  }

  function checkWin(who) {
    if (hands[who].length > 0) return false;
    over = true;
    clearAllTimers();
    restartBtn.disabled = false;
    resultEl.hidden = false;
    resultEl.textContent = who === 'player' ? 'You win! The House is out of comebacks.' : seatLabel(who) + ' wins this round.';
    statusEl.textContent = resultEl.textContent;
    render();
    return true;
  }

  document.querySelectorAll('.uno-color-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (!pendingWildCard) return;
      currentColor = btn.getAttribute('data-color');
      colorPickerEl.hidden = true;
      log('You play ' + describeCard(pendingWildCard) + ' and call ' + currentColor + '.');
      var card = pendingWildCard;
      pendingWildCard = null;
      resolveCardEffect('player', card);
    });
  });

  // --- draw until playable (player) -----------------------------------
  // House rule: no single-draw-then-pass, and no auto-play either. Each
  // click draws exactly one card. A non-match just grows your hand and
  // you click again yourself. A match stops you there — it's added to
  // your hand playable, the draw pile locks (see hasLegalCard() below),
  // and you have to click the card yourself to actually play it.
  function hasLegalCard() {
    return hands.player.some(function (c) { return cardMatches(c); });
  }

  drawPileEl.addEventListener('click', function () {
    if (stackWindowActive && pendingStack && pendingStack.owedBy === 'player') {
      takeStackNow();
      return;
    }
    if (turn !== 'player' || over) return;
    if (hasLegalCard()) return; // already have something playable — play it first
    catchSelfIfDrawingUncalled('player'); // draw still happens below either way
    reshuffleIfNeeded();
    if (drawPile.length === 0) {
      log('Nothing left to draw.');
      turn = nextSeatId('player', 1);
      render();
      if (turn !== 'player') houseTurn(turn);
      return;
    }
    var card = drawPile.pop();
    hands.player.push(card);
    log(cardMatches(card) ? 'You draw a playable card.' : 'You draw. Still nothing to play.');
    render();
  });

  callBtn.addEventListener('click', function () {
    if (hands.player.length !== 1 || unoCalled.player || over) return;
    unoCalled.player = true;
    log('You call "Uno!"');
    render();
  });

  // --- House AI ---------------------------------------------------------
  var houseTurnTimerId = null;

  function houseTurn(seatId) {
    if (over) return;
    statusEl.textContent = seatLabel(seatId) + "'s turn.";
    maybeSeatBanter(seatId);
    houseTurnTimerId = setTimeout(function () {
      houseTurnTimerId = null;
      if (over) return;

      var legalIdx = pickCardIdxForSeat(seatId);
      if (legalIdx !== -1) {
        playCard(seatId, legalIdx);
        return;
      }
      houseDrawUntilPlayable(seatId);
    }, HOUSE_THINK_MS);
  }

  // Same "draw until playable" rule applies to every House seat — no
  // single draw-then-pass for them either.
  var HOUSE_DRAW_STAGGER_MS = 350;

  function houseDrawUntilPlayable(seatId) {
    catchSelfIfDrawingUncalled(seatId);
    (function step() {
      reshuffleIfNeeded();
      if (drawPile.length === 0) {
        log(seatLabel(seatId) + ' has nothing left to draw. It passes.');
        turn = nextSeatId(seatId, 1);
        render();
        if (!over && turn !== 'player') houseTurn(turn);
        return;
      }
      var card = drawPile.pop();
      hands[seatId].push(card);
      render();
      // render() rebuilds the whole row from scratch, so the freshly
      // added card back is always the last child — pop it in rather than
      // letting the row just jump straight to its new length.
      var cardsEl = houseRowEl.querySelector('[data-seat="' + seatId + '"] .uno-house-cards');
      var lastBack = cardsEl && cardsEl.lastElementChild;
      if (lastBack) lastBack.classList.add('uno-pop-in');
      if (cardMatches(card)) {
        wait(HOUSE_DRAW_STAGGER_MS).then(function () {
          log(seatLabel(seatId) + ' draws until it finds a match.');
          playCard(seatId, hands[seatId].length - 1);
        });
      } else {
        wait(HOUSE_DRAW_STAGGER_MS).then(step);
      }
    })();
  }

  restartBtn.addEventListener('click', dealGame);
  startBtn.addEventListener('click', function () {
    unoStartEl.hidden = true;
    dealGame();
  });

  var MODE_INTROS = {
    standard: 'Standard rules, against The House. Match color or number, stack your action cards, and empty your hand first.',
    houseRules: 'House Rules, against The House. More advanced than Standard, including jump-ins, 5 slaps, hand swapping, and stacking +2s and +4s.'
  };

  function setMode(newMode) {
    mode = newMode;
    modeStandardBtn.classList.toggle('is-active', mode === 'standard');
    modeHouseRulesBtn.classList.toggle('is-active', mode === 'houseRules');
    introEl.textContent = MODE_INTROS[mode];
    if (unoStartEl.hidden) returnToStartScreen(); // a round was live — don't switch rules under it
  }

  modeStandardBtn.addEventListener('click', function () { setMode('standard'); });
  modeHouseRulesBtn.addEventListener('click', function () { setMode('houseRules'); });
})();

/* ============================================================
   uno.js — Uno, one on one against The House.
   Milestone 1: standard rules only (no stacking, jump-in, 7-0, or the
   slap-on-5 house rule yet — those come later, along with 3-4 player
   support). Built so those can layer on top without a rewrite: turn
   order already goes through a `direction` value, and drawing/playing
   are separate steps like real Uno instead of one combined action.

   Deck: standard 108 cards — 4 colors x (one 0, two each of 1-9, two
   Skip, two Reverse, two Draw Two) + 4 Wild + 4 Wild Draw Four.
   ============================================================ */
(function () {
  var root = document.getElementById('unoGame');
  if (!root) return;

  var statusEl = document.getElementById('unoStatus');
  var restartBtn = document.getElementById('unoRestart');
  var houseCardsEl = document.getElementById('unoHouseCards');
  var houseCountEl = document.getElementById('unoHouseCount');
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
  var handEl = document.getElementById('unoHand');
  var callBtn = document.getElementById('unoCallBtn');
  var resultEl = document.getElementById('unoResult');
  var logEl = document.getElementById('unoLog');
  var unoStartEl = document.getElementById('unoStart');
  var startBtn = document.getElementById('unoStartBtn');
  var unoHudEl = document.getElementById('unoHud');
  var houseRowEl = document.getElementById('unoHouseRow');
  var tableEl = document.getElementById('unoTable');
  var introEl = document.getElementById('unoIntro');
  var modeStandardBtn = document.getElementById('unoModeStandard');
  var modeHouseRulesBtn = document.getElementById('unoModeHouseRules');

  // 'standard' | 'houseRules' — no rule differences wired in yet, this is
  // just the toggle scaffold. Individual house rules (slap-on-5 first)
  // branch on this as they're added.
  var mode = 'standard';

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

  // --- game state --------------------------------------------------
  var drawPile, discardPile, playerHand, houseHand;
  var currentColor, turn, over, pendingWildCard;
  // Uno-call state: playerUnoCalled/houseUnoCalled are only meaningful
  // while that hand actually has 1 card — see the length checks at each
  // use site rather than clearing these explicitly on every hand change.
  var playerUnoCalled, houseUnoCalled, houseUnoTimerId;
  var HOUSE_UNO_MAX_DELAY_MS = 3000;

  // --- House Rules: slap-on-5 -----------------------------------------
  // Whenever a 5 lands on the discard pile, it's a race: tap the pile
  // before The House "hits" it, or you draw 2. The House gets a short
  // guaranteed-fair window where it can't win at all (HOUSE_SLAP_MIN_MS),
  // then a random chance to beat you anywhere in the following stretch —
  // same shape as the Uno-call timer, just faster and higher-stakes.
  var slapActive = false;
  var slapTimerId = null;
  var HOUSE_SLAP_MIN_MS = 500;
  var HOUSE_SLAP_RANDOM_RANGE_MS = 1500;

  function startSlap() {
    if (over) return;
    slapActive = true;
    discardWrapEl.classList.add('is-slappable');
    slapLabelEl.hidden = false;
    clearTimeout(slapTimerId);
    var delay = HOUSE_SLAP_MIN_MS + Math.random() * HOUSE_SLAP_RANDOM_RANGE_MS;
    slapTimerId = setTimeout(function () { resolveSlap('house'); }, delay);
  }

  function resolveSlap(winner) {
    if (!slapActive || over) return;
    slapActive = false;
    clearTimeout(slapTimerId);
    discardWrapEl.classList.remove('is-slappable');
    slapLabelEl.hidden = true;
    if (winner === 'player') {
      drawCards(houseHand, 2);
      log('You slap it first! The House draws 2.');
    } else {
      drawCards(playerHand, 2);
      log('The House slaps it first! You draw 2.');
    }
    render();
  }

  function cancelSlap() {
    slapActive = false;
    clearTimeout(slapTimerId);
    slapTimerId = null;
    discardWrapEl.classList.remove('is-slappable');
    slapLabelEl.hidden = true;
  }

  discardWrapEl.addEventListener('click', function () {
    if (!slapActive) return;
    resolveSlap('player');
  });

  // --- House Rules: +2/+4 stacking ------------------------------------
  // Getting hit with a Draw Two/Four doesn't have to mean drawing —
  // if you're holding a Draw Two or Wild Draw Four of your own, you can
  // play it back on top instead, piling the count onto whoever's stuck
  // holding it next. Any Draw Two/Four stacks onto any other, color
  // doesn't have to match. You get a short window to click one before
  // it's assumed you don't have one (or don't want to use it) and the
  // whole pile lands on you.
  var pendingStack = null; // { count, owedBy } while a stack is live
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

  function handleStackResponse() {
    if (!pendingStack) return;
    if (pendingStack.owedBy === 'house') {
      setTimeout(function () {
        if (!pendingStack || over) return;
        var idx = findStackableIdx(houseHand);
        if (idx !== -1) {
          log('The House stacks another one on.');
          playCard('house', idx);
        } else {
          resolveStackDraw('house');
        }
      }, HOUSE_STACK_THINK_MS);
      return;
    }
    // owedBy === 'player'
    if (findStackableIdx(playerHand) === -1) {
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

  // Jump-in: if you're holding the *exact* same card (color and value)
  // as the current top of the discard pile, you can play it the instant
  // you spot it — even out of turn — cutting the line. The House gets
  // the same chance while it's your turn: a short random delay, then a
  // coin-flip on whether it takes the opening.
  var houseJumpTimerId = null;

  function isExactMatch(card) {
    var top = topCard();
    return card.color === top.color && card.value === top.value;
  }

  function canJumpIn(who) {
    if (mode !== 'houseRules' || over || turn === 'dealing') return false;
    if (pendingStack || stackWindowActive || slapActive || pendingWildCard) return false;
    return turn !== who; // only makes sense out of turn
  }

  function jumpIn(who, idx) {
    clearTimeout(houseTurnTimerId);
    houseTurnTimerId = null;
    clearTimeout(houseJumpTimerId);
    houseJumpTimerId = null;
    turn = who;
    log((who === 'player' ? 'You jump in!' : 'The House jumps in!'));
    playCard(who, idx);
  }

  function maybeHouseJumpIn() {
    if (!canJumpIn('house') || houseJumpTimerId) return;
    var idx = -1;
    for (var i = 0; i < houseHand.length; i++) {
      if (isExactMatch(houseHand[i])) { idx = i; break; }
    }
    if (idx === -1) return;
    if (Math.random() > 0.5) return; // doesn't always take the opening
    houseJumpTimerId = setTimeout(function () {
      houseJumpTimerId = null;
      if (!canJumpIn('house')) return;
      var freshIdx = -1;
      for (var i = 0; i < houseHand.length; i++) {
        if (isExactMatch(houseHand[i])) { freshIdx = i; break; }
      }
      if (freshIdx === -1) return;
      jumpIn('house', freshIdx);
    }, 900 + Math.random() * 700);
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
    var hand = who === 'player' ? playerHand : houseHand;
    drawCards(hand, count);
    log((who === 'player' ? 'You draw ' : 'The House draws ') + count + ' from the stack.');
    pendingStack = null;
    cancelStackWindow();
    clearTimeout(houseTurnTimerId);
    houseTurnTimerId = null;
    clearTimeout(houseJumpTimerId);
    houseJumpTimerId = null;
    turn = who === 'player' ? 'house' : 'player';
    render();
    if (!over) {
      if (turn === 'house') houseTurn();
      else statusEl.textContent = 'Your turn again.';
    }
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
  // then pauses before The House opens — replaces the old instant-deal
  // resetGame() so a fresh page load doesn't dump a drawn-2 penalty on you
  // with zero buildup. The House always leads off a new round now.
  // Bails back to the Start screen without finishing the round — used
  // when the ruleset is switched mid-game, since silently changing rules
  // partway through a hand doesn't make sense.
  function returnToStartScreen() {
    over = true;
    clearTimeout(houseUnoTimerId);
    cancelSlap();
    pendingStack = null;
    cancelStackWindow();
    clearTimeout(houseTurnTimerId);
    houseTurnTimerId = null;
    clearTimeout(houseJumpTimerId);
    houseJumpTimerId = null;
    unoStartEl.hidden = false;
    unoHudEl.hidden = true;
    houseRowEl.hidden = true;
    tableEl.hidden = true;
    logEl.hidden = true;
    colorPickerEl.hidden = true;
    callBtn.hidden = true;
    resultEl.hidden = true;
  }

  function dealGame() {
    drawPile = shuffle(buildDeck());
    discardPile = [];
    playerHand = [];
    houseHand = [];
    over = false;
    pendingWildCard = null;
    playerUnoCalled = true;
    houseUnoCalled = true;
    clearTimeout(houseUnoTimerId);
    houseUnoTimerId = null;
    cancelSlap();
    pendingStack = null;
    cancelStackWindow();
    clearTimeout(houseTurnTimerId);
    houseTurnTimerId = null;
    clearTimeout(houseJumpTimerId);
    houseJumpTimerId = null;
    logEl.innerHTML = '';
    resultEl.hidden = true;
    colorPickerEl.hidden = true;
    callBtn.hidden = true;
    restartBtn.disabled = true; // no restarting mid-deal
    unoHudEl.hidden = false;
    houseRowEl.hidden = false;
    tableEl.hidden = false;
    logEl.hidden = false;
    turn = 'dealing'; // blocks hand clicks / draw pile / pass — see render() and handlers
    statusEl.textContent = 'Dealing…';

    drawCards(playerHand, 7);
    drawCards(houseHand, 7);

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
    applyCardEffectIfStarting(first);

    justDealt = true;
    render();

    wait(HOUSE_THINK_MS).then(function () {
      restartBtn.disabled = false;
      turn = 'house';
      houseTurn();
    });
  }

  // Only Skip/Reverse/Draw Two matter as a starting card in a 2-player
  // game (Reverse behaves like Skip with only one opponent); Wild Draw
  // Four never gets here since the discard-flip loop above skips wilds.
  function applyCardEffectIfStarting(card) {
    if (card.value === 'skip' || card.value === 'reverse') {
      log('The House starts with ' + describeCard(card) + ' — you go first anyway.');
    } else if (card.value === 'draw2') {
      drawCards(playerHand, 2);
      log('The starting card is Draw Two — you draw 2 to open.');
    }
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
    // house hand (backs only, count shown)
    houseCardsEl.innerHTML = '';
    for (var i = 0; i < houseHand.length; i++) {
      var backEl = makeCardEl(null, false);
      applyDealAnimation(backEl, i);
      houseCardsEl.appendChild(backEl);
    }
    houseCountEl.textContent = 'The House — ' + houseHand.length + ' card' + (houseHand.length === 1 ? '' : 's');

    // discard top
    discardTopEl.innerHTML = '';
    var topEl = makeCardEl(topCard(), true);
    applyDealAnimation(topEl, houseHand.length + playerHand.length);
    discardTopEl.appendChild(topEl);
    colorLabelEl.textContent = currentColor;
    colorSwatchEl.className = 'uno-current-color color-' + currentColor;
    colorSwatchEl.style.background = colorHex(currentColor);

    // player hand
    var inStackWindow = stackWindowActive && pendingStack && pendingStack.owedBy === 'player';
    handEl.innerHTML = '';
    playerHand.forEach(function (card, idx) {
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
    // yet — not gated to your turn, since the risk window is "before the
    // House's next move," which can land mid-opponent-turn. It jumps to a
    // fresh random spot only on the hidden->visible transition, not on
    // every render, so it's a "spot it and click it" reflex moment
    // rather than a target that keeps sliding around while you aim.
    var shouldShowCall = playerHand.length === 1 && !playerUnoCalled && !over;
    if (shouldShowCall && callBtn.hidden) repositionCallBtnRandomly();
    callBtn.hidden = !shouldShowCall;

    if (!over) {
      if (inStackWindow) {
        statusEl.textContent = 'Stack it or take it!';
      } else if (turn === 'player') {
        statusEl.textContent = 'Your turn.';
      } else if (turn === 'house') {
        statusEl.textContent = "The House's turn.";
      }
      // turn === 'dealing': leave whatever status dealGame() already set
    }
  }

  function colorHex(color) {
    return { red: '#c0463c', yellow: '#d9a441', green: '#4c8c5c', blue: '#3b6ea5' }[color] || '#888';
  }

  // --- turn resolution -------------------------------------------------
  function playCard(who, idx) {
    // Catch The House not calling Uno: if it's sitting on exactly one
    // card and hasn't "said" it yet, any move you make (including a
    // forced auto-play out of drawUntilPlayable) catches it out.
    if (who === 'player' && houseHand.length === 1 && !houseUnoCalled) {
      clearTimeout(houseUnoTimerId);
      houseUnoCalled = true;
      drawCards(houseHand, 2);
      log('The House forgot to say Uno! It draws 2.');
    }

    var hand = who === 'player' ? playerHand : houseHand;
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
        var chosen = houseChooseColor();
        currentColor = chosen;
        log('The House plays ' + describeCard(card) + ' and calls ' + chosen + '.');
      }
    } else {
      currentColor = card.color;
      log((who === 'player' ? 'You play ' : 'The House plays ') + describeCard(card) + '.');
    }

    if (mode === 'houseRules' && card.value === '5') startSlap();

    resolveCardEffect(who, card);
  }

  function houseChooseColor() {
    // simple heuristic: whichever color the House holds the most of
    var counts = { red: 0, yellow: 0, green: 0, blue: 0 };
    houseHand.forEach(function (c) { if (counts[c.color] !== undefined) counts[c.color]++; });
    var best = 'red', bestCount = -1;
    COLORS.forEach(function (c) { if (counts[c] > bestCount) { bestCount = counts[c]; best = c; } });
    return best;
  }

  function resolveCardEffect(who, card) {
    var opponent = who === 'player' ? 'house' : 'player';
    var opponentHand = opponent === 'player' ? playerHand : houseHand;

    if (checkWin(who)) return;

    if (mode === 'houseRules' && (card.value === '7' || card.value === '0')) {
      var swapTmp = playerHand;
      playerHand = houseHand;
      houseHand = swapTmp;
      log(who === 'player' ? 'You swap hands with The House!' : 'The House swaps hands with you!');
    }

    // Landed on exactly one card — start (or restart) that side's Uno
    // clock. Growing back past 1 later (a draw penalty, etc.) just makes
    // these checks irrelevant again on their own; nothing to clean up.
    if (who === 'player' && playerHand.length === 1) {
      playerUnoCalled = false;
    }
    if (who === 'house' && houseHand.length === 1) {
      houseUnoCalled = false;
      clearTimeout(houseUnoTimerId);
      var delay = Math.random() * HOUSE_UNO_MAX_DELAY_MS;
      houseUnoTimerId = setTimeout(function () {
        if (over || houseHand.length !== 1 || houseUnoCalled) return;
        houseUnoCalled = true;
        log('The House calls "Uno!"');
      }, delay);
    }

    if (card.value === 'draw2' || card.value === 'wild4') {
      var amt = card.value === 'draw2' ? 2 : 4;
      if (mode === 'houseRules') {
        // Stack instead of resolving immediately — see handleStackResponse.
        pendingStack = { count: (pendingStack ? pendingStack.count : 0) + amt, owedBy: opponent };
        render();
        handleStackResponse();
        return;
      }
      drawCards(opponentHand, amt);
      log((opponent === 'player' ? 'You draw ' + amt + ' and lose' : 'The House draws ' + amt + ' and loses') + ' the turn.');
      turn = who; // same player goes again (opponent skipped)
    } else if (card.value === 'skip' || card.value === 'reverse') {
      // 2-player game: Reverse acts like Skip — the same player goes again
      turn = who;
    } else {
      turn = opponent;
    }

    render();
    if (!over) {
      if (turn === 'house') {
        houseTurn();
      } else {
        statusEl.textContent = 'Your turn again.';
      }
    }
  }

  function checkWin(who) {
    var hand = who === 'player' ? playerHand : houseHand;
    if (hand.length > 0) return false;
    over = true;
    clearTimeout(houseUnoTimerId);
    cancelSlap();
    pendingStack = null;
    cancelStackWindow();
    clearTimeout(houseTurnTimerId);
    houseTurnTimerId = null;
    clearTimeout(houseJumpTimerId);
    houseJumpTimerId = null;
    restartBtn.disabled = false;
    resultEl.hidden = false;
    resultEl.textContent = who === 'player' ? 'You win! The House is out of comebacks.' : 'The House wins this round.';
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
    return playerHand.some(function (c) { return cardMatches(c); });
  }

  drawPileEl.addEventListener('click', function () {
    if (stackWindowActive && pendingStack && pendingStack.owedBy === 'player') {
      takeStackNow();
      return;
    }
    if (turn !== 'player' || over) return;
    if (hasLegalCard()) return; // already have something playable — play it first
    reshuffleIfNeeded();
    if (drawPile.length === 0) {
      log('Nothing left to draw.');
      turn = 'house';
      render();
      houseTurn();
      return;
    }
    var card = drawPile.pop();
    playerHand.push(card);
    log(cardMatches(card) ? 'You draw a playable card.' : 'You draw. Still nothing to play.');
    render();
  });

  callBtn.addEventListener('click', function () {
    if (playerHand.length !== 1 || playerUnoCalled || over) return;
    playerUnoCalled = true;
    log('You call "Uno!"');
    render();
  });

  // --- House AI ---------------------------------------------------------
  var houseTurnTimerId = null;

  function houseTurn() {
    if (over) return;
    statusEl.textContent = "The House's turn.";
    houseTurnTimerId = setTimeout(function () {
      houseTurnTimerId = null;
      if (over) return;

      // Catch the player not calling Uno before this move resolves.
      if (playerHand.length === 1 && !playerUnoCalled) {
        drawCards(playerHand, 2);
        log('You forgot to say Uno! You draw 2.');
      }

      var legalIdx = -1;
      // prefer a non-wild legal card, save wilds for when nothing else matches
      for (var i = 0; i < houseHand.length; i++) {
        if (houseHand[i].color !== 'wild' && cardMatches(houseHand[i])) { legalIdx = i; break; }
      }
      if (legalIdx === -1) {
        for (var j = 0; j < houseHand.length; j++) {
          if (cardMatches(houseHand[j])) { legalIdx = j; break; }
        }
      }
      if (legalIdx !== -1) {
        playCard('house', legalIdx);
        return;
      }
      houseDrawUntilPlayable();
    }, HOUSE_THINK_MS);
  }

  // Same "draw until playable" rule applies to The House — no single
  // draw-then-pass for it either.
  var HOUSE_DRAW_STAGGER_MS = 350;

  function houseDrawUntilPlayable() {
    (function step() {
      reshuffleIfNeeded();
      if (drawPile.length === 0) {
        log('The House has nothing left to draw. It passes.');
        turn = 'player';
        render();
        return;
      }
      var card = drawPile.pop();
      houseHand.push(card);
      render();
      // render() rebuilds the whole row from scratch, so the freshly
      // added card back is always the last child — pop it in rather than
      // letting the row just jump straight to its new length.
      var lastBack = houseCardsEl.lastElementChild;
      if (lastBack) lastBack.classList.add('uno-pop-in');
      if (cardMatches(card)) {
        wait(HOUSE_DRAW_STAGGER_MS).then(function () {
          log('The House draws until it finds a match.');
          playCard('house', houseHand.length - 1);
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
    standard: 'Standard rules, one on one against The House. Match color or number, stack your action cards, and empty your hand first.',
    houseRules: 'House Rules, one on one against The House. More advanced than Standard, including jump-ins, 5 slaps, hand swapping, and stacking +2s and +4s.'
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

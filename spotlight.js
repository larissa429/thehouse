/* ============================================================
   spotlight.js — "Center Stage", an idle clicker starring Abstract
   Painting, who is (in her own mind) the main character of The House.

   Stage 1 only for now: manual clicking, and the first automation
   tier ("Dramatic Sigh"). UPGRADES is written to extend cleanly —
   add another entry to the array and it shows up in the shop
   automatically once its unlock threshold is reached.
   ============================================================ */
(function () {
  var root = document.getElementById('spotlightGame');
  if (!root) return;

  var countEl = document.getElementById('spotlightCount');
  var resetBtn = document.getElementById('spotlightReset');
  var portraitEl = document.getElementById('spotlightPortrait');
  var portraitWrapEl = document.getElementById('spotlightPortraitWrap');
  var quoteEl = document.getElementById('spotlightQuote');
  var rateEl = document.getElementById('spotlightRate');
  var shopEl = document.getElementById('spotlightShop');

  var SAVE_KEY = 'spotlight-save';

  var CLICK_LINES = [
    "I was born for this moment.",
    "Did you feel that? That was character development.",
    "No, no, don't mind me. I'll just suffer beautifully over here.",
    "This is my defining scene.",
    "Somewhere, an award is being engraved.",
    "Every angle is my good angle.",
    "The lighting simply adores me.",
    "I didn't ask to be this compelling.",
    "You're welcome, by the way.",
    "Someone should really be filming this."
  ];

  // Add another tier by adding another entry here — unlockAt is measured
  // in total Spotlight ever earned, baseCost/costMultiplier control the
  // classic "each purchase costs ~15% more" idle-game curve, and
  // ratePerMinute is per single owned copy of that upgrade.
  var UPGRADES = [
    {
      id: 'sigh',
      name: 'Dramatic Sigh',
      desc: 'Barely counts as effort. 1 click / minute.',
      unlockAt: 10,
      baseCost: 10,
      costMultiplier: 1.15,
      ratePerMinute: 1
    }
  ];

  var state = { spotlight: 0, totalEarned: 0, owned: {} };
  UPGRADES.forEach(function (u) { state.owned[u.id] = 0; });

  function loadSave() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (typeof parsed.spotlight === 'number') state.spotlight = parsed.spotlight;
      if (typeof parsed.totalEarned === 'number') state.totalEarned = parsed.totalEarned;
      if (parsed.owned) {
        UPGRADES.forEach(function (u) {
          if (typeof parsed.owned[u.id] === 'number') state.owned[u.id] = parsed.owned[u.id];
        });
      }
    } catch (e) { /* corrupt or missing save — just start fresh */ }
  }

  function save() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }

  function upgradeCost(u) {
    return Math.ceil(u.baseCost * Math.pow(u.costMultiplier, state.owned[u.id]));
  }

  function totalRatePerMinute() {
    return UPGRADES.reduce(function (sum, u) { return sum + state.owned[u.id] * u.ratePerMinute; }, 0);
  }

  function formatNumber(n) {
    return Math.floor(n).toLocaleString();
  }

  function renderCount() {
    countEl.textContent = formatNumber(state.spotlight);
    var rate = totalRatePerMinute();
    if (rate > 0) {
      rateEl.hidden = false;
      rateEl.textContent = '+' + rate + ' / min, passively';
    } else {
      rateEl.hidden = true;
    }
  }

  function renderShop() {
    shopEl.innerHTML = '';
    UPGRADES.forEach(function (u) {
      var owned = state.owned[u.id];
      if (state.totalEarned < u.unlockAt && owned === 0) return; // not unlocked yet

      var cost = upgradeCost(u);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'spotlight-upgrade';
      btn.disabled = state.spotlight < cost;

      var info = document.createElement('div');
      info.className = 'spotlight-upgrade-info';
      var name = document.createElement('span');
      name.className = 'spotlight-upgrade-name';
      name.textContent = u.name;
      var desc = document.createElement('span');
      desc.className = 'spotlight-upgrade-desc';
      desc.textContent = u.desc;
      info.appendChild(name);
      info.appendChild(desc);

      var costEl = document.createElement('span');
      costEl.className = 'spotlight-upgrade-cost';
      costEl.textContent = cost.toLocaleString();

      var ownedEl = document.createElement('span');
      ownedEl.className = 'spotlight-upgrade-owned';
      ownedEl.textContent = owned > 0 ? 'Owned: ' + owned : '';

      btn.appendChild(info);
      btn.appendChild(costEl);
      btn.appendChild(ownedEl);

      btn.addEventListener('click', function () {
        buyUpgrade(u);
      });

      shopEl.appendChild(btn);
    });
  }

  function buyUpgrade(u) {
    var cost = upgradeCost(u);
    if (state.spotlight < cost) return;
    state.spotlight -= cost;
    state.owned[u.id] += 1;
    save();
    renderCount();
    renderShop();
  }

  var lastLine = '';
  function showQuote() {
    var line = CLICK_LINES[Math.floor(Math.random() * CLICK_LINES.length)];
    if (line === lastLine && CLICK_LINES.length > 1) {
      line = CLICK_LINES[(CLICK_LINES.indexOf(line) + 1) % CLICK_LINES.length];
    }
    lastLine = line;
    quoteEl.textContent = line;
  }

  function spawnFloatingPlusOne(clientX, clientY) {
    var rect = portraitWrapEl.getBoundingClientRect();
    var el = document.createElement('span');
    el.className = 'spotlight-float';
    el.textContent = '+1';
    el.style.left = (clientX - rect.left) + 'px';
    el.style.top = (clientY - rect.top) + 'px';
    portraitWrapEl.appendChild(el);
    setTimeout(function () { el.remove(); }, 900);
  }

  function addSpotlight(amount) {
    state.spotlight += amount;
    state.totalEarned += amount;
  }

  function handleClick(e) {
    addSpotlight(1);
    showQuote();
    portraitEl.classList.remove('is-clicked');
    void portraitEl.offsetWidth; // restart the pop animation if it's mid-run
    portraitEl.classList.add('is-clicked');
    var point = e.touches && e.touches[0] ? e.touches[0] : e;
    spawnFloatingPlusOne(point.clientX, point.clientY);
    renderCount();
    renderShop(); // a click can be what crosses an unlock threshold
    save();
  }

  portraitEl.addEventListener('click', handleClick);

  resetBtn.addEventListener('click', function () {
    state = { spotlight: 0, totalEarned: 0, owned: {} };
    UPGRADES.forEach(function (u) { state.owned[u.id] = 0; });
    save();
    quoteEl.textContent = ' ';
    renderCount();
    renderShop();
  });

  // Passive income ticks 4x/second for a smooth-feeling counter, adding
  // a quarter of the per-second rate each time rather than waiting a
  // full minute to add a lump sum.
  setInterval(function () {
    var perSecond = totalRatePerMinute() / 60;
    if (perSecond <= 0) return;
    addSpotlight(perSecond / 4);
    renderCount();
    renderShop();
  }, 250);

  // Autosave on an interval too, not just on click/buy, so passive
  // income earned while idle isn't lost if the tab closes uncleanly.
  setInterval(save, 5000);

  loadSave();
  renderCount();
  renderShop();
})();

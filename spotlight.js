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
  var quoteEsEl = document.getElementById('spotlightQuoteEs');
  var quoteEnEl = document.getElementById('spotlightQuoteEn');
  var rateEl = document.getElementById('spotlightRate');
  var shopEl = document.getElementById('spotlightShop');

  var SAVE_KEY = 'spotlight-save';

  // She delivers every line in (Castilian) Spanish, subtitled — because
  // of course she does. `es` is what's said, `en` is the dim subtitle.
  var CLICK_LINES = [
    { es: 'Nací para este momento.', en: 'I was born for this moment.' },
    { es: '¿Lo has sentido? Eso ha sido desarrollo de personaje.', en: 'Did you feel that? That was character development.' },
    { es: 'No, no, no os preocupéis por mí. Sufriré preciosamente aquí.', en: "No, no, don't mind me. I'll just suffer beautifully over here." },
    { es: 'Esta es mi escena decisiva.', en: 'This is my defining scene.' },
    { es: 'En algún lugar, están grabando un premio.', en: 'Somewhere, an award is being engraved.' },
    { es: 'Todos los ángulos son mi ángulo bueno.', en: 'Every angle is my good angle.' },
    { es: 'La iluminación simplemente me adora.', en: 'The lighting simply adores me.' },
    { es: 'Yo no pedí ser tan cautivadora.', en: "I didn't ask to be this compelling." },
    { es: 'De nada, por cierto.', en: "You're welcome, by the way." },
    { es: 'Alguien debería estar grabando esto.', en: 'Someone should really be filming this.' }
  ];

  // Add another tier by adding another entry here — unlockAt is measured
  // in total Spotlight ever earned, baseCost/costMultiplier control the
  // classic "each purchase costs ~15% more" idle-game curve, and
  // ratePerMinute is per single owned copy of that upgrade. Cost and
  // rate both scale up roughly 6x per tier, same shape as most idle games.
  var UPGRADES = [
    {
      id: 'sigh',
      name: 'Dramatic Sigh',
      desc: 'Barely counts as effort. 1 click / minute.',
      unlockAt: 10,
      baseCost: 10,
      costMultiplier: 1.15,
      ratePerMinute: 1
    },
    {
      id: 'gossip',
      name: 'Overheard Gossip',
      desc: "Everyone's definitely talking about her. 6 clicks / minute.",
      unlockAt: 50,
      baseCost: 60,
      costMultiplier: 1.15,
      ratePerMinute: 6
    },
    {
      id: 'lighting',
      name: 'Flattering Lighting',
      desc: 'Rigged entirely in her favor. 36 clicks / minute.',
      unlockAt: 300,
      baseCost: 360,
      costMultiplier: 1.16,
      ratePerMinute: 36
    },
    {
      id: 'monologue',
      name: 'Uninterrupted Monologue',
      desc: 'Nobody has interrupted her in weeks. 220 clicks / minute.',
      unlockAt: 1800,
      baseCost: 2100,
      costMultiplier: 1.16,
      ratePerMinute: 220
    },
    {
      id: 'fanmail',
      name: 'Self-Written Fan Mail',
      desc: 'She is her own biggest admirer. 1,300 clicks / minute.',
      unlockAt: 10000,
      baseCost: 12000,
      costMultiplier: 1.17,
      ratePerMinute: 1300
    },
    {
      id: 'dancers',
      name: 'Backup Dancers',
      desc: 'Recruited from the other paintings. 8,000 clicks / minute.',
      unlockAt: 60000,
      baseCost: 70000,
      costMultiplier: 1.17,
      ratePerMinute: 8000
    },
    {
      id: 'wing',
      name: 'Her Own Wing of The House',
      desc: 'Renovations completed overnight. 45,000 clicks / minute.',
      unlockAt: 350000,
      baseCost: 400000,
      costMultiplier: 1.18,
      ratePerMinute: 45000
    },
    {
      id: 'universe',
      name: 'Cinematic Universe',
      desc: 'The whole House is secretly about her. 260,000 clicks / minute.',
      unlockAt: 2000000,
      baseCost: 2300000,
      costMultiplier: 1.18,
      ratePerMinute: 260000
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

  var lastLine = null;
  function showQuote() {
    var line = CLICK_LINES[Math.floor(Math.random() * CLICK_LINES.length)];
    if (line === lastLine && CLICK_LINES.length > 1) {
      line = CLICK_LINES[(CLICK_LINES.indexOf(line) + 1) % CLICK_LINES.length];
    }
    lastLine = line;
    quoteEsEl.textContent = line.es;
    quoteEnEl.textContent = line.en;
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
    quoteEsEl.textContent = '';
    quoteEnEl.textContent = '';
    lastLine = null;
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

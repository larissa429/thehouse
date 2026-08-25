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
  var boostShopEl = document.getElementById('spotlightBoostShop');
  var tabBoostBtn = document.getElementById('spotlightTabBoost');
  var tabProductionBtn = document.getElementById('spotlightTabProduction');
  var fxLayerEl = document.getElementById('spotlightFxLayer');
  var effectsToggleBtn = document.getElementById('spotlightEffectsToggle');
  var paparazziBadgeEl = document.getElementById('spotlightPaparazziBadge');
  var paparazziBadgeMultEl = document.getElementById('spotlightPaparazziMultText');

  var SAVE_KEY = 'spotlight-save';

  // Shown before the first click (and after Reset) so the bubble is
  // never empty — an empty bubble collapses to almost no height, which
  // made its speech-bubble tail render as a stray floating square
  // instead of looking attached to anything.
  var IDLE_LINE = { es: '¿A qué esperas? No va a hacer clic solo.', en: "What are you waiting for? It's not gonna click itself." };

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

  // Rare (5% per click) — bigger payout, bigger reaction.
  var CRIT_LINES = [
    { es: '¡Ovación de pie!', en: 'A standing ovation!' },
    { es: '¡Bravo, bravo!', en: 'Bravo, bravo!' },
    { es: 'Esto merece un premio.', en: 'This deserves an award.' },
    { es: '¡El público la ama!', en: 'The audience adores her!' }
  ];

  // Shown sometimes (40% chance) right after buying an upgrade.
  var BUY_LINES = [
    { es: 'Por fin. Ya me cansaba de hacerlo yo misma.', en: 'Finally. I was tired of doing this myself.' },
    { es: 'Una inversión inteligente, la verdad.', en: 'A smart investment, honestly.' },
    { es: 'Esto era necesario.', en: 'This was necessary.' },
    { es: 'Ahora sí. Ahora empezamos de verdad.', en: 'Now, yes. Now we truly begin.' }
  ];

  // Add another tier by adding another entry here — unlockAt is measured
  // in total Spotlight ever earned, baseCost/costMultiplier control the
  // classic "each purchase costs ~15% more" idle-game curve, and
  // ratePerMinute is per single owned copy of that upgrade. Cost and
  // rate both scale up roughly 6x per tier, same shape as most idle games.
  // `kind` decides which shop section an upgrade renders in and which
  // effect it has: 'building' adds passive ratePerMinute, 'click' adds
  // flat clickBonus to every manual click, 'discount' multiplies the
  // cost of every 'building' purchase by (1 - discountPerOwn) per copy
  // owned, capped at maxOwned so it can't approach free.
  var UPGRADES = [
    {
      id: 'sigh',
      kind: 'building',
      name: 'Dramatic Sigh',
      desc: 'Barely counts as effort. 1 click / minute.',
      unlockAt: 10,
      baseCost: 10,
      costMultiplier: 1.15,
      ratePerMinute: 1
    },
    {
      id: 'gossip',
      kind: 'building',
      name: 'Overheard Gossip',
      desc: "Everyone's definitely talking about her. 6 clicks / minute.",
      unlockAt: 50,
      baseCost: 60,
      costMultiplier: 1.15,
      ratePerMinute: 6
    },
    {
      id: 'lighting',
      kind: 'building',
      name: 'Flattering Lighting',
      desc: 'Rigged entirely in her favor. 36 clicks / minute.',
      unlockAt: 300,
      baseCost: 360,
      costMultiplier: 1.16,
      ratePerMinute: 36
    },
    {
      id: 'monologue',
      kind: 'building',
      name: 'Uninterrupted Monologue',
      desc: 'Nobody has interrupted her in weeks. 220 clicks / minute.',
      unlockAt: 1800,
      baseCost: 2100,
      costMultiplier: 1.16,
      ratePerMinute: 220
    },
    {
      id: 'fanmail',
      kind: 'building',
      name: 'Self-Written Fan Mail',
      desc: 'She is her own biggest admirer. 1,300 clicks / minute.',
      unlockAt: 10000,
      baseCost: 12000,
      costMultiplier: 1.17,
      ratePerMinute: 1300
    },
    {
      id: 'dancers',
      kind: 'building',
      name: 'Backup Dancers',
      desc: 'Recruited from the other paintings. 8,000 clicks / minute.',
      unlockAt: 60000,
      baseCost: 70000,
      costMultiplier: 1.17,
      ratePerMinute: 8000
    },
    {
      id: 'wing',
      kind: 'building',
      name: 'Her Own Wing of The House',
      desc: 'Renovations completed overnight. 45,000 clicks / minute.',
      unlockAt: 350000,
      baseCost: 400000,
      costMultiplier: 1.18,
      ratePerMinute: 45000
    },
    {
      id: 'universe',
      kind: 'building',
      name: 'Cinematic Universe',
      desc: 'The whole House is secretly about her. 260,000 clicks / minute.',
      unlockAt: 2000000,
      baseCost: 2300000,
      costMultiplier: 1.18,
      ratePerMinute: 260000
    },
    {
      id: 'confidence',
      kind: 'click',
      name: 'Confidence Boost',
      desc: '+5 Spotlight per click.',
      unlockAt: 5,
      baseCost: 25,
      costMultiplier: 1.2,
      clickBonus: 5
    },
    {
      id: 'poses',
      kind: 'click',
      name: 'Rehearsed Poses',
      desc: '+15 Spotlight per click.',
      unlockAt: 150,
      baseCost: 500,
      costMultiplier: 1.2,
      clickBonus: 15
    },
    {
      id: 'entrance',
      kind: 'click',
      name: 'Signature Entrance',
      desc: '+60 Spotlight per click.',
      unlockAt: 5000,
      baseCost: 8000,
      costMultiplier: 1.2,
      clickBonus: 60
    },
    {
      id: 'connections',
      kind: 'discount',
      target: 'building',
      name: 'Producer Connections',
      desc: '-5% cost on future Production upgrades. Stacks up to 10 times.',
      unlockAt: 100,
      baseCost: 200,
      costMultiplier: 1.6,
      discountPerOwn: 0.05,
      maxOwned: 10
    },
    {
      id: 'coach',
      kind: 'discount',
      target: 'click',
      name: 'Acting Coach',
      desc: '-5% cost on future Preparation upgrades. Stacks up to 10 times.',
      unlockAt: 300,
      baseCost: 400,
      costMultiplier: 1.6,
      discountPerOwn: 0.05,
      maxOwned: 10
    },
    {
      id: 'timing',
      kind: 'critChance',
      name: 'Dramatic Instinct',
      desc: '+1% critical chance. Stacks up to 10 times.',
      unlockAt: 250,
      baseCost: 350,
      costMultiplier: 1.5,
      critChanceBonus: 0.01,
      maxOwned: 10
    },
    {
      id: 'paparazzi',
      kind: 'paparazzi',
      name: 'Paparazzi',
      desc: 'Every so often, her biggest fan shows up — manual clicks during the 5-second spotlight are worth 5x.',
      unlockAt: 500,
      baseCost: 1000,
      costMultiplier: 1,
      maxOwned: 1
    },
    {
      id: 'tipline',
      kind: 'paparazziFreq',
      requires: 'paparazzi',
      name: 'Tip Line',
      desc: '-10% average wait between paparazzi visits. Stacks up to 5 times.',
      unlockAt: 500,
      baseCost: 800,
      costMultiplier: 1.4,
      freqReduction: 0.1,
      maxOwned: 5
    },
    {
      id: 'cover',
      kind: 'paparazziMult',
      requires: 'paparazzi',
      name: 'Magazine Cover',
      desc: '+1x click value during the paparazzi spotlight. Stacks up to 5 times.',
      unlockAt: 500,
      baseCost: 1200,
      costMultiplier: 1.4,
      multiplierBonus: 1,
      maxOwned: 5
    },
    {
      id: 'scandal',
      kind: 'paparazziMult',
      requires: 'cover',
      name: 'Scandalous Rumor',
      desc: '+2x click value during the paparazzi spotlight. Stacks up to 5 times.',
      unlockAt: 5000,
      baseCost: 6000,
      costMultiplier: 1.4,
      multiplierBonus: 2,
      maxOwned: 5
    }
  ];

  var state = { spotlight: 0, totalEarned: 0, owned: {}, reducedEffects: false };
  UPGRADES.forEach(function (u) { state.owned[u.id] = 0; });

  function loadSave() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (typeof parsed.spotlight === 'number') state.spotlight = parsed.spotlight;
      if (typeof parsed.totalEarned === 'number') state.totalEarned = parsed.totalEarned;
      if (typeof parsed.reducedEffects === 'boolean') state.reducedEffects = parsed.reducedEffects;
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

  // `target` picks which upgrade kind a discount applies to — 'building'
  // for Producer Connections, 'click' for Acting Coach. Each is computed
  // independently so they never affect each other's costs.
  function discountFactor(target) {
    var factor = 1;
    UPGRADES.forEach(function (u) {
      if (u.kind === 'discount' && u.target === target) factor *= Math.pow(1 - u.discountPerOwn, state.owned[u.id]);
    });
    return factor;
  }

  function upgradeCost(u) {
    var raw = u.baseCost * Math.pow(u.costMultiplier, state.owned[u.id]);
    if (u.kind === 'building' || u.kind === 'click') raw *= discountFactor(u.kind);
    return Math.max(1, Math.ceil(raw));
  }

  function totalRatePerMinute() {
    return UPGRADES.reduce(function (sum, u) {
      return u.kind === 'building' ? sum + state.owned[u.id] * u.ratePerMinute : sum;
    }, 0);
  }

  function clickPower() {
    return UPGRADES.reduce(function (sum, u) {
      return u.kind === 'click' ? sum + state.owned[u.id] * u.clickBonus : sum;
    }, 1); // base of 1 per click
  }

  var CRIT_CHANCE_BASE = 0.05;

  function critChance() {
    return UPGRADES.reduce(function (sum, u) {
      return u.kind === 'critChance' ? sum + state.owned[u.id] * u.critChanceBonus : sum;
    }, CRIT_CHANCE_BASE);
  }

  // --- paparazzi event ---------------------------------------------------
  // A random ~5s window where manual clicks are worth several times
  // normal. Dormant entirely until the base 'paparazzi' upgrade is
  // bought; 'paparazziFreq' upgrades shorten the average wait between
  // visits, 'paparazziMult' upgrades raise the payout multiplier.
  var PAPARAZZI_WINDOW_MS = 5000;
  var PAPARAZZI_BASE_MULTIPLIER = 5;
  var PAPARAZZI_MIN_WAIT_MS = 40000;
  var PAPARAZZI_WAIT_RANGE_MS = 40000; // baseline wait: 40-80s, before frequency upgrades shrink it
  var PAPARAZZI_LINES = [
    { es: '¡Los paparazzi! ¡Que no se escape la mejor foto!', en: 'The paparazzi! Get the shot while it lasts!' },
    { es: '¡Mi fan más grande ha llegado!', en: 'My biggest fan has arrived!' },
    { es: 'Cinco segundos. Que cuenten.', en: 'Five seconds. Make them count.' }
  ];

  var paparazziActive = false;
  var paparazziTimer = null;
  var paparazziWindowTimer = null;

  function paparazziMultiplier() {
    return UPGRADES.reduce(function (sum, u) {
      return u.kind === 'paparazziMult' ? sum + state.owned[u.id] * u.multiplierBonus : sum;
    }, PAPARAZZI_BASE_MULTIPLIER);
  }

  function paparazziFreqFactor() {
    var factor = 1;
    UPGRADES.forEach(function (u) {
      if (u.kind === 'paparazziFreq') factor *= Math.pow(1 - u.freqReduction, state.owned[u.id]);
    });
    return factor;
  }

  function schedulePaparazzi() {
    clearTimeout(paparazziTimer);
    if (state.owned.paparazzi <= 0) return; // not unlocked
    var wait = (PAPARAZZI_MIN_WAIT_MS + Math.random() * PAPARAZZI_WAIT_RANGE_MS) * paparazziFreqFactor();
    paparazziTimer = setTimeout(triggerPaparazzi, wait);
  }

  function triggerPaparazzi() {
    if (state.owned.paparazzi <= 0) return;
    paparazziActive = true;
    portraitWrapEl.classList.add('is-paparazzi');
    paparazziBadgeMultEl.textContent = paparazziMultiplier();
    paparazziBadgeEl.hidden = false;
    showLine(PAPARAZZI_LINES[Math.floor(Math.random() * PAPARAZZI_LINES.length)]);
    clearTimeout(paparazziWindowTimer);
    paparazziWindowTimer = setTimeout(function () {
      paparazziActive = false;
      portraitWrapEl.classList.remove('is-paparazzi');
      paparazziBadgeEl.hidden = true;
      schedulePaparazzi();
    }, PAPARAZZI_WINDOW_MS);
  }

  function cancelPaparazzi() {
    clearTimeout(paparazziTimer);
    clearTimeout(paparazziWindowTimer);
    paparazziActive = false;
    portraitWrapEl.classList.remove('is-paparazzi');
    paparazziBadgeEl.hidden = true;
  }

  // Plain comma-formatted under 10,000 (still easy to read at a glance);
  // abbreviated with a K/M/B/T suffix above that, where the full digit
  // count starts getting unwieldy — trims trailing zeros so "1.00M"
  // shows as "1M" but "1.25M" keeps its precision.
  function formatNumber(n) {
    n = Math.floor(n);
    var abs = Math.abs(n);
    if (abs < 10000) return n.toLocaleString();
    var units = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
    for (var i = 0; i < units.length; i++) {
      if (abs >= units[i][0]) {
        var str = (n / units[i][0]).toFixed(2).replace(/\.?0+$/, '');
        return str + units[i][1];
      }
    }
    return n.toLocaleString();
  }

  function renderCount() {
    countEl.textContent = formatNumber(state.spotlight);
    var rate = totalRatePerMinute();
    if (rate > 0) {
      rateEl.hidden = false;
      rateEl.textContent = '+' + formatNumber(rate) + ' / min, passively';
    } else {
      rateEl.hidden = true;
    }
  }

  function renderShopSection(containerEl, kinds) {
    containerEl.innerHTML = '';
    UPGRADES.forEach(function (u) {
      if (kinds.indexOf(u.kind) === -1) return;
      var owned = state.owned[u.id];
      if (state.totalEarned < u.unlockAt && owned === 0) return; // not unlocked yet
      if (u.requires && state.owned[u.requires] === 0) return; // prerequisite not owned yet
      var maxedOut = u.maxOwned && owned >= u.maxOwned;

      var cost = upgradeCost(u);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'spotlight-upgrade';
      btn.dataset.id = u.id;
      btn.disabled = maxedOut || state.spotlight < cost;

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
      costEl.textContent = maxedOut ? 'Maxed' : formatNumber(cost);

      var ownedEl = document.createElement('span');
      ownedEl.className = 'spotlight-upgrade-owned';
      ownedEl.textContent = owned > 0 ? 'Owned: ' + owned : '';

      btn.appendChild(info);
      btn.appendChild(costEl);
      btn.appendChild(ownedEl);

      btn.addEventListener('click', function () {
        buyUpgrade(u);
      });

      containerEl.appendChild(btn);
    });
  }

  function renderShop() {
    renderShopSection(shopEl, ['building']);
    renderShopSection(boostShopEl, ['click', 'discount', 'critChance', 'paparazzi', 'paparazziFreq', 'paparazziMult']);
  }

  function upgradeById(id) {
    for (var i = 0; i < UPGRADES.length; i++) if (UPGRADES[i].id === id) return UPGRADES[i];
    return null;
  }

  // How many upgrades are currently visible in the shop (unlocked, or
  // already owned) — used to detect whether the passive-income tick
  // needs a full rebuild (something just unlocked) or can get away
  // with the cheaper in-place refresh below.
  function unlockedCount() {
    return UPGRADES.filter(function (u) { return state.totalEarned >= u.unlockAt || state.owned[u.id] > 0; }).length;
  }

  // Updates existing buttons' disabled/cost/owned text without touching
  // the DOM nodes themselves — the full rebuild in renderShopSection
  // was running 4x/second off the passive-income tick, which meant a
  // rapid click could land right as its target button got torn down
  // and replaced, silently eating the click.
  function refreshShopAffordability() {
    [shopEl, boostShopEl].forEach(function (container) {
      Array.prototype.forEach.call(container.querySelectorAll('.spotlight-upgrade'), function (btn) {
        var u = upgradeById(btn.dataset.id);
        if (!u) return;
        var owned = state.owned[u.id];
        var maxedOut = u.maxOwned && owned >= u.maxOwned;
        var cost = upgradeCost(u);
        btn.disabled = maxedOut || state.spotlight < cost;
        var costEl = btn.querySelector('.spotlight-upgrade-cost');
        if (costEl) costEl.textContent = maxedOut ? 'Maxed' : formatNumber(cost);
      });
    });
  }

  function buyUpgrade(u) {
    if (u.maxOwned && state.owned[u.id] >= u.maxOwned) return;
    var cost = upgradeCost(u);
    if (state.spotlight < cost) return;
    state.spotlight -= cost;
    state.owned[u.id] += 1;
    if (u.id === 'paparazzi') schedulePaparazzi(); // first purchase starts the event loop
    if (Math.random() < 0.4) showLine(BUY_LINES[Math.floor(Math.random() * BUY_LINES.length)]);
    save();
    renderCount();
    renderShop();
  }

  var lastLine = null;
  function showLine(line) {
    lastLine = line;
    quoteEsEl.textContent = line.es;
    quoteEnEl.textContent = line.en;
  }

  function showQuote() {
    var line = CLICK_LINES[Math.floor(Math.random() * CLICK_LINES.length)];
    if (line === lastLine && CLICK_LINES.length > 1) {
      line = CLICK_LINES[(CLICK_LINES.indexOf(line) + 1) % CLICK_LINES.length];
    }
    showLine(line);
  }

  function spawnFloatingPlusOne(clientX, clientY, amount, isCrit) {
    var rect = portraitWrapEl.getBoundingClientRect();
    var el = document.createElement('span');
    el.className = 'spotlight-float' + (isCrit ? ' is-crit' : '');
    el.textContent = '+' + formatNumber(amount) + (isCrit ? '!' : '');
    el.style.left = (clientX - rect.left) + 'px';
    el.style.top = (clientY - rect.top) + 'px';
    portraitWrapEl.appendChild(el);
    setTimeout(function () { el.remove(); }, 900);
  }

  function addSpotlight(amount) {
    state.spotlight += amount;
    state.totalEarned += amount;
  }

  var CRIT_MULTIPLIER = 10;

  function handleClick(e) {
    var isCrit = Math.random() < critChance();
    var amount = clickPower() * (isCrit ? CRIT_MULTIPLIER : 1) * (paparazziActive ? paparazziMultiplier() : 1);
    addSpotlight(amount);
    if (isCrit) showLine(CRIT_LINES[Math.floor(Math.random() * CRIT_LINES.length)]);
    else showQuote();
    portraitEl.classList.remove('is-clicked');
    void portraitEl.offsetWidth; // restart the pop animation if it's mid-run
    portraitEl.classList.add('is-clicked');
    var point = e.touches && e.touches[0] ? e.touches[0] : e;
    spawnFloatingPlusOne(point.clientX, point.clientY, amount, isCrit);
    renderCount();
    renderShop(); // a click can be what crosses an unlock threshold
    save();
  }

  portraitEl.addEventListener('click', handleClick);

  resetBtn.addEventListener('click', function () {
    var keepReducedEffects = state.reducedEffects; // a display preference, not progress — survives Reset
    state = { spotlight: 0, totalEarned: 0, owned: {}, reducedEffects: keepReducedEffects };
    UPGRADES.forEach(function (u) { state.owned[u.id] = 0; });
    cancelPaparazzi();
    save();
    lastLine = null;
    quoteEsEl.textContent = IDLE_LINE.es;
    quoteEnEl.textContent = IDLE_LINE.en;
    renderCount();
    renderShop();
  });

  function setTab(tab) {
    var showBoost = tab === 'boost';
    boostShopEl.hidden = !showBoost;
    shopEl.hidden = showBoost;
    tabBoostBtn.classList.toggle('is-active', showBoost);
    tabProductionBtn.classList.toggle('is-active', !showBoost);
  }
  tabBoostBtn.addEventListener('click', function () { setTab('boost'); });
  tabProductionBtn.addEventListener('click', function () { setTab('production'); });

  // --- ambient fame effects ---------------------------------------------
  // Purely decorative — confetti and bouquets get more frequent as her
  // lifetime total climbs, plus camera flashes at the highest tier.
  // Camera flashes are the one effect the "Reduce Effects" toggle
  // suppresses entirely — they're the only flashing effect here, so
  // that's the actual photosensitivity concern; confetti/flowers keep
  // going either way since they don't strobe.
  var FX_TYPES = {
    confetti: { emojis: ['🎉', '🎊', '✨'] },
    flower: { emojis: ['💐', '🌹', '🌸'] },
    camera: { emojis: ['📷', '📸'] }
  };
  var FX_TIER_CHANCE = [0, 0.15, 0.25, 0.35, 0.5]; // indexed by fameTier()

  function fameTier() {
    if (state.totalEarned >= 100000) return 4;
    if (state.totalEarned >= 10000) return 3;
    if (state.totalEarned >= 1000) return 2;
    if (state.totalEarned >= 100) return 1;
    return 0;
  }

  function spawnFx(type) {
    var def = FX_TYPES[type];
    var el = document.createElement('span');
    el.className = 'spotlight-fx spotlight-fx-' + type;
    el.textContent = def.emojis[Math.floor(Math.random() * def.emojis.length)];
    el.style.left = (10 + Math.random() * 80) + '%';
    el.style.setProperty('--rot', (Math.random() * 40 - 20) + 'deg');
    fxLayerEl.appendChild(el);
    setTimeout(function () { el.remove(); }, 1800);

    if (type === 'camera') {
      var flash = document.createElement('span');
      flash.className = 'spotlight-fx-flash';
      fxLayerEl.appendChild(flash);
      setTimeout(function () { flash.remove(); }, 350);
    }
  }

  function maybeSpawnFx() {
    var tier = fameTier();
    if (tier === 0) return;
    if (Math.random() > FX_TIER_CHANCE[tier]) return;
    var eligible = ['confetti'];
    if (tier >= 2) eligible.push('flower');
    if (tier >= 3 && !state.reducedEffects) eligible.push('camera');
    spawnFx(eligible[Math.floor(Math.random() * eligible.length)]);
  }

  setInterval(maybeSpawnFx, 1200);

  function renderEffectsToggle() {
    effectsToggleBtn.textContent = state.reducedEffects ? 'Full Effects' : 'Reduce Effects';
    effectsToggleBtn.classList.toggle('is-active', state.reducedEffects);
  }
  effectsToggleBtn.addEventListener('click', function () {
    state.reducedEffects = !state.reducedEffects;
    save();
    renderEffectsToggle();
  });

  // Passive income ticks 4x/second for a smooth-feeling counter, adding
  // a quarter of the per-second rate each time rather than waiting a
  // full minute to add a lump sum.
  setInterval(function () {
    var perSecond = totalRatePerMinute() / 60;
    if (perSecond <= 0) return;
    var beforeUnlocked = unlockedCount();
    addSpotlight(perSecond / 4);
    renderCount();
    // Rebuild only if passive income just crossed an unlock threshold —
    // otherwise just update existing buttons in place (see comment on
    // refreshShopAffordability for why).
    if (unlockedCount() !== beforeUnlocked) renderShop();
    else refreshShopAffordability();
  }, 250);

  // Autosave on an interval too, not just on click/buy, so passive
  // income earned while idle isn't lost if the tab closes uncleanly.
  setInterval(save, 5000);

  loadSave();
  quoteEsEl.textContent = IDLE_LINE.es;
  quoteEnEl.textContent = IDLE_LINE.en;
  renderCount();
  renderShop();
  renderEffectsToggle();
  schedulePaparazzi(); // no-op if not owned yet
})();

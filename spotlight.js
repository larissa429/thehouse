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
  var clickRateEl = document.getElementById('spotlightClickRate');
  var shopEl = document.getElementById('spotlightShop');
  var boostShopEl = document.getElementById('spotlightBoostShop');
  var tabBoostBtn = document.getElementById('spotlightTabBoost');
  var tabProductionBtn = document.getElementById('spotlightTabProduction');
  var tabLegacyBtn = document.getElementById('spotlightTabLegacy');
  var legacyShopEl = document.getElementById('spotlightLegacyShop');
  var fxLayerEl = document.getElementById('spotlightFxLayer');
  var confettiLayerEl = document.getElementById('spotlightConfettiLayer');
  var effectsToggleBtn = document.getElementById('spotlightEffectsToggle');
  var numberFormatToggleBtn = document.getElementById('spotlightNumberFormatToggle');
  var colorfulTextToggleBtn = document.getElementById('spotlightColorfulTextToggle');
  var settingsToggleBtn = document.getElementById('spotlightSettingsToggle');
  var settingsPanelEl = document.getElementById('spotlightSettingsPanel');
  var confettiTestBtn = document.getElementById('spotlightConfettiTestBtn');
  var paparazziBadgeEl = document.getElementById('spotlightPaparazziBadge');
  var paparazziBadgeMultEl = document.getElementById('spotlightPaparazziMultText');
  var legacyCountEl = document.getElementById('spotlightLegacyCount');
  var prestigeBtn = document.getElementById('spotlightPrestigeBtn');
  var prestigeHintEl = document.getElementById('spotlightPrestigeHint');
  var offlineOverlayEl = document.getElementById('spotlightOfflineOverlay');
  var offlineTimeEl = document.getElementById('spotlightOfflineTime');
  var offlineAmountEl = document.getElementById('spotlightOfflineAmount');
  var offlineClaimBtn = document.getElementById('spotlightOfflineClaim');
  var statsToggleBtn = document.getElementById('spotlightStatsToggle');
  var statsPanelEl = document.getElementById('spotlightStatsPanel');
  var statTotalEarnedEl = document.getElementById('spotlightStatTotalEarned');
  var statLifetimeEarnedEl = document.getElementById('spotlightStatLifetimeEarned');
  var statPlayTimeEl = document.getElementById('spotlightStatPlayTime');
  var statClicksEl = document.getElementById('spotlightStatClicks');
  var statCritsEl = document.getElementById('spotlightStatCrits');
  var statOfflineEl = document.getElementById('spotlightStatOffline');
  var statLegacyMultEl = document.getElementById('spotlightStatLegacyMult');
  var statClickPowerEl = document.getElementById('spotlightStatClickPower');
  var statRateEl = document.getElementById('spotlightStatRate');
  var statCritChanceEl = document.getElementById('spotlightStatCritChance');
  var statBuildingDiscountEl = document.getElementById('spotlightStatBuildingDiscount');
  var statClickDiscountEl = document.getElementById('spotlightStatClickDiscount');
  var achievementsToggleBtn = document.getElementById('spotlightAchievementsToggle');
  var achievementsPanelEl = document.getElementById('spotlightAchievementsPanel');
  var achievementToastEl = document.getElementById('spotlightAchievementToast');

  var SAVE_KEY = 'spotlight-save';

  // Shown before the first click (and after Reset) so the bubble is
  // never empty — an empty bubble collapses to almost no height, which
  // made its speech-bubble tail render as a stray floating square
  // instead of looking attached to anything.
  var IDLE_LINE = { es: '¿A qué esperas? No va a hacer clic solo.', en: "What are you waiting for? It's not gonna click itself." };

  // Shown right after prestiging, instead of IDLE_LINE.
  var SEQUEL_LINE = { es: 'Ah, la secuela. Siempre es superior a la original.', en: 'Ah, the sequel. Always superior to the original.' };

  // She delivers every line in (Castilian) Spanish, subtitled — because
  // of course she does. `es` is what's said, `en` is the dim subtitle.
  // Translations by an actual native speaker (AP's creator, from Spain) —
  // reviewed and corrected from the earlier machine-ish first pass.
  var CLICK_LINES = [
    { es: 'Nací para este momento.', en: 'I was born for this moment.' },
    { es: '¿Lo has sentido? Eso ha sido desarrollo de personaje.', en: 'Did you feel that? That was character development.' },
    { es: 'No, no, no os preocupéis por mí. Sufriré glamurosamente aquí.', en: "No, no, don't mind me. I'll just suffer glamorously over here." },
    { es: 'Esta es mi escena decisiva.', en: 'This is my defining scene.' },
    { es: 'En algún lugar, están haciendo un premio para mí.', en: 'Somewhere, an award is being engraved for me.' },
    { es: 'Todos los ángulos son mi ángulo bueno.', en: 'Every angle is my good angle.' },
    { es: 'Los focos simplemente me adoran.', en: 'The spotlight simply adores me.' },
    { es: 'Yo no pedí ser tan cautivadora.', en: "I didn't ask to be this compelling." },
    { es: 'De nada, por cierto.', en: "You're welcome, by the way." },
    { es: 'Alguien debería estar grabando esto.', en: 'Someone should really be filming this.' }
  ];

  // Rare (5% per click) — bigger payout, bigger reaction.
  var CRIT_LINES = [
    { es: '¡Aplausos y ovaciones a mí!', en: 'Praises and glory to me!' },
    { es: '¡Bravo, bravo!', en: 'Bravo, bravo!' },
    { es: 'Esto merece un premio.', en: 'This deserves an award.' },
    { es: '¡El público la ama!', en: 'The audience adores her!' }
  ];

  // Shown sometimes (40% chance) right after buying an upgrade.
  var BUY_LINES = [
    { es: 'Por fin. Ya me cansaba de hacerlo yo misma.', en: 'Finally. I was tired of doing this myself.' },
    { es: 'Una inversión inteligente, la verdad.', en: 'A smart investment, honestly.' },
    { es: 'Esto era necesario.', en: 'This was necessary.' },
    { es: 'Ahora sí. Empecemos de verdad.', en: 'Now, yes. Now we truly begin.' }
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
      unlockAt: 0,
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
      unlockAt: 0,
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
    // Preparation had a big pacing gap here — three tiers covering
    // unlockAt 5 to 5,000, then nothing pre-prestige until Legend Status
    // at 20,000 — while Production has 8 tiers spread across the same
    // range. These three fill it in, roughly matching Production's ~6x
    // cost/value jump per tier.
    {
      id: 'methodActing',
      kind: 'click',
      name: 'Method Acting',
      desc: "+150 Spotlight per click. She hasn't broken character since Tuesday.",
      unlockAt: 15000,
      baseCost: 22000,
      costMultiplier: 1.21,
      clickBonus: 150
    },
    {
      id: 'closeUp',
      kind: 'click',
      name: 'Contractual Close-Up',
      desc: "+550 Spotlight per click. It's in her contract now — every scene, her face, three seconds minimum.",
      unlockAt: 100000,
      baseCost: 140000,
      costMultiplier: 1.21,
      clickBonus: 550
    },
    {
      id: 'monologue2',
      kind: 'click',
      name: 'Career-Defining Monologue',
      desc: "+2,200 Spotlight per click. They'll show this scene at the retrospective.",
      unlockAt: 700000,
      baseCost: 900000,
      costMultiplier: 1.21,
      clickBonus: 2200
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
    // Passive income normally ignores the paparazzi window entirely (it's
    // built around manual clicks) — this makes it benefit too, automatically,
    // no clicking required. See the passive-tick interval below.
    {
      id: 'publicist',
      kind: 'paparazziPassive',
      requires: 'paparazzi',
      name: 'Personal Publicist',
      desc: "Your passive income gets the paparazzi's multiplier too — no clicking required.",
      unlockAt: 5000,
      baseCost: 15000,
      costMultiplier: 1,
      maxOwned: 1
    },
    // Stretches the 5-second window itself rather than the payout —
    // more time to actually land clicks during it.
    {
      id: 'extendedCut',
      kind: 'paparazziDuration',
      requires: 'paparazzi',
      name: 'Extended Cut',
      desc: '+1 second to the paparazzi spotlight window. Stacks up to 5 times.',
      unlockAt: 2000,
      baseCost: 3000,
      costMultiplier: 1.5,
      durationBonusMs: 1000,
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
    },
    // --- post-Sequel tier: requires at least 1 Legacy point to even see.
    // Picks up right where the pre-prestige tiers left off in both cost
    // and rate, so a fresh Sequel run still has somewhere to grow past
    // Cinematic Universe once it's earned enough again.
    {
      id: 'worldTour',
      kind: 'building',
      name: 'World Tour',
      desc: "She's a global phenomenon now. 1,600,000 clicks / minute.",
      unlockAt: 4000000,
      baseCost: 4500000,
      costMultiplier: 1.19,
      ratePerMinute: 1600000,
      minPrestige: 1
    },
    {
      id: 'legendStatus',
      kind: 'click',
      name: 'Legend Status',
      desc: '+10,000 Spotlight per click.',
      unlockAt: 20000,
      baseCost: 40000,
      costMultiplier: 1.22,
      clickBonus: 10000,
      minPrestige: 1
    },
    // Click power kept going stale by mid-late game (100M+ Spotlight
    // makes +400/click a rounding error) — these three keep the curve
    // meaningful well past that, each roughly 8x the last.
    {
      id: 'worldPremiere',
      kind: 'click',
      name: 'World Premiere',
      desc: '+60,000 Spotlight per click.',
      unlockAt: 250000,
      baseCost: 400000,
      costMultiplier: 1.22,
      clickBonus: 60000,
      minPrestige: 1
    },
    {
      id: 'waxFigure',
      kind: 'click',
      name: 'Immortalized in Wax',
      desc: '+400,000 Spotlight per click.',
      unlockAt: 3000000,
      baseCost: 4500000,
      costMultiplier: 1.22,
      clickBonus: 400000,
      minPrestige: 1
    },
    {
      id: 'livingLegend',
      kind: 'click',
      name: 'Living Legend',
      desc: '+3,000,000 Spotlight per click.',
      unlockAt: 40000000,
      baseCost: 60000000,
      costMultiplier: 1.22,
      clickBonus: 3000000,
      minPrestige: 1
    },
    {
      id: 'legacyContract',
      kind: 'click',
      name: 'Legacy Contract',
      desc: '+25,000,000 Spotlight per click.',
      unlockAt: 500000000,
      baseCost: 750000000,
      costMultiplier: 1.22,
      clickBonus: 25000000,
      minPrestige: 1
    },
    // Same idea for passive income — World Tour was the last stop before
    // things went stale too.
    {
      id: 'franchiseDeal',
      kind: 'building',
      name: 'Franchise Deal',
      desc: 'Spin-offs, merchandise, a theme park attraction. 12,000,000 clicks / minute.',
      unlockAt: 30000000,
      baseCost: 35000000,
      costMultiplier: 1.19,
      ratePerMinute: 12000000,
      minPrestige: 1
    },
    {
      id: 'culturalIcon',
      kind: 'building',
      name: 'Cultural Icon Status',
      desc: "She's taught in schools now. 90,000,000 clicks / minute.",
      unlockAt: 300000000,
      baseCost: 350000000,
      costMultiplier: 1.19,
      ratePerMinute: 90000000,
      minPrestige: 1
    },
    {
      id: 'permanentWing',
      kind: 'building',
      name: 'A Museum Wing, Permanently',
      desc: 'Not on loan. Not rotating. Hers, forever. 700,000,000 clicks / minute.',
      unlockAt: 3000000000,
      baseCost: 3500000000,
      costMultiplier: 1.19,
      ratePerMinute: 700000000,
      minPrestige: 1
    },
    // Spends Spotlight (not Legacy) to permanently boost the per-point
    // Legacy bonus itself — a multiplier on the multiplier, so it's most
    // valuable the more Legacy is already banked. Requires having
    // prestiged at least once, same as the rest of this tier.
    {
      id: 'directorsCut',
      kind: 'legacyMult',
      name: "Director's Cut",
      desc: '+10% to your Legacy bonus per point. Stacks up to 10 times.',
      unlockAt: 4000000,
      baseCost: 8000000,
      costMultiplier: 1.7,
      legacyMultBonus: 0.1,
      maxOwned: 10,
      minPrestige: 1
    },
    // Extends how long an absence can be credited for offline gains (see
    // OFFLINE_CAP_MS) — the 12h base cap is a deliberate anti-exploit
    // limit, not a technical one, so it's fair game to buy past.
    {
      id: 'standingArrangement',
      kind: 'offlineCap',
      name: 'Standing Arrangement',
      desc: '+6 hours credited toward offline gains. Stacks up to 6 times.',
      unlockAt: 50000,
      baseCost: 80000,
      costMultiplier: 1.5,
      capBonusHours: 6,
      maxOwned: 6
    },
    // A flat multiplier on top of everything else clickPower() already
    // adds up (base + every clickBonus upgrade) — unlike those, this
    // doesn't have its own number, it just makes the total hit harder.
    {
      id: 'starPower',
      kind: 'clickPowerMult',
      name: 'Star Power',
      desc: '+5% to your total click power. Stacks up to 10 times.',
      unlockAt: 8000,
      baseCost: 12000,
      costMultiplier: 1.45,
      multBonus: 0.05,
      maxOwned: 10
    }
  ];

  // A skill tree spent in Legacy points themselves rather than Spotlight
  // — bought with doPrestige()'s payout, on top of (not instead of) the
  // usual +2%/point passive bonus. Unspent points still sit in the
  // Legacy counter earning that bonus as always; spending them here
  // converts some of them into a specific permanent buff instead, on top
  // of whatever bonus the ones you keep are still generating. Costs are
  // small flat integers (this is a few-points-per-prestige currency, not
  // a Spotlight-scale one) — no cost curve/discount interactions with
  // the regular shop at all.
  var LEGACY_SKILLS = [
    {
      id: 'encore',
      kind: 'legacySkillClick',
      name: 'Encore',
      desc: '+2 flat Spotlight per click. Stacks up to 15 times.',
      cost: 1,
      clickBonus: 2,
      maxOwned: 15
    },
    {
      id: 'standingOvation',
      kind: 'legacySkillRate',
      name: 'Standing Ovation',
      desc: '+5% passive rate. Stacks up to 10 times.',
      cost: 2,
      rateBonus: 0.05,
      maxOwned: 10
    },
    {
      id: 'oldPro',
      kind: 'legacySkillDiscount',
      name: 'Old Pro',
      desc: '-2% cost on every Production and Preparation upgrade. Stacks up to 10 times.',
      cost: 2,
      discountPerOwn: 0.02,
      maxOwned: 10
    },
    {
      id: 'cameraReady',
      kind: 'legacySkillCrit',
      name: 'Camera Ready',
      desc: '+2% critical chance. Stacks up to 10 times.',
      cost: 2,
      critChanceBonus: 0.02,
      maxOwned: 10
    },
    {
      id: 'neverForgetsAFace',
      kind: 'legacySkillOfflineCap',
      name: 'Never Forgets a Face',
      desc: '+4 hours credited toward offline gains. Stacks up to 10 times.',
      cost: 1,
      capBonusHours: 4,
      maxOwned: 10
    },
    {
      id: 'wordOfMouth',
      kind: 'legacySkillPaparazziFreq',
      name: 'Word of Mouth',
      desc: '-8% average wait between paparazzi visits. Stacks up to 5 times.',
      cost: 2,
      freqReduction: 0.08,
      maxOwned: 5
    }
  ];

  // Achievements are permanent once unlocked — checked against whatever
  // the CURRENT run's state looks like, never re-evaluated after that.
  // Each grants a small permanent multiplier (`bonusType` + `bonusValue`,
  // applied in clickPower()/totalRatePerMinute()) on top of the badge, so
  // completing them is a real (if minor) part of progression, not purely
  // cosmetic. `check` reads live `state` — keep conditions cheap, they
  // run every second.
  var ACHIEVEMENTS = [
    {
      id: 'firstClick',
      name: 'Places, Everyone',
      desc: 'Click her once.',
      bonusType: 'clickPower',
      bonusValue: 0.01,
      check: function () { return state.totalClicks >= 1; }
    },
    {
      id: 'gettingNoticed',
      name: 'Getting Noticed',
      desc: 'Earn 1,000 total Spotlight.',
      bonusType: 'clickPower',
      bonusValue: 0.01,
      check: function () { return state.totalEarned >= 1000; }
    },
    {
      id: 'dedicatedFan',
      name: 'Dedicated Fan',
      desc: 'Click 500 times.',
      bonusType: 'clickPower',
      bonusValue: 0.02,
      check: function () { return state.totalClicks >= 500; }
    },
    {
      id: 'criticallyAcclaimed',
      name: 'Critically Acclaimed',
      desc: 'Land 50 critical clicks.',
      bonusType: 'clickPower',
      bonusValue: 0.02,
      check: function () { return state.totalCrits >= 50; }
    },
    {
      id: 'localCelebrity',
      name: 'Local Celebrity',
      desc: 'Earn 100,000 total Spotlight.',
      bonusType: 'rate',
      bonusValue: 0.02,
      check: function () { return state.totalEarned >= 100000; }
    },
    {
      id: 'householdName',
      name: 'Household Name',
      desc: 'Earn 1,000,000 total Spotlight.',
      bonusType: 'rate',
      bonusValue: 0.03,
      check: function () { return state.totalEarned >= 1000000; }
    },
    {
      id: 'marathon',
      name: 'The Show Must Go On',
      desc: 'Spend an hour actually looking at this tab.',
      bonusType: 'rate',
      bonusValue: 0.02,
      check: function () { return state.playTimeMs >= 60 * 60 * 1000; }
    },
    {
      id: 'awayGame',
      name: 'Away Game',
      desc: 'Earn 10,000 Spotlight total while offline.',
      bonusType: 'rate',
      bonusValue: 0.02,
      check: function () { return state.totalOfflineEarned >= 10000; }
    },
    {
      id: 'sequelMaterial',
      name: 'Sequel Material',
      desc: 'Prestige for the first time.',
      bonusType: 'clickPower',
      bonusValue: 0.03,
      check: function () { return state.legacy >= 1; }
    },
    {
      id: 'fullCast',
      name: 'The Full Cast',
      desc: 'Own at least one of every Production upgrade.',
      bonusType: 'rate',
      bonusValue: 0.05,
      check: function () {
        return UPGRADES.filter(function (u) { return u.kind === 'building'; })
          .every(function (u) { return state.owned[u.id] >= 1; });
      }
    }
  ];

  function achievementBonusMultiplier(type) {
    var mult = 1;
    ACHIEVEMENTS.forEach(function (a) {
      if (a.bonusType === type && state.unlockedAchievements[a.id]) mult *= 1 + a.bonusValue;
    });
    return mult;
  }

  var state = { spotlight: 0, totalEarned: 0, lifetimeEarned: 0, owned: {}, legacySkills: {}, reducedEffects: false, legacy: 0, shorthandNumbers: true, colorfulText: true, seenMillion: false, lastSeen: Date.now(), playTimeMs: 0, totalClicks: 0, totalCrits: 0, totalOfflineEarned: 0, unlockedAchievements: {} };
  UPGRADES.forEach(function (u) { state.owned[u.id] = 0; });
  LEGACY_SKILLS.forEach(function (s) { state.legacySkills[s.id] = 0; });

  function loadSave() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (typeof parsed.spotlight === 'number') state.spotlight = parsed.spotlight;
      if (typeof parsed.totalEarned === 'number') state.totalEarned = parsed.totalEarned;
      // Backfill for saves from before lifetimeEarned existed: best
      // guess is at least this run's total (can't recover prior runs'
      // totals, but it should never show less than what's visibly true).
      state.lifetimeEarned = state.totalEarned;
      if (typeof parsed.lifetimeEarned === 'number') state.lifetimeEarned = parsed.lifetimeEarned;
      if (typeof parsed.reducedEffects === 'boolean') state.reducedEffects = parsed.reducedEffects;
      if (typeof parsed.legacy === 'number') state.legacy = parsed.legacy;
      if (typeof parsed.shorthandNumbers === 'boolean') state.shorthandNumbers = parsed.shorthandNumbers;
      if (typeof parsed.colorfulText === 'boolean') state.colorfulText = parsed.colorfulText;
      if (typeof parsed.seenMillion === 'boolean') state.seenMillion = parsed.seenMillion;
      if (typeof parsed.lastSeen === 'number') state.lastSeen = parsed.lastSeen;
      if (typeof parsed.playTimeMs === 'number') state.playTimeMs = parsed.playTimeMs;
      if (typeof parsed.totalClicks === 'number') state.totalClicks = parsed.totalClicks;
      if (typeof parsed.totalCrits === 'number') state.totalCrits = parsed.totalCrits;
      if (typeof parsed.totalOfflineEarned === 'number') state.totalOfflineEarned = parsed.totalOfflineEarned;
      if (parsed.unlockedAchievements) {
        ACHIEVEMENTS.forEach(function (a) {
          if (parsed.unlockedAchievements[a.id]) state.unlockedAchievements[a.id] = true;
        });
      }
      if (parsed.owned) {
        UPGRADES.forEach(function (u) {
          if (typeof parsed.owned[u.id] === 'number') state.owned[u.id] = parsed.owned[u.id];
        });
      }
      if (parsed.legacySkills) {
        LEGACY_SKILLS.forEach(function (s) {
          if (typeof parsed.legacySkills[s.id] === 'number') state.legacySkills[s.id] = parsed.legacySkills[s.id];
        });
      }
    } catch (e) { /* corrupt or missing save — just start fresh */ }
  }

  function save() {
    state.lastSeen = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }

  // --- Legacy skill tree ------------------------------------------------
  // Bought with Legacy points themselves (see LEGACY_SKILLS above), not
  // Spotlight — separate `state.legacySkills` tracker, separate `cost`
  // field (a flat integer, not upgradeCost()'s curve).
  function legacySkillCost(s) {
    return s.cost;
  }

  function buyLegacySkill(s) {
    var owned = state.legacySkills[s.id];
    if (s.maxOwned && owned >= s.maxOwned) return;
    var cost = legacySkillCost(s);
    if (state.legacy < cost) return;
    state.legacy -= cost;
    state.legacySkills[s.id] += 1;
    save();
    renderLegacyShop();
    renderPrestige();
    renderCount();
    refreshShopAffordability();
  }

  function legacySkillClickBonus() {
    return LEGACY_SKILLS.reduce(function (sum, s) {
      return s.kind === 'legacySkillClick' ? sum + state.legacySkills[s.id] * s.clickBonus : sum;
    }, 0);
  }

  function legacySkillRateMultiplier() {
    var mult = 1;
    LEGACY_SKILLS.forEach(function (s) {
      if (s.kind === 'legacySkillRate') mult += state.legacySkills[s.id] * s.rateBonus;
    });
    return mult;
  }

  function legacySkillDiscountFactor() {
    var factor = 1;
    LEGACY_SKILLS.forEach(function (s) {
      if (s.kind === 'legacySkillDiscount') factor *= Math.pow(1 - s.discountPerOwn, state.legacySkills[s.id]);
    });
    return factor;
  }

  function legacySkillCritBonus() {
    return LEGACY_SKILLS.reduce(function (sum, s) {
      return s.kind === 'legacySkillCrit' ? sum + state.legacySkills[s.id] * s.critChanceBonus : sum;
    }, 0);
  }

  function legacySkillOfflineCapBonusHours() {
    return LEGACY_SKILLS.reduce(function (sum, s) {
      return s.kind === 'legacySkillOfflineCap' ? sum + state.legacySkills[s.id] * s.capBonusHours : sum;
    }, 0);
  }

  function legacySkillPaparazziFreqFactor() {
    var factor = 1;
    LEGACY_SKILLS.forEach(function (s) {
      if (s.kind === 'legacySkillPaparazziFreq') factor *= Math.pow(1 - s.freqReduction, state.legacySkills[s.id]);
    });
    return factor;
  }

  // `target` picks which upgrade kind a discount applies to — 'building'
  // for Producer Connections, 'click' for Acting Coach. Each is computed
  // independently so they never affect each other's costs. Old Pro (the
  // Legacy skill) applies on top of both, regardless of target.
  function discountFactor(target) {
    var factor = legacySkillDiscountFactor();
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
    var base = UPGRADES.reduce(function (sum, u) {
      return u.kind === 'building' ? sum + state.owned[u.id] * u.ratePerMinute : sum;
    }, 0);
    return base * achievementBonusMultiplier('rate') * legacySkillRateMultiplier();
  }

  function starPowerMultiplier() {
    var mult = 1;
    UPGRADES.forEach(function (u) {
      if (u.kind === 'clickPowerMult') mult += state.owned[u.id] * u.multBonus;
    });
    return mult;
  }

  function clickPower() {
    var base = UPGRADES.reduce(function (sum, u) {
      return u.kind === 'click' ? sum + state.owned[u.id] * u.clickBonus : sum;
    }, 1) + legacySkillClickBonus(); // base of 1 per click, plus Encore's flat bonus
    return base * starPowerMultiplier() * achievementBonusMultiplier('clickPower');
  }

  var CRIT_CHANCE_BASE = 0.05;

  function critChance() {
    return UPGRADES.reduce(function (sum, u) {
      return u.kind === 'critChance' ? sum + state.owned[u.id] * u.critChanceBonus : sum;
    }, CRIT_CHANCE_BASE) + legacySkillCritBonus();
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
    var factor = legacySkillPaparazziFreqFactor();
    UPGRADES.forEach(function (u) {
      if (u.kind === 'paparazziFreq') factor *= Math.pow(1 - u.freqReduction, state.owned[u.id]);
    });
    return factor;
  }

  function paparazziWindowMs() {
    return UPGRADES.reduce(function (sum, u) {
      return u.kind === 'paparazziDuration' ? sum + state.owned[u.id] * u.durationBonusMs : sum;
    }, PAPARAZZI_WINDOW_MS);
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
    }, paparazziWindowMs());
  }

  function cancelPaparazzi() {
    clearTimeout(paparazziTimer);
    clearTimeout(paparazziWindowTimer);
    paparazziActive = false;
    portraitWrapEl.classList.remove('is-paparazzi');
    paparazziBadgeEl.hidden = true;
  }

  // --- prestige ("The Sequel") -------------------------------------------
  // Legacy is permanent — it survives this reset (unlike the plain Reset
  // button, which wipes everything including Legacy) and its bonus
  // applies to every future run. Gained amount uses a square-root curve
  // so it takes quadratically more lifetime total for each extra point,
  // the standard shape for a prestige currency. Any upgrade added after
  // this point should set `minPrestige: N` to require N Legacy ever
  // earned before it's purchasable — see the check in renderShopSection.
  var LEGACY_DIVISOR = 1000000;

  function legacyGainPreview() {
    return Math.floor(Math.sqrt(state.totalEarned / LEGACY_DIVISOR));
  }

  function renderPrestige() {
    legacyCountEl.textContent = formatNumber(state.legacy);
    var gain = legacyGainPreview();
    if (gain >= 1) {
      prestigeBtn.disabled = false;
      prestigeBtn.textContent = 'The Sequel (+' + gain + ' Legacy)';
      prestigeHintEl.hidden = true;
    } else {
      prestigeBtn.disabled = true;
      prestigeBtn.textContent = 'The Sequel';
      prestigeHintEl.hidden = false;
      prestigeHintEl.textContent = 'Reach ' + formatNumber(LEGACY_DIVISOR) + ' total Spotlight to prestige.';
    }
  }

  function doPrestige() {
    var gain = legacyGainPreview();
    if (gain < 1) return;
    var confirmed = window.confirm(
      'Prestige for +' + gain + ' Legacy?\n\nThis restarts your Production and Preparation progress from scratch. ' +
      'Legacy is permanent — it boosts everything you earn from here on, and never resets.'
    );
    if (!confirmed) return;
    var newLegacy = state.legacy + gain;
    var keepReducedEffects = state.reducedEffects;
    var keepShorthandNumbers = state.shorthandNumbers;
    var keepColorfulText = state.colorfulText;
    // Lifetime stats (play time, clicks, offline earnings) are about the
    // save file as a whole, not any one run — they survive a prestige the
    // same way Legacy does, unlike Spotlight/totalEarned/owned.
    var keepPlayTimeMs = state.playTimeMs;
    var keepTotalClicks = state.totalClicks;
    var keepTotalCrits = state.totalCrits;
    var keepTotalOfflineEarned = state.totalOfflineEarned;
    var keepLifetimeEarned = state.lifetimeEarned;
    var keepUnlockedAchievements = state.unlockedAchievements;
    // Legacy skills are bought WITH Legacy points, which already survive
    // prestige — so the skills themselves have to as well, or spending
    // points would be a strictly worse deal than just hoarding them.
    var keepLegacySkills = state.legacySkills;
    cancelPaparazzi();
    state = { spotlight: 0, totalEarned: 0, lifetimeEarned: keepLifetimeEarned, owned: {}, legacySkills: keepLegacySkills, reducedEffects: keepReducedEffects, legacy: newLegacy, shorthandNumbers: keepShorthandNumbers, colorfulText: keepColorfulText, seenMillion: false, lastSeen: Date.now(), playTimeMs: keepPlayTimeMs, totalClicks: keepTotalClicks, totalCrits: keepTotalCrits, totalOfflineEarned: keepTotalOfflineEarned, unlockedAchievements: keepUnlockedAchievements };
    UPGRADES.forEach(function (u) { state.owned[u.id] = 0; });
    LEGACY_SKILLS.forEach(function (s) { if (typeof state.legacySkills[s.id] !== 'number') state.legacySkills[s.id] = 0; });
    save();
    lastLine = null;
    showLine(SEQUEL_LINE);
    renderCount();
    renderShop();
    renderPrestige();
    if (!legacyShopEl.hidden) renderLegacyShop(); // affordability just changed if it's the visible tab
  }

  prestigeBtn.addEventListener('click', doPrestige);

  // Plain comma-formatted under 10,000 (still easy to read at a glance);
  // abbreviated with a K/M/B/T suffix above that, where the full digit
  // count starts getting unwieldy — trims trailing zeros so "1.00M"
  // shows as "1M" but "1.25M" keeps its precision. The Shorthand
  // Numbers setting can turn the abbreviation off entirely.
  function formatNumber(n) {
    n = Math.floor(n);
    var abs = Math.abs(n);
    if (abs < 10000 || !state.shorthandNumbers) return n.toLocaleString();
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
    clickRateEl.hidden = false;
    clickRateEl.textContent = '+' + formatNumber(clickPower()) + ' / click';
  }

  function renderShopSection(containerEl, kinds) {
    containerEl.innerHTML = '';
    UPGRADES.forEach(function (u) {
      if (kinds.indexOf(u.kind) === -1) return;
      var owned = state.owned[u.id];
      if (state.totalEarned < u.unlockAt && owned === 0) return; // not unlocked yet
      if (u.requires && state.owned[u.requires] === 0) return; // prerequisite not owned yet
      if ((u.minPrestige || 0) > state.legacy) return; // needs Legacy from a past Sequel
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

  // Mirrors renderShopSection's markup/classes for a consistent look, but
  // simpler: no unlockAt/requires/minPrestige gating, and cost/currency
  // are Legacy points via legacySkillCost()/state.legacy instead of
  // upgradeCost()/state.spotlight.
  function renderLegacyShop() {
    legacyShopEl.innerHTML = '';
    LEGACY_SKILLS.forEach(function (s) {
      var owned = state.legacySkills[s.id];
      var maxedOut = s.maxOwned && owned >= s.maxOwned;
      var cost = legacySkillCost(s);

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'spotlight-upgrade';
      btn.dataset.id = s.id;
      btn.disabled = maxedOut || state.legacy < cost;

      var info = document.createElement('div');
      info.className = 'spotlight-upgrade-info';
      var name = document.createElement('span');
      name.className = 'spotlight-upgrade-name';
      name.textContent = s.name;
      var desc = document.createElement('span');
      desc.className = 'spotlight-upgrade-desc';
      desc.textContent = s.desc;
      info.appendChild(name);
      info.appendChild(desc);

      var costEl = document.createElement('span');
      costEl.className = 'spotlight-upgrade-cost';
      costEl.textContent = maxedOut ? 'Maxed' : cost + ' Legacy';

      var ownedEl = document.createElement('span');
      ownedEl.className = 'spotlight-upgrade-owned';
      ownedEl.textContent = owned > 0 ? 'Owned: ' + owned : '';

      btn.appendChild(info);
      btn.appendChild(costEl);
      btn.appendChild(ownedEl);

      btn.addEventListener('click', function () {
        buyLegacySkill(s);
      });

      legacyShopEl.appendChild(btn);
    });
  }

  function renderShop() {
    renderShopSection(shopEl, ['building']);
    renderShopSection(boostShopEl, ['click', 'clickPowerMult', 'discount', 'critChance', 'paparazzi', 'paparazziFreq', 'paparazziMult', 'paparazziPassive', 'paparazziDuration', 'legacyMult', 'offlineCap']);
    // The shop's height just potentially changed (an upgrade unlocked,
    // maxed out, etc.) — the pinned column's floor depends on where the
    // shop column's bottom edge actually is, so re-measure it. No-op
    // before the pin machinery further down the file has initialized.
    if (typeof updatePinnedLayout === 'function' && spotlightLeftEl) updatePinnedLayout();
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
    checkAchievements();
    save();
    renderCount();
    renderShop();
    renderPrestige();
  }

  // Her four face colors (the portrait's red circle, blue rectangle,
  // gold accent, green triangle) — each word of her dialogue gets one
  // at random, reassigned fresh whenever the line changes (not on every
  // render, or it'd flicker/reshuffle constantly while the same line
  // sits on screen).
  var AP_WORD_COLORS = ['#bd1b0d', '#132DB4', '#e3a94e', '#077c0c'];

  function renderBubbleLine(el, text) {
    el.innerHTML = '';
    if (!state.colorfulText) { el.textContent = text; return; }
    var words = text.split(' ');
    var lastColor = null;
    words.forEach(function (word, i) {
      var span = document.createElement('span');
      span.textContent = word + (i < words.length - 1 ? ' ' : '');
      var color;
      do {
        color = AP_WORD_COLORS[Math.floor(Math.random() * AP_WORD_COLORS.length)];
      } while (color === lastColor && AP_WORD_COLORS.length > 1);
      lastColor = color;
      span.style.color = color;
      el.appendChild(span);
    });
  }

  function renderQuote(line) {
    renderBubbleLine(quoteEsEl, line.es);
    renderBubbleLine(quoteEnEl, line.en);
  }

  var lastLine = null;
  function showLine(line) {
    lastLine = line;
    renderQuote(line);
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

  // Permanent, from past prestiges — +2% to every source of income
  // (clicks, crits, paparazzi, passive) per Legacy point, forever. The
  // per-point rate itself can be boosted further by 'legacyMult' upgrades
  // (Director's Cut), each a post-Sequel-only multiplier on this rate.
  var LEGACY_BONUS_PER_POINT = 0.02;

  function legacyBonusRate() {
    var rate = LEGACY_BONUS_PER_POINT;
    UPGRADES.forEach(function (u) {
      if (u.kind === 'legacyMult') rate *= 1 + u.legacyMultBonus * state.owned[u.id];
    });
    return rate;
  }

  function legacyMultiplier() {
    return 1 + state.legacy * legacyBonusRate();
  }

  // The single place income actually lands in spotlight/totalEarned —
  // applies the Legacy bonus once, here, so every earning path (click,
  // crit, paparazzi, passive tick) gets it automatically instead of
  // needing to remember to multiply it in separately. Returns the final
  // (post-bonus) amount so callers can display the real number earned.
  var MILLION_MILESTONE = 1000000;

  function earnSpotlight(rawAmount) {
    var amount = rawAmount * legacyMultiplier();
    state.spotlight += amount;
    state.totalEarned += amount; // this run only — resets on prestige, feeds the Legacy gain calc
    state.lifetimeEarned += amount; // never resets on prestige, only on a full Reset
    if (!state.seenMillion && state.totalEarned >= MILLION_MILESTONE) {
      state.seenMillion = true; // marks the moment as "happened" even if Reduce Effects hides the visual
      spawnConfettiBurst();
    }
    return amount;
  }

  // --- offline gains -------------------------------------------------
  // Passive Production keeps "earning" while the tab's closed, credited
  // in one lump sum on return. Capped so leaving it closed for a week
  // isn't a free-money exploit, and skipped entirely below a minimum gap
  // so a quick page refresh doesn't pop a modal for a few seconds' worth
  // of Spotlight.
  var OFFLINE_CAP_BASE_MS = 12 * 60 * 60 * 1000; // 12 hours max credited, before Standing Arrangement
  var OFFLINE_MIN_MS = 60 * 1000; // ignore gaps under a minute

  function offlineCapMs() {
    var bonusHours = UPGRADES.reduce(function (sum, u) {
      return u.kind === 'offlineCap' ? sum + state.owned[u.id] * u.capBonusHours : sum;
    }, 0) + legacySkillOfflineCapBonusHours();
    return OFFLINE_CAP_BASE_MS + bonusHours * 60 * 60 * 1000;
  }

  function formatDuration(ms) {
    var totalMin = Math.floor(ms / 60000);
    var hours = Math.floor(totalMin / 60);
    var mins = totalMin % 60;
    if (hours > 0) return hours + 'h ' + mins + 'm';
    return mins + 'm';
  }

  function checkOfflineGains() {
    var elapsedMs = Date.now() - (state.lastSeen || Date.now());
    if (elapsedMs < OFFLINE_MIN_MS) return;
    var rate = totalRatePerMinute();
    if (rate <= 0) return;
    var cap = offlineCapMs();
    var creditedMs = Math.min(elapsedMs, cap);
    var amount = earnSpotlight(rate * (creditedMs / 60000));
    state.totalOfflineEarned += amount;
    offlineTimeEl.textContent = 'You were away for ' + formatDuration(elapsedMs) +
      (elapsedMs > cap ? ' (capped at ' + formatDuration(cap) + ')' : '') + '.';
    offlineAmountEl.textContent = '+' + formatNumber(Math.floor(amount)) + ' Spotlight';
    offlineOverlayEl.hidden = false;
  }

  offlineClaimBtn.addEventListener('click', function () {
    offlineOverlayEl.hidden = true;
    renderCount();
    renderShop();
    renderPrestige();
    save();
  });

  var CRIT_MULTIPLIER = 10;

  function handleClick(e) {
    var isCrit = Math.random() < critChance();
    var amount = earnSpotlight(clickPower() * (isCrit ? CRIT_MULTIPLIER : 1) * (paparazziActive ? paparazziMultiplier() : 1));
    state.totalClicks++;
    if (isCrit) state.totalCrits++;
    if (isCrit) showLine(CRIT_LINES[Math.floor(Math.random() * CRIT_LINES.length)]);
    else showQuote();
    portraitEl.classList.remove('is-clicked');
    void portraitEl.offsetWidth; // restart the pop animation if it's mid-run
    portraitEl.classList.add('is-clicked');
    var point = e.touches && e.touches[0] ? e.touches[0] : e;
    spawnFloatingPlusOne(point.clientX, point.clientY, amount, isCrit);
    checkAchievements();
    renderCount();
    renderShop(); // a click can be what crosses an unlock threshold
    renderPrestige();
    save();
  }

  portraitEl.addEventListener('click', handleClick);

  resetBtn.addEventListener('click', function () {
    var confirmed = window.confirm(
      'Reset everything?\n\nThis wipes your Spotlight, every Production and Preparation upgrade, AND your Legacy ' +
      '(Reset does not keep Legacy — The Sequel does, if that\'s what you meant to do instead).'
    );
    if (!confirmed) return;
    var keepReducedEffects = state.reducedEffects; // a display preference, not progress — survives Reset
    var keepShorthandNumbers = state.shorthandNumbers;
    var keepColorfulText = state.colorfulText;
    // Unlike prestiging, the plain Reset button is a full wipe — Legacy
    // included. It's the "start completely over" button; The Sequel is
    // the one that keeps Legacy around.
    state = { spotlight: 0, totalEarned: 0, lifetimeEarned: 0, owned: {}, legacySkills: {}, reducedEffects: keepReducedEffects, legacy: 0, shorthandNumbers: keepShorthandNumbers, colorfulText: keepColorfulText, seenMillion: false, lastSeen: Date.now(), playTimeMs: 0, totalClicks: 0, totalCrits: 0, totalOfflineEarned: 0, unlockedAchievements: {} };
    UPGRADES.forEach(function (u) { state.owned[u.id] = 0; });
    LEGACY_SKILLS.forEach(function (s) { state.legacySkills[s.id] = 0; });
    cancelPaparazzi();
    save();
    lastLine = null;
    renderQuote(IDLE_LINE);
    renderCount();
    renderShop();
    renderPrestige();
  });

  function setTab(tab) {
    boostShopEl.hidden = tab !== 'boost';
    shopEl.hidden = tab !== 'production';
    legacyShopEl.hidden = tab !== 'legacy';
    tabBoostBtn.classList.toggle('is-active', tab === 'boost');
    tabProductionBtn.classList.toggle('is-active', tab === 'production');
    tabLegacyBtn.classList.toggle('is-active', tab === 'legacy');
    if (tab === 'legacy') renderLegacyShop();
    // Preparation/Production/Legacy can be very different lengths — the
    // pinned column's floor needs to know the newly-visible list's real
    // height.
    if (typeof updatePinnedLayout === 'function' && spotlightLeftEl) updatePinnedLayout();
  }
  tabBoostBtn.addEventListener('click', function () { setTab('boost'); });
  tabProductionBtn.addEventListener('click', function () { setTab('production'); });
  tabLegacyBtn.addEventListener('click', function () { setTab('legacy'); });

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

  // --- million-Spotlight confetti burst -----------------------------
  // A bigger, viewport-wide moment distinct from the small ambient FX
  // above — real SVG confetti scraps blasting in from off-screen edges,
  // easing toward center, then drifting down and off the bottom.
  // Fires once guaranteed at the 1,000,000 milestone (see earnSpotlight),
  // then only very rarely afterward. Fully suppressed by Reduce Effects.
  var CONFETTI_COLORS = ['#e74c3c', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6', '#e67e22', '#ff6fae', '#1abc9c'];
  var CONFETTI_PIECE_COUNT = 36;
  var CONFETTI_SVG_NS = 'http://www.w3.org/2000/svg';

  function makeConfettiPiece(color, isTriangle) {
    var svg = document.createElementNS(CONFETTI_SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 10 10');
    svg.setAttribute('width', '10');
    svg.setAttribute('height', '10');
    svg.classList.add('spotlight-confetti-piece');
    if (isTriangle) {
      var poly = document.createElementNS(CONFETTI_SVG_NS, 'polygon');
      poly.setAttribute('points', '5,0 10,10 0,10');
      poly.setAttribute('fill', color);
      svg.appendChild(poly);
    } else {
      var rect = document.createElementNS(CONFETTI_SVG_NS, 'rect');
      rect.setAttribute('width', '10');
      rect.setAttribute('height', '6');
      rect.setAttribute('y', '2');
      rect.setAttribute('fill', color);
      svg.appendChild(rect);
    }
    return svg;
  }

  // Real physics, computed continuously every frame instead of stitched
  // CSS keyframes — no hand-authored waypoint for velocity to
  // discontinuously reset at. Two things layered on top of plain
  // projectile motion to make it read as a paper-confetti *burst*
  // instead of a steady stream shooting out of a hose:
  //   1. Horizontal (and the initial vertical kick) velocity decays with
  //      drag — a closed-form exponential — so pieces launch fast and
  //      ease OUT as they slow, rather than cruising at constant speed
  //      forever. v(t) = v0 * e^(-k*t); position is the integral of that.
  //   2. The fall settles into a gentle terminal velocity (drag balances
  //      gravity) instead of accelerating forever like heavy rain, plus a
  //      slow side-to-side sine sway — that's what reads as "floaty"
  //      paper drifting down instead of a stream of drops.
  var CONFETTI_TERMINAL_VY = 14; // vh/s — gentle drifting-down speed, not a plummet
  var confettiPieces = [];
  var confettiRafId = null;

  function stepConfetti(now) {
    var i, p, t, alpha;
    var stillActive = false;
    for (i = 0; i < confettiPieces.length; i++) {
      p = confettiPieces[i];
      if (!p.node) continue;
      t = (now - p.start) / 1000;
      if (t < 0) { stillActive = true; continue; } // hasn't launched yet (delay)

      var x, y;
      if (p.gravity) {
        // Original plain-projectile-motion easter-egg pieces: constant
        // horizontal velocity, real constant downward acceleration.
        // x = x0 + vx*t, y = y0 + vy0*t + 0.5*g*t^2 — the exact formula
        // from the first rAF rewrite (commit 07ee1a9), kept byte-for-byte
        // since that's specifically the version that got a laugh.
        x = p.x0 + p.vx * t;
        y = p.y0 + p.vy0 * t + 0.5 * CONFETTI_STREAM_GRAVITY * t * t;
      } else {
        // Horizontal: pure drag decay — eases out from the launch speed
        // toward a standstill, integral of v0*e^(-k*t). Each piece carries
        // its own drag constant (see spawnConfettiBurst) instead of one
        // shared value, so 36 pieces don't all finish slowing down at the
        // same instant — that synchronized stop was what read as "one
        // condensed batch" no matter how the single constant was tuned.
        var xDecay = (1 - Math.exp(-p.drag * t)) / p.drag;
        x = p.x0 + p.vx0 * xDecay + p.swayAmp * Math.sin(t * p.swayFreq + p.swayPhase);

        // Vertical: eases from the launch kick toward a gentle terminal
        // fall speed instead of accelerating without limit — the integral
        // of vTerm + (v0 - vTerm)*e^(-k*t).
        var yDecay = (1 - Math.exp(-p.fallDrag * t)) / p.fallDrag;
        y = p.y0 + p.vyTerm * t + (p.vy0 - p.vyTerm) * yDecay;
      }

      var rot = p.rot0 + p.rotSpeed * t;

      var life = t / p.lifetime;
      if (life >= 1) {
        p.node.remove();
        p.node = null;
        continue;
      }
      stillActive = true;
      alpha = life < 0.06 ? life / 0.06 : (life > 0.85 ? Math.max(0, (1 - life) / 0.15) : 1);

      p.node.style.transform = 'translate(' + x + 'vw, ' + y + 'vh) rotate(' + rot + 'deg)';
      p.node.style.opacity = alpha;
    }
    if (stillActive) {
      confettiRafId = requestAnimationFrame(stepConfetti);
    } else {
      confettiRafId = null;
      confettiPieces = [];
    }
  }

  function spawnConfettiBurst(force) {
    if (state.reducedEffects && !force) return;

    // One shared origin per burst, live on a random viewport edge — a
    // confetti-cannon shot, not pieces independently converging on center.
    // Coordinates are offsets from viewport CENTER (the piece's own
    // left:50%/top:50% base), so ±50 on either axis reaches that edge.
    var edge = Math.floor(Math.random() * 4); // 0 left, 1 right, 2 top, 3 bottom
    var originX, originY, outX, outY; // outX/outY: direction the cone points
    if (edge === 0) { originX = -50; originY = Math.random() * 100 - 50; outX = 1; outY = 0; }
    else if (edge === 1) { originX = 50; originY = Math.random() * 100 - 50; outX = -1; outY = 0; }
    else if (edge === 2) { originX = Math.random() * 100 - 50; originY = -50; outX = 0; outY = 1; }
    else { originX = Math.random() * 100 - 50; originY = 50; outX = 0; outY = -1; }

    var now = performance.now();

    for (var i = 0; i < CONFETTI_PIECE_COUNT; i++) {
      var color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      var node = makeConfettiPiece(color, Math.random() < 0.5);
      confettiLayerEl.appendChild(node);

      // Launch speed along the cone direction, plus a much wider
      // perpendicular spread component — this decays via each piece's
      // own drag (see stepConfetti), so it's a punchy initial burst that
      // eases out, not a constant-speed stream, and the wide spread
      // fans pieces out across most of the screen instead of a narrow
      // clump.
      var speed = 80 + Math.random() * 90;
      var spreadSpeed = (Math.random() * 140 - 70);
      var vx0, vy0;
      if (outX !== 0) { vx0 = outX * speed; vy0 = spreadSpeed - 45; }
      else { vx0 = spreadSpeed; vy0 = outY * speed - 30; }

      confettiPieces.push({
        node: node,
        x0: originX,
        y0: originY,
        vx0: vx0,
        vy0: vy0,
        drag: 1.2 + Math.random() * 2.2, // per-piece, so decel isn't synchronized across the batch
        fallDrag: 0.7 + Math.random() * 1.0,
        vyTerm: CONFETTI_TERMINAL_VY + Math.random() * 8, // gentle drift, slight variance so pieces don't fall in lockstep
        swayAmp: 2 + Math.random() * 5,
        swayFreq: 1.2 + Math.random() * 1.6,
        swayPhase: Math.random() * Math.PI * 2,
        rot0: Math.random() * 360,
        rotSpeed: (Math.random() * 200 - 100),
        lifetime: 3.2 + Math.random() * 1.2,
        // Nearly-simultaneous launch (small stagger just to avoid a
        // perfectly robotic pop) — a real burst goes off all at once,
        // not trickling out over half a second like a stream.
        start: now + Math.random() * 90
      });
    }

    if (confettiRafId === null) {
      confettiRafId = requestAnimationFrame(stepConfetti);
    }
  }

  // A little Easter egg: the exact confetti physics from the first rAF
  // rewrite (commit 07ee1a9) — plain constant-velocity-plus-gravity
  // projectile motion with a wide random launch delay, which in
  // practice reads as a slow, narrow, continuous stream rather than a
  // punchy burst. A friend found it hilarious, so it's kept around as a
  // rare thing you can only stumble into by mashing the Blow Confetti
  // button — never on the real milestone/sporadic bursts.
  var CONFETTI_STREAM_GRAVITY = 220; // vh/s^2 — same value as 07ee1a9
  var CONFETTI_STREAM_PIECE_COUNT = CONFETTI_PIECE_COUNT * 2; // twice the confetti
  function spawnConfettiStream() {
    var edge = Math.floor(Math.random() * 4);
    var originX, originY, outX, outY;
    if (edge === 0) { originX = -50; originY = Math.random() * 100 - 50; outX = 1; outY = 0; }
    else if (edge === 1) { originX = 50; originY = Math.random() * 100 - 50; outX = -1; outY = 0; }
    else if (edge === 2) { originX = Math.random() * 100 - 50; originY = -50; outX = 0; outY = 1; }
    else { originX = Math.random() * 100 - 50; originY = 50; outX = 0; outY = -1; }

    var now = performance.now();

    for (var i = 0; i < CONFETTI_STREAM_PIECE_COUNT; i++) {
      var color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      var node = makeConfettiPiece(color, Math.random() < 0.5);
      confettiLayerEl.appendChild(node);

      var speed = 55 + Math.random() * 45;
      var spreadSpeed = (Math.random() * 60 - 30);
      var vx, vy0;
      if (outX !== 0) { vx = outX * speed; vy0 = spreadSpeed - 30; }
      else { vx = spreadSpeed; vy0 = outY * speed - 20; }

      confettiPieces.push({
        node: node,
        gravity: true,
        x0: originX,
        y0: originY,
        vx: vx,
        vy0: vy0,
        rot0: Math.random() * 360,
        rotSpeed: (Math.random() * 240 - 120),
        lifetime: 5.2 + Math.random() * 2.0, // twice as long as the original 2.6-3.6s
        start: now + Math.random() * 900 // twice the launch stagger, so it trickles twice as long
      });
    }

    if (confettiRafId === null) {
      confettiRafId = requestAnimationFrame(stepConfetti);
    }
  }

  // Very sporadic after the first guaranteed burst — low chance, checked
  // infrequently, so it reads as a rare treat rather than a repeating cycle.
  var CONFETTI_SPORADIC_CHANCE = 0.03;
  setInterval(function () {
    if (state.totalEarned < MILLION_MILESTONE) return;
    if (Math.random() > CONFETTI_SPORADIC_CHANCE) return;
    spawnConfettiBurst();
  }, 60000);

  // --- stats panel ----------------------------------------------------
  // Pure readout, no gameplay effect — everything here is recomputed
  // live from state/the existing modifier functions rather than tracked
  // separately, so it can never drift out of sync with the real numbers.
  function formatPercent(mult) {
    return (Math.round((mult - 1) * 1000) / 10) + '%';
  }

  function renderStats() {
    statTotalEarnedEl.textContent = formatNumber(Math.floor(state.totalEarned)) + ' Spotlight';
    statLifetimeEarnedEl.textContent = formatNumber(Math.floor(state.lifetimeEarned)) + ' Spotlight';
    statPlayTimeEl.textContent = formatDuration(state.playTimeMs);
    statClicksEl.textContent = state.totalClicks.toLocaleString();
    statCritsEl.textContent = state.totalCrits.toLocaleString();
    statOfflineEl.textContent = formatNumber(Math.floor(state.totalOfflineEarned)) + ' Spotlight';
    statLegacyMultEl.textContent = legacyMultiplier().toFixed(2) + 'x';
    statClickPowerEl.textContent = formatNumber(clickPower()) + ' / click';
    statRateEl.textContent = formatNumber(totalRatePerMinute()) + ' / min';
    statCritChanceEl.textContent = (Math.round(critChance() * 1000) / 10) + '%';
    statBuildingDiscountEl.textContent = formatPercent(discountFactor('building'));
    statClickDiscountEl.textContent = formatPercent(discountFactor('click'));
  }

  statsToggleBtn.addEventListener('click', function () {
    var open = statsPanelEl.hidden;
    statsPanelEl.hidden = !open;
    statsToggleBtn.setAttribute('aria-expanded', String(open));
    if (open) renderStats();
    updatePinnedLayout(); // the panel lives inside the pinned column now — its height just changed
  });

  // Ticks every second the tab is actually visible — "time spent in tab"
  // means genuinely looking at it, not just having it open in a
  // background tab somewhere.
  setInterval(function () {
    if (!document.hidden) state.playTimeMs += 1000;
    if (!statsPanelEl.hidden) renderStats();
    checkAchievements();
  }, 1000);

  // --- achievements -----------------------------------------------------
  var toastTimer = null;
  function showAchievementToast(name) {
    clearTimeout(toastTimer);
    achievementToastEl.textContent = '🏆 ' + name + ' unlocked!';
    achievementToastEl.hidden = false;
    void achievementToastEl.offsetWidth; // force layout so the transition below actually animates
    achievementToastEl.classList.add('is-shown');
    toastTimer = setTimeout(function () {
      achievementToastEl.classList.remove('is-shown');
      setTimeout(function () { achievementToastEl.hidden = true; }, 350); // matches the CSS transition duration
    }, 3000);
  }

  // Runs every second (see the tick above) plus right after clicks/buys
  // for snappier feedback. Only ever unlocks — never re-locks — so it's
  // safe to call this often and cheaply.
  function checkAchievements() {
    var unlockedAny = false;
    ACHIEVEMENTS.forEach(function (a) {
      if (state.unlockedAchievements[a.id]) return;
      if (!a.check()) return;
      state.unlockedAchievements[a.id] = true;
      unlockedAny = true;
      showAchievementToast(a.name);
    });
    if (unlockedAny) {
      save();
      if (!achievementsPanelEl.hidden) renderAchievements();
    }
  }

  function renderAchievements() {
    achievementsPanelEl.innerHTML = '';
    ACHIEVEMENTS.forEach(function (a) {
      var unlocked = !!state.unlockedAchievements[a.id];
      var row = document.createElement('div');
      row.className = 'spotlight-achievement-row' + (unlocked ? ' is-unlocked' : '');

      var icon = document.createElement('div');
      icon.className = 'spotlight-achievement-icon';
      icon.textContent = unlocked ? '🏆' : '🔒';

      var info = document.createElement('div');
      info.className = 'spotlight-achievement-info';
      var name = document.createElement('span');
      name.className = 'spotlight-achievement-name';
      name.textContent = a.name;
      var desc = document.createElement('span');
      desc.className = 'spotlight-achievement-desc';
      desc.textContent = a.desc;
      var bonus = document.createElement('span');
      bonus.className = 'spotlight-achievement-bonus';
      var bonusLabel = a.bonusType === 'clickPower' ? 'click power' : 'passive rate';
      bonus.textContent = '+' + (a.bonusValue * 100) + '% ' + bonusLabel + (unlocked ? ' (active)' : '');
      info.appendChild(name);
      info.appendChild(desc);
      info.appendChild(bonus);

      row.appendChild(icon);
      row.appendChild(info);
      achievementsPanelEl.appendChild(row);
    });
  }

  achievementsToggleBtn.addEventListener('click', function () {
    var open = achievementsPanelEl.hidden;
    achievementsPanelEl.hidden = !open;
    achievementsToggleBtn.setAttribute('aria-expanded', String(open));
    if (open) renderAchievements();
    updatePinnedLayout();
  });

  function renderEffectsToggle() {
    effectsToggleBtn.textContent = state.reducedEffects ? 'On' : 'Off';
    effectsToggleBtn.classList.toggle('is-active', state.reducedEffects);
  }
  effectsToggleBtn.addEventListener('click', function () {
    state.reducedEffects = !state.reducedEffects;
    save();
    renderEffectsToggle();
  });

  function renderNumberFormatToggle() {
    numberFormatToggleBtn.textContent = state.shorthandNumbers ? 'On' : 'Off';
    numberFormatToggleBtn.classList.toggle('is-active', state.shorthandNumbers);
  }
  numberFormatToggleBtn.addEventListener('click', function () {
    state.shorthandNumbers = !state.shorthandNumbers;
    save();
    renderNumberFormatToggle();
    renderCount();
    refreshShopAffordability(); // re-formats every visible cost immediately
  });

  function renderColorfulTextToggle() {
    colorfulTextToggleBtn.textContent = state.colorfulText ? 'On' : 'Off';
    colorfulTextToggleBtn.classList.toggle('is-active', state.colorfulText);
  }
  colorfulTextToggleBtn.addEventListener('click', function () {
    state.colorfulText = !state.colorfulText;
    save();
    renderColorfulTextToggle();
    renderQuote(lastLine || IDLE_LINE); // re-render whatever's currently on screen with the new setting
  });

  settingsToggleBtn.addEventListener('click', function () {
    var open = settingsPanelEl.hidden;
    settingsPanelEl.hidden = !open;
    settingsToggleBtn.setAttribute('aria-expanded', String(open));
    updatePinnedLayout();
  });

  var CONFETTI_STREAM_CHANCE = 0.05; // easter egg, only reachable via this button
  confettiTestBtn.addEventListener('click', function () {
    if (Math.random() < CONFETTI_STREAM_CHANCE) {
      spawnConfettiStream();
    } else {
      spawnConfettiBurst(true); // force, bypassing Reduce Effects — this is an on-demand "show me" click
    }
  });
  // Gold while actually pressed, back to normal on release — not a timed
  // flash, so it tracks the real press/release rather than a fixed duration.
  confettiTestBtn.addEventListener('pointerdown', function () {
    confettiTestBtn.classList.add('is-active');
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (evt) {
    confettiTestBtn.addEventListener(evt, function () {
      confettiTestBtn.classList.remove('is-active');
    });
  });

  // Passive income ticks 4x/second for a smooth-feeling counter, adding
  // a quarter of the per-second rate each time rather than waiting a
  // full minute to add a lump sum.
  setInterval(function () {
    var perSecond = totalRatePerMinute() / 60;
    if (perSecond <= 0) return;
    var beforeUnlocked = unlockedCount();
    var passivePaparazziBonus = (paparazziActive && state.owned.publicist > 0) ? paparazziMultiplier() : 1;
    earnSpotlight((perSecond / 4) * passivePaparazziBonus);
    renderCount();
    renderPrestige();
    // Rebuild only if passive income just crossed an unlock threshold —
    // otherwise just update existing buttons in place (see comment on
    // refreshShopAffordability for why).
    if (unlockedCount() !== beforeUnlocked) renderShop();
    else refreshShopAffordability();
  }, 250);

  // Autosave on an interval too, not just on click/buy, so passive
  // income earned while idle isn't lost if the tab closes uncleanly.
  setInterval(save, 5000);
  // Also save right as the tab goes away (close, refresh, switch tabs) so
  // lastSeen is as fresh as possible for the next offline-gains check —
  // the 5s interval alone could leave up to a 5s gap uncredited.
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) save();
  });
  window.addEventListener('beforeunload', save);

  // --- pin the portrait/bubble column while the shop list scrolls -----
  // Keeps her visible while the (often long) shop scrolls past: desktop
  // centers her vertically in the viewport, mobile pins her to the very
  // top (full-width, like a sticky header) so the shop scrolls
  // underneath. Both are clamped between a ceiling (desktop: never
  // above where she naturally starts, so she can't float up over the
  // page heading on a short/fresh page; mobile: never above the
  // viewport top, i.e. 0) and a floor (never below the bottom of the
  // shop list, so she doesn't end up floating over the footer either).
  // Tried plain position:sticky first — reliable in general, but this
  // site sets overflow-x:hidden on <html>/<body> site-wide (deliberate,
  // load-bearing, protects against horizontal-pan bugs elsewhere) and
  // that combination is a known way to silently break sticky. So this
  // measures the column's natural, in-flow position and the shop
  // column's bottom edge, then applies true position:fixed with `top`
  // computed and clamped on every scroll.
  var spotlightLeftEl = document.querySelector('.spotlight-left');
  var spotlightRightEl = document.querySelector('.spotlight-right');
  var PIN_BREAKPOINT = window.matchMedia('(min-width: 641px)');
  var pinnedNaturalDocTop = 0; // her un-pinned top, in absolute document coordinates
  var pinnedContainerDocBottom = 0; // the shop column's bottom, in absolute document coordinates

  function computePinnedTop() {
    if (!spotlightLeftEl.classList.contains('is-pinned')) return;
    var elH = spotlightLeftEl.offsetHeight;
    var ceiling = PIN_BREAKPOINT.matches ? (window.innerHeight - elH) / 2 : 0;
    var naturalTopNow = pinnedNaturalDocTop - window.scrollY; // where she'd be on screen if still in flow
    var floorTopNow = pinnedContainerDocBottom - elH - window.scrollY; // lowest she's allowed to sit
    // Floor wins if it conflicts with the ceiling — not covering the
    // footer matters more than sitting exactly at the ideal centered
    // position. (An earlier version had an exception that reverted to
    // naturalTopNow instead whenever the shop was short, which defeated
    // the floor almost any time the shop was shorter than her box.) The
    // real fix for "floor clamps her before there's any real reason to"
    // is in updatePinnedLayout() below — reserving real vertical space
    // for her on desktop, not patching the clamp math here, since the
    // floor is only ever wrong when the page itself doesn't actually
    // have room for her, and that's a layout problem, not a clamping one.
    var top = Math.min(Math.max(ceiling, naturalTopNow), floorTopNow);
    spotlightLeftEl.style.top = top + 'px';
  }

  var pinScrollQueued = false;
  function queuePinnedScrollUpdate() {
    if (pinScrollQueued) return;
    pinScrollQueued = true;
    requestAnimationFrame(function () { pinScrollQueued = false; computePinnedTop(); });
  }

  function updatePinnedLayout() {
    if (!spotlightLeftEl || !spotlightRightEl) return;
    // Unpin first so the measurement below reflects normal flow, not
    // whatever fixed position was set last time.
    spotlightLeftEl.classList.remove('is-pinned');
    spotlightLeftEl.style.left = '';
    spotlightLeftEl.style.width = '';
    spotlightLeftEl.style.top = '';
    spotlightRightEl.style.marginLeft = '';
    spotlightRightEl.style.marginTop = '';
    spotlightRightEl.parentElement.style.minHeight = '';

    var rect = spotlightLeftEl.getBoundingClientRect();
    pinnedNaturalDocTop = rect.top + window.scrollY;
    spotlightLeftEl.style.left = rect.left + 'px';
    spotlightLeftEl.style.width = rect.width + 'px'; // mobile's media-query !important overrides this to 100%
    spotlightLeftEl.classList.add('is-pinned');
    // Reserve the space she used to occupy in flow — desktop stacks the
    // columns side by side (push the shop right), mobile stacks them
    // vertically (push the shop down). Mobile specifically re-measures
    // AFTER applying is-pinned rather than reusing the pre-pin `rect`:
    // the mobile media query changes her width (100% instead of the
    // narrower unpinned column) and adds padding, both of which can
    // shift her real rendered height — reusing the old measurement left
    // a gap between the pinned header and the shop content underneath.
    if (PIN_BREAKPOINT.matches) {
      var gapPx = parseFloat(getComputedStyle(spotlightRightEl.parentElement).gap) || 0;
      spotlightRightEl.style.marginLeft = (rect.width + gapPx) + 'px';
      // Being position:fixed, she no longer contributes any height to
      // the row — normally fine (the shop naturally grows taller than
      // her), but when the shop is short (freshly unlocked, or right
      // after Reset/Sequel) the row — and everything below it,
      // including the footer — collapses down to the shop's height
      // alone. Her fixed box then geometrically overlaps the footer
      // regardless of scroll position, since nothing ever reserved
      // room for her. Giving the row a min-height matching her real
      // size fixes that at the source instead of trying to clamp
      // around it after the fact.
      spotlightRightEl.parentElement.style.minHeight = spotlightLeftEl.offsetHeight + 'px';
    } else {
      // +13px (~0.8rem) of actual breathing room below the pinned
      // header's own border-bottom, matching the gap below the tabs —
      // without this, the shop starts exactly where her box ends and
      // the tabs visibly touch the border line.
      spotlightRightEl.style.marginTop = (spotlightLeftEl.offsetHeight + 13) + 'px';
    }
    // Measured off .spotlight-columns itself, not spotlightRightEl — on
    // desktop the row has align-items:flex-start, so giving the ROW a
    // min-height (above) doesn't stretch the shop ITEM to fill it; the
    // shop's own getBoundingClientRect().bottom stays at its short
    // natural content height regardless, which would silently undo the
    // min-height reservation for this measurement's purposes. Also
    // measured last, after marginTop/marginLeft/minHeight actually
    // landed — doing this earlier captured the row's bottom edge at its
    // old, un-reserved position, which is what let her genuinely clip
    // down past the real bottom of the page with a short shop list.
    pinnedContainerDocBottom = spotlightRightEl.parentElement.getBoundingClientRect().bottom + window.scrollY;
    computePinnedTop();
  }

  window.addEventListener('resize', updatePinnedLayout);
  window.addEventListener('scroll', queuePinnedScrollUpdate);
  if (PIN_BREAKPOINT.addEventListener) PIN_BREAKPOINT.addEventListener('change', updatePinnedLayout);
  // The very first updatePinnedLayout() call (at the bottom of this file)
  // runs before the portrait image has necessarily finished loading —
  // her box has no explicit width/height, so it measures much shorter
  // than its real size until the image arrives, baking in a wrong
  // ceiling/floor that nothing then corrects (she's already out of flow
  // by that point). Re-measure once the image, fonts, and everything
  // else has actually settled.
  portraitEl.addEventListener('load', updatePinnedLayout);
  window.addEventListener('load', updatePinnedLayout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(updatePinnedLayout);

  loadSave();
  checkOfflineGains();
  checkAchievements();
  renderQuote(IDLE_LINE);
  renderCount();
  renderShop();
  renderEffectsToggle();
  renderNumberFormatToggle();
  renderColorfulTextToggle();
  renderPrestige();
  schedulePaparazzi(); // no-op if not owned yet
  updatePinnedLayout();
})();

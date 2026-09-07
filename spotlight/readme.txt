Center Stage — design notes (spotlight.js)

An idle clicker starring Abstract Painting, who is (in her own mind)
the main character of The House.

DIALOGUE BUBBLE
- Shown before the first click (and after Reset) so the bubble is
  never empty — an empty bubble collapses to almost no height, which
  made its speech-bubble tail render as a stray floating square
  instead of looking attached to anything.
- A separate line is shown right after prestiging, instead of the
  idle line.
- She delivers every line in (Castilian) Spanish, subtitled — because
  of course she does. `es` is what's said, `en` is the dim subtitle.
  Translations by an actual native speaker (AP's creator, from
  Spain) — reviewed and corrected from an earlier machine-ish first
  pass.
- Rare click reactions (5% per click) get a bigger payout and a
  bigger reaction; another set of lines shows sometimes (40% chance)
  right after buying an upgrade.
- Her four face colors (portrait's red circle, blue rectangle, gold
  accent, green triangle) — each word of her dialogue gets one at
  random, reassigned fresh whenever the line changes (not on every
  render, or it'd flicker/reshuffle constantly while the same line
  sits on screen).

UPGRADES (the UPGRADES array)
Written to extend cleanly — add another entry and it shows up in the
shop automatically once its unlock threshold is reached. `unlockAt`
is measured in total Spotlight ever earned; `baseCost`/`costMultiplier`
control the classic "each purchase costs ~15% more" idle-game curve;
`ratePerMinute` is per single owned copy. Cost and rate both scale up
roughly 6x per tier, same shape as most idle games.

`kind` decides which shop section an upgrade renders in and which
effect it has: 'building' adds passive ratePerMinute, 'click' adds
flat clickBonus to every manual click, 'discount' multiplies the
cost of every 'building' purchase by (1 - discountPerOwn) per copy
owned, capped at maxOwned so it can't approach free.

Upgrades are grouped by kind (all Production together, all
Preparation/click-power together, etc.) rather than by when each
tier was added — the shop renders in this exact array order per
section (see renderShopSection), so upgrades of the same kind sitting
apart in the array meant scrolling back and forth between related
tiers in the actual shop list.

Sections, roughly in array order:
- Production (passive rate). Post-Sequel Production tiers require
  at least 1 Legacy point to even see, and pick up right where the
  pre-prestige tiers left off in both cost and rate, so a fresh
  Sequel run still has somewhere to grow past Cinematic Universe once
  it's earned enough again — passive income kept going stale by
  mid-late game otherwise. A second Legacy-gated tier
  (minPrestige: 3) sits past that first Sequel tier — the first thing
  that actually rewards going multiple prestige runs deep instead of
  just banking Legacy passively.
- Preparation (click power), same post-Sequel/minPrestige:3 pattern.
  One upgrade here is a flat multiplier on top of everything else
  clickPower() already adds up (base + every clickBonus upgrade) —
  unlike those, it doesn't have its own number, it just makes the
  total hit harder; grouped with click power rather than off on its
  own.
- Cost discounts.
- Critical clicks. Iconic (Legacy skill) adds flat +1x per copy on
  top of the base 10x — kept separate from critChance() (which
  controls how OFTEN, not how hard).
- Paparazzi event upgrades (see below).
- Other post-Sequel-only upgrades: one spends Spotlight (not Legacy)
  to permanently boost the per-point Legacy bonus itself — a
  multiplier on the multiplier, most valuable the more Legacy is
  already banked, requires having prestiged at least once. Another
  extends how long an absence can be credited for offline gains (the
  12h base cap is a deliberate anti-exploit limit, not a technical
  one, so it's fair game to buy past — not actually Legacy-gated
  itself, unlike its neighbors). A capstone upgrade is a one-time,
  expensive purchase meant as its own savings goal, not something
  bought early and forgotten.

PAPARAZZI EVENT
A random ~5s window where manual clicks are worth several times
normal. Dormant entirely until the base 'paparazzi' upgrade is
bought; 'paparazziFreq' upgrades shorten the average wait between
visits (baseline 40-80s before frequency upgrades shrink it),
'paparazziMult' upgrades raise the payout multiplier. One upgrade
stretches the 5-second window itself rather than the payout — more
time to actually land clicks during it. Passive income normally
ignores the paparazzi window entirely (it's built around manual
clicks) — one upgrade makes it benefit too, automatically, no
clicking required, via the passive-tick interval.

PRESTIGE ("The Sequel") AND LEGACY
Legacy is permanent — it survives this reset (unlike the plain Reset
button, which wipes everything including Legacy) and its bonus
applies to every future run: +2% to every source of income (clicks,
crits, paparazzi, passive) per Legacy point, forever, applied once in
earnSpotlight() (see below) rather than by every earning path
remembering to multiply it in separately.

Gained amount uses a square-root curve so it takes quadratically more
lifetime total for each extra point, the standard shape for a
prestige currency. Each completed prestige also raises the divisor by
50% of the base, so the same Legacy payout costs progressively more
totalEarned every time — first prestige (prestigeCount 0) is
unaffected, second costs 1.5x, third 2x, and so on. Without this, an
auto-clicker (or just getting good at the early game) could chain
prestiges far faster than intended, since totalEarned resets but the
base threshold never grew.

Any upgrade added after the initial set should set `minPrestige: N`
to require N Legacy ever earned before it's purchasable — see the
check in renderShopSection.

Prestiging is two steps: doPrestige() banks the Legacy gain and opens
the "Between Runs" screen (the ONLY place the Legacy skill shop is
reachable — see renderLegacyShop()/legacyShopEl), and startNewRun()
(triggered by that screen's own button) actually performs the run
wipe once the player's done spending. Lifetime stats (play time,
clicks, offline earnings) are about the save file as a whole, not any
one run — they survive a prestige the same way Legacy does, unlike
Spotlight/totalEarned/owned. A "Generational Wealth" Legacy skill
starts each new run with a head start instead of a hard zero, applied
once right when startNewRun() resets Spotlight.

LEGACY SKILL TREE
Bought with Legacy points themselves, not Spotlight — separate
state.legacySkills tracker, separate flat-integer `cost` field (not
upgradeCost()'s curve) — this is a few-points-per-prestige currency,
no cost curve/discount interactions with the regular shop at all.
Spent on top of (not instead of) the usual +2%/point passive bonus:
unspent points still sit in the Legacy counter earning that bonus as
always; spending them converts some into a specific permanent buff
instead, on top of whatever bonus the ones kept are still generating.
One skill (Old Pro) is the crit MULTIPLIER itself, not the chance — a
lever nothing else in the game touches, so it stays meaningful even
once crit chance is near its practical ceiling. Discount skills use a
`target` field to pick which upgrade kind they apply to ('building'
for Producer Connections, 'click' for Acting Coach), computed
independently so they never affect each other's costs.

ACHIEVEMENTS
Permanent once unlocked — checked against whatever the CURRENT run's
state looks like, never re-evaluated after that. Each grants a small
permanent multiplier (`bonusType` + `bonusValue`, applied in
clickPower()/totalRatePerMinute()) on top of the badge, so completing
them is a real part of progression, not purely cosmetic. `check`
reads live `state` — kept cheap since it runs every second. One
achievement is a meta-achievement referencing ACHIEVEMENTS itself,
which is fine since check() only actually runs (from
checkAchievements(), every second) long after the array literal has
finished evaluating. Another ("Lucky!", a Cookie Clicker reference)
has no state condition at all, just a coin flip re-rolled every
second — purely luck-based, same as the real thing. Only real numeric
timestamps get a date shown when unlocked; saves from before
timestamps were tracked just have a bare `true`, so there's genuinely
no time to show for those.

SAVE/LOAD ORDER (important bug fix)
Loading real save data happens as early as possible — immediately,
right after `state` exists — on purpose, before any of the
hundred-plus .addEventListener/DOM-wiring calls later in the file get
a chance to run. loadSave is a hoisted function declaration, so
calling it before its own text appears further down is fine.

The reason: if a future deploy ever serves a stale cached copy of
this script against a newer index.html (a real, repeatedly-observed
failure mode with this site's hosting — element IDs get
renamed/removed across commits), some later line WILL throw a
null-reference error and halt the rest of the script's execution.
Previously that meant loadSave() (called at the very bottom) never
ran at all — `state` stayed at its all-zero defaults, and the very
next autosave (the 5s interval, a click, backgrounding the tab)
permanently overwrote the player's real save with those zeros.
Loading first means a later crash can still break some feature's
wiring, but it can no longer destroy anyone's progress — whatever
`state` holds in memory by the time anything gets saved is already
their real data, correct or not.

Backfill notes for older saves: `lifetimeEarned` defaults to at least
the current run's total for saves predating that field (can't recover
prior runs' totals, but it should never show less than what's
visibly true). Corrupt or missing save data just starts fresh.

NUMBER FORMATTING
Plain comma-formatted under 10,000 (still easy to read at a glance);
abbreviated with a K/M/B/T suffix above that, trimming trailing zeros
so "1.00M" shows as "1M" but "1.25M" keeps its precision. The
Shorthand Numbers setting can turn the abbreviation off entirely.
Originally capped at Trillion, but a long-idle save can genuinely
blow past that (compounding passive income + upgrades), which just
showed as an ugly "10,944.93T" instead of rolling over — extended
with the standard short-scale names, generous headroom past anything
remotely reachable right now.

EARNING / LEGACY BONUS APPLICATION
totalRatePerMinute()/clickPower() don't include the Legacy bonus
themselves — earnSpotlight() applies it separately, at the moment
income actually lands, so every source (clicks, crits, paparazzi,
passive) gets it from one place instead of each remembering to. Shop
preview numbers need to multiply it back in themselves for display,
or they'd quietly undersell the real per-click/per-minute gain to
anyone sitting on Legacy points.

OFFLINE GAINS
Passive Production keeps "earning" while the tab's closed, credited
in one lump sum on return. Capped (OFFLINE_CAP_BASE_MS, 12h before
the Standing Arrangement upgrade extends it) so leaving it closed for
a week isn't a free-money exploit, and skipped entirely below a
minimum gap (OFFLINE_MIN_MS, 1 minute) so a quick page refresh doesn't
pop a modal for a few seconds' worth of Spotlight.

AMBIENT FAME EFFECTS
Purely decorative — confetti and bouquets get more frequent as
lifetime total climbs, plus camera flashes at the highest tier
(FX_TIER_CHANCE, indexed by fameTier()). Camera flashes are the one
effect the "Reduce Effects" toggle suppresses entirely — they're the
only flashing effect here, so that's the actual photosensitivity
concern; confetti/flowers keep going either way since they don't
strobe.

MILLION-SPOTLIGHT CONFETTI BURST
A bigger, viewport-wide moment distinct from the small ambient FX
above — real SVG confetti scraps blasting in from off-screen edges,
easing toward center, then drifting down and off the bottom. Fires
once guaranteed at the 1,000,000 milestone (see earnSpotlight), then
only very rarely afterward (checked infrequently, so it reads as a
rare treat rather than a repeating cycle). Fully suppressed by Reduce
Effects.

Real physics, computed continuously every frame instead of stitched
CSS keyframes — no hand-authored waypoint for velocity to
discontinuously reset at. Two things layered on top of plain
projectile motion make it read as a paper-confetti *burst* instead of
a steady stream shooting out of a hose:
  1. Horizontal (and the initial vertical kick) velocity decays with
     drag — a closed-form exponential — so pieces launch fast and
     ease OUT as they slow, rather than cruising at constant speed
     forever. v(t) = v0 * e^(-k*t); position is the integral of that.
  2. The fall settles into a gentle terminal velocity (drag balances
     gravity) instead of accelerating forever like heavy rain, plus a
     slow side-to-side sine sway — that's what reads as "floaty"
     paper drifting down instead of a stream of drops.

Each piece carries its own drag constant (see spawnConfettiBurst)
instead of one shared value, so 36 pieces don't all finish slowing
down at the same instant — that synchronized stop was what read as
"one condensed batch" no matter how the single constant was tuned.
One shared origin per burst, live on a random viewport edge — a
confetti-cannon shot, not pieces independently converging on center.
Coordinates are offsets from viewport CENTER (the piece's own
left:50%/top:50% base), so ±50 on either axis reaches that edge.
Launch speed is along the cone direction, plus a much wider
perpendicular spread component that decays via each piece's own drag
— a punchy initial burst that eases out, not a constant-speed stream,
fanning pieces across most of the screen instead of a narrow clump.
Launch is nearly-simultaneous (a small stagger just to avoid a
perfectly robotic pop) — a real burst goes off all at once, not
trickling out over half a second like a stream.

EASTER EGG: the original confetti physics
Mashing the "Blow Confetti" button rarely (very low, infrequently
re-checked odds) triggers the EXACT confetti physics from the first
requestAnimationFrame rewrite (commit 07ee1a9) instead of the burst
above: plain constant-horizontal-velocity-plus-constant-gravity
projectile motion (x = x0 + vx*t, y = y0 + vy0*t + 0.5*g*t^2) with a
wide random launch delay, kept byte-for-byte since that's specifically
the version that got a laugh from a friend — never used for the real
milestone/sporadic bursts, which use the improved physics above.

STATS PANEL
Pure readout, no gameplay effect — everything here is recomputed live
from state/the existing modifier functions rather than tracked
separately, so it can never drift out of sync with the real numbers
(same Legacy-multiplier catch-up as renderCount() needs, since
clickPower()/totalRatePerMinute() don't include it themselves). Time
Played ticks every second the tab is actually visible — meaning
genuinely looking at it, not just having it open in a background tab
somewhere.

SHOP RENDERING (avoiding a scroll-jump/lost-click bug)
Rebuilding the shop's full innerHTML (renderShopSection) tears down
and recreates every button, including the one just tapped. On mobile
that mid-tap DOM swap makes the browser lose track of what was
focused and auto-scroll the list back toward the middle of the
viewport — the actual cause of an earlier "scrolls to the middle
after buying" report. The fix used everywhere this matters
(buyUpgrade, the AP-portrait click handler, the passive-income tick):
only do the full rebuild if this action actually crossed an unlock
threshold (something just became visible or newly affordable) or hit
max-owned. Otherwise, refreshShopAffordability() updates existing
buttons' disabled/cost/owned text in place without touching the DOM
nodes at all — nothing for the browser to lose its place over. The
in-place path also matters for raw performance: the full rebuild was
originally running 4x/second off the passive-income tick, which meant
a rapid click could land right as its own target button got torn
down and replaced, silently eating the click.

The AP-portrait click handler specifically needed this fix too: "a
click can be what crosses an unlock threshold" meant rebuilding on
every single tap, which triggered the exact same mid-interaction
DOM-replacement/scroll-jump bug as buying an upgrade did — just far
more often, since it fired on every click instead of only on
purchases.

PINNED PORTRAIT/BUBBLE COLUMN (while the shop list scrolls)
Keeps her visible while the (often long) shop scrolls past: desktop
centers her vertically in the viewport, mobile pins her to the very
top (full-width, like a sticky header) so the shop scrolls underneath.
Both are clamped between a ceiling (desktop: never above where she
naturally starts, so she can't float up over the page heading on a
short/fresh page; mobile: never above the viewport top, i.e. 0) and a
floor (never below the bottom of the shop list, so she doesn't end up
floating over the footer either). Floor wins if it conflicts with the
ceiling — not covering the footer matters more than sitting exactly
at the ideal centered position.

Why not plain `position: sticky`: tried it first, generally reliable,
but this site sets overflow-x:hidden on <html>/<body> site-wide
(deliberate, load-bearing, protects against horizontal-pan bugs
elsewhere), and that combination is a known way to silently break
sticky. So this instead measures the column's natural in-flow
position and the shop column's bottom edge, then applies true
position:fixed with `top` computed and clamped on every scroll.

updatePinnedLayout() (the real fix for "floor clamps her before
there's any real reason to"): reserves real vertical space for her in
the layout on desktop, rather than patching the ceiling/floor clamp
math — the floor is only ever wrong when the page itself doesn't
actually have room for her, which is a layout problem, not a clamping
one. (An earlier version had the floor revert to her natural in-flow
position whenever the shop was short, which defeated the floor almost
any time the shop was shorter than her box.) It unpins first so the
measurement reflects normal flow, not whatever fixed position was set
last time, then reserves the space she used to occupy: desktop stacks
columns side by side (push the shop right via margin), mobile stacks
them vertically (push the shop down). Mobile specifically re-measures
AFTER applying is-pinned rather than reusing the pre-pin rect — the
mobile media query changes her width (100%, a media-query
!important, instead of the narrower unpinned column) and adds
padding, both of which can shift her real rendered height; reusing
the old measurement left a gap between the pinned header and the shop
content underneath.

Being position:fixed, she no longer contributes any height to the
row. Normally fine (the shop naturally grows taller than her), but
when the shop is short (freshly unlocked, or right after
Reset/Sequel) the row — and everything below it including the footer
— collapses down to the shop's height alone, and her fixed box then
geometrically overlaps the footer regardless of scroll position,
since nothing ever reserved room for her. Giving the row a min-height
matching her real size fixes that at the source. That min-height also
gets +13px (~0.8rem) of extra breathing room below the pinned
header's own border-bottom, matching the gap below the tabs — without
it, the shop starts exactly where her box ends and the tabs visibly
touch the border line.

The shop-column-bottom measurement for the floor is taken off
.spotlight-columns itself, not spotlightRightEl directly — on desktop
the row has align-items:flex-start, so giving the ROW a min-height
doesn't stretch the shop ITEM to fill it; the shop's own
getBoundingClientRect().bottom would stay at its short natural
content height regardless, silently undoing the min-height
reservation for measurement purposes. Also measured last, after
marginTop/marginLeft/minHeight have actually landed — measuring
earlier captured the row's bottom edge at its old, un-reserved
position, which is what let her genuinely clip down past the real
bottom of the page with a short shop list.

RESIZE HANDLING (mobile address-bar quirk)
Mobile browsers fire 'resize' when the address bar collapses/expands
during an ordinary scroll — window.innerHeight changes, innerWidth
doesn't. A naive resize handler doing the full unpin/remeasure/repin
cycle (which briefly zeroes marginTop before reapplying it) fires
mid-scroll right when that's most likely — scrolled all the way down,
address bar re-expands as you scroll back up — and the transient
zeroed margin yanks the page's scroll position with it. Fixed by only
doing the full rebuild on a real WIDTH change (rotation, browser
window resize, crossing the mobile/desktop breakpoint); a height-only
change just re-runs computePinnedTop() with the current height, which
doesn't touch the DOM at all.

The very first updatePinnedLayout() call (at the bottom of the file)
runs before the portrait image has necessarily finished loading — her
box has no explicit width/height, so it measures much shorter than
its real size until the image arrives, baking in a wrong
ceiling/floor that nothing then corrects (she's already out of flow
by that point). A re-measure once the image, fonts, and everything
else has actually settled fixes this.

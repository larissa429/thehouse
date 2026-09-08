INDIGO'S ORDER — design notes
(prototype/test build for a planned Odd Jobs miniboss)

OVERVIEW
Indigo (no mouth, ancient, communicates only in his own private symbols)
secretly wants three things off the menu, one at a time.

Turn-based loop: the player asks something, Indigo shows up to three
symbols about his current order in response, and then the player must
guess before they're allowed to ask again — right or wrong, that closes
the round. Nothing about what Indigo has shown carries over on screen
between rounds; he rolls a fresh look at his order each time, so keeping
track of what's already come up is entirely the player's own job, via
their own notes, not something the game remembers for them.

This build intentionally used plain abstract glyphs before real SVG
symbols were sourced (see svgs.txt in the repo root for the icon
sourcing/curation process).

THE ASK MECHANIC
A separate, honest mechanic from the order itself: pick up to four words
you think share one trait, and Indigo answers with his best guess at
whatever trait actually connects them — completely independent of what
he's actually ordering. That's the "dictionary-building" half of the
game. No penalty for a wrong ask/guess; the only real pressure is the
clock. Once an order's solved it drops into the history list and the
next one comes up, until all three are done.

Indigo always answers honestly with whichever tag is the SINGLE
strongest match among the asked words — not a lenient "shared by at
least two of them" grab-bag. That looser version let a real, clean match
(all four words being a Drink) get cluttered up with genuine-but-
incidental partial overlaps (three of them also being Bitter), turning
one clear answer into a confusing pile of three. Only the tag(s) tied
for the actual best count qualify at all.

A tie at the top is only really possible in two situations: asking about
very few words (even one word alone ties all of its own tags at count 1,
since there's nothing to compare it against), or a genuine coincidence.
Either way, the tie breaks toward whichever tag is globally rarer among
the 25 words — a rare trait is a far more distinctive, deliberate-
feeling thing to be pointing at than a common one that just happened to
tie. Only if tags are tied on BOTH count and rarity does it fall back to
picking between them at random, capped at two so a rare coincidence
never turns into a wall of symbols.

THE ORDER REVEAL & NEGATION
First Contact-style: a symbol doesn't only ever mean "my order has
this" — some slots are a trait Indigo does NOT want, shown crossed out.
Same true symbol for that tag either way; only the yes/no framing
differs, so a negation still teaches the player the tag-symbol mapping
just as much as a real one does.

Every candidate reveal (each of the order's true tags, plus — after the
player's first guess — every tag it lacks) is weighted by how many of
the 25 menu items it would actually rule out:
  - Revealing "the order HAS tag T" rules out every item that lacks T
    (rarer tags rule out more, since fewer items have them).
  - Revealing "the order does NOT have tag T" rules out every item that
    HAS T (commoner tags rule out more, since more items have them).

Before reaching for that elimination-value weighting, Indigo first
tries to reuse symbols the player has already been shown at all (see
seenSymbols): candidates are split into "already seen" and "brand new",
and each reveal slot is filled from the seen pool first (weighted by
elimination value within that pool), only spilling into brand-new
symbols for whatever slots are left over. Playtesting showed constant
new-symbol churn made it feel like trial-and-error guessing rather than
real deduction — a negated symbol you've never seen before tells you
nothing, since you don't know what tag it even represents yet. This
also means a "NOT X" reveal is now far more likely to name a symbol
you've already encountered somewhere (an ask response or an earlier
positive reveal), so it's actually decodable. (Weighted sampling
without replacement within each pool, Efraimidis-Spirakis method: give
every candidate a random key skewed by its own weight, take the top
keys.)

Separately, at most MAX_NEGATIONS_PER_REVEAL (1) of the 3 slots in any
single reveal can be a negation — the rest are always positives. A
reveal used to draw all 3 slots from one combined pool of positives and
negatives, which meant two or even three negations could land in the
same reveal. Playtesting showed that was too much to decode at once:
each negated symbol is a brand new unknown-until-decoded fact, and with
several in play simultaneously (plus everything already accumulated
from earlier rounds) there was no way to isolate which one meant what.
Capping it to 1 keeps each reveal from introducing more than a single
new "NOT" fact to untangle.

Negatives are withheld entirely before the player's first guess of the
whole playthrough — even with the seen-first preference above, playtesting
showed the seen-symbols list still ballooning too fast once negatives
(drawn from all 20+ tags NOT in the order, versus only the 5-6 that are)
started mixing in from turn one. Withholding them during that same early
window as the ASKS_PER_GUESS buffer (below) gives the player a small,
honest set of real symbols to get their footing on before the pool of
"seen" symbols starts growing faster.

GUESS BUFFER (ASKS_PER_GUESS)
A guess only unlocks once the player has asked ASKS_PER_GUESS (3) times
since the last guess — otherwise a wrong guess costs nothing but a
single ask before trying again, which makes guessing effectively free.
This applies to every guess, every order, for the whole playthrough
(an earlier build only enforced it before the player's first-ever
guess, but that let later orders devolve into trial-and-error guessing
with too little asking in between — First Contact itself is normally
played with 2+ human turns per alien turn, so this matches that pacing
throughout, not just at the start).

Separately, hasGuessedOnce still tracks whether the player has made
their first guess of the playthrough — that flag now only gates
negation (see ORDER REVEAL & NEGATION above), not the ask buffer.

DATA DESIGN NOTES
- Every tag lives in one flat pool — flavor, type, and physical
  property are not separate axes, just different flavors (so to
  speak) of the same kind of fact about a word or menu item.
- The askable words are drawn from a pool of 50 (ALL_WORDS); each game
  picks 25 of them (WORDS) at startGame() time via pickWords(), so the
  exact word list — and the tag-frequency table used for the ask
  mechanic's rarity tie-breaking — differs every playthrough. The pick
  isn't a flat random draw: it first guarantees at least 4 words each
  tagged Food, Drink, and Spice/Condiment (pulled randomly within each
  type), then fills the remaining slots randomly from whatever's left.
  Plain random sampling could otherwise leave a playthrough with zero
  Drinks (only 7 exist in the full 50), which would make "is it a
  drink?" a dead question for that whole game. They're deliberately
  ambiguous — most carry a tag they share with several other words, so
  no single ask ever fully pins anything down on its own. No two words
  in the full 50-word pool share an identical tag set (checked
  explicitly — several near-collisions, like Cream/Coconut and
  Caramel/Molasses, were caught and fixed this way).
- The menu is real, recognizable dishes/drinks/condiments — the menu
  itself is completely ordinary, only Indigo's way of pointing at it
  is strange. Each description is written like real menu copy and
  only ever mentions PART of an item's actual tags on purpose —
  reading the whole menu should never be enough to solve an order
  outright, just help narrow it down.
- Like the askable words, the menu is drawn from a pool of 50
  (ALL_MENU); each game picks 25 of them (MENU) at startGame() time
  via the same pickWords() quota logic — at least 4 items each tagged
  Food, Drink, and Spice/Condiment, then the rest filled randomly.
  MENU_TAG_FREQUENCY (used for the order-reveal elimination-value
  weighting) is recomputed from that 25-item pick each game, same as
  GLOBAL_TAG_FREQUENCY is for words. Every tag combination is unique
  across the full 50-item pool, not just within one game's 25.
- The original color tags (Red/Orange/Yellow/Green/Brown/White/
  Purple/Black/Clear) were retired after real playtest feedback
  showed they didn't work: color was the one tag axis a player could
  only learn by eyeballing a menu photo (every other axis is handed
  to them as text — a word's tags print right on its button, and an
  item's type is telegraphed by its menu section), and phone food
  photography is genuinely bad at exactly the hues that mattered —
  everything roasted/baked reads as the same indistinct brown. The
  distribution was also lopsided (Brown alone was 16 of 50 menu
  items) with two tags, Purple and Clear, functionally dead (1 and 0
  uses). Multi-tagging a second color onto ambiguous items was
  considered and rejected — a real menu just doesn't have enough
  naturally purple or clear dishes to fill those buckets honestly,
  and forcing a tag onto something that doesn't actually look that
  way defeats the point of a photo-legible tag.
- Replaced with a 9-tag physical-property axis: Liquid, Hot, Cold,
  Crunchy, Soft, Crumbly, Frothy, Smooth, Juicy. Chosen
  against a harder bar than color ever had to clear: every one of
  these has a real, non-forced example on BOTH the askable-word side
  (raw ingredients — Walnut is Crunchy, Wine is Liquid) and the menu
  side (finished dishes — Buffalo Wings is Crunchy, Old Fashioned is
  Liquid). This matters mechanically, not just thematically: TAGS is
  exactly 25 entries because there are exactly 25 hand-picked symbol
  icons, one per tag (see symbolMap in startGame()), and the Ask
  Indigo mechanic can only teach a symbol's meaning through words
  that actually carry that tag — a word's tags print in plain text on
  its own button, so a player can work backward from an ask response
  to which symbol means what. A tag that never appears on any word
  would be un-learnable through asking, only ever encountered
  passively during an order reveal with no clean way to confirm it.
  An earlier draft of this axis included Plated/Bowled/Wrapped/
  Poured — vessel/presentation tags — but those were dropped for
  exactly this reason: "how a dish is served" isn't a property a raw
  spice or ingredient word can honestly have, so none of them would
  ever have shown up in the word pool at all.
- Spice/Condiment menu items (Hot Sauce, Garlic Butter, Pico de
  Gallo, Whole Grain Mustard, Ranch Dressing, Balsamic Glaze, Honey
  Mustard, Chimichurri) were deliberately left out of the new
  physical-property axis — a bottled sauce or dressing doesn't have
  an honest Crunchy/Soft/Liquid/etc. the way a plated dish or a
  poured drink does. This is fine since the axis (like flavor) is
  multi-tag, not exactly-one — it's not a gap that needs filling.
- Removing color also removed a tag that had quietly been the only
  thing distinguishing several pairs of words/items that were
  otherwise flavor-identical (e.g. Chili vs. Garlic, both Spicy/
  Savory/Spice-Condiment; Pico de Gallo vs. Whole Grain Mustard, both
  Savory/Sour/Spicy/Spice-Condiment). Re-checked the full 50-word and
  50-item pools for duplicate tag sets after the swap and fixed every
  collision with a genuine distinguishing tag (Pico de Gallo picked
  up Fruity from its tomato base, since condiments don't get the new
  physical-property axis) rather than an arbitrary one.
- Nutty was kept in the flavor pool rather than cut, even though it
  was nearly as thin as the dead color tags (2 words, 2 menu items) —
  cutting it would have left TAGS at 24 instead of exactly 25, one
  short of the 25 hand-picked symbol icons. Floral and Smoky were
  also flagged as possibly dead going by menu-item count alone (1 and
  4), but checked out fine once counted across both pools together
  (7 and 7 words respectively) — the menu is just genuinely light on
  floral dishes right now, which is a content gap, not a broken tag.
- Real playtest surfaced a second bug in the physical-property axis
  itself: a player got a game whose word draw had Lemonade, Whiskey,
  Milk, and Soda Water as its only Liquid words — all four of which
  are ALSO Drink-typed, so there was no word in play that could ever
  isolate the Liquid symbol from the Drink symbol. Any subset of
  those four ties Liquid and Drink at the same count every time; the
  tie never breaks toward one specifically, because nothing in that
  draw ever had one tag without the other. Auditing every new-axis
  tag for this same problem (does EVERY word/item carrying it also
  always carry some other specific tag, pool-wide, not just this
  draw) found it was worse than one unlucky draw:
    - Frothy was ALWAYS Drink on both pools (only Coffee/Milk on
      words, only 4 drinks on menu — no food ever got it). Fixed by
      giving Cream (words) and Deviled Eggs (menu) a Frothy tag too —
      both genuinely whipped/aerated, neither is a Drink.
    - Smooth was ALWAYS Sweet AND Rich on words (Honey/Cream/Caramel/
      Chocolate all three). Fixed by adding Smooth to Butter and
      Yogurt — real, non-sweet, non-rich smooth textures.
    - Liquid itself wasn't structurally broken — Vinegar and Maple
      Syrup already existed as non-Drink Liquid words — but with only
      2 escape-valve words out of 50, a draw missing both wasn't rare
      enough. Strengthened by adding Liquid to Honey and Molasses
      (both genuinely liquid, neither a drink), bringing it to 4.
    - Fizzy and Sticky turned out to have NO possible fix: Fizzy was
      always Sour+Drink on words (Soda Water is the only real
      carbonated ingredient in the pool) and always Sweet+Drink on
      menu; Sticky was always Sweet on words (every sticky ingredient
      here — Caramel, Honey, Molasses, Maple Syrup, Pineapple — is a
      sugar). Unlike Liquid, there was no non-forced word anywhere in
      the 50 that could break either correlation. Retired both rather
      than fake an example, matching the same standard color got held
      to (Purple/Clear were cut for exactly this reason).
  Replaced Fizzy and Sticky with Hot and Cold, checked against the
  same bar as the rest of the axis (real examples on both pools, not
  locked to an existing tag): Hot spans Food (most hot entrees) AND
  Drink (Irish Coffee, Hot Chocolate); Cold spans Drink (most cold
  cocktails) AND Food (Caesar Salad, Deviled Eggs, Pumpkin Pie, etc.),
  so neither is purely a restatement of Food/Drink. On the word side,
  Hot leans on real warming-spice associations (Ginger, Chili,
  Cinnamon, Cardamom, Turmeric, Curry Powder) plus Coffee/Tea; Cold
  leans on Soda Water, Mint (a genuine cooling sensory property, not
  just serving convention), Milk, Yogurt, and a few customarily-
  chilled fruits (Grapefruit, Lime, Berry, Blackberry) — deliberately
  left off words with no honest temperature association rather than
  forcing it onto all 50. Re-verified the full pool afterward: no
  duplicate tag sets, no vocabulary errors, and — the actual bar that
  matters — zero words-side lock issues left in the new axis (the
  menu side still has some tags skewing Food, e.g. Crunchy/Juicy, but
  that doesn't block the Ask mechanic the way a words-side lock does,
  since menu items aren't askable).
- All 50 ALL_MENU items now have real photos in images/menu/, resized
  to a max dimension of 800px and re-encoded (mozjpeg, quality 82) to
  keep file sizes in line with the original 25 (each new photo landed
  well under 100KB after compression, down from as large as ~9-10MB
  straight off a phone).
- The menu list is grouped into three sections (Entrees / Drinks / On
  the Side), matching each item's Food, Drink, or Spice/Condiment tag
  one-to-one. This is deliberately NOT a mystery — like a word's own
  tags in the ask grid, an item's basic category is common knowledge,
  so a hint like "his order is Food" should never be ambiguous just
  because a condiment could read as food or not in real life. This
  means those three type tags can never appear together on one item
  (a condiment like mustard is tagged Spice/Condiment only, not also
  Food) — clean one-section-per-item was chosen deliberately over
  double-tagging, since a menu section can't show an item in two
  places at once anyway.
- A word's own tags are shown right on its button in the word grid —
  they're meant to be common knowledge, not part of the mystery. The
  only real unknown is which of Indigo's symbols means which tag.
- The decoder ("Your Notes") is a pure scratchpad — the game never reads
  the player's picks, it's just where they record their own working
  theory of what each symbol means.
- Symbol icons are 25 hand-picked Material Symbols icons (SVG), inlined
  with fill="currentColor" so CSS controls color per context (reveal,
  negated, log, seen-symbols line, decoder picker). See svgs.txt in the
  repo root for the source/curation list. Deliberately nothing that
  reads as a literal picture of a tag's meaning (a flame, a drop),
  since a literal icon would bias what players assume a symbol means
  before they've earned that knowledge.

UI NOTES
- The order line is split into two halves: "His answer" (his honest
  best-guess response to the player's most recent ask) and "His order"
  (the current reveal, with negation). The full ask history still lives
  in the scrollable log under "Ask Indigo" — the order line only ever
  shows the latest answer.
- The decoder grid uses min-width: 0 on its cells so a long label
  (Spice/Condiment, shown abbreviated as "Spice/Cond" to fit) can't
  force its whole grid column wider than the others.
- A native <select> can't show SVG options, so the decoder's symbol
  picker is a custom modal (button opens a shared picker grid of all 25
  icons) instead.
- The "Your Notes" panel is a free-floating, draggable, minimizable
  panel (same pointer-event drag pattern as the corkboard pins on
  character pages, just repositioning the whole panel in fixed viewport
  coordinates instead of a pin within one board).
- The minimize button ignores a click that lands right as a drag ends
  (a `moved` flag set once the header's been dragged past a 4px
  threshold), so releasing the panel with the cursor sitting over the
  button doesn't also toggle it. That flag used to only get cleared
  inside the minimize button's own click handler, which meant it
  stuck at true after any drag that DIDN'T end over the button — the
  normal case, since dragging is for repositioning the panel
  somewhere else. The next real click on minimize, completely
  unrelated to any drag, would then get silently eaten by that stale
  flag, needing a second click to actually work. Fixed by clearing
  the flag on a 0ms setTimeout inside endDrag() instead — long enough
  to still suppress a click from the exact same drag-release gesture
  (which fires synchronously, same tick), but cleared before any
  later, separate click could see it.
- The panel container (.it-notes-float) needs `overflow: hidden` —
  without it, the header's own border-radius (top corners only, since
  it squares off where the body begins) didn't match the outer
  container's border-radius (all four corners) once minimized, and
  the header's bottom edge sitting flush against the container's
  rounded bottom corners left a sliver of the container's own
  background showing through as a visible seam. `overflow: hidden`
  makes the container clip anything inside it to its own rounded
  shape regardless of the header's own radius, which also fixes it in
  fullscreen mode. Safe against the symbol picker modal specifically
  because that's a sibling element in the DOM (#itSymbolPicker), not
  a child of .it-notes-float, so it was never at risk of being clipped.
- A "CLEAR 🔴 🟡 🟢 ALL" button sits above the decoder grid (separate
  from Restart) that wipes every red/yellow/green marker dot in one
  click, without touching the player's actual symbol picks. Added
  because the markers are meant as disposable per-round scratch
  marks, but the picks are the player's accumulated theory of what
  each symbol means and persist for the whole game — clearing them
  together would throw away real progress along with the scratch
  state. A second, separate "Clear board" button next to it clears
  BOTH markers and picks at once, for when the player wants to wipe
  their whole working theory without a full Restart (which would also
  reshuffle the word/menu pools and reset the timer/progress).
- A "THRU" toggle in the header lets the player click through the
  panel to whatever's underneath it on the page, without moving it
  out of the way first. Implemented as `pointer-events: none` on the
  whole panel while active — this both makes clicks/drags pass through
  to the page below AND locks the panel in place (dragging is just a
  pointerdown/pointermove/pointerup sequence on the header, so with
  pointer-events off, none of those ever reach it), which is why one
  property covers both things the player asked for. The toggle button
  itself keeps `pointer-events: auto` as an explicit override so it
  stays clickable to turn the mode back off even while everything
  else in the panel is inert. Whatever opacity level was set before
  toggling stays as-is — touch-through doesn't change it.
- The timer is a stopwatch, not a countdown, while the deduction loop
  itself is still being tuned — a clock that could cut a player off
  before they've even learned the system would add frustration on top
  of a mechanic not yet proven fun. It counts up and never ends the
  round on its own; the win screen just reports how long it took.
- A "How to Play" overlay covers the board (dimmed underneath) on first
  load, so the stopwatch and the board itself both stay inert until the
  player clicks "I'm Ready" — reading the rules shouldn't already be
  costing them time. The whole game is fully set up underneath while
  the overlay is up (words, menu, decoder already rendered) so nothing
  flashes or re-shuffles when it's dismissed; "I'm Ready" just unpauses
  it. Clicking RESTART (mid-game or on the end screen) skips the rules
  overlay entirely and jumps straight into a fresh game, since at that
  point the player already knows how to play. A separate "How to Play"
  button next to Restart re-opens the same overlay mid-game to pause
  and re-read the rules — this does NOT reset anything (same words,
  same order, same notes), it just freezes the timer/interactivity
  until "I'm Ready" is clicked again.

DEFERRED / NOT YET DONE
- Real symbol art beyond the current icon set, if desired.
- Anything the playtest round surfaces.
- Hard mode idea (not started): hide each word's own tags on its
  button in the Ask Indigo grid, showing only the ingredient name, so
  the player has to work from memory/assumption about which words
  carry which trait instead of reading it straight off the button.
  Explicitly flagged by the user as a later addition, not now.

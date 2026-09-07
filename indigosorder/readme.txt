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

Rather than a flat chance of showing a negative, every candidate reveal
(each of the order's true tags, plus — after the player's first guess —
every tag it lacks) is weighted by how many of the 25 menu items it
would actually rule out, then 3 are drawn without replacement weighted
by that value:
  - Revealing "the order HAS tag T" rules out every item that lacks T
    (rarer tags rule out more, since fewer items have them).
  - Revealing "the order does NOT have tag T" rules out every item that
    HAS T (commoner tags rule out more, since more items have them).
Indigo isn't rolling dice on whether to say "no" — he leans toward
whichever fact, positive or negative, narrows things down the most,
while still leaving room for a weaker signal to come up sometimes
instead of the same three "best" facts every round. (Weighted sampling
without replacement, Efraimidis-Spirakis method: give every candidate a
random key skewed by its own weight, take the top 3 keys.)

Negatives are withheld entirely before the player's first guess of the
whole playthrough — playtesting showed the seen-symbols list ballooning
too fast once negatives (drawn from all 20+ tags NOT in the order,
versus only the 5-6 that are) started mixing in from turn one.
Withholding them during that same early window as the ASKS_PER_GUESS
buffer (below) gives the player a small, honest set of real symbols to
get their footing on before the pool of "seen" symbols starts growing
faster.

GUESS BUFFER (ASKS_PER_GUESS)
A guess only unlocks once the player has asked enough times — otherwise
a wrong guess costs nothing but a single ask before trying again, which
makes guessing effectively free. That buffer only matters before the
player's very first guess of the whole playthrough: by the time they've
made one, they've already picked up a few symbols along the way, so
every guess after that unlocks after a single ask.

DATA DESIGN NOTES
- Every tag lives in one flat pool — flavor, type, and color are not
  separate axes, just different flavors (so to speak) of the same kind
  of fact about a word or menu item.
- The 25 askable words are deliberately ambiguous — most carry a tag
  they share with several other words, so no single ask ever fully pins
  anything down on its own. No two words share an identical tag set
  (checked explicitly — Cream/Coconut originally collided and Coconut
  was changed to fix it).
- The 25-item menu is real, recognizable dishes/drinks/condiments — the
  menu itself is completely ordinary, only Indigo's way of pointing at
  it is strange. Every tag combination is unique. Each description is
  written like real menu copy and only ever mentions PART of an item's
  actual tags on purpose — reading the whole menu should never be enough
  to solve an order outright, just help narrow it down.
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
  reads as a literal flavor/color picture (a flame, a drop), since
  several tags ARE colors and a literal icon would bias what players
  assume a symbol means before they've earned that knowledge.

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
- The timer is a stopwatch, not a countdown, while the deduction loop
  itself is still being tuned — a clock that could cut a player off
  before they've even learned the system would add frustration on top
  of a mechanic not yet proven fun. It counts up and never ends the
  round on its own; the win screen just reports how long it took.

DEFERRED / NOT YET DONE
- Real symbol art beyond the current icon set, if desired.
- Anything the playtest round surfaces.

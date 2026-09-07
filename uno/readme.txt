Uno — design notes (uno.js)

Uno against The House, 2-4 players (you + 1-3 House seats). Turn
order runs through a seat array plus a direction flag so Reverse
actually does something once there's more than one House seat. House
Rules mode adds: slap-on-5, +2/+4 stacking, 7-0 (swap/rotate hands),
and jump-in — all generalized to work with any seat count.

Deck: standard 108 cards — 4 colors x (one 0, two each of 1-9, two
Skip, two Reverse, two Draw Two) + 4 Wild + 4 Wild Draw Four.

SEATS
seatOrder is the fixed rotation order for the round: always starts
with 'player', then 1-3 House seats. `direction` (+1/-1) combined
with nextSeatId() is how Reverse actually changes anything once
there's more than one House seat to reverse past.

Each House seat plays a little differently:
- The House: sharp — always takes the best available card, saves
  wilds, calls colors and stacks with full confidence.
- Journal: sloppy — friendly but not paying close attention, picks
  pretty much at random among whatever's legal.
- Mirror: soft — mostly sharp, but would rather not put you on the
  spot. Sometimes plays a plain number card out of pity when she
  could've hit you harder, and is reluctant to pass a stack your way.

UNO-CALL BUTTON
Drops the Uno button at a random spot in the viewport — makes
catching it a reflex thing instead of a predictable click target.
Bails out to the normal in-flow position on very small viewports
where a fixed overlay could otherwise land off-screen or on top of
unreachable content. It's visible any time you're sitting on one
card and haven't called it yet — not gated to your turn, since the
risk window is "before someone else's next move," which can land
mid-opponent-turn. It jumps to a fresh random spot only on the
hidden->visible transition, not on every render, so it's a "spot it
and click it" reflex moment rather than a target that keeps sliding
around.

HOUSE RULES: SLAP-ON-5
Whenever a 5 lands on the discard pile, everyone at the table races
to tap it — every House seat gets its own random reaction time, and
the player has to click. Once everyone but one seat has slapped, that
last holdout is the loser and draws 2. With only one House seat this
collapses back to the original 2-player race. There's a hard deadline
in case the player never clicks at all (covers the worst-case House
reaction time plus a beat), and the wait ends early once every seat
but one has slapped — no reason to keep waiting out the rest of the
window once the loser is already determined. The pulsing prompt stops
for the player the instant their own slap lands, even if the race is
still waiting on other House seats to react — otherwise it keeps
flashing until everyone's done and looks like the click didn't
register.

HOUSE RULES: +2/+4 STACKING
Getting hit with a Draw Two/Four doesn't have to mean drawing — if
you're holding a Draw Two or Wild Draw Four of your own, you can play
it back on top instead, piling the count onto whoever's stuck holding
it next. Any Draw Two/Four stacks onto any other, color doesn't have
to match. You get a short window to click one before it's assumed you
don't have one (or don't want to use it) and the whole pile lands on
you. Clicking the draw pile during your own stack window voluntarily
takes the pile now instead of waiting out the window.

Whether a House seat bothers stacking a Draw Two/Four it's holding,
rather than just taking the pile: sharp always does; sloppy mostly
does, no real strategy behind it either way; soft (Mirror) hesitates
more, and especially doesn't want to pass the pile on to you.

Reactions to actually getting hit by a stack (not just playing one)
are scaled to how bad the pile is. Only Journal and Mirror react out
loud; The House stays quiet as always.

HOUSE RULES: JUMP-IN
If you're holding the *exact* same card (color and value) as the
current top of the discard pile, you can play it the instant you spot
it — even out of turn — cutting the line. Any House seat gets the
same chance while it isn't their turn: a short random delay, then a
coin-flip on whether it takes the opening. How eager a seat is to
jump in when it spots the chance: sharp pounces most of the time,
sloppy is a coin flip, soft mostly lets it go by (especially since
jumping in ahead of you cuts your turn short, which isn't very Mirror
of her).

HOUSE RULES: 7-0 (SWAP / ROTATE HANDS)
At 3 cards or fewer, a House seat is close enough to winning that it
won't risk being the one who sets the player back — redirect for
sure. Otherwise it's just a general reluctance to undercut the
player.

DECK RESHUFFLE
If the draw pile runs out, the top discard is kept in place and the
rest of the discard pile is shuffled back into the draw pile. If
truly nothing is left in either pile (nothing but the top discard
card exists), there's genuinely nothing left to draw.

PACING / DEALING
One pacing constant governs every House pause — the opening move and
every move after it — so the deliberate, unhurried feel is consistent
through the whole round instead of just the first turn. dealGame()
builds a fresh shuffled round, deals with a staggered visual
animation, then pauses before the round opens. Bailing back to the
Start screen without finishing the round is used when the ruleset is
switched mid-game, since silently changing rules partway through a
hand doesn't make sense — that switch is blocked entirely while a
round is actually live.

The first discard can't be a wild — the deck keeps drawing until it's
a color card. The opening actor is always the first House seat, but a
Skip/Reverse/Draw Two flipped as the starting card can change who
actually goes first, or (with 3-4 players) flip turn direction before
anyone's moved at all.

FLAVOR DIALOGUE
The House barely talks — on rare turns it just gets an "..." logged,
no comment attached. Journal and Mirror are chattier: the odd one-off
remark on their own turn, or (when they're both at the table) a short
back-and-forth logged as two lines a beat apart, like they're talking
past you rather than to you.

The shared speech bubble is positioned directly above whichever seat
is "speaking" — computed once at show time (like the Uno-call
button's random placement), not tracked continuously, so it doesn't
need to survive the House row's per-render rebuild. sayLine() is
shared by every event-reaction line — logs it and pops the bubble in
one call instead of repeating both at every call site; log entries
are always ordered [speaker, line, replier, reply].

Event-reaction lines (beyond the general idle banter) are kept as
small tables so each event's handler can just pick a line and call
sayLine — see each event's own call site. A deal counter is bumped on
every new deal so a delayed round-end reaction line scheduled just
before the round ended can't leak into a round the player already
restarted into.

RENDERING
Card backs use the same house-silhouette SVG the Crossroads token
uses, so the back reads as "The House" instead of a plain letter. A
small copy repeats in opposite corners, same as a real Uno card
back's corner pips — the center one stays full size, the corner ones
are sized down via the .uno-mini-house CSS class. Face-up cards get
the same corner pips, but as a plain white outline rather than a
solid fill — reads more like a card's rank/suit corner marker than a
repeat of the big house logo.

A "just dealt" flag is set true only for the render() call right
after the initial deal — gives every freshly-placed card a staggered
"dealt in" animation instead of just appearing, then is cleared right
after so normal plays/draws during the round render instantly, same
as before.

The direction indicator is only meaningful once there's more than one
House seat for Reverse to actually reverse past — a 2-player game has
nothing to show. It's rotated so it always reads starting from "You"
regardless of which way play is actually running, and flashes on a
direction change so a Reverse is impossible to miss.

During your own stack window, only Draw Two/Four cards are
clickable — normal color/value matching doesn't apply, any stack card
works. The draw pile is locked (visually and via the click handler)
once you're holding a playable card — you have to play it before
you're allowed to draw again.

TURN RESOLUTION
Drawing itself is evidence you didn't call Uno in time — the card
count is about to change either way, so there's no window left to
call into. The catch happens on the seat itself, right before it
draws.

Color-choice behavior for a wild: a seat has a chance to just pick a
random color instead of the one that actually suits its hand (how
"sloppy" its color sense is); the sharp heuristic is whichever color
that seat holds the most of.

Card choice among whatever's legal, colored by personality:
- sharp: always the best pick — a non-wild match first, wild only as
  a last resort.
- sloppy: picks at random among every legal card, wilds included, no
  attempt to save them for later.
- soft: usually plays sharp, but sometimes pity-picks a harmless
  plain number card over a stronger option — more likely to hold back
  when it would otherwise hit the player specifically; falls through
  to the sharp pick when there's no gentle option available.

Landing on exactly one card starts (or restarts) that seat's Uno
clock. Growing back past 1 later (a draw penalty, etc.) just makes
those checks irrelevant again on their own — nothing to clean up
explicitly. A Draw Two/Four is stacked instead of resolved
immediately (see handleStackResponse) when the receiving seat chooses
to.

DRAW-UNTIL-PLAYABLE (player)
House rule: no single-draw-then-pass, and no auto-play either. Each
click draws exactly one card. A non-match just grows your hand and
you click again yourself. A match stops you there — it's added to
your hand playable, the draw pile locks (see hasLegalCard()), and you
have to click the card yourself to actually play it. If you already
have something playable, that gets played first before any drawing
happens.

HOUSE AI
The same "draw until playable" rule applies to every House seat — no
single draw-then-pass for them either. Since render() rebuilds the
whole row from scratch, a freshly added card back is popped in
explicitly (rather than letting the row just jump straight to its new
length) so it's always the last child with its own entrance
animation.

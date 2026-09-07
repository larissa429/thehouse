Floor Plan — design notes (floorplan.js)

The House doesn't have one fixed interior, so every page load carves a
fresh set of rooms with a small generator instead of using one
hand-drawn map — but it's not just "chop a box into smaller boxes."
Every floor is built around a central corridor, with rooms attached
along both sides of it, the way an actual floor plan reads:
circulation space down the middle, rooms lining it. Floors 1 and 3 are
both "hangout" floors drawing from the same weighted room pool; floor
2 is one long stretch of bedrooms, doors lining both walls of the
hallway. A colored dot per resident sits wherever they've actually
landed this load — nobody shows up somewhere they aren't, bedrooms
included. Tap a dot to see who it is. Two extra, much rarer things can
appear alongside the normal rooms: the Locked Door and the Hidden
Door (see below).

A brief full-viewport white pulse (a dedicated element, sitting above
note-overlay so it flashes over the dark card, not just behind it —
created once and toggled via class rather than rebuilt per use, same
as roomTipEl further down) plays when the hidden door breaks.

TUNABLE ODDS
A dedicated block of constants near the top exists specifically so
these numbers can change later without touching anything else:
- Rare-room odds per load (any resident but Journal), the odds a
  present resident is just in their own room today, how many extra
  room-pool rolls floors 1 & 3 get past the staple rooms (and per
  extra slot), which rare rooms are floor-1-only / floor-2-only
  (Penny, an even rarer find).
- Ambient wandering: how often a dot might decide to wander at all,
  the odds a wander check actually moves someone, walking speed (ms
  per viewBox unit of distance) with a floor (so a short hop isn't
  instant) and a ceiling (so a long hallway leg isn't glacial).
- Closeness thresholds: a bond weaker than CLOSENESS_PLACEMENT_THRESHOLD
  (either direction) is just noise, ignored entirely rather than
  giving every mild acquaintance or minor friction a say. A real bond
  for bedroom-visiting purposes is positive-only and higher still —
  "close enough to actually hang out in their room," not just "close
  enough to notice." A bedroom stops being visitable once too many
  people are already in it.
- Social reactions: odds someone left behind tags along, per point of
  closeness with whoever just left (a +9 bond is roughly 72%); Cool
  S/Clickbaity get a stronger, flatter chance than the closeness math
  gives anyone else. Odds someone already in a room leaves when a
  disliked arrival shows up, per point of negative closeness. A bond
  at or below HARD_AVOID_THRESHOLD isn't just unlikely to end up in
  the same room — it never happens at all, placement or wandering, no
  exceptions (currently only Journal/Blue Marble).

RESIDENTS
Colors match each resident's existing connection-note color in
styles.css (.note[data-color]) — nothing new invented there. Clickbaity
is the one real gap (he used to share a color with Cool S, since they
were one page) and gets the site's existing red accent instead.

defaultChance is how often a resident with a defaultRoom actually goes
there instead of falling through to the normal closeness-biased pick
— omitted means "always" (Mirror really is in the kitchen constantly).
AP and PBC both default to the bathroom, which reads wrong if it's
guaranteed every single load — a bathroom is a quick stop, not a
hangout, so it's a coin-flip-ish chance instead.

Special per-resident flags:
- tolerant (Charlie): doesn't really dislike anyone — even his worst
  numeric bond (Blue Marble) is closer to something SHE can't stand
  about being near HIM than the reverse. His own placement and
  wandering never treat a disliked-by-others room as somewhere to
  avoid, and he never rolls to flee an arrival, no matter the bond.
  Someone else's dislike of him (PBC's -7, Blue Marble's hard avoid)
  still works exactly as it always has — this only ever suppresses
  HIS side of a reaction, never theirs.
- Isolated residents (e.g. N528) start home in their own room more
  often than most (a bedroomStayChance override on top of the general
  BEDROOM_STAY_CHANCE) — wandering itself works the same for them as
  anyone else once they're out.
- Daisy-type "starts in her trashed bedroom" (noHangoutDefault):
  placed there every load she's home, but not stuck there for the
  whole visit — wandering works normally from there too.
- bedroomOf(): finds a resident's own bedroom room object on floor 2,
  the same way generateHouse's internal bedroomOf() does — used
  outside placement, by a resident retreating there mid-visit from a
  hangout floor.
- STAPLE_ROOM_NAMES: every layout function fills slots by walking its
  room-name list in order, and the staples are always concatenated
  first — so without forcing that order, "Kitchen & Dining Room" (etc)
  would land in the same early slot almost every load regardless of
  which shape or extra rooms show up.

CLOSENESS GRAPH
Pulled from each character's own Connections section, not invented.
Positive pulls two residents toward the same room; negative pushes
apart. Always a soft bias for placement, never a hard rule (except
the explicit hard-avoid list below). Scale is -10 to 10, not just -2
to 3 — the old narrow range meant every strong bond used the same top
value, fusing most of the cast into one indistinguishable "everyone's
best friends" blob at placement time. Widening it lets real
differences in closeness actually separate people into distinct
friend groups.

HARD_AVOID_THRESHOLD: unlike the ordinary soft closeness bias
(down-weighted, never excluded), a bond at or below this removes a
room from consideration entirely — currently only Journal/Blue
Marble. Used by both initial placement and every wander/flee
destination pick, so it holds for the whole visit, not just the first
load. Falls back to the unfiltered list if literally every candidate
would be excluded, rather than leaving nobody anywhere to go.

ROOM POOL
One flavor line per hangout room, shown when its box is clicked —
bedrooms don't get one of these at all, just the occupant list.
Optional author-picked "casts": if the room spawns AND everyone in
its cast is home, there's a chance (its own per-room odds) the whole
scene actually happens.

CORRIDOR-AND-DOORS GENERATOR (straight floors)
Every floor is one central corridor with rooms lining both sides —
half the room list along the top wall, half along the bottom —
instead of recursively slicing the whole canvas into a grid. That's
the actual point of it: real negative space (margins, the corridor
itself) instead of every square inch being "a room," which is what
made an earlier generator read as a box getting subdivided rather
than a floor plan. `doorPoint` is where each room meets the corridor
— the waypoint ambient wandering routes through, sitting on the
corridor's TRUE centerline (not its near edge), so a wandering dot's
route reads as walking down the middle of the hallway, not hugging
the wall it just stepped out of.

BENT HANGOUT FLOORS (L / U / O)
A different hallway shape for variety, on top of the room-content
variety the pool already gives. These trace one, two, or three sides
of a shared inner square (L / U), rooms on BOTH sides of every used
segment the same way the straight floor has rooms on both sides of
its one corridor — an outward row (away from the inner square, full
segment length) and an inward row (into it, inset from both ends via
CORNER_INSET so two segments meeting at a corner never reach into the
same square inch). The inward row draws its own small second batch of
extra rooms rather than splitting the outward batch thinner, so both
sides actually end up populated instead of the inner row being an
afterthought.

O is the exception: all four sides, single row each (outward only),
because the inner square is reserved for a Courtyard that always
fills it completely — the payoff for going all the way around instead
of a real second room row.

Segment rects extend past the segment's own from/to by its
half-thickness at both ends — a segment's rect otherwise stops
exactly at the shared corner point, which covers the *inner* corner
(both segments reach it) but leaves the *outer* corner of the turn
uncovered by either one, reading as a notch bitten out of the hallway
right at the bend. Each shape lists its possible segment
combinations; one is picked at random so an "L," say, can land on any
of its four possible corners.

CORNERS is the 4 fixed points where perimeter segments meet, and
which two corners each segment's centerline runs between — used to
route a wandering dot through the actual turn(s) between two
different segments, rather than a straight line cutting across the
bend.

Per-row layout: rowSign is which way a row extends from the corridor
(seg.outSign for outward, -seg.outSign for inward). alongFrom/To
optionally narrow the usable stretch of the segment (used to inset
the inward row away from corners). segKey identifies which side of
the perimeter this is (top/right/bottom/left) — tagged onto every
room it produces so wandering knows which corridor segment a room
opens onto, for routing through the right corner(s) between
segments. doorPoint sits on the corridor's true centerline (seg.pos),
same reasoning as the straight floor.

O's Courtyard room is bordered by all four ring segments, not just
one — its `doors` array gives wandering a direct exit toward whichever
side the destination is actually on, instead of always leaving north
and walking the long way around the ring no matter where it's headed.
doorPoint/seg stay as a plain fallback for anything that isn't
pathing-aware (e.g. the hidden door borrowing a random doorway).

Only ONE segment per floor ever hosts an inward row, not every
segment — two different segments' inward rows both reach toward the
same shared corner (their depth, not just their length along the
wall), so any pair of them can collide there regardless of how much
each is inset lengthwise. With a single inward row there's nothing
left for it to compete with, so no corner math is needed at all.

Floor 2's bedroom-lined hallway uses thin door slots, not deep rooms
— meant to read as "a very long hallway with bedroom doors lining
it," not a row of little rooms.

Empty-wall-gap math (used for the hidden door): a room's near edge
(the boundary facing the corridor, where a door actually is) and its
footprint along the wall are computed the same way for a real room
and for a phantom rect standing in for an empty stretch, so an empty
stretch's computed edge is guaranteed to land exactly where a real
room's own edge would. A phantom outward-row room spans a whole
segment; a phantom inward-row room only exists for one segment per
floor (same "only one inward row" rule as above) and is inset by
CORNER_INSET like a real one. Finding a hidden-door spot means
finding anywhere a room COULD sit but doesn't right now: the margin
before the first room or after the last one in a row, the seam
between two neighboring rooms, or (most often) a whole segment that
came up with zero rooms at all, since the room-name list doesn't
always divide evenly across however many segments a shape has. A gap
has to actually be big enough to hold a door (a bit more than the
door mark's own footprint) — the cosmetic seam between two adjacent
rooms, or a sliver of leftover margin next to a corner, is real empty
wall but nowhere a door could plausibly fit. A row with zero rooms at
all doesn't produce a group to check (nothing to group), so it's
checked separately using the same phantom rects.

WHOLE-HOUSE GENERATION
The hidden door itself sits in a gap of empty wall between two rooms
on Floor 1 specifically — reads as a second, unmarked door built into
the wall, works the same regardless of which hallway shape Floor 1
rolled. Some loads just don't have a wall gap big enough anywhere,
and that's fine — it simply doesn't spawn that load rather than
forcing it into a spot too small to actually be a door. Bedrooms get
one door per resident, plus a rare chance of The Locked Door.

Who's home: Cool S and Clickbaity are inseparable — if either's home,
both are.

Casts are author-picked GROUPS, not weighted room candidates — they
bypass the normal closeness-biased pick entirely, so a hard avoid
needs its own separate check here, or a cast scene could still force
two people together despite it (Karaoke Bar & Grill's cast, for one,
lists both Journal and Blue Marble). Resolved with a greedy pass in
list order: whoever's confirmed to attend first stays; anyone
hard-avoiding an already-confirmed attendee sits this one out instead
of skipping the whole scene over one conflict.

Placement order: (1) rare-room casts get first pick, if their room
actually spawned and (mostly) everyone in it is home; (2) everyone
else who's home is either just in their own room today or out — a
resident is only ever placed in exactly one spot total, bedroom
included, so a bedroom dot always means "actually in there right
now," never just "this is whose room it is." A close-enough friend's
bedroom counts as a hangout candidate too, once its owner has
actually settled in there for the day — only for a bond real enough
to be worth going to someone's room for, capped so it never turns
into a second living room.

pickRepulsionWeightedRoom: weight every room by how positive/negative
its current occupants read for this resident, then roll against
those weights. Rooms with no signal at all still get a small base
weight so everyone has somewhere to land. Below
CLOSENESS_PLACEMENT_THRESHOLD a bond doesn't count at all here — only
real closeness or real friction should ever bias where someone
lands. A tolerant resident never lets friction push them away from a
room — only the positive side of a bond ever counts for them.

Whoever rolled absent this load is tracked in roster order, separate
from any floor, since not-home means not placed anywhere at all, not
just off the currently visible one.

RENDERING
currentFloorIndex tracks which of house.floors is on screen.
pendingMoveSlugs tracks who's currently mid-travelTo, independent of
any DOM element or class — switching floors while someone's animation
is still in flight wipes the whole layer (renderStage rebuilds it
from scratch), destroying that dot's node before its onDone ever
fires. The orphaned animation's callback still runs later and still
mutates the room data correctly, but a freshly re-rendered dot for
that same resident (created next time their floor is viewed) starts
without the is-wandering class, since it's a brand new element that
never got marked — so a DOM-class check alone can't tell a second,
unrelated tick that this resident is still actually mid-move. This
plain object can, because it isn't tied to any one element's
lifetime.

Dot layout inside a room: a small flow-wrap grid of offsets so
multiple residents in one room don't stack exactly on top of each
other. A bedroom is much shallower than a hangout room (rect.h ~9 vs
15+), so wrapping to a second row there puts the rows too close
together to actually clear each other — force a single row instead.
Dots shrink a little once a room gets crowded (a rare-room cast of up
to 8 people, or a bent floor's narrower single-row rooms, don't
always agree with the grid on how much space there is) rather than
letting a full cast scene overlap itself in a room sized for two or
three; a narrow (bedroom-depth) room needs to start shrinking sooner
than the normal >4-person crowding rule, since it has less width to
spread dots across.

Room labels: perimeter rooms are one row (not two), so they're
narrower than the straight floor's rooms — a long name like "Karaoke
Bar & Grill" won't fit at a fixed size next to a short one like
"Foyer." Each label is sized to the room it's actually in instead of
guessing one size for all (an approx width-per-em constant for the
label font drives the estimate).

The corridor itself is drawn as one <path> with one subpath per
segment, not separate <rect> elements — overlapping segments (every
corner where two meet) would otherwise each composite their own
translucent fill, doubling up right where they cross and reading as
boxes stacked on each other rather than one hallway. Wound
consistently, a single path's overlapping subpaths merge into one
flat region instead.

The Locked Door gets a room box like everywhere else, on purpose left
unlabeled — it's supposed to look like an ordinary bedroom door until
you actually open it.

Room hit-testing: each room's invisible tooltip-hit target sits below
the resident dots in DOM paint/hit-test order — hovering or clicking a
dot is about that resident, hovering or tapping anywhere else in the
box is about the room itself. A tap fires a click with no prior hover
on touch devices, so the click handler is what actually opens the
tooltip there — pinned open so it survives until the next tap
elsewhere, since there's no hover to hold it open in the meantime.

Clickbaity's own marker is a hollow red circle — an outline instead of
a filled dot reads as more "him" specifically than just another
colored disc. Penny's room stays visually ordinary — a plain
unlabeled room box with just a small grey marker inside, easy to
mistake for any other empty room until clicked.

HIDDEN DOOR
A rare, unlabeled door built right into the wall itself — a thin line
running along the wall, not a room's own doorway. Clicking it brings
the door itself up close (openHiddenDoorCard) instead of reacting
right there — walking up and actually trying it are two deliberate,
separate steps. The line itself runs parallel to whichever wall it
landed on: a horizontal wall (axis 'h') gets a horizontal line, a
vertical wall a vertical one.

The close-up card's background matches the floor plan's own stage
color (--wall) rather than a neutral gray — this is still a piece of
the house, not a separate glimpse into nothing. The door image itself
is recolored to read directly against that dark card (see the CSS)
rather than sitting on a light patch of its own. Closing the card any
other way (the ×, the backdrop, Escape) leaves the door exactly as it
was, findable again later — only actually trying it (clicking the
door within the card) commits to breaking it for good. It's rendered
as a masked shape, not a plain <img> (see the CSS for why: door.png
only supplies the alpha shape here, so there's no real image content
for alt text to describe — an aria-label stands in for one instead).

The door doesn't budge when tried — it breaks. A screen-wide shake and
flash sell that as the intended outcome instead of a stray click
doing nothing, then the door (and the card showing it) is gone for
good, same as an earlier single-click removal used to be.

A resident's dot color is picked to be vivid and distinct as a small
dot, which makes a lousy full-card background — dark text needs a
light ground under it. The resident-note popup blends the color
toward white for its background instead of using it at full
strength; the dot itself stays untouched.

WANDERING (ambient movement)
Wandering avoids (softly, never absolutely — except a genuine hard
avoid, filtered out first) a room someone has real friction with,
using the same CLOSENESS_PLACEMENT_THRESHOLD as initial placement, so
a passing acquaintance never factors in, only an actual grudge. A
tolerant resident skips this downweighting entirely — friction with
whoever's in a room never steers them away from it.

The full candidate list for where a resident could wander right now:
any hangout room on floor 1 or 3, their own bedroom, or a
close-enough friend's bedroom that's home and not already full — the
same rule initial placement itself uses to decide a bedroom visit is
plausible at all. Excludes the room they're currently in; hard-avoid
filtering happens later, inside whichever weighted-pick function this
list ends up feeding.

Follow/flee reactions: everyone left behind independently rolls
whether to tag along — each roll is only about that one person's own
bond with whoever just left, never about whether anyone else already
decided to follow. Cool S/Clickbaity use a flatter, stronger roll
instead of the closeness math everyone else gets. In reverse,
everyone already in the destination room independently rolls whether
the new arrival is enough to make them leave, based only on their own
bond with whoever just walked in, never on whether anyone else in the
room also flees. A tolerant resident never rolls to flee at all —
whoever just walked in, they're staying put.

travelTo(dot, fromRoom, toRoom): fromRoom is always on the CURRENTLY
VISIBLE floor (that's the only place a real dot to animate exists at
all) — toRoom might be too (a normal walk through the shared
corridor), or might be on an entirely different floor, which has no
physical corridor connecting it to this one. For a same-floor move,
the dot stays and gets repositioned. For a cross-floor move, the dot
walks to the edge of the CURRENT floor (implying a stairwell just
past it) and then simply vanishes — added to the destination's
occupants directly in the data, since that floor isn't rendered right
now, and will be accurate whenever the user actually checks it.

A floor switch mid-animation wipes layerEl and rebuilds it from
scratch at least once more before a travel callback runs — that
orphans the original `dot` node, and if the switch lands back on this
same floor before the animation finishes, a brand new node gets
painted for this slug from the (still pre-move) data. Whichever node
is live right now — not necessarily the one this animation started on
— is the one that has to end up reflecting the data mutation;
operating on the stale `dot` reference instead would either re-attach
an orphan alongside the fresh node, or silently update a detached
element nobody sees while the fresh one keeps showing the resident in
the room they already left, ready to be re-selected and duplicated on
a later tick. So travelTo always re-queries for the live node rather
than trusting the reference it was called with.

Every room's invisible tooltip-hit button is appended to layerEl
before that room's own dots, so a dot painted in its original room
sits safely above its own room's hit button — but the dot's position
in the DOM never otherwise changes when data moves it elsewhere. Left
alone, it'd still sit BEFORE whichever other rooms' hit buttons come
later in the document, and later siblings paint on top — so once
settled into a room whose hit button was appended after it, that
invisible button would silently swallow every click meant for the
dot. Re-appending the dot at move time makes it the last child, and
therefore topmost, no matter which room it lands in.

Reflow whoever's left in fromRoom now that there's one fewer —
relevant on-screen only when fromRoom is on the visible floor (which
it always is for a move that has a real dot to animate); harmless
no-op if nobody's left there.

Race prevention: the wander tick excludes anyone already mid-transition
from an earlier tick whose animation hasn't finished (and therefore
whose async onDone callback hasn't run yet) — without this, a second
tick can grab the same dot/slug again before the first move actually
lands, and each move's own callback independently pushes the slug
into a different destination room, duplicating them across floors.
pendingMoveSlugs is checked instead of just the is-wandering CSS
class specifically because switching floors mid-animation rebuilds
the whole layer, and a freshly recreated dot for a still-pending
resident wouldn't carry the class over from the element it replaced.

Who's on each side of a move is snapshotted BEFORE anyone actually
moves — follow/flee reactions are purely about this one move, never
chained off a follower's or fleer's own arrival/departure. Fleeing is
a reaction to the ARRIVAL, so it stays gated on the mover's own
animation finishing (it only makes sense once the disliked person is
actually standing there). The `alreadyThere` snapshot used for it is
taken from when THIS move started, not re-read right when the
callback fires — by the time the callback actually runs (after the
mover's own animation finishes), an unrelated tick could already have
moved one of those people elsewhere, or have them mid-move right now.
Re-checking their live position isn't optional: skipping it means
travelTo gets called twice on the same dot from two independent async
callbacks, each pushing the slug into a different room — duplicating
them across floors instead of just picking the wrong (stale) one. A
fleer dot only even exists to move if they're on the SAME floor as
toRoom (only the visible floor renders any dots at all) — someone
reacting to an arrival on a floor that isn't currently open just
silently has no dot to move, which is exactly right: nothing to see,
so nothing animates.

Following, in contrast, is a reaction to the DEPARTURE — tagging
along means walking out together, not watching the mover leave,
waiting for them to fully arrive, and only then deciding to catch up.
It's rolled and started in the same tick as the mover's own travelTo
(nothing async in between, so a snapshot of who's left behind can't
have gone stale) rather than nested inside the mover's own onDone.
rollFollowers only ever checks a follower's bond with the MOVER, never
who else is already in toRoom — a hard avoid still applies even when
tagging along, so a follower whose positive bond with the mover would
normally pull them along simply doesn't follow this particular time
if toRoom already contains someone they can never share a room with.

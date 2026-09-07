Household — design notes (merge.js)

A Suika/watermelon-style merge game. Drop a resident in; two of the
same tier touching merge into the next tier up. Physics via Matter.js
(vendor/matter.min.js), all rendering done by hand on a 2D canvas so
tiles can be drawn as the site's own character icons instead of
Matter's debug shapes.

COORDINATE SPACE
The canvas has a FIXED internal resolution (STAGE_W x STAGE_H) — CSS
scales the element visually, but all physics/pointer math stays in
that fixed coordinate space, converted via getBoundingClientRect() on
each pointer event. This keeps the simulation identical at any screen
size instead of having to re-derive body positions on resize.

TUNING
- STAGE_W/STAGE_H were widened from an original 340x480 — the old
  size left too little room to maneuver once a handful of mid-tier
  pieces were on the board, killing combos.
- GAME_OVER_GRACE: seconds a piece can rest above the danger line
  before the game actually ends.
- DROP_COOLDOWN: ms between drops.
- SPAWNABLE_TIERS: only the first N tiers ever appear as the "next
  piece" to drop — later tiers only appear via merging.
- DEFAULT_ICON_ZOOM (1.28): checked every icon's actual composition
  (background-square bounding box vs. canvas) — nearly all of them
  share the same ~8% white padding margin, which needs roughly
  1.19-1.25x zoom to crop out entirely. 1.28 covers that whole
  cluster with a small safety margin.

PER-TIER ICON OVERRIDES
A few character icons aren't centered/proportioned like the rest and
need their own zoom/offsetX/offsetY:
- LP: background square is a little tighter/left-shifted than most.
- Charlie: source icon has an off-center, inset background square
  (his ears/exclamation marks poke past it into a transparent
  margin), unlike the other icons which bleed color to every edge —
  zoomed in and recentered on the square itself so the crop stops
  showing that edge.
- Mirror: background square is noticeably shorter than it is wide —
  shifted up, needs more zoom than the default to fully cover it.
- Journal: the most off-center of all of them — background square is
  barely half the canvas width, shifted well to the right.

GAMEPLAY NOTES
- The House (last tier) has nothing bigger to become, so a
  same-tier collision involving it is simply ignored.
- A body can appear in more than one queued merge in the same physics
  tick if it touched two same-tier neighbors at once — only the first
  queued merge for it actually goes through; mergingIds prevents a
  body mid-merge from being queued again.
- drawTile crops in slightly on every icon (source PNGs can have a
  hairline transparent edge) and lets a tier override zoom/offset for
  icons whose art isn't centered in its own square (see above).

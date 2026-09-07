Boardwalk Dash — design notes (boardwalk.js)

A Chrome-dino-style endless runner. Indigo sprints the length of the
Boardwalk, jumping obstacles that scroll in from the right at an
ever-increasing speed. Same fixed-internal-resolution canvas approach
as merge.js — CSS scales the element visually, all game math stays in
STAGE_W x STAGE_H coordinate space regardless of the on-screen size.

Everything content-related (Indigo's run frames, obstacle types,
background cameos) is data-driven from config blocks near the top of
the file, so dropping in new art is just adding a file + one line,
not a rewrite:

- INDIGO_RUN_FRAME_SRCS: add a second (or third+) running frame here
  once it exists — the animation cycles through however many are in
  this list, no other code changes needed. One entry = current
  static look. INDIGO_JUMP_FRAME_SRC is a separate pose to swap in
  later.
- OBSTACLE_TYPES: add a new obstacle by adding an entry. `image`
  draws a single static sprite; `images` (an array) animates through
  those frames the same way Indigo's run cycle does — 2 frames is
  enough for a walk cycle. `frameRate` overrides OBSTACLE_FRAME_RATE
  for just that type, for a walk cycle that shouldn't animate as fast
  as the default. Omit `image`/`images` to fall back to a hand-drawn
  shape in drawObstacle() (only 'bench' and 'lamp' have one —
  anything else without art falls back further to a plain box).
  `weight` controls how often it's picked relative to the others
  (higher = more common). Commented example left for reference:
  { type: 'charlie', w: 50, h: 50, weight: 1, image: '../images/boardwalk/charlie-obstacle.png', title: 'Tripped over Charlie.' }
- BACKGROUND_CAMEO_SRCS: purely decorative, no collision. Add a
  resident image here and they'll start wandering through the
  background automatically, dimmed and scrolling slower
  (CAMEO_PARALLAX) so they read as behind the action rather than
  something to dodge.

OTHER NOTES
- The start overlay sits visually on top of the canvas (same
  .merge-gameover positioning as the game-over screen), so a
  tap/click there never reaches the canvas's own pointerdown listener
  — it needs its own.
- The game loop clamps dt to 0.05s so a tab-switch stall doesn't
  teleport things; on the frame a collision happens, it still draws
  that frame before stopping the loop rather than freezing one frame
  early.
- Obstacle spawn interval shrinks as speed rises but is floored so it
  never becomes unfair-instant.

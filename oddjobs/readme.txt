Odd Jobs — design notes (oddjobs.js)

A WarioWare-style microgame engine. Each "job" is a tiny
self-contained round: a one-word prompt flashes, then the player gets
a few seconds (shrinking as the shift goes on) to do exactly one
thing. Get it right -> next job. Get it wrong, or run out the clock
-> lose a life. Three misses ends the shift.

Adding a new job later should mean adding one entry to the JOBS array
and nothing else — the engine doesn't know or care what's actually
happening inside a job's playfield.

ENGINE
- activeToken is bumped every time a round starts. Anything scheduled
  by an older round (the prompt-delay timeout, the round's own
  auto-fail timeout, a job's own event listeners) captures the token
  it was born with and checks it before acting — so a Restart
  mid-round can't let a stale callback reach into the fresh round it
  left behind.
- DURATION_STEP: shaved off the per-round time limit each round,
  floors at MIN_DURATION.
- startShift(): Restart can be hit mid-round. nextRound() bumps
  activeToken, which makes every callback the previous round
  scheduled a no-op the moment it runs — but the pending timeout is
  also cleared directly, just to not leave it ticking.
- returnToStart(): same mid-round-safe teardown as startShift, but
  lands on the start screen instead of launching straight into a
  fresh shift. Also explicitly freezes the timer bar's CSS transition
  — resolve() normally does that the instant a round ends, but
  returning to start can happen mid-round, bypassing resolve()
  entirely, so the bar would otherwise keep animating toward 0%
  behind the start overlay.
- startTimerBar / prompt fade-in both force a reflow (reading
  .offsetWidth) before re-adding the class/starting the transition,
  so the animation always re-triggers even when it's playing the same
  transition back-to-back.

SHARED JOB HELPERS
- wantedRowInit(label, choices): builds an init() for the "wanted
  icon + tap the matching option out of a row of decoys" job shape
  (Match the request, Pour the order) — same single-tap rules as
  every other simple job, just parameterized by the label text and
  the emoji set.
- enableDrag(chip, field, onRelease): pointer-based drag (mouse +
  touch in one). Moves `chip` by percentage of `field`'s box as the
  pointer moves, then hands off to `onRelease` to do its own
  hit-testing (against whatever drop targets that job defines) once
  the pointer lifts.

JOBS
- Water the plant: five plants in a row, one visibly wilting — tap
  that one. Tapping any other plant fails the round immediately.
- Catch the petal: a single petal drifts down from the top — tap it
  before it reaches the ground. Missing (it lands) fails the round.
- Match the request / Pour the order: shape-distinct emoji on
  purpose (not just closed books in different colors, or different
  colored cups) — same colorblind-unfriendly trap as the wilting
  plant's color-only tell, avoided from the start.
- Shelve it: three faded "ghost" slots are scattered up top, each a
  different book; three full-color chips sit along the bottom in
  shuffled order. Drag each chip onto its matching ghost slot. A chip
  dropped anywhere else just snaps back — only the clock can fail
  this one. Winning means placing all three before time runs out.
- Bus the table: a handful of dirty dishes are scattered across the
  table — tap every one before time's up. No wrong target here; the
  clock alone is the pressure, same as Catch the petal.

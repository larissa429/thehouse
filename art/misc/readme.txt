Desk (Misc art page) — design notes (desk.js)

Draggable scattered papers + a trash can that refuses to actually get
rid of anything. Drag any .desk-paper around the .desk. Drop one on
the .trash-can and it crumples (swaps to a random crumpled-paper
image, shrinks toward the can), then a moment later it un-crumples,
swaps back to its real image, and re-scatters onto the desk with the
same flutter-in entrance it had on page load.

One paper is special: the one marked [data-pen]. Trash it and it
doesn't crumple — it just shrinks and bounces as itself, then a
hidden drawer slides out from the bottom edge of the desk with a
password slip inside (PASSWORD: PENNY). That slip behaves like any
other paper from then on (draggable, clickable to reveal its text,
throwable too).

Any element marked [data-trinket] gets the same no-crumple
shrink/bounce/respawn treatment as the pen, just without triggering
the drawer secret — for small object doodles (a die, a paper crane...)
that should feel like real objects on the desk rather than paper.

PHOTO/TEXT OVERLAY
The pointerup that opens the overlay is often followed by a synthetic
click event at the same coordinates, which lands on the overlay
backdrop itself — without a timing guard (OPEN_GUARD_MS) that reads
as "clicked outside" and closes the overlay in the same frame it
opened (the same flash-and-close bug is fixed the same way on the
calendar page).

BOUNCE PHYSICS (runBounce)
Real bounce physics: a tiny "ball" bouncing around inside the can's
circular inner rim. Reflects its velocity off the rim at whatever
angle it actually hits, loses some energy each bounce so it settles
down, and calls onDone() once time's up. Drives the img's own
transform directly, frame by frame — completely separate from
.desk-paper's --x/--y/--rot/--scale transform. rimRadius is tuned by
eye against the actual trash.png art.

DRAGGING A PAPER
- Reading a paper's --x/--y back out: a missing/unparseable value
  falls back to 50, checked via isNaN, not `|| 50` — the latter would
  wrongly snap a paper sitting exactly at the 0% edge back to center,
  since 0 is falsy in JS.
- Release velocity (for rolling a die across the desk when let go) is
  tracked as px/ms between the LAST TWO pointermove samples, not the
  whole drag, so a drag that ends slow doesn't inherit speed from
  earlier in the gesture.

ROLLING DICE FACES (data-roll-frames)
Optional dice-style "rolling" faces via data-roll-frames="a.webp,b.webp,...".
Cycles through them while the object bounces in the can, then settles
on a random one — same idea as the comic pages swapping to a crumple
texture, just for an object instead of paper. Also cycles while it's
airborne/mid-throw across the desk (rollAcrossDesk), not just once it
lands in the can.

rollAcrossDesk: die-only. After release, keeps moving in the
direction it was dragged, bouncing off the desk's edges and losing
speed to friction, cycling through face images the whole time it's
moving — same physics shape as runBounce(), just bounded by a
rectangle (the desk) instead of the trash can's circular rim.
MIN_SPEED is the cutoff below which a release counts as just placing
it down, not throwing it.

SHRINK-TOWARD-CAN (shared by crumple and trinket-sink)
shrinkTowardCan(swapImage) is the shared "shrink and slide toward the
can" step — swapImage controls whether it also swaps to a random
crumpled texture (comic pages) or stays looking like itself the whole
time (the pen/trinkets). It explicitly removes the "entering" class
first: the entrance animation's fill-mode:both keeps its 100%
keyframe "in control" of transform forever once played, even
overriding later inline/custom-property changes, so it has to be
removed for the base .desk-paper rule (driven by
--x/--y/--rot/--scale) to fully govern rendering from here on out.

RANDOM SECRET-OBJECT SPAWN POINTS
The pen, die, and paper crane spawn somewhere new every load/refresh
rather than sitting in the same spot — position is set BEFORE their
flutter-in entrance plays, so they just reposition instantly with no
visible jump. Each also avoids landing within RANDOM_SPAWN_MIN_DIST
of any other paper's spawn point (including each other, since this
runs in order and reads whatever --x/--y is already set), so they
don't spawn stacked directly on top of something else.

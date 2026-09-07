Telly — design notes (telly.js)

ERROR WINDOWS
Closing a window ("x") just makes room for another — spawnReplacement()
fires immediately, so the desktop never actually clears.

Dragging is delegated on the whole stage (not bound per-window) so it
works on every window including ones spawned later, not just the
initial batch. Dragging never starts from the close button itself.

Windows are placed in organic diagonal cascades: each stack starts at
a fresh random spot and keeps stepping diagonally (STEP/JITTER) until
the next step would run off the screen edge, at which point that
stack ends and a new one starts at a new random spot — so stack
lengths naturally vary instead of being uniform. The one "final"
window is centered and appears last.

Windows fade in one at a time with a gap that shrinks over the
sequence (eased by CURVE) rather than a flat interval, plus a running
z-index counter (topZ) for anything spawned or raised after that
initial batch.

TELLY'S PLAYLIST
The drag handle is a plain div overlaying the iframe's top edge, NOT
the iframe itself — the iframe is cross-origin content and silently
swallows pointer events before this script ever sees them, which is
why dragging felt broken/unresponsive before this fix. It always
wobbles back to its resting angle (REST_DEG) via a small spring
(STIFFNESS/DAMPING), with sideways drag motion adding angular
velocity (SWING_SENSITIVITY) so it swings like it's actually hanging.

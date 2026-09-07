connections.js — design notes
(shared corkboard-pin system, used on most character pages: the
"self" pin plus data-color pins connected by sagging strings, each
opening a note overlay on click)

STRINGS
Every pin gets a dot on the board regardless of whether it has a
string (dots are drawn every frame, unconditionally). Only pins
WITHOUT a data-no-line attribute get an actual string drawn from the
self pin. Each string sags under simulated gravity (GRAVITY/STIFFNESS
/DAMPING tune the physics) plus a small ambient sway offset by phase
so multiple strings don't move in lockstep. Respects
prefers-reduced-motion (no sway, no spring — sag position snaps
straight to target instead of physically settling into it).

Redrawn every animation frame: position all pins' dots first, then
compute the curve for pins that have a string.

PIN DRAGGING
A pin only starts a --x/--y percent-position drag when it's actually
absolutely positioned (getComputedStyle check) — pins laid out
normally in flow aren't draggable. When reading the pin's current
position back out, a missing/unparseable --x or --y falls back to
50 — but that fallback must check isNaN, not just falsiness (`|| 50`
would wrongly snap a pin sitting exactly at the 0% edge back to
center, since 0 is falsy in JS).

CLICK VS. DRAG
A pointerdown that moves more than 4px counts as a drag rather than a
click, so dragging a pin doesn't also pop its note open. The note
overlay's content comes from a <template> inside the pin; closing it
works via the close button, clicking the overlay background, or
Escape.

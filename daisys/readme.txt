Green D.A.I.S.Y. — design notes (daisy-drag.js)

Reorderable profile panels. Grab a panel by its handle (the vertical
dots) and drag it up or down the list; panels swap places live as the
dragged panel's center crosses a neighbor's midpoint. Land Green
directly between Yellow and Blue (either direction) and a small
reward popup slides up from the bottom of the screen.

SWAP_THRESHOLD (0.25) is how far, as a fraction of a neighbor's
height, the dragged panel needs to reach into it before they swap.
Lower means less finger travel is needed per swap, which matters a
lot on tablets where the panels are still full-size (not collapsed
the way they are on phones) — dragging the full height of one panel
to trigger a swap isn't always physically possible on a fixed screen.

MOBILE
Panels collapse to just the name + footnote (CSS handles the actual
hiding), since a fully expanded panel can be taller than the screen,
which would make it impossible to drag anywhere. Tapping anywhere on
a panel other than the handle expands/collapses it; the handle itself
is excluded so it keeps triggering a drag instead, and "Read more"
links are excluded so they still behave like normal links.

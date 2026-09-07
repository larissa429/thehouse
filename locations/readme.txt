Locations — design notes (locations.js + locations/index.html)

PHOTOS
Each location uses 4 distinct photos: <slug>-1.jpg is the pin
polaroid AND the popup's big hero image, <slug>-2/3/4.jpg are the
three circle photos in the gallery row. Drop files into
images/locations/ under those exact names and they'll show up
automatically — nothing else needs to change. Until a file exists at
a given path, that spot just shows an empty frame.

MAP INTERACTION
Each .location-pin is a draggable polaroid positioned at --x/--y
(percent), same drag pattern as the connections-board pins elsewhere
on the site. A plain click (not a drag) clones the pin's <template> —
a themed brochure panel with its own photo gallery and color scheme —
into the shared .note-overlay popup. This page wires its own
open/close rather than depending on calendar.js or connections.js
being present.

Below the 700px breakpoint the map switches to a static wrapping
grid (see styles.css) — dragging a pin there would have nothing
visible to do, since position is no longer absolute, so dragging
isn't wired up at all rather than fighting the page's own touch
scrolling for no benefit.

Reading a pin's saved --x/--y back out: a missing/unparseable value
falls back to 50, but that check must be isNaN, not `|| 50` — the
latter would wrongly snap a pin sitting exactly at the 0% edge back
to center, since 0 is falsy in JS.

Tapping a gallery circle inside the (cloned) brochure opens it
full-size in a lightbox. Escape closes whichever layer is on top
first, so dismissing an enlarged photo doesn't also dump you out of
the brochure behind it.

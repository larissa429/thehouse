Penny — design notes (playlist-swing.js)

Tilted, draggable, spring-back playlist widget. Same drag-by-handle +
swing-back physics as Telly's playlist (originally written directly
in telly.js), pulled out into its own reusable script with generic
class names (.swing-playlist-wrap / .swing-drag-handle) so any
character page can use it without touching telly.js. Currently used
on Penny's page.

Markup expected:
  <div class="swing-playlist-wrap">
    <div class="swing-drag-handle"></div>
    <span class="swing-tape"></span>
    <iframe ...></iframe>
  </div>

The resting tilt angle is read from whatever the wrap's own CSS
already resolves --swing-deg to (falls back to -8deg if unset), so
each page sets its own default via the transform's CSS fallback
value instead of editing this script.

The drag offset (--dragX/--dragY) is a raw pixel amount added on top
of the wrap's percentage-based anchor position. If the window is
resized after dragging, that stale pixel offset no longer lines up
with the new layout (the card looks stuck awkwardly off to one side)
— so it snaps back to the anchor position on every resize.

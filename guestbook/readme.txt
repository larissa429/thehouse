Guestbook — design notes

GALLERY
Populated from Firestore; falls back to one example piece
(gimmick.png, "Straw") if nothing's been approved yet.

Entries only ever had one flat hostReply field before hostReplies
(a real array) existed — getReplies() treats an old flat reply as a
one-item list so nothing already saved disappears from the site.

Text-only submissions (no drawing) get a note card instead of an
<img> — there's nothing to show a picture of.

Long gallery-plate names would otherwise wrap to two left-leaning
lines — the font shrinks a bit instead (>10 chars) so most names
still fit on one line.

The reply badge shows one emoji per distinct character, not one per
message — a back-and-forth between the same two residents still only
shows two icons up top.

Only entries a moderator has approved ever show here — new
submissions start as status:'pending' and stay invisible until then
(see guestbook/review/ for approving/rejecting them).

LIGHTBOX
The host-reply markdown formatter (formatHostReply) escapes HTML
first, then turns **bold**, *italic*, and __underline__ into real
tags. The input is admin-only (Firestore rules restrict writes to the
admin email) but it's escaped anyway so nothing unexpected can slip
through.

CANVAS
- fillWhite(): the canvas's white background is only CSS on the
  <canvas> element itself — the actual pixel bitmap starts fully
  transparent, so toDataURL() would export a transparent PNG unless
  white is explicitly painted into the real pixel data first.
- Color swatches: picking a new color deliberately does NOT reset the
  active stamp — it should update the stamp's fill without kicking
  the user back to the pen tool.
- Recent color history: clicking a history swatch looks for a
  matching live palette swatch to mark active, if that color happens
  to be in a currently-visible palette row — otherwise it just sets
  the color with nothing else marked active.
- Stamps (house/star/heart/circle) are drawn as vector paths, no
  image assets needed. The house stamp's roof eaves deliberately
  stick out past the walls, and its doorway rectangle overshoots past
  the bottom edge so it fully clips through the shape instead of
  leaving a thin line across the opening.
- getCoordinates(): the canvas's internal bitmap is a fixed 400x400,
  but CSS renders it at whatever size the layout gives it (much
  smaller than 400 on a phone) — without the scaleX/scaleY factor,
  raw CSS-pixel offsets would get used directly as bitmap
  coordinates, so the drawing point would drift away from the actual
  finger position the smaller the canvas is rendered on screen.
- Upload: a dropped photo is scaled to fit inside the 400x400 bitmap
  without stretching (contain-fit, centered) so it always lands
  proportionally correct.

SUBMISSION
The drawing is saved as a Base64 data URL directly inside the
Firestore document instead of a separate Cloud Storage upload — a
400x400 canvas encodes to roughly ~30KB of text, well under
Firestore's 1MB-per-document limit, so this skips Storage (and its
billing requirement) entirely for a guestbook this size. Text-only
entries skip the image field entirely — a blank canvas has nothing
worth saving, and forcing one in kept producing an all-white square
with no information in it.

Every new entry starts as status:'pending' — a moderator has to
approve it (see guestbook/review/) before it's public.

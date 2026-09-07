components.js — design notes
(shared by every page on the site — <site-header> and <site-footer>
custom elements, plus the drag/tilt/pagination behavior on character
pages and the residents grid)

USING IT ON A PAGE
Put <site-header></site-header> and <site-footer></site-footer> where
the header/footer go, and include <script src="../components.js" defer>
(or "components.js" with no ../ from the site root). Edit the footer
or nav in THIS file and it changes on every page at once.

PATH DEPTH
Every page lives either at the site root (index.html) or one folder
deep (journal/index.html), so URLs read as .../journal/ instead of
.../journal.html. Depth is read from this script's own <script src>
attribute (counting how many "../" segments are actually in it)
rather than guessed from folder names, so it's automatically correct
at any depth — root, one folder deep, two folders deep like
art/misc/, etc. — and keeps working on any hosting URL, custom domain
included.

UTILITY_FOLDERS is the small, fixed list of one-level-deep pages that
are NOT character pages (about, residents, calendar, games, etc.).
Anything one level deep that ISN'T in that list is assumed to be a
character page — so new character folders never need to be added
here manually. Two-levels-deep pages (art/misc/, etc.) are never
character pages regardless of folder name.

NAV HIGHLIGHTING
Besides the current page's own tab, a few pages light up a second
tab too: any character page also lights up "Characters", the
calendar lights up "Resources" (it lives under that section even
though it's not literally at resources/), and each individual game
page (merge, crossroads, guesswho, uno, boardwalk, spotlight,
showdown, oddjobs) lights up "Games" too, not just /games/ itself.

FAVICON
Auto-injected into <head> on every page load, using the same depth
prefix as everything else — one line to maintain instead of a <link>
on every page.

CARD TAP-TO-REVEAL (mobile)
Cards with a hover-only icon (the residents grid) need a first tap to
reveal that icon before a second tap navigates, since there's no
hover on touch. Cards without one (the Resources grid) just navigate
on one tap — this only kicks in for cards that actually have a
.character-icon child. Tapping outside any card closes them all.

FREE-DRAG (portrait / playlist / statblock / trivia-note)
Grab any of these and it "lifts" (grows slightly, deeper shadow, a
small extra random tilt), follows the cursor/finger directly with no
lag or spring, then settles flat again exactly where it's dropped —
no snap-back. EXTRA_ROT/LIFT_SCALE tune how much.

The three top-row pieces (portrait/playlist/statblock) live in
.character-header, a free-form "board": position is tracked as
--tx/--ty, a PERCENT of the board's own width/height, so they can
move anywhere across the row and overlap. trivia-note isn't part of
that board — it's tracked instead as --dragX/--dragY, a plain pixel
offset from its normal resting spot, since it has nothing else to
overlap with.

Does nothing on the mobile layout (position:static there, not meant
to be dragged) — checked live via matchMedia, not baked in at load.

RANDOM RESTING TILT
On load, every portrait/statblock/playlist/trivia-note gets a small
random tilt within its own natural range, instead of a fixed value.
An inline style="--rest-rot:Xdeg" already on the element (like on the
Cool S & Clickbaity page) always wins over this, so pages that want a
specific hand-picked tilt keep it.

PREV / NEXT CHARACTER PAGINATION
Appears right after the "← All characters" breadcrumb on every
character page. To add a new character, add one line to
CHARACTER_ORDER — nothing else needs to change. A folder not yet in
that list just skips the pagination quietly rather than erroring.

DRAGGABLE CHARACTER CARDS (residents grid)
Same drag pattern as above, but for the whole grid of cards. Blue
Marble's card carries data-sticky and gets its own double-tap
reveal/hide on mobile instead of participating in the normal
tap-to-reveal-icon flow. A real drag is distinguished from a click by
movement distance (>4px), so dragging a card doesn't also trigger its
link navigation.

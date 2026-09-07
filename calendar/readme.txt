Calendar — design notes (calendar.js + calendar/index.html)

ICON CREDITS
The holiday-button icon set is hand-picked inline SVG <symbol>s (no
emoji font/glyph dependency, so they render identically everywhere):
  - Most icons: Lucide (lucide.dev), ISC license
  - Ironing-steam icon (Spring Cleaning): Tabler Icons (tabler.io/icons), MIT License
  - Lantern icon: Hugeicons (via Iconify), MIT license

OVERVIEW
Four .calendar-sheet cards sit stacked in #calendarStack. Drag the
front one down past TEAR_THRESHOLD (or use the fallback button) and
it flies off. The next season underneath becomes interactive
IMMEDIATELY — not after its animation finishes — so there's no
window where nothing responds to a click or drag. The outgoing
sheet's fly-off + reset from that point on is a purely cosmetic
animation, fully decoupled from interactivity, and resets itself
silently (no transition) once done so it never visibly "returns" to
the stack. Clicking (not dragging) a holiday date opens the shared
.note-overlay popup with that holiday's info.

WHY A FEW THINGS ARE THE WAY THEY ARE
- Dimming (via CSS filter) only ever applies to sheets behind the
  front one, never even set to a no-op brightness(1) on the front
  sheet — `filter` promotes an element onto its own GPU compositing
  layer, a known source of touch hit-testing glitches on mobile
  Chrome for elements inside a scrolling page.
- Tearing off advances the stack order right away: the next sheet
  becomes the new front (and interactive) immediately, and the
  outgoing sheet's own --stack-i/z-index also updates now to "back of
  the stack" — that's fine, since the outgoing sheet's own inline
  transform (set separately) overrides that positioning entirely
  until its fly-off animation finishes.
- A torn-off sheet keeps flying in whatever direction it was already
  being dragged, instead of resetting to a small fixed offset —
  otherwise it visibly snaps back toward center right as it's
  released.
- Cleanup after the fly-off animation is guarded against running
  twice: transitionend AND a setTimeout safety net can both fire, so
  a `cleaned` flag makes sure only the first one actually does
  anything. It also doesn't filter by e.propertyName — transform and
  opacity finish at the same time, and {once:true} would consume the
  listener on whichever fires first, silently dropping the other.
- That same cleanup resets the sheet with transitions OFF, forcing
  the browser to apply "none" (via offsetHeight) before clearing it
  again — so the sheet never visibly slides back into the stack, and
  rapid repeat tears still work correctly since it's already reset
  and ready.
- Tear distance is measured as total distance pulled (Math.hypot),
  not just how far down — so a mostly sideways yank tears it off just
  as easily as a straight-down pull.
- At pointerdown, the real event target is recorded BEFORE
  setPointerCapture can redirect it — by pointerup, setPointerCapture
  makes the click's own target unreliable (redirected to the sheet
  itself), so opening a holiday popup on a real tap uses that
  recorded target instead.
- The overlay's "click outside to close" ignores a click that lands
  implausibly fast (<350ms) after the popup opened — some mobile
  browsers fire a duplicate/ghost click shortly after the real one
  that opened it, and a human can't see the popup and decide to
  dismiss it that fast.

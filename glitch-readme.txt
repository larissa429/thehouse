glitch.js — design notes
(shared by every page — corrupted-text scramble effect)

Any element with class="glitch" has each character rapidly swapped
for random letters/symbols. Same length as the real text, monospace,
ASCII only — so it never changes width and never shows missing-glyph
squares. The real text is preserved for screen readers via
data-base / aria-label, so the effect is purely visual.

Tune it here:
  CHARS   — the pool of glitch glyphs to cycle through
  TICK_MS — how fast it scrambles (lower = faster)
  LOCK    — chance (0–1) a slot briefly shows the real character.
            Keep at 0 for a fully-redacted field; raise (e.g. 0.15)
            to have the true text flicker through sometimes.

Respects prefers-reduced-motion: does one static corrupted pass
instead of continuously animating.

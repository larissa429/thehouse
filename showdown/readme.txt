Track Record — design notes (showdown.js)

An FNF-style rhythm battle. LP & Cassette (player side) vs a rotating
cast of opponents.

FNF-style call-and-response: the playfield is split into two 4-lane
highways side by side — the opponent's (left) and the player's
(right). The chart alternates ownership in phrases; opponent notes
auto-resolve as they arrive (they always "sing" correctly, same as
real FNF), player notes need real input. Both characters bop to the
beat, plus a punchier bop whenever their side actually lands a note.

MVP SCOPE
One song ("At The End Of The Line..."), a real audio track driving
the clock, and a procedurally-generated chart — there's no
hand-authored chart yet; the note pattern/phrasing is a seeded random
walk over the track's BPM grid, matching its tempo but not actually
written to its real melody/hits.

TIMING
- DIR_LABELS/DIR_COLORS: same 4 directions and colors on both sides,
  FNF-style.
- HIT_WINDOW/SICK_WINDOW: outside HIT_WINDOW a press does nothing and
  a note auto-misses; within SICK_WINDOW of the note's exact time
  counts as the higher-scoring "Sick!" judgment instead of "Good".
- SONG_LENGTH_SEC (55s): the beat drop makes for a clean cutoff, not
  the full 4:13 track. LEAD_IN_SEC is silence before the first note
  so the player isn't caught off guard.
- The <audio> element's own playback position IS the song clock —
  chart times, note-scroll, and judging all read off now() (which
  just returns songAudio.currentTime), so they can never drift out of
  sync with what's actually playing.
- generateChart uses a deterministic pseudo-random generator
  (mulberry32) seeded with a fixed constant, so the same "chart"
  plays every run — replayable, and swappable later for a
  hand-authored one. Notes are laid on an eighth-note grid; each slot
  has a chance to be skipped (leaves rests instead of a solid wall of
  notes), and consecutive same-lane notes are discouraged (not
  forbidden) so the chart doesn't feel too repetitive.
- Call-and-response phrasing: alternating 4-bar blocks, opponent
  sings first so the player has a moment to catch the beat before
  their turn — the standard FNF shape, just procedurally generated
  instead of hand-charted.

OTHER NOTES
- playHitBlip uses a tiny separate AudioContext just for the on-hit
  "ding" — not used for timing anything, purely a feedback sound
  layered on top of the song.
- An empty press (no note in range) does nothing and carries no
  penalty.
- flashFighter (the punchier hit reaction) is a separate CSS class
  from the ambient per-beat bop, so the two don't fight over the same
  `transform` each frame — is-hit wins via source order when both are
  active at once.
- The opponent's lane visuals are dimmed (globalAlpha) to read as
  auto-played background rather than something the player is
  expected to react to.

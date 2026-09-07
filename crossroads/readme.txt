Crossroads — design notes (crossroads.js)

Crossroads is a small perfect-information duel against a resident of
your choosing.

RULES
5x5 grid, one shared token starting in the (unscored, pre-consumed)
center tile. Player and AI alternate turns; the player may move to
any unconsumed tile in their CURRENT COLUMN, the AI may move to any
unconsumed tile in its CURRENT ROW. Landing on a tile banks its value
(-4..+4) to whoever moved there, then that tile is consumed. The game
ends the instant whoever's turn it is has no legal move left —
whoever has the higher score at that point wins.

AI / DIFFICULTY
Because at most 24 tiles ever get consumed and each turn has at most
4 candidate moves, a full alpha-beta search (with a transposition
table keyed on consumed-set + position + turn) is entirely tractable
in-browser — so every opponent shares the exact same underlying
search (bestSearchMove/search). Difficulty is layered on top as a
per-resident "mistake chance" (OPPONENTS[key].mistakeChance): that
fraction of the time, the AI ignores the search's true best move and
plays a genuinely random legal move instead (pickAiMove).

An earlier version had "mistakes" pick greedily — best immediate tile
value, no lookahead — but on a board this small greedy usually agrees
with the real optimal move anyway, so it didn't read as meaningfully
weaker. True randomness does.

OTHER NOTES
- Tile values are always -4..-1 or 1..4 (randomNonZero skips 0) —
  every tile should be a clear gain or loss, never a no-op.
- stateKey packs consumed-mask (25 bits) + position (5 bits) + turn
  (1 bit) into one number for the transposition table — comfortably
  under Number.MAX_SAFE_INTEGER.
- Move ordering (sorting candidate moves by tile value before
  searching) is a cheap way to improve alpha-beta pruning.
- pickThinkingLine: most thinking lines are drawn evenly from
  thinkingLines, but an opponent can define a rareLine (e.g. The
  House's "…") that only shows up occasionally instead of being just
  one option among equals.
- bubbleFont per opponent: The House uses the site's own reading font
  (not a handwriting style, to read as detached/impersonal); Journal
  uses the Caveat handwriting font used elsewhere on the site for him.
- The House doesn't talk mid-game — no filler chatter, no reacting to
  moves. "…" isn't really speech, so it's the one exception, and even
  that's rare (rareLineChance) rather than a given every turn.
- After the player moves, a notably good (>=3) or bad (<=-3) tile
  value gets an immediate reaction bubble; the "thinking" bubble for
  the AI's upcoming move follows a little after, so the two bubbles
  don't visually collide.

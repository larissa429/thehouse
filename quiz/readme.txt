The House Quiz — design notes (quiz/index.html)

Wrong answers cost a life instead of just retrying in place — run out
of lives and it's back to question 1, Impossible-Quiz style. Mostly
genuine House lore, with a few trick questions mixed in (the
"obviously right" answer isn't always the right one). The QUESTIONS
array is complete at all 50 questions; adding more later means adding
more objects to the array, nothing else needs to change to grow it.

PASSWORD_ANSWER ("allpages") matches the hash checked in pass/.

BONUS LIVES
Tied to the 3 interactive question types themselves (puzzle, sort,
anagram) rather than a fixed "every 15th question" count
(LIVES_CHECKPOINT_POSITIONS), so removing or adding regular questions
elsewhere in the set never knocks these out of alignment with the
puzzle/sort/anagram questions they're meant to reward.

MULTIPLE CHOICE
An "All of the above" option only makes sense sitting after the
others, so it's pinned to the end instead of shuffling with them —
detected automatically by text, no per-question flag needed
(shuffleOptions).

GLITCH TEXT (trick questions like "who's in the basement")
Telly-style glitch text — same weighted-scramble technique as the
name glitch on telly/index.html (mostly noise, with the real
character showing through occasionally), rather than glitch.js's
fully-redacted version. Tracked per-render so old intervals get
cleared instead of piling up as questions advance. Respects
prefers-reduced-motion (static and legible — every option is correct
anyway for these questions, so nothing is lost by not animating).

ANAGRAM
Answer is compared letters-only (spaces/punctuation/case ignored) so
formatting quirks in what someone types don't matter. A fresh
scramble is generated every render (not a fixed list) — regenerated
letter-by-letter each time, so it's effectively unlimited variety
rather than a canned batch.

PICTURE PUZZLE
Splits q.image into pieces scattered (and rotated) below an empty
board; drag each piece onto its spot to place it, straightening it
out. Solving costs no lives — it's a breather puzzle, not a quiz
question with a wrong answer.

Piece backgrounds use pixel-based background-size/position (measured
off the actual rendered board) rather than percentage tricks, so
crops line up exactly regardless of borders/gaps. The scatter zone is
given enough room for a rough grid of the pieces beneath the board,
then everything is measured relative to the puzzle stage (pieces are
positioned absolutely against the stage so they can move freely
between the scatter zone and the board).

Piece <-> slot bookkeeping: slotOccupant maps slot -> piece,
piecePlacement maps piece -> slot. slotAt() finds which slot a
stage-relative point falls inside by coordinates, rather than
document.elementFromPoint — a slot that already has a piece in it is
visually covered by that piece, so hit-testing the DOM would find the
occupying piece instead of the slot underneath.

placeAt()'s `origin` parameter is where the incoming piece was
dragged from (its spot in the scatter zone, or null if it was already
on the board) — a bumped occupant gets sent there instead of to a
random scatter position. returnToSpot() moves a bumped-out piece to
that specific spot (and rotation) rather than a random one, so a
displaced piece lands exactly where the piece that took its place
came from. If both pieces involved in a placement were already on
the board, they're swapped properly instead of one just being
returned to a scatter spot.

DRAG-TO-SORT
A vertical list of items the player reorders by dragging, checked
against q.items (already given oldest-first) when they hit submit.
Unlike other question types, a wrong submit doesn't reshuffle back to
a fresh layout — the player's current arrangement stays put so they
can adjust it, and items already in the right slot flash green even
if the overall order is still wrong.

`order` (in attachSortDrag) is the source of truth for display
position — index 0 is the top "oldest" slot, and every item's top
offset is derived from its index in this array, not from DOM order,
so a mid-drag reorder is just an array move followed by a re-layout
pass.

ANSWER HANDLING
When a multiple-choice or anagram answer is wrong (and lives remain),
the question resets in place rather than going through a full
renderQuestion() — a fresh render would reshuffle the multiple-choice
option order, which made it easy to misclick right after a wrong
answer by clicking where the (now different) right answer used to be.

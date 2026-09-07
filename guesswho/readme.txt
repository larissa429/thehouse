Who's in the House? — design notes (guesswho.js)

A text-input Guess Who against a resident The House has picked at
random. The House holds a secret resident. The player asks free-text
yes/no questions; each one is matched against a trait table by
keyword (no real NLP), answered honestly, and used to narrow the
candidate board. The player wins by naming the secret resident before
running out of patience.

There's no opponent AI making moves in solo mode — the only "AI" is
the text matcher. Traits are simple independent booleans so matching
stays predictable instead of guessing at compound questions.

QUESTION MATCHING
Triggers deliberately avoid bare "he"/"she"/"they"/"it" — those words
are the grammatical subject of nearly every question a player types
("do THEY have legs?"), so treating them as pronoun-trait signals
meant almost every question got hijacked into a pronoun match.
Pronoun questions now require an actually pronoun-shaped phrase (e.g.
"she pronouns", "goes by he").

Icons live in images/guesswhoicons/ — manually cropped versions of
the site's character icons, framed specifically for this game's
square tiles, so no runtime zoom/crop math is needed here (unlike
merge.js's icon cropping).

HEAD-TO-HEAD DUEL MODE
Player picks a character; the House tries to guess it by asking its
own questions (same entropy-based picker as Hint) while the player
races to guess the House's separately-chosen secret. Turns alternate:
after the player asks/hints, the House immediately asks its own
question and waits for a Yes/No answer before the player can act
again.

bestQuestionAmong(candidates, askedList): picks the unasked question
that splits a candidate pool closest to 50/50 — the same
information-gain idea used for both Hint and the House's own
questions when it's trying to guess the player's pick. A question
that would currently get an all-yes or all-no answer teaches nothing,
so it's skipped.

houseWinsDuel: only fires once the House's own candidate pool is down
to one, so with honest answers this is always correct — the fallback
branch (candidates.length !== 1 but no question left) is just a
safety net. If the guess is wrong, that's only reachable with
inconsistent answers (the true pick got eliminated by a contradiction)
— a rare tie, not a real win for either side.

THE HOUSE'S VOICE
Same character established in Crossroads: few words, dry, doesn't
chatter. Here it has to answer every question (that's the game), so
it can't go fully silent — but the asides (ASIDE_CHANCE) stay rare
and short, never one per turn.

withName(text): avoids a double period when the character's own name
ends in one already (e.g. "Green D.A.I.S.Y.").

applyAnswer(q, answer): records an answered trait, narrows the
candidate pool, and refreshes the board/HUD. Shared by both a typed
question and a hint reveal.

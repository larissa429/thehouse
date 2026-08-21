/* ============================================================
   guesswho.js — "Who's in the House?", a text-input Guess Who
   against a resident The House has picked at random.

   The House holds a secret resident. The player asks free-text
   yes/no questions; each one is matched against a trait table by
   keyword (no real NLP), answered honestly, and used to narrow the
   candidate board. The player wins by naming the secret resident
   before running out of patience.

   There's no opponent AI making moves here — the only "AI" is the
   text matcher. Traits are simple independent booleans so matching
   stays predictable instead of guessing at compound questions.
   ============================================================ */
(function () {
  var boardEl = document.getElementById('gwBoard');
  if (!boardEl) return;

  var logEl = document.getElementById('gwLog');
  var formEl = document.getElementById('gwAskForm');
  var inputEl = document.getElementById('gwInput');
  var turnCountEl = document.getElementById('gwTurnCount');
  var remainingCountEl = document.getElementById('gwRemainingCount');
  var restartBtn = document.getElementById('gwRestart');
  var hintBtn = document.getElementById('gwHint');
  var guessSelectEl = document.getElementById('gwGuessSelect');
  var guessBtnEl = document.getElementById('gwGuessBtn');
  var resultEl = document.getElementById('gwResult');

  // --- Character data -----------------------------------------------
  // Secret characters (Penny, Telly) are intentionally left out — their
  // statblocks are too thin/unconfirmed to trait fairly.
  var CHARACTERS = [
    { id: 'ap', name: 'Abstract Painting', icon: '../images/icons/ap.png',
      usesShe: true, usesHe: false, usesThey: false, usesIt: false,
      isHuman: false, isObject: true, verbal: true, nonverbal: false,
      blind: false, disabled: false, hasLegs: true, hasArms: true, floats: false,
      hasPartner: false, ancient: false, newResident: false, vaNeeded: true,
      isAlgebralien: false, earthOrigin: true,
      isGreen: true, isBlue: true, isPurple: false, isOrange: false, isYellow: false, isBrown: false, isDark: false, isRed: true, isWhite: true, isPink: false, isGirl: true, isBoy: false, isNonbinary: false,
      roundShape: false, rectangularShape: true },
    { id: 'bluemarble', name: 'Blue Marble', icon: '../images/icons/bluemarble.png',
      usesShe: true, usesHe: false, usesThey: false, usesIt: false,
      isHuman: false, isObject: true, verbal: true, nonverbal: false,
      blind: false, disabled: true, hasLegs: true, hasArms: true, floats: false,
      hasPartner: false, ancient: false, newResident: false, vaNeeded: false,
      isAlgebralien: false, earthOrigin: true,
      isGreen: false, isBlue: true, isPurple: false, isOrange: false, isYellow: false, isBrown: false, isDark: false, isRed: false, isWhite: false, isPink: false, isGirl: true, isBoy: false, isNonbinary: false,
      roundShape: true, rectangularShape: false },
    { id: 'charlie', name: 'Charlie', icon: '../images/icons/charlie.png',
      usesShe: true, usesHe: false, usesThey: false, usesIt: false,
      isHuman: false, isObject: true, verbal: true, nonverbal: false,
      blind: false, disabled: false, hasLegs: true, hasArms: true, floats: false,
      hasPartner: false, ancient: false, newResident: true, vaNeeded: false,
      isAlgebralien: false, earthOrigin: true,
      isGreen: false, isBlue: true, isPurple: false, isOrange: false, isYellow: false, isBrown: false, isDark: false, isRed: false, isWhite: false, isPink: true, isGirl: false, isBoy: false, isNonbinary: true,
      roundShape: false, rectangularShape: false },
    { id: 'cools', name: 'Cool S', icon: '../images/icons/cool s.png',
      usesShe: false, usesHe: false, usesThey: true, usesIt: false,
      isHuman: false, isObject: false, verbal: false, nonverbal: true,
      blind: false, disabled: false, hasLegs: false, hasArms: true, floats: true,
      hasPartner: true, ancient: false, newResident: true, vaNeeded: false,
      isAlgebralien: true, earthOrigin: false,
      isGreen: false, isBlue: false, isPurple: true, isOrange: false, isYellow: false, isBrown: false, isDark: false, isRed: false, isWhite: false, isPink: false, isGirl: false, isBoy: false, isNonbinary: true,
      roundShape: false, rectangularShape: false },
    { id: 'clickbaity', name: 'Clickbaity', icon: '../images/icons/cool s.png',
      usesShe: false, usesHe: true, usesThey: false, usesIt: false,
      isHuman: false, isObject: true, verbal: true, nonverbal: false,
      blind: false, disabled: false, hasLegs: false, hasArms: false, floats: true,
      hasPartner: true, ancient: false, newResident: true, vaNeeded: false,
      isAlgebralien: false, earthOrigin: false,
      isGreen: false, isBlue: false, isPurple: false, isOrange: true, isYellow: false, isBrown: false, isDark: false, isRed: true, isWhite: false, isPink: false, isGirl: false, isBoy: true, isNonbinary: false,
      roundShape: false, rectangularShape: false },
    { id: 'dream', name: 'Dream', icon: '../images/icons/dream.png',
      usesShe: false, usesHe: true, usesThey: false, usesIt: true,
      isHuman: false, isObject: false, verbal: false, nonverbal: true,
      blind: false, disabled: false, hasLegs: false, hasArms: false, floats: true,
      hasPartner: false, ancient: false, newResident: false, vaNeeded: false,
      isAlgebralien: false, earthOrigin: false,
      isGreen: false, isBlue: true, isPurple: true, isOrange: false, isYellow: false, isBrown: false, isDark: true, isRed: false, isWhite: false, isPink: false, isGirl: false, isBoy: false, isNonbinary: true,
      roundShape: true, rectangularShape: false },
    { id: 'dumptruck', name: 'Dumptruck', icon: '../images/icons/dumptruck.png',
      usesShe: true, usesHe: false, usesThey: false, usesIt: false,
      isHuman: false, isObject: true, verbal: true, nonverbal: false,
      blind: false, disabled: true, hasLegs: false, hasArms: true, floats: false,
      hasPartner: false, ancient: false, newResident: true, vaNeeded: true,
      isAlgebralien: false, earthOrigin: false,
      isGreen: true, isBlue: false, isPurple: false, isOrange: false, isYellow: true, isBrown: false, isDark: false, isRed: false, isWhite: false, isPink: false, isGirl: true, isBoy: false, isNonbinary: false,
      roundShape: false, rectangularShape: true },
    { id: 'geeky', name: 'Geeky', icon: '../images/icons/geeky.png',
      usesShe: false, usesHe: true, usesThey: false, usesIt: false,
      isHuman: false, isObject: true, verbal: true, nonverbal: false,
      blind: false, disabled: false, hasLegs: true, hasArms: true, floats: false,
      hasPartner: false, ancient: false, newResident: false, vaNeeded: false,
      isAlgebralien: false, earthOrigin: true,
      isGreen: false, isBlue: false, isPurple: false, isOrange: true, isYellow: false, isBrown: false, isDark: false, isRed: false, isWhite: false, isPink: false, isGirl: false, isBoy: true, isNonbinary: false,
      roundShape: false, rectangularShape: false },
    { id: 'indigo', name: 'Indigo', icon: '../images/icons/indigo.png',
      usesShe: false, usesHe: true, usesThey: false, usesIt: false,
      isHuman: false, isObject: false, verbal: false, nonverbal: true,
      blind: false, disabled: false, hasLegs: true, hasArms: false, floats: false,
      hasPartner: false, ancient: true, newResident: false, vaNeeded: false,
      isAlgebralien: false, earthOrigin: false,
      isGreen: false, isBlue: false, isPurple: true, isOrange: false, isYellow: false, isBrown: false, isDark: false, isRed: false, isWhite: false, isPink: false, isGirl: false, isBoy: false, isNonbinary: true,
      roundShape: true, rectangularShape: false },
    { id: 'journal', name: 'Journal', icon: '../images/icons/journal.png',
      usesShe: false, usesHe: true, usesThey: false, usesIt: false,
      isHuman: false, isObject: true, verbal: true, nonverbal: false,
      blind: false, disabled: false, hasLegs: true, hasArms: true, floats: false,
      hasPartner: false, ancient: true, newResident: false, vaNeeded: true,
      isAlgebralien: false, earthOrigin: false,
      isGreen: false, isBlue: false, isPurple: false, isOrange: false, isYellow: true, isBrown: true, isDark: false, isRed: false, isWhite: false, isPink: false, isGirl: false, isBoy: true, isNonbinary: false,
      roundShape: false, rectangularShape: true },
    { id: 'liz', name: 'Liz', icon: '../images/icons/liz.png',
      usesShe: true, usesHe: false, usesThey: false, usesIt: false,
      isHuman: true, isObject: false, verbal: true, nonverbal: false,
      blind: false, disabled: false, hasLegs: true, hasArms: true, floats: false,
      hasPartner: false, ancient: false, newResident: false, vaNeeded: true,
      isAlgebralien: false, earthOrigin: true,
      isGreen: false, isBlue: false, isPurple: false, isOrange: false, isYellow: true, isBrown: false, isDark: false, isRed: false, isWhite: false, isPink: true, isGirl: true, isBoy: false, isNonbinary: false,
      roundShape: false, rectangularShape: false },
    { id: 'lp', name: 'Long Play', icon: '../images/icons/lp.png',
      usesShe: true, usesHe: false, usesThey: false, usesIt: false,
      isHuman: false, isObject: true, verbal: false, nonverbal: true,
      blind: false, disabled: true, hasLegs: true, hasArms: true, floats: false,
      hasPartner: true, ancient: false, newResident: false, vaNeeded: false,
      isAlgebralien: false, earthOrigin: false,
      isGreen: false, isBlue: true, isPurple: false, isOrange: false, isYellow: false, isBrown: false, isDark: true, isRed: false, isWhite: false, isPink: true, isGirl: true, isBoy: false, isNonbinary: false,
      roundShape: true, rectangularShape: false },
    { id: 'mirror', name: 'Mirror', icon: '../images/icons/mirror.png',
      usesShe: true, usesHe: false, usesThey: false, usesIt: false,
      isHuman: false, isObject: true, verbal: true, nonverbal: false,
      blind: false, disabled: false, hasLegs: true, hasArms: true, floats: false,
      hasPartner: false, ancient: true, newResident: false, vaNeeded: false,
      isAlgebralien: false, earthOrigin: true,
      isGreen: false, isBlue: true, isPurple: false, isOrange: false, isYellow: true, isBrown: false, isDark: false, isRed: false, isWhite: false, isPink: false, isGirl: true, isBoy: false, isNonbinary: false,
      roundShape: true, rectangularShape: false },
    { id: 'n528', name: '-⁵⁄₂₈', icon: '../images/icons/n528.png',
      usesShe: false, usesHe: true, usesThey: true, usesIt: false,
      isHuman: false, isObject: false, verbal: true, nonverbal: false,
      blind: false, disabled: false, hasLegs: true, hasArms: true, floats: false,
      hasPartner: false, ancient: false, newResident: false, vaNeeded: false,
      isAlgebralien: true, earthOrigin: false,
      isGreen: true, isBlue: false, isPurple: false, isOrange: false, isYellow: false, isBrown: false, isDark: false, isRed: false, isWhite: false, isPink: false, isGirl: false, isBoy: false, isNonbinary: true,
      roundShape: false, rectangularShape: false },
    { id: 'pbc', name: 'PBC', icon: '../images/icons/pbc.png',
      usesShe: false, usesHe: true, usesThey: false, usesIt: false,
      isHuman: false, isObject: true, verbal: true, nonverbal: false,
      blind: false, disabled: false, hasLegs: true, hasArms: true, floats: false,
      hasPartner: false, ancient: false, newResident: true, vaNeeded: true,
      isAlgebralien: false, earthOrigin: true,
      isGreen: false, isBlue: false, isPurple: false, isOrange: true, isYellow: false, isBrown: false, isDark: false, isRed: false, isWhite: false, isPink: false, isGirl: false, isBoy: true, isNonbinary: false,
      roundShape: false, rectangularShape: false },
    { id: 'cassette', name: 'Cassette', icon: '../images/icons/cassette.png',
      usesShe: true, usesHe: false, usesThey: true, usesIt: false,
      isHuman: false, isObject: true, verbal: true, nonverbal: false,
      blind: true, disabled: true, hasLegs: true, hasArms: true, floats: false,
      hasPartner: true, ancient: false, newResident: false, vaNeeded: false,
      isAlgebralien: false, earthOrigin: false,
      isGreen: false, isBlue: false, isPurple: false, isOrange: true, isYellow: true, isBrown: false, isDark: true, isRed: false, isWhite: false, isPink: false, isGirl: false, isBoy: false, isNonbinary: true,
      roundShape: false, rectangularShape: true },
    { id: 'greendaisy', name: 'Green D.A.I.S.Y.', icon: '../images/icons/greendaisy.png',
      usesShe: true, usesHe: false, usesThey: true, usesIt: false,
      isHuman: false, isObject: true, verbal: true, nonverbal: false,
      blind: false, disabled: false, hasLegs: true, hasArms: true, floats: false,
      hasPartner: false, ancient: true, newResident: false, vaNeeded: true,
      isAlgebralien: false, earthOrigin: false,
      isGreen: true, isBlue: false, isPurple: false, isOrange: false, isYellow: false, isBrown: false, isDark: false, isRed: false, isWhite: false, isPink: false, isGirl: false, isBoy: false, isNonbinary: true,
      roundShape: false, rectangularShape: true },
    { id: 'thehouse', name: 'The House', icon: '../images/icons/the house.png',
      usesShe: false, usesHe: false, usesThey: false, usesIt: true,
      isHuman: false, isObject: false, verbal: false, nonverbal: true,
      blind: false, disabled: false, hasLegs: false, hasArms: false, floats: false,
      hasPartner: false, ancient: true, newResident: false, vaNeeded: false,
      isAlgebralien: false, earthOrigin: false,
      isGreen: false, isBlue: false, isPurple: false, isOrange: false, isYellow: false, isBrown: false, isDark: false, isRed: false, isWhite: false, isPink: false, isGirl: false, isBoy: false, isNonbinary: true,
      roundShape: false, rectangularShape: false }
  ];

  // --- Question / trait matching -------------------------------------
  // Triggers deliberately avoid bare "he"/"she"/"they"/"it" -- those words
  // are the grammatical subject of nearly every question a player types
  // ("do THEY have legs?"), so treating them as pronoun-trait signals
  // meant almost every question got hijacked into a pronoun match. Pronoun
  // questions now require an actually pronoun-shaped phrase.
  var QUESTIONS = [
    { trait: 'usesShe', yes: 'Yes, she uses she/her pronouns.', no: "No, she's not a she/her.",
      triggers: ['sheher', 'she her', 'use she', 'uses she', 'goes by she', 'go by she', 'her pronoun', 'her pronouns', 'female pronoun'] },
    { trait: 'usesHe', yes: 'Yes, he uses he/him pronouns.', no: "No, he's not a he/him.",
      triggers: ['hehim', 'he him', 'use he', 'uses he', 'goes by he', 'go by he', 'his pronoun', 'his pronouns', 'male pronoun'] },
    { trait: 'usesThey', yes: 'Yes, they use they/them pronouns.', no: "No, not they/them.",
      triggers: ['theythem', 'they them', 'use they', 'uses they', 'goes by they', 'go by they', 'their pronoun', 'their pronouns', 'nonbinary pronoun'] },
    { trait: 'usesIt', yes: 'Yes, it goes by it/its.', no: "No, not it/its.",
      triggers: ['itits', 'it its', 'use it', 'uses it', 'goes by it', 'go by it', 'its pronoun', 'its pronouns'] },
    { trait: 'isHuman', yes: "Yes, they're human.", no: "No, not human.",
      triggers: ['human', 'person', 'people'] },
    { trait: 'isObject', yes: "Yes, they're a physical object.", no: "No — something stranger than that.",
      triggers: ['object', 'item', 'toy'] },
    { trait: 'verbal', yes: 'Yes, they talk normally.', no: "No, they don't really talk.",
      triggers: ['talk', 'speak', 'verbal', 'voice', 'loud', 'chatty'] },
    { trait: 'nonverbal', yes: "Yes, they're nonverbal.", no: "No, they're not nonverbal.",
      triggers: ['nonverbal', 'silent', 'mute', 'dont talk', 'doesnt talk'] },
    { trait: 'blind', yes: "Yes, they're blind.", no: 'No, they can see just fine.',
      triggers: ['blind', 'cant see', 'sight'] },
    { trait: 'disabled', yes: 'Yes, they have a disability.', no: 'No disability.',
      triggers: ['disabled', 'disability', 'impairment'] },
    { trait: 'hasLegs', yes: 'Yes, they have legs.', no: "No, no legs.",
      triggers: ['legs', 'leg', 'feet', 'walk'] },
    { trait: 'hasArms', yes: 'Yes, they have arms.', no: "No, no arms.",
      triggers: ['arms', 'arm', 'hands', 'hand'] },
    { trait: 'floats', yes: 'Yes, they float.', no: "No, they don't float.",
      triggers: ['float', 'floats', 'floating', 'fly', 'hover'] },
    { trait: 'hasPartner', yes: 'Yes, they have a romantic partner.', no: "No, they're single.",
      triggers: ['partner', 'girlfriend', 'boyfriend', 'dating', 'couple', 'relationship'] },
    { trait: 'ancient', yes: "Yes, they've been here 1,000+ blooms.", no: "No, under 1,000 blooms.",
      triggers: ['ancient', 'oldest resident', '1000 blooms', '1,000 blooms', 'long time', 'very old'] },
    { trait: 'newResident', yes: "Yes, they're a newer resident, under 50 blooms.", no: "No, they've been here longer than that.",
      triggers: ['newest', 'recently arrived', 'brand new', 'just arrived'] },
    { trait: 'vaNeeded', yes: 'Yes, their casting is still open.', no: "No, that role isn't open right now.",
      triggers: ['va needed', 'voice actor', 'need a voice', 'casting', 'voiced yet'] },
    { trait: 'isAlgebralien', yes: "Yes, they're an Algebralien.", no: "No, not an Algebralien.",
      triggers: ['algebralien', 'alien species', 'alien'] },
    { trait: 'earthOrigin', yes: "Yes, they're originally from Earth.", no: "No, not from Earth.",
      triggers: ['earth', 'from earth', 'earth origin'] },
    { trait: 'isGreen', yes: "Yes, they're green.", no: "No, not green.",
      triggers: ['green'] },
    { trait: 'isBlue', yes: "Yes, they're blue.", no: "No, not blue.",
      triggers: ['blue'] },
    { trait: 'isPurple', yes: "Yes, they're purple.", no: "No, not purple.",
      triggers: ['purple', 'violet', 'indigo colored', 'indigo coloured'] },
    { trait: 'isOrange', yes: "Yes, they're orange.", no: "No, not orange.",
      triggers: ['orange'] },
    { trait: 'isYellow', yes: "Yes, they're yellow.", no: "No, not yellow.",
      triggers: ['yellow', 'gold', 'golden'] },
    { trait: 'isBrown', yes: "Yes, they're brown.", no: "No, not brown.",
      triggers: ['brown', 'tan'] },
    { trait: 'isDark', yes: "Yes, they're dark-colored — black or near enough.", no: "No, not dark-colored.",
      triggers: ['black', 'dark colored', 'dark coloured', 'dark colour'] },
    { trait: 'isRed', yes: "Yes, they're red.", no: "No, not red.",
      triggers: ['red'] },
    { trait: 'isWhite', yes: "Yes, they're white.", no: "No, not white.",
      triggers: ['white', 'cream colored', 'cream coloured'] },
    { trait: 'isPink', yes: "Yes, they're pink.", no: "No, not pink.",
      triggers: ['pink', 'magenta'] },
    { trait: 'roundShape', yes: "Yes, they're round — a circle, sphere, or close to it.", no: "No, not round.",
      triggers: ['round', 'circle', 'circular', 'sphere', 'ball shaped', 'ball-shaped'] },
    { trait: 'rectangularShape', yes: "Yes, they're rectangular — boxy, book-shaped, screen-shaped.", no: "No, not rectangular.",
      triggers: ['rectangular', 'rectangle', 'square', 'box shaped', 'box-shaped', 'boxy'] },
    { trait: 'isGirl', yes: "Yes, they're a girl.", no: "No, not a girl.",
      triggers: ['girl', 'woman', 'female'] },
    { trait: 'isBoy', yes: "Yes, they're a boy.", no: "No, not a boy.",
      triggers: ['boy', 'man', 'male'] },
    { trait: 'isNonbinary', yes: "Yes, they're nonbinary.", no: "No, not nonbinary.",
      triggers: ['nonbinary', 'non binary', 'genderless', 'no gender', 'agender'] }
  ];

  function normalize(str) {
    return str.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
  }

  function matchQuestion(input) {
    var text = normalize(input);
    if (!text) return null;
    var best = null;
    var bestLen = 0;
    for (var i = 0; i < QUESTIONS.length; i++) {
      var q = QUESTIONS[i];
      for (var j = 0; j < q.triggers.length; j++) {
        var trigger = q.triggers[j];
        var re = new RegExp('\\b' + trigger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
        if (re.test(text) && trigger.length > bestLen) {
          best = q;
          bestLen = trigger.length;
        }
      }
    }
    return best;
  }

  // --- Game state ------------------------------------------------------
  var secret = null;
  var asked = []; // trait keys already asked
  var alive = {};  // id -> true if still a live candidate
  var turns = 0;
  var over = false;

  function pickSecret() {
    return CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
  }

  function resetGame() {
    secret = pickSecret();
    asked = [];
    alive = {};
    for (var i = 0; i < CHARACTERS.length; i++) alive[CHARACTERS[i].id] = true;
    turns = 0;
    over = false;
    logEl.innerHTML = '';
    resultEl.hidden = true;
    inputEl.value = '';
    inputEl.disabled = false;
    guessSelectEl.disabled = false;
    guessBtnEl.disabled = false;
    hintBtn.disabled = false;
    appendMessage('system', 'The House has picked someone. Start asking.');
    renderBoard();
    renderGuessOptions();
    updateHud();
  }

  function appendMessage(kind, text) {
    var div = document.createElement('div');
    div.className = 'gw-msg gw-msg-' + kind;
    div.textContent = text;
    logEl.appendChild(div);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function renderBoard() {
    boardEl.innerHTML = '';
    for (var i = 0; i < CHARACTERS.length; i++) {
      var c = CHARACTERS[i];
      var item = document.createElement('div');
      item.className = 'gw-board-item' + (alive[c.id] ? '' : ' is-out');
      var img = document.createElement('img');
      img.src = c.icon;
      img.alt = c.name;
      img.loading = 'lazy';
      var span = document.createElement('span');
      span.textContent = c.name;
      item.appendChild(img);
      item.appendChild(span);
      boardEl.appendChild(item);
    }
  }

  function renderGuessOptions() {
    guessSelectEl.innerHTML = '<option value="">Guess who it is&hellip;</option>';
    for (var i = 0; i < CHARACTERS.length; i++) {
      var c = CHARACTERS[i];
      if (!alive[c.id]) continue;
      var opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      guessSelectEl.appendChild(opt);
    }
  }

  function remainingCount() {
    var n = 0;
    for (var id in alive) if (alive[id]) n++;
    return n;
  }

  function updateHud() {
    turnCountEl.textContent = String(turns);
    remainingCountEl.textContent = String(remainingCount());
  }

  // --- The House's voice -------------------------------------------
  // Same character established in Crossroads: few words, dry, doesn't
  // chatter. Here it has to answer every question (that's the game), so
  // it can't go fully silent — but the asides stay rare and short, never
  // one per turn.
  var DONT_FOLLOW = [
    "That's not a question I answer.",
    "I don't follow.",
    "No idea what you're asking.",
  ];
  var REPEAT_QUESTION = [
    "Already answered that.",
    "Asked and answered.",
  ];
  var ONE_LEFT = [
    "One name left standing.",
    "You know who it is.",
  ];
  var ASIDE_CHANCE = 0.12;
  var ASIDES = [
    '…',
    'Keep going.',
    "Careful.",
    'Interesting question.',
  ];
  var WIN_LINES = [
    'Correct.',
    "That's the one.",
    'Yes.',
  ];
  var LOSE_LINES = [
    'Wrong.',
    'No.',
    'Not quite.',
  ];

  function pickLine(pool) {
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function withName(text) {
    // Avoids a double period when the name itself ends in one (e.g. "Green D.A.I.S.Y.").
    var end = /[.!?]$/.test(secret.name) ? '' : '.';
    return text + secret.name + end;
  }

  function endGame(won) {
    over = true;
    inputEl.disabled = true;
    guessSelectEl.disabled = true;
    guessBtnEl.disabled = true;
    hintBtn.disabled = true;
    appendMessage('house', withName((won ? pickLine(WIN_LINES) : pickLine(LOSE_LINES)) + ' It was '));
    resultEl.hidden = false;
    resultEl.textContent = won
      ? withName('Correct — it was ')
      : withName('Not quite — it was ') + ' Try again?';
  }

  // Records an answered trait, narrows the candidate pool, and refreshes
  // the board/HUD. Shared by both a typed question and a hint reveal.
  function applyAnswer(q, answer) {
    asked.push(q.trait);
    for (var i = 0; i < CHARACTERS.length; i++) {
      var c = CHARACTERS[i];
      if (!alive[c.id]) continue;
      if (!!c[q.trait] !== answer) alive[c.id] = false;
    }

    turns++;
    renderBoard();
    renderGuessOptions();
    updateHud();

    if (remainingCount() === 1) {
      appendMessage('house', pickLine(ONE_LEFT));
    }
  }

  // Picks the unasked question that splits the still-live candidates
  // closest to 50/50 — same information-gain idea as the original
  // AI-opponent design, just handed to the player on request instead.
  function bestHintQuestion() {
    var candidates = CHARACTERS.filter(function (c) { return alive[c.id]; });
    var best = null;
    var bestScore = Infinity;
    for (var i = 0; i < QUESTIONS.length; i++) {
      var q = QUESTIONS[i];
      if (asked.indexOf(q.trait) !== -1) continue;
      var yesCount = candidates.filter(function (c) { return !!c[q.trait]; }).length;
      var noCount = candidates.length - yesCount;
      if (yesCount === 0 || noCount === 0) continue; // asking this teaches nothing right now
      var score = Math.abs(yesCount - noCount);
      if (score < bestScore) {
        bestScore = score;
        best = q;
      }
    }
    return best;
  }

  function handleAsk(rawText) {
    if (over) return;
    var text = rawText.trim();
    if (!text) return;
    appendMessage('player', text);

    var q = matchQuestion(text);
    if (!q) {
      appendMessage('house', pickLine(DONT_FOLLOW) + ' Try color, shape, pronouns, or something simpler.');
      return;
    }
    if (asked.indexOf(q.trait) !== -1) {
      appendMessage('house', pickLine(REPEAT_QUESTION));
      return;
    }

    var answer = !!secret[q.trait];
    appendMessage('house', answer ? q.yes : q.no);
    if (Math.random() < ASIDE_CHANCE) {
      appendMessage('house', pickLine(ASIDES));
    }
    applyAnswer(q, answer);
  }

  function handleHint() {
    if (over) return;
    var q = bestHintQuestion();
    if (!q) {
      appendMessage('house', "Nothing left worth hinting. You'll have to guess.");
      return;
    }
    var answer = !!secret[q.trait];
    appendMessage('house', '(Hint) ' + (answer ? q.yes : q.no));
    applyAnswer(q, answer);
  }

  function handleGuess() {
    if (over) return;
    var id = guessSelectEl.value;
    if (!id) return;
    var guessed = CHARACTERS.filter(function (c) { return c.id === id; })[0];
    appendMessage('player', 'I guess ' + guessed.name + '.');
    endGame(id === secret.id);
  }

  formEl.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = inputEl.value;
    inputEl.value = '';
    handleAsk(text);
  });

  guessBtnEl.addEventListener('click', handleGuess);
  hintBtn.addEventListener('click', handleHint);
  restartBtn.addEventListener('click', resetGame);

  resetGame();
})();

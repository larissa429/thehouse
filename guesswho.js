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
  var introEl = document.getElementById('gwIntro');
  var modeSoloBtn = document.getElementById('gwModeSolo');
  var modeDuelBtn = document.getElementById('gwModeDuel');
  var pickerEl = document.getElementById('gwPicker');
  var pickerBoardEl = document.getElementById('gwPickerBoard');
  var houseTurnEl = document.getElementById('gwHouseTurn');
  var houseQuestionEl = document.getElementById('gwHouseQuestion');
  var houseYesBtn = document.getElementById('gwHouseYes');
  var houseNoBtn = document.getElementById('gwHouseNo');

  // --- Character data -----------------------------------------------
  var CHARACTERS = [
    { id: 'ap', name: 'Abstract Painting', icon: '../images/guesswhoicons/ap.png',
      usesShe: true, usesHe: false, usesThey: false, usesIt: false,
      isHuman: false, isObject: true, verbal: true, nonverbal: false,
      blind: false, disabled: false, hasLegs: true, hasArms: true, floats: false,
      hasPartner: false, ancient: false, newResident: false, vaNeeded: true,
      isAlgebralien: false, earthOrigin: true,
      isGreen: true, isBlue: true, isPurple: false, isOrange: false, isYellow: false, isBrown: false, isDark: false, isRed: true, isWhite: true, isPink: false, isGirl: true, isBoy: false, isNonbinary: false, isCisgender: true,
      roundShape: false, rectangularShape: true },
    { id: 'bluemarble', name: 'Blue Marble', icon: '../images/guesswhoicons/bluemarble.png',
      usesShe: true, usesHe: false, usesThey: false, usesIt: false,
      isHuman: false, isObject: true, verbal: true, nonverbal: false,
      blind: false, disabled: true, hasLegs: true, hasArms: true, floats: false,
      hasPartner: false, ancient: false, newResident: false, vaNeeded: false,
      isAlgebralien: false, earthOrigin: true,
      isGreen: false, isBlue: true, isPurple: false, isOrange: false, isYellow: false, isBrown: false, isDark: false, isRed: false, isWhite: false, isPink: false, isGirl: true, isBoy: false, isNonbinary: false, isCisgender: true,
      roundShape: true, rectangularShape: false },
    { id: 'charlie', name: 'Charlie', icon: '../images/guesswhoicons/charlie.png',
      usesShe: true, usesHe: false, usesThey: false, usesIt: false,
      isHuman: false, isObject: true, verbal: true, nonverbal: false,
      blind: false, disabled: false, hasLegs: true, hasArms: true, floats: false,
      hasPartner: false, ancient: false, newResident: true, vaNeeded: false,
      isAlgebralien: false, earthOrigin: true,
      isGreen: false, isBlue: true, isPurple: false, isOrange: false, isYellow: false, isBrown: false, isDark: false, isRed: false, isWhite: false, isPink: true, isGirl: false, isBoy: false, isNonbinary: true, isCisgender: false,
      roundShape: false, rectangularShape: false },
    { id: 'cools', name: 'Cool S', icon: '../images/guesswhoicons/cool s.png',
      usesShe: false, usesHe: false, usesThey: true, usesIt: false,
      isHuman: false, isObject: false, verbal: false, nonverbal: true,
      blind: false, disabled: false, hasLegs: false, hasArms: true, floats: true,
      hasPartner: true, ancient: false, newResident: true, vaNeeded: false,
      isAlgebralien: true, earthOrigin: false,
      isGreen: false, isBlue: false, isPurple: true, isOrange: false, isYellow: false, isBrown: false, isDark: false, isRed: false, isWhite: false, isPink: false, isGirl: false, isBoy: false, isNonbinary: true, isCisgender: false,
      roundShape: false, rectangularShape: false },
    { id: 'clickbaity', name: 'Clickbaity', icon: '../images/guesswhoicons/cool s.png',
      usesShe: false, usesHe: true, usesThey: false, usesIt: false,
      isHuman: false, isObject: true, verbal: true, nonverbal: false,
      blind: false, disabled: false, hasLegs: false, hasArms: false, floats: true,
      hasPartner: true, ancient: false, newResident: true, vaNeeded: false,
      isAlgebralien: false, earthOrigin: false,
      isGreen: false, isBlue: false, isPurple: false, isOrange: true, isYellow: false, isBrown: false, isDark: false, isRed: true, isWhite: false, isPink: false, isGirl: false, isBoy: true, isNonbinary: false, isCisgender: true,
      roundShape: false, rectangularShape: false },
    { id: 'dream', name: 'Dream', icon: '../images/guesswhoicons/dream.png',
      usesShe: false, usesHe: true, usesThey: false, usesIt: true,
      isHuman: false, isObject: false, verbal: false, nonverbal: true,
      blind: false, disabled: false, hasLegs: false, hasArms: false, floats: true,
      hasPartner: false, ancient: false, newResident: false, vaNeeded: false,
      isAlgebralien: false, earthOrigin: false,
      isGreen: false, isBlue: true, isPurple: true, isOrange: false, isYellow: false, isBrown: false, isDark: true, isRed: false, isWhite: false, isPink: false, isGirl: false, isBoy: false, isNonbinary: true, isCisgender: false,
      roundShape: true, rectangularShape: false },
    { id: 'dumptruck', name: 'Dumptruck', icon: '../images/guesswhoicons/dumptruck.png',
      usesShe: true, usesHe: false, usesThey: false, usesIt: false,
      isHuman: false, isObject: true, verbal: true, nonverbal: false,
      blind: false, disabled: false, hasLegs: false, hasArms: true, floats: false,
      hasPartner: false, ancient: false, newResident: true, vaNeeded: true,
      isAlgebralien: false, earthOrigin: false,
      isGreen: true, isBlue: false, isPurple: false, isOrange: false, isYellow: true, isBrown: false, isDark: false, isRed: false, isWhite: false, isPink: false, isGirl: true, isBoy: false, isNonbinary: false, isCisgender: true,
      roundShape: false, rectangularShape: true },
    { id: 'geeky', name: 'Geeky', icon: '../images/guesswhoicons/geeky.png',
      usesShe: false, usesHe: true, usesThey: false, usesIt: false,
      isHuman: false, isObject: true, verbal: true, nonverbal: false,
      blind: false, disabled: false, hasLegs: true, hasArms: true, floats: false,
      hasPartner: false, ancient: false, newResident: false, vaNeeded: false,
      isAlgebralien: false, earthOrigin: true,
      isGreen: false, isBlue: false, isPurple: false, isOrange: true, isYellow: false, isBrown: false, isDark: false, isRed: false, isWhite: false, isPink: false, isGirl: false, isBoy: true, isNonbinary: false, isCisgender: true,
      roundShape: false, rectangularShape: false },
    { id: 'indigo', name: 'Indigo', icon: '../images/guesswhoicons/indigo.png',
      usesShe: false, usesHe: true, usesThey: false, usesIt: false,
      isHuman: false, isObject: false, verbal: false, nonverbal: true,
      blind: false, disabled: false, hasLegs: true, hasArms: false, floats: false,
      hasPartner: false, ancient: true, newResident: false, vaNeeded: false,
      isAlgebralien: false, earthOrigin: false,
      isGreen: false, isBlue: false, isPurple: true, isOrange: false, isYellow: false, isBrown: false, isDark: false, isRed: false, isWhite: false, isPink: false, isGirl: false, isBoy: false, isNonbinary: true, isCisgender: false,
      roundShape: true, rectangularShape: false },
    { id: 'journal', name: 'Journal', icon: '../images/guesswhoicons/journal.png',
      usesShe: false, usesHe: true, usesThey: false, usesIt: false,
      isHuman: false, isObject: true, verbal: true, nonverbal: false,
      blind: false, disabled: false, hasLegs: true, hasArms: true, floats: false,
      hasPartner: false, ancient: true, newResident: false, vaNeeded: true,
      isAlgebralien: false, earthOrigin: false,
      isGreen: false, isBlue: false, isPurple: false, isOrange: false, isYellow: true, isBrown: true, isDark: false, isRed: false, isWhite: false, isPink: false, isGirl: false, isBoy: true, isNonbinary: false, isCisgender: true,
      roundShape: false, rectangularShape: true },
    { id: 'liz', name: 'Liz', icon: '../images/guesswhoicons/liz.png',
      usesShe: true, usesHe: false, usesThey: false, usesIt: false,
      isHuman: true, isObject: false, verbal: true, nonverbal: false,
      blind: false, disabled: false, hasLegs: true, hasArms: true, floats: false,
      hasPartner: false, ancient: false, newResident: false, vaNeeded: true,
      isAlgebralien: false, earthOrigin: true,
      isGreen: false, isBlue: false, isPurple: false, isOrange: false, isYellow: true, isBrown: false, isDark: false, isRed: false, isWhite: false, isPink: true, isGirl: true, isBoy: false, isNonbinary: false, isCisgender: true,
      roundShape: false, rectangularShape: false },
    { id: 'lp', name: 'Long Play', icon: '../images/guesswhoicons/lp.png',
      usesShe: true, usesHe: false, usesThey: false, usesIt: false,
      isHuman: false, isObject: true, verbal: false, nonverbal: true,
      blind: false, disabled: true, hasLegs: true, hasArms: true, floats: false,
      hasPartner: true, ancient: false, newResident: false, vaNeeded: false,
      isAlgebralien: false, earthOrigin: false,
      isGreen: false, isBlue: true, isPurple: false, isOrange: false, isYellow: false, isBrown: false, isDark: true, isRed: false, isWhite: false, isPink: true, isGirl: true, isBoy: false, isNonbinary: false, isCisgender: true,
      roundShape: true, rectangularShape: false },
    { id: 'mirror', name: 'Mirror', icon: '../images/guesswhoicons/mirror.png',
      usesShe: true, usesHe: false, usesThey: false, usesIt: false,
      isHuman: false, isObject: true, verbal: true, nonverbal: false,
      blind: false, disabled: false, hasLegs: true, hasArms: true, floats: false,
      hasPartner: false, ancient: true, newResident: false, vaNeeded: false,
      isAlgebralien: false, earthOrigin: true,
      isGreen: false, isBlue: true, isPurple: false, isOrange: false, isYellow: true, isBrown: false, isDark: false, isRed: false, isWhite: false, isPink: false, isGirl: true, isBoy: false, isNonbinary: false, isCisgender: true,
      roundShape: true, rectangularShape: false },
    { id: 'n528', name: '-⁵⁄₂₈', icon: '../images/guesswhoicons/n528.png',
      usesShe: false, usesHe: true, usesThey: true, usesIt: false,
      isHuman: false, isObject: false, verbal: true, nonverbal: false,
      blind: false, disabled: false, hasLegs: true, hasArms: true, floats: false,
      hasPartner: false, ancient: false, newResident: false, vaNeeded: false,
      isAlgebralien: true, earthOrigin: false,
      isGreen: true, isBlue: false, isPurple: false, isOrange: false, isYellow: false, isBrown: false, isDark: false, isRed: false, isWhite: false, isPink: false, isGirl: false, isBoy: false, isNonbinary: true, isCisgender: false,
      roundShape: false, rectangularShape: false },
    { id: 'pbc', name: 'PBC', icon: '../images/guesswhoicons/pbc.png',
      usesShe: false, usesHe: true, usesThey: false, usesIt: false,
      isHuman: false, isObject: true, verbal: true, nonverbal: false,
      blind: false, disabled: false, hasLegs: true, hasArms: true, floats: false,
      hasPartner: false, ancient: false, newResident: true, vaNeeded: true,
      isAlgebralien: false, earthOrigin: true,
      isGreen: false, isBlue: false, isPurple: false, isOrange: true, isYellow: false, isBrown: false, isDark: false, isRed: false, isWhite: false, isPink: false, isGirl: false, isBoy: true, isNonbinary: false, isCisgender: true,
      roundShape: false, rectangularShape: false },
    { id: 'cassette', name: 'Cassette', icon: '../images/guesswhoicons/cassette.png',
      usesShe: true, usesHe: false, usesThey: true, usesIt: false,
      isHuman: false, isObject: true, verbal: true, nonverbal: false,
      blind: true, disabled: true, hasLegs: true, hasArms: true, floats: false,
      hasPartner: true, ancient: false, newResident: false, vaNeeded: false,
      isAlgebralien: false, earthOrigin: false,
      isGreen: false, isBlue: false, isPurple: false, isOrange: true, isYellow: true, isBrown: false, isDark: true, isRed: false, isWhite: false, isPink: false, isGirl: false, isBoy: false, isNonbinary: true, isCisgender: false,
      roundShape: false, rectangularShape: true },
    { id: 'greendaisy', name: 'Green D.A.I.S.Y.', icon: '../images/guesswhoicons/greendaisy.png',
      usesShe: true, usesHe: false, usesThey: true, usesIt: false,
      isHuman: false, isObject: true, verbal: true, nonverbal: false,
      blind: false, disabled: false, hasLegs: true, hasArms: true, floats: false,
      hasPartner: false, ancient: true, newResident: false, vaNeeded: true,
      isAlgebralien: false, earthOrigin: false,
      isGreen: true, isBlue: false, isPurple: false, isOrange: false, isYellow: false, isBrown: false, isDark: false, isRed: false, isWhite: false, isPink: false, isGirl: false, isBoy: false, isNonbinary: true, isCisgender: false,
      roundShape: false, rectangularShape: true },
    { id: 'thehouse', name: 'The House', icon: '../images/guesswhoicons/the house.png',
      usesShe: false, usesHe: false, usesThey: false, usesIt: true,
      isHuman: false, isObject: false, verbal: false, nonverbal: true,
      blind: false, disabled: false, hasLegs: false, hasArms: false, floats: false,
      hasPartner: false, ancient: true, newResident: false, vaNeeded: false,
      isAlgebralien: false, earthOrigin: false,
      isGreen: false, isBlue: false, isPurple: false, isOrange: false, isYellow: false, isBrown: false, isDark: false, isRed: false, isWhite: false, isPink: false, isGirl: false, isBoy: false, isNonbinary: true, isCisgender: false,
      roundShape: false, rectangularShape: false }
  ];

  // --- Question / trait matching -------------------------------------
  // Triggers deliberately avoid bare "he"/"she"/"they"/"it" -- those words
  // are the grammatical subject of nearly every question a player types
  // ("do THEY have legs?"), so treating them as pronoun-trait signals
  // meant almost every question got hijacked into a pronoun match. Pronoun
  // questions now require an actually pronoun-shaped phrase.
  var QUESTIONS = [
    { trait: 'usesShe', prompt: "Does your pick use she/her pronouns?", yes: 'Yes, she uses she/her pronouns.', no: "No, not she/her.",
      triggers: ['sheher', 'she her', 'use she', 'uses she', 'goes by she', 'go by she', 'she pronoun', 'she pronouns', 'her pronoun', 'her pronouns', 'female pronoun'] },
    { trait: 'usesHe', prompt: "Does your pick use he/him pronouns?", yes: 'Yes, he uses he/him pronouns.', no: "No, not he/him.",
      triggers: ['hehim', 'he him', 'use he', 'uses he', 'goes by he', 'go by he', 'he pronoun', 'he pronouns', 'his pronoun', 'his pronouns', 'male pronoun'] },
    { trait: 'usesThey', prompt: "Does your pick use they/them pronouns?", yes: 'Yes, they use they/them pronouns.', no: "No, not they/them.",
      triggers: ['theythem', 'they them', 'use they', 'uses they', 'goes by they', 'go by they', 'they pronoun', 'they pronouns', 'their pronoun', 'their pronouns', 'nonbinary pronoun'] },
    { trait: 'usesIt', prompt: "Does your pick use it/its pronouns?", yes: 'Yes, it goes by it/its.', no: "No, not it/its.",
      triggers: ['itits', 'it its', 'use it', 'uses it', 'goes by it', 'go by it', 'it pronoun', 'it pronouns', 'its pronoun', 'its pronouns'] },
    { trait: 'isHuman', prompt: "Is your pick human?", yes: "Yes, they're human.", no: "No, not human.",
      triggers: ['human', 'person', 'people'] },
    { trait: 'isObject', prompt: "Is your pick a physical object?", yes: "Yes, they're a physical object.", no: "No — something stranger than that.",
      triggers: ['object', 'item', 'toy'] },
    { trait: 'verbal', prompt: "Does your pick talk normally?", yes: 'Yes, they talk normally.', no: "No, they don't really talk.",
      triggers: ['talk', 'speak', 'verbal', 'voice', 'loud', 'chatty'] },
    { trait: 'nonverbal', prompt: "Is your pick nonverbal or silent?", yes: "Yes, they're nonverbal.", no: "No, they're not nonverbal.",
      triggers: ['nonverbal', 'silent', 'mute', 'dont talk', 'doesnt talk'] },
    { trait: 'blind', prompt: "Is your pick blind?", yes: "Yes, they're blind.", no: 'No, they can see just fine.',
      triggers: ['blind', 'cant see', 'sight'] },
    { trait: 'disabled', prompt: "Does your pick have a disability?", yes: 'Yes, they have a disability.', no: 'No disability.',
      triggers: ['disabled', 'disability', 'impairment'] },
    { trait: 'hasLegs', prompt: "Does your pick have legs?", yes: 'Yes, they have legs.', no: "No, no legs.",
      triggers: ['legs', 'leg', 'feet', 'walk'] },
    { trait: 'hasArms', prompt: "Does your pick have arms?", yes: 'Yes, they have arms.', no: "No, no arms.",
      triggers: ['arms', 'arm', 'hands', 'hand'] },
    { trait: 'floats', prompt: "Does your pick float?", yes: 'Yes, they float.', no: "No, they don't float.",
      triggers: ['float', 'floats', 'floating', 'fly', 'hover'] },
    { trait: 'hasPartner', prompt: "Does your pick have a romantic partner?", yes: 'Yes, they have a romantic partner.', no: "No, they're single.",
      triggers: ['partner', 'girlfriend', 'boyfriend', 'dating', 'couple', 'relationship'] },
    { trait: 'ancient', prompt: "Has your pick been in the Inbetween 1,000+ blooms?", yes: "Yes, they've been here 1,000+ blooms.", no: "No, under 1,000 blooms.",
      triggers: ['ancient', 'oldest resident', '1000 blooms', '1,000 blooms', 'long time', 'very old'] },
    { trait: 'newResident', prompt: "Is your pick a newer resident, under 50 blooms?", yes: "Yes, they're a newer resident, under 50 blooms.", no: "No, they've been here longer than that.",
      triggers: ['newest', 'recently arrived', 'brand new', 'just arrived'] },
    { trait: 'vaNeeded', prompt: "Does your pick's casting still need a voice actor?", yes: 'Yes, their casting is still open.', no: "No, that role isn't open right now.",
      triggers: ['va needed', 'voice actor', 'need a voice', 'casting', 'voiced yet'] },
    { trait: 'isAlgebralien', prompt: "Is your pick an Algebralien?", yes: "Yes, they're an Algebralien.", no: "No, not an Algebralien.",
      triggers: ['algebralien', 'alien species', 'alien'] },
    { trait: 'earthOrigin', prompt: "Is your pick originally from Earth?", yes: "Yes, they're originally from Earth.", no: "No, not from Earth.",
      triggers: ['earth', 'from earth', 'earth origin'] },
    { trait: 'isGreen', prompt: "Is your pick green?", yes: "Yes, they're green.", no: "No, not green.",
      triggers: ['green'] },
    { trait: 'isBlue', prompt: "Is your pick blue?", yes: "Yes, they're blue.", no: "No, not blue.",
      triggers: ['blue'] },
    { trait: 'isPurple', prompt: "Is your pick purple?", yes: "Yes, they're purple.", no: "No, not purple.",
      triggers: ['purple', 'violet', 'indigo colored', 'indigo coloured'] },
    { trait: 'isOrange', prompt: "Is your pick orange?", yes: "Yes, they're orange.", no: "No, not orange.",
      triggers: ['orange'] },
    { trait: 'isYellow', prompt: "Is your pick yellow?", yes: "Yes, they're yellow.", no: "No, not yellow.",
      triggers: ['yellow', 'gold', 'golden'] },
    { trait: 'isBrown', prompt: "Is your pick brown?", yes: "Yes, they're brown.", no: "No, not brown.",
      triggers: ['brown', 'tan'] },
    { trait: 'isDark', prompt: "Is your pick dark-colored?", yes: "Yes, they're dark-colored — black or near enough.", no: "No, not dark-colored.",
      triggers: ['black', 'dark colored', 'dark coloured', 'dark colour'] },
    { trait: 'isRed', prompt: "Is your pick red?", yes: "Yes, they're red.", no: "No, not red.",
      triggers: ['red'] },
    { trait: 'isWhite', prompt: "Is your pick white?", yes: "Yes, they're white.", no: "No, not white.",
      triggers: ['white', 'cream colored', 'cream coloured'] },
    { trait: 'isPink', prompt: "Is your pick pink?", yes: "Yes, they're pink.", no: "No, not pink.",
      triggers: ['pink', 'magenta'] },
    { trait: 'roundShape', prompt: "Is your pick round?", yes: "Yes, they're round — a circle, sphere, or close to it.", no: "No, not round.",
      triggers: ['round', 'circle', 'circular', 'sphere', 'ball shaped', 'ball-shaped'] },
    { trait: 'rectangularShape', prompt: "Is your pick rectangular?", yes: "Yes, they're rectangular — boxy, book-shaped, screen-shaped.", no: "No, not rectangular.",
      triggers: ['rectangular', 'rectangle', 'square', 'box shaped', 'box-shaped', 'boxy'] },
    { trait: 'isGirl', prompt: "Is your pick a girl?", yes: "Yes, they're a girl.", no: "No, not a girl.",
      triggers: ['girl', 'woman', 'female'] },
    { trait: 'isBoy', prompt: "Is your pick a boy?", yes: "Yes, they're a boy.", no: "No, not a boy.",
      triggers: ['boy', 'man', 'male'] },
    { trait: 'isNonbinary', prompt: "Is your pick nonbinary?", yes: "Yes, they're nonbinary.", no: "No, not nonbinary.",
      triggers: ['nonbinary', 'non binary', 'genderless', 'no gender', 'agender'] },
    { trait: 'isCisgender', prompt: "Is your pick cisgender?", yes: "Yes, they're cisgender.", no: "No, not cisgender.",
      triggers: ['cisgender', 'cis gender', 'cis'] }
  ];

  // Icons live in images/guesswhoicons/ — manually cropped versions of the
  // site's character icons, framed specifically for this game's square
  // tiles, so no runtime zoom/crop math is needed here anymore.
  function makeIconEl(c) {
    var icon = document.createElement('div');
    icon.className = 'gw-icon';
    icon.setAttribute('role', 'img');
    icon.setAttribute('aria-label', c.name);
    icon.style.backgroundImage = 'url(' + JSON.stringify(c.icon) + ')';
    return icon;
  }

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
  var mode = 'solo'; // 'solo' | 'duel'
  var secret = null;
  var asked = []; // trait keys already asked (player's questions about the House's pick)
  var alive = {};  // id -> true if still a live candidate (House's pick, from player's POV)
  var turns = 0;
  var over = false;

  // Duel-only state: the House trying to guess the player's chosen character.
  var playerCharId = null;
  var houseAsked = [];
  var houseAlive = {};
  var pendingHouseQuestion = null;

  function pickSecret() {
    return CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
  }

  function setMode(newMode) {
    mode = newMode;
    modeSoloBtn.classList.toggle('is-active', mode === 'solo');
    modeDuelBtn.classList.toggle('is-active', mode === 'duel');
    resetGame();
  }

  function resetGame() {
    pendingHouseQuestion = null;
    houseTurnEl.hidden = true;
    if (mode === 'duel') {
      startDuelPicker();
    } else {
      startSoloGame();
    }
  }

  function startSoloGame() {
    introEl.textContent = "The House has picked one resident and isn't telling. Ask yes/no questions — type them however feels natural — and narrow it down before you make your guess.";
    pickerEl.hidden = true;
    boardEl.hidden = false;
    logEl.hidden = false;
    formEl.hidden = false;
    document.querySelector('.gw-guess-row').hidden = false;

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

  // --- Head-to-head duel -------------------------------------------------
  // Player picks a character; the House tries to guess it by asking its own
  // questions (same entropy-based picker as Hint) while the player races to
  // guess the House's separately-chosen secret. Turns alternate: after the
  // player asks/hints, the House immediately asks its own question and
  // waits for a Yes/No answer before the player can act again.
  function startDuelPicker() {
    introEl.textContent = 'Pick a character to be your secret pick — the House will try to guess it while you try to guess its pick.';
    playerCharId = null;
    logEl.innerHTML = '';
    resultEl.hidden = true;
    pickerEl.hidden = false;
    boardEl.hidden = true;
    logEl.hidden = true;
    formEl.hidden = true;
    document.querySelector('.gw-guess-row').hidden = true;
    houseTurnEl.hidden = true;
    turnCountEl.textContent = '0';
    remainingCountEl.textContent = '—';
    renderPickerBoard();
  }

  function renderPickerBoard() {
    pickerBoardEl.innerHTML = '';
    for (var i = 0; i < CHARACTERS.length; i++) {
      (function (c) {
        var item = document.createElement('div');
        item.className = 'gw-board-item';
        var span = document.createElement('span');
        span.textContent = c.name;
        item.appendChild(makeIconEl(c));
        item.appendChild(span);
        item.addEventListener('click', function () { beginDuel(c.id); });
        pickerBoardEl.appendChild(item);
      })(CHARACTERS[i]);
    }
  }

  function beginDuel(charId) {
    playerCharId = charId;
    pickerEl.hidden = true;
    boardEl.hidden = false;
    logEl.hidden = false;
    formEl.hidden = false;
    document.querySelector('.gw-guess-row').hidden = false;
    introEl.textContent = "You're up against the House. Ask questions to find its pick before it finds yours.";

    do {
      secret = pickSecret();
    } while (secret.id === playerCharId && CHARACTERS.length > 1);

    asked = [];
    alive = {};
    for (var i = 0; i < CHARACTERS.length; i++) alive[CHARACTERS[i].id] = true;
    turns = 0;
    over = false;

    houseAsked = [];
    houseAlive = {};
    for (var j = 0; j < CHARACTERS.length; j++) houseAlive[CHARACTERS[j].id] = true;

    logEl.innerHTML = '';
    resultEl.hidden = true;
    inputEl.value = '';
    inputEl.disabled = false;
    guessSelectEl.disabled = false;
    guessBtnEl.disabled = false;
    hintBtn.disabled = false;

    var playerPick = CHARACTERS.filter(function (c) { return c.id === playerCharId; })[0];
    appendMessage('system', 'Duel started. Your pick: ' + playerPick.name + '. Find the House\'s pick before it finds yours.');
    renderBoard();
    renderGuessOptions();
    updateHud();
    askHouseQuestion();
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
      var span = document.createElement('span');
      span.textContent = c.name;
      item.appendChild(makeIconEl(c));
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

  function lockControls() {
    over = true;
    inputEl.disabled = true;
    guessSelectEl.disabled = true;
    guessBtnEl.disabled = true;
    hintBtn.disabled = true;
    houseTurnEl.hidden = true;
    pendingHouseQuestion = null;
  }

  function endGame(won) {
    lockControls();

    if (mode === 'duel') {
      var playerPick = CHARACTERS.filter(function (c) { return c.id === playerCharId; })[0];
      appendMessage('house', withName((won ? pickLine(WIN_LINES) : pickLine(LOSE_LINES)) + ' My pick was '));
      resultEl.hidden = false;
      resultEl.textContent = won
        ? 'You win — the House\'s pick was ' + secret.name + '. It never guessed yours (' + playerPick.name + ').'
        : 'You lost — the House\'s pick was ' + secret.name + ', and that guess was wrong. Your pick was ' + playerPick.name + '.';
      return;
    }

    appendMessage('house', withName((won ? pickLine(WIN_LINES) : pickLine(LOSE_LINES)) + ' It was '));
    resultEl.hidden = false;
    resultEl.textContent = won
      ? withName('Correct — it was ')
      : withName('Not quite — it was ') + ' Try again?';
  }

  // The House guesses the player's pick (duel mode only). Only fires once
  // its own candidate pool is down to one, so with honest answers this is
  // always correct — the fallback branch is just a safety net.
  function houseWinsDuel(guessedChar) {
    lockControls();
    var playerPick = CHARACTERS.filter(function (c) { return c.id === playerCharId; })[0];
    appendMessage('house', 'I guess ' + guessedChar.name + '.');
    var correct = guessedChar.id === playerCharId;
    resultEl.hidden = false;
    if (correct) {
      resultEl.textContent = 'The House wins — it guessed your pick (' + playerPick.name + ') first. Its own pick was ' + secret.name + '.';
    } else {
      // Only reachable with inconsistent answers (the true pick got
      // eliminated by a contradiction) — a rare tie, not a real win for
      // either side.
      appendMessage('house', "That doesn't add up.");
      resultEl.textContent = 'No winner this round — the House\'s answers stopped adding up, so it guessed ' + guessedChar.name + ' and was wrong. Your pick was ' + playerPick.name + '. Start a new duel and answer straight.';
    }
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

  // Picks the unasked question that splits a candidate pool closest to
  // 50/50 — the same information-gain idea used for Hint, and for the
  // House's own questions when it's trying to guess the player's pick.
  function bestQuestionAmong(candidates, askedList) {
    var best = null;
    var bestScore = Infinity;
    for (var i = 0; i < QUESTIONS.length; i++) {
      var q = QUESTIONS[i];
      if (askedList.indexOf(q.trait) !== -1) continue;
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

  function bestHintQuestion() {
    var candidates = CHARACTERS.filter(function (c) { return alive[c.id]; });
    return bestQuestionAmong(candidates, asked);
  }

  function isPlayerTurn() {
    return mode !== 'duel' || !pendingHouseQuestion;
  }

  function handleAsk(rawText) {
    if (over || !isPlayerTurn()) return;
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
    if (!over && mode === 'duel') askHouseQuestion();
  }

  function handleHint() {
    if (over || !isPlayerTurn()) return;
    var q = bestHintQuestion();
    if (!q) {
      appendMessage('house', "Nothing left worth hinting. You'll have to guess.");
      return;
    }
    var answer = !!secret[q.trait];
    appendMessage('house', '(Hint) ' + (answer ? q.yes : q.no));
    applyAnswer(q, answer);
    if (!over && mode === 'duel') askHouseQuestion();
  }

  function handleGuess() {
    if (over || !isPlayerTurn()) return;
    var id = guessSelectEl.value;
    if (!id) return;
    var guessed = CHARACTERS.filter(function (c) { return c.id === id; })[0];
    appendMessage('player', 'I guess ' + guessed.name + '.');
    endGame(id === secret.id);
  }

  // --- The House's turn (duel mode) --------------------------------------
  function askHouseQuestion() {
    if (over) return;
    var candidates = CHARACTERS.filter(function (c) { return houseAlive[c.id]; });
    var q = bestQuestionAmong(candidates, houseAsked);

    if (!q || candidates.length === 1) {
      var guess = candidates[0] || CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
      houseWinsDuel(guess);
      return;
    }

    pendingHouseQuestion = q;
    houseQuestionEl.textContent = q.prompt;
    houseTurnEl.hidden = false;
    inputEl.disabled = true;
    hintBtn.disabled = true;
    guessSelectEl.disabled = true;
    guessBtnEl.disabled = true;
  }

  function handleHouseAnswer(isYes) {
    if (over || !pendingHouseQuestion) return;
    var q = pendingHouseQuestion;
    appendMessage('player', isYes ? 'Yes.' : 'No.');
    houseAsked.push(q.trait);
    for (var i = 0; i < CHARACTERS.length; i++) {
      var c = CHARACTERS[i];
      if (!houseAlive[c.id]) continue;
      if (!!c[q.trait] !== isYes) houseAlive[c.id] = false;
    }
    pendingHouseQuestion = null;
    houseTurnEl.hidden = true;

    // Hands the turn back to the player — the House doesn't get to ask
    // again until the player has asked, hinted, or guessed.
    if (over) return;
    inputEl.disabled = false;
    hintBtn.disabled = false;
    guessSelectEl.disabled = false;
    guessBtnEl.disabled = false;
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
  houseYesBtn.addEventListener('click', function () { handleHouseAnswer(true); });
  houseNoBtn.addEventListener('click', function () { handleHouseAnswer(false); });
  modeSoloBtn.addEventListener('click', function () { setMode('solo'); });
  modeDuelBtn.addEventListener('click', function () { setMode('duel'); });

  setMode('solo');
})();

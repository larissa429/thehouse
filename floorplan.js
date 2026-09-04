// Floor Plan — a procedurally generated house layout.
//
// The House doesn't have one fixed interior, so every page load carves a
// fresh set of rooms with a small generator instead of using one hand-drawn
// map — but it's not just "chop a box into smaller boxes." Every floor is
// built around a central corridor, with rooms attached along both sides of
// it, the way an actual floor plan reads: circulation space down the
// middle, rooms lining it. Floors 1 and 3 are both "hangout" floors drawing
// from the same weighted room pool; floor 2 is one long stretch of
// bedrooms, doors lining both walls of the hallway. A colored dot per
// resident sits wherever they've actually landed this load — nobody shows
// up somewhere they aren't, bedrooms included. Tap a dot to see who it is.
// Two extra, much rarer things can appear alongside the normal rooms — see
// LOCKED_DOOR and HIDDEN_DOOR below.

(function () {
  var tabsEl = document.getElementById('floorplanTabs');
  if (!tabsEl) return; // not on the Floor Plan page

  var svgEl = document.getElementById('floorplanSvg');
  var layerEl = document.getElementById('floorplanLayer');
  var captionEl = document.getElementById('floorplanCaption');
  var noteOverlay = document.getElementById('note-overlay');
  var noteEl = document.getElementById('note-content');
  var noteBody = document.getElementById('note-body');

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var HIDDEN_DOOR_KEY = 'thehouse-floorplan-basement-door-found';

  // --- Tunable odds — the whole point of this comment is "go ahead and
  // change these numbers later without needing to touch anything else." ---
  var ABSENCE_CHANCE = 0.18;       // any resident but Journal, per load
  var BEDROOM_STAY_CHANCE = 0.3;   // odds a present resident is just in their own room today
  var EXTRA_ROOM_SLOTS = 3;        // how many extra rolls floors 1 & 3 get past the staples
  var RARE_ROOM_CHANCE = 0.42;     // per extra slot
  var RARER_ROOM_CHANCE = 0.12;    // per extra slot (independent of the rare roll)
  var HIDDEN_DOOR_CHANCE = 0.09;   // floor 1 only, only if not already found
  var LOCKED_DOOR_CHANCE = 0.05;   // floor 2 only — Penny, an even rarer find
  var WANDER_CHECK_MS = 9000;      // how often a dot might decide to wander
  var WANDER_CHANCE = 0.35;        // odds a wander check actually moves someone
  var WANDER_LEG_MS = 1400;        // duration of each leg (room -> hallway -> room)

  // --- Residents ---------------------------------------------------------
  // Colors match each resident's existing connection-note color in
  // styles.css (.note[data-color]) — nothing new invented there. Clickbaity
  // is the one real gap (he used to share a color with Cool S, since they
  // were one page) — gets the site's existing red accent instead.
  //
  // defaultChance is how often a resident with a defaultRoom actually goes
  // there instead of falling through to the normal closeness-biased pick —
  // omitted means "always" (Mirror really is in the kitchen constantly).
  // AP and PBC both default to the bathroom, which reads wrong if it's
  // guaranteed every single load — a bathroom is a quick stop, not a
  // hangout, so it's a coin-flip-ish chance instead.

  var RESIDENTS = [
    { slug: 'journal', name: 'Journal', icon: '../images/icons/journal.png', color: '#d9b473', alwaysHome: true },
    { slug: 'mirror', name: 'Mirror', icon: '../images/icons/mirror.png', color: '#cfe0d8', defaultRoom: 'Kitchen' },
    { slug: 'lp', name: 'LP', icon: '../images/icons/lp.png', color: '#cfa8d4' },
    { slug: 'n528', name: '-⁵⁄₂₈', icon: '../images/icons/n528.png', color: '#b8d4c9' },
    { slug: 'dream', name: 'Dream', icon: '../images/icons/dream.png', color: '#c7b8d4' },
    { slug: 'indigo', name: 'Indigo', icon: '../images/icons/indigo.png', color: '#b8a8d4' },
    { slug: 'cassette', name: 'Cassette', icon: '../images/icons/cassette.png', color: '#f0a878' },
    { slug: 'bluemarble', name: 'Blue Marble', icon: '../images/icons/bluemarble.png', color: '#a8d4c4' },
    { slug: 'ap', name: 'AP', icon: '../images/icons/ap.png', color: '#e8a2a8', defaultRoom: 'Bathroom', defaultChance: 0.45 },
    { slug: 'cools', name: 'Cool S', icon: '../images/icons/cool s.png', color: '#c4b0e8', pair: 'clickbaity' },
    { slug: 'clickbaity', name: 'Clickbaity', icon: '../images/clickbaity.png', color: '#c0463c', pair: 'cools' },
    { slug: 'geeky', name: 'Geeky', icon: '../images/icons/geeky.png', color: '#f0955a' },
    { slug: 'pbc', name: 'PBC', icon: '../images/icons/pbc.png', color: '#e8781e', defaultRoom: 'Bathroom', defaultChance: 0.45 },
    // Dumptruck's only known hangout is her own (famously trashed) bedroom —
    // so unless a rare-room cast claims her, she's just always there.
    { slug: 'dumptruck', name: 'Dumptruck', icon: '../images/icons/dumptruck.png', color: '#3f6b32', noHangoutDefault: true }
  ];

  function findResident(slug) {
    for (var i = 0; i < RESIDENTS.length; i++) if (RESIDENTS[i].slug === slug) return RESIDENTS[i];
    return null;
  }

  // --- Closeness graph -----------------------------------------------
  // Pulled from each character's own Connections section, not invented.
  // Positive = pulls two residents toward the same room; negative = pushes
  // apart. This is a soft bias for placement, never a hard rule.
  var CLOSENESS = [
    ['journal', 'mirror', 3], ['journal', 'n528', 3], ['journal', 'bluemarble', -1], ['journal', 'dumptruck', 1],
    ['mirror', 'bluemarble', 3], ['mirror', 'ap', 1],
    ['lp', 'cassette', 3],
    ['cassette', 'indigo', 3], ['cassette', 'bluemarble', 3],
    ['n528', 'dream', 3],
    ['geeky', 'clickbaity', 3], ['geeky', 'cools', 2],
    ['indigo', 'dumptruck', -1],
    ['pbc', 'journal', -2], ['pbc', 'mirror', -2], ['pbc', 'cassette', -2],
    ['ap', 'cools', -1], ['ap', 'clickbaity', -1]
  ];

  function closenessBetween(a, b) {
    for (var i = 0; i < CLOSENESS.length; i++) {
      var e = CLOSENESS[i];
      if ((e[0] === a && e[1] === b) || (e[0] === b && e[1] === a)) return e[2];
    }
    return 0;
  }

  // --- Room pool -----------------------------------------------------

  var STAPLES = ['Kitchen & Dining Room', 'Living Room', 'Foyer', 'Bathroom'];
  var RARE = ['In-House Theater', 'Courtyard', 'Crafts Room', 'Music Room', 'Arcade Nook', 'Sunroom', 'Board Game Den'];
  var RARER = ['Indoor Treehouse', 'Snow Room', 'Pillow Pit', 'Planetarium', 'Karaoke Bar & Grill'];

  // Optional author-picked casts — if the room spawns AND everyone in its
  // cast is home, there's a chance the whole scene actually happens.
  var ROOM_CASTS = {
    'Karaoke Bar & Grill': ['journal', 'mirror', 'n528', 'dream', 'cassette', 'lp', 'indigo', 'bluemarble'],
    'In-House Theater': ['journal', 'mirror', 'n528', 'dream']
  };
  var CAST_SCENE_CHANCE = 0.7; // if the cast's room spawns and everyone's home, odds the scene actually triggers

  function pickExtraRooms(usedNames) {
    var picked = [];
    for (var i = 0; i < EXTRA_ROOM_SLOTS; i++) {
      if (Math.random() < RARE_ROOM_CHANCE) {
        var pool = RARE.filter(function (n) { return usedNames.indexOf(n) === -1 && picked.indexOf(n) === -1; });
        if (pool.length) picked.push(pool[Math.floor(Math.random() * pool.length)]);
      }
      if (Math.random() < RARER_ROOM_CHANCE) {
        var poolR = RARER.filter(function (n) { return usedNames.indexOf(n) === -1 && picked.indexOf(n) === -1; });
        if (poolR.length) picked.push(poolR[Math.floor(Math.random() * poolR.length)]);
      }
    }
    return picked;
  }

  // --- Corridor-and-doors room generator --------------------------------
  // Every floor is one central corridor with rooms lining both sides of
  // it — half the room list along the top wall, half along the bottom —
  // instead of recursively slicing the whole canvas into a grid. That's
  // the actual point of it: real negative space (margins, the corridor
  // itself) instead of every square inch being "a room," which is what
  // made the old generator read as a box getting subdivided rather than a
  // floor plan. `doorPoint` is where each room meets the corridor — the
  // waypoint ambient wandering routes through.

  function buildCorridorFloor(names, opts) {
    var corridorY = 50;
    var spineX0 = opts.marginX, spineX1 = 100 - opts.marginX;
    var spineLen = spineX1 - spineX0;
    var half = Math.ceil(names.length / 2);
    var rooms = [];

    function layoutRow(rowNames, side) {
      var n = rowNames.length;
      if (!n) return;
      var slotW = spineLen / n;
      var gap = Math.min(opts.gap, slotW * 0.15);
      rowNames.forEach(function (name, i) {
        var x0 = spineX0 + i * slotW + gap / 2;
        var w = slotW - gap;
        var y0, h;
        if (side === 'top') {
          h = opts.depth != null ? opts.depth : (corridorY - opts.corridorHalf - opts.marginY - opts.doorGap);
          y0 = (corridorY - opts.corridorHalf - opts.doorGap) - h;
        } else {
          y0 = corridorY + opts.corridorHalf + opts.doorGap;
          h = opts.depth != null ? opts.depth : ((100 - opts.marginY) - y0);
        }
        var rect = { x: x0, y: y0, w: w, h: h };
        rooms.push({
          name: name,
          rect: rect,
          cx: rect.x + rect.w / 2,
          cy: rect.y + rect.h / 2,
          doorPoint: { x: rect.x + rect.w / 2, y: side === 'top' ? corridorY - opts.corridorHalf : corridorY + opts.corridorHalf },
          occupants: []
        });
      });
    }

    layoutRow(names.slice(0, half), 'top');
    layoutRow(names.slice(half), 'bottom');

    return { rooms: rooms, corridorY: corridorY };
  }

  function buildHangoutFloor(names) {
    return buildCorridorFloor(names, { corridorHalf: 5, marginX: 6, marginY: 6, gap: 1.6, doorGap: 1.2 });
  }

  function buildResidentialFloor(names) {
    // Thin door slots, not deep rooms — this is meant to read as "a very
    // long hallway with bedroom doors lining it," not a row of little rooms.
    return buildCorridorFloor(names, { corridorHalf: 4, marginX: 3, marginY: 6, gap: 0.9, doorGap: 0.8, depth: 9 });
  }

  // --- Whole-house generation --------------------------------------------

  function generateHouse() {
    var floor1Names = STAPLES.concat(pickExtraRooms(STAPLES));
    var floor3Names = STAPLES.concat(pickExtraRooms(STAPLES));
    var floor1 = buildHangoutFloor(floor1Names);
    var floor3 = buildHangoutFloor(floor3Names);

    var doorFound = false;
    try { doorFound = localStorage.getItem(HIDDEN_DOOR_KEY) === '1'; } catch (e) {}
    var hiddenDoorPresent = !doorFound && Math.random() < HIDDEN_DOOR_CHANCE;
    var hiddenDoorX = hiddenDoorPresent ? (10 + Math.random() * 80) : null;

    // Bedrooms: one door per resident, plus a rare chance of The Locked Door.
    var bedroomNames = RESIDENTS.map(function (r) { return r.name + "'s Room"; });
    var lockedDoorPresent = Math.random() < LOCKED_DOOR_CHANCE;
    if (lockedDoorPresent) bedroomNames.push('__locked_door__');
    var floor2 = buildResidentialFloor(bedroomNames);

    function bedroomOf(slug) {
      var r = findResident(slug);
      return floor2.rooms.filter(function (room) { return room.name === r.name + "'s Room"; })[0];
    }

    // --- Who's home ---
    var home = {};
    RESIDENTS.forEach(function (r) {
      home[r.slug] = r.alwaysHome || Math.random() >= ABSENCE_CHANCE;
    });
    // Cool S and Clickbaity are inseparable — if either's home, both are.
    if (home.cools || home.clickbaity) { home.cools = true; home.clickbaity = true; }

    var hangoutRooms = floor1.rooms.concat(floor3.rooms);
    var placedSlugs = {};

    function place(slug, room) {
      if (placedSlugs[slug] || !room) return;
      room.occupants.push(slug);
      placedSlugs[slug] = room;
    }

    // 1. Rare-room casts get first pick, if their room actually spawned
    //    and (mostly) everyone in it is home.
    hangoutRooms.forEach(function (room) {
      var cast = ROOM_CASTS[room.name];
      if (!cast) return;
      var homeCast = cast.filter(function (slug) { return home[slug]; });
      if (homeCast.length >= Math.ceil(cast.length * 0.6) && Math.random() < CAST_SCENE_CHANCE) {
        homeCast.forEach(function (slug) { place(slug, room); });
      }
    });

    // 2. Everyone else who's home: either they're just in their own room
    //    today, or they're out — a resident is only ever placed in exactly
    //    one spot total, bedroom included, so a bedroom dot always means
    //    "actually in there right now," never just "this is whose room it is."
    RESIDENTS.forEach(function (r) {
      if (!home[r.slug] || placedSlugs[r.slug]) return;
      if (r.pair && placedSlugs[r.pair]) { place(r.slug, placedSlugs[r.pair]); return; }
      if (r.noHangoutDefault) { place(r.slug, bedroomOf(r.slug)); return; } // Dumptruck

      if (Math.random() < BEDROOM_STAY_CHANCE) {
        var own = bedroomOf(r.slug);
        if (own) { place(r.slug, own); return; }
      }

      var candidate = null;
      if (r.defaultRoom && Math.random() < (r.defaultChance == null ? 1 : r.defaultChance)) {
        candidate = hangoutRooms.filter(function (room) { return room.name.indexOf(r.defaultRoom) !== -1; })[0];
      }
      if (!candidate) {
        // Closeness-biased pick: weight every room by how positive/negative
        // its current occupants read for this resident, then roll against
        // those weights. Rooms with no signal at all still get a small
        // base weight so everyone has somewhere to land.
        var weights = hangoutRooms.map(function (room) {
          var score = 1;
          room.occupants.forEach(function (slug) { score += closenessBetween(r.slug, slug); });
          return Math.max(0.15, score);
        });
        var total = weights.reduce(function (a, b) { return a + b; }, 0);
        var roll = Math.random() * total;
        for (var i = 0; i < hangoutRooms.length; i++) {
          roll -= weights[i];
          if (roll <= 0) { candidate = hangoutRooms[i]; break; }
        }
        if (!candidate) candidate = hangoutRooms[hangoutRooms.length - 1];
      }
      place(r.slug, candidate);
    });

    return {
      floors: [floor1, floor2, floor3],
      hiddenDoorPresent: hiddenDoorPresent,
      hiddenDoorX: hiddenDoorX,
      lockedDoorPresent: lockedDoorPresent
    };
  }

  // --- Rendering -----------------------------------------------------

  var house = generateHouse();
  var activeFloor = 0; // index into house.floors (0 = Floor 1, 1 = Floor 2, 2 = Floor 3)
  var wanderTimer = null;

  function svgText(x, y, content, cls) {
    var t = document.createElementNS(SVG_NS, 'text');
    t.setAttribute('x', x); t.setAttribute('y', y);
    t.setAttribute('class', cls);
    t.setAttribute('text-anchor', 'middle');
    t.textContent = content;
    return t;
  }

  function renderTabs() {
    tabsEl.innerHTML = '';
    var labels = ['Floor 1', 'Floor 2', 'Floor 3'];
    labels.forEach(function (label, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'floorplan-tab' + (i === activeFloor ? ' is-active' : '');
      btn.textContent = label;
      btn.addEventListener('click', function () { activeFloor = i; renderAll(); });
      tabsEl.appendChild(btn);
    });
    if (house.hiddenDoorPresent) {
      var ghost = document.createElement('span');
      ghost.className = 'floorplan-tab is-ghost';
      ghost.textContent = 'Floor 0';
      tabsEl.appendChild(ghost);
    }
  }

  function dotSlots(room, count) {
    // Small flow-wrap grid of offsets inside the room's rect, so multiple
    // residents in one room don't stack exactly on top of each other.
    var cols = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(count))));
    var slots = [];
    for (var i = 0; i < count; i++) {
      var col = i % cols, row = Math.floor(i / cols);
      var rows = Math.ceil(count / cols);
      var px = room.rect.x + room.rect.w * ((col + 1) / (cols + 1));
      var py = room.rect.y + room.rect.h * ((row + 1) / (rows + 1));
      slots.push({ x: px, y: py });
    }
    return slots;
  }

  function renderStage() {
    svgEl.innerHTML = '';
    layerEl.innerHTML = '';

    var floor = house.floors[activeFloor];
    var isBedroomFloor = activeFloor === 1;
    var anyRoom = floor.rooms.length > 0;

    floor.rooms.forEach(function (room) {
      if (room.name === '__locked_door__') return; // drawn as a door icon, not a labeled room
      var rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', room.rect.x); rect.setAttribute('y', room.rect.y);
      rect.setAttribute('width', room.rect.w); rect.setAttribute('height', room.rect.h);
      rect.setAttribute('rx', 1);
      rect.setAttribute('class', 'floorplan-room-rect');
      svgEl.appendChild(rect);

      var label = room.name.replace(/'s Room$/, '');
      var cls = 'floorplan-room-label' + (isBedroomFloor ? ' is-door' : '');
      svgEl.appendChild(svgText(room.cx, room.rect.y + room.rect.h - (isBedroomFloor ? 1.6 : 2.4), label, cls));
    });

    floor.rooms.forEach(function (room) {
      var occupants = room.occupants;
      if (room.name === '__locked_door__') {
        renderDoorIcon(room);
        return;
      }
      var slots = dotSlots(room, occupants.length);
      occupants.forEach(function (slug, i) {
        renderDot(findResident(slug), room, slots[i]);
      });
    });

    if (activeFloor === 0 && house.hiddenDoorPresent) {
      renderHiddenDoor(floor);
    }

    var totalDots = floor.rooms.reduce(function (n, r) { return n + (r.name === '__locked_door__' ? 0 : r.occupants.length); }, 0);
    if (!anyRoom) {
      var empty = document.createElement('div');
      empty.className = 'floorplan-empty';
      empty.textContent = 'Nothing here right now.';
      layerEl.appendChild(empty);
    }

    captionEl.textContent = totalDots === 0
      ? (isBedroomFloor ? 'Everyone’s out right now.' : 'Quiet in here at the moment.')
      : (isBedroomFloor ? 'Whoever you see is actually in, right now.' : '');
  }

  function renderDot(resident, room, slot) {
    var el = document.createElement('button');
    el.type = 'button';
    el.className = 'floorplan-dot';
    el.style.left = slot.x + '%';
    el.style.top = slot.y + '%';
    el.style.background = resident.color;
    el.dataset.slug = resident.slug;
    el.dataset.room = room.name;
    el.title = resident.name;
    el.addEventListener('click', function () { openResidentCard(resident, room); });
    layerEl.appendChild(el);
  }

  function renderDoorIcon(room) {
    var el = document.createElement('button');
    el.type = 'button';
    el.className = 'floorplan-door';
    el.style.left = room.cx + '%';
    el.style.top = room.cy + '%';
    el.setAttribute('aria-label', 'A door');
    el.addEventListener('click', function () { openLockedDoorCard(); });
    layerEl.appendChild(el);
  }

  function renderHiddenDoor(floor) {
    // A rare, unlabeled door sitting right in the hallway itself. The
    // House is hiding this on purpose — clicking it just makes it vanish.
    // No reveal, no page, nothing.
    var el = document.createElement('button');
    el.type = 'button';
    el.className = 'floorplan-door';
    el.style.left = house.hiddenDoorX + '%';
    el.style.top = floor.corridorY + '%';
    el.setAttribute('aria-label', 'A door');
    el.addEventListener('click', function () {
      house.hiddenDoorPresent = false;
      try { localStorage.setItem(HIDDEN_DOOR_KEY, '1'); } catch (e) {}
      renderAll();
    });
    layerEl.appendChild(el);
  }

  function openResidentCard(resident, room) {
    noteBody.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'floorplan-note-card';
    var img = document.createElement('img');
    img.className = 'floorplan-note-portrait';
    img.src = resident.icon;
    img.alt = resident.name;
    var text = document.createElement('div');
    var roomLine = document.createElement('p');
    roomLine.className = 'floorplan-note-room';
    roomLine.textContent = room.name === '__locked_door__' ? '' : room.name.replace(/'s Room$/, "'s room");
    var h4 = document.createElement('h4');
    h4.textContent = resident.name;
    text.appendChild(roomLine);
    text.appendChild(h4);
    wrap.appendChild(img);
    wrap.appendChild(text);
    noteBody.appendChild(wrap);
    // Inline, not the shared .note[data-color] rules — those use a
    // slightly different slug scheme (e.g. "bm" for Blue Marble) and are
    // shared with every character page's Connections notes, which this
    // feature shouldn't reach into.
    noteEl.style.background = resident.color;
    noteOverlay.classList.add('open');
  }

  function openLockedDoorCard() {
    noteBody.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'floorplan-note-card';
    var img = document.createElement('img');
    img.className = 'floorplan-note-portrait';
    img.src = '../images/icons/penny.png';
    img.alt = 'Penny';
    var text = document.createElement('div');
    var h4 = document.createElement('h4');
    h4.textContent = 'Penny';
    text.appendChild(h4);
    wrap.appendChild(img);
    wrap.appendChild(text);
    noteBody.appendChild(wrap);
    noteEl.style.background = '';
    noteOverlay.classList.add('open');
  }

  function renderAll() {
    renderTabs();
    renderStage();
  }

  // --- Ambient wandering -----------------------------------------------
  // Every so often, a resident currently on the visible floor might slowly
  // drift into another room — out to their door, down the hallway to the
  // next one — so the page reads as caught mid-moment rather than static.
  // Every room connects to every other room via the shared corridor, so
  // there's no adjacency list to consult — just route through the midpoint
  // between the two rooms' doorways.

  function tryWander() {
    // Floor 2 is presence same as anywhere else now, but a resident's own
    // bedroom wandering into someone else's would read as a real mistake
    // (nobody should end up standing in a room that isn't theirs and isn't
    // a hangout) — so bedrooms stay put once placed.
    if (activeFloor === 1) return;
    if (Math.random() >= WANDER_CHANCE) return;
    var floor = house.floors[activeFloor];
    if (!floor || floor.rooms.length < 2) return;

    var dots = Array.prototype.slice.call(layerEl.querySelectorAll('.floorplan-dot'));
    if (!dots.length) return;
    var dot = dots[Math.floor(Math.random() * dots.length)];
    var fromRoomName = dot.dataset.room;
    var fromRoom = floor.rooms.filter(function (r) { return r.name === fromRoomName; })[0];
    if (!fromRoom) return;

    var others = floor.rooms.filter(function (r) { return r.name !== fromRoomName; });
    if (!others.length) return;
    var toRoom = others[Math.floor(Math.random() * others.length)];

    var hx = (fromRoom.doorPoint.x + toRoom.doorPoint.x) / 2;
    var hy = (fromRoom.doorPoint.y + toRoom.doorPoint.y) / 2;

    dot.classList.add('is-wandering');
    dot.style.transition = 'left ' + WANDER_LEG_MS + 'ms ease-in-out, top ' + WANDER_LEG_MS + 'ms ease-in-out';
    dot.style.left = hx + '%';
    dot.style.top = hy + '%';

    setTimeout(function () {
      var slug = dot.dataset.slug;
      fromRoom.occupants = fromRoom.occupants.filter(function (s) { return s !== slug; });
      if (toRoom.occupants.indexOf(slug) === -1) toRoom.occupants.push(slug);
      dot.dataset.room = toRoom.name;

      // Reflow every dot now in toRoom (not just the arrival) so nobody
      // lands on top of someone who was already there.
      var slots = dotSlots(toRoom, toRoom.occupants.length);
      toRoom.occupants.forEach(function (occSlug, idx) {
        var el = occSlug === slug ? dot : layerEl.querySelector('.floorplan-dot[data-slug="' + occSlug + '"]');
        if (!el) return;
        if (el !== dot) el.style.transition = 'left 0.6s ease, top 0.6s ease';
        el.style.left = slots[idx].x + '%';
        el.style.top = slots[idx].y + '%';
      });
      dot.classList.remove('is-wandering');
    }, WANDER_LEG_MS);
  }

  wanderTimer = setInterval(tryWander, WANDER_CHECK_MS);

  renderAll();
})();

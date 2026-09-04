// Floor Plan — a procedurally generated house layout.
//
// The House doesn't have one fixed interior, so every page load carves a
// fresh set of rooms with a small space-partitioning generator (think:
// repeatedly splitting a rectangle in half) instead of using one hand-drawn
// map. Floors 1 and 3 are both "hangout" floors drawing from the same
// weighted room pool; floor 2 is bedrooms only, one per resident. A red...
// well, a *colored* dot per resident sits wherever they've landed; tap one
// to see who it is. Two extra, much rarer things can appear alongside the
// normal rooms — see LOCKED_DOOR and HIDDEN_DOOR below.

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

  var RESIDENTS = [
    { slug: 'journal', name: 'Journal', icon: '../images/icons/journal.png', color: '#d9b473', alwaysHome: true },
    { slug: 'mirror', name: 'Mirror', icon: '../images/icons/mirror.png', color: '#cfe0d8', defaultRoom: 'Kitchen' },
    { slug: 'lp', name: 'LP', icon: '../images/icons/lp.png', color: '#cfa8d4' },
    { slug: 'n528', name: 'N528', icon: '../images/icons/n528.png', color: '#b8d4c9' },
    { slug: 'dream', name: 'Dream', icon: '../images/icons/dream.png', color: '#c7b8d4' },
    { slug: 'indigo', name: 'Indigo', icon: '../images/icons/indigo.png', color: '#b8a8d4' },
    { slug: 'cassette', name: 'Cassette', icon: '../images/icons/cassette.png', color: '#f0a878' },
    { slug: 'bluemarble', name: 'Blue Marble', icon: '../images/icons/bluemarble.png', color: '#a8d4c4' },
    { slug: 'ap', name: 'AP', icon: '../images/icons/ap.png', color: '#e8a2a8', defaultRoom: 'Bathroom' },
    { slug: 'cools', name: 'Cool S', icon: '../images/icons/cool s.png', color: '#c4b0e8', pair: 'clickbaity' },
    { slug: 'clickbaity', name: 'Clickbaity', icon: '../images/clickbaity.png', color: '#c0463c', pair: 'cools' },
    { slug: 'geeky', name: 'Geeky', icon: '../images/icons/geeky.png', color: '#f0955a' },
    { slug: 'pbc', name: 'PBC', icon: '../images/icons/pbc.png', color: '#e8781e', defaultRoom: 'Bathroom' },
    // Dumptruck's only known hangout is her own (famously trashed) bedroom —
    // so unless a rare-room cast claims her, she just isn't placed on the
    // hangout floors at all. Her bedroom on Floor 2 covers her either way.
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

  // --- BSP room generator ----------------------------------------------
  // Recursively splits a rectangle into `count` leaf cells. Cells share
  // exact borders (no gap) — the gap used as the visual "hallway" is
  // added afterward by shrinking each room inward, so the raw cells stay
  // useful for adjacency math (who's next to whom).

  function splitBSP(rect, count) {
    if (count <= 1) return [rect];
    var horizontal = rect.w >= rect.h;
    var ratio = 0.35 + Math.random() * 0.3;
    var a, b;
    if (horizontal) {
      var splitX = rect.w * ratio;
      a = { x: rect.x, y: rect.y, w: splitX, h: rect.h };
      b = { x: rect.x + splitX, y: rect.y, w: rect.w - splitX, h: rect.h };
    } else {
      var splitY = rect.h * ratio;
      a = { x: rect.x, y: rect.y, w: rect.w, h: splitY };
      b = { x: rect.x, y: rect.y + splitY, w: rect.w, h: rect.h - splitY };
    }
    var frac = horizontal ? a.w / rect.w : a.h / rect.h;
    var countA = Math.max(1, Math.min(count - 1, Math.round(count * frac)));
    var countB = count - countA;
    return splitBSP(a, countA).concat(splitBSP(b, countB));
  }

  var ROOM_MARGIN = 1.6; // shrink inward, in viewBox units, to leave a hallway gap

  function padRect(r) {
    var m = Math.min(ROOM_MARGIN, r.w * 0.18, r.h * 0.18);
    return { x: r.x + m, y: r.y + m, w: r.w - m * 2, h: r.h - m * 2 };
  }

  function findAdjacent(cells) {
    var edges = [];
    var eps = 0.05;
    for (var i = 0; i < cells.length; i++) {
      for (var j = i + 1; j < cells.length; j++) {
        var A = cells[i], B = cells[j];
        var touchV = Math.abs(A.x + A.w - B.x) < eps || Math.abs(B.x + B.w - A.x) < eps;
        var overlapY = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y) > eps;
        var touchH = Math.abs(A.y + A.h - B.y) < eps || Math.abs(B.y + B.h - A.y) < eps;
        var overlapX = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x) > eps;
        if ((touchV && overlapY) || (touchH && overlapX)) edges.push([i, j]);
      }
    }
    return edges;
  }

  // Builds a floor: given a list of room-name strings, returns
  // { rooms: [{name, cell, rect, cx, cy, occupants:[]}], edges: [[i,j],...] }
  function buildFloor(names) {
    var cells = splitBSP({ x: 4, y: 4, w: 92, h: 92 }, names.length);
    var rooms = names.map(function (name, i) {
      var cell = cells[i];
      var rect = padRect(cell);
      return {
        name: name,
        cell: cell,
        rect: rect,
        cx: rect.x + rect.w / 2,
        cy: rect.y + rect.h / 2,
        occupants: []
      };
    });
    return { rooms: rooms, edges: findAdjacent(cells) };
  }

  // --- Whole-house generation --------------------------------------------

  function generateHouse() {
    var floor1Names = STAPLES.concat(pickExtraRooms(STAPLES));
    var floor3Names = STAPLES.concat(pickExtraRooms(STAPLES));
    var floor1 = buildFloor(floor1Names);
    var floor3 = buildFloor(floor3Names);

    var doorFound = false;
    try { doorFound = localStorage.getItem(HIDDEN_DOOR_KEY) === '1'; } catch (e) {}
    var hiddenDoorPresent = !doorFound && Math.random() < HIDDEN_DOOR_CHANCE;

    // Bedrooms: one per resident, plus a rare chance of The Locked Door.
    var bedroomNames = RESIDENTS.map(function (r) { return r.name + "'s Room"; });
    var lockedDoorPresent = Math.random() < LOCKED_DOOR_CHANCE;
    if (lockedDoorPresent) bedroomNames.push('__locked_door__');
    var floor2 = buildFloor(bedroomNames);

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
      if (placedSlugs[slug]) return;
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

    // 2. Everyone else who's home and not already placed by a cast scene.
    RESIDENTS.forEach(function (r) {
      if (!home[r.slug] || placedSlugs[r.slug]) return;
      if (r.noHangoutDefault) return; // Dumptruck, sans cast scene — stays in her room
      if (r.pair && placedSlugs[r.pair]) { place(r.slug, placedSlugs[r.pair]); return; }

      var candidate = null;
      if (r.defaultRoom) {
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

    // 3. Bedrooms — ownership, not presence. Everyone gets theirs regardless
    //    of the "who's home" roll above.
    RESIDENTS.forEach(function (r) {
      var room = floor2.rooms.filter(function (room) { return room.name === r.name + "'s Room"; })[0];
      if (room) room.occupants.push(r.slug);
    });

    return {
      floors: [floor1, floor2, floor3],
      hiddenDoorPresent: hiddenDoorPresent,
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
    // Small flow-wrap grid of offsets inside the room's padded rect, so
    // multiple residents in one room don't stack exactly on top of each
    // other.
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
    var anyRoom = floor.rooms.length > 0;

    floor.rooms.forEach(function (room) {
      if (room.name === '__locked_door__') return; // drawn as a door icon, not a labeled room
      var rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', room.rect.x); rect.setAttribute('y', room.rect.y);
      rect.setAttribute('width', room.rect.w); rect.setAttribute('height', room.rect.h);
      rect.setAttribute('rx', 1.2);
      rect.setAttribute('class', 'floorplan-room-rect');
      svgEl.appendChild(rect);

      var label = room.name.replace(/'s Room$/, '');
      svgEl.appendChild(svgText(room.cx, room.rect.y + room.rect.h - 2.4, label, 'floorplan-room-label'));
    });

    floor.rooms.forEach(function (room) {
      var occupants = room.occupants;
      if (room.name === '__locked_door__') {
        renderDoorIcon(room, 'locked');
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

    captionEl.textContent = activeFloor === 1
      ? 'Every resident’s room — not necessarily where they are right now.'
      : (totalDots === 0 ? 'Quiet in here at the moment.' : '');
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

  function renderDoorIcon(room, kind) {
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
    // A rare, unlabeled door tucked into whichever room this floor
    // generated last (reads as "off in a hallway" without needing its own
    // dedicated cell). The House is hiding this on purpose — clicking it
    // just makes it vanish. No reveal, no page, nothing.
    var room = floor.rooms[floor.rooms.length - 1];
    var el = document.createElement('button');
    el.type = 'button';
    el.className = 'floorplan-door';
    el.style.left = (room.rect.x + room.rect.w * 0.15) + '%';
    el.style.top = (room.rect.y + room.rect.h * 0.85) + '%';
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
  // drift into a neighboring room — out into the hallway gap, then into the
  // next room — so the page reads as caught mid-moment rather than static.

  function tryWander() {
    // Floor 2 is ownership, not presence — bedrooms never wander into
    // each other. Only the two hangout floors (index 0 and 2) do.
    if (activeFloor === 1) return;
    if (Math.random() >= WANDER_CHANCE) return;
    var floor = house.floors[activeFloor];
    if (!floor || !floor.edges.length) return;

    var dots = Array.prototype.slice.call(layerEl.querySelectorAll('.floorplan-dot'));
    if (!dots.length) return;
    var dot = dots[Math.floor(Math.random() * dots.length)];
    var fromRoomName = dot.dataset.room;
    var fromIndex = floor.rooms.findIndex(function (r) { return r.name === fromRoomName; });
    if (fromIndex === -1) return;

    var neighbors = floor.edges
      .filter(function (e) { return e[0] === fromIndex || e[1] === fromIndex; })
      .map(function (e) { return e[0] === fromIndex ? e[1] : e[0]; });
    if (!neighbors.length) return;
    var toIndex = neighbors[Math.floor(Math.random() * neighbors.length)];
    var fromRoom = floor.rooms[fromIndex], toRoom = floor.rooms[toIndex];

    // Hallway waypoint: the midpoint of the shared border between the two
    // *unpadded* cells, i.e. roughly where a doorway would be.
    var A = fromRoom.cell, B = toRoom.cell;
    var hx = (Math.max(A.x, B.x) + Math.min(A.x + A.w, B.x + B.w)) / 2;
    var hy = (Math.max(A.y, B.y) + Math.min(A.y + A.h, B.y + B.h)) / 2;

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

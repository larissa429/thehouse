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
  var WANDER_MS_PER_UNIT = 45;     // walking speed — ms per viewBox unit of distance
  var WANDER_MIN_LEG_MS = 350;     // floor, so a short hop isn't instant
  var WANDER_MAX_LEG_MS = 1800;    // ceiling, so a long hallway leg isn't glacial

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
    { slug: 'journal', name: 'Journal', icon: '../images/zoomedicons/journal.webp', color: '#d9b473', alwaysHome: true },
    { slug: 'mirror', name: 'Mirror', icon: '../images/zoomedicons/mirror.webp', color: '#cfe0d8', defaultRoom: 'Kitchen' },
    { slug: 'lp', name: 'LP', icon: '../images/zoomedicons/lp.webp', color: '#cfa8d4' },
    { slug: 'n528', name: '-⁵⁄₂₈', icon: '../images/zoomedicons/n528.webp', color: '#b8d4c9' },
    { slug: 'dream', name: 'Dream', icon: '../images/zoomedicons/dream.webp', color: '#3d2f69' },
    { slug: 'indigo', name: 'Indigo', icon: '../images/zoomedicons/indigo.webp', color: '#2904bd' },
    { slug: 'cassette', name: 'Cassette', icon: '../images/zoomedicons/cassette.webp', color: '#f0a878' },
    { slug: 'bluemarble', name: 'Blue Marble', icon: '../images/zoomedicons/bluemarble.webp', color: '#a8d4c4' },
    { slug: 'ap', name: 'AP', icon: '../images/zoomedicons/ap.webp', color: '#e8a2a8', defaultRoom: 'Bathroom', defaultChance: 0.45 },
    { slug: 'cools', name: 'Cool S', icon: '../images/zoomedicons/cools.webp', color: '#c4b0e8', pair: 'clickbaity' },
    { slug: 'clickbaity', name: 'Clickbaity', icon: '../images/zoomedicons/clickbaity.webp', color: '#c0463c', pair: 'cools' },
    { slug: 'geeky', name: 'Geeky', icon: '../images/zoomedicons/geeky.webp', color: '#f0955a' },
    { slug: 'pbc', name: 'PBC', icon: '../images/zoomedicons/pbc.webp', color: '#e8781e', defaultRoom: 'Bathroom', defaultChance: 0.45 },
    // Dumptruck's only known hangout is her own (famously trashed) bedroom —
    // so unless a rare-room cast claims her, she's just always there.
    { slug: 'dumptruck', name: 'Dumptruck', icon: '../images/zoomedicons/dumptruck.webp', color: '#3f6b32', noHangoutDefault: true }
  ];

  function findResident(slug) {
    for (var i = 0; i < RESIDENTS.length; i++) if (RESIDENTS[i].slug === slug) return RESIDENTS[i];
    return null;
  }

  // Every layout function fills slots by walking its room-name list in
  // order, and the staples are always concatenated first — so without
  // this, "Kitchen & Dining Room" (etc) would land in the same early slot
  // almost every load regardless of which shape or extra rooms show up.
  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
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
          // The true centerline of the corridor, not its near edge — a
          // wandering dot's waypoints come straight from this, and should
          // read as walking down the middle of the hallway, not hugging
          // the wall it just stepped out of.
          doorPoint: { x: rect.x + rect.w / 2, y: corridorY },
          seg: { key: 'spine', axis: 'h', pos: corridorY },
          occupants: []
        });
      });
    }

    layoutRow(names.slice(0, half), 'top');
    layoutRow(names.slice(half), 'bottom');

    var corridorSegments = [{ x: spineX0, y: corridorY - opts.corridorHalf, w: spineLen, h: opts.corridorHalf * 2 }];
    return { rooms: rooms, corridorSegments: corridorSegments };
  }

  function buildStraightHangoutFloor(names) {
    return buildCorridorFloor(names, { corridorHalf: 5, marginX: 6, marginY: 6, gap: 1.6, doorGap: 1.2 });
  }

  // --- Bent hangout floors (L / U / O) ----------------------------------
  // A different shape of hallway for variety, on top of the room-content
  // variety the pool already gives. These trace one, two, or three sides
  // of a shared inner square (L / U), rooms on BOTH sides of every used
  // segment the same way the straight floor has rooms on both sides of
  // its one corridor — an outward row (away from the inner square, full
  // segment length) and an inward row (into it, inset from both ends so
  // two segments meeting at a corner never reach into the same square
  // inch). The inward row draws its own small second batch of extra
  // rooms rather than splitting the outward batch thinner, so both sides
  // actually end up populated instead of the inner row being an
  // afterthought.
  //
  // O is the exception: all four sides, single row each (as before,
  // outward only), because the inner square is reserved for a Courtyard
  // that always fills it completely — the payoff for going all the way
  // around instead of a real second room row.

  var PERIMETER = { x0: 26, y0: 26, x1: 74, y1: 74 };
  var PERIMETER_HALF = 4, PERIMETER_DEPTH = 15, PERIMETER_GAP = 1.2;
  var CORNER_INSET = 6; // trimmed off each end of an inward row so it can't reach a shared corner

  function perimeterSegments() {
    return {
      top: { axis: 'h', pos: PERIMETER.y0, from: PERIMETER.x0, to: PERIMETER.x1, outSign: -1 },
      right: { axis: 'v', pos: PERIMETER.x1, from: PERIMETER.y0, to: PERIMETER.y1, outSign: 1 },
      bottom: { axis: 'h', pos: PERIMETER.y1, from: PERIMETER.x0, to: PERIMETER.x1, outSign: 1 },
      left: { axis: 'v', pos: PERIMETER.x0, from: PERIMETER.y0, to: PERIMETER.y1, outSign: -1 }
    };
  }

  function corridorRectFor(seg) {
    // Extended past the segment's own from/to by its half-thickness at
    // both ends — a segment's rect otherwise stops exactly at the shared
    // corner point, which covers the *inner* corner (both segments reach
    // it) but leaves the *outer* corner of the turn uncovered by either
    // one, reading as a notch bitten out of the hallway right at the bend.
    var from = seg.from - PERIMETER_HALF, to = seg.to + PERIMETER_HALF;
    return seg.axis === 'h'
      ? { x: from, y: seg.pos - PERIMETER_HALF, w: to - from, h: PERIMETER_HALF * 2 }
      : { x: seg.pos - PERIMETER_HALF, y: from, w: PERIMETER_HALF * 2, h: to - from };
  }

  // Each shape lists its possible segment combinations; one is picked at
  // random so an "L," say, can land on any of its four possible corners.
  var SHAPE_SEGMENT_OPTIONS = {
    l: [['top', 'right'], ['right', 'bottom'], ['bottom', 'left'], ['left', 'top']],
    u: [['left', 'top', 'right'], ['top', 'right', 'bottom'], ['right', 'bottom', 'left'], ['bottom', 'left', 'top']],
    o: [['top', 'right', 'bottom', 'left']]
  };

  // The 4 fixed points where perimeter segments meet, and which two
  // corners each segment's centerline runs between — used to route a
  // wandering dot through the actual turn(s) between two different
  // segments, rather than a straight line cutting across the bend.
  var CORNER_POINTS = {
    NW: { x: PERIMETER.x0, y: PERIMETER.y0 },
    NE: { x: PERIMETER.x1, y: PERIMETER.y0 },
    SE: { x: PERIMETER.x1, y: PERIMETER.y1 },
    SW: { x: PERIMETER.x0, y: PERIMETER.y1 }
  };
  var SEGMENT_CORNERS = { top: ['NW', 'NE'], right: ['NE', 'SE'], bottom: ['SW', 'SE'], left: ['NW', 'SW'] };

  // rowSign is which way this row extends from the corridor: seg.outSign
  // for the outward row, -seg.outSign for the inward one. alongFrom/To
  // optionally narrow the usable stretch of the segment (used to inset
  // the inward row away from corners). segKey identifies which side of
  // the perimeter this is (top/right/bottom/left) — tagged onto every
  // room it produces so wandering knows which corridor segment a room
  // opens onto, for routing through the right corner(s) between segments.
  function layoutPerimeterRow(seg, names, rowSign, segKey, alongFrom, alongTo) {
    var rooms = [];
    var n = names.length;
    if (!n) return rooms;
    var from = alongFrom != null ? alongFrom : seg.from;
    var to = alongTo != null ? alongTo : seg.to;
    var segLen = to - from;
    if (segLen <= 0) return rooms;
    var slotLen = segLen / n;
    names.forEach(function (name, i) {
      var gap = Math.min(PERIMETER_GAP, slotLen * 0.15);
      var alongStart = from + i * slotLen + gap / 2;
      var alongLen = slotLen - gap;
      var nearEdge = seg.pos + rowSign * (PERIMETER_HALF + PERIMETER_GAP);
      var farEdge = nearEdge + rowSign * PERIMETER_DEPTH;
      var d0 = Math.min(nearEdge, farEdge), d1 = Math.max(nearEdge, farEdge);
      var rect, doorPoint;
      // doorPoint sits on the corridor's true centerline (seg.pos), not
      // the near edge — a wander waypoint built from this should read as
      // walking down the middle of the hallway, never hugging the wall.
      if (seg.axis === 'h') {
        rect = { x: alongStart, y: d0, w: alongLen, h: d1 - d0 };
        doorPoint = { x: rect.x + rect.w / 2, y: seg.pos };
      } else {
        rect = { x: d0, y: alongStart, w: d1 - d0, h: alongLen };
        doorPoint = { x: seg.pos, y: rect.y + rect.h / 2 };
      }
      rooms.push({
        name: name, rect: rect, cx: rect.x + rect.w / 2, cy: rect.y + rect.h / 2,
        doorPoint: doorPoint, seg: { key: segKey, axis: seg.axis, pos: seg.pos }, occupants: []
      });
    });
    return rooms;
  }

  function buildBentHangoutFloor(names, shapeKey) {
    var allSegs = perimeterSegments();

    if (shapeKey === 'o') {
      var ringKeys = ['top', 'right', 'bottom', 'left'];
      var ringSegs = ringKeys.map(function (k) { return allSegs[k]; });
      var ringNames = names.filter(function (n) { return n !== 'Courtyard'; });
      var perSeg = Math.ceil(ringNames.length / ringSegs.length);
      var rooms = [];
      var corridorSegments = [];
      var segMeta = [];
      ringSegs.forEach(function (seg, i) {
        var key = ringKeys[i];
        rooms = rooms.concat(layoutPerimeterRow(seg, ringNames.slice(i * perSeg, (i + 1) * perSeg), seg.outSign, key));
        corridorSegments.push(corridorRectFor(seg));
        segMeta.push({ key: key, corners: SEGMENT_CORNERS[key] });
      });
      var inset = PERIMETER_HALF + PERIMETER_GAP;
      var cRect = {
        x: PERIMETER.x0 + inset, y: PERIMETER.y0 + inset,
        w: (PERIMETER.x1 - PERIMETER.x0) - inset * 2, h: (PERIMETER.y1 - PERIMETER.y0) - inset * 2
      };
      rooms.push({
        name: 'Courtyard', rect: cRect, cx: cRect.x + cRect.w / 2, cy: cRect.y + cRect.h / 2,
        // Touches the ring at the north segment, so it routes through
        // wandering exactly like any other room opening onto 'top'.
        doorPoint: { x: cRect.x + cRect.w / 2, y: PERIMETER.y0 }, seg: { key: 'top', axis: 'h', pos: PERIMETER.y0 },
        occupants: []
      });
      return { rooms: rooms, corridorSegments: corridorSegments, segments: segMeta };
    }

    var options = SHAPE_SEGMENT_OPTIONS[shapeKey];
    var chosenKeys = options[Math.floor(Math.random() * options.length)];
    var chosenSegs = chosenKeys.map(function (k) { return allSegs[k]; });

    // A second, independent batch of extra rooms for the inward rows —
    // otherwise the inner side is just the outer side's list split
    // thinner, and ends up sparse instead of a real second row of rooms.
    // Only ONE segment ever hosts an inward row, not every segment — two
    // different segments' inward rows both reach toward the same shared
    // corner (their depth, not just their length along the wall), so any
    // pair of them can collide there regardless of how much each is inset
    // lengthwise. With a single inward row there's nothing left for it to
    // compete with, so no corner math is needed at all.
    var inwardNames = pickExtraRooms(names);
    var inwardSegIndex = Math.floor(Math.random() * chosenSegs.length);

    var perSegOut = Math.ceil(names.length / chosenSegs.length);

    var rooms = [];
    var corridorSegments = [];
    var segMeta2 = [];
    chosenSegs.forEach(function (seg, i) {
      var key = chosenKeys[i];
      rooms = rooms.concat(layoutPerimeterRow(seg, names.slice(i * perSegOut, (i + 1) * perSegOut), seg.outSign, key));
      if (i === inwardSegIndex && inwardNames.length) {
        rooms = rooms.concat(layoutPerimeterRow(seg, inwardNames, -seg.outSign, key, seg.from + CORNER_INSET, seg.to - CORNER_INSET));
      }
      corridorSegments.push(corridorRectFor(seg));
      segMeta2.push({ key: key, corners: SEGMENT_CORNERS[key] });
    });
    return { rooms: rooms, corridorSegments: corridorSegments, segments: segMeta2 };
  }

  var HANGOUT_SHAPES = ['straight', 'l', 'u', 'o'];

  function buildHangoutFloor(names) {
    var shape = HANGOUT_SHAPES[Math.floor(Math.random() * HANGOUT_SHAPES.length)];
    var floor = shape === 'straight' ? buildStraightHangoutFloor(names) : buildBentHangoutFloor(names, shape);
    floor.shape = shape;
    return floor;
  }

  function buildResidentialFloor(names) {
    // Thin door slots, not deep rooms — this is meant to read as "a very
    // long hallway with bedroom doors lining it," not a row of little rooms.
    return buildCorridorFloor(names, { corridorHalf: 4, marginX: 3, marginY: 6, gap: 0.9, doorGap: 0.8, depth: 9 });
  }

  // --- Whole-house generation --------------------------------------------

  function generateHouse() {
    var floor1Names = shuffle(STAPLES.concat(pickExtraRooms(STAPLES)));
    var floor3Names = shuffle(STAPLES.concat(pickExtraRooms(STAPLES)));
    var floor1 = buildHangoutFloor(floor1Names);
    var floor3 = buildHangoutFloor(floor3Names);

    var doorFound = false;
    try { doorFound = localStorage.getItem(HIDDEN_DOOR_KEY) === '1'; } catch (e) {}
    var hiddenDoorPresent = !doorFound && Math.random() < HIDDEN_DOOR_CHANCE;
    // Sits right at a random room's doorway — works the same regardless of
    // which hallway shape Floor 1 rolled, since every shape's rooms carry
    // a doorPoint sitting exactly on the corridor.
    var hiddenDoorPoint = null;
    if (hiddenDoorPresent && floor1.rooms.length) {
      var refRoom = floor1.rooms[Math.floor(Math.random() * floor1.rooms.length)];
      hiddenDoorPoint = refRoom.doorPoint;
    }

    // Bedrooms: one door per resident, plus a rare chance of The Locked Door.
    var bedroomNames = RESIDENTS.map(function (r) { return r.name + "'s Room"; });
    var lockedDoorPresent = Math.random() < LOCKED_DOOR_CHANCE;
    if (lockedDoorPresent) bedroomNames.push('__locked_door__');
    bedroomNames = shuffle(bedroomNames);
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
      hiddenDoorPoint: hiddenDoorPoint,
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

  // A rare-room cast (up to 8 people) and a bent floor's narrower
  // single-row rooms don't always agree on how much space there is —
  // shrink dots a little once a room gets crowded, rather than letting a
  // full cast scene overlap itself in a room sized for two or three.
  function dotSizePercent(count) {
    if (count <= 4) return 3.2;
    return Math.max(1.7, 3.2 * (4 / count));
  }

  // Perimeter rooms are one row (not two), so they're narrower than the
  // straight floor's rooms — a long name like "Karaoke Bar & Grill" won't
  // fit at a fixed size next to a short one like "Foyer." Size each label
  // to the room it's actually in instead of guessing one size for all.
  function fitLabelFontSize(rect, label, baseSize) {
    var available = rect.w * 0.9;
    var estCharWidth = 0.62; // approx width-per-em for this label font
    var needed = label.length * estCharWidth;
    var fit = needed > 0 ? (available / needed) : baseSize;
    return Math.max(1.1, Math.min(baseSize, fit));
  }

  function renderStage() {
    svgEl.innerHTML = '';
    layerEl.innerHTML = '';

    var floor = house.floors[activeFloor];
    var isBedroomFloor = activeFloor === 1;
    var anyRoom = floor.rooms.length > 0;

    if (floor.corridorSegments && floor.corridorSegments.length) {
      // One <path> with one subpath per segment, not separate <rect>
      // elements — overlapping segments (every corner where two meet)
      // would otherwise each composite their own translucent fill, doubling
      // up right where they cross and reading as boxes stacked on top of
      // each other rather than one hallway. Wound consistently, a single
      // path's overlapping subpaths merge into one flat region instead.
      var d = floor.corridorSegments.map(function (seg) {
        var x2 = seg.x + seg.w, y2 = seg.y + seg.h;
        return 'M' + seg.x + ',' + seg.y + ' L' + x2 + ',' + seg.y + ' L' + x2 + ',' + y2 + ' L' + seg.x + ',' + y2 + ' Z';
      }).join(' ');
      var band = document.createElementNS(SVG_NS, 'path');
      band.setAttribute('d', d);
      band.setAttribute('class', 'floorplan-corridor');
      svgEl.appendChild(band);
    }

    floor.rooms.forEach(function (room) {
      if (room.name === '__locked_door__') return; // drawn as a door icon, not a labeled room
      var rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', room.rect.x); rect.setAttribute('y', room.rect.y);
      rect.setAttribute('width', room.rect.w); rect.setAttribute('height', room.rect.h);
      rect.setAttribute('rx', 1);
      rect.setAttribute('class', 'floorplan-room-rect');
      svgEl.appendChild(rect);

      var label = room.name.replace(/'s Room$/, '');
      var isNarrow = isBedroomFloor || room.rect.w < 20;
      var cls = 'floorplan-room-label' + (isNarrow ? ' is-door' : '');
      var baseSize = isNarrow ? 1.7 : 2.6;
      var text = svgText(room.cx, room.rect.y + room.rect.h - (isNarrow ? 1.6 : 2.4), label, cls);
      text.style.fontSize = fitLabelFontSize(room.rect, label, baseSize) + 'px';
      svgEl.appendChild(text);
    });

    floor.rooms.forEach(function (room) {
      var occupants = room.occupants;
      if (room.name === '__locked_door__') {
        renderDoorIcon(room);
        return;
      }
      var slots = dotSlots(room, occupants.length);
      occupants.forEach(function (slug, i) {
        renderDot(findResident(slug), room, slots[i], occupants.length);
      });
    });

    if (activeFloor === 0 && house.hiddenDoorPresent) {
      renderHiddenDoor();
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

  function renderDot(resident, room, slot, roomCount) {
    var el = document.createElement('button');
    el.type = 'button';
    el.className = 'floorplan-dot';
    el.style.left = slot.x + '%';
    el.style.top = slot.y + '%';
    el.style.width = dotSizePercent(roomCount || 1) + '%';
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

  function renderHiddenDoor() {
    // A rare, unlabeled door sitting right in the hallway itself. The
    // House is hiding this on purpose — clicking it just makes it vanish.
    // No reveal, no page, nothing.
    if (!house.hiddenDoorPoint) return;
    var el = document.createElement('button');
    el.type = 'button';
    el.className = 'floorplan-door';
    el.style.left = house.hiddenDoorPoint.x + '%';
    el.style.top = house.hiddenDoorPoint.y + '%';
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
    img.src = '../images/zoomedicons/penny.webp';
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

  // BFS over whichever corners this floor's chosen segments actually
  // connect, from segment A's two corners to segment B's two corners —
  // e.g. an L only has 2 segments/3 corners, a U 3 segments/4 corners, so
  // this is always a tiny graph. Returns the corner-name path to walk
  // (possibly empty if A and B share a corner directly).
  function findCorridorPath(floor, keyA, keyB) {
    if (keyA === keyB) return [];
    var adj = {};
    (floor.segments || []).forEach(function (s) {
      var a = s.corners[0], b = s.corners[1];
      (adj[a] = adj[a] || []).push(b);
      (adj[b] = adj[b] || []).push(a);
    });
    var startCorners = SEGMENT_CORNERS[keyA], targetCorners = SEGMENT_CORNERS[keyB];
    var queue = startCorners.map(function (c) { return [c]; });
    var visited = {};
    startCorners.forEach(function (c) { visited[c] = true; });
    while (queue.length) {
      var path = queue.shift();
      var last = path[path.length - 1];
      if (targetCorners.indexOf(last) !== -1) return path;
      (adj[last] || []).forEach(function (next) {
        if (!visited[next]) { visited[next] = true; queue.push(path.concat([next])); }
      });
    }
    return [];
  }

  // The waypoints a dot walks between leaving fromRoom and arriving at
  // toRoom's doorway — its own doorway, then straight down the corridor
  // if they share one, or through however many corners connect the two
  // segments if they don't. The final hop from the doorway into the
  // room's actual landing slot happens separately, once occupancy for
  // toRoom is finalized.
  function buildWanderPath(fromRoom, toRoom, floor) {
    var points = [fromRoom.doorPoint];
    if (fromRoom.seg && toRoom.seg && fromRoom.seg.key !== toRoom.seg.key) {
      findCorridorPath(floor, fromRoom.seg.key, toRoom.seg.key).forEach(function (cname) {
        points.push(CORNER_POINTS[cname]);
      });
    }
    points.push(toRoom.doorPoint);
    return points;
  }

  // Walks `dot` through `points` in sequence, one CSS transition per leg,
  // timed by actual distance rather than a fixed duration — so a short
  // hop to the room next door doesn't take as long as a trip through two
  // corners, and a long leg doesn't read as sped-up just to fit the same
  // duration as a short one.
  function animateAlongPath(dot, points, onDone) {
    var i = 0;
    function step() {
      if (i >= points.length) { onDone(); return; }
      var p = points[i++];
      var prevX = parseFloat(dot.style.left) || p.x;
      var prevY = parseFloat(dot.style.top) || p.y;
      var dist = Math.hypot(p.x - prevX, p.y - prevY);
      var dur = Math.max(WANDER_MIN_LEG_MS, Math.min(WANDER_MAX_LEG_MS, dist * WANDER_MS_PER_UNIT));
      // linear, not ease-in-out — easing decelerates to a full stop at
      // the end of every leg (and re-accelerates from a stop at the
      // start of the next), which is exactly what reads as "stopping at
      // the points" instead of one continuous walk through the bends.
      dot.style.transition = 'left ' + dur + 'ms linear, top ' + dur + 'ms linear';
      dot.style.left = p.x + '%';
      dot.style.top = p.y + '%';
      setTimeout(step, dur);
    }
    step();
  }

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

    dot.classList.add('is-wandering');
    var path = buildWanderPath(fromRoom, toRoom, floor);
    animateAlongPath(dot, path, function () {
      var slug = dot.dataset.slug;
      fromRoom.occupants = fromRoom.occupants.filter(function (s) { return s !== slug; });
      if (toRoom.occupants.indexOf(slug) === -1) toRoom.occupants.push(slug);
      dot.dataset.room = toRoom.name;

      // Reflow every dot now in toRoom (not just the arrival) so nobody
      // lands on top of someone who was already there.
      var slots = dotSlots(toRoom, toRoom.occupants.length);
      var size = dotSizePercent(toRoom.occupants.length);
      toRoom.occupants.forEach(function (occSlug, idx) {
        var el = occSlug === slug ? dot : layerEl.querySelector('.floorplan-dot[data-slug="' + occSlug + '"]');
        if (!el) return;
        el.style.transition = 'left 0.5s ease, top 0.5s ease, width 0.5s ease';
        el.style.left = slots[idx].x + '%';
        el.style.top = slots[idx].y + '%';
        el.style.width = size + '%';
      });
      dot.classList.remove('is-wandering');
    });
  }

  wanderTimer = setInterval(tryWander, WANDER_CHECK_MS);

  renderAll();
})();

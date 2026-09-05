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

  var stageEl = document.getElementById('floorplanStage');
  var svgEl = document.getElementById('floorplanSvg');
  var layerEl = document.getElementById('floorplanLayer');
  var captionEl = document.getElementById('floorplanCaption');
  var noteOverlay = document.getElementById('note-overlay');
  var noteEl = document.getElementById('note-content');
  var noteBody = document.getElementById('note-body');
  var noteCloseEl = document.getElementById('note-close');

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
  var CLOSENESS_PLACEMENT_THRESHOLD = 5; // a bond weaker than this (either direction) is just noise — placement ignores it entirely instead of giving every mild acquaintance or minor friction a say
  var BEDROOM_VISIT_THRESHOLD = 6; // a real bond, positive only — this is "close enough to actually hang out in their room," not just "close enough to notice"
  var BEDROOM_VISIT_CAP = 3;       // a bedroom stops being visitable once this many people are already in it
  var FOLLOW_CHANCE_PER_POINT = 0.08; // odds someone left behind tags along, per point of CLOSENESS with whoever just left (e.g. a +9 bond ~= 72%)
  var PAIR_FOLLOW_CHANCE = 0.85;      // Cool S/Clickbaity specifically — a stronger, flatter chance than the closeness math gives anyone else
  var FLEE_CHANCE_PER_POINT = 0.1;    // odds someone already in a room leaves when a disliked arrival shows up, per point of negative CLOSENESS

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
    { slug: 'journal', name: 'Journal', icon: '../images/zoomedicons/journal.webp', color: '#693719', alwaysHome: true },
    { slug: 'mirror', name: 'Mirror', icon: '../images/zoomedicons/mirror.webp', color: '#d9b473', defaultRoom: 'Kitchen' },
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
  // Scale is -10 to 10, not just -2 to 3 — the old narrow range meant
  // every strong bond used the same top value, which fused most of the
  // cast into one indistinguishable "everyone's best friends" blob at
  // placement time. Widening it lets real differences in closeness
  // actually separate people into distinct friend groups instead.
  var CLOSENESS = [
    ['journal', 'mirror', 4], ['journal', 'n528', 5], ['journal', 'bluemarble', -3], ['journal', 'dumptruck', 3],
    ['mirror', 'bluemarble', 6], ['mirror', 'ap', 3],
    ['lp', 'cassette', 9], // dating
    ['cassette', 'indigo', 6], ['cassette', 'bluemarble', 5], ['indigo', 'lp', 6],
    ['n528', 'dream', 9],
    ['geeky', 'clickbaity', 6], ['geeky', 'cools', 5],
    ['indigo', 'dumptruck', -3],
    ['pbc', 'journal', -7], ['pbc', 'mirror', -7], ['pbc', 'cassette', -7],
    ['ap', 'cools', -3], ['ap', 'clickbaity', -3]
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
  var RARE = ['In-House Theater', 'Courtyard', 'Crafts Room', 'Music Room', 'Arcade', 'Sunroom', 'Board Game Den'];
  var RARER = ['Indoor Treehouse', 'Snow Room', 'Pillow Pit', 'Planetarium', 'Karaoke Bar & Grill'];

  // One line per hangout room, shown when its box is clicked — bedrooms
  // don't get one of these at all, just the occupant list.
  var ROOM_DESCRIPTIONS = {
    'Kitchen & Dining Room': 'Where meals happen, whenever anyone actually cooks.',
    'Living Room': 'The most neutral room in any house.',
    'Foyer': 'The first room anyone sees, and the last one anyone lingers in.',
    'Bathroom': 'Originally called a "powder room."',
    'In-House Theater': 'A home theater with a couch, a projector, and a screen.',
    'Courtyard': 'An open-air courtyard at the center of The House.',
    'Crafts Room': 'A room stocked with craft and art supplies.',
    'Music Room': 'A room with instruments for practicing or playing music.',
    'Arcade': 'A small room with a few arcade cabinets.',
    'Sunroom': 'A glass-walled room that gets plenty of natural light.',
    'Board Game Den': 'A den stocked with board games. Where friendships go to be tested.',
    'Indoor Treehouse': 'A small treehouse built inside The House.',
    'Snow Room': 'A room kept artificially cold, with snow on the ground.',
    'Pillow Pit': 'A room filled with a deep pile of pillows.',
    'Planetarium': 'A room with a dome ceiling that projects stars.',
    'Karaoke Bar & Grill': 'A karaoke bar and grill combined into one room.'
  };

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
        // Bordered by all four ring segments, not just one — `doors` gives
        // wandering a direct exit toward whichever side the destination is
        // actually on, instead of always leaving north and walking the
        // long way around the ring no matter where it's actually headed.
        // doorPoint/seg stay as a plain fallback for anything that isn't
        // pathing-aware (e.g. the hidden door borrowing a random doorway).
        doorPoint: { x: cRect.x + cRect.w / 2, y: PERIMETER.y0 }, seg: { key: 'top', axis: 'h', pos: PERIMETER.y0 },
        doors: {
          top: { x: cRect.x + cRect.w / 2, y: PERIMETER.y0 },
          bottom: { x: cRect.x + cRect.w / 2, y: PERIMETER.y1 },
          left: { x: PERIMETER.x0, y: cRect.y + cRect.h / 2 },
          right: { x: PERIMETER.x1, y: cRect.y + cRect.h / 2 }
        },
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

  // A room's near edge (the boundary facing the corridor, where a door
  // actually is) and its footprint along the wall — shared by real rooms
  // and by a phantom rect below, so an empty stretch's computed edge is
  // guaranteed to land exactly where a real room's own edge would.
  function wallEdgeOf(rect, seg) {
    if (seg.axis === 'h') {
      var cy = rect.y + rect.h / 2;
      return { edge: cy < seg.pos ? rect.y + rect.h : rect.y, from: rect.x, to: rect.x + rect.w };
    }
    var cx = rect.x + rect.w / 2;
    return { edge: cx < seg.pos ? rect.x + rect.w : rect.x, from: rect.y, to: rect.y + rect.h };
  }

  // A phantom outward-row room spanning a whole segment, built with the
  // exact near/far-edge math layoutPerimeterRow itself uses for a real
  // one — never rendered, just a stand-in so an empty segment's door
  // lines up with where a real room's wall would actually be.
  function phantomOutwardRect(seg) {
    var nearEdge = seg.pos + seg.outSign * (PERIMETER_HALF + PERIMETER_GAP);
    var farEdge = nearEdge + seg.outSign * PERIMETER_DEPTH;
    var d0 = Math.min(nearEdge, farEdge), d1 = Math.max(nearEdge, farEdge);
    return seg.axis === 'h'
      ? { x: seg.from, y: d0, w: seg.to - seg.from, h: d1 - d0 }
      : { x: d0, y: seg.from, w: d1 - d0, h: seg.to - seg.from };
  }

  // Same idea, facing the other way — an inward row (a second row of
  // rooms facing the corridor from inside the ring) only ever gets
  // built for one segment per floor, and only when there were spare
  // rooms to fill it — so most segments, most loads, have this whole
  // stretch sitting completely empty. Inset by CORNER_INSET like a real
  // inward row, so it can't reach a shared corner either.
  function phantomInwardRect(seg) {
    var rowSign = -seg.outSign;
    var nearEdge = seg.pos + rowSign * (PERIMETER_HALF + PERIMETER_GAP);
    var farEdge = nearEdge + rowSign * PERIMETER_DEPTH;
    var d0 = Math.min(nearEdge, farEdge), d1 = Math.max(nearEdge, farEdge);
    var from = seg.from + CORNER_INSET, to = seg.to - CORNER_INSET;
    return seg.axis === 'h'
      ? { x: from, y: d0, w: to - from, h: d1 - d0 }
      : { x: d0, y: from, w: d1 - d0, h: to - from };
  }

  // Finds a spot along a corridor wall that isn't actually a room's own
  // doorway — anywhere a room COULD sit but doesn't right now: the
  // margin before the first room or after the last one in a row, the
  // seam between two neighboring rooms, or (most often) a whole segment
  // that came up with zero rooms at all, since the room-name list doesn't
  // always divide evenly across however many segments this shape has.
  // Reads as a second, unlabeled door built into the wall itself.
  function findEmptyWallSpot(floor) {
    var groups = {};
    floor.rooms.forEach(function (room) {
      if (!room.seg || !room.rect) return;
      var e = wallEdgeOf(room.rect, room.seg);
      var key = room.seg.axis + ':' + Math.round(e.edge * 10);
      (groups[key] = groups[key] || { axis: room.seg.axis, edge: e.edge, centerline: room.seg.pos, spans: [] }).spans.push({ from: e.from, to: e.to });
    });

    // Every row's own real length — the straight floor's single shared
    // spine for both its rows, or (for a bent floor) whichever perimeter
    // segment a given edge value belongs to. The outward row spans the
    // segment's full length; the inward row (if any) is inset from both
    // ends so it can never reach a shared corner — using the outward
    // row's wider bounds for it would "find" a gap in that reserved
    // corner buffer, which isn't a real wall at all.
    var rowBounds = {};
    if (floor.corridorSegments && floor.corridorSegments.length && !floor.segments) {
      var spine = floor.corridorSegments[0];
      rowBounds.h = { from: spine.x, to: spine.x + spine.w };
    }
    var allSegs = floor.segments && floor.segments.length ? perimeterSegments() : null;
    (floor.segments || []).forEach(function (segMeta) {
      var seg = allSegs[segMeta.key];
      if (!seg) return;
      var outward = wallEdgeOf(phantomOutwardRect(seg), seg);
      rowBounds[seg.axis + ':' + Math.round(outward.edge * 10)] = { from: seg.from, to: seg.to };

      var inwardEdge = seg.pos - seg.outSign * (PERIMETER_HALF + PERIMETER_GAP);
      rowBounds[seg.axis + ':' + Math.round(inwardEdge * 10)] = { from: seg.from + CORNER_INSET, to: seg.to - CORNER_INSET };
    });

    // A gap has to actually be big enough to hold a door — the cosmetic
    // seam between two adjacent rooms, or a sliver of margin left over
    // right next to a corner, is real empty wall but nowhere a door
    // could plausibly fit. A bit more than the door mark's own footprint.
    var MIN_GAP = dotSizePercent(1) + 1;
    var gaps = [];
    Object.keys(groups).forEach(function (key) {
      var g = groups[key];
      var bounds = rowBounds[key] || rowBounds[g.axis];
      if (!bounds) return;
      g.spans.sort(function (a, b) { return a.from - b.from; });
      var cursor = bounds.from;
      g.spans.forEach(function (s) {
        if (s.from - cursor > MIN_GAP) gaps.push({ axis: g.axis, edge: g.edge, centerline: g.centerline, from: cursor, to: s.from });
        cursor = Math.max(cursor, s.to);
      });
      if (bounds.to - cursor > MIN_GAP) gaps.push({ axis: g.axis, edge: g.edge, centerline: g.centerline, from: cursor, to: bounds.to });
    });

    // A row with zero rooms at all doesn't produce a group above
    // (nothing to group) — checked separately using the same phantom
    // rects, so each edge still matches a real room's exactly. Outward
    // rows are usually populated (an uneven room count is what leaves
    // one empty); inward rows are the more common case, since most
    // segments never get one built at all.
    (floor.segments || []).forEach(function (segMeta) {
      var seg = allSegs[segMeta.key];
      if (!seg) return;
      var outward = wallEdgeOf(phantomOutwardRect(seg), seg);
      var outKey = seg.axis + ':' + Math.round(outward.edge * 10);
      if (!groups[outKey]) gaps.push({ axis: seg.axis, edge: outward.edge, centerline: seg.pos, from: seg.from, to: seg.to });

      var inward = wallEdgeOf(phantomInwardRect(seg), seg);
      var inKey = seg.axis + ':' + Math.round(inward.edge * 10);
      if (!groups[inKey]) gaps.push({ axis: seg.axis, edge: inward.edge, centerline: seg.pos, from: seg.from + CORNER_INSET, to: seg.to - CORNER_INSET });
    });

    if (!gaps.length) return null;

    var pick = gaps[Math.floor(Math.random() * gaps.length)];
    var span = pick.to - pick.from;
    var margin = span > 0.1 ? Math.min(2, span / 2 - 0.01) : 0;
    var t = margin > 0 ? pick.from + margin + Math.random() * (span - 2 * margin) : (pick.from + pick.to) / 2;
    // pick.edge is a ROOM's own near edge — flush with the corridor
    // itself sits PERIMETER_GAP closer to the centerline than that (the
    // same small buffer every room keeps from the hallway). Straight
    // floors use the same 1.2 for their own doorGap, so one constant
    // covers both.
    var corridorEdge = pick.edge > pick.centerline ? pick.edge - PERIMETER_GAP : pick.edge + PERIMETER_GAP;
    return pick.axis === 'h'
      ? { x: t, y: corridorEdge, axis: 'h' }
      : { x: corridorEdge, y: t, axis: 'v' };
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
    // Sits in a gap of empty wall between two rooms, not another room's
    // own doorway — reads as a second, unmarked door built into the wall.
    // Works the same regardless of which hallway shape Floor 1 rolled.
    // Some loads just don't have a wall gap big enough anywhere, and
    // that's fine — it simply doesn't spawn that load, rather than
    // forcing it into a spot too small to actually be a door.
    var hiddenDoorPoint = null;
    var hiddenDoorAxis = 'h';
    if (hiddenDoorPresent && floor1.rooms.length) {
      var spot = findEmptyWallSpot(floor1);
      if (spot) {
        hiddenDoorPoint = { x: spot.x, y: spot.y };
        hiddenDoorAxis = spot.axis;
      } else {
        hiddenDoorPresent = false;
      }
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
        // A close-enough friend's bedroom counts as a hangout candidate
        // too, once its owner has actually settled in there for the day —
        // visiting only makes sense if someone's actually home, and only
        // for a bond real enough to be worth going to someone's room for,
        // not just any mild closeness. Capped so it never turns into a
        // second living room.
        var visitableBedrooms = floor2.rooms.filter(function (room) {
          return room.name !== '__locked_door__' && room.occupants.length > 0 &&
            room.occupants.length < BEDROOM_VISIT_CAP &&
            room.occupants.some(function (slug) { return closenessBetween(r.slug, slug) >= BEDROOM_VISIT_THRESHOLD; });
        });
        var candidateRooms = hangoutRooms.concat(visitableBedrooms);

        // Closeness-biased pick: weight every room by how positive/negative
        // its current occupants read for this resident, then roll against
        // those weights. Rooms with no signal at all still get a small
        // base weight so everyone has somewhere to land. A bond under
        // CLOSENESS_PLACEMENT_THRESHOLD doesn't count at all here — only
        // real closeness or real friction should ever bias where someone
        // lands; anything weaker is placed as if there were no bond.
        var weights = candidateRooms.map(function (room) {
          var score = 1;
          room.occupants.forEach(function (slug) {
            var c = closenessBetween(r.slug, slug);
            if (Math.abs(c) >= CLOSENESS_PLACEMENT_THRESHOLD) score += c;
          });
          return Math.max(0.15, score);
        });
        var total = weights.reduce(function (a, b) { return a + b; }, 0);
        var roll = Math.random() * total;
        for (var i = 0; i < candidateRooms.length; i++) {
          roll -= weights[i];
          if (roll <= 0) { candidate = candidateRooms[i]; break; }
        }
        if (!candidate) candidate = candidateRooms[candidateRooms.length - 1];
      }
      place(r.slug, candidate);
    });

    return {
      floors: [floor1, floor2, floor3],
      hiddenDoorPresent: hiddenDoorPresent,
      hiddenDoorPoint: hiddenDoorPoint,
      hiddenDoorAxis: hiddenDoorAxis,
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
    // residents in one room don't stack exactly on top of each other. A
    // bedroom is much shallower than a hangout room (rect.h ~9 vs 15+),
    // so wrapping to a second row there puts the rows too close together
    // to actually clear each other — force one single row instead.
    var narrow = room.rect.h < 12;
    var cols = narrow ? count : Math.min(4, Math.max(1, Math.ceil(Math.sqrt(count))));
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
  function dotSizePercent(count, narrow) {
    // A narrow (bedroom-depth) room's single-row layout has less width
    // to spread 3 dots across than a hangout room does, so it needs to
    // start shrinking a person sooner than the normal >4 crowding rule.
    if (narrow && count >= 3) return 2.5;
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
    hideRoomTip();
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
      var rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', room.rect.x); rect.setAttribute('y', room.rect.y);
      rect.setAttribute('width', room.rect.w); rect.setAttribute('height', room.rect.h);
      rect.setAttribute('rx', 1);
      rect.setAttribute('class', 'floorplan-room-rect');
      svgEl.appendChild(rect);

      // The Locked Door gets a room box like everywhere else, on purpose
      // left unlabeled — it's supposed to look like an ordinary bedroom
      // door until you actually open it.
      if (room.name === '__locked_door__') return;

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
        renderLockedDoorMarker(room);
        return;
      }
      // Appended before this room's dots, so the dots still end up on
      // top of it in the DOM's paint/hit-test order — hovering or
      // clicking a dot is about that resident, hovering or tapping
      // anywhere else in the box is about the room itself.
      var hit = document.createElement('button');
      hit.type = 'button';
      hit.className = 'floorplan-room-hit';
      hit.style.left = room.rect.x + '%';
      hit.style.top = room.rect.y + '%';
      hit.style.width = room.rect.w + '%';
      hit.style.height = room.rect.h + '%';
      hit.setAttribute('aria-label', room.name);
      hit.addEventListener('mouseenter', function () {
        if (!roomTipPinned) showRoomTip(room, false);
      });
      hit.addEventListener('mouseleave', function () {
        if (!roomTipPinned) hideRoomTip();
      });
      // A tap fires a click with no prior hover on touch devices, so this
      // is what actually opens the tip there — pinned so it survives
      // until the next tap elsewhere, since there's no hover to hold it
      // open in the meantime.
      hit.addEventListener('click', function () {
        if (roomTipPinned && roomTipRoom === room) { hideRoomTip(); return; }
        showRoomTip(room, true);
      });
      layerEl.appendChild(hit);

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

  // Clickbaity's own object is a hollow red circle — an outline instead
  // of a filled dot for him specifically reads as more "him" than just
  // another colored disc.
  var CLICKBAITY_OUTLINE_WIDTH = '4px';

  function renderDot(resident, room, slot, roomCount) {
    var el = document.createElement('button');
    el.type = 'button';
    el.className = 'floorplan-dot';
    el.style.left = slot.x + '%';
    el.style.top = slot.y + '%';
    el.style.width = dotSizePercent(roomCount || 1, room.rect.h < 12) + '%';
    if (resident.slug === 'clickbaity') {
      el.style.background = 'transparent';
      el.style.border = CLICKBAITY_OUTLINE_WIDTH + ' solid ' + resident.color;
    } else {
      el.style.background = resident.color;
    }
    el.dataset.slug = resident.slug;
    el.dataset.room = room.name;
    el.title = resident.name;
    el.addEventListener('click', function () { openResidentCard(resident, room); });
    layerEl.appendChild(el);
  }

  // Penny's room stays visually ordinary — a plain unlabeled room box
  // (drawn already, above) with just a small grey marker inside, easy to
  // mistake for any other empty room until clicked.
  function renderLockedDoorMarker(room) {
    var el = document.createElement('button');
    el.type = 'button';
    el.className = 'floorplan-dot';
    el.style.left = room.cx + '%';
    el.style.top = room.cy + '%';
    el.style.width = dotSizePercent(1) + '%';
    el.style.background = '#8a8a8a';
    el.setAttribute('aria-label', 'A door');
    el.addEventListener('click', function () { openLockedDoorCard(); });
    layerEl.appendChild(el);
  }

  function renderHiddenDoor() {
    // A rare, unlabeled door built right into the wall itself — a thin
    // line running along the wall, not a room's own doorway. The House
    // is hiding this on purpose — clicking it just makes it vanish. No
    // reveal, no page, nothing. Runs parallel to whichever wall it
    // landed on: a horizontal wall (axis 'h') gets a horizontal line, a
    // vertical wall a vertical one.
    if (!house.hiddenDoorPoint) return;
    var el = document.createElement('button');
    el.type = 'button';
    el.className = 'floorplan-hidden-door ' + (house.hiddenDoorAxis === 'v' ? 'is-vertical' : 'is-horizontal');
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

  // A resident's color is picked to be vivid and distinct as a small dot,
  // which makes a lousy full-card background — dark text needs a light
  // ground under it. Blends the color toward white for the note's
  // background instead of using it at full strength; the dot itself is
  // untouched.
  function lightenColor(hex, amount) {
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    r = Math.round(r + (255 - r) * amount);
    g = Math.round(g + (255 - g) * amount);
    b = Math.round(b + (255 - b) * amount);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
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
    // feature shouldn't reach into. Lightened rather than the raw dot
    // color — vivid enough to read as a dot, too much as a whole card.
    noteEl.style.background = lightenColor(resident.color, 0.55);
    noteEl.style.color = '';
    noteCloseEl.style.color = '';
    noteOverlay.classList.add('open');
  }

  // No name on this one, on purpose — Penny doesn't get identified here,
  // just glimpsed. Dark gray instead of the usual lightened dot-color
  // background, since there's no text on top that needs a light ground.
  function openLockedDoorCard() {
    noteBody.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'floorplan-note-card';
    var img = document.createElement('img');
    img.className = 'floorplan-note-portrait';
    img.src = '../images/zoomedicons/penny.webp';
    img.alt = 'Penny';
    wrap.appendChild(img);
    noteBody.appendChild(wrap);
    noteEl.style.background = '#3a3a3a';
    noteEl.style.color = '#e8e4dc';
    noteCloseEl.style.color = '#e8e4dc';
    noteOverlay.classList.add('open');
  }

  // A room's info shows in a small themed tooltip instead of the big
  // note-card modal — hover reveals it on desktop, a tap pins it open on
  // touch devices (no hover state to reveal it there). One shared element,
  // repositioned per room, rather than rebuilding the whole modal overlay
  // for something this lightweight.
  var roomTipEl = document.createElement('div');
  roomTipEl.className = 'floorplan-room-tip';
  stageEl.appendChild(roomTipEl);
  var roomTipRoom = null;
  var roomTipPinned = false;

  function roomTipContent(room) {
    var desc = ROOM_DESCRIPTIONS[room.name];
    var names = room.occupants.length
      ? room.occupants.map(function (slug) { var r = findResident(slug); return r ? r.name : slug; }).join(', ')
      : 'No one right now.';
    roomTipEl.innerHTML = '';
    var h5 = document.createElement('h5');
    h5.textContent = room.name;
    roomTipEl.appendChild(h5);
    if (desc) {
      var descEl = document.createElement('p');
      descEl.textContent = desc;
      roomTipEl.appendChild(descEl);
    }
    var label = document.createElement('p');
    label.className = 'floorplan-room-tip-label';
    label.textContent = 'Currently here';
    roomTipEl.appendChild(label);
    var namesEl = document.createElement('p');
    namesEl.textContent = names;
    roomTipEl.appendChild(namesEl);
  }

  // Anchored above the room, centered on it; flips to sit below instead
  // when the room's too close to the top of the stage for that to fit.
  function positionRoomTip(room) {
    var flip = room.rect.y < 15;
    roomTipEl.style.left = room.cx + '%';
    roomTipEl.style.top = (flip ? room.rect.y + room.rect.h : room.rect.y) + '%';
    roomTipEl.style.transform = flip ? 'translate(-50%, 0.6rem)' : 'translate(-50%, calc(-100% - 0.6rem))';
    roomTipEl.style.marginLeft = '0px';
    // The transform above only centers it against the room itself — a
    // room near the left/right edge of the stage can still push the
    // (fixed-width) tip past the stage's own edge, so nudge it back in.
    var stageRect = stageEl.getBoundingClientRect();
    var tipRect = roomTipEl.getBoundingClientRect();
    var overflowLeft = stageRect.left - tipRect.left;
    var overflowRight = tipRect.right - stageRect.right;
    if (overflowLeft > 0) roomTipEl.style.marginLeft = (overflowLeft + 4) + 'px';
    else if (overflowRight > 0) roomTipEl.style.marginLeft = -(overflowRight + 4) + 'px';
  }

  function showRoomTip(room, pinned) {
    roomTipContent(room);
    roomTipEl.classList.add('is-visible');
    positionRoomTip(room);
    roomTipRoom = room;
    roomTipPinned = !!pinned;
  }

  function hideRoomTip() {
    roomTipEl.classList.remove('is-visible');
    roomTipRoom = null;
    roomTipPinned = false;
  }

  document.addEventListener('click', function (e) {
    if (roomTipPinned && !e.target.closest('.floorplan-room-hit')) hideRoomTip();
  });

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
  // A room normally opens onto exactly one corridor segment (its own
  // doorPoint/seg). A room with `doors` (currently just the Courtyard,
  // bordered by all four ring segments) instead exits toward whichever
  // side the OTHER room actually sits on — so it never needs corner
  // routing to reach anywhere, matching that it's reachable from any wall.
  function effectiveDoor(room, otherRoom) {
    if (room.doors && otherRoom.seg && room.doors[otherRoom.seg.key]) {
      return { point: room.doors[otherRoom.seg.key], key: otherRoom.seg.key };
    }
    return { point: room.doorPoint, key: room.seg ? room.seg.key : null };
  }

  function pathDistance(points) {
    var total = 0;
    for (var i = 1; i < points.length; i++) {
      total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    }
    return total;
  }

  function buildWanderPath(fromRoom, toRoom, floor) {
    var from = effectiveDoor(fromRoom, toRoom);
    var to = effectiveDoor(toRoom, fromRoom);

    if (!from.key || !to.key || from.key === to.key) return [from.point, to.point];

    var ringPoints = [from.point];
    findCorridorPath(floor, from.key, to.key).forEach(function (cname) {
      ringPoints.push(CORNER_POINTS[cname]);
    });
    ringPoints.push(to.point);

    // A Courtyard sits in the middle of the ring, reachable from every
    // segment — cutting straight through it is often shorter than
    // walking two sides of the ring to get to the opposite segment, so
    // it's worth comparing rather than always taking the ring route.
    var courtyard = floor.rooms.filter(function (r) {
      return r.doors && r !== fromRoom && r !== toRoom;
    })[0];
    if (courtyard && courtyard.doors[from.key] && courtyard.doors[to.key]) {
      var throughPoints = [from.point, courtyard.doors[from.key], courtyard.doors[to.key], to.point];
      if (pathDistance(throughPoints) < pathDistance(ringPoints)) return throughPoints;
    }

    return ringPoints;
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

  // Wandering avoids (softly, never absolutely) a room someone has real
  // friction with — the same CLOSENESS_PLACEMENT_THRESHOLD used for
  // initial placement, so a passing acquaintance never factors in, only
  // an actual grudge. Reused for the original random destination, and
  // for wherever a fleeing resident goes next.
  function pickRepulsionWeightedRoom(moverSlug, candidates) {
    var weights = candidates.map(function (room) {
      var score = 1;
      room.occupants.forEach(function (occSlug) {
        var c = closenessBetween(moverSlug, occSlug);
        if (c <= -CLOSENESS_PLACEMENT_THRESHOLD) score += c;
      });
      return Math.max(0.15, score);
    });
    var total = weights.reduce(function (a, b) { return a + b; }, 0);
    var roll = Math.random() * total;
    for (var i = 0; i < candidates.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return candidates[i];
    }
    return candidates[candidates.length - 1];
  }

  // Everyone left behind independently rolls whether to tag along —
  // each roll is only about that one person's own bond with whoever
  // just left, never about whether anyone else already decided to
  // follow. Cool S/Clickbaity use a flatter, stronger roll instead of
  // the closeness math everyone else gets.
  function rollFollowers(moverSlug, leftBehindSlugs) {
    var mover = findResident(moverSlug);
    return leftBehindSlugs.filter(function (slug) {
      var r = findResident(slug);
      if (mover && r && (mover.pair === slug || r.pair === moverSlug)) {
        return Math.random() < PAIR_FOLLOW_CHANCE;
      }
      var c = closenessBetween(moverSlug, slug);
      if (c < CLOSENESS_PLACEMENT_THRESHOLD) return false;
      return Math.random() < c * FOLLOW_CHANCE_PER_POINT;
    });
  }

  // Same idea in reverse — everyone already in the room independently
  // rolls whether the new arrival is enough to make them leave, based
  // only on their own bond with whoever just walked in, never on
  // whether anyone else in the room also flees.
  function rollFleers(moverSlug, presentSlugs) {
    return presentSlugs.filter(function (slug) {
      var c = closenessBetween(moverSlug, slug);
      if (c > -CLOSENESS_PLACEMENT_THRESHOLD) return false;
      return Math.random() < Math.abs(c) * FLEE_CHANCE_PER_POINT;
    });
  }

  // Walks `dot` from fromRoom to toRoom, updates occupancy on arrival,
  // and reflows every dot now in toRoom so nobody lands on top of
  // someone already there. Shared by the original mover, anyone
  // following them out, and anyone fleeing their arrival.
  function moveResident(dot, fromRoom, toRoom, floor, onDone) {
    dot.classList.add('is-wandering');
    var path = buildWanderPath(fromRoom, toRoom, floor);
    animateAlongPath(dot, path, function () {
      var slug = dot.dataset.slug;
      fromRoom.occupants = fromRoom.occupants.filter(function (s) { return s !== slug; });
      if (toRoom.occupants.indexOf(slug) === -1) toRoom.occupants.push(slug);
      dot.dataset.room = toRoom.name;

      var slots = dotSlots(toRoom, toRoom.occupants.length);
      var size = dotSizePercent(toRoom.occupants.length, toRoom.rect.h < 12);
      toRoom.occupants.forEach(function (occSlug, idx) {
        var el = occSlug === slug ? dot : layerEl.querySelector('.floorplan-dot[data-slug="' + occSlug + '"]');
        if (!el) return;
        el.style.transition = 'left 0.5s ease, top 0.5s ease, width 0.5s ease';
        el.style.left = slots[idx].x + '%';
        el.style.top = slots[idx].y + '%';
        el.style.width = size + '%';
      });
      dot.classList.remove('is-wandering');
      if (onDone) onDone();
    });
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
    var moverSlug = dot.dataset.slug;
    var fromRoomName = dot.dataset.room;
    var fromRoom = floor.rooms.filter(function (r) { return r.name === fromRoomName; })[0];
    if (!fromRoom) return;

    var others = floor.rooms.filter(function (r) { return r.name !== fromRoomName; });
    if (!others.length) return;
    var toRoom = pickRepulsionWeightedRoom(moverSlug, others);

    // Snapshot who's on each side of the move BEFORE anyone actually
    // moves — follow/flee reactions are purely about this one move,
    // never chained off a follower's or fleer's own arrival/departure.
    var leftBehind = fromRoom.occupants.filter(function (s) { return s !== moverSlug; });
    var alreadyThere = toRoom.occupants.slice();

    moveResident(dot, fromRoom, toRoom, floor, function () {
      var followers = rollFollowers(moverSlug, leftBehind);
      var fleers = rollFleers(moverSlug, alreadyThere);
      followers.forEach(function (slug) {
        var followerDot = layerEl.querySelector('.floorplan-dot[data-slug="' + slug + '"]');
        if (followerDot) moveResident(followerDot, fromRoom, toRoom, floor);
      });
      fleers.forEach(function (slug) {
        var fleerDot = layerEl.querySelector('.floorplan-dot[data-slug="' + slug + '"]');
        if (!fleerDot) return;
        var fleeCandidates = floor.rooms.filter(function (r) { return r !== toRoom; });
        if (!fleeCandidates.length) return;
        var fleeTo = pickRepulsionWeightedRoom(slug, fleeCandidates);
        moveResident(fleerDot, toRoom, fleeTo, floor);
      });
    });
  }

  wanderTimer = setInterval(tryWander, WANDER_CHECK_MS);

  renderAll();
})();

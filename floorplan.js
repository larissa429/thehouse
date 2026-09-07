

(function () {
  var tabsEl = document.getElementById('floorplanTabs');
  if (!tabsEl) return;

  var stageEl = document.getElementById('floorplanStage');
  var svgEl = document.getElementById('floorplanSvg');
  var layerEl = document.getElementById('floorplanLayer');
  var captionEl = document.getElementById('floorplanCaption');
  var awayEl = document.getElementById('floorplanAway');
  var noteOverlay = document.getElementById('note-overlay');
  var noteEl = document.getElementById('note-content');
  var noteBody = document.getElementById('note-body');
  var noteCloseEl = document.getElementById('note-close');

  var flashEl = document.createElement('div');
  flashEl.className = 'floorplan-flash';
  document.body.appendChild(flashEl);

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var HIDDEN_DOOR_KEY = 'thehouse-floorplan-basement-door-found';

  var ABSENCE_CHANCE = 0.18;
  var BEDROOM_STAY_CHANCE = 0.3;
  var EXTRA_ROOM_SLOTS = 3;
  var RARE_ROOM_CHANCE = 0.42;
  var RARER_ROOM_CHANCE = 0.12;
  var HIDDEN_DOOR_CHANCE = 0.09;
  var LOCKED_DOOR_CHANCE = 0.05;
  var WANDER_CHECK_MS = 9000;
  var WANDER_CHANCE = 0.35;
  var WANDER_MS_PER_UNIT = 45;
  var WANDER_MIN_LEG_MS = 350;
  var WANDER_MAX_LEG_MS = 1800;
  var CLOSENESS_PLACEMENT_THRESHOLD = 3;
  var BEDROOM_VISIT_THRESHOLD = 6;
  var BEDROOM_VISIT_CAP = 3;
  var FOLLOW_CHANCE_PER_POINT = 0.08;
  var PAIR_FOLLOW_CHANCE = 0.85;
  var FLEE_CHANCE_PER_POINT = 0.1;
  var BLUEMARBLE_BEDROOM_CHANCE = 0.5;
  var HARD_AVOID_THRESHOLD = -10;

  var RESIDENTS = [

    { slug: 'journal', name: 'Journal', icon: '../images/zoomedicons/journal.webp', color: '#693719', alwaysHome: true, tolerant: true },
    { slug: 'mirror', name: 'Mirror', icon: '../images/zoomedicons/mirror.webp', color: '#d9b473', defaultRoom: 'Kitchen' },
    { slug: 'lp', name: 'LP', icon: '../images/zoomedicons/lp.webp', color: '#cfa8d4' },
    { slug: 'n528', name: '-⁵⁄₂₈', icon: '../images/zoomedicons/n528.webp', color: '#b8d4c9' },
    { slug: 'dream', name: 'Dream', icon: '../images/zoomedicons/dream.webp', color: '#3d2f69' },
    { slug: 'indigo', name: 'Indigo', icon: '../images/zoomedicons/indigo.webp', color: '#2904bd' },
    { slug: 'cassette', name: 'Cassette', icon: '../images/zoomedicons/cassette.webp', color: '#f0a878' },

    { slug: 'bluemarble', name: 'Blue Marble', icon: '../images/zoomedicons/bluemarble.webp', color: '#a8d4c4', bedroomStayChance: BLUEMARBLE_BEDROOM_CHANCE },
    { slug: 'ap', name: 'AP', icon: '../images/zoomedicons/ap.webp', color: '#e8a2a8', defaultRoom: 'Bathroom', defaultChance: 0.45 },
    { slug: 'cools', name: 'Cool S', icon: '../images/zoomedicons/cools.webp', color: '#c4b0e8', pair: 'clickbaity' },
    { slug: 'clickbaity', name: 'Clickbaity', icon: '../images/zoomedicons/clickbaity.webp', color: '#c0463c', pair: 'cools' },
    { slug: 'geeky', name: 'Geeky', icon: '../images/zoomedicons/geeky.webp', color: '#f0955a' },
    { slug: 'pbc', name: 'PBC', icon: '../images/zoomedicons/pbc.webp', color: '#e8781e', defaultRoom: 'Bathroom', defaultChance: 0.45 },

    { slug: 'dumptruck', name: 'Dumptruck', icon: '../images/zoomedicons/dumptruck.webp', color: '#3f6b32', noHangoutDefault: true }
  ];

  function findResident(slug) {
    for (var i = 0; i < RESIDENTS.length; i++) if (RESIDENTS[i].slug === slug) return RESIDENTS[i];
    return null;
  }

  function findBedroom(slug) {
    var r = findResident(slug);
    if (!r || !house || !house.floors[1]) return null;
    return house.floors[1].rooms.filter(function (room) { return room.name === r.name + "'s Room"; })[0];
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  var CLOSENESS = [
    ['journal', 'mirror', 4], ['journal', 'n528', 5], ['journal', 'bluemarble', -10], ['journal', 'dumptruck', 3],
    ['mirror', 'bluemarble', 6], ['mirror', 'ap', 3],
    ['lp', 'cassette', 9],
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

  function excludeHardAvoidRooms(slug, rooms) {
    var safe = rooms.filter(function (room) {
      return !room.occupants.some(function (occSlug) { return closenessBetween(slug, occSlug) <= HARD_AVOID_THRESHOLD; });
    });
    return safe.length ? safe : rooms;
  }

  var STAPLES = ['Kitchen & Dining Room', 'Living Room', 'Foyer', 'Bathroom'];
  var RARE = ['In-House Theater', 'Courtyard', 'Crafts Room', 'Music Room', 'Arcade', 'Sunroom', 'Board Game Den'];
  var RARER = ['Indoor Treehouse', 'Snow Room', 'Pillow Pit', 'Planetarium', 'Karaoke Bar & Grill'];

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

  var ROOM_CASTS = {
    'Karaoke Bar & Grill': ['journal', 'mirror', 'n528', 'dream', 'cassette', 'lp', 'indigo', 'bluemarble'],
    'In-House Theater': ['journal', 'mirror', 'n528', 'dream']
  };
  var CAST_SCENE_CHANCE = 0.7;

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

  var PERIMETER = { x0: 26, y0: 26, x1: 74, y1: 74 };
  var PERIMETER_HALF = 4, PERIMETER_DEPTH = 15, PERIMETER_GAP = 1.2;
  var CORNER_INSET = 6;

  function perimeterSegments() {
    return {
      top: { axis: 'h', pos: PERIMETER.y0, from: PERIMETER.x0, to: PERIMETER.x1, outSign: -1 },
      right: { axis: 'v', pos: PERIMETER.x1, from: PERIMETER.y0, to: PERIMETER.y1, outSign: 1 },
      bottom: { axis: 'h', pos: PERIMETER.y1, from: PERIMETER.x0, to: PERIMETER.x1, outSign: 1 },
      left: { axis: 'v', pos: PERIMETER.x0, from: PERIMETER.y0, to: PERIMETER.y1, outSign: -1 }
    };
  }

  function corridorRectFor(seg) {

    var from = seg.from - PERIMETER_HALF, to = seg.to + PERIMETER_HALF;
    return seg.axis === 'h'
      ? { x: from, y: seg.pos - PERIMETER_HALF, w: to - from, h: PERIMETER_HALF * 2 }
      : { x: seg.pos - PERIMETER_HALF, y: from, w: PERIMETER_HALF * 2, h: to - from };
  }

  var SHAPE_SEGMENT_OPTIONS = {
    l: [['top', 'right'], ['right', 'bottom'], ['bottom', 'left'], ['left', 'top']],
    u: [['left', 'top', 'right'], ['top', 'right', 'bottom'], ['right', 'bottom', 'left'], ['bottom', 'left', 'top']],
    o: [['top', 'right', 'bottom', 'left']]
  };

  var CORNER_POINTS = {
    NW: { x: PERIMETER.x0, y: PERIMETER.y0 },
    NE: { x: PERIMETER.x1, y: PERIMETER.y0 },
    SE: { x: PERIMETER.x1, y: PERIMETER.y1 },
    SW: { x: PERIMETER.x0, y: PERIMETER.y1 }
  };
  var SEGMENT_CORNERS = { top: ['NW', 'NE'], right: ['NE', 'SE'], bottom: ['SW', 'SE'], left: ['NW', 'SW'] };

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

    return buildCorridorFloor(names, { corridorHalf: 4, marginX: 3, marginY: 6, gap: 0.9, doorGap: 0.8, depth: 9 });
  }

  function wallEdgeOf(rect, seg) {
    if (seg.axis === 'h') {
      var cy = rect.y + rect.h / 2;
      return { edge: cy < seg.pos ? rect.y + rect.h : rect.y, from: rect.x, to: rect.x + rect.w };
    }
    var cx = rect.x + rect.w / 2;
    return { edge: cx < seg.pos ? rect.x + rect.w : rect.x, from: rect.y, to: rect.y + rect.h };
  }

  function phantomOutwardRect(seg) {
    var nearEdge = seg.pos + seg.outSign * (PERIMETER_HALF + PERIMETER_GAP);
    var farEdge = nearEdge + seg.outSign * PERIMETER_DEPTH;
    var d0 = Math.min(nearEdge, farEdge), d1 = Math.max(nearEdge, farEdge);
    return seg.axis === 'h'
      ? { x: seg.from, y: d0, w: seg.to - seg.from, h: d1 - d0 }
      : { x: d0, y: seg.from, w: d1 - d0, h: seg.to - seg.from };
  }

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

  function findEmptyWallSpot(floor) {
    var groups = {};
    floor.rooms.forEach(function (room) {
      if (!room.seg || !room.rect) return;
      var e = wallEdgeOf(room.rect, room.seg);
      var key = room.seg.axis + ':' + Math.round(e.edge * 10);
      (groups[key] = groups[key] || { axis: room.seg.axis, edge: e.edge, centerline: room.seg.pos, spans: [] }).spans.push({ from: e.from, to: e.to });
    });

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

    var corridorEdge = pick.edge > pick.centerline ? pick.edge - PERIMETER_GAP : pick.edge + PERIMETER_GAP;
    return pick.axis === 'h'
      ? { x: t, y: corridorEdge, axis: 'h' }
      : { x: corridorEdge, y: t, axis: 'v' };
  }

  function generateHouse() {
    var floor1Names = shuffle(STAPLES.concat(pickExtraRooms(STAPLES)));
    var floor3Names = shuffle(STAPLES.concat(pickExtraRooms(STAPLES)));
    var floor1 = buildHangoutFloor(floor1Names);
    var floor3 = buildHangoutFloor(floor3Names);

    var doorFound = false;
    try { doorFound = localStorage.getItem(HIDDEN_DOOR_KEY) === '1'; } catch (e) {}
    var hiddenDoorPresent = !doorFound && Math.random() < HIDDEN_DOOR_CHANCE;

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

    var bedroomNames = RESIDENTS.map(function (r) { return r.name + "'s Room"; });
    var lockedDoorPresent = Math.random() < LOCKED_DOOR_CHANCE;
    if (lockedDoorPresent) bedroomNames.push('__locked_door__');
    bedroomNames = shuffle(bedroomNames);
    var floor2 = buildResidentialFloor(bedroomNames);

    function bedroomOf(slug) {
      var r = findResident(slug);
      return floor2.rooms.filter(function (room) { return room.name === r.name + "'s Room"; })[0];
    }

    var home = {};
    RESIDENTS.forEach(function (r) {
      home[r.slug] = r.alwaysHome || Math.random() >= ABSENCE_CHANCE;
    });

    if (home.cools || home.clickbaity) { home.cools = true; home.clickbaity = true; }

    var hangoutRooms = floor1.rooms.concat(floor3.rooms);
    var placedSlugs = {};

    function place(slug, room) {
      if (placedSlugs[slug] || !room) return;
      room.occupants.push(slug);
      placedSlugs[slug] = room;
    }

    function withoutHardAvoidConflicts(slugs) {
      var attending = [];
      slugs.forEach(function (slug) {
        var conflict = attending.some(function (other) { return closenessBetween(slug, other) <= HARD_AVOID_THRESHOLD; });
        if (!conflict) attending.push(slug);
      });
      return attending;
    }

    hangoutRooms.forEach(function (room) {
      var cast = ROOM_CASTS[room.name];
      if (!cast) return;
      var homeCast = withoutHardAvoidConflicts(cast.filter(function (slug) { return home[slug]; }));
      if (homeCast.length >= Math.ceil(cast.length * 0.6) && Math.random() < CAST_SCENE_CHANCE) {
        homeCast.forEach(function (slug) { place(slug, room); });
      }
    });

    RESIDENTS.forEach(function (r) {
      if (!home[r.slug] || placedSlugs[r.slug]) return;
      if (r.pair && placedSlugs[r.pair]) { place(r.slug, placedSlugs[r.pair]); return; }
      if (r.noHangoutDefault) { place(r.slug, bedroomOf(r.slug)); return; }

      var bedroomStayChance = r.bedroomStayChance != null ? r.bedroomStayChance : BEDROOM_STAY_CHANCE;
      if (Math.random() < bedroomStayChance) {
        var own = bedroomOf(r.slug);
        if (own) { place(r.slug, own); return; }
      }

      var candidate = null;
      if (r.defaultRoom && Math.random() < (r.defaultChance == null ? 1 : r.defaultChance)) {
        candidate = hangoutRooms.filter(function (room) { return room.name.indexOf(r.defaultRoom) !== -1; })[0];
      }
      if (!candidate) {

        var visitableBedrooms = floor2.rooms.filter(function (room) {
          return room.name !== '__locked_door__' && room.occupants.length > 0 &&
            room.occupants.length < BEDROOM_VISIT_CAP &&
            room.occupants.some(function (slug) { return closenessBetween(r.slug, slug) >= BEDROOM_VISIT_THRESHOLD; });
        });
        var candidateRooms = excludeHardAvoidRooms(r.slug, hangoutRooms.concat(visitableBedrooms));

        var weights = candidateRooms.map(function (room) {
          var score = 1;
          room.occupants.forEach(function (slug) {
            var c = closenessBetween(r.slug, slug);
            if (r.tolerant && c < 0) return;
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

    var awaySlugs = RESIDENTS.filter(function (r) { return !home[r.slug]; }).map(function (r) { return r.slug; });

    return {
      floors: [floor1, floor2, floor3],
      hiddenDoorPresent: hiddenDoorPresent,
      hiddenDoorPoint: hiddenDoorPoint,
      hiddenDoorAxis: hiddenDoorAxis,
      lockedDoorPresent: lockedDoorPresent,
      awaySlugs: awaySlugs
    };
  }

  var house = generateHouse();
  var activeFloor = 0;
  var wanderTimer = null;

  var pendingMoveSlugs = {};

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

  function dotSizePercent(count, narrow) {

    if (narrow && count >= 3) return 2.5;
    if (count <= 4) return 3.2;
    return Math.max(1.7, 3.2 * (4 / count));
  }

  function fitLabelFontSize(rect, label, baseSize) {
    var available = rect.w * 0.9;
    var estCharWidth = 0.62;
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

    captionEl.textContent = (totalDots === 0 && !isBedroomFloor) ? 'Quiet in here at the moment.' : '';
  }

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

    if (!house.hiddenDoorPoint) return;
    var el = document.createElement('button');
    el.type = 'button';
    el.className = 'floorplan-hidden-door ' + (house.hiddenDoorAxis === 'v' ? 'is-vertical' : 'is-horizontal');
    el.style.left = house.hiddenDoorPoint.x + '%';
    el.style.top = house.hiddenDoorPoint.y + '%';
    el.setAttribute('aria-label', 'A door');
    el.addEventListener('click', function () { openHiddenDoorCard(); });
    layerEl.appendChild(el);
  }

  function openHiddenDoorCard() {
    noteBody.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'floorplan-door-lightbox';

    var shape = document.createElement('div');
    shape.className = 'floorplan-door-shape';
    shape.setAttribute('role', 'img');
    shape.setAttribute('aria-label', 'A door built into the wall');
    wrap.appendChild(shape);
    noteBody.appendChild(wrap);
    noteEl.style.background = 'var(--wall)';
    noteEl.style.color = '#e8e4dc';
    noteCloseEl.style.color = '#e8e4dc';
    noteOverlay.classList.add('open');

    var tried = false;
    shape.addEventListener('click', function () {
      if (tried) return;
      tried = true;
      breakHiddenDoor();
    });
  }

  function breakHiddenDoor() {
    noteOverlay.classList.add('is-shaking');
    flashEl.classList.add('is-flashing');
    setTimeout(function () {
      noteOverlay.classList.remove('is-shaking');
      flashEl.classList.remove('is-flashing');
      noteOverlay.classList.remove('open');
      house.hiddenDoorPresent = false;
      try { localStorage.setItem(HIDDEN_DOOR_KEY, '1'); } catch (e) {}
      renderAll();
    }, 400);
  }

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
  // Appended to <body>, not the stage — the stage clips its own children
  // (overflow: hidden, so its corridor/room SVG never bleeds past its
  // rounded corners), which was clipping the tip's top off whenever a
  // room sat near the stage's own top edge, most visibly on a narrow
  // mobile viewport where "near the top" is most rooms. Fixed
  // positioning computed from real viewport pixels sidesteps that
  // entirely instead of trying to out-guess the clip from inside it.
  var roomTipEl = document.createElement('div');
  roomTipEl.className = 'floorplan-room-tip';
  document.body.appendChild(roomTipEl);
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

  // Anchored above the room, centered on it, in real viewport pixels —
  // flips to sit below instead when there's not enough room above the
  // room within the actual viewport (not the stage's own coordinate
  // space, which is what let the old version think there was room
  // above when the stage itself was already flush against the top of
  // the screen). Clamped horizontally and vertically against the
  // viewport too, for a room hugging any edge of the screen.
  function positionRoomTip(room) {
    var stageRect = stageEl.getBoundingClientRect();
    var roomTop = stageRect.top + (room.rect.y / 100) * stageRect.height;
    var roomBottom = stageRect.top + ((room.rect.y + room.rect.h) / 100) * stageRect.height;
    var roomCenterX = stageRect.left + ((room.rect.x + room.rect.w / 2) / 100) * stageRect.width;

    var margin = 8;
    // Measure at the page's natural flow width first (max-width applies,
    // but actual content width depends on which room's text is longest).
    roomTipEl.style.left = '0px';
    roomTipEl.style.top = '0px';
    var tipRect = roomTipEl.getBoundingClientRect();
    var tipW = tipRect.width, tipH = tipRect.height;

    var flip = roomTop - tipH - margin < 0;
    var top = flip ? roomBottom + margin : roomTop - tipH - margin;
    top = Math.max(margin, Math.min(top, window.innerHeight - tipH - margin));

    var left = roomCenterX - tipW / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - tipW - margin));

    roomTipEl.style.left = left + 'px';
    roomTipEl.style.top = top + 'px';
  }

  // A pinned tip (touch) can outlive the scroll position it was placed
  // at — keep it glued to its room rather than left floating over
  // whatever scrolled into its place.
  window.addEventListener('scroll', function () {
    if (roomTipRoom) positionRoomTip(roomTipRoom);
  }, { passive: true });
  window.addEventListener('resize', function () {
    if (roomTipRoom) positionRoomTip(roomTipRoom);
  });

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

  // Absence is house-wide, not floor-specific — someone not home isn't
  // hiding on another floor, they're just not placed anywhere this
  // load — so this renders once, independent of whichever floor tab is
  // active, rather than being recomputed per floor like the caption is.
  function renderAway() {
    if (!awayEl) return;
    if (!house.awaySlugs.length) { awayEl.textContent = ''; return; }
    var names = house.awaySlugs.map(function (slug) { var r = findResident(slug); return r ? r.name : slug; });
    awayEl.textContent = 'Not home right now: ' + names.join(', ') + '.';
  }

  function renderAll() {
    renderTabs();
    renderStage();
    renderAway();
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

  // For any cross-floor departure — leaving for a room on a different
  // floor of the house entirely, which has no physical corridor
  // connecting it to this one — walks toward whichever corner or dead
  // end of the CURRENT floor's own hallway is reachable, using the
  // exact same corner/segment graph buildWanderPath routes through
  // between rooms, just ending at the wall itself (implying a
  // stairwell just past it) instead of another doorway. A straight
  // floor has no corners at all, just the two open ends of its one
  // corridor.
  function buildRetreatPath(fromRoom, floor) {
    var from = effectiveDoor(fromRoom, {});
    var corners = [];
    (floor.segments || []).forEach(function (s) {
      s.corners.forEach(function (c) { if (corners.indexOf(c) === -1) corners.push(c); });
    });

    if (!corners.length) {
      var spine = floor.corridorSegments[0];
      var y = spine.y + spine.h / 2;
      var target = Math.random() < 0.5 ? { x: spine.x, y: y } : { x: spine.x + spine.w, y: y };
      return [from.point, target];
    }

    var cornerName = corners[Math.floor(Math.random() * corners.length)];
    var targetPoint = CORNER_POINTS[cornerName];
    if (!from.key) return [from.point, targetPoint];

    var targetSegKey = null;
    for (var key in SEGMENT_CORNERS) {
      if (SEGMENT_CORNERS[key].indexOf(cornerName) !== -1 &&
        (floor.segments || []).some(function (s) { return s.key === key; })) {
        targetSegKey = key;
        break;
      }
    }
    if (!targetSegKey || targetSegKey === from.key) return [from.point, targetPoint];

    var points = [from.point];
    findCorridorPath(floor, from.key, targetSegKey).forEach(function (cname) { points.push(CORNER_POINTS[cname]); });
    if (points[points.length - 1] !== targetPoint) points.push(targetPoint);
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

      dot.style.transition = 'left ' + dur + 'ms linear, top ' + dur + 'ms linear';
      dot.style.left = p.x + '%';
      dot.style.top = p.y + '%';
      setTimeout(step, dur);
    }
    step();
  }

  function pickRepulsionWeightedRoom(moverSlug, candidates) {
    candidates = excludeHardAvoidRooms(moverSlug, candidates);
    var mover = findResident(moverSlug);
    var weights = candidates.map(function (room) {
      var score = 1;
      if (mover && mover.tolerant) return score;
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

  function eligibleDestinationRooms(slug, fromRoom) {
    var ownBedroom = findBedroom(slug);
    var rooms = house.floors[0].rooms.concat(house.floors[2].rooms);
    if (ownBedroom) rooms.push(ownBedroom);
    house.floors[1].rooms.forEach(function (bedroom) {
      if (bedroom === ownBedroom || bedroom.name === '__locked_door__') return;
      if (!bedroom.occupants.length || bedroom.occupants.length >= BEDROOM_VISIT_CAP) return;
      var visitable = bedroom.occupants.some(function (occSlug) {
        return closenessBetween(slug, occSlug) >= BEDROOM_VISIT_THRESHOLD;
      });
      if (visitable) rooms.push(bedroom);
    });
    return rooms.filter(function (r) { return r !== fromRoom; });
  }

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

  function rollFleers(moverSlug, presentSlugs) {
    return presentSlugs.filter(function (slug) {
      var resident = findResident(slug);
      if (resident && resident.tolerant) return false;
      var c = closenessBetween(moverSlug, slug);
      if (c > -CLOSENESS_PLACEMENT_THRESHOLD) return false;
      return Math.random() < Math.abs(c) * FLEE_CHANCE_PER_POINT;
    });
  }

  function travelTo(dot, fromRoom, toRoom, floor, onDone) {
    var slug = dot.dataset.slug;
    var sameFloor = floor.rooms.indexOf(toRoom) !== -1;
    dot.classList.add('is-wandering');
    pendingMoveSlugs[slug] = true;
    var path = sameFloor ? buildWanderPath(fromRoom, toRoom, floor) : buildRetreatPath(fromRoom, floor);
    animateAlongPath(dot, path, function () {
      delete pendingMoveSlugs[slug];
      fromRoom.occupants = fromRoom.occupants.filter(function (s) { return s !== slug; });
      if (toRoom.occupants.indexOf(slug) === -1) toRoom.occupants.push(slug);

      var liveDot = layerEl.querySelector('.floorplan-dot[data-slug="' + slug + '"]');

      if (liveDot) {
        if (sameFloor) {
          liveDot.dataset.room = toRoom.name;

          layerEl.appendChild(liveDot);

          var toSlots = dotSlots(toRoom, toRoom.occupants.length);
          var toSize = dotSizePercent(toRoom.occupants.length, toRoom.rect.h < 12);
          toRoom.occupants.forEach(function (occSlug, idx) {
            var el = occSlug === slug ? liveDot : layerEl.querySelector('.floorplan-dot[data-slug="' + occSlug + '"]');
            if (!el) return;
            el.style.transition = 'left 0.5s ease, top 0.5s ease, width 0.5s ease';
            el.style.left = toSlots[idx].x + '%';
            el.style.top = toSlots[idx].y + '%';
            el.style.width = toSize + '%';
          });
          liveDot.classList.remove('is-wandering');
        } else {
          liveDot.remove();
        }

        var fromSlots = dotSlots(fromRoom, fromRoom.occupants.length);
        var fromSize = dotSizePercent(fromRoom.occupants.length, fromRoom.rect.h < 12);
        fromRoom.occupants.forEach(function (occSlug, idx) {
          var el = layerEl.querySelector('.floorplan-dot[data-slug="' + occSlug + '"]');
          if (!el) return;
          el.style.transition = 'left 0.5s ease, top 0.5s ease, width 0.5s ease';
          el.style.left = fromSlots[idx].x + '%';
          el.style.top = fromSlots[idx].y + '%';
          el.style.width = fromSize + '%';
        });
      }

      if (onDone) onDone();
    });
  }

  function tryWander() {
    if (Math.random() >= WANDER_CHANCE) return;
    var floor = house.floors[activeFloor];
    if (!floor || !floor.rooms.length) return;

    var dots = Array.prototype.slice.call(layerEl.querySelectorAll('.floorplan-dot[data-slug]')).filter(function (d) {
      return !pendingMoveSlugs[d.dataset.slug];
    });
    if (!dots.length) return;
    var dot = dots[Math.floor(Math.random() * dots.length)];
    var moverSlug = dot.dataset.slug;
    var fromRoomName = dot.dataset.room;
    var fromRoom = floor.rooms.filter(function (r) { return r.name === fromRoomName; })[0];
    if (!fromRoom) return;

    var destinations = eligibleDestinationRooms(moverSlug, fromRoom);
    if (!destinations.length) return;
    var toRoom = pickRepulsionWeightedRoom(moverSlug, destinations);

    var leftBehind = fromRoom.occupants.filter(function (s) { return s !== moverSlug; });
    var alreadyThere = toRoom.occupants.slice();

    travelTo(dot, fromRoom, toRoom, floor, function () {

      var fleers = rollFleers(moverSlug, alreadyThere);
      fleers.forEach(function (slug) {
        if (pendingMoveSlugs[slug]) return;
        var fleerDot = layerEl.querySelector('.floorplan-dot[data-slug="' + slug + '"]');
        if (!fleerDot) return;
        if (fleerDot.dataset.room !== toRoom.name) return;
        var fleeCandidates = eligibleDestinationRooms(slug, toRoom);
        if (!fleeCandidates.length) return;
        var fleeTo = pickRepulsionWeightedRoom(slug, fleeCandidates);
        travelTo(fleerDot, toRoom, fleeTo, floor);
      });
    });

    var followers = rollFollowers(moverSlug, leftBehind);
    followers.forEach(function (slug) {
      if (pendingMoveSlugs[slug]) return;
      var followerDot = layerEl.querySelector('.floorplan-dot[data-slug="' + slug + '"]');
      if (!followerDot) return;
      if (followerDot.dataset.room !== fromRoom.name) return;

      var hardBlocked = toRoom.occupants.some(function (occSlug) { return closenessBetween(slug, occSlug) <= HARD_AVOID_THRESHOLD; });
      if (hardBlocked) return;
      travelTo(followerDot, fromRoom, toRoom, floor);
    });
  }

  wanderTimer = setInterval(tryWander, WANDER_CHECK_MS);

  renderAll();
})();

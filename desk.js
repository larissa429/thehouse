/* ============================================================
   desk.js — draggable scattered papers + a trash can that refuses
   to actually get rid of anything (art/misc page)

   Drag any .desk-paper around the .desk. Drop one on the .trash-can
   and it crumples (swaps to a random crumpled-paper image, shrinks
   toward the can), then a moment later it un-crumples, swaps back to
   its real image, and re-scatters onto the desk with the same
   flutter-in entrance it had on page load.
   ============================================================ */
(function () {
  var desk = document.getElementById('desk');
  var trashCan = document.getElementById('trashCan');
  if (!desk || !trashCan) return;

  var CRUMPLE_IMAGES = [
    '../../images/crumple1.png',
    '../../images/crumple2.png',
    '../../images/crumple3.png'
  ];

  function randomCrumpleSrc() {
    return CRUMPLE_IMAGES[Math.floor(Math.random() * CRUMPLE_IMAGES.length)];
  }

  function randomScatterSpot() {
    // keep clear of the very edges so papers don't spawn half off-desk
    return {
      x: (12 + Math.random() * 76) + '%',
      y: (12 + Math.random() * 70) + '%',
      rot: (Math.random() * 24 - 12).toFixed(1) + 'deg'
    };
  }

  function replayEntrance(paper, delayMs) {
    paper.classList.remove('entering');
    void paper.offsetWidth; // force reflow so the animation can restart
    paper.style.animationDelay = (delayMs || 0) + 'ms';
    paper.classList.add('entering');
  }

  /* Real bounce physics: a tiny "ball" (the crumpled paper) bouncing
     around inside the can's circular inner rim. Reflects its velocity
     off the rim at whatever angle it actually hits, loses some energy
     each bounce so it settles down, and calls onDone() once time's up.
     Drives img's own transform directly, frame by frame — completely
     separate from .desk-paper's --x/--y/--rot/--scale transform. */
  function runBounce(img, onDone) {
    var canSize = trashCan.getBoundingClientRect().width;
    var rimRadius = canSize * 1; // i am just eyeballing it until it works lol
    var ballRadius = canSize * 0.06;
    var maxDist = rimRadius - ballRadius;

    var angle = Math.random() * Math.PI * 2;
    var speed = canSize * (0.09 + Math.random() * 0.06); // px per frame — the "intensity"
    var vx = Math.cos(angle) * speed;
    var vy = Math.sin(angle) * speed;
    var x = 0, y = 0;
    var spin = 0;
    var spinSpeed = (Math.random() < 0.5 ? -1 : 1) * (10 + Math.random() * 8);

    var DURATION = 900;
    var start = null;

    function frame(now) {
      if (start === null) start = now;
      var elapsed = now - start;
      if (elapsed >= DURATION) {
        img.style.transform = '';
        onDone();
        return;
      }

      x += vx;
      y += vy;
      var dist = Math.hypot(x, y);
      if (dist > maxDist) {
        // reflect velocity across the surface normal at the point of
        // contact — this is what makes the bounce angle depend on
        // exactly where on the round wall it hit, not a fixed direction
        var nx = x / dist, ny = y / dist;
        var dot = vx * nx + vy * ny;
        vx = (vx - 2 * dot * nx) * 0.6; // *0.6 = energy lost on impact
        vy = (vy - 2 * dot * ny) * 0.6;
        spinSpeed *= -0.8;
        // clamp back onto the rim so it doesn't visually poke through the wall
        x = nx * maxDist;
        y = ny * maxDist;
      }

      // gentle continuous damping so it settles rather than bouncing forever
      vx *= 0.99;
      vy *= 0.99;
      spin += spinSpeed;

      img.style.transform = 'translate(' + x.toFixed(1) + 'px, ' + y.toFixed(1) + 'px) rotate(' + spin.toFixed(1) + 'deg)';
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  document.querySelectorAll('.desk-paper').forEach(function (paper) {
    var img = paper.querySelector('img');
    var realSrc = img.getAttribute('src');

    var dragging = false, moved = false;
    var startClientX, startClientY, startXPct, startYPct;
    var crumpling = false;

    paper.addEventListener('pointerdown', function (e) {
      if (crumpling) return;
      dragging = true;
      moved = false;
      paper.classList.add('dragging');
      paper.setPointerCapture(e.pointerId);
      startClientX = e.clientX;
      startClientY = e.clientY;
      startXPct = parseFloat(paper.style.getPropertyValue('--x')) || 50;
      startYPct = parseFloat(paper.style.getPropertyValue('--y')) || 50;
      e.preventDefault();
    });

    paper.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - startClientX;
      var dy = e.clientY - startClientY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
      var b = desk.getBoundingClientRect();
      // allow well past the desk's own edges (not clamped to ~100%) so a
      // paper can actually be dragged into the separate trash-zone beside
      // the desk instead of stopping dead at the table's border
      var newX = Math.max(-30, Math.min(160, startXPct + (dx / b.width) * 100));
      var newY = Math.max(-10, Math.min(110, startYPct + (dy / b.height) * 100));
      paper.style.setProperty('--x', newX + '%');
      paper.style.setProperty('--y', newY + '%');
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      paper.classList.remove('dragging');
      if (!moved) return;

      var paperRect = paper.getBoundingClientRect();
      var canRect = trashCan.getBoundingClientRect();
      var paperCx = paperRect.left + paperRect.width / 2;
      var paperCy = paperRect.top + paperRect.height / 2;
      var overCan =
        paperCx > canRect.left && paperCx < canRect.right &&
        paperCy > canRect.top && paperCy < canRect.bottom;

      if (overCan) crumpleThenRestore();
    }
    paper.addEventListener('pointerup', endDrag);
    paper.addEventListener('pointercancel', endDrag);

    function crumpleThenRestore() {
      crumpling = true;
      img.setAttribute('src', randomCrumpleSrc());

      // the entrance animation's fill-mode:both keeps its 100% keyframe
      // "in control" of transform forever once played, even overriding
      // later inline/custom-property changes — remove it so the base
      // .desk-paper rule (driven by --x/--y/--rot/--scale) fully governs
      // rendering from here on out
      paper.classList.remove('entering');

      // lock in an explicit --scale:1 and force the browser to commit it
      // before adding the transitioning class and changing the target —
      // same reasoning as before, just routed through the same --rot/--x/
      // --y custom-property mechanism the (working) position/rotation
      // already use, instead of a raw inline transform string
      paper.style.setProperty('--scale', '1');
      void paper.offsetWidth; // force layout so the line above is committed
      paper.classList.add('crumpling');

      // measure the can's REAL on-screen position rather than guessing a
      // fixed percentage — the can lives outside .desk entirely (in its
      // own zone beside it), so a guessed percentage kept landing at the
      // desk's own corner instead of on the can
      var deskRect = desk.getBoundingClientRect();
      var canRect = trashCan.getBoundingClientRect();
      var targetX = ((canRect.left + canRect.width / 2 - deskRect.left) / deskRect.width) * 100 + '%';
      var targetY = ((canRect.top + canRect.height / 2 - deskRect.top) / deskRect.height) * 100 + '%';
      var targetRot = (Math.random() * 360 - 180).toFixed(0) + 'deg';

      requestAnimationFrame(function () {
        paper.style.setProperty('--x', targetX);
        paper.style.setProperty('--y', targetY);
        paper.style.setProperty('--rot', targetRot);
        paper.style.setProperty('--scale', '0.18');
      });

      // once it's arrived at the can (matches the .crumpling transition
      // duration above), hand off to the real bounce simulation and give
      // the can itself a wobble
      setTimeout(function () {
        paper.classList.remove('crumpling');
        paper.classList.add('bouncing');
        trashCan.classList.remove('wobble');
        void trashCan.offsetWidth; // force reflow so the wobble can replay every time
        trashCan.classList.add('wobble');

        runBounce(img, function () {
          // the desk "refuses" to keep it — it pops back out and re-scatters
          var spot = randomScatterSpot();
          paper.classList.remove('bouncing');
          paper.style.setProperty('--x', spot.x);
          paper.style.setProperty('--y', spot.y);
          paper.style.setProperty('--rot', spot.rot);
          paper.style.setProperty('--scale', '1');
          img.setAttribute('src', realSrc);
          replayEntrance(paper, 0);
          crumpling = false;
        });
      }, 400);
    }
  });
})();

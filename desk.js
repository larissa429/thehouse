/* ============================================================
   desk.js — draggable scattered papers + a trash can that refuses
   to actually get rid of anything (art/misc page)

   Drag any .desk-paper around the .desk. Drop one on the .trash-can
   and it crumples (swaps to a random crumpled-paper image, shrinks
   toward the can), then a moment later it un-crumples, swaps back to
   its real image, and re-scatters onto the desk with the same
   flutter-in entrance it had on page load.

   One paper is special: the one marked [data-pen]. Trash it and it
   doesn't crumple — it just shrinks and bounces as itself, then a
   hidden drawer slides out from the bottom edge of the desk with a
   password slip inside. That slip behaves like any other paper from
   then on (draggable, clickable to reveal its text, throwable too).
   ============================================================ */
(function () {
  var desk = document.getElementById('desk');
  var trashCan = document.getElementById('trashCan');
  if (!desk || !trashCan) return;

  var photoOverlay = document.getElementById('photoOverlay');
  var photoOverlayImg = document.getElementById('photoOverlayImg');
  var photoOverlayText = document.getElementById('photoOverlayText');
  var photoClose = document.getElementById('photoClose');

  function openImage(src) {
    if (!photoOverlay) return;
    photoOverlayImg.style.display = '';
    photoOverlayImg.setAttribute('src', src);
    if (photoOverlayText) photoOverlayText.style.display = 'none';
    photoOverlay.classList.add('open');
  }
  function openText(text) {
    if (!photoOverlay || !photoOverlayText) return;
    photoOverlayImg.style.display = 'none';
    photoOverlayText.textContent = text;
    photoOverlayText.style.display = '';
    photoOverlay.classList.add('open');
  }
  function closePhoto() {
    if (photoOverlay) photoOverlay.classList.remove('open');
  }
  if (photoOverlay) {
    photoClose.addEventListener('click', closePhoto);
    photoOverlay.addEventListener('click', function (e) {
      if (e.target === photoOverlay) closePhoto();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closePhoto();
    });
  }

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

  /* Real bounce physics: a tiny "ball" bouncing around inside the can's
     circular inner rim. Reflects its velocity off the rim at whatever
     angle it actually hits, loses some energy each bounce so it settles
     down, and calls onDone() once time's up. Drives img's own transform
     directly, frame by frame — completely separate from .desk-paper's
     --x/--y/--rot/--scale transform. */
  function runBounce(img, onDone) {
    var canSize = trashCan.getBoundingClientRect().width;
    var rimRadius = canSize * 1; // tuned by eye against the actual trash.png art
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
        var nx = x / dist, ny = y / dist;
        var dot = vx * nx + vy * ny;
        vx = (vx - 2 * dot * nx) * 0.6;
        vy = (vy - 2 * dot * ny) * 0.6;
        spinSpeed *= -0.8;
        x = nx * maxDist;
        y = ny * maxDist;
      }

      vx *= 0.99;
      vy *= 0.99;
      spin += spinSpeed;

      img.style.transform = 'translate(' + x.toFixed(1) + 'px, ' + y.toFixed(1) + 'px) rotate(' + spin.toFixed(1) + 'deg)';
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---- the secret: pen -> drawer -> password slip --------------- */
  var drawer = document.getElementById('deskDrawer');
  var drawerOpened = false;

  var SLIP_SRC = '../../images/sticky.png';

  function openDrawerAndSpawnPassword() {
    if (drawer && !drawerOpened) {
      drawerOpened = true;
      drawer.classList.add('open');
    }
    // the paper's own re-scatter already restored --scale etc.; just wait
    // for the drawer's own slide to be visible before the slip appears
    setTimeout(spawnPasswordPaper, 350);
  }

  function spawnPasswordPaper() {
    if (document.querySelector('.desk-paper[data-password]')) return; // already out
    var el = document.createElement('div');
    el.className = 'desk-paper entering';
    el.setAttribute('data-password', 'true');
    // matches the drawer's centered position, sitting inside the open
    // drawer's interior (not just on its front lip) so it reads as
    // physically resting inside the box
    el.style.setProperty('--x', '50%');
    el.style.setProperty('--y', '109%');
    el.style.setProperty('--rot', (Math.random() * 16 - 8).toFixed(1) + 'deg');
    var img = document.createElement('img');
    img.src = SLIP_SRC;
    img.alt = '';
    img.draggable = false;
    el.appendChild(img);
    desk.appendChild(el);
    setupPaper(el, { revealText: 'PASSWORD: PENNY' });
  }

  /* ---- shared setup for every paper, static or spawned later ----- */
  function setupPaper(paper, opts) {
    opts = opts || {};
    var isPen = paper.hasAttribute('data-pen');
    var revealText = opts.revealText || null;
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
      // NOT `|| 50` — breaks at exactly 0% since 0 is falsy in JS
      var parsedX = parseFloat(paper.style.getPropertyValue('--x'));
      var parsedY = parseFloat(paper.style.getPropertyValue('--y'));
      startXPct = isNaN(parsedX) ? 50 : parsedX;
      startYPct = isNaN(parsedY) ? 50 : parsedY;
      e.preventDefault();
    });

    paper.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - startClientX;
      var dy = e.clientY - startClientY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
      var b = desk.getBoundingClientRect();
      var newX = Math.max(-30, Math.min(160, startXPct + (dx / b.width) * 100));
      var newY = Math.max(-10, Math.min(110, startYPct + (dy / b.height) * 100));
      paper.style.setProperty('--x', newX + '%');
      paper.style.setProperty('--y', newY + '%');
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      paper.classList.remove('dragging');
      if (!moved) {
        if (!crumpling && !isPen) {
          if (revealText) openText(revealText);
          else openImage(realSrc);
        }
        return;
      }

      var paperRect = paper.getBoundingClientRect();
      var canRect = trashCan.getBoundingClientRect();
      var paperCx = paperRect.left + paperRect.width / 2;
      var paperCy = paperRect.top + paperRect.height / 2;
      var overCan =
        paperCx > canRect.left && paperCx < canRect.right &&
        paperCy > canRect.top && paperCy < canRect.bottom;

      if (overCan) {
        if (isPen) sinkPen();
        else crumpleThenRestore();
      }
    }
    paper.addEventListener('pointerup', endDrag);
    paper.addEventListener('pointercancel', endDrag);

    // shared "shrink and slide toward the can" step — swapImage controls
    // whether it also swaps to a random crumpled texture (comic pages) or
    // stays looking like itself the whole time (the pen)
    function shrinkTowardCan(swapImage) {
      crumpling = true;
      if (swapImage) img.setAttribute('src', randomCrumpleSrc());

      // the entrance animation's fill-mode:both keeps its 100% keyframe
      // "in control" of transform forever once played, even overriding
      // later inline/custom-property changes — remove it so the base
      // .desk-paper rule (driven by --x/--y/--rot/--scale) fully governs
      // rendering from here on out
      paper.classList.remove('entering');
      paper.style.setProperty('--scale', '1');
      void paper.offsetWidth; // force layout so the line above is committed
      paper.classList.add('crumpling');

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
    }

    function startBounce(onBounceDone) {
      setTimeout(function () {
        paper.classList.remove('crumpling');
        paper.classList.add('bouncing');
        trashCan.classList.remove('wobble');
        void trashCan.offsetWidth; // force reflow so the wobble can replay every time
        trashCan.classList.add('wobble');

        runBounce(img, onBounceDone);
      }, 400);
    }

    function crumpleThenRestore() {
      shrinkTowardCan(true);
      startBounce(function () {
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
    }

    function sinkPen() {
      shrinkTowardCan(false); // no image swap — it's still the pen
      startBounce(function () {
        // the pen re-scatters same as any paper, so the trick can be
        // found again later — then the drawer answers back
        var spot = randomScatterSpot();
        paper.classList.remove('bouncing');
        paper.style.setProperty('--x', spot.x);
        paper.style.setProperty('--y', spot.y);
        paper.style.setProperty('--rot', spot.rot);
        paper.style.setProperty('--scale', '1');
        replayEntrance(paper, 0);
        crumpling = false;

        openDrawerAndSpawnPassword();
      });
    }
  }

  document.querySelectorAll('.desk-paper').forEach(function (paper) {
    setupPaper(paper);
  });
})();

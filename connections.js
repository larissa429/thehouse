document.addEventListener('DOMContentLoaded', function () {

  const overlay = document.getElementById('note-overlay');
  const noteEl = document.getElementById('note-content');
  const noteBody = document.getElementById('note-body');
  const closeBtn = document.getElementById('note-close');

  function closeNote() { overlay.classList.remove('open'); }
  if (overlay) {
    closeBtn.addEventListener('click', closeNote);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeNote(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeNote(); });
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobileQuery = window.matchMedia('(max-width: 700px)');

  document.querySelectorAll('.connections-board').forEach(function (board) {
    const svg = board.querySelector('.connections-strings');
    const selfPin = board.querySelector('.connection-self');
    if (!svg || !selfPin) return;

    let dotLayer = board.querySelector('.connections-dots');
    if (!dotLayer) {
      dotLayer = document.createElement('div');
      dotLayer.className = 'connections-dots';
      board.appendChild(dotLayer);
    }

    function centerOf(pin) {
      const r = pin.getBoundingClientRect();
      const b = board.getBoundingClientRect();
      return { x: r.left + r.width / 2 - b.left, y: r.top - b.top };
    }

    // every pin gets a dot — regardless of whether it has a string
    const allPins = [selfPin].concat(Array.from(board.querySelectorAll('.connection-pin[data-color]')));
    const dotEls = new Map();
    allPins.forEach(function (pin) {
      const dot = document.createElement('span');
      dot.className = 'connection-dot';
      dotLayer.appendChild(dot);
      dotEls.set(pin, dot);
    });

    // only pins WITHOUT data-no-line get a string
    const strings = [];
    board.querySelectorAll('.connection-pin[data-color]').forEach(function (pin, i) {
      if (pin.hasAttribute('data-no-line')) return;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('fill', 'none');
      svg.appendChild(path);
      strings.push({
        pin: pin, path: path,
        sagX: 0, sagY: 0, velX: 0, velY: 0,
        phase: i * 1.7, initialized: false
      });
    });

    const GRAVITY = 0.22;
    const STIFFNESS = 0.02;
    const DAMPING = 0.88;
    const AMBIENT_SWAY = reduceMotion ? 0 : 4;

    function frame(t) {
      if (mobileQuery.matches) { requestAnimationFrame(frame); return; }

      const b = board.getBoundingClientRect();
      svg.setAttribute('viewBox', '0 0 ' + b.width + ' ' + b.height);

      // step 1: position EVERY pin's dot, every frame, no exceptions
      const centers = new Map();
      allPins.forEach(function (pin) {
        const c = centerOf(pin);
        centers.set(pin, c);
        const dot = dotEls.get(pin);
        dot.style.left = c.x + 'px';
        dot.style.top = c.y + 'px';
      });

      // step 2: only pins with a string get the sag/curve math
      const from = centers.get(selfPin);
      strings.forEach(function (s) {
        const to = centers.get(s.pin);
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        const dist = Math.hypot(to.x - from.x, to.y - from.y);
        const sway = AMBIENT_SWAY * Math.sin(t / 900 + s.phase);
        const targetX = midX;
        const targetY = midY + dist * GRAVITY + sway;

        if (!s.initialized) { s.sagX = targetX; s.sagY = targetY; s.initialized = true; }

        if (reduceMotion) {
          s.sagX = targetX; s.sagY = targetY;
        } else {
          s.velX += (targetX - s.sagX) * STIFFNESS;
          s.velY += (targetY - s.sagY) * STIFFNESS;
          s.velX *= DAMPING; s.velY *= DAMPING;
          s.sagX += s.velX; s.sagY += s.velY;
        }

        const ctrlX = 2 * s.sagX - midX;
        const ctrlY = 2 * s.sagY - midY;

        s.path.setAttribute('d',
          'M ' + from.x + ' ' + from.y + ' Q ' + ctrlX + ' ' + ctrlY + ' ' + to.x + ' ' + to.y
        );
      });

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    board.querySelectorAll('.connection-pin').forEach(function (pin) {
      let dragging = false, moved = false, justDragged = false;
      let startClientX, startClientY, startXPct, startYPct;

      pin.addEventListener('pointerdown', function (e) {
        if (getComputedStyle(pin).position !== 'absolute') return;
        dragging = true; moved = false;
        pin.setPointerCapture(e.pointerId);
        startClientX = e.clientX; startClientY = e.clientY;
        startXPct = parseFloat(pin.style.getPropertyValue('--x')) || 50;
        startYPct = parseFloat(pin.style.getPropertyValue('--y')) || 50;
        e.preventDefault();
      });

      pin.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        const dx = e.clientX - startClientX;
        const dy = e.clientY - startClientY;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
        if (!moved) return;
        const b = board.getBoundingClientRect();
let newX = Math.max(-8, Math.min(108, startXPct + (dx / b.width) * 100));
        let newY = Math.max(-8, Math.min(108, startYPct + (dy / b.height) * 100));
        pin.style.setProperty('--x', newX + '%');
        pin.style.setProperty('--y', newY + '%');
      });

      function endDrag() { if (dragging && moved) justDragged = true; dragging = false; }
      pin.addEventListener('pointerup', endDrag);
      pin.addEventListener('pointercancel', endDrag);

      pin.addEventListener('click', function () {
        if (justDragged) { justDragged = false; return; }
        const tpl = pin.querySelector('template');
        if (!tpl || !overlay) return;
        noteBody.innerHTML = '';
        noteBody.appendChild(tpl.content.cloneNode(true));
        noteEl.setAttribute('data-color', pin.getAttribute('data-color'));
        overlay.classList.add('open');
      });
    });
  });
});
/* ============================================================
   locations.js — interactive map for locations/index.html
   Each .location-pin is a draggable polaroid positioned at --x/--y
   (percent), same drag pattern as the connections-board pins
   elsewhere on the site. A plain click (not a drag) clones the
   pin's <template> — a themed brochure panel with its own photo
   gallery and color scheme — into the shared .note-overlay popup.
   This page wires its own open/close rather than depending on
   calendar.js or connections.js being present.
   ============================================================ */
(function () {
  var map = document.getElementById('locationMap');
  if (!map) return;

  var overlay = document.getElementById('note-overlay');
  var noteBody = document.getElementById('note-body');
  var closeBtn = document.getElementById('note-close');

  function closeNote() { if (overlay) overlay.classList.remove('open'); }
  if (overlay) {
    closeBtn.addEventListener('click', closeNote);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeNote(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeNote(); });
  }

  map.querySelectorAll('.location-pin').forEach(function (pin) {
    var dragging = false, moved = false, justDragged = false;
    var startClientX, startClientY, startXPct, startYPct;

    pin.addEventListener('pointerdown', function (e) {
      dragging = true;
      moved = false;
      pin.setPointerCapture(e.pointerId);
      startClientX = e.clientX;
      startClientY = e.clientY;
      // NOT `|| 50` — 0% is falsy in JS and would wrongly snap to center
      var parsedX = parseFloat(pin.style.getPropertyValue('--x'));
      var parsedY = parseFloat(pin.style.getPropertyValue('--y'));
      startXPct = isNaN(parsedX) ? 50 : parsedX;
      startYPct = isNaN(parsedY) ? 50 : parsedY;
      e.preventDefault();
    });

    pin.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - startClientX;
      var dy = e.clientY - startClientY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
      if (!moved) return;
      var b = map.getBoundingClientRect();
      var newX = Math.max(0, Math.min(100, startXPct + (dx / b.width) * 100));
      var newY = Math.max(0, Math.min(100, startYPct + (dy / b.height) * 100));
      pin.style.setProperty('--x', newX + '%');
      pin.style.setProperty('--y', newY + '%');
    });

    function endDrag() {
      if (dragging && moved) justDragged = true;
      dragging = false;
    }
    pin.addEventListener('pointerup', endDrag);
    pin.addEventListener('pointercancel', endDrag);

    pin.addEventListener('click', function () {
      if (justDragged) { justDragged = false; return; }
      var tpl = pin.querySelector('template');
      if (!tpl || !overlay) return;
      noteBody.innerHTML = '';
      noteBody.appendChild(tpl.content.cloneNode(true));
      overlay.classList.add('open');
    });
  });
})();

(function () {
  var map = document.getElementById('locationMap');
  if (!map) return;

  var overlay = document.getElementById('note-overlay');
  var noteBody = document.getElementById('note-body');
  var closeBtn = document.getElementById('note-close');

  var lightbox = document.getElementById('imgLightbox');
  var lightboxImg = document.getElementById('imgLightboxImg');
  var lightboxClose = document.getElementById('imgLightboxClose');

  function closeNote() { if (overlay) overlay.classList.remove('open'); }
  if (overlay) {
    closeBtn.addEventListener('click', closeNote);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeNote(); });
  }

  function openLightbox(src, alt) {
    if (!lightbox) return;
    lightboxImg.src = src;
    lightboxImg.alt = alt || '';
    lightbox.classList.add('open');
  }
  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('open');
    lightboxImg.src = '';
  }
  if (lightbox) {
    lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', function (e) { if (e.target === lightbox) closeLightbox(); });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (lightbox && lightbox.classList.contains('open')) closeLightbox();
    else closeNote();
  });

  if (noteBody) {
    noteBody.addEventListener('click', function (e) {
      var img = e.target.closest('.brochure-gallery img');
      if (!img) return;
      openLightbox(img.src, img.alt);
    });
  }

  var dragEnabled = window.matchMedia('(min-width: 701px)').matches;

  map.querySelectorAll('.location-pin').forEach(function (pin) {
    var dragging = false, moved = false, justDragged = false;
    var startClientX, startClientY, startXPct, startYPct;

    if (dragEnabled) {
      pin.addEventListener('pointerdown', function (e) {
        dragging = true;
        moved = false;
        pin.setPointerCapture(e.pointerId);
        startClientX = e.clientX;
        startClientY = e.clientY;
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
    }

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

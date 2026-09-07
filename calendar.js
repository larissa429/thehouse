(function () {
  var stack = document.getElementById('calendarStack');
  if (!stack) return;

  var sheets = Array.prototype.slice.call(stack.querySelectorAll('.calendar-sheet'));
  var TEAR_THRESHOLD = 110;

  var overlay = document.getElementById('note-overlay');
  var noteBody = document.getElementById('note-body');
  var closeBtn = document.getElementById('note-close');

  var lastOpenedAt = 0;

  function closeNote() { if (overlay) overlay.classList.remove('open'); }
  if (overlay) {
    closeBtn.addEventListener('click', closeNote);
    overlay.addEventListener('click', function (e) {
      if (e.target !== overlay) return;
      if (Date.now() - lastOpenedAt < 350) return;
      closeNote();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeNote(); });
  }

  function openHoliday(btn) {
    if (!overlay) return;
    lastOpenedAt = Date.now();
    var title = btn.getAttribute('data-title') || '';
    var desc = btn.getAttribute('data-desc') || '';
    noteBody.innerHTML = '<h4>' + title + '</h4><p>' + desc + '</p>';
    overlay.classList.add('open');
  }

  function layout() {
    sheets.forEach(function (sheet, i) {
      sheet.style.setProperty('--stack-i', i);
      sheet.style.zIndex = sheets.length - i;
      sheet.style.pointerEvents = i === 0 ? 'auto' : 'none';
      sheet.style.filter = i === 0 ? '' : 'brightness(' + (1 - i * 0.07) + ')';
      sheet.setAttribute('aria-hidden', i === 0 ? 'false' : 'true');
    });
  }
  layout();

  function tearOff(sheet, dragDx) {
    if (sheets[0] !== sheet) return;

    sheets.push(sheets.shift());
    layout();

    var dx = typeof dragDx === 'number' ? dragDx : 0;
    var pushX, rot;
    if (dx === 0) {
      var dir = Math.random() < 0.5 ? -1 : 1;
      pushX = dir * 180;
      rot = dir * 16;
    } else {
      var dir2 = dx < 0 ? -1 : 1;
      pushX = dx + dir2 * 220;
      rot = Math.max(-24, Math.min(24, dx * 0.06));
    }

    sheet.style.transition = 'transform 0.5s cubic-bezier(.4,0,.7,1), opacity 0.5s ease-in';
    sheet.style.transform = 'translate(' + pushX + 'px, 140%) rotate(' + rot + 'deg)';
    sheet.style.opacity = '0';

    var cleaned = false;
    function cleanup() {
      if (cleaned) return;
      cleaned = true;
      sheet.style.transition = 'none';
      sheet.style.transform = '';
      sheet.style.opacity = '';
      void sheet.offsetHeight;
      sheet.style.transition = '';
    }

    sheet.addEventListener('transitionend', cleanup, { once: true });
    setTimeout(cleanup, 600);
  }

  sheets.forEach(function (sheet) {
    var dragging = false, moved = false;
    var startX = 0, startY = 0, downTarget = null;

    sheet.addEventListener('pointerdown', function (e) {
      if (sheets[0] !== sheet) return;
      dragging = true;
      moved = false;
      startX = e.clientX;
      startY = e.clientY;
      downTarget = e.target;
      sheet.classList.add('dragging');
      sheet.style.touchAction = 'none';
      sheet.setPointerCapture(e.pointerId);
    });

    sheet.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        if (!moved) e.preventDefault();
        moved = true;
      }
      if (!moved) return;
      var fall = Math.max(dy, 0);
      sheet.style.transform = 'translate(' + (dx * 0.5) + 'px,' + fall + 'px) rotate(' + (dx * 0.04) + 'deg)';
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      sheet.classList.remove('dragging');
      sheet.style.touchAction = '';

      if (moved) {
        var dx = e.clientX - startX;
        var dy = e.clientY - startY;
        if (Math.hypot(dx, dy) > TEAR_THRESHOLD) {
          tearOff(sheet, dx);
        } else {
          sheet.style.transform = '';
        }
        return;
      }

      var btn = downTarget && downTarget.closest ? downTarget.closest('.cal-day.holiday') : null;
      if (btn) openHoliday(btn);
    }
    sheet.addEventListener('pointerup', endDrag);
    sheet.addEventListener('pointercancel', endDrag);
  });

  var tearBtn = document.getElementById('tearNextBtn');
  if (tearBtn) {
    tearBtn.addEventListener('click', function () { tearOff(sheets[0]); });
  }
})();

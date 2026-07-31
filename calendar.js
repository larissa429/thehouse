/* ============================================================
   calendar.js — tear-off wall calendar for The House
   Four .calendar-sheet cards sit stacked in #calendarStack.
   Drag the front one down past TEAR_THRESHOLD (or use the
   fallback button) and it flies off; the next season underneath
   becomes the new front, and it cycles endlessly through all 4.
   Clicking (not dragging) a holiday date opens the shared
   .note-overlay popup with that holiday's info.
   ============================================================ */
(function () {
  var stack = document.getElementById('calendarStack');
  if (!stack) return;

  var sheets = Array.prototype.slice.call(stack.querySelectorAll('.calendar-sheet'));
  var TEAR_THRESHOLD = 110;

  var overlay = document.getElementById('note-overlay');
  var noteBody = document.getElementById('note-body');
  var closeBtn = document.getElementById('note-close');

  function closeNote() { if (overlay) overlay.classList.remove('open'); }
  if (overlay) {
    closeBtn.addEventListener('click', closeNote);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeNote(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeNote(); });
  }

  function openHoliday(btn) {
    if (!overlay) return;
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
      sheet.setAttribute('aria-hidden', i === 0 ? 'false' : 'true');
    });
  }
  layout();

  function tearOff(sheet) {
    if (sheets[0] !== sheet) return; // safety: only the front sheet can tear

    var advanced = false;
    function advance() {
      if (advanced) return; // transitionend AND the timeout fallback can both
      advanced = true;      // fire — only run this once, whichever comes first
      sheet.style.transition = '';
      sheet.style.transform = '';
      sheet.style.opacity = '';
      sheets.push(sheets.shift());
      layout();
    }

    sheet.style.transition = 'transform 0.5s cubic-bezier(.4,0,.7,1), opacity 0.5s ease-in';
    var dir = Math.random() < 0.5 ? -1 : 1;
    sheet.style.transform = 'translate(' + (dir * 40) + 'px, 140%) rotate(' + (dir * 16) + 'deg)';
    sheet.style.opacity = '0';
    sheet.style.pointerEvents = 'none';

    // don't filter by e.propertyName — transform and opacity finish at the
    // same time, and {once:true} would consume the listener on whichever
    // one fires first, silently dropping the other
    sheet.addEventListener('transitionend', advance, { once: true });
    setTimeout(advance, 600); // safety net in case transitionend never fires
  }

  sheets.forEach(function (sheet) {
    var dragging = false, moved = false;
    var startX = 0, startY = 0;

    sheet.addEventListener('pointerdown', function (e) {
      if (sheets[0] !== sheet) return;
      dragging = true;
      moved = false;
      startX = e.clientX;
      startY = e.clientY;
      sheet.classList.add('dragging');
      sheet.style.touchAction = 'none';
      sheet.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    sheet.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved = true;
      if (!moved) return;
      var fall = Math.max(dy, 0);
      sheet.style.transform = 'translate(' + (dx * 0.5) + 'px,' + fall + 'px) rotate(' + (dx * 0.04) + 'deg)';
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      sheet.classList.remove('dragging');
      sheet.style.touchAction = '';
      var dy = moved ? (e.clientY - startY) : 0;
      if (moved && dy > TEAR_THRESHOLD) {
        tearOff(sheet);
      } else {
        sheet.style.transform = '';
      }
    }
    sheet.addEventListener('pointerup', endDrag);
    sheet.addEventListener('pointercancel', endDrag);

    sheet.addEventListener('click', function (e) {
      if (moved) { moved = false; return; } // that click was actually a drag — ignore it
      var btn = e.target.closest('.cal-day.holiday');
      if (btn) openHoliday(btn);
    });
  });

  var tearBtn = document.getElementById('tearNextBtn');
  if (tearBtn) {
    tearBtn.addEventListener('click', function () { tearOff(sheets[0]); });
  }
})();

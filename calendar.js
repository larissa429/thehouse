/* ============================================================
   calendar.js — tear-off wall calendar for The House
   Four .calendar-sheet cards sit stacked in #calendarStack.
   Drag the front one down past TEAR_THRESHOLD (or use the
   fallback button) and it flies off. The next season underneath
   becomes interactive IMMEDIATELY — not after its animation
   finishes — so there's no window where nothing responds to a
   click or drag. The outgoing sheet's fly-off + reset is a purely
   cosmetic animation from that point on, fully decoupled from
   interactivity, and resets itself silently (no transition) once
   it's done so it never visibly "returns" to the stack.
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
      // dimming only applies to sheets behind the front one — kept off the
      // front sheet entirely (not even set to a no-op brightness(1)),
      // because `filter` promotes an element onto its own GPU compositing
      // layer, a known source of touch hit-testing glitches on mobile
      // Chrome for elements inside a scrolling page
      sheet.style.filter = i === 0 ? '' : 'brightness(' + (1 - i * 0.07) + ')';
      sheet.setAttribute('aria-hidden', i === 0 ? 'false' : 'true');
    });
  }
  layout();

  function tearOff(sheet, dragDx) {
    if (sheets[0] !== sheet) return; // only the current front can tear

    // Advance right away: the next sheet becomes the new front (and
    // interactive) immediately. Its --stack-i/z-index for the *outgoing*
    // sheet also updates now, to "back of the stack" — that's fine, since
    // the outgoing sheet's own inline transform (set below) overrides that
    // positioning entirely until its animation finishes.
    sheets.push(sheets.shift());
    layout();

    // continue flying in whatever direction it was already being dragged,
    // instead of resetting to a small fixed offset — otherwise it visibly
    // snaps back toward center right as it's released
    var dx = typeof dragDx === 'number' ? dragDx : 0;
    var pushX, rot;
    if (dx === 0) {
      var dir = Math.random() < 0.5 ? -1 : 1;
      pushX = dir * 180;
      rot = dir * 16;
    } else {
      var dir2 = dx < 0 ? -1 : 1;
      pushX = dx + dir2 * 220; // keep going the same way, further
      rot = Math.max(-24, Math.min(24, dx * 0.06));
    }

    sheet.style.transition = 'transform 0.5s cubic-bezier(.4,0,.7,1), opacity 0.5s ease-in';
    sheet.style.transform = 'translate(' + pushX + 'px, 140%) rotate(' + rot + 'deg)';
    sheet.style.opacity = '0';

    var cleaned = false;
    function cleanup() {
      if (cleaned) return; // transitionend AND the timeout fallback can both
      cleaned = true;      // fire — only run this once, whichever comes first
      // reset with transitions OFF, so it never visibly slides back into
      // the stack — it should just quietly already be there, ready to fly
      // again the instant it's needed (rapid repeat tears rely on this)
      sheet.style.transition = 'none';
      sheet.style.transform = '';
      sheet.style.opacity = '';
      void sheet.offsetHeight; // force the browser to apply "none" before clearing it
      sheet.style.transition = '';
    }

    // don't filter by e.propertyName — transform and opacity finish at the
    // same time, and {once:true} would consume the listener on whichever
    // one fires first, silently dropping the other
    sheet.addEventListener('transitionend', cleanup, { once: true });
    setTimeout(cleanup, 600); // safety net in case transitionend never fires
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
      downTarget = e.target; // record the real target BEFORE pointer capture below can redirect it
      sheet.classList.add('dragging');
      sheet.style.touchAction = 'none';
      sheet.setPointerCapture(e.pointerId);
    });

    sheet.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        if (!moved) e.preventDefault(); // only suppress native drag once it's a real drag, not a click
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
        // total distance pulled, not just how far down — so a mostly
        // sideways yank tears it off just as easily as a straight-down pull
        if (Math.hypot(dx, dy) > TEAR_THRESHOLD) {
          tearOff(sheet, dx);
        } else {
          sheet.style.transform = '';
        }
        return;
      }

      // no movement — this was a real click/tap, not a drag. setPointerCapture
      // makes the click event's own target unreliable (it gets redirected to
      // `sheet`), so use the target we recorded at pointerdown instead.
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

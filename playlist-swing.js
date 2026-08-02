/* ============================================================
   playlist-swing.js — tilted, draggable, spring-back playlist

   Same drag-by-handle + swing-back physics as Telly's playlist
   (originally in telly.js), pulled out into its own reusable script
   with generic class names (.swing-playlist-wrap / .swing-drag-handle)
   so other character pages can use it without touching telly.js.

   Markup expected:
     <div class="swing-playlist-wrap">
       <div class="swing-drag-handle"></div>
       <span class="swing-tape"></span>
       <iframe ...></iframe>
     </div>
   ============================================================ */
(function () {
  var wrap = document.querySelector('.swing-playlist-wrap');
  var handle = document.querySelector('.swing-drag-handle');
  if (!wrap || !handle) return;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // the resting tilt angle — read from whatever the wrap's CSS already
  // resolves --swing-deg to, so each page can set its own default via
  // the transform's fallback value instead of editing this file
  var computedRest = parseFloat(getComputedStyle(wrap).getPropertyValue('--swing-deg'));
  var REST_DEG = isNaN(computedRest) ? -8 : computedRest;
  var STIFFNESS = 0.02;
  var DAMPING = 0.9;
  var SWING_SENSITIVITY = 0.02;

  var posX = 0, posY = 0;
  var angle = REST_DEG;
  var angleVel = 0;
  var dragging = false;
  var startClientX = 0, startClientY = 0, startPosX = 0, startPosY = 0;
  var lastClientX = 0;
  var rafRunning = false;

  function applyPos() {
    wrap.style.setProperty('--dragX', posX + 'px');
    wrap.style.setProperty('--dragY', posY + 'px');
  }
  function applyAngle() {
    wrap.style.setProperty('--swing-deg', angle.toFixed(2) + 'deg');
  }

  function tick() {
    angleVel += (REST_DEG - angle) * STIFFNESS;
    angleVel *= DAMPING;
    angle += angleVel;
    applyAngle();

    if (!dragging && Math.abs(angleVel) < 0.02 && Math.abs(angle - REST_DEG) < 0.05) {
      angle = REST_DEG;
      angleVel = 0;
      applyAngle();
      rafRunning = false;
      return;
    }
    requestAnimationFrame(tick);
  }
  function ensureTicking() {
    if (!rafRunning) { rafRunning = true; requestAnimationFrame(tick); }
  }

  if (reduceMotion) {
    applyAngle();
    return;
  }

  handle.addEventListener('pointerdown', function (e) {
    dragging = true;
    handle.setPointerCapture(e.pointerId);
    startClientX = e.clientX;
    startClientY = e.clientY;
    lastClientX = e.clientX;
    startPosX = posX;
    startPosY = posY;
    e.preventDefault();
  });

  handle.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    posX = startPosX + (e.clientX - startClientX);
    posY = startPosY + (e.clientY - startClientY);
    applyPos();

    var dx = e.clientX - lastClientX;
    angleVel += dx * SWING_SENSITIVITY;
    lastClientX = e.clientX;

    ensureTicking();
  });

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    ensureTicking();
  }
  handle.addEventListener('pointerup', endDrag);
  handle.addEventListener('pointercancel', endDrag);

  // the drag offset is a raw pixel amount added on top of the wrap's
  // percentage-based anchor position — if the window is resized after
  // dragging, that stale pixel offset no longer lines up with the new
  // layout (looks like the card is stuck "awkwardly" off to one side),
  // so snap back to the anchor position whenever the viewport changes
  window.addEventListener('resize', function () {
    posX = 0;
    posY = 0;
    applyPos();
  });

  applyPos();
  applyAngle();
})();

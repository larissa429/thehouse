(function () {
  var wrap = document.querySelector('.swing-playlist-wrap');
  var handle = document.querySelector('.swing-drag-handle');
  if (!wrap || !handle) return;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  window.addEventListener('resize', function () {
    posX = 0;
    posY = 0;
    applyPos();
  });

  applyPos();
  applyAngle();
})();

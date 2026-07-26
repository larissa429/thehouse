document.addEventListener('DOMContentLoaded', function () {
  var eyes = document.querySelectorAll('.house-eye');
  var maxRadius = 18;       // how far the pupil can travel (in the eye's own 0-100 units)
  var sensitivity = 6;      // higher = mouse has to move further to reach max deflection

  function updatePupil(eyeEl, mouseX, mouseY) {
    var rect = eyeEl.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var dx = mouseX - cx;
    var dy = mouseY - cy;
    var angle = Math.atan2(dy, dx);
    var dist = Math.min(Math.hypot(dx, dy) / sensitivity, maxRadius);
    var pupil = eyeEl.querySelector('.pupil');
    pupil.setAttribute('cx', 50 + Math.cos(angle) * dist);
    pupil.setAttribute('cy', 50 + Math.sin(angle) * dist);
  }

  document.addEventListener('mousemove', function (e) {
    eyes.forEach(function (eye) { updatePupil(eye, e.clientX, e.clientY); });
  });

  document.addEventListener('touchmove', function (e) {
    if (!e.touches || !e.touches[0]) return;
    var t = e.touches[0];
    eyes.forEach(function (eye) { updatePupil(eye, t.clientX, t.clientY); });
  }, { passive: true });
});
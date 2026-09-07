(function () {
  var overlay = document.getElementById('galleryOverlay');
  var overlayImg = document.getElementById('galleryOverlayImg');
  var closeBtn = document.getElementById('galleryClose');

  function openOverlay(src) {
    if (!overlay) return;
    overlayImg.setAttribute('src', src);
    overlay.classList.add('open');
  }
  function closeOverlay() {
    if (overlay) overlay.classList.remove('open');
  }
  if (overlay) {
    closeBtn.addEventListener('click', closeOverlay);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeOverlay();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeOverlay();
    });
  }

  document.querySelectorAll('.gallery-frame img').forEach(function (img) {
    img.addEventListener('click', function () {
      openOverlay(img.getAttribute('src'));
    });
  });
})();

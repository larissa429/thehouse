/* ============================================================
   official.js — the gallery wall (Official Art + commissions)

   The room lights are just on — each frame has its own static picture
   lamp overhead, and its light cone only switches on while that
   specific frame is hovered (pure CSS, via :hover). Click any frame to
   view it full-size in an overlay, same pattern as the desk's photo
   lightbox.
   ============================================================ */
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

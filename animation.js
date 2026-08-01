/* ============================================================
   animation.js — the little theater on the Animation art page

   Register clips here as you add video files to /videos. The curtains
   open on load, the current clip loads into the stage <video>, and the
   prev/next buttons step through the CLIPS list (looping around at
   either end).
   ============================================================ */
(function () {
  var CLIPS = [
    { src: '../../videos/iwantbylars.mp4', title: 'I Want — by Lars' },
    { src: '../../videos/castbytim.mov', title: 'Cast — by Tim' },
    { src: '../../videos/mirrorbylasko.mov', title: 'Mirror — by Lasko' },
    { src: '../../videos/newrecruitbylasko.mov', title: 'New Recruit — by Lasko' },
    { src: '../../videos/timandmirrorbycharlie.mov', title: 'Charlie and Mirror — by Tim' },
    { src: '../../videos/impostorsyndromebywill.mov', title: 'Impostor Syndrome — by Will' },
    { src: '../../videos/blindmutedeafantarcticabylasko.mov', title: 'Blind, Mute, Deaf Antarctica — by Lasko' },
  ];

  var video = document.getElementById('theaterVideo');
  var titleEl = document.getElementById('theaterTitle');
  var prevBtn = document.getElementById('theaterPrev');
  var nextBtn = document.getElementById('theaterNext');
  var stage = document.querySelector('.theater-stage');
  if (!video || !stage) return;

  var current = 0;

  function loadClip(i) {
    if (!CLIPS.length) {
      if (titleEl) titleEl.textContent = 'No clips yet — add one to /videos';
      return;
    }
    current = (i + CLIPS.length) % CLIPS.length;
    var clip = CLIPS[current];
    video.setAttribute('src', clip.src);
    video.load();
    if (titleEl) titleEl.textContent = clip.title || '';
  }

  if (prevBtn) prevBtn.addEventListener('click', function () { loadClip(current - 1); });
  if (nextBtn) nextBtn.addEventListener('click', function () { loadClip(current + 1); });

  loadClip(0);

  // curtains open a beat after the page settles, like the house lights
  // dimming before a show
  window.addEventListener('load', function () {
    setTimeout(function () { stage.classList.add('open'); }, 400);
  });
})();

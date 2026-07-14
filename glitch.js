/* ============================================================
   glitch.js — corrupted-text scramble for The House
   Any element with class="glitch" has each character rapidly
   swapped for random letters/symbols. Same length as your text,
   monospace, ASCII only — so it never changes width and never
   shows missing-glyph squares. The real text is preserved for
   screen readers (data-base / aria-label).

   Tune it here:
     CHARS   — the pool of glitch glyphs to cycle through
     TICK_MS — how fast it scrambles (lower = faster)
     LOCK    — chance (0–1) a slot briefly shows the real char
   ============================================================ */
(function () {
  var CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789!@#$%&*<>?/\\|=+~".split("");
  var TICK_MS = 90;
  var LOCK = 0;   // keep 0 for a fully-redacted field; raise (e.g. 0.15)
                  // if you want the true text to flicker through sometimes

  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  function scramble(base) {
    var out = "";
    for (var i = 0; i < base.length; i++) {
      var ch = base[i];
      if (ch === " ") { out += " "; continue; }      // keep spaces
      if (LOCK && Math.random() < LOCK) { out += ch; continue; }
      out += pick(CHARS);
    }
    return out;
  }

  function init() {
    var nodes = document.querySelectorAll(".glitch");
    if (!nodes.length) return;

    nodes.forEach(function (el) {
      if (!el.dataset.base) el.dataset.base = el.textContent;
      el.setAttribute("aria-label", el.dataset.base); // clean text for screen readers
    });

    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      nodes.forEach(function (el) { el.textContent = scramble(el.dataset.base); });
      return; // one static corrupted pass, no motion
    }

    setInterval(function () {
      nodes.forEach(function (el) { el.textContent = scramble(el.dataset.base); });
    }, TICK_MS);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

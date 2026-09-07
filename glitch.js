(function () {
  var CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789!@#$%&*<>?/\\|=+~".split("");
  var TICK_MS = 90;
  var LOCK = 0;

  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  function scramble(base) {
    var out = "";
    for (var i = 0; i < base.length; i++) {
      var ch = base[i];
      if (ch === " ") { out += " "; continue; }
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
      el.setAttribute("aria-label", el.dataset.base);
    });

    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      nodes.forEach(function (el) { el.textContent = scramble(el.dataset.base); });
      return;
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

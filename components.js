var UTILITY_FOLDERS = ["about", "residents", "audition", "calendar", "resources", "art", "guestbook", "credits", "quiz", "quizsecret", "penny", "locations", "games", "merge", "crossroads", "guesswho", "uno", "boardwalk", "spotlight", "showdown", "oddjobs", "floorplan", "indigosorder"];

var pathParts = location.pathname.split("/").filter(Boolean);
var here = pathParts[pathParts.length - 1] || "";

var scriptSrc = document.currentScript ? document.currentScript.getAttribute("src") : "components.js";
var depth = (scriptSrc.match(/\.\.\//g) || []).length;
var prefix = "../".repeat(depth);
var atRoot = depth === 0;

var isCharacterPage = depth === 1 && UTILITY_FOLDERS.indexOf(here) === -1;

(function () {
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/png';
  link.href = prefix + 'images/favicon.png';
  document.head.appendChild(link);
})();

class SiteHeader extends HTMLElement {
  connectedCallback() {
   this.innerHTML = `
      <header>
        <a href="${prefix}index.html"><img src="${prefix}images/logo.png" alt="The House" width="250" /></a>
        <div class="header-nav-wrap">
          <nav class="rooms">
            <a href="${prefix}index.html" data-key="">Home</a>
            <a href="${prefix}about/" data-key="about">About</a>
            <a href="${prefix}residents/" data-key="residents">Characters</a>
            <a href="${prefix}resources/" data-key="resources">Resources</a>
            <a href="${prefix}games/" data-key="games">Games</a>
            <a href="${prefix}guestbook/" data-key="guestbook">Guestbook</a>
            <a href="${prefix}audition/" data-key="audition">Audition</a>
          </nav>
          <p class="tagline">Stay a while.</p>
        </div>
      </header>`;

    var links = this.querySelectorAll("nav.rooms a");
    links.forEach(function (a) {
      var key = a.getAttribute("data-key");
      if (key === here) a.setAttribute("aria-current", "page");
      if (key === "residents" && isCharacterPage) {
        a.setAttribute("aria-current", "page");
      }
      if (key === "resources" && here === "calendar") {
        a.setAttribute("aria-current", "page");
      }
      if (key === "games" && ["merge", "crossroads", "guesswho", "uno", "boardwalk", "spotlight", "showdown", "oddjobs"].indexOf(here) !== -1) {
        a.setAttribute("aria-current", "page");
      }
    });
  }
}
customElements.define("site-header", SiteHeader);

class SiteFooter extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <footer>
        <p>The House — an original object show by ladyworld.</p>
        <p class="listening">The House is listening.</p>
        <p>
          <a href="https://discord.com/invite/NpmUy79Qgy">Discord</a> ·
          <a href="https://www.tiktok.com/@thehouseobjectshow">TikTok</a>
        </p>
      </footer>`;
  }
}
customElements.define("site-footer", SiteFooter);

document.querySelectorAll(".card").forEach(card => {
  card.addEventListener("click", function(event) {
    if (!this.querySelector(".character-icon")) return;

    if (window.innerWidth <= 700) {

      if (this.classList.contains("show-icon")) {
        return;
      }

      event.preventDefault();

      document.querySelectorAll(".card.show-icon").forEach(openCard => {
        openCard.classList.remove("show-icon");
      });

      this.classList.add("show-icon");
    }
  });
});

document.addEventListener("click", (event) => {
  if (window.innerWidth > 700) return;

  if (!event.target.closest(".card")) {
    document.querySelectorAll(".card.show-icon").forEach(card => {
      card.classList.remove("show-icon");
    });
  }
});

(function () {
  const EXTRA_ROT = 3;
  const LIFT_SCALE = 1.05;
  const isMobileLayout = window.matchMedia('(max-width: 880px)');

  function makeDraggable(el, opts) {
    let dragging = false;
    let startClientX, startClientY, startA, startB;

el.addEventListener('pointerdown', function (e) {
      if (isMobileLayout.matches) return;
      if (e.target.closest('a')) return;
      dragging = true;
      el.classList.add('is-lifted');
      el.style.setProperty('--extra-rot', (Math.random() < 0.5 ? -1 : 1) * EXTRA_ROT + 'deg');
      el.style.setProperty('--scl', LIFT_SCALE);
      el.setPointerCapture(e.pointerId);
      startClientX = e.clientX;
      startClientY = e.clientY;
      const start = opts.getStart();
      startA = start[0];
      startB = start[1];
      e.preventDefault();
    });

    el.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      const dx = e.clientX - startClientX;
      const dy = e.clientY - startClientY;
      opts.onMove(startA, startB, dx, dy);
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      el.classList.remove('is-lifted');
      el.style.setProperty('--extra-rot', '0deg');
      el.style.setProperty('--scl', 1);
    }
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);
  }

  document.querySelectorAll('.character-header').forEach(function (board) {
    board.querySelectorAll('.portrait, .playlist, .statblock').forEach(function (el) {
      makeDraggable(el, {
        getStart: function () {
          const b = board.getBoundingClientRect();
          const r = el.getBoundingClientRect();
          const xPct = ((r.left + r.width / 2) - b.left) / b.width * 100;
          const yPct = (r.top - b.top) / b.height * 100;
          return [xPct, yPct];
        },
        onMove: function (startX, startY, dx, dy) {
          const b = board.getBoundingClientRect();
          let newX = startX + (dx / b.width) * 100;
          let newY = startY + (dy / b.height) * 100;
          newX = Math.max(5, Math.min(95, newX));
          newY = Math.max(-10, Math.min(90, newY));
          el.style.setProperty('--tx', newX + '%');
          el.style.setProperty('--ty', newY + '%');
        }
      });
    });
  });

  document.querySelectorAll('.trivia-note, .house-playlist').forEach(function (el) {
    makeDraggable(el, {
      getStart: function () {
        const x = parseFloat(el.style.getPropertyValue('--dragX')) || 0;
        const y = parseFloat(el.style.getPropertyValue('--dragY')) || 0;
        return [x, y];
      },
      onMove: function (startX, startY, dx, dy) {
        el.style.setProperty('--dragX', (startX + dx) + 'px');
        el.style.setProperty('--dragY', (startY + dy) + 'px');
      }
    });
  });
})();

(function () {
  function randomBetween(min, max) {
    return (Math.random() * (max - min) + min).toFixed(2) + 'deg';
  }

  document.querySelectorAll('.character-header .portrait').forEach(function (el) {
    if (!el.style.getPropertyValue('--rest-rot')) {
      el.style.setProperty('--rest-rot', randomBetween(-4, -1));
    }
  });
  document.querySelectorAll('.character-header .statblock').forEach(function (el) {
    if (!el.style.getPropertyValue('--rest-rot')) {
      el.style.setProperty('--rest-rot', randomBetween(-0.5, 2.5));
    }
  });
  document.querySelectorAll('.character-header .playlist').forEach(function (el) {
    if (!el.style.getPropertyValue('--rest-rot')) {
      el.style.setProperty('--rest-rot', randomBetween(0.5, 3));
    }
  });
  document.querySelectorAll('.trivia-note').forEach(function (el) {
    if (!el.style.getPropertyValue('--rest-rot')) {
      el.style.setProperty('--rest-rot', randomBetween(-2, 1));
    }
  });
})();

(function () {
  if (!isCharacterPage) return;

  var CHARACTER_ORDER = [
    ["journal", "Journal"],
    ["mirror", "Mirror"],
    ["lp", "Long Play"],
    ["charlie", "Charlie"],
    ["n528", "-⁵⁄₂₈"],
    ["dream", "Dream"],
    ["indigo", "Indigo"],
    ["cassette", "Cassette"],
    ["greendaisy", "Green D.A.I.S.Y."],
    ["bluemarble", "Blue Marble"],
    ["ap", "Abstract Painting"],
    ["coolsclickbaity", "Cool S & Clickbaity"],
    ["geeky", "Geeky"],
    ["pbc", "PBC"],
    ["dumptruck", "Dumptruck"],
    ["liz", "Liz"]
  ];

  var idx = -1;
  for (var i = 0; i < CHARACTER_ORDER.length; i++) {
    if (CHARACTER_ORDER[i][0] === here) { idx = i; break; }
  }
  if (idx === -1) return;

  var prev = CHARACTER_ORDER[(idx - 1 + CHARACTER_ORDER.length) % CHARACTER_ORDER.length];
  var next = CHARACTER_ORDER[(idx + 1) % CHARACTER_ORDER.length];

  var breadcrumbLink = document.querySelector('.eyebrow a[href*="residents"]');
  if (!breadcrumbLink) return;
  var breadcrumbEl = breadcrumbLink.closest('.eyebrow');
  if (!breadcrumbEl) return;

  var nav = document.createElement('div');
  nav.className = 'char-pagination';
  nav.innerHTML =
    '<a href="' + prefix + prev[0] + '/">← ' + prev[1] + '</a>' +
    '<a href="' + prefix + next[0] + '/">' + next[1] + ' →</a>';

  breadcrumbEl.insertAdjacentElement('afterend', nav);
})();

(function () {
  const isMobileLayout = window.matchMedia('(max-width: 700px)');
  const EXTRA_ROT = 4;
  const LIFT_SCALE = 1.04;

  document.querySelectorAll('.grid .card').forEach(function (card) {
    const sticky = card.hasAttribute('data-sticky');
    let dragging = false, moved = false;

    if (sticky) {
      let lastTap = 0;
      let revealed = false;
      card.addEventListener('click', function (e) {
        if (!isMobileLayout.matches) return;
        const now = Date.now();
        const isDoubleTap = now - lastTap < 350;
        lastTap = isDoubleTap ? 0 : now;
        if (isDoubleTap) {
          e.preventDefault();
          revealed = !revealed;
          card.style.setProperty('--dragY', revealed ? '-200px' : '0px');
        }
      });
    }

    let startClientX, startClientY, startX, startY;

    card.addEventListener('pointerdown', function (e) {
      if (isMobileLayout.matches) return;
      dragging = true;
      moved = false;
      card.classList.add('is-lifted');
      card.style.setProperty('--extra-rot', (Math.random() < 0.5 ? -1 : 1) * EXTRA_ROT + 'deg');
      card.style.setProperty('--scl', LIFT_SCALE);
      card.setPointerCapture(e.pointerId);
      startClientX = e.clientX;
      startClientY = e.clientY;
      startX = parseFloat(card.style.getPropertyValue('--dragX')) || 0;
      startY = parseFloat(card.style.getPropertyValue('--dragY')) || 0;
      e.preventDefault();
    });

    card.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      const dx = e.clientX - startClientX;
      const dy = e.clientY - startClientY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
      card.style.setProperty('--dragX', (startX + dx) + 'px');
      card.style.setProperty('--dragY', (startY + dy) + 'px');
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      card.classList.remove('is-lifted');
      card.style.setProperty('--extra-rot', '0deg');
      card.style.setProperty('--scl', 1);
      if (!sticky) {
        card.style.setProperty('--dragX', '0px');
        card.style.setProperty('--dragY', '0px');
      }
    }
    card.addEventListener('pointerup', endDrag);
    card.addEventListener('pointercancel', endDrag);

    card.addEventListener('click', function (e) {
      if (moved) { e.preventDefault(); moved = false; }
    });
  });
})();

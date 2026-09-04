/* ============================================================
   components.js — reusable pieces for The House
   Define once here, use everywhere as <site-header> / <site-footer>.
   Edit the footer or nav in THIS file and it changes on every page.

   On each page:
     - put  <site-header></site-header>   where the header goes
     - put  <site-footer></site-footer>   where the footer goes
     - include  <script src="../components.js" defer></script>
       (or "components.js" with no ../ from the site root)

   Every page now lives either at the site root (index.html) or one
   folder deep (e.g. journal/index.html), so URLs read as .../journal/
   instead of .../journal.html. This file detects which depth the
   current page is at and builds the right relative links either way
   — so it keeps working on any hosting URL, custom domain included.
   ============================================================ */

/* the small, fixed set of non-character utility pages. Anything else
   one level deep is assumed to be a character page — so new
   character folders NEVER need to be added here manually again. */
var UTILITY_FOLDERS = ["about", "residents", "audition", "calendar", "resources", "art", "guestbook", "credits", "quiz", "quizsecret", "penny", "locations", "games", "merge", "crossroads", "guesswho", "uno", "boardwalk", "spotlight", "showdown", "oddjobs", "floorplan"];

var pathParts = location.pathname.split("/").filter(Boolean);
var here = pathParts[pathParts.length - 1] || "";

/* depth is read from this script's own src attribute (which every
   page already writes correctly) instead of guessing from folder
   names — so it's automatically right for every character, forever.
   Counts how many "../" segments are actually in the src, so this
   works for any depth (root, one folder deep, two folders deep like
   art/misc/, etc.) instead of only ever handling exactly one level. */
var scriptSrc = document.currentScript ? document.currentScript.getAttribute("src") : "components.js";
var depth = (scriptSrc.match(/\.\.\//g) || []).length;
var prefix = "../".repeat(depth);
var atRoot = depth === 0;

/* is this a character page? EXACTLY one level deep, and not one of the
   fixed utility pages above (two-levels-deep pages, like art/misc/,
   are never character pages regardless of their folder name) */
var isCharacterPage = depth === 1 && UTILITY_FOLDERS.indexOf(here) === -1;

/* ---- FAVICON (auto-injected on every page) -------------------- */
(function () {
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/png';
  link.href = prefix + 'images/favicon.png';
  document.head.appendChild(link);
})();

/* ---- SITE HEADER (masthead + nav) ------------------------- */
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

    // auto-highlight the current page in the nav
    var links = this.querySelectorAll("nav.rooms a");
    links.forEach(function (a) {
      var key = a.getAttribute("data-key");
      if (key === here) a.setAttribute("aria-current", "page");
     // any character page also lights up the "Characters" tab
      if (key === "residents" && isCharacterPage) {
        a.setAttribute("aria-current", "page");
      }
      // the calendar (and anything else that lives under Resources) lights up "Resources"
      if (key === "resources" && here === "calendar") {
        a.setAttribute("aria-current", "page");
      }
      // individual game pages light up "Games" too, not just /games/ itself
      if (key === "games" && ["merge", "crossroads", "guesswho", "uno", "boardwalk", "spotlight", "showdown", "oddjobs"].indexOf(here) !== -1) {
        a.setAttribute("aria-current", "page");
      }
    });
  }
}
customElements.define("site-header", SiteHeader);

/* ---- SITE FOOTER ------------------------------------------ */
/* EDIT YOUR FOOTER HERE — name + social links, once, forever. */
class SiteFooter extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <footer>
        <p>The House \u2014 an original object show by ladyworld.</p>
        <p class="listening">The House is listening.</p>
        <p>
          <a href="https://discord.com/invite/NpmUy79Qgy">Discord</a> \u00b7
          <a href="https://www.tiktok.com/@thehouseobjectshow">TikTok</a>
        </p>
      </footer>`;
  }
}
customElements.define("site-footer", SiteFooter);

/* ---- ICONS ------------------------------------------ */
document.querySelectorAll(".card").forEach(card => {
  card.addEventListener("click", function(event) {
    // this two-tap-to-reveal behavior only applies to cards with a hover-only
    // icon that needs a first tap to reveal (the residents grid) — cards
    // without one (like the Resources grid) should just navigate on one tap
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

  // If the tap wasn't inside a card, close them all.
  if (!event.target.closest(".card")) {
    document.querySelectorAll(".card.show-icon").forEach(card => {
      card.classList.remove("show-icon");
    });
  }
});

/* ============================================================
   FREE-DRAG: portrait / playlist / statblock / trivia-note
   ------------------------------------------------------------
   Grab any of these, and it "lifts" (grows slightly, gets a
   deeper shadow, a small extra tilt), follows your cursor/finger
   directly (no lag, no spring), then smoothly settles flat again
   right where you drop it — no snapping back to its original spot.

   The three top-row pieces (portrait/playlist/statblock) live in
   .character-header, which is now a free-form "board": position is
   tracked as --tx/--ty, a PERCENT of the board's own width/height,
   so they can move anywhere across the whole row and overlap.

   trivia-note isn't part of that board — it's tracked instead as
   --dragX/--dragY, a plain pixel offset from wherever it normally
   sits, since it has nothing else to overlap with.

   Does nothing on the mobile layout, where these elements switch
   to position:static and aren't meant to be dragged.
   ============================================================ */
(function () {
  const EXTRA_ROT = 3;      // degrees of extra tilt added on pickup
  const LIFT_SCALE = 1.05;  // how much it grows on pickup
  const isMobileLayout = window.matchMedia('(max-width: 880px)');

  function makeDraggable(el, opts) {
    let dragging = false;
    let startClientX, startClientY, startA, startB;

el.addEventListener('pointerdown', function (e) {
      if (isMobileLayout.matches) return; // mobile: skip entirely, regardless of CSS position
      if (e.target.closest('a')) return;  // clicking a real link: don't hijack it into a drag
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

  // ---- the three top-row elements: position = % of the board ----
  document.querySelectorAll('.character-header').forEach(function (board) {
    board.querySelectorAll('.portrait, .playlist, .statblock').forEach(function (el) {
      makeDraggable(el, {
        getStart: function () {
          const b = board.getBoundingClientRect();
          const r = el.getBoundingClientRect();
          // el's center-x lines up with its "left" percent anchor
          // (since it's centered via translateX(-50%)); its "top"
          // is a direct, uncentered anchor.
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

// ---- trivia note + house playlist: position = raw px offset ----
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

/* ---- RANDOM RESTING TILT ------------------------------------
   On page load, give every portrait/statblock/playlist/trivia-note
   a small random tilt within its own natural range, instead of a
   fixed value. An inline style="--rest-rot:Xdeg" on the element
   (like on the Cool S & Clickbaity page) always wins over this —
   so pages that want a specific hand-picked tilt keep it. ------- */
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
/* ---- PREV / NEXT CHARACTER PAGINATION ------------------------
   Appears right after the "← All characters" breadcrumb on every
   character page. To add a new character later, just add one line
   to CHARACTER_ORDER below — nothing else needs to change. ------- */
(function () {
  if (!isCharacterPage) return;

  var CHARACTER_ORDER = [
    ["journal", "Journal"],
    ["mirror", "Mirror"],
    ["lp", "Long Play"],
    ["charlie", "Charlie"],
    ["n528", "-\u2075\u2044\u2082\u2088"],
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
  if (idx === -1) return; // current folder not in the list yet — skip quietly

  var prev = CHARACTER_ORDER[(idx - 1 + CHARACTER_ORDER.length) % CHARACTER_ORDER.length];
  var next = CHARACTER_ORDER[(idx + 1) % CHARACTER_ORDER.length];

  var breadcrumbLink = document.querySelector('.eyebrow a[href*="residents"]');
  if (!breadcrumbLink) return;
  var breadcrumbEl = breadcrumbLink.closest('.eyebrow');
  if (!breadcrumbEl) return;

  var nav = document.createElement('div');
  nav.className = 'char-pagination';
  nav.innerHTML =
    '<a href="' + prefix + prev[0] + '/">\u2190 ' + prev[1] + '</a>' +
    '<a href="' + prefix + next[0] + '/">' + next[1] + ' \u2192</a>';

  breadcrumbEl.insertAdjacentElement('afterend', nav);
})();

/* ---- DRAGGABLE CHARACTER CARDS (residents grid) --------------- */
(function () {
  const isMobileLayout = window.matchMedia('(max-width: 700px)');
  const EXTRA_ROT = 4;
  const LIFT_SCALE = 1.04;

  document.querySelectorAll('.grid .card').forEach(function (card) {
    const sticky = card.hasAttribute('data-sticky'); // Blue Marble's card only
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

    // a real drag shouldn't also trigger the card's link navigation
    card.addEventListener('click', function (e) {
      if (moved) { e.preventDefault(); moved = false; }
    });
  });
})();

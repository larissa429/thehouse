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
   — so it keeps working whether you're testing at
   yourname.github.io/thehouse/journal/ or later on a plain custom
   domain like thehouseos.com/journal/.
   ============================================================ */

/* folder name for every page that now lives at PAGE/index.html */
var PAGE_FOLDERS = ["about", "residents", "audition", "journal", "mirror", "lp", "charlie", "n528"];
var CHARACTER_FOLDERS = ["residents", "journal", "mirror", "lp", "charlie", "n528"];

/* are we sitting inside one of those folders right now? */
var pathParts = location.pathname.split("/").filter(Boolean);
var here = pathParts[pathParts.length - 1] || "";
var atRoot = PAGE_FOLDERS.indexOf(here) === -1;
var prefix = atRoot ? "" : "../";   // how to reach the site root from here

/* ---- SITE HEADER (masthead + nav) ------------------------- */
class SiteHeader extends HTMLElement {
  connectedCallback() {
   this.innerHTML = `
      <header>
        <img src="../images/logo.png" alt="The House" width="250" />
        <div class="header-nav-wrap">
          <nav class="rooms">
            <a href="${prefix}index.html" data-key="">Home</a>
            <a href="${prefix}about/" data-key="about">About</a>
            <a href="${prefix}residents/" data-key="residents">Characters</a>
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
      if (key === "residents" && CHARACTER_FOLDERS.indexOf(here) !== -1) {
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

  // ---- trivia note: position = raw px offset from resting spot ----
  document.querySelectorAll('.trivia-note').forEach(function (el) {
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
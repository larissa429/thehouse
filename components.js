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
        <h1 class="sitename"><a href="${prefix}index.html">The House</a></h1>
        <p class="tagline">Stay a while.</p>
        <nav class="rooms">
          <a href="${prefix}index.html" data-key="">Home</a>
          <a href="${prefix}about/" data-key="about">About</a>
          <a href="${prefix}residents/" data-key="residents">Characters</a>
          <a href="${prefix}audition/" data-key="audition">Audition</a>
        </nav>
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
          <a href="https://www.tiktok.com/@thehouseobjectshow">TikTok</a> \u00b7
        </p>
      </footer>`;
  }
}
customElements.define("site-footer", SiteFooter);

/* ---- ICONS ------------------------------------------ */

document.querySelectorAll(".card").forEach(card => {
  card.addEventListener("click", function(event) {
    if (window.innerWidth <= 700) {

      // If this card is already open, allow the link to work
      if (this.classList.contains("show-icon")) {
        return;
      }

      // Stop the first tap from opening the page
      event.preventDefault();

      // Close every other card
      document.querySelectorAll(".card.show-icon").forEach(openCard => {
        openCard.classList.remove("show-icon");
      });

      // Open this card
      this.classList.add("show-icon");
    }
  });
});

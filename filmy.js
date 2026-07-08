/* ============================================================================
   BekaWpigułce — STRONA FILMY  (js/filmy.js)
   ----------------------------------------------------------------------------
   Odpowiada za:
     • wygenerowanie przycisków filtra kategorii (z DB.categories),
     • wyrenderowanie kart wideo (Cards.video — klik otwiera odtwarzacz YT),
     • licznik filmów i komunikat o pustej kategorii,
     • podpięcie linku do Facebooka pod przycisk „Napisz na Facebooku".
   Cała warstwa danych pochodzi z DB (js/db.js) — tu jest tylko prezentacja.
   ========================================================================== */
(function () {
  'use strict';

  // Bieżąco wybrana kategoria (null = wszystkie). Stan trzymany lokalnie.
  let activeCat = null;

  const grid = document.getElementById('filmGrid');
  const empty = document.getElementById('filmEmpty');
  const chips = document.getElementById('filmCats');
  const countEl = document.getElementById('filmCount');

  /* --- 1. Przyciski filtra kategorii ------------------------------------- */
  function renderChips() {
    // „Wszystkie" + po jednym przycisku na każdą kategorię z bazy
    const cats = DB.categories.all();
    let html = `<button class="fchip ${activeCat === null ? 'on' : ''}" data-cat="">Wszystkie</button>`;
    cats.forEach(c => {
      html += `<button class="fchip ${activeCat === c.slug ? 'on' : ''}" data-cat="${c.slug}">${DB.util.esc(c.name)}</button>`;
    });
    chips.innerHTML = html;

    // Podpięcie kliknięć: zmiana kategorii i ponowne renderowanie siatki
    chips.querySelectorAll('.fchip').forEach(btn => {
      btn.addEventListener('click', () => {
        activeCat = btn.dataset.cat || null;
        renderChips();   // odśwież podświetlenie aktywnego przycisku
        renderGrid();    // odśwież listę filmów
      });
    });
  }

  /* --- 2. Siatka kart wideo --------------------------------------------- */
  function renderGrid() {
    const list = DB.videos.byCategory(activeCat); // null => wszystkie
    grid.innerHTML = '';

    if (!list.length) {
      empty.hidden = false;     // pokaż „brak filmów"
      grid.hidden = true;
      return;
    }
    empty.hidden = true;
    grid.hidden = false;

    // Każdy film to gotowy kafelek z Cards.video (otwiera odtwarzacz w modalu)
    list.forEach(v => grid.appendChild(Cards.video(v)));
  }

  /* --- 3. Licznik i link do Facebooka ----------------------------------- */
  function renderMeta() {
    countEl.textContent = DB.videos.all().length;
    const fb = DB.settings.get().fb_page_url || '#';
    const link = document.getElementById('filmFb');
    if (link) link.href = fb;
  }

  /* --- start ------------------------------------------------------------- */
  renderChips();
  renderGrid();
  renderMeta();
})();

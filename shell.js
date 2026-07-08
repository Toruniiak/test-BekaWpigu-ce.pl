/* ============================================================================
   BekaWpigułce — WSPÓLNA POWŁOKA  (js/shell.js)
   ----------------------------------------------------------------------------
   Wstrzykuje na KAŻDEJ stronie te same elementy, żeby nie powtarzać kodu:
     • górny pasek nawigacji (sticky) + menu mobilne (szuflada)
     • pasek ogłoszeń (banner)
     • stopkę z linkami social
     • system powiadomień (toast)
     • uniwersalne okno modalne (UI.modal)
     • logowanie użytkownika (nick lub Facebook)
     • ładowanie oficjalnego Facebook SDK (podgląd ostatnich postów)
     • licznik memów w poczekalni (widoczny w menu — „powiadomienie" dla admina)
     • render bloków reklamowych wg ustawień z panelu

   Każda strona ustawia <body data-page="home|memy|rozrywka|filmy|admin">,
   żeby podświetlić aktywną pozycję w menu.
   ========================================================================== */

const UI = (() => {
  'use strict';

  /* ---- definicja menu (jedno źródło prawdy) ----------------------------- */
  const NAV = [
    { key: 'home', label: 'Start', href: 'index.html' },
    { key: 'memy', label: 'Memy', href: 'memy.html' },
    { key: 'odpowiedzi', label: 'Odpowiedzi', href: 'odpowiedzi.html' },
    { key: 'rozrywka', label: 'Rozrywka', href: 'rozrywka.html' },
    { key: 'filmy', label: 'Filmy', href: 'filmy.html' }
  ];

  /* ====================== POWIADOMIENIA (TOAST) ========================= */
  function toast(msg, type = 'info', ms = 2600) {
    let host = document.getElementById('toastHost');
    if (!host) { host = document.createElement('div'); host.id = 'toastHost'; host.className = 'toast-host'; document.body.appendChild(host); }
    const t = document.createElement('div');
    t.className = 'toast toast--' + type;
    t.innerHTML = `<span>${msg}</span>`;
    host.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 250); }, ms);
  }

  /* ====================== OKNO MODALNE ================================== */
  function modal(html, { title = '', wide = false } = {}) {
    closeModal();
    const ov = document.createElement('div');
    ov.className = 'modal-ov';
    ov.id = 'uiModal';
    ov.innerHTML = `
      <div class="modal ${wide ? 'modal--wide' : ''}" role="dialog" aria-modal="true">
        <button class="modal-x" aria-label="Zamknij">✕</button>
        ${title ? `<h3 class="modal-h">${title}</h3>` : ''}
        <div class="modal-body">${html}</div>
      </div>`;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('show'));
    ov.addEventListener('click', e => { if (e.target === ov) closeModal(); });
    ov.querySelector('.modal-x').addEventListener('click', closeModal);
    document.addEventListener('keydown', escClose);
    return ov.querySelector('.modal-body');
  }
  function escClose(e) { if (e.key === 'Escape') closeModal(); }
  function closeModal() {
    const ov = document.getElementById('uiModal');
    if (ov) { ov.classList.remove('show'); document.removeEventListener('keydown', escClose); setTimeout(() => ov.remove(), 200); }
  }

  /* ====================== LOGOWANIE UŻYTKOWNIKA ========================= */
  /* Zwraca Promise z aktualnym userem. Jeśli niezalogowany — pyta o nick.
     (Logowanie przez FB jest dostępne, gdy w ustawieniach jest fb_app_id.) */
  function requireUser() {
    return new Promise(resolve => {
      const u = DB.users.current();
      if (u) return resolve(u);
      const body = modal(`
        <p class="muted" style="margin-bottom:14px">Podaj ksywę, żeby głosować i komentować. To wszystko — bez haseł.</p>
        <div class="field"><label>Twoja ksywa</label><input id="nick" maxlength="24" placeholder="np. mistrz_beki"></div>
        <div class="row" style="gap:10px;margin-top:8px">
          <button class="btn" id="nickOk">Wbijam</button>
          <button class="btn btn--fb" id="fbLogin">Zaloguj przez Facebooka</button>
        </div>
        <p class="micro muted" style="margin-top:10px">Logowanie przez Facebooka działa po wpisaniu App ID w panelu (zakładka Facebook).</p>
      `, { title: 'Dołącz do beki' });
      const finish = (user) => { closeModal(); toast('Cześć ' + user.name + '! 🔥', 'ok'); resolve(user); };
      body.querySelector('#nickOk').onclick = () => {
        const name = body.querySelector('#nick').value.trim();
        if (name.length < 2) return toast('Ksywa za krótka', 'err');
        finish(DB.users.login(name));
      };
      body.querySelector('#nick').addEventListener('keydown', e => { if (e.key === 'Enter') body.querySelector('#nickOk').click(); });
      body.querySelector('#fbLogin').onclick = () => fbLogin().then(user => user && finish(user));
    });
  }

  /* ====================== FACEBOOK SDK ================================== */
  /* Ładuje oficjalny SDK. Wtyczki (fb-page / fb-post) renderują się same.
     fb_app_id włącza logowanie; bez niego embed i tak działa. */
  function loadFacebook() {
    const s = DB.settings.get();
    if (document.getElementById('facebook-jssdk')) { if (window.FB) FB.XFBML.parse(); return; }
    window.fbAsyncInit = function () {
      try { FB.init({ appId: s.fb_app_id || undefined, xfbml: true, version: 'v19.0' }); } catch (e) { }
    };
    const js = document.createElement('script');
    js.id = 'facebook-jssdk';
    js.src = 'https://connect.facebook.net/pl_PL/sdk.js#xfbml=1&version=v19.0' + (s.fb_app_id ? '&appId=' + s.fb_app_id : '');
    js.async = true; js.defer = true; js.crossOrigin = 'anonymous';
    document.body.appendChild(js);
    if (!document.getElementById('fb-root')) { const r = document.createElement('div'); r.id = 'fb-root'; document.body.prepend(r); }
  }
  function fbLogin() {
    return new Promise(resolve => {
      const s = DB.settings.get();
      if (!s.fb_app_id || !window.FB) { toast('Najpierw wpisz Facebook App ID w panelu', 'err', 3200); return resolve(null); }
      FB.login(res => {
        if (res.authResponse) {
          FB.api('/me', { fields: 'name,picture' }, p => {
            const u = DB.users.login(p.name || 'Fan FB', '📘', '');
            resolve(u);
          });
        } else resolve(null);
      }, { scope: 'public_profile' });
    });
  }

  /* ====================== BLOKI REKLAMOWE =============================== */
  /* <div data-ad="top|sidebar|in-feed|footer"></div> -> wypełnia treścią z panelu.
     Pusty/wyłączony slot pokazuje dyskretny placeholder z etykietą. */
  function renderAds() {
    document.querySelectorAll('[data-ad]').forEach(box => {
      const slot = box.getAttribute('data-ad');
      const ad = DB.ads.bySlot(slot);
      const labels = { top: 'baner górny', sidebar: 'boczna', 'in-feed': 'w treści', footer: 'stopka' };
      if (ad && ad.active && ad.html.trim()) {
        const inner = ad.link ? `<a href="${ad.link}" target="_blank" rel="noopener">${ad.html}</a>` : ad.html;
        box.innerHTML = `<div class="ad ad--live">${inner}</div>`;
      } else {
        box.innerHTML = `<div class="ad ad--empty"><span>Reklama — ${labels[slot] || slot}</span><small>miejsce konfigurowane w panelu</small></div>`;
      }
    });
  }

  /* ====================== RENDER NAWIGACJI / STOPKI ===================== */
  function mountChrome() {
    const s = DB.settings.get();
    const active = document.body.getAttribute('data-page') || 'home';
    const pending = DB.memes.pending().length;
    const u = DB.users.current();

    const links = NAV.map(n =>
      `<a href="${n.href}" class="${n.key === active ? 'is-active' : ''}">${n.label}</a>`
    ).join('');

    const userChip = u
      ? `<button class="chip" id="userChip" title="Wyloguj">${u.avatar || '🙂'} ${UI_escape(u.name)}</button>`
      : `<button class="chip chip--ghost" id="userChip">Zaloguj</button>`;

    // pasek ogłoszeń
    const banner = s.banner_text
      ? `<div class="banner"><div class="wrap">${UI_escape(s.banner_text)}</div></div>` : '';

    document.body.insertAdjacentHTML('afterbegin', `
      ${banner}
      <header class="nav">
        <div class="nav-in wrap">
          <a class="brand" href="index.html">Beka<b>Wpigułce</b><i>🔥</i></a>
          <nav class="nav-links" id="navLinks">${links}</nav>
          <div class="nav-right">
            <a href="panel-admina.html" class="nav-admin ${active === 'admin' ? 'is-active' : ''}" title="Panel admina">
              ⚙${pending ? `<span class="dot-badge">${pending}</span>` : ''}
            </a>
            ${userChip}
            <button class="burger" id="burger" aria-label="Menu">☰</button>
          </div>
        </div>
        <div class="drawer" id="drawer">${links}
          <a href="panel-admina.html">Panel admina ⚙${pending ? ` (${pending})` : ''}</a>
        </div>
      </header>
    `);

    document.body.insertAdjacentHTML('beforeend', `
      <footer class="foot">
        <div class="wrap foot-in">
          <div>
            <div class="brand brand--lg">Beka<b>Wpigułce</b></div>
            <p class="muted">${UI_escape(s.tagline)}</p>
          </div>
          <nav class="foot-links">
            <a href="index.html">Start</a>
            <a href="memy.html">Memy</a>
            <a href="odpowiedzi.html">Odpowiedzi</a>
            <a href="rozrywka.html">Rozrywka</a>
            <a href="filmy.html">Filmy</a>
            <a href="${s.fb_page_url}" target="_blank" rel="noopener">Facebook</a>
            <a href="${s.tiktok_url}" target="_blank" rel="noopener">TikTok</a>
            <a href="o-nas.html">O nas</a>
            <a href="kontakt.html">Kontakt</a>
            <a href="polityka-prywatnosci.html">Polityka prywatności</a>
          </nav>
        </div>
        <div data-ad="footer" class="wrap" style="margin:18px auto 0"></div>
        <p class="foot-copy">© <span id="yr"></span> BekaWpigułce · <a href="panel-admina.html">Panel admina</a></p>
      </footer>
    `);

    // interakcje powłoki
    const drawer = document.getElementById('drawer');
    document.getElementById('burger').onclick = () => drawer.classList.toggle('open');
    document.getElementById('userChip').onclick = () => {
      if (DB.users.current()) {
        DB.users.logout(); toast('Wylogowano', 'info'); setTimeout(() => location.reload(), 500);
      } else requireUser().then(() => location.reload());
    };
    const yr = document.getElementById('yr'); if (yr) yr.textContent = new Date().getFullYear();

    renderAds();
    maybeInjectAdsense();
    trackVisit();
  }

  /* Liczniki odwiedzin (Abacus — darmowe API, bez klucza, bez rejestracji).
     'wejscia'  — bije przy KAŻDYM wyświetleniu strony (ogólny licznik),
     'unikalni' — bije tylko przy pierwszej wizycie z danego urządzenia
                  (flaga w localStorage; strona statyczna nie widzi IP).
     Panel admina nie jest liczony, żeby nie zawyżać własnych statystyk. */
  function trackVisit() {
    if (document.body.dataset.page === 'admin') return;
    if (location.protocol === 'file:' || location.hostname === 'localhost') return;
    const API = 'https://abacus.jasoncameron.dev';
    const NS = 'bekawpigulce.pl';
    fetch(API + '/hit/' + NS + '/wejscia').catch(() => {});
    try {
      if (!localStorage.getItem('bkw_uv')) {
        fetch(API + '/hit/' + NS + '/unikalni')
          .then(r => { if (r.ok) localStorage.setItem('bkw_uv', '1'); })
          .catch(() => {});
      }
    } catch (e) { /* localStorage zablokowany — pomijamy licznik unikalnych */ }
  }

  /* Po wpisaniu ca-pub w panelu — wstrzykuje skrypt AdSense na każdej stronie
     (włącza reklamy automatyczne bez edycji plików). Nie dubluje skryptu. */
  function maybeInjectAdsense() {
    const id = (DB.settings.get().adsense_client || '').trim();
    if (!/^ca-pub-\d{5,}/.test(id)) return;
    if (document.querySelector('script[data-adsense]')) return;
    const sc = document.createElement('script');
    sc.async = true;
    sc.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + id;
    sc.crossOrigin = 'anonymous';
    sc.setAttribute('data-adsense', '1');
    document.head.appendChild(sc);
  }

  function UI_escape(s) { return DB.util.esc(s); }

  /* auto-montaż po załadowaniu DOM */
  document.addEventListener('DOMContentLoaded', () => { mountChrome(); });

  return { toast, modal, closeModal, requireUser, loadFacebook, fbLogin, renderAds, NAV };
})();

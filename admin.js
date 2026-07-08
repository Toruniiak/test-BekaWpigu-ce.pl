/* ============================================================================
   BekaWpigułce — PANEL ADMINA  (js/admin.js)
   ----------------------------------------------------------------------------
   Cały panel działa na danych z DB (js/db.js) i korzysta z okien/powiadomień
   z powłoki UI (js/shell.js). Schemat działania:

     1. Brama logowania — sprawdza hasło z DB.settings (admin_pass).
        Po poprawnym haśle zapisuje znacznik w sessionStorage i odsłania panel.
        ⚠ To zabezpieczenie jest WYŁĄCZNIE po stronie przeglądarki. Każdy z
          dostępem do urządzenia może odczytać hasło z localStorage. Realną
          ochronę daje dopiero logowanie po stronie serwera (patrz README).
     2. Sidebar przełącza panele (zakładki). Treść każdej zakładki renderuje
        osobna funkcja z obiektu `panes`. Po każdej zmianie danych odświeżamy
        dany panel i licznik „poczekalni" w menu.

   Dodanie nowej zakładki = przycisk w panel-admina.html + wpis w `panes`.
   ========================================================================== */
(function () {
  'use strict';

  const SKEY = 'bwp_admin_ok';                 // znacznik „odblokowano" (na czas sesji karty)
  const esc = (s) => DB.util.esc(s);
  const el = (id) => document.getElementById(id);

  // „ile czasu temu" — własna wersja (panel nie ładuje cards.js)
  function ago(iso) {
    const d = (Date.now() - new Date(iso).getTime()) / 1000;
    if (d < 60) return 'przed chwilą';
    if (d < 3600) return Math.floor(d / 60) + ' min temu';
    if (d < 86400) return Math.floor(d / 3600) + ' godz. temu';
    const days = Math.floor(d / 86400);
    if (days === 1) return 'wczoraj';
    if (days < 7) return days + ' dni temu';
    return new Date(iso).toLocaleDateString('pl-PL');
  }

  const gate = el('gate');
  const app = el('admApp');
  let selQuiz = null;   // aktualnie edytowany quiz (zakładka Gry i quizy)

  const isUnlocked = () => sessionStorage.getItem(SKEY) === '1';

  /* ====================== BRAMA LOGOWANIA ============================== */
  function showGate() {
    gate.hidden = false;
    app.hidden = true;
    const pass = el('gatePass');
    const btn = el('gateBtn');

    const tryLogin = () => {
      const real = DB.settings.get().admin_pass || 'beka2026';
      if (pass.value === real) {
        sessionStorage.setItem(SKEY, '1');
        UI.toast('Zalogowano 🔓', 'ok');
        boot();
      } else {
        UI.toast('Błędne hasło', 'err');
        pass.select();
      }
    };
    btn.onclick = tryLogin;
    pass.onkeydown = (e) => { if (e.key === 'Enter') tryLogin(); };
    pass.focus();
  }

  /* ====================== START PANELU ================================= */
  function boot() {
    gate.hidden = true;
    app.hidden = false;

    // przełączanie zakładek
    const nav = el('admNav');
    nav.querySelectorAll('button').forEach(b => {
      b.addEventListener('click', () => switchPane(b.dataset.pane));
    });

    // wylogowanie (czyści tylko znacznik sesji, nie dane)
    el('admLogout').onclick = () => {
      sessionStorage.removeItem(SKEY);
      UI.toast('Wylogowano', 'info');
      showGate();
    };

    updatePendingBadge();
    switchPane('pulpit');   // start na pulpicie
  }

  // tytuły nagłówka dla każdej zakładki
  const TITLES = {
    pulpit: 'Pulpit', poczekalnia: 'Poczekalnia memów', memy: 'Wszystkie memy',
    odpowiedzi: 'Odpowiedzi (lejek z Facebooka)', kategorie: 'Kategorie i tagi', filmy: 'Filmy', gry: 'Gry i quizy',
    sondy: 'Sondy', reklamy: 'Reklamy', ustawienia: 'Ustawienia', narzedzia: 'Narzędzia bazy', skarbiec: 'Skarbiec inspiracji'
  };

  function switchPane(key) {
    document.querySelectorAll('.adm-nav button').forEach(b => b.classList.toggle('on', b.dataset.pane === key));
    document.querySelectorAll('.adm-pane').forEach(p => p.classList.toggle('on', p.id === 'pane-' + key));
    el('paneTitle').textContent = TITLES[key] || '';
    if (panes[key]) panes[key]();   // wyrenderuj zawartość zakładki
  }

  // odśwież bieżącą (otwartą) zakładkę po zmianie danych
  function refresh() {
    const open = document.querySelector('.adm-nav button.on');
    if (open) switchPane(open.dataset.pane);
    updatePendingBadge();
  }

  function updatePendingBadge() {
    const n = DB.memes.pending().length;
    const badge = el('navPending');
    if (badge) { badge.textContent = n; badge.style.display = n ? '' : 'none'; }
  }

  /* ====================================================================== */
  /* ZAKŁADKI                                                               */
  /* ====================================================================== */
  const panes = {

    /* ---------- PULPIT: statystyki + ranking ---------------------------- */
    pulpit() {
      const s = DB.stats();
      const tiles = [
        ['memes_approved', 'Memy na stronie', ''],
        ['memes_pending', 'W poczekalni', 'red'],
        ['votes_total', 'Oddanych głosów', 'green'],
        ['comments', 'Komentarze', ''],
        ['videos', 'Filmy', ''],
        ['users', 'Użytkownicy', '']
      ];
      const max = Math.max(1, ...s.top.map(m => DB.memes.score(m)));
      const bars = s.top.map(m => {
        const sc = DB.memes.score(m);
        return `<div class="bar-row">
          <div class="bar-track"><div class="bar-fill" style="width:${Math.max(6, sc / max * 100)}%"></div>
            <div class="bar-lab">${esc(m.caption)}</div></div>
          <div class="bar-val">${sc}</div></div>`;
      }).join('') || '<p class="muted">Brak memów do pokazania.</p>';

      el('pane-pulpit').innerHTML = `
        <div class="grid grid-3" style="margin-bottom:8px">
          ${tiles.map(t => `<div class="stat-tile ${t[2]}"><b>${s[t[0]]}</b><span>${t[1]}</span></div>`).join('')}
        </div>
        <div class="grid grid-3" style="margin-bottom:8px">
          <div class="stat-tile green"><b id="visitTotal">…</b><span>Wejścia na stronę (łącznie)</span></div>
          <div class="stat-tile"><b id="visitUnique">…</b><span>Unikalni odwiedzający</span></div>
        </div>
        <div class="adm-card">
          <div class="adm-section-title">🔥 Top 5 memów (wg głosów)</div>
          <div class="bars">${bars}</div>
        </div>
        <div class="adm-card">
          <div class="adm-section-title">Podsumowanie głosów</div>
          <p class="muted">Na plus: <b style="color:var(--yellow)">${s.votes_up}</b> · na minus: <b style="color:var(--red)">${s.votes_down}</b> · łącznie memów w bazie: <b>${s.memes_total}</b>.</p>
        </div>`;

      /* Dociągnij liczniki odwiedzin z Abacus (te same klucze, co w shell.js).
         /get nie podbija licznika — tylko odczytuje. 404 = nikt jeszcze nie wszedł. */
      (function loadVisitStats() {
        const API = 'https://abacus.jasoncameron.dev', NS = 'bekawpigulce.pl';
        [['wejscia', 'visitTotal'], ['unikalni', 'visitUnique']].forEach(([key, id]) => {
          fetch(API + '/get/' + NS + '/' + key)
            .then(r => r.ok ? r.json() : { value: 0 })
            .then(j => { const n = el(id); if (n) n.textContent = Number(j.value || 0).toLocaleString('pl-PL'); })
            .catch(() => { const n = el(id); if (n) n.textContent = '—'; });
        });
      })();
    },

    /* ---------- POCZEKALNIA: moderacja zgłoszonych memów ---------------- */
    poczekalnia() {
      const pend = DB.memes.pending();
      const host = el('pane-poczekalnia');
      if (!pend.length) {
        host.innerHTML = `<div class="adm-card center"><div style="font-size:2.4rem">✅</div>
          <p class="muted" style="margin-top:8px">Poczekalnia pusta — wszystko ogarnięte.</p></div>`;
        return;
      }
      host.innerHTML = `<p class="muted" style="margin-bottom:14px">Zgłoszenia od użytkowników. Zatwierdź, by pokazać mema na stronie, albo odrzuć.</p>` +
        pend.map(m => `
          <div class="queue-card" data-id="${m.id}">
            <img src="${m.image}" alt="">
            <div class="queue-info">
              <h4>${esc(m.caption || '(bez podpisu)')}</h4>
              <p class="muted micro">Autor: <b>${esc(m.author)}</b> · kategoria: ${esc(DB.categories.name(m.category))} · ${ago(m.created_at)}</p>
              ${m.tags && m.tags.length ? `<p class="micro" style="margin-top:6px">${m.tags.map(t => `<span class="pill">#${esc(t)}</span>`).join(' ')}</p>` : ''}
            </div>
            <div class="queue-acts">
              <button class="btn btn--sm" data-act="ok">✓ Zatwierdź</button>
              <button class="btn btn--ghost btn--sm" data-act="no">✕ Odrzuć</button>
            </div>
          </div>`).join('');

      host.querySelectorAll('.queue-card').forEach(card => {
        const id = card.dataset.id;
        card.querySelector('[data-act="ok"]').onclick = () => { DB.memes.approve(id); UI.toast('Mem zatwierdzony 🔥', 'ok'); refresh(); };
        card.querySelector('[data-act="no"]').onclick = () => { DB.memes.reject(id); UI.toast('Mem odrzucony', 'info'); refresh(); };
      });
    },

    /* ---------- MEMY: tabela wszystkich memów --------------------------- */
    memy() {
      const list = DB.memes.all().sort((a, b) => b.created_at.localeCompare(a.created_at));
      const modId = DB.settings.get().mem_of_day_id;
      const rows = list.map(m => {
        const st = m.status === 'approved' ? '<span class="pill pill--y">na stronie</span>'
          : m.status === 'pending' ? '<span class="pill pill--r">poczekalnia</span>'
            : '<span class="pill">odrzucony</span>';
        return `<tr data-id="${m.id}">
          <td><img class="thumb" src="${m.image}" alt=""></td>
          <td>${esc(m.caption || '—')}<div class="micro muted">${esc(m.author)}</div></td>
          <td>${st}</td>
          <td><b style="color:var(--yellow)">${DB.memes.score(m)}</b><div class="micro muted">+${m.votes_up}/-${m.votes_down}</div></td>
          <td>
            <button class="btn btn--ghost btn--sm" data-act="feat" title="Wyróżnij na stronie głównej">${m.featured ? '★' : '☆'}</button>
            <button class="btn btn--ghost btn--sm" data-act="mod" title="Ustaw jako mem dnia">${m.id === modId ? '📌' : '📍'}</button>
            ${m.status === 'pending' ? `<button class="btn btn--sm" data-act="ok">✓</button>` : ''}
            <button class="btn btn--red btn--sm" data-act="del" title="Usuń">🗑</button>
          </td></tr>`;
      }).join('');

      el('pane-memy').innerHTML = `
        <p class="muted" style="margin-bottom:12px">★ = wyróżniony (sekcja „Polecane") · 📌 = mem dnia · ✓ = zatwierdź z poczekalni.</p>
        <div class="adm-card" style="padding:6px 12px;overflow:auto">
          <table class="atable">
            <thead><tr><th></th><th>Podpis / autor</th><th>Status</th><th>Wynik</th><th>Akcje</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="5" class="muted">Brak memów.</td></tr>'}</tbody>
          </table>
        </div>`;

      el('pane-memy').querySelectorAll('tr[data-id]').forEach(tr => {
        const id = tr.dataset.id;
        const act = (a) => tr.querySelector(`[data-act="${a}"]`);
        if (act('feat')) act('feat').onclick = () => { DB.memes.toggleFeatured(id); UI.toast('Zmieniono wyróżnienie', 'ok'); refresh(); };
        if (act('mod')) act('mod').onclick = () => { DB.memes.setMemOfDay(id); UI.toast('Ustawiono mem dnia 📌', 'ok'); refresh(); };
        if (act('ok')) act('ok').onclick = () => { DB.memes.approve(id); UI.toast('Zatwierdzono 🔥', 'ok'); refresh(); };
        if (act('del')) act('del').onclick = () => {
          confirmBox('Usunąć tego mema na stałe? Tej operacji nie cofniesz.', () => { DB.memes.remove(id); UI.toast('Usunięto', 'info'); refresh(); });
        };
      });
    },

    /* ---------- ODPOWIEDZI: lejek z Facebooka -------------------------- */
    odpowiedzi() {
      const list = DB.answers.all();
      el('pane-odpowiedzi').innerHTML = `
        <div class="adm-card">
          <div class="adm-section-title">📝 Jak to działa (zarabianie na reklamach)</div>
          <p class="muted">Na Facebooku wrzucasz zagadkę. W komentarzu (lub poście) dajesz link „Odpowiedź na stronie 👇". Tu tworzysz tę odpowiedź — strona pokazuje ją otoczoną reklamami i innymi zagadkami, więc każdy klik = odsłona = grosz z AdSense. Po dodaniu kliknij <b>„Kopiuj link"</b> i wklej go na Facebooku.</p>
          <button class="btn" id="addAns" style="margin-top:12px">+ Dodaj odpowiedź</button>
        </div>
        <div class="adm-card" style="padding:6px 12px;overflow:auto">
          <table class="atable">
            <thead><tr><th>Tytuł / pytanie</th><th>Status</th><th>Akcje</th></tr></thead>
            <tbody>${list.map(a => `<tr data-id="${a.id}">
              <td><b>${esc(a.title || a.question || '—')}</b><div class="micro muted">${esc((a.question || '').slice(0, 60))}</div></td>
              <td>${a.published ? '<span class="pill pill--y">opublikowana</span>' : '<span class="pill">szkic</span>'}</td>
              <td style="white-space:nowrap">
                <button class="btn btn--ghost btn--sm" data-act="link" title="Skopiuj link do wklejenia na FB">🔗 Kopiuj link</button>
                <button class="btn btn--ghost btn--sm" data-act="edit">Edytuj</button>
                <button class="btn btn--red btn--sm" data-act="del">🗑</button>
              </td></tr>`).join('') || '<tr><td colspan="3" class="muted">Brak odpowiedzi. Kliknij „Dodaj odpowiedź".</td></tr>'}</tbody>
          </table>
        </div>
        <p class="muted micro">Pamiętaj: po dodaniu/zmianie odpowiedzi wejdź w <b>Narzędzia → Publikuj treść</b> i wgraj content.js do repozytorium, żeby zobaczyli ją wszyscy.</p>`;

      el('addAns').onclick = () => editAnswer(null);
      el('pane-odpowiedzi').querySelectorAll('tr[data-id]').forEach(tr => {
        const id = tr.dataset.id; const a = DB.answers.byId(id);
        tr.querySelector('[data-act="edit"]').onclick = () => editAnswer(id);
        tr.querySelector('[data-act="del"]').onclick = () => confirmBox('Usunąć tę odpowiedź?', () => { DB.answers.remove(id); UI.toast('Usunięto', 'info'); refresh(); });
        tr.querySelector('[data-act="link"]').onclick = () => {
          const url = new URL('odpowiedzi.html?a=' + encodeURIComponent(a.slug), location.href).href;
          copyText(url, 'Link skopiowany — wklej go na Facebooku 🔗');
        };
      });
    },

    /* ---------- KATEGORIE + informacja o tagach ------------------------- */
    kategorie() {
      const cats = DB.categories.all();
      el('pane-kategorie').innerHTML = `
        <div class="adm-card">
          <div class="adm-section-title">Dodaj kategorię</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <input id="newCat" class="field" style="flex:1;min-width:200px;margin:0" placeholder="np. Sport, Szkoła, Motoryzacja">
            <button class="btn" id="addCat">Dodaj</button>
          </div>
        </div>
        <div class="adm-card">
          <div class="adm-section-title">Kategorie (${cats.length})</div>
          <table class="atable">
            <thead><tr><th>Nazwa</th><th>Slug</th><th>Memów</th><th></th></tr></thead>
            <tbody>${cats.map(c => {
              const used = DB.memes.all().filter(m => m.category === c.slug).length;
              return `<tr data-id="${c.id}"><td>${esc(c.name)}</td><td class="muted micro">${esc(c.slug)}</td><td>${used}</td>
                <td><button class="btn btn--red btn--sm" data-del>Usuń</button></td></tr>`;
            }).join('')}</tbody>
          </table>
        </div>
        <div class="adm-card">
          <div class="adm-section-title">🏷️ Tagi</div>
          <p class="muted">Tagi nie mają osobnej listy — użytkownik wpisuje je przy dodawaniu mema (pole „Tagi"), a Ty widzisz i edytujesz je przy każdym memie. Najczęstsze tagi z bazy:</p>
          <p style="margin-top:10px">${topTags().map(t => `<span class="pill">#${esc(t[0])} <b style="color:var(--yellow)">${t[1]}</b></span>`).join(' ') || '<span class="muted">brak</span>'}</p>
        </div>`;

      el('addCat').onclick = () => {
        const v = el('newCat').value.trim();
        if (v.length < 2) return UI.toast('Za krótka nazwa', 'err');
        DB.categories.add(v); UI.toast('Dodano kategorię', 'ok'); refresh();
      };
      el('pane-kategorie').querySelectorAll('tr[data-id]').forEach(tr => {
        tr.querySelector('[data-del]').onclick = () => {
          confirmBox('Usunąć kategorię? Memy w niej zostaną, ale stracą przypisanie.', () => { DB.categories.remove(tr.dataset.id); UI.toast('Usunięto', 'info'); refresh(); });
        };
      });
    },

    /* ---------- FILMY: dodawanie + lista -------------------------------- */
    filmy() {
      const cats = DB.categories.all();
      const vids = DB.videos.all();
      el('pane-filmy').innerHTML = `
        <div class="adm-card">
          <div class="adm-section-title">Dodaj film (YouTube)</div>
          <div class="field"><label>Tytuł</label><input id="vTitle" placeholder="np. TOP 10 tekstów polskich mam"></div>
          <div class="field"><label>Link albo ID filmu</label><input id="vUrl" placeholder="https://youtube.com/watch?v=... lub samo ID"></div>
          <div class="field"><label>Opis (krótko)</label><input id="vDesc" placeholder="Jedno zdanie zachęty"></div>
          <div class="field"><label>Kategoria</label><select id="vCat">${cats.map(c => `<option value="${c.slug}">${esc(c.name)}</option>`).join('')}</select></div>
          <button class="btn" id="addVid">Dodaj film</button>
        </div>
        <div class="adm-card">
          <div class="adm-section-title">Filmy w bibliotece (${vids.length})</div>
          <table class="atable">
            <thead><tr><th></th><th>Tytuł</th><th>Kategoria</th><th></th></tr></thead>
            <tbody>${vids.map(v => `<tr data-id="${v.id}">
              <td><img class="thumb" src="https://img.youtube.com/vi/${v.youtube}/default.jpg" onerror="this.src='${DB.util.placeholder(v.title,3)}'" alt=""></td>
              <td>${esc(v.title)}</td><td class="muted micro">${esc(DB.categories.name(v.category))}</td>
              <td><button class="btn btn--red btn--sm" data-del>Usuń</button></td></tr>`).join('') || '<tr><td colspan="4" class="muted">Brak filmów.</td></tr>'}</tbody>
          </table>
        </div>`;

      el('addVid').onclick = () => {
        const title = el('vTitle').value.trim();
        const url = el('vUrl').value.trim();
        if (title.length < 3) return UI.toast('Podaj tytuł', 'err');
        if (!url) return UI.toast('Podaj link do filmu', 'err');
        DB.videos.add({ title, youtube: url, description: el('vDesc').value.trim(), category: el('vCat').value });
        UI.toast('Film dodany 🎬', 'ok'); refresh();
      };
      el('pane-filmy').querySelectorAll('tr[data-id]').forEach(tr => {
        tr.querySelector('[data-del]').onclick = () => {
          confirmBox('Usunąć ten film z biblioteki?', () => { DB.videos.remove(tr.dataset.id); UI.toast('Usunięto', 'info'); refresh(); });
        };
      });
    },

    /* ---------- GRY + edytor quizu ------------------------------------- */
    gry() {
      const games = DB.games.all();
      const quizzes = DB.quizzes.all();
      if (!selQuiz || !DB.quizzes.byId(selQuiz)) selQuiz = quizzes[0] && quizzes[0].id;
      const quiz = DB.quizzes.byId(selQuiz) || { id: null, questions: [], title: '', desc: '' };
      el('pane-gry').innerHTML = `
        <div class="adm-card">
          <div class="adm-section-title">Mini-gry — włącz / wyłącz</div>
          <p class="muted" style="margin-bottom:12px">Wyłączona gra znika z zakładki „Rozrywka".</p>
          <table class="atable">
            <thead><tr><th>Gra</th><th>Typ</th><th>Status</th><th></th></tr></thead>
            <tbody>${games.map(g => `<tr data-id="${g.id}">
              <td><b>${esc(g.name)}</b><div class="micro muted">${esc(g.description)}</div></td>
              <td class="muted micro">${esc(g.category)}</td>
              <td>${g.enabled ? '<span class="pill pill--y">włączona</span>' : '<span class="pill">wyłączona</span>'}</td>
              <td><button class="btn btn--ghost btn--sm" data-toggle>${g.enabled ? 'Wyłącz' : 'Włącz'}</button></td></tr>`).join('')}</tbody>
          </table>
        </div>
        <div class="adm-card">
          <div class="adm-section-title">Quizy</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:14px">
            <select id="quizSel" class="field" style="margin:0;flex:1;min-width:200px">${quizzes.map(q => `<option value="${q.id}" ${q.id === selQuiz ? 'selected' : ''}>${esc(q.title)} (${q.questions.length} pyt.)</option>`).join('')}</select>
            <button class="btn btn--sm" id="newQuiz">+ Nowy quiz</button>
            ${quizzes.length > 1 ? `<button class="btn btn--red btn--sm" id="delQuiz">Usuń quiz</button>` : ''}
          </div>
          <div class="field"><label>Tytuł quizu</label><input id="quizTitle" value="${esc(quiz.title)}"></div>
          <div class="field"><label>Opis (krótko)</label><input id="quizDesc" value="${esc(quiz.desc || '')}"></div>
          <button class="btn btn--ghost btn--sm" id="saveQuizMeta" style="margin-bottom:16px">Zapisz tytuł / opis</button>
          <div class="adm-section-title">Pytania (${quiz.questions.length})</div>
          <p class="muted" style="margin-bottom:12px">Kliknij „Edytuj". Poprawną odpowiedź zaznacz kropką.</p>
          <div id="quizList">${quiz.questions.map((q, i) => `
            <div class="adm-card" style="margin:0 0 10px;background:var(--surface-2)">
              <b>${i + 1}.</b> ${esc(q.q)}
              <div class="micro muted" style="margin-top:4px">Odp.: ${q.opts.map((o, k) => `${k === q.answer ? '✅' : '▫️'} ${esc(o)}`).join(' · ')}</div>
              <div style="margin-top:8px;display:flex;gap:8px">
                <button class="btn btn--ghost btn--sm" data-edit="${i}">Edytuj</button>
                <button class="btn btn--red btn--sm" data-delq="${i}">Usuń</button>
              </div>
            </div>`).join('') || '<p class="muted">Brak pytań w tym quizie.</p>'}</div>
          <button class="btn btn--sm" id="addQ">+ Dodaj pytanie</button>
        </div>`;

      el('pane-gry').querySelectorAll('tr[data-id]').forEach(tr => {
        tr.querySelector('[data-toggle]').onclick = () => { DB.games.toggle(tr.dataset.id); refresh(); };
      });
      el('quizSel').onchange = (ev) => { selQuiz = ev.target.value; refresh(); };
      el('newQuiz').onclick = () => { const q = DB.quizzes.add('Nowy quiz'); selQuiz = q.id; UI.toast('Dodano quiz', 'ok'); refresh(); };
      if (el('delQuiz')) el('delQuiz').onclick = () => confirmBox('Usunąć cały ten quiz?', () => { DB.quizzes.remove(selQuiz); selQuiz = null; UI.toast('Usunięto quiz', 'info'); refresh(); });
      el('saveQuizMeta').onclick = () => { DB.quizzes.update(selQuiz, { title: el('quizTitle').value.trim() || quiz.title, desc: el('quizDesc').value.trim() }); UI.toast('Zapisano', 'ok'); refresh(); };
      el('pane-gry').querySelectorAll('[data-edit]').forEach(b => b.onclick = () => editQuestion(selQuiz, +b.dataset.edit));
      el('pane-gry').querySelectorAll('[data-delq]').forEach(b => b.onclick = () => {
        const i = +b.dataset.delq, q = DB.quizzes.byId(selQuiz);
        confirmBox('Usunąć to pytanie?', () => { q.questions.splice(i, 1); DB.quizzes.update(q.id, { questions: q.questions }); UI.toast('Usunięto pytanie', 'info'); refresh(); });
      });
      el('addQ').onclick = () => editQuestion(selQuiz, -1);
    },

    /* ---------- SONDA: edycja opcji + reset ----------------------------- */
    sondy() {
      const p = DB.polls.main();
      const total = p.options.reduce((s, o) => s + o.votes, 0) || 1;
      el('pane-sondy').innerHTML = `
        <div class="adm-card">
          <div class="adm-section-title">Sonda na stronie głównej</div>
          <div class="field"><label>Pytanie</label><input id="pQ" value="${esc(p.question)}"></div>
          <label class="micro muted">Odpowiedzi (możesz edytować tekst):</label>
          <div id="pOpts" style="margin-top:8px">
            ${p.options.map((o, i) => `<div style="display:flex;gap:10px;align-items:center;margin-bottom:8px">
              <input data-opt="${i}" value="${esc(o.label)}" style="flex:1">
              <span class="bar-track" style="width:120px;height:22px"><span class="bar-fill" style="width:${o.votes / total * 100}%"></span></span>
              <b style="width:54px;text-align:right;color:var(--yellow)">${o.votes}</b>
            </div>`).join('')}
          </div>
          <div style="display:flex;gap:8px;margin-top:12px">
            <button class="btn" id="savePoll">Zapisz sondę</button>
            <button class="btn btn--ghost" id="resetPoll">Wyzeruj głosy</button>
          </div>
        </div>`;

      el('savePoll').onclick = () => {
        const opts = p.options.map((o, i) => ({ label: el('pane-sondy').querySelector(`[data-opt="${i}"]`).value.trim() || o.label, votes: o.votes }));
        DB.polls.update(p.id, { question: el('pQ').value.trim() || p.question, options: opts });
        UI.toast('Sonda zapisana', 'ok'); refresh();
      };
      el('resetPoll').onclick = () => confirmBox('Wyzerować wszystkie głosy w sondzie?', () => { DB.polls.resetVotes(p.id); UI.toast('Głosy wyzerowane', 'info'); refresh(); });
    },

    /* ---------- REKLAMY: 4 sloty + klient AdSense ----------------------- */
    reklamy() {
      const s = DB.settings.get();
      const slots = [
        ['top', 'Góra strony (pod nawigacją)'],
        ['sidebar', 'Bok / między sekcjami'],
        ['in-feed', 'W treści (między blokami)'],
        ['footer', 'Stopka']
      ];
      el('pane-reklamy').innerHTML = `
        <div class="adm-card">
          <div class="adm-section-title">Google AdSense</div>
          <div class="field"><label>Identyfikator klienta (ca-pub-XXXXXXXX)</label>
            <input id="adsClient" value="${esc(s.adsense_client)}" placeholder="ca-pub-0000000000000000"></div>
          <p class="muted micro">Wpisanie identyfikatora włącza obsługę reklam. Sam kod jednostek reklamowych wklej w polach slotów poniżej (HTML z panelu AdSense).</p>
          <button class="btn btn--sm" id="saveAds" style="margin-top:10px">Zapisz AdSense</button>
        </div>
        ${slots.map(([slot, label]) => {
          const a = DB.ads.bySlot(slot);
          return `<div class="adm-card" data-slot="${slot}">
            <div class="adm-section-title">${label} <span class="pill ${a.active ? 'pill--y' : ''}" style="margin-left:6px">${a.active ? 'aktywny' : 'wyłączony'}</span></div>
            <div class="field"><label>Kod HTML reklamy (lub baner)</label><textarea data-html placeholder="&lt;ins class=&quot;adsbygoogle&quot;...&gt; albo &lt;a&gt;&lt;img&gt;...">${esc(a.html)}</textarea></div>
            <div class="field"><label>Link (gdy to własny baner — opcjonalnie)</label><input data-link value="${esc(a.link)}" placeholder="https://..."></div>
            <label style="display:flex;gap:8px;align-items:center;cursor:pointer"><input type="checkbox" data-active ${a.active ? 'checked' : ''}> <span>Slot aktywny</span></label>
            <button class="btn btn--sm" data-save style="margin-top:10px">Zapisz slot</button>
          </div>`;
        }).join('')}`;

      el('saveAds').onclick = () => { DB.settings.update({ adsense_client: el('adsClient').value.trim() }); UI.toast('Zapisano AdSense', 'ok'); };
      el('pane-reklamy').querySelectorAll('[data-slot]').forEach(box => {
        box.querySelector('[data-save]').onclick = () => {
          DB.ads.update(box.dataset.slot, {
            html: box.querySelector('[data-html]').value,
            link: box.querySelector('[data-link]').value.trim(),
            active: box.querySelector('[data-active]').checked
          });
          UI.toast('Slot zapisany 💰', 'ok'); refresh();
        };
      });
    },

    /* ---------- USTAWIENIA: strona + Facebook + hasło ------------------- */
    ustawienia() {
      const s = DB.settings.get();
      el('pane-ustawienia').innerHTML = `
        <div class="adm-card">
          <div class="adm-section-title">Strona</div>
          <div class="field"><label>Nazwa strony</label><input id="stName" value="${esc(s.site_name)}"></div>
          <div class="field"><label>Hasło-podtytuł (tagline)</label><input id="stTag" value="${esc(s.tagline)}"></div>
          <div class="field"><label>Pasek ogłoszeń u góry (puste = ukryty)</label><input id="stBanner" value="${esc(s.banner_text)}" placeholder="np. Nowy konkurs! Wrzuć mema do niedzieli 🔥"></div>
        </div>
        <div class="adm-card">
          <div class="adm-section-title">Facebook i TikTok</div>
          <div class="field"><label>Adres strony na Facebooku</label><input id="stFbUrl" value="${esc(s.fb_page_url)}"></div>
          <div class="field"><label>Facebook App ID (włącza logowanie przez FB)</label><input id="stFbApp" value="${esc(s.fb_app_id)}" placeholder="np. 1234567890"></div>
          <div class="field"><label>Adres TikToka</label><input id="stTt" value="${esc(s.tiktok_url)}"></div>
          <p class="muted micro">Wtyczka „ostatni post" i przycisk logowania FB działają tylko na prawdziwej domenie (http/https), nie z pliku na dysku. Szczegóły w README.</p>
        </div>
        <div class="adm-card">
          <div class="adm-section-title">🔐 Hasło panelu</div>
          <div class="field"><label>Nowe hasło administratora</label><input id="stPass" type="text" value="${esc(s.admin_pass)}"></div>
          <p class="muted micro">⚠ To hasło chroni panel tylko po stronie przeglądarki. Realne zabezpieczenie wymaga backendu (patrz README). Po zmianie zapamiętaj nowe hasło!</p>
        </div>
        <button class="btn btn--block" id="saveSettings">Zapisz wszystkie ustawienia</button>`;

      el('saveSettings').onclick = () => {
        DB.settings.update({
          site_name: el('stName').value.trim() || s.site_name,
          tagline: el('stTag').value.trim(),
          banner_text: el('stBanner').value.trim(),
          fb_page_url: el('stFbUrl').value.trim(),
          fb_app_id: el('stFbApp').value.trim(),
          tiktok_url: el('stTt').value.trim(),
          admin_pass: el('stPass').value || s.admin_pass
        });
        UI.toast('Ustawienia zapisane ✅', 'ok'); refresh();
      };
    },

    /* ---------- NARZĘDZIA: eksport / import / reset --------------------- */
    narzedzia() {
      el('pane-narzedzia').innerHTML = `
        <div class="adm-card" style="border:1px solid var(--yellow)">
          <div class="adm-section-title">🚀 Publikuj treść (dla wszystkich odwiedzających)</div>
          <p class="muted" style="margin-bottom:12px">To najważniejszy przycisk. Po dodaniu lub zmianie odpowiedzi, memów czy quizów kliknij tutaj, pobierz plik <b>content.js</b> i wgraj go do repozytorium GitHub (nadpisz istniejący). Dopiero wtedy Twoją nową treść zobaczą wszyscy — bez tego zmiany widzisz tylko Ty, w tej przeglądarce.</p>
          <button class="btn" id="pubBtn">Pobierz content.js (opublikuj)</button>
        </div>
        <div class="adm-card">
          <div class="adm-section-title">📦 Kopia zapasowa</div>
          <p class="muted" style="margin-bottom:12px">Pobierz całą bazę jako plik JSON (memy, ustawienia, filmy — wszystko). Trzymaj kopię na dysku.</p>
          <button class="btn" id="expBtn">Pobierz kopię (.json)</button>
        </div>
        <div class="adm-card">
          <div class="adm-section-title">📥 Przywróć z kopii</div>
          <p class="muted" style="margin-bottom:12px">Wgraj wcześniej pobrany plik JSON. <b>Uwaga:</b> nadpisze obecne dane.</p>
          <input type="file" id="impFile" accept="application/json" class="field">
          <button class="btn btn--ghost" id="impBtn">Przywróć z pliku</button>
        </div>
        <div class="adm-card">
          <div class="adm-section-title" style="color:var(--red)">⚠ Reset do danych startowych</div>
          <p class="muted" style="margin-bottom:12px">Kasuje wszystkie Twoje zmiany i przywraca przykładową zawartość. Nieodwracalne.</p>
          <button class="btn btn--red" id="resetBtn">Wyczyść i zresetuj bazę</button>
        </div>`;

      el('pubBtn').onclick = () => {
        const blob = new Blob([DB.raw.exportContent()], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'content.js'; a.click();
        URL.revokeObjectURL(url); UI.toast('Pobrano content.js 🚀 Wgraj go do repozytorium GitHub.', 'ok', 4500);
      };
      el('expBtn').onclick = () => {
        const blob = new Blob([DB.raw.export()], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'bekawpigulce-kopia.json'; a.click();
        URL.revokeObjectURL(url); UI.toast('Pobrano kopię 📦', 'ok');
      };
      el('impBtn').onclick = () => {
        const f = el('impFile').files[0];
        if (!f) return UI.toast('Najpierw wybierz plik', 'err');
        const r = new FileReader();
        r.onload = () => {
          confirmBox('Przywrócić dane z pliku? Obecne dane zostaną nadpisane.', () => {
            if (DB.raw.import(r.result)) { UI.toast('Przywrócono z kopii ✅', 'ok'); refresh(); }
            else UI.toast('Niepoprawny plik', 'err');
          });
        };
        r.readAsText(f);
      };
      el('resetBtn').onclick = () => confirmBox('Na pewno wyczyścić WSZYSTKO i wrócić do danych startowych?', () => { DB.raw.reset(); UI.toast('Baza zresetowana', 'info'); refresh(); });
    },

    /* ---------- SKARBIEC: prywatny notatnik pomysłów (iframe) ---------- */
    skarbiec() {
      el('pane-skarbiec').innerHTML = `
        <div class="adm-card">
          <div class="adm-section-title">💡 Skarbiec inspiracji</div>
          <p class="muted" style="margin-bottom:12px">Twój prywatny notatnik pomysłów na posty (zapis w tej przeglądarce). Zbierasz tu grafiki, linki i pomysły, zanim trafią na Facebooka. Nie jest indeksowany przez Google.</p>
          <iframe src="skarbiec/index.html" title="Skarbiec inspiracji" style="width:100%;height:72vh;border:1px solid #2a2a2a;border-radius:14px;background:#0e0e0e"></iframe>
          <p class="muted micro" style="margin-top:8px">Tip: w Skarbcu masz przycisk eksportu/„Backup" — rób kopię co jakiś czas.</p>
        </div>`;
    }
  };

  /* ====================== POMOCNIKI ==================================== */

  // najczęstsze tagi z całej bazy (do zakładki Kategorie)
  function topTags() {
    const map = {};
    DB.memes.all().forEach(m => (m.tags || []).forEach(t => { map[t] = (map[t] || 0) + 1; }));
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 12);
  }

  // kopiowanie do schowka (z awaryjnym wariantem)
  function copyText(text, msg) {
    const done = () => UI.toast(msg || 'Skopiowano ✓', 'ok');
    function fallback() {
      const ta = document.createElement('textarea'); ta.value = text;
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { UI.toast('Skopiuj ręcznie: ' + text, 'info', 6000); }
      ta.remove();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  }

  // edytor pojedynczej ODPOWIEDZI (id == null => nowa) w oknie modalnym
  function editAnswer(id) {
    const isNew = !id;
    const a = isNew ? { title: '', question: '', answer: '', explain: '', image: '', source_fb: '', published: true } : DB.answers.byId(id);
    let imgData = a.image || '';
    const body = UI.modal(`
      <div class="field"><label>Tytuł (krótki, np. „Iluzja z fotelami")</label><input id="anT" value="${esc(a.title)}"></div>
      <div class="field"><label>Pytanie / treść zagadki</label><textarea id="anQ" rows="2">${esc(a.question)}</textarea></div>
      <div class="field"><label>Prawidłowa odpowiedź *</label><input id="anA" value="${esc(a.answer)}"></div>
      <div class="field"><label>Wyjaśnienie (opcjonalnie — czemu właśnie tak)</label><textarea id="anE" rows="3">${esc(a.explain)}</textarea></div>
      <div class="field"><label>Grafika — wklej link albo wgraj plik (opcjonalnie)</label>
        <input id="anImg" placeholder="https://…" value="${esc(a.image && /^https?:/.test(a.image) ? a.image : '')}">
        <input type="file" id="anFile" accept="image/*" style="margin-top:8px">
        <img id="anPrev" style="${imgData ? '' : 'display:none;'}max-width:100%;margin-top:8px;border-radius:10px" src="${esc(imgData)}">
      </div>
      <div class="field"><label>Link do posta na FB (opcjonalnie, dla Ciebie)</label><input id="anFb" value="${esc(a.source_fb)}" placeholder="https://facebook.com/..."></div>
      <label style="display:flex;gap:8px;align-items:center;cursor:pointer;margin-bottom:10px"><input type="checkbox" id="anPub" ${a.published ? 'checked' : ''}> <span>Opublikowana (widoczna na stronie)</span></label>
      <button class="btn btn--block" id="anSave">Zapisz odpowiedź</button>
    `, { title: isNew ? 'Nowa odpowiedź' : 'Edycja odpowiedzi' });

    const prev = body.querySelector('#anPrev');
    body.querySelector('#anImg').addEventListener('input', e => { imgData = e.target.value.trim(); if (imgData) { prev.src = imgData; prev.style.display = 'block'; } });
    body.querySelector('#anFile').addEventListener('change', e => {
      const f = e.target.files[0]; if (!f) return;
      if (f.size > 3.5 * 1024 * 1024) return UI.toast('Plik za duży (max ~3 MB)', 'err');
      const r = new FileReader(); r.onload = () => { imgData = r.result; prev.src = imgData; prev.style.display = 'block'; body.querySelector('#anImg').value = ''; }; r.readAsDataURL(f);
    });
    body.querySelector('#anSave').onclick = () => {
      const data = {
        title: body.querySelector('#anT').value.trim(),
        question: body.querySelector('#anQ').value.trim(),
        answer: body.querySelector('#anA').value.trim(),
        explain: body.querySelector('#anE').value.trim(),
        image: imgData,
        source_fb: body.querySelector('#anFb').value.trim(),
        published: body.querySelector('#anPub').checked
      };
      if (!data.answer) return UI.toast('Podaj prawidłową odpowiedź', 'err');
      if (!data.title && !data.question) return UI.toast('Podaj tytuł albo pytanie', 'err');
      if (isNew) DB.answers.add(data); else DB.answers.update(id, data);
      UI.closeModal(); UI.toast('Zapisano odpowiedź ✅', 'ok'); refresh();
    };
  }

  // edytor pojedynczego pytania quizu (i = -1 => nowe pytanie) w oknie modalnym
  function editQuestion(quizId, i) {
    const quiz = DB.quizzes.byId(quizId) || DB.quizzes.main();
    if (!quiz) return UI.toast('Brak quizu', 'err');
    const isNew = i < 0;
    const q = isNew ? { q: '', opts: ['', '', '', ''], answer: 0 } : quiz.questions[i];
    const body = UI.modal(`
      <div class="field"><label>Treść pytania</label><input id="eqQ" value="${esc(q.q)}"></div>
      <label class="micro muted">Odpowiedzi (zaznacz poprawną):</label>
      <div style="margin-top:8px">
        ${q.opts.map((o, k) => `<div style="display:flex;gap:10px;align-items:center;margin-bottom:8px">
          <input type="radio" name="eqAns" value="${k}" ${k === q.answer ? 'checked' : ''}>
          <input id="eqO${k}" value="${esc(o)}" placeholder="Odpowiedź ${k + 1}" style="flex:1">
        </div>`).join('')}
      </div>
      <button class="btn btn--block" id="eqSave" style="margin-top:8px">Zapisz pytanie</button>
    `, { title: isNew ? 'Nowe pytanie' : 'Edycja pytania' });

    body.querySelector('#eqSave').onclick = () => {
      const text = body.querySelector('#eqQ').value.trim();
      const opts = [0, 1, 2, 3].map(k => body.querySelector('#eqO' + k).value.trim());
      const ans = +body.querySelector('input[name="eqAns"]:checked').value;
      if (text.length < 5) return UI.toast('Pytanie za krótkie', 'err');
      if (opts.filter(Boolean).length < 2) return UI.toast('Podaj min. 2 odpowiedzi', 'err');
      const item = { q: text, opts, answer: ans };
      if (isNew) quiz.questions.push(item); else quiz.questions[i] = item;
      DB.quizzes.update(quiz.id, { questions: quiz.questions });
      UI.closeModal(); UI.toast('Zapisano pytanie', 'ok'); refresh();
    };
  }

  // proste okno potwierdzenia (zamiast natywnego confirm) — spójne z resztą UI
  function confirmBox(msg, onYes) {
    const body = UI.modal(`
      <p style="margin-bottom:18px">${esc(msg)}</p>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button class="btn btn--ghost" id="cbNo">Anuluj</button>
        <button class="btn btn--red" id="cbYes">Tak, wykonaj</button>
      </div>`, { title: 'Potwierdź' });
    body.querySelector('#cbNo').onclick = UI.closeModal;
    body.querySelector('#cbYes').onclick = () => { UI.closeModal(); onYes(); };
  }

  /* ====================== START ======================================== */
  // shell.js montuje się na DOMContentLoaded; my startujemy zaraz po nim.
  function init() { if (isUnlocked()) boot(); else showGate(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

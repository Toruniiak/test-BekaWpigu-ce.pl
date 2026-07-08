/* ============================================================================
   BekaWpigułce — STRONA GŁÓWNA  (home.js)
   Wypełnia sekcje danymi z DB. Sekcje bez treści chowa, więc czysty start
   wygląda schludnie, a nie „pusto".  Wymaga: content.js, db.js, shell.js, cards.js.
   ========================================================================== */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const s = DB.settings.get();
  const hide = sel => { const el = $(sel); if (el) el.hidden = true; };

  /* --- Hero: liczby --- */
  const st = DB.stats();
  $('#heroStats').innerHTML = [
    [st.memes_approved, 'memów'],
    [st.votes_total.toLocaleString('pl-PL'), 'głosów'],
    [st.answers_pub, 'odpowiedzi'],
    ['10K+', 'fanów na FB']
  ].map(x => `<div class="stat"><b>${x[0]}</b><span>${x[1]}</span></div>`).join('');

  /* --- Facebook: link + wtyczka + przycisk „Obserwuj" --- */
  $('#fbLink').href = s.fb_page_url;
  $('#fbPlugin').setAttribute('data-href', s.fb_page_url);
  const fbFollow = $('#fbFollow'); if (fbFollow) fbFollow.href = s.fb_page_url;
  UI.loadFacebook();

  /* --- Polecane (chowane gdy brak) --- */
  const feat = DB.memes.featured().slice(0, 6);
  const featList = feat.length ? feat : DB.memes.approved().slice(0, 6);
  if (featList.length) { const fg = $('#featuredGrid'); featList.forEach(m => fg.appendChild(Cards.meme(m))); }
  else hide('#featured');

  /* --- Odpowiedzi (lejek z FB) --- */
  const ans = DB.answers.published().slice(0, 3);
  if (ans.length) {
    $('#answers').hidden = false;
    $('#answersGrid').innerHTML = ans.map(a => `
      <a class="ans-card" href="odpowiedzi.html?a=${encodeURIComponent(a.slug)}">
        ${a.image ? `<div class="ans-thumb"><img src="${DB.util.esc(a.image)}" alt=""></div>` : `<div class="ans-thumb ans-thumb--ph">✅</div>`}
        <div class="ans-card-body">
          <span class="eyebrow">Zagadka z FB</span>
          <h3>${DB.util.esc(a.title || a.question || 'Odpowiedź')}</h3>
          <span class="ans-go">Zobacz odpowiedź →</span>
        </div></a>`).join('');
  }

  /* --- Mem dnia (chowa lewą kolumnę gdy brak; sonda zostaje) --- */
  const mod = DB.memes.memOfDay();
  if (mod) $('#memOfDay').appendChild(Cards.meme(mod));
  else { const col = document.querySelector('#memdnia .split > div:first-child'); if (col) col.style.display = 'none'; }

  /* --- Sonda --- */
  renderPoll();
  function renderPoll() {
    const p = DB.polls.main(); if (!p) { hide('#memdnia'); return; }
    $('#pollQ').textContent = p.question;
    const box = $('#pollBox');
    const my = DB.polls.myVote(p.id);
    const voted = my !== undefined;
    const total = p.options.reduce((a, o) => a + o.votes, 0) || 1;
    box.innerHTML = p.options.map((o, i) => {
      const pct = Math.round(o.votes / total * 100);
      return `<div class="poll-opt ${voted ? '' : 'unvoted'}" data-i="${i}">
        <div class="poll-bar-wrap"><div class="poll-bar" style="width:${voted ? pct : 0}%"></div>
          <div class="poll-lab"><span>${DB.util.esc(o.label)}</span><span class="pc">${voted ? pct + '%' : ''}</span></div>
        </div></div>`;
    }).join('') + `<p class="poll-hint">${voted ? 'Dzięki za głos! Razem: ' + total : 'Kliknij, żeby zagłosować'}</p>`;
    if (!voted) box.querySelectorAll('.poll-opt').forEach(opt => opt.onclick = () => {
      const r = DB.polls.vote(p.id, +opt.dataset.i);
      if (r.ok) { renderPoll(); UI.toast('Głos zapisany ✓', 'ok'); }
    });
  }

  /* --- Top memów (chowane gdy brak) --- */
  const top = DB.memes.top(6);
  if (top.length) { const tg = $('#topGrid'); top.forEach((m, i) => tg.appendChild(Cards.meme(m, { rank: i + 1 }))); }
  else hide('#top');

  /* --- Filmy (chowane gdy brak) --- */
  const vids = DB.videos.all().slice(0, 3);
  if (vids.length) { const vg = $('#videoGrid'); vids.forEach(v => vg.appendChild(Cards.video(v))); }
  else hide('#vids');

  /* --- Reakcje --- */
  renderReacts();
  function renderReacts() {
    const r = DB.reactions.get();
    const map = { fire: '🔥', wow: '😮', heart: '❤️', poop: '💩' };
    $('#reacts').innerHTML = Object.keys(map).map(k =>
      `<button class="react" data-k="${k}">${map[k]}<span class="rc">${r[k]}</span></button>`).join('');
    $('#reacts').querySelectorAll('.react').forEach(b => b.onclick = () => {
      DB.reactions.add(b.dataset.k);
      b.querySelector('.rc').textContent = DB.reactions.get()[b.dataset.k];
      b.style.transform = 'translateY(-3px) scale(1.15)';
      setTimeout(() => b.style.transform = '', 150);
    });
  }
})();

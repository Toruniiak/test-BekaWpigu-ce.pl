/* ============================================================================
   BekaWpigułce — KOMPONENTY KART  (js/cards.js)
   ----------------------------------------------------------------------------
   Renderery używane na wielu stronach (Start, Memy, Filmy), żeby logika
   głosowania, komentarzy i udostępniania istniała w JEDNYM miejscu:
     • Cards.meme(m, {rank})  -> gotowy kafelek mema z interakcjami
     • Cards.video(v)         -> kafelek filmu (otwiera odtwarzacz w modalu)
     • Cards.openComments(id) -> okno komentarzy danego mema
     • Cards.share(m)         -> udostępnianie (systemowe lub social)
   ========================================================================== */

const Cards = (() => {
  'use strict';

  /* „3 dni temu", „przed chwilą" itp. */
  function timeAgo(iso) {
    const d = (Date.now() - new Date(iso).getTime()) / 1000;
    if (d < 60) return 'przed chwilą';
    if (d < 3600) return Math.floor(d / 60) + ' min temu';
    if (d < 86400) return Math.floor(d / 3600) + ' godz. temu';
    const days = Math.floor(d / 86400);
    if (days === 1) return 'wczoraj';
    if (days < 7) return days + ' dni temu';
    return new Date(iso).toLocaleDateString('pl-PL');
  }
  const e = DB.util.esc;

  /* ----- KARTA MEMA ----------------------------------------------------- */
  function meme(m, opts = {}) {
    const el = document.createElement('article');
    el.className = 'meme';
    const score = DB.memes.score(m);
    const total = (m.votes_up || 0) + (m.votes_down || 0);
    const heatPct = total ? Math.round((m.votes_up / total) * 100) : 50;
    const myVote = DB.memes.myVote(m.id);
    const cmtCount = DB.comments.forMeme(m.id).length;
    const rankClass = opts.rank ? ` r${opts.rank}` : '';
    const rankBadge = opts.rank ? `<div class="meme-rank${rankClass}">${opts.rank}</div>` : '';
    const tags = (m.tags || []).slice(0, 3).map(t => `<span class="tag">${e(t)}</span>`).join(' ');

    el.innerHTML = `
      <div class="meme-imgwrap">
        ${rankBadge}
        <span class="pill pill--y meme-cat">${e(DB.categories.name(m.category))}</span>
        <img src="${m.image}" alt="${e(m.caption)}" loading="lazy">
      </div>
      <div class="meme-body">
        <p class="meme-cap">${e(m.caption)}</p>
        <div class="meme-meta">${m.author ? '@' + e(m.author) : 'anonim'} · ${timeAgo(m.created_at)}</div>
        <div class="heat" title="${heatPct}% reakcji na 🔥"><i style="width:${heatPct}%"></i></div>
        ${tags ? `<div class="meme-tags">${tags}</div>` : ''}
        <div class="meme-foot">
          <div class="vote">
            <button class="up ${myVote === 'up' ? 'on' : ''}" data-v="up">🔥 <span class="vu">${m.votes_up || 0}</span></button>
            <button class="down ${myVote === 'down' ? 'on' : ''}" data-v="down">💩 <span class="vd">${m.votes_down || 0}</span></button>
          </div>
          <div class="meme-actions">
            <button class="icon-btn cmt-open" title="Komentarze">💬<span class="cc" style="font-size:.72rem;margin-left:3px">${cmtCount}</span></button>
            <button class="icon-btn share" title="Udostępnij">↗</button>
          </div>
        </div>
      </div>`;

    // głosowanie (bez logowania, liczone raz na przeglądarkę)
    el.querySelectorAll('.vote button').forEach(b => b.onclick = () => {
      const r = DB.memes.vote(m.id, b.dataset.v);
      if (!r.ok) { UI.toast(r.reason === 'already' ? 'Już oddałeś głos na tego mema' : 'Nie udało się', 'err'); return; }
      el.querySelector('.vu').textContent = r.meme.votes_up;
      el.querySelector('.vd').textContent = r.meme.votes_down;
      const t = r.meme.votes_up + r.meme.votes_down;
      el.querySelector('.heat>i').style.width = (t ? Math.round(r.meme.votes_up / t * 100) : 50) + '%';
      el.querySelectorAll('.vote button').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      UI.toast(b.dataset.v === 'up' ? 'Dodano ogień 🔥' : 'Zapisano 💩', 'ok', 1400);
    });

    el.querySelector('.cmt-open').onclick = () => openComments(m.id);
    el.querySelector('.share').onclick = () => share(m);
    return el;
  }

  /* ----- KOMENTARZE (modal) --------------------------------------------- */
  function openComments(memeId) {
    const m = DB.memes.byId(memeId);
    const render = () => {
      const list = DB.comments.forMeme(memeId);
      const items = list.length ? list.map(c => {
        const u = DB.users.all().find(x => x.name === c.author);
        return `<div class="cmt">
          <div class="cmt-av">${u ? (u.avatar || '🙂') : '🙂'}</div>
          <div><div><span class="cmt-name">@${e(c.author)}</span><span class="cmt-time">${timeAgo(c.created_at)}</span></div>
          <div class="cmt-body">${e(c.body)}</div></div>
        </div>`;
      }).join('') : `<p class="muted center" style="padding:18px 0">Brak komentarzy. Bądź pierwszy 👀</p>`;
      return `
        <img src="${m.image}" alt="" style="width:100%;max-height:260px;object-fit:cover;border-radius:12px;margin-bottom:6px">
        <p class="meme-cap" style="margin-bottom:14px">${e(m.caption)}</p>
        <div id="cmtList" style="max-height:280px;overflow:auto">${items}</div>
        <div class="field" style="margin-top:14px"><textarea id="cmtBody" placeholder="Dorzuć coś od siebie…" maxlength="400"></textarea></div>
        <button class="btn btn--block" id="cmtSend">Wyślij komentarz</button>`;
    };
    const body = UI.modal(render(), { title: '💬 Komentarze' });
    async function bindSend() {
      body.querySelector('#cmtSend').onclick = async () => {
        const txt = body.querySelector('#cmtBody').value.trim();
        if (txt.length < 2) return UI.toast('Komentarz za krótki', 'err');
        const user = await UI.requireUser();
        DB.comments.add(memeId, txt, user.name);
        body.innerHTML = render();   // przerysuj listę
        bindSend();                  // podepnij przycisk ponownie
        UI.toast('Dodano komentarz 🎉', 'ok');
      };
    }
    bindSend();
  }

  /* ----- UDOSTĘPNIANIE -------------------------------------------------- */
  function share(m) {
    const url = location.origin + location.pathname.replace(/[^/]*$/, '') + 'memy.html';
    const text = m.caption + ' — BekaWpigułce';
    if (navigator.share) { navigator.share({ title: 'BekaWpigułce', text, url }).catch(() => { }); return; }
    const body = UI.modal(`
      <p class="muted" style="margin-bottom:14px">Podrzuć tego mema dalej:</p>
      <div class="row" style="gap:10px;flex-wrap:wrap">
        <a class="btn btn--fb" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}">Facebook</a>
        <a class="btn btn--ghost" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}">X / Twitter</a>
        <button class="btn" id="copyLink">Kopiuj link</button>
      </div>`, { title: '↗ Udostępnij' });
    body.querySelector('#copyLink').onclick = () => {
      navigator.clipboard?.writeText(url).then(() => UI.toast('Link skopiowany ✓', 'ok'));
    };
  }

  /* ----- KARTA FILMU ---------------------------------------------------- */
  function video(v) {
    const el = document.createElement('article');
    el.className = 'film';
    el.innerHTML = `
      <div class="film-thumb">
        <img src="https://img.youtube.com/vi/${v.youtube}/hqdefault.jpg" alt="${e(v.title)}" loading="lazy"
             onerror="this.src='${DB.util.placeholder(v.title, 3)}'">
        <div class="film-play"><span>▶</span></div>
      </div>
      <div class="film-body">
        <h3>${e(v.title)}</h3>
        <p class="muted micro">${e(v.description || '')}</p>
        <span class="pill" style="margin-top:8px">${e(DB.categories.name(v.category))}</span>
      </div>`;
    el.onclick = () => playVideo(v);
    return el;
  }
  function playVideo(v) {
    UI.modal(`
      <div class="video-frame">
        <iframe src="https://www.youtube.com/embed/${v.youtube}?autoplay=1&rel=0" title="${e(v.title)}"
          allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe>
      </div>
      <h3 class="card-h" style="margin-top:14px">${e(v.title)}</h3>
      <p class="muted">${e(v.description || '')}</p>`, { title: '', wide: true });
  }

  return { meme, video, openComments, share, playVideo, timeAgo };
})();

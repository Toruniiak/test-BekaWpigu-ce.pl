/* ============================================================================
   BekaWpigułce — KATALOG MEMÓW  (js/memy.js)
   Filtrowanie + wyszukiwanie + sortowanie + formularz dodawania do poczekalni.
   ========================================================================== */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  let activeCat = 'all';
  let uploadedDataUrl = '';   // obrazek wgrany przez użytkownika (data-URL)

  /* odczyt parametrów z URL (np. ?sort=top z linku na stronie głównej) */
  const params = new URLSearchParams(location.search);
  if (params.get('sort')) $('#sort').value = params.get('sort');

  /* --- przyciski kategorii --- */
  const cats = $('#cats');
  const catList = [{ slug: 'all', name: 'Wszystko' }, ...DB.categories.all()];
  cats.innerHTML = catList.map(c =>
    `<button class="fchip ${c.slug === 'all' ? 'on' : ''}" data-c="${c.slug}">${DB.util.esc(c.name)}</button>`).join('');
  cats.querySelectorAll('.fchip').forEach(b => b.onclick = () => {
    cats.querySelectorAll('.fchip').forEach(x => x.classList.remove('on'));
    b.classList.add('on'); activeCat = b.dataset.c; render();
  });

  $('#q').addEventListener('input', render);
  $('#sort').addEventListener('change', render);

  /* --- główny render siatki --- */
  let mode = 'main'; // 'main' = katalog zatwierdzonych, 'pending' = publiczna poczekalnia
  function render() {
    let list = mode === 'pending' ? DB.memes.pending() : DB.memes.approved();
    const q = $('#q').value.trim().toLowerCase();

    if (activeCat !== 'all') list = list.filter(m => m.category === activeCat);
    if (q) list = list.filter(m =>
      m.caption.toLowerCase().includes(q) ||
      (m.tags || []).some(t => t.toLowerCase().includes(q)) ||
      (m.author || '').toLowerCase().includes(q));

    const sort = $('#sort').value;
    const cmt = id => DB.comments.forMeme(id).length;
    list.sort((a, b) => {
      if (sort === 'top') return DB.memes.score(b) - DB.memes.score(a);
      if (sort === 'discussed') return cmt(b.id) - cmt(a.id);
      if (sort === 'controversial') return (b.votes_down || 0) - (a.votes_down || 0);
      return b.created_at.localeCompare(a.created_at); // new
    });

    const grid = $('#memeGrid'); grid.innerHTML = '';
    list.forEach((m, i) => grid.appendChild(Cards.meme(m, sort === 'top' && mode === 'main' ? { rank: i + 1 } : {})));
    $('#emptyState').style.display = list.length ? 'none' : 'block';
    $('#resultInfo').textContent = (mode === 'pending' ? 'Poczekalnia: ' : '') +
      `Znaleziono ${list.length} ${plural(list.length)}` + (q ? ` dla „${q}"` : '');
    $('#tabPendingCount').textContent = DB.memes.pending().length ? '(' + DB.memes.pending().length + ')' : '';
  }
  const plural = n => n === 1 ? 'mema' : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'memy' : 'memów');

  /* --- zakładki katalog / poczekalnia --- */
  const tabMain = $('#tabMain'), tabPending = $('#tabPending');
  function setMode(m) {
    mode = m;
    tabMain.classList.toggle('on', m === 'main');
    tabPending.classList.toggle('on', m === 'pending');
    $('#pendingInfo').style.display = m === 'pending' ? 'block' : 'none';
    render();
  }
  tabMain.onclick = () => setMode('main');
  tabPending.onclick = () => setMode('pending');

  /* --- formularz dodawania --- */
  $('#memCat').innerHTML = DB.categories.all().map(c => `<option value="${c.slug}">${DB.util.esc(c.name)}</option>`).join('');
  $('#pendingCount').textContent = DB.memes.pending().length;

  const drop = $('#drop'), file = $('#file'), preview = $('#preview');
  drop.onclick = () => file.click();
  ['dragover', 'dragenter'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('drag'); }));
  drop.addEventListener('drop', e => { if (e.dataTransfer.files[0]) readFile(e.dataTransfer.files[0]); });
  file.addEventListener('change', e => { if (e.target.files[0]) readFile(e.target.files[0]); });

  function readFile(f) {
    if (!f.type.startsWith('image/')) return UI.toast('To nie jest obrazek', 'err');
    if (f.size > 3.5 * 1024 * 1024) return UI.toast('Plik za duży (max ~3 MB)', 'err');
    const r = new FileReader();
    r.onload = () => { uploadedDataUrl = r.result; preview.src = r.result; preview.style.display = 'block'; $('#memUrl').value = ''; };
    r.readAsDataURL(f);
  }

  $('#submitMeme').onclick = () => {
    const cap = $('#memCap').value.trim();
    if (cap.length < 3) return UI.toast('Dodaj sensowny podpis', 'err');
    const image = uploadedDataUrl || $('#memUrl').value.trim();
    const author = $('#memAuthor').value.trim() || (DB.users.current()?.name) || 'anonim';
    DB.memes.submit({
      image, caption: cap, author,
      category: $('#memCat').value,
      tags: $('#memTags').value
    });
    // reset
    $('#memCap').value = $('#memTags').value = $('#memUrl').value = '';
    uploadedDataUrl = ''; preview.style.display = 'none';
    $('#pendingCount').textContent = DB.memes.pending().length;
    UI.toast('Mem wysłany do moderacji! 🎉 Po akceptacji pojawi się w katalogu.', 'ok', 3600);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ====================== KREATOR MEMA (canvas) ========================= */
  /* Klasyczny szablon: obrazek + biały tekst z czarną obwódką u góry i dołu.
     Wynik można pobrać jako PNG albo od razu wysłać do poczekalni. */
  $('#openCreator').onclick = () => {
    let img = null;
    const body = UI.modal(`
      <div style="display:grid;gap:10px">
        <button class="btn btn--ghost btn--block" id="mcPick">📷 Wybierz obrazek z urządzenia</button>
        <input type="file" id="mcFile" accept="image/*" style="display:none">
        <canvas id="mcCanvas" width="700" height="700" style="width:100%;border-radius:12px;background:#191919;display:none"></canvas>
        <input class="inp" id="mcTop" placeholder="TEKST U GÓRY" maxlength="60">
        <input class="inp" id="mcBot" placeholder="TEKST NA DOLE" maxlength="60">
        <div style="display:flex;gap:8px">
          <button class="btn btn--ghost" id="mcDownload" style="flex:1" disabled>⬇ Pobierz PNG</button>
          <button class="btn" id="mcSend" style="flex:1" disabled>🚀 Wyślij do poczekalni</button>
        </div>
      </div>`, { title: '🎨 Kreator mema' });

    const cv = body.querySelector('#mcCanvas'), ctx = cv.getContext('2d');
    const draw = () => {
      if (!img) return;
      const W = 700, ratio = img.height / img.width, H = Math.min(900, Math.max(420, Math.round(W * ratio)));
      cv.width = W; cv.height = H; cv.style.display = 'block';
      ctx.drawImage(img, 0, 0, W, H);
      const line = (t, y, baseline) => {
        if (!t) return;
        let size = 56;
        ctx.font = `900 ${size}px Archivo, 'Arial Black', sans-serif`;
        while (ctx.measureText(t).width > W - 40 && size > 22) { size -= 2; ctx.font = `900 ${size}px Archivo, 'Arial Black', sans-serif`; }
        ctx.textAlign = 'center'; ctx.textBaseline = baseline;
        ctx.lineWidth = Math.max(4, size / 8); ctx.strokeStyle = '#000'; ctx.fillStyle = '#fff';
        ctx.strokeText(t, W / 2, y); ctx.fillText(t, W / 2, y);
      };
      line(body.querySelector('#mcTop').value.trim().toUpperCase(), 18, 'top');
      line(body.querySelector('#mcBot').value.trim().toUpperCase(), cv.height - 18, 'bottom');
      body.querySelector('#mcDownload').disabled = body.querySelector('#mcSend').disabled = false;
    };
    body.querySelector('#mcPick').onclick = () => body.querySelector('#mcFile').click();
    body.querySelector('#mcFile').onchange = (ev) => {
      const f = ev.target.files[0];
      if (!f || !f.type.startsWith('image/')) return UI.toast('To nie jest obrazek', 'err');
      if (f.size > 3.5 * 1024 * 1024) return UI.toast('Plik za duży (max ~3 MB)', 'err');
      const r = new FileReader();
      r.onload = () => { img = new Image(); img.onload = draw; img.src = r.result; };
      r.readAsDataURL(f);
    };
    body.querySelector('#mcTop').oninput = draw;
    body.querySelector('#mcBot').oninput = draw;
    body.querySelector('#mcDownload').onclick = () => {
      const a = document.createElement('a');
      a.download = 'mem-bekawpigulce.png'; a.href = cv.toDataURL('image/jpeg', 0.9); a.click();
    };
    body.querySelector('#mcSend').onclick = () => {
      const cap = body.querySelector('#mcTop').value.trim() || body.querySelector('#mcBot').value.trim() || 'Mem z kreatora';
      DB.memes.submit({
        image: cv.toDataURL('image/jpeg', 0.85), caption: cap,
        author: (DB.users.current() || {}).name || 'anonim', category: 'internet', tags: ['kreator']
      });
      UI.closeModal();
      $('#pendingCount').textContent = DB.memes.pending().length;
      UI.toast('Mem z kreatora wysłany do poczekalni! 🎉', 'ok', 3200);
      render();
    };
  };

  /* ====================== PROFIL UŻYTKOWNIKA ============================ */
  /* Nick + poziom reputacji, punkty, historia przesłanych memów i ulubione. */
  $('#openProfile').onclick = async () => {
    let u = DB.users.current();
    if (!u) { try { u = await UI.requireUser(); } catch (e) { return; } if (!u) return; }
    const rep = DB.reputation(u.name);
    const mine = DB.memes.all().filter(m => (m.author || '').toLowerCase() === u.name.toLowerCase() && m.status !== 'rejected');
    const favs = DB.favorites.list();
    const row = (m) => `
      <div style="display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid #262626">
        <img src="${m.image}" alt="" style="width:56px;height:44px;object-fit:cover;border-radius:8px">
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${DB.util.esc(m.caption)}</div>
          <div class="micro muted">${m.status === 'approved' ? '✅ na stronie' : '⏳ w poczekalni'} · 🔥 ${m.votes_up || 0} · 💩 ${m.votes_down || 0}</div>
        </div>
      </div>`;
    const body = UI.modal(`
      <div style="text-align:center;margin-bottom:14px">
        <div style="font-size:2.4rem">${u.avatar || '🙂'}</div>
        <b style="font-size:1.15rem">@${DB.util.esc(u.name)}</b>
        <div style="color:var(--yellow);font-weight:700;margin-top:4px">${rep.level}</div>
        <div class="micro muted">${rep.points} pkt reputacji · ${rep.memes} ${rep.memes === 1 ? 'mem' : 'memów'} na stronie · ⭐ ${favs.length} ulubionych</div>
      </div>
      <div class="adm-section-title" style="margin-bottom:4px">📤 Moje memy (${mine.length})</div>
      <div style="max-height:200px;overflow:auto">${mine.map(row).join('') || '<p class="muted micro">Jeszcze nic nie wrzuciłeś — kreator czeka! 🎨</p>'}</div>
      <div class="adm-section-title" style="margin:14px 0 4px">⭐ Ulubione (${favs.length})</div>
      <div style="max-height:200px;overflow:auto">${favs.map(row).join('') || '<p class="muted micro">Klikaj ☆ przy memach, żeby tu trafiły.</p>'}</div>
      <p class="micro muted" style="margin-top:12px">Punkty: +5 za każdego mema na stronie, +2 za każdy 🔥 przewagi, +1 za komentarz.</p>`,
      { title: '👤 Mój profil' });
  };

  render();
})();

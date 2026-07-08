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
  function render() {
    let list = DB.memes.approved();
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
    list.forEach((m, i) => grid.appendChild(Cards.meme(m, sort === 'top' ? { rank: i + 1 } : {})));
    $('#emptyState').style.display = list.length ? 'none' : 'block';
    $('#resultInfo').textContent = `Znaleziono ${list.length} ${plural(list.length)}` + (q ? ` dla „${q}"` : '');
  }
  const plural = n => n === 1 ? 'mema' : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'memy' : 'memów');

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

  render();
})();

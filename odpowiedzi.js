/* ============================================================================
   BekaWpigułce — ODPOWIEDZI  (odpowiedzi.js)
   ----------------------------------------------------------------------------
   Dwa widoki:
     • LISTA  (odpowiedzi.html)            — wszystkie opublikowane odpowiedzi.
     • POJEDYNCZA (odpowiedzi.html?a=slug) — strona docelowa dla osób z Facebooka.
       Pod ten widok podpinasz link w komentarzu na FB ("Odpowiedź na stronie 👇").
       Układ celowo prowadzi przez reklamy i pokazuje inne zagadki = więcej odsłon.
   ========================================================================== */
(() => {
  'use strict';
  const e = DB.util.esc;
  const root = document.getElementById('ansRoot');
  const s = DB.settings.get();
  const params = new URLSearchParams(location.search);
  const key = params.get('a');

  const adBox = (slot) => `<div class="wrap" style="margin:18px 0;padding:0"><div data-ad="${slot}"></div></div>`;

  function card(a) {
    const img = a.image
      ? `<div class="ans-thumb"><img src="${e(a.image)}" alt=""></div>`
      : `<div class="ans-thumb ans-thumb--ph">✅</div>`;
    return `<a class="ans-card" href="odpowiedzi.html?a=${encodeURIComponent(a.slug)}">
      ${img}
      <div class="ans-card-body">
        <span class="eyebrow">Zagadka z FB</span>
        <h3>${e(a.title || a.question || 'Odpowiedź')}</h3>
        <p class="muted">${e((a.question || '').slice(0, 90))}${(a.question || '').length > 90 ? '…' : ''}</p>
        <span class="ans-go">Zobacz odpowiedź →</span>
      </div></a>`;
  }

  function renderList() {
    const list = DB.answers.published();
    root.innerHTML = `
      <span class="eyebrow">Strefa odpowiedzi</span>
      <h1 style="font-family:var(--disp);font-weight:900;font-size:clamp(2rem,6vw,3.2rem);letter-spacing:-.02em">
        Odpowiedzi <span style="color:var(--yellow)">do zagadek</span> ✅</h1>
      <p class="muted" style="max-width:60ch;margin-top:8px">Rozwiązania i wyjaśnienia do zagadek, quizów i iluzji z naszego Facebooka. Kliknij, sprawdź, czy miałeś rację — i wpadnij po więcej.</p>
      ${adBox('top')}
      ${list.length
        ? `<section class="ans-grid">${list.map(card).join('')}</section>`
        : `<div class="card center" style="padding:48px"><div style="font-size:2.6rem">🧩</div>
            <p style="font-weight:600;margin-top:8px">Nie ma jeszcze żadnej odpowiedzi.</p>
            <p class="muted">Dodasz je w panelu admina (zakładka „Odpowiedzi").</p></div>`}
      ${adBox('in-feed')}
      <div class="card" style="display:flex;flex-wrap:wrap;gap:14px;align-items:center;justify-content:space-between;margin-top:8px">
        <div><span class="eyebrow red">Codziennie nowe</span>
          <h3 class="card-h" style="margin:4px 0 2px">Nie przegap kolejnych zagadek 🔥</h3>
          <p class="muted" style="max-width:48ch">Wrzucamy je codziennie na Facebooku. Obserwuj, zgadnij, a odpowiedź sprawdź tutaj.</p></div>
        <a class="btn btn--fb" href="${e(s.fb_page_url)}" target="_blank" rel="noopener">Obserwuj na Facebooku</a>
      </div>`;
    afterRender();
  }

  function renderSingle(a) {
    const others = DB.answers.published().filter(x => x.id !== a.id).slice(0, 6);
    const img = a.image ? `<div class="ans-hero-img"><img src="${e(a.image)}" alt=""></div>` : '';
    const shareUrl = encodeURIComponent(location.href);
    const shareTxt = encodeURIComponent((a.title || 'Zagadka') + ' — sprawdź odpowiedź:');
    root.innerHTML = `
      <a class="ans-back" href="odpowiedzi.html">← Wszystkie odpowiedzi</a>
      <span class="eyebrow">Odpowiedź na zagadkę z Facebooka</span>
      <h1 class="ans-title">${e(a.title || a.question)}</h1>
      ${a.question ? `<div class="ans-q"><b>Pytanie:</b> ${e(a.question)}</div>` : ''}
      ${img}
      ${adBox('top')}
      <div class="ans-reveal">
        <div class="ans-reveal-lab">✅ Prawidłowa odpowiedź</div>
        <div class="ans-reveal-val">${e(a.answer)}</div>
        ${a.explain ? `<div class="ans-explain">${e(a.explain)}</div>` : ''}
      </div>
      <div class="ans-share">
        <span class="muted micro">Podziel się:</span>
        <a class="btn btn--sm btn--fb" href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" target="_blank" rel="noopener">Facebook</a>
        <a class="btn btn--sm btn--ghost" href="https://twitter.com/intent/tweet?text=${shareTxt}&url=${shareUrl}" target="_blank" rel="noopener">X</a>
      </div>
      ${adBox('in-feed')}
      ${others.length ? `
        <section class="block" style="padding-top:8px">
          <div class="sec-head"><h2 class="sec-h">Inne <span class="ac">zagadki</span></h2>
            <a class="sec-link" href="odpowiedzi.html">Wszystkie →</a></div>
          <div class="ans-grid">${others.map(card).join('')}</div>
        </section>` : ''}
      <div class="card" style="display:flex;flex-wrap:wrap;gap:14px;align-items:center;justify-content:space-between">
        <div><h3 class="card-h" style="margin-bottom:2px">Codziennie nowa zagadka 🔥</h3>
          <p class="muted">Wpadnij na nasz Facebook po kolejną dawkę.</p></div>
        <a class="btn btn--fb" href="${e(s.fb_page_url)}" target="_blank" rel="noopener">Obserwuj na Facebooku</a>
      </div>
      ${adBox('footer')}`;
    document.title = (a.title || 'Odpowiedź') + ' — BekaWpigułce';
    afterRender();
  }

  /* po wstrzyknięciu treści: dorenderuj reklamy w nowych slotach */
  function afterRender() { if (window.UI && UI.renderAds) UI.renderAds(); }

  if (key) {
    const a = DB.answers.find(key);
    if (a && a.published) renderSingle(a);
    else {
      root.innerHTML = `<div class="card center" style="padding:48px;margin-top:20px">
        <div style="font-size:2.6rem">🤔</div>
        <p style="font-weight:600;margin-top:8px">Nie znaleziono tej odpowiedzi.</p>
        <p class="muted">Może została usunięta. Zobacz pozostałe:</p>
        <a class="btn" style="margin-top:12px" href="odpowiedzi.html">Wszystkie odpowiedzi</a></div>`;
    }
  } else renderList();
})();

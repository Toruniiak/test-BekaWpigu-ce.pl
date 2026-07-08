/* ============================================================================
   BekaWpigułce — ROZRYWKA  (rozrywka.js)
   Mini-gry w czystym JS (canvas/DOM) + quizy + wyzwania.
   Rekordy zapisywane lokalnie (per przeglądarka) przez obiekt Stats.
   ========================================================================== */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const e = DB.util.esc;

  /* ----------------- STATYSTYKI (lokalne rekordy) ----------------------- */
  const Stats = {
    key: c => 'bwp_game_' + c,
    get(c) { try { return JSON.parse(localStorage.getItem(Stats.key(c))) || {}; } catch (err) { return {}; } },
    save(c, o) { try { localStorage.setItem(Stats.key(c), JSON.stringify(o)); } catch (err) {} },
    play(c) { const s = Stats.get(c); s.plays = (s.plays || 0) + 1; Stats.save(c, s); return s; },
    max(c, f, v) { const s = Stats.get(c); let nr = false; if (v > (s[f] || 0)) { s[f] = v; nr = true; } Stats.save(c, s); return nr; },
    min(c, f, v) { const s = Stats.get(c); let nr = false; if (s[f] == null || v < s[f]) { s[f] = v; nr = true; } Stats.save(c, s); return nr; }
  };
  function recLabel(code) {
    const s = Stats.get(code);
    if (code === 'saper') return s.bestTime ? `Najlepszy czas: ${s.bestTime}s` : (s.plays ? `Rozegrane: ${s.plays}` : 'Zagraj!');
    if (code === 'memory') return s.bestMoves ? `Najmniej ruchów: ${s.bestMoves}` : 'Zagraj!';
    if (code === 'ubieranka') return 'Stwórz i pobierz 📸';
    return s.best ? `Twój rekord: ${s.best}` : 'Zagraj!';
  }

  const GAME_ICONS = { lap: '🎯', memory: '🃏', reflex: '⚡', snake: '🐍', runner: '🏍️', saper: '💣', ubieranka: '🎽', bloki: '🧱', g2048: '🔢' };
  const LAUNCHERS = { lap: launchCatch, memory: launchMemory, reflex: launchReflex, snake: launchSnake, runner: launchRunner, saper: launchSaper, ubieranka: launchUbieranka, bloki: launchBloki, g2048: launch2048 };

  /* --- kafelki gier --- */
  const grid = $('#gamesGrid');
  if (grid) DB.games.enabled().forEach(g => {
    const c = document.createElement('div');
    c.className = 'game-card';
    c.innerHTML = `
      <div class="game-ico">${GAME_ICONS[g.code] || '🎮'}</div>
      <h3>${e(g.name)}</h3>
      <p>${e(g.description)}</p>
      <div class="game-rec">${recLabel(g.code)}</div>
      <span class="pill" style="align-self:flex-start">${e(g.category)}</span>`;
    c.onclick = () => (LAUNCHERS[g.code] || (() => UI.toast('Gra w budowie', 'info')))();
    grid.appendChild(c);
  });

  /* --- quizy (lista) --- */
  const qg = $('#quizGrid');
  if (qg) DB.quizzes.all().forEach(qz => {
    const c = document.createElement('div');
    c.className = 'game-card';
    c.innerHTML = `
      <div class="game-ico">🧠</div>
      <h3>${e(qz.title)}</h3>
      <p>${e(qz.desc || 'Sprawdź swoją wiedzę.')}</p>
      <div class="game-rec">${qz.questions.length} pytań</div>
      <span class="pill" style="align-self:flex-start">quiz</span>`;
    c.onclick = () => launchQuiz(qz.id);
    qg.appendChild(c);
  });

  /* --- wyzwania --- */
  const cg = $('#challengesGrid');
  if (cg) DB.challenges.active().forEach(ch => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <span class="eyebrow">Wyzwanie</span>
      <h3 class="card-h">${e(ch.title)}</h3>
      <p class="muted" style="margin:6px 0 16px">${e(ch.description)}</p>
      <a class="btn btn--sm" href="${e(ch.link)}">${e(ch.cta)}</a>`;
    cg.appendChild(card);
  });

  /* ===================== ZŁAP MEMA ===================================== */
  function launchCatch() {
    Stats.play('lap');
    const body = UI.modal(`
      <div class="gamewrap">
        <div class="gamehud"><div>Punkty: <b id="cScore">0</b></div><div>Rekord: <b>${Stats.get('lap').best || 0}</b></div><div>Czas: <b id="cTime">30</b>s</div></div>
        <canvas id="gameCanvas" width="360" height="420"></canvas>
        <p class="muted micro">Łap 🔥😂💀🎉 (+1). Unikaj 💩 (−2). Masz 30 sekund.</p>
        <button class="btn btn--block" id="cAgain" style="display:none">Jeszcze raz</button>
      </div>`, { title: '🎯 Złap Mema' });
    const cv = body.querySelector('#gameCanvas'), ctx = cv.getContext('2d');
    const good = ['🔥', '😂', '💀', '🎉', '👍', '😎'], bad = ['💩'];
    let items = [], score = 0, time = 30, raf, spawnT = 0, running = true;
    function spawn() { const isBad = Math.random() < 0.22; items.push({ x: 28 + Math.random() * (cv.width - 56), y: -30, emoji: isBad ? bad[0] : good[(Math.random() * good.length) | 0], vy: 1.4 + Math.random() * 1.8 + (30 - time) * 0.04, r: 22, bad: isBad }); }
    function loop(ts) { if (!running) return; ctx.clearRect(0, 0, cv.width, cv.height); if (ts - spawnT > 620) { spawn(); spawnT = ts; } items.forEach(it => { it.y += it.vy; ctx.font = '36px serif'; ctx.textAlign = 'center'; ctx.fillText(it.emoji, it.x, it.y); }); items = items.filter(it => it.y < cv.height + 40); raf = requestAnimationFrame(loop); }
    function hit(mx, my) { for (let i = items.length - 1; i >= 0; i--) { const it = items[i]; if (Math.hypot(mx - it.x, my - it.y - 12) < it.r + 8) { score += it.bad ? -2 : 1; if (score < 0) score = 0; body.querySelector('#cScore').textContent = score; items.splice(i, 1); flash(it.bad ? '#FF3B30' : '#FFD400'); break; } } }
    function flash(color) { cv.style.boxShadow = `0 0 0 3px ${color}`; setTimeout(() => cv.style.boxShadow = '', 90); }
    function pos(ev) { const r = cv.getBoundingClientRect(), p = ev.touches ? ev.touches[0] : ev; return [(p.clientX - r.left) * cv.width / r.width, (p.clientY - r.top) * cv.height / r.height]; }
    cv.addEventListener('mousedown', ev => hit(...pos(ev)));
    cv.addEventListener('touchstart', ev => { ev.preventDefault(); hit(...pos(ev)); }, { passive: false });
    const timer = setInterval(() => {
      time--; body.querySelector('#cTime').textContent = time;
      if (time <= 0) {
        clearInterval(timer); running = false; cancelAnimationFrame(raf);
        const nr = Stats.max('lap', 'best', score);
        ctx.fillStyle = 'rgba(14,14,14,.85)'; ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.fillStyle = '#FFD400'; ctx.font = '900 30px Archivo,sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(nr ? 'NOWY REKORD!' : 'KONIEC!', cv.width / 2, cv.height / 2 - 12);
        ctx.fillStyle = '#F5F5F0'; ctx.font = '600 20px Inter,sans-serif'; ctx.fillText('Wynik: ' + score, cv.width / 2, cv.height / 2 + 22);
        body.querySelector('#cAgain').style.display = 'block';
      }
    }, 1000);
    body.querySelector('#cAgain').onclick = () => { clearInterval(timer); launchCatch(); };
    raf = requestAnimationFrame(loop);
  }

  /* ===================== MEM MEMORY ==================================== */
  function launchMemory() {
    Stats.play('memory');
    const symbols = ['🔥', '😂', '💀', '🎉', '😎', '👑', '🤡', '💩'];
    let deck = [...symbols, ...symbols].sort(() => Math.random() - 0.5);
    const body = UI.modal(`
      <div class="gamewrap">
        <div class="gamehud"><div>Ruchy: <b id="mMoves">0</b></div><div>Rekord: <b>${Stats.get('memory').bestMoves || '—'}</b></div><div>Pary: <b id="mPairs">0</b>/8</div></div>
        <div class="mem-board" id="board"></div>
        <button class="btn btn--block" id="mAgain" style="display:none">Zagraj ponownie</button>
      </div>`, { title: '🃏 Mem Memory' });
    const board = body.querySelector('#board');
    let flipped = [], moves = 0, pairs = 0, lock = false;
    deck.forEach((sym) => {
      const c = document.createElement('div'); c.className = 'mcard'; c.dataset.sym = sym;
      c.innerHTML = `<span>${sym}</span>`;
      c.onclick = () => {
        if (lock || c.classList.contains('flip') || c.classList.contains('matched')) return;
        c.classList.add('flip'); flipped.push(c);
        if (flipped.length === 2) {
          moves++; body.querySelector('#mMoves').textContent = moves; lock = true;
          if (flipped[0].dataset.sym === flipped[1].dataset.sym) {
            flipped.forEach(x => x.classList.add('matched')); pairs++;
            body.querySelector('#mPairs').textContent = pairs; flipped = []; lock = false;
            if (pairs === 8) { const nr = Stats.min('memory', 'bestMoves', moves); UI.toast((nr ? 'NOWY REKORD! ' : 'Wygrana! ') + moves + ' ruchów 🎉', 'ok', 3000); body.querySelector('#mAgain').style.display = 'block'; }
          } else { setTimeout(() => { flipped.forEach(x => x.classList.remove('flip')); flipped = []; lock = false; }, 700); }
        }
      };
      board.appendChild(c);
    });
    body.querySelector('#mAgain').onclick = launchMemory;
  }

  /* ===================== KLIKOLOT ===================================== */
  function launchReflex() {
    Stats.play('reflex');
    const body = UI.modal(`
      <div class="gamewrap">
        <div class="gamehud"><div>Trafienia: <b id="rHits">0</b></div><div>Rekord: <b>${Stats.get('reflex').best || 0}</b></div><div>Czas: <b id="rTime">15</b>s</div></div>
        <div id="reflexArea"></div>
        <p class="muted micro">Klikaj świecący cel tak szybko, jak potrafisz!</p>
        <button class="btn btn--block" id="rStart">Start</button>
      </div>`, { title: '⚡ Klikolot' });
    const area = body.querySelector('#reflexArea');
    let hits = 0, time = 15, target, timer, running = false;
    function move() { if (!target) { target = document.createElement('div'); target.className = 'reflex-target'; target.textContent = '🔥'; area.appendChild(target); } const max = { x: area.clientWidth - 54, y: area.clientHeight - 54 }; target.style.left = Math.random() * max.x + 'px'; target.style.top = Math.random() * max.y + 'px'; }
    function start() {
      if (running) return; running = true; hits = 0; time = 15;
      body.querySelector('#rHits').textContent = 0; body.querySelector('#rStart').style.display = 'none';
      move(); target.onclick = () => { hits++; body.querySelector('#rHits').textContent = hits; move(); };
      timer = setInterval(() => {
        time--; body.querySelector('#rTime').textContent = time;
        if (time <= 0) {
          clearInterval(timer); running = false; if (target) { target.remove(); target = null; }
          const nr = Stats.max('reflex', 'best', hits);
          const rank = hits >= 25 ? 'Sokoli wzrok 🦅' : hits >= 15 ? 'Niezły refleks 😎' : 'Może kawa? ☕';
          area.innerHTML = `<div style="position:absolute;inset:0;display:grid;place-items:center;text-align:center"><div><div style="font-family:var(--disp);font-weight:900;font-size:2.4rem;color:var(--yellow)">${hits}</div><div class="muted">trafień · ${nr ? 'NOWY REKORD! · ' : ''}${rank}</div></div></div>`;
          const b = body.querySelector('#rStart'); b.textContent = 'Jeszcze raz'; b.style.display = 'block';
        }
      }, 1000);
    }
    body.querySelector('#rStart').onclick = () => { area.innerHTML = ''; target = null; start(); };
  }

  /* ===================== WĘŻYK ======================================== */
  function launchSnake() {
    Stats.play('snake');
    const N = 17, CELL = 19, SIZE = N * CELL;
    const body = UI.modal(`
      <div class="gamewrap">
        <div class="gamehud"><div>Punkty: <b id="sScore">0</b></div><div>Rekord: <b>${Stats.get('snake').best || 0}</b></div></div>
        <canvas id="snakeCv" width="${SIZE}" height="${SIZE}" style="background:#0b0b0b;border-radius:12px;touch-action:none"></canvas>
        <div class="dpad"><button data-d="up">▲</button><div><button data-d="left">◀</button><button data-d="down">▼</button><button data-d="right">▶</button></div></div>
        <p class="muted micro">Strzałki / WASD / przyciski. Zbieraj 🍎, nie wpadnij w siebie.</p>
        <button class="btn btn--block" id="sAgain" style="display:none">Jeszcze raz</button>
      </div>`, { title: '🐍 Wężyk' });
    const cv = body.querySelector('#snakeCv'), ctx = cv.getContext('2d');
    let snake = [{ x: 8, y: 8 }], dir = { x: 1, y: 0 }, next = { x: 1, y: 0 };
    let food = rndFood(), score = 0, speed = 130, timer = null;
    function rndFood() { let f; do { f = { x: (Math.random() * N) | 0, y: (Math.random() * N) | 0 }; } while (snake.some(s => s.x === f.x && s.y === f.y)); return f; }
    function setDir(d) { const map = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }; const nd = map[d]; if (!nd) return; if (nd.x === -dir.x && nd.y === -dir.y) return; next = nd; }
    function draw() {
      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.font = CELL + 'px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🍎', food.x * CELL + CELL / 2, food.y * CELL + CELL / 2 + 1);
      snake.forEach((s, i) => { ctx.fillStyle = i === 0 ? '#FFD400' : '#34D399'; ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2); });
    }
    function step() {
      dir = next;
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (head.x < 0 || head.y < 0 || head.x >= N || head.y >= N || snake.some(s => s.x === head.x && s.y === head.y)) return over();
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) { score++; body.querySelector('#sScore').textContent = score; food = rndFood(); if (speed > 70) { speed -= 3; clearInterval(timer); timer = setInterval(step, speed); } }
      else snake.pop();
      draw();
    }
    function over() {
      clearInterval(timer);
      const nr = Stats.max('snake', 'best', score);
      ctx.fillStyle = 'rgba(14,14,14,.85)'; ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.fillStyle = '#FFD400'; ctx.font = '900 26px Archivo,sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(nr ? 'NOWY REKORD!' : 'KONIEC!', SIZE / 2, SIZE / 2 - 8);
      ctx.fillStyle = '#F5F5F0'; ctx.font = '600 18px Inter,sans-serif'; ctx.fillText('Punkty: ' + score, SIZE / 2, SIZE / 2 + 20);
      body.querySelector('#sAgain').style.display = 'block';
    }
    const onKey = (ev) => { const k = ev.key.toLowerCase(); const m = { arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down', arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right' }; if (m[k]) { ev.preventDefault(); setDir(m[k]); } };
    document.addEventListener('keydown', onKey);
    body.querySelectorAll('.dpad button').forEach(b => b.onclick = () => setDir(b.dataset.d));
    let tStart = null;
    cv.addEventListener('touchstart', ev => { tStart = ev.touches[0]; }, { passive: true });
    cv.addEventListener('touchend', ev => { if (!tStart) return; const t = ev.changedTouches[0]; const dx = t.clientX - tStart.clientX, dy = t.clientY - tStart.clientY; if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 'right' : 'left'); else setDir(dy > 0 ? 'down' : 'up'); tStart = null; });
    // sprzątanie nasłuchu po zamknięciu modala
    const mo = new MutationObserver(() => { if (!document.getElementById('uiModal')) { document.removeEventListener('keydown', onKey); clearInterval(timer); mo.disconnect(); } });
    mo.observe(document.body, { childList: true });
    body.querySelector('#sAgain').onclick = () => { clearInterval(timer); document.removeEventListener('keydown', onKey); mo.disconnect(); launchSnake(); };
    draw(); timer = setInterval(step, speed);
  }

  /* ===================== MOTOREK (runner) ============================= */
  function launchRunner() {
    Stats.play('runner');
    const W = 360, H = 240, GROUND = 200;
    const body = UI.modal(`
      <div class="gamewrap">
        <div class="gamehud"><div>Dystans: <b id="rDist">0</b> m</div><div>Rekord: <b>${Stats.get('runner').best || 0}</b> m</div></div>
        <canvas id="runCv" width="${W}" height="${H}" style="background:linear-gradient(#11151f,#0b0b0b);border-radius:12px;touch-action:none"></canvas>
        <p class="muted micro">Spacja / klik / tap = skok. Omijaj przeszkody, jedź jak najdalej.</p>
        <button class="btn btn--block" id="runStart">Start 🏍️</button>
      </div>`, { title: '🏍️ Motorek' });
    const cv = body.querySelector('#runCv'), ctx = cv.getContext('2d');
    let py, vy, dist, speed, obs, running, raf, gravity = 0.62, jumpV = -10.5;
    function reset() { py = GROUND - 26; vy = 0; dist = 0; speed = 3.4; obs = []; running = true; }
    function jump() { if (!running) return; if (py >= GROUND - 27) { vy = jumpV; } }
    function spawn() { const h = 18 + Math.random() * 22; obs.push({ x: W + 10, w: 14 + Math.random() * 12, h }); }
    function loop() {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      // ziemia
      ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, GROUND + 4); ctx.lineTo(W, GROUND + 4); ctx.stroke();
      // gracz
      vy += gravity; py += vy; if (py > GROUND - 26) { py = GROUND - 26; vy = 0; }
      ctx.font = '26px serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText('🏍️', 40, py + 24);
      // przeszkody
      if (obs.length === 0 || obs[obs.length - 1].x < W - (120 + Math.random() * 120)) spawn();
      speed += 0.0016; dist += speed * 0.18;
      for (let i = obs.length - 1; i >= 0; i--) {
        const o = obs[i]; o.x -= speed;
        ctx.fillStyle = '#FF3B30'; ctx.fillRect(o.x, GROUND - o.h + 4, o.w, o.h);
        // kolizja (gracz ~ x 42..66, dół py+24)
        if (42 + 22 > o.x && 42 < o.x + o.w && py + 24 > GROUND - o.h + 4) return over();
        if (o.x + o.w < 0) obs.splice(i, 1);
      }
      ctx.fillStyle = '#FFD400'; ctx.font = '700 16px Inter,sans-serif'; ctx.fillText(Math.floor(dist) + ' m', 10, 22);
      body.querySelector('#rDist').textContent = Math.floor(dist);
      raf = requestAnimationFrame(loop);
    }
    function over() {
      running = false; cancelAnimationFrame(raf);
      const score = Math.floor(dist); const nr = Stats.max('runner', 'best', score);
      ctx.fillStyle = 'rgba(14,14,14,.85)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#FFD400'; ctx.font = '900 26px Archivo,sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(nr ? 'NOWY REKORD!' : 'BAM! 💥', W / 2, H / 2 - 6);
      ctx.fillStyle = '#F5F5F0'; ctx.font = '600 18px Inter,sans-serif'; ctx.fillText('Dystans: ' + score + ' m', W / 2, H / 2 + 20);
      const b = body.querySelector('#runStart'); b.textContent = 'Jeszcze raz'; b.style.display = 'block';
    }
    const onKey = (ev) => { if (ev.code === 'Space' || ev.key === ' ' || ev.key === 'ArrowUp') { ev.preventDefault(); jump(); } };
    document.addEventListener('keydown', onKey);
    cv.addEventListener('mousedown', jump);
    cv.addEventListener('touchstart', ev => { ev.preventDefault(); jump(); }, { passive: false });
    const mo = new MutationObserver(() => { if (!document.getElementById('uiModal')) { document.removeEventListener('keydown', onKey); cancelAnimationFrame(raf); running = false; mo.disconnect(); } });
    mo.observe(document.body, { childList: true });
    body.querySelector('#runStart').onclick = () => { body.querySelector('#runStart').style.display = 'none'; reset(); cancelAnimationFrame(raf); loop(); };
  }

  /* ===================== SAPER ======================================== */
  function launchSaper() {
    Stats.play('saper');
    const N = 9, MINES = 10;
    const body = UI.modal(`
      <div class="gamewrap">
        <div class="gamehud"><div>Miny: <b id="spMines">${MINES}</b></div><div>Najlepszy: <b>${Stats.get('saper').bestTime ? Stats.get('saper').bestTime + 's' : '—'}</b></div><div>Czas: <b id="spTime">0</b>s</div></div>
        <div style="display:flex;justify-content:center;margin:4px 0 8px"><button class="btn btn--ghost btn--sm" id="spFlag">🚩 Tryb flagi: WYŁ.</button></div>
        <div class="saper-grid" id="spGrid" style="grid-template-columns:repeat(${N},1fr)"></div>
        <p class="muted micro">Klik = odkryj. „Tryb flagi" albo długie przytrzymanie = oznacz minę.</p>
        <button class="btn btn--block" id="spAgain" style="display:none">Jeszcze raz</button>
      </div>`, { title: '💣 Saper' });
    const gridEl = body.querySelector('#spGrid');
    let cells = [], started = false, over = false, time = 0, timer = null, flags = 0, flagMode = false, revealed = 0;
    // budowa pól
    for (let i = 0; i < N * N; i++) { cells.push({ mine: false, open: false, flag: false, n: 0 }); }
    function idx(r, c) { return r * N + c; }
    function neighbors(i) { const r = (i / N) | 0, c = i % N, out = []; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { if (!dr && !dc) continue; const nr = r + dr, nc = c + dc; if (nr >= 0 && nr < N && nc >= 0 && nc < N) out.push(idx(nr, nc)); } return out; }
    function placeMines(safe) {
      let placed = 0;
      while (placed < MINES) { const i = (Math.random() * N * N) | 0; if (i === safe || cells[i].mine || neighbors(safe).includes(i)) continue; cells[i].mine = true; placed++; }
      cells.forEach((cell, i) => { if (!cell.mine) cell.n = neighbors(i).filter(j => cells[j].mine).length; });
    }
    function render() {
      gridEl.innerHTML = '';
      cells.forEach((cell, i) => {
        const d = document.createElement('button'); d.className = 'sp-cell' + (cell.open ? ' open' : '');
        if (cell.open) { if (cell.mine) { d.textContent = '💣'; d.classList.add('mine'); } else if (cell.n) { d.textContent = cell.n; d.dataset.n = cell.n; } }
        else if (cell.flag) d.textContent = '🚩';
        d.oncontextmenu = (ev) => { ev.preventDefault(); toggleFlag(i); };
        let lpTimer = null;
        d.addEventListener('touchstart', () => { lpTimer = setTimeout(() => { toggleFlag(i); lpTimer = null; }, 380); }, { passive: true });
        d.addEventListener('touchend', () => { if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; if (flagMode) toggleFlag(i); else open(i); } });
        d.onclick = () => { if ('ontouchstart' in window) return; if (flagMode) toggleFlag(i); else open(i); };
        gridEl.appendChild(d);
      });
      body.querySelector('#spMines').textContent = MINES - flags;
    }
    function startTimer() { if (started) return; started = true; timer = setInterval(() => { time++; body.querySelector('#spTime').textContent = time; }, 1000); }
    function toggleFlag(i) { if (over || cells[i].open) return; cells[i].flag = !cells[i].flag; flags += cells[i].flag ? 1 : -1; render(); }
    function open(i) {
      if (over || cells[i].open || cells[i].flag) return;
      if (!started) { placeMines(i); startTimer(); }
      const cell = cells[i]; cell.open = true; revealed++;
      if (cell.mine) return lose();
      if (cell.n === 0) neighbors(i).forEach(j => { if (!cells[j].open) open(j); });
      render(); checkWin();
    }
    function checkWin() { if (revealed === N * N - MINES) win(); }
    function win() {
      over = true; clearInterval(timer);
      const nr = Stats.min('saper', 'bestTime', time); const s = Stats.get('saper'); s.wins = (s.wins || 0) + 1; Stats.save('saper', s);
      UI.toast((nr ? 'NOWY REKORD! ' : 'Wygrana! ') + time + 's 🎉', 'ok', 3200);
      body.querySelector('#spAgain').style.display = 'block';
    }
    function lose() {
      over = true; clearInterval(timer);
      cells.forEach(c => { if (c.mine) c.open = true; }); render();
      UI.toast('Bum! 💥 Trafiłeś na minę.', 'err', 2600);
      body.querySelector('#spAgain').style.display = 'block';
    }
    body.querySelector('#spFlag').onclick = (ev) => { flagMode = !flagMode; ev.target.textContent = flagMode ? '🚩 Tryb flagi: WŁ.' : '🚩 Tryb flagi: WYŁ.'; ev.target.classList.toggle('btn--ghost', !flagMode); };
    body.querySelector('#spAgain').onclick = () => { clearInterval(timer); launchSaper(); };
    render();
  }

  /* ===================== UBIERZ BEKA-LUDKA =========================== */
  function launchUbieranka() {
    const opts = {
      bg: ['#FFD400', '#FF3B30', '#34D399', '#4F86F7', '#1c1c1c', '#9B59FF'],
      skin: ['#F1C27D', '#E0AC69', '#C68642', '#8D5524'],
      hat: ['—', '🎩', '🧢', '👑', '🎓', '⛑️', '🎂'],
      eyes: ['• •', '^ ^', '> <', 'O O', '- -', '$ $'],
      mouth: [')', 'D', 'o', '|', 'P', '3'],
      acc: ['—', '🕶️', '👓', '🥸', '😷', '🧣']
    };
    const sel = { bg: 0, skin: 0, hat: 0, eyes: 0, mouth: 0, acc: 0 };
    const body = UI.modal(`
      <div class="gamewrap">
        <canvas id="ubCv" width="300" height="300" style="border-radius:14px"></canvas>
        <div class="ub-controls" id="ubCtrls"></div>
        <div style="display:flex;gap:8px;width:100%;margin-top:6px">
          <button class="btn btn--ghost" id="ubRand" style="flex:1">🎲 Losuj</button>
          <button class="btn" id="ubSave" style="flex:1">📸 Pobierz</button>
        </div>
      </div>`, { title: '🎽 Ubierz Beka-ludka' });
    const cv = body.querySelector('#ubCv'), ctx = cv.getContext('2d');
    function draw() {
      ctx.fillStyle = opts.bg[sel.bg]; ctx.fillRect(0, 0, 300, 300);
      // głowa
      ctx.fillStyle = opts.skin[sel.skin]; ctx.beginPath(); ctx.arc(150, 160, 80, 0, Math.PI * 2); ctx.fill();
      // oczy
      ctx.fillStyle = '#111'; ctx.font = '900 34px Archivo,monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(opts.eyes[sel.eyes], 150, 150);
      // usta (zbudowane z ':' + znak)
      ctx.font = '900 30px Archivo,monospace'; ctx.fillText(':' + opts.mouth[sel.mouth], 150, 195);
      // czapka
      if (opts.hat[sel.hat] !== '—') { ctx.font = '70px serif'; ctx.fillText(opts.hat[sel.hat], 150, 70); }
      // akcesorium (na oczach)
      if (opts.acc[sel.acc] !== '—') { ctx.font = '54px serif'; ctx.fillText(opts.acc[sel.acc], 150, 150); }
      // podpis marki
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.font = '900 13px Archivo,sans-serif'; ctx.fillText('BEKAWPIGUŁCE', 150, 286);
    }
    const labels = { bg: 'Tło', skin: 'Skóra', hat: 'Czapka', eyes: 'Oczy', mouth: 'Usta', acc: 'Akcesorium' };
    const ctrls = body.querySelector('#ubCtrls');
    ctrls.innerHTML = Object.keys(opts).map(k => `
      <div class="ub-row"><span>${labels[k]}</span>
        <div><button data-k="${k}" data-s="-1">‹</button><button data-k="${k}" data-s="1">›</button></div>
      </div>`).join('');
    ctrls.querySelectorAll('button').forEach(b => b.onclick = () => {
      const k = b.dataset.k, n = opts[k].length;
      sel[k] = (sel[k] + (+b.dataset.s) + n) % n; draw();
    });
    body.querySelector('#ubRand').onclick = () => { Object.keys(opts).forEach(k => sel[k] = (Math.random() * opts[k].length) | 0); draw(); };
    body.querySelector('#ubSave').onclick = () => {
      try { const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = 'beka-ludek.png'; a.click(); UI.toast('Pobrano 📸', 'ok'); }
      catch (err) { UI.toast('Nie udało się pobrać', 'err'); }
    };
    draw();
  }

  /* ===================== BLOKI 10×10 =================================== */
  /* Rozbudowana układanka typu 1010!: plansza 10×10, trzy klocki w tacce,
     czyszczenie pełnych wierszy i kolumn, mnożnik za serie (combo),
     wykrywanie końca gry, rekord w localStorage. Sterowanie mobilne:
     tapnij klocek w tacce, potem tapnij pole planszy (kotwica = lewy górny
     róg klocka). Podgląd ustawienia pokazuje się po najechaniu/tapnięciu. */
  function launchBloki() {
    Stats.play('bloki');
    const N = 10;
    const SHAPES = [
      { c: [[0,0]], col: '#FFD400' },
      { c: [[0,0],[0,1]], col: '#34D399' }, { c: [[0,0],[1,0]], col: '#34D399' },
      { c: [[0,0],[0,1],[0,2]], col: '#60A5FA' }, { c: [[0,0],[1,0],[2,0]], col: '#60A5FA' },
      { c: [[0,0],[0,1],[0,2],[0,3]], col: '#F472B6' }, { c: [[0,0],[1,0],[2,0],[3,0]], col: '#F472B6' },
      { c: [[0,0],[0,1],[0,2],[0,3],[0,4]], col: '#FF3B30' }, { c: [[0,0],[1,0],[2,0],[3,0],[4,0]], col: '#FF3B30' },
      { c: [[0,0],[0,1],[1,0],[1,1]], col: '#FBBF24' },
      { c: [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2],[2,0],[2,1],[2,2]], col: '#A78BFA' },
      { c: [[0,0],[1,0],[1,1]], col: '#4ADE80' }, { c: [[0,0],[0,1],[1,1]], col: '#4ADE80' },
      { c: [[0,1],[1,0],[1,1]], col: '#4ADE80' }, { c: [[0,0],[0,1],[1,0]], col: '#4ADE80' },
      { c: [[0,0],[1,0],[2,0],[2,1],[2,2]], col: '#FB923C' }, { c: [[0,0],[0,1],[0,2],[1,2],[2,2]], col: '#FB923C' }
    ];
    let board, tray, score, streak, sel, over;

    const body = UI.modal(`
      <div class="gamewrap">
        <div class="gamehud"><div>Punkty: <b id="bkScore">0</b></div><div>Rekord: <b id="bkBest">${Stats.get('bloki').best || 0}</b></div><div>Seria: <b id="bkStreak">×1</b></div></div>
        <div id="bkBoard" style="display:grid;grid-template-columns:repeat(${N},1fr);gap:3px;background:#151515;border:1px solid #2e2e2e;border-radius:12px;padding:8px;touch-action:manipulation"></div>
        <p class="muted micro" style="margin:8px 0 4px;text-align:center">Wybierz klocek, potem tapnij pole (lewy górny róg klocka).</p>
        <div id="bkTray" style="display:flex;gap:10px;justify-content:center;align-items:flex-end;min-height:96px;padding:6px 0"></div>
        <button class="btn btn--block" id="bkAgain" style="display:none">Zagraj ponownie</button>
      </div>`, { title: '🧱 Bloki 10×10' });

    const boardEl = body.querySelector('#bkBoard'), trayEl = body.querySelector('#bkTray');
    const cells = [];
    for (let i = 0; i < N * N; i++) {
      const d = document.createElement('div');
      d.style.cssText = 'aspect-ratio:1;border-radius:5px;background:#232323;transition:background .12s';
      d.dataset.i = i;
      d.onclick = () => tryPlace(i);
      d.onmouseenter = () => preview(i, true);
      d.onmouseleave = () => preview(i, false);
      boardEl.appendChild(d); cells.push(d);
    }

    function reset() {
      board = Array(N * N).fill(null); tray = []; score = 0; streak = 0; sel = -1; over = false;
      body.querySelector('#bkAgain').style.display = 'none';
      refill(); paint(); drawTray(); hud();
    }
    function refill() { while (tray.length < 3) tray.push(SHAPES[(Math.random() * SHAPES.length) | 0]); }
    function hud() {
      body.querySelector('#bkScore').textContent = score;
      body.querySelector('#bkStreak').textContent = '×' + (1 + Math.min(streak, 4));
      body.querySelector('#bkBest').textContent = Math.max(score, Stats.get('bloki').best || 0);
    }
    function paint() { board.forEach((v, i) => { cells[i].style.background = v || '#232323'; }); }
    function fits(sh, anchor) {
      const r0 = (anchor / N) | 0, c0 = anchor % N;
      return sh.c.every(([r, c]) => r0 + r < N && c0 + c < N && !board[(r0 + r) * N + c0 + c]);
    }
    function anyMove() { return tray.some(sh => board.some((_, i) => fits(sh, i))); }
    function preview(i, on) {
      if (sel < 0 || !tray[sel] || over) return;
      const sh = tray[sel]; if (!fits(sh, i)) return;
      const r0 = (i / N) | 0, c0 = i % N;
      sh.c.forEach(([r, c]) => { const k = (r0 + r) * N + c0 + c; if (!board[k]) cells[k].style.background = on ? '#3a3a3a' : '#232323'; });
    }
    function tryPlace(i) {
      if (over) return;
      if (sel < 0 || !tray[sel]) { UI.toast('Najpierw wybierz klocek z dołu 👇', 'info', 1200); return; }
      const sh = tray[sel];
      if (!fits(sh, i)) { UI.toast('Tu się nie zmieści 😅', 'err', 900); return; }
      const r0 = (i / N) | 0, c0 = i % N;
      sh.c.forEach(([r, c]) => { board[(r0 + r) * N + c0 + c] = sh.col; });
      score += sh.c.length;
      tray.splice(sel, 1); sel = -1;
      clearLines();
      if (!tray.length) refill();
      paint(); drawTray(); hud();
      if (!anyMove()) finish();
    }
    function clearLines() {
      const rows = [], cols = [];
      for (let r = 0; r < N; r++) if (Array.from({ length: N }, (_, c) => board[r * N + c]).every(Boolean)) rows.push(r);
      for (let c = 0; c < N; c++) if (Array.from({ length: N }, (_, r) => board[r * N + c]).every(Boolean)) cols.push(c);
      const lines = rows.length + cols.length;
      if (!lines) { streak = 0; return; }
      rows.forEach(r => { for (let c = 0; c < N; c++) board[r * N + c] = null; });
      cols.forEach(c => { for (let r = 0; r < N; r++) board[r * N + c] = null; });
      streak++;
      const mult = 1 + Math.min(streak, 4);
      const pts = lines * 10 * lines * mult;
      score += pts;
      UI.toast(`+${pts} pkt! ${lines > 1 ? 'MULTI-LINIA! 🔥' : 'Linia! ✨'}${streak > 1 ? ' Seria ×' + mult : ''}`, 'ok', 1300);
    }
    function drawTray() {
      trayEl.innerHTML = '';
      tray.forEach((sh, idx) => {
        const rows = Math.max(...sh.c.map(x => x[0])) + 1, colsN = Math.max(...sh.c.map(x => x[1])) + 1;
        const w = document.createElement('div');
        w.style.cssText = `display:grid;grid-template-columns:repeat(${colsN},16px);grid-auto-rows:16px;gap:2px;padding:8px;border-radius:10px;cursor:pointer;border:2px solid ${idx === sel ? '#FFD400' : 'transparent'};background:${idx === sel ? '#1f1c10' : '#191919'}`;
        const map = {}; sh.c.forEach(([r, c]) => map[r + '_' + c] = 1);
        for (let r = 0; r < rows; r++) for (let c = 0; c < colsN; c++) {
          const s = document.createElement('div');
          s.style.cssText = `border-radius:3px;background:${map[r + '_' + c] ? sh.col : 'transparent'}`;
          w.appendChild(s);
        }
        w.onclick = () => { sel = (sel === idx ? -1 : idx); drawTray(); };
        trayEl.appendChild(w);
      });
    }
    function finish() {
      over = true;
      const nr = Stats.max('bloki', 'best', score);
      UI.toast((nr ? 'NOWY REKORD! ' : 'Koniec gry! ') + score + ' pkt 🧱', nr ? 'ok' : 'info', 3000);
      body.querySelector('#bkAgain').style.display = 'block';
    }
    body.querySelector('#bkAgain').onclick = reset;
    reset();
  }

  /* ===================== 2048 ========================================== */
  /* Pełny klasyk: przesuwanie strzałkami i gestami (swipe), łączenie
     kafelków, wynik + rekord, wykrycie wygranej (2048, można grać dalej)
     i przegranej. Kolory kafelków w palecie strony. */
  function launch2048() {
    Stats.play('g2048');
    const N = 4;
    const COLS = { 2:'#2b2b2b',4:'#3a3a2b',8:'#8a6d1a',16:'#b8860b',32:'#FFD400',64:'#FB923C',128:'#FF3B30',256:'#e11d48',512:'#A78BFA',1024:'#60A5FA',2048:'#34D399' };
    let grid, score, won, over;

    const body = UI.modal(`
      <div class="gamewrap">
        <div class="gamehud"><div>Punkty: <b id="tScore">0</b></div><div>Rekord: <b id="tBest">${Stats.get('g2048').best || 0}</b></div></div>
        <div id="tBoard" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;background:#151515;border:1px solid #2e2e2e;border-radius:14px;padding:10px;touch-action:none;user-select:none"></div>
        <p class="muted micro" style="margin:8px 0 4px;text-align:center">Przesuń palcem lub strzałkami. Łącz takie same kafelki.</p>
        <button class="btn btn--block" id="tAgain" style="display:none">Zagraj ponownie</button>
      </div>`, { title: '🔢 2048' });

    const boardEl = body.querySelector('#tBoard');
    const tiles = [];
    for (let i = 0; i < N * N; i++) {
      const d = document.createElement('div');
      d.style.cssText = 'aspect-ratio:1;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.25rem;background:#232323;color:#f5f5f0;transition:background .1s';
      boardEl.appendChild(d); tiles.push(d);
    }
    function spawn() {
      const free = grid.map((v, i) => v ? -1 : i).filter(i => i >= 0);
      if (!free.length) return;
      grid[free[(Math.random() * free.length) | 0]] = Math.random() < 0.9 ? 2 : 4;
    }
    function paint() {
      grid.forEach((v, i) => {
        tiles[i].textContent = v || '';
        tiles[i].style.background = v ? (COLS[v] || '#34D399') : '#232323';
        tiles[i].style.color = v >= 32 && v < 512 ? '#141414' : '#f5f5f0';
        tiles[i].style.fontSize = v >= 1024 ? '0.95rem' : v >= 128 ? '1.1rem' : '1.25rem';
      });
      body.querySelector('#tScore').textContent = score;
      body.querySelector('#tBest').textContent = Math.max(score, Stats.get('g2048').best || 0);
    }
    function line(get, set) {
      let vals = [];
      for (let i = 0; i < N; i++) { const v = get(i); if (v) vals.push(v); }
      let moved = vals.length !== N || vals.some((v, i) => v !== get(i));
      const out = [];
      for (let i = 0; i < vals.length; i++) {
        if (vals[i] === vals[i + 1]) { const m = vals[i] * 2; out.push(m); score += m; if (m === 2048) won = true; i++; moved = true; }
        else out.push(vals[i]);
      }
      while (out.length < N) out.push(0);
      for (let i = 0; i < N; i++) set(i, out[i]);
      return moved;
    }
    function move(dir) { // 0← 1→ 2↑ 3↓
      if (over) return;
      let moved = false;
      for (let k = 0; k < N; k++) {
        const idx = i => dir === 0 ? k * N + i : dir === 1 ? k * N + (N - 1 - i) : dir === 2 ? i * N + k : (N - 1 - i) * N + k;
        if (line(i => grid[idx(i)], (i, v) => grid[idx(i)] = v)) moved = true;
      }
      if (!moved) return;
      spawn(); paint();
      if (won) { won = false; UI.toast('2048! Jesteś legendą 👑 Graj dalej!', 'ok', 3000); }
      if (!canMove()) {
        over = true;
        const nr = Stats.max('g2048', 'best', score);
        UI.toast((nr ? 'NOWY REKORD! ' : 'Koniec gry! ') + score + ' pkt', nr ? 'ok' : 'info', 3000);
        body.querySelector('#tAgain').style.display = 'block';
      }
    }
    function canMove() {
      for (let i = 0; i < N * N; i++) {
        if (!grid[i]) return true;
        const r = (i / N) | 0, c = i % N;
        if (c < N - 1 && grid[i] === grid[i + 1]) return true;
        if (r < N - 1 && grid[i] === grid[i + N]) return true;
      }
      return false;
    }
    const onKey = ev => {
      const m = { ArrowLeft: 0, ArrowRight: 1, ArrowUp: 2, ArrowDown: 3 }[ev.key];
      if (m == null) return; ev.preventDefault(); move(m);
    };
    document.addEventListener('keydown', onKey);
    let sx = 0, sy = 0;
    boardEl.addEventListener('touchstart', ev => { sx = ev.touches[0].clientX; sy = ev.touches[0].clientY; }, { passive: true });
    boardEl.addEventListener('touchend', ev => {
      const dx = ev.changedTouches[0].clientX - sx, dy = ev.changedTouches[0].clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 0) : (dy > 0 ? 3 : 2));
    }, { passive: true });
    const mo = new MutationObserver(() => { if (!document.body.contains(boardEl)) { document.removeEventListener('keydown', onKey); mo.disconnect(); } });
    mo.observe(document.body, { childList: true, subtree: true });
    function reset() { grid = Array(N * N).fill(0); score = 0; won = false; over = false; body.querySelector('#tAgain').style.display = 'none'; spawn(); spawn(); paint(); }
    body.querySelector('#tAgain').onclick = reset;
    reset();
  }

  /* ===================== QUIZ ========================================= */
  function launchQuiz(quizId) {
    const q = quizId ? DB.quizzes.byId(quizId) : DB.quizzes.main();
    if (!q) return UI.toast('Brak quizu', 'err');
    const questions = q.questions.slice().sort(() => Math.random() - 0.5);
    let idx = 0, score = 0, answered = false;
    const body = UI.modal('', { title: '🧠 ' + q.title });
    function step() {
      answered = false;
      if (idx >= questions.length) return finish();
      const item = questions[idx];
      body.innerHTML = `
        <div class="quiz-meta"><span>Pytanie ${idx + 1}/${questions.length}</span><span>Wynik: ${score}</span></div>
        <div class="quiz-progress"><i style="width:${idx / questions.length * 100}%"></i></div>
        <div class="quiz-q">${e(item.q)}</div>
        <div id="opts">${item.opts.map((o, i) => `<button class="quiz-opt" data-i="${i}">${e(o)}</button>`).join('')}</div>`;
      body.querySelectorAll('.quiz-opt').forEach(btn => btn.onclick = () => {
        if (answered) return; answered = true;
        const chosen = +btn.dataset.i;
        body.querySelectorAll('.quiz-opt').forEach((b, i) => { if (i === item.answer) b.classList.add('correct'); else if (i === chosen) b.classList.add('wrong'); b.style.pointerEvents = 'none'; });
        if (chosen === item.answer) { score++; UI.toast('Dobrze! 🔥', 'ok', 1000); }
        setTimeout(() => { idx++; step(); }, 1100);
      });
    }
    function finish() {
      const pct = Math.round(score / questions.length * 100);
      const verdict = pct === 100 ? 'Mistrz! 👑' : pct >= 60 ? 'Nieźle 😎' : pct >= 40 ? 'Może być 🙂' : 'Douczysz się 😅';
      body.innerHTML = `<div class="quiz-final"><b>${score}/${questions.length}</b><p class="muted" style="margin:10px 0">${verdict} (${pct}%)</p><button class="btn" id="qAgain">Zagraj jeszcze raz</button></div>`;
      body.querySelector('#qAgain').onclick = () => launchQuiz(quizId);
    }
    step();
  }
})();
